package app.homelift.stats;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

import org.jspecify.annotations.Nullable;

import app.homelift.exercise.MuscleGroup;

/** Everything the stats page shows for one period. All weights are in kg. */
public record Stats(Period period, LocalDate start, LocalDate end, Totals totals, Totals previous, int activeDays,
		int longestStreakDays, double averageMinutes, @Nullable TopExercise topExercise,
		List<MuscleShare> muscleGroups, @Nullable Lift heaviestLift, List<Lift> records,
		@Nullable Session biggestSession, @Nullable DayCount favoriteWeekday, @Nullable TimeOfDay favoriteTimeOfDay,
		List<Bucket> buckets) {

	public record Totals(int workouts, int sets, int reps, double volumeKg, double minutes) {

		static final Totals EMPTY = new Totals(0, 0, 0, 0, 0);

	}

	public record TopExercise(long exerciseId, String name, int sets, double volumeKg) {

	}

	public record MuscleShare(MuscleGroup muscleGroup, int sets, double share) {

	}

	/** A set worth calling out: the heaviest one, or a new estimated 1RM record. */
	public record Lift(long exerciseId, String name, double weightKg, int reps, double estimatedOneRepMax,
			LocalDate date) {

	}

	public record Session(long workoutId, LocalDate date, double volumeKg, int sets) {

	}

	public record DayCount(DayOfWeek day, int workouts) {

	}

	public record Bucket(LocalDate start, int workouts, double volumeKg) {

	}

	public enum TimeOfDay {

		MORNING, AFTERNOON, EVENING, NIGHT;

		static TimeOfDay at(int hour) {
			if (hour >= 5 && hour < 12) {
				return MORNING;
			}
			if (hour >= 12 && hour < 17) {
				return AFTERNOON;
			}
			if (hour >= 17 && hour < 22) {
				return EVENING;
			}
			return NIGHT;
		}

	}

}
