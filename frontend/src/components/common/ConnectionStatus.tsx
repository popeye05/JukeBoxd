import React, { useState, useEffect } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { testConnection } from '../../utils/connectionTest';

const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [showSlowConnection, setShowSlowConnection] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineAlert(false);
      setShowSlowConnection(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
    };

    // Test connection periodically when online
    const testConnectionPeriodically = async () => {
      if (navigator.onLine) {
        try {
          const startTime = Date.now();
          await testConnection();
          const responseTime = Date.now() - startTime;
          
          // Show slow connection warning if response takes more than 5 seconds
          if (responseTime > 5000) {
            setShowSlowConnection(true);
            setTimeout(() => setShowSlowConnection(false), 5000);
          }
        } catch (error) {
          // Connection test failed
          setShowOfflineAlert(true);
          setTimeout(() => setShowOfflineAlert(false), 3000);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Test connection every 30 seconds
    const interval = setInterval(testConnectionPeriodically, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <Snackbar
        open={showOfflineAlert}
        autoHideDuration={6000}
        onClose={() => setShowOfflineAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="warning" onClose={() => setShowOfflineAlert(false)}>
          Connection issues detected. Some features may not work properly.
        </Alert>
      </Snackbar>

      <Snackbar
        open={showSlowConnection}
        autoHideDuration={5000}
        onClose={() => setShowSlowConnection(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setShowSlowConnection(false)}>
          Slow connection detected. Please be patient while loading.
        </Alert>
      </Snackbar>
    </>
  );
};

export default ConnectionStatus;