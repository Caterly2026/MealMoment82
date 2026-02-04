// MealMoment Service Worker - Version 5.0
// Supports: Customer App, Owner Dashboard, Driver App
const CACHE_NAME = 'mealmoment-v5';
const APP_VERSION = '5.0';

// Core files for all three apps
const CORE_FILES = [
  '/',
  '/index.html',
  '/owner-dashboard.html',
  '/driver.html',
  '/install.html',
  '/manifest-customer.json',
  '/manifest-owner.json',
  '/manifest-driver.json',
  '/sw.js',
  '/icon-192.png',
  '/icon-512.png',
  '/image/MealMomenetlogo.jpeg',
  '/MealMomentDriverlogo.jpeg'
];

// External resources to cache
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js'
];

// Install - Cache all files
self.addEventListener('install', event => {
  console.log('📱 Service Worker: Installing MealMoment Apps v5...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching core files for all 3 apps');
        // Cache core files
        return cache.addAll(CORE_FILES)
          .then(() => {
            console.log('✅ Core files cached');
            // Cache external resources
            return Promise.all(
              EXTERNAL_RESOURCES.map(url => 
                fetch(url)
                  .then(response => {
                    if (response.ok) {
                      return cache.put(url, response);
                    }
                  })
                  .catch(err => {
                    console.warn(`Could not cache ${url}:`, err);
                  })
              )
            );
          });
      })
      .then(() => {
        console.log('✅ All files cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Installation failed:', error);
      })
  );
});

// Activate - Clean up old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activating MealMoment v5...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches except current
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('✅ Activation complete - All 3 apps ready');
      return self.clients.claim();
    })
  );
});

// Fetch - Handle requests for all apps
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Handle different app pages
  if (event.request.mode === 'navigate') {
    event.respondWith(
      handleNavigationRequest(event)
    );
    return;
  }
  
  // For API requests (Firebase)
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    event.respondWith(
      handleApiRequest(event)
    );
    return;
  }
  
  // For all other requests
  event.respondWith(
    handleResourceRequest(event)
  );
});

// Handle navigation to different apps
async function handleNavigationRequest(event) {
  const cache = await caches.open(CACHE_NAME);
  const cachedPage = await cache.match(event.request.url);
  
  if (cachedPage) {
    return cachedPage;
  }
  
  try {
    const networkResponse = await fetch(event.request);
    
    // Cache the response
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      cache.put(event.request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Offline - serving fallback:', error);
    
    // Return appropriate fallback based on requested page
    const path = new URL(event.request.url).pathname;
    
    if (path.includes('owner-dashboard')) {
      return cache.match('/owner-dashboard.html') || 
             getOfflinePage('Owner Dashboard');
    }
    
    if (path.includes('driver')) {
      return cache.match('/driver.html') || 
             getOfflinePage('Driver App');
    }
    
    if (path.includes('install')) {
      return cache.match('/install.html') || 
             getOfflinePage('Install Page');
    }
    
    // Default to main app
    return cache.match('/index.html') || 
           getOfflinePage('MealMoment');
  }
}

// Handle API requests
async function handleApiRequest(event) {
  try {
    const networkResponse = await fetch(event.request);
    return networkResponse;
  } catch (error) {
    // For Firebase requests, we can't cache them easily
    // Return offline-friendly response
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'You are offline. Some features may not work.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle resource requests (CSS, JS, images)
async function handleResourceRequest(event) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(event.request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(event.request);
    
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      cache.put(event.request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    // Image fallback
    if (event.request.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      const fallbackImage = await cache.match('/icon-192.png');
      if (fallbackImage) return fallbackImage;
    }
    
    // Return simple offline response
    return new Response('Offline - Resource not available', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Generate offline page
function getOfflinePage(title) {
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px 20px;
            text-align: center;
            background: linear-gradient(135deg, #FF6A00 0%, #2E7D32 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .container {
            background: rgba(255,255,255,0.95);
            padding: 40px;
            border-radius: 20px;
            max-width: 500px;
            color: #333;
          }
          h1 {
            color: #2E7D32;
            margin-bottom: 20px;
            font-size: 2.5rem;
          }
          p {
            margin-bottom: 20px;
            line-height: 1.6;
          }
          button {
            background: #2E7D32;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 10px;
            font-size: 1rem;
            cursor: pointer;
            margin: 10px;
          }
          button:hover {
            background: #1B5E20;
          }
          .app-buttons {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🍽️ MealMoment</h1>
          <p><strong>You're offline right now.</strong></p>
          <p>The ${title} will work when you're back online.</p>
          
          <div class="app-buttons">
            <button onclick="location.reload()">🔄 Retry Connection</button>
            <button onclick="window.location.href='/install.html'">📱 Install Apps</button>
          </div>
          
          <p style="margin-top: 30px; font-size: 0.9rem; color: #666;">
            Need help? Email: support@mealmoment.com
          </p>
        </div>
        
        <script>
          // Check if back online
          window.addEventListener('online', () => {
            location.reload();
          });
        </script>
      </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } });
}

// Background sync for orders
self.addEventListener('sync', event => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders());
  }
  
  if (event.tag === 'sync-driver-location') {
    event.waitUntil(syncDriverLocation());
  }
});

// Sync pending orders when back online
async function syncPendingOrders() {
  console.log('🔄 Syncing pending orders...');
  
  // In a real app, you would:
  // 1. Get pending orders from IndexedDB
  // 2. Send them to your backend
  // 3. Update local status
  
  return Promise.resolve();
}

// Sync driver location
async function syncDriverLocation() {
  console.log('🔄 Syncing driver location...');
  return Promise.resolve();
}

// Push notifications
self.addEventListener('push', event => {
  console.log('🔔 Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update from MealMoment',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('MealMoment', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
