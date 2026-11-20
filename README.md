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

```bash
# API on :8080 (uses ./data/homelift.db)
cd backend && ./mvnw spring-boot:run -Dskip.frontend=true

# UI on :4200, proxying /api to :8080
cd frontend && npm ci && npm start
```

Tests and a full build:

```bash
cd frontend && npx ng test --watch=false
cd backend && ./mvnw verify          # also builds the UI into the jar
docker build -t homelift .
```

## Roadmap

- [x] Project skeleton, CI, multi-arch image
- [ ] Exercise library
- [ ] Log workouts and sets
- [ ] History and progress charts
- [ ] Data export and backup
- [ ] Optional GraalVM native image

## License

[MIT](LICENSE)
