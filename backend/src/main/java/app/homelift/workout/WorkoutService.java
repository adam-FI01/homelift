package app.homelift.workout;

import java.time.Clock;
import java.util.List;
import java.util.Optional;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.homelift.exercise.Exercise;
import app.homelift.exercise.ExerciseService;
import app.homelift.workout.WorkoutDtos.ExerciseView;
import app.homelift.workout.WorkoutDtos.WorkoutView;

/** Starts, records and finishes workouts. */
@Service
@Transactional(readOnly = true)
public class WorkoutService {

	static final int DEFAULT_TARGET_SETS = 3;

	private final WorkoutRepository workouts;

	private final ExerciseService exercises;

	private final Clock clock;

	WorkoutService(WorkoutRepository workouts, ExerciseService exercises, Clock clock) {
		this.workouts = workouts;
		this.exercises = exercises;
		this.clock = clock;
	}

	public Optional<Workout> inProgress() {
		return this.workouts.findFirstByFinishedAtIsNull();
	}

	public Workout get(long id) {
		return this.workouts.findById(id).orElseThrow(() -> new WorkoutNotFoundException("Workout " + id));
	}

	/** The workout with each exercise's sets and what was lifted the last time. */
	public WorkoutView view(long id) {
		Workout w = get(id);
		return new WorkoutView(w.getId(), w.getName(), w.getStartedAt(), w.getFinishedAt(),
				w.getExercises().stream().map((we) -> ExerciseView.of(we, previousSets(we))).toList());
	}

	/** The sets logged the last time this exercise was done, in any workout but the given one. */
	List<WorkoutSet> previousSets(WorkoutExercise current) {
		return this.workouts
			.findPreviousExercise(current.getExercise().getId(), current.getWorkout().getId(), Limit.of(1))
			.stream()
			.findFirst()
			.map(WorkoutExercise::getSets)
			.orElse(List.of());
	}

	@Transactional
	Workout start(@Nullable String name) {
		inProgress().ifPresent((w) -> {
			throw new WorkoutConflictException("Workout in progress",
					"Finish or discard the workout in progress before starting another.");
		});
		String cleanName = (name == null || name.isBlank()) ? null : name.strip();
		return this.workouts.save(new Workout(cleanName, this.clock.instant()));
	}

	@Transactional
	WorkoutExercise addExercise(long workoutId, long exerciseId, @Nullable Integer targetSets) {
		Workout workout = editable(workoutId);
		Exercise exercise = this.exercises.get(exerciseId);
		WorkoutExercise added = workout.addExercise(exercise, (targetSets != null) ? targetSets : DEFAULT_TARGET_SETS);
		this.workouts.flush();
		return added;
	}

	@Transactional
	void removeExercise(long workoutId, long workoutExerciseId) {
		Workout workout = editable(workoutId);
		workout.removeExercise(exerciseOf(workout, workoutExerciseId));
	}

	@Transactional
	WorkoutSet logSet(long workoutId, long workoutExerciseId, double weightKg, int reps) {
		Workout workout = editable(workoutId);
		WorkoutSet set = exerciseOf(workout, workoutExerciseId).logSet(weightKg, reps, this.clock.instant());
		this.workouts.flush();
		return set;
	}

	@Transactional
	void removeSet(long workoutId, long workoutExerciseId, long setId) {
		Workout workout = editable(workoutId);
		WorkoutExercise exercise = exerciseOf(workout, workoutExerciseId);
		exercise.removeSet(exercise.findSet(setId).orElseThrow(() -> new WorkoutNotFoundException("Set " + setId)));
	}

	@Transactional
	Workout finish(long workoutId) {
		Workout workout = editable(workoutId);
		workout.finish(this.clock.instant());
		return workout;
	}

	@Transactional
	void discard(long workoutId) {
		this.workouts.delete(get(workoutId));
	}

	private Workout editable(long workoutId) {
		Workout workout = get(workoutId);
		if (!workout.isInProgress()) {
			throw new WorkoutConflictException("Workout finished", "This workout is finished and can't be changed.");
		}
		return workout;
	}

	private WorkoutExercise exerciseOf(Workout workout, long workoutExerciseId) {
		return workout.findExercise(workoutExerciseId)
			.orElseThrow(() -> new WorkoutNotFoundException("Exercise " + workoutExerciseId + " in this workout"));
	}

}
