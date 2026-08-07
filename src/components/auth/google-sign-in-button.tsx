"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, type AuthError } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createSessionCookie } from "@/actions/user.actions";
import { signInWithGoogle } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoogleSignInButtonProps {
  className?: string;
}

function describeAuthError(error: AuthError | Error): string {
  const code = (error as AuthError).code;
  if (code === "auth/popup-closed-by-user") {
    return "Sign-in window was closed. Try again.";
  }
  if (code === "auth/cancelled-popup-request") {
    return "Sign-in was cancelled.";
  }
  if (code === "auth/popup-blocked") {
    return "Your browser blocked the sign-in popup. Allow popups and retry.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error. Check your connection and try again.";
  }
  if (code === "auth/account-exists-with-different-credential") {
    return "This email is already linked to another sign-in method.";
  }
  return error.message || "Google sign-in failed.";
}

export function GoogleSignInButton({ className }: GoogleSignInButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken(true);

      const result = await signInWithGoogle(idToken);
      if (!result.success) {
        setError(result.error);
        return;
      }

      const cookieResult = await createSessionCookie(idToken);
      if (!cookieResult.success) {
        setError(cookieResult.error ?? "Could not establish a session.");
        return;
      }

      // New Google users land in onboarding so they can pick MEMBER vs CONSULTANT
      // and complete the curated profile fields. Returning users go straight in.
      router.replace(result.isNewUser ? "/onboarding" : "/dashboard");
    } catch (err) {
      setError(describeAuthError(err as AuthError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={loading}
        className="group relative h-13 w-full justify-center gap-3 rounded-2xl border-border/70 bg-card py-3.5 text-[14.5px] font-medium tracking-tight shadow-[0_1px_0_oklch(0.55_0.02_60/0.04)] transition-all hover:border-primary/30 hover:bg-card hover:shadow-[0_4px_18px_-8px_oklch(0.55_0.13_30/0.20)]"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <GoogleGlyph className="h-[18px] w-[18px]" />
        )}
        <span>{loading ? "Connecting to Google…" : "Continue with Google"}</span>
      </Button>

      {error && (
        <p className="text-center text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9082c1.7018-1.5668 2.6841-3.874 2.6841-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1804l-2.9082-2.2581c-.806.54-1.8368.8595-3.0482.8595-2.3441 0-4.3282-1.5832-5.036-3.7104H.9573v2.3318C2.4382 15.9831 5.4818 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1731 0 7.5477 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z"
        fill="#EA4335"
      />
    </svg>
  );
}