package app.homelift.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@SpringBootTest(properties = { "homelift.data-dir=target/test-data-envpin", "homelift.pin=9753" })
@AutoConfigureMockMvc
class EnvironmentPinTests {

	@Autowired
	MockMvcTester mvc;

	@Test
	void aPinFromTheEnvironmentLocksTheAppAndCannotBeChangedThere() {
		assertThat(this.mvc.get().uri("/api/routines")).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(this.mvc.get().uri("/api/auth")).bodyJson()
			.isLenientlyEqualTo("{\"enabled\":true,\"unlocked\":false,\"managedByEnvironment\":true}");
		assertThat(this.mvc.post()
			.uri("/api/auth/unlock")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"pin\":\"9753\"}")).hasStatusOk();
		assertThat(this.mvc.put()
			.uri("/api/auth/pin")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"currentPin\":\"9753\",\"pin\":\"1234\"}")).hasStatus(HttpStatus.CONFLICT);
	}

}
