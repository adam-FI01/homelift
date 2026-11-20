package app.homelift.system;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.info.BuildProperties;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Small endpoint the UI uses to show that the backend and database are reachable. */
@RestController
@RequestMapping("/api/status")
class StatusController {

	private final JdbcTemplate jdbc;

	private final String version;

	StatusController(JdbcTemplate jdbc, ObjectProvider<BuildProperties> build) {
		this.jdbc = jdbc;
		BuildProperties props = build.getIfAvailable();
		this.version = props != null ? props.getVersion() : "dev";
	}

	@GetMapping
	StatusResponse status() {
		String sqlite = this.jdbc.queryForObject("select sqlite_version()", String.class);
		return new StatusResponse("HomeLift", this.version, sqlite);
	}

	record StatusResponse(String name, String version, String sqliteVersion) {
	}

}
