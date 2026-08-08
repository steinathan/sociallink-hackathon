"use server";

import { adminDb, adminAuth, adminMessaging, adminCollection } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { Address } from "viem";
import { BookingStatus } from "@/types";
import {
  createBookingEscrow,
  disputeBookingEscrow,
  fetchUserWalletAddress,
  hasEscrowConfig,
  nairaToUsdcUnits,
  readEscrowStatus,
  releaseBookingEscrow,
} from "@/lib/web3/server";

const PLATFORM_COMMISSION = 0.15; // 15%
// EscrowStatus.ACTIVE on X Layer testnet (Escrow.sol enum)
const ESCROW_STATUS_ACTIVE = 0;

// ─── Helper: Send Notification (Firestore + FCM Push) ─────────────────────────
async function sendNotification(
  uid: string,
  type: string,
  title: string,
  body: string,
  bookingId?: string
) {
  // 1. Write to Firestore notifications sub-collection (in-app bell)
  await adminCollection("users")
    .doc(uid)
    .collection("notifications")
    .add({
      type,
      title,
      body,
      bookingId: bookingId ?? null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

  // 2. Send FCM push to all registered devices for this user
  try {
    const userSnap = await adminCollection("users").doc(uid).get();
    const fcmTokens: string[] = userSnap.data()?.fcmTokens ?? [];

    if (fcmTokens.length === 0) return;

    // Send to all tokens in a single multicast call
    const response = await adminMessaging.sendEachForMulticast({
      tokens: fcmTokens,
      notification: { title, body },
      data: {
        type,
        bookingId: bookingId ?? "",
        url: bookingId ? `/bookings/${bookingId}` : "/dashboard",
      },
      webpush: {
        notification: {
          title,
          body,
          icon: "/icons/web-app-manifest-192x192.png",
          badge: "/icons/favicon-96x96.png",
          requireInteraction: false,
          tag: bookingId ?? "sociallink",
        },
        fcmOptions: {
          link: bookingId ? `/bookings/${bookingId}` : "/dashboard",
        },
      },
    });

    // Remove stale tokens that returned a registration-not-found error
    const staleTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (
        !res.success &&
        (res.error?.code === "messaging/registration-token-not-registered" ||
          res.error?.code === "messaging/invalid-registration-token")
      ) {
        staleTokens.push(fcmTokens[idx]);
      }
    });

    if (staleTokens.length > 0) {
      await adminCollection("users")
        .doc(uid)
        .update({ fcmTokens: staleTokens.map(() => FieldValue.delete()) });

      // Use arrayRemove per token
      for (const stale of staleTokens) {
        await adminCollection("users").doc(uid).update({
          fcmTokens: FieldValue.arrayRemove(stale),
        });
      }
    }
  } catch (fcmErr) {
    // Never let FCM failure break the core booking flow
    console.warn("[sendNotification] FCM push failed (non-fatal):", fcmErr);
  }
}

