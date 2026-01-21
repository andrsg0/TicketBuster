#!/usr/bin/env bash
#═══════════════════════════════════════════════════════════════════════════════
# TicketBuster - Start All Services
# Works on: Linux, macOS, Windows (Git Bash / WSL)
#═══════════════════════════════════════════════════════════════════════════════

# Don't exit on error - we'll handle errors manually
set -u  # Exit on undefined variables
set +e  # Don't exit on errors (we handle them)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project configuration
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
PROJECT_NAME=${COMPOSE_PROJECT_NAME:-ticketbuster}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.dev.yml}
LOG_DIR="$ROOT_DIR/logs"

# Service ports
POSTGRES_PORT=${POSTGRES_PORT:-15433}
RABBITMQ_PORT=${RABBITMQ_PORT:-5672}
RABBITMQ_UI_PORT=${RABBITMQ_MANAGEMENT_PORT:-15672}
CATALOG_PORT=3000
API_GATEWAY_PORT=8000
NOTIFICATION_PORT=4000
FRONTEND_PORT=5173

# PID file to track background processes
PID_FILE="$ROOT_DIR/.service-pids"

#───────────────────────────────────────────────────────────────────────────────
# Utility Functions
#───────────────────────────────────────────────────────────────────────────────

print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    🎫 TicketBuster                             ║"
    echo "║              Starting All Services...                          ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed or not in PATH"
        return 1
    fi
    return 0
}

wait_for_port() {
    local port=$1
    local name=$2
    local max_attempts=${3:-30}
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        # Try curl first (works on most systems)
        if curl -s --connect-timeout 1 "http://localhost:$port" >/dev/null 2>&1; then
            return 0
        fi
        # Try nc if available
        if command -v nc &>/dev/null && nc -z localhost "$port" 2>/dev/null; then
            return 0
        fi
        sleep 1
        ((attempt++)) || true
    done
    return 1
}

kill_port() {
    local port=$1
    if command -v lsof &>/dev/null; then
        lsof -ti:$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    elif command -v netstat &>/dev/null; then
        # Windows Git Bash fallback
        netstat -ano 2>/dev/null | grep ":$port " | awk '{print $5}' | xargs -r taskkill //F //PID 2>/dev/null || true
    fi
}

#───────────────────────────────────────────────────────────────────────────────
# Prerequisite Checks
#───────────────────────────────────────────────────────────────────────────────

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing=0
    
    check_command "docker" || missing=1
    check_command "node" || missing=1
    check_command "npm" || missing=1
    
    # Check Docker is running
    if ! docker info &>/dev/null; then
        log_error "Docker daemon is not running. Please start Docker."
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        log_error "Missing prerequisites. Please install them and try again."
        exit 1
    fi
    
    log_success "All prerequisites met"
}

#───────────────────────────────────────────────────────────────────────────────
# Infrastructure (Docker)
#───────────────────────────────────────────────────────────────────────────────

start_infrastructure() {
    log_info "Starting infrastructure (PostgreSQL, RabbitMQ)..."
    
    cd "$ROOT_DIR"
    
    # Load only Docker Compose variables from .env (not DB connection vars)
    if [[ -f "$ROOT_DIR/.env" ]]; then
        set +e
        # Only export POSTGRES_*, RABBITMQ_*, COMPOSE_* variables for Docker
        export $(grep -E '^(POSTGRES_|RABBITMQ_|COMPOSE_|KEYCLOAK_)' "$ROOT_DIR/.env" | xargs) 2>/dev/null
        set -e
    fi
    
    # Start Docker containers
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d postgres rabbitmq 2>/dev/null || \
    docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d postgres rabbitmq 2>/dev/null || true
    
    # Wait for PostgreSQL
    log_info "Waiting for PostgreSQL to be ready..."
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if docker exec ${PROJECT_NAME}-postgres pg_isready -U admin 2>/dev/null; then
            log_success "PostgreSQL is ready"
            break
        fi
        sleep 2
        ((attempts++)) || true
    done
    
    # Wait for RabbitMQ - using simple port check instead of rabbitmq-diagnostics
    log_info "Waiting for RabbitMQ to be ready..."
    attempts=0
    while [ $attempts -lt 30 ]; do
        # Check if RabbitMQ management port is responding
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${RABBITMQ_UI_PORT}" 2>/dev/null | grep -q "200\|401"; then
            log_success "RabbitMQ is ready"
            break
        fi
        # Fallback: check container health status
        local health=$(docker inspect -f '{{.State.Health.Status}}' "${PROJECT_NAME}-rabbitmq" 2>/dev/null || echo "unknown")
        if [[ "$health" == "healthy" ]]; then
            log_success "RabbitMQ is ready (healthy)"
            break
        fi
        sleep 2
        ((attempts++)) || true
    done
}

#───────────────────────────────────────────────────────────────────────────────
# Microservices
#───────────────────────────────────────────────────────────────────────────────

