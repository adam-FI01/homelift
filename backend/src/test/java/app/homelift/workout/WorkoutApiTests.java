package app.homelift.workout;

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

/** Logs workouts through the API against a real SQLite file with the seeded exercise library. */
@SpringBootTest(properties = "homelift.data-dir=target/test-data")
@AutoConfigureMockMvc
@Transactional
class WorkoutApiTests {

	@Autowired
	MockMvcTester mvc;

	@Test
	void startsAWorkoutAndOnlyOneCanBeInProgress() {
		assertThat(this.mvc.get().uri("/api/workouts/current")).hasStatus(HttpStatus.NO_CONTENT);

		long id = start("Push A");
		assertThat(this.mvc.get().uri("/api/workouts/current")).hasStatusOk()
			.bodyJson()
			.hasPathSatisfying("$.id", (v) -> assertThat(v).isEqualTo((int) id))
			.hasPathSatisfying("$.name", (v) -> assertThat(v).asString().isEqualTo("Push A"));

		assertThat(post("/api/workouts", "{}")).hasStatus(HttpStatus.CONFLICT);
	}

	@Test
	void logsSetsAgainstAnExercise() {
		long workout = start(null);
		long bench = addExercise(workout, "Bench Press");

		assertThat(logSet(workout, bench, 60, 8)).hasStatus(HttpStatus.CREATED)
			.bodyJson()
			.hasPathSatisfying("$.setNumber", (v) -> assertThat(v).isEqualTo(1));
		logSet(workout, bench, 62.5, 6);

		String body = view(workout);
		assertThat(JsonPath.<Integer>read(body, "$.exercises[0].targetSets")).isEqualTo(3);
		assertThat(JsonPath.<List<Double>>read(body, "$.exercises[0].sets[*].weightKg")).containsExactly(60.0, 62.5);
		assertThat(JsonPath.<List<Integer>>read(body, "$.exercises[0].sets[*].reps")).containsExactly(8, 6);
		assertThat(JsonPath.<List<Object>>read(body, "$.exercises[0].lastTime")).isEmpty();
	}

	@Test
	void showsWhatWasLiftedLastTime() {
		long first = start(null);
		long bench = addExercise(first, "Bench Press");
		logSet(first, bench, 80, 5);
		logSet(first, bench, 80, 4);
		assertThat(this.mvc.post().uri("/api/workouts/{id}/finish", first)).hasStatusOk();

		long second = start(null);
		addExercise(second, "Bench Press");
		addExercise(second, "Overhead Press");

		String body = view(second);
		assertThat(JsonPath.<List<Map<String, Object>>>read(body, "$.exercises[0].lastTime"))
			.containsExactly(Map.of("weightKg", 80.0, "reps", 5), Map.of("weightKg", 80.0, "reps", 4));
		assertThat(JsonPath.<List<Object>>read(body, "$.exercises[1].lastTime")).isEmpty();
	}

	@Test
	void loggingPastThePlanRaisesTheTarget() {
		long workout = start(null);
		long squat = addExerciseWithTarget(workout, "Back Squat", 1);
		logSet(workout, squat, 100, 5);
		logSet(workout, squat, 100, 5);
		assertThat(JsonPath.<Integer>read(view(workout), "$.exercises[0].targetSets")).isEqualTo(2);
	}

	@Test
	void removingASetRenumbersTheRest() {
		long workout = start(null);
		long row = addExercise(workout, "Barbell Row");
		long firstSet = setId(logSet(workout, row, 50, 10));
		logSet(workout, row, 55, 8);

		assertThat(this.mvc.delete().uri("/api/workouts/{w}/exercises/{e}/sets/{s}", workout, row, firstSet))
			.hasStatus(HttpStatus.NO_CONTENT);

		String body = view(workout);
		assertThat(JsonPath.<List<Integer>>read(body, "$.exercises[0].sets[*].setNumber")).containsExactly(1);
		assertThat(JsonPath.<List<Double>>read(body, "$.exercises[0].sets[*].weightKg")).containsExactly(55.0);
	}

