# Changelog

All notable changes to HomeLift. Versions follow [Semantic Versioning](https://semver.org): a new major
version may need you to do something when upgrading; minor and patch versions never do.

## [Unreleased]

## [1.0.0] - 2026-11-21

The first release: everything you need to log training on your own server.

### Added

- **Workout logging.** Start a workout, add exercises, and log each set with one tap. Sets are prefilled from
  the last one or from last time, with big +/− steppers, a hint for what to try, a plate calculator, warm-up
  sets (left out of volume and records), supersets and notes.
- **Rest timer.** Starts after each set, keeps time when the phone locks, −15s / +15s / Skip, sound and
  vibration when rest is over, and a mini timer on every page.
- **Routines.** Save plans with sets, reps and rest per exercise, reorder them, link supersets, and turn on
  auto progression. Start a workout from a routine with one tap.
- **Exercise library.** About 120 built-in exercises across every muscle group and equipment type; add,
  edit, archive, set your own rest and set-up notes.
- **History and progress.** Workouts grouped by month with a detail sheet, and per-exercise estimated 1RM
  charts, records and past sessions.
- **Stats.** A Wrapped-style recap for any day, week, month, quarter or year: volume, running total,
  records, top lifts, muscle focus, streaks, habits and body weight.
- **Body.** Track body weight, body fat and measurements.
- **Settings.** Default rest, timer options, kg or lb, light, dark or system theme, an optional PIN lock,
  server health, and backups.
- **Your data.** Download a live database backup, a CSV of every set, or a JSON dump.
- **Installable app.** Add HomeLift to your home screen over HTTPS; it opens offline and syncs sets logged
  without a connection.
- **Operations.** One small multi-arch container (amd64 and arm64) with SQLite, JSON logs with a request id
  per call, friendly error pages, a health check, a Postman collection and end-to-end tests.

### Upgrading

- From the 0.1 preview: back up `homelift.db`, then pull and restart. Database migrations V2 to V7 run on
  start-up and only add tables and columns.

[Unreleased]: https://github.com/adam-FI01/homelift/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/adam-FI01/homelift/releases/tag/v1.0.0
