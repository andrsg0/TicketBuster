# Protocol Buffers (gRPC) Definitions - TicketBuster

Definiciones de protocolos gRPC compartidas entre microservicios para comunicación de alta performance. Estas interfaces permiten que servicios en diferentes lenguajes (Node.js, Python, etc) se comuniquen de forma eficiente.

## 🎯 ¿Qué son Protocol Buffers?

Protocol Buffers es un método de serialización de datos agnóstico del lenguaje, que ofrece:

- ✅ **Eficiencia**: 10x más rápido que JSON, serialización binaria
- ✅ **Type Safety**: Validación de tipos en compilación
- ✅ **Language Agnostic**: Genera código para Python, Node.js, Go, Java, C++, etc
- ✅ **Versionado**: Schemas retrocompatibles, fácil evolución
- ✅ **RPC**: Framework gRPC integrado para llamadas remotas

## 📁 Estructura

```
proto/
├── catalog.proto       # Servicio de eventos y asientos
├── orders.proto        # Procesamiento de órdenes
├── events.proto        # Modelos de eventos
├── inventory.proto     # Gestión de inventario
├── common.proto        # Tipos compartidos
├── RABBITMQ_SCHEMA.md  # Documentación de colas
├── examples/           # Ejemplos de mensajes
│   ├── order-create-message.json
│   ├── order-completed-message.json
│   └── order-failed-message.json
└── README.md          # Este archivo
```

## 📋 Archivos Proto

### common.proto - Tipos Comunes

Definiciones reutilizables en todos los servicios:

```protobuf
syntax = "proto3";
package common;

enum ErrorCode {
  SUCCESS = 0;
  INVALID_INPUT = 1;
  NOT_FOUND = 2;
  ALREADY_EXISTS = 3;
  PERMISSION_DENIED = 4;
  INTERNAL_ERROR = 5;
  SERVICE_UNAVAILABLE = 6;
}

message Response {
  bool success = 1;
  string message = 2;
  ErrorCode error_code = 3;
  int64 timestamp = 4;
}

message PaginationRequest {
  int32 page = 1;
  int32 page_size = 2;
  string sort_by = 3;
  bool ascending = 4;
}

message PaginationResponse {
  int32 page = 1;
  int32 page_size = 2;
  int64 total = 3;
  int32 total_pages = 4;
}
```

### events.proto - Eventos

Modelo de eventos y sus operaciones:

```protobuf
syntax = "proto3";
package events;
import "proto/common.proto";

enum EventCategory {
  CONCERT = 0;
  THEATER = 1;
  SPORTS = 2;
  FESTIVAL = 3;
  CONFERENCE = 4;
  OTHER = 5;
}

message Event {
  int32 id = 1;
  string title = 2;
  string description = 3;
  EventCategory category = 4;
  int64 date_unix = 5;
  string location = 6;
  string venue = 7;
  float price = 8;
  string currency = 9;
  string image_url = 10;
  int32 available_seats = 11;
  int32 total_seats = 12;
  int64 created_at = 13;
  int64 updated_at = 14;
}

message GetEventRequest { int32 event_id = 1; }
message EventResponse {
  common.Response status = 1;
  Event event = 2;
}

message ListEventsRequest {
  EventCategory category = 1;
  int64 date_from = 2;
  int64 date_to = 3;
  float min_price = 4;
  float max_price = 5;
  common.PaginationRequest pagination = 6;
}

message ListEventsResponse {
  common.Response status = 1;
  repeated Event events = 2;
  common.PaginationResponse pagination = 3;
}
```

### inventory.proto - Asientos

Gestión de disponibilidad y bloqueos:

```protobuf
syntax = "proto3";
package inventory;
import "proto/common.proto";

enum SeatStatus {
  AVAILABLE = 0;
  LOCKED = 1;
  SOLD = 2;
  RESERVED = 3;
}

message Seat {
  int32 id = 1;
  int32 event_id = 2;
  string seat_number = 3;    // A1, A2, B1
  string row_number = 4;
  string section = 5;        // VIP, General
  SeatStatus status = 6;
  float price = 7;
  string locked_by_user = 8;
  int64 locked_until = 9;
  int64 created_at = 10;
  int64 updated_at = 11;
}

message GetSeatsRequest {
  int32 event_id = 1;
  string section = 2;
  SeatStatus filter_status = 3;
  common.PaginationRequest pagination = 4;
}

message SeatsResponse {
  common.Response status = 1;
  repeated Seat seats = 2;
  int32 total_available = 3;
  int32 total_locked = 4;
  int32 total_sold = 5;
  common.PaginationResponse pagination = 6;
}

message LockSeatsRequest {
  int32 event_id = 1;
  repeated int32 seat_ids = 2;
  string user_id = 3;
  int32 duration_minutes = 4;
}

message LockSeatsResponse {
  common.Response status = 1;
  repeated int32 locked_seat_ids = 2;
  repeated int32 failed_seat_ids = 3;
  int64 lock_expires_at = 4;
}

message ConfirmSeatsRequest {
  int32 event_id = 1;
  repeated int32 seat_ids = 2;
  string user_id = 3;
}

message ConfirmSeatsResponse {
  common.Response status = 1;
  int32 confirmed_seats = 2;
  int32 failed_seats = 3;
  string order_uuid = 4;
}
```

