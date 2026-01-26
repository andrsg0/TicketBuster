# TicketBuster - Diagramas de Microservicios (Mermaid)

## 1. Arquitectura General del Sistema

```mermaid
graph TB
    subgraph Client["🖥️ Cliente Final"]
        FE["Frontend PWA<br/>(React 18.x)<br/>Puerto: 5173"]
    end
    
    subgraph Gateway["🚪 Punto de Entrada"]
        AG["API Gateway<br/>(Express.js)<br/>Puerto: 3000<br/>- Auth JWT<br/>- Rate Limiting<br/>- Enrutamiento"]
    end
    
    subgraph Services["🔧 Microservicios"]
        CS["Catalog Service<br/>(Express.js + gRPC)<br/>Puerto: 3001<br/>- Eventos<br/>- Asientos<br/>- Inventario"]
        
        OW["Order Worker<br/>(Python)<br/>Puerto: 8000<br/>- QR Generation<br/>- Procesamiento"]
        
        NS["Notification Service<br/>(Express.js + Socket.io)<br/>Puerto: 4000<br/>- WebSocket<br/>- Real-time Events"]
    end
    
    subgraph Infrastructure["🗄️ Infraestructura"]
        PG["PostgreSQL<br/>Puerto: 5432<br/>- db_catalog<br/>- db_orders"]
        
        RMQ["RabbitMQ<br/>Puerto: 5672/15672<br/>- orders_queue<br/>- notifications_queue"]
        
        KC["Keycloak<br/>Puerto: 8080<br/>- OAuth2/OIDC<br/>- JWT Tokens"]
    end
    
    %% Conexiones
    FE -->|HTTP/REST| AG
    FE -->|WebSocket| NS
    FE -->|OAuth2| KC
    
    AG -->|gRPC| CS
    AG -->|AMQP| RMQ
    
    RMQ -->|Consume| OW
    OW -->|gRPC| CS
    OW -->|Publish| RMQ
    
    RMQ -->|Consume| NS
    NS -->|WebSocket| FE
    
    CS -->|SQL| PG
    OW -->|SQL| PG
    
    style FE fill:#61DAFB,stroke:#333,stroke-width:2px,color:#000
    style AG fill:#90EE90,stroke:#333,stroke-width:2px
    style CS fill:#FFB6C1,stroke:#333,stroke-width:2px
    style OW fill:#DDA0DD,stroke:#333,stroke-width:2px
    style NS fill:#87CEEB,stroke:#333,stroke-width:2px
    style PG fill:#FFD700,stroke:#333,stroke-width:2px,color:#000
    style RMQ fill:#FF8C00,stroke:#333,stroke-width:2px,color:#fff
    style KC fill:#98FB98,stroke:#333,stroke-width:2px
```

---

## 2. Flujo Completo de Compra de Entrada

```mermaid
sequenceDiagram
    actor User as 👤 Usuario
    participant FE as 🖥️ Frontend
    participant AG as 🚪 API Gateway
    participant CS as 📦 Catalog<br/>Service
    participant RMQ as 📨 RabbitMQ
    participant OW as ⚙️ Order<br/>Worker
    participant PG as 🗄️ PostgreSQL
    participant NS as 🔔 Notification<br/>Service
    
    User->>FE: 1. Selecciona evento y asientos
    FE->>AG: 2. POST /api/orders<br/>(con JWT)
    
    AG->>CS: 3. gRPC: ReserveSeats()<br/>(valida disponibilidad)
    CS->>PG: 4. Bloquea asientos<br/>(10 min timeout)
    PG-->>CS: 5. Confirmación
    CS-->>AG: 6. Seats reservados ✓
    
    AG->>RMQ: 7. Publica en<br/>orders_queue
    AG-->>FE: 8. Response: "Order processing"
    FE-->>User: 9. "Tu orden está siendo<br/>procesada"
    
    RMQ->>OW: 10. Consume order<br/>del queue
    
    OW->>CS: 11. gRPC: CommitSeats()
    CS->>PG: 12. Confirma compra<br/>definitiva
    PG-->>CS: 13. ✓
    CS-->>OW: 14. Committed
    
    OW->>OW: 15. Genera QR Code
    OW->>PG: 16. Guarda Order<br/>en db_orders
    PG-->>OW: 17. Order saved
    
    OW->>RMQ: 18. Publica en<br/>notifications_queue
    
    RMQ->>NS: 19. Consume notification
    NS->>FE: 20. WebSocket:<br/>OrderConfirmed
    
    FE->>FE: 21. Muestra QR +<br/>Confirmación
    FE-->>User: 22. ✅ ¡Entrada comprada!<br/>con QR descargable
```

