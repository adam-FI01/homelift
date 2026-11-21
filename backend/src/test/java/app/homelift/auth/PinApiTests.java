package app.homelift.auth;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Not transactional: the PIN must really be saved for the filter to see it. */
@SpringBootTest(properties = "homelift.data-dir=target/test-data-pin")
@AutoConfigureMockMvc
class PinApiTests {

	@Autowired
	MockMvcTester mvc;

	@Autowired
	JdbcClient jdbc;

	@Autowired
	PinService pins;

	@AfterEach
	void removePin() {
		this.jdbc.sql("delete from app_setting where setting_key in ('pinHash', 'sessionSecret')").update();
		this.pins.resetAttempts();
	}

	@Test
	void theAppIsOpenWithoutAPin() {
		assertThat(this.mvc.get().uri("/api/exercises")).hasStatusOk();
		assertThat(this.mvc.get().uri("/api/auth")).bodyJson()
			.isLenientlyEqualTo("{\"enabled\":false,\"unlocked\":true,\"managedByEnvironment\":false}");
	}

	@Test
	void aPinLocksTheApiUntilUnlocked() {
		Cookie session = cookie(put("/api/auth/pin", "{\"pin\":\"2468\"}"));
		assertThat(this.mvc.get().uri("/api/exercises").cookie(session)).hasStatusOk();

		assertThat(this.mvc.get().uri("/api/exercises")).hasStatus(HttpStatus.UNAUTHORIZED)
			.bodyJson()
			.hasPathSatisfying("$.title", (t) -> assertThat(t).asString().isEqualTo("Locked"));
		// The shell and the container health check stay reachable.
		assertThat(this.mvc.get().uri("/actuator/health")).hasStatusOk();
		assertThat(this.mvc.get().uri("/workout")).hasForwardedUrl("/index.html");

		assertThat(post("/api/auth/unlock", "{\"pin\":\"1111\"}")).hasStatus(HttpStatus.UNAUTHORIZED);
		Cookie unlocked = cookie(post("/api/auth/unlock", "{\"pin\":\"2468\"}"));
		assertThat(this.mvc.get().uri("/api/exercises").cookie(unlocked)).hasStatusOk();
	}

	@Test
	void changingOrRemovingThePinNeedsTheCurrentOneAndEndsOtherSessions() {
		Cookie first = cookie(put("/api/auth/pin", "{\"pin\":\"2468\"}"));
		assertThat(this.mvc.put()
			.uri("/api/auth/pin")
			.cookie(first)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"currentPin\":\"0000\",\"pin\":\"1357\"}")).hasStatus(HttpStatus.FORBIDDEN);

		Cookie second = cookie(this.mvc.put()
			.uri("/api/auth/pin")
			.cookie(first)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"currentPin\":\"2468\",\"pin\":\"1357\"}")
			.exchange());
		assertThat(this.mvc.get().uri("/api/exercises").cookie(first)).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(this.mvc.get().uri("/api/exercises").cookie(second)).hasStatusOk();

		assertThat(this.mvc.delete()
			.uri("/api/auth/pin")
			.cookie(second)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"pin\":\"1357\"}")).hasStatusOk();
		assertThat(this.mvc.get().uri("/api/exercises")).hasStatusOk();
	}

	@Test
	void rejectsWeakPinsAndSlowsDownGuessing() {
		assertThat(put("/api/auth/pin", "{\"pin\":\"12\"}")).hasStatus(HttpStatus.BAD_REQUEST);
		cookie(put("/api/auth/pin", "{\"pin\":\"2468\"}"));
		for (int i = 0; i < 5; i++) {
			assertThat(post("/api/auth/unlock", "{\"pin\":\"0000\"}")).hasStatus(HttpStatus.UNAUTHORIZED);
		}
		assertThat(post("/api/auth/unlock", "{\"pin\":\"2468\"}")).hasStatus(HttpStatus.TOO_MANY_REQUESTS);
	}

	private MvcTestResult put(String uri, String json) {
		return this.mvc.put().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json).exchange();
	}

	private MvcTestResult post(String uri, String json) {
		return this.mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json).exchange();
	}

	private static Cookie cookie(MvcTestResult result) {
		assertThat(result).hasStatusOk();
		String header = result.getResponse().getHeader("Set-Cookie");
		assertThat(header).contains("HttpOnly").contains("SameSite=Strict");
		String value = header.substring(header.indexOf('=') + 1, header.indexOf(';'));
		return new Cookie(SessionCookie.NAME, value);
	}

}
