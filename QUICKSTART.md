# TicketBuster - Quick Start Guide

Inicia el proyecto completo en **5 minutos** con estas guías paso a paso.

## 🎯 Elige tu forma de iniciar

| Opción | Método | Tiempo | Mejor para |
|--------|--------|--------|-----------|
| **1** | Scripts PowerShell (Automatizado) | 3 min | ⭐ Recomendado - Todo automático |
| **2** | kubectl Manual | 5 min | Aprender K8s |
| **3** | Docker Compose | 2 min | Testing rápido |
| **4** | Desarrollo Local | 10 min | Programadores |

### ⚡ TL;DR - Comando Único para Todo

```powershell
.\scripts\test-k8s-completo.ps1
```

Espera 3 minutos y accede a http://localhost:5173

---

## 📜 Referencia Rápida de Scripts

Todos los scripts están en la carpeta `.\scripts\`:

### Inicio y Deploy

```powershell
# ⭐ RECOMENDADO: Todo en uno (build + deploy + test)
.\scripts\test-k8s-completo.ps1

# O paso a paso:
.\scripts\build-images.ps1           # 1. Compilar imágenes Docker
.\scripts\deploy-local.ps1           # 2. Desplegar en K8s + BD
.\scripts\start-port-forwards.ps1    # 3. Abrir port-forwards
```

### Monitoreo y Estado

```powershell
# Ver estado de los pods
kubectl get pods -n ticketbuster

# Ver logs de un servicio específico
kubectl logs -f deployment/order-worker -n ticketbuster

# Ver autoscaling
kubectl get hpa -n ticketbuster
```

### Control de Servicios

```powershell
# Detener port-forwards (mantiene pods corriendo)
.\scripts\stop-all.ps1

# Detener pods (mantiene datos persistentes)
.\scripts\stop-all.ps1 -DeleteNamespace

# Resetear completamente (borra TODO incluyendo datos)
.\scripts\stop-all.ps1 -DeleteData
```

### Reiniciar Servicios

```powershell
# Reiniciar port-forwards si se cerraron
.\scripts\start-port-forwards.ps1

# Reiniciar todo el stack
.\scripts\test-k8s-completo.ps1
```

---

### Requisitos
- Docker Desktop con K8s habilitado
- PowerShell 5.1+
- ~4GB RAM disponible

### Inicio Ultra-Rápido (Un solo comando)

```powershell
# Todo automatizado: build, deploy, port-forwards y verificación
.\scripts\test-k8s-completo.ps1
```

**¡Listo!** Tu aplicación está corriendo en http://localhost:5173

### Paso a Paso con Scripts

```powershell
# 1. Construir todas las imágenes Docker locales
.\scripts\build-images.ps1

# 2. Desplegar en Kubernetes (crea namespace, aplica manifests, inicializa BD)
.\scripts\deploy-local.ps1

# 3. Iniciar port-forwards automáticamente
.\scripts\start-port-forwards.ps1

# 4. Verificar que todo funciona
.\scripts\dev-verify.sh

# 5. Ver estado en tiempo real
.\scripts\dev-status.sh
```

### Scripts Disponibles

| Script | Descripción | Uso |
|--------|-------------|-----|
| `test-k8s-completo.ps1` | Todo en uno (build → deploy → test) | `.\scripts\test-k8s-completo.ps1` |
| `build-images.ps1` | Compilar todas las imágenes Docker | `.\scripts\build-images.ps1` |
| `deploy-local.ps1` | Desplegar en K8s + inicializar BD | `.\scripts\deploy-local.ps1` |
| `start-port-forwards.ps1` | Abrir port-forwards | `.\scripts\start-port-forwards.ps1` |
| `stop-port-forwards.ps1` | Cerrar port-forwards | `.\scripts\stop-port-forwards.ps1` |
| `dev-status.sh` | Ver estado de todos los pods | `.\scripts\dev-status.sh` |
| `dev-up.ps1` | Iniciar servicios (K8s) | `.\scripts\dev-up.ps1` |
| `dev-down.sh` | Parar servicios | `.\scripts\dev-down.sh` |
| `dev-recreate-network.sh` | Reiniciar todo | `.\scripts\dev-recreate-network.sh` |
| `dev-verify.sh` | Verificar conectividad | `.\scripts\dev-verify.sh` |
| `test-all.sh` | Ejecutar tests | `.\scripts\test-all.sh` |

### Acceder a la Aplicación

```
Frontend:        http://localhost:5173
API Gateway:     http://localhost:8000/api
RabbitMQ Admin:  http://localhost:15672 (guest/guest)
```

### Detener Todo

```powershell
# Parar port-forwards
.\scripts\stop-port-forwards.ps1

