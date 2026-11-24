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

	/** Set-up cues such as seat height or grip. */
	private @Nullable String notes;

	/** Weight to add when progressing, in kg, or null to use the app setting. */
	@Column(name = "step_kg")
	private @Nullable Double stepKg;

	/** Name of the picture or clip in the media folder, or null when there is none. */
	@Column(name = "media_file")
	private @Nullable String mediaFile;

	@Enumerated(EnumType.STRING)
	@Column(name = "media_type")
	private @Nullable MediaType mediaType;

	protected Exercise() {
	}

	public Exercise(String name, MuscleGroup muscleGroup, Equipment equipment, @Nullable Integer restSeconds,
			@Nullable String notes) {
		this(name, muscleGroup, equipment, restSeconds, notes, null);
	}

	public Exercise(String name, MuscleGroup muscleGroup, Equipment equipment, @Nullable Integer restSeconds,
			@Nullable String notes, @Nullable Double stepKg) {
		this.name = name;
		this.muscleGroup = muscleGroup;
		this.equipment = equipment;
		this.restSeconds = restSeconds;
		this.notes = notes;
		this.stepKg = stepKg;
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

	public @Nullable String getNotes() {
		return this.notes;
	}

	public @Nullable Double getStepKg() {
		return this.stepKg;
	}

	public boolean isArchived() {
		return this.archived;
	}

	void update(String name, MuscleGroup muscleGroup, Equipment equipment, @Nullable Integer restSeconds,
			@Nullable String notes, @Nullable Double stepKg) {
		this.stepKg = stepKg;
		this.name = name;
		this.muscleGroup = muscleGroup;
		this.equipment = equipment;
		this.restSeconds = restSeconds;
		this.notes = notes;
	}

	public @Nullable String getMediaFile() {
		return this.mediaFile;
	}

	public @Nullable MediaType getMediaType() {
		return this.mediaType;
	}

	void setMedia(@Nullable String file, @Nullable MediaType type) {
		this.mediaFile = file;
		this.mediaType = type;
	}

	void archive() {
		this.archived = true;
	}

	void restore() {
		this.archived = false;
	}

}
