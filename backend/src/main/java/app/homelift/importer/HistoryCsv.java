package app.homelift.importer;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.jspecify.annotations.Nullable;

/**
 * Reads a workout history from CSV: one row per set, with at least a date, an exercise, a weight
 * and reps. Headers are matched loosely, so the plain format ({@code date,exercise,weight,reps})
 * and the exports of Strong, Hevy and FitNotes all work. Dates without a time count as noon, and
 * times without a zone count as UTC.
 */
final class HistoryCsv {

	static final double KG_PER_LB = 0.45359237;

	private static final Set<String> DATE = Set.of("date", "day", "workoutdate", "starttime", "startdate", "datetime",
			"performedat");

	private static final Set<String> END = Set.of("endtime", "enddate");

	private static final Set<String> EXERCISE = Set.of("exercise", "exercisename", "exercisetitle", "movement");

	private static final Set<String> WEIGHT_KG = Set.of("weightkg", "weightkgs", "kg", "kgs");

	private static final Set<String> WEIGHT_LB = Set.of("weightlb", "weightlbs", "lb", "lbs");

	private static final Set<String> WEIGHT = Set.of("weight", "load");

	private static final Set<String> REPS = Set.of("reps", "rep", "repetitions");

	private static final Set<String> SET_ORDER = Set.of("setorder", "setindex", "setnumber", "setno", "set");

	private static final Set<String> SET_TYPE = Set.of("settype", "warmup", "iswarmup");

	private static final Set<String> WORKOUT = Set.of("workoutname", "workout", "title", "routine");

	private static final DateTimeFormatter DATE_TIME = new DateTimeFormatterBuilder().parseCaseInsensitive()
		.appendPattern("[yyyy-MM-dd][yyyy/MM/dd][d MMM yyyy][d MMMM yyyy][MMM d, yyyy]")
		.optionalStart()
		.appendPattern("[', '][' ']['T']H:mm[:ss[.SSS]]")
		.optionalEnd()
		.toFormatter(Locale.ENGLISH);

	/** One set from the file. */
	record Row(Instant startedAt, @Nullable Instant endedAt, @Nullable String workoutName, String exercise,
			double weightKg, int reps, boolean warmup) {
	}

	/** What was read: the sets, which format it looked like, the units, and what couldn't be used. */
	record Result(String format, String units, List<Row> rows, int skipped, List<String> problems) {
	}

	private HistoryCsv() {
	}

	/**
	 * @param text the file
	 * @param defaultUnits {@code KG} or {@code LB}, for a plain "weight" column
	 * @throws ImportException when the file has no usable header
	 */
	static Result parse(String text, String defaultUnits) {
		List<List<String>> table = CsvReader.read(text);
		if (table.isEmpty()) {
			throw new ImportException("The file is empty.");
		}
		List<String> header = table.getFirst().stream().map(HistoryCsv::key).toList();
		int date = find(header, DATE);
		int exercise = find(header, EXERCISE);
		int kg = find(header, WEIGHT_KG);
		int lb = find(header, WEIGHT_LB);
		int weight = (kg >= 0) ? kg : (lb >= 0) ? lb : find(header, WEIGHT);
		int reps = find(header, REPS);
		for (var missing : new String[][] { { "date", String.valueOf(date) }, { "exercise", String.valueOf(exercise) },
				{ "weight", String.valueOf(weight) }, { "reps", String.valueOf(reps) } }) {
			if (Integer.parseInt(missing[1]) < 0) {
				throw new ImportException("Couldn't find a " + missing[0]
						+ " column. The first row should have headers like date, exercise, weight and reps.");
			}
		}
		int end = find(header, END);
		int order = find(header, SET_ORDER);
		int type = find(header, SET_TYPE);
		int name = find(header, WORKOUT);
		String units = (kg >= 0) ? "KG" : (lb >= 0) ? "LB" : defaultUnits;
		String format = format(header);

		List<Row> rows = new ArrayList<>();
		List<String> problems = new ArrayList<>();
		int skipped = 0;
		for (int i = 1; i < table.size(); i++) {
			List<String> cells = table.get(i);
			int line = i + 1;
			String exerciseName = cell(cells, exercise).strip();
			if (exerciseName.isEmpty()) {
				skipped++;
				problem(problems, line, "no exercise");
				continue;
			}
			Instant started = time(cell(cells, date));
			if (started == null) {
				skipped++;
				problem(problems, line, "couldn't read the date \"" + cell(cells, date) + "\"");
				continue;
			}
			Integer repCount = integer(cell(cells, reps));
			if (repCount == null || repCount < 1) {
				// Time-based or cardio rows have no reps; they have no place in a lifting log.
				skipped++;
				problem(problems, line, "no reps");
				continue;
			}
			String rawWeight = cell(cells, weight).strip();
			Double value = rawWeight.isEmpty() ? Double.valueOf(0) : number(rawWeight);
			if (value == null || value < 0 || value > 2000) {
				skipped++;
				problem(problems, line, "couldn't read the weight \"" + rawWeight + "\"");
				continue;
			}
			double weightKg = "LB".equals(units) ? Math.round(value * KG_PER_LB * 1000) / 1000.0 : value;
			boolean warmup = isWarmup(cell(cells, type)) || "W".equalsIgnoreCase(cell(cells, order).strip());
			String workout = cell(cells, name).strip();
			rows.add(new Row(started, (end >= 0) ? time(cell(cells, end)) : null, workout.isEmpty() ? null : workout,
					exerciseName, weightKg, repCount, warmup));
		}
		if (rows.isEmpty()) {
			throw new ImportException("No sets could be read from this file." + (problems.isEmpty() ? ""
					: " First problem: " + problems.getFirst() + "."));
		}
		return new Result(format, units, rows, skipped, problems);
	}

