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
import app.homelift.workout.WorkoutDtos.WorkoutSummary;
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

	/** Finished workouts, newest first. */
	public List<WorkoutSummary> recent(int limit) {
		return this.workouts.findByFinishedAtIsNotNullOrderByStartedAtDescIdDesc(Limit.of(limit))
			.stream()
			.map(WorkoutSummary::of)
			.toList();
	}

	/** The workout with each exercise's sets and what was lifted the last time. */
	public WorkoutView view(long id) {
		Workout w = get(id);
		return new WorkoutView(w.getId(), w.getName(), w.getRoutineId(), w.getStartedAt(), w.getFinishedAt(), w.getNotes(),
				w.getExercises().stream().map((we) -> ExerciseView.of(we, previousSets(we), missedSessions(we))).toList());
	}

	/** The sets logged the last time this exercise was done, in any workout but the given one. */
	List<WorkoutSet> previousSets(WorkoutExercise current) {
		return this.workouts
			.findPreviousExercise(current.getExercise().getId(), current.getWorkout().getId(), Limit.of(1))
			.stream()
			.findFirst()
			.map(WorkoutExercise::getWorkingSets)
			.orElse(List.of());
	}

	/**
	 * How many of the last two sessions with this exercise fell short of the plan (0, 1 or 2),
	 * counting back from the most recent and stopping at the first session that met it. A session
	 * falls short when a planned set is missing or a set has fewer reps than the plan's bottom.
	 */
	int missedSessions(WorkoutExercise current) {
		int missed = 0;
		for (WorkoutExercise earlier : this.workouts.findPreviousExercise(current.getExercise().getId(),
				current.getWorkout().getId(), Limit.of(2))) {
			if (!missedPlan(earlier)) {
				break;
			}
			missed++;
		}
		return missed;
	}

	private static boolean missedPlan(WorkoutExercise e) {
		Integer target = e.getTargetReps();
		if (target == null) {
			return false;
		}
		List<WorkoutSet> sets = e.getWorkingSets();
		return sets.size() < e.getTargetSets() || sets.stream().anyMatch((s) -> s.getReps() < target);
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

	/** Starts a workout from a plan, such as a routine, with its exercises already added. */
	@Transactional
	public Workout startPlanned(String name, long routineId, List<PlannedExercise> plan) {
		Workout workout = start(name);
		workout.startedFrom(routineId);
		for (PlannedExercise p : plan) {
			WorkoutExercise added = workout.addExercise(this.exercises.get(p.exerciseId()), p.sets());
			added.plan(p.reps(), p.maxReps(), p.restSeconds(), p.autoProgress());
			added.supersetGroup(p.supersetGroup());
		}
		this.workouts.flush();
		return workout;
	}

	@Transactional
	WorkoutExercise addExercise(long workoutId, long exerciseId, @Nullable Integer targetSets) {
		Workout workout = editable(workoutId);
		Exercise exercise = this.exercises.get(exerciseId);
		WorkoutExercise added = workout.addExercise(exercise, (targetSets != null) ? targetSets : DEFAULT_TARGET_SETS);
		added.rest(exercise.getRestSeconds());
		this.workouts.flush();
		return added;
	}

	@Transactional
	void removeExercise(long workoutId, long workoutExerciseId) {
		Workout workout = editable(workoutId);
		workout.removeExercise(exerciseOf(workout, workoutExerciseId));
	}

	@Transactional
	WorkoutSet logSet(long workoutId, long workoutExerciseId, double weightKg, int reps, boolean warmup) {
		Workout workout = editable(workoutId);
		WorkoutSet set = exerciseOf(workout, workoutExerciseId).logSet(weightKg, reps, warmup, this.clock.instant());
		this.workouts.flush();
		return set;
	}

	/** Fixes the weight or reps of a set already logged. */
	@Transactional
	WorkoutSet updateSet(long workoutId, long workoutExerciseId, long setId, double weightKg, int reps,
			boolean warmup) {
		WorkoutSet set = exerciseOf(editable(workoutId), workoutExerciseId).findSet(setId)
			.orElseThrow(() -> new WorkoutNotFoundException("Set " + setId));
		set.correct(weightKg, reps, warmup);
		return set;
	}

	@Transactional
	void removeSet(long workoutId, long workoutExerciseId, long setId) {
		Workout workout = editable(workoutId);
		WorkoutExercise exercise = exerciseOf(workout, workoutExerciseId);
		exercise.removeSet(exercise.findSet(setId).orElseThrow(() -> new WorkoutNotFoundException("Set " + setId)));
	}

	/** Notes can be added or changed at any time, even after the workout is finished. */
	@Transactional
	void notes(long workoutId, @Nullable String notes) {
		get(workoutId).notes((notes == null || notes.isBlank()) ? null : notes.strip());
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
