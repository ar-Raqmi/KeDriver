import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider, useAppStore } from './store';
import { Login } from './screens/Login';
import { RequesterHome } from './screens/RequesterHome';
import { AdminHome } from './screens/AdminHome';
import { DriverHome } from './screens/DriverHome';
import { InstallPrompt } from './components/InstallPrompt';
import './index.css';

function Main() {
  const { currentUser, isLoading } = useAppStore();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const reg = () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
      };
      if (document.readyState === 'complete') reg();
      else window.addEventListener('load', reg);

      // Listen for the new service worker taking over
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fff7ed] flex items-center justify-center">
         <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#ea580c] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="font-black uppercase tracking-widest text-[#ea580c] text-sm">KeDriver</p>
         </div>
      </div>
    );
  }

  if (!currentUser) return (
    <>
      <Login />
      <InstallPrompt />
    </>
  );
  
  return (
    <>
      {currentUser.role === 'ADMIN' ? <AdminHome /> : 
       currentUser.role === 'DRIVER' ? <DriverHome /> : 
       <RequesterHome />}
      <InstallPrompt />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <Main />
    </AppProvider>
  </StrictMode>
);
