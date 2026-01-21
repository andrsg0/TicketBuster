#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME=${COMPOSE_PROJECT_NAME:-ticketbuster}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.dev.yml}
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"

export COMPOSE_PROJECT_NAME="$PROJECT_NAME"
cd "$ROOT_DIR"

PURGE=${1:-}
if [[ "$PURGE" == "--purge" ]]; then
  echo "[!] Stopping and removing volumes (data will be deleted)"
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down -v
else
  echo "[+] Stopping services (data preserved)"
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down
fi
