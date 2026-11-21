-- A workout session. finished_at stays NULL while the workout is in progress; at most one
-- workout can be in progress at a time.
CREATE TABLE workout (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT,
    started_at  TEXT NOT NULL,
    finished_at TEXT
);

CREATE UNIQUE INDEX workout_one_in_progress ON workout ((finished_at IS NULL)) WHERE finished_at IS NULL;

-- An exercise as done in one workout, in the order the user does them.
CREATE TABLE workout_exercise (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id  INTEGER NOT NULL REFERENCES workout (id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercise (id),
    position    INTEGER NOT NULL,
    target_sets INTEGER NOT NULL CHECK (target_sets BETWEEN 1 AND 20)
);

CREATE INDEX workout_exercise_workout ON workout_exercise (workout_id);
CREATE INDEX workout_exercise_exercise ON workout_exercise (exercise_id);

-- One logged set.
CREATE TABLE workout_set (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercise (id) ON DELETE CASCADE,
    set_number          INTEGER NOT NULL,
    weight_kg           REAL    NOT NULL CHECK (weight_kg >= 0),
    reps                INTEGER NOT NULL CHECK (reps >= 0),
    logged_at           TEXT    NOT NULL
);

CREATE INDEX workout_set_workout_exercise ON workout_set (workout_exercise_id);
