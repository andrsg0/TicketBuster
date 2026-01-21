import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import NotificationToast from './NotificationToast';
import OfflineBanner from './OfflineBanner';

export default function Layout({ user, onLogin, onLogout, notification, onDismissNotification }) {
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
