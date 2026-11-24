package app.homelift.workout;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import org.jspecify.annotations.Nullable;

import app.homelift.exercise.Exercise;

/** One exercise within a workout, with its planned number of sets and the sets logged so far. */
@Entity
@Table(name = "workout_exercise")
public class WorkoutExercise {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "workout_id")
	private Workout workout;

	@ManyToOne(optional = false)
	@JoinColumn(name = "exercise_id")
	private Exercise exercise;

	@Column(nullable = false)
	private int position;

	@Column(name = "target_sets", nullable = false)
	private int targetSets;

	@Column(name = "target_reps")
	private @Nullable Integer targetReps;

	@Column(name = "target_max_reps")
	private @Nullable Integer targetMaxReps;

	@Column(name = "rest_seconds")
	private @Nullable Integer restSeconds;

	@Column(name = "auto_progress", nullable = false)
	private boolean autoProgress;

	@Column(name = "superset_group")
	private @Nullable Integer supersetGroup;

	@OneToMany(mappedBy = "workoutExercise", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("setNumber")
	private List<WorkoutSet> sets = new ArrayList<>();

	protected WorkoutExercise() {
	}

	WorkoutExercise(Workout workout, Exercise exercise, int position, int targetSets) {
		this.workout = workout;
		this.exercise = exercise;
		this.position = position;
		this.targetSets = targetSets;
	}

	public Long getId() {
		return this.id;
	}

	public Workout getWorkout() {
		return this.workout;
	}

	public Exercise getExercise() {
		return this.exercise;
	}

	public int getPosition() {
		return this.position;
	}

	public int getTargetSets() {
		return this.targetSets;
	}

	public @Nullable Integer getTargetReps() {
		return this.targetReps;
	}

	/** Top of the planned rep range, or null when the plan is a fixed number of reps. */
	public @Nullable Integer getTargetMaxReps() {
		return this.targetMaxReps;
	}

	public @Nullable Integer getRestSeconds() {
		return this.restSeconds;
	}

	public boolean isAutoProgress() {
		return this.autoProgress;
	}

	/** Exercises in a workout with the same group are a superset. */
	public @Nullable Integer getSupersetGroup() {
		return this.supersetGroup;
	}

	void supersetGroup(@Nullable Integer group) {
		this.supersetGroup = group;
	}

	/** The sets that count: everything but warm-ups. */
	public List<WorkoutSet> getWorkingSets() {
		return this.sets.stream().filter((s) -> !s.isWarmup()).toList();
	}

	void rest(@Nullable Integer restSeconds) {
		this.restSeconds = restSeconds;
	}

	void plan(int targetReps, @Nullable Integer targetMaxReps, int restSeconds, boolean autoProgress) {
		this.targetReps = targetReps;
		this.targetMaxReps = targetMaxReps;
		this.restSeconds = restSeconds;
		this.autoProgress = autoProgress;
	}

	public List<WorkoutSet> getSets() {
		return Collections.unmodifiableList(this.sets);
	}

	Optional<WorkoutSet> findSet(long setId) {
		return this.sets.stream().filter((s) -> s.getId() == setId).findFirst();
	}

	WorkoutSet logSet(double weightKg, int reps, boolean warmup, Instant at) {
		int next = this.sets.stream().mapToInt(WorkoutSet::getSetNumber).max().orElse(0) + 1;
		WorkoutSet set = new WorkoutSet(this, next, weightKg, reps, warmup, at);
		this.sets.add(set);
		// Logging past the plan extends it, so progress never shows more than 100%.
		this.targetSets = Math.max(this.targetSets, getWorkingSets().size());
		return set;
	}

	/** Removes a set and renumbers the rest so set numbers stay 1, 2, 3… */
	void removeSet(WorkoutSet set) {
		this.sets.remove(set);
		for (int i = 0; i < this.sets.size(); i++) {
			this.sets.get(i).renumber(i + 1);
		}
	}

}
