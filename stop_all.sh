#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

BACKEND_PORT=8080
FRONTEND_PORT=5173

echo "🛑 This will stop:"
echo "   - Backend server on port ${BACKEND_PORT}"
echo "   - Frontend server on port ${FRONTEND_PORT}"
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
  PIDS=$(lsof -ti tcp:${PORT} || true)
  if [ -n "$PIDS" ]; then
    kill -9 $PIDS || true
  fi
}

echo "🛑 Stopping backend and frontend servers..."
kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"

echo "🐳 Stopping Docker services..."
docker compose down || true

echo "✔️ All services stopped!"
