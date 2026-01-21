# Catalog Service - TicketBuster

Servicio de catálogo de eventos. Gestiona la información de eventos y asientos disponibles. Implementa un servidor gRPC para comunicación rápida con otros microservicios y una API REST para el frontend.

## 🎯 Características

### Catálogo de Eventos
- ✅ Gestión de 20+ eventos con metadatos
- ✅ Categorías: Concert, Theater, Festival, Sports, Conference, Other
- ✅ Datos completos: titulo, descripción, fecha, ubicación, precio
- ✅ Búsqueda y filtrado por categoría, rango de fechas, precio

### Gestión de Asientos
- ✅ Sistema de asientos con estados: AVAILABLE, LOCKED, SOLD
- ✅ Lock automático de asientos (10 min) para checkout
- ✅ Verificación de disponibilidad en tiempo real
- ✅ Generación de asientos por evento (~150-250 por evento)

### Comunicación
- ✅ **gRPC**: Interfaz de alta performance para microservicios
- ✅ **REST API**: Endpoints para frontend y testing
- ✅ **PostgreSQL**: Persistencia con schema db_catalog

## 🛠️ Stack Tecnológico

```
Node.js 22 + Express
├── grpc & @grpc/grpc-js (gRPC server)
├── protobuf (Schema definitions)
├── pg (PostgreSQL driver)
├── axios (HTTP client)
└── winston (Logging)
```

## 🚀 Instalación

### Requisitos
- Node.js 22.x LTS
- npm 10.x
- PostgreSQL 15 running
- gRPC tools instalados

### Setup Local

```bash
cd catalog-service

# Instalar dependencias
npm install

# Copiar configuración
cp .env.example .env

# Ejecutar
npm start

# O con auto-reload
npm run dev
```

### Variables de Entorno (.env)

```env
# Server
PORT=3000
GRPC_PORT=50051
NODE_ENV=production

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=ticketbuster
DB_USER=admin
DB_PASS=admin

# Logging
LOG_LEVEL=info

# Feature Flags
ENABLE_GRPC=true
ENABLE_REST=true
```

## 📁 Estructura

```
catalog-service/
├── src/
│   ├── index.js           # Entry point (REST + gRPC)
│   ├── config.js          # Configuration
│   ├── logger.js          # Winston logger
│   │
│   ├── models/
│   │   ├── Event.js       # Event model & queries
│   │   ├── Seat.js        # Seat model & queries
│   │   └── Inventory.js   # Stock management
│   │
│   ├── services/
│   │   ├── eventService.js     # Business logic
│   │   ├── seatService.js      # Seat availability
│   │   ├── database.js         # PostgreSQL queries
│   │   └── cache.js            # In-memory caching
│   │
│   ├── routes/
│   │   ├── events.js      # REST endpoints: GET /events
│   │   ├── seats.js       # REST endpoints: GET /seats
│   │   ├── health.js      # Health check
│   │   └── index.js       # Router setup
│   │
│   ├── grpc/
│   │   ├── handlers.js    # gRPC method implementations
│   │   ├── server.js      # gRPC server setup
│   │   └── loader.js      # Proto file loader
│   │
│   └── utils/
│       ├── errors.js      # Error definitions
│       └── validators.js  # Input validation
│
├── proto/                 # gRPC proto files (compartidas)
│   ├── catalog.proto
│   ├── inventory.proto
│   └── common.proto
│
├── .env.example
├── Dockerfile
├── package.json
└── README.md
```

## 🏗️ Arquitectura

