package app.homelift.dev;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/** Runs against its own database file so the seeded data never leaks into other tests. */
@SpringBootTest(properties = { "homelift.data-dir=target/test-data-demo", "homelift.demo-data=true" })
@ActiveProfiles("dev")
class DemoDataSeederTests {

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	DemoDataSeeder seeder;

	@Test
	void seedsRoutinesAndMonthsOfWorkoutsOnce() {
		int workouts = count("workout");
		assertThat(count("routine")).isEqualTo(3);
		assertThat(workouts).isBetween(40, 70);
		assertThat(count("workout_set")).isGreaterThan(workouts * 15);
		assertThat(this.jdbc.queryForObject("select count(*) from workout where finished_at is null", Integer.class))
			.isZero();

		ApplicationArguments args = new DefaultApplicationArguments();
		this.seeder.run(args);
		assertThat(count("workout")).isEqualTo(workouts);
	}

	private int count(String table) {
		return this.jdbc.queryForObject("select count(*) from " + table, Integer.class);
	}

}
