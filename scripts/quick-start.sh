#!/usr/bin/env bash
#═══════════════════════════════════════════════════════════════════════════════
# TicketBuster - Quick Start (Simplified)
# A simpler version that starts services in the foreground with tmux/screen
# Works on: Linux, macOS, Windows (Git Bash / WSL)
#═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
PROJECT_NAME=${COMPOSE_PROJECT_NAME:-ticketbuster}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.dev.yml}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🎫 TicketBuster - Quick Start${NC}"
echo ""

# Load env
if [[ -f "$ROOT_DIR/.env" ]]; then
    export $(grep -v '^#' "$ROOT_DIR/.env" | xargs) 2>/dev/null || true
fi

# Step 1: Start Docker infrastructure
echo -e "${YELLOW}[1/5]${NC} Starting Docker infrastructure..."
cd "$ROOT_DIR"
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d postgres rabbitmq 2>/dev/null || \
docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d postgres rabbitmq

# Wait for PostgreSQL
echo -e "${YELLOW}[2/5]${NC} Waiting for PostgreSQL..."
until docker exec ${PROJECT_NAME}-postgres pg_isready -U admin &>/dev/null; do
    sleep 1
done
echo -e "${GREEN}✓${NC} PostgreSQL ready"

# Wait for RabbitMQ
echo -e "${YELLOW}[3/5]${NC} Waiting for RabbitMQ..."
until docker exec ${PROJECT_NAME}-rabbitmq rabbitmq-diagnostics -q ping &>/dev/null; do
    sleep 1
done
echo -e "${GREEN}✓${NC} RabbitMQ ready"

# Start services
echo -e "${YELLOW}[4/5]${NC} Starting microservices..."

# Check if we're in a terminal multiplexer
if command -v tmux &>/dev/null && [[ -z "${TMUX:-}" ]]; then
    # Use tmux
    tmux new-session -d -s ticketbuster -n services
    tmux send-keys -t ticketbuster "cd '$ROOT_DIR/catalog-service' && npm start" Enter
    tmux split-window -h -t ticketbuster
    tmux send-keys -t ticketbuster "cd '$ROOT_DIR/api-gateway' && npm start" Enter
    tmux split-window -v -t ticketbuster
    tmux send-keys -t ticketbuster "cd '$ROOT_DIR/notification-service' && npm start" Enter
    tmux select-pane -t 0
    tmux split-window -v -t ticketbuster
    tmux send-keys -t ticketbuster "cd '$ROOT_DIR/frontend' && npm run dev" Enter
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Services started in tmux session 'ticketbuster'${NC}"
    echo -e "Run: ${CYAN}tmux attach -t ticketbuster${NC} to view logs"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
else
    # Without tmux - start in background
    mkdir -p "$ROOT_DIR/logs"
    
    cd "$ROOT_DIR/catalog-service"
    [[ ! -d node_modules ]] && npm install --silent
    nohup npm start > "$ROOT_DIR/logs/catalog.log" 2>&1 &
    
    cd "$ROOT_DIR/api-gateway"
    [[ ! -d node_modules ]] && npm install --silent
    nohup npm start > "$ROOT_DIR/logs/api-gateway.log" 2>&1 &
    
    cd "$ROOT_DIR/notification-service"
    [[ ! -d node_modules ]] && npm install --silent
    nohup npm start > "$ROOT_DIR/logs/notification.log" 2>&1 &
    
    sleep 3
    
    echo -e "${YELLOW}[5/5]${NC} Starting frontend..."
    cd "$ROOT_DIR/frontend"
    [[ ! -d node_modules ]] && npm install --silent
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Backend services started in background${NC}"
    echo ""
    echo "  📚 Catalog:      http://localhost:3000"
    echo "  🚪 API Gateway:  http://localhost:8000"
    echo "  🔔 Notifications: http://localhost:4000"
    echo ""
    echo -e "Logs: ${CYAN}$ROOT_DIR/logs/${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}Starting frontend (Ctrl+C to stop)...${NC}"
    echo ""
    
    # Start frontend in foreground
    npm run dev
fi
