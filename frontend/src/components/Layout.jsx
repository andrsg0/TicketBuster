import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import NotificationToast from './NotificationToast';
import OfflineBanner from './OfflineBanner';
import { useEffect } from 'react';

export default function Layout({ user, onLogin, onLogout, notification, onDismissNotification }) {
  const location = useLocation();
  
  console.log('[Layout] Render - pathname:', location.pathname);
  
  // Scroll al top cuando cambia la ruta
  useEffect(() => {
    console.log('[Layout] useEffect - scrolling to top for:', location.pathname);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-light">
      <OfflineBanner />
      <Header user={user} onLogin={onLogin} onLogout={onLogout} />
      
      <main className="flex-1">
        <Outlet />
      </main>
      
      <Footer />
      
      {notification && (
        <NotificationToast 
          notification={notification} 
          onDismiss={onDismissNotification}
        />
      )}
    </div>
  );
}
