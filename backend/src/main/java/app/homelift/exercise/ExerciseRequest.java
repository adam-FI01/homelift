package app.homelift.exercise;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/** Body for creating or updating an exercise. */
record ExerciseRequest(@NotBlank @Size(max = 80) String name, @NotNull MuscleGroup muscleGroup,
		@NotNull Equipment equipment, @Nullable @Min(0) @Max(900) Integer restSeconds,
		@Nullable @Size(max = 500) String notes,
		@Nullable @DecimalMin(value = "0", inclusive = false) @DecimalMax("100") Double stepKg) {

	/** The name with surrounding and repeated whitespace removed. */
	/** Notes with surrounding whitespace removed, or null when empty. */
	@Nullable String cleanNotes() {
		return (this.notes == null || this.notes.isBlank()) ? null : this.notes.strip();
	}

	String cleanName() {
		return this.name.strip().replaceAll("\\s+", " ");
	}

}
