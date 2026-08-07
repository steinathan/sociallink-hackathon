/**
 * src/lib/fcm.ts
 *
 * Client-side Firebase Cloud Messaging helper.
 * Handles service worker registration handoff and FCM token retrieval.
 * Must only be called from browser (client components / hooks).
 */

import { getToken } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/**
 * Ensures the dedicated Firebase Messaging service worker is registered,
 * then requests (or refreshes) the FCM device token.
 *
 * Returns null if:
 * - Running on the server
 * - Browser doesn't support push (e.g. Safari < 16)
 * - User has denied notification permission
 * - VAPID key is not configured
 */
export async function getOrRefreshFcmToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!VAPID_KEY) {
    console.warn("[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set.");
    return null;
  }

  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    // Register the dedicated Firebase messaging service worker.
    // We need this separate from sw.js so Firebase can intercept background messages.
    const swRegistration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" }
    );

    // Defensive check: if VAPID_KEY is still a placeholder, getToken will throw InvalidAccessError.
    if (!VAPID_KEY || VAPID_KEY.includes("your_vapid_key_here")) {
      console.warn("[FCM] VAPID key is not configured. Push notifications will be disabled.");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    return token ?? null;
  } catch (err) {
    // NotificationError, no sw support, etc. — degrade gracefully.
    console.warn("[FCM] Could not get FCM token:", err);
    return null;
  }
}
