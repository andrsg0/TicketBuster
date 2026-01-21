import { useEffect, useMemo, useState } from 'react';
import EventCard from '../components/EventCard';
import { getEvents } from '../services/api';
import { getCachedEvents, cacheEvents } from '../services/offlineStorage';

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        if (navigator.onLine) {
          const data = await getEvents();
          const list = data.events || data || [];
          setEvents(list);
          setFromCache(false);
          await cacheEvents(list);
        } else {
          const cached = await getCachedEvents();
          if (cached && cached.length > 0) {
            setEvents(cached);
            setFromCache(true);
          } else {
            setError('No hay eventos disponibles offline');
          }
        }
      } catch (err) {
        console.error('Error loading events:', err);
        const cached = await getCachedEvents();
        if (cached && cached.length > 0) {
          setEvents(cached);
          setFromCache(true);
        } else {
          setError('Error cargando eventos');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    // Hide sold-out: available_seats or availableSeats must be > 0
    let list = events.filter(e => (e.available_seats ?? e.availableSeats ?? 0) > 0);

    // Category filter
    if (selectedCategory !== 'ALL') {
      list = list.filter(e => e.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e =>
        (e.title || e.name || '').toLowerCase().includes(q) ||
        (e.venue || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [events, selectedCategory, searchQuery]);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-gray mb-4">
              Descubre Eventos Increíbles
            </h1>
            <p className="text-gray-dark text-lg">
              Encuentra y compra tickets para los mejores eventos. 
              Funciona incluso sin conexión a internet.
            </p>
          </div>

          {/* Search (placeholder for future implementation) */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="flex items-center bg-gray-light rounded-full p-2">
              <span className="material-symbols-outlined text-gray-dark ml-4">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar eventos, artistas, venues..."
                className="flex-1 bg-transparent px-4 py-2 outline-none text-gray"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="px-3 py-2 text-gray-dark hover:text-gray">
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'CONCERT', label: 'Conciertos' },
              { id: 'THEATER', label: 'Teatro' },
              { id: 'SPORTS', label: 'Deportes' },
              { id: 'FESTIVAL', label: 'Festivales' },
              { id: 'CONFERENCE', label: 'Conferencias' },
              { id: 'OTHER', label: 'Otros' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2 rounded-full transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-light text-gray hover:bg-primary hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray">
              Próximos Eventos
            </h2>
            <a 
              href="/events" 
              className="flex items-center gap-2 text-primary font-medium hover:underline"
            >
              Ver todos
              <span className="material-symbols-outlined">arrow_forward</span>
            </a>
          </div>
          {error ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">error_outline</span>
              <p className="text-gray-dark text-lg">{error}</p>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray text-center mb-12">
            ¿Por qué TicketBuster?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-primary">cloud_off</span>
              </div>
              <h3 className="font-bold text-lg text-gray mb-2">Funciona Offline</h3>
              <p className="text-gray-dark">
                Compra tickets incluso sin internet. Se sincronizarán automáticamente cuando vuelvas a conectarte.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-success">qr_code_2</span>
              </div>
              <h3 className="font-bold text-lg text-gray mb-2">QR Instantáneo</h3>
              <p className="text-gray-dark">
                Recibe tu código QR en segundos. Entra al evento directamente desde tu móvil.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-secondary">notifications_active</span>
              </div>
              <h3 className="font-bold text-lg text-gray mb-2">Notificaciones en Tiempo Real</h3>
              <p className="text-gray-dark">
                Recibe actualizaciones instantáneas sobre el estado de tu compra.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
