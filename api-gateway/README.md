# API Gateway - TicketBuster

Puerta de entrada a todos los microservicios. Redirige las solicitudes HTTP a los servicios especializados (catalog-service, order-worker, etc.) con enrutamiento inteligente, autenticación y rate limiting.

## 🎯 Características

### Enrutamiento Inteligente
- ✅ Rutas prefijadas: `/api/events/*`, `/api/orders/*`, `/api/notifications/*`
- ✅ Reescritura de rutas transparente
- ✅ Soporte para múltiples versiones de API
- ✅ Redireccionamiento dinámico

### Seguridad
- ✅ Validación JWT de acceso
- ✅ Rate limiting por IP/usuario
- ✅ CORS configurado
- ✅ Validación de headers
- ✅ Sanitización de inputs

### Observabilidad
- ✅ Logging detallado de requests
- ✅ Métricas de latencia
- ✅ Tracking de errores
- ✅ Health checks

## 🛠️ Stack Tecnológico

```
Node.js 22 + Express
├── express-http-proxy (Reverse proxy)
├── express-rate-limit (Rate limiting)
├── jsonwebtoken (JWT validation)
├── helmet (Security headers)
├── morgan (Logging)
├── joi (Validation)
└── axios (HTTP client)
```

## 🚀 Instalación

### Requisitos
- Node.js 22.x LTS
- npm 10.x

### Setup Local

```bash
cd api-gateway

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
PORT=8000
NODE_ENV=production

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=ticketbuster
KEYCLOAK_CLIENT_ID=ticketbuster-frontend
KEYCLOAK_AUDIENCE=ticketbuster-frontend
KEYCLOAK_JWKS_URI=http://localhost:8080/realms/ticketbuster/protocol/openid-connect/certs

# Dev bypass (solo entornos locales)
DEV_MODE=false

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=ticketbuster
DB_USER=admin
DB_PASS=admin

# Microservices
CATALOG_SERVICE_URL=http://catalog-service:3000
ORDER_SERVICE_URL=http://order-worker:5000
NOTIFICATION_SERVICE_URL=http://notification-service:4000

# Security
JWT_SECRET=your-secret-key-min-32-chars-required
JWT_EXPIRATION=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGIN=http://localhost:5173

# Request Timeout
REQUEST_TIMEOUT=30000
```

## 📁 Estructura

```
api-gateway/
├── src/
│   ├── index.js              # Entry point
│   ├── config.js             # Configuración
│   ├── logger.js             # Winston logger
│   │
│   ├── middleware/
│   │   ├── auth.js           # JWT validation
│   │   ├── errorHandler.js   # Error handling
│   │   ├── rateLimit.js      # Rate limiting
│   │   └── cors.js           # CORS config
│   │
│   ├── routes/
│   │   ├── events.js         # → catalog-service
│   │   ├── orders.js         # → order-worker
│   │   ├── notifications.js  # → notification-service
│   │   ├── health.js         # Health check
│   │   └── index.js          # Router principal
│   │
│   ├── services/
│   │   ├── catalog.js        # Proxy a catalog-service
│   │   ├── orders.js         # Proxy a order-worker
│   │   ├── notifications.js  # Proxy a notification-service
│   │   └── auth.js           # Autenticación
│   │
│   └── utils/
│       ├── jwt.js            # JWT helpers
│       ├── validation.js     # Input validation
│       └── errors.js         # Error definitions
│
├── .env.example
├── Dockerfile
├── package.json
└── README.md
```

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (Express)                      │
│                      Port 8000                               │
│                                                              │
│  ┌───────────────────────────────────────────────────┐    │
│  │           Middleware Chain                         │    │
│  │  CORS → Auth → RateLimit → Validation → Logging  │    │
│  └───────────────────────────────────────────────────┘    │
│                          │                                  │
│  ┌──────────────┬────────┼────────┬──────────────┐        │
│  │              │                 │              │        │
│  ▼              ▼                 ▼              ▼        │
│ /api/events   /api/orders   /api/notif      /health    │
│                │                 │              │        │
│  ┌──────────────┴─────────┐  ┌──────────────────┴──┐    │
│  │   Catalog Service      │  │ Notification Svc  │    │
│  │   (3000)               │  │ (4000)            │    │
│  │                        │  │                   │    │
│  │ - GET /events         │  │ - Socket.io       │    │
│  │ - GET /events/:id     │  │ - REST API        │    │
│  │ - GET /seats          │  │                   │    │
│  └────────────────────────┘  └───────────────────┘    │
│                                                              │
│         Order Worker (5000)                                │
│         - POST /orders                                     │
│         - GET /orders/:id                                  │
│         - RabbitMQ consumer                                │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Autenticación JWT

