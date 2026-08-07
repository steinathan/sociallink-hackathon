"use client";

import { useState } from "react";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import { erc20Abi, isAddress, parseUnits } from "viem";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  recordCryptoDeposit,
  requestCryptoWithdrawal,
} from "@/actions/wallet-crypto.actions";
import { Web3Provider } from "@/lib/web3/web3-provider";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { CryptoBalanceCard } from "@/components/wallet/CryptoBalanceCard";
import { TxHistory } from "@/components/wallet/TxHistory";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  xLayer,
  oklinkTxUrl,
} from "@/lib/web3/xlayer-chain";

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_X_LAYER_ADDRESS as
  | `0x${string}`
  | undefined;

function WalletPageInner() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const queryClient = useQueryClient();
  const { writeContractAsync, isPending: isSending } = useWriteContract();

  const [txHashInput, setTxHashInput] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [lastClaimHash, setLastClaimHash] = useState<string | null>(null);

  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawHint, setWithdrawHint] = useState<string | null>(null);
  const [lastWithdrawHash, setLastWithdrawHash] = useState<string | null>(null);

  async function handleClaim() {
    if (!txHashInput.match(/^0x[0-9a-fA-F]{64}$/)) {
      toast.error("Paste a valid 0x… tx hash");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      toast.error("Sign in first");
      return;
    }
    setClaiming(true);
    try {
      const idToken = await user.getIdToken();
      const res = await recordCryptoDeposit({
        idToken,
        uid: user.uid,
        txHash: txHashInput as `0x${string}`,
        fromAddress: (address ?? "0x0") as `0x${string}`,
        amount: 0, // server recomputes from receipt
      });
      if (!res.success) {
        toast.error(res.error ?? "Claim failed");
        return;
      }
      if (res.alreadyRecorded) {
        toast.info("Already credited");
      } else {
        toast.success("USDC deposit credited");
      }
      setLastClaimHash(txHashInput);
      setTxHashInput("");
      queryClient.invalidateQueries({ queryKey: ["usdc-history"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  async function handleWithdraw() {
    if (!isConnected || !address) {
      toast.error("Connect OKX Wallet first");
      return;
    }
    if (!isAddress(withdrawTo)) {
      toast.error("Invalid destination address");
      return;
    }
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    if (!USDC_ADDRESS) {
      toast.error("USDC address not configured");
      return;
    }

    // Tell user the high-level intent (server-side planning). For hackathon,
    // we then immediately fire the client-side USDC transfer.
    const plan = await requestCryptoWithdrawal(
      "ignored",
      withdrawTo as `0x${string}`,
      amount,
    );
    setWithdrawHint(plan.reason);

    try {
      const hash = await writeContractAsync({
        chainId: xLayer.id,
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "transfer",
        args: [withdrawTo as `0x${string}`, parseUnits(String(amount), 6)],
      });
      setLastWithdrawHash(hash);
      toast.success("USDC transfer signed");
      queryClient.invalidateQueries({ queryKey: ["usdc-history"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transfer cancelled";
      toast.error(msg);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Web3 · @XLayerOfficial
          </p>
          <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight">
            Crypto wallet
          </h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Fund with USDC on X Layer (OKX zkEVM). OKX Wallet pays zero gas on
            USDC and USDT transfers.
          </p>
        </div>
        <ConnectWalletButton variant={isConnected ? "outline" : "primary"} />
      </header>

      <CryptoBalanceCard />

      <TxHistory />

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl tracking-tight">
            Fund with USDC
          </CardTitle>
          <CardDescription>
            Already sent USDC on X Layer? Paste the tx hash to claim it into
            your SocialLink balance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tx-hash" className="text-xs text-muted-foreground">
              Transaction hash
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="tx-hash"
                placeholder="0x…"
                value={txHashInput}
                onChange={(e) => setTxHashInput(e.target.value.trim())}
                className="font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                onClick={handleClaim}
                disabled={claiming || !txHashInput}
                type="button"
              >
                {claiming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDownToLine className="h-4 w-4" />
                )}
                {claiming ? "Verifying on-chain…" : "Claim deposit"}
              </Button>
            </div>
          </div>
          {lastClaimHash ? (
            <a
              href={oklinkTxUrl(lastClaimHash as `0x${string}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Last claim: {lastClaimHash.slice(0, 10)}…
              {lastClaimHash.slice(-6)}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl tracking-tight">
            Withdraw to wallet
          </CardTitle>
          <CardDescription>
            Sends USDC from your connected OKX Wallet. OKX Wallet pays zero gas
            on stablecoin transfers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {chainId !== xLayer.id && isConnected ? (
            <Alert variant="destructive">
              <AlertDescription>
                Wrong network. Switch to X Layer in your OKX Wallet.
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
            <div className="space-y-1.5">
              <Label
                htmlFor="withdraw-to"
                className="text-xs text-muted-foreground"
              >
                Destination address
              </Label>
              <Input
                id="withdraw-to"
                placeholder="0x…"
                value={withdrawTo}
                onChange={(e) => setWithdrawTo(e.target.value.trim())}
                className="font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="withdraw-amount"
                className="text-xs text-muted-foreground"
              >
                Amount (USDC)
              </Label>
              <Input
                id="withdraw-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleWithdraw}
                disabled={isSending || !isConnected}
                type="button"
                className="w-full sm:w-auto"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpFromLine className="h-4 w-4" />
                )}
                Sign from wallet
              </Button>
            </div>
          </div>
          {withdrawHint ? (
            <p className="text-[11px] text-muted-foreground">
              Server plan: {withdrawHint}. Client signs the transfer.
            </p>
          ) : null}
          {lastWithdrawHash ? (
            <>
              <Separator />
              <a
                href={oklinkTxUrl(lastWithdrawHash as `0x${string}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Last transfer: {lastWithdrawHash.slice(0, 10)}…
                {lastWithdrawHash.slice(-6)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function WalletCryptoPage() {
  // ponytail: redundant provider, lift to root layout once more web3 pages land
  return (
    <Web3Provider>
      <WalletPageInner />
    </Web3Provider>
  );
}
