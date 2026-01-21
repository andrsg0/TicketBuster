# Order Worker - TicketBuster

Worker asíncrono que procesa órdenes de compra en segundo plano. Consumidor de RabbitMQ que genera entradas, QR codes y notificaciones. Escrito en Python con soporte para procesamiento paralelo.

## 🎯 Características

### Procesamiento de Órdenes
- ✅ Consumidor de RabbitMQ (orders_queue)
- ✅ Confirmación de asientos y generación de entradas
- ✅ Generación de QR codes con datos de entrada
- ✅ Manejo de fallos y reintentos automáticos
- ✅ Transacciones ACID con PostgreSQL

### Integraciones
- ✅ **RabbitMQ**: Consume eventos de órdenes
- ✅ **PostgreSQL**: Persiste órdenes y entradas
- ✅ **gRPC**: Comunica con catalog-service
- ✅ **RabbitMQ Publisher**: Publica notificaciones

### Observabilidad
- ✅ Logging detallado con logging de Python
- ✅ Métricas de procesamiento
- ✅ Health checks para K8s
- ✅ Manejo de errores y deadletters

## 🛠️ Stack Tecnológico

```
Python 3.11 + Async
├── pika (RabbitMQ AMQP client)
├── psycopg2 (PostgreSQL driver)
├── grpcio & grpcio-tools (gRPC client)
├── qrcode & PIL (QR generation)
├── python-json-logger (Structured logging)
├── asyncio (Async processing)
└── SQLAlchemy (ORM)
```

## 🚀 Instalación

### Requisitos
- Python 3.11+
- pip 23.x
- RabbitMQ running (localhost:5672)
- PostgreSQL running (localhost:5432)
- Catalog Service running (gRPC en puerto 50051)

### Setup Local

```bash
cd order-worker

# Crear virtual environment
python3.11 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar configuración
cp .env.example .env

# Ejecutar
python main.py
```

### Variables de Entorno (.env)

```env
# Server
PORT=5000
WORKER_THREADS=4
NODE_ENV=production

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=ticketbuster
DB_USER=admin
DB_PASS=admin

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
RABBITMQ_QUEUE=orders_queue
RABBITMQ_PREFETCH=1

# gRPC
GRPC_CATALOG_HOST=catalog-service
GRPC_CATALOG_PORT=50051

# QR Code
QR_VERSION=2
QR_ERROR_CORRECTION=M
QR_BOX_SIZE=10
QR_BORDER=2

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Retries
MAX_RETRIES=3
RETRY_BACKOFF=2
```

## 📁 Estructura

```
order-worker/
├── main.py                 # Entry point
├── config.py              # Configuration & env loading
├── logger.py              # Logging setup
│
├── workers/
│   ├── __init__.py
│   ├── order_processor.py # Main order processing logic
│   ├── qr_generator.py    # QR code generation
│   └── notification_sender.py  # Publish to notifications_queue
│
├── services/
│   ├── __init__.py
│   ├── rabbitmq_consumer.py    # RabbitMQ AMQP consumer
│   ├── rabbitmq_publisher.py   # RabbitMQ publisher
│   ├── database.py             # PostgreSQL operations
│   ├── grpc_client.py          # gRPC catalog client
│   └── payment_processor.py    # Validación de pago
│
├── models/
│   ├── __init__.py
│   ├── order.py           # Order model
│   ├── ticket.py          # Ticket model
│   └── payment.py         # Payment model
│
├── utils/
│   ├── __init__.py
│   ├── errors.py          # Custom exceptions
│   ├── validators.py      # Input validation
│   ├── formatters.py      # Data formatting
│   └── decorators.py      # Retry decorators
│
├── proto/                 # Proto files (compartidas)
│   ├── catalog.proto
│   ├── inventory.proto
│   └── events.proto
│
├── migrations/            # Alembic migrations
│   ├── env.py
│   └── versions/
│
├── requirements.txt       # Python dependencies
├── .env.example
├── Dockerfile
├── main.py
└── README.md
```

## 🏗️ Arquitectura

