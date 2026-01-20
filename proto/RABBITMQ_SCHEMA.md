# RabbitMQ Message Schemas - TicketBuster

## Overview

Este documento define los esquemas JSON de los mensajes que fluyen a través de las colas de RabbitMQ en el sistema TicketBuster.

## Arquitectura de Colas

```
API Gateway → [order.create.queue] → Order Worker (Python)
                                          ↓
                                  [order.notification.queue] → Notification Service
```

## Exchange Configuration

- **Exchange Name**: `ticketbuster.orders`
- **Type**: `topic`
- **Durable**: `true`

### Routing Keys

- `order.create` - Nueva orden creada (API Gateway → Worker)
- `order.completed` - Orden completada (Worker → Notification)
- `order.failed` - Orden fallida (Worker → Notification)

---

## 1. Order Create Message

**Queue**: `order.create.queue`  
**Routing Key**: `order.create`  
**Producer**: API Gateway  
**Consumer**: Order Worker

### Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "order_uuid",
    "user_id",
    "event_id",
    "seat_id",
    "total_amount",
    "processing_complexity",
    "timestamp"
  ],
  "properties": {
    "order_uuid": {
      "type": "string",
      "format": "uuid",
      "description": "Identificador único de la orden"
    },
    "user_id": {
      "type": "string",
      "format": "uuid",
      "description": "UUID del usuario desde Keycloak"
    },
    "event_id": {
      "type": "integer",
      "minimum": 1,
      "description": "ID del evento"
    },
    "seat_id": {
      "type": "integer",
      "minimum": 1,
      "description": "ID del asiento reservado"
    },
    "total_amount": {
      "type": "number",
      "minimum": 0,
      "description": "Monto total de la orden en formato decimal"
    },
    "processing_complexity": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10,
      "description": "Nivel de complejidad para simular carga CPU (1=bajo, 10=alto). Usado para testing de autoscaling en K8s."
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp ISO 8601 de creación de la orden"
    },
    "payment_method": {
      "type": "string",
      "enum": ["credit_card", "debit_card", "paypal", "stripe"],
      "description": "Método de pago utilizado"
    },
    "payment_reference": {
      "type": "string",
      "description": "Referencia del pago del procesador externo"
    },
    "client_metadata": {
      "type": "object",
      "properties": {
        "ip_address": {
          "type": "string",
          "format": "ipv4"
        },
        "user_agent": {
          "type": "string"
        },
        "session_id": {
          "type": "string"
        }
      }
    },
    "retry_count": {
      "type": "integer",
      "default": 0,
      "description": "Número de reintentos (para dead-letter queue)"
    },
    "priority": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10,
      "default": 5,
      "description": "Prioridad del mensaje (10=máxima)"
    }
  }
}
```

### Example Message

```json
{
  "order_uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "event_id": 42,
  "seat_id": 1337,
  "total_amount": 89.99,
  "processing_complexity": 7,
  "timestamp": "2026-01-20T14:30:00.000Z",
  "payment_method": "credit_card",
  "payment_reference": "ch_3Abc123Def456Ghi789",
  "client_metadata": {
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    "session_id": "sess_xyz789"
  },
  "retry_count": 0,
  "priority": 5
}
```

---

## 2. Order Completed Message

**Queue**: `order.notification.queue`  
**Routing Key**: `order.completed`  
**Producer**: Order Worker  
**Consumer**: Notification Service

### Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "order_uuid",
    "user_id",
    "event_id",
    "seat_id",
    "qr_code_hash",
    "completed_at"
  ],
  "properties": {
    "order_uuid": {
      "type": "string",
      "format": "uuid"
    },
    "user_id": {
      "type": "string",
      "format": "uuid"
    },
    "event_id": {
      "type": "integer"
    },
    "seat_id": {
      "type": "integer"
    },
    "seat_number": {
      "type": "string",
      "description": "Número de asiento legible (ej: A-15)"
    },
    "qr_code_hash": {
      "type": "string",
      "description": "Hash del código QR generado para la entrada"
    },
    "total_amount": {
      "type": "number"
    },
    "processing_time_ms": {
      "type": "integer",
      "description": "Tiempo de procesamiento en milisegundos"
    },
    "completed_at": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

### Example Message

```json
{
  "order_uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "event_id": 42,
  "seat_id": 1337,
  "seat_number": "SECT-A-1337",
  "qr_code_hash": "8f7d3c2a1b0e9f8d7c6b5a4e3d2c1b0a",
  "total_amount": 89.99,
  "processing_time_ms": 3450,
  "completed_at": "2026-01-20T14:30:45.000Z"
}
```

---

## 3. Order Failed Message

**Queue**: `order.notification.queue`  
**Routing Key**: `order.failed`  
**Producer**: Order Worker  
**Consumer**: Notification Service

### Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "order_uuid",
    "user_id",
    "error_code",
    "error_message",
    "failed_at"
  ],
  "properties": {
    "order_uuid": {
      "type": "string",
      "format": "uuid"
    },
    "user_id": {
      "type": "string",
      "format": "uuid"
    },
    "event_id": {
      "type": "integer"
    },
    "seat_id": {
      "type": "integer"
    },
    "error_code": {
      "type": "string",
      "enum": [
        "SEAT_UNAVAILABLE",
        "PAYMENT_FAILED",
        "TIMEOUT",
        "INVENTORY_ERROR",
        "DATABASE_ERROR",
        "UNKNOWN_ERROR"
      ]
    },
    "error_message": {
      "type": "string",
      "description": "Mensaje de error legible"
    },
    "retry_count": {
      "type": "integer"
    },
    "can_retry": {
      "type": "boolean",
      "description": "Si el usuario puede reintentar la compra"
    },
    "failed_at": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

### Example Message

```json
{
  "order_uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "event_id": 42,
  "seat_id": 1337,
  "error_code": "SEAT_UNAVAILABLE",
  "error_message": "El asiento seleccionado ya no está disponible",
  "retry_count": 1,
  "can_retry": true,
  "failed_at": "2026-01-20T14:30:15.000Z"
}
```

---

## Processing Complexity Explained

El campo `processing_complexity` (1-10) es crucial para simular y testear el autoscaling horizontal de Kubernetes:

### Comportamiento del Worker

```python
# Pseudocódigo en el Order Worker
iterations = processing_complexity * 100000

