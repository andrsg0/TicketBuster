/**
 * LoginButton Component
 * Maneja autenticación con Keycloak usando react-oidc-context
 */

import { useAuth } from 'react-oidc-context';

export default function LoginButton({ className = '' }) {
  const auth = useAuth();

  const handleLogin = () => {
    auth.signinRedirect();
  };

  const handleLogout = () => {
    auth.signoutRedirect();
  };

  if (auth.isLoading) {
    return (
      <button 
        disabled
        className={`px-6 py-2 bg-gray-light text-gray-dark rounded-full font-medium ${className}`}
      >
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle 
              className="opacity-25" 
              cx="12" cy="12" r="10" 
              stroke="currentColor" 
              strokeWidth="4" 
              fill="none"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Cargando...
        </span>
      </button>
    );
  }

  if (auth.error) {
    return (
      <button 
        onClick={handleLogin}
        className={`px-6 py-2 bg-error text-white rounded-full font-medium hover:bg-error/90 transition-colors ${className}`}
      >
        Error - Reintentar
      </button>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray">
            {auth.user?.profile?.name || auth.user?.profile?.preferred_username}
          </p>
          <p className="text-xs text-gray-dark">{auth.user?.profile?.email}</p>
        </div>
        <button 
          onClick={handleLogout}
          className={`px-4 py-2 text-sm text-gray-dark hover:text-error transition-colors ${className}`}
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={handleLogin}
      className={`px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors ${className}`}
    >
      Iniciar Sesión
    </button>
  );
}

/**
 * Hook para obtener el usuario actual
 */
export function useCurrentUser() {
  const auth = useAuth();

  if (!auth.isAuthenticated || !auth.user) {
    return null;
  }

  return {
    id: auth.user.profile?.sub,
    name: auth.user.profile?.name || auth.user.profile?.preferred_username,
    email: auth.user.profile?.email,
    token: auth.user.access_token
  };
}

/**
 * Configuración para AuthProvider
 */
export const oidcConfig = {
  authority: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080/realms/ticketbuster',
  client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'ticketbuster-frontend',
  redirect_uri: window.location.origin,
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope: 'openid profile email',
  automaticSilentRenew: true,
  loadUserInfo: true
};
