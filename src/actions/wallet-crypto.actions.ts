"use server";

import { FieldValue } from "firebase-admin/firestore";
import { createPublicClient, http, parseEventLogs } from "viem";
import { erc20Abi } from "viem";
import { adminAuth, adminCollection, adminDb } from "@/lib/firebase-admin";
import { xLayer } from "@/lib/web3/xlayer-chain";

const X_LAYER_RPC =
  process.env.X_LAYER_RPC_URL ?? "https://testrpc.xlayer.tech";
const USDC = process.env.USDC_X_LAYER_ADDRESS as `0x${string}` | undefined;
const USDC_DECIMALS = 6;

function publicClient() {
  return createPublicClient({ chain: xLayer, transport: http(X_LAYER_RPC) });
}

function toUsdcAmount(raw: bigint): number {
  return Number(raw) / 10 ** USDC_DECIMALS;
}

export interface RecordDepositParams {
  idToken?: string;
  uid: string;
  txHash: `0x${string}`;
  fromAddress: `0x${string}`;
  amount: number;
  blockNumber?: number;
}

export interface RecordDepositResult {
  success: boolean;
  error?: string;
  amount?: string;
  alreadyRecorded?: boolean;
}

/**
 * Validates a USDC deposit on X Layer via getTransactionReceipt, then credits
 * the user's wallet.usdcBalance + writes a wallet_transactions entry. Atomic
 * via adminDb.runTransaction (AGENTS.md rule).
 *
 * Two call paths:
 *  - client: idToken + uid (we verify they match)
 *  - webhook: no idToken (HMAC of the webhook payload IS the auth)
 */
export async function recordCryptoDeposit(
  params: RecordDepositParams,
): Promise<RecordDepositResult> {
  try {
    if (!USDC) {
      return { success: false, error: "USDC address not configured." };
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(params.txHash)) {
      return { success: false, error: "Invalid tx hash." };
    }

    if (params.idToken) {
      const decoded = await adminAuth.verifyIdToken(params.idToken);
      if (decoded.uid !== params.uid) {
        return { success: false, error: "UID mismatch." };
      }
    }

    const client = publicClient();
    const receipt = await client.getTransactionReceipt({
      hash: params.txHash,
    });
    if (receipt.status !== "success") {
      return { success: false, error: "Transaction reverted on-chain." };
    }

    const usdcLogs = receipt.logs.filter(
      (l) => l.address.toLowerCase() === USDC.toLowerCase(),
    );
    const parsed = parseEventLogs({
      abi: erc20Abi,
      eventName: "Transfer",
      logs: usdcLogs,
    });

    let total = BigInt(0);
    for (const ev of parsed) {
      const e = ev as { args: { from: string; to: string; value: bigint } };
      if (e.args.from.toLowerCase() !== params.fromAddress.toLowerCase()) {
        continue;
      }
      total += e.args.value;
    }
    if (total === BigInt(0)) {
      return {
        success: false,
        error: "No matching USDC transfer from this wallet in the tx.",
      };
    }

    const existing = await adminCollection("wallet_transactions")
      .where("reference", "==", params.txHash)
      .limit(1)
      .get();
    if (!existing.empty) {
      return {
        success: true,
        alreadyRecorded: true,
        amount: total.toString(),
      };
    }

    const amountUsdc = toUsdcAmount(total);
    await adminDb.runTransaction(async (tx) => {
      tx.update(adminCollection("users").doc(params.uid), {
        "wallet.usdcBalance": FieldValue.increment(amountUsdc),
        "wallet.usdcBalanceUpdatedAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const txRef = adminCollection("wallet_transactions").doc();
      tx.set(txRef, {
        userId: params.uid,
        type: "CRYPTO_DEPOSIT",
        amount: amountUsdc,
        reference: params.txHash,
        bookingId: null,
        description: "USDC deposit on X Layer",
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    await adminCollection("users")
      .doc(params.uid)
      .collection("notifications")
      .add({
        type: "WALLET_FUNDED",
        title: "USDC deposit confirmed",
        body: `${amountUsdc.toLocaleString()} USDC added to your wallet.`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

    return { success: true, amount: total.toString() };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Deposit failed.",
    };
  }
}

export async function syncUsdcBalance(
  idToken: string,
  address: `0x${string}`,
): Promise<{ success: boolean; balance?: string; error?: string }> {
  try {
    if (!USDC) {
      return { success: false, error: "USDC address not configured." };
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return { success: false, error: "Invalid address." };
    }

    const client = publicClient();
    const balance = (await client.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    const amountUsdc = toUsdcAmount(balance);
    await adminCollection("users").doc(uid).update({
      "wallet.usdcBalance": amountUsdc,
      "wallet.usdcBalanceUpdatedAt": FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true, balance: balance.toString() };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Sync failed.",
    };
  }
}

export interface CryptoWithdrawalRequest {
  requiresClientSignature: true;
  reason: string;
  toAddress: `0x${string}`;
  amount: number;
}

/**
 * Tier 3 stub — real server-side withdrawal requires a hot-wallet signer with
 * key management. The client should perform the USDC.transfer via the
 * connected wallet (OKX Wallet signs with 0 gas on stablecoins).
 */
export async function requestCryptoWithdrawal(
  _uid: string,
  toAddress: `0x${string}`,
  amount: number,
): Promise<CryptoWithdrawalRequest> {
  return {
    requiresClientSignature: true,
    reason: "Use connected wallet to sign",
    toAddress,
    amount,
  };
}
