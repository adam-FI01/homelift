package app.homelift.body;

import java.time.LocalDate;

/** One measurement on one day. */
public record BodyMetric(long id, LocalDate date, Kind kind, double value) {

	/** What was measured, and the unit it is stored in. */
	public enum Kind {

		/** kg */
		WEIGHT,
		/** percent */
		BODY_FAT,
		/** cm */
		WAIST, CHEST, ARM, THIGH, HIPS, NECK

	}

}
