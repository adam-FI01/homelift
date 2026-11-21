# HomeLift

[![CI](https://github.com/adam-FI01/homelift/actions/workflows/ci.yml/badge.svg)](https://github.com/adam-FI01/homelift/actions/workflows/ci.yml)
[![Docker image](https://github.com/adam-FI01/homelift/actions/workflows/docker.yml/badge.svg)](https://github.com/adam-FI01/homelift/actions/workflows/docker.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A self-hosted workout tracker made for a home server. HomeLift ships as one small container with an embedded SQLite database, so it runs on a Raspberry Pi as easily as on a desktop, and your training history stays on your own hardware.

> **Status:** usable day to day. Log workouts, follow routines, track progress and back up your data.

## Features

- **Install it like an app.** Add HomeLift to your home screen; it opens full screen, loads without a connection, and sets logged offline are kept on the phone and sent when you're back.
- **Log sets with one tap.** Each set is prefilled from the last one, or from last time, with big +/− controls and a rest timer that survives a reload.
- **Warm-ups, supersets and notes.** Tag warm-up sets (left out of volume and records), pair exercises into supersets that rest after the round, and keep notes on workouts and set-up cues on exercises.
- **Routines.** Save plans like "Push A" with sets, reps and rest, and start them with one tap. Optional auto progression adds 2.5 kg once every set hits its reps.
- **Progress.** Estimated 1-rep max (Epley) over time per exercise, records, and every past session.
- **Stats.** A Wrapped-style recap for any day, week, month, quarter or year: volume, records, top lifts, muscle focus, streaks and habits.
- **Body.** Log body weight, body fat and measurements; weight is charted on Stats.
- **Settings.** Default rest with per-exercise overrides, auto-start, sound and vibration, kg or lb, and light, dark or system theme.
- **Optional PIN.** Off by default. Turn it on in Settings or with `HOMELIFT_PIN`; each device stays unlocked for 30 days. It keeps casual hands out on a home network, and isn't a substitute for keeping the server off the open internet.
- **Your data.** Download a full database backup, a CSV of every set, or a JSON dump at any time.

## Quick start

With Docker:

```bash
docker run -d --name homelift -p 8080:8080 -v ./data:/data ghcr.io/adam-fi01/homelift:latest
```

Or with Compose, using the [`compose.yaml`](compose.yaml) in this repo:

```bash
docker compose up -d
```

Then open `http://<your-host>:8080`. Images are published for `linux/amd64` and `linux/arm64`.

The database lives in `/data` inside the container. Mount a host folder or volume there to keep it. The app runs as UID 1000, so a host folder must be writable by that user (`sudo chown 1000:1000 ./data`).

| Variable            | Default | Purpose                                  |
| ------------------- | ------- | ---------------------------------------- |
| `PORT`              | `8080`  | HTTP port inside the container           |
| `HOMELIFT_DATA_DIR` | `/data` | Folder that holds `homelift.db`          |
| `HOMELIFT_PIN`      | unset   | Require this PIN (4 to 12 digits) to use the app; overrides the PIN in Settings |
| `JAVA_TOOL_OPTIONS` | tuned   | JVM flags (heap is 75% of the container memory limit) |
| `LOGGING_STRUCTURED_FORMAT_CONSOLE` | `ecs` | JSON logs (`ecs`, `logstash`, `gelf`); unset for plain text |

## Architecture

```
┌────────────────────────── one container ──────────────────────────┐
│  Spring Boot 4 (JDK 25)                                           │
│   ├── /            Angular SPA, served from the jar's /static      │
│   ├── /api/**      REST API                                        │
│   └── /actuator/** health checks                                   │
│        │                                                           │
│        └── JPA / Flyway ──► SQLite  (/data/homelift.db, WAL mode)  │
└────────────────────────────────────────────────────────────────────┘
```

| Layer    | Choice                                   | Why |
| -------- | ---------------------------------------- | --- |
| Frontend | Angular 22 (standalone, signals, zoneless) | Typed, batteries included, small production bundle |
| Backend  | Spring Boot 4.1 on Java 25, virtual threads | Mature ecosystem, and ready for a GraalVM native image |
| Storage  | SQLite with Flyway migrations             | No database server to run; one file to back up |
| Delivery | Multi-stage Docker build, GHCR            | `docker run` and done, on x86 or ARM |

Design notes:

- **One deployable.** Maven builds the Angular app and copies it into the jar, and Spring forwards client-side routes to `index.html` so deep links work.
- **Readable operations.** The image logs JSON (Elastic Common Schema) with one line per API call: method, path, status, duration and a request id that is also returned as `X-Request-Id`. Browsers get a friendly error page; the API always answers with `problem+json`.
- **Small footprint.** One database connection (SQLite allows a single writer), Serial GC, and a capped heap keep memory at about 220 MB at idle.
- **Fast multi-arch builds.** The frontend and the jar build once on the runner's native platform. Only the thin runtime layer is per-architecture, so arm64 builds don't emulate Maven or npm.
- **Native-ready.** The GraalVM `native-maven-plugin` is already configured, so a native image can be added later without restructuring.

## Project layout

```
backend/    Spring Boot application (Maven)
frontend/   Angular application
Dockerfile  Multi-stage, multi-arch image build
compose.yaml
.github/    CI, image publishing, Dependabot
```

## Development

You need JDK 25 and Node 24 or newer.

Run the API and the UI together with one command, then open `http://localhost:4200`:

```bash
./scripts/dev.sh
```

This starts Spring Boot with the `dev` profile on `:8080` and the Angular dev server on `:4200`, which proxies `/api` and `/actuator` to the backend. Ctrl-C stops both.

The `dev` profile keeps its database at `~/.homelift/dev/homelift.db`, outside the repo, so local testing never touches real data. Set `HOMELIFT_DATA_DIR` to use another folder. The profile also logs SQL and exposes extra actuator endpoints (`/actuator/flyway`, `/actuator/mappings`, and others).

### IntelliJ IDEA

Shared run configurations live in [`.run/`](.run). Open the **repo root** (not `backend/`), load `backend/pom.xml` as a Maven project when IntelliJ offers it, and these appear in the run menu:

| Configuration           | What it does |
| ----------------------- | ------------ |
| `HomeLift (full stack)` | Starts the two below together |
| `HomeLift API (dev)`    | Runs `HomeLiftApplication` with the `dev` profile, debuggable |
| `HomeLift UI`           | `npm start` in `frontend/` |
| `Backend tests`         | `mvn verify`, skipping the UI build |

### VS Code

Open the repo root. Shared configs live in [`.vscode/`](.vscode), and VS Code offers to install the recommended extensions (Java, Spring Boot, Angular).

- **Run and Debug** › `HomeLift (full stack)` starts the API with the `dev` profile and the Angular dev server, then opens Chrome with breakpoints working in both.
- `HomeLift API (dev)` and `HomeLift UI (Chrome)` start each side on its own.
- **Terminal** › **Run Task** has `backend tests`, `frontend tests`, and `full stack (terminal)` (the same as `scripts/dev.sh`).

### Running pieces by hand

```bash
# API on :8080 with the dev profile
cd backend && ./mvnw spring-boot:run -Dskip.frontend=true -Dspring-boot.run.profiles=dev

# UI on :4200, proxying /api to :8080
cd frontend && npm ci && npm start
```

Tests and a full build:

```bash
cd frontend && npx ng test --watch=false
cd backend && ./mvnw verify          # also builds the UI into the jar
docker build -t homelift .
```

## API

Everything the UI does goes through a JSON API under `/api`. Errors use RFC 9457 `problem+json`.

| Area      | Endpoints |
| --------- | --------- |
| Exercises | `GET/POST /api/exercises`, `GET/PUT /api/exercises/{id}`, `POST …/{id}/archive`, `POST …/{id}/restore`, `GET …/{id}/history` |
| Workouts  | `GET /api/workouts`, `GET /api/workouts/current`, `POST /api/workouts`, `GET/DELETE /api/workouts/{id}`, `POST …/{id}/exercises`, `DELETE …/{id}/exercises/{exerciseId}`, `POST …/sets`, `PUT/DELETE …/sets/{setId}`, `PUT …/{id}/notes`, `POST …/{id}/finish` |
| Routines  | `GET/POST /api/routines`, `GET/PUT/DELETE /api/routines/{id}`, `POST …/{id}/start` |
| Stats     | `GET /api/stats?period=DAY\|WEEK\|MONTH\|QUARTER\|YEAR&date=&zone=` |
| Body      | `GET/PUT /api/body`, `DELETE /api/body/{id}` |
| PIN lock  | `GET /api/auth`, `POST /api/auth/unlock`, `POST /api/auth/lock`, `PUT/DELETE /api/auth/pin` |
| Settings  | `GET/PUT /api/settings` |
| Export    | `GET /api/export/homelift.db`, `GET /api/export/sets.csv`, `GET /api/export/backup.json` |

A [Postman](https://www.postman.com/) collection covering every endpoint (43 requests) lives in [`postman/`](postman). Import both files, pick the **HomeLift local** environment (`http://localhost:8080`), and run the folders top to bottom: requests that create things save their ids for the next ones. For your own server, duplicate the environment and change `baseUrl`.

## Branches and releases

```
feature/* ──PR──► qa ──PR──► main ──► ghcr.io/adam-fi01/homelift:latest
```

- **`qa`** is the integration branch. Feature, fix and Dependabot PRs target `qa` and are squash-merged once CI passes.
- **`main`** is the release branch. It only accepts a pull request from `qa`, which is enforced by the required `Source branch is qa` check, and that PR is merged with a merge commit so the two branches stay in sync.
- Both branches are protected. Changes need a pull request with passing checks, and force pushes and deletion are blocked.
- Pull requests run the frontend and backend tests plus a quick amd64 image build. The full amd64 + arm64 image is built and published **only from `main`**.

## Roadmap

- [x] Project skeleton, CI, multi-arch image
- [x] Exercise library
- [x] Log workouts and sets, with a rest timer
- [x] Routines with auto progression
- [x] History, records and estimated 1RM charts
- [x] Stats for any day, week, month, quarter or year
- [x] Data export and backup
- [ ] Optional GraalVM native image

## License

[MIT](LICENSE)
