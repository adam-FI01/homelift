package app.homelift.routine;

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

import app.homelift.exercise.ExerciseService;

@SpringBootTest(properties = "homelift.data-dir=target/test-data")
@AutoConfigureMockMvc
@Transactional
class RoutineApiTests {

	@Autowired
	MockMvcTester mvc;

	@Autowired
	ExerciseService exercises;

	@Test
	void createsARoutineWithAnEstimate() throws Exception {
		MvcTestResult result = save(null, "Push A", ex("Bench Press", 5, 5, 150, true), ex("Overhead Press", 3, 8, 120, false));
		assertThat(result).hasStatus(HttpStatus.CREATED);
		String body = result.getResponse().getContentAsString();
		assertThat(JsonPath.<List<String>>read(body, "$.exercises[*].name")).containsExactly("Bench Press", "Overhead Press");
		assertThat(JsonPath.<Integer>read(body, "$.totalSets")).isEqualTo(8);
		// 8 sets × 45 s + 4 × 150 s + 2 × 120 s = 1200 s = 20 min
		assertThat(JsonPath.<Integer>read(body, "$.estimatedMinutes")).isEqualTo(20);
		assertThat(JsonPath.<Boolean>read(body, "$.exercises[0].autoProgress")).isTrue();
	}

	@Test
	void updatesNameAndOrder() throws Exception {
		long id = id(save(null, "Legs", ex("Back Squat", 3, 5, 180, false), ex("Leg Curl", 3, 10, 60, false)));
		MvcTestResult result = save(id, "Legs B", ex("Leg Curl", 4, 12, 60, false), ex("Back Squat", 5, 5, 180, true));
		assertThat(result).hasStatusOk();
		String body = result.getResponse().getContentAsString();
		assertThat(JsonPath.<String>read(body, "$.name")).isEqualTo("Legs B");
		assertThat(JsonPath.<List<String>>read(body, "$.exercises[*].name")).containsExactly("Leg Curl", "Back Squat");
		assertThat(JsonPath.<List<Integer>>read(body, "$.exercises[*].sets")).containsExactly(4, 5);
	}

	@Test
	void rejectsDuplicatesAndBadPlans() {
		save(null, "Pull", ex("Deadlift", 1, 5, 180, false));
		assertThat(save(null, "pull", ex("Deadlift", 1, 5, 180, false))).hasStatus(HttpStatus.CONFLICT);
		assertThat(save(null, "Bad", ex("Deadlift", 0, 5, 180, false))).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(save(null, " ", ex("Deadlift", 1, 5, 180, false))).hasStatus(HttpStatus.BAD_REQUEST);
	}

	@Test
	void startsAWorkoutWithThePlan() throws Exception {
		long id = id(save(null, "Push A", ex("Bench Press", 5, 5, 150, true), ex("Dip", 3, 10, 90, false)));

		MvcTestResult result = this.mvc.post().uri("/api/routines/{id}/start", id).exchange();
		assertThat(result).hasStatus(HttpStatus.CREATED);
		String body = result.getResponse().getContentAsString();
		assertThat(JsonPath.<String>read(body, "$.name")).isEqualTo("Push A");
		assertThat(JsonPath.<Integer>read(body, "$.routineId")).isEqualTo((int) id);
		assertThat(JsonPath.<List<String>>read(body, "$.exercises[*].name")).containsExactly("Bench Press", "Dip");
		assertThat(JsonPath.<List<Integer>>read(body, "$.exercises[*].targetSets")).containsExactly(5, 3);
		assertThat(JsonPath.<List<Integer>>read(body, "$.exercises[*].targetReps")).containsExactly(5, 10);
		assertThat(JsonPath.<List<Integer>>read(body, "$.exercises[*].restSeconds")).containsExactly(150, 90);

		// Only one workout at a time.
		assertThat(this.mvc.post().uri("/api/routines/{id}/start", id)).hasStatus(HttpStatus.CONFLICT);
	}

	@Test
	void deletesARoutineButKeepsItsWorkouts() throws Exception {
		long id = id(save(null, "Temp", ex("Plank", 1, 1, 0, false)));
		String workout = this.mvc.post().uri("/api/routines/{id}/start", id).exchange().getResponse().getContentAsString();
		int workoutId = JsonPath.read(workout, "$.id");

		assertThat(this.mvc.delete().uri("/api/routines/{id}", id)).hasStatus(HttpStatus.NO_CONTENT);
		assertThat(this.mvc.get().uri("/api/routines/{id}", id)).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(this.mvc.get().uri("/api/workouts/{id}", workoutId)).hasStatusOk();
	}

	private String ex(String name, int sets, int reps, int rest, boolean auto) {
		long exerciseId = this.exercises.list(name, null, false).stream().filter((e) -> e.getName().equals(name))
			.findFirst().orElseThrow().getId();
		return "{\"exerciseId\":%d,\"sets\":%d,\"reps\":%d,\"restSeconds\":%d,\"autoProgress\":%s}".formatted(exerciseId,
				sets, reps, rest, auto);
	}

	private MvcTestResult save(Long id, String name, String... exercises) {
		String json = "{\"name\":\"%s\",\"exercises\":[%s]}".formatted(name, String.join(",", exercises));
		var request = (id == null) ? this.mvc.post().uri("/api/routines") : this.mvc.put().uri("/api/routines/{id}", id);
		return request.contentType(MediaType.APPLICATION_JSON).content(json).exchange();
	}

	private static long id(MvcTestResult result) throws Exception {
		return JsonPath.<Integer>read(result.getResponse().getContentAsString(), "$.id");
	}

}
