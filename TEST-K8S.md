# 🚀 CÓMO PROBAR TICKETBUSTER EN KUBERNETES

## ✅ Opción 1: Script Automático (RECOMENDADO)

**Un solo comando hace TODO:**

```powershell
.\scripts\test-k8s-completo.ps1
```

**Qué hace:**
1. ✅ Construye todas las imágenes Docker
2. ✅ Despliega PostgreSQL, RabbitMQ
3. ✅ Despliega los 5 microservicios
4. ✅ Configura HPA (autoscaling)
5. ✅ Inicia port-forwards en ventanas separadas
6. ✅ Abre http://localhost:5173 en tu navegador

**Tiempo estimado:** 3-5 minutos

---

## ⚙️ Opción 2: Paso a Paso Manual

### Paso 1: Construir imágenes Docker

```powershell
.\scripts\build-images.ps1
```

### Paso 2: Desplegar en Kubernetes

```powershell
.\scripts\deploy-local.ps1
```

### Paso 3: Iniciar port-forwards

```powershell
.\scripts\start-port-forwards.ps1
```

### Paso 4: Abrir navegador

```powershell
start http://localhost:5173
```

---

## 🔍 Verificar que todo funciona

```powershell
# Ver estado de todos los pods
kubectl get pods -n ticketbuster

# Debe mostrar algo como:
# NAME                                    READY   STATUS    RESTARTS   AGE
# frontend-xxx                            1/1     Running   0          2m
# api-gateway-xxx                         1/1     Running   0          2m
# catalog-service-xxx                     1/1     Running   0          2m
# notification-service-xxx                1/1     Running   0          2m
# order-worker-xxx                        1/1     Running   0          2m
# postgres-xxx                            1/1     Running   0          3m
# rabbitmq-xxx                            1/1     Running   0          3m

# Ver logs de un servicio
kubectl logs -f deployment/order-worker -n ticketbuster

# Ver HPA (autoscaling)
kubectl get hpa -n ticketbuster
```

---

## 🧪 Probar funcionalidades

1. **Registro/Login:** http://localhost:5173
2. **Explorar eventos:** Navegar por categorías
3. **Seleccionar asientos:** Elegir asientos y confirmar
4. **Comprar tickets:** Procesar orden
5. **Mis Tickets:** Ver QR codes generados

---

## 🛑 Limpiar todo

```powershell
# Elimina TODO (pods, services, PVCs, namespace)
kubectl delete namespace ticketbuster

# Cerrar las ventanas de port-forward
# (Simplemente cierra las ventanas de PowerShell)
```

---

## 🐛 Troubleshooting

### Problema: Pods en estado "CrashLoopBackOff" con error "ENOENT: no such file or directory, open '/proto/inventory.proto'"
**Causa:** Los archivos `.proto` no están en las imágenes Docker.
**Solución:** El script `test-k8s-completo.ps1` ahora copia automáticamente los proto files antes de construir.
```powershell
kubectl delete namespace ticketbuster
.\scripts\test-k8s-completo.ps1
```

### Problema: Pods en estado "ImagePullBackOff"
**Solución:**
```powershell
.\scripts\build-images.ps1
kubectl delete namespace ticketbuster
.\scripts\test-k8s-completo.ps1
```

### Problema: "connection refused" al abrir localhost:5173
**Solución:** Espera 1-2 minutos más. Los pods están iniciando.
```powershell
kubectl get pods -n ticketbuster -w
# Espera a que todos estén 1/1 Running
```

### Problema: RabbitMQ tarda mucho
**Normal.** RabbitMQ tarda ~2 minutos en iniciar completamente.

### Problema: Port-forward se desconecta
**Solución:** Vuelve a ejecutar
```powershell
.\scripts\start-port-forwards.ps1
```

---

## 📊 Ver el Autoscaling en Acción

```powershell
# Ver HPA en tiempo real
kubectl get hpa -n ticketbuster -w

# Generar carga (comprar muchos tickets)
# El order-worker escalará automáticamente de 1 a 10 pods
# cuando el CPU > 50%

# Ver pods escalando
kubectl get pods -n ticketbuster -w
```

---

## 🎯 Accesos

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Frontend | http://localhost:5173 | - |
| API Gateway | http://localhost:8000 | - |
| RabbitMQ UI | http://localhost:15672 | guest/guest |

---

## ✨ Ventajas de Kubernetes vs Docker Compose

1. **Autoscaling:** HPA escala order-worker automáticamente
2. **Self-healing:** Si un pod muere, K8s lo reinicia automáticamente
3. **Resource limits:** Cada pod tiene CPU/RAM limitados
4. **Rolling updates:** Actualizaciones sin downtime
5. **Production-ready:** Mismo setup que producción
