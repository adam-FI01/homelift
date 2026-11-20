#!/usr/bin/env bash
# Runs the API (dev profile, :8080) and the Angular dev server (:4200) together.
# Open http://localhost:4200. Ctrl-C stops both.
# Works with the bash 3.2 that ships with macOS.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -d "$root/frontend/node_modules" ]]; then
	echo "Installing frontend dependencies..."
	(cd "$root/frontend" && npm ci)
fi

# Label each line so the two logs are easy to tell apart (flushes per line).
prefix() { awk -v p="$1" '{ print p $0; fflush() }'; }

# Job control puts each background job in its own process group, so one kill
# reaches Maven, the forked JVM, npm and ng alike.
set -m

cd "$root/backend"
(./mvnw -q spring-boot:run -Dskip.frontend=true -Dspring-boot.run.profiles=dev 2>&1 | prefix "[api] ") &
api=$!

cd "$root/frontend"
(npm start 2>&1 | prefix "[ui]  ") &
ui=$!

stopping=0
cleanup() {
	[[ $stopping == 1 ]] && return
	stopping=1
	echo "Stopping..."
	kill -TERM -- "-$api" "-$ui" 2>/dev/null || true
	wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# Stop everything as soon as either side exits.
while kill -0 "$api" 2>/dev/null && kill -0 "$ui" 2>/dev/null; do
	sleep 1
done
