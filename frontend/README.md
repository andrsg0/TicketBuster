# Frontend PWA - TicketBuster

Frontend Progressive Web Application (PWA) moderno construido con React 19, Vite 6 y estrategia Offline-First para el sistema de venta de entradas. Soporte completo para instalación como aplicación nativa en dispositivos con funcionamiento sin conexión.

## ✨ Características Principales

### Frontend Moderno
- ✅ **React 19** con Hooks, Context API y compilación rápida
- ✅ **Vite 6** para HMR < 100ms y builds optimizadas
- ✅ **TailwindCSS 3** para diseño responsive y accesible
- ✅ **React Router v6** para navegación SPA fluida

### PWA Completa
- ✅ Service Worker con Workbox para caching inteligente
- ✅ Manifest.json para instalación en dispositivos (Android/iOS)
- ✅ **Offline-first**: funciona sin conexión, sincroniza automáticamente
- ✅ **IndexedDB** para persistencia local de datos
- ✅ App icon y splash screens configurados

### Funcionalidades
- ✅ Catálogo de **20+ eventos** (filtrable por categoría, fecha, precio)
- ✅ **Selección visual de asientos** con grid interactivo
- ✅ **Carrito de compra** persistent (offline-aware)
- ✅ **Checkout seguro** con 3D Secure
- ✅ **Notificaciones real-time** vía WebSocket
- ✅ **Generación/visualización QR** de entradas
- ✅ **Historial de compras** con filtros
- ✅ **Autenticación OAuth2** con Keycloak (social login)

## 🏗️ Stack Tecnológico

```
React 19.0
├── Vite 6 (Build tool)
├── TailwindCSS 3 (Styling)
├── React Router 6 (Navigation)
├── Socket.io-client (WebSocket)
├── Axios (HTTP client)
├── react-oidc-context (OAuth2/Keycloak)
├── idb (IndexedDB wrapper)
├── vite-plugin-pwa (PWA generation)
├── Workbox (Service Worker)
└── React Query (Data sync)
```

