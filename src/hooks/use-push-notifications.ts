"use client";

import { useEffect, useState, useCallback } from "react";
import { onMessage } from "firebase/messaging";
import { useAuthStore } from "@/store/auth-store";
import { auth } from "@/lib/firebase";
import { getFirebaseMessaging } from "@/lib/firebase";
import { getOrRefreshFcmToken } from "@/lib/fcm";
import { saveFcmToken, removeFcmToken } from "@/actions/notifications.actions";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { playNotificationSound } from "@/lib/audio";

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const { firebaseUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [isRegistering, setIsRegistering] = useState(false);

  // Sync the current browser permission state on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermissionState);
  }, []);

  // ── Foreground message listener ────────────────────────────────────────────
  // When the app IS open, FCM doesn't show a native notification — we show
  // a rich sonner toast instead.
  useEffect(() => {
    if (permission !== "granted") return;

    let unsub: (() => void) | undefined;

    getFirebaseMessaging().then((messaging) => {
      if (!messaging) return;
      unsub = onMessage(messaging, (payload) => {
        const { title, body } = payload.notification ?? {};
          const data = payload.data ?? {};
        const targetUrl = data.url || (data.bookingId ? `/bookings/${data.bookingId}` : null);

        // Always play the notification sound
        playNotificationSound();

        // Avoid showing the popup toast if the user is already on the exact page 
        // the notification relates to (e.g., they are inside the chat window right now).
        if (targetUrl && pathname && pathname.includes(targetUrl)) {
          return;
        }

        toast(title ?? "SocialLink", {
          description: body,
          duration: 8000,
          action: targetUrl
            ? {
                label: "View",
                onClick: () => router.push(targetUrl),
              }
            : undefined,
        });
      });
    });

    return () => unsub?.();
  }, [permission, router, pathname]);

  // ── Request permission + register token ───────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (!firebaseUser) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    setIsRegistering(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);

      if (result !== "granted") return;

      const token = await getOrRefreshFcmToken();
      if (!token) return;

      const idToken = await firebaseUser.getIdToken();
      await saveFcmToken(idToken, token);
    } catch (err) {
      console.warn("[usePushNotifications] requestPermission error:", err);
    } finally {
      setIsRegistering(false);
    }
  }, [firebaseUser]);

  // ── Revoke (opt-out) ───────────────────────────────────────────────────────
  const revokePermission = useCallback(async () => {
    if (!firebaseUser) return;
    try {
      const token = await getOrRefreshFcmToken();
      if (!token) return;
      const idToken = await firebaseUser.getIdToken();
      await removeFcmToken(idToken, token);
    } catch (err) {
      console.warn("[usePushNotifications] revokePermission error:", err);
    }
  }, [firebaseUser]);

  // ── Auto-register if already granted on mount ─────────────────────────────
  // If the user already gave permission previously (e.g. from a prior session),
  // silently refresh the token without prompting.
  useEffect(() => {
    if (!firebaseUser || permission !== "granted") return;

    let cancelled = false;
    (async () => {
      const token = await getOrRefreshFcmToken();
      if (cancelled || !token) return;
      const idToken = await firebaseUser.getIdToken();
      await saveFcmToken(idToken, token);
    })();

    return () => { cancelled = true; };
  }, [firebaseUser, permission]);

  return { permission, isRegistering, requestPermission, revokePermission };
}
