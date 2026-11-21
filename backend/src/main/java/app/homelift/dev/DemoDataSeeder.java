package app.homelift.dev;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fills an empty development database with about four months of believable training: three
 * routines (Push, Pull, Legs) done in rotation three or four times a week, with weights that
 * creep up, the odd bad day, and records along the way.
 *
 * <p>Only active with the {@code dev} profile and {@code homelift.demo-data=true}, and only when
 * the database has no workouts and no routines, so it never touches real data.
 */
@Component
@Profile("dev")
@ConditionalOnBooleanProperty("homelift.demo-data")
class DemoDataSeeder implements ApplicationRunner {

	private static final Logger logger = LoggerFactory.getLogger(DemoDataSeeder.class);

	private static final DateTimeFormatter TEXT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
		.withZone(ZoneOffset.UTC);

	private static final int DAYS = 120;

	/** Exercise, sets, reps, rest in seconds (the app's 2 minute default), starting weight, weekly gain, auto progression. */
	private record Plan(String exercise, int sets, int reps, int rest, double startKg, double weeklyGainKg,
			boolean auto) {
	}

	private static final Map<String, List<Plan>> ROUTINES = new LinkedHashMap<>();

	static {
		ROUTINES.put("Push", List.of(new Plan("Bench Press", 5, 5, 120, 70, 1.0, true),
				new Plan("Overhead Press", 3, 8, 120, 40, 0.5, false),
				new Plan("Incline Dumbbell Press", 3, 10, 120, 22, 0.25, false),
				new Plan("Lateral Raise", 4, 15, 120, 8, 0.1, false),
				new Plan("Triceps Pushdown", 3, 12, 120, 25, 0.4, false)));
		ROUTINES.put("Pull", List.of(new Plan("Deadlift", 3, 5, 120, 110, 1.5, true),
				new Plan("Barbell Row", 4, 8, 120, 60, 0.75, false), new Plan("Pull-up", 3, 8, 120, 0, 0, false),
				new Plan("Face Pull", 3, 15, 120, 20, 0.2, false), new Plan("Barbell Curl", 3, 10, 120, 30, 0.3, false)));
		ROUTINES.put("Legs", List.of(new Plan("Back Squat", 5, 5, 120, 90, 1.25, true),
				new Plan("Romanian Deadlift", 3, 8, 120, 80, 1.0, false),
				new Plan("Leg Press", 3, 12, 120, 140, 2.0, false), new Plan("Leg Curl", 3, 12, 120, 40, 0.4, false),
				new Plan("Calf Raise", 4, 15, 120, 60, 0.5, false)));
	}

	private final JdbcTemplate jdbc;

	private final Clock clock;

	private final ZoneId zone;

	DemoDataSeeder(JdbcTemplate jdbc, Clock clock, @Value("${homelift.demo-data.zone:}") String zone) {
		this.jdbc = jdbc;
		this.clock = clock;
		this.zone = zone.isBlank() ? ZoneId.systemDefault() : ZoneId.of(zone);
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		Integer existing = this.jdbc.queryForObject("select (select count(*) from workout) + (select count(*) from routine)",
				Integer.class);
		if (existing != null && existing > 0) {
			logger.info("Demo data skipped: the database already has workouts or routines.");
			return;
		}
		Map<String, Long> exerciseIds = new LinkedHashMap<>();
		this.jdbc.query("select id, name from exercise", (rs) -> {
			exerciseIds.put(rs.getString("name"), rs.getLong("id"));
		});

		List<String> missing = ROUTINES.values().stream().flatMap(List::stream).map(Plan::exercise)
			.filter((name) -> !exerciseIds.containsKey(name)).toList();
		if (!missing.isEmpty()) {
			logger.info("Demo data skipped: exercises {} are not in the library.", missing);
			return;
		}

		Map<String, Long> routineIds = new LinkedHashMap<>();
		ROUTINES.forEach((name, plans) -> routineIds.put(name, insertRoutine(name, plans, exerciseIds)));

		Random random = new Random(42);
		LocalDate today = LocalDate.now(this.clock.withZone(this.zone));
		List<String> rotation = List.copyOf(ROUTINES.keySet());
		int done = 0;
		int sets = 0;
		for (LocalDate day = today.minusDays(DAYS); day.isBefore(today); day = day.plusDays(1)) {
			// Mostly Monday, Wednesday, Friday and Saturday, with some skipped and some extra days.
			boolean usual = switch (day.getDayOfWeek()) {
				case MONDAY, WEDNESDAY, FRIDAY, SATURDAY -> true;
				default -> false;
			};
			if (random.nextDouble() > (usual ? 0.82 : 0.08)) {
				continue;
			}
			String routine = rotation.get(done % rotation.size());
			double weeks = (DAYS - (double) java.time.temporal.ChronoUnit.DAYS.between(day, today)) / 7;
			sets += insertWorkout(routine, routineIds.get(routine), day, weeks, random, exerciseIds);
			done++;
		}
		logger.info("Demo data added: {} routines, {} workouts and {} sets over the last {} days.", routineIds.size(),
				done, sets, DAYS);
	}

