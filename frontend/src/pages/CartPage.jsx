import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CartPage() {
  const { items, totalItems, totalAmount, removeItem, clearAll } = useCart();

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.eventId]) acc[item.eventId] = { meta: item, seats: [] };
    acc[item.eventId].seats.push(item);
    return acc;
  }, {});

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-gray-500">shopping_cart</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Tu carrito está vacío</h1>
          <p className="text-gray-500 mb-6">Explora eventos y selecciona tus asientos.</p>
          <Link to="/events" className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors">
            Ver eventos
          </Link>
        </div>
      </div>
    );
  }

  const handleContinue = () => {
    // Navegación se hace directamente con Link en el botón de abajo
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Carrito</h1>
            <p className="text-gray-500">{totalItems} asiento(s) seleccionado(s)</p>
          </div>
          <button
            onClick={clearAll}
            className="text-sm text-error hover:text-error/80 font-semibold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">delete_sweep</span>
            Vaciar carrito
          </button>
        </div>

        <div className="space-y-4">
          {Object.values(grouped).map(group => (
            <div key={group.meta.eventId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-800">{group.meta.eventTitle}</h2>
                  <p className="text-sm text-gray-500">{group.meta.eventVenue}</p>
                </div>
                <Link
                  to={`/event/${group.meta.eventId}/seats`}
                  className="text-sm text-primary hover:text-primary-dark font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">event_seat</span>
                  Editar asientos
                </Link>
              </div>

              <div className="divide-y">
                {group.seats.map(seat => (
                  <div key={seat.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">event_seat</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{seat.section} - Fila {seat.row}</p>
                        <p className="text-sm text-gray-500">Asiento #{seat.seat_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-gray-800">${seat.price.toFixed(2)}</span>
                      <button
                        onClick={() => removeItem(seat.id)}
                        className="text-sm text-gray-500 hover:text-error flex items-center gap-1"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-800">${totalAmount.toFixed(2)}</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/events"
              className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold"
            >
              Seguir comprando
            </Link>
            <Link
              to="/cart/checkout"
              className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark shadow"
            >
              Continuar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
