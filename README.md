# TicketBuster
## Sistema Distribuido de Venta de Entradas

[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.x-blue?style=flat-square&logo=kubernetes)](https://kubernetes.io)
[![Docker](https://img.shields.io/badge/Docker-Latest-blue?style=flat-square&logo=docker)](https://www.docker.com/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green?style=flat-square&logo=node.js)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.13-blue?style=flat-square&logo=python)](https://www.python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

Sistema de venta de entradas enterprise-grade construido con **arquitectura de microservicios**, **cloud-native**, implementado en **Kubernetes** con soporte **offline-first**.

Trabajo integrador de **Programación Web Avanzada** y **Sistemas Distribuidos** - Enero 2026.

---

## 📋 Tabla de Contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Tecnologías](#tecnologías)
- [Inicio Rápido](#inicio-rápido)
- [Documentación](#documentación)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [URLs de Acceso](#urls-de-acceso)
- [Testing](#testing)

---

## ✨ Características

### 🎫 Core Features
- ✅ Catálogo de 20+ eventos con múltiples categorías
- ✅ Selección interactiva de asientos con validación en tiempo real
- ✅ Procesamiento asincrónico de órdenes con generación de QR
- ✅ Bloqueo temporal de asientos (10 minutos) para prevenir sobreventa
- ✅ Notificaciones en tiempo real vía WebSocket
- ✅ Autenticación OAuth2/OIDC (Keycloak)

### 🌐 Frontend Moderno
- ✅ Progressive Web App (PWA) con instalación en dispositivos
- ✅ Funcionamiento offline-first con IndexedDB
- ✅ Sincronización automática al recuperar conexión
- ✅ Responsive design (Mobile, Tablet, Desktop)
- ✅ Service Worker para caching inteligente
- ✅ Soporte para notificaciones push

### 🏗️ Infraestructura Distribuida
- ✅ Microservicios orquestados con Kubernetes
- ✅ Escalado automático horizontal (HPA)
- ✅ Comunicación híbrida: gRPC (síncrono) + RabbitMQ (asíncrono) + WebSocket (real-time)
- ✅ Health checks y readiness probes en todos los servicios
- ✅ Recuperación automática ante fallos
- ✅ Logging centralizado y observabilidad

### 🔒 Seguridad
- ✅ HTTPS/TLS con certificados válidos (Cloudflare Tunnel)
- ✅ Validación JWT centralizada
- ✅ Sanitización de inputs contra SQL injection
- ✅ CORS configurado correctamente
- ✅ Rate limiting por IP y usuario
- ✅ Credenciales en Kubernetes Secrets (nunca en código)

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (PWA React)                   │
│  • Offline-first con IndexedDB                          │
│  • Real-time via WebSocket                              │
│  • Instalable en dispositivos                           │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────┐
│           API GATEWAY (Express.js)                       │
│  • Auth centralizada (JWT)                              │
│  • Rate limiting                                        │
│  • Enrutamiento                                         │
└──┬───────────────────────────────────────────────┬──────┘
   │                                               │
   │ gRPC (sync)                       RabbitMQ (async)
   │                                               │
┌──▼──────────────────┐  ┌────────────────────────▼──────┐
│ Catalog Service     │  │ Order Worker                   │
│ • Eventos          │  │ • Procesa órdenes (CPU heavy) │
│ • Asientos         │  │ • Genera QR                    │
│ • gRPC server      │  │ • Notifica resultados          │
└──────────┬──────────┘  └────────────────────────┬──────┘
           │                                      │
           └──────────┬──────────────────────────┘
                      │
              ┌───────▼────────────────────┐
              │ PostgreSQL                 │
              │ • db_catalog (Eventos)     │
              │ • db_orders (Órdenes)      │
              └────────────────────────────┘
              
┌──────────────────────────────────────────────────────────┐
│         Notification Service (WebSocket)                │
│  • Notificaciones real-time                             │
│  • Socket.io con Redis adapter                          │
└──────────────────────────────────────────────────────────┘
```

### Patrones Implementados
- **API Gateway Pattern** - Punto centralizado de entrada
- **Database per Service** - Esquemas separados por responsabilidad
- **Event-Driven Architecture** - Publicador/Suscriptor con RabbitMQ
- **Circuit Breaker** - Tolerancia a fallos en comunicación
- **Saga Pattern** - Transacciones distribuidas con compensación
- **CQRS Conceptual** - Lectura optimizada, escritura serializada

---

## 🚀 Tecnologías

### Frontend
```
React 18 + Vite
├── TailwindCSS - Styling
├── Socket.io-client - Real-time
├── IndexedDB - Persistencia offline
├── Service Worker - PWA features
└── React Router - Navigation
```

### Backend (I/O Heavy)
```
Node.js + Express
├── http-proxy-middleware - Enrutamiento
├── jsonwebtoken - Validación auth
├── pg (PostgreSQL driver)
├── @grpc/grpc-js - gRPC server
└── pika/amqplib - RabbitMQ
```

### Backend (CPU Heavy)
```
Python + FastAPI
├── SQLAlchemy - ORM
├── pika - RabbitMQ consumer
├── qrcode - Generación QR
├── grpcio - gRPC client
└── psycopg2 - PostgreSQL driver
```

### Infraestructura
```
Kubernetes
├── StatefulSet - PostgreSQL, RabbitMQ
├── Deployment - Servicios stateless
├── HorizontalPodAutoscaler - Escalado automático
├── Service/Ingress - Descubrimiento
└── ConfigMap/Secret - Configuración

Docker - Containerización
PostgreSQL 17 - Base de datos
RabbitMQ - Message broker
Keycloak - Autenticación
Cloudflare Tunnel - HTTPS/Reverse proxy
```

---

## 🚀 Inicio Rápido

### ⚙️ Requisitos Previos

| Requisito | Versión | Instalación |
|-----------|---------|-------------|
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |
| kubectl | 1.24+ | Incluido en Docker Desktop |
| Node.js | 22.x LTS | https://nodejs.org |
| Python | 3.13+ | https://www.python.org |
| PowerShell | 5.1+ | Incluido en Windows |

### 📦 Instalación Local

#### 1. Clonar y preparar
```powershell
git clone <repo-url>
cd TicketBuster

# Instalar dependencias Node.js
foreach ($dir in @('api-gateway', 'catalog-service', 'notification-service', 'frontend')) {
    cd $dir
    npm install
    cd ..
}

# Instalar dependencias Python
cd order-worker
pip install -r requirements.txt
cd ..
```

#### 2. Iniciar (Elije uno)

**Opción A: Docker Compose (Local, Simple)**
```powershell
docker compose -f docker-compose.dev.yml up --build
# Acceder a http://localhost:5173
```

**Opción B: Kubernetes (Recomendado, Production-like)**
```powershell
# Habilitar Kubernetes en Docker Desktop
# Settings > Kubernetes > Enable Kubernetes

# Desplegar
.\scripts\test-k8s-completo.ps1

# Abrir puerto-forwards en otras ventanas
.\scripts\start-port-forwards.ps1

# Acceder a http://localhost:5173
```

### 🎯 URLs después de iniciar

| Componente | URL | Credenciales |
|------------|-----|--------------|
| 🌐 Frontend | http://localhost:5173 | - |
| 🚪 API Gateway | http://localhost:8000 | - |
| 📚 Catalog Service | http://localhost:3000/health | - |
| 🔔 Notification Service | http://localhost:4000 | - |
| 🐰 RabbitMQ Management | http://localhost:15672 | guest/guest |
| 🐘 PostgreSQL | localhost:5432 | admin/admin |
| 🔑 Keycloak (si aplica) | http://localhost:8080 | admin/admin |

### ✅ Validar Instalación

```powershell
# Verificar todos los pods
kubectl get pods -n ticketbuster

# Verificar 20 eventos cargados
kubectl exec -n ticketbuster deployment/postgres -- psql -U admin -d ticketbuster -c "SELECT COUNT(*) FROM db_catalog.events;"

# Listar asientos disponibles
kubectl exec -n ticketbuster deployment/postgres -- psql -U admin -d ticketbuster -c "SELECT COUNT(*) FROM db_catalog.seats WHERE status = 'AVAILABLE';"
```

---

## 📚 Documentación

### Documentos Principales

| Documento | Descripción |
|-----------|-------------|
| [INFORME_TECNICO.md](./INFORME_TECNICO.md) | Documentación técnica completa (arquitectura, decisiones, patrones) |
| [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) | Setup local con Docker Compose |
| [TEST-K8S.md](./TEST-K8S.md) | Guía completa para Kubernetes |
| [k8s/README.md](./k8s/README.md) | Manifiestos Kubernetes |

### Documentos por Servicio

- [frontend/README.md](./frontend/README.md) - React PWA
- [api-gateway/README.md](./api-gateway/README.md) - API Gateway
- [catalog-service/README.md](./catalog-service/README.md) - Catalog Service
- [order-worker/README.md](./order-worker/README.md) - Order Worker
- [notification-service/README.md](./notification-service/README.md) - Notification Service

---

## 📁 Estructura del Proyecto

```
TicketBuster/
├── frontend/                    # React PWA
│   ├── src/components/         # Componentes React
│   ├── src/pages/              # Páginas (Router)
│   ├── src/services/           # API client, offline storage
│   ├── manifest.json           # PWA manifest
│   └── vite.config.js
│
├── api-gateway/                 # Express.js Gateway
│   ├── src/middleware/         # Auth, logging, rate limiting
│   ├── src/routes/             # Rutas y proxies
│   └── index.js
│
├── catalog-service/             # Node.js Inventory
│   ├── src/db.js               # PostgreSQL connection
│   ├── src/grpcServer.js       # gRPC server
│   ├── src/index.js            # REST API
│   └── proto/
│
├── order-worker/                # Python Order Processing
│   ├── src/config.py           # Settings
│   ├── src/database.py         # SQLAlchemy
│   ├── src/rabbitmq.py         # RabbitMQ consumer
│   ├── src/qr_generator.py     # QR logic
│   └── main.py
│
├── notification-service/        # Node.js WebSocket
│   ├── src/index.js            # Socket.io server
│   └── src/rabbitmq.js         # RabbitMQ listener
│
├── proto/                       # Protocol Buffers
│   ├── common.proto
│   ├── inventory.proto
│   ├── events.proto
│   └── orders.proto
│
├── k8s/                         # Kubernetes Manifests
│   ├── namespace.yaml
│   ├── infrastructure.yaml      # DB, RabbitMQ
│   ├── services-deployment.yaml # Microservicios
│   ├── hpa.yaml                 # Autoscaling
│   └── init.sql
│
├── scripts/                     # Automation Scripts
│   ├── build-images.ps1         # Docker build
│   ├── deploy-local.ps1         # K8s deploy
│   ├── test-k8s-completo.ps1    # Full test
│   └── start-port-forwards.ps1  # Port forward
│
├── docker-compose.dev.yml       # Local development
├── INFORME_TECNICO.md           # Technical documentation
├── INFRASTRUCTURE.md            # Setup guide
├── TEST-K8S.md                  # Kubernetes guide
└── README.md                    # Este archivo
```

---

## 🧪 Testing

### Verificación Rápida
```powershell
# 1. Verificar que todos los pods estén Running
kubectl get pods -n ticketbuster

# 2. Verificar eventos cargados
$events = kubectl exec -n ticketbuster deployment/catalog-service -- wget -qO- "http://localhost:3000/events"

# 3. Abrir en navegador
start http://localhost:5173

# 4. Probar funcionalidades
# - Buscar eventos
# - Filtrar por categoría
# - Seleccionar asientos
# - Completar compra
# - Ver QR code
```

### Testing Completo (Kubernetes)
```powershell
# Ejecutar suite completa de testing
.\scripts\test-k8s-completo.ps1

# Monitorear escalado automático
kubectl get hpa -n ticketbuster -w

# Ver logs de un servicio
kubectl logs deployment/order-worker -n ticketbuster -f
```

---

## 🎓 Información Académica

**Asignaturas:** 
- Programación Web Avanzada
- Sistemas Distribuidos

**Período:** Enero 2026

**Temas Cubiertos:**
- Arquitectura de microservicios
- Orquestación con Kubernetes
- Patrones de diseño distribuido
- PWA y offline-first
- Escalabilidad y resiliencia
- Seguridad en sistemas distribuidos

---

## 🔗 Referencias

### Documentación Oficial
- [Kubernetes Docs](https://kubernetes.io/docs/)
- [React Documentation](https://react.dev)
- [Node.js API](https://nodejs.org/api/)
- [Python Docs](https://docs.python.org/3/)
- [Docker Docs](https://docs.docker.com/)

### Libros Recomendados
- Newman, S. (2015). Building Microservices. O'Reilly
- Richardson, C. (2018). Microservices Patterns. Manning
- Burns, B. et al. (2019). Kubernetes Up and Running. O'Reilly

---

## 📝 Licencia

MIT License - Ver [LICENSE](LICENSE)

---

## 📧 Contacto & Contribuciones

Para preguntas o sugerencias sobre la arquitectura y diseño del proyecto, revisar la documentación técnica completa en [INFORME_TECNICO.md](./INFORME_TECNICO.md).

**Última actualización:** Enero 2026  
**Versión:** 1.0 - Stable Release

## 📝 Licencia

MIT

## 👥 Equipo

Desarrollado por el equipo DevOps de TicketBuster