	private long insertRoutine(String name, List<Plan> plans, Map<String, Long> exerciseIds) {
		this.jdbc.update("insert into routine (name) values (?)", name);
		long id = lastId();
		int position = 1;
		for (Plan p : plans) {
			this.jdbc.update("""
					insert into routine_exercise (routine_id, exercise_id, position, sets, reps, rest_seconds, auto_progress)
					values (?, ?, ?, ?, ?, ?, ?)""", id, exerciseIds.get(p.exercise()), position++, p.sets(), p.reps(),
					p.rest(), p.auto() ? 1 : 0);
		}
		return id;
	}

	private int insertWorkout(String name, long routineId, LocalDate day, double weeks, Random random,
			Map<String, Long> exerciseIds) {
		boolean morning = random.nextDouble() < 0.6;
		Instant start = day.atTime(morning ? 6 + random.nextInt(2) : 17 + random.nextInt(3), random.nextInt(60))
			.atZone(this.zone)
			.toInstant();
		// An off day now and then: lower weights and fewer reps.
		double form = (random.nextDouble() < 0.12) ? 0.92 : 1.0;

		this.jdbc.update("insert into workout (name, routine_id, started_at, finished_at) values (?, ?, ?, ?)", name,
				routineId, TEXT.format(start), TEXT.format(start));
		long workoutId = lastId();

		Instant clockTime = start.plus(Duration.ofMinutes(5));
		int position = 1;
		int count = 0;
		for (Plan p : ROUTINES.get(name)) {
			this.jdbc.update("""
					insert into workout_exercise (workout_id, exercise_id, position, target_sets, target_reps, rest_seconds, auto_progress)
					values (?, ?, ?, ?, ?, ?, ?)""", workoutId, exerciseIds.get(p.exercise()), position++, p.sets(),
					p.reps(), p.rest(), p.auto() ? 1 : 0);
			long workoutExerciseId = lastId();
			double weight = roundTo(Math.max(0, (p.startKg() + p.weeklyGainKg() * weeks) * form),
					(p.startKg() < 30) ? 1 : 2.5);
			for (int set = 1; set <= p.sets(); set++) {
				int fatigue = (set > 2 && random.nextDouble() < 0.35) ? 1 + random.nextInt(2) : 0;
				int reps = Math.max(1, p.reps() - fatigue - ((form < 1) ? 1 : 0) + ((random.nextDouble() < 0.1) ? 1 : 0));
				this.jdbc.update("""
						insert into workout_set (workout_exercise_id, set_number, weight_kg, reps, logged_at)
						values (?, ?, ?, ?, ?)""", workoutExerciseId, set, weight, reps, TEXT.format(clockTime));
				clockTime = clockTime.plusSeconds(40 + p.rest());
				count++;
			}
			clockTime = clockTime.plus(Duration.ofMinutes(2));
		}
		this.jdbc.update("update workout set finished_at = ? where id = ?", TEXT.format(clockTime), workoutId);
		return count;
	}

	private long lastId() {
		Long id = this.jdbc.queryForObject("select last_insert_rowid()", Long.class);
		return (id != null) ? id : 0;
	}

	private static double roundTo(double value, double step) {
		return Math.round(value / step) * step;
	}

}
