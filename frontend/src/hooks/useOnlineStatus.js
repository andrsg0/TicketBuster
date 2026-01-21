/**
 * useOnlineStatus Hook
 * Detecta cambios en el estado de conexión a internet
 */

import { useState, useEffect, useCallback } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    console.log('[useOnlineStatus] Conexión restaurada');
    setIsOnline(true);
    if (!navigator.onLine) return; // Double check
    setWasOffline(true);
  }, []);

  const handleOffline = useCallback(() => {
    console.log('[useOnlineStatus] Conexión perdida');
    setIsOnline(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  const resetWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  return { isOnline, wasOffline, resetWasOffline };
}

export default useOnlineStatus;
