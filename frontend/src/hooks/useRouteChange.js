import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook que detecta cambios de ruta y ejecuta un callback
 * Útil para resetear estados o hacer cleanup
 */
export function useRouteChange(callback) {
  const location = useLocation();

  useEffect(() => {
    if (callback) {
      callback(location.pathname);
    }
  }, [location.pathname, callback]);
}

export default useRouteChange;
