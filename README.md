# HomeLift

[![CI](https://github.com/adam-FI01/homelift/actions/workflows/ci.yml/badge.svg)](https://github.com/adam-FI01/homelift/actions/workflows/ci.yml)
[![Docker image](https://github.com/adam-FI01/homelift/actions/workflows/docker.yml/badge.svg)](https://github.com/adam-FI01/homelift/actions/workflows/docker.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A self-hosted workout tracker made for a home server. HomeLift ships as one small container with an embedded SQLite database, so it runs on a Raspberry Pi as easily as on a desktop, and your training history stays on your own hardware.

> **Status:** early development. The project skeleton, CI, and container image are in place. Workout logging is next.

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
| `JAVA_TOOL_OPTIONS` | tuned   | JVM flags (heap is 75% of the container memory limit) |

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

## Branches and releases

```
feature/* ──PR──► qa ──PR──► main ──► ghcr.io/adam-fi01/homelift:latest
                                  └─ tag v1.2.3 ──► :1.2.3, :1.2 and a GitHub release
```

- **`qa`** is the integration branch. Feature, fix and Dependabot PRs target `qa` and are squash-merged once CI passes.
- **`main`** is the release branch. It only accepts a pull request from `qa`, which is enforced by the required `Source branch is qa` check, and that PR is merged with a merge commit so the two branches stay in sync.
- Both branches are protected. Changes need a pull request with passing checks, and force pushes and deletion are blocked.
- Pull requests run the frontend and backend tests plus a quick amd64 image build. The full amd64 + arm64 image is built and published **only from `main`**.
- **Releasing** a version: bump the version in `backend/pom.xml` and `frontend/package.json`, move the `Unreleased` notes in [`CHANGELOG.md`](CHANGELOG.md) under the new version, merge `qa` into `main`, then tag that merge commit (`git tag v1.2.3 && git push origin v1.2.3`). The tag publishes `:1.2.3` and `:1.2` images and creates the GitHub release from the changelog. Tags on any commit not on `main` are refused.
- To stay on a version, use `ghcr.io/adam-fi01/homelift:1.0.0` (or `:1.0` for patch updates) instead of `:latest`.

## Roadmap

- [x] Project skeleton, CI, multi-arch image
- [ ] Exercise library
- [ ] Log workouts and sets
- [ ] History and progress charts
- [ ] Data export and backup
- [ ] Optional GraalVM native image

## License

[MIT](LICENSE)
