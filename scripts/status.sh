#!/usr/bin/env bash
#═══════════════════════════════════════════════════════════════════════════════
# TicketBuster - Service Status
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

check_port() {
    local port=$1
    local name=$2
    
    if nc -z localhost "$port" 2>/dev/null || \
       (command -v curl &>/dev/null && curl -s --connect-timeout 1 "http://localhost:$port" >/dev/null 2>&1); then
        echo -e "  ${GREEN}●${NC} $name (port $port) - ${GREEN}Running${NC}"
        return 0
    else
        echo -e "  ${RED}○${NC} $name (port $port) - ${RED}Stopped${NC}"
        return 1
    fi
}

check_docker_container() {
    local container=$1
    local name=$2
    
    local status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "not found")
    local health=$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo "N/A")
    
    if [[ "$status" == "running" ]]; then
        if [[ "$health" == "healthy" ]]; then
            echo -e "  ${GREEN}●${NC} $name - ${GREEN}Running (healthy)${NC}"
        else
            echo -e "  ${YELLOW}●${NC} $name - ${YELLOW}Running ($health)${NC}"
        fi
        return 0
    else
        echo -e "  ${RED}○${NC} $name - ${RED}$status${NC}"
        return 1
    fi
}

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    🎫 TicketBuster Status                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}Infrastructure (Docker):${NC}"
check_docker_container "${PROJECT_NAME}-postgres" "PostgreSQL"
check_docker_container "${PROJECT_NAME}-rabbitmq" "RabbitMQ"

echo ""
echo -e "${YELLOW}Microservices:${NC}"
check_port 3000 "Catalog Service"
check_port 8000 "API Gateway"
check_port 4000 "Notification Service"

echo ""
echo -e "${YELLOW}Frontend:${NC}"
check_port 5173 "Vite Dev Server" || check_port 5174 "Vite Dev Server (alt port)"

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"

# Quick health check
echo ""
echo -e "${YELLOW}API Health Check:${NC}"
if curl -s http://localhost:8000/health >/dev/null 2>&1; then
    echo -e "  ${GREEN}●${NC} API Gateway: $(curl -s http://localhost:8000/health 2>/dev/null | head -c 100)"
fi

if curl -s http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "  ${GREEN}●${NC} Catalog Service: $(curl -s http://localhost:3000/health 2>/dev/null | head -c 100)"
fi

echo ""
