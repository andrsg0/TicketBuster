import { Link } from 'react-router-dom';

// Mapeo de categorías a iconos y colores
const categoryConfig = {
  CONCERT: { icon: 'music_note', color: 'bg-purple-500', label: 'Concierto' },
  THEATER: { icon: 'theater_comedy', color: 'bg-red-500', label: 'Teatro' },
  SPORTS: { icon: 'sports_soccer', color: 'bg-green-500', label: 'Deportes' },
  CONFERENCE: { icon: 'groups', color: 'bg-blue-500', label: 'Conferencia' },
  FESTIVAL: { icon: 'celebration', color: 'bg-orange-500', label: 'Festival' },
  OTHER: { icon: 'event', color: 'bg-gray-500', label: 'Evento' }
};

export default function EventCard({ event }) {
  const {
    id,
    title,
    venue,
    date,
    price,
    image_url,
    category = 'OTHER',
    available_seats,
    availableSeats
  } = event;

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha por confirmar';
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear precio
  const formatPrice = (priceValue) => {
    const num = parseFloat(priceValue);
    if (isNaN(num)) return '$0.00';
    return `$${num.toFixed(2)}`;
  };

  // Imagen por defecto si no hay
  const defaultImage = 'https://images.unsplash.com/photo-1531058020387-3be344556be6?q=80&w=400&auto=format&fit=crop';

  const availableCount = (available_seats ?? availableSeats ?? 0);
  const isSoldOut = parseInt(availableCount) === 0;
  const catConfig = categoryConfig[category] || categoryConfig.OTHER;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <Link to={`/event/${id}`}>
        {/* Image */}
        <div 
          className="h-48 bg-cover bg-center relative"
          style={{ backgroundImage: `url("${image_url || defaultImage}")` }}
        >
          {/* Category Badge */}
          <span className={`absolute top-3 right-3 px-2 py-1 ${catConfig.color} text-white text-xs font-medium rounded-full flex items-center gap-1`}>
            <span className="material-symbols-outlined text-sm">{catConfig.icon}</span>
            {catConfig.label}
          </span>
          
          {/* Availability Badge */}
          {isSoldOut ? (
            <span className="absolute top-3 left-3 px-3 py-1 bg-error text-white text-xs font-bold rounded-full">
              AGOTADO
            </span>
          ) : (
            <span className="absolute top-3 left-3 px-3 py-1 bg-success text-white text-xs font-bold rounded-full">
              {availableCount} disponibles
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-lg text-gray mb-2 line-clamp-2">
            {title}
          </h3>
          
          <div className="space-y-1 text-sm text-gray-dark">
            <p className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">event</span>
              {formatDate(date)}
            </p>
            <p className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">location_on</span>
              {venue || 'Ubicación por confirmar'}
            </p>
            <p className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">local_activity</span>
              desde <strong className="text-primary">{formatPrice(price)}</strong>
            </p>
          </div>
        </div>
      </Link>

      {/* Action Button */}
      <div className="px-4 pb-4">
        <Link
          to={`/event/${id}`}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-full font-medium transition-colors ${
            isSoldOut 
              ? 'bg-gray-light text-gray-dark cursor-not-allowed' 
              : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
          }`}
        >
          {isSoldOut ? 'Agotado' : 'Ver Detalles'}
          {!isSoldOut && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
        </Link>
      </div>
    </div>
  );
}
