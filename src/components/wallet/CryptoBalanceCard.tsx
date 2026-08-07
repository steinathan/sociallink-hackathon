"use client";

import {
  useAccount,
  useBalance,
  useChainId,
  useDisconnect,
} from "wagmi";
import { formatUnits } from "viem";
import { toast } from "sonner";
import { Copy, Fuel, LogOut } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  xLayer,
  XLAYER_OKB_DECIMALS,
  XLAYER_USDC_DECIMALS,
  oklinkAddressUrl,
} from "@/lib/web3/xlayer-chain";

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_X_LAYER_ADDRESS as
  | `0x${string}`
  | undefined;

export function CryptoBalanceCard() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  const { data: usdc, isLoading: usdcLoading } = useBalance({
    address,
    token: USDC_ADDRESS,
    chainId: xLayer.id,
    query: { enabled: Boolean(address && USDC_ADDRESS) },
  });

  const { data: okb, isLoading: okbLoading } = useBalance({
    address,
    chainId: xLayer.id,
    query: { enabled: Boolean(address) },
  });

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl tracking-tight">
            Crypto wallet
          </CardTitle>
          <CardDescription>
            Connect OKX Wallet to view your USDC and OKB on X Layer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No wallet connected. X Layer is OKX&apos;s zkEVM — OKX Wallet pays
            zero gas on USDC and USDT transfers.
          </p>
        </CardContent>
      </Card>
    );
  }

  const onWrongChain = chainId !== xLayer.id;

  async function copyAddress() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    toast.success("Address copied");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="font-serif text-xl tracking-tight">
              Crypto wallet
            </CardTitle>
            <CardDescription>
              {onWrongChain
                ? "Wrong network — switch to X Layer in your wallet."
                : "X Layer · OKX Wallet · @XLayerOfficial"}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => disconnect()}
            className="text-muted-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>
        <a
          href={address ? oklinkAddressUrl(address) : "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!address) e.preventDefault();
            else copyAddress();
          }}
          className="mt-2 inline-flex w-fit items-center gap-1.5 font-mono text-[11px] tabular-nums text-muted-foreground transition-colors hover:text-foreground"
        >
          {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "—"}
          <Copy className="h-3 w-3" />
        </a>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            USDC balance
          </div>
          {usdcLoading ? (
            <Skeleton className="mt-2 h-10 w-44" />
          ) : (
            <div className="mt-1 font-serif text-4xl font-medium tracking-tight tabular-nums">
              {usdc ? formatUnits(usdc.value, XLAYER_USDC_DECIMALS) : "0.00"}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                USDC
              </span>
            </div>
          )}
          {!USDC_ADDRESS ? (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Set <code className="font-mono">NEXT_PUBLIC_USDC_X_LAYER_ADDRESS</code> to read on-chain USDC.
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-foreground/[0.06] pt-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <Fuel className="h-3 w-3" />
              OKB · gas
            </div>
            <div className="mt-1 font-mono text-sm tabular-nums">
              {okbLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : okb ? (
                formatUnits(okb.value, XLAYER_OKB_DECIMALS)
              ) : (
                "0"
              )}
            </div>
          </div>
          <div className="text-right text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Network
            <div className="mt-0.5 font-mono text-[11px] tabular-nums text-foreground">
              {xLayer.name}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
