package app.homelift.importer;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.homelift.importer.HistoryCsv.Row;
import app.homelift.importer.ImportDtos.CommitRequest;
import app.homelift.importer.ImportDtos.Decision;
import app.homelift.importer.ImportDtos.ExerciseMatch;
import app.homelift.importer.ImportDtos.Preview;
import app.homelift.importer.ImportDtos.PreviewRequest;
import app.homelift.importer.ImportDtos.Result;
import app.homelift.importer.ImportDtos.Suggestion;

/**
 * Moves a workout history in from a CSV file. A dry run reads the file and says what would
 * happen; the import then needs a decision for each exercise name: use one from the library, add
 * it as new, or leave it out. Workouts that already exist (same start time) are skipped, so
 * importing the same file twice doesn't double anything.
 */
@Service
@Transactional(readOnly = true)
class ImportService {

	private static final DateTimeFormatter TEXT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
		.withZone(ZoneOffset.UTC);

	private static final int MAX_SUGGESTIONS = 3;

	private final JdbcTemplate jdbc;

	ImportService(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	Preview preview(PreviewRequest request) {
		HistoryCsv.Result file = HistoryCsv.parse(request.csv(), units(request.units()));
		Map<String, List<Row>> workouts = HistoryCsv.workouts(file.rows());
		Set<Instant> existing = existingStarts(file.rows());
		int existingWorkouts = (int) workouts.values().stream().filter((w) -> existing.contains(w.getFirst().startedAt())).count();

		Map<String, Integer> counts = new LinkedHashMap<>();
		file.rows().forEach((r) -> counts.merge(r.exercise(), 1, Integer::sum));
		List<LibraryExercise> library = library();
		List<ExerciseMatch> matches = counts.entrySet()
			.stream()
			.map((e) -> match(e.getKey(), e.getValue(), library))
			.sorted(Comparator.comparing((ExerciseMatch m) -> m.match() != null).thenComparing(ExerciseMatch::name,
					String.CASE_INSENSITIVE_ORDER))
			.toList();

		Instant first = file.rows().stream().map(Row::startedAt).min(Comparator.naturalOrder()).orElseThrow();
		Instant last = file.rows().stream().map(Row::startedAt).max(Comparator.naturalOrder()).orElseThrow();
		return new Preview(file.format(), file.units(), file.rows().size(), workouts.size(), existingWorkouts,
				first.atZone(ZoneOffset.UTC).toLocalDate(), last.atZone(ZoneOffset.UTC).toLocalDate(), file.skipped(),
				file.problems(), matches);
	}

	@Transactional
	Result commit(CommitRequest request) {
		HistoryCsv.Result file = HistoryCsv.parse(request.csv(), units(request.units()));
		List<LibraryExercise> library = library();
		Map<String, Decision> decisions = new HashMap<>();
		request.decisions().forEach((d) -> decisions.put(d.name(), d));

		// Settle every name first, so a bad decision stops the import before anything is written.
		Map<String, Long> target = new LinkedHashMap<>();
		int created = 0;
		Set<String> names = new HashSet<>();
		file.rows().forEach((r) -> names.add(r.exercise()));
		for (String name : names.stream().sorted().toList()) {
			Decision decision = decisions.get(name);
			Suggestion auto = match(name, 0, library).match();
			if (decision == null) {
				decision = (auto != null) ? new Decision(name, Decision.Action.MAP, auto.id())
						: new Decision(name, Decision.Action.CREATE, null);
			}
			switch (decision.action()) {
				case SKIP -> {
				}
				case MAP -> {
					Long id = decision.exerciseId();
					if (id == null || library.stream().noneMatch((l) -> l.id == id)) {
						throw new ImportException("\"" + name + "\" was matched with an exercise that doesn't exist.");
					}
					target.put(name, id);
				}
				case CREATE -> {
					Long existingId = sameName(name, library);
					if (existingId != null) {
						target.put(name, existingId);
					}
					else {
						long id = createExercise(name);
						library.add(new LibraryExercise(id, name, normalize(name)));
						target.put(name, id);
						created++;
					}
				}
			}
		}

		Set<Instant> existing = existingStarts(file.rows());
		int workouts = 0;
		int sets = 0;
		int skippedWorkouts = 0;
		int skippedSets = 0;
		for (List<Row> group : HistoryCsv.workouts(file.rows()).values()) {
			Row head = group.getFirst();
			if (existing.contains(head.startedAt())) {
				skippedWorkouts++;
				skippedSets += group.size();
				continue;
			}
			List<Row> wanted = group.stream().filter((r) -> target.containsKey(r.exercise())).toList();
			skippedSets += group.size() - wanted.size();
			if (wanted.isEmpty()) {
				continue;
			}
			sets += write(head, wanted, target);
			workouts++;
		}
		return new Result(workouts, sets, created, skippedWorkouts, skippedSets);
	}

	/** Writes one finished workout with its exercises and sets; returns the number of sets. */
	private int write(Row head, List<Row> rows, Map<String, Long> target) {
		Instant end = rows.stream().map(Row::endedAt).filter((t) -> t != null).max(Comparator.naturalOrder())
			.orElse(head.startedAt());
		if (end.isBefore(head.startedAt())) {
			end = head.startedAt();
		}
		long workoutId = insert("insert into workout (name, started_at, finished_at) values (?, ?, ?)", head.workoutName(),
				TEXT.format(head.startedAt()), TEXT.format(end));

		Map<Long, List<Row>> byExercise = new LinkedHashMap<>();
		rows.forEach((r) -> byExercise.computeIfAbsent(target.get(r.exercise()), (k) -> new ArrayList<>()).add(r));
		int position = 0;
		for (var entry : byExercise.entrySet()) {
			List<Row> sets = entry.getValue();
			int planned = Math.min(20, Math.max(1, (int) sets.stream().filter((s) -> !s.warmup()).count()));
			long weId = insert("insert into workout_exercise (workout_id, exercise_id, position, target_sets) values (?, ?, ?, ?)",
					workoutId, entry.getKey(), position++, planned);
			for (int i = 0; i < sets.size(); i++) {
				Row set = sets.get(i);
				this.jdbc.update(
						"insert into workout_set (workout_exercise_id, set_number, weight_kg, reps, logged_at, warmup) values (?, ?, ?, ?, ?, ?)",
						weId, i + 1, set.weightKg(), set.reps(), TEXT.format(set.startedAt()), set.warmup() ? 1 : 0);
			}
		}
		return rows.size();
	}

	private long insert(String sql, Object... args) {
		var keys = new GeneratedKeyHolder();
		this.jdbc.update((con) -> {
			PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
			for (int i = 0; i < args.length; i++) {
				ps.setObject(i + 1, args[i]);
			}
			return ps;
		}, keys);
		return ((Number) keys.getKeys().values().iterator().next()).longValue();
	}

	private long createExercise(String name) {
		String clean = name.strip().replaceAll("\\s+", " ");
		if (clean.length() > 80) {
			clean = clean.substring(0, 80).strip();
		}
		return insert("insert into exercise (name, muscle_group, equipment) values (?, ?, ?)", clean, "FULL_BODY",
				guessEquipment(name));
	}

	/** Reads the equipment from words in the name, such as "(Barbell)"; otherwise OTHER. */
	static String guessEquipment(String name) {
		String n = name.toLowerCase(Locale.ROOT);
		for (String[] pair : new String[][] { { "barbell", "BARBELL" }, { "dumbbell", "DUMBBELL" },
				{ "kettlebell", "KETTLEBELL" }, { "cable", "CABLE" }, { "machine", "MACHINE" },
				{ "smith", "MACHINE" }, { "bodyweight", "BODYWEIGHT" }, { "body weight", "BODYWEIGHT" } }) {
			if (n.contains(pair[0])) {
				return pair[1];
			}
		}
		return "OTHER";
	}

	private Set<Instant> existingStarts(List<Row> rows) {
		Instant first = rows.stream().map(Row::startedAt).min(Comparator.naturalOrder()).orElseThrow();
		Instant last = rows.stream().map(Row::startedAt).max(Comparator.naturalOrder()).orElseThrow();
		Set<Instant> starts = new HashSet<>();
		this.jdbc.query("select started_at from workout where started_at between ? and ?",
				(rs) -> {
					starts.add(Instant.parse(rs.getString(1)));
				}, TEXT.format(first), TEXT.format(last));
		return starts;
	}

	private List<LibraryExercise> library() {
		return new ArrayList<>(this.jdbc.query("select id, name from exercise where archived = 0",
				(rs, i) -> new LibraryExercise(rs.getLong(1), rs.getString(2), normalize(rs.getString(2)))));
	}

	private static @Nullable Long sameName(String name, List<LibraryExercise> library) {
		String key = name.strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
		return library.stream().filter((l) -> l.name.toLowerCase(Locale.ROOT).equals(key)).map((l) -> l.id).findFirst()
			.orElse(null);
	}

	/** Matches a name from the file with the library: an equal name after tidying, else the closest few. */
	static ExerciseMatch match(String name, int sets, List<LibraryExercise> library) {
		String key = normalize(name);
		for (LibraryExercise l : library) {
			if (l.key.equals(key)) {
				return new ExerciseMatch(name, sets, new Suggestion(l.id, l.name), List.of());
			}
		}
		Set<String> words = Set.of(key.split(" "));
		List<Suggestion> close = library.stream()
			.map((l) -> Map.entry(l, overlap(words, Set.of(l.key.split(" ")))))
			.filter((e) -> e.getValue() >= 0.5)
			.sorted(Map.Entry.<LibraryExercise, Double>comparingByValue().reversed())
			.limit(MAX_SUGGESTIONS)
			.map((e) -> new Suggestion(e.getKey().id, e.getKey().name))
			.toList();
		return new ExerciseMatch(name, sets, null, close);
	}

	private static double overlap(Set<String> a, Set<String> b) {
		long shared = a.stream().filter(b::contains).count();
		return (double) shared / (a.size() + b.size() - shared);
	}

	/** Lower case, without anything in brackets or punctuation, and with a trailing plural "s" dropped. */
	static String normalize(String name) {
		String n = name.toLowerCase(Locale.ROOT).replaceAll("\\(.*?\\)", " ").replaceAll("[^a-z0-9]+", " ").strip();
		return java.util.Arrays.stream(n.split(" "))
			.map((w) -> (w.length() > 3 && w.endsWith("s")) ? w.substring(0, w.length() - 1) : w)
			.reduce((x, y) -> x + " " + y)
			.orElse("");
	}

	private static String units(@Nullable String units) {
		return "LB".equalsIgnoreCase(units) ? "LB" : "KG";
	}

	record LibraryExercise(long id, String name, String key) {
	}

}
