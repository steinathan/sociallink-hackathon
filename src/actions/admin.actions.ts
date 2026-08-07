"use server";

import { adminDb, adminAuth, adminCollection } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  aiResolveBookingEscrow,
  fetchUserWalletAddress,
  hasEscrowConfig,
} from "@/lib/web3/server";
import type { Address, Hex } from "viem";

// ─── Helper: assert admin role ─────────────────────────────────────────────────
async function assertAdmin(idToken: string): Promise<string> {
  const decoded = await adminAuth.verifyIdToken(idToken);
  const snap = await adminCollection("users").doc(decoded.uid).get();
  if (!snap.exists || snap.data()?.role !== "ADMIN") {
    throw new Error("Unauthorized: admin only.");
  }
  return decoded.uid;
}

type AiSignedPayload = {
  signature: Hex;
  message: { bookingId: Hex; winner: Address; splitBps: number };
  domain: { name: string; version: string; chainId: number; verifyingContract: Address };
  types: Record<string, Array<{ name: string; type: string }>>;
};

// KYC functions removed — SocialLink no longer collects identity documents.
// All trust signals (reviews, escrow, OTP verification) are enforced in code
// and surfaced via the dashboard, not via document review.

// ─── Disputes: list open disputes ─────────────────────────────────────────────
export async function listOpenDisputes(
  idToken: string
): Promise<{
  success: boolean;
  reports?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    await assertAdmin(idToken);
    const snap = await adminCollection("reports")
      .where("status", "==", "OPEN")
      .orderBy("createdAt", "asc")
      .limit(50)
      .get();

    const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, reports };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed." };
  }
}

