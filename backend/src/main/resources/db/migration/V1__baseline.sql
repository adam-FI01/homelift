-- Baseline schema. Domain tables (exercises, workouts, sets) arrive in later migrations.
CREATE TABLE app_meta (
    meta_key   TEXT PRIMARY KEY,
    meta_value TEXT NOT NULL
);

INSERT INTO app_meta (meta_key, meta_value) VALUES ('schema_created_at', CURRENT_TIMESTAMP);
