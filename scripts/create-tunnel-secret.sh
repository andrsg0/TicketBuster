#!/usr/bin/env bash
# ============================================================================
# Crear Cloudflare Tunnel Secret rápidamente
# Uso: ./scripts/create-tunnel-secret.sh <TOKEN>
# ============================================================================

set -e

NAMESPACE="ticketbuster"

if [ -z "$1" ]; then
    echo "Uso: $0 <CLOUDFLARE_TUNNEL_TOKEN>"
    echo ""
    echo "Ejemplo:"
    echo "  $0 eyJhIjoiYWJjMTIzNDU2Nzg5Li4uIg=="
    echo ""
    read -p "Pega el token aquí: " TOKEN
else
    TOKEN="$1"
fi

if [ -z "$TOKEN" ]; then
    echo "Error: Token vacío"
    exit 1
fi

echo "Creando namespace si no existe..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo "Creando secret cloudflare-tunnel..."
kubectl create secret generic cloudflare-tunnel \
    --from-literal=TUNNEL_TOKEN="$TOKEN" \
    --namespace="$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo "✅ Secret creado correctamente"
echo ""
echo "Ahora puedes aplicar el túnel:"
echo "  kubectl apply -f k8s/tunnel.yaml"
