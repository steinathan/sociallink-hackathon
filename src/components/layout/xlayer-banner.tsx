"use client";

import { useState } from "react";
import { X } from "lucide-react";

/**
 * Sticky top banner — announces the BuildX AI Season hackathon launch.
 * Editorial restraint: cream background, hairline border, Fraunces italic
 * for the X Layer name. No neon/crypto-typical gradients — this banner
 * should read as a colophon, not a billboard. Dismissible per-session.
 */
export function XLayerBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] isolate border-b border-foreground/[0.08] bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-2 text-[11px] sm:text-[12px]">
        <div className="flex flex-1 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          <span className="font-medium uppercase tracking-[0.22em]">
            Launching AI bookings on
          </span>
          <a
            href="https://web3.okx.com/xlayer/build-x-series"
            target="_blank"
            rel="noopener noreferrer"
            className="font-serif text-[14px] font-light italic tracking-normal text-foreground underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-accent"
          >
            X Layer
          </a>
          <span className="hidden text-muted-foreground/50 md:inline">·</span>
          <span className="hidden font-medium uppercase tracking-[0.22em] md:inline">
            0 gas via OKX Wallet
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
