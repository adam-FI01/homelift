package app.homelift.routine;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;

/** A saved workout plan: an ordered list of exercises with sets, reps and rest. */
@Entity
public class Routine {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String name;

	@OneToMany(mappedBy = "routine", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("position")
	private List<RoutineExercise> exercises = new ArrayList<>();

	protected Routine() {
	}

	Routine(String name) {
		this.name = name;
	}

	public Long getId() {
		return this.id;
	}

	public String getName() {
		return this.name;
	}

	public List<RoutineExercise> getExercises() {
		return Collections.unmodifiableList(this.exercises);
	}

	void rename(String name) {
		this.name = name;
	}

	/** Replaces the plan; the order of {@code exercises} becomes the order in the routine. */
	void replaceExercises(List<RoutineExercise> exercises) {
		this.exercises.clear();
		for (int i = 0; i < exercises.size(); i++) {
			RoutineExercise e = exercises.get(i);
			e.attach(this, i + 1);
			this.exercises.add(e);
		}
	}

}
