package app.homelift.workout;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

interface SetRecordRepository extends Repository<WorkoutSet, Long> {

	String SELECT = """
			select new app.homelift.workout.SetRecord(s.id, w.id, w.startedAt, w.finishedAt, e.id, e.name,
				e.muscleGroup, s.setNumber, s.weightKg, s.reps, s.loggedAt)
			from WorkoutSet s join s.workoutExercise we join we.workout w join we.exercise e
			where w.finishedAt is not null and s.warmup = false
			""";

	@Query(SELECT + " order by s.loggedAt, s.id")
	List<SetRecord> findFinishedSets();

	@Query(SELECT + " and e.id = :exerciseId order by s.loggedAt, s.id")
	List<SetRecord> findFinishedSets(long exerciseId);

}
