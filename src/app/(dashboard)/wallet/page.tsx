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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CryptoTab } from "@/components/wallet/CryptoTab";
import { WalletLedger } from "@/components/wallet/WalletLedger";
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

const formatNaira = (n: number) => `₦${n.toLocaleString()}`;

function FiatTab() {
  const router = useRouter();
  const { userDoc } = useAuthStore();

  const availableBalance = userDoc?.wallet?.availableBalance ?? 0;
  const escrowBalance = userDoc?.wallet?.escrowBalance ?? 0;
  const isConsultant = userDoc?.role === "CONSULTANT";

  const [panel, setPanel] = useState<"fund" | "withdraw" | null>(null);

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
        accountName,
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

  return (
    <div className="space-y-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        Naira · Paystack · {isConsultant ? "Consultant" : "Member"}
      </p>

      {/* Balances */}
      <div className="glow-coral tape-grain relative overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {isConsultant ? "Available earnings" : "Available balance"}
        </div>
        <div className="mt-4 font-serif text-5xl font-light leading-none tracking-tight">
          {formatNaira(availableBalance)}
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-foreground/[0.06] pt-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <Lock className="h-3 w-3" strokeWidth={1.5} />
              In escrow
            </div>
            <div className="mt-1 font-mono text-sm tabular-nums">
              {formatNaira(escrowBalance)}
            </div>
          </div>
          <div className="text-right text-[11.5px] text-muted-foreground">
            {isConsultant
              ? "Settles within 24 hours"
              : "Released on settlement"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-foreground/[0.06] bg-card/60 px-5 py-4 text-[12.5px] text-muted-foreground">
        <ShieldCheck
          className="h-4 w-4 shrink-0 text-primary"
          strokeWidth={1.5}
        />
        Payments are processed by Paystack under PCI-DSS Level 1. Your card
        details never touch our servers.
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={panel === "fund" ? "default" : "outline"}
          onClick={() => setPanel(panel === "fund" ? null : "fund")}
        >
          <PlusCircle className="h-4 w-4" />
          Fund with card or bank
        </Button>
        <Button
          type="button"
          variant={panel === "withdraw" ? "default" : "outline"}
          onClick={() => setPanel(panel === "withdraw" ? null : "withdraw")}
        >
          <ArrowDownToLine className="h-4 w-4" />
          Withdraw to bank
        </Button>
      </div>

      {panel === "fund" && (
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Choose an amount
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setFundAmount(String(a))}
                    className={`h-10 rounded-full px-4 text-[13px] font-medium transition-all ${
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

            <div className="space-y-2">
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
                  className="h-13 rounded-2xl border-foreground/[0.08] bg-background pl-9 font-serif text-lg tracking-tight"
                />
              </div>
              <p className="text-[11.5px] text-muted-foreground">
                Minimum funding amount is {formatNaira(500)}. Card, transfer, or
                USSD — your wallet is credited as soon as Paystack confirms.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleFundWallet}
              disabled={fundLoading || !fundAmount}
            >
              {fundLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              Continue to Paystack
            </Button>
          </CardContent>
        </Card>
      )}

      {panel === "withdraw" && (
        <Card>
          <CardContent className="space-y-5 pt-6">
            {withdrawError && (
              <Alert className="border-destructive/25 bg-destructive/[0.06] text-destructive">
                <AlertDescription className="text-[12px] font-medium">
                  {withdrawError}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
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
                  className="h-13 rounded-2xl border-foreground/[0.08] bg-background pl-9 font-serif text-lg tracking-tight"
                />
              </div>
              <p className="text-[11.5px] text-muted-foreground">
                Available: {formatNaira(availableBalance)} · minimum{" "}
                {formatNaira(500)}.
              </p>
            </div>

            <div className="space-y-2">
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
                className="h-13 w-full rounded-2xl border border-foreground/[0.08] bg-background px-4 text-[14px] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
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
              <div className="space-y-2">
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
                  className="h-13 rounded-2xl border-foreground/[0.08] bg-background font-mono tabular-nums"
                />
              </div>

              <div className="space-y-2">
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
                  className="h-13 rounded-2xl border-foreground/[0.08] bg-background"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleWithdraw}
              disabled={withdrawLoading}
            >
              {withdrawLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-4 w-4" />
              )}
              Withdraw to bank
            </Button>
            <p className="text-[11.5px] text-muted-foreground">
              Settlements clear within 24 hours via Paystack Transfers.
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Recent naira movements
        </div>
        <WalletLedger rail="fiat" rows={10} />
      </div>
    </div>
  );
}

export default function WalletPage() {
  useAuth();

  return (
    <div className="space-y-8">
      <header>
        <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Wallet
        </div>
        <h1 className="font-serif text-3xl font-light leading-tight tracking-tight sm:text-4xl">
          Your wallet
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
          Two rails, one balance sheet. Hold USDC on X Layer, naira with
          Paystack, and read every movement in a single ledger.
        </p>
      </header>

      <Tabs defaultValue="crypto">
        <TabsList variant="line" className="w-full justify-start sm:w-fit">
          <TabsTrigger value="crypto">Crypto (USDC)</TabsTrigger>
          <TabsTrigger value="fiat">Fiat (NGN)</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="crypto" className="mx-auto w-full max-w-2xl py-8">
          <CryptoTab />
        </TabsContent>

        <TabsContent value="fiat" className="mx-auto w-full max-w-2xl py-8">
          <FiatTab />
        </TabsContent>

        <TabsContent value="activity" className="mx-auto w-full max-w-2xl py-8">
          <div className="space-y-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Every rail · newest first
            </p>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              USDC settles on X Layer with a public OKLink receipt. Naira
              settles through Paystack. Balances are tracked separately — this
              ledger is where both rails read as one story.
            </p>
            <WalletLedger rail="all" rows={20} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
