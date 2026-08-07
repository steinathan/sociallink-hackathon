"use server";

import { adminDb, adminAuth, adminCollection } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

// ─── Initialize Paystack Transaction ─────────────────────────────────────────
export async function initializePaystackTransaction(
  idToken: string,
  amountNaira: number
): Promise<{ success: boolean; authorizationUrl?: string; reference?: string; error?: string }> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const userDoc = await adminCollection("users").doc(uid).get();
    if (!userDoc.exists) return { success: false, error: "User not found." };

    const amountKobo = amountNaira * 100;
    const reference = `sl_${uid.slice(0, 8)}_${Date.now()}`;

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: `${uid}@sociallink.app`,
        amount: amountKobo,
        reference,
        currency: "NGN",
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet/fund/callback`,
        metadata: { uid, amountNaira, type: "WALLET_FUND" },
      }),
    });

    const data = await response.json();
    if (!data.status) return { success: false, error: data.message ?? "Paystack error" };

    await adminCollection("pending_transactions").doc(reference).set({
      reference, uid, amountNaira, amountKobo, status: "PENDING",
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, authorizationUrl: data.data.authorization_url, reference };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Initialization failed.";
    return { success: false, error: message };
  }
}

// ─── Verify Paystack Transaction (webhook) ─────────────────────────────────
export async function creditWalletFromPaystack(reference: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const data = await response.json();
    if (!data.status || data.data.status !== "success") return { success: false, error: "Transaction not successful." };

    const amountNaira = data.data.amount / 100;
    const uid = data.data.metadata.uid;

    const pendingRef = adminCollection("pending_transactions").doc(reference);
    const pendingSnap = await pendingRef.get();
    if (!pendingSnap.exists) return { success: false, error: "Transaction not found." };
    if (pendingSnap.data()!.status === "COMPLETED") return { success: true };

    await adminDb.runTransaction(async (tx) => {
      tx.update(adminCollection("users").doc(uid), {
        "wallet.availableBalance": FieldValue.increment(amountNaira),
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.update(pendingRef, { status: "COMPLETED", completedAt: FieldValue.serverTimestamp() });
      const txRef = adminCollection("wallet_transactions").doc();
      tx.set(txRef, { userId: uid, type: "DEPOSIT", amount: amountNaira, reference, description: "Wallet funded via Paystack", createdAt: FieldValue.serverTimestamp() });
    });

    await adminCollection("users").doc(uid).collection("notifications").add({
      type: "WALLET_FUNDED", title: "Wallet Funded!", body: `₦${amountNaira.toLocaleString()} added to your wallet.`, read: false, createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Credit failed." };
  }
}

// ─── Verify webhook signature ──────────────────────────────────────────────
export async function verifyPaystackSignature(rawBody: string, signature: string): Promise<boolean> {
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
}

// ─── Payout to Bank (Paystack Transfer) ───────────────────────────────────
export async function requestPayout(
  idToken: string, amountNaira: number, bankCode: string, accountNumber: string, accountName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (amountNaira < 500) return { success: false, error: "Minimum withdrawal is ₦500." };
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const userDoc = await adminCollection("users").doc(uid).get();
    if (!userDoc.exists) return { success: false, error: "User not found." };
    if (userDoc.data()!.role !== "CONSULTANT") return { success: false, error: "Only consultants can withdraw." };
    const availableBalance = userDoc.data()!.wallet?.availableBalance ?? 0;
    if (availableBalance < amountNaira) return { success: false, error: "Insufficient available balance." };

    const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "nuban", name: accountName, account_number: accountNumber, bank_code: bankCode, currency: "NGN" }),
    });
    const recipientData = await recipientRes.json();
    if (!recipientData.status) return { success: false, error: recipientData.message ?? "Failed to create transfer recipient." };

    const amountKobo = amountNaira * 100;
    const reference = `payout_${uid.slice(0, 8)}_${Date.now()}`;
    const transferRes = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ source: "balance", amount: amountKobo, recipient: recipientData.data.recipient_code, reason: "SocialLink Consultant Payout", reference }),
    });
    const transferData = await transferRes.json();
    if (!transferData.status) return { success: false, error: transferData.message ?? "Transfer failed." };

    await adminDb.runTransaction(async (tx) => {
      tx.update(adminCollection("users").doc(uid), { "wallet.availableBalance": FieldValue.increment(-amountNaira), updatedAt: FieldValue.serverTimestamp() });
      const payoutRef = adminCollection("payouts").doc(reference);
      tx.set(payoutRef, { payoutId: reference, consultantId: uid, amount: amountNaira, bankCode, accountNumber, accountName, paystackTransferCode: transferData.data.transfer_code, status: "PROCESSING", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      const txRef = adminCollection("wallet_transactions").doc();
      tx.set(txRef, { userId: uid, type: "PAYOUT", amount: amountNaira, reference, description: `Payout to ${accountName}`, createdAt: FieldValue.serverTimestamp() });
    });
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Payout failed." };
  }
}
