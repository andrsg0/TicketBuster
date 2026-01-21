#!/usr/bin/env bash
#═══════════════════════════════════════════════════════════════════════════════
# TicketBuster - Stop All Services
# Works on: Linux, macOS, Windows (Git Bash / WSL)
#═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
PROJECT_NAME=${COMPOSE_PROJECT_NAME:-ticketbuster}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.dev.yml}
PID_FILE="$ROOT_DIR/.service-pids"

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

kill_port() {
    local port=$1
    if command -v lsof &>/dev/null; then
        lsof -ti:$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    elif command -v fuser &>/dev/null; then
        fuser -k $port/tcp 2>/dev/null || true
    fi
}

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    🎫 TicketBuster                             ║"
echo "║              Stopping All Services...                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Stop services from PID file
if [[ -f "$PID_FILE" ]]; then
    log_info "Stopping microservices..."
    while IFS=: read -r name pid port; do
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
            log_success "Stopped $name (PID: $pid)"
        fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
fi

# Kill processes on known ports
log_info "Cleaning up ports..."
PORTS=(3000 4000 5173 5174 8000)
for port in "${PORTS[@]}"; do
    kill_port $port
done

# Stop Docker containers (optional - controlled by flag)
STOP_DOCKER=${STOP_DOCKER:-false}

if [[ "$STOP_DOCKER" == "true" ]] || [[ "${1:-}" == "--all" ]] || [[ "${1:-}" == "-a" ]]; then
    log_info "Stopping Docker containers..."
    cd "$ROOT_DIR"
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down 2>/dev/null || \
    docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down 2>/dev/null || true
    log_success "Docker containers stopped"
else
    log_warn "Docker containers (PostgreSQL, RabbitMQ) are still running."
    echo -e "    Run with ${YELLOW}--all${NC} or ${YELLOW}-a${NC} to stop everything including Docker."
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                    ✓ All Services Stopped                         ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo ""
