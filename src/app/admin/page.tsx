"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { getPlatformStats } from "@/actions/admin.actions";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Briefcase,
  AlertTriangle,
  Wallet,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  totalConsultants: number;
  totalMembers: number;
  openDisputes: number;
  totalCommission: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const idToken = await user.getIdToken();
        const result = await getPlatformStats(idToken);
        if (result.success && result.stats) {
          setStats(result.stats);
        } else {
          setError(result.error ?? "Failed to load stats.");
        }
      } catch {
        setError("Failed to load stats.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = stats
    ? [
        {
          title: "Total users",
          value: stats.totalUsers.toLocaleString(),
          icon: Users,
          href: "/admin/users",
        },
        {
          title: "Consultants",
          value: stats.totalConsultants.toLocaleString(),
          icon: Briefcase,
          href: "/admin/users",
        },
        {
          title: "Members",
          value: stats.totalMembers.toLocaleString(),
          icon: TrendingUp,
          href: "/admin/users",
        },
        {
          title: "Open disputes",
          value: stats.openDisputes.toLocaleString(),
          icon: AlertTriangle,
          href: "/admin/disputes",
          urgent: stats.openDisputes > 0,
        },
        {
          title: "Total commission",
          value: `₦${stats.totalCommission.toLocaleString()}`,
          icon: Wallet,
          href: null,
        },
      ]
    : [];

  return (
    <div className="space-y-10">
      <header>
        <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Admin · Overview
        </div>
        <h1 className="font-serif text-3xl font-light leading-tight tracking-tight sm:text-4xl">
          Platform health.
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
          Membership, sessions, and dispute resolution — at a glance.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.06] p-4 text-[13px] text-destructive">
          {error}
        </div>
      )}

      <section className="grid gap-px overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-foreground/[0.06] sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-none" />
            ))
          : statCards.map((s) => {
              const Icon = s.icon;
              const inner = (
                <div
                  className={`group relative h-full bg-card p-7 transition-colors hover:bg-background ${
                    s.urgent ? "bg-destructive/[0.04]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      {s.title}
                    </div>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.urgent ? "bg-destructive/10" : "bg-primary/10"}`}>
                      <Icon
                        className={`h-4 w-4 ${s.urgent ? "text-destructive" : "text-primary"}`}
                        strokeWidth={1.5}
                      />
                    </div>
                  </div>
                  <div className="mt-6 font-serif text-4xl font-light leading-none tracking-tight">
                    {s.value}
                  </div>
                  {s.urgent && (
                    <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive">
                      Action required
                    </div>
                  )}
                  {s.href && (
                    <ArrowUpRight className="absolute right-5 top-5 h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                  )}
                </div>
              );
              return s.href ? (
                <Link key={s.title} href={s.href} className="block">
                  {inner}
                </Link>
              ) : (
                <div key={s.title}>{inner}</div>
              );
            })}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/disputes"
          className="group relative overflow-hidden rounded-[24px] border border-foreground/[0.08] bg-card p-6 transition-all hover:border-primary/30"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <div className="font-serif text-lg font-medium tracking-tight">
                Resolve disputes
              </div>
              <div className="mt-1 text-[12.5px] text-muted-foreground">
                Arbitrate open cases — refund or release frozen escrow.
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
          </div>
        </Link>
        <Link
          href="/admin/users"
          className="group relative overflow-hidden rounded-[24px] border border-foreground/[0.08] bg-card p-6 transition-all hover:border-primary/30"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <div className="font-serif text-lg font-medium tracking-tight">
                Manage members
              </div>
              <div className="mt-1 text-[12.5px] text-muted-foreground">
                Inspect user accounts, roles, and activity.
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
          </div>
        </Link>
      </section>
    </div>
  );
}
