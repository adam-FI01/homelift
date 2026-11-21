package app.homelift.routine;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/** Request and response bodies for the routine API. */
final class RoutineDtos {

	/** Rough time per set before rest, used to estimate how long a routine takes. */
	static final int SECONDS_PER_SET = 45;

	private RoutineDtos() {
	}

	record ExerciseInput(@NotNull Long exerciseId, @Min(1) @Max(20) int sets, @Min(1) @Max(100) int reps,
			@Min(0) @Max(900) int restSeconds, boolean autoProgress, @Nullable @Min(1) @Max(30) Integer supersetGroup) {

	}

	record RoutineInput(@NotBlank @Size(max = 60) String name, @NotNull @Size(max = 30) List<@Valid ExerciseInput> exercises) {

		String cleanName() {
			return this.name.strip().replaceAll("\\s+", " ");
		}

	}

	record ExerciseView(long id, long exerciseId, String name, int sets, int reps, int restSeconds,
			boolean autoProgress, @Nullable Integer supersetGroup) {

		static ExerciseView of(RoutineExercise e) {
			return new ExerciseView(e.getId(), e.getExercise().getId(), e.getExercise().getName(), e.getSets(),
					e.getReps(), e.getRestSeconds(), e.isAutoProgress(), e.getSupersetGroup());
		}

	}

	record RoutineView(long id, String name, List<ExerciseView> exercises, int totalSets, int estimatedMinutes) {

		static RoutineView of(Routine r) {
			int sets = r.getExercises().stream().mapToInt(RoutineExercise::getSets).sum();
			int seconds = r.getExercises()
				.stream()
				.mapToInt((e) -> e.getSets() * SECONDS_PER_SET + Math.max(e.getSets() - 1, 0) * e.getRestSeconds())
				.sum();
			// Round to the nearest 5 minutes; the estimate is only a guide.
			int minutes = (int) (Math.round(seconds / 300.0) * 5);
			return new RoutineView(r.getId(), r.getName(), r.getExercises().stream().map(ExerciseView::of).toList(),
					sets, minutes);
		}

	}

}
