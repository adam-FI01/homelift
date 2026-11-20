# syntax=docker/dockerfile:1.7
#
# Multi-arch build. The frontend and the jar are built once on the runner's native
# platform ($BUILDPLATFORM). Only the small runtime stage is per-architecture, so
# arm64 images build fast without emulating Maven or npm.

# ---- 1. Angular -----------------------------------------------------------
FROM --platform=$BUILDPLATFORM node:24-alpine AS web
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY frontend/ ./
RUN npm run build

# ---- 2. Spring Boot jar ---------------------------------------------------
FROM --platform=$BUILDPLATFORM eclipse-temurin:25-jdk AS jar
WORKDIR /src/backend
COPY backend/.mvn .mvn
COPY backend/mvnw backend/pom.xml ./
RUN --mount=type=cache,target=/root/.m2 ./mvnw -q -B dependency:go-offline -Dskip.frontend=true
COPY backend/src src
COPY --from=web /src/frontend/dist/frontend/browser src/main/resources/static
RUN --mount=type=cache,target=/root/.m2 ./mvnw -q -B package -DskipTests -Dskip.frontend=true \
 && java -Djarmode=tools -jar target/homelift-*.jar extract --layers --launcher --destination /app

# ---- 3. Runtime -----------------------------------------------------------
FROM eclipse-temurin:25-jre
LABEL org.opencontainers.image.title="HomeLift" \
      org.opencontainers.image.description="Self-hosted workout tracker" \
      org.opencontainers.image.source="https://github.com/adam-FI01/homelift" \
      org.opencontainers.image.licenses="MIT"

RUN (userdel --remove ubuntu 2>/dev/null || true) \
 && groupadd --system --gid 1000 homelift \
 && useradd --system --uid 1000 --gid homelift --home /app homelift \
 && mkdir -p /data && chown homelift:homelift /data

WORKDIR /app
COPY --from=jar /app/dependencies/ ./
COPY --from=jar /app/spring-boot-loader/ ./
COPY --from=jar /app/snapshot-dependencies/ ./
COPY --from=jar /app/application/ ./

ENV HOMELIFT_DATA_DIR=/data \
    JAVA_TOOL_OPTIONS="--enable-native-access=ALL-UNNAMED -XX:MaxRAMPercentage=75 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k"

USER homelift
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/8080 && printf 'GET /actuator/health/liveness HTTP/1.0\\r\\n\\r\\n' >&3 && grep -q UP <&3"]

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
