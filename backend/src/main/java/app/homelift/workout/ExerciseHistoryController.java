package app.homelift.workout;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import app.homelift.exercise.ExerciseService;

/** Past sessions and personal records for one exercise. */
@RestController
class ExerciseHistoryController {

	private final ExerciseService exercises;

	private final TrainingLog log;

	ExerciseHistoryController(ExerciseService exercises, TrainingLog log) {
		this.exercises = exercises;
		this.log = log;
	}

	@GetMapping("/api/exercises/{id}/history")
	History history(@PathVariable long id) {
		this.exercises.get(id); // 404 for an unknown exercise
		List<SetRecord> sets = this.log.finishedSets(id);

		Map<Long, List<SetRecord>> byWorkout = new LinkedHashMap<>();
		sets.forEach((s) -> byWorkout.computeIfAbsent(s.workoutId(), (k) -> new ArrayList<>()).add(s));
		List<Session> sessions = byWorkout.values().stream().map(Session::of).toList().reversed();

		return new History(sessions, Records.of(sets, sessions));
	}

	record Set(int setNumber, double weightKg, int reps) {

	}

	record Session(long workoutId, Instant date, List<Set> sets, double volumeKg, double bestOneRepMax,
			double topWeightKg) {

		static Session of(List<SetRecord> sets) {
			SetRecord first = sets.getFirst();
			return new Session(first.workoutId(), first.workoutStartedAt(),
					sets.stream().map((s) -> new Set(s.setNumber(), s.weightKg(), s.reps())).toList(),
					round(sets.stream().mapToDouble(SetRecord::volumeKg).sum()),
					round(sets.stream().mapToDouble(SetRecord::estimatedOneRepMax).max().orElse(0)),
					sets.stream().mapToDouble(SetRecord::weightKg).max().orElse(0));
		}

	}

	/** A record and when it was set. */
	record Best(double value, double weightKg, int reps, Instant date) {

	}

	record Records(@Nullable Best oneRepMax, @Nullable Best heaviest, @Nullable Best mostReps,
			@Nullable Best sessionVolume, int sessions, int totalSets) {

		static Records of(List<SetRecord> sets, List<Session> sessions) {
			return new Records(
					best(sets, Comparator.comparingDouble(SetRecord::estimatedOneRepMax),
							(s) -> round(s.estimatedOneRepMax())),
					best(sets, Comparator.comparingDouble(SetRecord::weightKg).thenComparingInt(SetRecord::reps),
							SetRecord::weightKg),
					best(sets, Comparator.comparingInt(SetRecord::reps).thenComparingDouble(SetRecord::weightKg),
							(s) -> s.reps()),
					sessions.stream()
						.max(Comparator.comparingDouble(Session::volumeKg))
						.map((s) -> new Best(s.volumeKg(), 0, 0, s.date()))
						.orElse(null),
					sessions.size(), sets.size());
		}

		private static @Nullable Best best(List<SetRecord> sets, Comparator<SetRecord> order,
				java.util.function.ToDoubleFunction<SetRecord> value) {
			// The earliest set wins a tie, since that is when the record was first reached.
			return sets.stream()
				.reduce((a, b) -> (order.compare(b, a) > 0) ? b : a)
				.map((s) -> new Best(value.applyAsDouble(s), s.weightKg(), s.reps(), s.workoutStartedAt()))
				.orElse(null);
		}

	}

	record History(List<Session> sessions, Records records) {

	}

	static double round(double value) {
		return Math.round(value * 10) / 10.0;
	}

}
