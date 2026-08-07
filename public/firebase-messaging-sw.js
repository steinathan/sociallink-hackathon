// firebase-messaging-sw.js
// This service worker handles FCM background push notifications.
// It must be served from the root path (/firebase-messaging-sw.js).
// The Firebase config below is intentionally duplicated here because
// service workers cannot access Next.js env vars or import from /src.

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// ---------------------------------------------------------------------------
// IMPORTANT: Keep this config in sync with .env.local / firebase.ts
// These values are non-sensitive public keys — safe to embed in the SW.
// ---------------------------------------------------------------------------
firebase.initializeApp({
  apiKey: "AIzaSyDjaWsnSH_zBqMbQrmWjHbRphAnoxjC0P0",
  authDomain: "factors-98397.firebaseapp.com",
  projectId: "factors-98397",
  storageBucket: "factors-98397.firebasestorage.app",
  messagingSenderId: "473845194081",
  appId: "1:473845194081:web:f5ea4c83cb47aa9505f920",
});

const messaging = firebase.messaging();

// ---------------------------------------------------------------------------
// Background message handler
// Fires when the app is closed / not in the foreground.
// We construct a native OS notification from the FCM data payload.
// ---------------------------------------------------------------------------
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background message received:", payload);

  const { title, body, icon, badge, tag, data } = payload.notification ?? {};
  const notificationTitle = title ?? "SocialLink";
  const notificationOptions = {
    body: body ?? "",
    icon: icon ?? "/icons/web-app-manifest-192x192.png",
    badge: badge ?? "/icons/favicon-96x96.png",
    tag: tag ?? "sociallink-notification",
    data: data ?? payload.data ?? {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: [
      {
        action: "view",
        title: "View",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ---------------------------------------------------------------------------
// Notification click handler
// Routes the user to the correct page based on the payload data.
// ---------------------------------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const data = event.notification.data ?? {};
  let targetUrl = "/dashboard";

  if (data.bookingId) {
    targetUrl = `/bookings/${data.bookingId}`;
  } else if (data.url) {
    targetUrl = data.url;
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If the app is already open, focus the existing tab and navigate
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
