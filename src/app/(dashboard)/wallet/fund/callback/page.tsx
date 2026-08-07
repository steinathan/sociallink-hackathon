"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading"
  );

  useEffect(() => {
    const reference = searchParams.get("reference");
    const trxref = searchParams.get("trxref");
    const ref = reference ?? trxref;

    if (!ref) {
      setStatus("failed");
      return;
    }

    // Paystack redirects here after payment. Webhook handles the actual credit.
    // We just show success/failure based on URL params.
    setStatus("success");
  }, [searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <h2 className="text-xl font-bold">Processing Payment...</h2>
            <p className="mt-2 text-muted-foreground">
              Please wait while we verify your transaction.
            </p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold">Payment Successful!</h2>
            <p className="mt-2 text-muted-foreground">
              Your wallet will be credited within a few seconds.
            </p>
            <Button
              className="mt-6"
              onClick={() => router.push("/wallet")}
            >
              Back to Wallet
            </Button>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold">Payment Failed</h2>
            <p className="mt-2 text-muted-foreground">
              Something went wrong. Your wallet was not charged.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => router.push("/wallet")}
            >
              Try Again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function WalletCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
