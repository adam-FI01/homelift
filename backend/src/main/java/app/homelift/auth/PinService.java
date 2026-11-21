package app.homelift.auth;

import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import javax.crypto.Mac;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * An optional PIN for the whole app. Off unless a PIN is saved in Settings or the
 * {@code HOMELIFT_PIN} environment variable is set. The PIN is stored as a salted PBKDF2 hash;
 * unlocking hands out a signed, expiring session token, and changing or removing the PIN rotates
 * the signing key so every existing session ends.
 */
@Service
public class PinService {

	static final Duration SESSION = Duration.ofDays(30);

	private static final int ITERATIONS = 120_000;

	private static final int MAX_FAILURES = 5;

	private static final Duration LOCKOUT = Duration.ofSeconds(30);

	private static final SecureRandom RANDOM = new SecureRandom();

	private final JdbcClient jdbc;

	private final Clock clock;

	private final @Nullable String envPin;

	private final AtomicInteger failures = new AtomicInteger();

	private final AtomicReference<Instant> lockedUntil = new AtomicReference<>(Instant.EPOCH);

	PinService(JdbcClient jdbc, Clock clock, @Value("${homelift.pin:}") String envPin) {
		this.jdbc = jdbc;
		this.clock = clock;
		this.envPin = envPin.isBlank() ? null : envPin.strip();
	}

	/** True when a PIN is required to use the app. */
	public boolean enabled() {
		return this.envPin != null || setting("pinHash").isPresent();
	}

	/** True when the PIN comes from the environment and can't be changed in the app. */
	public boolean managedByEnvironment() {
		return this.envPin != null;
	}

	/** Checks a PIN, with a short lockout after repeated failures. Returns a session token. */
	public Optional<String> unlock(String pin) {
		if (this.clock.instant().isBefore(this.lockedUntil.get())) {
			throw new TooManyAttemptsException();
		}
		if (!matches(pin)) {
			if (this.failures.incrementAndGet() >= MAX_FAILURES) {
				this.failures.set(0);
				this.lockedUntil.set(this.clock.instant().plus(LOCKOUT));
			}
			return Optional.empty();
		}
		this.failures.set(0);
		return Optional.of(issueToken());
	}

	/** True when the token was issued by this server and has not expired. */
	public boolean valid(@Nullable String token) {
		if (token == null) {
			return false;
		}
		int dot = token.indexOf('.');
		if (dot < 1) {
			return false;
		}
		String expiry = token.substring(0, dot);
		byte[] expected = sign(expiry).getBytes();
		byte[] given = token.substring(dot + 1).getBytes();
		try {
			return MessageDigest.isEqual(expected, given)
					&& Instant.ofEpochSecond(Long.parseLong(expiry)).isAfter(this.clock.instant());
		}
		catch (NumberFormatException ex) {
			return false;
		}
	}

	/** Sets or changes the PIN; ends every other session. */
	@Transactional
	public String setPin(String pin) {
		if (managedByEnvironment()) {
			throw new PinManagedByEnvironmentException();
		}
		byte[] salt = new byte[16];
		RANDOM.nextBytes(salt);
		save("pinHash", encode(salt) + ":" + encode(hash(pin, salt)));
		rotateSecret();
		return issueToken();
	}

	@Transactional
	public void removePin() {
		if (managedByEnvironment()) {
			throw new PinManagedByEnvironmentException();
		}
		this.jdbc.sql("delete from app_setting where setting_key = 'pinHash'").update();
		rotateSecret();
	}

	/** Clears the failure count and any lockout. */
	void resetAttempts() {
		this.failures.set(0);
		this.lockedUntil.set(Instant.EPOCH);
	}

	boolean matches(String pin) {
		if (this.envPin != null) {
			return MessageDigest.isEqual(this.envPin.getBytes(), pin.getBytes());
		}
		return setting("pinHash").map((stored) -> {
			String[] parts = stored.split(":");
			byte[] salt = Base64.getDecoder().decode(parts[0]);
			return MessageDigest.isEqual(Base64.getDecoder().decode(parts[1]), hash(pin, salt));
		}).orElse(false);
	}

	private String issueToken() {
		String expiry = String.valueOf(this.clock.instant().plus(SESSION).getEpochSecond());
		return expiry + "." + sign(expiry);
	}

	private String sign(String value) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(secret(), "HmacSHA256"));
			return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(value.getBytes()));
		}
		catch (GeneralSecurityException ex) {
			throw new IllegalStateException(ex);
		}
	}

	private byte[] secret() {
		return setting("sessionSecret").map(Base64.getDecoder()::decode).orElseGet(this::rotateSecret);
	}

	private byte[] rotateSecret() {
		byte[] secret = new byte[32];
		RANDOM.nextBytes(secret);
		save("sessionSecret", encode(secret));
		return secret;
	}

	private static byte[] hash(String pin, byte[] salt) {
		try {
			PBEKeySpec spec = new PBEKeySpec(pin.toCharArray(), salt, ITERATIONS, 256);
			return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
		}
		catch (GeneralSecurityException ex) {
			throw new IllegalStateException(ex);
		}
	}

	private Optional<String> setting(String key) {
		return this.jdbc.sql("select setting_value from app_setting where setting_key = :key")
			.param("key", key)
			.query(String.class)
			.optional();
	}

	private void save(String key, String value) {
		this.jdbc.sql("""
				insert into app_setting (setting_key, setting_value) values (:key, :value)
				on conflict (setting_key) do update set setting_value = excluded.setting_value""")
			.param("key", key)
			.param("value", value)
			.update();
	}

	private static String encode(byte[] bytes) {
		return Base64.getEncoder().encodeToString(bytes);
	}

}
