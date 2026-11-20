package app.homelift.workout;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface WorkoutRepository extends JpaRepository<Workout, Long> {

	Optional<Workout> findFirstByFinishedAtIsNull();

	/**
	 * The most recent earlier time an exercise was done with at least one set logged, so a new
	 * workout can be filled in from it.
	 */
	@Query("""
			select we from WorkoutExercise we
			where we.exercise.id = :exerciseId and we.workout.id <> :excludeWorkoutId and size(we.sets) > 0
			order by we.workout.startedAt desc, we.id desc
			""")
	List<WorkoutExercise> findPreviousExercise(long exerciseId, long excludeWorkoutId, Limit limit);

}
