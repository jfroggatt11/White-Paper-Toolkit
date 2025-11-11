/**
 * Service Worker for PDATF Toolkit
 *
 * Provides:
 * - Offline support
 * - Asset caching
 * - API caching with network-first strategy
 * - Background sync (future)
 */

const CACHE_NAME = 'pdatf-toolkit-v1';
const RUNTIME_CACHE = 'pdatf-runtime-v1';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/data-worker.js'
];

// Install event - precache assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Precaching failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle API requests differently (network-first)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle data files (cache-first with network update)
  if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Handle static assets (cache-first)
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Handle HTML pages (network-first with cache fallback)
  event.respondWith(networkFirst(request));
});

/**
 * Cache-first strategy
 * Try cache first, fall back to network
 */
async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    console.log('[ServiceWorker] Serving from cache:', request.url);
    // Update cache in background
    fetch(request).then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
    }).catch(() => {
      // Silently fail background update
    });
    return cached;
  }

  try {
    console.log('[ServiceWorker] Fetching from network:', request.url);
    const response = await fetch(request);

    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[ServiceWorker] Fetch failed:', error);

    // Return offline page if available
    const offlinePage = await cache.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }

    // Return a basic offline response
    return new Response(
      '<h1>Offline</h1><p>You are currently offline. Please check your connection.</p>',
      {
        headers: { 'Content-Type': 'text/html' },
        status: 503,
        statusText: 'Service Unavailable'
      }
    );
  }
}

/**
 * Network-first strategy
 * Try network first, fall back to cache
 */
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    console.log('[ServiceWorker] Fetching from network:', request.url);
    const response = await fetch(request);

    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    console.log('[ServiceWorker] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // If this is a navigation request, try to serve the cached index.html
    if (request.mode === 'navigate') {
      const indexPage = await cache.match('/index.html');
      if (indexPage) {
        return indexPage;
      }
    }

    // Return offline page or error
    const offlinePage = await cache.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }

    return new Response(
      '<h1>Offline</h1><p>You are currently offline and this page is not cached.</p>',
      {
        headers: { 'Content-Type': 'text/html' },
        status: 503,
        statusText: 'Service Unavailable'
      }
    );
  }
}

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] Received SKIP_WAITING message');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[ServiceWorker] Clearing cache');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Background sync (for future use)
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    // Implement data synchronization logic here
    console.log('[ServiceWorker] Syncing data...');
  } catch {
    // Silently handle sync errors
  }
}

console.log('[ServiceWorker] Script loaded');
