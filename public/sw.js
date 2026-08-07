const CACHE_NAME = 'sociallink-v2';
const OFFLINE_URL = '/';

function shouldBypassRequest(requestUrl, request) {
  if (request.method !== 'GET') return true;

  const isSameOrigin = requestUrl.origin === self.location.origin;
  if (!isSameOrigin) return true;

  // Never interfere with auth/api endpoints.
  if (
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.pathname.includes('identitytoolkit') ||
    requestUrl.pathname.includes('securetoken') ||
    requestUrl.pathname.includes('firebase')
  ) {
    return true;
  }

  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (shouldBypassRequest(requestUrl, event.request)) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).catch(() => {
        // For asset requests without cache, return an empty response instead of throwing.
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});
