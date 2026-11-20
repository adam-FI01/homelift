package app.homelift.stats;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.IsoFields;
import java.time.temporal.TemporalAdjusters;

/** A calendar period that stats are grouped by. Weeks start on Monday. */
public enum Period {

	DAY(ChronoUnit.DAYS), WEEK(ChronoUnit.DAYS), MONTH(ChronoUnit.DAYS), QUARTER(ChronoUnit.WEEKS),
	YEAR(ChronoUnit.MONTHS);

	/** How the period is split into chart buckets. */
	private final ChronoUnit bucket;

	Period(ChronoUnit bucket) {
		this.bucket = bucket;
	}

	/** The first day of the period that contains {@code date}. */
	public LocalDate start(LocalDate date) {
		return switch (this) {
			case DAY -> date;
			case WEEK -> date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
			case MONTH -> date.withDayOfMonth(1);
			case QUARTER -> date.with(IsoFields.DAY_OF_QUARTER, 1);
			case YEAR -> date.withDayOfYear(1);
		};
	}

	/** The first day after the period that starts on {@code start}. */
	public LocalDate end(LocalDate start) {
		return switch (this) {
			case DAY -> start.plusDays(1);
			case WEEK -> start.plusWeeks(1);
			case MONTH -> start.plusMonths(1);
			case QUARTER -> start.plusMonths(3);
			case YEAR -> start.plusYears(1);
		};
	}

	/** The start of the bucket that holds {@code date}. */
	LocalDate bucketStart(LocalDate date) {
		return switch (this.bucket) {
			case WEEKS -> date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
			case MONTHS -> date.withDayOfMonth(1);
			default -> date;
		};
	}

	LocalDate nextBucket(LocalDate bucketStart) {
		return bucketStart.plus(1, this.bucket);
	}

}
