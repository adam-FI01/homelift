package app.homelift.auth;

import java.util.Arrays;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.jspecify.annotations.Nullable;
import org.springframework.http.ResponseCookie;

/** The cookie that carries an unlocked session: HttpOnly, same-site only, for the whole app. */
final class SessionCookie {

	static final String NAME = "homelift_session";

	private SessionCookie() {
	}

	static @Nullable String read(HttpServletRequest request) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			return null;
		}
		return Arrays.stream(cookies).filter((c) -> NAME.equals(c.getName())).map(Cookie::getValue).findFirst()
			.orElse(null);
	}

	static String set(String token, boolean secure) {
		return ResponseCookie.from(NAME, token)
			.httpOnly(true)
			.secure(secure)
			.sameSite("Strict")
			.path("/")
			.maxAge(PinService.SESSION)
			.build()
			.toString();
	}

	static String clear(boolean secure) {
		return ResponseCookie.from(NAME, "").httpOnly(true).secure(secure).sameSite("Strict").path("/").maxAge(0)
			.build().toString();
	}

}
