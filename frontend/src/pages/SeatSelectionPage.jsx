import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getEvent, lockSeat, unlockSeat } from '../services/api';
import { useCart } from '../context/CartContext';
import { getCachedEvent, cacheEventWithSeats } from '../services/offlineStorage';
import useOnlineStatus from '../hooks/useOnlineStatus';

// Colores para secciones
const sectionColors = {
  VIP: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700', selected: 'bg-amber-500' },
  PREFERENCIAL: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700', selected: 'bg-purple-500' },
  PLATEA: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700', selected: 'bg-blue-500' },
  MEZANINE: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', selected: 'bg-green-500' },
  GENERAL: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700', selected: 'bg-gray-500' },
};

// Grace period: si se deselecciona antes de este tiempo (ms), no se envía unlock al servidor
const LOCK_GRACE_PERIOD_MS = 2000;
const LOCK_DURATION_MS = 10 * 60 * 1000; // 5 minutos

export default function SeatSelectionPage({ onToast, isAuthenticated, onRequireAuth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { upsertEventSeats, items } = useCart();
  const { isOnline } = useOnlineStatus();
  
  console.log('[SeatSelectionPage] Render - Event ID:', id, 'isOnline:', isOnline);
  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Estados de operaciones en curso por asiento (para feedback visual)
  const [seatOperations, setSeatOperations] = useState({}); // { seatId: 'locking' | 'unlocking' }
  
  // Tracking de locks: { seatId: { lockedAt: timestamp, confirmed: boolean } }
  const lockTrackingRef = useRef({});
  
  // Pending locks que aún no se han confirmado con el servidor
  const pendingLocksRef = useRef({}); // { seatId: AbortController }

  useEffect(() => {
    console.log('[SeatSelectionPage] useEffect[id] - Montando/actualizando, id:', id);
    
    const fetchEvent = async () => {
      setLoading(true);
      try {
        if (navigator.onLine) {
          // Online: obtener datos del servidor
          const data = await getEvent(id);
          const eventData = data.event || data;
          const seatsData = data.seats || [];
          setEvent(eventData);
          setSeats(seatsData);
          setIsOfflineMode(false);
          
          // Cachear para uso offline
          await cacheEventWithSeats({ event: eventData, seats: seatsData });
          
          // Set first section as active
          if (seatsData.length > 0) {
            const sections = [...new Set(seatsData.map(s => s.section))];
            setActiveSection(sections[0]);
          }
        } else {
          // Offline: cargar desde cache
          const cached = await getCachedEvent(parseInt(id));
          if (cached) {
            const eventData = cached.event || cached;
            const seatsData = cached.seats || [];
            setEvent(eventData);
            setSeats(seatsData);
            setIsOfflineMode(true);
            console.log('[SeatSelectionPage] Modo offline - cargado desde cache:', seatsData.length, 'asientos');
            
            if (seatsData.length > 0) {
              const sections = [...new Set(seatsData.map(s => s.section))];
              setActiveSection(sections[0]);
            }
            
            onToast?.({ 
              type: 'info', 
              message: 'Modo offline: los asientos se reservarán al recuperar conexión' 
            });
          } else {
            onToast?.({ type: 'error', message: 'Evento no disponible offline' });
            navigate(`/event/${id}`);
          }
        }
      } catch (err) {
        console.error('Error loading event:', err);
        
        // Intentar cargar desde cache en caso de error
        try {
          const cached = await getCachedEvent(parseInt(id));
          if (cached) {
            const eventData = cached.event || cached;
            const seatsData = cached.seats || [];
            setEvent(eventData);
            setSeats(seatsData);
            setIsOfflineMode(true);
            console.log('[SeatSelectionPage] Fallback a cache:', seatsData.length, 'asientos');
            
            if (seatsData.length > 0) {
              const sections = [...new Set(seatsData.map(s => s.section))];
              setActiveSection(sections[0]);
            }
          } else {
            onToast?.({ type: 'error', message: 'Error cargando el evento' });
            navigate(`/event/${id}`);
          }
        } catch (cacheErr) {
          onToast?.({ type: 'error', message: 'Error cargando el evento' });
          navigate(`/event/${id}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
    
    // Cleanup: unlock all selected seats on unmount (solo si estamos online)
    return () => {
      console.log('[SeatSelectionPage] useEffect[id] - CLEANUP/UNMOUNT');
      // Cancelar pending locks
      Object.values(pendingLocksRef.current).forEach(controller => {
        controller?.abort();
      });
      // Unlock seats que fueron confirmados con el servidor (solo si online)
      if (navigator.onLine) {
        Object.entries(lockTrackingRef.current).forEach(([seatId, data]) => {
          if (data.confirmed) {
            unlockSeat(id, parseInt(seatId)).catch(() => {});
          }
        });
      }
    };
  }, [id, navigate, onToast]);

  // Tick para countdown de locks
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-liberar asientos cuando expira el tiempo de lock
  useEffect(() => {
    if (!selectedSeats.length) return;
    const expired = [];

    selectedSeats.forEach(seat => {
      const tracking = lockTrackingRef.current[seat.id];
      if (!tracking || seatOperations[seat.id]) return;
      const elapsed = nowTick - tracking.lockedAt;
      if (elapsed >= LOCK_DURATION_MS) {
        expired.push(seat);
      }
    });

    if (!expired.length) return;

    const expiredIds = new Set(expired.map(s => s.id));

    setSelectedSeats(prev => prev.filter(s => !expiredIds.has(s.id)));
    setSeats(prev => prev.map(s => expiredIds.has(s.id) ? { ...s, status: 'AVAILABLE' } : s));

    expired.forEach(seat => {
      delete lockTrackingRef.current[seat.id];
      pendingLocksRef.current[seat.id]?.abort();
      delete pendingLocksRef.current[seat.id];
      unlockSeat(id, seat.id).catch(() => {});
    });

    onToast?.({ type: 'warning', message: `${expired.length} asiento(s) liberado(s) por tiempo` });
  }, [nowTick, selectedSeats, id, onToast, seatOperations]);

  // Agrupar asientos por sección y fila
  const seatsBySection = useMemo(() => {
    const grouped = {};
    seats.forEach(seat => {
      if (!grouped[seat.section]) {
        grouped[seat.section] = {};
      }
      if (!grouped[seat.section][seat.row]) {
        grouped[seat.section][seat.row] = [];
      }
      grouped[seat.section][seat.row].push(seat);
    });
    // Ordenar asientos por número en cada fila
    Object.values(grouped).forEach(section => {
      Object.values(section).forEach(row => {
        row.sort((a, b) => a.seat_number - b.seat_number);
      });
    });
    return grouped;
  }, [seats]);

  const sections = Object.keys(seatsBySection);

  // Función para seleccionar asiento (con lock optimista o offline)
  const selectSeat = useCallback(async (seat) => {
    const seatId = seat.id;
    
    // Optimistic UI: seleccionar inmediatamente
    setSelectedSeats(prev => [...prev, seat]);
    setSeats(prev => prev.map(s => 
      s.id === seatId ? { ...s, status: 'LOCKED' } : s
    ));
    
    // En modo offline, no hacemos lock en el servidor
    if (!navigator.onLine || isOfflineMode) {
      console.log('[SeatSelectionPage] Modo offline - asiento seleccionado localmente:', seatId);
      lockTrackingRef.current[seatId] = { lockedAt: Date.now(), confirmed: false, offline: true };
      return;
    }
    
    setSeatOperations(prev => ({ ...prev, [seatId]: 'locking' }));
    
    // Tracking: marcar como pendiente
    lockTrackingRef.current[seatId] = { lockedAt: Date.now(), confirmed: false };
    
    // Crear AbortController para poder cancelar
    const abortController = new AbortController();
    pendingLocksRef.current[seatId] = abortController;
    
    try {
      await lockSeat(id, seatId);
      
      // Si no fue abortado, marcar como confirmado
      if (!abortController.signal.aborted) {
        lockTrackingRef.current[seatId].confirmed = true;
        delete pendingLocksRef.current[seatId];
      }
    } catch (err) {
      // Si fue abortado (usuario deseleccionó rápido), ignorar error
      if (abortController.signal.aborted) return;
      
      console.error('Error locking seat:', err);
      
      // Rollback: quitar de seleccionados y restaurar estado
      setSelectedSeats(prev => prev.filter(s => s.id !== seatId));
      setSeats(prev => prev.map(s => 
        s.id === seatId ? { ...s, status: 'AVAILABLE' } : s
      ));
      delete lockTrackingRef.current[seatId];
      delete pendingLocksRef.current[seatId];
      
      onToast?.({ 
        type: 'error', 
        message: 'Este asiento ya no está disponible' 
      });
      
      // Refrescar asientos para obtener estado real
      try {
        const data = await getEvent(id);
        setSeats(data.seats || []);
      } catch (refreshErr) {
        console.error('Error refreshing seats:', refreshErr);
      }
    } finally {
      setSeatOperations(prev => {
        const next = { ...prev };
        delete next[seatId];
        return next;
      });
    }
  }, [id, onToast, isOfflineMode]);

  // Función para deseleccionar asiento (con unlock inteligente)
  const deselectSeat = useCallback(async (seat) => {
    const seatId = seat.id;
    const tracking = lockTrackingRef.current[seatId];
    
    // Optimistic UI: deseleccionar y restaurar a disponible inmediatamente
    setSelectedSeats(prev => prev.filter(s => s.id !== seatId));
    setSeats(prev => prev.map(s => 
      s.id === seatId ? { ...s, status: 'AVAILABLE' } : s
    ));
    
    // Limpiar tracking
    pendingLocksRef.current[seatId]?.abort();
    delete pendingLocksRef.current[seatId];
    delete lockTrackingRef.current[seatId];
    
    // En modo offline, no necesitamos unlock en el servidor
    if (!navigator.onLine || isOfflineMode || tracking?.offline) {
      console.log('[SeatSelectionPage] Modo offline - asiento deseleccionado localmente:', seatId);
      return;
    }
    
    // Verificar si estamos en grace period (lock no confirmado aún)
    const isInGracePeriod = tracking && !tracking.confirmed && 
      (Date.now() - tracking.lockedAt < LOCK_GRACE_PERIOD_MS);
    
    // Siempre intentar unlock en el servidor (fire-and-forget en grace period)
    // porque la petición de lock pudo haber llegado al servidor
    if (isInGracePeriod) {
      // Fire-and-forget: no esperamos respuesta, no mostramos estado
      unlockSeat(id, seatId).catch(() => {});
      return;
    }
    
    // Lock fue confirmado: enviar unlock al servidor con feedback visual
    setSeatOperations(prev => ({ ...prev, [seatId]: 'unlocking' }));
    
    try {
      await unlockSeat(id, seatId);
      // Estado ya fue actualizado optimísticamente arriba
    } catch (err) {
      console.error('Error unlocking seat:', err);
      // Aún así el usuario lo deseleccionó - el servidor liberará por timeout
    } finally {
      setSeatOperations(prev => {
        const next = { ...prev };
        delete next[seatId];
        return next;
      });
    }
  }, [id, isOfflineMode]);

  // Toggle unificado
  const toggleSeat = useCallback((seat) => {
    if (!isAuthenticated) {
      onToast?.({ type: 'info', message: 'Inicia sesión para seleccionar asientos' });
      onRequireAuth?.();
      return;
    }
    // Ignorar si hay operación en curso para este asiento
    if (seatOperations[seat.id]) return;
    
    const isSelected = selectedSeats.some(s => s.id === seat.id);
    
    if (isSelected) {
      deselectSeat(seat);
    } else {
      // Solo permitir seleccionar si está disponible
      if (seat.status !== 'AVAILABLE') return;
      selectSeat(seat);
    }
  }, [isAuthenticated, onRequireAuth, onToast, seatOperations, selectedSeats, selectSeat, deselectSeat]);

  const handleContinue = () => {
    console.log('[SeatSelectionPage] handleContinue - selectedSeats:', selectedSeats.length);
    if (selectedSeats.length === 0) return;

    if (!isAuthenticated) {
      onToast?.({ type: 'info', message: 'Inicia sesión para continuar con la compra' });
      onRequireAuth?.();
      return;
    }

    const uniqueEvents = new Set(items.map(i => i.eventId));
    console.log('[SeatSelectionPage] handleContinue - uniqueEvents:', uniqueEvents.size);

    // Si hay más de un evento en el carrito, ir al checkout multi-evento
    if (uniqueEvents.size > 1) {
      console.log('[SeatSelectionPage] handleContinue - Navegando a /cart/checkout');
      navigate('/cart/checkout');
      return;
    }

    // Caso de un solo evento: flujo tradicional
    sessionStorage.setItem('selectedSeats', JSON.stringify(selectedSeats));
    sessionStorage.setItem('eventData', JSON.stringify(event));
    console.log('[SeatSelectionPage] handleContinue - Navegando a /event/' + id + '/checkout');
    navigate(`/event/${id}/checkout`);
  };

  const totalPrice = selectedSeats.length * (parseFloat(event?.price) || 0);

  // Sincronizar selección con carrito local para mostrar badge y permitir vaciar
  useEffect(() => {
    if (event) {
      upsertEventSeats(event, selectedSeats);
    }
  }, [event, selectedSeats, upsertEventSeats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Offline Banner */}
      {isOfflineMode && (
        <div className="bg-amber-100 border-b border-amber-300 py-2 px-4">
          <div className="container mx-auto flex items-center gap-2 text-sm text-amber-800">
            <span className="material-symbols-outlined">cloud_off</span>
            <span><strong>Modo Offline:</strong> Tu compra se guardará localmente y se procesará al recuperar conexión.</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            <Link 
              to={`/event/${id}`}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div className="ml-3 flex-1">
              <h1 className="font-bold text-gray-800 truncate">{event?.title}</h1>
              <p className="text-sm text-gray-500">
                Selecciona tus asientos
                {isOfflineMode && <span className="ml-2 px-2 py-0.5 bg-amber-200 text-amber-800 rounded text-xs">Offline</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 container mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Tabs de secciones */}
          <div className="flex overflow-x-auto border-b">
            {sections.map(section => {
              const colors = sectionColors[section] || sectionColors.GENERAL;
              const sectionSeats = Object.values(seatsBySection[section]).flat();
              const available = sectionSeats.filter(s => s.status === 'AVAILABLE').length;
              
              return (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeSection === section
                      ? `${colors.border} ${colors.text} border-current`
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {section}
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${colors.bg} ${colors.text}`}>
                    {available}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="flex items-center justify-center gap-4 p-3 bg-gray-50 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-gray-200 border border-gray-300"></div>
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-primary"></div>
              <span>Seleccionado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-yellow-300 animate-pulse"></div>
              <span>Procesando</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-red-400"></div>
              <span>No disponible</span>
            </div>
          </div>

          {/* Escenario */}
          <div className="py-6 text-center">
            <div className="inline-block px-20 py-3 bg-gradient-to-b from-gray-700 to-gray-800 text-white text-sm font-medium rounded-b-xl shadow-inner">
              ESCENARIO
            </div>
          </div>

          {/* Mapa de asientos */}
          <div className="p-4 overflow-x-auto pb-8">
            {activeSection && seatsBySection[activeSection] && (
              <div className="min-w-fit mx-auto">
                <div className="space-y-2">
                  {Object.entries(seatsBySection[activeSection])
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([row, rowSeats]) => (
                      <div key={row} className="flex items-center justify-center gap-2">
                        <span className="w-8 text-center text-sm font-bold text-gray-400">
                          {row}
                        </span>
                        <div className="flex gap-1.5">
                          {rowSeats.map(seat => {
                            const isSelected = selectedSeats.some(s => s.id === seat.id);
                            const isAvailable = seat.status === 'AVAILABLE' || isSelected;
                            const operation = seatOperations[seat.id];
                            const isProcessing = !!operation;
                            const colors = sectionColors[activeSection] || sectionColors.GENERAL;
                            const tracking = lockTrackingRef.current[seat.id];
                            const lockedAt = tracking?.lockedAt;
                            const remainingMs = lockedAt ? Math.max(0, LOCK_DURATION_MS - (nowTick - lockedAt)) : null;
                            const remainingMin = remainingMs != null ? Math.floor(remainingMs / 60000) : null;
                            const remainingSec = remainingMs != null ? Math.floor((remainingMs % 60000) / 1000) : null;
                            
                            return (
                              <button
                                key={seat.id}
                                onClick={() => toggleSeat(seat)}
                                disabled={(!isAvailable && !isSelected) || isProcessing}
                                title={`Fila ${row}, Asiento ${seat.seat_number}${operation === 'locking' ? ' (bloqueando...)' : operation === 'unlocking' ? ' (liberando...)' : ''}`}
                                className={`
                                  w-9 h-9 rounded-lg text-xs font-bold transition-all duration-200 relative
                                  ${isProcessing
                                    ? 'bg-yellow-300 text-yellow-800 animate-pulse cursor-wait'
                                    : isSelected 
                                      ? 'bg-primary text-white scale-110 shadow-lg ring-2 ring-primary/30' 
                                      : isAvailable 
                                        ? `${colors.bg} ${colors.text} hover:scale-105 hover:shadow-md cursor-pointer border-2 ${colors.border}`
                                        : 'bg-red-400 text-white cursor-not-allowed opacity-60'
                                  }
                                `}
                              >
                                {isProcessing ? (
                                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                                ) : (
                                  <>
                                    {seat.seat_number}
                                    {lockedAt && remainingMs > 0 && (
                                      <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] text-white bg-gray-800 rounded-full shadow">
                                        {remainingMin}:{String(remainingSec).padStart(2,'0')}
                                      </span>
                                    )}
                                  </>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <span className="w-8 text-center text-sm font-bold text-gray-400">
                          {row}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer fijo con resumen */}
      <div className="sticky bottom-0 bg-white border-t shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              {selectedSeats.length > 0 ? (
                <>
                  <p className="text-sm text-gray-500">
                    {selectedSeats.length} asiento{selectedSeats.length > 1 ? 's' : ''} seleccionado{selectedSeats.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-2xl font-bold text-gray-800">
                    ${totalPrice.toFixed(2)}
                  </p>
                </>
              ) : (
                <p className="text-gray-500">Selecciona al menos un asiento</p>
              )}
            </div>
            <button
              onClick={handleContinue}
              disabled={selectedSeats.length === 0}
              className={`
                px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all
                ${selectedSeats.length > 0 
                  ? 'bg-primary text-white hover:bg-primary-dark' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              Continuar
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
