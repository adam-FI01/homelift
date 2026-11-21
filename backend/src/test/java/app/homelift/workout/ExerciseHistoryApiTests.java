package app.homelift.workout;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.transaction.annotation.Transactional;

import app.homelift.exercise.ExerciseService;

@SpringBootTest(properties = "homelift.data-dir=target/test-data")
@AutoConfigureMockMvc
@Transactional
class ExerciseHistoryApiTests {

	@Autowired
	MockMvcTester mvc;

	@Autowired
	WorkoutService workouts;

	@Autowired
	ExerciseService exercises;

	@Test
	void listsSessionsNewestFirstWithRecords() throws Exception {
		long bench = exerciseId("Bench Press");
		workout(bench, new double[][] { { 80, 5 }, { 80, 5 } });
		workout(bench, new double[][] { { 85, 3 }, { 70, 12 } });
		// An unfinished workout is not history yet.
		Workout open = this.workouts.start(null);
		WorkoutExercise we = this.workouts.addExercise(open.getId(), bench, null);
		this.workouts.logSet(open.getId(), we.getId(), 200, 1, false);

		String body = this.mvc.get().uri("/api/exercises/{id}/history", bench).exchange().getResponse()
			.getContentAsString();

		assertThat(JsonPath.<List<Double>>read(body, "$.sessions[*].topWeightKg")).containsExactly(85.0, 80.0);
		assertThat(JsonPath.<List<Double>>read(body, "$.sessions[*].volumeKg")).containsExactly(1095.0, 800.0);
		assertThat(JsonPath.<Double>read(body, "$.records.heaviest.value")).isEqualTo(85.0);
		assertThat(JsonPath.<Double>read(body, "$.records.mostReps.value")).isEqualTo(12.0);
		// 70 × 12 → 98 beats 85 × 3 → 93.5 and 80 × 5 → 93.3.
		assertThat(JsonPath.<Double>read(body, "$.records.oneRepMax.value")).isEqualTo(98.0);
		assertThat(JsonPath.<Integer>read(body, "$.records.sessions")).isEqualTo(2);
		assertThat(JsonPath.<Integer>read(body, "$.records.totalSets")).isEqualTo(4);
	}

	@Test
	void anExerciseWithNoHistoryHasEmptyRecords() throws Exception {
		String body = this.mvc.get().uri("/api/exercises/{id}/history", exerciseId("Hip Thrust")).exchange()
			.getResponse().getContentAsString();
		assertThat(JsonPath.<List<Object>>read(body, "$.sessions")).isEmpty();
		assertThat(JsonPath.<Object>read(body, "$.records.oneRepMax")).isNull();
	}

	@Test
	void unknownExerciseIsNotFound() {
		assertThat(this.mvc.get().uri("/api/exercises/999999/history")).hasStatus(HttpStatus.NOT_FOUND);
	}

	private void workout(long exerciseId, double[][] sets) {
		Workout w = this.workouts.start(null);
		WorkoutExercise we = this.workouts.addExercise(w.getId(), exerciseId, null);
		for (double[] s : sets) {
			this.workouts.logSet(w.getId(), we.getId(), s[0], (int) s[1], false);
		}
		this.workouts.finish(w.getId());
	}

	private long exerciseId(String name) {
		return this.exercises.list(name, null, false).stream().filter((e) -> e.getName().equals(name)).findFirst()
			.orElseThrow().getId();
	}

}
