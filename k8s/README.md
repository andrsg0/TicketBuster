# TicketBuster - Kubernetes Deployment Guide

Guía completa para desplegar TicketBuster en Kubernetes (Docker Desktop, EKS, GKE, etc).

## 🎯 Descripción General

TicketBuster se despliega como conjunto de microservicios en Kubernetes con:

- **Frontend PWA**: React 19 + Vite
- **API Gateway**: Express (port 8000)
- **Catalog Service**: Node.js + gRPC (port 3000)
- **Order Worker**: Python (port 5000)
- **Notification Service**: Node.js + Socket.io (port 4000)
- **PostgreSQL**: Base de datos principal (port 5432)
- **RabbitMQ**: Message broker (port 5672, admin 15672)

**Total: 11 pods** en despliegue por defecto

## 📁 Estructura de Archivos

```
k8s/
├── namespace.yaml          # Namespace: ticketbuster
├── services-deployment.yaml # Todos los microservicios (frontend, gateways, workers)
├── init.sql               # Inicialización de PostgreSQL
├── add_events.sql         # 14 eventos adicionales (20 total)
├── RABBITMQ_SCHEMA.md     # Documentación de colas
├── README.md              # Este archivo
└── examples/
    ├── order-create-message.json
    ├── order-completed-message.json
    └── order-failed-message.json
```

## 🚀 Deployment Rápido

### Opción 1: Docker Desktop K8s (Recomendado para desarrollo)

```bash
# Verificar que K8s está habilitado
docker version   # Debe mostrar versión de Docker

# Crear namespace
kubectl create namespace ticketbuster

# Aplicar manifests
kubectl apply -f k8s/services-deployment.yaml -n ticketbuster

# Verificar pods
kubectl get pods -n ticketbuster
# Esperar a que todos sean Running/Ready

# Port-forward para acceder localmente
kubectl port-forward -n ticketbuster svc/frontend 5173:5173 &
kubectl port-forward -n ticketbuster svc/api-gateway 8000:8000 &
kubectl port-forward -n ticketbuster svc/notification-service 4000:4000 &
kubectl port-forward -n ticketbuster svc/rabbitmq 15672:15672 &

# Frontend: http://localhost:5173
# API Gateway: http://localhost:8000/api
# RabbitMQ Admin: http://localhost:15672 (guest/guest)
```

### Opción 2: EKS (AWS Elastic Kubernetes Service)

```bash
# Crear cluster EKS
eksctl create cluster \
  --name ticketbuster \
  --region us-east-1 \
  --nodes 3 \
  --node-type t3.medium

# Verificar contexto
kubectl config current-context
# Debe ser: <user@ticketbuster.us-east-1.eks.amazonaws.com>

# Crear namespace
kubectl create namespace ticketbuster

# Aplicar manifests
kubectl apply -f k8s/services-deployment.yaml -n ticketbuster

# Crear load balancer público
kubectl patch svc frontend -n ticketbuster -p '{"spec":{"type":"LoadBalancer"}}'

# Obtener IP pública (tardará 2-3 minutos)
kubectl get svc frontend -n ticketbuster
# Acceso vía Load Balancer URL
```

### Opción 3: GKE (Google Kubernetes Engine)

```bash
# Crear cluster GKE
gcloud container clusters create ticketbuster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-1

# Obtener credenciales
gcloud container clusters get-credentials ticketbuster --zone us-central1-a

# Crear namespace y desplegar
kubectl create namespace ticketbuster
kubectl apply -f k8s/services-deployment.yaml -n ticketbuster

# IP pública se asigna automáticamente al frontend (LoadBalancer)
kubectl get svc frontend -n ticketbuster
```

## 📊 Arquitectura Kubernetes