# Parar servicios (manteniendo datos)
.\scripts\dev-down.sh

# O eliminar completamente
kubectl delete namespace ticketbuster
```

---

## 📖 Detalles de cada Script

### test-k8s-completo.ps1 (TODO EN UNO)

Ejecuta toda la pipeline automáticamente:

```powershell
.\scripts\test-k8s-completo.ps1
```

**Lo que hace:**
1. ✅ Limpia deployments anteriores
2. ✅ Construye todas las imágenes Docker
3. ✅ Crea namespace ticketbuster
4. ✅ Aplica manifests K8s
5. ✅ Espera a que los pods estén listos
6. ✅ Inicializa la base de datos
7. ✅ Carga 20 eventos
8. ✅ Inicia port-forwards
9. ✅ Verifica conectividad
10. ✅ Abre navegador en http://localhost:5173

**Tiempo:** ~3 minutos (primera vez con build)

### build-images.ps1

Compila las imágenes Docker locales:

```powershell
# Build de todas las imágenes
.\scripts\build-images.ps1

# O build individual (más rápido si solo cambió un servicio)
docker build -t ticketbuster/frontend:latest ./frontend
docker build -t ticketbuster/api-gateway:latest ./api-gateway
docker build -t ticketbuster/catalog-service:latest ./catalog-service
docker build -t ticketbuster/order-worker:latest ./order-worker
docker build -t ticketbuster/notification-service:latest ./notification-service
```

**Tiempo:** ~2 minutos (primera vez), ~30 segundos (cambios)

### deploy-local.ps1

Despliega en Kubernetes e inicializa la base de datos:

```powershell
.\scripts\deploy-local.ps1
```

**Lo que hace:**
1. ✅ Crear namespace `ticketbuster`
2. ✅ Aplicar `services-deployment.yaml`
3. ✅ Esperar a que postgres esté ready
4. ✅ Ejecutar `init.sql` (crear schemas)
5. ✅ Ejecutar `add_events.sql` (cargar datos)
6. ✅ Listar pods creados

**Tiempo:** ~1 minuto

### start-port-forwards.ps1

Abre todos los port-forwards en paralelo:

```powershell
.\scripts\start-port-forwards.ps1
```

**Lo que hace:**
```
5173:5173   → Frontend (React)
8000:8000   → API Gateway
3000:3000   → Catalog Service
4000:4000   → Notification Service
5000:5000   → Order Worker
5432:5432   → PostgreSQL
5672:5672   → RabbitMQ
15672:15672 → RabbitMQ Admin
```

**Nota:** Abre los port-forwards en background, puedes seguir usando la terminal

### stop-port-forwards.ps1

Cierra todos los port-forwards:

```powershell
.\scripts\stop-port-forwards.ps1
```

### dev-status.sh

Ver estado en tiempo real de todos los pods:

```powershell
.\scripts\dev-status.sh

# Salida esperada:
# NAME                                    READY   STATUS    RESTARTS
# frontend-abc123                         1/1     Running   0
# api-gateway-def456                      1/1     Running   0
# catalog-service-ghi789                  1/1     Running   0
# order-worker-jkl012                     1/1     Running   0
# notification-service-mno345             1/1     Running   0
# postgres-0                              1/1     Running   0
# rabbitmq-0                              1/1     Running   0
```

### dev-verify.sh

Verifica que todos los servicios están conectados:

```powershell
.\scripts\dev-verify.sh

# Chequea:
# ✓ Frontend responding
# ✓ API Gateway responding
# ✓ Catalog Service responding
# ✓ PostgreSQL connected
# ✓ RabbitMQ connected
# ✓ 20 events loaded
# ✓ All systems operational
```

### dev-down.sh

Para todos los servicios (mantiene datos):

```powershell
.\scripts\dev-down.sh
```

### dev-up.ps1

Reinicia los servicios en Kubernetes:

```powershell
.\scripts\dev-up.ps1
```

### dev-recreate-network.sh

Limpia y reinicia todo desde cero:

```powershell
.\scripts\dev-recreate-network.sh
```

### test-all.sh

Ejecuta test suite completo:

```powershell
.\scripts\test-all.sh
```

---

## ⚡ Opción 2: Kubernetes (Docker Desktop) - Manual

### Requisitos
- Docker Desktop instalado con K8s habilitado
- kubectl configurado (viene con Docker Desktop)
- ~4GB RAM disponible

### Inicio Rápido

```bash
# 1. Crear namespace
kubectl create namespace ticketbuster

# 2. Desplegar todo
kubectl apply -f k8s/services-deployment.yaml -n ticketbuster

