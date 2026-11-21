package app.homelift.exercise;

import java.util.List;
import java.util.Locale;

import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reads and changes the exercise library. */
@Service
@Transactional(readOnly = true)
public class ExerciseService {

	private final ExerciseRepository repository;

	ExerciseService(ExerciseRepository repository) {
		this.repository = repository;
	}

	/**
	 * Lists exercises sorted by name.
	 * @param query case-insensitive text the name must contain, or {@code null} for all
	 * @param muscleGroup only this group, or {@code null} for all
	 * @param includeArchived whether archived exercises are included
	 */
	public List<Exercise> list(@Nullable String query, @Nullable MuscleGroup muscleGroup, boolean includeArchived) {
		List<Exercise> all = includeArchived ? this.repository.findAllByOrderByNameAsc()
				: this.repository.findByArchivedFalseOrderByNameAsc();
		String needle = (query == null) ? "" : query.strip().toLowerCase(Locale.ROOT);
		// The library is a few hundred rows at most, so filtering in memory keeps the queries simple.
		return all.stream()
			.filter((e) -> muscleGroup == null || e.getMuscleGroup() == muscleGroup)
			.filter((e) -> needle.isEmpty() || e.getName().toLowerCase(Locale.ROOT).contains(needle))
			.toList();
	}

	public Exercise get(long id) {
		return this.repository.findById(id).orElseThrow(() -> new ExerciseNotFoundException(id));
	}

	@Transactional
	Exercise create(ExerciseRequest request) {
		String name = request.cleanName();
		if (this.repository.existsByNameIgnoreCase(name)) {
			throw new DuplicateExerciseException(name);
		}
		return this.repository
			.save(new Exercise(name, request.muscleGroup(), request.equipment(), request.restSeconds(),
					request.cleanNotes()));
	}

	@Transactional
	Exercise update(long id, ExerciseRequest request) {
		Exercise exercise = get(id);
		String name = request.cleanName();
		if (this.repository.existsByNameIgnoreCaseAndIdNot(name, id)) {
			throw new DuplicateExerciseException(name);
		}
		exercise.update(name, request.muscleGroup(), request.equipment(), request.restSeconds(), request.cleanNotes());
		return exercise;
	}

	@Transactional
	Exercise archive(long id) {
		Exercise exercise = get(id);
		exercise.archive();
		return exercise;
	}

	@Transactional
	Exercise restore(long id) {
		Exercise exercise = get(id);
		exercise.restore();
		return exercise;
	}

}
