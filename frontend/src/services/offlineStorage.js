/**
 * Offline Storage Service usando IndexedDB con idb
 * Maneja el almacenamiento local de órdenes pendientes para sincronización offline-first
 */

import { openDB } from 'idb';

const DB_NAME = 'ticketbuster_db';
const DB_VERSION = 1;

// Stores
const STORES = {
  PENDING_ORDERS: 'pending_orders',
  CACHED_EVENTS: 'cached_events',
  USER_TICKETS: 'user_tickets'
};

/**
 * Inicializa y retorna la conexión a IndexedDB
 */
async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Store para órdenes pendientes (offline purchases)
      if (!db.objectStoreNames.contains(STORES.PENDING_ORDERS)) {
        const pendingStore = db.createObjectStore(STORES.PENDING_ORDERS, {
          keyPath: 'localId',
          autoIncrement: true
        });
        pendingStore.createIndex('by_status', 'status');
        pendingStore.createIndex('by_created', 'createdAt');
      }

      // Store para eventos cacheados
      if (!db.objectStoreNames.contains(STORES.CACHED_EVENTS)) {
        const eventsStore = db.createObjectStore(STORES.CACHED_EVENTS, {
          keyPath: 'id'
        });
        eventsStore.createIndex('by_date', 'event_date');
      }

      // Store para tickets del usuario
      if (!db.objectStoreNames.contains(STORES.USER_TICKETS)) {
        const ticketsStore = db.createObjectStore(STORES.USER_TICKETS, {
          keyPath: 'order_uuid'
        });
        ticketsStore.createIndex('by_event', 'event_id');
        ticketsStore.createIndex('by_status', 'status');
      }
    }
  });
}

// ==================== PENDING ORDERS ====================

/**
 * Guarda una orden pendiente cuando no hay conexión a internet
 * @param {Object} order - Datos de la orden
 * @returns {Promise<number>} - ID local de la orden guardada
 */
export async function saveOfflineOrder(order) {
  const db = await getDB();
  
  const pendingOrder = {
    ...order,
    status: 'pending',
    createdAt: new Date().toISOString(),
    retryCount: 0
  };

  const localId = await db.add(STORES.PENDING_ORDERS, pendingOrder);
  console.log(`[OfflineStorage] Orden guardada offline con ID local: ${localId}`);
  
  return localId;
}

/**
 * Obtiene todas las órdenes pendientes de sincronización
 * @returns {Promise<Array>} - Lista de órdenes pendientes
 */
export async function getPendingOrders() {
  const db = await getDB();
  return db.getAllFromIndex(STORES.PENDING_ORDERS, 'by_status', 'pending');
}

/**
 * Marca una orden como sincronizada exitosamente
 * @param {number} localId - ID local de la orden
 * @param {Object} serverResponse - Respuesta del servidor
 */
export async function markOrderAsSynced(localId, serverResponse) {
  const db = await getDB();
  const order = await db.get(STORES.PENDING_ORDERS, localId);
  
  if (order) {
    order.status = 'synced';
    order.syncedAt = new Date().toISOString();
    order.serverResponse = serverResponse;
    await db.put(STORES.PENDING_ORDERS, order);
    console.log(`[OfflineStorage] Orden ${localId} marcada como sincronizada`);
  }
}

/**
 * Marca una orden como fallida
 * @param {number} localId - ID local de la orden
 * @param {string} error - Mensaje de error
 */
export async function markOrderAsFailed(localId, error) {
  const db = await getDB();
  const order = await db.get(STORES.PENDING_ORDERS, localId);
  
  if (order) {
    order.status = 'failed';
    order.error = error;
    order.retryCount += 1;
    order.lastRetryAt = new Date().toISOString();
    await db.put(STORES.PENDING_ORDERS, order);
    console.log(`[OfflineStorage] Orden ${localId} marcada como fallida: ${error}`);
  }
}

/**
 * Elimina una orden pendiente
 * @param {number} localId - ID local de la orden
 */
export async function deletePendingOrder(localId) {
  const db = await getDB();
  await db.delete(STORES.PENDING_ORDERS, localId);
  console.log(`[OfflineStorage] Orden ${localId} eliminada`);
}

/**
 * Obtiene el conteo de órdenes pendientes
 * @returns {Promise<number>}
 */
export async function getPendingOrdersCount() {
  const db = await getDB();
  return db.countFromIndex(STORES.PENDING_ORDERS, 'by_status', 'pending');
}

// ==================== CACHED EVENTS ====================

/**
 * Guarda eventos en caché local
 * @param {Array} events - Lista de eventos
 */
export async function cacheEvents(events) {
  const db = await getDB();
  const tx = db.transaction(STORES.CACHED_EVENTS, 'readwrite');
  
  await Promise.all([
    ...events.map(event => tx.store.put({
      ...event,
      cachedAt: new Date().toISOString()
    })),
    tx.done
  ]);
  
  console.log(`[OfflineStorage] ${events.length} eventos cacheados`);
}

/**
 * Obtiene eventos desde el caché local
 * @returns {Promise<Array>}
 */
export async function getCachedEvents() {
  const db = await getDB();
  return db.getAll(STORES.CACHED_EVENTS);
}

/**
 * Obtiene un evento específico del caché
 * @param {number} eventId 
 * @returns {Promise<Object|undefined>}
 */
export async function getCachedEvent(eventId) {
  const db = await getDB();
  return db.get(STORES.CACHED_EVENTS, eventId);
}

/**
 * Limpia el caché de eventos
 */
export async function clearEventsCache() {
  const db = await getDB();
  await db.clear(STORES.CACHED_EVENTS);
  console.log('[OfflineStorage] Caché de eventos limpiado');
}

// ==================== USER TICKETS ====================

/**
 * Guarda un ticket del usuario
 * @param {Object} ticket 
 */
export async function saveUserTicket(ticket) {
  const db = await getDB();
  await db.put(STORES.USER_TICKETS, {
    ...ticket,
    savedAt: new Date().toISOString()
  });
  console.log(`[OfflineStorage] Ticket ${ticket.order_uuid} guardado`);
}

/**
 * Obtiene todos los tickets del usuario
 * @returns {Promise<Array>}
 */
export async function getUserTickets() {
  const db = await getDB();
  return db.getAll(STORES.USER_TICKETS);
}

/**
 * Obtiene un ticket específico
 * @param {string} orderUuid 
 * @returns {Promise<Object|undefined>}
 */
export async function getUserTicket(orderUuid) {
  const db = await getDB();
  return db.get(STORES.USER_TICKETS, orderUuid);
}

// ==================== UTILITIES ====================

/**
 * Verifica si hay conexión a internet
 * @returns {boolean}
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Limpia toda la base de datos local
 */
export async function clearAllData() {
  const db = await getDB();
  await Promise.all([
    db.clear(STORES.PENDING_ORDERS),
    db.clear(STORES.CACHED_EVENTS),
    db.clear(STORES.USER_TICKETS)
  ]);
  console.log('[OfflineStorage] Todos los datos locales eliminados');
}

export { STORES };
