package app.homelift.stats;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

import org.junit.jupiter.api.Test;

import app.homelift.exercise.MuscleGroup;
import app.homelift.stats.Stats.TimeOfDay;
import app.homelift.workout.SetRecord;

class StatsCalculatorTests {

	private static final ZoneId ZONE = ZoneId.of("America/New_York");

	private final List<SetRecord> log = new ArrayList<>();

	private long nextWorkout = 1;

	private long nextSet = 1;

	@Test
	void summarisesAWeek() {
		// Previous week: one bench session sets the baseline.
		workout("2026-11-11T18:00:00-05:00", 60, set(1, "Bench Press", MuscleGroup.CHEST, 80, 5));
		// This week (Mon 16 – Sun 22 Nov): three sessions, two of them on back-to-back days.
		workout("2026-11-16T07:00:00-05:00", 45, set(1, "Bench Press", MuscleGroup.CHEST, 85, 5),
				set(1, "Bench Press", MuscleGroup.CHEST, 85, 5), set(2, "Barbell Row", MuscleGroup.BACK, 70, 8));
		workout("2026-11-17T07:30:00-05:00", 50, set(3, "Back Squat", MuscleGroup.LEGS, 120, 3),
				set(3, "Back Squat", MuscleGroup.LEGS, 100, 5));
		workout("2026-11-20T19:00:00-05:00", 40, set(1, "Bench Press", MuscleGroup.CHEST, 82.5, 5));
		// Next week is ignored.
		workout("2026-11-23T07:00:00-05:00", 40, set(1, "Bench Press", MuscleGroup.CHEST, 100, 5));

		Stats stats = new StatsCalculator(ZONE).calculate(this.log, Period.WEEK, LocalDate.parse("2026-11-19"));

		assertThat(stats.start()).isEqualTo("2026-11-16");
		assertThat(stats.end()).isEqualTo("2026-11-23");
		assertThat(stats.totals().workouts()).isEqualTo(3);
		assertThat(stats.totals().sets()).isEqualTo(6);
		assertThat(stats.totals().reps()).isEqualTo(31);
		assertThat(stats.totals().volumeKg()).isEqualTo(850 + 560 + 360 + 500 + 412.5);
		assertThat(stats.totals().minutes()).isEqualTo(135);
		assertThat(stats.averageMinutes()).isEqualTo(45);
		assertThat(stats.previous().workouts()).isEqualTo(1);
		assertThat(stats.previous().volumeKg()).isEqualTo(400);

		assertThat(stats.activeDays()).isEqualTo(3);
		assertThat(stats.longestStreakDays()).isEqualTo(2);
		assertThat(stats.topExercise().name()).isEqualTo("Bench Press");
		assertThat(stats.topExercise().sets()).isEqualTo(3);
		assertThat(stats.muscleGroups()).first().satisfies((m) -> {
			assertThat(m.muscleGroup()).isEqualTo(MuscleGroup.CHEST);
			assertThat(m.share()).isEqualTo(50.0);
		});
		assertThat(stats.heaviestLift().name()).isEqualTo("Back Squat");
		assertThat(stats.heaviestLift().weightKg()).isEqualTo(120);
		// Bench beat last week's 80 × 5; squat and row are first-timers, so not records.
		assertThat(stats.records()).extracting(Stats.Lift::name).containsExactly("Bench Press");
		assertThat(stats.records().getFirst().weightKg()).isEqualTo(85);
		assertThat(stats.biggestSession().date()).isEqualTo("2026-11-16");
		assertThat(stats.favoriteTimeOfDay()).isEqualTo(TimeOfDay.MORNING);
		assertThat(stats.favoriteWeekday().day()).isEqualTo(DayOfWeek.MONDAY);
		assertThat(stats.buckets()).hasSize(7);
		assertThat(stats.buckets().get(1).volumeKg()).isEqualTo(860);
	}

	@Test
	void usesTheViewersTimeZoneForDays() {
		// 02:00 UTC on Tuesday is still Monday evening in New York.
		workout("2026-11-17T02:00:00Z", 30, set(1, "Bench Press", MuscleGroup.CHEST, 60, 10));
		Stats stats = new StatsCalculator(ZONE).calculate(this.log, Period.DAY, LocalDate.parse("2026-11-16"));
		assertThat(stats.totals().workouts()).isEqualTo(1);
		assertThat(stats.favoriteTimeOfDay()).isEqualTo(TimeOfDay.EVENING);
	}

	@Test
	void anEmptyPeriodHasZeroesAndNoHighlights() {
		Stats stats = new StatsCalculator(ZONE).calculate(this.log, Period.YEAR, LocalDate.parse("2026-06-01"));
		assertThat(stats.start()).isEqualTo("2026-01-01");
		assertThat(stats.totals().workouts()).isZero();
		assertThat(stats.topExercise()).isNull();
		assertThat(stats.heaviestLift()).isNull();
		assertThat(stats.records()).isEmpty();
		assertThat(stats.buckets()).hasSize(12);
	}

	@Test
	void periodsCoverTheRightDays() {
		LocalDate d = LocalDate.parse("2026-11-20");
		assertThat(Period.MONTH.start(d)).isEqualTo("2026-11-01");
		assertThat(Period.QUARTER.start(d)).isEqualTo("2026-10-01");
		assertThat(Period.QUARTER.end(Period.QUARTER.start(d))).isEqualTo("2027-01-01");
		assertThat(Period.YEAR.start(d)).isEqualTo("2026-01-01");
	}

	@Test
	void longestStreakCountsConsecutiveDays() {
		TreeSet<LocalDate> days = new TreeSet<>(List.of(LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"),
				LocalDate.parse("2026-11-03"), LocalDate.parse("2026-11-05")));
		assertThat(StatsCalculator.longestStreak(days)).isEqualTo(3);
		assertThat(StatsCalculator.longestStreak(new TreeSet<>())).isZero();
	}

	private record PlannedSet(long exerciseId, String name, MuscleGroup muscle, double kg, int reps) {
	}

	private static PlannedSet set(long exerciseId, String name, MuscleGroup muscle, double kg, int reps) {
		return new PlannedSet(exerciseId, name, muscle, kg, reps);
	}

	private void workout(String start, int minutes, PlannedSet... sets) {
		Instant started = java.time.OffsetDateTime.parse(start).toInstant();
		long workoutId = this.nextWorkout++;
		int number = 1;
		for (PlannedSet s : sets) {
			this.log.add(new SetRecord(this.nextSet++, workoutId, started, started.plusSeconds(minutes * 60L),
					s.exerciseId(), s.name(), s.muscle(), number++, s.kg(), s.reps(), started.plusSeconds(number * 60L)));
		}
	}

}
