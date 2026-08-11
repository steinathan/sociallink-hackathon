import { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Globe2, ShieldCheck, Zap } from "lucide-react";
import { PhoneAuthForm } from "@/components/auth/phone-auth-form";
import { EmailSignInForm } from "@/components/auth/email-sign-in-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LogoFull } from "@/components/layout/logo";
import { LoginPageClient } from "@/components/auth/login-page-client";
import { WalletSignInLink } from "@/components/auth/wallet-sign-in-link";

export const metadata: Metadata = {
  title: "Sign In | SocialLink",
  description:
    "Access your SocialLink workspace — verified identity, escrowed retainers, considered sessions.",
};

const trustPoints = [
  {
    value: "$2.4M+",
    label: "USDC settled on X Layer",
    icon: ShieldCheck,
  },
  {
    value: "12K+",
    label: "Verified Consultants",
    icon: BadgeCheck,
  },
  {
    value: "98K+",
    label: "Sessions completed",
    icon: Zap,
  },
];

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background font-sans selection:bg-primary/30">
      <LoginPageClient />

      <div className="absolute right-6 top-6 z-50">
        <ThemeToggle />
      </div>

      <main className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Left Branding Section — editorial dark column */}
        <section className="relative hidden w-full flex-col justify-between overflow-hidden bg-foreground px-10 py-16 text-background lg:flex lg:w-[48%] lg:px-16 lg:py-20">
          {/* Subtle warm wash */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.66_0.13_30/0.18),transparent_45%),radial-gradient(circle_at_85%_85%,oklch(0.78_0.075_85/0.12),transparent_55%)]" />
          {/* Top hairline */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="relative z-10 max-w-xl">
            <div data-auth-reveal className="mb-20">
              <LogoFull className="text-background [&_span]:text-background [&_.text-primary]:text-primary" />
            </div>

            <div data-auth-reveal className="space-y-7">
              <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                Member sign-in
              </div>
              <h1 className="font-serif text-5xl font-light leading-[1.05] tracking-[-0.025em] sm:text-6xl lg:text-[4.5rem]">
                Welcome back to
                <br />
                <span className="italic text-primary">SocialLink.</span>
              </h1>
              <p className="max-w-md text-[15px] leading-[1.65] text-background/65">
                Continue to your workspace. New here? Verification takes a
                moment, and your account is ready before you put the kettle on.
              </p>
            </div>

            <div data-auth-reveal className="mt-16 grid grid-cols-3 gap-6 border-y border-background/10 py-8">
              {trustPoints.map((item) => (
                <div key={item.label}>
                  <div className="font-serif text-2xl font-light tracking-tight sm:text-3xl">
                    {item.value}
                  </div>
                  <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-background/55">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            <div data-auth-reveal className="mt-12 flex items-start gap-4 rounded-3xl border border-background/10 bg-background/[0.03] p-5 backdrop-blur-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <div className="font-serif text-base font-medium tracking-tight">
                  Identity first
                </div>
                <p className="mt-1 text-[12.5px] leading-[1.6] text-background/60">
                  Phone OTP, server-side rate limiting, and a session cookie
                  that survives a refresh.
                </p>
              </div>
            </div>
          </div>

          <div data-auth-reveal className="relative z-10 mt-12 flex items-center justify-between border-t border-background/10 pt-6 text-[11px] uppercase tracking-[0.18em] text-background/45">
            <span>© SocialLink Technologies Ltd.</span>
            <span>Lagos · Abuja · Port Harcourt</span>
          </div>
        </section>

        {/* Right Form Section */}
        <section className="relative flex flex-1 items-center justify-center px-8 py-20 lg:px-16 lg:py-0">
          <div className="absolute inset-x-0 bottom-0 top-0 hidden w-px bg-border lg:block" />

          <div className="w-full max-w-[440px]" data-auth-reveal>
            <div className="mb-12 block lg:hidden">
              <LogoFull />
            </div>
            <div className="mb-10">
              <div className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <span>Onchain</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="font-serif text-[13px] font-light italic tracking-normal normal-case text-foreground">
                  AI Booking Agent
                </span>
                <span className="text-muted-foreground/50">·</span>
                <span>X Layer</span>
              </div>
              <h2 className="mt-7 font-serif text-4xl font-light leading-tight tracking-tight">
                Sign in to continue
              </h2>
              <p className="mt-4 text-[14px] leading-[1.65] text-muted-foreground">
                Connect your OKX Wallet for <span className="font-semibold text-foreground">onchain USDC escrow</span> and our <span className="font-semibold text-foreground">AI Booking Agent</span> — 0 gas, settled on X Layer. Or sign in with your phone or email below.
              </p>
            </div>

            <WalletSignInLink />

            <div className="relative my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                or with phone
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <PhoneAuthForm variant="light" compact />

            <div className="relative my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                or with email
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <EmailSignInForm />

            {/*
              ponytail: Google sign-in hidden per hackathon positioning.
              OKX Wallet is the primary Web3 path; phone is the fallback.
              Component preserved for when the campaign broadens beyond X Layer.
              <GoogleSignInButton />
            */}

            <div className="mt-10 space-y-3.5 border-t border-border pt-8">
              <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                </div>
                <span>End-to-end encrypted verification (SIWE EIP-4361 · chain 195)</span>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card">
                  <Globe2 className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                </div>
                <span>For Members &amp; Consultants across Nigeria</span>
              </div>
            </div>

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
  );
}
