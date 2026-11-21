package app.homelift.body;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "homelift.data-dir=target/test-data")
@AutoConfigureMockMvc
@Transactional
class BodyMetricApiTests {

	@Autowired
	MockMvcTester mvc;

	@Test
	void recordsOneValuePerDayAndFiltersByKindAndDate() throws Exception {
		save("2026-11-01", "WEIGHT", 82.4);
		save("2026-11-08", "WEIGHT", 81.9);
		save("2026-11-08", "WEIGHT", 81.7); // replaces the first entry that day
		save("2026-11-08", "WAIST", 84);
		save("2026-12-01", "WEIGHT", 81.0);

		String body = get("/api/body?kind=WEIGHT&from=2026-11-01&to=2026-12-01");
		assertThat(JsonPath.<List<String>>read(body, "$[*].date")).containsExactly("2026-11-01", "2026-11-08");
		assertThat(JsonPath.<List<Double>>read(body, "$[*].value")).containsExactly(82.4, 81.7);
		assertThat(JsonPath.<List<Object>>read(get("/api/body"), "$")).hasSize(4);
	}

	@Test
	void deletesAnEntry() throws Exception {
		int id = JsonPath.read(save("2026-10-01", "BODY_FAT", 18.5).getResponse().getContentAsString(), "$.id");
		assertThat(this.mvc.delete().uri("/api/body/{id}", id)).hasStatus(HttpStatus.NO_CONTENT);
		assertThat(this.mvc.delete().uri("/api/body/{id}", id)).hasStatus(HttpStatus.NOT_FOUND);
	}

	@Test
	void rejectsBadEntries() {
		assertThat(save("2026-10-01", "WEIGHT", 0)).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(save("2026-10-01", "SHOE_SIZE", 10)).hasStatus(HttpStatus.BAD_REQUEST);
	}

	private MvcTestResult save(String date, String kind, double value) {
		return this.mvc.put()
			.uri("/api/body")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"date\":\"%s\",\"kind\":\"%s\",\"value\":%s}".formatted(date, kind, value))
			.exchange();
	}

	private String get(String uri) throws Exception {
		return this.mvc.get().uri(uri).exchange().getResponse().getContentAsString();
	}

}
