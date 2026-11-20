package app.homelift.routine;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface RoutineRepository extends JpaRepository<Routine, Long> {

	List<Routine> findAllByOrderByNameAsc();

	boolean existsByNameIgnoreCase(String name);

	boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

}
