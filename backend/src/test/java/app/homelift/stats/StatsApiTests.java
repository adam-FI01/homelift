package app.homelift.stats;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@SpringBootTest(properties = "homelift.data-dir=target/test-data")
@AutoConfigureMockMvc
class StatsApiTests {

	@Autowired
	MockMvcTester mvc;

	@Test
	void returnsStatsForAPeriod() {
		assertThat(this.mvc.get().uri("/api/stats?period=MONTH&date=2026-02-10&zone=Europe/Berlin")).hasStatusOk()
			.bodyJson()
			.hasPathSatisfying("$.start", (v) -> assertThat(v).asString().isEqualTo("2026-02-01"))
			.hasPathSatisfying("$.end", (v) -> assertThat(v).asString().isEqualTo("2026-03-01"))
			.hasPathSatisfying("$.buckets.length()", (v) -> assertThat(v).isEqualTo(28));
	}

	@Test
	void rejectsUnknownZonesAndPeriods() {
		assertThat(this.mvc.get().uri("/api/stats?zone=Mars/Base")).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(this.mvc.get().uri("/api/stats?period=DECADE")).hasStatus(HttpStatus.BAD_REQUEST);
	}

}
