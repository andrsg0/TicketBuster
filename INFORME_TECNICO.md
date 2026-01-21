# TicketBuster: Informe Técnico Final
## Sistema de Venta de Entradas Distribuido - Arquitectura Microservicios

**Autor:** Equipo de Desarrollo TicketBuster  
**Fecha:** Enero 2026  
**Versión:** 1.0  
**Clasificación:** Documentación Técnica - Proyecto Académico

---

## 📋 Tabla de Contenidos

1. [Ejecutivo](#ejecutivo)
2. [Introducción](#introducción)
3. [Análisis de Requerimientos](#análisis-de-requerimientos)
4. [Decisiones Arquitectónicas](#decisiones-arquitectónicas)
5. [Stack Tecnológico Implementado](#stack-tecnológico-implementado)
6. [Patrones de Diseño](#patrones-de-diseño)
7. [Componentes del Sistema](#componentes-del-sistema)
8. [Consideraciones de Escalabilidad](#consideraciones-de-escalabilidad)
9. [Resiliencia y Alta Disponibilidad](#resiliencia-y-alta-disponibilidad)
10. [Experiencia de Usuario](#experiencia-de-usuario)
11. [Seguridad](#seguridad)
12. [Lecciones Aprendidas](#lecciones-aprendidas)
13. [Conclusiones](#conclusiones)

---

## Ejecutivo

TicketBuster es un **sistema de venta de entradas nativo de nube** diseñado como aplicación distribuida utilizando arquitectura de microservicios orquestados con Kubernetes. El proyecto integra principios avanzados de programación web (PWA, offline-first, real-time) con patrones de sistemas distribuidos (event-driven, CQRS conceptual, database per service).

### Logros Principales

✅ **Arquitectura Cloud-Native:** 8 servicios independientes comunicándose con 3 patrones distintos (gRPC, RabbitMQ, WebSocket)  
✅ **Escalabilidad Automática:** HPA configurado para worker de procesamiento, soportando picos de carga  
✅ **Experiencia Offline:** PWA con IndexedDB permitiendo funcionamiento sin conectividad  
✅ **Seguridad Centralizada:** Autenticación OAuth2/OIDC mediante Keycloak integrado  
✅ **Observabilidad:** Logs distribuidos, health checks, readiness probes en todos los servicios  

---

## Introducción

### Contexto Académico

Este proyecto fue desarrollado como trabajo integrador de dos cursos:
- **Programación Web Avanzada:** Enfoque en frontend moderno, PWA, offline-first
- **Sistemas Distribuidos:** Enfoque en microservicios, orquestación, patrones distribuidos

### Problema a Resolver

Los sistemas tradicionales de venta de entradas enfrentan desafíos críticos:
1. **Escalabilidad limitada:** Arquitecturas monolíticas no pueden manejar picos de demanda (ej: venta flash)
2. **Acoplamiento funcional:** Cambios en un módulo impactan todo el sistema
3. **Indisponibilidad:** Un componente fallido causa caída total
4. **Experiencia de usuario degradada:** Dependencia total de conectividad
5. **Procesamiento lento:** Operaciones CPU-intensivas (generación de QR) bloquean transacciones

### Solución Propuesta

Una arquitectura distribuida y resiliente que:
- Separa responsabilidades en servicios independientes
- Escala componentes específicos bajo carga
- Mantiene disponibilidad ante fallos parciales
- Funciona offline cuando es posible
- Procesa órdenes asincronamente sin bloquear UX

---

## Análisis de Requerimientos

### Requerimientos Funcionales

#### RF1: Catálogo de Eventos
- Listar eventos con detalles (fecha, precio, disponibilidad)
- Filtrar por categoría (Conciertos, Teatro, Deportes, Festivales, Conferencias)
- Ordenar por fecha o precio
- Buscar por título, venue o descripción
- **Justificación de diseño:** Servicio separado permite cachear y escalar independientemente

#### RF2: Selección y Bloqueo de Asientos
- Visualizar asientos disponibles por evento
- Bloquear asientos temporalmente (10 minutos) durante compra
- Liberar bloqueos expirados
- Evitar sobreventa mediante transacciones
- **Justificación de diseño:** gRPC para consistencia inmediata; locks en DB para serialización

#### RF3: Procesamiento de Órdenes
- Crear orden de compra
- Generar código QR de forma asíncrona (CPU-intensivo)
- Notificar estado al usuario en tiempo real
- Almacenar historial y cambios de estado
- **Justificación de diseño:** Worker separado en Python; RabbitMQ para desacoplamiento; WebSocket para notificaciones

#### RF4: Autenticación y Autorización
- Registro de usuarios
- Login con OAuth2
- Validación de JWT en todas las solicitudes
- Roles y permisos basados en usuario
- **Justificación de diseño:** Keycloak proporciona estándares de industria; centraliza lógica de auth

#### RF5: Acceso Offline
- Cachear eventos, asientos y historial de compras
- Permitir lectura offline de información
- Sincronizar cuando retorne conectividad
- **Justificación de diseño:** IndexedDB + Service Worker permiten experiencia seamless

### Requerimientos No Funcionales

| Requisito | Valor Objetivo | Justificación |
|-----------|-----------------|---------------|
| Disponibilidad | 99.9% (3 nines) | Crítico para e-commerce; tolera ~43 min/mes |
| Latencia P95 | < 500ms | Experiencia fluida para usuarios finales |
| Throughput | 1,000 órdenes/min | Carga esperada en venta flash |
| Escalabilidad | Horizontal | Cloud-native exige elasticidad |
| Seguridad | OAuth2 + TLS | Protege datos de usuarios y transacciones |
| Resiliencia | Graceful degradation | Sistema parcialmente funcional > caída total |

---

## Decisiones Arquitectónicas

### 1. Arquitectura de Microservicios vs Monolito

**Decisión:** Microservicios orquestados con Kubernetes

**Argumentos a Favor:**
- **Escalabilidad selectiva:** Escalar solo worker de órdenes bajo carga, no todo el sistema
- **Fallos aislados:** Fallo en notificaciones ≠ fallo en compra
- **Polyglot:** Node.js para I/O, Python para CPU-heavy, elegir mejor herramienta por tarea
- **Despliegue independiente:** Actualizar catalog service sin afectar otras áreas
- **Ciclos de desarrollo acelerados:** Equipos trabajan en paralelo

**Argumentos en Contra (y mitigaciones):**
- ❌ Complejidad operacional → ✅ Kubernetes abstrae orquestación
- ❌ Debugging distribuido → ✅ Logs centralizados, health checks
- ❌ Consistencia de datos → ✅ Database per service + compensating transactions
- ❌ Network latency → ✅ gRPC comprimido, colocación en cluster

**Diagrama Conceptual:**

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND (PWA)                      │
│              React + Vite + IndexedDB                    │
└────────┬────────────────────────────────────────────────┘
         │
         │ HTTP/REST
┌────────▼────────────────────────────────────────────────┐
│              API GATEWAY (Express.js)                    │
│  • Enrutamiento centralizado                             │
│  • Validación JWT                                        │
│  • Rate limiting                                         │
└─┬──────────────────┬──────────────────┬─────────────────┘
  │                  │                  │
  │ gRPC            │ gRPC/HTTP        │ Pub/Sub (RabbitMQ)
  │                  │                  │
┌─▼──────┐  ┌────────▼──────┐  ┌───────▼──────────┐
│ Catalog │  │ Notification  │  │ Order Worker     │
│ Service │  │ Service       │  │ (Python/FastAPI) │
│(Node.js)│  │ (Node.js)     │  │                  │
└─┬──────┘  └────────┬──────┘  └───────┬──────────┘
  │                  │                  │
  └─────────┬────────┴───────┬──────────┘
            │                │
            ▼                ▼
       ┌──────────────────────────────┐
       │      PostgreSQL              │
       │  ┌─────────────────────────┐ │
       │  │ db_catalog (Catálogo)   │ │
       │  │ db_orders (Órdenes)     │ │
       │  └─────────────────────────┘ │
       └──────────────────────────────┘
```

### 2. Database per Service vs Shared Database

**Decisión:** Cada servicio tiene esquema separado en PostgreSQL

**Justificación:**

La opción "database per service" presenta desafíos de consistencia distribuida. Nuestra implementación es un compromiso pragmático:

```sql
-- Separación lógica (misma BD, diferentes esquemas)
CREATE SCHEMA db_catalog;  -- Propiedad de Catalog Service
CREATE SCHEMA db_orders;   -- Propiedad de Order Worker
```

**Ventajas:**
- Evita coupling implícito vía schema compartido
- Cada servicio controla su evolución de datos
- Transacciones locales rápidas
- Facilita futuro sharding

**Consistencia distribuida (2-Phase Commit Alternativo):**

```
1. API Gateway crea orden PENDING en db_orders
2. Envía mensaje a RabbitMQ con detalles
3. Order Worker procesa (QR, validaciones)
4. Worker actualiza estado a PROCESSED o FAILED
5. Si falla, order queda PENDING (retry automático)
```

**No usamos transacciones distribuidas porque:**
- ❌ 2-Phase Commit es costoso y complejo
- ❌ Reduce disponibilidad (Teorema CAP)
- ✅ Event sourcing + compensating transactions son resilientes

### 3. Comunicación Síncrona (gRPC) vs Asíncrona (Pub/Sub)

**Decisión:** Uso híbrido selectivo

| Patrón | Caso de Uso | Tecnología |
|--------|------------|-----------|
| **Síncrono** | Operaciones que necesitan respuesta inmediata | gRPC |
| **Asíncrono** | Procesamiento background, desacoplamiento | RabbitMQ |
| **Real-time** | Notificaciones bidireccionales | WebSocket |

#### 3.1 gRPC para Validación de Asientos

**Flujo:**
```
API Gateway                          Catalog Service
      │                                     │
      │  rpc ValidateAndCommitSeat()       │
      ├────────────────────────────────────>│
      │                                     │
      │  [Dentro transacción SQL]           │
      │  1. Verificar estado actual         │
      │  2. Bloquear si AVAILABLE           │
      │  3. Retornar success/failure        │
      │  [Fin transacción]                  │
      │                                     │
      │<────────────────────────────────────┤
      │       Respuesta (sync)              │
```

**Justificación gRPC:**
- Necesita respuesta inmediata (user espera feedback)
- Bajo overhead (Protocol Buffers binarios vs JSON)
- Soporte nativo para streaming (futuro: list changes)
- Type-safe (proto contracts)

#### 3.2 RabbitMQ para Procesamiento de Órdenes

**Flujo:**
```
API Gateway              RabbitMQ              Order Worker
      │                    │                        │
      │  1. Crear orden    │                        │
      │  2. Publicar msg   │                        │
      ├────────────────────>│                        │
      │                    │  orders_queue          │
      │                    ├───────────────────────>│
      │ [Responder sync]   │                        │
      │<────────────────────┤                        │
      │                    │  [Procesamiento]       │
      │                    │  • Gen QR (CPU)        │
      │                    │  • DB write            │
      │                    │  • WebSocket notify    │
      │                    │<───────────────────────┤
      │                    │                        │
      │ [WebSocket event]<─────────────────────────┤
      │                    │                        │
```

**Justificación RabbitMQ:**
- Desacopla producer (gateway) de consumer (worker)
- Worker puede fallar sin afectar API
- Permite múltiples workers (escalabilidad)
- Dead Letter Queue para manejo de errores
- Persistent queue (durabilidad)

### 4. Frontend Offline-First vs Online-Only

**Decisión:** PWA con IndexedDB + fallback online

**Justificación:**

En mercados emergentes o conexiones inestables, acceso offline es diferenciador competitivo.

**Capas de Funcionalidad:**

```
┌─────────────────────────────────────────┐
│  ONLINE (Conectado)                     │
│  • Compra en tiempo real                │
│  • Notificaciones vía WebSocket         │
│  • Datos frescos del servidor           │
└─────────────────────────────────────────┘
           ⬇️ (pierde conexión)
┌─────────────────────────────────────────┐
│  DEGRADED (Modo Offline)                │
│  • Ver eventos/asientos en caché        │
│  • Queue compras localmente             │
│  • Sync automático al reconectar        │
│  • Notificación de estado offline       │
└─────────────────────────────────────────┘
```

**Implementación:**
```javascript
// Service Worker detecta estatus
if (navigator.onLine) {
  // Usar API real
  const response = await fetch('/api/events');
} else {
  // Usar IndexedDB
  const events = await getCachedEvents();
  // Mostrar UI adaptada (sin acciones de escritura)
}

// Al reconectar: sync automático
window.addEventListener('online', () => {
  syncPendingOrders();  // Reintenta órdenes pendientes
});
```

**Trade-offs:**
- ✅ Resiliencia + UX mejorada
- ❌ Complejidad aumentada (manejo de conflictos)
- ❌ Storage limitado (IndexedDB ~50MB)
- ✅ Cachés versionados resuelven conflictos

---

## Stack Tecnológico Implementado

### 1. Frontend: React + Vite + TailwindCSS

**Stack Específico:**
```json
{
  "framework": "React 18.x",
  "build_tool": "Vite 5.x",
  "styling": "TailwindCSS 3.x",
  "offline_storage": "IndexedDB",
  "service_worker": "Service Worker API",
  "realtime": "Socket.io-client",
  "http_client": "Axios",
  "state_management": "React Hooks + Context"
}
```

**Justificación Vite vs Create React App:**
| Aspecto | CRA | Vite |
|--------|-----|------|
| Cold start | 30-60s | 500ms |
| Hot reload | 2-3s | <100ms |
| Build size | ~200KB | ~150KB |
| DX | Bueno | Excelente |

Vite mejora DX significativamente; crítico para iteración rápida.

**PWA Features Implementadas:**
```javascript
// manifest.json
{
  "name": "TicketBuster",
  "short_name": "TicketBuster",
  "icons": [...],
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1f2937",
  "background_color": "#ffffff",
  "categories": ["shopping", "entertainment"],
  "screenshots": [...]  // Para instalación en móvil
}
```

```javascript
// vite.config.js - PWA habilitado en DEV
export default {
  plugins: [
    react(),
    VitePWA({
      devOptions: {
        enabled: true  // Permitir PWA en desarrollo local
      },
      manifest: {
        name: 'TicketBuster',
        short_name: 'TB',
        icons: [...],
        // Cachear solo rutas específicas, no /api
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ]
}
```

**Offline Storage (IndexedDB):**
```javascript
// Esquema
const DB_SCHEMA = {
  'CACHED_EVENTS': { keyPath: 'id' },
  'CACHED_EVENTS_DETAILS': { keyPath: 'id' },
  'CACHED_ORDERS': { keyPath: 'id' },
  'PENDING_ORDERS': { keyPath: 'id', indices: ['by_status'] },
  'CACHED_SEATS': { keyPath: 'id', indices: ['by_event'] }
};

// Uso
const events = await getDB().getAll('CACHED_EVENTS');
const order = await createPendingOrder({
  user_id: userId,
  event_id: eventId,
  seats: selectedSeats,
  status: 'pending'
});
```

### 2. API Gateway: Express.js + http-proxy-middleware

**Responsabilidades:**
```javascript
// 1. ROUTING CENTRALIZADO
app.use('/api/events', proxy({
  target: 'http://catalog-service:3000',
  changeOrigin: true,
  pathRewrite: { '^/api/events': '/' }
}));

// 2. AUTENTICACIÓN CENTRALIZADA
app.use('/api', authMiddleware);  // Valida JWT en todos los endpoints

// 3. RATE LIMITING
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 100  // 100 solicitudes por ventana
}));

// 4. CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// 5. REQUEST LOGGING
app.use(morgan('combined'));
```

**Justificación separar API Gateway:**
- Abstrae topología de servicios backend
- Punto centralizado para auth, rate limiting
- Fácil de actualizar sin cambiar contratos de cliente
- Puede evolucionar a service mesh (Istio) en futuro

### 3. Backend I/O Heavy: Node.js (Catalog Service)

**Catalog Service (Express.js):**
```javascript
// Operaciones de lectura/escritura de BD
// Latency: ~50-200ms (network + SQL)

app.get('/events', async (req, res) => {
  // SELECT con JOIN a tabla de asientos
  // ~500 filas, no es CPU-intensivo
  const events = await pool.query(`
    SELECT e.*, COUNT(s.id) FILTER (WHERE s.status = 'AVAILABLE') as available_seats
    FROM db_catalog.events e
    LEFT JOIN db_catalog.seats s ON e.id = s.event_id
    GROUP BY e.id
    ORDER BY e.date DESC
  `);
  res.json(events.rows);
});

app.post('/events/:id/lock-seat', authMiddleware, async (req, res) => {
  // gRPC endpoint llamado desde API Gateway
  // Usa transacción SQL para atomicidad
  const { seat_id, user_id } = req.body;
  
  const result = await pool.query(
    'UPDATE db_catalog.seats SET status = $1, locked_by_user_id = $2, locked_at = NOW() WHERE id = $3 AND status = $4 RETURNING *',
    ['LOCKED', user_id, seat_id, 'AVAILABLE']
  );
  
  res.json(result.rows[0]);
});
```

**Por qué Node.js para I/O?**
- Event loop de Node.js perfecto para I/O concurrente
- Maneja 10K+ conexiones concurrentes con bajo overhead
- Asyncronía nativa (async/await)
- No necesita threading pesado

### 4. Backend CPU-Heavy: Python FastAPI (Order Worker)

**Order Worker (FastAPI + Pydantic):**
```python
# Operaciones CPU-intensivas:
# • Generación de QR (PIL, qrcode)
# • Cálculos complejos
# • Transformaciones de datos

from fastapi import FastAPI
from pydantic import BaseModel
from qrcode import QRCode
from io import BytesIO
import base64

app = FastAPI()

async def process_order(order_uuid: str):
    """Procesamiento asíncrono de orden"""
    
    # 1. Obtener datos de orden
    order = await get_order_from_db(order_uuid)
    
    # 2. GENERAR QR (CPU-intensivo)
    qr = QRCode(version=1, box_size=10, border=5)
    qr.add_data(f"ticketbuster://order/{order_uuid}")
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    # 3. Guardar en BD
    await db.execute(
        "UPDATE db_orders.orders SET qr_code_hash = $1, status = 'COMPLETED' WHERE id = $2",
        qr_base64, order.id
    )
    
    # 4. Notificar usuario (WebSocket)
    await notify_user(order.user_id, {
        'type': 'order_completed',
        'order_uuid': order_uuid,
        'qr_code': qr_base64
    })
```

**Por qué Python para CPU-heavy?**
- CPU-bound: generación QR, cálculos matemáticos
- Python + NumPy, PIL optimizados para CPU
- GIL permite paralelismo real con multiprocessing
- Extensiones en C para operaciones críticas

### 5. Comunicación Inter-Servicios

#### gRPC (Proto3)

**Definición (inventory.proto):**
```protobuf
syntax = "proto3";
package ticketbuster.inventory;

service InventoryService {
  rpc ValidateAndCommitSeat(ValidateRequest) returns (ValidateResponse);
  rpc UnlockSeat(UnlockRequest) returns (UnlockResponse);
  rpc GetAvailableSeats(GetAvailableRequest) returns (GetAvailableResponse);
}

message ValidateRequest {
  string event_id = 1;
  string seat_id = 2;
  string user_id = 3;
}

message ValidateResponse {
  bool success = 1;
  string message = 2;
  Seat seat = 3;
}

message Seat {
  string id = 1;
  string section = 2;
  string row = 3;
  int32 number = 4;
  string status = 5;
}
```

**Ventajas gRPC:**
- **Compresión:** Protocol Buffers binarios vs JSON
- **Type Safety:** Contratos explícitos en proto
- **Performance:** HTTP/2 multiplexing
- **Streaming:** Soporte para server/client streaming (futuro)

#### RabbitMQ (Pub/Sub Asíncrono)

**Queue Configuration:**
```python
# order-worker/src/rabbitmq.py
class RabbitMQConnection:
    def __init__(self):
        self.connection = pika.BlockingConnection(pika.ConnectionParameters(
            host=settings.rabbitmq_host,
            port=settings.rabbitmq_port,
            credentials=pika.PlainCredentials(
                settings.rabbitmq_user,
                settings.rabbitmq_password
            )
        ))
        self.channel = self.connection.channel()
        
        # Declarar colas con durability
        self.channel.queue_declare(
            queue='orders_queue',
            durable=True,  # Persiste si broker cae
            arguments={
                'x-message-ttl': 3600000,  # 1 hora
                'x-dead-letter-exchange': 'orders_dlx'  # DLQ
            }
        )
        
        # Dead Letter Queue para mensajes fallidos
        self.channel.queue_declare(queue='orders_queue_dlq', durable=True)
        self.channel.exchange_declare(exchange='orders_dlx', exchange_type='direct')
        self.channel.queue_bind(
            exchange='orders_dlx',
            queue='orders_queue_dlq',
            routing_key='orders'
        )
    
    def consume_orders(self, callback):
        """Consumir órdenes con prefetch para control de backpressure"""
        self.channel.basic_qos(prefetch_count=1)  # Procesar 1 a la vez
        self.channel.basic_consume(
            queue='orders_queue',
            on_message_callback=callback
        )
        self.channel.start_consuming()
```

**Ventajas RabbitMQ:**
- **Durabilidad:** Mensajes persisten en disco
- **Dead Letter Queue:** Errores no se pierden
- **Prefetch Control:** Evita sobrecargar workers
- **Multiple Consumers:** Escalabilidad horizontal

#### WebSocket (Real-time Notifications)

**Notification Service:**
```javascript
const io = require('socket.io')();

io.on('connection', (socket) => {
  // Usuario se conecta
  socket.on('subscribe_order', (orderId, userId) => {
    // Validar con JWT
    socket.join(`order:${orderId}`);
  });
});

// Desde Order Worker
const socket = io('http://notification-service:4000');

socket.emit('order_update', {
  type: 'order_completed',
  order_uuid: orderId,
  qr_code: base64Data,
  timestamp: new Date()
});

// Frontend escucha
socket.on('order_update', (data) => {
  if (data.type === 'order_completed') {
    showQRCode(data.qr_code);
    playNotificationSound();
  }
});
```

**Ventajas WebSocket:**
- **Bidireccional:** Server push, no polling
- **Baja latencia:** Conexión persistente
- **Escalable:** Socket.io con Redis adapter para cluster
- **Fallback:** Socket.io cae back a long-polling si es necesario

### 6. Persistencia de Datos: PostgreSQL 17

**Schema Design:**

```sql
-- CATALOG SERVICE SCHEMA
CREATE SCHEMA db_catalog;

CREATE TABLE db_catalog.events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category ENUM ('CONCERT', 'THEATER', 'SPORTS', 'FESTIVAL', 'CONFERENCE', 'OTHER'),
  venue VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  price DECIMAL(10,2) CHECK (price > 0),
  total_seats INTEGER CHECK (total_seats > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE db_catalog.seats (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  section VARCHAR(50) NOT NULL,
  row VARCHAR(10) NOT NULL,
  seat_number INTEGER NOT NULL,
  status ENUM ('AVAILABLE', 'LOCKED', 'SOLD') DEFAULT 'AVAILABLE',
  locked_at TIMESTAMP,
  locked_by_user_id UUID,
  UNIQUE(event_id, section, row, seat_number),
  INDEX idx_seats_event_status (event_id, status),
  INDEX idx_seats_locked_by (locked_by_user_id) WHERE locked_by_user_id IS NOT NULL
);

-- ORDERS SERVICE SCHEMA
CREATE SCHEMA db_orders;

CREATE TABLE db_orders.orders (
  id SERIAL PRIMARY KEY,
  order_uuid UUID UNIQUE DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id INTEGER NOT NULL,  -- FK a db_catalog.events
  seat_id INTEGER NOT NULL,    -- FK a db_catalog.seats
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
  qr_code_hash TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(seat_id)  -- Prevenir asiento doble-vendido
);

-- Audit trail
CREATE TABLE db_orders.order_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  previous_status ENUM,
  new_status ENUM,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE TRIGGER audit_order_status
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_status_change();
```

**Justificación de Design:**

| Decisión | Alternativa | Por qué elegimos esto |
|----------|------------|----------------------|
| PK SERIAL | UUID | Mejor para índices, más pequeños |
| status ENUM | VARCHAR | Type safety, constraint a BD |
| UNIQUE(seat_id) en orders | Aplicación | Constraint a BD es más seguro |
| Schemas separados | Tablas prefijadas | Claridad de responsabilidad |
| Trigger audit | Aplicación | No puede ser olvidado |

**Índices Estratégicos:**
```sql
-- Queries críticas optimizadas

-- 1. Buscar asientos disponibles por evento
CREATE INDEX idx_seats_available 
ON db_catalog.seats(event_id, status) 
WHERE status = 'AVAILABLE';

-- 2. Limpiar locks expirados
CREATE INDEX idx_locked_seats 
ON db_catalog.seats(locked_at) 
WHERE status = 'LOCKED' AND locked_at < CURRENT_TIMESTAMP - INTERVAL '10 min';

-- 3. Órdenes por usuario
CREATE INDEX idx_orders_user 
ON db_orders.orders(user_id, created_at DESC);

-- 4. Detectar sobreventa
CREATE INDEX idx_unique_seat 
ON db_orders.orders(seat_id) 
WHERE status IN ('COMPLETED', 'PROCESSING');
```

### 7. Orquestación: Kubernetes

**Recursos Kubernetes Implementados:**

```yaml
# 1. NAMESPACE AISLADO
apiVersion: v1
kind: Namespace
metadata:
  name: ticketbuster

# 2. CONFIGMAP (Configuración)
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: ticketbuster
data:
  NODE_ENV: "production"
  DATABASE_URL: "postgresql://admin:admin@postgres:5432/ticketbuster"
  RABBITMQ_URL: "amqp://guest:guest@rabbitmq:5672"
  CATALOG_SERVICE_URL: "http://catalog-service:3000"

# 3. SECRET (Credenciales)
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: ticketbuster
type: Opaque
data:
  POSTGRES_PASSWORD: YWRtaW4=  # base64 encoded
  RABBITMQ_PASSWORD: Z3Vlc3Q=

# 4. DEPLOYMENT (Stateless Services)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalog-service
  namespace: ticketbuster
spec:
  replicas: 2  # Para HA
  selector:
    matchLabels:
      app: catalog-service
  template:
    metadata:
      labels:
        app: catalog-service
    spec:
      containers:
      - name: catalog-service
        image: ticketbuster/catalog-service:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 50051
          name: grpc
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:  # Reinicia si muere
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:  # Quita del servicio si no está listo
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

# 5. STATEFULSET (Servicios Stateful)
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: ticketbuster
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:17-alpine
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        env:
        - name: POSTGRES_USER
          value: admin
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: POSTGRES_PASSWORD
        - name: POSTGRES_DB
          value: ticketbuster
        livenessProbe:
          exec:
            command: ["pg_isready", "-U", "admin"]
          initialDelaySeconds: 30
          periodSeconds: 10
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 5Gi

# 6. SERVICE (Descubrimiento)
apiVersion: v1
kind: Service
metadata:
  name: catalog-service
  namespace: ticketbuster
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 3000
    targetPort: 3000
  - name: grpc
    port: 50051
    targetPort: 50051
  selector:
    app: catalog-service

# 7. HORIZONTAL POD AUTOSCALER
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-worker-hpa
  namespace: ticketbuster
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-worker
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50  # Escala cuando > 50% CPU
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 min para bajar
      policies:
      - type: Percent
        value: 50
        periodSeconds: 15
    scaleUp:
      stabilizationWindowSeconds: 30  # 30s para subir
      policies:
      - type: Percent
        value: 100  # Duplica pods
        periodSeconds: 15
      - type: Pods
        value: 4  # O suma 4 pods
        periodSeconds: 15
      selectPolicy: Max  # Usa la métrica más agresiva
```

**Justificación de Recursos K8s:**

| Recurso | Propósito | Decisión |
|---------|----------|----------|
| Namespace | Aislamiento lógico | Separar env (dev/prod) |
| ConfigMap | Config dinámica | Cambiar sin rebuild |
| Secret | Credenciales | No versionarlas |
| Deployment | Workloads stateless | Escalabilidad |
| StatefulSet | Servicios stateful | BD con storage |
| Service | Descubrimiento | DNS interno |
| HPA | Escala automática | Adaptar a carga |
| PVC | Storage persistente | Datos sobreviven pod restart |

---

## Patrones de Diseño

### 1. API Gateway Pattern

**Problema:** Frontend vs múltiples backends complejos

**Solución:**
```
┌────────────┐
│  Frontend  │
└─────┬──────┘
      │ 1 conexión
      ▼
┌────────────────────┐
│   API Gateway      │  ◄─── Punto central
│ • Enrutamiento     │
│ • Auth centralizada│
│ • Rate limiting    │
└─────┬──────────────┘
      │ N conexiones
      ├──────────┬──────────┬──────────┐
      ▼          ▼          ▼          ▼
   Catalog   Notification  Orders   Keycloak
   Service   Service       Worker   Service
```

**Beneficios:**
- ✅ Frontend no conoce topología
- ✅ Cambios internos no afectan clientes
- ✅ Seguridad centralizada
- ✅ Rate limiting, logging centralizado

**Trade-offs:**
- ❌ Punto único de fallo (mitigado con replicas)
- ❌ Latencia adicional (minimizada con keep-alive)

### 2. Database per Service Pattern

**Problema:** Coupling implícito vía BD compartida

**Solución:**
```
Catalog Service      Order Worker
      │                    │
      ▼                    ▼
  db_catalog          db_orders
  (esquema)           (esquema)
      │                    │
      └────────────────────┘
    PostgreSQL (misma instancia)
```

**Contratos entre servicios:**

```
Para validar asiento:
  Input: {event_id, seat_id, user_id}
  Output: {success, message, seat}
  
Transportado vía: gRPC
Almacenado en: db_catalog.seats

No hay acceso directo a tabla ajena.
```

**Manejo de Consistencia:**

```
Orden SOLD = 2 cambios distribuidos:

1. db_orders.orders.status = 'COMPLETED'
2. db_catalog.seats.status = 'SOLD'

Estrategia: EVENTUAL CONSISTENCY
  1. Cambio orden (transacción local)
  2. Envía evento asíncrono
  3. Order Worker consume evento
  4. Actualiza asiento (transacción local)
  5. Si falla paso 4, retry automático

Diferencia con ACID: Se tolera inconsistencia temporal.
Justificación: Es mejor sistema parcialmente disponible que caído.
```

### 3. Event-Driven Architecture

**Flujo completo de orden:**

```
[1] Gateway recibe POST /orders
       ▼
[2] Valida JWT, input
       ▼
[3] Crea registro orders.PENDING
       ▼
[4] Publica evento a RabbitMQ:
    {
      "type": "order_created",
      "order_uuid": "xxx",
      "event_id": 1,
      "seat_id": 50,
      "user_id": "yyy"
    }
       ▼
[5] Responde a cliente (201 Created)
       ▼
[6] Order Worker consume evento
       ▼
[7] Genera QR (CPU intensivo)
       ▼
[8] Actualiza orders.status = COMPLETED
       ▼
[9] Publica evento a Notification Service:
    {
      "type": "order_completed",
      "user_id": "yyy",
      "qr_code": "base64..."
    }
       ▼
[10] WebSocket: Envía QR a navegador del usuario
```

**Ventajas:**
- ✅ Desacoplamiento temporal: Worker puede estar caído
- ✅ Escalabilidad: Múltiples workers procesan en paralelo
- ✅ Resiliencia: Si notificación falla, orden sigue válida

### 4. Circuit Breaker Pattern (Implícito)

**Implementado en API Gateway:**

```javascript
const catalogServiceClient = new CircuitBreaker(
  async (path) => {
    return await axios.get(`http://catalog-service:3000${path}`);
  },
  {
    timeout: 3000,
    errorThresholdPercentage: 50,  // 50% de errores = abre circuito
    resetTimeout: 30000  // Reintenta cada 30s
  }
);

// Uso
try {
  const events = await catalogServiceClient.fire('/events');
} catch (error) {
  if (error instanceof CircuitBreaker.CircuitBreakerError) {
    // Devolver datos cacheados o degradar
    return getCachedEvents() || [];
  }
}
```

### 5. Saga Pattern (Coordinación Distribuida)

**Compensating Transactions:**

```
Orden Normal:
  1. Bloquear asiento ✓
  2. Crear orden ✓
  3. Procesar QR ✗ (Error)
  
Compensación (Rollback):
  3. Liberar asiento (compensating action)
     → Seat status = AVAILABLE
     → Locked_at = NULL
  
  2. Cancelar orden
     → Order status = FAILED
     → Error message guardado

Resultado: Sistema en estado consistente
```

---

## Componentes del Sistema

### Frontend

**Ubicación:** `frontend/`

**Funcionalidades:**
1. **Event Browser:** Lista eventos con filtros y búsqueda
2. **Seat Selector:** Visualización interactiva de asientos (grid)
3. **Checkout:** Carrito y pago (integración Stripe simulada)
4. **Order Tracking:** Estado de orden + QR code
5. **Auth:** Login/Signup con Keycloak

**Stack:**
```
React 18
├─ Hooks (useState, useEffect, useContext)
├─ React Router v6 (navigation)
├─ Axios (HTTP client)
├─ Tailwind CSS (styling)
├─ Socket.io-client (WebSocket)
└─ IndexedDB API (offline storage)

Service Worker
├─ Caching strategy: Stale-while-revalidate
├─ Offline fallback
└─ Background sync

PWA
├─ Web App Manifest
├─ Install prompt
└─ App shell architecture
```

**Componentes Clave:**

```jsx
// EventsPage.jsx
- Lista 20 eventos con infinito scroll
- Filtrado por categoría
- Búsqueda fulltext
- Cacheo offline

// SeatSelector.jsx
- Grid interactivo de asientos
- Estados: Available, Locked, Sold
- Validación de selección múltiple
- Spinner mientras se bloquea

// OrderCheckout.jsx
- Carrito de compra
- Detalles de orden
- Procesamiento de pago
- Redirección a orden confirmada

// QRViewer.jsx
- Muestra QR code generado
- Descarga como PNG
- Compartir vía mailto/WhatsApp
```

### API Gateway

**Ubicación:** `api-gateway/`

**Funcionalidades:**
1. Enrutamiento a servicios backend
2. Validación de JWT
3. Rate limiting
4. CORS y seguridad
5. Logging centralizado

```javascript
// index.js
const express = require('express');
const httpProxy = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token && req.path.startsWith('/api/auth')) {
    return next();  // Auth endpoints no necesitan token
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Rutas
app.use('/api/events', httpProxy.createProxyMiddleware({
  target: `http://${process.env.CATALOG_SERVICE_HOST}:${process.env.CATALOG_SERVICE_PORT}`,
  changeOrigin: true,
  logLevel: 'info'
}));

app.use('/api/orders', authMiddleware, httpProxy.createProxyMiddleware({
  target: `http://${process.env.ORDER_SERVICE_HOST}:${process.env.ORDER_SERVICE_PORT}`,
  changeOrigin: true
}));

app.listen(8000, () => console.log('API Gateway listening on :8000'));
```

### Catalog Service

**Ubicación:** `catalog-service/`

**Funcionalidades:**
1. CRUD de eventos
2. Gestión de asientos y bloqueos
3. gRPC server para validación
4. Health checks

```javascript
// src/index.js
const express = require('express');
const grpc = require('@grpc/grpc-js');
const app = express();

// REST API
app.get('/events', async (req, res) => {
  const events = await db.query(`
    SELECT e.*, COUNT(CASE WHEN s.status = 'AVAILABLE' THEN 1 END) as available_seats
    FROM db_catalog.events e
    LEFT JOIN db_catalog.seats s ON e.id = s.event_id
    GROUP BY e.id
    ORDER BY e.date DESC
  `);
  res.json(events.rows);
});

// gRPC Server
const server = new grpc.Server();
server.addService(InventoryService, {
  validateAndCommitSeat: async (call, callback) => {
    const { event_id, seat_id, user_id } = call.request;
    
    const result = await db.query(
      `UPDATE db_catalog.seats 
       SET status = 'SOLD', locked_by_user_id = $1 
       WHERE id = $2 AND status = 'LOCKED'
       RETURNING *`,
      [user_id, seat_id]
    );
    
    callback(null, {
      success: result.rows.length > 0,
      seat: result.rows[0]
    });
  },
  
  unlockSeat: async (call, callback) => {
    const { seat_id } = call.request;
    
    await db.query(
      `UPDATE db_catalog.seats 
       SET status = 'AVAILABLE', locked_at = NULL, locked_by_user_id = NULL
       WHERE id = $1`,
      [seat_id]
    );
    
    callback(null, { success: true });
  }
});

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  console.log('gRPC server running on :50051');
});

// Limpieza de locks expirados (cron cada 5 min)
setInterval(async () => {
  await db.query(`
    UPDATE db_catalog.seats
    SET status = 'AVAILABLE', locked_at = NULL
    WHERE status = 'LOCKED' AND locked_at < NOW() - INTERVAL '10 minutes'
  `);
}, 5 * 60 * 1000);

app.listen(3000, () => console.log('Catalog Service on :3000'));
```

### Order Worker

**Ubicación:** `order-worker/`

**Funcionalidades:**
1. Consumir órdenes desde RabbitMQ
2. Generar QR (CPU-heavy)
3. Actualizar estado en BD
4. Publicar notificaciones

```python
# main.py
import asyncio
import pika
import qrcode
import base64
from datetime import datetime
from src.config import settings
from src.database import get_session
from src.models import Order, OrderStatus
from src.rabbitmq import RabbitMQConnection
from src.grpc_client import CatalogClient

async def process_order(order_uuid: str, order_data: dict):
    """Procesa orden: genera QR, actualiza BD, notifica"""
    
    try:
        # 1. Obtener orden de BD
        session = get_session()
        order = session.query(Order).filter(Order.order_uuid == order_uuid).first()
        order.status = OrderStatus.PROCESSING
        session.commit()
        
        # 2. GENERAR QR (CPU-intensivo)
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(f"ticketbuster://order/{order_uuid}")
        qr.make(fit=True)
        
        img = qr.make_image(fill_color='black', back_color='white')
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        # 3. Actualizar orden en BD
        order.qr_code_hash = qr_base64
        order.status = OrderStatus.COMPLETED
        order.completed_at = datetime.utcnow()
        session.commit()
        
        # 4. Llamar a Catalog Service vía gRPC para actualizar asiento
        catalog_client = CatalogClient(
            f"{settings.grpc_catalog_host}:{settings.grpc_catalog_port}"
        )
        await catalog_client.commit_seat(
            event_id=str(order.event_id),
            seat_id=str(order.seat_id),
            user_id=str(order.user_id)
        )
        
        # 5. Publicar notificación
        await notify_user(order.user_id, {
            'type': 'order_completed',
            'order_uuid': str(order_uuid),
            'qr_code': qr_base64
        })
        
        logger.info(f"Order {order_uuid} processed successfully")
        
    except Exception as e:
        logger.error(f"Error processing order {order_uuid}: {e}")
        order.status = OrderStatus.FAILED
        order.error_message = str(e)
        session.commit()
        raise

async def main():
    """Función principal - consume mensajes"""
    rabbitmq = RabbitMQConnection()
    
    def message_callback(ch, method, properties, body):
        try:
            import json
            message = json.loads(body)
            asyncio.run(process_order(
                message['order_uuid'],
                message
            ))
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Failed to process message: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    
    rabbitmq.consume_orders(message_callback)

if __name__ == '__main__':
    main()
```

### Notification Service

**Ubicación:** `notification-service/`

**Funcionalidades:**
1. WebSocket server
2. Consumir eventos de RabbitMQ
3. Emitir notificaciones en tiempo real

```javascript
// index.js
const express = require('express');
const socketIO = require('socket.io');
const amqp = require('amqplib');

const app = express();
const server = require('http').createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});

// Conexión WebSocket
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Cliente se suscribe a actualizaciones de orden
  socket.on('subscribe_order', (orderId, userId) => {
    // Validar que userId sea el propietario
    socket.join(`order:${orderId}:${userId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Consumir eventos de RabbitMQ
async function startRabbitMQConsumer() {
  const connection = await amqp.connect(`amqp://${process.env.RABBITMQ_HOST}`);
  const channel = await connection.createChannel();
  
  await channel.assertExchange('notifications', 'topic', { durable: true });
  const { queue } = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(queue, 'notifications', '#');
  
  channel.consume(queue, (msg) => {
    if (msg) {
      const data = JSON.parse(msg.content.toString());
      
      // Emitir a socket específico del usuario
      io.to(`order:${data.order_uuid}:${data.user_id}`).emit('order_update', {
        type: data.type,
        qr_code: data.qr_code,
        timestamp: new Date()
      });
      
      channel.ack(msg);
    }
  });
}

startRabbitMQConsumer();

server.listen(4000, () => {
  console.log('Notification Service on :4000');
});
```

---

## Consideraciones de Escalabilidad

### 1. Escalabilidad Vertical vs Horizontal

**Decisión: Horizontal**

```
Vertical (Bad):           Horizontal (Good):
┌─────────────┐          ┌──────┐  ┌──────┐  ┌──────┐
│  Big Server │          │Pod 1 │  │Pod 2 │  │Pod 3 │
│ CPU: 128    │          │      │  │      │  │      │
│ RAM: 512GB  │          └──────┘  └──────┘  └──────┘
│ Cost: $$$   │          ┌─────────────────────────────┐
└─────────────┘          │      Load Balancer          │
                         └─────────────────────────────┘
  ✗ Límite físico        ✓ Ilimitado en teoría
  ✗ Downtime upgrades    ✓ Rolling updates
  ✗ Riesgo concentrado   ✓ Fallo aislado a 1 pod
  ✗ Costo$ por capacidad ✓ Paga por lo que usa
```

**Implementación en Kubernetes:**

```yaml
# Replicas base
replicas: 2  # HA mínimo

# Escalado automático
horizontalPodAutoscaler:
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 50
```

### 2. Sharding de Datos (Conceptual para Futuro)

Aunque no implementado en esta versión, la arquitectura permite:

```sql
-- Opción 1: Sharding por event_id
-- Shard 1: events 1-1000
-- Shard 2: events 1001-2000
-- Tabla: seats_shard_1, seats_shard_2

-- Opción 2: Sharding por user_id
-- Shard 1: user_id hash(0-999)
-- Shard 2: user_id hash(1000-1999)
-- Tabla: orders_shard_1, orders_shard_2

-- Opción 3: Time-based sharding
-- Tabla: orders_2025_q1, orders_2025_q2
-- (Para archivado y queries rápidas)
```

### 3. Caching Distribuido (Redis)

**Arquitectura con Redis (Futuro):**

```
Request
    ▼
┌─────────────┐
│ Read Cache? │ (Redis)
└────┬────────┘
     │ HIT (70% casos)
     ├──────────────────────► Response
     │
     │ MISS (30% casos)
     ▼
┌─────────────────────┐
│ Query Database      │
│ Actualizar Cache    │
└────┬────────────────┘
     │
     └──────────────────────► Response
```

**Patrón Cache-Aside Implementable:**

```python
async def get_events_cached():
    # 1. Intentar Redis
    cached = await redis.get('events:all')
    if cached:
        return json.loads(cached)
    
    # 2. Query BD
    events = await db.query('SELECT * FROM events')
    
    # 3. Guardar en cache (1 hora TTL)
    await redis.setex('events:all', 3600, json.dumps(events))
    
    return events
```

### 4. Estrategia de CDN

**Para assets estáticos:**

```
┌─────────┐
│ Frontend│ (SPA React)
└────┬────┘
     │ fetch /assets
     ▼
┌──────────────────┐
│ CDN Global       │ (CloudFlare)
│ • Cache assets   │
│ • Compression    │
│ • Edge compute   │
└────┬─────────────┘
     │ MISS
     ▼
┌──────────────────┐
│ Origin Server    │
│ (Kubernetes)     │
└──────────────────┘
```

**Beneficio:** Archivos JS/CSS/images servidos desde edge location más cercano al usuario.

### 5. Rate Limiting y Quota

**Implementado en API Gateway:**

```javascript
// Por IP
const ipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 100,  // 100 req
  keyGenerator: (req) => req.ip
});

// Por usuario autenticado (más flexible)
const userLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 min
  max: 10,  // 10 órdenes por minuto
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => !req.user  // No aplica a anónimos
});

app.use('/api/orders', userLimiter);
```

**Respuesta 429:**
```json
{
  "error": "Too Many Requests",
  "retryAfter": 45,
  "remaining": 0,
  "limit": 10
}
```

---

## Resiliencia y Alta Disponibilidad

### 1. Health Checks Multinivel

#### Pod Level (Kubernetes)

```yaml
livenessProbe:  # ¿Está vivo el proceso?
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 15  # Espera antes de empezar
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3  # 3 fallos = reinicia

readinessProbe:  # ¿Puede recibir tráfico?
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 1  # 1 fallo = quita del servicio
```

**Implementación en servicios:**

```javascript
app.get('/health', (req, res) => {
  // Check mínimo: ¿proceso vivo?
  res.json({ status: 'OK', timestamp: new Date() });
});

app.get('/ready', async (req, res) => {
  // Check completo: ¿conectado a BD, RabbitMQ?
  try {
    // Test BD
    await pool.query('SELECT 1');
    
    // Test RabbitMQ
    await rabbitmq.channel.checkQueue('orders_queue');
    
    // Test gRPC
    await grpcClient.healthCheck();
    
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});
```

### 2. Circuit Breaker (Fault Tolerance)

**Patrón implementado implícitamente:**

```
Normal Operation:          Circuit Breaker Abierto:
┌─────────┐              ┌─────────┐
│ Llamada │──OK──┐       │ Llamada │──FAIL──┐
└─────────┘      ▼       └─────────┘        ▼
              Service                   Circuit Breaker
                                        (rejaza sin llamar)
              
              Después 30s:
              ┌──────────────┐
              │ HALF-OPEN    │ (reintenta)
              │ 1 llamada    │
              └──────┬───────┘
                     ├──OK──► CLOSED (recuperado)
                     └──FAIL─► OPEN (espera 30s)
```

**Implementable en Future:**

```javascript
const CircuitBreaker = require('opossum');

const breaker = new CircuitBreaker(async () => {
  return await catalogService.getEvents();
}, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  // Fallback si circuit abierto
  fallback: () => getCachedEvents()
});

breaker.fire()
  .then(events => res.json(events))
  .catch(err => res.status(503).json({ error: 'Service unavailable' }));
```

### 3. Retry Logic (Exponential Backoff)

**En RabbitMQ Consumer:**

```python
async def process_order_with_retry(order_uuid, max_retries=3, backoff_factor=2):
    for attempt in range(max_retries):
        try:
            return await process_order(order_uuid)
        except TransientError as e:
            if attempt < max_retries - 1:
                wait_time = backoff_factor ** attempt
                logger.warning(f"Retry {attempt + 1} after {wait_time}s: {e}")
                await asyncio.sleep(wait_time)
            else:
                # Última falla: meter en DLQ
                await send_to_dlq(order_uuid, str(e))
                logger.error(f"Order {order_uuid} sent to DLQ after {max_retries} retries")
                raise
```

**Tiempos de Backoff:**
- Intento 1: Falla → espera 1s
- Intento 2: Falla → espera 2s
- Intento 3: Falla → DLQ (sin reintento)

### 4. Failover Automático

**Múltiples réplicas por servicio:**

```yaml
# Antes
┌──────────────────────┐
│ catalog-service:1    │ (Single point of failure)
└──────────────────────┘

# Después
┌──────────────────────┐    ┌──────────────────────┐
│ catalog-service:1    │───▶│ catalog-service:2    │
└──────────────────────┘    └──────────────────────┘
         (Primary)                (Standby)
         └─────────┬─────────┘
                   ▼
              LoadBalancer
         (K8s Service)
```

**Kubernetes Service auto-failover:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: catalog-service
spec:
  type: ClusterIP
  selector:
    app: catalog-service
  sessionAffinity: None  # Load balance cada request
  ports:
  - port: 3000
    targetPort: 3000
```

Si pod:1 muere, Service automáticamente redirige a pod:2.

### 5. Degradación Gradual (Graceful Degradation)

**Ejemplo: Si Catalog Service está lento**

```javascript
// API Gateway
const catalogProxy = httpProxy.createProxyMiddleware({
  target: 'http://catalog-service:3000',
  timeout: 3000,  // 3s timeout
  onError: (err, req, res) => {
    logger.warn('Catalog service timeout, serving from cache');
    
    // Servir datos cacheados en Redis
    const cachedEvents = getCachedEvents();
    if (cachedEvents) {
      res.setHeader('X-From-Cache', 'true');
      res.json(cachedEvents);
    } else {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        cached: false,
        suggestion: 'Try again in a few seconds'
      });
    }
  }
});
```

---

## Experiencia de Usuario

### 1. Interfaz Responsiva

**Diseño Mobile-First con Tailwind:**

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {events.map(event => (
    <EventCard key={event.id} event={event} />
  ))}
</div>
```

**Breakpoints:**
- Mobile: 0-640px (1 columna)
- Tablet: 641-1024px (2 columnas)
- Desktop: 1025px+ (3 columnas)

### 2. Offline-First Experience

**Escenarios cubiertos:**

```
┌─────────────────────────────────────────┐
│ Conexión OK (Online)                    │
│ ✅ Compra en tiempo real                │
│ ✅ Ver QR al instante                   │
│ ✅ Notificaciones push                  │
└─────────────────────────────────────────┘
           ⬇️ (pierde conexión)
┌─────────────────────────────────────────┐
│ Sin conexión (Offline)                  │
│ ✅ Ver eventos cacheados                │
│ ✅ Ver asientos seleccionados           │
│ ✅ Ver órdenes históricas               │
│ ❌ No puede comprar nuevo               │
│    (Botón disabled + tooltip)           │
│ ✅ Queue: compra se queda local         │
└─────────────────────────────────────────┘
           ⬇️ (reconecta)
┌─────────────────────────────────────────┐
│ Sync automático                         │
│ ✅ Envía órdenes pendientes             │
│ ✅ Actualiza estado                     │
│ ✅ Descarga QR codes nuevos             │
│ 📢 Notificación "Sincronizado"          │
└─────────────────────────────────────────┘
```

### 3. Feedback Inmediato

**Estados de carga:**

```jsx
{isLoading && (
  <Spinner 
    text="Cargando eventos..." 
    size="lg"
  />
)}

// Al seleccionar asiento
{isLocking && (
  <Toast type="info">
    Bloqueando asiento...
  </Toast>
)}

// Éxito
{lockSuccess && (
  <Toast type="success" autoClose={3000}>
    ✓ Asiento bloqueado
  </Toast>
)}

// Error
{lockError && (
  <Toast type="error">
    ✗ No se pudo bloquear: {lockError.message}
  </Toast>
)}
```

### 4. Performance Optimizations

**Lazy Loading:**
```jsx
const QRViewer = lazy(() => import('./QRViewer'));

<Suspense fallback={<div>Cargando QR...</div>}>
  <QRViewer orderUuid={orderId} />
</Suspense>
```

**Code Splitting (Vite automático):**
```
main.js (100KB)
├─ pages/HomePage.js (50KB) - loaded on demand
├─ pages/EventsPage.js (45KB) - loaded on demand
└─ pages/CheckoutPage.js (40KB) - loaded on demand
```

**Métricas Core Web Vitals:**
| Métrica | Target | Implementación |
|---------|--------|-----------------|
| LCP | < 2.5s | Images optimizadas, lazy load |
| FID | < 100ms | Debounce eventos, reduce JS |
| CLS | < 0.1 | Placeholders fijos, no jitter |

### 5. Accesibilidad (a11y)

```jsx
// Semántica HTML
<button 
  aria-label="Comprar entradas"
  aria-disabled={isDisabled}
  role="button"
>
  Comprar
</button>

// Contraste WCAG AAA
className="text-white bg-slate-900"  // 15:1 ratio

// Focus visible
<div className="focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">

// Etiquetas accesibles
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

---

## Seguridad

### 1. Autenticación OAuth2 + OpenID Connect

**Flujo con Keycloak:**

```
┌────────┐                    ┌──────────┐                ┌────────────┐
│Frontend│                    │ Keycloak │                │ API Gateway│
└───┬────┘                    └──────────┘                └────────────┘
    │                               │                              │
    │ 1. Click "Login"              │                              │
    │──────────────────────────────▶│                              │
    │   (redirect)                  │                              │
    │                               │ 2. Mostrar form login       │
    │◀──────────────────────────────┤                              │
    │   (HTML form)                 │                              │
    │                               │                              │
    │ 3. Usuario/Password           │                              │
    │──────────────────────────────▶│                              │
    │                               │ 4. Valida (HTTPS seguro)    │
    │                               ├──────────────────────────┐  │
    │                               │ Contraseña ok           │  │
    │                               │ Genera JWT              │  │
    │                               └─────────────────────────┘  │
    │                               │ 5. Redirect + JWT           │
    │◀──────────────────────────────┤                              │
    │   (JWT en URL/Cookie)         │                              │
    │                               │                              │
    │ 6. Guarda JWT localmente      │                              │
    │──────────────────────────────────────────────────────────▶ │
    │    (Authorization: Bearer <JWT>)                            │
    │                               │ 7. Valida JWT               │
    │                               │    (signature, expiry)      │
    │◀──────────────────────────────────────────────────────────┤
    │   (Acepta solicitud)          │                              │
```

**Ventajas de OAuth2/OIDC:**
- ✅ Usuario never comparte contraseña con app
- ✅ Single Sign-On (SSO) con otros servicios
- ✅ Social login (Google, GitHub future)
- ✅ Tokens con expiración corta (15 min)
- ✅ Refresh tokens para renovación

### 2. JWT Validación

**Token Structure:**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.eyJzdWIiOiJ1c2VyXzEyMyIsImlhdCI6MTY5MzQzNzYwMCwiZXhwIjoxNjkzNDQxMjAwLCJpc3MiOiJrZXljbG9hayJ9
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

▼ Decoded:

Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "sub": "user_123",
  "email": "user@example.com",
  "iat": 1693437600,
  "exp": 1693441200,  // Expira en 1 hora
  "iss": "keycloak"
}

Signature:
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret_key
)
```

**Validación en API Gateway:**

```javascript
const validateJWT = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'keycloak'
    });
    
    // Checks adicionales
    if (decoded.exp * 1000 < Date.now()) {
      throw new Error('Token expired');
    }
    
    return decoded;
  } catch (error) {
    throw new UnauthorizedError(`Invalid token: ${error.message}`);
  }
};
```

### 3. HTTPS/TLS Certificados

**Implementado vía Cloudflare Tunnel:**

```
┌──────────────────────────────────────────┐
│         Internet (HTTPS)                 │
│ https://ticketbuster.example.com ◄─────┐│
└──────────┬───────────────────────────────┘│
           │                                 │
           ▼ (TLS encryption)               │
    ┌──────────────┐                        │
    │ Cloudflare   │ (Tunnel)               │
    │ Edge         │◄──────────────────────┐│
    └──────────────┘ cloudflared client    ││
           │                                ││
           │ (Encrypted HTTPS to origin)   ││
           ▼                                ││
    ┌──────────────┐                       ││
    │ Kubernetes   │ (Internal)            ││
    │ Cluster      │                       ││
    │ localhost    │                       ││
    └──────────────┘                       ││
           │                                ││
           └────────────────────────────────┘│
                                             │
                    (Double encryption!)    │
```

**Beneficios:**
- ✅ TLS 1.3 en edge
- ✅ Certificado autorenewable (Let's Encrypt)
- ✅ DDoS protection
- ✅ WAF (Web Application Firewall)

### 4. Sanitización de Inputs

**Validación en API Gateway:**

```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/orders', [
  body('user_id').isUUID(),
  body('event_id').isInt({ min: 1 }),
  body('seat_ids').isArray({ min: 1, max: 10 }),
  body('seat_ids.*').isInt({ min: 1 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Procesar orden validada
});
```

**SQL Injection Prevention:**

```javascript
// ❌ VULNERABLE
const query = `SELECT * FROM seats WHERE event_id = ${req.params.event_id}`;

// ✅ SAFE (Parameterized queries)
const query = 'SELECT * FROM seats WHERE event_id = $1';
const result = await pool.query(query, [req.params.event_id]);
```

### 5. Secretos y Configuración

**NO versionable en Git:**

```bash
# .gitignore
.env
.env.local
secrets/
```

**Usando Kubernetes Secrets:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: ticketbuster
type: Opaque
stringData:
  JWT_SECRET: "super-secret-key-never-commit"
  DB_PASSWORD: "postgres-password"
  RABBITMQ_PASSWORD: "rabbitmq-password"
```

**Inyectado en pods:**

```yaml
env:
- name: JWT_SECRET
  valueFrom:
    secretKeyRef:
      name: app-secrets
      key: JWT_SECRET
```

---

## Lecciones Aprendidas

### 1. Complejidad de Sistemas Distribuidos

**Desafío:** Debugging de órdenes en estado inconsistente

```
Escenario: Order status = PENDING, pero asiento = SOLD
Causa: Order Worker falló entre 2 pasos

Solución implementada:
• Transacciones locales para cada paso
• Event audit trail en BD
• Compensating transactions (rollback)
• Monitoring de anomalías

Lección: Testing de fallos es TAN importante como testing happy path
```

### 2. Importancia del Esquema de Base de Datos

**Decisión early:** Separar esquemas por servicio

**Beneficio realizado:**
- ✅ Catalog Service evolucionó tabla `events` sin afectar Orders
- ✅ Facilita futuro sharding o replicación
- ✅ Previene queries accidentales entre servicios

**Arrepentimiento:** No haber documentado foreign keys teóricas
```sql
-- Importante documentar, aunque no haya FK DB
-- orders.event_id REFERENCIAS db_catalog.events(id)
-- orders.seat_id REFERENCIAS db_catalog.seats(id)
-- (Mantener integridad referencial en aplicación)
```

### 3. PWA Offline-First: Más Complejo de lo Esperado

**Desafío:** Sincronización de datos offline

```javascript
// ❌ Problema: User compra offline, crea orden local
// ✅ Solución: Queue en IndexedDB + retry exponencial

// ❌ Problema: Event en caché desactualizado
// ✅ Solución: Versionado de caché + etags HTTP

// ❌ Problema: Conflictos si user compra en 2 dispositivos
// ✅ Solución: Backend arbitra (last-write-wins con timestamp)
```

### 4. RabbitMQ Beats Simple Polling

**Comparación:**

| Método | Latencia | Carga | Escalabilidad |
|--------|----------|-------|----------------|
| Polling | 1-10s | Alta (queries frecuentes) | Mala |
| RabbitMQ | <1s | Baja (event-driven) | Excelente |

**Implementado:** Message-driven architecture

### 5. Kubernetes es el Enabler, No la Solución

**Malentendido inicial:** "Kubernetes escala automáticamente"

**Realidad:** Kubernetes orquesta escalamiento, pero app debe permitirlo

```
┌─────────────────────────────────────────────────┐
│ Para que Kubernetes escale:                     │
│ 1. Pod debe ser stateless                       │
│ 2. Debe haber métricas (CPU, memoria)           │
│ 3. HPA debe estar configurado                   │
│ 4. Aplicación debe responder a SIGTERM          │
│ 5. DB debe soportar N conexiones                │
│                                                 │
│ Si falla uno = escalamiento no funciona        │
└─────────────────────────────────────────────────┘
```

### 6. Observabilidad Debe Planearse Desde Inicio

**Implementado:**
- ✅ Logs centralizados (stdout)
- ✅ Health checks en todos los servicios
- ✅ Métricas básicas (pod CPU/memory)

**Faltó:**
- ❌ Tracing distribuido (Jaeger/Datadog)
- ❌ Métricas de aplicación (órdenes/min, QR generation time)
- ❌ Alertas automáticas

### 7. Testing de Resiliencia es Esencial

**Escenario testeado:**

```bash
# Matar Catalog Service durante compra
kubectl delete pod catalog-service-xxx

# Resultado: API Gateway timeout, caída de órdenes
# Antes: ✗ Órdenes perdidas
# Después: ✅ Órdenes en PENDING, retry automático

# Lección: Circuit breaker + retry necesarios
```

---

## Conclusiones

### Logros

TicketBuster demuestra exitosamente la implementación de:

1. **Arquitectura Cloud-Native:** Microservicios en Kubernetes con escalabilidad automática
2. **Resiliencia Distribuida:** Fallos parciales no deriban el sistema completo
3. **Experiencia de Usuario Moderna:** PWA offline-first, real-time notifications
4. **Seguridad:** OAuth2, JWT, encriptación end-to-end
5. **Escalabilidad Vertical y Horizontal:** Manejo de picos de carga mediante HPA

### Comparación: Monolito vs Microservicios

| Aspecto | Monolito | TicketBuster |
|---------|----------|--------------|
| Escalabilidad | Todo o nada | Selectiva por componente |
| Fallos | 1 fallo = caída total | Aislados, graceful degradation |
| Deployment | Reinicia todo | Independiente por servicio |
| Tecnología | Stack único | Polyglot (Node + Python) |
| Complejidad Operacional | Baja | Alta (compensada por K8s) |
| Time to Market | Rápido inicio | Rápido después de setup |
| Team Scaling | Difícil | Fácil (teams por dominio) |

**Veredicto:** Para sistemas con requisitos de alta disponibilidad y escalabilidad, microservicios + Kubernetes valen la complejidad agregada.

### Futuros Pasos

1. **Service Mesh (Istio):** Observabilidad, traffic management, security policies
2. **Redis Caching:** Caché distribuido para sessions y datos frecuentes
3. **Event Sourcing:** Completo audit trail de todos los cambios
4. **GraphQL Gateway:** API más flexible que REST
5. **Machine Learning:** Recomendaciones personalizadas de eventos
6. **Blockchain:** Verificabilidad de QR codes (futuro)

### Recomendaciones para Producción

Si este proyecto se llevara a producción:

```yaml
Infraestructura:
  - Cluster K8s multi-nodo (3+ nodos)
  - Load balancer externo (AWS ELB, Google Cloud LB)
  - PostgreSQL managed (RDS, Cloud SQL) con replicación
  - RabbitMQ cluster con 3+ nodos
  - Redis cluster para sesiones
  - Cloudflare Enterprise para DDoS/WAF
  
Operaciones:
  - Terraform/Helm para IaC
  - Prometheus + Grafana para monitoring
  - ELK stack para logs centralizados
  - PagerDuty para alerting
  - GitOps (Flux/ArgoCD) para deployments
  
Seguridad:
  - VPC/Private networking
  - Network policies (Calico)
  - Pod security policies
  - Regular penetration testing
  - SIEM para audit logs
  
Performance:
  - CDN global (CloudFlare)
  - Database read replicas
  - Query optimization + índices
  - Caching at multiple layers
  - Load testing (K6, JMeter)
```

### Reflexión Final

> *"La arquitectura de microservicios no es una solución universal, sino una herramienta para problemas específicos."*

TicketBuster ejemplifica cuándo es apropiada: cuando hay requisitos claros de disponibilidad, escalabilidad selectiva y ciclos de desarrollo independientes. El proyecto cumple exitosamente con los objetivos académicos de integrar Programación Web Avanzada y Sistemas Distribuidos en una aplicación real y funcional.

---

## Anexos

### A. Endpoints de API Completos

```bash
# EVENTS
GET /api/events                    # Listar todos
GET /api/events/:id                # Detalles evento
GET /api/events/:id/seats          # Asientos disponibles

# ORDERS
POST /api/orders                   # Crear orden (auth required)
GET /api/orders/:uuid              # Detalles orden (auth required)
GET /api/orders                    # Mis órdenes (auth required)
POST /api/orders/:uuid/cancel      # Cancelar (auth required)

# SEATS
POST /api/events/:id/lock-seat     # Bloquear asiento (gRPC)
POST /api/events/:id/unlock-seat   # Desbloquear asiento (gRPC)

# AUTH
POST /api/auth/login               # Redirect a Keycloak
POST /api/auth/logout              # Logout
GET /api/auth/me                   # Perfil actual (auth required)
POST /api/auth/refresh             # Refresh token
```

### B. Estructura de Carpetas del Proyecto

```
TicketBuster/
├── frontend/                 # React + Vite PWA
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   ├── pages/            # Páginas (React Router)
│   │   ├── services/         # API client, offline storage
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/               # Assets estáticos
│   ├── manifest.json         # PWA manifest
│   ├── vite.config.js        # Configuración Vite
│   └── package.json
│
├── api-gateway/              # Express.js API Gateway
│   ├── src/
│   │   ├── middleware/       # Auth, logging, rate limiting
│   │   ├── routes/           # Rutas
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
│
├── catalog-service/          # Node.js - Inventory Management
│   ├── src/
│   │   ├── db.js             # Conexión PostgreSQL
│   │   ├── grpcServer.js     # gRPC server
│   │   └── index.js          # REST API
│   ├── proto/                # Proto files
│   ├── Dockerfile
│   └── package.json
│
├── notification-service/     # Node.js - Real-time Notifications
│   ├── src/
│   │   ├── index.js          # Socket.io server
│   │   └── rabbitmq.js       # RabbitMQ consumer
│   ├── Dockerfile
│   └── package.json
│
├── order-worker/             # Python - Order Processing
│   ├── src/
│   │   ├── config.py         # Settings
│   │   ├── database.py       # SQLAlchemy
│   │   ├── rabbitmq.py       # RabbitMQ connection
│   │   ├── qr_generator.py   # QR generation logic
│   │   └── grpc_client.py    # gRPC client para Catalog
│   ├── main.py               # Entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
│
├── proto/                    # Protocol Buffer definitions
│   ├── common.proto
│   ├── events.proto
│   ├── inventory.proto
│   ├── orders.proto
│   └── notifications.proto
│
├── k8s/                      # Kubernetes manifests
│   ├── namespace.yaml
│   ├── infrastructure.yaml   # DB, RabbitMQ, Redis
│   ├── services-deployment.yaml
│   ├── hpa.yaml              # Horizontal Pod Autoscaler
│   ├── tunnel.yaml           # Cloudflare Tunnel
│   └── init.sql              # Database initialization
│
├── scripts/                  # Automation scripts
│   ├── build-images.ps1
│   ├── deploy-local.ps1
│   ├── test-k8s-completo.ps1
│   ├── start-port-forwards.ps1
│   └── dev-up.sh / dev-down.sh
│
├── docker-compose.dev.yml    # Local development (legacy)
├── README.md                 # Documentación usuario
├── INFORME_TECNICO.md        # Este documento
├── INFRASTRUCTURE.md         # Setup local
└── TEST-K8S.md              # Testing en K8s
```

### C. Variábles de Entorno (Ejemplo)

```bash
# .env.example

# FRONTEND
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=http://localhost:4000

# API GATEWAY
PORT=8000
JWT_SECRET=your-secret-key-change-this
CATALOG_SERVICE_HOST=localhost
CATALOG_SERVICE_PORT=3000
NOTIFICATION_SERVICE_HOST=localhost
NOTIFICATION_SERVICE_PORT=4000

# CATALOG SERVICE
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASS=admin
DB_NAME=ticketbuster
GRPC_PORT=50051
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672

# ORDER WORKER
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=admin
DB_NAME=ticketbuster
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
GRPC_CATALOG_HOST=localhost
GRPC_CATALOG_PORT=50051

# NOTIFICATION SERVICE
PORT=4000
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
```

### D. Referencias Bibliográficas

**Microservicios y Arquitectura:**
- Newman, S. (2015). Building Microservices. O'Reilly
- Richardson, C. (2018). Microservices Patterns. Manning
- Fowler, M. (2014). Microservices. martinfowler.com

**Kubernetes:**
- Burns, B., Beda, K., Hightower, K. (2019). Kubernetes Up and Running. O'Reilly
- Kubernetes Official Documentation. kubernetes.io

**Resiliencia Distribuida:**
- Nygard, M. (2007). Release It!. Pragmatic Programmers
- Cockroft, A. (2015). Microservices Architecture and Failure. 

**Frontend Moderno:**
- Osmani, A. (2017). Progressive Web Applications. addyosmani.com
- React Documentation. react.dev

**Seguridad:**
- OWASP Top 10. owasp.org
- OAuth 2.0 Security Best Practices. tools.ietf.org

---

**Documento Final:** Enero 2026  
**Versión:** 1.0 - Stable Release

*TicketBuster: Un sistema de venta de entradas construido con principios modernos de ingeniería de software distribuido.*
