package app.homelift.importer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

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

import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = "homelift.data-dir=target/test-data")
@AutoConfigureMockMvc
@Transactional
class ImportApiTests {

	private static final String CSV = """
			Date,Workout Name,Exercise Name,Set Order,Weight,Reps
			2019-03-04 18:00:00,Push,Bench Press (Barbell),1,60,10
			2019-03-04 18:00:00,Push,Bench Press (Barbell),2,62.5,8
			2019-03-04 18:00:00,Push,Cable Wobble Raise,1,10,12
			2019-03-06 18:00:00,Pull,Lat Pulldowns,1,50,10
			""";

	@Autowired
	MockMvcTester mvc;

	@Autowired
	ObjectMapper json;

	@Test
	void aDryRunSaysWhatWouldHappenAndSavesNothing() throws Exception {
		String body = post("/api/import/preview", Map.of("csv", CSV)).getResponse().getContentAsString();
		assertThat(JsonPath.<String>read(body, "$.format")).isEqualTo("Strong");
		assertThat(JsonPath.<Integer>read(body, "$.sets")).isEqualTo(4);
		assertThat(JsonPath.<Integer>read(body, "$.workouts")).isEqualTo(2);
		assertThat(JsonPath.<String>read(body, "$.from")).isEqualTo("2019-03-04");

		// The bench press and the pulldown are found despite the brackets and the plural.
		assertThat(JsonPath.<List<String>>read(body, "$.exercises[?(@.name=='Bench Press (Barbell)')].match.name"))
			.containsExactly("Bench Press");
		assertThat(JsonPath.<List<String>>read(body, "$.exercises[?(@.name=='Lat Pulldowns')].match.name"))
			.containsExactly("Lat Pulldown");
		// The made-up one has no match and is listed first, so it gets looked at.
		assertThat(JsonPath.<String>read(body, "$.exercises[0].name")).isEqualTo("Cable Wobble Raise");
		assertThat(JsonPath.<Object>read(body, "$.exercises[0].match")).isNull();

		assertThat(this.mvc.get().uri("/api/workouts")).hasStatusOk()
			.bodyJson()
			.extractingPath("$[?(@.name=='Push')]")
			.asList()
			.isEmpty();
	}

	@Test
	void importsWorkoutsWithTheChosenMapping() throws Exception {
		List<Map<String, Object>> decisions = List.of(
				Map.of("name", "Bench Press (Barbell)", "action", "MAP", "exerciseId", exerciseId("Bench Press")),
				Map.of("name", "Cable Wobble Raise", "action", "CREATE"),
				Map.of("name", "Lat Pulldowns", "action", "SKIP"));
		String result = post("/api/import", Map.of("csv", CSV, "units", "LB", "decisions", decisions)).getResponse()
			.getContentAsString();
		assertThat(JsonPath.<Integer>read(result, "$.workouts")).isEqualTo(1);
		assertThat(JsonPath.<Integer>read(result, "$.sets")).isEqualTo(3);
		assertThat(JsonPath.<Integer>read(result, "$.createdExercises")).isEqualTo(1);
		assertThat(JsonPath.<Integer>read(result, "$.skippedSets")).isEqualTo(1);

		String history = this.mvc.get().uri("/api/workouts").exchange().getResponse().getContentAsString();
		assertThat(JsonPath.<List<String>>read(history, "$[?(@.name=='Push')].exercises[*]")).containsExactly("Bench Press",
				"Cable Wobble Raise");
		// 60 lb is 27.216 kg; the history shows the finished workout with its volume.
		long id = JsonPath.<List<Integer>>read(history, "$[?(@.name=='Push')].id").getFirst();
		String workout = this.mvc.get().uri("/api/workouts/{id}", id).exchange().getResponse().getContentAsString();
		assertThat(JsonPath.<List<Double>>read(workout, "$.exercises[0].sets[*].weightKg")).containsExactly(27.216,
				28.35);
		assertThat(JsonPath.<String>read(workout, "$.exercises[1].name")).isEqualTo("Cable Wobble Raise");
		assertThat(this.mvc.get().uri("/api/exercises?q={q}", "Wobble")).hasStatusOk().bodyJson()
			.hasPathSatisfying("$[0].equipment", (v) -> assertThat(v).isEqualTo("CABLE"));

		// Importing the same file again does nothing.
		String again = post("/api/import", Map.of("csv", CSV, "units", "LB", "decisions", decisions)).getResponse()
			.getContentAsString();
		assertThat(JsonPath.<Integer>read(again, "$.workouts")).isZero();
		assertThat(JsonPath.<Integer>read(again, "$.skippedWorkouts")).isEqualTo(1);
		String preview = post("/api/import/preview", Map.of("csv", CSV)).getResponse().getContentAsString();
		assertThat(JsonPath.<Integer>read(preview, "$.existingWorkouts")).isEqualTo(1);
	}