# 3. Esperar a que todo esté running (1-2 min)
kubectl get pods -n ticketbuster --watch
# Presiona Ctrl+C cuando todos sean Running

# 4. Port-forward para acceso local
kubectl port-forward -n ticketbuster svc/frontend 5173:5173 &
kubectl port-forward -n ticketbuster svc/api-gateway 8000:8000 &
kubectl port-forward -n ticketbuster svc/rabbitmq 15672:15672 &

# 5. Inicializar base de datos (solo primera vez)
kubectl cp k8s/init.sql ticketbuster/postgres-0:/tmp/init.sql
kubectl exec -it ticketbuster/postgres-0 -- psql -U admin -d ticketbuster -f /tmp/init.sql

# 6. Agregar eventos adicionales (opcional)
kubectl cp k8s/add_events.sql ticketbuster/postgres-0:/tmp/add_events.sql
kubectl exec -it ticketbuster/postgres-0 -- psql -U admin -d ticketbuster -f /tmp/add_events.sql
```

### Acceder a la Aplicación

```
Frontend:        http://localhost:5173
API Gateway:     http://localhost:8000/api
RabbitMQ Admin:  http://localhost:15672 (guest/guest)
```

### Detener Todo

```bash
# Opción 1: Mantener namespace (para reutilizar datos)
kubectl scale deployment --all --replicas=0 -n ticketbuster

# Opción 2: Eliminar todo
kubectl delete namespace ticketbuster
```

---

## 🐳 Opción 3: Docker Compose

### Requisitos
- Docker Desktop instalado
- ~3GB RAM disponible

### Inicio Rápido

```bash
# 1. Construir imágenes locales
docker-compose -f docker-compose.dev.yml build

# 2. Iniciar servicios
docker-compose -f docker-compose.dev.yml up -d

# 3. Esperar 30 segundos (inicialización de BD)

# 4. Verificar que todo está corriendo
docker-compose -f docker-compose.dev.yml ps

# 5. Inicializar base de datos (solo primera vez)
docker-compose -f docker-compose.dev.yml exec postgres psql -U admin -d ticketbuster -f /docker-entrypoint-initdb.d/init.sql
```

### Acceder a la Aplicación

```
Frontend:        http://localhost:5173
API Gateway:     http://localhost:8000/api
RabbitMQ Admin:  http://localhost:15672 (guest/guest)
```

### Detener Todo

```bash
docker-compose -f docker-compose.dev.yml down

# Con eliminación de volúmenes (resetear datos)
docker-compose -f docker-compose.dev.yml down -v
```

---

## 💻 Opción 4: Desarrollo Local (Con Node.js/Python)

### Requisitos
- Node.js 22.x LTS
- Python 3.11+
- PostgreSQL 15 running (localhost:5432)
- RabbitMQ running (localhost:5672)

### Inicio Rápido

```bash
# Terminal 1: Frontend (React)
cd frontend
npm install
npm run dev
# Accede a http://localhost:5173

# Terminal 2: API Gateway
cd api-gateway
npm install
npm start
# Listening on http://localhost:8000/api

# Terminal 3: Catalog Service
cd catalog-service
npm install
npm start
# Listening on http://localhost:3000

# Terminal 4: Order Worker
cd order-worker
python3.11 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py

# Terminal 5: Notification Service
cd notification-service
npm install
npm start
# Listening on http://localhost:4000
```

### Base de Datos

```bash
# Conectar a PostgreSQL
psql -U admin -d ticketbuster -h localhost

# Ejecutar inicialización
\i k8s/init.sql
\i k8s/add_events.sql

# Verificar que hay datos
SELECT COUNT(*) FROM db_catalog.events;  -- Debe mostrar 20
```

---

## ✅ Verificación Rápida

### Chequear que todo funciona

```bash
# 1. Frontend está serviendo
curl http://localhost:5173

# 2. API Gateway funciona
curl http://localhost:8000/api/events | jq '.data | length'
# Debe mostrar: 20

# 3. RabbitMQ está online
curl http://localhost:15672/api/overview -u guest:guest | jq '.queue_totals.messages'

# 4. PostgreSQL tiene datos
psql -U admin -d ticketbuster -h localhost -c "SELECT COUNT(*) FROM db_catalog.seats;"
# Debe mostrar: 2980 (o similar)
```

---

## 🧹 Scripts Útiles

En la carpeta `scripts/` hay helpers automatizados:

```bash
# Ver estado de todos los servicios (K8s)
./scripts/dev-status.sh

# Iniciar todo (K8s)
./scripts/dev-up.sh

# Parar todo (K8s)
./scripts/dev-down.sh

