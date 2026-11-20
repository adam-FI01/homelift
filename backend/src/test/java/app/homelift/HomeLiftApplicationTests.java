package app.homelift;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@SpringBootTest(properties = "homelift.data-dir=target/test-data")
@AutoConfigureMockMvc
class HomeLiftApplicationTests {

	@Autowired
	MockMvcTester mvc;

	@Test
	void statusReportsAppAndSqliteVersion() {
		assertThat(this.mvc.get().uri("/api/status")).hasStatusOk()
			.bodyJson()
			.hasPathSatisfying("$.name", (name) -> assertThat(name).asString().isEqualTo("HomeLift"))
			.hasPathSatisfying("$.sqliteVersion", (v) -> assertThat(v).asString().isNotBlank());
	}

	@Test
	void healthIsUp() {
		assertThat(this.mvc.get().uri("/actuator/health")).hasStatusOk().bodyText().contains("UP");
	}

	@Test
	void clientSideRoutesForwardToSpa() {
		assertThat(this.mvc.get().uri("/workouts/42")).hasForwardedUrl("/index.html");
	}

}
