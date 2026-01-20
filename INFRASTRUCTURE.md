# 🚀 TicketBuster - Infraestructura Local (Etapa 2)

## 📋 Servicios de Infraestructura

Este setup levanta los servicios de infraestructura necesarios para el desarrollo local:

| Servicio | Puerto | Credenciales | URL de Acceso |
|----------|--------|--------------|---------------|
| **PostgreSQL** | 5432 | `admin` / `admin` | `localhost:5432` |
| **RabbitMQ** | 5672, 15672 | `guest` / `guest` | http://localhost:15672 |
| **Keycloak** | 8080 | `admin` / `admin` | http://localhost:8080 |

---

## 🏃 Inicio Rápido

### 1. Levantar la Infraestructura

```bash
# Desde la raíz del proyecto
docker compose -f docker-compose.dev.yml up -d

# Ver logs en tiempo real
docker compose -f docker-compose.dev.yml logs -f

# Ver solo logs de un servicio específico
docker compose -f docker-compose.dev.yml logs -f postgres
```

### 2. Verificar que Todo Esté Running

```bash
# Ver estado de los contenedores
docker compose -f docker-compose.dev.yml ps

# Debería mostrar algo como:
# NAME                      STATUS              PORTS
# ticketbuster-postgres     Up (healthy)        0.0.0.0:5432->5432/tcp
# ticketbuster-rabbitmq     Up (healthy)        0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
# ticketbuster-keycloak     Up (healthy)        0.0.0.0:8080->8080/tcp
```

### 3. Verificar Healthchecks

Todos los servicios tienen healthchecks configurados. Espera a que todos estén `(healthy)`:

```bash
# Monitorear health status
watch -n 2 'docker compose -f docker-compose.dev.yml ps'
```

⏱️ **Tiempo estimado**: Keycloak tarda ~60 segundos en estar completamente listo.

---

## 🔍 Verificación de Servicios

### ✅ PostgreSQL

**Verificar conexión:**
```bash
# Usando psql (si lo tienes instalado)
psql -h localhost -p 5432 -U admin -d ticketbuster

# O desde Docker
docker exec -it ticketbuster-postgres psql -U admin -d ticketbuster
```

**Verificar que las tablas se crearon:**
```sql
-- Listar esquemas
SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'db_%';

-- Ver eventos de prueba
SELECT * FROM db_catalog.events;

-- Ver asientos disponibles por evento
SELECT * FROM db_catalog.v_available_seats_per_event;

-- Ver órdenes de prueba
SELECT * FROM db_orders.orders;

-- Salir
\q
```

**Resultado esperado:**
- ✅ 2 esquemas: `db_catalog`, `db_orders`
- ✅ 3 eventos de prueba
- ✅ 200+ asientos generados
- ✅ 3 órdenes de ejemplo

---

### ✅ RabbitMQ

**Acceder a la UI de Administración:**

🌐 **URL**: http://localhost:15672

**Credenciales:**
- Usuario: `guest`
- Password: `guest`

**Verificaciones en la UI:**

1. **Dashboard**: Verifica que el servidor esté corriendo
2. **Queues**: (vacío por ahora, se crearán cuando los servicios se conecten)
3. **Exchanges**: (vacío por ahora)

**Verificar desde CLI:**
```bash
# Ver status del RabbitMQ
docker exec ticketbuster-rabbitmq rabbitmq-diagnostics status

# Listar usuarios
docker exec ticketbuster-rabbitmq rabbitmqctl list_users

# Listar permisos
docker exec ticketbuster-rabbitmq rabbitmqctl list_permissions
```

**Resultado esperado:**
- ✅ RabbitMQ corriendo con Management Plugin activo
- ✅ Usuario `guest` con permisos de administrador
- ✅ UI accesible en localhost:15672

---

### ✅ Keycloak

**Acceder a la Consola de Administración:**

🌐 **URL**: http://localhost:8080

**Credenciales:**
- Usuario: `admin`
- Password: `admin`

**Primera configuración (para Etapa 3):**

1. **Crear Realm "ticketbuster"**
   - Administration Console → Master (dropdown) → Create Realm
   - Realm name: `ticketbuster`
   - Enabled: ON

2. **Crear Client para API Gateway**
   - Clients → Create Client
   - Client ID: `ticketbuster-api`
   - Client Protocol: `openid-connect`
   - Valid Redirect URIs: `http://localhost:3000/*`

3. **Crear Client para Frontend**
   - Client ID: `ticketbuster-frontend`
   - Valid Redirect URIs: `http://localhost:5173/*`

4. **Crear Usuario de Prueba**
   - Users → Add User
   - Username: `testuser`
   - Email: `test@ticketbuster.com`
   - Credentials → Set Password: `test123`

**Verificar endpoints:**
```bash
# Health check
curl http://localhost:8080/health/ready

# Realm info (después de crear el realm)
curl http://localhost:8080/realms/ticketbuster
```

**Resultado esperado:**
- ✅ Consola de admin accesible
- ✅ Health endpoint respondiendo
- ✅ Listo para crear realm y clients

