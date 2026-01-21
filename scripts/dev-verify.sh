#!/usr/bin/env bash
set -euo pipefail

POSTGRES_CONTAINER=${POSTGRES_CONTAINER:-ticketbuster-postgres}
RABBITMQ_CONTAINER=${RABBITMQ_CONTAINER:-ticketbuster-rabbitmq}
KEYCLOAK_CONTAINER=${KEYCLOAK_CONTAINER:-ticketbuster-keycloak}

echo "[+] Verifying PostgreSQL initial data..."
docker exec -it "$POSTGRES_CONTAINER" psql -U admin -d ticketbuster -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'db_%';"
docker exec -it "$POSTGRES_CONTAINER" psql -U admin -d ticketbuster -c "SELECT id, title, date, price, total_seats FROM db_catalog.events ORDER BY id LIMIT 5;"
docker exec -it "$POSTGRES_CONTAINER" psql -U admin -d ticketbuster -c "SELECT COUNT(*) AS seats_total FROM db_catalog.seats;"
docker exec -it "$POSTGRES_CONTAINER" psql -U admin -d ticketbuster -c "SELECT order_uuid, user_id, status FROM db_orders.orders ORDER BY id LIMIT 5;"

echo "[+] Verifying RabbitMQ diagnostics..."
docker exec -it "$RABBITMQ_CONTAINER" rabbitmq-diagnostics -q ping

echo "[+] Verifying Keycloak health..."
docker exec -it "$KEYCLOAK_CONTAINER" curl -sf http://localhost:8080/health/ready && echo "Keycloak is ready"

cat <<EOF

Done. You can also open:
- RabbitMQ UI: http://localhost:15672
- Keycloak Admin: http://localhost:8080
EOF
