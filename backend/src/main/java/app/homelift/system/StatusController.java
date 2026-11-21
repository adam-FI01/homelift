package app.homelift.system;

import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.info.BuildProperties;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** What the Settings page shows about the server: version, health and how big the data is. */
@RestController
@RequestMapping("/api/status")
class StatusController {

	private final JdbcTemplate jdbc;

	private final String version;

	private final Path dataDir;

	StatusController(JdbcTemplate jdbc, ObjectProvider<BuildProperties> build,
			@Value("${homelift.data-dir}") Path dataDir) {
		this.jdbc = jdbc;
		BuildProperties props = build.getIfAvailable();
		this.version = (props != null) ? props.getVersion() : "dev";
		this.dataDir = dataDir;
	}

	@GetMapping
	StatusResponse status() {
		String sqlite = this.jdbc.queryForObject("select sqlite_version()", String.class);
		Integer workouts = this.jdbc.queryForObject("select count(*) from workout where finished_at is not null",
				Integer.class);
		Integer sets = this.jdbc.queryForObject("select count(*) from workout_set", Integer.class);
		return new StatusResponse("HomeLift", this.version, sqlite, Runtime.version().feature(),
				ManagementFactory.getRuntimeMXBean().getUptime() / 1000, databaseBytes(),
				(workouts != null) ? workouts : 0, (sets != null) ? sets : 0);
	}

	/** The database file plus its write-ahead log, which holds recent changes until a checkpoint. */
	private long databaseBytes() {
		long total = 0;
		for (String name : new String[] { "homelift.db", "homelift.db-wal" }) {
			try {
				Path file = this.dataDir.resolve(name);
				total += Files.exists(file) ? Files.size(file) : 0;
			}
			catch (IOException ex) {
				// Size is informational; leave it out rather than fail the status check.
			}
		}
		return total;
	}

	record StatusResponse(String name, String version, String sqliteVersion, int javaVersion, long uptimeSeconds,
			long databaseBytes, int workouts, int sets) {
	}

}
