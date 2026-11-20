package app.homelift.exercise;

import java.net.URI;
import java.util.List;

import jakarta.validation.Valid;
import org.jspecify.annotations.Nullable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** REST API for the exercise library. */
@RestController
@RequestMapping("/api/exercises")
class ExerciseController {

	private final ExerciseService service;

	ExerciseController(ExerciseService service) {
		this.service = service;
	}

	@GetMapping
	List<ExerciseResponse> list(@RequestParam(required = false) @Nullable String q,
			@RequestParam(required = false) @Nullable MuscleGroup muscleGroup,
			@RequestParam(defaultValue = "false") boolean includeArchived) {
		return this.service.list(q, muscleGroup, includeArchived).stream().map(ExerciseResponse::of).toList();
	}

	@GetMapping("/{id}")
	ExerciseResponse get(@PathVariable long id) {
		return ExerciseResponse.of(this.service.get(id));
	}

	@PostMapping
	ResponseEntity<ExerciseResponse> create(@Valid @RequestBody ExerciseRequest request) {
		Exercise created = this.service.create(request);
		return ResponseEntity.created(URI.create("/api/exercises/" + created.getId()))
			.body(ExerciseResponse.of(created));
	}

	@PutMapping("/{id}")
	ExerciseResponse update(@PathVariable long id, @Valid @RequestBody ExerciseRequest request) {
		return ExerciseResponse.of(this.service.update(id, request));
	}

	@PostMapping("/{id}/archive")
	ExerciseResponse archive(@PathVariable long id) {
		return ExerciseResponse.of(this.service.archive(id));
	}

	@PostMapping("/{id}/restore")
	ExerciseResponse restore(@PathVariable long id) {
		return ExerciseResponse.of(this.service.restore(id));
	}

}
