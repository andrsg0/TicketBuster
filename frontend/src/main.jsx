import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from 'react-oidc-context';
import { registerSW } from 'virtual:pwa-register';
import { oidcConfig } from './components/LoginButton';
import App from './App';
import './index.css';

// En desarrollo: desregistrar SW para evitar cache de navegación
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister());
  });
}

// Registrar Service Worker solo en producción
if (import.meta.env.PROD) {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Nuevo contenido disponible - actualizar automáticamente
      console.log('Nueva versión disponible, actualizando...');
      updateSW(true);
    },
    onOfflineReady() {
      console.log('App lista para uso offline');
    },
    onRegistered(registration) {
      console.log('SW registrado:', registration?.scope);
      // Verificar actualizaciones periódicamente (cada hora)
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registro fallido:', error);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider {...oidcConfig}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
);