```
┌────────────────────────────────────────────────────────┐
│              Order Worker (Python)                     │
│           Async Task Processing                        │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │       Main Event Loop (asyncio)              │    │
│  │  ┌────────────────────────────────────────┐  │    │
│  │  │  RabbitMQ Consumer (AMQP)               │  │    │
│  │  │  - Listen orders_queue                 │  │    │
│  │  │  - Parse order events                  │  │    │
│  │  │  - Deserialize JSON                    │  │    │
│  │  └────────────────────────────────────────┘  │    │
│  │                    │                         │    │
│  │                    ▼                         │    │
│  │  ┌────────────────────────────────────────┐  │    │
│  │  │    Order Processor (Worker Pool)       │  │    │
│  │  │  Worker 1-N (configurable threads)    │  │    │
│  │  │                                        │  │    │
│  │  │  1. Validate order data               │  │    │
│  │  │  2. Check with catalog-service (gRPC)│  │    │
│  │  │  3. Confirm seats in DB               │  │    │
│  │  │  4. Generate QR code                  │  │    │
│  │  │  5. Create tickets in DB              │  │    │
│  │  │  6. Update order status               │  │    │
│  │  │  7. Publish notifications             │  │    │
│  │  └────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────┘    │
│     │          │          │          │               │
│     ▼          ▼          ▼          ▼               │
│  ┌─────────────────────────────────────────────┐   │
│  │    PostgreSQL (db_orders schema)            │   │
│  │  - orders                                  │   │
│  │  - tickets (QR data)                       │   │
│  │  - payments                                │   │
│  │  - notifications                           │   │
│  └─────────────────────────────────────────────┘   │
│     │          │          │          │               │
│     │          │          ├──────────┤               │
│     │          │          ▼          │               │
│     │          │    ┌──────────────┐ │               │
│     │          │    │  QR Codes    │ │               │
│     │          │    │  Generated   │ │               │
│     │          │    │  /tmp/qr/    │ │               │
│     │          │    └──────────────┘ │               │
│     │          │                     │               │
│     │          └─────────────────────┘               │
│     │                     │                         │
│     ▼                     ▼                         │
│ ┌──────────┐       ┌──────────────┐                │
│ │Catalog   │       │RabbitMQ      │                │
│ │Service   │       │notifications │                │
│ │(gRPC)    │       │_queue        │                │
│ │          │       │              │                │
│ │LockSeats │       │notify_user   │                │
│ │ConfirmSt │       │order_updated │                │
│ └──────────┘       └──────────────┘                │
└────────────────────────────────────────────────────────┘
```

## 📊 Schema Base de Datos

### Tabla: orders (db_orders)
```sql
CREATE TABLE db_orders.orders (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id INTEGER NOT NULL REFERENCES db_catalog.events(id),
  
  total_price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, failed, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  
  INDEX idx_user_id (user_id),
  INDEX idx_event_id (event_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at DESC)
);
```

### Tabla: tickets (db_orders)
```sql
CREATE TABLE db_orders.tickets (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  order_id INTEGER NOT NULL REFERENCES db_orders.orders(id),
  
  event_id INTEGER NOT NULL,
  seat_id INTEGER NOT NULL,
  seat_number VARCHAR(10),
  
  ticket_type VARCHAR(50), -- regular, vip, etc
  
  qr_code_hash VARCHAR(255), -- Hash del QR para verificación
  qr_code_url VARCHAR(500),  -- URL al QR generado
  
  valid BOOLEAN DEFAULT TRUE,
  scanned BOOLEAN DEFAULT FALSE,
  scanned_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_order_id (order_id),
  INDEX idx_event_id (event_id),
  UNIQUE(seat_id)
);
```

## 🔄 Flujo de Procesamiento

### 1. Consumidor RabbitMQ

