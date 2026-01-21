#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME=${COMPOSE_PROJECT_NAME:-ticketbuster}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.dev.yml}
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  export $(grep -v '^#' "$ROOT_DIR/.env" | xargs)
fi

export COMPOSE_PROJECT_NAME="$PROJECT_NAME"

echo "[+] Starting infrastructure: project=$PROJECT_NAME compose=$COMPOSE_FILE"
cd "$ROOT_DIR"

docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d

echo "[+] Waiting for services to be healthy..."
SERVICES=(ticketbuster-postgres ticketbuster-rabbitmq ticketbuster-keycloak)
for svc in "${SERVICES[@]}"; do
  echo "  - checking $svc"
  for i in {1..30}; do
    status=$(docker inspect -f '{{.State.Health.Status}}' "$svc" 2>/dev/null || echo "unknown")
    if [[ "$status" == "healthy" ]]; then
      echo "    -> $svc is healthy"
      break
    fi
    sleep 3
  done
done

echo "[+] Current status:"
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps

cat <<EOF

Services are up.
- PostgreSQL: localhost:${POSTGRES_PORT:-5432}
- RabbitMQ UI: http://localhost:${RABBITMQ_MANAGEMENT_PORT:-15672}
- Keycloak: http://localhost:${KEYCLOAK_PORT:-8080}
EOF
