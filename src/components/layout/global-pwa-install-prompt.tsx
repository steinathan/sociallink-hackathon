"use client";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function GlobalPwaInstallPrompt() {
  const { install, isInstalled, isInstallable, isIos } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  // Auto-dismiss the prompt after some time or keep it until dismissed?
  // Let's keep it until they dismiss it or install it.

  // Delay the prompt slightly so it's not jarring immediately on load
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isInstallable && !isInstalled && !dismissed) {
      const timer = setTimeout(() => setShow(true), 3500);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isInstallable, isInstalled, dismissed]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-border/60 bg-card p-4 shadow-2xl md:bottom-8"
        >
          <button 
            onClick={() => setDismissed(true)}
            className="absolute right-3 top-3 rounded-full bg-muted/50 p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-start gap-4 pr-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <img src="/icons/favicon.svg" alt="App Icon" className="h-8 w-8 filter dark:invert" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold">Install SocialLink</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Add to your home screen for faster access, offline support, and native notifications.
              </p>
              <Button 
                size="sm" 
                className="mt-3 w-full rounded-full" 
                onClick={() => {
                  if (isIos) {
                    setShowIosInstructions(true);
                  } else {
                    install();
                    setDismissed(true);
                  }
                }}
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                Add to Home Screen
              </Button>
              
              {/* Special iOS Safari Instructions */}
              {showIosInstructions && isIos && (
                <div className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-2">
                  <p className="flex items-center gap-2 mb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background font-bold">1</span>
                    Tap the Share button <Share className="h-4 w-4" /> below
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background font-bold">2</span>
                    Scroll down and select &quot;Add to Home Screen&quot;
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
