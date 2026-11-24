package app.homelift;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ImportRuntimeHints;

@ImportRuntimeHints(NativeHints.class)
@SpringBootApplication
public class HomeLiftApplication {

	public static void main(String[] args) {
		SpringApplication.run(HomeLiftApplication.class, args);
	}

}
