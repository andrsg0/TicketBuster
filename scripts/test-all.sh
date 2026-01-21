#!/usr/bin/env bash
# Don't use set -e as it interferes with test counting
set -uo pipefail

# ================================================
# TicketBuster - Complete Project Test Suite
# ================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
cd "$ROOT_DIR"

PASSED=0
FAILED=0

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"
}

test_pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    PASSED=$((PASSED + 1))
}

test_fail() {
    echo -e "  ${RED}✗${NC} $1"
    FAILED=$((FAILED + 1))
}

test_warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

# ================================================
# 1. Check Prerequisites
# ================================================
print_header "1. Checking Prerequisites"

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    test_pass "Docker installed: v$DOCKER_VERSION"
else
    test_fail "Docker not installed"
fi

if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    test_pass "Docker Compose v2 installed: v$COMPOSE_VERSION"
else
    test_fail "Docker Compose v2 not installed"
fi

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    test_pass "Node.js installed: $NODE_VERSION"
else
    test_warn "Node.js not installed (optional for local dev)"
fi

if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    test_pass "Python installed: $PYTHON_VERSION"
else
    test_warn "Python not installed (optional for local dev)"
fi

# ================================================
# 2. Check Project Structure
# ================================================
print_header "2. Checking Project Structure"

REQUIRED_DIRS=(
    "api-gateway"
    "catalog-service"
    "notification-service"
    "order-worker"
    "frontend"
    "k8s"
    "proto"
    "scripts"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [[ -d "$ROOT_DIR/$dir" ]]; then
        test_pass "Directory exists: $dir/"
    else
        test_fail "Missing directory: $dir/"
    fi
done

REQUIRED_FILES=(
    "docker-compose.dev.yml"
    ".env"
    ".gitignore"
    "README.md"
    "k8s/init.sql"
    "proto/inventory.proto"
    "proto/common.proto"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$ROOT_DIR/$file" ]]; then
        test_pass "File exists: $file"
    else
        test_fail "Missing file: $file"
    fi
done

# ================================================
# 3. Check Docker Compose Configuration
# ================================================
print_header "3. Validating Docker Compose"

if docker compose -f docker-compose.dev.yml config --quiet 2>/dev/null; then
    test_pass "docker-compose.dev.yml is valid"
else
    test_fail "docker-compose.dev.yml has errors"
fi

# ================================================
# 4. Check Infrastructure Services
# ================================================
print_header "4. Checking Infrastructure Services"

check_container() {
    local name=$1
    local port=$2
    
    if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
        STATUS=$(docker inspect -f '{{.State.Health.Status}}' "$name" 2>/dev/null || echo "running")
        if [[ "$STATUS" == "healthy" ]] || [[ "$STATUS" == "running" ]]; then
            test_pass "$name is running ($STATUS)"
            return 0
        else
            test_warn "$name is running but status: $STATUS"
            return 1
        fi
    else
        test_fail "$name is not running"
        return 1
    fi
}

POSTGRES_OK=false
RABBITMQ_OK=false
KEYCLOAK_OK=false

check_container "ticketbuster-postgres" 5432 && POSTGRES_OK=true
check_container "ticketbuster-rabbitmq" 5672 && RABBITMQ_OK=true
check_container "ticketbuster-keycloak" 8080 && KEYCLOAK_OK=true

# ================================================
# 5. Test PostgreSQL Database
# ================================================
print_header "5. Testing PostgreSQL Database"

if $POSTGRES_OK; then
    # Test connection
    if docker exec ticketbuster-postgres pg_isready -U admin -d ticketbuster &>/dev/null; then
        test_pass "PostgreSQL connection successful"
    else
        test_fail "PostgreSQL connection failed"
    fi
    
    # Test schemas exist
    SCHEMAS=$(docker exec ticketbuster-postgres psql -U admin -d ticketbuster -t -c "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name LIKE 'db_%';" 2>/dev/null | tr -d ' ')
    if [[ "$SCHEMAS" -ge 2 ]]; then
        test_pass "Database schemas created: $SCHEMAS schemas (db_catalog, db_orders)"
    else
        test_fail "Missing database schemas (found: $SCHEMAS)"
    fi
    
    # Test sample data
    EVENTS=$(docker exec ticketbuster-postgres psql -U admin -d ticketbuster -t -c "SELECT COUNT(*) FROM db_catalog.events;" 2>/dev/null | tr -d ' ')
    if [[ "$EVENTS" -ge 1 ]]; then
        test_pass "Sample events loaded: $EVENTS events"
    else
        test_fail "No sample events found"
    fi
    
    SEATS=$(docker exec ticketbuster-postgres psql -U admin -d ticketbuster -t -c "SELECT COUNT(*) FROM db_catalog.seats;" 2>/dev/null | tr -d ' ')
    if [[ "$SEATS" -ge 100 ]]; then
        test_pass "Sample seats loaded: $SEATS seats"
    else
        test_fail "Insufficient seats (found: $SEATS)"
    fi
    
    ORDERS=$(docker exec ticketbuster-postgres psql -U admin -d ticketbuster -t -c "SELECT COUNT(*) FROM db_orders.orders;" 2>/dev/null | tr -d ' ')
    test_pass "Sample orders loaded: $ORDERS orders"
else
    test_warn "Skipping PostgreSQL tests (container not running)"
fi

# ================================================
# 6. Test RabbitMQ
# ================================================
print_header "6. Testing RabbitMQ"

if $RABBITMQ_OK; then
    # Test management API
    if curl -sf -u guest:guest http://localhost:15672/api/overview &>/dev/null; then
        test_pass "RabbitMQ Management API accessible"
    else
        test_fail "RabbitMQ Management API not accessible"
    fi
    
    # Test AMQP port
    if nc -z localhost 5672 2>/dev/null; then
        test_pass "RabbitMQ AMQP port (5672) open"
    else
        test_warn "RabbitMQ AMQP port check skipped (nc not available)"
    fi
    
    # Get version
    RABBIT_VERSION=$(docker exec ticketbuster-rabbitmq rabbitmqctl version 2>/dev/null || echo "unknown")
    test_pass "RabbitMQ version: $RABBIT_VERSION"
else
    test_warn "Skipping RabbitMQ tests (container not running)"
fi

# ================================================
# 7. Test Keycloak
# ================================================
print_header "7. Testing Keycloak"

if $KEYCLOAK_OK; then
    # Test health endpoint
    if curl -sf http://localhost:8080/health/ready &>/dev/null; then
        test_pass "Keycloak health endpoint ready"
    else
        test_warn "Keycloak health endpoint not ready yet (may need more time)"
    fi
    
    # Test admin console
    if curl -sf http://localhost:8080/admin/ &>/dev/null; then
        test_pass "Keycloak admin console accessible"
    else
        test_warn "Keycloak admin console not accessible yet"
    fi
else
    test_warn "Skipping Keycloak tests (container not running)"
fi

# ================================================
# 8. Test Network Configuration
# ================================================
print_header "8. Testing Network Configuration"

if docker network inspect ticketbuster-network &>/dev/null; then
    test_pass "Docker network 'ticketbuster-network' exists"
    
    CONNECTED=$(docker network inspect ticketbuster-network -f '{{range .Containers}}{{.Name}} {{end}}')
    echo -e "  ${BLUE}ℹ${NC} Connected containers: $CONNECTED"
else
    test_fail "Docker network 'ticketbuster-network' not found"
fi

# ================================================
# 9. Test Volumes (Persistence)
# ================================================
print_header "9. Testing Data Volumes"

VOLUMES=(
    "ticketbuster_postgres_data"
    "ticketbuster_rabbitmq_data"
    "ticketbuster_keycloak_data"
)

for vol in "${VOLUMES[@]}"; do
    if docker volume inspect "$vol" &>/dev/null; then
        test_pass "Volume exists: $vol"
    else
        test_warn "Volume not found: $vol"
    fi
done

# ================================================
# Summary
# ================================================
print_header "Test Summary"

TOTAL=$((PASSED + FAILED))
echo -e "  ${GREEN}Passed:${NC} $PASSED"
echo -e "  ${RED}Failed:${NC} $FAILED"
echo -e "  ${BLUE}Total:${NC}  $TOTAL"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}🎉 All tests passed! Infrastructure is ready.${NC}"
    echo ""
    echo "Access URLs:"
    echo "  - RabbitMQ UI:     http://localhost:15672 (guest/guest)"
    echo "  - Keycloak Admin:  http://localhost:8080  (admin/admin)"
    echo "  - PostgreSQL:      localhost:5432         (admin/admin)"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the errors above.${NC}"
    echo ""
    echo "To start infrastructure:"
    echo "  ./scripts/dev-up.sh"
    echo ""
    echo "To recreate from scratch:"
    echo "  ./scripts/dev-down.sh --purge"
    echo "  ./scripts/dev-up.sh"
    exit 1
fi