```
┌─────────────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                        │
│                  (Docker Desktop / EKS / GKE)               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Namespace: ticketbuster                      │  │
│  │                                                      │  │
│  │  Pods (Stateless - Replicas):                       │  │
│  │  ├─ frontend (2 replicas)                          │  │
│  │  ├─ api-gateway (2 replicas)                       │  │
│  │  ├─ catalog-service (2 replicas)                  │  │
│  │  ├─ notification-service (2 replicas)            │  │
│  │  └─ order-worker (1 replica)                      │  │
│  │                                                      │  │
│  │  Pods (Stateful):                                  │  │
│  │  ├─ postgres (1 replica) - Persistent Volume     │  │
│  │  └─ rabbitmq (1 replica) - Persistent Volume     │  │
│  │                                                      │  │
│  │  Services:                                          │  │
│  │  ├─ frontend (LoadBalancer) → 5173               │  │
│  │  ├─ api-gateway (ClusterIP) → 8000               │  │
│  │  ├─ catalog-service (ClusterIP) → 3000           │  │
│  │  ├─ notification-service (ClusterIP) → 4000      │  │
│  │  ├─ order-worker (ClusterIP) → 5000              │  │
│  │  ├─ postgres (ClusterIP) → 5432                  │  │
│  │  └─ rabbitmq (ClusterIP) → 5672, (UI) → 15672   │  │
│  │                                                      │  │
│  │  ConfigMaps & Secrets:                             │  │
│  │  ├─ db-credentials (Secret)                       │  │
│  │  ├─ rabbitmq-credentials (Secret)                │  │
│  │  └─ app-config (ConfigMap)                       │  │
│  │                                                      │  │
│  │  Persistent Volumes:                               │  │
│  │  ├─ postgres-pvc (20GB)                           │  │
│  │  └─ rabbitmq-pvc (5GB)                            │  │
│  │                                                      │  │
│  │  HPA (Horizontal Pod Autoscaler):                 │  │
│  │  └─ order-worker (scales: 1-5 based on CPU)      │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      Ingress (Opcional - HTTPS público)            │  │
│  │      nginx-ingress / aws-alb / gke-gce             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Configuración Manual

### Paso 1: Crear Namespace

```bash
kubectl create namespace ticketbuster
```

### Paso 2: Crear Secrets para Credenciales

```bash
# PostgreSQL
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password=admin \
  -n ticketbuster

# RabbitMQ
kubectl create secret generic rabbitmq-credentials \
  --from-literal=username=guest \
  --from-literal=password=guest \
  -n ticketbuster
```

### Paso 3: Aplicar Manifests

```bash
# Aplicar todo en orden
kubectl apply -f k8s/services-deployment.yaml -n ticketbuster

# Verificar estado
kubectl get pods -n ticketbuster
kubectl get svc -n ticketbuster
kubectl get pvc -n ticketbuster
```

### Paso 4: Inicializar Base de Datos

```bash
# Copiar script de inicialización al pod postgres
kubectl cp k8s/init.sql ticketbuster/postgres-0:/tmp/init.sql

# Ejecutar script
kubectl exec -it ticketbuster/postgres-0 -- \
  psql -U admin -d ticketbuster -f /tmp/init.sql

# Verificar tablas creadas
kubectl exec -it ticketbuster/postgres-0 -- \
  psql -U admin -d ticketbuster -c "SELECT schema_name FROM information_schema.schemata"

# Copiar y ejecutar eventos adicionales
kubectl cp k8s/add_events.sql ticketbuster/postgres-0:/tmp/add_events.sql
kubectl exec -it ticketbuster/postgres-0 -- \
  psql -U admin -d ticketbuster -f /tmp/add_events.sql
```

### Paso 5: Port-Forward o Ingress

**Opción A: Port-Forward (desarrollo)**

```bash
# Frontend
kubectl port-forward -n ticketbuster svc/frontend 5173:5173 &

# API Gateway
kubectl port-forward -n ticketbuster svc/api-gateway 8000:8000 &

# RabbitMQ Admin
kubectl port-forward -n ticketbuster svc/rabbitmq 15672:15672 &

# Acceder
# http://localhost:5173 → Frontend
# http://localhost:8000/api → API Gateway
# http://localhost:15672 → RabbitMQ (guest/guest)
```

**Opción B: LoadBalancer (producción)**

```bash
# El frontend ya está configurado como LoadBalancer
kubectl get svc frontend -n ticketbuster
# Obtener EXTERNAL-IP (tardará unos segundos en asignarse)

# Acceder vía <EXTERNAL-IP>:5173
```

## 📊 Monitoreo

### Verificar Logs de Pods

```bash
# Logs de un servicio específico
kubectl logs -n ticketbuster -l app=frontend --tail=50

