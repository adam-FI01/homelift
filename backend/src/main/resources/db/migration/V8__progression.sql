-- Rep ranges in routines (8 to 12): `reps` stays the bottom of the range, `max_reps` is the top.
ALTER TABLE routine_exercise ADD COLUMN max_reps INTEGER CHECK (max_reps IS NULL OR max_reps BETWEEN 1 AND 100);
ALTER TABLE workout_exercise ADD COLUMN target_max_reps INTEGER;

-- How much weight to add when you progress on this exercise, in kg. NULL uses the setting.
ALTER TABLE exercise ADD COLUMN step_kg REAL CHECK (step_kg IS NULL OR step_kg > 0);
