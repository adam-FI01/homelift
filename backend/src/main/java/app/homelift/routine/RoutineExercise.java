package app.homelift.routine;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.jspecify.annotations.Nullable;

import app.homelift.exercise.Exercise;

/** One exercise in a routine and how to do it. */
@Entity
@Table(name = "routine_exercise")
public class RoutineExercise {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "routine_id")
	private Routine routine;

	@ManyToOne(optional = false)
	@JoinColumn(name = "exercise_id")
	private Exercise exercise;

	@Column(nullable = false)
	private int position;

	@Column(nullable = false)
	private int sets;

	@Column(nullable = false)
	private int reps;

	@Column(name = "rest_seconds", nullable = false)
	private int restSeconds;

	@Column(name = "auto_progress", nullable = false)
	private boolean autoProgress;

	@Column(name = "superset_group")
	private @Nullable Integer supersetGroup;

	protected RoutineExercise() {
	}

	RoutineExercise(Exercise exercise, int sets, int reps, int restSeconds, boolean autoProgress,
			@Nullable Integer supersetGroup) {
		this.exercise = exercise;
		this.sets = sets;
		this.reps = reps;
		this.restSeconds = restSeconds;
		this.autoProgress = autoProgress;
		this.supersetGroup = supersetGroup;
	}

	void attach(Routine routine, int position) {
		this.routine = routine;
		this.position = position;
	}

	public Long getId() {
		return this.id;
	}

	public Exercise getExercise() {
		return this.exercise;
	}

	public int getPosition() {
		return this.position;
	}

	public int getSets() {
		return this.sets;
	}

	public int getReps() {
		return this.reps;
	}

	public int getRestSeconds() {
		return this.restSeconds;
	}

	public boolean isAutoProgress() {
		return this.autoProgress;
	}

	public @Nullable Integer getSupersetGroup() {
		return this.supersetGroup;
	}

}
