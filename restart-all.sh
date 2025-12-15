#!/bin/bash

# AthleticaOS - Complete Restart Script
# This script restarts the database, compiles & restarts backend, and compiles & restarts frontend

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AthleticaOS Complete Restart Script  ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print colored messages
print_step() {
    echo -e "${YELLOW}>>> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Step 1: Comprehensive process cleanup
print_step "Step 1: Comprehensive process cleanup..."

kill_port() {
  local PORT=$1
  local DESCRIPTION=$2
  if lsof -ti:${PORT} > /dev/null 2>&1; then
    print_step "Killing process on port ${PORT} (${DESCRIPTION})..."
    PIDS=$(lsof -ti:${PORT})
    kill -9 $PIDS 2>/dev/null || true
    print_success "${DESCRIPTION} process stopped (PIDs: $PIDS)"
  else
    echo "  ℹ No process running on port ${PORT}"
  fi
}

kill_by_pattern() {
  local PATTERN=$1
  local DESCRIPTION=$2
  PIDS=$(pgrep -f "$PATTERN" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    print_step "Killing ${DESCRIPTION}..."
    echo "  Found PIDs: $PIDS"
    kill -9 $PIDS 2>/dev/null || true
    print_success "${DESCRIPTION} stopped"
  fi
}

# Kill all related processes
kill_by_pattern "mvn.*athleticaos" "Maven processes"
kill_by_pattern "mvnw.*spring-boot:run" "Maven wrapper processes"
kill_by_pattern "java.*athleticaos.*backend" "Spring Boot backend"
kill_by_pattern "vite.*athleticaos" "Vite frontend"
kill_by_pattern "node.*vite" "Node Vite processes"

# Kill processes on specific ports
kill_port "8080" "Backend"
kill_port "5173" "Frontend"

print_success "All existing processes cleaned up"
echo ""

# Step 2: Restart Database
print_step "Step 2: Restarting PostgreSQL Database..."
cd "$PROJECT_ROOT"

# Stop existing containers
docker-compose down 2>/dev/null || true

# Start database container
docker-compose up -d

# Wait for database to be ready
print_step "Waiting for database to be ready..."
sleep 5

# Check if database is healthy
if docker ps | grep -q "athleticaos-postgres"; then
    print_success "Database restarted successfully"
else
    print_error "Database failed to start"
    exit 1
fi

echo ""

# Step 3: Compile and Restart Backend
print_step "Step 3: Compiling and restarting Backend..."
cd "$PROJECT_ROOT/backend"

# Clean and compile with Maven
print_step "Running Maven clean install..."
./mvnw clean install -DskipTests

if [ $? -eq 0 ]; then
    print_success "Backend compiled successfully"
else
    print_error "Backend compilation failed"
    exit 1
fi

# Start backend in background
print_step "Starting Backend server..."
nohup ./mvnw spring-boot:run > "$PROJECT_ROOT/backend.log" 2>&1 &
BACKEND_PID=$!

print_success "Backend started (PID: $BACKEND_PID)"
echo "Backend logs: $PROJECT_ROOT/backend.log"

echo ""

# Step 4: Compile and Restart Frontend
print_step "Step 4: Compiling and restarting Frontend..."
cd "$PROJECT_ROOT/frontend"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_step "Installing frontend dependencies..."
    npm install
fi

# Build frontend (TypeScript compilation)
print_step "Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Frontend compiled successfully"
else
    print_error "Frontend compilation failed"
    exit 1
fi

# Start frontend dev server in background
print_step "Starting Frontend dev server..."
nohup npm run dev > "$PROJECT_ROOT/frontend.log" 2>&1 &
FRONTEND_PID=$!

print_success "Frontend started (PID: $FRONTEND_PID)"
echo "Frontend logs: $PROJECT_ROOT/frontend.log"

echo ""

# Step 5: Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  All Services Restarted Successfully! ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Service Status:"
echo "  • Database:  Running on localhost:5432"
echo "  • Backend:   Running on http://localhost:8080 (PID: $BACKEND_PID)"
echo "  • Frontend:  Running on http://localhost:5173 (PID: $FRONTEND_PID)"
echo ""
echo "Logs:"
echo "  • Backend:   $PROJECT_ROOT/backend.log"
echo "  • Frontend:  $PROJECT_ROOT/frontend.log"
echo ""
echo "To view logs in real-time:"
echo "  • Backend:   tail -f $PROJECT_ROOT/backend.log"
echo "  • Frontend:  tail -f $PROJECT_ROOT/frontend.log"
echo ""
echo "To stop services:"
echo "  • Run:       ./stop_all.sh"
echo "  • Or kill:   kill $BACKEND_PID $FRONTEND_PID && docker-compose down"
echo ""
