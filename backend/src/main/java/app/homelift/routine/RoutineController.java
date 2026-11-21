package app.homelift.routine;

import java.net.URI;
import java.util.List;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import app.homelift.routine.RoutineDtos.RoutineInput;
import app.homelift.routine.RoutineDtos.RoutineView;
import app.homelift.workout.WorkoutDtos.WorkoutView;
import app.homelift.workout.WorkoutService;

/** REST API for routines. */
@RestController
@RequestMapping("/api/routines")
class RoutineController {

	private final RoutineService service;

	private final WorkoutService workouts;

	RoutineController(RoutineService service, WorkoutService workouts) {
		this.service = service;
		this.workouts = workouts;
	}

	@GetMapping
	List<RoutineView> list() {
		return this.service.list();
	}

	@GetMapping("/{id}")
	RoutineView get(@PathVariable long id) {
		return this.service.view(id);
	}

	@PostMapping
	ResponseEntity<RoutineView> create(@Valid @RequestBody RoutineInput input) {
		RoutineView created = this.service.create(input);
		return ResponseEntity.created(URI.create("/api/routines/" + created.id())).body(created);
	}

	@PutMapping("/{id}")
	RoutineView update(@PathVariable long id, @Valid @RequestBody RoutineInput input) {
		return this.service.update(id, input);
	}

	@DeleteMapping("/{id}")
	ResponseEntity<Void> delete(@PathVariable long id) {
		this.service.delete(id);
		return ResponseEntity.noContent().build();
	}

	/** Starts a workout from this routine and returns it, like POST /api/workouts. */
	@PostMapping("/{id}/start")
	ResponseEntity<WorkoutView> start(@PathVariable long id) {
		long workoutId = this.service.start(id);
		return ResponseEntity.created(URI.create("/api/workouts/" + workoutId)).body(this.workouts.view(workoutId));
	}

}
