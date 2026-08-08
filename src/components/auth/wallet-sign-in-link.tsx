"use client";

import Link from "next/link";
import { Wallet2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Sign-in with OKX Wallet link. Extracted into a client component because
 * `buttonVariants` lives in a "use client" module and can't be invoked from
 * a server component. Renders as a styled Link to /login/wallet.
 */
export function WalletSignInLink() {
  return (
    <Link
      href="/login/wallet"
      className={cn(
        buttonVariants({ variant: "outline" }),
        "group h-13 w-full justify-center gap-3 rounded-2xl border-border/70 bg-card py-3.5 text-[14.5px] font-medium tracking-tight shadow-[0_1px_0_oklch(0.55_0.02_60/0.04)] transition-all hover:border-primary/30 hover:bg-card hover:shadow-[0_4px_18px_-8px_oklch(0.55_0.13_30/0.20)]"
      )}
    >
      <Wallet2
        className="h-[18px] w-[18px] text-primary"
        strokeWidth={1.75}
      />
      <span>Continue with OKX Wallet</span>
    </Link>
  );
}
