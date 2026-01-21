import { useState, useEffect, useMemo } from 'react';
import EventCard from '../components/EventCard';
import { getEvents } from '../services/api';
import { getCachedEvents, cacheEvents } from '../services/offlineStorage';

// Categorías disponibles
const CATEGORIES = [
  { id: 'ALL', label: 'Todos', icon: 'apps' },
  { id: 'CONCERT', label: 'Conciertos', icon: 'music_note' },
  { id: 'THEATER', label: 'Teatro', icon: 'theater_comedy' },
  { id: 'SPORTS', label: 'Deportes', icon: 'sports_soccer' },
  { id: 'FESTIVAL', label: 'Festivales', icon: 'celebration' },
  { id: 'CONFERENCE', label: 'Conferencias', icon: 'groups' },
];

// Opciones de ordenamiento
const SORT_OPTIONS = [
  { id: 'date-asc', label: 'Fecha (próximos primero)' },
  { id: 'date-desc', label: 'Fecha (más lejanos primero)' },
  { id: 'price-asc', label: 'Precio (menor a mayor)' },
  { id: 'price-desc', label: 'Precio (mayor a menor)' },
  { id: 'name-asc', label: 'Nombre (A-Z)' },
];

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('date-asc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        if (navigator.onLine) {
          const data = await getEvents();
          setEvents(data.events || data || []);
          setFromCache(false);
          await cacheEvents(data.events || data || []);
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

  // Filtrar y ordenar eventos
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(event => 
        event.name?.toLowerCase().includes(query) ||
        event.venue?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query)
      );
    }

    // Filtrar por categoría
    if (selectedCategory !== 'ALL') {
      result = result.filter(event => event.category === selectedCategory);
    }

    // Ordenar
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.date) - new Date(b.date);
        case 'date-desc':
          return new Date(b.date) - new Date(a.date);
        case 'price-asc':
          return (a.basePrice || 0) - (b.basePrice || 0);
        case 'price-desc':
          return (b.basePrice || 0) - (a.basePrice || 0);
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        default:
          return 0;
      }
    });

    return result;
  }, [events, searchQuery, selectedCategory, sortBy]);

  // Contadores por categoría
  const categoryCounts = useMemo(() => {
    const counts = { ALL: events.length };
    CATEGORIES.forEach(cat => {
      if (cat.id !== 'ALL') {
        counts[cat.id] = events.filter(e => e.category === cat.id).length;
      }
    });
    return counts;
  }, [events]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded-lg w-64 mb-8" />
            <div className="h-14 bg-gray-200 rounded-full mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-80 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray">Explorar Eventos</h1>
              <p className="text-gray-dark mt-1">
                {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''} encontrado{filteredEvents.length !== 1 ? 's' : ''}
                {fromCache && (
                  <span className="ml-2 inline-flex items-center text-warning">
                    <span className="material-symbols-outlined text-sm mr-1">cloud_off</span>
                    Modo offline
                  </span>
                )}
              </p>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-dark">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar eventos, artistas, venues..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-full border-2 border-transparent focus:border-primary focus:bg-white outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-dark hover:text-gray"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Toggle (mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg"
            >
              <span className="material-symbols-outlined">tune</span>
              Filtros
            </button>
          </div>

          {/* Category Pills */}
          <div className={`mt-6 ${showFilters ? 'block' : 'hidden md:block'}`}>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-gray-100 text-gray-dark hover:bg-gray-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                  {cat.label}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedCategory === cat.id
                      ? 'bg-white/20'
                      : 'bg-gray-200'
                  }`}>
                    {categoryCounts[cat.id] || 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="mt-4 flex items-center gap-4">
              <label className="text-gray-dark text-sm">Ordenar por:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-gray-100 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {error ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
              error_outline
            </span>
            <p className="text-gray-dark text-lg">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Reintentar
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
              event_busy
            </span>
            <p className="text-gray-dark text-lg">No se encontraron eventos</p>
            {(searchQuery || selectedCategory !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
                className="mt-4 px-6 py-2 bg-gray-200 text-gray rounded-lg hover:bg-gray-300"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Grid de eventos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl text-center">
                <span className="material-symbols-outlined text-4xl text-primary mb-2">
                  event
                </span>
                <p className="text-2xl font-bold text-gray">{events.length}</p>
                <p className="text-gray-dark text-sm">Eventos totales</p>
              </div>
              <div className="bg-white p-6 rounded-xl text-center">
                <span className="material-symbols-outlined text-4xl text-success mb-2">
                  calendar_month
                </span>
                <p className="text-2xl font-bold text-gray">
                  {events.filter(e => new Date(e.date) > new Date()).length}
                </p>
                <p className="text-gray-dark text-sm">Próximos eventos</p>
              </div>
              <div className="bg-white p-6 rounded-xl text-center">
                <span className="material-symbols-outlined text-4xl text-secondary mb-2">
                  location_on
                </span>
                <p className="text-2xl font-bold text-gray">
                  {new Set(events.map(e => e.venue)).size}
                </p>
                <p className="text-gray-dark text-sm">Venues</p>
              </div>
              <div className="bg-white p-6 rounded-xl text-center">
                <span className="material-symbols-outlined text-4xl text-warning mb-2">
                  category
                </span>
                <p className="text-2xl font-bold text-gray">
                  {new Set(events.map(e => e.category).filter(Boolean)).size}
                </p>
                <p className="text-gray-dark text-sm">Categorías</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
