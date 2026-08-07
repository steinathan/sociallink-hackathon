"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";
import {
  initializePaystackTransaction,
  requestPayout,
} from "@/actions/wallet.actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PlusCircle,
  ArrowDownToLine,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

const PRESET_AMOUNTS = [2000, 5000, 10000, 20000, 50000];

const NIGERIAN_BANKS = [
  { code: "058", name: "GTBank" },
  { code: "011", name: "First Bank" },
  { code: "033", name: "UBA" },
  { code: "057", name: "Zenith Bank" },
  { code: "044", name: "Access Bank" },
  { code: "023", name: "Citibank" },
  { code: "050", name: "Ecobank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "221", name: "Stanbic IBTC" },
];

export default function WalletPage() {
  const router = useRouter();
  const { userDoc } = useAuthStore();
  useAuth();

  const availableBalance = userDoc?.wallet?.availableBalance ?? 0;
  const escrowBalance = userDoc?.wallet?.escrowBalance ?? 0;
  const isConsultant = userDoc?.role === "CONSULTANT";

  const [fundAmount, setFundAmount] = useState("");
  const [fundLoading, setFundLoading] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  async function handleFundWallet() {
    const amount = parseInt(fundAmount);
    if (!amount || amount < 500) {
      toast.error("Minimum funding amount is ₦500");
      return;
    }
    setFundLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const idToken = await user.getIdToken();
      const result = await initializePaystackTransaction(idToken, amount);
      if (!result.success || !result.authorizationUrl) {
        toast.error(result.error ?? "Failed to initialize payment");
        return;
      }
      window.location.href = result.authorizationUrl;
    } catch {
      toast.error("Failed to initialize payment");
    } finally {
      setFundLoading(false);
    }
  }

  async function handleWithdraw() {
    setWithdrawError("");
    const amount = parseInt(withdrawAmount);
    if (!amount || amount < 500) {
      setWithdrawError("Minimum withdrawal is ₦500");
      return;
    }
    if (!bankCode || !accountNumber || !accountName) {
      setWithdrawError("Please fill in all bank details");
      return;
    }
    setWithdrawLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const idToken = await user.getIdToken();
      const result = await requestPayout(
        idToken,
        amount,
        bankCode,
        accountNumber,
        accountName
      );
      if (!result.success) {
        setWithdrawError(result.error ?? "Withdrawal failed");
        return;
      }
      toast.success("Withdrawal initiated — funds arrive within 24 hours.");
      setWithdrawAmount("");
      setBankCode("");
      setAccountNumber("");
      setAccountName("");
    } catch {
      setWithdrawError("Withdrawal failed. Please try again.");
    } finally {
      setWithdrawLoading(false);
    }
  }

  const formatNaira = (n: number) => `₦${n.toLocaleString()}`;

  return (
    <div className="space-y-10">
      {/* Header */}
      <header>
        <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Wallet
        </div>
        <h1 className="font-serif text-3xl font-light leading-tight tracking-tight sm:text-4xl">
          {isConsultant ? "Earnings" : "Your funds"}, at a glance.
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
          {isConsultant
            ? "Withdraw earnings to your bank account or view escrowed sessions."
            : "Top up your wallet, track escrow, and fund your next session."}
        </p>
      </header>

      {/* Premium balance cards */}
      <section className="grid gap-4 lg:grid-cols-5">
        <div className="glow-coral tape-grain relative overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card p-8 lg:col-span-3 lg:p-10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {isConsultant ? "Available earnings" : "Available balance"}
          </div>
          <div className="mt-4 font-serif text-5xl font-light leading-none tracking-tight sm:text-6xl">
            {formatNaira(availableBalance)}
          </div>
          <div className="mt-4 max-w-md text-[13px] text-muted-foreground">
            {isConsultant
              ? "Available to withdraw to your bank. Settlements clear within 24 hours via Paystack."
              : "Funds ready to lock in escrow for any session request."}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card p-8 lg:col-span-2 lg:p-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                In escrow
              </div>
              <div className="mt-4 font-serif text-4xl font-light leading-none tracking-tight sm:text-5xl">
                {formatNaira(escrowBalance)}
              </div>
              <div className="mt-4 text-[12.5px] text-muted-foreground">
                Released on settlement.
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-foreground/[0.06] bg-background">
              <Lock className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="flex items-center gap-3 rounded-2xl border border-foreground/[0.06] bg-card/60 px-5 py-4 text-[12.5px] text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
        All payments are processed by Paystack under PCI-DSS Level 1.
        Your card details never touch our servers.
      </section>

      {/* Action tabs */}
      <Tabs defaultValue={isConsultant ? "withdraw" : "fund"}>
        <TabsList className="inline-flex h-11 rounded-full bg-muted p-1">
          {!isConsultant && (
            <TabsTrigger
              value="fund"
              className="h-9 rounded-full px-5 text-[13px] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Fund wallet
            </TabsTrigger>
          )}
          <TabsTrigger
            value="withdraw"
            className="h-9 rounded-full px-5 text-[13px] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Withdraw
          </TabsTrigger>
        </TabsList>

        {/* Fund tab */}
        {!isConsultant && (
          <TabsContent value="fund" className="mt-8">
            <div className="grid gap-px overflow-hidden rounded-[28px] border border-foreground/[0.06] bg-foreground/[0.06] lg:grid-cols-[1fr_1.4fr]">
              <div className="space-y-7 bg-card p-8 lg:p-10">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Choose an amount
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {PRESET_AMOUNTS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setFundAmount(String(a))}
                        className={`h-11 rounded-full px-5 text-[13px] font-medium transition-all ${
                          fundAmount === String(a)
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "border border-foreground/[0.08] bg-background text-foreground hover:border-primary/30"
                        }`}
                      >
                        {formatNaira(a)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label
                    htmlFor="fund-amount"
                    className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                  >
                    Or enter a custom amount
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-4 flex items-center font-serif text-base text-muted-foreground">
                      ₦
                    </span>
                    <Input
                      id="fund-amount"
                      type="number"
                      placeholder="0"
                      min={500}
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      className="h-14 rounded-2xl border-foreground/[0.08] bg-background pl-9 font-serif text-lg tracking-tight"
                    />
                  </div>
                  <p className="text-[11.5px] text-muted-foreground">
                    Minimum funding amount is {formatNaira(500)}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleFundWallet}
                  disabled={fundLoading || !fundAmount}
                  className="btn-coral inline-flex h-13 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold tracking-tight disabled:opacity-50"
                >
                  {fundLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4" strokeWidth={1.5} />
                      Continue to Paystack
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-7 bg-card p-8 lg:p-10">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    How funding works
                  </div>
                  <ol className="mt-6 space-y-5">
                    {[
                      {
                        t: "Choose an amount",
                        d: "Pick a quick amount or enter a custom value.",
                      },
                      {
                        t: "Pay securely on Paystack",
                        d: "Card, transfer, USSD — whichever you prefer.",
                      },
                      {
                        t: "Wallet credited instantly",
                        d: "Funds appear in your available balance immediately.",
                      },
                    ].map((s, i) => (
                      <li key={s.t} className="flex gap-5">
                        <div className="font-serif text-2xl font-light text-primary/40">
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <div>
                          <div className="font-serif text-[15px] font-medium tracking-tight">
                            {s.t}
                          </div>
                          <div className="mt-1 text-[12.5px] leading-[1.55] text-muted-foreground">
                            {s.d}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        {/* Withdraw tab */}
        <TabsContent value="withdraw" className="mt-8">
          <div className="overflow-hidden rounded-[28px] border border-foreground/[0.06] bg-card p-8 lg:p-10">
            {withdrawError && (
              <Alert className="mb-6 border-destructive/25 bg-destructive/[0.06] text-destructive">
                <AlertDescription className="text-[12px] font-medium">
                  {withdrawError}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <Label
                    htmlFor="withdraw-amount"
                    className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                  >
                    Amount
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-4 flex items-center font-serif text-base text-muted-foreground">
                      ₦
                    </span>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="0"
                      min={500}
                      max={availableBalance}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="h-14 rounded-2xl border-foreground/[0.08] bg-background pl-9 font-serif text-lg tracking-tight"
                    />
                  </div>
                  <p className="text-[11.5px] text-muted-foreground">
                    Available: {formatNaira(availableBalance)} · minimum {formatNaira(500)}.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2.5">
                  <Label
                    htmlFor="bank-code"
                    className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                  >
                    Bank
                  </Label>
                  <select
                    id="bank-code"
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-foreground/[0.08] bg-background px-4 text-[14px] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  >
                    <option value="">Select your bank…</option>
                    {NIGERIAN_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2.5">
                    <Label
                      htmlFor="account-number"
                      className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                    >
                      Account number
                    </Label>
                    <Input
                      id="account-number"
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit NUBAN"
                      value={accountNumber}
                      onChange={(e) =>
                        setAccountNumber(e.target.value.replace(/\D/g, ""))
                      }
                      className="h-14 rounded-2xl border-foreground/[0.08] bg-background font-mono tabular-nums"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label
                      htmlFor="account-name"
                      className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                    >
                      Account name
                    </Label>
                    <Input
                      id="account-name"
                      type="text"
                      placeholder="As on your account"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="h-14 rounded-2xl border-foreground/[0.08] bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 border-t border-foreground/[0.06] pt-6">
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={withdrawLoading}
                className="btn-coral inline-flex h-13 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold tracking-tight disabled:opacity-50 sm:w-auto sm:px-8"
              >
                {withdrawLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ArrowDownToLine className="h-4 w-4" strokeWidth={1.5} />
                    Withdraw to bank
                  </>
                )}
              </button>
              <p className="mt-4 text-[11.5px] text-muted-foreground">
                Settlements clear within 24 hours via Paystack Transfers.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