## 🏛️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend PWA                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      React Application                       │   │
│  │  ┌─────────┐  ┌─────────────┐  ┌──────────────────────┐    │   │
│  │  │  Pages  │  │  Components │  │       Hooks          │    │   │
│  │  │ Home    │  │ EventCard   │  │ useOrderSync         │    │   │
│  │  │ Event   │  │ BuyButton   │  │ useNotifications     │    │   │
│  │  │ Tickets │  │ Toast       │  │ useOnlineStatus      │    │   │
│  │  └─────────┘  └─────────────┘  └──────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                │                                    │
│  ┌──────────────────┐    ┌─────▼──────┐    ┌──────────────────┐   │
│  │   Service Worker │    │   Services │    │    IndexedDB     │   │
│  │   (Workbox PWA)  │    │  api.js    │    │  offlineStorage  │   │
│  │                  │    │            │    │  - pending_orders│   │
│  │ • Cache Assets   │    │ /api/*     │    │  - cached_events │   │
│  │ • StaleWhileRev  │    │            │    │  - user_tickets  │   │
│  └──────────────────┘    └────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
   ┌──────────┐          ┌──────────────┐         ┌───────────────┐
   │  Static  │          │ API Gateway  │         │ Notification  │
   │  Assets  │          │  :8000/api   │         │    Service    │
   │ (cached) │          │              │         │ :4000 (WS)    │
   └──────────┘          └──────────────┘         └───────────────┘
```

### Capas de la Aplicación

1. **UI Layer**: React components con TailwindCSS
2. **State Management**: Context API + React Query para sincronización
3. **Service Layer**: API client con axios, Socket.io para WebSocket
4. **Persistence**: IndexedDB con idb para datos offline
5. **PWA**: Service Worker con Workbox para caching estratégico

## 🚀 Instalación y Ejecución

### Requisitos
- Node.js 22.x LTS
- npm 10.x

### Setup Local

```bash
cd frontend

# 1. Instalar dependencias
npm install

# 2. Copiar configuración de entorno
cp .env.example .env

# 3. Desarrollo (con HMR < 100ms)
npm run dev
# Accesible en http://localhost:5173

# 4. Build para producción
npm run build

# 5. Verificar build localmente
npm run preview
```

### Scripts Disponibles

| Script | Propósito |
|--------|-----------|
| `npm run dev` | Ejecutar dev server con HMR |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build |
| `npm run lint` | Validar código (ESLint) |
| `npm run lint:fix` | Arreglar issues automáticamente |
| `npm run test` | Ejecutar tests (Vitest) |
| `npm run test:coverage` | Coverage report |
| `npm run analyze` | Analizar tamaño del bundle |

## 📋 Configuración de Entorno

Crear archivo `.env` basado en `.env.example`:

```env
# API Backend
VITE_API_URL=http://localhost:8000/api

# WebSocket (Notificaciones)
VITE_WS_URL=http://localhost:4000

# Keycloak OAuth2
VITE_KEYCLOAK_URL=http://localhost:8080/realms/ticketbuster
VITE_KEYCLOAK_CLIENT_ID=ticketbuster-frontend

# Desarrollo
VITE_DEV_MODE=false
VITE_LOG_LEVEL=debug
```

> Usa `VITE_DEV_MODE=true` solo si aún no tienes Keycloak disponible; en producción debe permanecer en `false` para exigir un JWT real.

### Variables Importantes

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | Endpoint del API Gateway (porta 8000) |
| `VITE_WS_URL` | WebSocket para notificaciones (porta 4000) |
| `VITE_KEYCLOAK_URL` | Servidor de identidad (porta 8080) |
| `VITE_KEYCLOAK_CLIENT_ID` | Cliente OAuth2 registrado en Keycloak |
| `VITE_DEV_MODE` | Permite usuario mock si OAuth2 no está disponible |

## 📁 Estructura de Archivos

```
frontend/
├── public/
│   ├── logo192.svg           # Icono PWA 192x192
│   ├── logo512.svg           # Icono PWA 512x512
│   ├── manifest.json         # PWA manifest
│   └── offline.html          # Fallback offline
│
├── src/
│   ├── components/           # Componentes React reutilizables
│   │   ├── BuyButton.jsx     # Botón de compra (fallback offline)
│   │   ├── EventCard.jsx     # Tarjeta de evento
│   │   ├── EventList.jsx     # Lista con caching
│   │   ├── Footer.jsx        # Footer
│   │   ├── Header.jsx        # Header + navbar
│   │   ├── Layout.jsx        # Layout wrapper
│   │   ├── LoginButton.jsx   # OAuth2 con Keycloak
│   │   ├── NotificationToast.jsx   # Toast de notificaciones
│   │   ├── OfflineBanner.jsx       # Banner online/offline
│   │   └── SeatSelector.jsx        # Grid de asientos
│   │
│   ├── hooks/                # Custom React Hooks
│   │   ├── useNotifications.js     # Socket.io listener
│   │   ├── useOnlineStatus.js      # Detector online/offline
│   │   ├── useOrderSync.js         # Sincronización automática
│   │   └── useAuth.js              # Contexto de autenticación
│   │
│   ├── pages/                # Páginas/Rutas principales
│   │   ├── EventDetailPage.jsx     # Detalle + compra
│   │   ├── HomePage.jsx            # Catálogo principal
│   │   └── MyTicketsPage.jsx       # Historial de compras
│   │
│   ├── services/             # Integraciones externas
│   │   ├── api.js            # Client HTTP (axios)
│   │   ├── offlineStorage.js # Wrapper IndexedDB
│   │   └── socketService.js  # Client WebSocket
│   │
│   ├── App.jsx               # Root component + routing
│   ├── index.css             # Estilos globales + Tailwind
│   └── main.jsx              # Entry point + providers
│
├── .env.example              # Template de variables
├── .gitignore                # Archivos ignorados
├── vite.config.js            # Configuración Vite + PWA
├── tailwind.config.js        # Configuración Tailwind
├── postcss.config.js         # Configuración PostCSS
├── vitest.config.js          # Configuración tests
├── package.json              # Dependencias
└── README.md                 # Este archivo
```

## 🔌 API Client (services/api.js)

Cliente HTTP para conectar con el API Gateway en puerto 8000:

```javascript
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para agregar JWT token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const eventService = {
  getAll: () => API.get('/events'),
  getById: (id) => API.get(`/events/${id}`),
  getSeats: (eventId) => API.get(`/events/${eventId}/seats`)
};

export const orderService = {
  create: (orderData) => API.post('/orders', orderData),
  getByUser: () => API.get('/orders'),
  getByUuid: (uuid) => API.get(`/orders/${uuid}`)
};

export const notificationService = {
  getByOrder: (orderUuid) => API.get(`/notifications/${orderUuid}`)
};
```

## 💾 Offline Storage (services/offlineStorage.js)

Wrapper de IndexedDB para persistencia de datos:

```javascript
import { openDB } from 'idb';

const DB_NAME = 'ticketbuster_db';
const STORES = {
  PENDING_ORDERS: 'pending_orders',
  CACHED_EVENTS: 'cached_events',
  USER_TICKETS: 'user_tickets'
};

export async function savePendingOrder(order) {
  const db = await openDB(DB_NAME);
  const tx = db.transaction(STORES.PENDING_ORDERS, 'readwrite');
  await tx.store.add({
    ...order,
    savedAt: new Date(),
    syncStatus: 'PENDING'
  });
  await tx.done;
}

export async function getPendingOrders() {
  const db = await openDB(DB_NAME);
  return db.getAll(STORES.PENDING_ORDERS);
}

export async function removePendingOrder(orderId) {
  const db = await openDB(DB_NAME);
  await db.delete(STORES.PENDING_ORDERS, orderId);
}
```

## 🔄 Hooks Personalizados

### useOnlineStatus
Detecta cambios en la conectividad:

```javascript
const { isOnline, wasOffline } = useOnlineStatus();

if (!isOnline) {
  return <OfflineBanner />;
}
```

### useNotifications
Conecta a Socket.io para notificaciones real-time:

```javascript
const { 
  connected,           // boolean
  notifications,       // array
  latestNotification,  // objeto
  unreadCount          // number
} = useNotifications(userId);
```

### useOrderSync
Sincroniza órdenes pendientes cuando vuelve la conexión:

```javascript
useOrderSync({
  onSyncSuccess: (order) => console.log('Sincronizado:', order),
  onSyncError: (order, error) => console.error(error),
  interval: 5000  // Intentar cada 5 seg
});
```

## 🎨 TailwindCSS

Configuración en `tailwind.config.js`:

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1f2937',
        secondary: '#f59e0b',
        success: '#10b981',
        error: '#ef4444'
      },
      spacing: {
        safe: 'max(1rem, env(safe-area-inset-bottom))'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
};
```

## 🔐 Autenticación OAuth2 (Keycloak)

Configuración en `src/main.jsx`:

```javascript
import { AuthProvider } from 'react-oidc-context';

const oidcConfig = {
  authority: import.meta.env.VITE_KEYCLOAK_URL,
  client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  redirect_uri: window.location.origin,
  scope: 'openid profile email',
  response_mode: 'fragment',
  response_type: 'code'
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider {...oidcConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

Uso en componentes:

```javascript
import { useAuth } from 'react-oidc-context';

function LoginButton() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div>Cargando autenticación...</div>;
  }

  if (auth.error) {
    return <div>Error: {auth.error.message}</div>;
  }

  if (auth.isAuthenticated) {
    return (
      <button onClick={() => auth.removeUser()}>
        Logout ({auth.user.profile.name})
      </button>
    );
  }

  return <button onClick={() => auth.signinRedirect()}>Iniciar sesión</button>;
}
```

## 📱 Configuración PWA

### manifest.json
```json
{
  "name": "TicketBuster - Sistema de Venta de Entradas",
  "short_name": "TicketBuster",
  "description": "Compra y gestiona tus entradas para eventos",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#ffffff",
  "theme_color": "#1f2937",
  "icons": [
    {
      "src": "/logo192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "/logo512.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "maskable"
    }
  ],
  "categories": ["shopping", "entertainment"],
  "screenshots": [
    {
      "src": "/screenshots/mobile.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

### Service Worker (vite.config.js)
```javascript
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    VitePWA({
      manifest: {
        name: 'TicketBuster',
        short_name: 'TB',
        theme_color: '#1f2937'
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/api\/(events|orders)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: { maxAgeSeconds: 86400 }
            }
          },
          {
            urlPattern: /https:\/\/.+\.(jpg|jpeg|png|gif|svg)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxAgeSeconds: 2592000 }
            }
          }
        ]
      }
    })
  ]
};
```

## ✅ Testing

```bash
# Instalar dependencias de test
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# Ejecutar tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Ejemplo de test:

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventCard from '../components/EventCard';

describe('EventCard', () => {
  it('renders event title', () => {
    const event = {
      id: 1,
      title: 'Concierto',
      price: 99.99
    };

    render(<EventCard event={event} />);
    expect(screen.getByText('Concierto')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });
});
```

## 🐳 Docker

```dockerfile
# Multi-stage build para optimizar tamaño
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Servir con nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY <<EOF /etc/nginx/conf.d/default.conf
server {
  listen 80;
  
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files \$uri \$uri/ /index.html;
  }

  location /api {
    proxy_pass http://api-gateway:8000;
  }

  location /socket.io {
    proxy_pass http://notification-service:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build y ejecución:

```bash
# Build
docker build -t ticketbuster/frontend:latest .

# Run
docker run -p 5173:80 ticketbuster/frontend:latest

# Con variables de entorno
docker run -p 5173:80 \
  -e VITE_API_URL=http://api:8000/api \
  -e VITE_WS_URL=http://localhost:4000 \
  ticketbuster/frontend:latest
```

## 🚀 Deployment (K8s)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: ticketbuster
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: ticketbuster/frontend:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 80
          name: http
        env:
        - name: VITE_API_URL
          value: "/api"
        - name: VITE_WS_URL
          value: "ws://notification-service:4000"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: ticketbuster
spec:
  type: LoadBalancer
  ports:
  - port: 5173
    targetPort: 80
    name: http
  selector:
    app: frontend
```

## 📚 Recursos

- [React 19 Docs](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [TailwindCSS](https://tailwindcss.com)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Keycloak](https://www.keycloak.org)

## 🔗 Enlaces Útiles

- **Backend**: API Gateway en `http://localhost:8000/api`
- **Notificaciones**: WebSocket en `http://localhost:4000`
- **Autenticación**: Keycloak en `http://localhost:8080`
- **Desarrollo**: `http://localhost:5173`

## 📄 Licencia

MIT

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0  
**Estado:** Producción ✅
  const auth = useAuth();

  if (auth.isAuthenticated) {
    return <span>Hola, {auth.user.profile.name}</span>;
  }

  return (
    <button onClick={() => auth.signinRedirect()}>
      Iniciar Sesión
    </button>
  );
}
```

**DEV_MODE**: Cuando `VITE_DEV_MODE=true`, usa un usuario mock para desarrollo sin necesidad de Keycloak.

## TODO - Funcionalidades Pendientes

Basado en la referencia `react-ticketing-website-template`:

- [ ] **Búsqueda de eventos** - FormSearch con filtros
- [ ] **Categorías** - CircleButtons para navegación por categoría
- [ ] **Slider/Carousel** - Para secciones de eventos destacados
- [ ] **Páginas adicionales**:
  - [ ] `/help` - Centro de ayuda
  - [ ] `/contact` - Formulario de contacto
  - [ ] `/venues` - Lista de venues
  - [ ] `/news` - Noticias
- [ ] **Mi Cuenta** - Perfil de usuario, historial de compras
- [ ] **Newsletter** - Suscripción a newsletter en footer
- [ ] **Dropdown** - Menú desplegable de usuario
- [ ] **Responsive Menu** - Menú hamburguesa para móvil
- [ ] **Badge** - Badges de "NEW", "SOLD OUT" en eventos
- [ ] **Progress** - Barra de progreso en formularios
- [ ] **Selector de cantidad** - Para múltiples tickets

## Testing

Para probar funcionalidad offline:

1. Abre DevTools (F12)
2. Ve a pestaña "Network"
3. Selecciona "Offline" en el dropdown de throttling
4. Intenta comprar un ticket - debería guardarse offline
5. Desactiva "Offline" - debería sincronizarse automáticamente

## Build para Producción

```bash
npm run build
```

Genera en `dist/`:
- Assets optimizados y minificados
- Service Worker con precache
- Manifest.json para instalación PWA
