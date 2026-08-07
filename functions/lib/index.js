"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateRatingsOnReviewCreate = exports.autoReleaseCompletedBookings = exports.autoCancelStalePendingBookings = void 0;
const admin = require("firebase-admin");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
admin.initializeApp();
const db = admin.firestore();
const firestoreNamespace = (process.env.FIREBASE_NAMESPACE || process.env.NEXT_PUBLIC_FIREBASE_NAMESPACE || "sociallink")
    .trim()
    .replace(/^\/+|\/+$/g, "");
function scopedCollection(collectionId) {
    return db.collection("stores").doc(firestoreNamespace).collection(collectionId);
}
function scopedCollectionFor(namespace, collectionId) {
    return db.collection("stores").doc(namespace).collection(collectionId);
}
const PLATFORM_COMMISSION = 0.15;
const AUTO_CANCEL_MINUTES = 30;
const AUTO_RELEASE_HOURS = 24;
// ─── Helper: Send Notification ────────────────────────────────────────────────
async function sendNotification(uid, type, title, body, bookingId) {
    await scopedCollection("users").doc(uid).collection("notifications").add({
        type,
        title,
        body,
        bookingId: bookingId !== null && bookingId !== void 0 ? bookingId : null,
        read: false,
        createdAt: firestore_2.FieldValue.serverTimestamp(),
    });
}
// ─── Auto-Cancel Stale REQUESTED Bookings (every 5 minutes) ─────────────────
exports.autoCancelStalePendingBookings = (0, scheduler_1.onSchedule)("every 5 minutes", async () => {
    const cutoff = admin.firestore.Timestamp.fromDate(new Date(Date.now() - AUTO_CANCEL_MINUTES * 60 * 1000));
    const staleSnap = await scopedCollection("bookings")
        .where("status", "==", "REQUESTED")
        .where("createdAt", "<", cutoff)
        .get();
    if (staleSnap.empty)
        return;
    const batch = db.batch();
    for (const bookingDoc of staleSnap.docs) {
        const booking = bookingDoc.data();
        const amountLocked = booking.amountLocked;
        // Refund to member's availableBalance
        batch.update(scopedCollection("users").doc(booking.memberId), {
            "wallet.availableBalance": firestore_2.FieldValue.increment(amountLocked),
            "wallet.escrowBalance": firestore_2.FieldValue.increment(-amountLocked),
            updatedAt: firestore_2.FieldValue.serverTimestamp(),
        });
        // Cancel booking
        batch.update(bookingDoc.ref, {
            status: "CANCELLED",
            updatedAt: firestore_2.FieldValue.serverTimestamp(),
            cancelledReason: "AUTO_CANCELLED: Consultant did not respond in time.",
        });
        // Record refund transaction
        const txRef = scopedCollection("wallet_transactions").doc();
        batch.set(txRef, {
            userId: booking.memberId,
            type: "REFUND",
            amount: amountLocked,
            bookingId: bookingDoc.id,
            description: "Auto-refund: Consultant did not accept within 30 minutes.",
            createdAt: firestore_2.FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
    // Send notifications (outside batch — sub-collection adds)
    for (const bookingDoc of staleSnap.docs) {
        const booking = bookingDoc.data();
        await Promise.all([
            sendNotification(booking.memberId, "BOOKING_CANCELLED", "Session Auto-Cancelled", `Your session request was auto-cancelled as the consultant did not respond within 30 minutes. Your ₦${booking.amountLocked.toLocaleString()} has been refunded.`, bookingDoc.id),
            sendNotification(booking.consultantId, "BOOKING_CANCELLED", "Booking Expired", "A session request expired because you didn't respond in time.", bookingDoc.id),
        ]);
    }
    console.log(`Auto-cancelled ${staleSnap.size} stale bookings.`);
});
// ─── Auto-Release Funds (COMPLETED > 24 hours, Member hasn't released) ────────
exports.autoReleaseCompletedBookings = (0, scheduler_1.onSchedule)("every 30 minutes", async () => {
    const cutoff = admin.firestore.Timestamp.fromDate(new Date(Date.now() - AUTO_RELEASE_HOURS * 60 * 60 * 1000));
    const completedSnap = await scopedCollection("bookings")
        .where("status", "==", "COMPLETED")
        .where("completedAt", "<", cutoff)
        .get();
    if (completedSnap.empty)
        return;
    for (const bookingDoc of completedSnap.docs) {
        const booking = bookingDoc.data();
        const totalAmount = booking.amountLocked;
        const platformFee = Math.floor(totalAmount * PLATFORM_COMMISSION);
        const consultantPayout = totalAmount - platformFee;
        await db.runTransaction(async (tx) => {
            var _a;
            const snap = await tx.get(bookingDoc.ref);
            if (((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.status) !== "COMPLETED")
                return; // Already processed
            // Deduct from member's escrow
            tx.update(scopedCollection("users").doc(booking.memberId), {
                "wallet.escrowBalance": firestore_2.FieldValue.increment(-totalAmount),
                updatedAt: firestore_2.FieldValue.serverTimestamp(),
            });
            // Credit consultant (85%)
            tx.update(scopedCollection("users").doc(booking.consultantId), {
                "wallet.availableBalance": firestore_2.FieldValue.increment(consultantPayout),
                updatedAt: firestore_2.FieldValue.serverTimestamp(),
            });
            // Credit platform (15%)
            tx.set(scopedCollection("platform").doc("wallet"), {
                totalCommissionEarned: firestore_2.FieldValue.increment(platformFee),
                updatedAt: firestore_2.FieldValue.serverTimestamp(),
            }, { merge: true });
            // Update booking
            tx.update(bookingDoc.ref, {
                status: "SETTLED",
                memberConfirmedComplete: true,
                settledAt: firestore_2.FieldValue.serverTimestamp(),
                updatedAt: firestore_2.FieldValue.serverTimestamp(),
                settledReason: "AUTO_RELEASED: Member did not confirm within 24h.",
                receipt: {
                    totalAmount,
                    platformFee,
                    consultantPayout,
                },
            });
            // Transactions
            const tx1Ref = scopedCollection("wallet_transactions").doc();
            tx.set(tx1Ref, {
                userId: booking.memberId,
                type: "ESCROW_RELEASE",
                amount: totalAmount,
                bookingId: bookingDoc.id,
                description: "Auto-released escrow after 24h",
                createdAt: firestore_2.FieldValue.serverTimestamp(),
            });
            const tx2Ref = scopedCollection("wallet_transactions").doc();
            tx.set(tx2Ref, {
                userId: booking.consultantId,
                type: "ESCROW_RELEASE",
                amount: consultantPayout,
                bookingId: bookingDoc.id,
                description: `Auto-payout 85% of ₦${totalAmount.toLocaleString()}`,
                createdAt: firestore_2.FieldValue.serverTimestamp(),
            });
            // Close chat
            if (booking.chatId) {
                tx.update(scopedCollection("chats").doc(booking.chatId), {
                    isActive: false,
                });
            }
        });
        await Promise.all([
            sendNotification(booking.consultantId, "FUNDS_RELEASED", "Funds Auto-Released!", `₦${consultantPayout.toLocaleString()} has been added to your wallet (auto-released after 24h).`, bookingDoc.id),
            sendNotification(booking.memberId, "BOOKING_SETTLED", "Session Auto-Settled", "Funds were auto-released to the consultant as you did not confirm within 24 hours.", bookingDoc.id),
        ]);
    }
    console.log(`Auto-released ${completedSnap.size} completed bookings.`);
});
// ─── Trigger: Aggregate Reviews After Write ───────────────────────────────────
exports.aggregateRatingsOnReviewCreate = (0, firestore_1.onDocumentCreated)("stores/{storeNs}/reviews/{reviewId}", async (event) => {
    var _a;
    const review = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!review)
        return;
    const storeNs = event.params.storeNs;
    const reviewedId = review.reviewedId;
    // Recalculate averageRating and totalReviews
    const reviewsSnap = await scopedCollectionFor(storeNs, "reviews")
        .where("reviewedId", "==", reviewedId)
        .get();
    const ratings = reviewsSnap.docs.map((d) => d.data().rating);
    const totalReviews = ratings.length;
    const averageRating = totalReviews > 0
        ? parseFloat((ratings.reduce((a, b) => a + b, 0) / totalReviews).toFixed(2))
        : 0;
    await scopedCollectionFor(storeNs, "profiles").doc(reviewedId).update({
        averageRating,
        totalReviews,
        updatedAt: firestore_2.FieldValue.serverTimestamp(),
    });
    console.log(`Updated ratings for ${reviewedId}: avg=${averageRating}, total=${totalReviews}`);
});
//# sourceMappingURL=index.js.map