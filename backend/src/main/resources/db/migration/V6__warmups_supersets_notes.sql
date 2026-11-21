-- Warm-up sets are logged but left out of volume, records and "last time".
ALTER TABLE workout_set ADD COLUMN warmup INTEGER NOT NULL DEFAULT 0 CHECK (warmup IN (0, 1));

-- Exercises sharing a superset group are done back to back, resting after the round.
ALTER TABLE routine_exercise ADD COLUMN superset_group INTEGER;
ALTER TABLE workout_exercise ADD COLUMN superset_group INTEGER;

-- Free-text notes: how a workout went, and set-up cues for an exercise (seat height, grip).
ALTER TABLE workout ADD COLUMN notes TEXT;
ALTER TABLE exercise ADD COLUMN notes TEXT;
