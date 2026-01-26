import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';

// Components
import Layout from './components/Layout';
import CartPage from './pages/CartPage';
import CartCheckoutPage from './pages/CartCheckoutPage';
import { CartProvider } from './context/CartContext';
import { setAuthToken, clearAuthToken } from './services/api';

// Pages
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import SeatSelectionPage from './pages/SeatSelectionPage';
import CheckoutPage from './pages/CheckoutPage';
import MyTicketsPage from './pages/MyTicketsPage';

// Hooks
import useOrderSync from './hooks/useOrderSync';
import useNotifications from './hooks/useNotifications';

// DEV_MODE: Mock user for testing
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true' || import.meta.env.DEV;
const MOCK_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

function App() {
  const auth = useAuth();
  const location = useLocation();
  const [toast, setToast] = useState(null);

  const isAuthenticated = DEV_MODE || auth.isAuthenticated;

  // Get user ID (from Keycloak or mock)
  const userId = DEV_MODE 
    ? MOCK_USER_ID 
    : auth.isAuthenticated 
      ? auth.user?.profile?.sub 
      : null;

  // User object for display
  const user = DEV_MODE 
    ? { id: MOCK_USER_ID, name: 'Usuario Demo', email: 'demo@ticketbuster.com' }
    : auth.isAuthenticated 
      ? { 
          id: auth.user?.profile?.sub,
          name: auth.user?.profile?.name || auth.user?.profile?.preferred_username,
          email: auth.user?.profile?.email
        }
      : null;

  // Propagar token de Keycloak al API service
  useEffect(() => {
    if (DEV_MODE) {
      return;
    }

    if (auth.isAuthenticated && auth.user?.access_token) {
      setAuthToken(auth.user.access_token);
    } else {
      clearAuthToken();
    }
  }, [auth.isAuthenticated, auth.user]);

  // Notifications via Socket.io
  const { 
    latestNotification, 
    clearLatestNotification 
  } = useNotifications(userId);

  // Order sync when online
  const handleSyncSuccess = useCallback((order, response) => {
    console.log('Orden sincronizada:', order, response);
    setToast({
      type: 'success',
      message: `Orden sincronizada exitosamente`
    });
  }, []);

  const handleSyncError = useCallback((order, error) => {
    console.log('Error sincronizando orden:', order, error);
  }, []);

  useOrderSync({
    onSyncSuccess: handleSyncSuccess,
    onSyncError: handleSyncError
  });

  // Handle login/logout
  const handleLogin = useCallback(() => {
    if (DEV_MODE) {
      console.log('DEV_MODE: Login simulado');
      return;
    }
    auth.signinRedirect();
  }, [auth]);

  const handleLogout = useCallback(() => {
    if (DEV_MODE) {
      console.log('DEV_MODE: Logout simulado');
      return;
    }
    auth.signoutRedirect();
  }, [auth]);

  const handleRequireAuth = useCallback(() => {
    if (DEV_MODE) return true;
    auth.signinRedirect();
    return false;
  }, [auth]);

  // Handle toast from child components
  const handleToast = useCallback((notification) => {
    setToast(notification);
  }, []);

  const handleDismissToast = useCallback(() => {
    setToast(null);
    clearLatestNotification();
  }, [clearLatestNotification]);

  // Show notification from Socket.io if no manual toast
  const displayNotification = toast || latestNotification;

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <CartProvider>
            <Layout 
              user={user}
              onLogin={handleLogin}
              onLogout={handleLogout}
              notification={displayNotification}
              onDismissNotification={handleDismissToast}
            />
          </CartProvider>
        }
      >
        <Route index element={<HomePage />} />
        <Route 
          path="event/:id" 
          element={
            <EventDetailPage 
              userId={userId} 
              onToast={handleToast}
            />
          } 
        />
        <Route 
          path="event/:id/seats" 
          element={
            <SeatSelectionPage 
              isAuthenticated={isAuthenticated}
              onRequireAuth={handleRequireAuth}
              userId={userId} 
              onToast={handleToast}
            />
          } 
        />
        <Route 
          path="event/:id/checkout" 
          element={
            <CheckoutPage 
              isAuthenticated={isAuthenticated}
              onRequireAuth={handleRequireAuth}
              userId={userId} 
              onToast={handleToast}
            />
          } 
        />
        <Route 
          path="events" 
          element={<EventsPage />} 
        />
        <Route 
          path="my-tickets" 
          element={<MyTicketsPage userId={userId} />} 
        />
        <Route 
          path="cart" 
          element={<CartPage />} 
        />
        <Route 
          path="cart/checkout" 
          element={<CartCheckoutPage isAuthenticated={isAuthenticated} onRequireAuth={handleRequireAuth} onToast={handleToast} />} 
        />
      </Route>
    </Routes>
  );
}

export default App;