```python
# workers/order_processor.py
import pika
import json
from config import get_config

class OrderConsumer:
    def __init__(self):
        self.config = get_config()
        self.connection = None
        self.channel = None
    
    def connect(self):
        credentials = pika.PlainCredentials('guest', 'guest')
        parameters = pika.ConnectionParameters(
            host='rabbitmq',
            port=5672,
            credentials=credentials
        )
        self.connection = pika.BlockingConnection(parameters)
        self.channel = self.connection.channel()
        
        # Declare queue
        self.channel.queue_declare(
            queue=self.config.RABBITMQ_QUEUE,
            durable=True
        )
        
        # Set QoS
        self.channel.basic_qos(prefetch_count=1)
    
    def start_consuming(self):
        self.channel.basic_consume(
            queue=self.config.RABBITMQ_QUEUE,
            on_message_callback=self.process_order,
            auto_ack=False
        )
        
        logger.info('Order consumer started')
        self.channel.start_consuming()
    
    def process_order(self, ch, method, properties, body):
        try:
            order_data = json.loads(body)
            logger.info(f"Processing order: {order_data['order_uuid']}")
            
            # Procesar orden
            result = self.handle_order(order_data)
            
            if result['success']:
                ch.basic_ack(delivery_tag=method.delivery_tag)
                logger.info(f"Order processed: {order_data['order_uuid']}")
            else:
                ch.basic_nack(
                    delivery_tag=method.delivery_tag,
                    requeue=True
                )
                logger.error(f"Order failed: {order_data['order_uuid']}")
        
        except Exception as e:
            logger.error(f"Error processing order: {str(e)}", exc_info=True)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
```

### 2. Procesar Orden

```python
def handle_order(self, order_data):
    """
    Procesar orden:
    1. Validar datos
    2. Confirmar asientos con catalog-service (gRPC)
    3. Crear registros en BD
    4. Generar QR codes
    5. Publicar notificación
    """
    
    try:
        # 1. Validar
        validated = validate_order_data(order_data)
        
        # 2. Confirmar asientos (gRPC)
        grpc_client = GrpcCatalogClient()
        lock_result = grpc_client.confirm_seats(
            event_id=validated['event_id'],
            seat_ids=validated['seat_ids'],
            user_id=validated['user_id']
        )
        
        if not lock_result['success']:
            return {'success': False, 'error': 'Seats unavailable'}
        
        # 3. Crear orden en BD
        order_id = create_order_in_db(validated)
        
        # 4. Generar tickets con QR
        tickets = []
        for seat_id in validated['seat_ids']:
            qr_code = generate_qr_code(order_id, seat_id)
            ticket = create_ticket_in_db(order_id, seat_id, qr_code)
            tickets.append(ticket)
        
        # 5. Publicar notificación
        publish_order_completed(order_id, tickets)
        
        return {
            'success': True,
            'order_uuid': order_data['order_uuid'],
            'tickets': tickets
        }
    
    except Exception as e:
        logger.error(f"Order processing failed: {str(e)}")
        return {'success': False, 'error': str(e)}
```

### 3. Generar QR Code

```python
# workers/qr_generator.py
import qrcode
import os
from PIL import Image, ImageDraw, ImageFont

class QRCodeGenerator:
    def __init__(self):
        self.qr_dir = '/tmp/qr_codes'
        os.makedirs(self.qr_dir, exist_ok=True)
    
    def generate(self, ticket_data):
        """
        Generar QR code con datos de entrada:
        {
          "ticket_uuid": "...",
          "order_uuid": "...",
          "event_id": 1,
          "seat": "A1",
          "timestamp": "2026-01-15T10:30:00Z"
        }
        """
        
        # Crear QR
        qr = qrcode.QRCode(
            version=2,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2
        )
        
        qr_data = json.dumps(ticket_data)
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color='black', back_color='white')
        
        # Guardar
        filename = f"{ticket_data['ticket_uuid']}.png"
        filepath = os.path.join(self.qr_dir, filename)
        img.save(filepath)
        
        # Retornar hash (para verificación)
        import hashlib
        with open(filepath, 'rb') as f:
            qr_hash = hashlib.sha256(f.read()).hexdigest()
        
        return {
            'filepath': filepath,
            'filename': filename,
            'hash': qr_hash,
            'url': f'/qr/{filename}'
        }
```

### 4. Publicar Notificación

```python
def publish_order_completed(order_uuid, tickets):
    """Publicar evento orden completada a notifications_queue"""
    
    publisher = RabbitMQPublisher()
    
    message = {
        'type': 'order.completed',
        'order_uuid': order_uuid,
        'ticket_count': len(tickets),
        'tickets': [
            {
                'uuid': t['uuid'],
                'qr_hash': t['qr_hash'],
                'seat': t['seat_number']
            }
            for t in tickets
        ],
        'timestamp': datetime.utcnow().isoformat()
    }
    
    publisher.publish(
        queue='notifications_queue',
        message=message
    )
```

