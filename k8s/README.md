# TicketBuster - Kubernetes Deployment

## 📁 Estructura de Archivos

```
k8s/
├── namespace.yaml          # Namespace ticketbuster
├── infrastructure.yaml     # PostgreSQL + RabbitMQ (Stateful)
├── services-deployment.yaml # Frontend + Microservicios
├── tunnel.yaml             # Cloudflare Tunnel (HTTPS público)
├── tunnel-secret.yaml      # Template del secret del túnel
├── hpa.yaml                # Horizontal Pod Autoscaler
└── init.sql                # Script de inicialización de BD
```

## 🚀 Despliegue Rápido

```bash
# Dar permisos de ejecución
chmod +x deploy.sh

# Desplegar todo (te pedirá el token de Cloudflare)
./deploy.sh

# Desplegar sin túnel (acceso solo local/port-forward)
./deploy.sh --skip-tunnel

# Dry run (ver qué se aplicaría sin hacer cambios)
./deploy.sh --dry-run
```

## 🔑 Configuración de Cloudflare Tunnel

### Obtener el Token

1. Ve a [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com)
2. Navega a **Networks → Tunnels**
3. Click en **Create a tunnel**
4. Selecciona **Cloudflared** como connector
5. Nombra tu túnel (ej: `ticketbuster-prod`)
6. En la página de instalación, busca el comando:
   ```
   cloudflared service install eyJhIjoiYWJjMTIzLi4uIg==
   ```
7. Copia el token (string largo en base64)

### Configurar Rutas Públicas

En la configuración del túnel, añade estas rutas:

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
