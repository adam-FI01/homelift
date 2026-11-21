package app.homelift.stats;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.jspecify.annotations.Nullable;

import app.homelift.exercise.MuscleGroup;
import app.homelift.stats.Stats.Bucket;
import app.homelift.stats.Stats.DayCount;
import app.homelift.stats.Stats.Lift;
import app.homelift.stats.Stats.MuscleShare;
import app.homelift.stats.Stats.Session;
import app.homelift.stats.Stats.TimeOfDay;
import app.homelift.stats.Stats.TopExercise;
import app.homelift.stats.Stats.Totals;
import app.homelift.workout.SetRecord;

/**
 * Turns the training log into stats for one period. Pure and in memory: a home lifter's whole
 * history is a few thousand sets, so this stays fast without clever SQL.
 */
final class StatsCalculator {

	private static final int MAX_RECORDS = 10;

	private final ZoneId zone;

	StatsCalculator(ZoneId zone) {
		this.zone = zone;
	}

	/**
	 * @param all every finished set, oldest first
	 */
	Stats calculate(List<SetRecord> all, Period period, LocalDate anchor) {
		LocalDate start = period.start(anchor);
		LocalDate end = period.end(start);
		LocalDate previousStart = period.start(start.minusDays(1));

		List<SetRecord> sets = between(all, start, end);
		Map<Long, List<SetRecord>> workouts = byWorkout(sets);
		Totals totals = totals(sets);

		return new Stats(period, start, end, totals, totals(between(all, previousStart, start)),
				activeDays(sets).size(), longestStreak(activeDays(sets)),
				workouts.isEmpty() ? 0 : round(totals.minutes() / workouts.size()), topExercise(sets),
				muscleGroups(sets), heaviest(sets), records(all, start, end), biggestSession(workouts),
				favoriteWeekday(workouts), favoriteTimeOfDay(workouts), buckets(sets, period, start, end));
	}

	private List<SetRecord> between(List<SetRecord> all, LocalDate from, LocalDate to) {
		return all.stream().filter((s) -> {
			LocalDate day = day(s);
			return !day.isBefore(from) && day.isBefore(to);
		}).toList();
	}

	private Totals totals(List<SetRecord> sets) {
		if (sets.isEmpty()) {
			return Totals.EMPTY;
		}
		Map<Long, List<SetRecord>> workouts = byWorkout(sets);
		double minutes = workouts.values().stream().mapToDouble((w) -> minutes(w.getFirst())).sum();
		return new Totals(workouts.size(), sets.size(), sets.stream().mapToInt(SetRecord::reps).sum(),
				round(sets.stream().mapToDouble(SetRecord::volumeKg).sum()), round(minutes));
	}

	private TreeSet<LocalDate> activeDays(List<SetRecord> sets) {
		return sets.stream().map(this::day).collect(Collectors.toCollection(TreeSet::new));
	}

	static int longestStreak(TreeSet<LocalDate> days) {
		int best = 0;
		int run = 0;
		LocalDate previous = null;
		for (LocalDate day : days) {
			run = (previous != null && previous.plusDays(1).equals(day)) ? run + 1 : 1;
			best = Math.max(best, run);
			previous = day;
		}
		return best;
	}

	private @Nullable TopExercise topExercise(List<SetRecord> sets) {
		return sets.stream()
			.collect(Collectors.groupingBy(SetRecord::exerciseId, LinkedHashMap::new, Collectors.toList()))
			.values()
			.stream()
			.max(Comparator.<List<SetRecord>>comparingInt(List::size)
				.thenComparingDouble((l) -> l.stream().mapToDouble(SetRecord::volumeKg).sum()))
			.map((l) -> new TopExercise(l.getFirst().exerciseId(), l.getFirst().exerciseName(), l.size(),
					round(l.stream().mapToDouble(SetRecord::volumeKg).sum())))
			.orElse(null);
	}

	private List<MuscleShare> muscleGroups(List<SetRecord> sets) {
		Map<MuscleGroup, Integer> counts = new EnumMap<>(MuscleGroup.class);
		sets.forEach((s) -> counts.merge(s.muscleGroup(), 1, Integer::sum));
		return counts.entrySet()
			.stream()
			.sorted(Map.Entry.<MuscleGroup, Integer>comparingByValue().reversed())
			.map((e) -> new MuscleShare(e.getKey(), e.getValue(), round(e.getValue() * 100.0 / sets.size())))
			.toList();
	}

