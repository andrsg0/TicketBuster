/**
 * useNotifications Hook
 * Maneja la conexión Socket.io para notificaciones en tiempo real
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const NOTIFICATION_SERVER = import.meta.env.VITE_NOTIFICATION_URL || 'http://localhost:4000';

// Flag para evitar spam de logs
let connectionWarningShown = false;

export function useNotifications(userId) {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [latestNotification, setLatestNotification] = useState(null);
  const socketRef = useRef(null);

  // Conectar al servidor de notificaciones (opcional - falla silenciosamente)
  useEffect(() => {
    if (!userId) {
      return;
    }

    // Solo intentar conectar una vez, no reintentar infinitamente
    const socket = io(NOTIFICATION_SERVER, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 2, // Reducir intentos para no spamear
      reconnectionDelay: 3000,
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      connectionWarningShown = false;
      socket.emit('join_room', userId);
    });

    socket.on('room_joined', (data) => {
      setConnected(true);
    });

    socket.on('order_update', (notification) => {
      console.log('[useNotifications] Actualización de orden recibida:', notification);
      setNotifications(prev => [notification, ...prev]);
      setLatestNotification(notification);
    });

    socket.on('notification', (notification) => {
      console.log('[useNotifications] Notificación recibida:', notification);
      setNotifications(prev => [notification, ...prev]);
      setLatestNotification(notification);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      // Solo mostrar advertencia una vez
      if (!connectionWarningShown) {
        console.warn('[Notifications] Servicio de notificaciones no disponible - las notificaciones en tiempo real estarán desactivadas');
        connectionWarningShown = true;
      }
    });

    socket.on('error', () => {
      // Silenciar errores - el servicio es opcional
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  // Limpiar la última notificación
  const clearLatestNotification = useCallback(() => {
    setLatestNotification(null);
  }, []);

  // Limpiar todas las notificaciones
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setLatestNotification(null);
  }, []);

  // Obtener notificaciones no leídas (más recientes que cierto tiempo)
  const getUnreadCount = useCallback((sinceMinutes = 60) => {
    const since = Date.now() - sinceMinutes * 60 * 1000;
    return notifications.filter(n => {
      const timestamp = new Date(n.timestamp || n.completed_at).getTime();
      return timestamp > since;
    }).length;
  }, [notifications]);

  return {
    connected,
    notifications,
    latestNotification,
    clearLatestNotification,
    clearAllNotifications,
    unreadCount: getUnreadCount()
  };
}

export default useNotifications;
