package app.homelift.system;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.ConfigurableEnvironment;

/**
 * Creates the data directory before the DataSource starts, because SQLite will not create
 * missing parent folders for the database file.
 */
public class DataDirectoryInitializer implements EnvironmentPostProcessor {

	@Override
	public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
		String dir = environment.getProperty("homelift.data-dir", "./data");
		try {
			Files.createDirectories(Path.of(dir));
		}
		catch (IOException ex) {
			throw new UncheckedIOException("Cannot create data directory " + dir, ex);
		}
	}

}