	private @Nullable Lift heaviest(List<SetRecord> sets) {
		return sets.stream()
			.max(Comparator.comparingDouble(SetRecord::weightKg).thenComparingInt(SetRecord::reps))
			.filter((s) -> s.weightKg() > 0)
			.map(this::lift)
			.orElse(null);
	}

	/** Sets in the period that beat every earlier estimated 1RM for their exercise, best first. */
	private List<Lift> records(List<SetRecord> all, LocalDate start, LocalDate end) {
		Map<Long, Double> best = new HashMap<>();
		Map<Long, SetRecord> recordInPeriod = new LinkedHashMap<>();
		for (SetRecord s : all) {
			LocalDate day = day(s);
			if (!day.isBefore(end)) {
				break;
			}
			double e1rm = s.estimatedOneRepMax();
			Double previous = best.get(s.exerciseId());
			if (previous == null || e1rm > previous) {
				best.put(s.exerciseId(), e1rm);
				// The first time an exercise is done sets a baseline, not a record.
				if (previous != null && !day.isBefore(start)) {
					recordInPeriod.put(s.exerciseId(), s); // keep the latest, highest one
				}
			}
		}
		return recordInPeriod.values()
			.stream()
			.sorted(Comparator.comparingDouble(SetRecord::estimatedOneRepMax).reversed())
			.limit(MAX_RECORDS)
			.map(this::lift)
			.toList();
	}

	private @Nullable Session biggestSession(Map<Long, List<SetRecord>> workouts) {
		return workouts.values()
			.stream()
			.max(Comparator.comparingDouble((w) -> w.stream().mapToDouble(SetRecord::volumeKg).sum()))
			.map((w) -> new Session(w.getFirst().workoutId(), day(w.getFirst()),
					round(w.stream().mapToDouble(SetRecord::volumeKg).sum()), w.size()))
			.orElse(null);
	}

	private @Nullable DayCount favoriteWeekday(Map<Long, List<SetRecord>> workouts) {
		return mostCommon(workouts, (s) -> day(s).getDayOfWeek()).map((e) -> new DayCount(e.getKey(), e.getValue()))
			.orElse(null);
	}

	private @Nullable TimeOfDay favoriteTimeOfDay(Map<Long, List<SetRecord>> workouts) {
		return mostCommon(workouts, (s) -> TimeOfDay.at(s.workoutStartedAt().atZone(this.zone).getHour()))
			.map(Map.Entry::getKey)
			.orElse(null);
	}

	/** The most common key across workouts; ties go to the earliest key (Monday, morning). */
	private <K extends Comparable<K>> java.util.Optional<Map.Entry<K, Integer>> mostCommon(
			Map<Long, List<SetRecord>> workouts, Function<SetRecord, K> key) {
		Map<K, Integer> counts = new HashMap<>();
		workouts.values().forEach((w) -> counts.merge(key.apply(w.getFirst()), 1, Integer::sum));
		return counts.entrySet()
			.stream()
			.max(Map.Entry.<K, Integer>comparingByValue().thenComparing(Map.Entry.comparingByKey(Comparator.reverseOrder())));
	}

	private List<Bucket> buckets(List<SetRecord> sets, Period period, LocalDate start, LocalDate end) {
		Map<LocalDate, List<SetRecord>> grouped = sets.stream()
			.collect(Collectors.groupingBy((s) -> period.bucketStart(day(s))));
		List<Bucket> buckets = new ArrayList<>();
		for (LocalDate b = period.bucketStart(start); b.isBefore(end); b = period.nextBucket(b)) {
			List<SetRecord> in = grouped.getOrDefault(b, List.of());
			buckets.add(new Bucket(b, byWorkout(in).size(), round(in.stream().mapToDouble(SetRecord::volumeKg).sum())));
		}
		return buckets;
	}

	private Map<Long, List<SetRecord>> byWorkout(List<SetRecord> sets) {
		return sets.stream().collect(Collectors.groupingBy(SetRecord::workoutId, LinkedHashMap::new, Collectors.toList()));
	}

	private Lift lift(SetRecord s) {
		return new Lift(s.exerciseId(), s.exerciseName(), s.weightKg(), s.reps(), round(s.estimatedOneRepMax()), day(s));
	}

	/** Workouts belong to the day they started, in the viewer's time zone. */
	private LocalDate day(SetRecord s) {
		return s.workoutStartedAt().atZone(this.zone).toLocalDate();
	}

	private static double minutes(SetRecord s) {
		return (s.workoutFinishedAt() != null)
				? Duration.between(s.workoutStartedAt(), s.workoutFinishedAt()).toSeconds() / 60.0 : 0;
	}

	private static double round(double value) {
		return Math.round(value * 10) / 10.0;
	}

}
