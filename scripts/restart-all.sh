#!/usr/bin/env bash

# AthleticaOS - Complete Restart Script
# This script restarts the database, compiles & restarts backend, and compiles & restarts frontend

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# shellcheck source=scripts/lib/dev_env.sh
source "$SCRIPT_DIR/lib/dev_env.sh"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AthleticaOS Complete Restart Script  ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

print_step() {
    echo -e "${YELLOW}>>> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

require_docker
resolve_java21
echo "Using Java: $(java -version 2>&1 | head -n 1)"
ensure_log_dirs

# Step 1: Comprehensive process cleanup
print_step "Step 1: Comprehensive process cleanup..."

MAVEN_PIDS=$(pgrep -f "mvn.*athleticaos" 2>/dev/null || true)
stop_pids "Maven processes" "$MAVEN_PIDS"

MAVEN_WRAPPER_PIDS=$(pgrep -f "mvnw.*spring-boot:run" 2>/dev/null || true)
stop_pids "Maven wrapper processes" "$MAVEN_WRAPPER_PIDS"

JAVA_PIDS=$(pgrep -f "java.*athleticaos.*backend" 2>/dev/null || true)
stop_pids "Spring Boot backend" "$JAVA_PIDS"

VITE_PIDS=$(project_vite_pids)
stop_pids "Project Vite" "$VITE_PIDS"

for PORT in 8080 5173; do
  PORT_PIDS=$(lsof -ti tcp:"${PORT}" 2>/dev/null || true)
  if [ -n "$PORT_PIDS" ]; then
    stop_pids "Process on port ${PORT}" "$PORT_PIDS"
  fi
done

print_success "All existing processes cleaned up"
echo ""

# Step 2: Restart Database and Docker services
print_step "Step 2: Restarting PostgreSQL Database and Mailpit..."
cd "$PROJECT_ROOT"

# Stop existing containers (never add -v here — it deletes the local database volume)
docker compose down 2>/dev/null || true

# Start containers
docker compose up -d

# Wait for containers
print_step "Waiting for database container to be ready..."
sleep 3

if docker ps | grep -q "athleticaos-postgres"; then
    print_success "Database container running"
else
    print_error "Database failed to start"
    exit 1
fi

echo ""

# Step 3: Compile and Restart Backend
print_step "Step 3: Compiling and restarting Backend..."
cd "$PROJECT_ROOT/backend"

print_step "Running Maven clean install..."
./mvnw clean install -DskipTests

print_success "Backend compiled successfully"

print_step "Starting Backend server..."
nohup ./mvnw spring-boot:run > "$PROJECT_ROOT/logs/backendLogs/backend.log" 2>&1 &
BACKEND_PID=$!

print_success "Backend started (PID: $BACKEND_PID)"
echo "Backend logs: $PROJECT_ROOT/logs/backendLogs/backend.log"

echo ""

# Step 4: Compile and Restart Frontend
print_step "Step 4: Compiling and restarting Frontend..."
cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ]; then
    print_step "Installing frontend dependencies..."
    npm install
fi

print_step "Building frontend..."
npm run build

print_success "Frontend compiled successfully"

print_step "Starting Frontend dev server..."
nohup npm run dev > "$PROJECT_ROOT/logs/frontendLogs/frontend.log" 2>&1 &
FRONTEND_PID=$!

print_success "Frontend started (PID: $FRONTEND_PID)"
echo "Frontend logs: $PROJECT_ROOT/logs/frontendLogs/frontend.log"

echo ""

# Wait for services
print_step "Waiting for services to become ready..."
wait_for_url "http://localhost:8080/actuator/health" 180 "Backend"
wait_for_url "http://localhost:5173" 60 "Frontend"

echo ""

# Step 5: Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  All Services Restarted Successfully! ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Service Status:"
echo "   Database  localhost:5432"
echo "   Backend   http://localhost:8080 (PID: $BACKEND_PID)"
echo "   Frontend  http://localhost:5173 (PID: $FRONTEND_PID)"
echo "   Mailpit   http://localhost:8025   (dev only: catches all outgoing email; nothing is really sent)"
echo ""
echo "Logs:"
echo "  • Backend:   $PROJECT_ROOT/logs/backendLogs/backend.log"
echo "  • Frontend:  $PROJECT_ROOT/logs/frontendLogs/frontend.log"
echo ""
echo "To view logs in real-time:"
echo "  • Backend:   tail -f $PROJECT_ROOT/logs/backendLogs/backend.log"
echo "  • Frontend:  tail -f $PROJECT_ROOT/logs/frontendLogs/frontend.log"
echo ""
echo "To stop services:"
echo "  • Run:       ./scripts/stop_all.sh"
echo ""
