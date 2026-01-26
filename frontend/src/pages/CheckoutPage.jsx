import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { createMultipleOrders, getEvent } from '../services/api';
import { useCart } from '../context/CartContext';

export default function CheckoutPage({ onToast, isAuthenticated, onRequireAuth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, clearEvent } = useCart();
  
  console.log('[CheckoutPage] Render - Event ID:', id);
  
  const [event, setEvent] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  useEffect(() => {
    console.log('[CheckoutPage] useEffect - Montado, id:', id);
    // Recuperar datos de sessionStorage
    const storedSeats = sessionStorage.getItem('selectedSeats');
    const storedEvent = sessionStorage.getItem('eventData');
    
    if (!storedSeats || !storedEvent) {
      const eventSeats = items.filter(s => String(s.eventId) === String(id));
      if (eventSeats.length === 0) {
        navigate(`/event/${id}`);
        return;
      }
      setSelectedSeats(eventSeats.map(s => ({
        id: s.id,
        section: s.section,
        row: s.row,
        seat_number: s.seat_number,
      })));

      // Intentar recuperar datos del evento para mostrar resumen
      getEvent(id)
        .then(data => setEvent(data.event || data))
        .catch(() => {});
    } else {
      setSelectedSeats(JSON.parse(storedSeats));
      setEvent(JSON.parse(storedEvent));
    }
  }, [id, navigate, items]);

  const totalPrice = selectedSeats.length * (parseFloat(event?.price) || 0);

  const handleConfirm = async () => {
    if (!isAuthenticated) {
      onToast?.({ type: 'info', message: 'Inicia sesión para confirmar la compra' });
      onRequireAuth?.();
      return;
    }

    if (processing) return;
    
    setProcessing(true);
    try {
      const seatIds = selectedSeats.map(s => s.id);
      const result = await createMultipleOrders(event.id, seatIds, parseFloat(event.price));
      
      setOrderResult(result);
      setSuccess(true);
      
      // Limpiar sessionStorage y carrito de este evento
      sessionStorage.removeItem('selectedSeats');
      sessionStorage.removeItem('eventData');
      if (event) clearEvent(event.id);
      
      if (result.successful.length > 0) {
        onToast?.({
          type: 'success',
          message: `¡Compra exitosa! ${result.successful.length} boleto(s) reservado(s)`
        });
      }
      
      if (result.failed.length > 0) {
        onToast?.({
          type: 'warning',
          message: `${result.failed.length} asiento(s) no pudieron ser reservados`
        });
      }
    } catch (err) {
      console.error('Error en compra:', err);
      onToast?.({
        type: 'error',
        message: err.message || 'Error procesando la compra'
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Pantalla de éxito
  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden">
          {/* Header de éxito */}
          <div className="bg-gradient-to-br from-green-400 to-green-600 p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="material-symbols-outlined text-5xl text-green-500">check_circle</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">¡Compra Exitosa!</h1>
            <p className="text-green-100">Tu reservación ha sido confirmada</p>
          </div>

          {/* Detalles */}
          <div className="p-6">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 mb-6">
              <h2 className="font-bold text-gray-800 mb-2">{event.title}</h2>
              <p className="text-sm text-gray-500 mb-3">{event.venue}</p>
              
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <span className="material-symbols-outlined text-lg">calendar_today</span>
                <span className="capitalize">{formatDate(event.date)}</span>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-2">Asientos reservados:</p>
                <div className="flex flex-wrap gap-2">
                  {orderResult?.successful.map((order, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                    >
                      {selectedSeats[idx]?.section} {selectedSeats[idx]?.row}-{selectedSeats[idx]?.seat_number}
                    </span>
                  ))}
                </div>
              </div>

              {orderResult?.failed.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-red-500 mb-2">No disponibles:</p>
                  <div className="flex flex-wrap gap-2">
                    {orderResult.failed.map((fail, idx) => (
                      <span 
                        key={idx}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium"
                      >
                        Asiento #{fail.seat_id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-6">
              <span className="text-gray-600">Total pagado</span>
              <span className="text-2xl font-bold text-gray-800">
                ${(orderResult?.successful.length * parseFloat(event.price)).toFixed(2)}
              </span>
            </div>

            <p className="text-center text-sm text-gray-500 mb-6">
              Recibirás un correo con los detalles de tu compra y el código QR para ingresar al evento.
            </p>

            <Link
              to="/"
              className="block w-full py-4 bg-primary text-white text-center font-bold rounded-xl hover:bg-primary-dark transition-colors"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de confirmación
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            <Link 
              to={`/event/${id}/seats`}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div className="ml-3">
              <h1 className="font-bold text-gray-800">Confirmar Compra</h1>
              <p className="text-sm text-gray-500">Revisa tu selección</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-lg mx-auto">
          {/* Resumen del evento */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            <div className="flex gap-4 p-4">
              <img 
                src={event.image_url || 'https://images.unsplash.com/photo-1531058020387-3be344556be6?q=80&w=200'}
                alt={event.title}
                className="w-20 h-20 rounded-xl object-cover"
              />
              <div className="flex-1">
                <h2 className="font-bold text-gray-800">{event.title}</h2>
                <p className="text-sm text-gray-500">{event.venue}</p>
                <p className="text-sm text-gray-500 capitalize mt-1">
                  {formatDate(event.date)}
                </p>
              </div>
            </div>
          </div>

          {/* Lista de asientos */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            <div className="p-4 border-b">
              <h3 className="font-bold text-gray-800">Asientos Seleccionados</h3>
            </div>
            <div className="divide-y">
              {selectedSeats.map(seat => (
                <div key={seat.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">event_seat</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {seat.section} - Fila {seat.row}
                      </p>
                      <p className="text-sm text-gray-500">Asiento #{seat.seat_number}</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-800">
                    ${parseFloat(event.price).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500">Subtotal ({selectedSeats.length} asientos)</span>
              <span className="text-gray-800">${totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500">Cargo por servicio</span>
              <span className="text-gray-800">$0.00</span>
            </div>
            <div className="border-t pt-3 mt-3 flex items-center justify-between">
              <span className="font-bold text-gray-800">Total</span>
              <span className="text-2xl font-bold text-primary">${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Nota informativa */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-amber-600">info</span>
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Información importante</p>
                <p>Los asientos están reservados temporalmente. Completa la compra en los próximos 5 minutos para asegurar tu lugar.</p>
              </div>
            </div>
          </div>

          {/* Botón de confirmar */}
          <button
            onClick={handleConfirm}
            disabled={processing}
            className={`
              w-full py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3
              transition-all shadow-lg
              ${processing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-primary text-white hover:bg-primary-dark active:scale-[0.98]'
              }
            `}
          >
            {processing ? (
              <>
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Procesando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">lock</span>
                Confirmar y Pagar ${totalPrice.toFixed(2)}
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            Al confirmar, aceptas los términos y condiciones de TicketBuster
          </p>
        </div>
      </div>
    </div>
  );
}
