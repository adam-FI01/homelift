package app.homelift.exercise;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import org.jspecify.annotations.Nullable;

/** A movement in the exercise library, such as "Bench Press". */
@Entity
public class Exercise {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(name = "muscle_group", nullable = false)
	private MuscleGroup muscleGroup;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Equipment equipment;

	@Column(nullable = false)
	private boolean archived;

	/** Rest after each set in seconds, or null to use the app default. */
	@Column(name = "rest_seconds")
	private @Nullable Integer restSeconds;

	protected Exercise() {
	}

	public Exercise(String name, MuscleGroup muscleGroup, Equipment equipment, @Nullable Integer restSeconds) {
		this.name = name;
		this.muscleGroup = muscleGroup;
		this.equipment = equipment;
		this.restSeconds = restSeconds;
	}

	public Long getId() {
		return this.id;
	}

	public String getName() {
		return this.name;
	}

	public MuscleGroup getMuscleGroup() {
		return this.muscleGroup;
	}

	public Equipment getEquipment() {
		return this.equipment;
	}

	public @Nullable Integer getRestSeconds() {
		return this.restSeconds;
	}

	public boolean isArchived() {
		return this.archived;
	}

	void update(String name, MuscleGroup muscleGroup, Equipment equipment, @Nullable Integer restSeconds) {
		this.name = name;
		this.muscleGroup = muscleGroup;
		this.equipment = equipment;
		this.restSeconds = restSeconds;
	}

	void archive() {
		this.archived = true;
	}

	void restore() {
		this.archived = false;
	}

}