```
┌──────────────────────────────────────────────────────┐
│           Catalog Service                            │
│           (Inventario de Eventos)                    │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │       Express Server (port 3000)            │   │
│  │  ┌──────────────────┐  ┌──────────────┐    │   │
│  │  │  REST API        │  │ gRPC Server  │    │   │
│  │  │  /events         │  │ (port 50051) │    │   │
│  │  │  /events/:id     │  │              │    │   │
│  │  │  /seats          │  │ Services:    │    │   │
│  │  │  /health         │  │ - GetEvent   │    │   │
│  │  │                  │  │ - GetSeats   │    │   │
│  │  │                  │  │ - LockSeats  │    │   │
│  │  └──────────────────┘  └──────────────┘    │   │
│  └─────────────────────────────────────────────┘   │
│           │                        │               │
│           ▼                        ▼               │
│    ┌──────────────────┐   ┌──────────────┐       │
│    │   Frontend       │   │ Other        │       │
│    │   (REST)         │   │ Services     │       │
│    │                  │   │ (gRPC)       │       │
│    └──────────────────┘   └──────────────┘       │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │        PostgreSQL db_catalog Schema         │   │
│  │                                              │   │
│  │  Tables:                                    │   │
│  │  - events (20 registros)                   │   │
│  │  - seats (2,980 registros)                 │   │
│  │  - seat_locks (temporal)                   │   │
│  │  - audit_logs                              │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

## 📊 Schema Base de Datos

### Tabla: events
```sql
CREATE TABLE db_catalog.events (
  id INTEGER PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),  -- CONCERT, THEATER, SPORTS, etc
  date TIMESTAMP NOT NULL,
  location VARCHAR(255),
  venue VARCHAR(255),
  price DECIMAL(10, 2),
  image_url VARCHAR(500),
  available_seats INTEGER,
  total_seats INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_events_date ON db_catalog.events(date);
CREATE INDEX idx_events_category ON db_catalog.events(category);
CREATE INDEX idx_events_available ON db_catalog.events(available_seats DESC);
```

### Tabla: seats
```sql
CREATE TABLE db_catalog.seats (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES db_catalog.events(id),
  seat_number VARCHAR(10),          -- A1, A2, B1, etc
  row_number VARCHAR(10),
  section VARCHAR(50),
  status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, LOCKED, SOLD
  locked_until TIMESTAMP,           -- Para locks temporales
  locked_by_user UUID,
  price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_seats_event ON db_catalog.seats(event_id);
CREATE INDEX idx_seats_status ON db_catalog.seats(event_id, status);
CREATE INDEX idx_seats_locked ON db_catalog.seats(locked_until) 
  WHERE status = 'LOCKED';
```

## 📡 REST API Endpoints

### GET /api/events
Listar todos los eventos:

```bash
curl http://localhost:3000/events

# Con filtros
curl "http://localhost:3000/events?category=CONCERT&minPrice=50&maxPrice=200"
```

Respuesta:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Bad Bunny: Most Wanted Tour 2026",
      "category": "CONCERT",
      "date": "2026-02-15T20:00:00Z",
      "location": "Lima, Peru",
      "price": 150.00,
      "available_seats": 34500,
      "total_seats": 35000,
      "image_url": "https://..."
    }
  ],
  "total": 20,
  "filters": { "category": "CONCERT" }
}
```

### GET /api/events/:id
Obtener evento específico:

```bash
curl http://localhost:3000/events/1
```

Respuesta:
```json
{
  "id": 1,
  "title": "Bad Bunny: Most Wanted Tour 2026",
  "description": "El fenómeno del reggaeton trae su gira mundial...",
  "category": "CONCERT",
  "date": "2026-02-15T20:00:00Z",
  "location": "Lima, Peru",
  "venue": "Estadio Nacional de Lima",
  "price": 150.00,
  "available_seats": 34500,
  "total_seats": 35000,
  "image_url": "https://..."
}
```

### GET /api/events/:eventId/seats
Obtener asientos disponibles de un evento:

```bash
curl http://localhost:3000/events/1/seats?section=A&limit=50
```

Respuesta:
```json
{
  "event_id": 1,
  "total": 250,
  "seats": [
    {
      "id": 101,
      "seat_number": "A1",
      "row_number": "A",
      "section": "VIP",
      "status": "AVAILABLE",
      "price": 200.00
    }
  ]
}
```

## 🔄 gRPC Services

### Service: CatalogService

Definido en `proto/catalog.proto`:

```protobuf
service CatalogService {
  rpc GetEvent(GetEventRequest) returns (Event);
  rpc GetSeats(GetSeatsRequest) returns (SeatsResponse);
  rpc CheckAvailability(CheckAvailabilityRequest) returns (AvailabilityResponse);
  rpc LockSeats(LockSeatsRequest) returns (LockSeatsResponse);
  rpc ReleaseLock(ReleaseLockRequest) returns (Empty);
  rpc ConfirmSeats(ConfirmSeatsRequest) returns (ConfirmSeatsResponse);
}
```

### Ejemplo de uso (desde otro servicio):

```javascript
// Conectar a gRPC
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const proto = grpc.loadPackageDefinition(
  protoLoader.loadSync('./proto/catalog.proto')
);

const client = new proto.catalog.CatalogService(
  'catalog-service:50051',
  grpc.credentials.createInsecure()
);

// Obtener evento
client.GetEvent(
  { id: 1 },
  (err, response) => {
    if (err) console.error(err);
    else console.log('Event:', response);
  }
);

// Bloquear asientos
client.LockSeats(
  {
    event_id: 1,
    seat_ids: [101, 102, 103],
    user_id: 'user-uuid',
    duration_minutes: 10
  },
  (err, response) => {
    if (response.success) {
      console.log('Seats locked');
    }
  }
);
```

## 🔐 Seguridad

### Validación de Inputs

```javascript
// services/eventService.js
const Joi = require('joi');

const eventFilterSchema = Joi.object({
  category: Joi.string().valid('CONCERT', 'THEATER', 'SPORTS', 'FESTIVAL', 'CONFERENCE', 'OTHER'),
  minPrice: Joi.number().positive(),
  maxPrice: Joi.number().positive(),
  dateFrom: Joi.date(),
  dateTo: Joi.date(),
  limit: Joi.number().integer().min(1).max(100),
  offset: Joi.number().integer().min(0)
});

async function getEvents(filters) {
  const { error, value } = eventFilterSchema.validate(filters);
  if (error) throw new Error(`Validation failed: ${error.message}`);
  
  return database.query('SELECT * FROM db_catalog.events WHERE ...', value);
}
```

### Rate Limiting por Endpoint

Implementado en Express middleware:

```javascript
const rateLimit = require('express-rate-limit');

const eventLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // 60 requests por minuto
  message: 'Too many requests'
});

app.get('/events', eventLimiter, eventHandler);
```

## 💾 Caching

Implementado con in-memory cache con TTL:

```javascript
// services/cache.js
class CacheManager {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    setTimeout(() => this.cache.delete(key), ttlSeconds * 1000);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
}

// Uso
const cacheManager = new CacheManager();

async function getEvent(eventId) {
  const cacheKey = `event:${eventId}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;
  
  const event = await database.getEvent(eventId);
  cacheManager.set(cacheKey, event, 300); // 5 min TTL
  return event;
}
```

## 🐳 Docker

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src
COPY proto ./proto

EXPOSE 3000 50051

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
```

