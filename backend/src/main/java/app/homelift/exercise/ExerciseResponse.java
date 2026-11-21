package app.homelift.exercise;

import org.jspecify.annotations.Nullable;

/** An exercise as the API returns it. */
record ExerciseResponse(Long id, String name, MuscleGroup muscleGroup, Equipment equipment,
		@Nullable Integer restSeconds, boolean archived) {

	static ExerciseResponse of(Exercise e) {
		return new ExerciseResponse(e.getId(), e.getName(), e.getMuscleGroup(), e.getEquipment(), e.getRestSeconds(),
				e.isArchived());
	}

}
