"use client";

import { useEffect, useState } from "react";
import { getDocs, query, where } from "firebase/firestore";
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { auth, db, getScopedCollectionRef } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { xLayer, oklinkTxUrl } from "@/lib/web3/xlayer-chain";
import type { TransactionType, WalletTransaction } from "@/types";

/** Types that add to a balance. Everything else subtracts. */
const CREDIT_TYPES = new Set<TransactionType>([
  "DEPOSIT",
  "ESCROW_RELEASE",
  "REFUND",
  "CRYPTO_DEPOSIT",
  "CRYPTO_ESCROW_RELEASE",
  "CRYPTO_REFUND",
]);

const isCrypto = (t: TransactionType) => t.startsWith("CRYPTO_");
const isTxHash = (r?: string) => Boolean(r && /^0x[0-9a-fA-F]{64}$/.test(r));

function railLabel(type: TransactionType) {
  return isCrypto(type) ? "USDC · X Layer" : "NGN · Paystack";
}

function formatAmount(tx: WalletTransaction) {
  return isCrypto(tx.type)
    ? `${tx.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`
    : `₦${tx.amount.toLocaleString()}`;
}

export function WalletLedger({
  rail,
  rows = 10,
}: {
  /** "fiat" hides crypto movements; "all" braids both rails together. */
  rail: "fiat" | "all";
  rows?: number;
}) {
  const [txs, setTxs] = useState<WalletTransaction[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setTxs([]);
      return;
    }
    // ponytail: equality-only query + client sort — no composite index needed,
    // so the page works without a firestore deploy. Add a
    // (userId ASC, createdAt DESC) index and move to orderBy+limit if a user
    // ever accumulates enough transactions for the full fetch to hurt.
    getDocs(
      query(
        getScopedCollectionRef(db, "wallet_transactions"),
        where("userId", "==", uid),
      ),
    )
      .then((snap) => {
        if (cancelled) return;
        const all = snap.docs.map(
          (d) => ({ transactionId: d.id, ...d.data() }) as WalletTransaction,
        );
        all.sort(
          (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
        );
        setTxs(all);
      })
      .catch(() => {
        if (!cancelled) setTxs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (txs === null) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const visible = txs
    .filter((t) => (rail === "fiat" ? !isCrypto(t.type) : true))
    .slice(0, rows);

  if (visible.length === 0) {
    return (
      <p className="rounded-2xl border border-foreground/[0.06] bg-card/60 px-5 py-8 text-center text-[13px] text-muted-foreground">
        {rail === "fiat"
          ? "No naira movements yet. Fund your wallet to get started."
          : "No activity yet. Fund with USDC or naira to open your ledger."}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-foreground/[0.06] overflow-hidden rounded-2xl border border-foreground/[0.06] bg-card">
      {visible.map((tx) => {
        const credit = CREDIT_TYPES.has(tx.type);
        const Icon = credit ? ArrowDownLeft : ArrowUpRight;
        const explorer = isCrypto(tx.type) && isTxHash(tx.reference);

        return (
          <li
            key={tx.transactionId}
            className="flex items-center gap-4 px-5 py-4"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/[0.06] bg-background">
              <Icon
                className={
                  credit ? "h-3.5 w-3.5 text-primary" : "h-3.5 w-3.5 text-muted-foreground"
                }
                strokeWidth={1.8}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium">
                {tx.description}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <span>{railLabel(tx.type)}</span>
                {explorer && (
                  <a
                    href={oklinkTxUrl(
                      tx.reference as `0x${string}`,
                      xLayer.testnet,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 normal-case tracking-normal hover:text-foreground"
                  >
                    <span className="font-mono">
                      {tx.reference!.slice(0, 8)}…
                    </span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <div
              className={`shrink-0 font-mono text-[13px] tabular-nums ${
                credit ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {credit ? "+" : "−"}
              {formatAmount(tx)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
