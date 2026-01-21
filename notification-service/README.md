# Notification Service

Servicio de notificaciones en tiempo real para TicketBuster. Actúa como puente entre el backend asíncrono (RabbitMQ) y los usuarios finales vía WebSockets.

## Stack Tecnológico

- **Node.js** + Express
- **Socket.io** - WebSockets en tiempo real
- **amqplib** - Cliente RabbitMQ

## Arquitectura

```
┌─────────────┐    ┌─────────────────────┐    ┌──────────────────┐    ┌─────────┐
│ Order Worker│───►│ notifications_queue │───►│Notification Svc  │───►│ Browser │
│  (Python)   │    │     (RabbitMQ)      │    │   (Socket.io)    │    │  (WS)   │
└─────────────┘    └─────────────────────┘    └──────────────────┘    └─────────┘
                                                       │
                                              io.to(user_id).emit()
                                                (sala privada)
```

## Instalación

```bash
cd notification-service
npm install
```

## Configuración

Copiar `.env.example` a `.env`:

```bash
cp .env.example .env
```

Variables de entorno:

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `4000` |
| `CORS_ORIGIN` | Origen permitido para CORS | `*` |
| `RABBITMQ_URL` | URL de conexión a RabbitMQ | `amqp://guest:guest@localhost:5672` |
| `NOTIFICATIONS_QUEUE` | Nombre de la cola | `notifications_queue` |

## Ejecución

```bash
# Producción
npm start

# Desarrollo (con hot-reload)
npm run dev
```

## Endpoints REST

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/` | GET | Información del servicio |
| `/health` | GET | Health check con estadísticas |
| `/stats` | GET | Estadísticas de conexiones activas |
| `/notify` | POST | Enviar notificación manual (testing) |

### Ejemplo: Health Check

```bash
curl http://localhost:4000/health
```

```json
{
  "status": "ok",
  "service": "notification-service",
  "timestamp": "2026-01-21T04:17:32.030Z",
  "stats": {
    "totalSockets": 5,
    "uniqueUsers": 3,
    "rooms": 3
  }
}
```

### Ejemplo: Notificación Manual

```bash
curl -X POST http://localhost:4000/notify \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "message": "Tu orden está lista",
    "type": "success"
  }'
```

## Eventos Socket.io

### Cliente → Servidor

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `join_room` | `string` (user_id) | Unirse a sala privada de notificaciones |
| `leave_room` | - | Abandonar la sala de notificaciones |

### Servidor → Cliente

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `room_joined` | `{ success, room, message }` | Confirmación de unión a sala |
| `room_left` | `{ success }` | Confirmación de abandono de sala |
| `order_update` | Ver abajo | Actualización de estado de orden |
| `notification` | `{ type, message, timestamp }` | Notificación general |
| `error` | `{ message }` | Error de conexión |

### Payload de `order_update`

```json
{
  "type": "order.completed",
  "order_uuid": "df33f455-5500-42c9-8aed-2e92a86f22d1",
  "event_id": 1,
  "seat_id": 10,
  "status": "completed",
  "qr_code_hash": "8f7d3c2a1b0e9f8d7c6b5a4e3d2c1b0a",
  "total_amount": 99.99,
  "processing_time_ms": 2450,
  "error": null,
  "timestamp": "2026-01-21T04:15:00.000Z",
  "worker": "order-worker-1"
}
```

## Integración con Frontend

### Conexión básica (JavaScript)

```javascript
import { io } from 'socket.io-client';

// Conectar al servidor
const socket = io('http://localhost:4000');

// Unirse a la sala del usuario (después de login)
const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
socket.emit('join_room', userId);

// Confirmar unión
socket.on('room_joined', (data) => {
  console.log('Conectado a notificaciones:', data.message);
});

// Recibir actualizaciones de órdenes
socket.on('order_update', (notification) => {
  if (notification.status === 'completed') {
    console.log('✅ Orden completada:', notification.order_uuid);
    console.log('🎫 QR Code:', notification.qr_code_hash);
    // Mostrar modal de éxito, actualizar UI, etc.
  } else {
    console.log('❌ Orden fallida:', notification.error);
    // Mostrar mensaje de error
  }
});

// Manejar desconexión
socket.on('disconnect', () => {
  console.log('Desconectado del servidor de notificaciones');
});
```

### React Hook (ejemplo)

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useOrderNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const socket = io('http://localhost:4000');

    socket.on('connect', () => {
      socket.emit('join_room', userId);
    });

    socket.on('room_joined', () => {
      setConnected(true);
    });

    socket.on('order_update', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  return { notifications, connected };
}
```

## Flujo de Mensajes RabbitMQ

El servicio consume mensajes de `notifications_queue` con el siguiente formato:

```json
{
  "type": "order.completed",
  "data": {
    "order_uuid": "df33f455-5500-42c9-8aed-2e92a86f22d1",
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "event_id": 1,
    "seat_id": 10,
    "qr_code_hash": "8f7d3c2a1b0e9f8d7c6b5a4e3d2c1b0a",
    "total_amount": 99.99,
    "processing_time_ms": 2450,
    "completed_at": "2026-01-21T04:15:00.000Z"
  },
  "timestamp": "2026-01-21T04:15:00.500Z",
  "worker": "order-worker-1"
}
```

## Seguridad

- **Notificaciones privadas**: Cada usuario solo recibe notificaciones de sus propias órdenes gracias al sistema de salas de Socket.io
- **CORS configurable**: Restringir orígenes permitidos en producción
- **Sin persistencia**: Las notificaciones no se almacenan, solo se retransmiten

## Monitoreo

El endpoint `/stats` proporciona métricas en tiempo real:

```json
{
  "totalConnections": 150,
  "uniqueUsers": 45,
  "userRooms": {
    "a1b2c3d4...": 3,
    "b2c3d4e5...": 1
  }
}
```

## Estructura de Archivos

```
notification-service/
├── src/
│   ├── index.js              # Servidor Express + Socket.io
│   └── rabbitmqConsumer.js   # Consumidor RabbitMQ
├── package.json
├── .env.example
├── .env
├── Dockerfile
└── README.md
```
