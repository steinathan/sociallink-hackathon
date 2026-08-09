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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { xLayer, oklinkTxUrl, XLAYER_USDC_DECIMALS } from "@/lib/web3/xlayer-chain";

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_X_LAYER_ADDRESS as
  | `0x${string}`
  | undefined;

function CryptoTabInner() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const queryClient = useQueryClient();
  const { writeContractAsync, isPending: isSending } = useWriteContract();

  const [panel, setPanel] = useState<"fund" | "withdraw" | null>(null);

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

    // Server plans the withdrawal (balance + policy); the client signs it.
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
        args: [
          withdrawTo as `0x${string}`,
          parseUnits(String(amount), XLAYER_USDC_DECIMALS),
        ],
      });
      setLastWithdrawHash(hash);
      toast.success("USDC transfer signed");
      queryClient.invalidateQueries({ queryKey: ["usdc-history"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer cancelled");
    }
  }

  const wrongChain = isConnected && chainId !== xLayer.id;

  return (
    <div className="space-y-6">
      {/* Balance header + X Layer aside */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Powered by X Layer · @XLayerOfficial
        </p>
        <ConnectWalletButton variant={isConnected ? "outline" : "primary"} />
      </div>

      <CryptoBalanceCard />

      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        X Layer is OKX&apos;s zkEVM. Pay through OKX Wallet and stablecoin
        transfers cost zero gas — OKB covers everything else. Every movement
        settles publicly on OKLink.
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={panel === "fund" ? "default" : "outline"}
          onClick={() => setPanel(panel === "fund" ? null : "fund")}
        >
          <ArrowDownToLine className="h-4 w-4" />
          Fund with USDC
        </Button>
        <Button
          type="button"
          variant={panel === "withdraw" ? "default" : "outline"}
          onClick={() => setPanel(panel === "withdraw" ? null : "withdraw")}
        >
          <ArrowUpFromLine className="h-4 w-4" />
          Withdraw
        </Button>
      </div>

      {panel === "fund" && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="tx-hash" className="text-xs text-muted-foreground">
                Sent USDC on X Layer already? Paste the transaction hash to
                credit your balance.
              </Label>
              <Input
                id="tx-hash"
                placeholder="0x…"
                value={txHashInput}
                onChange={(e) => setTxHashInput(e.target.value.trim())}
                className="font-mono text-xs"
              />
            </div>
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
            {lastClaimHash && (
              <a
                href={oklinkTxUrl(lastClaimHash as `0x${string}`, xLayer.testnet)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Last claim: {lastClaimHash.slice(0, 10)}…{lastClaimHash.slice(-6)}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {panel === "withdraw" && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            {wrongChain && (
              <Alert variant="destructive">
                <AlertDescription>
                  Wrong network. Switch to X Layer in your OKX Wallet.
                </AlertDescription>
              </Alert>
            )}
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
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="withdraw-usdc"
                className="text-xs text-muted-foreground"
              >
                Amount (USDC)
              </Label>
              <Input
                id="withdraw-usdc"
                type="number"
                min={0}
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="font-mono tabular-nums"
              />
            </div>
            <Button
              onClick={handleWithdraw}
              disabled={isSending || !withdrawTo || !withdrawAmount}
              type="button"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpFromLine className="h-4 w-4" />
              )}
              Sign from wallet
            </Button>
            {withdrawHint && (
              <p className="text-[11px] text-muted-foreground">
                Server plan: {withdrawHint}. Client signs the transfer.
              </p>
            )}
            {lastWithdrawHash && (
              <a
                href={oklinkTxUrl(
                  lastWithdrawHash as `0x${string}`,
                  xLayer.testnet,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Last withdrawal: {lastWithdrawHash.slice(0, 10)}…
                {lastWithdrawHash.slice(-6)}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </CardContent>
        </Card>
      )}

      <TxHistory />
    </div>
  );
}

export function CryptoTab() {
  // ponytail: provider scoped to this tab so NGN-only users never load wagmi.
  // Lift to the dashboard layout once a second web3 surface lands.
  return (
    <Web3Provider>
      <CryptoTabInner />
    </Web3Provider>
  );
}
