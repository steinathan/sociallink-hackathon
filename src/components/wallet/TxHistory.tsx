"use client";

import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { ExternalLink, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  xLayer,
  XLAYER_USDC_DECIMALS,
  oklinkTxUrl,
  oklinkAddressUrl,
} from "@/lib/web3/xlayer-chain";

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_X_LAYER_ADDRESS as
  | `0x${string}`
  | undefined;

// ponytail: capped at last 5000 blocks + 10 rows — switch to paginated
// getLogs with cursor if USDC volume on X Layer exceeds this
const HISTORY_BLOCK_WINDOW = BigInt(5000);
const HISTORY_ROW_LIMIT = 10;

export function TxHistory() {
  const { address } = useAccount();
  const client = usePublicClient({ chainId: xLayer.id });

  const query = useQuery({
    queryKey: ["usdc-history", address, USDC_ADDRESS],
    enabled: Boolean(address && client && USDC_ADDRESS),
    queryFn: async () => {
      if (!client || !address || !USDC_ADDRESS) return [];
      const head = await client.getBlockNumber();
      const fromBlock = head > HISTORY_BLOCK_WINDOW ? head - HISTORY_BLOCK_WINDOW : BigInt(0);
      const logs = await client.getLogs({
        address: USDC_ADDRESS,
        event: {
          type: "event",
          name: "Transfer",
          inputs: [
            { name: "from", type: "address", indexed: true },
            { name: "to", type: "address", indexed: true },
            { name: "value", type: "uint256", indexed: false },
          ],
        },
        fromBlock,
        toBlock: head,
      });
      const lower = address.toLowerCase();
      const mine = logs
        .filter(
          (l) =>
            l.args.from?.toLowerCase() === lower ||
            l.args.to?.toLowerCase() === lower,
        )
        .slice(-HISTORY_ROW_LIMIT)
        .reverse();
      return mine;
    },
  });

  if (!address) return null;
  if (!USDC_ADDRESS) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl tracking-tight">
            Recent USDC transfers
          </CardTitle>
          <CardDescription>
            On-chain history unlocks once{" "}
            <code className="font-mono">NEXT_PUBLIC_USDC_X_LAYER_ADDRESS</code>{" "}
            is configured.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-xl tracking-tight">
          Recent USDC transfers
        </CardTitle>
        <CardDescription>
          Last {HISTORY_BLOCK_WINDOW.toString()} blocks on X Layer testnet ·{" "}
          <a
            href={oklinkAddressUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/70 underline-offset-2 hover:underline"
          >
            View on OKLink
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !query.data || query.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No USDC transfers found in the recent window.
          </p>
        ) : (
          <ul className="divide-y divide-foreground/[0.06]">
            {query.data.map((log) => {
              if (!log.transactionHash || !log.args.value) return null;
              const isOutgoing =
                log.args.from?.toLowerCase() === address.toLowerCase();
              const counterparty = isOutgoing
                ? log.args.to
                : log.args.from;
              const counterpartyLabel = counterparty
                ? `${counterparty.slice(0, 6)}…${counterparty.slice(-4)}`
                : "—";
              const amount = formatUnits(log.args.value, XLAYER_USDC_DECIMALS);
              return (
                <li
                  key={log.transactionHash}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {isOutgoing ? (
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <div className="font-mono text-sm tabular-nums">
                        {isOutgoing ? "−" : "+"}
                        {amount} USDC
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {isOutgoing ? "to" : "from"} {counterpartyLabel}
                      </div>
                    </div>
                  </div>
                  <a
                    href={oklinkTxUrl(log.transactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="View on OKLink"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
