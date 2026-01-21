#!/usr/bin/env bash
set -euo pipefail

NETWORK=${1:-ticketbuster-network}
PROJECT_NAME=${COMPOSE_PROJECT_NAME:-ticketbuster}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.dev.yml}
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"

export COMPOSE_PROJECT_NAME="$PROJECT_NAME"
cd "$ROOT_DIR"

echo "[+] Stopping containers attached to network: $NETWORK"
docker ps --filter "network=$NETWORK" -q | xargs -r docker stop

echo "[+] Removing containers attached to network: $NETWORK"
docker ps -a --filter "network=$NETWORK" -q | xargs -r docker rm

echo "[+] Removing network: $NETWORK"
docker network rm "$NETWORK" || echo "[i] Network already removed or not present"

echo "[+] Starting infrastructure and recreating network"
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d

echo "[+] Network info:"
docker network inspect "$NETWORK" | sed -n '1,80p'
