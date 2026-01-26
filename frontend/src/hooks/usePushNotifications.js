/**
 * usePushNotifications Hook
 * Maneja permisos y envío de notificaciones push del navegador
 */

import { useState, useEffect, useCallback } from 'react';

// Verificar si las notificaciones están soportadas
const isSupported = () => 
  'Notification' in window && 'serviceWorker' in navigator;

export function usePushNotifications() {
  const [permission, setPermission] = useState(
    isSupported() ? Notification.permission : 'denied'
  );
  const [isSupported_, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isSupported());
    if (isSupported()) {
      setPermission(Notification.permission);
    }
  }, []);

  /**
   * Solicitar permiso para notificaciones
   * @returns {Promise<'granted' | 'denied' | 'default'>}
   */
  const requestPermission = useCallback(async () => {
    if (!isSupported()) {
      console.warn('[Push] Notificaciones no soportadas en este navegador');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        console.log('[Push] Permiso concedido');
        // Mostrar notificación de bienvenida
        showNotification('¡Notificaciones activadas!', {
          body: 'Recibirás alertas cuando tus órdenes se confirmen.',
          icon: '/logo192.svg',
          tag: 'welcome'
        });
      }
      
      return result;
    } catch (error) {
      console.error('[Push] Error solicitando permiso:', error);
      return 'denied';
    }
  }, []);

  /**
   * Mostrar una notificación push
   * @param {string} title - Título de la notificación
   * @param {NotificationOptions} options - Opciones de la notificación
   */
  const showNotification = useCallback((title, options = {}) => {
    if (!isSupported() || permission !== 'granted') {
      console.warn('[Push] No se puede mostrar notificación:', { isSupported: isSupported(), permission });
      return null;
    }

    const defaultOptions = {
      icon: '/logo192.svg',
      badge: '/logo192.svg',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      ...options
    };

    try {
      // Intentar usar el Service Worker si está disponible
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, defaultOptions);
        });
      } else {
        // Fallback a Notification API directa
        return new Notification(title, defaultOptions);
      }
    } catch (error) {
      console.error('[Push] Error mostrando notificación:', error);
      return null;
    }
  }, [permission]);

  /**
   * Mostrar notificación de orden completada
   * @param {Object} order - Datos de la orden
   */
  const notifyOrderCompleted = useCallback((order) => {
    const { order_uuid, event_id, seat_id, total_amount } = order;
    
    showNotification('✅ ¡Compra confirmada!', {
      body: `Tu ticket para el evento #${event_id} está listo. Asiento: ${seat_id}`,
      icon: '/logo192.svg',
      tag: `order-${order_uuid}`,
      data: { order_uuid, event_id, seat_id },
      actions: [
        { action: 'view', title: 'Ver ticket' },
        { action: 'dismiss', title: 'Cerrar' }
      ],
      requireInteraction: true
    });
  }, [showNotification]);

  /**
   * Mostrar notificación de orden fallida
   * @param {Object} order - Datos de la orden
   */
  const notifyOrderFailed = useCallback((order) => {
    const { order_uuid, error } = order;
    
    showNotification('❌ Error en la compra', {
      body: error || 'Hubo un problema procesando tu orden. Intenta de nuevo.',
      icon: '/logo192.svg',
      tag: `order-failed-${order_uuid}`,
      requireInteraction: true
    });
  }, [showNotification]);

  /**
   * Mostrar recordatorio de evento
   * @param {Object} event - Datos del evento
   * @param {string} timeUntil - Tiempo hasta el evento (ej: "1 hora")
   */
  const notifyEventReminder = useCallback((event, timeUntil) => {
    showNotification(`🎫 Recordatorio: ${event.title}`, {
      body: `Tu evento comienza en ${timeUntil}. ¡No olvides tu ticket!`,
      icon: event.image_url || '/logo192.svg',
      tag: `reminder-${event.id}`,
      data: { eventId: event.id },
      requireInteraction: true
    });
  }, [showNotification]);

  return {
    isSupported: isSupported_,
    permission,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isDefault: permission === 'default',
    requestPermission,
    showNotification,
    notifyOrderCompleted,
    notifyOrderFailed,
    notifyEventReminder
  };
}

export default usePushNotifications;