	/** Groups sets into workouts by start time and name, keeping the order of first appearance. */
	static Map<String, List<Row>> workouts(List<Row> rows) {
		Map<String, List<Row>> groups = new LinkedHashMap<>();
		for (Row row : rows) {
			groups.computeIfAbsent(row.startedAt() + "|" + row.workoutName(), (k) -> new ArrayList<>()).add(row);
		}
		return groups;
	}

	private static String format(List<String> header) {
		if (header.contains("exercisename") && header.contains("setorder")) {
			return "Strong";
		}
		if (header.contains("exercisetitle") && header.contains("setindex")) {
			return "Hevy";
		}
		if ((header.contains("weightkgs") || header.contains("weightlbs")) && header.contains("category")) {
			return "FitNotes";
		}
		return "Plain CSV";
	}

	private static boolean isWarmup(String value) {
		String v = value.strip().toLowerCase(Locale.ROOT);
		return v.equals("warmup") || v.equals("warm-up") || v.equals("warm up") || v.equals("true") || v.equals("1")
				|| v.equals("yes");
	}

	private static void problem(List<String> problems, int line, String text) {
		if (problems.size() < 20) {
			problems.add("line " + line + ": " + text);
		}
	}

	private static String key(String header) {
		return header.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
	}

	private static int find(List<String> header, Set<String> names) {
		for (int i = 0; i < header.size(); i++) {
			if (names.contains(header.get(i))) {
				return i;
			}
		}
		return -1;
	}

	private static String cell(List<String> cells, int index) {
		return (index >= 0 && index < cells.size()) ? cells.get(index) : "";
	}

	private static @Nullable Integer integer(String value) {
		Double n = number(value.strip());
		return (n == null) ? null : (int) Math.round(n);
	}

	private static @Nullable Double number(String value) {
		try {
			return Double.valueOf(value.strip().replace(',', '.'));
		}
		catch (NumberFormatException ex) {
			return null;
		}
	}

	/** A date or date and time as an instant, or null when it isn't one. */
	static @Nullable Instant time(String value) {
		String v = value.strip();
		if (v.isEmpty()) {
			return null;
		}
		try {
			return OffsetDateTime.parse(v).toInstant();
		}
		catch (java.time.DateTimeException ex) {
			// Not an ISO date with an offset; try the others.
		}
		try {
			var parsed = DATE_TIME.parseBest(v, LocalDateTime::from, LocalDate::from);
			if (parsed instanceof LocalDateTime dateTime) {
				return dateTime.toInstant(ZoneOffset.UTC);
			}
			return ((LocalDate) parsed).atTime(LocalTime.NOON).toInstant(ZoneOffset.UTC);
		}
		catch (java.time.DateTimeException ex) {
			return null;
		}
	}

}
