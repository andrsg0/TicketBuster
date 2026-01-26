import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { createMultipleOrders } from '../services/api';

export default function CartCheckoutPage({ onToast, isAuthenticated, onRequireAuth }) {
  const { items, clearAll, clearEvent } = useCart();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const groups = useMemo(() => {
    const grouped = {};
    items.forEach(item => {
      if (!grouped[item.eventId]) {
        grouped[item.eventId] = {
          meta: {
            id: item.eventId,
            title: item.eventTitle,
            venue: item.eventVenue,
            date: item.eventDate,
            image: item.eventImage,
            price: item.price,
          },
          seats: [],
        };
      }
      grouped[item.eventId].seats.push(item);
    });
    return Object.values(grouped);
  }, [items]);

  const total = useMemo(() => items.reduce((acc, it) => acc + (it.price || 0), 0), [items]);

  useEffect(() => {
    if (!items.length) {
      navigate('/cart');
    }
  }, [items, navigate]);

  const handleConfirm = async () => {
    if (!isAuthenticated) {
      onToast?.({ type: 'info', message: 'Inicia sesión para confirmar la compra' });
      onRequireAuth?.();
      return;
    }

    if (processing || !groups.length) return;
    setProcessing(true);
    const summary = [];
    let anyFailure = false;

    try {
      for (const group of groups) {
        const seatIds = group.seats.map(s => s.id);
        const price = group.meta.price || 0;
        const res = await createMultipleOrders(group.meta.id, seatIds, price);
        summary.push({
          eventId: group.meta.id,
          title: group.meta.title,
          venue: group.meta.venue,
          date: group.meta.date,
          image: group.meta.image,
          successful: res.successful,
          failed: res.failed,
          price,
        });
        if (res.failed.length) anyFailure = true;
        // limpiar del carrito este evento
        clearEvent(group.meta.id);
      }
      setResult({ summary, anyFailure });
      if (!anyFailure) {
        onToast?.({ type: 'success', message: 'Compra completada' });
      } else {
        onToast?.({ type: 'warning', message: 'Algunos asientos no pudieron comprarse' });
      }
    } catch (err) {
      console.error('Error en checkout múltiple:', err);
      onToast?.({ type: 'error', message: err.message || 'Error procesando compra' });
    } finally {
      setProcessing(false);
    }
  };

  if (!items.length) {
    return null;
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden">
          <div className="bg-primary text-white p-6">
            <h1 className="text-2xl font-bold">Resumen de compra</h1>
            <p className="text-sm text-primary-100">Checkout multi-evento</p>
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-auto">
            {result.summary.map(group => (
              <div key={group.eventId} className="border border-gray-100 rounded-xl p-4 flex gap-4">
                <img
                  src={group.image || 'https://images.unsplash.com/photo-1531058020387-3be344556be6?q=80&w=200'}
                  alt={group.title}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h2 className="font-bold text-gray-800">{group.title}</h2>
                  <p className="text-sm text-gray-500">{group.venue}</p>
                  <p className="text-sm text-gray-500 capitalize">{new Date(group.date).toLocaleString('es-ES')}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-green-700">Éxitos: {group.successful.length}</p>
                    {group.failed.length > 0 && (
                      <p className="text-sm text-red-600">Fallidos: {group.failed.length}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 flex justify-end gap-3 border-t">
            <Link to="/" className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold">Ir al inicio</Link>
            <button
              onClick={() => { setResult(null); clearAll(); navigate('/cart'); }}
              className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark shadow"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Confirmar compra (multi-evento)</h1>
          <p className="text-gray-500">Procesaremos todos los eventos en tu carrito.</p>
        </div>

        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.meta.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b flex items-center gap-4">
                <img
                  src={group.meta.image || 'https://images.unsplash.com/photo-1531058020387-3be344556be6?q=80&w=200'}
                  alt={group.meta.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h2 className="font-bold text-gray-800">{group.meta.title}</h2>
                  <p className="text-sm text-gray-500">{group.meta.venue}</p>
                  <p className="text-sm text-gray-500 capitalize">{new Date(group.meta.date).toLocaleString('es-ES')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Asientos</p>
                  <p className="text-lg font-bold text-gray-800">{group.seats.length}</p>
                </div>
              </div>
              <div className="divide-y">
                {group.seats.map(seat => (
                  <div key={seat.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{seat.section} - Fila {seat.row}</p>
                      <p className="text-sm text-gray-500">Asiento #{seat.seat_number}</p>
                    </div>
                    <span className="font-bold text-gray-800">${seat.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-800">${total.toFixed(2)}</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/cart"
              className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold"
            >
              Volver al carrito
            </Link>
            <button
              onClick={handleConfirm}
              disabled={processing}
              className={`px-6 py-3 rounded-xl font-semibold text-white shadow flex items-center gap-2 ${processing ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'}`}
            >
              {processing ? 'Procesando...' : 'Confirmar compra'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
