package app.homelift.exercise;

import static org.assertj.core.api.Assertions.assertThat;

import org.assertj.core.api.InstanceOfAssertFactories;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.transaction.annotation.Transactional;

/** Exercises the API against a real SQLite file with the Flyway schema and seed data. */
@SpringBootTest(properties = "homelift.data-dir=target/test-data")
@AutoConfigureMockMvc
@Transactional
class ExerciseApiTests {

	@Autowired
	MockMvcTester mvc;

	@Autowired
	ExerciseRepository repository;

	@Test
	void listsSeededExercisesSortedByName() {
		assertThat(this.mvc.get().uri("/api/exercises")).hasStatusOk()
			.bodyJson()
			.extractingPath("$[*].name")
			.asInstanceOf(InstanceOfAssertFactories.list(String.class))
			.contains("Bench Press", "Back Squat", "Deadlift")
			.isSortedAccordingTo(String.CASE_INSENSITIVE_ORDER);
	}

	@Test
	void filtersByTextAndMuscleGroup() {
		assertThat(this.mvc.get().uri("/api/exercises?q=PRESS&muscleGroup=CHEST")).hasStatusOk()
			.bodyJson()
			.extractingPath("$[*].name")
			.asInstanceOf(InstanceOfAssertFactories.list(String.class))
			.contains("Bench Press", "Dumbbell Bench Press", "Incline Bench Press", "Incline Dumbbell Press")
			.allMatch((n) -> n.toLowerCase().contains("press"))
			.doesNotContain("Overhead Press");
	}

	@Test
	void createsAnExerciseWithATidiedName() {
		assertThat(create("  Cable   Y  Raise ", "SHOULDERS", "CABLE")).hasStatus(HttpStatus.CREATED)
			.hasHeader("Location", "/api/exercises/" + idOf("Cable Y Raise"))
			.bodyJson()
			.hasPathSatisfying("$.name", (n) -> assertThat(n).asString().isEqualTo("Cable Y Raise"))
			.hasPathSatisfying("$.archived", (a) -> assertThat(a).isEqualTo(false));
	}

	@Test
	void rejectsADuplicateNameIgnoringCase() {
		assertThat(create("bench press", "CHEST", "BARBELL")).hasStatus(HttpStatus.CONFLICT)
			.hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
			.bodyJson()
			.hasPathSatisfying("$.title", (t) -> assertThat(t).asString().isEqualTo("Exercise already exists"));
	}

	@Test
	void rejectsAnInvalidBody() {
		assertThat(create(" ", "CHEST", "BARBELL")).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(this.mvc.post()
			.uri("/api/exercises")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"name\":\"Thing\",\"muscleGroup\":\"NOPE\",\"equipment\":\"CABLE\"}"))
			.hasStatus(HttpStatus.BAD_REQUEST);
	}

	@Test
	void updatesAnExercise() {
		long id = idOf("Push-up");
		assertThat(this.mvc.put()
			.uri("/api/exercises/{id}", id)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"name\":\"Push Up\",\"muscleGroup\":\"CHEST\",\"equipment\":\"BODYWEIGHT\"}"))
			.hasStatusOk()
			.bodyJson()
			.hasPathSatisfying("$.name", (n) -> assertThat(n).asString().isEqualTo("Push Up"));
	}

	@Test
	void anExerciseCanHaveItsOwnRest() {
		long id = idOf("Deadlift");
		assertThat(this.mvc.put()
			.uri("/api/exercises/{id}", id)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"name\":\"Deadlift\",\"muscleGroup\":\"BACK\",\"equipment\":\"BARBELL\",\"restSeconds\":180,\"notes\":\" Belt on \"}"))
			.hasStatusOk()
			.bodyJson()
			.hasPathSatisfying("$.restSeconds", (v) -> assertThat(v).isEqualTo(180))
			.hasPathSatisfying("$.notes", (v) -> assertThat(v).asString().isEqualTo("Belt on"));
	}

	@Test
	void shipsALargeLibraryWithoutDuplicates() {
		assertThat(this.repository.count()).isGreaterThanOrEqualTo(120);
		assertThat(this.mvc.get().uri("/api/exercises?q=goblet")).hasStatusOk()
			.bodyJson()
			.extractingPath("$[*].name")
			.asInstanceOf(InstanceOfAssertFactories.list(String.class))
			.containsExactlyInAnyOrder("Goblet Squat", "Kettlebell Goblet Squat");
	}

	@Test
	void renamingToAnotherExercisesNameConflicts() {
		long id = idOf("Push-up");
		assertThat(this.mvc.put()
			.uri("/api/exercises/{id}", id)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"name\":\"Dip\",\"muscleGroup\":\"CHEST\",\"equipment\":\"BODYWEIGHT\"}"))
			.hasStatus(HttpStatus.CONFLICT);
	}

	@Test
	void archivedExercisesAreHiddenUntilRestored() {
		long id = idOf("Cable Crunch");
		assertThat(this.mvc.post().uri("/api/exercises/{id}/archive", id)).hasStatusOk();
		assertThat(this.mvc.get().uri("/api/exercises?q=cable crunch")).hasStatusOk().bodyJson().isLenientlyEqualTo("[]");
		assertThat(this.mvc.get().uri("/api/exercises?q=cable crunch&includeArchived=true")).hasStatusOk()
			.bodyJson()
			.hasPathSatisfying("$[0].archived", (a) -> assertThat(a).isEqualTo(true));

		assertThat(this.mvc.post().uri("/api/exercises/{id}/restore", id)).hasStatusOk();
		assertThat(this.mvc.get().uri("/api/exercises?q=cable crunch")).hasStatusOk()
			.bodyJson()
			.hasPathSatisfying("$[0].name", (n) -> assertThat(n).asString().isEqualTo("Cable Crunch"));
	}

	@Test
	void unknownIdIsNotFound() {
		assertThat(this.mvc.get().uri("/api/exercises/999999")).hasStatus(HttpStatus.NOT_FOUND)
			.hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	private MockMvcTester.MockMvcRequestBuilder create(String name, String muscleGroup, String equipment) {
		return this.mvc.post()
			.uri("/api/exercises")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"name\":\"%s\",\"muscleGroup\":\"%s\",\"equipment\":\"%s\"}".formatted(name, muscleGroup,
					equipment));
	}

	private long idOf(String name) {
		return this.repository.findByNameIgnoreCase(name).orElseThrow().getId();
	}

}
