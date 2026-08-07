"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const isProd = process.env.NODE_ENV === "production";

    // Keep dev auth/network behavior predictable by skipping cache SW locally.
    if (isProd) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[SW] Registered:", reg.scope))
        .catch((err) => console.error("[SW] Registration failed:", err));
    }

    // Register the Firebase Messaging service worker separately.
    // Must be registered eagerly so the browser controller is ready
    // before getOrRefreshFcmToken() is called.
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js", { scope: "/" })
      .then((reg) => console.log("[FCM SW] Registered:", reg.scope))
      .catch((err) => console.warn("[FCM SW] Registration failed (non-fatal):", err));
  }, []);

  return null;
}
