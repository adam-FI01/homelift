package app.homelift.settings;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "homelift.data-dir=target/test-data")
@AutoConfigureMockMvc
@Transactional
class SettingsApiTests {

	@Autowired
	MockMvcTester mvc;

	@Test
	void startsWithDefaults() {
		assertThat(this.mvc.get().uri("/api/settings")).hasStatusOk()
			.bodyJson()
			.isLenientlyEqualTo("""
					{"defaultRestSeconds":120,"autoStartRest":true,"restSound":true,"restVibrate":true,
					 "units":"KG","theme":"SYSTEM","barKg":null}""");
	}

	@Test
	void savesAndReadsBack() {
		String body = """
				{"defaultRestSeconds":90,"autoStartRest":false,"restSound":false,"restVibrate":true,
				 "units":"LB","theme":"DARK","barKg":15}""";
		assertThat(this.mvc.put().uri("/api/settings").contentType(MediaType.APPLICATION_JSON).content(body))
			.hasStatusOk();
		assertThat(this.mvc.get().uri("/api/settings")).bodyJson().isLenientlyEqualTo(body);
	}

	@Test
	void rejectsBadValues() {
		assertThat(this.mvc.put()
			.uri("/api/settings")
			.contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"defaultRestSeconds":5000,"autoStartRest":true,"restSound":true,"restVibrate":true,
					 "units":"KG","theme":"SYSTEM"}""")).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(this.mvc.put()
			.uri("/api/settings")
			.contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"defaultRestSeconds":60,"autoStartRest":true,"restSound":true,"restVibrate":true,
					 "units":"STONE","theme":"SYSTEM"}""")).hasStatus(HttpStatus.BAD_REQUEST);
	}

}