	@Test
	void aFinishedWorkoutCannotChange() {
		long workout = start(null);
		long dip = addExercise(workout, "Dip");
		assertThat(this.mvc.post().uri("/api/workouts/{id}/finish", workout)).hasStatusOk()
			.bodyJson()
			.hasPathSatisfying("$.finishedAt", (v) -> assertThat(v).asString().isNotBlank());

		assertThat(this.mvc.get().uri("/api/workouts/current")).hasStatus(HttpStatus.NO_CONTENT);
		assertThat(logSet(workout, dip, 0, 10)).hasStatus(HttpStatus.CONFLICT);
	}

	@Test
	void rejectsInvalidSets() {
		long workout = start(null);
		long curl = addExercise(workout, "Barbell Curl");
		assertThat(logSet(workout, curl, -5, 10)).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(post("/api/workouts/" + workout + "/exercises/" + curl + "/sets", "{\"weightKg\":20}"))
			.hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(logSet(workout, 999_999, 20, 10)).hasStatus(HttpStatus.NOT_FOUND);
	}

	@Test
	void listsFinishedWorkoutsNewestFirst() {
		long first = start("Pull");
		logSet(first, addExercise(first, "Pull-up"), 0, 10);
		this.mvc.post().uri("/api/workouts/{id}/finish", first).exchange();
		long second = start("Push");
		logSet(second, addExercise(second, "Bench Press"), 60, 10);
		this.mvc.post().uri("/api/workouts/{id}/finish", second).exchange();
		start("In progress");

		String body = body(this.mvc.get().uri("/api/workouts?limit=5").exchange());
		assertThat(JsonPath.<List<String>>read(body, "$[*].name")).startsWith("Push", "Pull").doesNotContain("In progress");
		assertThat(JsonPath.<Double>read(body, "$[0].volumeKg")).isEqualTo(600.0);
		assertThat(JsonPath.<List<String>>read(body, "$[0].exercises")).containsExactly("Bench Press");
	}

	@Test
	void discardsAWorkout() {
		long workout = start(null);
		addExercise(workout, "Deadlift");
		assertThat(this.mvc.delete().uri("/api/workouts/{id}", workout)).hasStatus(HttpStatus.NO_CONTENT);
		assertThat(this.mvc.get().uri("/api/workouts/{id}", workout)).hasStatus(HttpStatus.NOT_FOUND);
	}

	private long start(String name) {
		MvcTestResult result = post("/api/workouts", (name != null) ? "{\"name\":\"" + name + "\"}" : "{}");
		assertThat(result).hasStatus(HttpStatus.CREATED);
		return JsonPath.<Integer>read(body(result), "$.id");
	}

	private long addExercise(long workout, String exerciseName) {
		return addExerciseWithTarget(workout, exerciseName, null);
	}

	private long addExerciseWithTarget(long workout, String exerciseName, Integer targetSets) {
		String exercises = body(this.mvc.get().uri("/api/exercises?q={q}", exerciseName).exchange());
		int exerciseId = JsonPath.<List<Integer>>read(exercises, "$[?(@.name == '" + exerciseName + "')].id").get(0);
		String json = (targetSets != null) ? "{\"exerciseId\":%d,\"targetSets\":%d}".formatted(exerciseId, targetSets)
				: "{\"exerciseId\":%d}".formatted(exerciseId);
		MvcTestResult result = post("/api/workouts/" + workout + "/exercises", json);
		assertThat(result).hasStatusOk();
		List<Integer> ids = JsonPath.read(body(result), "$.exercises[*].id");
		return ids.get(ids.size() - 1);
	}

	private MvcTestResult logSet(long workout, long workoutExercise, double weightKg, int reps) {
		return post("/api/workouts/" + workout + "/exercises/" + workoutExercise + "/sets",
				"{\"weightKg\":%s,\"reps\":%d}".formatted(weightKg, reps));
	}

	private long setId(MvcTestResult result) {
		return JsonPath.<Integer>read(body(result), "$.id");
	}

	private String view(long workout) {
		return body(this.mvc.get().uri("/api/workouts/{id}", workout).exchange());
	}

	private MvcTestResult post(String uri, String json) {
		return this.mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json).exchange();
	}

	private static String body(MvcTestResult result) {
		try {
			return result.getResponse().getContentAsString();
		}
		catch (java.io.UnsupportedEncodingException ex) {
			throw new IllegalStateException(ex);
		}
	}

}