for i in range(iterations):
    # Operaciones intensivas de CPU:
    # - Hashing SHA-256 múltiple
    # - Generación de código QR
    # - Encriptación de datos sensibles
    qr_hash = hashlib.sha256(data + str(i)).hexdigest()
```

### Uso en Testing

| Complexity | CPU Time | Use Case |
|------------|----------|----------|
| 1-3        | ~100ms   | Producción normal |
| 4-6        | ~500ms   | Carga media |
| 7-8        | ~2s      | Testing de autoscaling |
| 9-10       | ~5s      | Stress testing extremo |

### Métricas de Autoscaling

```yaml
# HPA (Horizontal Pod Autoscaler) se activará cuando:
# - CPU > 70% promedio
# - Memoria > 80%
# - Latencia > 3s (custom metric)
```

---

## Queue Configuration Example

### RabbitMQ Setup (Python - pika)

```python
import pika

connection = pika.BlockingConnection(
    pika.ConnectionParameters(host='rabbitmq')
)
channel = connection.channel()

# Declare exchange
channel.exchange_declare(
    exchange='ticketbuster.orders',
    exchange_type='topic',
    durable=True
)

# Declare queues
channel.queue_declare(
    queue='order.create.queue',
    durable=True,
    arguments={
        'x-message-ttl': 600000,  # 10 minutes
        'x-dead-letter-exchange': 'ticketbuster.dlx',
        'x-max-priority': 10
    }
)

# Bind queue to exchange
channel.queue_bind(
    exchange='ticketbuster.orders',
    queue='order.create.queue',
    routing_key='order.create'
)
```

---

## Message Properties

Todos los mensajes deben incluir las siguientes propiedades AMQP:

```python
properties = pika.BasicProperties(
    delivery_mode=2,  # persistent
    content_type='application/json',
    content_encoding='utf-8',
    priority=5,  # 0-10
    correlation_id=order_uuid,
    timestamp=int(time.time()),
    app_id='api-gateway',
    headers={
        'x-retry-count': 0,
        'x-origin-service': 'api-gateway',
        'x-trace-id': trace_id  # For distributed tracing
    }
)
```

---

## Error Handling & Dead Letter Queue

### DLQ Configuration

```javascript
// Node.js - API Gateway
const dlxConfig = {
  exchange: 'ticketbuster.dlx',
  queue: 'order.create.dlq',
  routingKey: 'order.create.failed'
};

// Mensajes van a DLQ después de:
// 1. 3 reintentos fallidos
// 2. TTL expirado (10 minutos)
// 3. Queue llena (x-max-length)
```

---

## Monitoring & Observability

### Métricas Recomendadas

- `rabbitmq_queue_messages_ready` - Mensajes pendientes
- `rabbitmq_queue_messages_unacked` - Mensajes en proceso
- `order_processing_duration_seconds` - Histograma de latencia
- `order_processing_complexity_count` - Contador por nivel

### Logging

Todos los mensajes deben loggearse con:
- `trace_id` - Para distributed tracing
- `order_uuid` - Identificador único
- `timestamp` - Para análisis temporal
- `retry_count` - Para debugging

---

## Best Practices

1. **Idempotencia**: El Worker debe manejar mensajes duplicados
2. **Timeouts**: Procesar con timeout máximo de 30s
3. **Dead Letter Queue**: Configurar DLQ para reintentos
4. **Prioridad**: Usar priority queue para órdenes VIP
5. **Monitoring**: Alertas si queue > 1000 mensajes
6. **Circuit Breaker**: Pausar consumo si tasa de error > 50%

---

## Testing

### Sample Test Messages

Ver el directorio `tests/fixtures/rabbitmq/` para ejemplos de mensajes de prueba con diferentes niveles de complejidad.

```bash
# Enviar mensaje de prueba
python scripts/send_test_order.py --complexity 7 --count 100
```
