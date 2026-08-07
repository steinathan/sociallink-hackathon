import { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Wallet2 } from "lucide-react";
import { LogoFull } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Web3Provider } from "@/lib/web3/web3-provider";
import { ConnectWalletInline } from "./_components/ConnectWalletInline";

export const metadata: Metadata = {
  title: "Sign in with Wallet | SocialLink",
  description:
    "Sign in to SocialLink with your OKX Wallet on X Layer — EIP-4361, no password, no gas.",
};

export default function WalletLoginPage() {
  return (
    <Web3Provider>
      <div className="relative min-h-screen w-full overflow-hidden bg-background font-sans selection:bg-primary/30">
        <div className="absolute right-6 top-6 z-50">
          <ThemeToggle />
        </div>

        <main className="relative z-10 flex min-h-screen flex-col lg:flex-row">
          {/* Left column — narrative */}
          <section className="relative hidden w-full flex-col justify-between overflow-hidden bg-foreground px-10 py-16 text-background lg:flex lg:w-[44%] lg:px-16 lg:py-20">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.66_0.13_30/0.18),transparent_45%),radial-gradient(circle_at_85%_85%,oklch(0.78_0.075_85/0.12),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <div className="relative z-10 max-w-xl">
              <LogoFull className="text-background [&_span]:text-background [&_.text-primary]:text-primary" />

              <div className="mt-20 space-y-7">
                <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                  Web3 sign-in
                </div>
                <h1 className="font-serif text-5xl font-light leading-[1.05] tracking-[-0.025em] sm:text-6xl">
                  Your wallet,
                  <br />
                  <span className="italic text-primary">your identity.</span>
                </h1>
                <p className="max-w-md text-[15px] leading-[1.65] text-background/65">
                  Sign in with OKX Wallet on X Layer — no password, no SMS. One
                  signature proves ownership of your address and creates your
                  SocialLink workspace.
                </p>
              </div>

              <div className="mt-16 grid grid-cols-3 gap-6 border-y border-background/10 py-8">
                <div>
                  <div className="font-serif text-2xl font-light tracking-tight sm:text-3xl">
                    0 gas
                  </div>
                  <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-background/55">
                    Per sign-in
                  </div>
                </div>
                <div>
                  <div className="font-serif text-2xl font-light tracking-tight sm:text-3xl">
                    EIP-4361
                  </div>
                  <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-background/55">
                    Standard
                  </div>
                </div>
                <div>
                  <div className="font-serif text-2xl font-light tracking-tight sm:text-3xl">
                    Chain 195
                  </div>
                  <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-background/55">
                    X Layer testnet
                  </div>
                </div>
              </div>

              <div className="mt-12 rounded-3xl border border-background/10 bg-background/[0.03] p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Wallet2 className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="font-serif text-base font-medium tracking-tight">
                      Built for the BuildX AI Season
                    </div>
                    <p className="mt-1 text-[12.5px] leading-[1.6] text-background/60">
                      Shipping on X Layer (@XLayerOfficial) — 0 gas USDT/USDC
                      transfers, Polygon CDK zkEVM.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-12 flex items-center justify-between border-t border-background/10 pt-6 text-[11px] uppercase tracking-[0.18em] text-background/45">
              <span>© SocialLink Technologies Ltd.</span>
              <span>Lagos · Abuja · Port Harcourt</span>
            </div>
          </section>

          {/* Right column — sign-in card */}
          <section className="relative flex flex-1 items-center justify-center px-8 py-20 lg:px-16 lg:py-0">
            <div className="absolute inset-x-0 bottom-0 top-0 hidden w-px bg-border lg:block" />

            <div className="w-full max-w-[460px]">
              <div className="mb-12 block lg:hidden">
                <LogoFull />
              </div>

              <Link
                href="/login"
                className="mb-8 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                Back to all sign-in options
              </Link>

              <div className="mb-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  EIP-4361 sign-in
                </div>
                <h2 className="mt-7 font-serif text-4xl font-light leading-tight tracking-tight">
                  Connect, sign, done.
                </h2>
                <p className="mt-4 text-[14px] leading-[1.65] text-muted-foreground">
                  Two steps. No SMS, no email. Your wallet address becomes your
                  SocialLink identity.
                </p>
              </div>

              <Suspense
                fallback={
                  <div className="rounded-2xl border border-border bg-card p-6 text-center text-[12.5px] text-muted-foreground">
                    Loading wallet bridge…
                  </div>
                }
              >
                <ConnectWalletInline />
              </Suspense>

              <p className="mt-10 text-center text-[11.5px] leading-[1.7] text-muted-foreground">
                By continuing, you agree to our{" "}
                <Link
                  href="/terms"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </section>
        </main>
      </div>
    </Web3Provider>
  );
}