# Reiniciar servicios (K8s)
./scripts/dev-recreate-network.sh

# Verificar conectividad (K8s)
./scripts/dev-verify.sh

# Ejecutar tests
./scripts/test-all.sh
```

---

## 🔧 Variables de Entorno Importantes

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=http://localhost:4000
VITE_KEYCLOAK_URL=http://localhost:8080
```

### API Gateway (.env)
```env
PORT=8000
CATALOG_SERVICE_URL=http://localhost:3000
ORDER_SERVICE_URL=http://localhost:5000
NOTIFICATION_SERVICE_URL=http://localhost:4000
DB_HOST=localhost
```

### Catalog Service (.env)
```env
PORT=3000
DB_HOST=localhost
DB_USER=admin
DB_PASS=admin
ENABLE_GRPC=true
```

### Order Worker (.env)
```env
PORT=5000
RABBITMQ_URL=amqp://guest:guest@localhost:5672
GRPC_CATALOG_HOST=localhost
GRPC_CATALOG_PORT=50051
DB_HOST=localhost
```

---

## 🐛 Troubleshooting Rápido

### "No connections available"
```bash
# Verificar que PostgreSQL está corriendo
psql -U admin -d ticketbuster

# En K8s: verificar logs
kubectl logs -n ticketbuster deployment/postgres
```

### "RabbitMQ connection refused"
```bash
# Verificar que RabbitMQ está corriendo
curl http://localhost:15672/api/overview -u guest:guest

# En K8s: reiniciar pod
kubectl delete pod -n ticketbuster rabbitmq-0
```

### "gRPC connection error"
```bash
# Verificar que catalog-service está en 50051
lsof -i :50051

# En K8s:
kubectl logs -n ticketbuster deployment/catalog-service
```

### Frontend muestra "no asientos disponibles"
```bash
# Verificar que eventos están en BD
psql -U admin -d ticketbuster -c "SELECT COUNT(*) FROM db_catalog.events;"

# Si está vacío, ejecutar init
psql -U admin -d ticketbuster -f k8s/init.sql
psql -U admin -d ticketbuster -f k8s/add_events.sql
```

### Pods en CrashLoopBackOff
```bash
# Ver logs de error
kubectl logs -n ticketbuster pod/order-worker-xyz --previous

# Reiniciar deployment
kubectl rollout restart deployment/order-worker -n ticketbuster
```

---

## 📊 Datos de Ejemplo

El proyecto viene con **20 eventos pre-cargados**:

| # | Evento | Categoría | Fecha | Asientos |
|---|--------|-----------|-------|----------|
| 1 | Bad Bunny: Most Wanted Tour 2026 | CONCERT | Feb 15 | 35,000 |
| 2 | Lollapalooza Lima 2026 | FESTIVAL | Mar 10 | 50,000 |
| 3 | Ballet Clásico: El Lago de los Cisnes | THEATER | Feb 28 | 600 |
| 4 | Partido Amistoso: Perú vs Argentina | SPORTS | Apr 05 | 80,000 |
| 5 | Karol G: Mañana Será Bonito Tour | CONCERT | May 20 | 40,000 |
| ... | ... | ... | ... | ... |

Total: **2,980 asientos** distribuidos, todos disponibles para compra.

---

## 🔗 Documentación Completa

- **Backend Services**: Consulta [k8s/README.md](k8s/README.md)
- **Frontend PWA**: Consulta [frontend/README.md](frontend/README.md)
- **API Gateway**: Consulta [api-gateway/README.md](api-gateway/README.md)
- **Catalog Service**: Consulta [catalog-service/README.md](catalog-service/README.md)
- **Order Worker**: Consulta [order-worker/README.md](order-worker/README.md)
- **Notification Service**: Consulta [notification-service/README.md](notification-service/README.md)
- **gRPC Protos**: Consulta [proto/README.md](proto/README.md)

---

## 🚀 Próximos Pasos

### Después de iniciar (Con Scripts):

1. **Abrir Frontend**: http://localhost:5173
2. **Ver eventos**: En la página principal
3. **Seleccionar asientos**: Hacer clic en un evento
4. **Crear orden**: Seleccionar asientos y comprar
5. **Ver notificaciones**: Llegarán en tiempo real

### Scripts Útiles Durante Desarrollo

```powershell
# Ver estado en tiempo real
.\scripts\dev-status.sh

# Parar todo temporalmente (mantiene datos)
.\scripts\dev-down.sh

# Reiniciar servicios
.\scripts\dev-up.sh

# Resetear todo desde cero
.\scripts\dev-recreate-network.sh

# Verificar conectividad
.\scripts\dev-verify.sh

# Ejecutar tests
.\scripts\test-all.sh

# Parar port-forwards
.\scripts\stop-port-forwards.ps1
```

