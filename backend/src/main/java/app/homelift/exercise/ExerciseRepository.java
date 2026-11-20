package app.homelift.exercise;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

interface ExerciseRepository extends JpaRepository<Exercise, Long> {

	List<Exercise> findByArchivedFalseOrderByNameAsc();

	List<Exercise> findAllByOrderByNameAsc();

	Optional<Exercise> findByNameIgnoreCase(String name);

	boolean existsByNameIgnoreCase(String name);

	boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

}
