/**
 * Service Worker Registration Utility
 *
 * Handles registration and updates of the service worker
 */

// Check if service workers are supported
export function isSupported() {
  return 'serviceWorker' in navigator;
}

// Register the service worker
export async function register(config = {}) {
  if (!isSupported()) {
    console.log('Service workers are not supported in this browser');
    return null;
  }

  if (import.meta.env.DEV && !config.enableInDev) {
    console.log('Service worker disabled in development mode');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });

    console.log('Service Worker registered successfully:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          console.log('New service worker available');

          if (config.onUpdate) {
            config.onUpdate(registration);
          } else {
            // Default: notify user
            if (window.confirm('New version available! Reload to update?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        }

        if (newWorker.state === 'activated' && !navigator.serviceWorker.controller) {
          // First time service worker activated
          console.log('Service worker activated for the first time');

          if (config.onSuccess) {
            config.onSuccess(registration);
          }
        }
      });
    });

    // Check for updates periodically (every hour)
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    if (config.onError) {
      config.onError(error);
    }
    return null;
  }
}

// Unregister the service worker
export async function unregister() {
  if (!isSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const success = await registration.unregister();
    console.log('Service Worker unregistered:', success);
    return success;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
}

// Clear all caches
export async function clearCaches() {
  if (!('caches' in window)) {
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear caches:', error);
    return false;
  }
}

// Check if running in standalone mode (PWA)
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Check if offline
export function isOffline() {
  return !navigator.onLine;
}

// Listen for online/offline events
export function addConnectivityListeners(callbacks = {}) {
  const handleOnline = () => {
    console.log('App is online');
    if (callbacks.onOnline) {
      callbacks.onOnline();
    }
  };

  const handleOffline = () => {
    console.log('App is offline');
    if (callbacks.onOffline) {
      callbacks.onOffline();
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export default {
  isSupported,
  register,
  unregister,
  clearCaches,
  isStandalone,
  isOffline,
  addConnectivityListeners
};
