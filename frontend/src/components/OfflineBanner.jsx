import { useState, useEffect } from 'react';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { getPendingOrdersCount } from '../services/offlineStorage';

export default function OfflineBanner() {
  const { isOnline, wasOffline, resetWasOffline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await getPendingOrdersCount();
      setPendingCount(count);
    };

    updatePendingCount();

    // Update count periodically
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (wasOffline && isOnline) {
      setShowReconnected(true);
      const timeout = setTimeout(() => {
        setShowReconnected(false);
        resetWasOffline();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [wasOffline, isOnline, resetWasOffline]);

  // Offline banner
  if (!isOnline) {
    return (
      <div className="bg-warning text-dark py-2 px-4">
        <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
          <span className="material-symbols-outlined text-lg">cloud_off</span>
          <span>Sin conexión a internet</span>
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-dark text-white rounded-full text-xs">
              {pendingCount} compra{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Reconnected banner
  if (showReconnected) {
    return (
      <div className="bg-success text-white py-2 px-4">
        <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
          <span className="material-symbols-outlined text-lg">cloud_done</span>
          <span>¡Conexión restaurada! Sincronizando datos...</span>
        </div>
      </div>
    );
  }

  // Pending orders banner (when online but has pending)
  if (pendingCount > 0) {
    return (
      <div className="bg-primary/10 text-primary py-2 px-4">
        <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
          <span className="material-symbols-outlined text-lg animate-spin">sync</span>
          <span>Sincronizando {pendingCount} compra{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''}...</span>
        </div>
      </div>
    );
  }

  return null;
}