## 🚀 Deployment en K8s

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalog-service
  namespace: ticketbuster
spec:
  replicas: 2
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
        env:
        - name: PORT
          value: "3000"
        - name: GRPC_PORT
          value: "50051"
        - name: DB_HOST
          value: postgres
        - name: DB_PORT
          value: "5432"
        - name: DB_USER
          value: admin
        - name: DB_PASS
          value: admin
        - name: LOG_LEVEL
          value: info
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: catalog-service
  namespace: ticketbuster
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
    name: http
  - port: 50051
    targetPort: 50051
    protocol: TCP
    name: grpc
  selector:
    app: catalog-service
```

## 📊 Estadísticas de Datos

**Eventos en Catálogo:**
- Total: 20 eventos
- Periodo: Febrero 2026 - Noviembre 2026
- Categorías: Concert (5), Theater (4), Festival (3), Sports (3), Conference (2), Other (2)

**Asientos:**
- Total seats: 2,980
- Available: 2,975
- Sold: 5
- Distribution: 150-250 per event (smaller venues) to 80,000 (stadiums)

## 🔧 Troubleshooting

### Conexión a PostgreSQL fallando
- Verificar que postgres está running
- Comprobar credenciales en .env (DB_HOST, DB_USER, DB_PASS)
- Ver logs: `docker logs catalog-service`

### Asientos no aparecen
- Verificar que init.sql fue ejecutado
- Ejecutar: `SELECT COUNT(*) FROM db_catalog.seats`
- Reiniciar servicio: `docker restart catalog-service`

### gRPC no disponible
- Verificar puerto 50051
- Comprobar ENABLE_GRPC=true en .env
- Ver logs de startup

## 📚 Recursos

- [Express Guide](https://expressjs.com/)
- [gRPC Docs](https://grpc.io/docs/)
- [PostgreSQL Node Driver](https://node-postgres.com/)
- [Protocol Buffers](https://developers.google.com/protocol-buffers)

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0  
**Estado:** Producción ✅
