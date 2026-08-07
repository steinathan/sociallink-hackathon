"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const DISMISSED_KEY = "sl_push_prompt_dismissed";

export function PushNotificationPrompt() {
  const { permission, isRegistering, requestPermission } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  // Show the banner after a short delay only if the user hasn't been asked yet
  // and hasn't dismissed it this session.
  useEffect(() => {
    if (
      permission !== "default" ||
      typeof window === "undefined" ||
      sessionStorage.getItem(DISMISSED_KEY)
    ) {
      return;
    }

    // Delay so the dashboard has time to render first
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, [permission]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const handleEnable = async () => {
    await requestPermission();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="fixed bottom-6 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2"
        >
          <div className="relative flex items-start gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card/95 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
            {/* Top glow line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            {/* Icon */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Enable Push Notifications</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                Get instant alerts for new session requests, accepted bookings, and fund releases — even when the app is closed.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg px-3 text-xs font-bold"
                  onClick={handleEnable}
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Bell className="h-3.5 w-3.5" />
                  )}
                  Enable
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-lg px-3 text-xs text-muted-foreground"
                  onClick={dismiss}
                >
                  <BellOff className="h-3.5 w-3.5" />
                  Not now
                </Button>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={dismiss}
              className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
