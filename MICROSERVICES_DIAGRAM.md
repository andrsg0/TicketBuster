# TicketBuster - Diagrama de Microservicios

## 📊 Arquitectura General del Sistema

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENTE FINAL                                    │
│                             Frontend PWA (React 18.x)                             │
│           • Instalable en dispositivos (PWA)                                      │
│           • Offline-first con IndexedDB                                           │
│           • Real-time via WebSocket                                               │
│           • Responsive design (Mobile/Tablet/Desktop)                             │
└────────────────────────────┬─────────────────────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │ HTTP/REST    │ WebSocket    │
              ▼              ▼              │
       ┌──────────────────────────────────────────────────────────────────┐
       │                    API GATEWAY (Express.js)                      │
       │  Puerto: 3000                                                    │
       │  • Auth centralizada (JWT desde Keycloak)                        │
       │  • Rate limiting                                                 │
       │  • Enrutamiento de requests                                      │
       │  • CORS y seguridad (Helmet)                                     │
       │  • Health checks                                                 │
       └──┬──────────────┬────────────────────────┬─────────────────────┘
          │              │                        │
          │ gRPC         │ HTTP/REST              │ RabbitMQ
          │ (síncrono)   │                        │ (asíncrono)
          ▼              ▼                        ▼
    ┌──────────────┐  ┌─────────────────────┐  ┌──────────────────────┐
    │  CATALOG     │  │  NOTIFICATION       │  │  ORDER WORKER        │
    │  SERVICE     │  │  SERVICE            │  │  (Python)            │
    │              │  │                     │  │                      │
    │ Puerto: 3001 │  │  Puerto: 4000       │  │  Puerto: 8000        │
    │              │  │                     │  │                      │
    │ • Eventos    │  │  • WebSocket server │  │  • CPU-intensive     │
    │ • Asientos   │  │  • Real-time notif. │  │  • Genera QR         │
    │ • gRPC       │  │  • Socket.io rooms  │  │  • Procesa órdenes   │
    │   server     │  │  • RabbitMQ client  │  │  • gRPC client       │
    │ • PostgreSQL │  │  • Health checks    │  │  • PostgreSQL        │
    │   queries    │  │                     │  │  • RabbitMQ client   │
    └──────┬───────┘  └─────────────────────┘  └──────┬───────────────┘
           │                                           │
           └───────────────────────┬───────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │ PostgreSQL (Puerto: 5432)   │
                    │                             │
                    │ • db_catalog               │
                    │   - Eventos               │
                    │   - Asientos              │
                    │   - Stock de entradas     │
                    │                            │
                    │ • db_orders                │
                    │   - Órdenes de compra     │
                    │   - Historial             │
                    │   - Estados               │
                    └────────────────────────────┘
```

---

## 🔄 Flujo de Comunicación por Tipo

### 1️⃣ Catálogo (Consultas Síncronas - gRPC)
```
Frontend → API Gateway → [gRPC] → Catalog Service → PostgreSQL
                                   • GetEvents()
                                   • GetSeats()
                                   • CheckAvailability()
```

### 2️⃣ Órdenes (Procesamiento Asincrónico - RabbitMQ)
```
Frontend
   │
   ├─→ API Gateway (REST POST /orders)
        │
        ├─→ Catalog Service (gRPC: ReserveSeats)
        │
        └─→ RabbitMQ: orders_queue
             │
             └─→ Order Worker (Python)
                  ├─→ Procesa orden
                  ├─→ Genera QR
                  ├─→ Guarda en PostgreSQL
                  └─→ RabbitMQ: notifications_queue
                       │
                       └─→ Notification Service
                            └─→ WebSocket
                                 └─→ Frontend (usuario notificado)
```

### 3️⃣ Notificaciones en Tiempo Real (WebSocket)
```
Frontend ←→ Notification Service (Socket.io)
            • Conexión persistente WebSocket
            • Salas privadas por usuario (Socket.io rooms)
            • Recibe eventos de RabbitMQ
            • Transmite en tiempo real al usuario
