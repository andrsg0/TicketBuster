# TicketBuster - Guía de Persistencia de Datos

## 📊 Resumen

TicketBuster mantiene los datos persistentes entre sesiones usando:
1. **Volúmenes Persistentes de Kubernetes** para la base de datos PostgreSQL
2. **LocalStorage del navegador** para el ID de usuario en modo desarrollo

---

## 🗄️ Persistencia de Base de Datos

### Configuración de Volúmenes

El sistema utiliza **PersistentVolumeClaims (PVC)** en Kubernetes:

```yaml
# PostgreSQL PVC (5GB)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: ticketbuster
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

**Ubicación del volumen:**
- Docker Desktop: `\\wsl$\docker-desktop-data\version-pack-data\community\docker\volumes\`
- Minikube: `/data/k8s-pvs/`

### Datos Persistentes

Los siguientes datos se mantienen entre reinicios:

| Tabla | Schema | Descripción | Persistente |
|-------|--------|-------------|-------------|
| `events` | `db_catalog` | Eventos disponibles | ✅ Sí |
| `seats` | `db_catalog` | Asientos de cada evento | ✅ Sí |
| `orders` | `db_orders` | Órdenes de compra | ✅ Sí |
| `order_history` | `db_orders` | Historial de cambios | ✅ Sí |

### Verificar Persistencia

Ejecuta el script de verificación:

```powershell
.\scripts\verify-db-init.ps1
```

**Salida esperada:**
```
[CHECK 3] Contando registros...
  Eventos:           53
  Asientos:          2980
  Ordenes:           3

[CHECK 6] Verificando volumen persistente...
  PVC Status: Bound
  [OK] Volumen persistente correctamente vinculado
```

---

## 🔑 Persistencia de Usuario (Modo Desarrollo)

En modo desarrollo, el **userId** se guarda en `localStorage` del navegador:

```javascript
// Key en localStorage
const MOCK_USER_ID_KEY = 'ticketbuster_user_id';

// Al iniciar la aplicación
function getDevUserId() {
  let userId = localStorage.getItem(MOCK_USER_ID_KEY);
  if (!userId) {
    userId = DEFAULT_USER_ID;
    localStorage.setItem(MOCK_USER_ID_KEY, userId);
  }
  return userId;
}
```

### Comportamiento

1. **Primera sesión:**
   - Se genera/usa: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
   - Se guarda en `localStorage`
   - Todas las órdenes se asocian a este ID

2. **Sesiones posteriores:**
   - Se recupera el mismo `userId` de `localStorage`
   - Los tickets comprados se cargan desde la BD usando ese ID

3. **Cerrar y abrir navegador:**
   - El `userId` persiste porque está en `localStorage`
   - Los tickets persisten porque están en PostgreSQL

### Ver el userId en el navegador

```javascript
// Abre la consola del navegador (F12) y ejecuta:
localStorage.getItem('ticketbuster_user_id')

// Para limpiar y empezar de nuevo:
localStorage.removeItem('ticketbuster_user_id')
```

---

## 🔄 Ciclo de Vida de una Orden

### 1. Compra de Ticket

```
Usuario selecciona asientos
  ↓
Frontend envía orden al API Gateway
  ↓
API Gateway inserta en db_orders.orders
  ↓
RabbitMQ notifica al order-worker
  ↓
Order-worker actualiza estado del asiento
  ↓
Ticket guardado en PostgreSQL
```

### 2. Persistencia entre Sesiones

```
Usuario cierra navegador
  ↓
Orden permanece en PostgreSQL (PVC)
  ↓
Usuario abre navegador de nuevo
  ↓
Frontend carga mismo userId (localStorage)
  ↓
API Gateway consulta orders con ese userId
  ↓
Tickets aparecen en "Mis Tickets"
```

---

## 🧪 Pruebas de Persistencia

### Prueba 1: Persistencia de Tickets

```powershell
# 1. Comprar un ticket en http://localhost:5173
# 2. Cerrar todas las ventanas del navegador
# 3. Abrir navegador nuevamente
# 4. Ir a "Mis Tickets"

# ✅ Resultado esperado: El ticket sigue ahí
```

### Prueba 2: Persistencia tras Reinicio de Pods

```powershell
# 1. Comprar un ticket
# 2. Reiniciar el deployment de postgres
kubectl rollout restart deployment/postgres -n ticketbuster

# 3. Esperar a que postgres esté listo
kubectl wait --for=condition=ready pod -l app=postgres -n ticketbuster --timeout=120s

# 4. Refrescar el navegador

# ✅ Resultado esperado: Los datos siguen ahí
```

### Prueba 3: Persistencia tras Borrar Namespace

```powershell
# 1. Comprar un ticket
# 2. Obtener órdenes actuales
kubectl exec -n ticketbuster deployment/postgres -- \
  psql -U admin -d ticketbuster -c "SELECT * FROM db_orders.orders;"

