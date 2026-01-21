#!/usr/bin/env bash
# ============================================================================
# TicketBuster - Kubernetes Local Deployment (Sin Túnel)
# ============================================================================
# Despliega en K8s y configura port-forward para acceso local
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$SCRIPT_DIR/k8s"
NAMESPACE="ticketbuster"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }

print_banner() {
    echo -e "${CYAN}"
    echo "================================================================"
    echo "         TicketBuster - K8s Local Deployment"
    echo "         (Sin túnel - Acceso via port-forward)"
    echo "================================================================"
    echo -e "${NC}"
}

# Pre-flight checks
if ! command -v kubectl &>/dev/null; then
    echo -e "${RED}Error: kubectl no encontrado${NC}"
    exit 1
fi

if ! kubectl cluster-info &>/dev/null; then
    echo -e "${RED}Error: No se puede conectar al cluster K8s${NC}"
    exit 1
fi

print_banner

# 1. Namespace
log_info "Creando namespace..."
kubectl apply -f "$K8S_DIR/namespace.yaml"
log_success "Namespace creado"

# 2. Infrastructure
log_info "Desplegando infraestructura (PostgreSQL + RabbitMQ)..."
kubectl apply -f "$K8S_DIR/infrastructure.yaml"
log_success "Infraestructura aplicada"

log_info "Esperando a que PostgreSQL esté listo..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=120s 2>/dev/null || log_warn "PostgreSQL puede estar iniciando..."

log_info "Esperando a que RabbitMQ esté listo..."
kubectl wait --for=condition=ready pod -l app=rabbitmq -n $NAMESPACE --timeout=120s 2>/dev/null || log_warn "RabbitMQ puede estar iniciando..."

# 3. Services
log_info "Desplegando microservicios..."
kubectl apply -f "$K8S_DIR/services-deployment.yaml"
log_success "Microservicios aplicados"

# 4. HPA
log_info "Aplicando Horizontal Pod Autoscalers..."
kubectl apply -f "$K8S_DIR/hpa.yaml"
log_success "HPA configurado"

# 5. Wait for services
log_info "Esperando a que los servicios estén listos..."
sleep 5
kubectl wait --for=condition=ready pod -l tier=backend -n $NAMESPACE --timeout=180s 2>/dev/null || log_warn "Algunos pods pueden estar iniciando..."
kubectl wait --for=condition=ready pod -l tier=frontend -n $NAMESPACE --timeout=120s 2>/dev/null || log_warn "Frontend puede estar iniciando..."

# Summary
echo ""
echo -e "${CYAN}================================================================${NC}"
echo -e "${GREEN}              Deployment Completado!${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

echo -e "${YELLOW}Estado de Pods:${NC}"
kubectl get pods -n $NAMESPACE
echo ""

echo -e "${YELLOW}Para acceder localmente, ejecuta:${NC}"
echo ""
echo "  # Terminal 1 - Frontend"
echo "  kubectl port-forward svc/frontend 5173:5173 -n $NAMESPACE"
echo ""
echo "  # Terminal 2 - API Gateway"
echo "  kubectl port-forward svc/api-gateway 8000:8000 -n $NAMESPACE"
echo ""
echo "  # Terminal 3 - RabbitMQ Management (opcional)"
echo "  kubectl port-forward svc/rabbitmq 15672:15672 -n $NAMESPACE"
echo ""
echo -e "${GREEN}Luego abre: http://localhost:5173${NC}"
echo ""
echo -e "${CYAN}================================================================${NC}"
echo ""
echo "Comandos útiles:"
echo "  • Ver logs:      kubectl logs -f deployment/order-worker -n $NAMESPACE"
echo "  • Ver HPA:       kubectl get hpa -n $NAMESPACE"
echo "  • Escalar:       kubectl scale deployment/api-gateway --replicas=3 -n $NAMESPACE"
echo "  • Eliminar todo: kubectl delete namespace $NAMESPACE"
echo ""
