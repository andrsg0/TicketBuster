#!/usr/bin/env bash
#═══════════════════════════════════════════════════════════════════════════════
# TicketBuster - Start Services in Separate Terminal Windows
# Works on: Linux (gnome-terminal, konsole, xterm), macOS (Terminal, iTerm2), 
#           Windows (Windows Terminal, PowerShell, Git Bash)
#═══════════════════════════════════════════════════════════════════════════════

set -u
set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
PROJECT_NAME=${COMPOSE_PROJECT_NAME:-ticketbuster}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.dev.yml}

#───────────────────────────────────────────────────────────────────────────────
# Detect OS and Terminal
#───────────────────────────────────────────────────────────────────────────────

detect_platform() {
    case "$(uname -s)" in
        Linux*)     PLATFORM="linux";;
        Darwin*)    PLATFORM="mac";;
        CYGWIN*|MINGW*|MSYS*) PLATFORM="windows";;
        *)          PLATFORM="unknown";;
    esac
    
    # Check for WSL
    if [[ -f /proc/version ]] && grep -qi microsoft /proc/version 2>/dev/null; then
        PLATFORM="wsl"
    fi
}

find_terminal() {
    case "$PLATFORM" in
        mac)
            if [[ -d "/Applications/iTerm.app" ]]; then
                TERMINAL="iterm"
            else
                TERMINAL="mac-terminal"
            fi
            ;;
        linux)
            if command -v gnome-terminal &>/dev/null; then
                TERMINAL="gnome-terminal"
            elif command -v konsole &>/dev/null; then
                TERMINAL="konsole"
            elif command -v xfce4-terminal &>/dev/null; then
                TERMINAL="xfce4-terminal"
            elif command -v xterm &>/dev/null; then
                TERMINAL="xterm"
            else
                TERMINAL="none"
            fi
            ;;
        windows|wsl)
            # Check for Windows Terminal first
            if command -v wt.exe &>/dev/null || [[ -f "/mnt/c/Users/$USER/AppData/Local/Microsoft/WindowsApps/wt.exe" ]]; then
                TERMINAL="windows-terminal"
            elif command -v powershell.exe &>/dev/null; then
                TERMINAL="powershell"
            else
                TERMINAL="cmd"
            fi
            ;;
        *)
            TERMINAL="none"
            ;;
    esac
}

#───────────────────────────────────────────────────────────────────────────────
# Open Terminal with Command
#───────────────────────────────────────────────────────────────────────────────

open_terminal() {
    local title="$1"
    local working_dir="$2"
    local command="$3"
    
    echo -e "${BLUE}[*]${NC} Starting: $title"
    
    case "$TERMINAL" in
        gnome-terminal)
            gnome-terminal --title="$title" --working-directory="$working_dir" -- bash -c "$command; exec bash" &
            ;;
        konsole)
            konsole --new-tab -p tabtitle="$title" --workdir "$working_dir" -e bash -c "$command; exec bash" &
            ;;
        xfce4-terminal)
            xfce4-terminal --title="$title" --working-directory="$working_dir" -e "bash -c '$command; exec bash'" &
            ;;
        xterm)
            xterm -T "$title" -e "cd '$working_dir' && $command; exec bash" &
            ;;
        mac-terminal)
            osascript <<EOF
tell application "Terminal"
    activate
    do script "cd '$working_dir' && echo '=== $title ===' && $command"
end tell
EOF
            ;;
        iterm)
            osascript <<EOF
tell application "iTerm"
    activate
    create window with default profile
    tell current session of current window
        write text "cd '$working_dir' && echo '=== $title ===' && $command"
    end tell
end tell
EOF
            ;;
        windows-terminal)
            # Convert path for Windows if running in WSL/Git Bash
            local win_dir="$working_dir"
            if [[ "$PLATFORM" == "wsl" ]]; then
                win_dir=$(wslpath -w "$working_dir" 2>/dev/null || echo "$working_dir")
            fi
            wt.exe new-tab --title "$title" -d "$win_dir" cmd /k "$command" 2>/dev/null &
            ;;
        powershell)
            local win_dir="$working_dir"
            if [[ "$PLATFORM" == "wsl" ]]; then
                win_dir=$(wslpath -w "$working_dir" 2>/dev/null || echo "$working_dir")
            fi
            powershell.exe -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Set-Location \"$win_dir\"; Write-Host \"=== $title ===\"; $command'" &
            ;;
        cmd)
            start cmd /k "cd /d $working_dir && echo === $title === && $command" &
            ;;
        none)
            echo -e "${YELLOW}[!]${NC} No terminal emulator found. Running in background..."
            cd "$working_dir"
            bash -c "$command" &
            ;;
    esac
    
    sleep 1
}

