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

- Node.js >= 18.x
- Python >= 3.11
- Docker & Docker Compose
- kubectl (para K8s)

### Instalación

```bash
# Instalar dependencias de todos los servicios Node.js
cd api-gateway && npm install
cd ../catalog-service && npm install
cd ../notification-service && npm install
cd ../frontend && npm install

# Instalar dependencias de Python
cd ../order-worker && pip install -r requirements.txt
```

### Ejecución con Docker Compose

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
