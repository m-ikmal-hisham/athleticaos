#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# shellcheck source=scripts/lib/dev_env.sh
source "$SCRIPT_DIR/lib/dev_env.sh"

require_docker
resolve_java21
echo "Using Java: $(java -version 2>&1 | head -n 1)"
ensure_log_dirs

BACKEND_PORT=8080
FRONTEND_PORT=5173

BACKEND_DIR="backend"
BACKEND_START_CMD="./mvnw spring-boot:run"

FRONTEND_DIR="frontend"
FRONTEND_START_CMD="npm run dev"

echo "🚀 This will start:"
echo "   - Docker services (PostgreSQL, Mailpit) via 'docker compose up -d'"
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
  local maven_pids
  maven_pids=$(pgrep -f "mvn.*athleticaos" 2>/dev/null || true)
  if [ -n "$maven_pids" ]; then
    echo "⚠️  Found stuck Maven processes. Cleaning up..."
    stop_pids "Maven processes" "$maven_pids"
  fi

  local vite_pids
  vite_pids=$(project_vite_pids)
  if [ -n "$vite_pids" ]; then
    echo "⚠️  Found existing project Vite processes. Cleaning up..."
    stop_pids "Project Vite" "$vite_pids"
  fi

  local port
  for port in $BACKEND_PORT $FRONTEND_PORT; do
    local port_pids
    port_pids=$(lsof -ti tcp:"${port}" 2>/dev/null || true)
    if [ -n "$port_pids" ]; then
      echo "⚠️  Found process on port ${port}. Cleaning up..."
      stop_pids "Process on port ${port}" "$port_pids"
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

  local i
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
echo "🐳 Starting Docker services (PostgreSQL, Mailpit)..."
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
echo "⏳ Waiting for services to become ready..."
wait_for_url "http://localhost:${BACKEND_PORT}/actuator/health" 180 "Backend"
wait_for_url "http://localhost:${FRONTEND_PORT}" 60 "Frontend"

echo ""
echo "🔥 Stack Ready!"
echo "   Database  localhost:5432"
echo "   Backend   http://localhost:${BACKEND_PORT}"
echo "   Frontend  http://localhost:${FRONTEND_PORT}"
echo "   Mailpit   http://localhost:8025   (dev only: catches all outgoing email; nothing is really sent)"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f logs/backendLogs/backend.log"
echo "   Frontend: tail -f logs/frontendLogs/frontend.log"