#───────────────────────────────────────────────────────────────────────────────
# Start Docker Infrastructure
#───────────────────────────────────────────────────────────────────────────────

start_docker() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    🎫 TicketBuster Dev                         ║"
    echo "║              Starting Services in Separate Windows             ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${YELLOW}[INFRA]${NC} Starting Docker containers..."
    cd "$ROOT_DIR"
    
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d postgres rabbitmq 2>/dev/null || \
    docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d postgres rabbitmq 2>/dev/null
    
    # Wait for PostgreSQL
    echo -e "${YELLOW}[INFRA]${NC} Waiting for PostgreSQL..."
    local attempts=0
    while [ $attempts -lt 20 ]; do
        if docker exec ${PROJECT_NAME}-postgres pg_isready -U admin 2>/dev/null; then
            echo -e "${GREEN}[OK]${NC} PostgreSQL ready"
            break
        fi
        sleep 2
        ((attempts++))
    done
    
    # Wait for RabbitMQ
    echo -e "${YELLOW}[INFRA]${NC} Waiting for RabbitMQ..."
    attempts=0
    while [ $attempts -lt 20 ]; do
        if curl -s -o /dev/null "http://localhost:15672" 2>/dev/null; then
            echo -e "${GREEN}[OK]${NC} RabbitMQ ready"
            break
        fi
        sleep 2
        ((attempts++))
    done
}

#───────────────────────────────────────────────────────────────────────────────
# Main
#───────────────────────────────────────────────────────────────────────────────

main() {
    detect_platform
    find_terminal
    
    echo -e "${BLUE}[INFO]${NC} Platform: $PLATFORM, Terminal: $TERMINAL"
    
    # Start Docker infrastructure
    start_docker
    
    echo ""
    echo -e "${YELLOW}[SERVICES]${NC} Opening terminal windows..."
    echo ""
    
    # Catalog Service (Port 3000)
    open_terminal "Catalog Service :3000" "$ROOT_DIR/catalog-service" "npm install 2>/dev/null; npm start"
    
    sleep 2
    
    # API Gateway (Port 8000)
    open_terminal "API Gateway :8000" "$ROOT_DIR/api-gateway" "npm install 2>/dev/null; npm start"
    
    # Notification Service (Port 4000)
    open_terminal "Notification Service :4000" "$ROOT_DIR/notification-service" "npm install 2>/dev/null; npm start"
    
    # Order Worker (Python)
    if [[ -f "$ROOT_DIR/order-worker/main.py" ]]; then
        if command -v python3 &>/dev/null; then
            open_terminal "Order Worker (Python)" "$ROOT_DIR/order-worker" "python3 main.py"
        elif command -v python &>/dev/null; then
            open_terminal "Order Worker (Python)" "$ROOT_DIR/order-worker" "python main.py"
        fi
    fi
    
    sleep 2
    
    # Frontend (Port 5173)
    open_terminal "Frontend :5173" "$ROOT_DIR/frontend" "npm install 2>/dev/null; npm run dev"
    
    # Summary
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                    🎉 Services Launching!                         ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Infrastructure:${NC}"
    echo "  📦 PostgreSQL:     localhost:5432"
    echo "  🐰 RabbitMQ:       localhost:5672"
    echo "  🐰 RabbitMQ UI:    http://localhost:15672 (guest/guest)"
    echo ""
    echo -e "${YELLOW}Microservices (each in separate window):${NC}"
    echo "  📚 Catalog:        http://localhost:3000"
    echo "  🚪 API Gateway:    http://localhost:8000"
    echo "  🔔 Notifications:  http://localhost:4000"
    echo "  ⚙️  Order Worker:   (background)"
    echo ""
    echo -e "${YELLOW}Frontend:${NC}"
    echo "  🌐 Web App:        http://localhost:5173"
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
}

main "$@"
