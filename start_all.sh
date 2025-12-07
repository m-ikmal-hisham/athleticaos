#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

BACKEND_PORT=8080
FRONTEND_PORT=5173

BACKEND_DIR="backend"
BACKEND_START_CMD="./mvnw spring-boot:run"

FRONTEND_DIR="frontend"
FRONTEND_START_CMD="npm run dev"

echo "🚀 This will start:"
echo "   - Docker services via 'docker compose up -d'"
echo "   - Backend (Spring Boot) on port ${BACKEND_PORT}"
echo "   - Frontend (Vite) on port ${FRONTEND_PORT}"
echo ""
read -r -p "Proceed to start the full AthleticaOS dev stack? (y/N): " CONFIRM

case "$CONFIRM" in
  y|Y|yes|YES)
    echo "Starting services..."
    ;;
  *)
    echo "❌ Aborted. Nothing was started."
    exit 0
    ;;
esac

wait_for_docker_health() {
  echo "⏳ Waiting for Docker containers to become healthy (if healthchecks exist)..."

  local ATTEMPTS=30
  local SLEEP_SECONDS=2

  local IDS
  IDS=$(docker compose ps -q || true)

  if [ -z "$IDS" ]; then
    echo "⚠️ No containers found. Continuing..."
    return 0
  fi

  for ((i=1; i<=ATTEMPTS; i++)); do
    local UNHEALTHY
    UNHEALTHY=$(echo "$IDS" | xargs -I {} docker inspect --format '{{ if .State.Health }}{{ .State.Health.Status }}{{ else }}none{{ end }}' {} \
      | grep -vE '^(healthy|none)$' || true)

    if [ -z "$UNHEALTHY" ]; then
      echo "✅ Containers healthy (or no healthcheck defined)."
      return 0
    fi

    echo "   Attempt ${i}/${ATTEMPTS}: waiting..."
    sleep "$SLEEP_SECONDS"
  done

  echo "⚠️ Proceeding even though some containers didn't report healthy."
}

echo "🐳 Starting Docker services..."
docker compose up -d

wait_for_docker_health

echo "🚀 Starting backend (logs -> backend.log)..."
(
  cd "$BACKEND_DIR"
  nohup $BACKEND_START_CMD > ../backend.log 2>&1 &
)

echo "⚡ Starting frontend (logs -> frontend.log)..."
(
  cd "$FRONTEND_DIR"
  nohup $FRONTEND_START_CMD > ../frontend.log 2>&1 &
)

echo "🔥 Stack Ready!"
echo "➡ Backend:  http://localhost:${BACKEND_PORT}"
echo "➡ Frontend: http://localhost:${FRONTEND_PORT}"