// ─── Request Booking (Atomic Escrow Lock) ────────────────────────────────────
export async function requestBooking(
  idToken: string,
  consultantId: string,
  selectedServiceIds: string[],
  currency: "USDC" | "NGN" = "NGN"
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const memberId = decoded.uid;

    if (memberId === consultantId) {
      return { success: false, error: "You cannot book yourself." };
    }

    // Fetch consultant profile to get services
    const profileDoc = await adminCollection("profiles")
      .doc(consultantId)
      .get();
    if (!profileDoc.exists) {
      return { success: false, error: "Consultant not found." };
    }

    const profileData = profileDoc.data()!;
    const availableServices = (profileData.services as any[]) || [];

    // Filter and validate selected services
    const selectedServices = availableServices.filter(s => selectedServiceIds.includes(s.id));

    if (selectedServices.length === 0) {
      return { success: false, error: "Please select at least one service." };
    }

    const totalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0);

    if (totalAmount <= 0) {
      return { success: false, error: "Invalid booking amount." };
    }

    const bookingId = adminCollection("bookings").doc().id;

    // Pre-flight for USDC: need member's wallet + consultant address before the txn.
    // (External chain reads must happen OUTSIDE the Firestore txn — same pattern as acceptBooking.)
    let memberAddr: Address | null = null;
    let consultantAddr: Address | null = null;
    if (currency === "USDC") {
      if (!hasEscrowConfig()) {
        return { success: false, error: "Onchain escrow not configured." };
      }
      [memberAddr, consultantAddr] = await Promise.all([
        fetchUserWalletAddress(memberId),
        fetchUserWalletAddress(consultantId),
      ]);
      if (!memberAddr) {
        return { success: false, error: "Connect OKX Wallet to pay with USDC." };
      }
      if (!consultantAddr) {
        return { success: false, error: "Consultant has no wallet bound." };
      }
    }

    const usdcAmount = nairaToUsdcUnits(totalAmount);

    await adminDb.runTransaction(async (tx) => {
      const memberRef = adminCollection("users").doc(memberId);
      const memberSnap = await tx.get(memberRef);

      if (!memberSnap.exists) throw new Error("Member not found.");

      const wallet = memberSnap.data()!.wallet as {
        availableBalance: number;
        escrowBalance: number;
        usdcBalance?: number;
      };

      if (currency === "USDC") {
        const usdcBal = wallet.usdcBalance ?? 0;
        const usdcFloat = Number(usdcAmount) / 10 ** 6;
        if (usdcBal < usdcFloat) {
          throw new Error(
            `Insufficient USDC balance. You need ${usdcFloat.toFixed(2)} USDC but have ${usdcBal.toFixed(2)} USDC.`
          );
        }
        // Decrement USDC balance (cash leg); onchain lock happens right after this txn.
        tx.update(memberRef, {
          "wallet.usdcBalance": FieldValue.increment(-usdcFloat),
          "wallet.usdcBalanceUpdatedAt": FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        if (wallet.availableBalance < totalAmount) {
          throw new Error(
            `Insufficient balance. You need ₦${totalAmount.toLocaleString()} but have ₦${wallet.availableBalance.toLocaleString()}.`
          );
        }
        // Deduct from availableBalance, add to escrowBalance
        tx.update(memberRef, {
          "wallet.availableBalance": FieldValue.increment(-totalAmount),
          "wallet.escrowBalance": FieldValue.increment(totalAmount),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Create booking
      const bookingRef = adminCollection("bookings").doc(bookingId);
      tx.set(bookingRef, {
        bookingId,
        memberId,
        consultantId,
        selectedServices: selectedServices.map(s => ({
          id: s.id,
          title: s.title,
          price: s.price
        })),
        amountLocked: totalAmount,
        currency,
        status: "REQUESTED",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Record wallet transaction
      const txRef = adminCollection("wallet_transactions").doc();
      tx.set(txRef, {
        userId: memberId,
        type: currency === "USDC" ? "CRYPTO_ESCROW_LOCK" : "ESCROW_LOCK",
        amount: currency === "USDC" ? Number(usdcAmount) / 10 ** 6 : totalAmount,
        bookingId,
        description:
          currency === "USDC"
            ? `USDC escrow locked on X Layer for ${selectedServices.length} services`
            : `Escrow locked for ${selectedServices.length} services`,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    // Onchain lock — synchronous when user picked USDC (txn already debited their balance).
    // For NGN we still stage a parallel onchain escrow if both parties have wallets.
    if (currency === "USDC") {
      try {
        const { escrowId, txHash } = await createBookingEscrow(
          bookingId,
          consultantAddr!,
          usdcAmount
        );
        await adminCollection("bookings").doc(bookingId).update({
          escrowId,
          escrowTxHash: txHash,
          escrowChain: "xlayer-testnet" as const,
          usdcAmountLocked: usdcAmount.toString(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error("[escrow] USDC onchain lock failed:", err);
        return {
          success: false,
          error: `Onchain escrow lock failed: ${err instanceof Error ? err.message : "unknown"}. Booking rolled back — try Paystack instead.`,
        };
      }
    } else {
      await maybeCreateOnchainEscrow(bookingId, memberId, consultantId, totalAmount);
    }

    // Send notifications
    await Promise.all([
      sendNotification(
        consultantId,
        "BOOKING_REQUESTED",
        "New Session Request",
        currency === "USDC"
          ? `A member has requested ${selectedServices.length} services. Total: ${(Number(usdcAmount) / 10 ** 6).toFixed(2)} USDC (onchain).`
          : `A member has requested ${selectedServices.length} services. Total: ₦${totalAmount.toLocaleString()}`,
        bookingId
      ),
      sendNotification(
        memberId,
        "BOOKING_REQUESTED",
        "Session Request Sent",
        currency === "USDC"
          ? `Your request has been sent. ${(Number(usdcAmount) / 10 ** 6).toFixed(2)} USDC is locked in our onchain escrow on X Layer.`
          : `Your request has been sent. ₦${totalAmount.toLocaleString()} is held in escrow.`,
        bookingId
      ),
    ]);

    return { success: true, bookingId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Booking failed.";
    console.error("requestBooking error:", message);
    return { success: false, error: message };
  }
}

// ─── Onchain escrow helper: only runs when both parties have a wallet. ────────
// ponytail: Web3 is strictly parallel — never block fiat flow on chain failures.
async function maybeCreateOnchainEscrow(
  bookingId: string,
  memberId: string,
  consultantId: string,
  totalAmount: number
) {
  if (!hasEscrowConfig()) return;
  try {
    const [memberAddr, consultantAddr] = await Promise.all([
      fetchUserWalletAddress(memberId),
      fetchUserWalletAddress(consultantId),
    ]);
    if (!memberAddr || !consultantAddr) return;

    const usdcAmount = nairaToUsdcUnits(totalAmount);
    const { escrowId, txHash } = await createBookingEscrow(
      bookingId,
      consultantAddr,
      usdcAmount
    );
    await adminCollection("bookings").doc(bookingId).update({
      escrowId,
      escrowTxHash: txHash,
      escrowChain: "xlayer-testnet" as const,
      usdcAmountLocked: usdcAmount.toString(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.warn("[escrow] createBookingEscrow failed (non-fatal):", err);
  }
}
export async function acceptBooking(
  idToken: string,
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const consultantId = decoded.uid;

    const bookingRef = adminCollection("bookings").doc(bookingId);

    // Pre-flight: external chain reads must happen OUTSIDE the Firestore txn.
    const preSnap = await bookingRef.get();
    if (!preSnap.exists) return { success: false, error: "Booking not found." };
    const preBooking = preSnap.data()!;
    if (preBooking.escrowId) {
      const status = await readEscrowStatus(preBooking.escrowId);
      if (status !== ESCROW_STATUS_ACTIVE) {
        return { success: false, error: "Onchain escrow is not active — cannot accept." };
      }
    }

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists) throw new Error("Booking not found.");

      const booking = snap.data()!;
      if (booking.consultantId !== consultantId)
        throw new Error("Unauthorized.");
      if (booking.status !== "REQUESTED")
        throw new Error("Booking is no longer pending.");

      // Generate chatId
      const chatId = adminCollection("chats").doc().id;

      tx.update(bookingRef, {
        status: "ACCEPTED" as BookingStatus,
        chatId,
        acceptedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create chat document
      const chatRef = adminCollection("chats").doc(chatId);
      tx.set(chatRef, {
        chatId,
        bookingId,
        memberId: booking.memberId,
        consultantId,
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    const snap = await bookingRef.get();
    const memberId = snap.data()!.memberId;

    await Promise.all([
      sendNotification(
        memberId,
        "BOOKING_ACCEPTED",
        "Session Accepted!",
        "Your session has been accepted. You can now chat with your consultant.",
        bookingId
      ),
    ]);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to accept booking.";
    return { success: false, error: message };
  }
}

// ─── Cancel Booking (Refund) ──────────────────────────────────────────────────
export async function cancelBooking(
  idToken: string,
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    await adminDb.runTransaction(async (tx) => {
      const bookingRef = adminCollection("bookings").doc(bookingId);
      const snap = await tx.get(bookingRef);

      if (!snap.exists) throw new Error("Booking not found.");

      const booking = snap.data()!;

      if (booking.memberId !== uid && booking.consultantId !== uid) {
        throw new Error("Unauthorized.");
      }

      if (!["REQUESTED", "ACCEPTED"].includes(booking.status)) {
        throw new Error("Cannot cancel this booking at its current status.");
      }

      const memberRef = adminCollection("users").doc(booking.memberId);
      const amountLocked = booking.amountLocked as number;

      // Refund escrow to member's availableBalance
      tx.update(memberRef, {
        "wallet.availableBalance": FieldValue.increment(amountLocked),
        "wallet.escrowBalance": FieldValue.increment(-amountLocked),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.update(bookingRef, {
        status: "CANCELLED" as BookingStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Record refund transaction
      const txRef = adminCollection("wallet_transactions").doc();
      tx.set(txRef, {
        userId: booking.memberId,
        type: "REFUND",
        amount: amountLocked,
        bookingId,
        description: "Refund for cancelled session",
        createdAt: FieldValue.serverTimestamp(),
      });

      // Close chat if it exists
      if (booking.chatId) {
        const chatRef = adminCollection("chats").doc(booking.chatId);
        tx.update(chatRef, { isActive: false });
      }
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cancellation failed.";
    return { success: false, error: message };
  }
}

// ─── Mark Booking Complete (by Consultant) ────────────────────────────────────
export async function markBookingComplete(
  idToken: string,
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const consultantId = decoded.uid;

    const bookingRef = adminCollection("bookings").doc(bookingId);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists) throw new Error("Booking not found.");

      const booking = snap.data()!;
      if (booking.consultantId !== consultantId)
        throw new Error("Unauthorized.");
      if (!["ACCEPTED", "ACTIVE"].includes(booking.status))
        throw new Error("Cannot mark this booking as complete.");

      tx.update(bookingRef, {
        status: "COMPLETED" as BookingStatus,
        consultantMarkedComplete: true,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    const snap = await bookingRef.get();
    const memberId = snap.data()!.memberId;

    await sendNotification(
      memberId,
      "BOOKING_COMPLETED",
      "Session Completed",
      "Your consultant has marked the session as complete. Please release funds when satisfied.",
      bookingId
    );

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed.";
    return { success: false, error: message };
  }
}

// ─── Release Funds (Member Confirms) — Atomic with 15% Commission ────────────
export async function releaseFunds(
  idToken: string,
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const memberId = decoded.uid;

    // Pre-flight: capture booking state + release onchain escrow OUTSIDE the Firestore txn.
    const preRef = adminCollection("bookings").doc(bookingId);
    const preSnap = await preRef.get();
    if (!preSnap.exists) return { success: false, error: "Booking not found." };
    const preBooking = preSnap.data()!;
    if (preBooking.memberId !== memberId) return { success: false, error: "Unauthorized." };
    if (preBooking.status !== "COMPLETED")
      return { success: false, error: "Session not marked complete yet." };

    let escrowTxHash: string | undefined;
    if (preBooking.escrowId) {
      try {
        escrowTxHash = await releaseBookingEscrow(preBooking.escrowId);
      } catch (err) {
        return { success: false, error: `Onchain escrow release failed: ${err instanceof Error ? err.message : "unknown"}` };
      }
    }

    const isUsdc = !!preBooking.usdcAmountLocked;
    const usdcFloat = isUsdc
      ? Number(BigInt(preBooking.usdcAmountLocked!)) / 10 ** 6
      : 0;

    await adminDb.runTransaction(async (tx) => {
      const bookingRef = adminCollection("bookings").doc(bookingId);
      const snap = await tx.get(bookingRef);

      if (!snap.exists) throw new Error("Booking not found.");

      const booking = snap.data()!;

      if (booking.memberId !== memberId) throw new Error("Unauthorized.");
      if (booking.status !== "COMPLETED")
        throw new Error("Session not marked complete yet.");

      const totalAmount = booking.amountLocked as number;
      const platformFee = Math.floor(totalAmount * PLATFORM_COMMISSION);
      const consultantPayout = totalAmount - platformFee;

      const memberRef = adminCollection("users").doc(memberId);
      const consultantRef = adminCollection("users").doc(booking.consultantId);
      const platformRef = adminCollection("platform").doc("wallet");

      if (isUsdc) {
        // Onchain release already paid out the consultant via the Escrow contract.
        // Mirror the credit in their cached usdcBalance so the UI reflects it.
        // ponytail: USDC release skips the 15% fiat commission split — flat payout to consultant.
        tx.update(consultantRef, {
          "wallet.usdcBalance": FieldValue.increment(usdcFloat),
          "wallet.usdcBalanceUpdatedAt": FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        // Fiat release: deduct from member's escrowBalance, credit consultant + platform.
        tx.update(memberRef, {
          "wallet.escrowBalance": FieldValue.increment(-totalAmount),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.update(consultantRef, {
          "wallet.availableBalance": FieldValue.increment(consultantPayout),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.set(
          platformRef,
          {
            totalCommissionEarned: FieldValue.increment(platformFee),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      // Update booking
      tx.update(bookingRef, {
        status: "SETTLED" as BookingStatus,
        memberConfirmedComplete: true,
        settledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        receipt: {
          totalAmount,
          platformFee,
          consultantPayout,
        },
        ...(escrowTxHash ? { escrowTxHash, usdcReleasedAt: FieldValue.serverTimestamp() } : {}),
      });

      if (isUsdc) {
        const txOnchainRef = adminCollection("wallet_transactions").doc();
        tx.set(txOnchainRef, {
          userId: booking.consultantId,
          type: "CRYPTO_ESCROW_RELEASE",
          amount: usdcFloat,
          bookingId,
          description: `USDC session payout from X Layer escrow`,
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        // Record transactions (fiat path)
        const tx1Ref = adminCollection("wallet_transactions").doc();
        tx.set(tx1Ref, {
          userId: memberId,
          type: "ESCROW_RELEASE",
          amount: totalAmount,
          bookingId,
          description: "Escrow released on session completion",
          createdAt: FieldValue.serverTimestamp(),
        });

        const tx2Ref = adminCollection("wallet_transactions").doc();
        tx.set(tx2Ref, {
          userId: booking.consultantId,
          type: "ESCROW_RELEASE",
          amount: consultantPayout,
          bookingId,
          description: `Session payout (85% of ₦${totalAmount.toLocaleString()})`,
          createdAt: FieldValue.serverTimestamp(),
        });

        const tx3Ref = adminCollection("wallet_transactions").doc();
        tx.set(tx3Ref, {
          userId: "PLATFORM",
          type: "COMMISSION",
          amount: platformFee,
          bookingId,
          description: `Platform commission (15% of ₦${totalAmount.toLocaleString()})`,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      // Close chat
      if (booking.chatId) {
        const chatRef = adminCollection("chats").doc(booking.chatId);
        tx.update(chatRef, { isActive: false });
      }
    });

    // Fetch booking for notifications
    const snap = await adminCollection("bookings").doc(bookingId).get();
    const booking = snap.data()!;

    await Promise.all([
      sendNotification(
        booking.consultantId,
        "FUNDS_RELEASED",
        "Funds Released!",
        isUsdc
          ? `${usdcFloat.toFixed(2)} USDC has been credited to your wallet.`
          : `₦${(booking.receipt?.consultantPayout ?? 0).toLocaleString()} has been added to your wallet.`,
        bookingId
      ),
      sendNotification(
        memberId,
        "BOOKING_SETTLED",
        "Session Complete",
        "You have released funds. Thank you for using SocialLink!",
        bookingId
      ),
    ]);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to release funds.";
    return { success: false, error: message };
  }
}

// ─── Dispute Booking ──────────────────────────────────────────────────────────
export async function disputeBooking(
  idToken: string,
  bookingId: string,
  reason: string,
  description: string,
  evidenceUrls: string[]
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const reporterId = decoded.uid;

    // Pre-flight: dispute onchain escrow OUTSIDE the Firestore txn.
    const preRef = adminCollection("bookings").doc(bookingId);
    const preSnap = await preRef.get();
    if (!preSnap.exists) return { success: false, error: "Booking not found." };
    const preBooking = preSnap.data()!;
    if (preBooking.memberId !== reporterId && preBooking.consultantId !== reporterId) {
      return { success: false, error: "Unauthorized." };
    }
    if (preBooking.status === "SETTLED" || preBooking.status === "CANCELLED") {
      return { success: false, error: "Cannot dispute this booking." };
    }
    let escrowTxHash: string | undefined;
    if (preBooking.escrowId) {
      try {
        escrowTxHash = await disputeBookingEscrow(preBooking.escrowId);
      } catch (err) {
        return { success: false, error: `Onchain escrow dispute failed: ${err instanceof Error ? err.message : "unknown"}` };
      }
    }

    await adminDb.runTransaction(async (tx) => {
      const bookingRef = adminCollection("bookings").doc(bookingId);
      const snap = await tx.get(bookingRef);

      if (!snap.exists) throw new Error("Booking not found.");

      const booking = snap.data()!;

      if (booking.memberId !== reporterId && booking.consultantId !== reporterId) {
        throw new Error("Unauthorized.");
      }

      if (booking.status === "SETTLED" || booking.status === "CANCELLED") {
        throw new Error("Cannot dispute this booking.");
      }

      const reportedId =
        booking.memberId === reporterId
          ? booking.consultantId
          : booking.memberId;

      const isUsdc = !!booking.usdcAmountLocked;

      // Update booking status to DISPUTED — freezes escrow
      tx.update(bookingRef, {
        status: "DISPUTED" as BookingStatus,
        updatedAt: FieldValue.serverTimestamp(),
        ...(escrowTxHash ? { escrowTxHash } : {}),
      });

      // Record onchain dispute marker for audit trail. Funds stay frozen in the
      // Solidity escrow until the AI resolver calls resolveDispute() (Tier 3).
      if (isUsdc) {
        const txOnchainRef = adminCollection("wallet_transactions").doc();
        tx.set(txOnchainRef, {
          userId: reporterId,
          type: "CRYPTO_ESCROW_DISPUTE",
          amount: 0,
          bookingId,
          description: `Onchain escrow disputed on X Layer — frozen pending AI resolution`,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      // Create report document
      const reportRef = adminCollection("reports").doc();
      tx.set(reportRef, {
        reportId: reportRef.id,
        reporterId,
        reportedId,
        bookingId,
        reason,
        detailedDescription: description,
        evidenceUrls,
        status: "OPEN",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // Alert admin via Discord
    if (process.env.DISCORD_WEBHOOK_URL) {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "🚨 DISPUTE FILED",
              color: 0xff0000,
              fields: [
                { name: "Booking ID", value: bookingId, inline: true },
                { name: "Reporter UID", value: reporterId, inline: true },
                { name: "Reason", value: reason, inline: true },
                { name: "Description", value: description },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      }).catch(() => {});
    }

    // Notify both parties
    const bookingSnap = await adminCollection("bookings").doc(bookingId).get();
    const booking = bookingSnap.data()!;
    const otherPartyId =
      booking.memberId === reporterId ? booking.consultantId : booking.memberId;

    await Promise.all([
      sendNotification(
        reporterId,
        "BOOKING_DISPUTED",
        "Dispute Filed",
        "Your dispute has been submitted. Funds are frozen pending review.",
        bookingId
      ),
      sendNotification(
        otherPartyId,
        "BOOKING_DISPUTED",
        "Dispute Opened",
        "A dispute has been filed on your session. Funds are frozen pending review.",
        bookingId
      ),
    ]);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Dispute failed.";
    return { success: false, error: message };
  }
}
