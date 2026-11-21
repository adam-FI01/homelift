package app.homelift.workout;

import java.time.Instant;

import org.jspecify.annotations.Nullable;

import app.homelift.exercise.MuscleGroup;

/** A flat, read-only view of one logged set with its workout and exercise, for history and stats. */
public record SetRecord(long setId, long workoutId, Instant workoutStartedAt, @Nullable Instant workoutFinishedAt,
		long exerciseId, String exerciseName, MuscleGroup muscleGroup, int setNumber, double weightKg, int reps,
		Instant loggedAt) {

	/** Weight × reps. */
	public double volumeKg() {
		return this.weightKg * this.reps;
	}

	/** Estimated one-rep max (Epley), the usual way to compare sets with different rep counts. */
	public double estimatedOneRepMax() {
		return OneRepMax.estimate(this.weightKg, this.reps);
	}

}
