package app.homelift.stats;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZoneId;

import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import app.homelift.workout.TrainingLog;

/** Stats for a day, week, month, quarter or year. */
@RestController
class StatsController {

	private final TrainingLog log;

	private final Clock clock;

	StatsController(TrainingLog log, Clock clock) {
		this.log = log;
		this.clock = clock;
	}

	/**
	 * @param period which period to summarise
	 * @param date any day in the period; today when absent
	 * @param zone the viewer's IANA time zone, so "today" and "Monday" mean what they expect
	 */
	@GetMapping("/api/stats")
	Stats stats(@RequestParam(defaultValue = "WEEK") Period period, @RequestParam(required = false) @Nullable LocalDate date,
			@RequestParam(defaultValue = "UTC") String zone) {
		ZoneId zoneId = zone(zone);
		LocalDate anchor = (date != null) ? date : LocalDate.now(this.clock.withZone(zoneId));
		return new StatsCalculator(zoneId).calculate(this.log.finishedSets(), period, anchor);
	}

	private static ZoneId zone(String zone) {
		try {
			return ZoneId.of(zone);
		}
		catch (DateTimeException ex) {
			ErrorResponseException error = new ErrorResponseException(HttpStatus.BAD_REQUEST, ex);
			error.getBody().setTitle("Unknown time zone");
			error.getBody().setDetail("\"" + zone + "\" is not a time zone such as Europe/Berlin.");
			throw error;
		}
	}

}