---

## 🛠️ Comandos Útiles

### Detener Todo

```bash
# Detener servicios sin eliminar volúmenes
docker compose -f docker-compose.dev.yml down

# Detener Y eliminar volúmenes (borra todos los datos)
docker compose -f docker-compose.dev.yml down -v
```

### Restart de Servicios Individuales

```bash
# Reiniciar PostgreSQL
docker compose -f docker-compose.dev.yml restart postgres

# Reiniciar RabbitMQ
docker compose -f docker-compose.dev.yml restart rabbitmq

# Reiniciar Keycloak
docker compose -f docker-compose.dev.yml restart keycloak
```

### Ver Logs

```bash
# Logs de todos los servicios
docker compose -f docker-compose.dev.yml logs -f

# Últimas 100 líneas de un servicio
docker compose -f docker-compose.dev.yml logs --tail=100 postgres

# Logs desde una hora específica
docker compose -f docker-compose.dev.yml logs --since="2026-01-20T14:00:00"
```

### Ejecutar Comandos en Contenedores

```bash
# Shell en PostgreSQL
docker exec -it ticketbuster-postgres sh

# Shell en RabbitMQ
docker exec -it ticketbuster-rabbitmq sh

# Shell en Keycloak
docker exec -it ticketbuster-keycloak sh
```

---

## 🔧 Troubleshooting

### PostgreSQL no inicia

**Error**: `role "admin" does not exist`

**Solución:**
```bash
# Recrear el contenedor
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d postgres
```

### RabbitMQ Management UI no carga

**Solución:**
```bash
# Esperar a que el healthcheck pase
docker compose -f docker-compose.dev.yml logs rabbitmq

# Buscar: "Server startup complete"
```

### Keycloak tarda mucho en iniciar

Es normal. Keycloak puede tardar 60-90 segundos en estar completamente listo.

```bash
# Monitorear el progreso
docker compose -f docker-compose.dev.yml logs -f keycloak

# Buscar: "Keycloak 24.0 started"
```

### Reset completo de datos

```bash
# Eliminar todo y empezar desde cero
docker compose -f docker-compose.dev.yml down -v
docker volume prune -f
docker compose -f docker-compose.dev.yml up -d
```

---

## 📊 Verificación de Datos Iniciales

### PostgreSQL - Datos de Prueba

```sql
-- Conectarse
docker exec -it ticketbuster-postgres psql -U admin -d ticketbuster

-- Eventos
SELECT id, title, date, price, total_seats FROM db_catalog.events;
-- Debería mostrar 3 eventos

-- Asientos disponibles
SELECT event_id, COUNT(*) FROM db_catalog.seats 
WHERE status = 'AVAILABLE' 
GROUP BY event_id;
-- Debería mostrar ~200 asientos por evento

-- Órdenes de prueba
SELECT order_uuid, user_id, status FROM db_orders.orders;
-- Debería mostrar 3 órdenes (2 completadas, 1 pendiente)
```

---

## 🌐 URLs de Acceso Rápido

Una vez que todo esté levantado:

| Servicio | URL | Usuario | Password |
|----------|-----|---------|----------|
| 🐰 **RabbitMQ UI** | http://localhost:15672 | `guest` | `guest` |
| 🔐 **Keycloak Admin** | http://localhost:8080 | `admin` | `admin` |
| 🗄️ **PostgreSQL** | `localhost:5432` | `admin` | `admin` |

---

## 📝 Notas Importantes

1. **Volúmenes Persistentes**: Los datos se guardan en volúmenes Docker. Para borrar todo y empezar limpio, usa `docker compose down -v`.

2. **Init SQL**: El archivo `k8s/init.sql` se ejecuta SOLO en el primer inicio. Si modificas el SQL y necesitas recrear:
   ```bash
   docker compose -f docker-compose.dev.yml down -v
   docker volume rm ticketbuster_postgres_data
   docker compose -f docker-compose.dev.yml up -d
   ```

3. **Keycloak en Dev Mode**: Usa H2 database interno (no PostgreSQL). Para producción, se configurará con PostgreSQL externo.

4. **Redes**: Todos los servicios están en la red `ticketbuster-network`. Los microservicios podrán comunicarse usando los nombres de servicio (ej: `postgres`, `rabbitmq`).

---

## 🎯 Próximos Pasos (Etapa 3)

Una vez verificado que la infraestructura funciona:

1. ✅ Descomentar servicios de aplicación en `docker-compose.dev.yml`
2. ✅ Implementar conexión a PostgreSQL en `catalog-service` y `order-worker`
3. ✅ Implementar productores/consumidores RabbitMQ en `api-gateway` y `order-worker`
4. ✅ Integrar autenticación Keycloak en `api-gateway`
5. ✅ Configurar gRPC entre servicios

---

## 📚 Referencias

- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [RabbitMQ Docker Hub](https://hub.docker.com/_/rabbitmq)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)

---

**🎫 TicketBuster DevOps Team**
