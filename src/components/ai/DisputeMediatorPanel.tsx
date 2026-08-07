"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bot,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  CheckCircle2,
  Copy,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  analyzeDispute,
  signResolution,
  type DisputeContext,
  type SignedResolution,
} from "@/ai/actions/disputeMediator";
import type { DisputeAnalysis } from "@/ai/schemas";

interface DisputeMediatorPanelProps {
  bookingId: string;
  /** Optional callback fired with the signed payload so parent UI can show it. */
  onSigned?: (s: SignedResolution) => void;
}

export function DisputeMediatorPanel({ bookingId, onSigned }: DisputeMediatorPanelProps) {
  const [analysis, setAnalysis] = useState<DisputeAnalysis | null>(null);
  const [context, setContext] = useState<DisputeContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberBps, setMemberBps] = useState<number>(5000);
  const [consultantBps, setConsultantBps] = useState<number>(5000);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState<SignedResolution | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { analysis, context } = await analyzeDispute(bookingId);
      setAnalysis(analysis);
      setContext(context);
      setMemberBps(analysis.recommendedSplit.memberBps);
      setConsultantBps(analysis.recommendedSplit.consultantBps);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze dispute");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // Keep the split in sync — both must sum to 10000
  const onSlider = (member: number) => {
    const m = Math.max(0, Math.min(10000, member));
    setMemberBps(m);
    setConsultantBps(10000 - m);
  };

  const onAcceptAndSign = async () => {
    if (memberBps + consultantBps !== 10000) {
      toast.error("Split must sum to 10000 bps (100%).");
      return;
    }
    setSigning(true);
    try {
      const s = await signResolution(bookingId, memberBps, consultantBps);
      setSigned(s);
      onSigned?.(s);
      toast.success("Signed payload ready for broadcast");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign failed");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-[13px] text-muted-foreground">
          Reading chat history + report evidence…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!analysis || !context) return null;

  const confidenceTone =
    analysis.confidence >= 0.75 ? "default" : analysis.confidence >= 0.5 ? "secondary" : "outline";
  const confidenceLabel =
    analysis.confidence >= 0.75 ? "High confidence" : analysis.confidence >= 0.5 ? "Medium" : "Low";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <p className="text-sm font-medium">AI recommendation</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={confidenceTone} className="text-[10px]">
            {confidenceLabel} · {(analysis.confidence * 100).toFixed(0)}%
          </Badge>
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[10px] text-primary">
            Powered by X Layer
          </Badge>
        </div>
      </div>

      <Card className="gap-3 p-4 text-[13px] leading-relaxed">
        <p className="font-medium">Summary</p>
        <p className="text-muted-foreground">{analysis.summary}</p>
      </Card>

      <Card className="gap-3 p-4">
        <div className="flex items-center justify-between text-[13px] font-medium">
          <span>Refund split</span>
          <span className="font-mono tabular-nums text-muted-foreground">
            {memberBps / 100}% / {consultantBps / 100}%
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[12px]">
            <span className="text-muted-foreground">Member</span>
            <span className="font-mono tabular-nums">{memberBps} bps</span>
          </div>
          <Slider
            value={[memberBps]}
            min={0}
            max={10000}
            step={50}
            onValueChange={(v) => {
              const arr = Array.isArray(v) ? v : [v];
              onSlider(arr[0] ?? memberBps);
            }}
            className="py-2"
          />
          <div className="flex justify-between text-[12px]">
            <span className="text-muted-foreground">Consultant</span>
            <span className="font-mono tabular-nums">{consultantBps} bps</span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Recommendation from analysis: {analysis.recommendedSplit.memberBps} / {analysis.recommendedSplit.consultantBps} bps
        </p>
      </Card>

      <Accordion className="rounded-xl border border-border/60 bg-card">
        <AccordionItem value="reasoning">
          <AccordionTrigger className="px-4 text-[13px] font-medium">Reasoning &amp; policy</AccordionTrigger>
          <AccordionContent className="px-4 pb-3 text-[13px] leading-relaxed text-muted-foreground">
            {analysis.reasoning}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="context">
          <AccordionTrigger className="px-4 text-[13px] font-medium">Case context</AccordionTrigger>
          <AccordionContent className="px-4 pb-3 text-[13px] leading-relaxed text-muted-foreground">
            <ul className="list-disc space-y-1 pl-4">
              <li>{context.chatExcerpts.length} chat messages analyzed</li>
              <li>Consultant rating: {context.consultantHistory.averageRating.toFixed(1)}★ ({context.consultantHistory.totalReviews} reviews)</li>
              <li>Consultant dispute history: {context.consultantHistory.disputedBookings} of {context.consultantHistory.totalBookings} bookings</li>
              <li>Member dispute history: {context.memberHistory.disputedBookings} of {context.memberHistory.totalBookings} bookings</li>
              <li>Report reason: {context.reportSummary.reason}</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button variant="outline" className="flex-1" onClick={load} disabled={loading || signing}>
          <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
        </Button>
        <Button className="flex-1" onClick={onAcceptAndSign} disabled={signing}>
          {signing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing on X Layer…
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" /> Accept &amp; Sign
            </>
          )}
        </Button>
      </div>

      {signed && <SignedPayloadModal signed={signed} onClose={() => setSigned(null)} />}
    </div>
  );
}

function SignedPayloadModal({ signed, onClose }: { signed: SignedResolution; onClose: () => void }) {
  const payload = JSON.stringify(
    {
      domain: signed.domain,
      types: signed.types,
      primaryType: signed.primaryType,
      message: signed.message,
      signature: signed.signature,
    },
    null,
    2
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Signed payload ready for broadcast
          </DialogTitle>
          <DialogDescription>
            EIP-712 typed data bound to chainId 195 (X Layer testnet). Paste into the broadcast step to
            call <span className="font-mono">Escrow.resolveDispute</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[12px]">
            <div className="flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span>
                Winner: <span className="font-medium">{signed.winner}</span> · splitBps: <span className="font-mono">{signed.message.splitBps}</span>
              </span>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[10px] text-primary">
              X Layer · chainId 195
            </Badge>
          </div>

          <pre className={cn(
            "max-h-72 overflow-auto rounded-lg border border-border/60 bg-muted/40 p-3",
            "font-mono text-[11px] leading-relaxed"
          )}>
            {payload}
          </pre>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                navigator.clipboard.writeText(payload);
                toast.success("Copied signed payload");
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button className="flex-1" onClick={onClose}>
              <Bot className="mr-2 h-4 w-4" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
