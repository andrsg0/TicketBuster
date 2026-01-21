/**
 * API Service
 * Centraliza todas las llamadas al API Gateway
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Token mock para desarrollo (mismo UUID que en api-gateway/src/auth.js)
const DEV_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJkZXZ1c2VyIiwiZW1haWwiOiJkZXZAdGlja2V0YnVzdGVyLmxvY2FsIn0.mock';

/**
 * Wrapper para fetch con manejo de errores
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DEV_TOKEN}`,
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error de red' }));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==================== EVENTS ====================

/**
 * Obtiene la lista de eventos disponibles
 */
export async function getEvents() {
  return fetchAPI('/events');
}

/**
 * Obtiene un evento específico con sus asientos disponibles
 * @param {number} eventId 
 */
export async function getEvent(eventId) {
  return fetchAPI(`/events/${eventId}`);
}

/**
 * Obtiene los asientos disponibles para un evento
 * @param {number} eventId 
 */
export async function getEventSeats(eventId) {
  return fetchAPI(`/events/${eventId}/seats`);
}

// ==================== ORDERS ====================

/**
 * Crea una nueva orden de compra para un asiento
 * @param {Object} orderData - { event_id, seat_id, total_amount }
 */
export async function createOrder(orderData) {
  return fetchAPI('/buy', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

/**
 * Crea órdenes para múltiples asientos
 * @param {number} eventId
 * @param {Array<number>} seatIds - Array de IDs de asientos
 * @param {number} pricePerSeat
 */
export async function createMultipleOrders(eventId, seatIds, pricePerSeat) {
  const results = await Promise.allSettled(
    seatIds.map(seatId => 
      createOrder({
        event_id: eventId,
        seat_id: seatId,
        total_amount: pricePerSeat
      })
    )
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);
  
  return { successful, failed, total: seatIds.length };
}

// ==================== SEAT LOCKING ====================

/**
 * Bloquea temporalmente un asiento para el usuario
 * @param {number} eventId 
 * @param {number} seatId 
 */
export async function lockSeat(eventId, seatId) {
  return fetchAPI(`/events/${eventId}/seats/${seatId}/lock`, {
    method: 'POST',
  });
}

/**
 * Desbloquea un asiento previamente bloqueado
 * @param {number} eventId 
 * @param {number} seatId 
 */
export async function unlockSeat(eventId, seatId) {
  return fetchAPI(`/events/${eventId}/seats/${seatId}/unlock`, {
    method: 'POST',
  });
}

/**
 * Obtiene el estado de una orden
 * @param {string} orderUuid 
 */
export async function getOrderStatus(orderUuid) {
  return fetchAPI(`/orders/${orderUuid}`);
}

// ==================== USER ====================

/**
 * Obtiene los tickets del usuario actual
 */
export async function getUserTickets(userId) {
  return fetchAPI(`/users/${userId}/tickets`);
}

// ==================== HEALTH ====================

/**
 * Verifica el estado del API Gateway
 */
export async function checkHealth() {
  return fetchAPI('/health');
}

export { API_BASE_URL };
