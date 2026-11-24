package app.homelift.importer;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/** Request and response bodies for importing a history from CSV. */
final class ImportDtos {

	/** Longest file accepted, in characters; about 80,000 sets. */
	static final int MAX_CHARS = 5_000_000;

	private ImportDtos() {
	}

	record PreviewRequest(@NotBlank @Size(max = MAX_CHARS) String csv, @Nullable String units) {
	}

	/** What to do with one exercise name from the file. */
	record Decision(@NotBlank String name, @NotNull Action action, @Nullable Long exerciseId) {

		enum Action {

			/** Log the sets under an exercise already in the library. */
			MAP,
			/** Add the name to the library as a new exercise. */
			CREATE,
			/** Leave its sets out. */
			SKIP

		}

	}

	record CommitRequest(@NotBlank @Size(max = MAX_CHARS) String csv, @Nullable String units,
			@NotNull List<@Valid Decision> decisions) {
	}

	record Suggestion(long id, String name) {
	}

	/** An exercise name in the file and what it was matched with, if anything. */
	record ExerciseMatch(String name, int sets, @Nullable Suggestion match, List<Suggestion> suggestions) {
	}

	record Preview(String format, String units, int sets, int workouts, int existingWorkouts, LocalDate from,
			LocalDate to, int skippedRows, List<String> problems, List<ExerciseMatch> exercises) {
	}

	record Result(int workouts, int sets, int createdExercises, int skippedWorkouts, int skippedSets) {
	}

}
