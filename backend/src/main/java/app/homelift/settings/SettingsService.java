package app.homelift.settings;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.homelift.settings.Settings.Theme;
import app.homelift.settings.Settings.Units;

/** Reads and saves settings as key and value rows, falling back to defaults for anything unset. */
@Service
public class SettingsService {

	private final JdbcTemplate jdbc;

	SettingsService(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	@Transactional(readOnly = true)
	public Settings get() {
		Map<String, String> stored = new HashMap<>();
		this.jdbc.query("select setting_key, setting_value from app_setting",
				(rs) -> {
					stored.put(rs.getString(1), rs.getString(2));
				});
		Settings d = Settings.DEFAULTS;
		return new Settings(read(stored, "defaultRestSeconds", Integer::valueOf, d.defaultRestSeconds()),
				read(stored, "autoStartRest", Boolean::valueOf, d.autoStartRest()),
				read(stored, "restSound", Boolean::valueOf, d.restSound()),
				read(stored, "restVibrate", Boolean::valueOf, d.restVibrate()),
				read(stored, "units", Units::valueOf, d.units()), read(stored, "theme", Theme::valueOf, d.theme()),
				read(stored, "barKg", (v) -> v.isEmpty() ? null : Double.valueOf(v), d.barKg()));
	}

	@Transactional
	Settings save(Settings settings) {
		write("defaultRestSeconds", settings.defaultRestSeconds());
		write("autoStartRest", settings.autoStartRest());
		write("restSound", settings.restSound());
		write("restVibrate", settings.restVibrate());
		write("units", settings.units());
		write("theme", settings.theme());
		write("barKg", (settings.barKg() != null) ? settings.barKg() : "");
		return get();
	}

	private void write(String key, Object value) {
		this.jdbc.update("""
				insert into app_setting (setting_key, setting_value) values (?, ?)
				on conflict (setting_key) do update set setting_value = excluded.setting_value""", key,
				String.valueOf(value));
	}

	/** A stored value that no longer parses (say, after an upgrade) falls back to the default. */
	private static <T> @Nullable T read(Map<String, String> stored, String key, Function<String, @Nullable T> parse,
			@Nullable T fallback) {
		String raw = stored.get(key);
		if (raw == null) {
			return fallback;
		}
		try {
			return parse.apply(raw);
		}
		catch (IllegalArgumentException ex) {
			return fallback;
		}
	}

}
