"use client";

import { use, useEffect, useState } from "react";
import { useBookingListener } from "@/hooks/use-booking-listener";
import { useSessionProfiles } from "@/hooks/use-session-profiles";
import { useAuthStore } from "@/store/auth-store";
import { useAuth } from "@/hooks/use-auth";
import {
  acceptBooking,
  cancelBooking,
  markBookingComplete,
  releaseFunds,
} from "@/actions/booking.actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DisputeDialog } from "@/components/booking/dispute-dialog";
import { ReviewModal } from "@/components/booking/review-modal";
import { ChatWindow } from "@/components/messaging/chat-window";
import { SessionParticipantCard } from "@/components/booking/session-participant-card";
import { SessionLiveMap } from "@/components/booking/session-live-map";
import { MapProvider } from "@/components/maps/map-provider";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Banknote,
  MessageSquare,
  Lock,
  Clock,
  ArrowLeft,
  Receipt,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { GeoLocation } from "@/lib/location";

const STATUS_META: Record<
  string,
  { label: string; pillClass: string; dot: string }
> = {
  REQUESTED: {
    label: "Awaiting response",
    pillClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  ACCEPTED: {
    label: "Accepted",
    pillClass: "bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  ACTIVE: {
    label: "Live",
    pillClass: "bg-primary/15 text-primary",
    dot: "bg-primary",
  },
  COMPLETED: {
    label: "Pending release",
    pillClass: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  SETTLED: {
    label: "Settled",
    pillClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    pillClass: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  DISPUTED: {
    label: "Disputed",
    pillClass: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
  REFUNDED: {
    label: "Refunded",
    pillClass: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const { firebaseUser, userDoc } = useAuthStore();
  useAuth();

  const { booking, loading, error } = useBookingListener(bookingId);
  const { memberProfile, consultantProfile, loading: profilesLoading } =
    useSessionProfiles(
      booking?.memberId ?? null,
      booking?.consultantId ?? null
    );

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewDismissed, setReviewDismissed] = useState(false);

  const isConsultant = userDoc?.role === "CONSULTANT";
  const isMember = userDoc?.role === "MEMBER";
  const viewerUid = firebaseUser?.uid ?? "";

  const isActiveSession = ["ACCEPTED", "ACTIVE", "COMPLETED"].includes(
    booking?.status ?? ""
  );

  useEffect(() => {
    if (booking?.status === "SETTLED" && !reviewDismissed) {
      const t = setTimeout(() => setShowReview(true), 1200);
      return () => clearTimeout(t);
    }
  }, [booking?.status, reviewDismissed]);

  async function runAction(
    action: string,
    fn: () => Promise<{ success: boolean; error?: string }>
  ) {
    setActionLoading(action);
    try {
      const result = await fn();
      if (!result.success) {
        toast.error(result.error ?? "Action failed.");
      } else {
        toast.success(`${action} successful.`);
      }
    } catch {
      toast.error("Unexpected error.");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <Alert className="border-destructive/25 bg-destructive/[0.06] text-destructive">
        <AlertDescription>{error ?? "Booking not found."}</AlertDescription>
      </Alert>
    );
  }

  const meta = STATUS_META[booking.status] ?? STATUS_META.CANCELLED;

  const memberLoc: GeoLocation | null = memberProfile?.location
    ? { lat: memberProfile.location.latitude, lng: memberProfile.location.longitude }
    : null;

  const consultantLoc: GeoLocation | null = consultantProfile?.location
    ? { lat: consultantProfile.location.latitude, lng: consultantProfile.location.longitude }
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-12 pb-10">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href="/bookings"
            className="mb-3 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
            All sessions
          </Link>
          <h1 className="font-serif text-3xl font-light leading-tight tracking-tight sm:text-4xl">
            Session detail.
          </h1>
          <div className="mt-2 font-mono text-[12px] tabular-nums text-muted-foreground">
            #{bookingId.slice(-10).toUpperCase()}
          </div>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em]",
            meta.pillClass
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
          {meta.label}
        </div>
      </header>

      {/* Participants */}
      <section>
        <div className="mb-5 flex items-end justify-between border-b border-foreground/[0.06] pb-3">
          <h2 className="font-serif text-xl font-medium tracking-tight">Participants</h2>
          <span className="font-mono text-[10px] tabular-nums uppercase tracking-[0.22em] text-muted-foreground">
            2
          </span>
        </div>
        {profilesLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-[24px] bg-muted/40" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {memberProfile && (
              <SessionParticipantCard
                profile={memberProfile}
                role="MEMBER"
                otherLocation={consultantLoc}
                viewerLabel={isConsultant ? "Member (booked you)" : "You (member)"}
              />
            )}
            {consultantProfile && (
              <SessionParticipantCard
                profile={consultantProfile}
                role="CONSULTANT"
                otherLocation={memberLoc}
                viewerLabel={isMember ? "Your Consultant" : "You (Consultant)"}
              />
            )}
          </div>
        )}
      </section>

      {/* Live map */}
      {isActiveSession && (memberLoc || consultantLoc) && (
        <section>
          <div className="mb-5 flex items-end justify-between border-b border-foreground/[0.06] pb-3">
            <h2 className="flex items-center gap-3 font-serif text-xl font-medium tracking-tight">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live location
            </h2>
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Realtime
            </span>
          </div>
          <div className="overflow-hidden rounded-[28px] border border-foreground/[0.08]">
            <MapProvider>
              <SessionLiveMap
                memberProfile={memberProfile}
                consultantProfile={consultantProfile}
                viewerUid={viewerUid}
              />
            </MapProvider>
          </div>
        </section>
      )}

      {/* Session summary */}
      <section>
        <div className="mb-5 flex items-end justify-between border-b border-foreground/[0.06] pb-3">
          <h2 className="flex items-center gap-3 font-serif text-xl font-medium tracking-tight">
            <Receipt className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            Summary
          </h2>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card">
          <div className="grid gap-px bg-foreground/[0.06] sm:grid-cols-2">
            <div className="bg-card p-7">
              <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Retainer
              </div>
              <div className="mt-3 font-serif text-4xl font-light leading-none tracking-tight tabular-nums">
                ₦{booking.amountLocked?.toLocaleString()}
              </div>
              <div className="mt-3 text-[12.5px] text-muted-foreground">
                Held in escrow until session completes.
              </div>
            </div>
            <div className="bg-card p-7">
              <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Timeline
              </div>
              <div className="mt-3 space-y-1.5 font-mono text-[12.5px] tabular-nums">
                <div>Created {booking.createdAt ? formatDistanceToNow(booking.createdAt.toDate(), { addSuffix: true }) : "—"}</div>
                {booking.acceptedAt && (
                  <div>Accepted {formatDistanceToNow(booking.acceptedAt.toDate(), { addSuffix: true })}</div>
                )}
                {booking.completedAt && (
                  <div>Completed {formatDistanceToNow(booking.completedAt.toDate(), { addSuffix: true })}</div>
                )}
                {booking.settledAt && (
                  <div>Settled {formatDistanceToNow(booking.settledAt.toDate(), { addSuffix: true })}</div>
                )}
              </div>
            </div>
          </div>

          {booking.selectedServices && booking.selectedServices.length > 0 && (
            <div className="border-t border-foreground/[0.06] p-7">
              <div className="mb-4 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Booked services
              </div>
              <div className="space-y-3">
                {booking.selectedServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between font-[14px]"
                  >
                    <span className="text-muted-foreground">{service.title}</span>
                    <span className="font-mono tabular-nums">
                      ₦{service.price.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="border-t border-foreground/[0.06] pt-3 flex items-center justify-between font-serif text-[15px] font-medium tracking-tight">
                  <span>Total</span>
                  <span className="tabular-nums">
                    ₦{booking.amountLocked?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {booking.receipt && (
            <div className="border-t border-foreground/[0.06] p-7">
              <div className="mb-4 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Payment receipt
              </div>
              <div className="space-y-2 font-[13.5px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total charged</span>
                  <span className="font-mono tabular-nums">₦{booking.receipt.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform fee (15%)</span>
                  <span className="font-mono tabular-nums">−₦{booking.receipt.platformFee.toLocaleString()}</span>
                </div>
                <div className="border-t border-foreground/[0.06] pt-3 flex justify-between font-serif text-[15px] font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
                  <span>Consultant payout (85%)</span>
                  <span className="font-mono tabular-nums">₦{booking.receipt.consultantPayout.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {["REQUESTED", "ACCEPTED", "ACTIVE", "COMPLETED"].includes(booking.status) && (
            <div className="flex items-start gap-3 border-t border-foreground/[0.06] bg-amber-500/[0.06] p-5">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" strokeWidth={1.5} />
              <div className="text-[12.5px] leading-[1.55]">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Escrow protected
                </p>
                <p className="mt-1 text-amber-700/80 dark:text-amber-500/80">
                  ₦{booking.amountLocked?.toLocaleString()} is locked. It moves only after both parties confirm completion — or it returns automatically if the session is cancelled.
                </p>
              </div>
            </div>
          )}

          {booking.status === "SETTLED" && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/[0.06] bg-emerald-500/[0.06] p-5">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-emerald-700 dark:text-emerald-400" strokeWidth={1.5} />
                <p className="font-[13.5px] font-semibold text-emerald-700 dark:text-emerald-400">
                  Session settled — funds released.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReview(true)}
                className="btn-ghost-warm h-10 rounded-full px-4 text-[12.5px] font-medium text-foreground"
              >
                Leave review
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Actions */}
      <section>
        <div className="mb-5 flex items-end justify-between border-b border-foreground/[0.06] pb-3">
          <h2 className="font-serif text-xl font-medium tracking-tight">Actions</h2>
        </div>
        <div className="space-y-3">
          {isConsultant && booking.status === "REQUESTED" && (
            <button
              type="button"
              onClick={() =>
                runAction("Accept", async () => {
                  const idToken = await firebaseUser!.getIdToken();
                  return acceptBooking(idToken, bookingId);
                })
              }
              disabled={!!actionLoading}
              className="btn-coral flex h-13 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold tracking-tight"
            >
              {actionLoading === "Accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" strokeWidth={1.5} />}
              Accept session request
            </button>
          )}

          {isConsultant && ["ACCEPTED", "ACTIVE"].includes(booking.status) && (
            <button
              type="button"
              onClick={() =>
                runAction("Complete", async () => {
                  const idToken = await firebaseUser!.getIdToken();
                  return markBookingComplete(idToken, bookingId);
                })
              }
              disabled={!!actionLoading}
              className="btn-ghost-warm flex h-13 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold tracking-tight text-foreground"
            >
              {actionLoading === "Complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" strokeWidth={1.5} />}
              Mark session as completed
            </button>
          )}

          {isMember && booking.status === "COMPLETED" && (
            <button
              type="button"
              onClick={() =>
                runAction("Release", async () => {
                  const idToken = await firebaseUser!.getIdToken();
                  return releaseFunds(idToken, bookingId);
                })
              }
              disabled={!!actionLoading}
              className="btn-coral flex h-13 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold tracking-tight shadow-[0_18px_45px_-22px_oklch(0.66_0.13_30/0.5)]"
            >
              {actionLoading === "Release" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" strokeWidth={1.5} />}
              Release funds to Consultant
            </button>
          )}

          {isMember && booking.status === "REQUESTED" && (
            <div className="flex items-start gap-3 rounded-2xl border border-foreground/[0.06] bg-card p-5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-muted-foreground" strokeWidth={1.5} />
              <p className="text-[13px] leading-[1.55] text-muted-foreground">
                Waiting for the Consultant to accept. You&apos;ll be notified the moment they respond.
              </p>
            </div>
          )}

          {booking.chatId && isActiveSession && (
            <button
              type="button"
              onClick={() => setShowChat((v) => !v)}
              className="btn-ghost-warm flex h-13 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold tracking-tight text-foreground"
            >
              <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
              {showChat ? "Hide chat" : "Open secure chat"}
            </button>
          )}

          {["REQUESTED", "ACCEPTED"].includes(booking.status) && (
            <button
              type="button"
              onClick={() =>
                runAction("Cancel", async () => {
                  const idToken = await firebaseUser!.getIdToken();
                  return cancelBooking(idToken, bookingId);
                })
              }
              disabled={!!actionLoading}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/[0.06] text-[14px] font-semibold tracking-tight text-destructive transition-colors hover:bg-destructive/[0.1]"
            >
              {actionLoading === "Cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" strokeWidth={1.5} />}
              Cancel &amp; refund
            </button>
          )}

          {isActiveSession && booking.status !== "DISPUTED" && (
            <button
              type="button"
              onClick={() => setShowDispute(true)}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-destructive px-7 text-[14px] font-semibold tracking-tight text-destructive-foreground transition-opacity hover:opacity-90"
            >
              <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
              Report / dispute session
            </button>
          )}

          {booking.status === "DISPUTED" && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/[0.06] p-5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={1.5} />
              <div className="text-[13px] leading-[1.55]">
                <p className="font-semibold text-destructive">Dispute active</p>
                <p className="mt-1 text-destructive/80">
                  Funds are frozen. Our team will review and contact you within 24 hours.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Inline chat */}
      {showChat && booking.chatId && (
        <section>
          <ChatWindow
            chatId={booking.chatId}
            memberId={booking.memberId}
            consultantId={booking.consultantId}
            isActive={!["SETTLED", "CANCELLED", "DISPUTED"].includes(booking.status)}
          />
        </section>
      )}

      <DisputeDialog
        open={showDispute}
        onOpenChange={setShowDispute}
        bookingId={bookingId}
      />
      <ReviewModal
        open={showReview}
        onOpenChange={(open) => {
          setShowReview(open);
          if (!open) setReviewDismissed(true);
        }}
        bookingId={bookingId}
        revieweeName={isConsultant ? "the Member" : "the Consultant"}
      />
    </div>
  );
}
