# Frontend PWA - TicketBuster

Frontend Progressive Web Application (PWA) con estrategia Offline-First para el sistema de venta de tickets.

## Stack Tecnológico

- **React 19** + Vite 6
- **TailwindCSS** para estilos
- **vite-plugin-pwa** + Workbox para Service Worker
- **idb** para IndexedDB
- **socket.io-client** para notificaciones en tiempo real
- **react-oidc-context** para autenticación con Keycloak
- **react-router-dom** para routing

## Arquitectura

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

## Instalación

```bash
cd frontend

# Instalar dependencias
npm install

# Copiar configuración de entorno
cp .env.example .env
```

## Scripts

```bash
# Desarrollo con hot reload
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

## Configuración de Entorno

Variables en `.env`:

| Variable | Descripción | Default |
|----------|-------------|---------|
| `VITE_API_URL` | URL base del API Gateway | `/api` |
| `VITE_NOTIFICATION_URL` | URL del servicio de notificaciones | `http://localhost:4000` |
| `VITE_KEYCLOAK_URL` | URL del realm de Keycloak | `http://localhost:8080/realms/ticketbuster` |
| `VITE_KEYCLOAK_CLIENT_ID` | Client ID en Keycloak | `ticketbuster-frontend` |
| `VITE_DEV_MODE` | Habilita usuario mock para desarrollo | `true` |

## Estructura de Archivos

```
frontend/
├── public/
│   ├── logo192.svg           # Icono PWA 192x192
│   └── logo512.svg           # Icono PWA 512x512
├── src/
│   ├── components/
│   │   ├── BuyButton.jsx     # Botón de compra con fallback offline
│   │   ├── EventCard.jsx     # Tarjeta de evento
│   │   ├── EventList.jsx     # Lista de eventos con cache
│   │   ├── Footer.jsx        # Footer del sitio
│   │   ├── Header.jsx        # Header con navegación
│   │   ├── Layout.jsx        # Layout principal
│   │   ├── LoginButton.jsx   # Autenticación Keycloak
│   │   ├── NotificationToast.jsx  # Toast de notificaciones
│   │   └── OfflineBanner.jsx # Banner de estado offline
│   ├── hooks/
│   │   ├── useNotifications.js   # Socket.io para notificaciones
│   │   ├── useOnlineStatus.js    # Detección online/offline
│   │   └── useOrderSync.js       # Sync automático de órdenes
│   ├── pages/
│   │   ├── EventDetailPage.jsx   # Detalle de evento + compra
│   │   ├── HomePage.jsx          # Página principal
│   │   └── MyTicketsPage.jsx     # Mis tickets
│   ├── services/
│   │   ├── api.js                # Cliente API Gateway
│   │   └── offlineStorage.js     # IndexedDB wrapper
│   ├── App.jsx               # Componente raíz + routing
│   ├── index.css             # Estilos globales + Tailwind
│   └── main.jsx              # Entry point + providers
├── .env                      # Variables de entorno
├── .env.example              # Template de variables
├── index.html                # HTML template
├── package.json
├── postcss.config.js         # PostCSS config
├── tailwind.config.js        # Tailwind config
└── vite.config.js            # Vite + PWA config
```

## Funcionalidades Offline-First

### 1. Service Worker (Workbox)

El Service Worker cachea automáticamente:

- **Assets estáticos**: JS, CSS, HTML, imágenes, fuentes
- **API de eventos**: Estrategia `StaleWhileRevalidate` para `/api/events`
- **Imágenes**: Estrategia `CacheFirst` con expiración de 30 días

```javascript
// vite.config.js
workbox: {
  runtimeCaching: [
    {
      urlPattern: /\/api\/events/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'events-cache',
        expiration: { maxAgeSeconds: 60 * 60 * 24 }
      }
    }
  ]
}
```

### 2. IndexedDB (offlineStorage.js)

Base de datos local con tres stores:

| Store | Propósito |
|-------|-----------|
| `pending_orders` | Órdenes guardadas offline para sync posterior |
| `cached_events` | Eventos cacheados manualmente |
| `user_tickets` | Tickets del usuario para acceso offline |

```javascript
// Guardar orden offline
import { saveOfflineOrder } from './services/offlineStorage';

try {
  await createOrder(orderData);
} catch (error) {
  if (!navigator.onLine) {
    await saveOfflineOrder(orderData);
    showToast('Guardado offline. Se enviará al volver la conexión.');
  }
}
```

### 3. Sync Automático (useOrderSync)

Hook que sincroniza automáticamente cuando vuelve la conexión:

```javascript
import useOrderSync from './hooks/useOrderSync';

function App() {
  useOrderSync({
    onSyncSuccess: (order, response) => {
      showToast('Orden sincronizada exitosamente');
    },
    onSyncError: (order, error) => {
      console.log('Error sincronizando:', error);
    }
  });
}
```

## Componentes Clave

### BuyButton

Botón de compra con manejo automático de errores de red:

```jsx
<BuyButton
  eventId={1}
  seatId={5}
  userId="user-uuid"
  price={99.99}
  onSuccess={(response) => console.log('Compra exitosa')}
  onOfflineSave={(localId) => console.log('Guardado offline')}
  onError={(msg) => console.log('Error:', msg)}
/>
```

### EventList

Lista de eventos con soporte offline:

- Si hay conexión: Fetch desde API + cachea en IndexedDB
- Si no hay conexión: Muestra desde cache con banner de aviso

### NotificationToast

Toast que se muestra cuando llega una notificación via Socket.io:

```jsx
<NotificationToast 
  notification={{
    type: 'order.completed',
    order_uuid: 'abc123',
    qr_code_hash: 'qr-hash'
  }}
  onDismiss={() => clearNotification()}
  duration={7000}
/>
```

## Notificaciones en Tiempo Real

El hook `useNotifications` conecta a Socket.io:

```javascript
import useNotifications from './hooks/useNotifications';

function App() {
  const { 
    connected,           // Estado de conexión
    notifications,       // Historial de notificaciones
    latestNotification,  // Última notificación
    unreadCount          // Contador de no leídas
  } = useNotifications(userId);

  // Muestra toast cuando llega notificación
  useEffect(() => {
    if (latestNotification) {
      if (latestNotification.type === 'order.completed') {
        showToast('¡Tu entrada está lista!');
      }
    }
  }, [latestNotification]);
}
```

## Autenticación

Integración con Keycloak via `react-oidc-context`:

```javascript
import { useAuth } from 'react-oidc-context';

function LoginButton() {
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
