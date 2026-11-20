package app.homelift.workout;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only access to every set in finished workouts, oldest first. */
@Service
@Transactional(readOnly = true)
public class TrainingLog {

	private final SetRecordRepository repository;

	TrainingLog(SetRecordRepository repository) {
		this.repository = repository;
	}

	public List<SetRecord> finishedSets() {
		return this.repository.findFinishedSets();
	}

	public List<SetRecord> finishedSets(long exerciseId) {
		return this.repository.findFinishedSets(exerciseId);
	}

}
