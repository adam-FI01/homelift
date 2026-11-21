-- Exercise library. Names are unique ignoring case. Exercises are archived rather than
-- deleted so logged sets can keep pointing at them.
CREATE TABLE exercise (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL COLLATE NOCASE UNIQUE,
    muscle_group TEXT    NOT NULL,
    equipment    TEXT    NOT NULL,
    archived     INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX exercise_muscle_group ON exercise (muscle_group);

-- A starter set of common lifts. Users can rename, archive or add to these.
INSERT INTO exercise (name, muscle_group, equipment) VALUES
    ('Bench Press',              'CHEST',     'BARBELL'),
    ('Incline Bench Press',      'CHEST',     'BARBELL'),
    ('Dumbbell Bench Press',     'CHEST',     'DUMBBELL'),
    ('Incline Dumbbell Press',   'CHEST',     'DUMBBELL'),
    ('Chest Fly',                'CHEST',     'CABLE'),
    ('Push-up',                  'CHEST',     'BODYWEIGHT'),
    ('Deadlift',                 'BACK',      'BARBELL'),
    ('Barbell Row',              'BACK',      'BARBELL'),
    ('Dumbbell Row',             'BACK',      'DUMBBELL'),
    ('Pull-up',                  'BACK',      'BODYWEIGHT'),
    ('Lat Pulldown',             'BACK',      'CABLE'),
    ('Seated Cable Row',         'BACK',      'CABLE'),
    ('Overhead Press',           'SHOULDERS', 'BARBELL'),
    ('Dumbbell Shoulder Press',  'SHOULDERS', 'DUMBBELL'),
    ('Lateral Raise',            'SHOULDERS', 'DUMBBELL'),
    ('Face Pull',                'SHOULDERS', 'CABLE'),
    ('Back Squat',               'LEGS',      'BARBELL'),
    ('Front Squat',              'LEGS',      'BARBELL'),
    ('Romanian Deadlift',        'LEGS',      'BARBELL'),
    ('Leg Press',                'LEGS',      'MACHINE'),
    ('Bulgarian Split Squat',    'LEGS',      'DUMBBELL'),
    ('Leg Curl',                 'LEGS',      'MACHINE'),
    ('Leg Extension',            'LEGS',      'MACHINE'),
    ('Calf Raise',               'LEGS',      'MACHINE'),
    ('Hip Thrust',               'LEGS',      'BARBELL'),
    ('Barbell Curl',             'ARMS',      'BARBELL'),
    ('Dumbbell Curl',            'ARMS',      'DUMBBELL'),
    ('Hammer Curl',              'ARMS',      'DUMBBELL'),
    ('Triceps Pushdown',         'ARMS',      'CABLE'),
    ('Skull Crusher',            'ARMS',      'BARBELL'),
    ('Dip',                      'ARMS',      'BODYWEIGHT'),
    ('Plank',                    'CORE',      'BODYWEIGHT'),
    ('Hanging Leg Raise',        'CORE',      'BODYWEIGHT'),
    ('Cable Crunch',             'CORE',      'CABLE'),
    ('Kettlebell Swing',         'FULL_BODY', 'KETTLEBELL');