install_dependencies() {
    local service_dir=$1
    local service_name=$2
    
    if [[ -f "$service_dir/package.json" ]]; then
        if [[ ! -d "$service_dir/node_modules" ]]; then
            log_info "Installing dependencies for $service_name..."
            cd "$service_dir"
            npm install --silent
        fi
    elif [[ -f "$service_dir/requirements.txt" ]]; then
        log_info "Python dependencies should be installed via pip for $service_name"
    fi
}

start_service() {
    local service_dir=$1
    local service_name=$2
    local port=$3
    local start_cmd=${4:-"npm start"}
    
    log_info "Starting $service_name on port $port..."
    
    cd "$service_dir"
    
    # Install dependencies if needed
    if [[ -f "package.json" ]] && [[ ! -d "node_modules" ]]; then
        log_info "Installing dependencies for $service_name..."
        npm install --silent 2>/dev/null || npm install
    fi
    
    # Create logs directory
    mkdir -p "$LOG_DIR"
    
    # Start the service in background
    # Use different approach for Windows Git Bash
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "mingw"* ]] || [[ -n "${WINDIR:-}" ]]; then
        # Windows Git Bash - use cmd start
        $start_cmd > "$LOG_DIR/${service_name}.log" 2>&1 &
    else
        # Linux/Mac
        nohup $start_cmd > "$LOG_DIR/${service_name}.log" 2>&1 &
    fi
    
    local pid=$!
    echo "$service_name:$pid:$port" >> "$PID_FILE"
    
    # Wait for service to be ready
    sleep 3
    if wait_for_port $port "$service_name" 10; then
        log_success "$service_name started (PID: $pid)"
    else
        log_warn "$service_name may still be starting... check logs at $LOG_DIR/${service_name}.log"
    fi
}

start_all_services() {
    # Clear PID file
    > "$PID_FILE"
    
    # Install dependencies if needed
    log_info "Checking dependencies..."
    install_dependencies "$ROOT_DIR/catalog-service" "catalog-service"
    install_dependencies "$ROOT_DIR/api-gateway" "api-gateway"
    install_dependencies "$ROOT_DIR/notification-service" "notification-service"
    install_dependencies "$ROOT_DIR/frontend" "frontend"
    
    # Start Catalog Service
    start_service "$ROOT_DIR/catalog-service" "catalog-service" $CATALOG_PORT "npm start"
    
    # Start API Gateway
    start_service "$ROOT_DIR/api-gateway" "api-gateway" $API_GATEWAY_PORT "npm start"
    
    # Start Notification Service
    start_service "$ROOT_DIR/notification-service" "notification-service" $NOTIFICATION_PORT "npm start"
    
    # Start Order Worker (Python) - optional, may need virtual env
    if [[ -f "$ROOT_DIR/order-worker/main.py" ]]; then
        if command -v python3 &>/dev/null; then
            log_info "Starting order-worker..."
            cd "$ROOT_DIR/order-worker"
            nohup python3 main.py > "$LOG_DIR/order-worker.log" 2>&1 &
            echo "order-worker:$!:N/A" >> "$PID_FILE"
            log_success "order-worker started"
        else
            log_warn "Python3 not found, skipping order-worker"
        fi
    fi
    
    # Start Frontend (Vite dev server)
    start_service "$ROOT_DIR/frontend" "frontend" $FRONTEND_PORT "npm run dev"
}

#───────────────────────────────────────────────────────────────────────────────
# Status & Summary
#───────────────────────────────────────────────────────────────────────────────

print_status() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                    🎉 All Services Started!                       ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Infrastructure:${NC}"
    echo -e "  📦 PostgreSQL:     localhost:${POSTGRES_PORT}"
    echo -e "  🐰 RabbitMQ:       localhost:${RABBITMQ_PORT}"
    echo -e "  🐰 RabbitMQ UI:    http://localhost:${RABBITMQ_UI_PORT} (guest/guest)"
    echo ""
    echo -e "${YELLOW}Microservices:${NC}"
    echo -e "  📚 Catalog:        http://localhost:${CATALOG_PORT}"
    echo -e "  🚪 API Gateway:    http://localhost:${API_GATEWAY_PORT}"
    echo -e "  🔔 Notifications:  http://localhost:${NOTIFICATION_PORT}"
    echo ""
    echo -e "${YELLOW}Frontend:${NC}"
    echo -e "  🌐 Web App:        http://localhost:${FRONTEND_PORT}"
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "📋 Logs available at: ${LOG_DIR}/"
    echo -e "🛑 To stop all services run: ${YELLOW}./scripts/stop-all.sh${NC}"
    echo ""
}

#───────────────────────────────────────────────────────────────────────────────
# Main
#───────────────────────────────────────────────────────────────────────────────

main() {
    print_banner
    check_prerequisites
    start_infrastructure
    start_all_services
    print_status
}

main "$@"
