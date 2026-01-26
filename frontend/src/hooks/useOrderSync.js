/**
 * useOrderSync Hook
 * Sincroniza automáticamente las órdenes pendientes cuando vuelve la conexión
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { 
  getPendingOrders, 
  markOrderAsSynced, 
  markOrderAsFailed,
  getPendingOrdersCount 
} from '../services/offlineStorage';
import { createOrder } from '../services/api';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 segundos entre reintentos

export function useOrderSync({ onSyncSuccess, onSyncError, onSyncStart } = {}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncResults, setSyncResults] = useState({ success: 0, failed: 0 });
  const syncInProgress = useRef(false);
  
  // Usar refs para callbacks para evitar re-renders infinitos
  const onSyncSuccessRef = useRef(onSyncSuccess);
  const onSyncErrorRef = useRef(onSyncError);
  const onSyncStartRef = useRef(onSyncStart);
  
  // Actualizar refs cuando cambian los callbacks
  useEffect(() => {
    onSyncSuccessRef.current = onSyncSuccess;
    onSyncErrorRef.current = onSyncError;
    onSyncStartRef.current = onSyncStart;
  }, [onSyncSuccess, onSyncError, onSyncStart]);

  /**
   * Actualiza el contador de órdenes pendientes
   */
  const updatePendingCount = useCallback(async () => {
    const count = await getPendingOrdersCount();
    setPendingCount(count);
  }, []);

  /**
   * Sincroniza una orden individual
   */
  const syncOrder = useCallback(async (order) => {
    try {
      console.log(`[useOrderSync] Sincronizando orden local ${order.localId}...`);
      
      const response = await createOrder({
        event_id: order.event_id,
        seat_id: order.seat_id,
        user_id: order.user_id
      });

      await markOrderAsSynced(order.localId, response);
      console.log(`[useOrderSync] Orden ${order.localId} sincronizada exitosamente`);
      
      return { success: true, order, response };
    } catch (error) {
      console.error(`[useOrderSync] Error sincronizando orden ${order.localId}:`, error);
      
      if (order.retryCount >= MAX_RETRIES) {
        await markOrderAsFailed(order.localId, error.message);
        return { success: false, order, error: error.message, permanent: true };
      }
      
      await markOrderAsFailed(order.localId, error.message);
      return { success: false, order, error: error.message, permanent: false };
    }
  }, []);

  /**
   * Sincroniza todas las órdenes pendientes
   */
  const syncAllPendingOrders = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) {
      return;
    }

    syncInProgress.current = true;
    setIsSyncing(true);
    
    const results = { success: 0, failed: 0 };

    try {
      const pendingOrders = await getPendingOrders();
      
      if (pendingOrders.length === 0) {
        console.log('[useOrderSync] No hay órdenes pendientes');
        return;
      }

      console.log(`[useOrderSync] Sincronizando ${pendingOrders.length} órdenes pendientes...`);
      onSyncStartRef.current?.(pendingOrders.length);

      for (const order of pendingOrders) {
        // Verificar conexión antes de cada orden
        if (!navigator.onLine) {
          console.log('[useOrderSync] Conexión perdida, deteniendo sincronización');
          break;
        }

        const result = await syncOrder(order);
        
        if (result.success) {
          results.success++;
          onSyncSuccessRef.current?.(result.order, result.response);
        } else {
          results.failed++;
          onSyncErrorRef.current?.(result.order, result.error);
        }

        // Pequeña pausa entre órdenes para no saturar el servidor
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }

      setSyncResults(results);
      console.log(`[useOrderSync] Sincronización completada. Éxitos: ${results.success}, Fallos: ${results.failed}`);
      
    } catch (error) {
      console.error('[useOrderSync] Error durante sincronización:', error);
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
      await updatePendingCount();
    }
  }, [syncOrder, updatePendingCount]);

  /**
   * Listener para cuando vuelve la conexión
   */
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useOrderSync] Conexión restaurada, iniciando sincronización...');
      syncAllPendingOrders();
    };

    const handleOffline = () => {
      console.log('[useOrderSync] Conexión perdida');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar órdenes pendientes al montar
    updatePendingCount();

    // Si hay conexión al montar, intentar sincronizar
    if (navigator.onLine) {
      syncAllPendingOrders();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncAllPendingOrders, updatePendingCount]);

  return {
    isSyncing,
    pendingCount,
    syncResults,
    syncNow: syncAllPendingOrders,
    refreshPendingCount: updatePendingCount
  };
}

export default useOrderSync;
