package app.homelift.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;

/** Runs a real server, since error pages are rendered by the container's error dispatch. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = "homelift.data-dir=target/test-data-web")
class ErrorPagesTests {

	@LocalServerPort
	int port;

	private final HttpClient client = HttpClient.newHttpClient();

	@Test
	void browsersGetAFriendlyPageForMissingFiles() throws Exception {
		HttpResponse<String> page = get("/missing.png", "text/html");
		assertThat(page.statusCode()).isEqualTo(404);
		assertThat(page.body()).contains("Page not found").contains("Back to HomeLift");
	}

	@Test
	void apiErrorsStayJsonAndCarryARequestId() throws Exception {
		HttpResponse<String> api = get("/api/exercises/999999", "application/json");
		assertThat(api.statusCode()).isEqualTo(404);
		assertThat(api.headers().firstValue("Content-Type")).hasValueSatisfying((t) -> assertThat(t).contains("problem+json"));
		assertThat(api.headers().firstValue("X-Request-Id")).hasValueSatisfying((id) -> assertThat(id).hasSize(8));
	}

	private HttpResponse<String> get(String path, String accept) throws Exception {
		HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + this.port + path))
			.header("Accept", accept)
			.build();
		return this.client.send(request, HttpResponse.BodyHandlers.ofString());
	}

}