---

## 3. Flujo de Notificaciones en Tiempo Real

```mermaid
graph LR
    subgraph Producer["📤 Productor"]
        OW["Order Worker<br/>(procesa orden)"]
    end
    
    subgraph Queue["📨 Message Broker"]
        NQ["RabbitMQ<br/>notifications_queue"]
    end
    
    subgraph Consumer["🔔 Consumidor"]
        NS["Notification Service<br/>(Socket.io)"]
    end
    
    subgraph Client["🖥️ Cliente"]
        WS["WebSocket<br/>Conexión persistente"]
        UI["React UI<br/>(actualiza en tiempo real)"]
    end
    
    OW -->|Publica| NQ
    NQ -->|Consume| NS
    NS -->|Emite evento| WS
    WS -->|Recibe| UI
    
    style OW fill:#DDA0DD,stroke:#333,stroke-width:2px
    style NQ fill:#FF8C00,stroke:#333,stroke-width:2px,color:#fff
    style NS fill:#87CEEB,stroke:#333,stroke-width:2px
    style WS fill:#90EE90,stroke:#333,stroke-width:2px
    style UI fill:#61DAFB,stroke:#333,stroke-width:2px,color:#000
```

---

## 4. Capas de la Arquitectura

```mermaid
graph TB
    subgraph Presentation["📱 Presentation Layer"]
        FE["Frontend PWA<br/>(React + Vite)"]
    end
    
    subgraph API["🔌 API Layer"]
        AG["API Gateway<br/>(Express.js)<br/>- Auth<br/>- Routing<br/>- Rate Limiting"]
    end
    
    subgraph Business["💼 Business Logic Layer"]
        CS["Catalog Service<br/>(gRPC Server)"]
        OW["Order Worker<br/>(Async Processor)"]
        NS["Notification Service<br/>(WebSocket)"]
    end
    
    subgraph Messaging["📬 Messaging Layer"]
        RMQ["RabbitMQ<br/>- orders_queue<br/>- notifications_queue"]
    end
    
    subgraph Data["🗄️ Data Layer"]
        PG["PostgreSQL<br/>- db_catalog<br/>- db_orders"]
    end
    
    subgraph Auth["🔐 Auth Layer"]
        KC["Keycloak<br/>(OAuth2/OIDC)"]
    end
    
    FE -->|HTTP/REST| AG
    FE -->|WebSocket| NS
    FE -->|OAuth2| KC
    
    AG -->|gRPC| CS
    AG -->|AMQP| RMQ
    
    CS -->|SQL| PG
    OW -->|SQL| PG
    
    RMQ -->|Consume/Produce| OW
    RMQ -->|Consume| NS
    NS -->|WebSocket| FE
    
    KC -.->|JWT Validation| AG
    
    style Presentation fill:#61DAFB,stroke:#333,stroke-width:2px,color:#000
    style API fill:#90EE90,stroke:#333,stroke-width:2px
    style Business fill:#FFB6C1,stroke:#333,stroke-width:2px
    style Messaging fill:#FF8C00,stroke:#333,stroke-width:2px,color:#fff
    style Data fill:#FFD700,stroke:#333,stroke-width:2px,color:#000
    style Auth fill:#98FB98,stroke:#333,stroke-width:2px
```

---

## 5. Dependencias Entre Servicios