```

---

## 📦 Servicios por Stack Tecnológico

### **Node.js/Express Services**
| Servicio | Puerto | Protocolo | Responsabilidad |
|----------|--------|-----------|-----------------|
| **API Gateway** | 3000 | HTTP/REST + Auth JWT | Punto de entrada, enrutamiento, autenticación |
| **Catalog Service** | 3001 | gRPC + HTTP | Gestión de eventos y asientos |
| **Notification Service** | 4000 | WebSocket (Socket.io) | Notificaciones en tiempo real |
| **Frontend** | 5173 | HTTP (Vite dev) | PWA de React (producción: nginx) |

### **Python Services**
| Servicio | Puerto | Stack | Responsabilidad |
|----------|--------|-------|-----------------|
| **Order Worker** | 8000 | FastAPI/gRPC/RabbitMQ | Procesamiento asincrónico de órdenes |

---

## 🗄️ Infraestructura (Contenedores)

| Servicio | Tipo | Puerto | Credenciales | Función |
|----------|------|--------|--------------|---------|
| **PostgreSQL** | Base de datos | 5432 | `admin:admin` | Persistencia de catálogo y órdenes |
| **RabbitMQ** | Message Broker | 5672, 15672 | `guest:guest` | Cola de mensajes asincrónica + UI admin |
| **Keycloak** | Identity Provider | 8080 | `admin:admin` | Autenticación OAuth2/OIDC |

---

## 🔌 Protocolos de Comunicación

### gRPC (Síncrono)
- **Usado para**: Operaciones críticas y consultas
- **Entre**: API Gateway ↔ Catalog Service, Order Worker ↔ Catalog Service
- **Ventajas**: Bajo latency, type-safe, bi-directional streaming
- **Proto files**: `proto/` con definiciones de orders.proto, inventory.proto, etc.

### RabbitMQ (Asincrónico)
- **Usado para**: Procesamiento de órdenes, notificaciones
- **Colas principales**:
  - `orders_queue`: API Gateway → Order Worker
  - `notifications_queue`: Order Worker → Notification Service
- **Ventajas**: Desacoplamiento, escalabilidad, garantía de entrega

### WebSocket (Socket.io)
- **Usado para**: Notificaciones en tiempo real
- **Entre**: Notification Service ↔ Frontend
- **Ventajas**: Conexión persistente, bajo latency, broadcast eficiente

### HTTP/REST
- **Usado para**: Endpoints no críticos, health checks
- **Entre**: Frontend ↔ API Gateway
- **Ventajas**: Simplicidad, stateless, fácil de testear

---

## 🏗️ Dependencias Entre Servicios

```
Frontend (React)
├── Depende de: API Gateway
│   ├── Depende de: Catalog Service (gRPC)
│   │   └── Depende de: PostgreSQL (db_catalog)
│   │
│   ├── Depende de: RabbitMQ (publica órdenes)
│   │   └── Depende de: Order Worker (consume)
│   │       ├── Depende de: Catalog Service (gRPC reserve)
│   │       ├── Depende de: PostgreSQL (db_orders)
│   │       └── Publica en: RabbitMQ (notificaciones)
│   │
│   └── Depende de: Notification Service (WebSocket)
│       └── Consume de: RabbitMQ (notifications_queue)
│
└── Depende de: Keycloak (autenticación OAuth2/OIDC)
```

---

## 🔐 Flujo de Autenticación

```
1. Usuario en Frontend
   ↓
2. Redirige a Keycloak (SSO)
   ↓
3. Keycloak emite JWT
   ↓
4. Frontend almacena JWT en localStorage/sessionStorage
   ↓
5. Todas las requests incluyen: Authorization: Bearer <JWT>
   ↓
6. API Gateway valida JWT
   ↓
7. Si válido, router a servicios backend
```

---

## 📊 Conteo de Componentes

### Microservicios: **5**
- API Gateway (Node.js)
- Catalog Service (Node.js)
- Order Worker (Python)
- Notification Service (Node.js)
- Frontend (React PWA)

### Servicios de Infraestructura: **3**
- PostgreSQL (Base de datos)
- RabbitMQ (Message Broker)
- Keycloak (Identity Provider)

### Total de Servicios: **8**

### Bases de Datos: **2 esquemas**
- `db_catalog`: Eventos y asientos
- `db_orders`: Órdenes de compra

### Colas RabbitMQ: **2 principales**
- `orders_queue`
- `notifications_queue`

---

## 🚀 Escalabilidad en Kubernetes

Con el setup de Kubernetes (archivos en `k8s/`), la arquitectura escala así:

```
┌─────────────────────────────────────────────────────┐
│        Kubernetes Cluster (k8s/)                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐   │
│  │ API Gateway │  │  Catalog    │  │  Order   │   │
│  │ (replicas)  │  │  Service    │  │  Worker  │   │
│  │   HPA: ✓    │  │  (replicas) │  │ (replicas)   │
│  │   PVC: -    │  │   HPA: ✓    │  │   HPA: ✓     │
│  │             │  │   PVC: -    │  │   PVC: -     │
│  └─────────────┘  └─────────────┘  └──────────┘   │
│                                                     │
│  ┌─────────────┐  ┌──────────────────────────────┐ │
│  │Notification │  │   PostgreSQL StatefulSet     │ │
│  │  Service    │  │   • PVC: persistent_volume  │ │
│  │  (replicas) │  │   • Replication: 1          │ │
│  │   HPA: ✓    │  │                             │ │
│  │   PVC: -    │  └──────────────────────────────┘ │
│  └─────────────┘                                   │
│                                                     │
│  ┌─────────────────────────────────────────────────┤
│  │  RabbitMQ StatefulSet + Storage + Service       │
│  │  • Management: 15672                            │
│  │  • AMQP: 5672                                   │
│  └─────────────────────────────────────────────────┘
│                                                     │
│  ┌─────────────────────────────────────────────────┤
│  │  Keycloak Deployment + PostgreSQL (embedded)    │
│  └─────────────────────────────────────────────────┘
│                                                     │
└─────────────────────────────────────────────────────┘

