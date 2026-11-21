-- A saved workout plan, such as "Push A".
CREATE TABLE routine (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL COLLATE NOCASE UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- An exercise in a routine, with its plan.
CREATE TABLE routine_exercise (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    routine_id   INTEGER NOT NULL REFERENCES routine (id) ON DELETE CASCADE,
    exercise_id  INTEGER NOT NULL REFERENCES exercise (id),
    position     INTEGER NOT NULL,
    sets         INTEGER NOT NULL CHECK (sets BETWEEN 1 AND 20),
    reps         INTEGER NOT NULL CHECK (reps BETWEEN 1 AND 100),
    rest_seconds INTEGER NOT NULL CHECK (rest_seconds BETWEEN 0 AND 900),
    auto_progress INTEGER NOT NULL DEFAULT 0 CHECK (auto_progress IN (0, 1))
);

CREATE INDEX routine_exercise_routine ON routine_exercise (routine_id);

-- A workout started from a routine carries the plan for each exercise.
ALTER TABLE workout ADD COLUMN routine_id INTEGER REFERENCES routine (id) ON DELETE SET NULL;
ALTER TABLE workout_exercise ADD COLUMN target_reps INTEGER;
ALTER TABLE workout_exercise ADD COLUMN rest_seconds INTEGER;
ALTER TABLE workout_exercise ADD COLUMN auto_progress INTEGER NOT NULL DEFAULT 0;