# Logs en tiempo real
kubectl logs -n ticketbuster -l app=catalog-service -f

# Logs de múltiples pods
kubectl logs -n ticketbuster -l app=api-gateway --all-containers

# Logs de errores
kubectl logs -n ticketbuster pod/order-worker-xyz --previous
```

### Monitoreo de Recursos

```bash
# CPU y memoria en tiempo real
kubectl top pods -n ticketbuster

# Nodos
kubectl top nodes

# Watch pods
kubectl get pods -n ticketbuster --watch
```

### Health Checks

```bash
# Verificar estado de servicios
curl http://localhost:8000/health     # API Gateway
curl http://localhost:3000/health     # Catalog Service
curl http://localhost:4000/health     # Notification Service
curl http://localhost:5000/health     # Order Worker

# Verificar conectividad inter-pods (desde adentro del cluster)
kubectl exec -it -n ticketbuster deployment/api-gateway -- \
  wget -qO- http://catalog-service:3000/health
```

## 🔄 Actualizar Aplicación

```bash
# 1. Compilar nueva imagen Docker
cd api-gateway
docker build -t ticketbuster/api-gateway:v2 .
docker tag ticketbuster/api-gateway:v2 ticketbuster/api-gateway:latest

# 2. Actualizar deployment
kubectl set image deployment/api-gateway \
  api-gateway=ticketbuster/api-gateway:v2 \
  -n ticketbuster

# 3. Monitorear rollout
kubectl rollout status deployment/api-gateway -n ticketbuster

# 4. Revertir si algo sale mal
kubectl rollout undo deployment/api-gateway -n ticketbuster
```

## 🔀 Escalado Automático

HPA (Horizontal Pod Autoscaler) está configurado para order-worker:

```bash
# Ver estado del HPA
kubectl get hpa -n ticketbuster

# Editar límites de escalado
kubectl edit hpa order-worker -n ticketbuster

# Generar carga de prueba
kubectl run -n ticketbuster -it --rm load-gen --image=busybox -- \
  /bin/sh -c "while true; do wget -q -O- http://order-worker:5000/health; done"
```

## 🗑️ Limpieza

```bash
# Eliminar todo el namespace
kubectl delete namespace ticketbuster

# O eliminar recursos específicos
kubectl delete deployment frontend -n ticketbuster
kubectl delete service rabbitmq -n ticketbuster
kubectl delete pvc postgres-pvc -n ticketbuster
```

## 📚 Documentación Relacionada

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Desktop K8s Guide](https://docs.docker.com/desktop/kubernetes/)
- [AWS EKS User Guide](https://docs.aws.amazon.com/eks/latest/userguide/)
- [Google GKE Quickstart](https://cloud.google.com/kubernetes-engine/docs/quickstart)
- [Kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

## 🔗 Enlaces Útiles

- **Local Development**: `http://localhost:5173`
- **API Endpoint**: `http://localhost:8000/api`
- **RabbitMQ Admin**: `http://localhost:15672` (guest/guest)
- **PostgreSQL**: `postgresql://admin:admin@localhost:5432/ticketbuster`

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0  
**Estado:** Producción ✅

| Public Hostname | Service | Path |
|-----------------|---------|------|
| `api.tudominio.com` | `http://api-gateway:8000` | `/*` |
| `tudominio.com` | `http://frontend:5173` | `/*` |

## 📊 Resource Limits

### Servicios Node.js (Frontend, API Gateway, Catalog, Notification)

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

### Order Worker (Python) - Sin CPU Limit

```yaml
resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    # ⚠️ SIN CPU LIMIT - Permite bursting para HPA
    memory: 1Gi
```

**¿Por qué sin CPU limit?**
- El Order Worker genera QR codes, operación CPU-intensiva
- Sin limit, puede hacer "burst" y usar más CPU temporalmente
- El HPA detecta este uso elevado y escala automáticamente
- Con CPU limit, el pod se throttlea y el HPA no detecta la necesidad de escalar

## 📈 Horizontal Pod Autoscaler (HPA)

### Order Worker HPA

```yaml
minReplicas: 1
maxReplicas: 10
metrics:
  - cpu: 50% average utilization
```