### Para desarrollo (modificar código)

1. **Cambios automáticos**: Frontend (HMR) se actualiza en tiempo real
2. **Backend changes**: Requieren rebuild:
   ```powershell
   .\scripts\build-images.ps1      # Build una sola imagen
   kubectl rollout restart deployment/<servicio> -n ticketbuster
   ```
3. **Ver logs en vivo**: `.\scripts\dev-status.sh` o
   ```powershell
   kubectl logs -n ticketbuster deployment/<servicio> -f
   ```
4. **Ejecutar tests**: `.\scripts\test-all.sh`
5. **Debuggear**: 
   - Frontend: Browser DevTools (F12)
   - Backend: Ver logs con kubectl o debugger

### Para producción:

1. **Build nuevas imágenes**:
   ```powershell
   .\scripts\build-images.ps1
   ```
2. **Pushear a registry** (Docker Hub, ECR, GCR):
   ```bash
   docker push <registry>/<servicio>:latest
   ```
3. **Actualizar K8s**:
   ```bash
   kubectl set image deployment/<servicio> \
     <servicio>=<registry>/<servicio>:latest -n ticketbuster
   ```
4. **Monitor**: 
   ```powershell
   .\scripts\dev-status.sh        # Ver pods
   kubectl logs -n ticketbuster deployment/<servicio> -f  # Ver logs
   kubectl top pods -n ticketbuster                       # Ver recursos
   ```

---

## 🎯 Cheatsheet - Comandos Frecuentes

### Diagnóstico Rápido

```powershell
# ¿Está corriendo todo?
.\scripts\dev-status.sh

# ¿Todo conectado correctamente?
.\scripts\dev-verify.sh

# ¿Cuántos eventos hay?
kubectl exec -n ticketbuster deployment/postgres -- \
  psql -U admin -d ticketbuster -c "SELECT COUNT(*) FROM db_catalog.events"
```

### Logs y Debugging

```powershell
# Ver logs de un servicio en vivo
kubectl logs -n ticketbuster deployment/api-gateway -f

# Ver todos los logs recientes
kubectl logs -n ticketbuster deployment/catalog-service --tail=50

# Ver logs de errores solo
kubectl logs -n ticketbuster deployment/order-worker --previous

# Abrir shell en un pod
kubectl exec -it -n ticketbuster deployment/frontend -- /bin/sh
```

### Parar/Reiniciar

```powershell
# Parar todo (mantiene datos)
.\scripts\dev-down.sh

# Reiniciar un servicio específico
kubectl rollout restart deployment/api-gateway -n ticketbuster

# Reiniciar todo
.\scripts\dev-recreate-network.sh
```

### Acceder a Servicios

```powershell
# Si no tienes port-forward, puedes abrir uno:
kubectl port-forward -n ticketbuster svc/frontend 5173:5173

# Acceder a PostgreSQL desde terminal
kubectl exec -it -n ticketbuster deployment/postgres -- \
  psql -U admin -d ticketbuster

# Ejecutar comandos SQL
kubectl exec -n ticketbuster deployment/postgres -- \
  psql -U admin -d ticketbuster -c "SELECT * FROM db_catalog.events LIMIT 5"
```

### Troubleshooting

```powershell
# Pod en CrashLoopBackOff? Ver qué salió mal:
kubectl logs -n ticketbuster deployment/<servicio> --previous

# Namespace no existe? Crear:
kubectl create namespace ticketbuster

# Port ya en uso? Matar el proceso:
lsof -i :5173
kill -9 <PID>

# RabbitMQ sin mensajes? Ver admin:
http://localhost:15672 (guest/guest)
```

---

```bash
# Ver todos los pods
kubectl get pods -n ticketbuster

# Ver servicios y IPs
kubectl get svc -n ticketbuster

# Port-forward cualquier servicio
kubectl port-forward -n ticketbuster svc/SERVICE_NAME PORT:PORT

# Ver variables de entorno de un pod
kubectl exec -n ticketbuster deployment/SERVICE -- env

# Conectar a base de datos
kubectl exec -it -n ticketbuster deployment/postgres -- \
  psql -U admin -d ticketbuster

# Ver RabbitMQ admin
open http://localhost:15672
# Usuario: guest
# Contraseña: guest
```

---

**¡Listo! 🎉 Tu aplicación TicketBuster está corriendo.**

¿Algún problema? Consulta la sección **Troubleshooting** o revisa los READMEs específicos de cada componente.

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0
