package app.homelift.routine;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.ErrorResponseException;

import app.homelift.exercise.ExerciseService;
import app.homelift.routine.RoutineDtos.RoutineInput;
import app.homelift.routine.RoutineDtos.RoutineView;
import app.homelift.workout.PlannedExercise;
import app.homelift.workout.Workout;
import app.homelift.workout.WorkoutService;

/** Creates and edits routines, and starts workouts from them. */
@Service
@Transactional(readOnly = true)
public class RoutineService {

	private final RoutineRepository routines;

	private final ExerciseService exercises;

	private final WorkoutService workouts;

	RoutineService(RoutineRepository routines, ExerciseService exercises, WorkoutService workouts) {
		this.routines = routines;
		this.exercises = exercises;
		this.workouts = workouts;
	}

	public List<RoutineView> list() {
		return this.routines.findAllByOrderByNameAsc().stream().map(RoutineView::of).toList();
	}

	public RoutineView view(long id) {
		return RoutineView.of(get(id));
	}

	@Transactional
	RoutineView create(RoutineInput input) {
		String name = input.cleanName();
		if (this.routines.existsByNameIgnoreCase(name)) {
			throw duplicate(name);
		}
		Routine routine = new Routine(name);
		routine.replaceExercises(plan(input));
		return RoutineView.of(this.routines.saveAndFlush(routine));
	}

	@Transactional
	RoutineView update(long id, RoutineInput input) {
		Routine routine = get(id);
		String name = input.cleanName();
		if (this.routines.existsByNameIgnoreCaseAndIdNot(name, id)) {
			throw duplicate(name);
		}
		routine.rename(name);
		routine.replaceExercises(plan(input));
		this.routines.flush();
		return RoutineView.of(routine);
	}

	@Transactional
	void delete(long id) {
		this.routines.delete(get(id));
	}

	/** Starts a workout with the routine's exercises and plan; returns the new workout's id. */
	@Transactional
	long start(long id) {
		Routine routine = get(id);
		Workout workout = this.workouts.startPlanned(routine.getName(), routine.getId(),
				routine.getExercises()
					.stream()
					.map((e) -> new PlannedExercise(e.getExercise().getId(), e.getSets(), e.getReps(),
							e.getMaxReps(), e.getRestSeconds(), e.isAutoProgress(), e.getSupersetGroup()))
					.toList());
		return workout.getId();
	}

	private List<RoutineExercise> plan(RoutineInput input) {
		// Checked here, not with a bean validation getter, so it needs no reflection in the native image.
		if (input.exercises().stream().anyMatch((e) -> e.maxReps() != null && e.maxReps() < e.reps())) {
			ErrorResponseException ex = new ErrorResponseException(HttpStatus.BAD_REQUEST);
			ex.getBody().setTitle("Invalid rep range");
			ex.getBody().setDetail("The top of a rep range can't be below the bottom.");
			throw ex;
		}
		return input.exercises()
			.stream()
			.map((e) -> new RoutineExercise(this.exercises.get(e.exerciseId()), e.sets(), e.reps(), e.maxReps(), e.restSeconds(),
					e.autoProgress(), e.supersetGroup()))
			.toList();
	}

	private Routine get(long id) {
		return this.routines.findById(id).orElseThrow(() -> {
			ErrorResponseException ex = new ErrorResponseException(HttpStatus.NOT_FOUND);
			ex.getBody().setTitle("Routine not found");
			ex.getBody().setDetail("No routine with id " + id + ".");
			return ex;
		});
	}

	private static ErrorResponseException duplicate(String name) {
		ErrorResponseException ex = new ErrorResponseException(HttpStatus.CONFLICT);
		ex.getBody().setTitle("Routine already exists");
		ex.getBody().setDetail("A routine named \"" + name + "\" already exists.");
		return ex;
	}

}
