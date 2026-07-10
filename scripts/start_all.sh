#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

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

# Pre-flight cleanup
echo ""
echo "🧹 Pre-flight cleanup: checking for stuck processes..."

cleanup_stuck_processes() {
  # Check for Maven processes
  MAVEN_PIDS=$(pgrep -f "mvn.*athleticaos" 2>/dev/null || true)
  if [ -n "$MAVEN_PIDS" ]; then
    echo "⚠️  Found stuck Maven processes (PIDs: $MAVEN_PIDS). Cleaning up..."
    kill -9 $MAVEN_PIDS 2>/dev/null || true
  fi

  # Check for processes on ports
  for PORT in $BACKEND_PORT $FRONTEND_PORT; do
    PORT_PIDS=$(lsof -ti tcp:${PORT} 2>/dev/null || true)
    if [ -n "$PORT_PIDS" ]; then
      echo "⚠️  Found process on port ${PORT} (PIDs: $PORT_PIDS). Cleaning up..."
      kill -9 $PORT_PIDS 2>/dev/null || true
    fi
  done
}

cleanup_stuck_processes
echo "✓ Pre-flight cleanup complete"

wait_for_docker_health() {
  echo ""
  echo "⏳ Waiting for Docker containers to become healthy (if healthchecks exist)..."

  local ATTEMPTS=30
  local SLEEP_SECONDS=2

  local IDS
  IDS=$(docker compose ps -q 2>/dev/null || true)

  if [ -z "$IDS" ]; then
    echo "⚠️ No containers found. Continuing..."
    return 0
  fi

  for ((i=1; i<=ATTEMPTS; i++)); do
    local UNHEALTHY
    UNHEALTHY=$(echo "$IDS" | xargs -I {} docker inspect --format '{{ if .State.Health }}{{ .State.Health.Status }}{{ else }}none{{ end }}' {} 2>/dev/null \
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

echo ""
echo "🐳 Starting Docker services..."
docker compose up -d

wait_for_docker_health

echo ""
echo "🚀 Starting backend (logs -> backend.log)..."
(
  cd "$BACKEND_DIR"
  nohup $BACKEND_START_CMD > "$PROJECT_ROOT/logs/backendLogs/backend.log" 2>&1 &
  echo "   Backend PID: $!"
)

echo ""
echo "⚡ Starting frontend (logs -> frontend.log)..."
(
  cd "$FRONTEND_DIR"
  nohup $FRONTEND_START_CMD > "$PROJECT_ROOT/logs/frontendLogs/frontend.log" 2>&1 &
  echo "   Frontend PID: $!"
)

echo ""
echo "🔥 Stack Ready!"
echo "➡ Backend:  http://localhost:${BACKEND_PORT}"
echo "➡ Frontend: http://localhost:${FRONTEND_PORT}"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f logs/backendLogs/backend.log"
echo "   Frontend: tail -f logs/frontendLogs/frontend.log"
