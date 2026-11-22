# Changelog

All notable changes to HomeLift. Versions follow [Semantic Versioning](https://semver.org): a new major
version may need you to do something when upgrading; minor and patch versions never do.

## [Unreleased]

## [1.1.0] - 2026-11-22

More of what you do at the gym works without a signal, progression gets smarter, and you can bring
your old history in.

### Added

- **Update banner.** When a new version has been downloaded in the background, a calm banner says
  "A new version is ready" with a Reload button. If the cached app is ever broken, it asks for a reload.
- **More works offline.** Finishing a workout, workout notes, and correcting or deleting a set now wait on
  the phone when there is no connection, and are sent in the order you made them. What is waiting shows
  at the top of Today and Home, with a Send now button. Sets queued by 1.0 are carried over.
- **Rep ranges.** A routine exercise can be "8 to 12". The hint adds a rep each session until every set
  reaches the top, then adds weight and drops back to the bottom. Auto progression waits for the top.
- **Weight step per exercise.** Set how much to add for each exercise (1 kg for small dumbbells, a
  machine's stack step). It drives the hint, auto progression and the +/− buttons.
- **Lighter week.** After two sessions in a row that missed the plan, the hint suggests 90% of the last
  weight, rounded to the exercise's step.
- **Photos and short clips for exercises.** Add your own picture or a clip of up to 15 MB to an exercise.
  Photos are shrunk on the phone before upload. They show on the exercise page and as thumbnails in the
  picker, load lazily, and are stored in `media/` next to the database.
- **Full backup with pictures.** Settings has a new Full backup (`homelift.zip`) holding the database and
  the pictures. The database-only download is still there.
- **Import workouts from CSV.** Settings › Import workouts reads a CSV with a date, exercise, weight and
  reps per row, and exports from Strong, Hevy and FitNotes. A dry run shows what is in the file, which
  workouts already exist (they are skipped), and lets you match each exercise name to your library, add
  it as new, or leave it out.
- **Accessibility checks.** The end-to-end tests scan every main screen with axe in light and dark mode
  and fail on serious problems.

- **Optional native image.** A GraalVM build (`:<version>-native`, started by hand from Actions) starts in
  0.43 s and uses about 216 MB. It is not the default and `:latest` is unchanged.

### Changed

- Measured CPU and memory on the JVM and native builds are in the README. The image's JVM flags cut start-up
  CPU by about half and request CPU by about 40% compared with JVM defaults.

### Fixed

- The exercise picker no longer uses an ARIA attribute that screen readers don't support there.

### Upgrading

- Pull and restart. Migrations V8 and V9 only add columns. To keep exercise pictures, back up the whole
  data folder, or use the new full backup, not just `homelift.db`.
- Restoring: unzip `homelift.zip` into the data folder, replacing `homelift.db` and `media/`.

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

[Unreleased]: https://github.com/adam-FI01/homelift/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/adam-FI01/homelift/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/adam-FI01/homelift/releases/tag/v1.0.0
