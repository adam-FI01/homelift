package app.homelift.exercise;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Body for creating or updating an exercise. */
record ExerciseRequest(@NotBlank @Size(max = 80) String name, @NotNull MuscleGroup muscleGroup,
		@NotNull Equipment equipment) {

	/** The name with surrounding and repeated whitespace removed. */
	String cleanName() {
		return this.name.strip().replaceAll("\\s+", " ");
	}

}
