import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { syncCart } from '../services/api';

const CartContext = createContext();

function loadInitialState() {
  try {
    const raw = localStorage.getItem('cartItems');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => loadInitialState());
  const lastSyncPayloadRef = useRef(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem('cartItems', JSON.stringify(items));
    } catch (_) {
      // ignore storage errors
    }
  }, [items]);

  // Sincronizar con backend cuando hay conexión y el payload cambia
  useEffect(() => {
    const trySync = async () => {
      if (!navigator.onLine) return;
      if (syncingRef.current) return;
      const payload = JSON.stringify(items);
      if (payload === lastSyncPayloadRef.current) return;
      if (!items.length) {
        lastSyncPayloadRef.current = payload;
        return;
      }
      syncingRef.current = true;
      try {
        await syncCart(items);
        lastSyncPayloadRef.current = payload;
      } catch (err) {
        console.warn('Sync cart failed (se intentará cuando vuelva la conexión):', err?.message || err);
      } finally {
        syncingRef.current = false;
      }
    };

    trySync();

    const handleOnline = () => trySync();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [items]);

  const upsertEventSeats = (event, seats) => {
    if (!event || !Array.isArray(seats)) return;
    setItems(prev => {
      const withoutEvent = prev.filter(i => i.eventId !== event.id);
      const nextSeats = seats.map(seat => ({
        id: seat.id,
        eventId: event.id,
        eventTitle: event.title,
        eventVenue: event.venue,
        eventDate: event.date,
        eventImage: event.image_url || event.imageUrl,
        price: parseFloat(event.price) || 0,
        section: seat.section,
        row: seat.row,
        seat_number: seat.seat_number,
      }));
      return [...withoutEvent, ...nextSeats];
    });
  };

  const removeItem = (seatId) => {
    setItems(prev => prev.filter(i => i.id !== seatId));
  };

  const clearEvent = (eventId) => {
    setItems(prev => prev.filter(i => i.eventId !== eventId));
  };

  const clearAll = () => setItems([]);

  const totalItems = items.length;
  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + (item.price || 0), 0),
    [items]
  );

  const value = {
    items,
    totalItems,
    totalAmount,
    upsertEventSeats,
    removeItem,
    clearEvent,
    clearAll,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
