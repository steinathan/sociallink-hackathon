"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiweMessage } from "siwe";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useDisconnect, useSignMessage } from "wagmi";
import { signInWithCustomToken } from "firebase/auth";
import { Check, Copy, Loader2, ShieldCheck, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { signInWithWallet } from "@/actions/auth-wallet.actions";
import { createSessionCookie } from "@/actions/user.actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const X_LAYER_TESTNET_CHAIN_ID = 195;

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectWalletInline() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/dashboard";

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();

  const [phase, setPhase] = useState<
    "idle" | "nonce" | "sign" | "exchange" | "redirect"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const wrongChain = useMemo(
    () => isConnected && chainId !== X_LAYER_TESTNET_CHAIN_ID,
    [isConnected, chainId]
  );

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  async function handleSignIn() {
    if (!address) return;
    setError(null);

    try {
      setPhase("nonce");
      const nonceRes = await fetch("/api/auth/wallet-nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!nonceRes.ok) {
        const data = await nonceRes.json().catch(() => ({}));
        throw new Error(data.error || "Could not start sign-in.");
      }
      const { nonce, issuedAt } = (await nonceRes.json()) as {
        nonce: string;
        issuedAt: string;
      };

      const siweMessage = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to SocialLink",
        uri: window.location.origin,
        version: "1",
        chainId: X_LAYER_TESTNET_CHAIN_ID,
        nonce,
        issuedAt,
      });
      const message = siweMessage.prepareMessage();

      setPhase("sign");
      const signature = await signMessageAsync({ message });

      setPhase("exchange");
      const result = await signInWithWallet({ address, message, signature });
      if (!result.success) {
        throw new Error(result.error);
      }

      const credential = await signInWithCustomToken(auth, result.customToken);
      const idToken = await credential.user.getIdToken(true);
      const cookieResult = await createSessionCookie(idToken);
      if (!cookieResult.success) {
        throw new Error(cookieResult.error ?? "Could not establish a session.");
      }

      setPhase("redirect");
      toast.success("Wallet linked. Welcome to SocialLink.");
      router.replace(result.isNewUser ? "/onboarding" : redirectTo);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Wallet sign-in failed.";
      setError(message);
      setPhase("idle");
    }
  }

  return (
    <div className="space-y-6">
      {/* Connect step */}
      <div
        className={cn(
          "rounded-2xl border border-border bg-card p-5 transition-colors",
          isConnected && !wrongChain && "border-primary/40"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" strokeWidth={1.75} />
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                01 · Wallet
              </span>
            </div>
            <h3 className="font-serif text-lg font-light tracking-tight">
              Connect your OKX Wallet
            </h3>
            <p className="text-[12.5px] leading-[1.55] text-muted-foreground">
              Make sure your wallet is on{" "}
              <span className="font-medium text-foreground">
                X Layer Testnet
              </span>{" "}
              (chain 195).
            </p>
          </div>
          <ConnectButton.Custom>
            {({ mounted, openConnectModal, openChainModal }: {
              mounted: boolean;
              openConnectModal: () => void;
              openChainModal: () => void;
            }) => {
              const ready = mounted;
              const connected = ready && isConnected;
              if (!connected) {
                return (
                  <Button
                    type="button"
                    onClick={openConnectModal}
                    variant="outline"
                    className="h-10 rounded-full px-5 text-[13px] font-medium"
                  >
                    Connect wallet
                  </Button>
                );
              }
              if (wrongChain) {
                return (
                  <Button
                    type="button"
                    onClick={openChainModal}
                    variant="destructive"
                    className="h-10 rounded-full px-5 text-[13px] font-medium"
                  >
                    Switch chain
                  </Button>
                );
              }
              return (
                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="group flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-1.5 text-[12.5px] font-medium transition-colors hover:border-primary/40"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="font-mono">{shortAddress(address!)}</span>
                  <X
                    className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-destructive"
                    strokeWidth={2}
                  />
                </button>
              );
            }}
          </ConnectButton.Custom>
        </div>

        {isConnected && address && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2 font-mono text-[11.5px] text-muted-foreground">
            <span className="truncate">{address}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(address);
                setCopied(true);
              }}
              className="ml-auto text-primary transition-opacity hover:opacity-80"
              aria-label="Copy address"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2} />
              ) : (
                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
            </button>
          </div>
        )}

        {wrongChain && (
          <p className="mt-3 text-[12px] font-medium text-destructive">
            Switch to X Layer Testnet (chain 195) to continue.
          </p>
        )}
      </div>

      {/* Sign step */}
      <div
        className={cn(
          "rounded-2xl border border-border bg-card p-5 transition-colors",
          isConnected && !wrongChain ? "border-border" : "opacity-60"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.75} />
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                02 · Signature
              </span>
            </div>
            <h3 className="font-serif text-lg font-light tracking-tight">
              Sign in to SocialLink
            </h3>
            <p className="text-[12.5px] leading-[1.55] text-muted-foreground">
              Sign the EIP-4361 message with your wallet. No gas, no
              transaction — just cryptographic proof of ownership.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSignIn}
          disabled={!isConnected || wrongChain || phase !== "idle"}
          className="btn-coral mt-5 h-12 w-full rounded-full text-[13.5px] font-semibold tracking-tight"
        >
          {phase === "idle" && (
            <span className="flex items-center gap-2">
              Sign in with OKX Wallet
            </span>
          )}
          {phase === "nonce" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing challenge…
            </>
          )}
          {phase === "sign" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isSigning ? "Check your wallet…" : "Signing…"}
            </>
          )}
          {phase === "exchange" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Establishing session…
            </>
          )}
          {phase === "redirect" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting…
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/25 bg-destructive/[0.06] px-4 py-3 text-[12.5px] font-medium text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}