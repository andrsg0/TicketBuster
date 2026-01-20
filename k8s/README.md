# Kubernetes Manifests for TicketBuster

This directory contains Kubernetes manifests for deploying the TicketBuster microservices.

## Structure

```
k8s/
├── namespace.yaml          # Namespace definition
├── api-gateway/            # API Gateway deployment
├── catalog-service/        # Catalog service deployment
├── order-worker/           # Order worker deployment
├── notification-service/   # Notification service deployment
├── frontend/               # Frontend deployment
└── ingress/                # Ingress configuration
```

## Usage

```bash
# Apply namespace
kubectl apply -f namespace.yaml

# Deploy all services
kubectl apply -f api-gateway/
kubectl apply -f catalog-service/
kubectl apply -f order-worker/
kubectl apply -f notification-service/
kubectl apply -f frontend/
kubectl apply -f ingress/
```

## Notes

- All services will be deployed in the `ticketbuster` namespace
- Ingress configuration will depend on your cluster setup
- Remember to configure secrets and configmaps before deploying
