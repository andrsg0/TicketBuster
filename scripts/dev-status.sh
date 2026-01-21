#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME=${COMPOSE_PROJECT_NAME:-ticketbuster}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.dev.yml}
NETWORK=${1:-ticketbuster-network}
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"

export COMPOSE_PROJECT_NAME="$PROJECT_NAME"
cd "$ROOT_DIR"

echo "[+] Compose services status:"
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps

echo "[+] Network inspect ($NETWORK):"
docker network inspect "$NETWORK" | sed -n '1,120p'

echo "[+] Volumes:"
docker volume ls | grep -E 'ticketbuster_' || true
