package app.homelift.exercise;

import org.jspecify.annotations.Nullable;

/** An exercise as the API returns it. */
record ExerciseResponse(Long id, String name, MuscleGroup muscleGroup, Equipment equipment,
		@Nullable Integer restSeconds, @Nullable String notes, @Nullable Double stepKg, @Nullable String mediaUrl, @Nullable MediaType mediaType, boolean archived) {

	static ExerciseResponse of(Exercise e) {
		return new ExerciseResponse(e.getId(), e.getName(), e.getMuscleGroup(), e.getEquipment(), e.getRestSeconds(),
				e.getNotes(), e.getStepKg(), mediaUrl(e), e.getMediaType(), e.isArchived());
	}

	/** The file name is part of the URL, so a replaced picture gets a new address and can be cached for good. */
	private static @Nullable String mediaUrl(Exercise e) {
		return (e.getMediaFile() == null) ? null : "/api/exercises/" + e.getId() + "/media/" + e.getMediaFile();
	}

}
