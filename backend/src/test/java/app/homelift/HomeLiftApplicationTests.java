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
			.hasPathSatisfying("$.sqliteVersion", (v) -> assertThat(v).asString().isNotBlank())
			.hasPathSatisfying("$.javaVersion", (v) -> assertThat(v).isEqualTo(Runtime.version().feature()))
			.hasPathSatisfying("$.databaseBytes", (v) -> assertThat(v).asNumber().isNotEqualTo(0));
	}

	@Test
	void healthIsUp() {
		assertThat(this.mvc.get().uri("/actuator/health")).hasStatusOk().bodyText().contains("UP");
	}

	@Test
	void clientSideRoutesForwardToSpa() {
		assertThat(this.mvc.get().uri("/workout")).hasForwardedUrl("/index.html");
		assertThat(this.mvc.get().uri("/exercises/42/edit")).hasForwardedUrl("/index.html");
	}

	@Test
	void filesInFoldersAreNotForwarded() {
		assertThat(this.mvc.get().uri("/media/inter.woff2").exchange().getResponse().getForwardedUrl()).isNull();
		assertThat(this.mvc.get().uri("/icons/icon-192.png").exchange().getResponse().getForwardedUrl()).isNull();
		assertThat(this.mvc.get().uri("/api/nothing").exchange().getResponse().getForwardedUrl()).isNull();
	}

}
