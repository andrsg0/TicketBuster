# TicketBuster

Sistema de microservicios para gestión y venta de tickets de eventos.

## 🏗️ Arquitectura

Este proyecto está organizado como un **monorepo** que contiene todos los microservicios necesarios para el funcionamiento del sistema TicketBuster.

### Componentes

```
ticket-buster/
├── frontend/              # React (Vite) + PWA - Interfaz de usuario
├── api-gateway/           # Node.js + Express - Gateway principal
├── catalog-service/       # Node.js + Express - Gestión de eventos y asientos
├── order-worker/          # Python + FastAPI - Procesamiento pesado de órdenes
├── notification-service/  # Node.js + WebSockets - Notificaciones en tiempo real
├── k8s/                   # Manifiestos de Kubernetes
└── proto/                 # Definiciones gRPC compartidas
```

## 🚀 Tecnologías

- **Frontend**: React 18, Vite, PWA
- **Backend**: Node.js, Express, Python, FastAPI
- **Comunicación**: REST API, gRPC, WebSockets
- **Orquestación**: Docker, Docker Compose, Kubernetes
- **Infraestructura**: Cloud-native, microservicios

## 📦 Desarrollo Local

### Requisitos previos

- Node.js >= 22.x (LTS)
- Python >= 3.13
- Docker & Docker Compose v2
- Git Bash (Windows) o terminal Bash (Linux/macOS)

### Instalación Rápida

```bash
# Instalar dependencias de todos los servicios Node.js
cd api-gateway && npm install
cd ../catalog-service && npm install
cd ../notification-service && npm install
cd ../frontend && npm install

# Instalar dependencias de Python
cd ../order-worker && pip install -r requirements.txt
```

### 🚀 Iniciar Todo (Recomendado)

```bash
# Iniciar toda la aplicación (infraestructura + servicios + frontend)
./scripts/start-all.sh

# Ver estado de los servicios
./scripts/status.sh

# Detener microservicios (mantiene Docker)
./scripts/stop-all.sh

# Detener TODO incluyendo Docker
./scripts/stop-all.sh --all
```

**Inicio rápido alternativo** (frontend en primer plano):
```bash
./scripts/quick-start.sh
```

### URLs después de iniciar

| Servicio | URL |
|----------|-----|
| 🌐 Frontend | http://localhost:5173 |
| 🚪 API Gateway | http://localhost:8000 |
| 📚 Catalog Service | http://localhost:3000 |
| 🔔 Notifications | http://localhost:4000 |
| 🐰 RabbitMQ UI | http://localhost:15672 (guest/guest) |
| 🐘 PostgreSQL | localhost:15433 (admin/admin123) |

### Ejecución con Docker Compose (Solo Infraestructura)

```bash
# Levantar todos los servicios en modo desarrollo
docker compose -f docker-compose.dev.yml up --build

# Detener los servicios
docker compose -f docker-compose.dev.yml down

# Ver logs
docker compose -f docker-compose.dev.yml logs -f
```

## 🏃 Scripts

(Por definir para cada servicio)

## 📝 Licencia

MIT

## 👥 Equipo

Desarrollado por el equipo DevOps de TicketBuster
