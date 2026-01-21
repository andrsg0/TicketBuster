import { useState } from 'react';
import { createOrder } from '../services/api';
import { saveOfflineOrder, isOnline } from '../services/offlineStorage';

export default function BuyButton({ 
  eventId, 
  seatId, 
  userId, 
  price, 
  disabled = false,
  onSuccess,
  onOfflineSave,
  onError 
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'offline' | 'error'

  const handleBuy = async () => {
    if (disabled || loading) return;

    setLoading(true);
    setStatus(null);

    const orderData = {
      event_id: eventId,
      seat_id: seatId,
      user_id: userId
    };

    try {
      if (!navigator.onLine) {
        throw new Error('OFFLINE');
      }

      // Intentar enviar al servidor
      const response = await createOrder(orderData);
      
      setStatus('success');
      onSuccess?.(response);
      
    } catch (error) {
      console.error('Error en compra:', error);

      // Si no hay conexión o falla la red, guardar offline
      if (error.message === 'OFFLINE' || error.name === 'TypeError' || !navigator.onLine) {
        try {
          const localId = await saveOfflineOrder({
            ...orderData,
            price,
            eventId,
            seatId
          });
          
          setStatus('offline');
          onOfflineSave?.(localId);
          
        } catch (offlineError) {
          console.error('Error guardando offline:', offlineError);
          setStatus('error');
          onError?.('Error guardando la compra offline');
        }
      } else {
        setStatus('error');
        onError?.(error.message || 'Error procesando la compra');
      }
    } finally {
      setLoading(false);
    }
  };

  const getButtonContent = () => {
    if (loading) {
      return (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
              fill="none"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Procesando...
        </>
      );
    }

    if (status === 'success') {
      return (
        <>
          <span className="material-symbols-outlined">check_circle</span>
          ¡Compra Exitosa!
        </>
      );
    }

    if (status === 'offline') {
      return (
        <>
          <span className="material-symbols-outlined">cloud_off</span>
          Guardado Offline
        </>
      );
    }

    return (
      <>
        <span className="material-symbols-outlined">shopping_cart</span>
        Comprar - ${price?.toFixed(2) || '0.00'}
      </>
    );
  };

  const getButtonClass = () => {
    const baseClass = 'w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full font-semibold transition-all duration-300';
    
    if (disabled) {
      return `${baseClass} bg-gray-light text-gray-dark cursor-not-allowed`;
    }

    if (status === 'success') {
      return `${baseClass} bg-success text-white`;
    }

    if (status === 'offline') {
      return `${baseClass} bg-warning text-dark`;
    }

    if (status === 'error') {
      return `${baseClass} bg-error text-white`;
    }

    return `${baseClass} bg-primary text-white hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]`;
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleBuy}
        disabled={disabled || loading || status === 'success'}
        className={getButtonClass()}
      >
        {getButtonContent()}
      </button>

      {/* Status messages */}
      {status === 'offline' && (
        <p className="text-sm text-warning text-center flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-sm">info</span>
          Se enviará automáticamente cuando vuelva la conexión
        </p>
      )}

      {status === 'error' && (
        <p className="text-sm text-error text-center">
          Error en la compra. Intenta de nuevo.
        </p>
      )}
    </div>
  );
}
