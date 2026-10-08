# scripts/lib/dev_env.sh
# Shared environment configuration and helper functions for AthleticaOS local dev scripts.
# Sourced by scripts/start_all.sh, scripts/stop_all.sh, scripts/restart-all.sh.
# Keep compatible with macOS system bash 3.2 (no associative arrays, no mapfile, no ${var,,}).

# Determine project root if not already defined
if [ -z "$PROJECT_ROOT" ]; then
  PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi

_is_java21_candidate() {
  local candidate="$1"
  if [ -n "$candidate" ] && [ -x "$candidate/bin/java" ]; then
    if "$candidate/bin/java" -version 2>&1 | grep -q 'version "21'; then
      return 0
    fi
  fi
  return 1
}

resolve_java21() {
  local candidate=""

  # 1) $ATHLETICAOS_JAVA_HOME (optional override)
  if [ -n "$ATHLETICAOS_JAVA_HOME" ] && _is_java21_candidate "$ATHLETICAOS_JAVA_HOME"; then
    candidate="$ATHLETICAOS_JAVA_HOME"
  fi

  # 2) $(brew --prefix openjdk@21 2>/dev/null)/libexec/openjdk.jdk/Contents/Home
  if [ -z "$candidate" ]; then
    local brew_pfx
    brew_pfx="$(brew --prefix openjdk@21 2>/dev/null || true)"
    if [ -n "$brew_pfx" ] && _is_java21_candidate "$brew_pfx/libexec/openjdk.jdk/Contents/Home"; then
      candidate="$brew_pfx/libexec/openjdk.jdk/Contents/Home"
    fi
  fi

  # 3) /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
  if [ -z "$candidate" ] && _is_java21_candidate "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"; then
    candidate="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
  fi

  # 4) each JDK home listed by /usr/libexec/java_home -V whose version starts with 21
  if [ -z "$candidate" ] && [ -x /usr/libexec/java_home ]; then
    local jhomes
    jhomes="$(/usr/libexec/java_home -V 2>&1 | awk '/^[[:space:]]*21/ {print $NF}')"
    for jh in $jhomes; do
      if _is_java21_candidate "$jh"; then
        candidate="$jh"
        break
      fi
    done
  fi

  if [ -n "$candidate" ]; then
    export JAVA_HOME="$candidate"
    export PATH="$JAVA_HOME/bin:$PATH"
    return 0
  fi

  echo "JDK 21 not found. Install it with: brew install openjdk@21"
  exit 1
}

require_docker() {
  if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Start Docker Desktop and try again."
    exit 1
  fi
}

ensure_log_dirs() {
  mkdir -p "$PROJECT_ROOT/logs/backendLogs" "$PROJECT_ROOT/logs/frontendLogs"
}

stop_pids() {
  local description="$1"
  shift
  local pids="$*"
  local target_pids=""
  local p

  for p in $pids; do
    if [ -n "$p" ] && kill -0 "$p" 2>/dev/null; then
      target_pids="$target_pids $p"
    fi
  done
  target_pids="$(echo "$target_pids" | xargs)"

  if [ -z "$target_pids" ]; then
    return 0
  fi

  echo "🛑 Stopping $description (PIDs: $target_pids)..."
  for p in $target_pids; do
    kill -TERM "$p" 2>/dev/null || true
  done

  local waited=0
  while [ "$waited" -lt 5 ]; do
    local alive=0
    for p in $target_pids; do
      if kill -0 "$p" 2>/dev/null; then
        alive=1
        break
      fi
    done
    if [ "$alive" -eq 0 ]; then
      break
    fi
    sleep 1
    waited=$((waited + 1))
  done

  for p in $target_pids; do
    if kill -0 "$p" 2>/dev/null; then
      echo "⚠️ Force killing $description (PID: $p)..."
      kill -9 "$p" 2>/dev/null || true
    fi
  done
}

project_vite_pids() {
  pgrep -f "$PROJECT_ROOT/frontend/node_modules" 2>/dev/null || true
}

wait_for_url() {
  local url="$1"
  local seconds="$2"
  local label="$3"
  local log_file=""

  if [ "$label" = "Backend" ]; then
    log_file="$PROJECT_ROOT/logs/backendLogs/backend.log"
  elif [ "$label" = "Frontend" ]; then
    log_file="$PROJECT_ROOT/logs/frontendLogs/frontend.log"
  fi

  echo "⏳ Waiting for $label at $url (timeout: ${seconds}s)..."
  local elapsed=0
  while [ "$elapsed" -lt "$seconds" ]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "✓ $label is ready"
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done

  echo "⚠️  Warning: $label did not respond at $url within ${seconds}s."
  if [ -n "$log_file" ]; then
    echo "   Check log file: $log_file"
  else
    echo "   Check log files under $PROJECT_ROOT/logs/"
  fi
  return 0
}
