#!/usr/bin/env bash
# ============================================================================
# TicketBuster - Kubernetes Deployment Script
# ============================================================================
# Este script despliega toda la infraestructura de TicketBuster en Kubernetes
# Uso: ./deploy.sh [--skip-tunnel] [--dry-run]
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$SCRIPT_DIR/k8s"
NAMESPACE="ticketbuster"

# Flags
SKIP_TUNNEL=false
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tunnel) SKIP_TUNNEL=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ============================================================================
# Helper Functions
# ============================================================================

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║              🎫 TicketBuster - K8s Deployment                  ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

kubectl_apply() {
    if [ "$DRY_RUN" = true ]; then
        kubectl apply -f "$1" --dry-run=client
    else
        kubectl apply -f "$1"
    fi
}

wait_for_pods() {
    local label=$1
    local timeout=${2:-120}
    
    log_info "Waiting for pods with label '$label' to be ready..."
    
    if ! kubectl wait --for=condition=ready pod \
        -l "$label" \
        -n "$NAMESPACE" \
        --timeout="${timeout}s" 2>/dev/null; then
        log_warn "Some pods may still be starting..."
    fi
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &>/dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &>/dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        log_info "Make sure your kubeconfig is set up correctly"
        exit 1
    fi
    
    # Check metrics-server (required for HPA)
    if ! kubectl get deployment metrics-server -n kube-system &>/dev/null; then
        log_warn "metrics-server not found - HPA may not work correctly"
        log_info "Install with: kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml"
    fi
    
    log_success "Prerequisites check passed"
}

# ============================================================================
# Cloudflare Tunnel Secret Setup
# ============================================================================

setup_tunnel_secret() {
    if [ "$SKIP_TUNNEL" = true ]; then
        log_info "Skipping Cloudflare tunnel setup"
        return
    fi
    
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}  Cloudflare Tunnel Configuration${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "To get your tunnel token:"
    echo "  1. Go to https://one.dash.cloudflare.com"
    echo "  2. Navigate to: Networks → Tunnels"
    echo "  3. Create a tunnel or select existing one"
    echo "  4. Copy the token from the install command"
    echo ""
    echo "Configure public hostnames in the tunnel:"
    echo "  • api.yourdomain.com  → http://api-gateway:8000"
    echo "  • yourdomain.com      → http://frontend:5173"
    echo ""
    
    # Check if secret already exists
    if kubectl get secret cloudflare-tunnel -n "$NAMESPACE" &>/dev/null; then
        read -p "Tunnel secret already exists. Update it? [y/N]: " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Keeping existing tunnel secret"
            return
        fi
    fi
    
    read -p "Enter Cloudflare Tunnel Token (or press Enter to skip): " -r TUNNEL_TOKEN
    
    if [ -z "$TUNNEL_TOKEN" ]; then
        log_warn "No tunnel token provided - skipping tunnel deployment"
        SKIP_TUNNEL=true
        return
    fi
    
    # Create the secret
    log_info "Creating Cloudflare tunnel secret..."
    
    if [ "$DRY_RUN" = true ]; then
        echo "Would create secret with token: ${TUNNEL_TOKEN:0:10}..."
    else
        kubectl create secret generic cloudflare-tunnel \
            --from-literal=TUNNEL_TOKEN="$TUNNEL_TOKEN" \
            --namespace="$NAMESPACE" \
            --dry-run=client -o yaml | kubectl apply -f -
    fi
    
    log_success "Tunnel secret created"
}

# ============================================================================
# Main Deployment
# ============================================================================

deploy() {
    print_banner
    check_prerequisites
    
    echo ""
    log_info "Starting deployment to namespace: $NAMESPACE"
    [ "$DRY_RUN" = true ] && log_warn "DRY RUN MODE - No changes will be applied"
    echo ""
    
    # 1. Create namespace
    log_info "Creating namespace..."
    kubectl_apply "$K8S_DIR/namespace.yaml"
    log_success "Namespace created"
    
    # 2. Setup Cloudflare tunnel secret
    setup_tunnel_secret
    
    # 3. Deploy infrastructure (PostgreSQL, RabbitMQ)
    log_info "Deploying infrastructure (PostgreSQL, RabbitMQ)..."
    kubectl_apply "$K8S_DIR/infrastructure.yaml"
    log_success "Infrastructure manifests applied"
    
    # Wait for infrastructure to be ready
    if [ "$DRY_RUN" = false ]; then
        wait_for_pods "app=postgres" 120
        wait_for_pods "app=rabbitmq" 120
    fi
    
    # 4. Deploy microservices
    log_info "Deploying microservices..."
    kubectl_apply "$K8S_DIR/services-deployment.yaml"
    log_success "Microservices manifests applied"
    
    # 5. Deploy Cloudflare tunnel
    if [ "$SKIP_TUNNEL" = false ]; then
        log_info "Deploying Cloudflare tunnel..."
        kubectl_apply "$K8S_DIR/tunnel.yaml"
        log_success "Tunnel manifest applied"
    fi
    
    # 6. Deploy HPA
    log_info "Deploying Horizontal Pod Autoscalers..."
    kubectl_apply "$K8S_DIR/hpa.yaml"
    log_success "HPA manifests applied"
    
    # 7. Wait for all services to be ready
    if [ "$DRY_RUN" = false ]; then
        echo ""
        log_info "Waiting for all pods to be ready..."
        
        wait_for_pods "tier=backend" 180
        wait_for_pods "tier=frontend" 120
        
        if [ "$SKIP_TUNNEL" = false ]; then
            wait_for_pods "app=cloudflared" 60
        fi
    fi
    
    # 8. Print summary
    print_summary
}

# ============================================================================
# Summary
# ============================================================================

print_summary() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}              🎉 Deployment Complete!${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        log_warn "This was a dry run - no resources were created"
        return
    fi
    
    echo -e "${YELLOW}Pod Status:${NC}"
    kubectl get pods -n "$NAMESPACE" -o wide
    
    echo ""
    echo -e "${YELLOW}Services:${NC}"
    kubectl get svc -n "$NAMESPACE"
    
    echo ""
    echo -e "${YELLOW}HPA Status:${NC}"
    kubectl get hpa -n "$NAMESPACE"
    
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Useful commands:"
    echo "  • View logs:     kubectl logs -f deployment/<name> -n $NAMESPACE"
    echo "  • Scale manual:  kubectl scale deployment/<name> --replicas=3 -n $NAMESPACE"
    echo "  • HPA status:    kubectl describe hpa -n $NAMESPACE"
    echo "  • Port forward:  kubectl port-forward svc/api-gateway 8000:8000 -n $NAMESPACE"
    echo ""
    
    if [ "$SKIP_TUNNEL" = false ]; then
        echo "Cloudflare Tunnel:"
        echo "  • Your services should now be accessible via your configured domains"
        echo "  • Check tunnel status at: https://one.dash.cloudflare.com"
    else
        echo "Local Access (port-forward):"
        echo "  kubectl port-forward svc/frontend 5173:5173 -n $NAMESPACE &"
        echo "  kubectl port-forward svc/api-gateway 8000:8000 -n $NAMESPACE &"
    fi
    echo ""
}

# ============================================================================
# Run
# ============================================================================

deploy
