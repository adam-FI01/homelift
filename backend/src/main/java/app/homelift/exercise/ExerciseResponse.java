package app.homelift.exercise;

/** An exercise as the API returns it. */
record ExerciseResponse(Long id, String name, MuscleGroup muscleGroup, Equipment equipment, boolean archived) {

	static ExerciseResponse of(Exercise e) {
		return new ExerciseResponse(e.getId(), e.getName(), e.getMuscleGroup(), e.getEquipment(), e.isArchived());
	}

}