HPA = Horizontal Pod Autoscaler (auto-scaling)
PVC = PersistentVolumeClaim (almacenamiento)
```

---

## 📈 Matriz de Comunicación

| De → | A | Protocolo | Síncrono | Crítico |
|------|---|-----------|----------|---------|
| Frontend | API Gateway | HTTP/REST | ✅ Sí | ✅ Sí |
| API Gateway | Catalog Service | gRPC | ✅ Sí | ✅ Sí |
| API Gateway | RabbitMQ | AMQP | ❌ No | ✅ Sí |
| Order Worker | Catalog Service | gRPC | ✅ Sí | ✅ Sí |
| Order Worker | PostgreSQL | TCP | ✅ Sí | ✅ Sí |
| Order Worker | RabbitMQ | AMQP | ❌ No | ✅ Sí |
| Notification Service | RabbitMQ | AMQP | ❌ No | ❌ No |
| Frontend | Notification Service | WebSocket | ❌ No | ❌ No |
| Catalog Service | PostgreSQL | TCP | ✅ Sí | ✅ Sí |

---

## 🔍 Health Checks

Todos los servicios implementan health checks:

```
GET /health → { status: 'ok', service: 'service-name', timestamp: '...' }
```

Kubernetes verifica:
- **Readiness Probe**: ¿Está listo para recibir tráfico?
- **Liveness Probe**: ¿Está el servicio vivo o necesita reinicio?

---

## 📝 Notas Importantes

1. **Database per Service Pattern**: Aunque ambos usan PostgreSQL, hay 2 esquemas separados (`db_catalog`, `db_orders`) para mantener responsabilidades claras.

2. **Async Processing**: Las órdenes se procesan asincronicamente vía RabbitMQ para no bloquear el frontend.

3. **Real-time Notifications**: Socket.io permite notificaciones en tiempo real sin polling.

4. **gRPC Communication**: Catalog Service expone un servidor gRPC para consultas de bajo latency.

5. **Offline-first Frontend**: PWA puede funcionar sin conexión a internet usando IndexedDB.

6. **Security**: 
   - JWT desde Keycloak
   - Validación centralizada en API Gateway
   - HTTPS en producción (Cloudflare Tunnel)

7. **Monitoreo**: 
   - Logs centralizados en k8s
   - Métricas con Prometheus (si está habilitado)
   - RabbitMQ Management UI para debugging

---

## 🎯 Flujo de Compra de Entrada (Caso de Uso Principal)

```
1. Usuario selecciona evento y asientos en Frontend
                    ↓
2. Frontend → API Gateway: POST /api/orders
                    ↓
3. API Gateway → Catalog Service (gRPC): ReserveSeats()
   • Valida disponibilidad
   • Bloquea asientos por 10 minutos
                    ↓
4. API Gateway → RabbitMQ: Publica en orders_queue
                    ↓
5. Order Worker consume de orders_queue
                    ↓
6. Order Worker → Catalog Service (gRPC): CommitSeats()
   • Confirma la compra
                    ↓
7. Order Worker procesa:
   • Genera código QR
   • Guarda en PostgreSQL (db_orders)
   • Calcula total, impuestos, etc.
                    ↓
8. Order Worker → RabbitMQ: Publica en notifications_queue
                    ↓
9. Notification Service consume de notifications_queue
                    ↓
10. Notification Service → Frontend (WebSocket)
    • Notifica al usuario que su orden está lista
    • Envía detalles y QR
                    ↓
11. Frontend muestra confirmación y QR descargable
```

---

## 📋 Checklist de Servicios

- [x] API Gateway (3000) - Express.js
- [x] Catalog Service (3001) - Express.js + gRPC
- [x] Order Worker (8000) - Python
- [x] Notification Service (4000) - Express.js + Socket.io
- [x] Frontend (5173) - React PWA
- [x] PostgreSQL (5432) - 2 esquemas
- [x] RabbitMQ (5672/15672) - Message Broker
- [x] Keycloak (8080) - Identity Provider