### orders.proto - Órdenes

Procesamiento de compras y tickets:

```protobuf
syntax = "proto3";
package orders;
import "proto/common.proto";

enum OrderStatus {
  PENDING = 0;
  CONFIRMED = 1;
  FAILED = 2;
  CANCELLED = 3;
  REFUNDED = 4;
}

message Order {
  string uuid = 1;
  int32 id = 2;
  string user_id = 3;
  int32 event_id = 4;
  OrderStatus status = 5;
  float total_price = 6;
  string currency = 7;
  repeated string ticket_uuids = 8;
  int64 created_at = 9;
  int64 confirmed_at = 10;
  int64 failed_at = 11;
}

message Ticket {
  string uuid = 1;
  string order_uuid = 2;
  int32 event_id = 3;
  int32 seat_id = 4;
  string seat_number = 5;
  string qr_code_hash = 6;
  string qr_code_url = 7;
  bool valid = 8;
  bool scanned = 9;
  int64 scanned_at = 10;
  int64 created_at = 11;
}

message CreateOrderRequest {
  string user_id = 1;
  int32 event_id = 2;
  repeated int32 seat_ids = 3;
}

message CreateOrderResponse {
  common.Response status = 1;
  Order order = 2;
  repeated Ticket tickets = 3;
}
```

### catalog.proto - RPC Service

Definición del servicio gRPC:

```protobuf
syntax = "proto3";
package catalog;
import "proto/events.proto";
import "proto/inventory.proto";
import "proto/common.proto";

service CatalogService {
  // Eventos
  rpc GetEvent(events.GetEventRequest) returns (events.EventResponse);
  rpc ListEvents(events.ListEventsRequest) returns (events.ListEventsResponse);
  
  // Asientos
  rpc GetSeats(inventory.GetSeatsRequest) returns (inventory.SeatsResponse);
  
  // Bloqueos
  rpc LockSeats(inventory.LockSeatsRequest) returns (inventory.LockSeatsResponse);
  rpc ConfirmSeats(inventory.ConfirmSeatsRequest) returns (inventory.ConfirmSeatsResponse);
}
```

## 🛠️ Compilación

### Node.js

```bash
# Instalar herramientas
npm install -g grpc-tools @grpc/grpc-js @grpc/proto-loader

# Compilar
grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:./src/proto \
  --grpc_out=grpc_js:./src/proto \
  --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` \
  proto/*.proto

# Genera: *_pb.js (datos) y *_grpc_pb.js (servicios)
```

### Python

```bash
# Instalar herramientas
pip install grpcio-tools

# Compilar
python -m grpc_tools.protoc \
  -I./proto \
  --python_out=./src/proto \
  --grpc_python_out=./src/proto \
  proto/catalog.proto

# Genera: *_pb2.py (datos) y *_pb2_grpc.py (servicios)
```

## 👨‍💻 Ejemplos

### Servidor (Catalog Service - Node.js)

```javascript
const grpc = require('@grpc/grpc-js');
const loader = require('@grpc/proto-loader');

const pkg = loader.loadSync('./proto/catalog.proto');
const catalog = grpc.loadPackageDefinition(pkg);

const server = new grpc.Server();
server.addService(catalog.catalog.CatalogService.service, {
  GetEvent: (call, callback) => {
    const event = database.getEvent(call.request.event_id);
    callback(null, { status: { success: true }, event });
  }
});

server.bindAsync('0.0.0.0:50051',
  grpc.ServerCredentials.createInsecure(),
  () => server.start()
);
```

### Cliente (Order Worker - Python)

```python
import grpc
from proto import catalog_pb2, catalog_pb2_grpc

channel = grpc.aio.secure_channel(
    'catalog-service:50051',
    grpc.aio.ssl_channel_credentials()
)
stub = catalog_pb2_grpc.CatalogServiceStub(channel)

response = await stub.LockSeats(
    catalog_pb2.LockSeatsRequest(
        event_id=1,
        seat_ids=[101, 102],
        user_id='user-123',
        duration_minutes=10
    )
)

print(f"Locked: {response.locked_seat_ids}")
```

## 🔄 Versionado

Cambios retrocompatibles:

```protobuf
// ✅ Agregar al final
message Event {
  int32 id = 1;
  string title = 2;
  string new_field = 3;  // Número nuevo
}

// ❌ NO cambiar números existentes
message Event {
  int32 id = 1;
  string title = 3;      // NUNCA
  string description = 2; // NUNCA
}

// ✅ Deprecar campos
message Event {
  int32 id = 1;
  string title = 2;
  reserved 3;            // Evitar reutilizar
  string new_field = 4;
}
```

## 📚 Recursos

- [Protocol Buffers Guide](https://developers.google.com/protocol-buffers)
- [gRPC Documentation](https://grpc.io/docs/)
- [gRPC Node.js](https://grpc.io/docs/languages/node/)
- [gRPC Python](https://grpc.io/docs/languages/python/)

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0  
**Estado:** Producción ✅

```

## Notes

- Keep proto files in sync across all services
- Use semantic versioning for breaking changes
- Document all message types and services
