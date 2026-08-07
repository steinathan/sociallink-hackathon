"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { Loader2, Phone, TimerReset, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { sendPhoneOtp, verifyPhoneOtp } from "@/actions/auth.actions";
import { createSessionCookie } from "@/actions/user.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { auth, db, getScopedDocRef } from "@/lib/firebase";
import { getCurrentPosition } from "@/lib/location";
import { normalizeNigerianPhoneToE164 } from "@/lib/phone";
import { cn } from "@/lib/utils";

type Step = "phone" | "otp";

type PhoneAuthFormProps = {
  variant?: "dark" | "light";
  compact?: boolean;
};

export function PhoneAuthForm({ variant = "light", compact = false }: PhoneAuthFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [normalizedPhone, setNormalizedPhone] = useState<string | null>(null);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((count) => count - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const normalized = normalizeNigerianPhoneToE164(phone);
    if (!normalized) {
      setError("Enter a valid Nigerian phone number.");
      return;
    }

    setLoading(true);
    try {
      const result = await sendPhoneOtp(normalized);
      if (!result.success) {
        setError(result.error);
        if (result.cooldownSeconds) setResendCountdown(result.cooldownSeconds);
        return;
      }

      setNormalizedPhone(normalized);
      setStep("otp");
      setResendCountdown(result.cooldownSeconds ?? 60);
      toast.success(`Code sent to ${normalized}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send OTP.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const phoneForVerification = normalizedPhone ?? normalizeNigerianPhoneToE164(phone);
    if (!phoneForVerification) {
      setError("Phone number is invalid. Request a new code.");
      return;
    }

    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const verifyResult = await verifyPhoneOtp(phoneForVerification, otp);
      if (!verifyResult.success || !verifyResult.customToken) {
        setError(verifyResult.success ? "Verification failed." : verifyResult.error);
        return;
      }

      const credential = await signInWithCustomToken(auth, verifyResult.customToken);
      const idToken = await credential.user.getIdToken(true);
      await createSessionCookie(idToken);

      try {
        await getCurrentPosition();
      } catch (locErr) {
        console.warn("Location permission not granted during auth", locErr);
      }

      const userRef = getScopedDocRef(db, "users", credential.user.uid);
      const snap = await getDoc(userRef);

      router.push(snap.exists() ? "/dashboard" : "/onboarding");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid OTP. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("relative", compact ? "space-y-7" : "space-y-9")}>
      {/* Progress Indicator */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-all",
                step === "phone"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-primary/15 text-primary"
              )}
            >
              {step === "otp" ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : "1"}
            </div>
            <span
              className={cn(
                "text-[11px] font-medium uppercase tracking-[0.18em]",
                step === "phone" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Phone
            </span>
          </div>
          <div className="h-px flex-1 mx-4 bg-border" />
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "text-[11px] font-medium uppercase tracking-[0.18em]",
                step === "otp" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Verify
            </span>
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-all",
                step === "otp"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground"
              )}
            >
              2
            </div>
          </div>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: "50%" }}
            animate={{ width: step === "phone" ? "50%" : "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="h-full rounded-full bg-primary"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {error && (
            <Alert className="mb-6 border-destructive/25 bg-destructive/[0.06] text-destructive">
              <AlertDescription className="text-[12px] font-medium">{error}</AlertDescription>
            </Alert>
          )}

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2.5">
                <Label
                  htmlFor="phone"
                  className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                >
                  Nigerian phone number
                </Label>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                    <Phone
                      className="h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary"
                      strokeWidth={1.5}
                    />
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0801 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    autoFocus
                    className="h-14 rounded-2xl border-border bg-card pl-12 text-[15px] shadow-sm transition-all focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <p className="px-1 text-[11.5px] leading-[1.5] text-muted-foreground">
                  Local format. We&rsquo;ll send a six-digit code via SMS.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="btn-coral group h-14 w-full rounded-full text-[14px] font-semibold tracking-tight"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Send code
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2.5">
                <Label
                  htmlFor="otp"
                  className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                >
                  Verification code
                </Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="------"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  disabled={loading}
                  autoFocus
                  className="h-16 rounded-2xl border-border bg-card text-center font-mono text-3xl font-medium tracking-[0.5em] transition-all focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10"
                />
                <p className="px-1 text-[11.5px] leading-[1.5] text-muted-foreground">
                  Sent to{" "}
                  <span className="font-medium text-foreground">{normalizedPhone}</span>.
                  Code expires in 5 minutes.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="btn-coral h-14 w-full rounded-full text-[14px] font-semibold tracking-tight"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify & continue"
                )}
              </Button>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between text-[11.5px]">
                  <p className="flex items-center gap-2 font-medium text-muted-foreground">
                    <TimerReset className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {resendCountdown > 0
                      ? `New code in ${resendCountdown}s`
                      : "Didn't receive a code?"}
                  </p>
                  {resendCountdown <= 0 && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setStep("phone");
                        setOtp("");
                        setError("");
                      }}
                      className="font-semibold text-primary transition-opacity hover:opacity-80"
                    >
                      Resend
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
