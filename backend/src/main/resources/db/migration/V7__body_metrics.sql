-- Body weight and measurements, one value per kind per day. Weight is in kg, lengths in cm,
-- body fat in percent; the app converts for display.
CREATE TABLE body_metric (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    measured_on TEXT    NOT NULL,
    kind        TEXT    NOT NULL,
    value       REAL    NOT NULL CHECK (value > 0),
    UNIQUE (measured_on, kind)
);

CREATE INDEX body_metric_kind_date ON body_metric (kind, measured_on);
