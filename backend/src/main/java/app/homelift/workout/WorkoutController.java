package app.homelift.workout;

import java.net.URI;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.jspecify.annotations.Nullable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import app.homelift.workout.WorkoutDtos.AddExercise;
import app.homelift.workout.WorkoutDtos.LogSet;
import app.homelift.workout.WorkoutDtos.SetView;
import app.homelift.workout.WorkoutDtos.StartWorkout;
import app.homelift.workout.WorkoutDtos.WorkoutSummary;
import app.homelift.workout.WorkoutDtos.WorkoutView;

/** REST API for logging a workout. Every change returns the updated workout. */
@RestController
@RequestMapping("/api/workouts")
class WorkoutController {

	private final WorkoutService service;

	WorkoutController(WorkoutService service) {
		this.service = service;
	}

	/** Finished workouts, newest first. */
	@GetMapping
	List<WorkoutSummary> recent(@RequestParam(defaultValue = "30") @Min(1) @Max(500) int limit) {
		return this.service.recent(limit);
	}

	/** The workout in progress, or 204 when there is none. */
	@GetMapping("/current")
	ResponseEntity<WorkoutView> current() {
		return this.service.inProgress()
			.map((w) -> ResponseEntity.ok(this.service.view(w.getId())))
			.orElse(ResponseEntity.noContent().build());
	}

	@GetMapping("/{id}")
	WorkoutView get(@PathVariable long id) {
		return this.service.view(id);
	}

	@PostMapping
	ResponseEntity<WorkoutView> start(@Valid @RequestBody(required = false) @Nullable StartWorkout body) {
		Workout workout = this.service.start((body != null) ? body.name() : null);
		return ResponseEntity.created(URI.create("/api/workouts/" + workout.getId())).body(this.service.view(workout.getId()));
	}

	@PostMapping("/{id}/exercises")
	WorkoutView addExercise(@PathVariable long id, @Valid @RequestBody AddExercise body) {
		this.service.addExercise(id, body.exerciseId(), body.targetSets());
		return this.service.view(id);
	}

	@DeleteMapping("/{id}/exercises/{workoutExerciseId}")
	WorkoutView removeExercise(@PathVariable long id, @PathVariable long workoutExerciseId) {
		this.service.removeExercise(id, workoutExerciseId);
		return this.service.view(id);
	}

	@PostMapping("/{id}/exercises/{workoutExerciseId}/sets")
	ResponseEntity<SetView> logSet(@PathVariable long id, @PathVariable long workoutExerciseId,
			@Valid @RequestBody LogSet body) {
		WorkoutSet set = this.service.logSet(id, workoutExerciseId, body.weightKg(), body.reps());
		return ResponseEntity.status(201).body(SetView.of(set));
	}

	@PutMapping("/{id}/exercises/{workoutExerciseId}/sets/{setId}")
	SetView updateSet(@PathVariable long id, @PathVariable long workoutExerciseId, @PathVariable long setId,
			@Valid @RequestBody LogSet body) {
		return SetView.of(this.service.updateSet(id, workoutExerciseId, setId, body.weightKg(), body.reps()));
	}

	@DeleteMapping("/{id}/exercises/{workoutExerciseId}/sets/{setId}")
	ResponseEntity<Void> removeSet(@PathVariable long id, @PathVariable long workoutExerciseId,
			@PathVariable long setId) {
		this.service.removeSet(id, workoutExerciseId, setId);
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/{id}/finish")
	WorkoutView finish(@PathVariable long id) {
		return this.service.view(this.service.finish(id).getId());
	}

	@DeleteMapping("/{id}")
	ResponseEntity<Void> discard(@PathVariable long id) {
		this.service.discard(id);
		return ResponseEntity.noContent().build();
	}

}
