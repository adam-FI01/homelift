package app.homelift.workout;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import org.jspecify.annotations.Nullable;

import app.homelift.exercise.Exercise;

/** A training session: the exercises done, in order, and the sets logged for each. */
@Entity
public class Workout {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private @Nullable String name;

	@Column(name = "started_at", nullable = false, updatable = false)
	private Instant startedAt;

	@Column(name = "finished_at")
	private @Nullable Instant finishedAt;

	private @Nullable String notes;

	@Column(name = "routine_id")
	private @Nullable Long routineId;

	@OneToMany(mappedBy = "workout", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("position")
	private List<WorkoutExercise> exercises = new ArrayList<>();

	protected Workout() {
	}

	Workout(@Nullable String name, Instant startedAt) {
		this.name = name;
		this.startedAt = startedAt;
	}

	public Long getId() {
		return this.id;
	}

	public @Nullable String getName() {
		return this.name;
	}

	public Instant getStartedAt() {
		return this.startedAt;
	}

	public @Nullable Instant getFinishedAt() {
		return this.finishedAt;
	}

	public @Nullable String getNotes() {
		return this.notes;
	}

	void notes(@Nullable String notes) {
		this.notes = notes;
	}

	/** The routine this workout was started from, if any. */
	public @Nullable Long getRoutineId() {
		return this.routineId;
	}

	void startedFrom(long routineId) {
		this.routineId = routineId;
	}

	public boolean isInProgress() {
		return this.finishedAt == null;
	}

	public List<WorkoutExercise> getExercises() {
		return Collections.unmodifiableList(this.exercises);
	}

	Optional<WorkoutExercise> findExercise(long workoutExerciseId) {
		return this.exercises.stream().filter((we) -> we.getId() == workoutExerciseId).findFirst();
	}

	WorkoutExercise addExercise(Exercise exercise, int targetSets) {
		int position = this.exercises.stream().mapToInt(WorkoutExercise::getPosition).max().orElse(0) + 1;
		WorkoutExercise added = new WorkoutExercise(this, exercise, position, targetSets);
		this.exercises.add(added);
		return added;
	}

	void removeExercise(WorkoutExercise exercise) {
		this.exercises.remove(exercise);
	}

	void finish(Instant at) {
		this.finishedAt = at;
	}

}
