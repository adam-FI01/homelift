package app.homelift.settings;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * App-wide preferences. Weights are always stored in kg; {@code units} only changes how they are
 * shown and typed.
 */
public record Settings(@Min(0) @Max(900) int defaultRestSeconds, boolean autoStartRest, boolean restSound,
		boolean restVibrate, @NotNull Units units, @NotNull Theme theme) {

	public static final Settings DEFAULTS = new Settings(120, true, true, true, Units.KG, Theme.SYSTEM);

	public enum Units {

		KG, LB

	}

	public enum Theme {

		SYSTEM, LIGHT, DARK

	}

}
