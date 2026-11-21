package app.homelift.workout;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import org.junit.jupiter.api.Test;

class OneRepMaxTests {

	@Test
	void singleRepIsTheWeightItself() {
		assertThat(OneRepMax.estimate(140, 1)).isEqualTo(140);
	}

	@Test
	void usesEpleyForMultipleReps() {
		assertThat(OneRepMax.estimate(100, 5)).isCloseTo(116.67, within(0.01));
		assertThat(OneRepMax.estimate(80, 10)).isCloseTo(106.67, within(0.01));
	}

	@Test
	void noRepsOrNoWeightIsZero() {
		assertThat(OneRepMax.estimate(100, 0)).isZero();
		assertThat(OneRepMax.estimate(0, 12)).isZero();
	}

}
