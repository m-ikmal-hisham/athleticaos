#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

BACKEND_PORT=8080
FRONTEND_PORT=5173

echo "🛑 This will stop:"
echo "   - All Maven processes (mvn/mvnw)"
echo "   - Backend server on port ${BACKEND_PORT}"
echo "   - Frontend server on port ${FRONTEND_PORT}"
echo "   - All Node/Vite processes"
echo "   - All Docker services via 'docker compose down'"
echo ""
read -r -p "Are you sure you want to stop everything? (y/N): " CONFIRM

case "$CONFIRM" in
  y|Y|yes|YES)
    echo "Proceeding to stop services..."
    ;;
  *)
    echo "❌ Aborted. Nothing was stopped."
    exit 0
    ;;
esac

kill_port() {
  local PORT=$1
  echo "🔪 Killing any process on port ${PORT}..."
  PIDS=$(lsof -ti tcp:${PORT} 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "   Found PIDs: $PIDS"
    kill -9 $PIDS 2>/dev/null || true
    echo "   ✓ Killed processes on port ${PORT}"
  else
    echo "   ℹ No process found on port ${PORT}"
  fi
}

kill_by_pattern() {
  local PATTERN=$1
  local DESCRIPTION=$2
  echo "🔪 Killing ${DESCRIPTION}..."
  PIDS=$(pgrep -f "$PATTERN" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "   Found PIDs: $PIDS"
    kill -9 $PIDS 2>/dev/null || true
    echo "   ✓ Killed ${DESCRIPTION}"
  else
    echo "   ℹ No ${DESCRIPTION} found"
  fi
}

echo ""
echo "🧹 Cleaning up all related processes..."

# Kill Maven processes (including stuck builds)
kill_by_pattern "mvn.*athleticaos" "Maven processes"
kill_by_pattern "mvnw.*spring-boot:run" "Maven wrapper processes"

# Kill Java processes (Spring Boot backend)
kill_by_pattern "java.*athleticaos.*backend" "Spring Boot backend"

# Kill Node/Vite processes (frontend)
kill_by_pattern "vite.*athleticaos" "Vite frontend"
kill_by_pattern "node.*vite" "Node Vite processes"

# Kill processes on specific ports
echo ""
echo "🔌 Cleaning up ports..."
kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"

# Stop Docker services
echo ""
echo "🐳 Stopping Docker services..."
docker compose down 2>/dev/null || true

echo ""
echo "✔️ All services stopped and cleaned up!"
echo "ℹ️  You can now safely run ./start_all.sh"