# 3. Borrar namespace (ESTO BORRA TODOS LOS DATOS)
kubectl delete namespace ticketbuster

# 4. Redesplegar
.\scripts\test-k8s-completo.ps1

# ❌ Resultado: Datos perdidos (comportamiento esperado)
# El PVC se borra junto con el namespace
```

### Prueba 4: Persistencia con Volúmenes Externos

Para mantener datos incluso después de borrar el namespace:

```yaml
# Modificar k8s/infrastructure.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: postgres-pv
spec:
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain  # ← Importante
  hostPath:
    path: /mnt/data/ticketbuster/postgres
```

---

## 🛠️ Scripts de Inicialización

Los scripts automáticamente:

### `test-k8s-completo.ps1`
1. ✅ Verifica si la BD tiene tablas
2. ✅ Si no hay tablas → ejecuta `init.sql`
3. ✅ Si no hay eventos → ejecuta `add_events.sql`
4. ✅ Muestra conteo de eventos cargados

### `deploy-local.ps1`
1. ✅ Espera a que PostgreSQL esté listo
2. ✅ Verifica schemas y tablas existentes
3. ✅ Inicializa solo si es necesario
4. ✅ Carga eventos si están vacíos

### `verify-db-init.ps1` (Nuevo)
1. ✅ Verifica schemas creados
2. ✅ Cuenta tablas por schema
3. ✅ Muestra registros por tabla
4. ✅ Verifica estado del PVC

---

## 📋 Comandos Útiles

### Ver datos en PostgreSQL

```powershell
# Conectar a PostgreSQL
kubectl exec -it -n ticketbuster deployment/postgres -- \
  psql -U admin -d ticketbuster

# Dentro de psql:
\dn                                      # Ver schemas
\dt db_catalog.*                         # Ver tablas de catalog
SELECT COUNT(*) FROM db_catalog.events;  # Contar eventos
SELECT COUNT(*) FROM db_orders.orders;   # Contar órdenes

# Ver órdenes de un usuario
SELECT * FROM db_orders.orders 
WHERE user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
```

### Ver estado del volumen

```powershell
# Ver PVCs
kubectl get pvc -n ticketbuster

# Detalles del volumen de postgres
kubectl describe pvc postgres-pvc -n ticketbuster

# Ver espacio usado
kubectl exec -n ticketbuster deployment/postgres -- \
  du -sh /var/lib/postgresql/data
```

### Backup de datos

```powershell
# Exportar toda la base de datos
kubectl exec -n ticketbuster deployment/postgres -- \
  pg_dump -U admin ticketbuster > backup.sql

# Restaurar backup
kubectl exec -i -n ticketbuster deployment/postgres -- \
  psql -U admin ticketbuster < backup.sql
```

---

## ⚠️ Consideraciones Importantes

### Cuando los datos NO persisten

1. **Borrar el namespace completo**
   ```powershell
   kubectl delete namespace ticketbuster  # ← Borra el PVC
   ```

2. **Borrar el PVC manualmente**
   ```powershell
   kubectl delete pvc postgres-pvc -n ticketbuster
   ```

3. **Limpiar volúmenes de Docker Desktop**
   ```powershell
   docker volume prune
   ```

### Cuando los datos SÍ persisten

1. **Reiniciar pods**
   ```powershell
   kubectl rollout restart deployment/postgres -n ticketbuster
   ```

2. **Cerrar y abrir navegador**
   - El `userId` está en localStorage
   - Los tickets están en PostgreSQL

3. **Reiniciar Docker Desktop**
   - Los volúmenes persisten en el host

---

## 🎯 Mejores Prácticas

### Para Desarrollo

1. **Primera vez:** Ejecuta `.\scripts\test-k8s-completo.ps1`
   - Inicializa todo automáticamente

2. **Reinicios posteriores:** Ejecuta `.\scripts\deploy-local.ps1`
   - Usa datos existentes si los encuentra

3. **Verificar datos:** Ejecuta `.\scripts\verify-db-init.ps1`
   - Muestra estadísticas de la BD

### Para Producción

1. **Usar PersistentVolumes externos** (AWS EBS, Azure Disk, GCP PD)
2. **Configurar backups automáticos** (pg_dump + cronjob)
3. **Usar StatefulSets en lugar de Deployments** para PostgreSQL
4. **Habilitar autenticación real** (Keycloak/OAuth)

---

## 🔗 Referencias

- [k8s/infrastructure.yaml](k8s/infrastructure.yaml) - Configuración de PVCs
- [k8s/init.sql](k8s/init.sql) - Script de inicialización
- [frontend/src/App.jsx](frontend/src/App.jsx) - Manejo de userId persistente
- [scripts/verify-db-init.ps1](scripts/verify-db-init.ps1) - Script de verificación

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0
