import { useEffect, useState } from 'react';

export default function NotificationToast({ notification, onDismiss, duration = 7000 }) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification) return;

    setIsVisible(true);
    setProgress(100);

    // Progress bar animation
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (duration / 100));
        return newProgress < 0 ? 0 : newProgress;
      });
    }, 100);

    // Auto dismiss
    const timeout = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [notification, duration]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  if (!notification) return null;

  const isSuccess = notification.type === 'order.completed' || notification.status === 'completed';
  const isError = notification.type === 'order.failed' || notification.status === 'failed';

  const getIcon = () => {
    if (isSuccess) return 'check_circle';
    if (isError) return 'error';
    return 'notifications';
  };

  const getTitle = () => {
    if (isSuccess) return '¡Tu entrada está lista!';
    if (isError) return 'Error en la compra';
    return 'Notificación';
  };

  const getMessage = () => {
    if (isSuccess) {
      return `Orden ${notification.order_uuid?.slice(0, 8)}... completada. Revisa tu QR en "Mis Tickets".`;
    }
    if (isError) {
      return notification.error || 'Hubo un problema procesando tu orden.';
    }
    return notification.message || 'Tienes una nueva notificación.';
  };

  const getBgClass = () => {
    if (isSuccess) return 'bg-success';
    if (isError) return 'bg-error';
    return 'bg-primary';
  };

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 max-w-sm transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className={`${getBgClass()} text-white rounded-lg shadow-2xl overflow-hidden`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-2xl flex-shrink-0">
              {getIcon()}
            </span>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-lg">{getTitle()}</h4>
              <p className="text-sm opacity-90 mt-1">{getMessage()}</p>
              
              {isSuccess && notification.qr_code_hash && (
                <p className="text-xs opacity-75 mt-2">
                  QR: {notification.qr_code_hash.slice(0, 16)}...
                </p>
              )}
            </div>

            <button 
              onClick={handleDismiss}
              className="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/30">
          <div 
            className="h-full bg-white transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
