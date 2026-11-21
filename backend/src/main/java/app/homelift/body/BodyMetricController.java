package app.homelift.body;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import app.homelift.body.BodyMetric.Kind;

/** Body weight and measurements. */
@RestController
@RequestMapping("/api/body")
class BodyMetricController {

	private final BodyMetricRepository repository;

	BodyMetricController(BodyMetricRepository repository) {
		this.repository = repository;
	}

	/**
	 * @param from first day, inclusive
	 * @param to day after the last, exclusive
	 */
	@GetMapping
	List<BodyMetric> list(@RequestParam(required = false) @Nullable Kind kind,
			@RequestParam(required = false) @Nullable LocalDate from,
			@RequestParam(required = false) @Nullable LocalDate to) {
		return this.repository.find(kind, from, to);
	}

	/** Records a value for a day; a second value for the same day and kind replaces the first. */
	@PutMapping
	@Transactional
	BodyMetric save(@Valid @RequestBody Entry entry) {
		return this.repository.upsert(entry.date(), entry.kind(), entry.value());
	}

	@DeleteMapping("/{id}")
	@Transactional
	ResponseEntity<Void> delete(@PathVariable long id) {
		this.repository.findById(id).orElseThrow(() -> {
			ErrorResponseException ex = new ErrorResponseException(HttpStatus.NOT_FOUND);
			ex.getBody().setTitle("Measurement not found");
			return ex;
		});
		this.repository.delete(id);
		return ResponseEntity.noContent().build();
	}

	record Entry(@NotNull LocalDate date, @NotNull Kind kind,
			@NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("1000") Double value) {
	}

}
