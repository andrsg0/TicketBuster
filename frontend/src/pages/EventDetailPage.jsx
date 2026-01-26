import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getEvent } from '../services/api';
import { getCachedEvent } from '../services/offlineStorage';

// Mapeo de categorías a iconos y colores
const categoryConfig = {
  CONCERT: { icon: 'music_note', color: 'bg-purple-500', label: 'Concierto' },
  THEATER: { icon: 'theater_comedy', color: 'bg-red-500', label: 'Teatro' },
  SPORTS: { icon: 'sports_soccer', color: 'bg-green-500', label: 'Deportes' },
  CONFERENCE: { icon: 'groups', color: 'bg-blue-500', label: 'Conferencia' },
  FESTIVAL: { icon: 'celebration', color: 'bg-orange-500', label: 'Festival' },
  OTHER: { icon: 'event', color: 'bg-gray-500', label: 'Evento' }
};

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);

      try {
        if (navigator.onLine) {
          const data = await getEvent(id);
          setEvent(data.event || data);
          setSeats(data.seats || []);
          setFromCache(false);
        } else {
          const cached = await getCachedEvent(parseInt(id));
          if (cached) {
            setEvent(cached.event || cached);
            setSeats(cached.seats || []);
            setFromCache(true);
          } else {
            setError('Evento no disponible offline');
          }
        }
      } catch (err) {
        console.error('Error loading event:', err);
        const cached = await getCachedEvent(parseInt(id));
        if (cached) {
          setEvent(cached.event || cached);
          setSeats(cached.seats || []);
          setFromCache(true);
        } else {
          setError('Error cargando el evento');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  // Contar asientos disponibles
  const availableSeatsCount = useMemo(() => {
    return seats.filter(s => s.status === 'AVAILABLE').length;
  }, [seats]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="animate-pulse">
          <div className="h-80 bg-gray-300" />
          <div className="container mx-auto px-4 py-8">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-8" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">error</span>
          <h1 className="text-2xl font-bold text-gray-700 mb-2">{error}</h1>
          <Link to="/" className="text-primary hover:underline">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const defaultImage = 'https://images.unsplash.com/photo-1531058020387-3be344556be6?q=80&w=800&auto=format&fit=crop';
  const eventImage = event.image_url || defaultImage;
  const catConfig = categoryConfig[event.category] || categoryConfig.OTHER;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Hero Banner con blur */}
      <div className="relative h-96 overflow-hidden">
        {/* Imagen de fondo con blur */}
        <div 
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{ 
            backgroundImage: `url("${eventImage}")`,
            filter: 'blur(20px) brightness(0.5)'
          }}
        />
        
        {/* Overlay oscuro */}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Contenido centrado */}
        <div className="relative h-full flex flex-col items-center justify-center px-4">
          {/* Imagen del evento (pequeña, centrada) */}
          <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden shadow-2xl mb-6 ring-4 ring-white/20">
            <img 
              src={eventImage} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Título del evento */}
          <h1 className="text-2xl md:text-4xl font-bold text-white text-center mb-2 drop-shadow-lg">
            {event.title}
          </h1>
          
          {/* Ubicación */}
          <p className="text-white/80 text-sm md:text-base flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">location_on</span>
            {event.venue}
          </p>

          {/* Badge de categoría */}
          <div className="absolute top-4 right-4">
            <span className={`px-3 py-1.5 ${catConfig.color} text-white text-sm font-medium rounded-full flex items-center gap-1.5 shadow-lg`}>
              <span className="material-symbols-outlined text-base">{catConfig.icon}</span>
              {catConfig.label}
            </span>
          </div>

          {/* Botón volver */}
          <Link 
            to="/"
            className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
          >
            <span className="material-symbols-outlined text-white">arrow_back</span>
          </Link>
        </div>
      </div>

      {/* Cache Banner */}
      {fromCache && (
        <div className="bg-amber-100 border-b border-amber-300 py-2 px-4">
          <div className="container mx-auto flex items-center gap-2 text-sm text-amber-800">
            <span className="material-symbols-outlined">cached</span>
            <span>Información desde caché. Algunos datos pueden no estar actualizados.</span>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          
          {/* Tarjeta de información */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
            {/* Fecha y hora */}
            <div className="p-6 border-b flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex flex-col items-center justify-center">
                <span className="text-primary font-bold text-lg">
                  {new Date(event.date).getDate()}
                </span>
                <span className="text-primary text-xs uppercase">
                  {new Date(event.date).toLocaleDateString('es-ES', { month: 'short' })}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-800 capitalize">
                  {formatDate(event.date)}
                </p>
                <p className="text-gray-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {formatTime(event.date)}
                </p>
              </div>
            </div>

            {/* Descripción */}
            <div className="p-6 border-b">
              <h2 className="font-bold text-gray-800 mb-3">Acerca del evento</h2>
              <p className="text-gray-600 leading-relaxed">{event.description}</p>
            </div>

            {/* Info de asientos y precio */}
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <span className="material-symbols-outlined text-3xl text-primary mb-1">event_seat</span>
                <p className="text-2xl font-bold text-gray-800">{availableSeatsCount}</p>
                <p className="text-sm text-gray-500">Disponibles</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <span className="material-symbols-outlined text-3xl text-green-500 mb-1">sell</span>
                <p className="text-2xl font-bold text-gray-800">${parseFloat(event.price).toFixed(2)}</p>
                <p className="text-sm text-gray-500">Por asiento</p>
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">location_on</span>
              Ubicación
            </h2>
            <p className="font-medium text-gray-800">{event.venue}</p>
            {event.venue_address && (
              <p className="text-gray-500 text-sm mt-1">{event.venue_address}</p>
            )}
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue + ' ' + (event.venue_address || ''))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary text-sm mt-3 hover:underline"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Ver en Google Maps
            </a>
          </div>

          {/* Botón de comprar */}
          {availableSeatsCount > 0 ? (
            <Link
              to={`/event/${id}/seats`}
              className="w-full py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg bg-primary text-white hover:bg-primary-dark hover:shadow-xl active:scale-[0.98]"
            >
              <span className="material-symbols-outlined">confirmation_number</span>
              Seleccionar Asientos
            </Link>
          ) : (
            <button
              disabled
              className="w-full py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg bg-gray-300 text-gray-500 cursor-not-allowed"
            >
              <span className="material-symbols-outlined">confirmation_number</span>
              Agotado
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
