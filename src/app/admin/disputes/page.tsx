"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { listOpenDisputes } from "@/actions/admin.actions";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { DisputeDialog, type DisputeReport } from "@/components/admin/dispute-dialog";

const REASON_LABELS: Record<string, string> = {
  NO_SHOW: "No Show",
  SAFETY_CONCERN: "Safety Concern",
  FRAUD: "Fraud",
  OTHER: "Other",
};

export default function AdminDisputesPage() {
  const [reports, setReports] = useState<DisputeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DisputeReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const result = await listOpenDisputes(idToken);
      if (result.success && result.reports) {
        setReports(result.reports as unknown as DisputeReport[]);
      }
    } catch {
      toast.error("Failed to load disputes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-destructive/25 bg-destructive/[0.06] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-destructive">
            <ShieldAlert className="h-3 w-3" strokeWidth={1.5} />
            Disputes queue
          </div>
          <h1 className="font-serif text-3xl font-light leading-tight tracking-tight sm:text-4xl">
            Open cases.
          </h1>
          <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
            Arbitrate open disputes — refund the Member or release funds to the Consultant. The AI
            tab drafts a recommendation and produces an EIP-712 signed payload bound to X Layer
            (chainId 195).
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="btn-ghost-warm inline-flex h-11 items-center gap-2 rounded-full px-5 text-[12.5px] font-medium text-foreground"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
          Refresh
        </button>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[24px]" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card py-20 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <AlertTriangle className="h-6 w-6 text-primary" strokeWidth={1.5} />
          </div>
          <h3 className="font-serif text-lg font-medium tracking-tight">
            No open disputes.
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
            The platform is healthy. New disputes will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              className="group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-[24px] border border-destructive/20 bg-card p-5 text-left transition-all hover:border-destructive/40 hover:shadow-[0_18px_45px_-25px_rgba(0,0,0,0.2)] sm:p-6"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-[15px] font-medium tracking-tight">
                      {REASON_LABELS[r.reason] ?? r.reason}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      #{r.bookingId.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[12.5px] text-muted-foreground">
                    {r.detailedDescription}
                  </p>
                  <p className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {r.createdAt
                      ? formatDistanceToNow(r.createdAt.toDate(), { addSuffix: true })
                      : ""}
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-destructive" />
            </button>
          ))}
        </div>
      )}

      <DisputeDialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        report={selected}
        onResolved={load}
      />
    </div>
  );
}
