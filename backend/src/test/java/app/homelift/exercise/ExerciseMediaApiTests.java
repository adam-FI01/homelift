package app.homelift.exercise;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipInputStream;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Pictures and clips for exercises: stored next to the database and included in backups. */
@SpringBootTest(properties = "homelift.data-dir=target/test-data")
@AutoConfigureMockMvc
class ExerciseMediaApiTests {

	/** The first bytes of a PNG, padded; enough to pass the content check. */
	private static final byte[] PNG = bytes(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 1, 2, 3);

	private static final byte[] JPEG = bytes(0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 'J', 'F', 'I', 'F', 0, 1, 2, 3);

	private static final byte[] MP4 = bytes(0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'm', 'p', '4', '2', 0, 0);

	@Autowired
	MockMvcTester mvc;

	@Autowired
	ExerciseService exercises;

	@Autowired
	ExerciseMediaService media;

	@AfterEach
	void cleanUp() {
		long id = squat();
		this.mvc.delete().uri("/api/exercises/{id}/media", id).exchange();
	}

	@Test
	void storesAPictureAndServesItBack() throws Exception {
		long id = squat();
		String body = upload(id, "image/png", PNG).getResponse().getContentAsString();
		String url = JsonPath.read(body, "$.mediaUrl");
		assertThat(url).startsWith("/api/exercises/" + id + "/media/").endsWith(".png");
		assertThat(JsonPath.<String>read(body, "$.mediaType")).isEqualTo("IMAGE");

		MvcTestResult served = this.mvc.get().uri(url).exchange();
		assertThat(served).hasStatusOk().hasHeader("Content-Type", "image/png");
		assertThat(served.getResponse().getHeader("Cache-Control")).contains("immutable");
		assertThat(served.getResponse().getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
		assertThat(served.getResponse().getContentAsByteArray()).isEqualTo(PNG);

		// It shows on the exercise itself too.
		assertThat(this.mvc.get().uri("/api/exercises/{id}", id)).hasStatusOk()
			.bodyJson()
			.hasPathSatisfying("$.mediaUrl", (v) -> assertThat(v).isEqualTo(url));
	}

	@Test
	void replacingDeletesTheOldFileAndItsAddressStopsWorking() throws Exception {
		long id = squat();
		String first = JsonPath.read(upload(id, "image/png", PNG).getResponse().getContentAsString(), "$.mediaUrl");
		String second = JsonPath.read(upload(id, "image/jpeg", JPEG).getResponse().getContentAsString(),
				"$.mediaUrl");
		assertThat(second).isNotEqualTo(first).endsWith(".jpg");
		assertThat(this.mvc.get().uri(first)).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(this.mvc.get().uri(second)).hasStatusOk();
		try (var files = Files.list(this.media.directory())) {
			assertThat(files.map((f) -> f.getFileName().toString()).filter((n) -> n.startsWith(id + "-"))).hasSize(1);
		}
	}

	@Test
	void takesShortClips() throws Exception {
		long id = squat();
		String body = upload(id, "video/mp4", MP4).getResponse().getContentAsString();
		assertThat(JsonPath.<String>read(body, "$.mediaType")).isEqualTo("VIDEO");
	}

	@Test
	void refusesTheWrongTypeAFileThatLiesAndOneThatIsTooBig() throws Exception {
		long id = squat();
		assertThat(upload(id, "text/html", "<script>".getBytes())).hasStatus(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
		assertThat(upload(id, "image/png", JPEG)).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(upload(id, "image/png", new byte[0])).hasStatus(HttpStatus.BAD_REQUEST);
		byte[] big = new byte[(int) ExerciseMediaService.MAX_IMAGE_BYTES + 1];
		System.arraycopy(PNG, 0, big, 0, PNG.length);
		assertThat(upload(id, "image/png", big)).hasStatus(HttpStatus.CONTENT_TOO_LARGE);
		assertThat(upload(999_999, "image/png", PNG)).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(this.mvc.get().uri("/api/exercises/{id}", id)).hasStatusOk()
			.bodyJson()
			.hasPathSatisfying("$.mediaUrl", (v) -> assertThat(v).isNull());
	}

	@Test
	void removingTakesTheFileAway() throws Exception {
		long id = squat();
		String url = JsonPath.read(upload(id, "image/png", PNG).getResponse().getContentAsString(), "$.mediaUrl");
		assertThat(this.mvc.delete().uri("/api/exercises/{id}/media", id)).hasStatusOk()
			.bodyJson()
			.hasPathSatisfying("$.mediaUrl", (v) -> assertThat(v).isNull());
		assertThat(this.mvc.get().uri(url)).hasStatus(HttpStatus.NOT_FOUND);
	}

	@Test
	void theFullBackupIncludesThePicture() throws Exception {
		long id = squat();
		String url = JsonPath.read(upload(id, "image/png", PNG).getResponse().getContentAsString(), "$.mediaUrl");
		String file = Path.of(url).getFileName().toString();

		byte[] zip = this.mvc.get().uri("/api/export/homelift.zip").exchange().getResponse().getContentAsByteArray();
		List<String> names = new ArrayList<>();
		try (ZipInputStream in = new ZipInputStream(new ByteArrayInputStream(zip))) {
			for (var entry = in.getNextEntry(); entry != null; entry = in.getNextEntry()) {
				names.add(entry.getName());
			}
		}
		assertThat(names).contains("homelift.db", "media/" + file);
	}

	private MvcTestResult upload(long id, String contentType, byte[] content) {
		return this.mvc.put().uri("/api/exercises/{id}/media", id).header("Content-Type", contentType).content(content)
			.exchange();
	}

	private long squat() {
		return this.exercises.list("Back Squat", null, false).getFirst().getId();
	}

	private static byte[] bytes(int... values) {
		byte[] out = new byte[values.length];
		for (int i = 0; i < values.length; i++) {
			out[i] = (byte) values[i];
		}
		return out;
	}

}
