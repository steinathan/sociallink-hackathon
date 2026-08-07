"use client";

import { useAuthStore } from "@/store/auth-store";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  CalendarCheck,
  Compass,
  ArrowUpRight,
  Clock,
  TrendingUp,
} from "lucide-react";

import { AiSupportChat } from "@/components/support/ai-support-chat";
import { useUserBookings } from "@/hooks/use-user-bookings";

export default function DashboardPage() {
  const { userDoc } = useAuthStore();
  const { pendingCount } = useUserBookings();
  useAuth();

  const availableBalance = userDoc?.wallet?.availableBalance ?? 0;
  const escrowBalance = userDoc?.wallet?.escrowBalance ?? 0;
  const isMember = userDoc?.role === "MEMBER";

  const formatNaira = (n: number) => `₦${n.toLocaleString()}`;

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {new Date().toLocaleDateString("en-NG", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
          <h1 className="font-serif text-3xl font-light leading-tight tracking-tight sm:text-4xl">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}.
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {userDoc?.role === "CONSULTANT"
              ? "Your sessions and earnings, at a glance."
              : "Your wallet, sessions, and discovery — all in one place."}
          </p>
        </div>
        <AiSupportChat />
      </header>

      {/* Premium wallet cards */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Primary balance — full editorial treatment */}
        <div className="lg:col-span-2 glow-coral tape-grain relative overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card p-8 lg:p-10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                {isMember ? "Available balance" : "Available earnings"}
              </div>
              <div className="mt-3 font-serif text-5xl font-light leading-none tracking-tight sm:text-6xl">
                {formatNaira(availableBalance)}
              </div>
              <div className="mt-3 text-[13px] text-muted-foreground">
                {isMember
                  ? "Ready to use for session retainers."
                  : "Ready to withdraw to your bank account."}
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-foreground/[0.06] bg-background">
              <Wallet className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-foreground/[0.06] pt-6">
            <Link
              href="/wallet"
              className="btn-coral inline-flex h-12 items-center gap-2 rounded-full px-6 text-[13px] font-semibold tracking-tight"
            >
              {isMember ? "Fund wallet" : "Withdraw"}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={isMember ? "/explore" : "/bookings"}
              className="btn-ghost-warm inline-flex h-12 items-center gap-2 rounded-full px-6 text-[13px] font-semibold tracking-tight text-foreground"
            >
              {isMember ? "Find a Consultant" : "View bookings"}
            </Link>
          </div>
        </div>

        {/* Escrow card */}
        <div className="relative overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                In escrow
              </div>
              <div className="mt-3 font-serif text-4xl font-light leading-none tracking-tight sm:text-5xl">
                {formatNaira(escrowBalance)}
              </div>
              <div className="mt-3 text-[12.5px] leading-[1.55] text-muted-foreground">
                Locked for {isMember ? "active sessions you've booked" : "sessions not yet settled"}.
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-foreground/[0.06] bg-background">
              <Clock className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions — editorial cards */}
      <section>
        <div className="mb-5 flex items-end justify-between border-b border-foreground/[0.06] pb-3">
          <h2 className="font-serif text-xl font-medium tracking-tight">
            {isMember ? "Where to next" : "Today"}
          </h2>
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Quick actions
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {isMember ? (
            <>
              <Link
                href="/explore"
                className="group relative overflow-hidden rounded-[24px] border border-foreground/[0.08] bg-card p-7 transition-all hover:border-primary/30 hover:shadow-[0_20px_50px_-25px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-start gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <Compass className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-lg font-medium tracking-tight">
                      Explore Consultants
                    </div>
                    <div className="mt-1 text-[13px] text-muted-foreground">
                      Verified Consultants across Lagos, Abuja, Port Harcourt.
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                </div>
              </Link>

              <Link
                href="/bookings"
                className="group relative overflow-hidden rounded-[24px] border border-foreground/[0.08] bg-card p-7 transition-all hover:border-primary/30 hover:shadow-[0_20px_50px_-25px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-start gap-5">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <CalendarCheck className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    {pendingCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive font-mono text-[9px] font-semibold tabular-nums text-destructive-foreground">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-serif text-lg font-medium tracking-tight">
                        My bookings
                      </div>
                      {pendingCount > 0 && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-primary">
                          {pendingCount} pending
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[13px] text-muted-foreground">
                      Active sessions and recent history.
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/bookings"
                className="group relative overflow-hidden rounded-[24px] border border-primary/20 bg-card p-7 transition-all hover:shadow-[0_20px_50px_-25px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-start gap-5">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <CalendarCheck className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    {pendingCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive font-mono text-[9px] font-semibold tabular-nums text-destructive-foreground">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-serif text-lg font-medium tracking-tight">
                        Session requests
                      </div>
                      {pendingCount > 0 && (
                        <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-primary-foreground">
                          {pendingCount} new
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[13px] text-muted-foreground">
                      Review and respond to incoming bookings.
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                </div>
              </Link>

              <Link
                href="/profile"
                className="group relative overflow-hidden rounded-[24px] border border-foreground/[0.08] bg-card p-7 transition-all hover:border-primary/30 hover:shadow-[0_20px_50px_-25px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-start gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-lg font-medium tracking-tight">
                      My profile
                    </div>
                    <div className="mt-1 text-[13px] text-muted-foreground">
                      Update themes, retainer, and availability.
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                </div>
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