	@Test
	void withoutADecisionItUsesTheMatchOrAddsTheExercise() throws Exception {
		String result = post("/api/import", Map.of("csv", CSV, "decisions", List.of())).getResponse()
			.getContentAsString();
		assertThat(JsonPath.<Integer>read(result, "$.workouts")).isEqualTo(2);
		assertThat(JsonPath.<Integer>read(result, "$.sets")).isEqualTo(4);
		assertThat(JsonPath.<Integer>read(result, "$.createdExercises")).isEqualTo(1);
	}

	@Test
	void anUnreadableFileGetsAPlainMessage() throws Exception {
		MvcTestResult result = this.mvc.post()
			.uri("/api/import/preview")
			.contentType(MediaType.APPLICATION_JSON)
			.content(this.json.writeValueAsString(Map.of("csv", "when,what\n1,2\n")))
			.exchange();
		assertThat(result).hasStatus(HttpStatus.UNPROCESSABLE_ENTITY);
		assertThat(JsonPath.<String>read(result.getResponse().getContentAsString(), "$.detail")).contains("date column");
	}

	@Test
	void refusesADecisionThatPointsNowhere() throws Exception {
		MvcTestResult result = this.mvc.post()
			.uri("/api/import")
			.contentType(MediaType.APPLICATION_JSON)
			.content(this.json.writeValueAsString(Map.of("csv", CSV, "decisions",
					List.of(Map.of("name", "Lat Pulldowns", "action", "MAP", "exerciseId", 999999)))))
			.exchange();
		assertThat(result).hasStatus(HttpStatus.UNPROCESSABLE_ENTITY);
	}

	@Test
	void matchesNamesLoosely() {
		var library = List.of(new ImportService.LibraryExercise(1, "Lat Pulldown", ImportService.normalize("Lat Pulldown")),
				new ImportService.LibraryExercise(2, "Close-Grip Lat Pulldown",
						ImportService.normalize("Close-Grip Lat Pulldown")));
		assertThat(ImportService.match("LAT PULLDOWNS (Cable)", 1, library).match().id()).isEqualTo(1);
		var near = ImportService.match("Wide Lat Pulldown", 1, library);
		assertThat(near.match()).isNull();
		assertThat(near.suggestions()).extracting("id").containsExactly(1L);
		assertThat(ImportService.guessEquipment("Squat (Barbell)")).isEqualTo("BARBELL");
		assertThat(ImportService.guessEquipment("Mystery")).isEqualTo("OTHER");
	}

	private MvcTestResult post(String uri, Map<String, Object> body) throws Exception {
		MvcTestResult result = this.mvc.post()
			.uri(uri)
			.contentType(MediaType.APPLICATION_JSON)
			.content(this.json.writeValueAsString(body))
			.exchange();
		assertThat(result).hasStatusOk();
		return result;
	}

	private long exerciseId(String name) throws Exception {
		String body = this.mvc.get().uri("/api/exercises?q={q}", name).exchange().getResponse().getContentAsString();
		return JsonPath.<List<Integer>>read(body, "$[?(@.name=='" + name + "')].id").getFirst();
	}

}
