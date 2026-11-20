package app.homelift.workout;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

import app.homelift.exercise.Equipment;
import app.homelift.exercise.MuscleGroup;

/** Request and response bodies for the workout API. */
public final class WorkoutDtos {

	private WorkoutDtos() {
	}

	record StartWorkout(@Nullable @Size(max = 80) String name) {
	}

	record AddExercise(@NotNull Long exerciseId, @Nullable @Min(1) @Max(20) Integer targetSets) {
	}

	record LogSet(@NotNull @DecimalMin("0") @DecimalMax("2000") Double weightKg, @NotNull @Min(0) @Max(1000) Integer reps) {
	}

	public record SetView(long id, int setNumber, double weightKg, int reps) {

		static SetView of(WorkoutSet s) {
			return new SetView(s.getId(), s.getSetNumber(), s.getWeightKg(), s.getReps());
		}

	}

	/** A previous set, shown as "last time" and used to prefill the next set. */
	public record PreviousSet(double weightKg, int reps) {

		static PreviousSet of(WorkoutSet s) {
			return new PreviousSet(s.getWeightKg(), s.getReps());
		}

	}

	public record ExerciseView(long id, long exerciseId, String name, MuscleGroup muscleGroup, Equipment equipment,
			int targetSets, @Nullable Integer targetReps, @Nullable Integer restSeconds, boolean autoProgress,
			List<SetView> sets, List<PreviousSet> lastTime) {

		static ExerciseView of(WorkoutExercise we, List<WorkoutSet> previous) {
			var e = we.getExercise();
			return new ExerciseView(we.getId(), e.getId(), e.getName(), e.getMuscleGroup(), e.getEquipment(),
					we.getTargetSets(), we.getTargetReps(), we.getRestSeconds(), we.isAutoProgress(),
					we.getSets().stream().map(SetView::of).toList(), previous.stream().map(PreviousSet::of).toList());
		}

	}

	public record WorkoutView(long id, @Nullable String name, @Nullable Long routineId, Instant startedAt,
			@Nullable Instant finishedAt, List<ExerciseView> exercises) {

	}

	/** A finished workout in the history list. */
	record WorkoutSummary(long id, @Nullable String name, @Nullable Long routineId, Instant startedAt,
			@Nullable Instant finishedAt, List<String> exercises, int sets, double volumeKg) {

		static WorkoutSummary of(Workout w) {
			var sets = w.getExercises().stream().flatMap((we) -> we.getSets().stream()).toList();
			return new WorkoutSummary(w.getId(), w.getName(), w.getRoutineId(), w.getStartedAt(), w.getFinishedAt(),
					w.getExercises().stream().filter((we) -> !we.getSets().isEmpty())
						.map((we) -> we.getExercise().getName()).toList(),
					sets.size(), Math.round(sets.stream().mapToDouble((s) -> s.getWeightKg() * s.getReps()).sum() * 10) / 10.0);
		}

	}

}
