package app.homelift.workout;

import org.jspecify.annotations.Nullable;

/** An exercise to add to a new workout, with the plan to follow. */
public record PlannedExercise(long exerciseId, int sets, int reps, int restSeconds, boolean autoProgress,
		@Nullable Integer supersetGroup) {

}
