"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Wallet, ChevronDown } from "lucide-react";

/**
 * RainbowKit ConnectButton wrapped with OKX Wallet narrative styling.
 * OKX Wallet is the primary connector (X Layer ships 0-gas stablecoin transfers
 * when paying through it). Variant controls the visual weight — `primary` for
 * first-visit landing, `outline` for in-app chrome.
 */
export function ConnectWalletButton({
  variant = "primary",
}: {
  variant?: "primary" | "outline";
}) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!connected) {
          return (
            <Button
              onClick={openConnectModal}
              type="button"
              variant={variant === "primary" ? "default" : "outline"}
              size="lg"
            >
              <Wallet className="h-4 w-4" />
              Connect OKX Wallet
            </Button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Button
              onClick={openChainModal}
              type="button"
              variant="outline"
              size="sm"
              className="font-mono"
            >
              {chain.hasIcon && chain.iconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={chain.name ?? "chain"}
                  src={chain.iconUrl}
                  className="h-3.5 w-3.5 rounded-full"
                />
              )}
              {chain.name}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
            <Button
              onClick={openAccountModal}
              type="button"
              variant="outline"
              size="sm"
            >
              {account.displayName}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