## 🔐 gRPC Client

```python
# services/grpc_client.py
import grpc
from proto import catalog_pb2, catalog_pb2_grpc
from config import get_config

class GrpcCatalogClient:
    def __init__(self):
        self.config = get_config()
        self.channel = grpc.aio.secure_channel(
            f"{self.config.GRPC_CATALOG_HOST}:{self.config.GRPC_CATALOG_PORT}",
            grpc.aio.ssl_channel_credentials()
        )
        self.stub = catalog_pb2_grpc.CatalogServiceStub(self.channel)
    
    async def confirm_seats(self, event_id, seat_ids, user_id):
        """Confirmar que los asientos están disponibles"""
        
        request = catalog_pb2.ConfirmSeatsRequest(
            event_id=event_id,
            seat_ids=seat_ids,
            user_id=user_id
        )
        
        response = await self.stub.ConfirmSeats(request)
        return {
            'success': response.success,
            'confirmed_seats': list(response.seat_ids)
        }
    
    async def lock_seats(self, event_id, seat_ids, user_id, minutes=10):
        """Bloquear asientos temporalmente"""
        
        request = catalog_pb2.LockSeatsRequest(
            event_id=event_id,
            seat_ids=seat_ids,
            user_id=user_id,
            duration_minutes=minutes
        )
        
        response = await self.stub.LockSeats(request)
        return response.success
```

## 💾 Retries y Resiliencia

```python
# utils/decorators.py
import functools
import time
from config import get_config

def retry_with_backoff(max_retries=3, backoff_factor=2):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            config = get_config()
            retries = 0
            delay = 1
            
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    retries += 1
                    if retries >= max_retries:
                        raise
                    
                    logger.warning(
                        f"Retry {retries}/{max_retries} after {delay}s: {str(e)}"
                    )
                    time.sleep(delay)
                    delay *= backoff_factor
        
        return wrapper
    return decorator

# Uso
@retry_with_backoff(max_retries=3, backoff_factor=2)
def save_order_to_db(order_data):
    # ... database operation
    pass
```

## 🐳 Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create QR directory
RUN mkdir -p /tmp/qr_codes

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:5000/health')"

CMD ["python", "main.py"]
```

## 🚀 Deployment en K8s

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-worker
  namespace: ticketbuster
spec:
  replicas: 1
  selector:
    matchLabels:
      app: order-worker
  template:
    metadata:
      labels:
        app: order-worker
    spec:
      containers:
      - name: order-worker
        image: ticketbuster/order-worker:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 5000
          name: http
        env:
        - name: PORT
          value: "5000"
        - name: DB_HOST
          value: postgres
        - name: DB_PORT
          value: "5432"
        - name: DB_USER
          value: admin
        - name: DB_PASS
          value: admin
        - name: RABBITMQ_URL
          value: amqp://guest:guest@rabbitmq:5672
        - name: GRPC_CATALOG_HOST
          value: catalog-service
        - name: GRPC_CATALOG_PORT
          value: "50051"
        - name: LOG_LEVEL
          value: INFO
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 5
```

## 📚 Requirements.txt

```
pika==1.3.2
psycopg2-binary==2.9.9
grpcio==1.60.0
grpcio-tools==1.60.0
qrcode==7.4.2
Pillow==10.1.0
python-json-logger==2.0.7
python-dotenv==1.0.0
requests==2.31.0
SQLAlchemy==2.0.23
Alembic==1.12.1
```

## 🔧 Troubleshooting

### RabbitMQ connection error
- Verificar que RabbitMQ está running
- Comprobar RABBITMQ_URL en .env
- Ver logs del worker

### gRPC connection refused
- Verificar que catalog-service está running
- Comprobar puertos (50051)
- Validar GRPC_CATALOG_HOST

### Órdenes no se procesan
- Verificar que orders_queue existe en RabbitMQ
- Comprobar logs del worker
- Validar que PostgreSQL está disponible

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0  
**Estado:** Producción ✅
