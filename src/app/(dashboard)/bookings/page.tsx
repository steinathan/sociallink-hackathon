"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { getScopedCollectionRef } from "@/lib/firebase";
import {
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { Booking, BookingStatus } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck, ArrowUpRight, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function statusStyle(status: BookingStatus): { label: string; className: string } {
  const map: Record<BookingStatus, { label: string; className: string }> = {
    REQUESTED: { label: "Awaiting", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
    ACCEPTED: { label: "Accepted", className: "bg-primary/10 text-primary" },
    ACTIVE: { label: "Live", className: "bg-primary/15 text-primary" },
    COMPLETED: { label: "Pending release", className: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
    SETTLED: { label: "Settled", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
    CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
    DISPUTED: { label: "Disputed", className: "bg-destructive/10 text-destructive" },
    REFUNDED: { label: "Refunded", className: "bg-muted text-muted-foreground" },
  };
  return map[status];
}

function BookingRow({ booking }: { booking: Booking }) {
  const serviceSummary = booking.selectedServices
    ? booking.selectedServices.map((s) => s.title).join(", ")
    : `Booking #${booking.bookingId.slice(-6).toUpperCase()}`;
  const status = statusStyle(booking.status);

  return (
    <Link
      href={`/bookings/${booking.bookingId}`}
      className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-[24px] border border-foreground/[0.08] bg-card p-5 transition-all hover:border-primary/30 hover:shadow-[0_18px_45px_-25px_rgba(0,0,0,0.2)] sm:p-6"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <CalendarCheck className="h-5 w-5 text-primary" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[16px] font-medium tracking-tight">
            {serviceSummary}
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-[12px] text-muted-foreground">
            <Clock className="h-3 w-3" strokeWidth={1.5} />
            {booking.createdAt
              ? formatDistanceToNow(booking.createdAt.toDate(), { addSuffix: true })
              : ""}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-5">
        <div className="text-right">
          <div className="font-serif text-xl font-medium tabular-nums tracking-tight">
            ₦{booking.amountLocked?.toLocaleString()}
          </div>
          <span
            className={cn(
              "mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
              status.className
            )}
          >
            {status.label}
          </span>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}

function BookingListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-[24px]" />
      ))}
    </div>
  );
}

export default function BookingsPage() {
  const { firebaseUser, userDoc } = useAuthStore();
  useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const field = userDoc?.role === "CONSULTANT" ? "consultantId" : "memberId";
    const q = query(
      getScopedCollectionRef(db, "bookings"),
      where(field, "==", firebaseUser.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setBookings(
        snap.docs.map((d) => ({ bookingId: d.id, ...d.data() } as Booking))
      );
      setLoading(false);
    });
    return () => unsub();
  }, [firebaseUser?.uid, userDoc?.role]);

  const active = bookings.filter((b) =>
    ["REQUESTED", "ACCEPTED", "ACTIVE", "COMPLETED"].includes(b.status)
  );
  const past = bookings.filter((b) =>
    ["SETTLED", "CANCELLED", "DISPUTED", "REFUNDED"].includes(b.status)
  );

  return (
    <div className="space-y-10">
      <header>
        <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Bookings
        </div>
        <h1 className="font-serif text-3xl font-light leading-tight tracking-tight sm:text-4xl">
          {userDoc?.role === "CONSULTANT" ? "Session requests" : "Your sessions"}.
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
          {userDoc?.role === "CONSULTANT"
            ? "Review incoming requests, manage your active sessions, and respond to settlement actions."
            : "Track active sessions and review your booking history."}
        </p>
      </header>

      <Tabs defaultValue="active">
        <TabsList className="inline-flex h-11 rounded-full bg-muted p-1">
          <TabsTrigger
            value="active"
            className="h-9 rounded-full px-5 text-[13px] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Active
            {active.length > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 font-mono text-[10px] font-semibold tabular-nums text-primary-foreground">
                {active.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="past"
            className="h-9 rounded-full px-5 text-[13px] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-8 space-y-3">
          {loading ? (
            <BookingListSkeleton />
          ) : active.length === 0 ? (
            <div className="overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card py-20 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <CalendarCheck className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-lg font-medium tracking-tight">
                No active sessions yet.
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
                When you book or accept a session, it&rsquo;ll appear here.
              </p>
              {userDoc?.role === "MEMBER" && (
                <Link
                  href="/explore"
                  className="btn-coral mt-7 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[13px] font-semibold tracking-tight"
                >
                  Find a Consultant
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          ) : (
            active.map((b) => <BookingRow key={b.bookingId} booking={b} />)
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-8 space-y-3">
          {loading ? (
            <BookingListSkeleton />
          ) : past.length === 0 ? (
            <div className="overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card py-20 text-center">
              <h3 className="font-serif text-lg font-medium tracking-tight">
                No history yet.
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
                Settled and cancelled sessions will appear here.
              </p>
            </div>
          ) : (
            past.map((b) => <BookingRow key={b.bookingId} booking={b} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
