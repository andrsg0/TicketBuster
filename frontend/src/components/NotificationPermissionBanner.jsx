/**
 * NotificationPermissionBanner
 * Banner que solicita permiso para notificaciones push
 */

import { useState, useEffect } from 'react';
import usePushNotifications from '../hooks/usePushNotifications';

export default function NotificationPermissionBanner() {
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verificar si ya fue descartado anteriormente
  useEffect(() => {
    const wasDismissed = localStorage.getItem('push-banner-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  // No mostrar si:
  // - No soportado
  // - Ya tiene permiso (granted o denied)
  // - Fue descartado
  if (!isSupported || permission !== 'default' || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    setIsLoading(true);
    await requestPermission();
    setIsLoading(false);
    setDismissed(true);
  };

  const handleDismiss = () => {
    localStorage.setItem('push-banner-dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">notifications</span>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">
              Activa las notificaciones
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Recibe alertas cuando tus compras se confirmen y recordatorios de tus eventos.
            </p>
            
            {/* Buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={isLoading}
                className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Activando...
                  </>
                ) : (
                  'Activar'
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-1.5 text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
          
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
