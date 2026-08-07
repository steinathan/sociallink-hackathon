"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Profile, Service } from "@/types";
import { useAuthStore } from "@/store/auth-store";
import { auth } from "@/lib/firebase";
import { requestBooking } from "@/actions/booking.actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Wallet,
  Lock,
  Star,
  CheckCircle,
  AlertTriangle,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChatPanel } from "@/components/ai/ChatPanel";

interface BookingRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultantProfile: Profile;
}

export function BookingRequestDialog({
  open,
  onOpenChange,
  consultantProfile,
}: BookingRequestDialogProps) {
  const router = useRouter();
  const { userDoc, firebaseUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiOpen, setAiOpen] = useState(false);

  // Service selection
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const totalAmount = useMemo(() => {
    return (consultantProfile.services || [])
      .filter((s) => selectedServiceIds.includes(s.id))
      .reduce((sum, s) => sum + s.price, 0);
  }, [consultantProfile.services, selectedServiceIds]);

  const availableBalance = userDoc?.wallet?.availableBalance ?? 0;
  const hasSufficientBalance = availableBalance >= totalAmount;

  async function handleConfirmBooking() {
    if (selectedServiceIds.length === 0) {
      setError("Please select at least one service.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      const idToken = await user.getIdToken();
      const result = await requestBooking(idToken, consultantProfile.uid, selectedServiceIds);

      if (!result.success) {
        setError(result.error ?? "Booking failed.");
        return;
      }

      toast.success("Session requested! Waiting for consultant to accept.");
      onOpenChange(false);
      router.push(`/bookings/${result.bookingId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Request Session</DialogTitle>
          <DialogDescription>
            Select the services you want to book from {consultantProfile.displayName || "Consultant"}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {/* AI Suggestions — additive, does not replace the existing form */}
          <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[13px] font-medium leading-tight">Need help choosing?</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Describe what you want and the booking assistant will draft a request.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg border-primary/30 text-[12px]"
                onClick={() => setAiOpen(true)}
              >
                Get AI help
              </Button>
            </div>
          </div>

          {/* Consultant Summary */}
          <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={consultantProfile.avatarUrl ?? ""} 
                className={consultantProfile.blurAvatar ? "blur-md scale-110" : ""} 
              />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {consultantProfile.displayName?.charAt(0)?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">
                {consultantProfile.displayName || "Consultant"}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>
                  {consultantProfile.averageRating?.toFixed(1) ?? "0.0"} (
                  {consultantProfile.totalReviews ?? 0} reviews)
                </span>
              </div>
            </div>
          </div>

          {/* Services Selection */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Select Services</h4>
            <div className="space-y-2">
              {consultantProfile.services && consultantProfile.services.length > 0 ? (
                consultantProfile.services.map((service) => {
                  const isSelected = selectedServiceIds.includes(service.id);
                  return (
                    <div
                      key={service.id}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      )}
                      onClick={() => toggleService(service.id)}
                    >
                      <div className="mt-1">
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleService(service.id)} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{service.title}</p>
                          <p className="text-sm font-bold">₦{service.price.toLocaleString()}</p>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                  No specific services listed.
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Payment Breakdown */}
          <div className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selected Services</span>
                <span>{selectedServiceIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your Balance</span>
                <span
                  className={
                    availableBalance >= totalAmount
                      ? "font-medium text-green-500"
                      : "font-medium text-destructive"
                  }
                >
                  ₦{availableBalance.toLocaleString()}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total Retainer</span>
                <span>₦{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Escrow info */}
          <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 p-3 text-xs text-blue-600 dark:text-blue-400">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Funds are locked in secure escrow and only released to the
              consultant after you confirm session completion.
            </p>
          </div>

          {!hasSufficientBalance && totalAmount > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Insufficient balance. Please{" "}
                <button
                  className="font-semibold underline"
                  onClick={() => {
                    onOpenChange(false);
                    router.push("/wallet");
                  }}
                >
                  fund your wallet
                </button>{" "}
                first.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="pt-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirmBooking}
            disabled={loading || !hasSufficientBalance || selectedServiceIds.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm & Lock
              </>
            )}
          </Button>
        </div>
      </DialogContent>

      {/* AI assistant dialog — opened by the "Get AI help" card above */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-lg p-0">
          <ChatPanel userId={firebaseUser?.uid} />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
