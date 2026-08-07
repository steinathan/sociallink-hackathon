"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { resolveDispute } from "@/actions/admin.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Loader2,
  RefreshCw,
  Banknote,
  ShieldAlert,
  Bot,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DisputeMediatorPanel } from "@/components/ai/DisputeMediatorPanel";

const REASON_LABELS: Record<string, string> = {
  NO_SHOW: "No Show",
  SAFETY_CONCERN: "Safety Concern",
  FRAUD: "Fraud",
  OTHER: "Other",
};

export interface DisputeReport {
  id: string;
  reporterId: string;
  reportedId: string;
  bookingId: string;
  reason: string;
  detailedDescription: string;
  evidenceUrls: string[];
  status: string;
  createdAt: { toDate: () => Date } | null;
}

interface DisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: DisputeReport | null;
  onResolved?: () => void;
}

/**
 * Admin dispute resolution dialog. Adds a "Manual | AI Recommendation" tab on
 * top of the existing manual fields (refund member / release consultant +
 * admin notes). The AI tab is purely advisory; signing is local to that tab
 * and the broadcast step is wired separately (Tier 3).
 */
export function DisputeDialog({ open, onOpenChange, report, onResolved }: DisputeDialogProps) {
  const [tab, setTab] = useState<"manual" | "ai">("manual");
  const [adminNotes, setAdminNotes] = useState("");
  const [resolving, setResolving] = useState<"REFUND_MEMBER" | "RELEASE_CONSULTANT" | null>(null);

  async function handleResolve(resolution: "REFUND_MEMBER" | "RELEASE_CONSULTANT") {
    if (!report) return;
    if (!adminNotes.trim()) {
      toast.error("Admin notes are required.");
      return;
    }
    setResolving(resolution);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const result = await resolveDispute(
        idToken,
        report.id,
        report.bookingId,
        resolution,
        adminNotes
      );
      if (!result.success) {
        toast.error(result.error ?? "Failed.");
        return;
      }
      toast.success(
        resolution === "REFUND_MEMBER" ? "Member refunded." : "Consultant paid out."
      );
      setAdminNotes("");
      onResolved?.();
      onOpenChange(false);
    } catch {
      toast.error("Unexpected error.");
    } finally {
      setResolving(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-[28px] border-foreground/[0.08] bg-card p-0">
        <DialogHeader className="border-b border-foreground/[0.06] p-6">
          <DialogTitle className="flex items-center gap-3 font-serif text-xl font-medium">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
              <ShieldAlert className="h-4 w-4 text-destructive" strokeWidth={1.5} />
            </div>
            Resolve dispute
          </DialogTitle>
          <DialogDescription>
            {report && (
              <>
                Booking #{report.bookingId.slice(-6).toUpperCase()} ·{" "}
                {REASON_LABELS[report.reason] ?? report.reason}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {report && (
          <div className="space-y-6 p-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "manual" | "ai")} className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="manual" className="flex-1">
                  <PenLine className="mr-1.5 h-3.5 w-3.5" /> Manual
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex-1">
                  <Bot className="mr-1.5 h-3.5 w-3.5" /> AI Recommendation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="mt-4 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-foreground/[0.06] bg-background p-4">
                    <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      Reporter
                    </div>
                    <div className="mt-2 truncate font-mono text-[12px] tabular-nums">
                      {report.reporterId}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-foreground/[0.06] bg-background p-4">
                    <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      Reported
                    </div>
                    <div className="mt-2 truncate font-mono text-[12px] tabular-nums">
                      {report.reportedId}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Description
                  </div>
                  <p className="mt-2 text-[14px] leading-[1.65]">{report.detailedDescription}</p>
                </div>

                {report.evidenceUrls && report.evidenceUrls.length > 0 && (
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      Evidence ({report.evidenceUrls.length})
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {report.evidenceUrls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-20 w-20 overflow-hidden rounded-xl border border-foreground/[0.08] transition-opacity hover:opacity-80"
                        >
                          <img src={url} alt={`Evidence ${i + 1}`} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Decision notes <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    placeholder="Explain the decision clearly. This is sent to both parties."
                    rows={4}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    disabled={!!resolving}
                    className="mt-2 rounded-2xl border-foreground/[0.08] bg-background px-5 py-4 text-[14px]"
                  />
                </div>

                <div className={cn(
                  "rounded-2xl border p-4 text-[12.5px] leading-[1.55]",
                  "border-primary/20 bg-primary/[0.04] text-muted-foreground"
                )}>
                  <strong className="text-foreground">Refund Member</strong> returns the frozen escrow to the Member&apos;s available balance.{" "}
                  <strong className="text-foreground">Release to Consultant</strong> pays the Consultant 85% and keeps the 15% platform fee.
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleResolve("REFUND_MEMBER")}
                    disabled={!!resolving}
                    className="btn-ghost-warm inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[13px] font-semibold tracking-tight text-foreground"
                  >
                    {resolving === "REFUND_MEMBER" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                    )}
                    Refund member
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve("RELEASE_CONSULTANT")}
                    disabled={!!resolving}
                    className="btn-coral inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[13px] font-semibold tracking-tight"
                  >
                    {resolving === "RELEASE_CONSULTANT" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Banknote className="h-4 w-4" strokeWidth={1.5} />
                    )}
                    Release to consultant
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="mt-4">
                <DisputeMediatorPanel bookingId={report.bookingId} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

