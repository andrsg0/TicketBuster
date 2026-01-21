import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserTickets as getAPITickets } from '../services/api';
import { getUserTickets as getLocalTickets } from '../services/offlineStorage';

// Modal de QR - definido fuera del componente para evitar re-renders
function QRModal({ ticket, onClose }) {
  if (!ticket) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-sm w-full overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Botón X para cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors"
        >
          <span className="material-symbols-outlined text-gray-600">close</span>
        </button>

        {/* Header del ticket */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
          <h3 className="font-bold text-xl mb-1 pr-8">{ticket.event_name}</h3>
          <p className="text-white/80 text-sm">{ticket.venue}</p>
        </div>

        {/* QR Code grande */}
        <div className="p-8 flex flex-col items-center">
          {ticket.qr_code_base64 ? (
            <img 
              src={`data:image/png;base64,${ticket.qr_code_base64}`}
              alt="QR Code"
              className="w-64 h-64 rounded-xl shadow-lg"
            />
          ) : (
            <div className="w-64 h-64 bg-gray-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
              <span className="material-symbols-outlined text-6xl text-gray-300 animate-pulse">qr_code_2</span>
              <p className="text-sm text-gray-400 mt-3">QR generándose...</p>
              <p className="text-xs text-gray-300 mt-1">Actualiza en unos segundos</p>
            </div>
          )}
          
          <p className="text-xs text-gray-400 mt-4 font-mono">
            {ticket.order_uuid}
          </p>
        </div>

        {/* Info del asiento */}
        <div className="px-6 pb-6">
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 uppercase">Sección</p>
              <p className="font-bold text-gray-800">{ticket.section || '-'}</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 uppercase">Fila</p>
              <p className="font-bold text-gray-800">{ticket.row || '-'}</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 uppercase">Asiento</p>
              <p className="font-bold text-gray-800">{ticket.seat_number || '-'}</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default function MyTicketsPage({ userId }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    const fetchTickets = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (navigator.onLine) {
          const data = await getAPITickets(userId);
          setTickets(data.tickets || data || []);
        } else {
          const local = await getLocalTickets();
          setTickets(local || []);
        }
      } catch (err) {
        console.error('Error loading tickets:', err);
        const local = await getLocalTickets();
        if (local && local.length > 0) {
          setTickets(local);
        } else {
          setError('Error cargando tickets');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [userId]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      COMPLETED: { 
        bg: 'bg-green-500', 
        text: 'text-green-500',
        label: 'Confirmado',
        icon: 'check_circle'
      },
      PENDING: { 
        bg: 'bg-amber-500', 
        text: 'text-amber-500',
        label: 'Pendiente',
        icon: 'hourglass_top'
      },
      PROCESSING: { 
        bg: 'bg-blue-500', 
        text: 'text-blue-500',
        label: 'Procesando',
        icon: 'sync'
      },
      FAILED: { 
        bg: 'bg-red-500', 
        text: 'text-red-500',
        label: 'Fallido',
        icon: 'error'
      },
      CANCELLED: { 
        bg: 'bg-gray-500', 
        text: 'text-gray-500',
        label: 'Cancelado',
        icon: 'cancel'
      }
    };
    return configs[status] || configs.PENDING;
  };

  // Estado de login requerido
  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-gray-400">lock</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Inicia Sesión</h1>
          <p className="text-gray-500 mb-6">Debes iniciar sesión para ver tus tickets</p>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Mis Tickets</h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="flex gap-4">
                  <div className="w-32 h-32 bg-gray-200 rounded-xl" />
                  <div className="flex-1 space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-red-500">error</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{error}</h1>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-3 bg-primary text-white rounded-full font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Sin tickets
  if (tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-gray-400">confirmation_number</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">No tienes tickets</h1>
          <p className="text-gray-500 mb-6">¡Explora nuestros eventos y compra tu primer ticket!</p>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-medium"
          >
            Ver Eventos
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Mis Tickets</h1>

        <div className="space-y-4">
          {tickets.map((ticket) => {
            const statusConfig = getStatusConfig(ticket.status);
            
            return (
              <div 
                key={ticket.order_uuid || ticket.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Ticket estilo entrada */}
                <div className="flex flex-col md:flex-row">
                  {/* Imagen del evento + QR */}
                  <div className="relative md:w-48 h-48 md:h-auto bg-gray-100">
                    <img 
                      src={ticket.event_image || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=400'}
                      alt={ticket.event_name}
                      className="w-full h-full object-cover"
                    />
                    {/* Badge de status */}
                    <div className={`absolute top-3 left-3 ${statusConfig.bg} text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1`}>
                      <span className="material-symbols-outlined text-sm">{statusConfig.icon}</span>
                      {statusConfig.label}
                    </div>
                  </div>

                  {/* Información del ticket */}
                  <div className="flex-1 p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 mb-1">
                          {ticket.event_name || `Evento #${ticket.event_id}`}
                        </h3>
                        <p className="text-gray-500 text-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">location_on</span>
                          {ticket.venue || 'Venue'}
                        </p>
                      </div>
                    </div>

                    {/* Fecha y hora */}
                    <div className="flex items-center gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <span className="material-symbols-outlined text-base">calendar_today</span>
                        <span className="capitalize">{formatDate(ticket.event_date)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        <span>{formatTime(ticket.event_date)}</span>
                      </div>
                    </div>

                    {/* Asiento */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">event_seat</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Tu asiento</p>
                        <p className="font-bold text-gray-800">
                          {ticket.section} - Fila {ticket.row} - Asiento {ticket.seat_number}
                        </p>
                      </div>
                    </div>

                    {/* Footer con precio y botón QR */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Total pagado</p>
                        <p className="text-xl font-bold text-primary">
                          ${parseFloat(ticket.total_amount || 0).toFixed(2)}
                        </p>
                      </div>
                      
                      {ticket.status === 'COMPLETED' ? (
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-sm"
                        >
                          <span className="material-symbols-outlined">qr_code_2</span>
                          Ver QR
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">QR disponible al completar</span>
                      )}
                    </div>
                  </div>

                  {/* QR lateral (solo desktop) */}
                  <div className="hidden lg:flex flex-col items-center justify-center p-6 border-l border-dashed border-gray-200 bg-gray-50/50">
                    {ticket.qr_code_base64 ? (
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="group"
                      >
                        <img 
                          src={`data:image/png;base64,${ticket.qr_code_base64}`}
                          alt="QR Code"
                          className="w-28 h-28 rounded-lg group-hover:scale-105 transition-transform shadow-sm"
                        />
                        <p className="text-xs text-gray-400 mt-2 text-center">
                          Toca para ampliar
                        </p>
                      </button>
                    ) : ticket.status === 'COMPLETED' ? (
                      <div className="w-28 h-28 bg-gray-100 rounded-lg flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-gray-300 animate-pulse">qr_code_2</span>
                        <p className="text-[10px] text-gray-400 mt-1">Generando...</p>
                      </div>
                    ) : (
                      <div className="w-28 h-28 bg-amber-50 rounded-lg flex flex-col items-center justify-center border border-amber-200">
                        <span className="material-symbols-outlined text-3xl text-amber-400 animate-pulse">hourglass_top</span>
                        <p className="text-[10px] text-amber-600 mt-1 text-center px-2">Procesando orden</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Borde decorativo de ticket - gradiente suave */}
                <div className="h-1.5 bg-gradient-to-r from-violet-400 via-purple-500 to-pink-400" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de QR */}
      {selectedTicket && (
        <QRModal 
          ticket={selectedTicket} 
          onClose={() => setSelectedTicket(null)} 
        />
      )}
    </div>
  );
}
