package app.homelift.settings;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.jspecify.annotations.Nullable;

/**
 * App-wide preferences. Weights are always stored in kg; {@code units} only changes how they are
 * shown and typed.
 */
public record Settings(@Min(0) @Max(900) int defaultRestSeconds, boolean autoStartRest, boolean restSound,
		boolean restVibrate, @NotNull Units units, @NotNull Theme theme,
		@Nullable @DecimalMin("0") @DecimalMax("100") Double barKg) {

	/** {@code barKg} null means the usual bar for the units: 20 kg or 45 lb. */
	public static final Settings DEFAULTS = new Settings(120, true, true, true, Units.KG, Theme.SYSTEM, null);

	public enum Units {

		KG, LB

	}

	public enum Theme {

		SYSTEM, LIGHT, DARK

	}

}