### Flujo

1. **Login**: Cliente obtiene token JWT de Keycloak
2. **Request**: Envía JWT en header `Authorization: Bearer <token>`
3. **Validation**: Gateway valida y extrae información del usuario
4. **Forwarding**: Pasa información al microservicio (header `X-User-ID`)
5. **Response**: Respuesta se devuelve al cliente

### Middleware

```javascript
// src/middleware/auth.js
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    if (isPublicRoute(req.path)) {
      return next();
    }
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.headers['x-user-id'] = decoded.sub;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = auth;
```

## 🚦 Rate Limiting

Implementado con `express-rate-limit`:

```javascript
// src/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS),
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // No limitar health checks
    return req.path === '/health';
  },
  keyGenerator: (req) => {
    // Usar user ID si está autenticado
    return req.user?.sub || req.ip;
  }
});

module.exports = limiter;
```

## 📡 Rutas API

### Events (→ Catalog Service)

```bash
# Listar todos los eventos
GET /api/events
Headers: { Authorization: "Bearer <token>" }

# Obtener evento específico
GET /api/events/:id
Headers: { Authorization: "Bearer <token>" }

# Obtener asientos disponibles
GET /api/events/:eventId/seats
Headers: { Authorization: "Bearer <token>" }
```

### Orders (→ Order Worker)

```bash
# Crear nueva orden
POST /api/orders
Headers: { 
  Authorization: "Bearer <token>",
  Content-Type: "application/json"
}
Body: {
  event_id: 1,
  seat_ids: [5, 6, 7],
  user_id: "uuid"
}

# Obtener orden por ID
GET /api/orders/:orderId
Headers: { Authorization: "Bearer <token>" }

# Obtener órdenes del usuario
GET /api/orders
Headers: { Authorization: "Bearer <token>" }
```

### Notifications (→ Notification Service)

```bash
# Obtener historial de notificaciones
GET /api/notifications
Headers: { Authorization: "Bearer <token>" }

# Marcar como leída
POST /api/notifications/:id/read
Headers: { Authorization: "Bearer <token>" }
```

## 🏥 Health Check

```bash
curl http://localhost:8000/health
```

Respuesta:
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T10:30:00Z",
  "services": {
    "catalog": "healthy",
    "orders": "healthy",
    "notifications": "healthy"
  }
}
```

## 📝 Validación de Inputs

Usando Joi para validación:

```javascript
// src/utils/validation.js
const Joi = require('joi');

const createOrderSchema = Joi.object({
  event_id: Joi.number().integer().required(),
  seat_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
  user_id: Joi.string().uuid().required()
});

async function validateOrder(data) {
  try {
    const validated = await createOrderSchema.validateAsync(data);
    return { valid: true, data: validated };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

module.exports = { validateOrder };
```

## 🐳 Docker

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8000/health || exit 1

CMD ["node", "src/index.js"]
```

## 🚀 Deployment en K8s

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: ticketbuster
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: ticketbuster/api-gateway:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 8000
          name: http
        env:
        - name: PORT
          value: "8000"
        - name: CATALOG_SERVICE_URL
          value: "http://catalog-service:3000"
        - name: ORDER_SERVICE_URL
          value: "http://order-worker:5000"
        - name: NOTIFICATION_SERVICE_URL
          value: "http://notification-service:4000"
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
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: ticketbuster
spec:
  type: ClusterIP
  ports:
  - port: 8000
    targetPort: 8000
    protocol: TCP
    name: http
  selector:
    app: api-gateway
```

## 🔧 Troubleshooting

### Backend returns 401
- Verificar que el token JWT es válido
- Comprobar JWT_SECRET en .env
- Validar que no ha expirado

### 503 Service Unavailable
- Verificar que los microservicios están running
- Comprobar URLs en .env (CATALOG_SERVICE_URL, etc.)
- Ver logs: `docker logs api-gateway`

### Rate limit exceeded
- Aumentar RATE_LIMIT_MAX_REQUESTS en .env
- Implementar exponential backoff en cliente
- Usar caché en frontend

## 📚 Recursos

- [Express Guide](https://expressjs.com/)
- [Express HTTP Proxy](https://github.com/villadora/express-http-proxy)
- [JWT.io](https://jwt.io/)
- [Rate Limit](https://github.com/nfriedly/express-rate-limit)
- [Helmet.js](https://helmetjs.github.io/)

## 🔗 Enlaces Útiles

- **Backend**: http://localhost:8000/api
- **Health**: http://localhost:8000/health
- **Catalog Service**: http://localhost:3000 (directo, sin proxy)
- **Order Worker**: http://localhost:5000 (directo, sin proxy)

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0  
**Estado:** Producción ✅