```mermaid
graph TD
    FE["Frontend<br/>(React PWA)"]
    AG["API Gateway<br/>(3000)"]
    CS["Catalog Service<br/>(3001)"]
    OW["Order Worker<br/>(8000)"]
    NS["Notification Service<br/>(4000)"]
    PG["PostgreSQL<br/>(5432)"]
    RMQ["RabbitMQ<br/>(5672)"]
    KC["Keycloak<br/>(8080)"]
    
    FE -->|HTTP+Auth| AG
    FE -->|WebSocket| NS
    FE -->|Login| KC
    
    AG -->|gRPC| CS
    AG -->|Send| RMQ
    
    CS -->|Query| PG
    
    OW -->|Consume| RMQ
    OW -->|gRPC| CS
    OW -->|Write| PG
    OW -->|Produce| RMQ
    
    NS -->|Consume| RMQ
    NS -->|Notify| FE
    
    KC -.->|Validate JWT| AG
    
    style FE fill:#61DAFB,stroke:#0066cc,stroke-width:3px,color:#000
    style AG fill:#90EE90,stroke:#228B22,stroke-width:3px
    style CS fill:#FFB6C1,stroke:#DC143C,stroke-width:2px
    style OW fill:#DDA0DD,stroke:#8B008B,stroke-width:2px
    style NS fill:#87CEEB,stroke:#1E90FF,stroke-width:2px
    style PG fill:#FFD700,stroke:#FF8C00,stroke-width:3px,color:#000
    style RMQ fill:#FF8C00,stroke:#FF4500,stroke-width:3px,color:#fff
    style KC fill:#98FB98,stroke:#228B22,stroke-width:2px
```

---

## 6. Flujo de Autenticación con Keycloak

```mermaid
sequenceDiagram
    actor User as 👤 Usuario
    participant Browser as 🌐 Browser
    participant FE as 🖥️ Frontend
    participant KC as 🔐 Keycloak
    participant AG as 🚪 API Gateway
    
    User->>FE: 1. Accede a la app
    FE->>FE: 2. Verifica JWT en<br/>localStorage
    
    alt JWT no existe o expiró
        FE->>KC: 3. Redirige a login
        Browser->>KC: 4. OAuth2 Flow
        User->>KC: 5. Ingresa credenciales
        KC->>Browser: 6. Emite JWT token
        Browser->>FE: 7. Retorna con token
        FE->>FE: 8. Guarda JWT
    end
    
    FE->>AG: 9. Request con<br/>Authorization: Bearer JWT
    AG->>AG: 10. Valida JWT
    
    alt JWT válido
        AG->>AG: 11. Extrae user info
        AG->>FE: 12. Respuesta 200 ✓
    else JWT inválido/expirado
        AG->>FE: 13. Error 401
        FE->>KC: 14. Redirige a login
    end
```

---

## 7. Procesamiento de Órdenes (Detallado)

```mermaid
flowchart TD
    A["👤 Usuario selecciona<br/>evento + asientos"] --> B["🖥️ Frontend valida<br/>entrada localmente"]
    B --> C["📤 POST /api/orders<br/>al API Gateway"]
    C --> D["🔐 API Gateway<br/>valida JWT"]
    
    D --> E{"¿JWT<br/>válido?"} 
    E -->|No| F["❌ 401 Unauthorized"]
    E -->|Sí| G["📦 Catalog Service<br/>gRPC: ReserveSeats"]
    
    G --> H{"¿Asientos<br/>disponibles?"} 
    H -->|No| I["❌ 409 Conflict<br/>Asientos no disponibles"]
    H -->|Sí| J["✓ Bloquea asientos<br/>por 10 minutos"]
    
    J --> K["📨 API Gateway<br/>publica en orders_queue"]
    K --> L["✅ Responde al cliente<br/>Order ID + status"]
    L --> M["🖥️ Frontend muestra<br/>Processing..."]
    
    N["⚙️ Order Worker<br/>consume order"] -.->|asincrónico| K
    N --> O["💾 Procesa orden"]
    O --> P["🎫 Genera QR Code"]
    P --> Q["📦 Catalog Service<br/>gRPC: CommitSeats"]
    Q --> R["✓ Confirma compra<br/>definitiva"]
    R --> S["💾 Guarda en db_orders"]
    S --> T["📨 Publica en<br/>notifications_queue"]
    
    T --> U["🔔 Notification Service<br/>consume evento"]
    U --> V["📱 Emite WebSocket<br/>al Frontend"]
    V --> W["🖥️ Frontend recibe<br/>notificación"]
    W --> X["✅ Muestra confirmación<br/>+ QR descargable"]
    
    style A fill:#61DAFB,color:#000
    style X fill:#90EE90,color:#000
    style F fill:#FFB6C1
    style I fill:#FFB6C1
```

