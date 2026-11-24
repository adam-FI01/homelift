package app.homelift;

import org.jspecify.annotations.Nullable;
import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;

/**
 * What a GraalVM native image needs to be told because it can't see it: classes that Hibernate
 * and SQLite look up by name at start-up. Only used by the optional native image; the normal JVM
 * build ignores it.
 */
class NativeHints implements RuntimeHintsRegistrar {

	@Override
	public void registerHints(RuntimeHints hints, @Nullable ClassLoader classLoader) {
		// Hibernate resolves the dialect from the name in application.properties.
		hints.reflection()
			.registerType(org.hibernate.community.dialect.SQLiteDialect.class, MemberCategory.INVOKE_PUBLIC_CONSTRUCTORS,
					MemberCategory.INVOKE_PUBLIC_METHODS);
		// The SQLite driver unpacks its own native library from the jar the first time it runs.
		hints.resources().registerPattern("org/sqlite/native/*/*/*");
		hints.resources().registerPattern("org/sqlite/native/*/*");
		hints.reflection().registerType(org.sqlite.JDBC.class, MemberCategory.INVOKE_PUBLIC_CONSTRUCTORS);
		// Hibernate creates the attribute converter by reflection.
		hints.reflection()
			.registerType(app.homelift.persistence.InstantAsTextConverter.class, MemberCategory.INVOKE_PUBLIC_CONSTRUCTORS,
					MemberCategory.INVOKE_PUBLIC_METHODS);
	}

}