// ─── Disputes: resolve (refund member OR release to consultant) ────────────────
export async function resolveDispute(
  idToken: string,
  reportId: string,
  bookingId: string,
  resolution: "REFUND_MEMBER" | "RELEASE_CONSULTANT",
  adminNotes: string,
  aiSignedPayload?: AiSignedPayload
): Promise<{ success: boolean; error?: string; escrowTxHash?: string }> {
  try {
  const adminUid = await assertAdmin(idToken);

    const PLATFORM_COMMISSION = 0.15;

    // If an AI-signed payload is provided AND the booking has an onchain escrow,
    // broadcast it on X Layer first. The signature is informational — the broadcast
    // uses AI_RESOLVER_PRIVATE_KEY directly.
    let escrowTxHash: string | undefined;
    if (aiSignedPayload && hasEscrowConfig()) {
      const bookingSnap = await adminCollection("bookings").doc(bookingId).get();
      const bookingData = bookingSnap.data() as { escrowId?: Hex; memberId?: string; consultantId?: string } | undefined;
      if (bookingData?.escrowId && bookingData.memberId && bookingData.consultantId) {
        // Use the AI-signed winner address; fall back to looking it up if missing.
        let winner = aiSignedPayload.message.winner;
        if (!winner || winner === ("0x0000000000000000000000000000000000000000" as Address)) {
          const [memberAddr, consultantAddr] = await Promise.all([
            fetchUserWalletAddress(bookingData.memberId),
            fetchUserWalletAddress(bookingData.consultantId),
          ]);
          winner = (memberAddr ?? consultantAddr)!;
        }
        try {
          escrowTxHash = await aiResolveBookingEscrow(
            bookingData.escrowId,
            winner,
            aiSignedPayload.message.splitBps
          );
        } catch (err) {
          return { success: false, error: `AI broadcast failed: ${err instanceof Error ? err.message : "unknown"}` };
        }
      }
    }

    await adminDb.runTransaction(async (tx) => {
      const bookingRef = adminCollection("bookings").doc(bookingId);
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists) throw new Error("Booking not found.");

      const booking = bookingSnap.data()!;
      if (booking.status !== "DISPUTED") {
        throw new Error("Booking is not in DISPUTED state.");
      }

      const totalAmount = booking.amountLocked as number;

      if (resolution === "REFUND_MEMBER") {
        // Return full escrow to member
        tx.update(adminCollection("users").doc(booking.memberId), {
          "wallet.availableBalance": FieldValue.increment(totalAmount),
          "wallet.escrowBalance": FieldValue.increment(-totalAmount),
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.update(bookingRef, {
          status: "REFUNDED",
          updatedAt: FieldValue.serverTimestamp(),
          disputeResolution: "REFUNDED_TO_MEMBER",
          disputeAdminNotes: adminNotes,
          disputeResolvedBy: adminUid,
          ...(escrowTxHash ? { escrowTxHash, settledAt: FieldValue.serverTimestamp(), settledReason: "AI_DISPUTE_RESOLVED" } : {}),
        });

        const txRef = adminCollection("wallet_transactions").doc();
        tx.set(txRef, {
          userId: booking.memberId,
          type: "REFUND",
          amount: totalAmount,
          bookingId,
          description: `Dispute resolved — refunded to member by admin`,
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        // Release escrow to consultant (with commission)
        const platformFee = Math.floor(totalAmount * PLATFORM_COMMISSION);
        const consultantPayout = totalAmount - platformFee;

        tx.update(adminCollection("users").doc(booking.memberId), {
          "wallet.escrowBalance": FieldValue.increment(-totalAmount),
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.update(adminCollection("users").doc(booking.consultantId), {
          "wallet.availableBalance": FieldValue.increment(consultantPayout),
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.set(
          adminCollection("platform").doc("wallet"),
          { totalCommissionEarned: FieldValue.increment(platformFee), updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );

        tx.update(bookingRef, {
          status: "SETTLED",
          receipt: { totalAmount, platformFee, consultantPayout },
          updatedAt: FieldValue.serverTimestamp(),
          disputeResolution: "RELEASED_TO_CONSULTANT",
          disputeAdminNotes: adminNotes,
          disputeResolvedBy: adminUid,
          ...(escrowTxHash ? { escrowTxHash, settledAt: FieldValue.serverTimestamp(), settledReason: "AI_DISPUTE_RESOLVED" } : {}),
        });

        const txRef = adminCollection("wallet_transactions").doc();
        tx.set(txRef, {
          userId: booking.consultantId,
          type: "ESCROW_RELEASE",
          amount: consultantPayout,
          bookingId,
          description: `Dispute resolved — funds released to consultant by admin`,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      // Close chat if exists
      if (booking.chatId) {
        tx.update(adminCollection("chats").doc(booking.chatId), { isActive: false });
      }

      // Mark report as resolved
      tx.update(adminCollection("reports").doc(reportId), {
        status: "RESOLVED",
        adminNotes,
        resolvedBy: adminUid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // Notify both parties
    const bookingSnap = await adminCollection("bookings").doc(bookingId).get();
    const booking = bookingSnap.data()!;
    const msg =
      resolution === "REFUND_MEMBER"
        ? "The dispute has been resolved. Funds have been refunded to the member."
        : "The dispute has been resolved. Funds have been released to the consultant.";

    await Promise.all([
      adminCollection("users").doc(booking.memberId).collection("notifications").add({
        type: "BOOKING_DISPUTED",
        title: "Dispute Resolved",
        body: msg,
        bookingId,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      }),
      adminCollection("users").doc(booking.consultantId).collection("notifications").add({
        type: "BOOKING_DISPUTED",
        title: "Dispute Resolved",
        body: msg,
        bookingId,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      }),
    ]);

    return { success: true, escrowTxHash };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed." };
  }
}

// ─── Users: list all users ────────────────────────────────────────────────────
export async function listAllUsers(
  idToken: string,
  roleFilter?: "MEMBER" | "CONSULTANT" | "ADMIN"
): Promise<{
  success: boolean;
  users?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    await assertAdmin(idToken);
    let q = adminCollection("users").orderBy("createdAt", "desc").limit(100);
    const snap = await (roleFilter
      ? adminCollection("users").where("role", "==", roleFilter).orderBy("createdAt", "desc").limit(100).get()
      : q.get());

    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, users };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed." };
  }
}

// ─── Users: ban / unban ────────────────────────────────────────────────────────
export async function setUserBanStatus(
  idToken: string,
  targetUid: string,
  banned: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAdmin(idToken);
    await adminAuth.updateUser(targetUid, { disabled: banned });
    await adminCollection("users").doc(targetUid).update({
      banned,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed." };
  }
}

// ─── Platform stats ───────────────────────────────────────────────────────────
export async function getPlatformStats(
  idToken: string
): Promise<{
  success: boolean;
  stats?: {
    totalUsers: number;
    totalConsultants: number;
    totalMembers: number;
    openDisputes: number;
    totalCommission: number;
  };
  error?: string;
}> {
  try {
    await assertAdmin(idToken);

    const [usersSnap, consultantsSnap, membersSnap, disputesSnap, platformSnap] =
      await Promise.all([
        adminCollection("users").count().get(),
        adminCollection("users").where("role", "==", "CONSULTANT").count().get(),
        adminCollection("users").where("role", "==", "MEMBER").count().get(),
        adminCollection("reports").where("status", "==", "OPEN").count().get(),
        adminCollection("platform").doc("wallet").get(),
      ]);

    return {
      success: true,
      stats: {
        totalUsers: usersSnap.data().count,
        totalConsultants: consultantsSnap.data().count,
        totalMembers: membersSnap.data().count,
        openDisputes: disputesSnap.data().count,
        totalCommission: platformSnap.data()?.totalCommissionEarned ?? 0,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed." };
  }
}
