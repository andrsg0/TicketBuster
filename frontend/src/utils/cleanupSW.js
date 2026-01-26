/**
 * Script para limpiar el Service Worker y cache en desarrollo
 * Ejecutar esto en la consola del navegador cuando tengas problemas de navegación
 */

// Desregistrar todos los Service Workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('✅ Service Worker desregistrado:', registration.scope);
    });
  });
}

// Limpiar todos los caches
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      caches.delete(cacheName);
      console.log('✅ Cache eliminado:', cacheName);
    });
  });
}

// Limpiar localStorage y sessionStorage
localStorage.clear();
sessionStorage.clear();
console.log('✅ Storage limpiado');

// Recargar la página
console.log('🔄 Recargando página...');
setTimeout(() => location.reload(true), 1000);
