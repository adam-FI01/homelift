package app.homelift.backup;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.info.BuildProperties;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import app.homelift.exercise.ExerciseMediaService;
import app.homelift.workout.SetRecord;
import app.homelift.workout.TrainingLog;

/** Downloads for keeping your data: a CSV of every set, a JSON dump, and a copy of the database file. */
@RestController
@RequestMapping("/api/export")
class BackupController {

	/** Tables in the JSON dump, parents before children. */
	static final List<String> TABLES = List.of("exercise", "routine", "routine_exercise", "workout",
			"workout_exercise", "workout_set", "body_metric", "app_setting");

	private final TrainingLog log;

	private final JdbcTemplate jdbc;

	private final Clock clock;

	private final Path dataDir;

	private final String version;

	private final ExerciseMediaService media;

	BackupController(TrainingLog log, JdbcTemplate jdbc, Clock clock, @Value("${homelift.data-dir}") Path dataDir,
			ExerciseMediaService media, ObjectProvider<BuildProperties> build) {
		this.media = media;
		this.log = log;
		this.jdbc = jdbc;
		this.clock = clock;
		this.dataDir = dataDir;
		BuildProperties props = build.getIfAvailable();
		this.version = (props != null) ? props.getVersion() : "dev";
	}

	/** Every set from finished workouts, one row each, for spreadsheets. */
	@GetMapping("/sets.csv")
	ResponseEntity<String> setsCsv() {
		StringBuilder csv = new StringBuilder(
				"date,workout_id,exercise,muscle_group,set,weight_kg,reps,volume_kg,estimated_1rm_kg\n");
		for (SetRecord s : this.log.finishedSets()) {
			csv.append(row(s.workoutStartedAt().atOffset(ZoneOffset.UTC).toLocalDate(), s.workoutId(),
					s.exerciseName(), s.muscleGroup(), s.setNumber(), number(s.weightKg()), s.reps(),
					number(s.volumeKg()), number(Math.round(s.estimatedOneRepMax() * 10) / 10.0)));
		}
		return download("homelift-sets-" + today() + ".csv", new MediaType("text", "csv", StandardCharsets.UTF_8))
			.body(csv.toString());
	}

	/** All app data as JSON, table by table, readable without HomeLift. */
	@GetMapping("/backup.json")
	ResponseEntity<Map<String, Object>> json() {
		Map<String, Object> tables = new LinkedHashMap<>();
		for (String table : TABLES) {
			tables.put(table, this.jdbc.queryForList("select * from " + table + " order by 1"));
		}
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("app", "HomeLift");
		body.put("version", this.version);
		body.put("exportedAt", this.clock.instant().toString());
		body.put("schemaVersion", this.jdbc.queryForObject(
				"select max(version) from flyway_schema_history where success = 1", String.class));
		body.put("tables", tables);
		return download("homelift-backup-" + today() + ".json", MediaType.APPLICATION_JSON).body(body);
	}

	/**
	 * A consistent copy of the SQLite database, made with VACUUM INTO while the app keeps running.
	 * Restore by stopping HomeLift and putting the file in the data folder as homelift.db.
	 */
	@GetMapping("/homelift.db")
	ResponseEntity<StreamingResponseBody> database() throws IOException {
		Path copy = snapshot();
		long size = Files.size(copy);
		StreamingResponseBody body = (out) -> {
			try (InputStream in = Files.newInputStream(copy)) {
				in.transferTo(out);
			}
			finally {
				Files.deleteIfExists(copy);
			}
		};
		return download("homelift-" + today() + ".db", MediaType.APPLICATION_OCTET_STREAM).contentLength(size)
			.body(body);
	}

	/**
	 * Everything in one file: a consistent copy of the database as {@code homelift.db} and every
	 * exercise picture and clip under {@code media/}. Restore by stopping HomeLift and unzipping
	 * into the data folder.
	 */
	@GetMapping("/homelift.zip")
	ResponseEntity<StreamingResponseBody> everything() throws IOException {
		Path copy = snapshot();
		StreamingResponseBody body = (out) -> {
			try (ZipOutputStream zip = new ZipOutputStream(out)) {
				zip.putNextEntry(new ZipEntry("homelift.db"));
				Files.copy(copy, zip);
				zip.closeEntry();
				Path dir = this.media.directory();
				if (Files.isDirectory(dir)) {
					try (var files = Files.list(dir)) {
						for (Path file : files.filter(Files::isRegularFile)
							.filter((f) -> !f.getFileName().toString().endsWith(".part"))
							.sorted()
							.toList()) {
							zip.putNextEntry(new ZipEntry(ExerciseMediaService.DIRECTORY + "/" + file.getFileName()));
							Files.copy(file, zip);
							zip.closeEntry();
						}
					}
				}
			}
			finally {
				Files.deleteIfExists(copy);
			}
		};
		return download("homelift-" + today() + ".zip", new MediaType("application", "zip")).body(body);
	}

	/** A temporary, consistent copy of the database; the caller deletes it. */
	private Path snapshot() throws IOException {
		Path copy = Files.createTempFile(this.dataDir, "backup-", ".db");
		Files.delete(copy); // VACUUM INTO refuses to overwrite an existing file
		this.jdbc.execute("VACUUM INTO '" + copy.toAbsolutePath().toString().replace("'", "''") + "'");
		return copy;
	}

	private ResponseEntity.BodyBuilder download(String filename, MediaType type) {
		return ResponseEntity.ok()
			.contentType(type)
			.header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString());
	}

	private LocalDate today() {
		return LocalDate.now(this.clock);
	}

	private static String row(Object... values) {
		return java.util.Arrays.stream(values).map((v) -> csv(String.valueOf(v))).collect(Collectors.joining(","))
				+ "\n";
	}

	/** Quotes a CSV field when needed, and defuses spreadsheet formulas in names. */
	static String csv(String value) {
		String v = value;
		if (!v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0 && !v.matches("-?[0-9.]+")) {
			v = "'" + v;
		}
		if (v.contains(",") || v.contains("\"") || v.contains("\n")) {
			return "\"" + v.replace("\"", "\"\"") + "\"";
		}
		return v;
	}

	private static String number(double value) {
		return (value == Math.rint(value)) ? String.valueOf((long) value) : String.valueOf(value);
	}

}