---

## 8. Estructura de Bases de Datos

```mermaid
graph TB
    subgraph PG["PostgreSQL"]
        subgraph Catalog["db_catalog"]
            Events["events<br/>- id<br/>- name<br/>- date<br/>- venue"]
            Seats["seats<br/>- id<br/>- event_id<br/>- seat_number<br/>- section"]
            Reservations["seat_reservations<br/>- id<br/>- seat_id<br/>- user_id<br/>- expires_at"]
        end
        
        subgraph Orders["db_orders"]
            Orders_Table["orders<br/>- id<br/>- user_id<br/>- event_id<br/>- total_price<br/>- status"]
            OrderItems["order_items<br/>- id<br/>- order_id<br/>- seat_id"]
            OrderStatus["order_status<br/>- order_id<br/>- status<br/>- timestamp"]
        end
    end
    
    Events -.->|1:N| Seats
    Seats -.->|1:N| Reservations
    Orders_Table -.->|1:N| OrderItems
    OrderItems -.->|N:1| Seats
    
    style PG fill:#FFD700,stroke:#FF8C00,stroke-width:3px,color:#000
    style Catalog fill:#E6F3FF,stroke:#0066cc,stroke-width:2px
    style Orders fill:#FFE6E6,stroke:#cc0000,stroke-width:2px
```

---

## 9. RabbitMQ - Message Flow

```mermaid
graph LR
    subgraph RMQ["RabbitMQ Message Broker"]
        subgraph OrdersQ["📊 orders_queue"]
            OQ["Mensajes de órdenes<br/>enviados por API Gateway"]
        end
        
        subgraph NotifQ["📣 notifications_queue"]
            NQ["Notificaciones enviadas<br/>por Order Worker"]
        end
    end
    
    AG["🚪 API Gateway<br/>(Productor)"] -->|PUT order| OQ
    OQ -->|GET order| OW["⚙️ Order Worker<br/>(Consumidor)"]
    OW -->|PUT notification| NQ
    NQ -->|GET notification| NS["🔔 Notification Service<br/>(Consumidor)"]
    NS -->|WebSocket| FE["🖥️ Frontend<br/>(Usuario recibe notif)"]
    
    style RMQ fill:#FF8C00,stroke:#FF4500,stroke-width:3px,color:#fff
    style OQ fill:#FFB347,stroke:#FF4500,stroke-width:2px,color:#000
    style NQ fill:#FFB347,stroke:#FF4500,stroke-width:2px,color:#000
    style AG fill:#90EE90,stroke:#228B22,stroke-width:2px
    style OW fill:#DDA0DD,stroke:#8B008B,stroke-width:2px
    style NS fill:#87CEEB,stroke:#1E90FF,stroke-width:2px
    style FE fill:#61DAFB,stroke:#0066cc,stroke-width:2px,color:#000
```

---

## 10. Escalabilidad en Kubernetes

