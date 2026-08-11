"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { createSessionCookie } from "@/actions/user.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { auth, db, getScopedDocRef } from "@/lib/firebase";

export function EmailSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await credential.user.getIdToken(true);
      await createSessionCookie(idToken);

      const userRef = getScopedDocRef(db, "users", credential.user.uid);
      const snap = await getDoc(userRef);
      router.push(snap.exists() ? "/dashboard" : "/onboarding");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setError(
        code === "auth/invalid-credential" || code === "auth/invalid-login-credentials"
          ? "Incorrect email or password."
          : code === "auth/user-disabled"
            ? "This account has been disabled."
            : err instanceof Error
              ? err.message
              : "Sign-in failed. Please try again."
      );
      toast.error("Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert className="border-destructive/25 bg-destructive/[0.06] text-destructive">
          <AlertDescription className="text-[12px] font-medium">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2.5">
        <Label
          htmlFor="email"
          className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
        >
          Email
        </Label>
        <div className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            <Mail
              className="h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary"
              strokeWidth={1.5}
            />
          </div>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
            className="h-14 rounded-2xl border-border bg-card pl-12 text-[15px] shadow-sm transition-all focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      <div className="space-y-2.5">
        <Label
          htmlFor="password"
          className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
        >
          Password
        </Label>
        <div className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            <Lock
              className="h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary"
              strokeWidth={1.5}
            />
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
            className="h-14 rounded-2xl border-border bg-card pl-12 text-[15px] shadow-sm transition-all focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10"
          />
        </div>
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
            Sign in
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </Button>
    </form>
  );
}
