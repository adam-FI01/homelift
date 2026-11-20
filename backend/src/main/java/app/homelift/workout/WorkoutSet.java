package app.homelift.workout;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** One logged set: a weight lifted for a number of reps. */
@Entity
@Table(name = "workout_set")
public class WorkoutSet {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "workout_exercise_id")
	private WorkoutExercise workoutExercise;

	@Column(name = "set_number", nullable = false)
	private int setNumber;

	@Column(name = "weight_kg", nullable = false)
	private double weightKg;

	@Column(nullable = false)
	private int reps;

	@Column(name = "logged_at", nullable = false, updatable = false)
	private Instant loggedAt;

	protected WorkoutSet() {
	}

	WorkoutSet(WorkoutExercise workoutExercise, int setNumber, double weightKg, int reps, Instant loggedAt) {
		this.workoutExercise = workoutExercise;
		this.setNumber = setNumber;
		this.weightKg = weightKg;
		this.reps = reps;
		this.loggedAt = loggedAt;
	}

	public Long getId() {
		return this.id;
	}

	public int getSetNumber() {
		return this.setNumber;
	}

	public double getWeightKg() {
		return this.weightKg;
	}

	public int getReps() {
		return this.reps;
	}

	public Instant getLoggedAt() {
		return this.loggedAt;
	}

	void renumber(int setNumber) {
		this.setNumber = setNumber;
	}

}