**Comportamiento:**
- **Scale Up:** Rápido (30s estabilización, puede duplicar pods)
- **Scale Down:** Lento (5min estabilización, reduce 50% máximo)

### Ver estado del HPA

```bash
# Estado actual
kubectl get hpa -n ticketbuster

# Detalle completo
kubectl describe hpa order-worker-hpa -n ticketbuster

# Watch en tiempo real
kubectl get hpa -n ticketbuster -w
```

## 🔧 Comandos Útiles

### Monitoreo

```bash
# Ver todos los pods
kubectl get pods -n ticketbuster -o wide

# Ver logs de un servicio
kubectl logs -f deployment/order-worker -n ticketbuster

# Ver eventos del namespace
kubectl get events -n ticketbuster --sort-by='.lastTimestamp'

# Métricas de pods (requiere metrics-server)
kubectl top pods -n ticketbuster
```

### Escalado Manual

```bash
# Escalar deployment
kubectl scale deployment/api-gateway --replicas=5 -n ticketbuster

# Pausar HPA temporalmente
kubectl patch hpa order-worker-hpa -n ticketbuster -p '{"spec":{"minReplicas":3}}'
```

### Acceso Local (Port Forward)

```bash
# Frontend
kubectl port-forward svc/frontend 5173:5173 -n ticketbuster

# API Gateway
kubectl port-forward svc/api-gateway 8000:8000 -n ticketbuster

# RabbitMQ Management UI
kubectl port-forward svc/rabbitmq 15672:15672 -n ticketbuster
```

### Troubleshooting

```bash
# Ver descripción de pod con errores
kubectl describe pod <pod-name> -n ticketbuster

# Shell en un contenedor
kubectl exec -it deployment/api-gateway -n ticketbuster -- /bin/sh

# Ver secrets
kubectl get secrets -n ticketbuster

# Verificar conectividad interna
kubectl run test --rm -it --image=busybox -n ticketbuster -- wget -qO- http://api-gateway:8000/health
```

## 🏗️ Arquitectura en Kubernetes

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INTERNET (HTTPS)                              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Cloudflare Tunnel   │
                    │   (cloudflared x2)    │
                    └───────────┬───────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
         ▼                      ▼                      │
┌─────────────────┐   ┌─────────────────┐             │
│    Frontend     │   │   API Gateway   │             │
│   (React x2)    │   │  (Express x2)   │             │
│   :5173         │   │   :8000         │             │
└─────────────────┘   └────────┬────────┘             │
                               │                      │
              ┌────────────────┼────────────────┐     │
              │                │                │     │
              ▼                ▼                ▼     │
    ┌─────────────────┐ ┌─────────────┐ ┌───────────────────┐
    │ Catalog Service │ │Notification │ │   Order Worker    │
    │  (Node.js x2)   │ │  (Node.js)  │ │   (Python x1-10)  │
    │  :3000 + gRPC   │ │   :4000     │ │   HPA Managed     │
    └────────┬────────┘ └─────────────┘ └─────────┬─────────┘
             │                                    │
             │                                    │
    ┌────────▼────────┐              ┌────────────▼────────────┐
    │   PostgreSQL    │              │       RabbitMQ          │
    │   (Stateful)    │◄─────────────│     (Message Queue)     │
    │    :5432        │              │    :5672 / :15672       │
    └─────────────────┘              └─────────────────────────┘
```

## ⚠️ Prerrequisitos

1. **kubectl** configurado con acceso al cluster
2. **metrics-server** instalado (para HPA):
   ```bash
   kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
   ```
3. **Imágenes Docker** construidas y subidas a un registry:
   ```bash
   # Ejemplo con Docker Hub
   docker build -t tuusuario/ticketbuster-frontend:latest ./frontend
   docker push tuusuario/ticketbuster-frontend:latest
   # ... repetir para cada servicio
   ```

## 🔒 Seguridad (Producción)

Para producción, considera:

1. **Network Policies** - Restringir comunicación entre pods
2. **Pod Security Standards** - Aplicar políticas de seguridad
3. **Secrets Management** - Usar Vault o Sealed Secrets
4. **RBAC** - Limitar permisos de service accounts
5. **Resource Quotas** - Limitar recursos por namespace