```mermaid
graph TB
    subgraph K8S["⚙️ Kubernetes Cluster"]
        subgraph Ingress["🚪 Ingress/LoadBalancer"]
            LB["Load Balancer<br/>(Cloudflare Tunnel)"]
        end
        
        subgraph AGPods["🚪 API Gateway<br/>(Replicas: 2-5)"]
            AG1["Pod 1"]
            AG2["Pod 2"]
            AGN["Pod N"]
        end
        
        subgraph CSPods["📦 Catalog Service<br/>(Replicas: 2-4)"]
            CS1["Pod 1"]
            CS2["Pod 2"]
            CSN["Pod N"]
        end
        
        subgraph OWPods["⚙️ Order Worker<br/>(Replicas: 3-8)"]
            OW1["Pod 1"]
            OW2["Pod 2"]
            OWN["Pod N"]
        end
        
        subgraph NSPods["🔔 Notification Service<br/>(Replicas: 2-4)"]
            NS1["Pod 1"]
            NS2["Pod 2"]
            NSN["Pod N"]
        end
        
        subgraph Storage["💾 Storage"]
            PG["PostgreSQL<br/>StatefulSet<br/>(Replicas: 1)"]
            RMQ["RabbitMQ<br/>StatefulSet<br/>(Replicas: 1-3)"]
        end
        
        subgraph HPA["📈 Horizontal Pod Autoscaler"]
            HPA1["HPA: API Gateway"]
            HPA2["HPA: Catalog Service"]
            HPA3["HPA: Order Worker"]
            HPA4["HPA: Notification Service"]
        end
    end
    
    LB --> AG1
    LB --> AG2
    
    AG1 -->|gRPC| CS1
    AG2 -->|gRPC| CS2
    
    AG1 -->|AMQP| RMQ
    AG2 -->|AMQP| RMQ
    
    OW1 -->|Consume| RMQ
    OW2 -->|Consume| RMQ
    
    OW1 -->|gRPC| CS1
    OW2 -->|gRPC| CS2
    
    OW1 -->|Publish| RMQ
    OW2 -->|Publish| RMQ
    
    NS1 -->|Consume| RMQ
    NS2 -->|Consume| RMQ
    
    CS1 --> PG
    CS2 --> PG
    OW1 --> PG
    OW2 --> PG
    
    HPA1 -.->|Monitor & Scale| AG1
    HPA2 -.->|Monitor & Scale| CS1
    HPA3 -.->|Monitor & Scale| OW1
    HPA4 -.->|Monitor & Scale| NS1
    
    style K8S fill:#326CE5,stroke:#000,stroke-width:3px,color:#fff
    style Ingress fill:#90EE90,stroke:#228B22,stroke-width:2px
    style AGPods fill:#90EE90,stroke:#228B22,stroke-width:2px
    style CSPods fill:#FFB6C1,stroke:#DC143C,stroke-width:2px
    style OWPods fill:#DDA0DD,stroke:#8B008B,stroke-width:2px
    style NSPods fill:#87CEEB,stroke:#1E90FF,stroke-width:2px
    style Storage fill:#FFD700,stroke:#FF8C00,stroke-width:3px,color:#000
    style HPA fill:#98FB98,stroke:#228B22,stroke-width:2px
```

---

## 📋 Leyenda de Colores

| Color | Componente |
|-------|-----------|
| 🔵 Azul Claro | Frontend (React) |
| 🟢 Verde | API Gateway |
| 🔴 Rosa | Catalog Service |
| 🟣 Púrpura | Order Worker |
| 🔵 Azul | Notification Service |
| 🟡 Amarillo | PostgreSQL |
| 🟠 Naranja | RabbitMQ |
| 🟢 Verde Claro | Keycloak |

---

## 🔑 Referencias Rápidas

### Puertos
- **Frontend**: 5173 (dev), 80/443 (prod)
- **API Gateway**: 3000
- **Catalog Service**: 3001
- **Notification Service**: 4000
- **Order Worker**: 8000
- **PostgreSQL**: 5432
- **RabbitMQ**: 5672 (AMQP), 15672 (Management UI)
- **Keycloak**: 8080

### Protocolos
- **HTTP/REST**: Frontend ↔ API Gateway
- **gRPC**: API Gateway ↔ Catalog Service, Order Worker ↔ Catalog Service
- **AMQP**: API Gateway/Order Worker ↔ RabbitMQ
- **WebSocket**: Notification Service ↔ Frontend
- **TCP**: Todos ↔ PostgreSQL

### Colas RabbitMQ
- `orders_queue`: API Gateway → Order Worker
- `notifications_queue`: Order Worker → Notification Service
