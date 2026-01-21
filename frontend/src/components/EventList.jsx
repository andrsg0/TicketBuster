import { useState, useEffect } from 'react';
import EventCard from './EventCard';
import { getEvents } from '../services/api';
import { getCachedEvents, cacheEvents, isOnline } from '../services/offlineStorage';

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        if (navigator.onLine) {
          // Online: Fetch from API
          const data = await getEvents();
          setEvents(data.events || data || []);
          setFromCache(false);
          
          // Cache events for offline use
          await cacheEvents(data.events || data || []);
        } else {
          // Offline: Load from cache
          const cached = await getCachedEvents();
          if (cached && cached.length > 0) {
            setEvents(cached);
            setFromCache(true);
          } else {
            setError('No hay eventos cacheados. Conecta a internet para cargar eventos.');
          }
        }
      } catch (err) {
        console.error('Error loading events:', err);
        
        // Try to load from cache on error
        try {
          const cached = await getCachedEvents();
          if (cached && cached.length > 0) {
            setEvents(cached);
            setFromCache(true);
          } else {
            setError('Error cargando eventos. Por favor intenta de nuevo.');
          }
        } catch (cacheErr) {
          setError('Error cargando eventos. Por favor intenta de nuevo.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    // Listen for online/offline changes
    const handleOnline = () => {
      setIsOffline(false);
      fetchEvents();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200" />
            <div className="p-4 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
            <div className="px-4 pb-4">
              <div className="h-10 bg-gray-200 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-6xl text-gray-dark mb-4">error</span>
        <p className="text-gray-dark text-lg">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-6 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-6xl text-gray-dark mb-4">event_busy</span>
        <p className="text-gray-dark text-lg">No hay eventos disponibles</p>
      </div>
    );
  }

  return (
    <div>
      {/* Offline/Cache Banner */}
      {(isOffline || fromCache) && (
        <div className="mb-6 p-4 bg-warning/20 border border-warning rounded-lg flex items-center gap-3">
          <span className="material-symbols-outlined text-warning">
            {isOffline ? 'cloud_off' : 'cached'}
          </span>
          <p className="text-sm">
            {isOffline 
              ? 'Estás offline. Mostrando eventos guardados.' 
              : 'Mostrando eventos desde caché.'}
          </p>
        </div>
      )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
