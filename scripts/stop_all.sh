#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# shellcheck source=scripts/lib/dev_env.sh
source "$SCRIPT_DIR/lib/dev_env.sh"

BACKEND_PORT=8080
FRONTEND_PORT=5173

echo "🛑 This will stop:"
echo "   - All Maven processes (mvn/mvnw)"
echo "   - Backend server on port ${BACKEND_PORT}"
echo "   - Frontend server on port ${FRONTEND_PORT}"
echo "   - This project's Vite processes"
echo "   - All Docker services (PostgreSQL, Mailpit) via 'docker compose down'"
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

echo ""
echo "🧹 Cleaning up all related processes..."

# Stop Maven processes
MAVEN_PIDS=$(pgrep -f "mvn.*athleticaos" 2>/dev/null || true)
stop_pids "Maven processes" "$MAVEN_PIDS"

MAVEN_WRAPPER_PIDS=$(pgrep -f "mvnw.*spring-boot:run" 2>/dev/null || true)
stop_pids "Maven wrapper processes" "$MAVEN_WRAPPER_PIDS"

# Stop Java processes (Spring Boot backend)
JAVA_PIDS=$(pgrep -f "java.*athleticaos.*backend" 2>/dev/null || true)
stop_pids "Spring Boot backend" "$JAVA_PIDS"

# Stop this project's Vite processes only
VITE_PIDS=$(project_vite_pids)
stop_pids "Project Vite" "$VITE_PIDS"

# Stop processes on specific ports
echo ""
echo "🔌 Cleaning up ports..."
for PORT in $BACKEND_PORT $FRONTEND_PORT; do
  PORT_PIDS=$(lsof -ti tcp:"${PORT}" 2>/dev/null || true)
  if [ -n "$PORT_PIDS" ]; then
    stop_pids "Process on port ${PORT}" "$PORT_PIDS"
  else
    echo "   ℹ No process found on port ${PORT}"
  fi
done

# Stop Docker services
# Never add -v here — it deletes the local database volume
echo ""
echo "🐳 Stopping Docker services (PostgreSQL, Mailpit)..."
docker compose down 2>/dev/null || true

echo ""
echo "✔️ All services stopped and cleaned up!"
echo "You can now run ./scripts/start_all.sh"
