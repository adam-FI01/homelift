package app.homelift.backup;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.List;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import app.homelift.exercise.ExerciseService;

@SpringBootTest(properties = "homelift.data-dir=target/test-data")
@AutoConfigureMockMvc
class BackupApiTests {

	@Autowired
	MockMvcTester mvc;

	@Autowired
	ExerciseService exercises;

	@Test
	void exportsSetsAsCsv() throws Exception {
		logFinishedWorkout();
		MvcTestResult result = this.mvc.get().uri("/api/export/sets.csv").exchange();
		assertThat(result).hasStatusOk().hasHeader("Content-Disposition",
				"attachment; filename=\"homelift-sets-" + java.time.LocalDate.now(java.time.ZoneOffset.UTC) + ".csv\"");
		List<String> lines = result.getResponse().getContentAsString().lines().toList();
		assertThat(lines.getFirst()).startsWith("date,workout_id,exercise,");
		assertThat(lines).anyMatch((l) -> l.contains(",Dumbbell Curl,ARMS,1,12.5,10,125,16.7"));
	}

	@Test
	void exportsEveryTableAsJson() throws Exception {
		String body = this.mvc.get().uri("/api/export/backup.json").exchange().getResponse().getContentAsString();
		assertThat(JsonPath.<String>read(body, "$.app")).isEqualTo("HomeLift");
		assertThat(JsonPath.<Object>read(body, "$.schemaVersion")).isNotNull();
		assertThat(JsonPath.<List<Object>>read(body, "$.tables.exercise")).hasSizeGreaterThanOrEqualTo(35);
		assertThat(JsonPath.<java.util.Map<String, Object>>read(body, "$.tables")).containsKeys(
				BackupController.TABLES.toArray(String[]::new));
	}

	@Test
	void downloadsAWorkingCopyOfTheDatabase(@TempDir Path dir) throws Exception {
		MvcTestResult result = this.mvc.get().uri("/api/export/homelift.db").exchange();
		assertThat(result).hasStatusOk();
		byte[] bytes = result.getResponse().getContentAsByteArray();
		assertThat(new String(bytes, 0, 15, java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("SQLite format 3");

		Path copy = Files.write(dir.resolve("copy.db"), bytes);
		try (var connection = DriverManager.getConnection("jdbc:sqlite:" + copy);
				var rs = connection.createStatement().executeQuery("select count(*) from exercise")) {
			assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(35);
		}
		try (var files = Files.list(Path.of("target/test-data"))) {
			assertThat(files.map(Path::getFileName).map(Path::toString)).noneMatch((n) -> n.startsWith("backup-"));
		}
	}

	@Test
	void quotesAndDefusesCsvFields() {
		assertThat(BackupController.csv("Bench Press")).isEqualTo("Bench Press");
		assertThat(BackupController.csv("Row, bent over")).isEqualTo("\"Row, bent over\"");
		assertThat(BackupController.csv("Say \"hi\"")).isEqualTo("\"Say \"\"hi\"\"\"");
		assertThat(BackupController.csv("=HYPERLINK(1)")).isEqualTo("'=HYPERLINK(1)");
		assertThat(BackupController.csv("-2.5")).isEqualTo("-2.5");
	}

	/** Logs and finishes a workout through the API, committed so the export can see it. */
	private void logFinishedWorkout() throws Exception {
		long curl = this.exercises.list("Dumbbell Curl", null, false).getFirst().getId();
		int workout = JsonPath.read(post("/api/workouts", "{}"), "$.id");
		List<Integer> ids = JsonPath.read(post("/api/workouts/" + workout + "/exercises", "{\"exerciseId\":" + curl + "}"),
				"$.exercises[*].id");
		post("/api/workouts/" + workout + "/exercises/" + ids.getLast() + "/sets", "{\"weightKg\":12.5,\"reps\":10}");
		post("/api/workouts/" + workout + "/finish", "");
	}

	private String post(String uri, String json) throws Exception {
		return this.mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json).exchange().getResponse()
			.getContentAsString();
	}

}
