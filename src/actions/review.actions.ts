"use server";

import { adminDb, adminAuth, adminCollection } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// ─── Submit Review ─────────────────────────────────────────────────────────
export async function submitReview(
  idToken: string,
  bookingId: string,
  rating: number,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (rating < 1 || rating > 5) {
      return { success: false, error: "Rating must be between 1 and 5." };
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const reviewerId = decoded.uid;

    const bookingDoc = await adminCollection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      return { success: false, error: "Booking not found." };
    }

    const booking = bookingDoc.data()!;

    if (booking.memberId !== reviewerId && booking.consultantId !== reviewerId) {
      return { success: false, error: "Unauthorized." };
    }

    if (booking.status !== "SETTLED") {
      return { success: false, error: "You can only review settled sessions." };
    }

    const reviewedId =
      booking.memberId === reviewerId
        ? booking.consultantId
        : booking.memberId;

    // Idempotency: check if reviewer already reviewed this booking
    const existing = await adminCollection("reviews")
      .where("bookingId", "==", bookingId)
      .where("reviewerId", "==", reviewerId)
      .get();

    if (!existing.empty) {
      return { success: false, error: "You have already reviewed this session." };
    }

    await adminCollection("reviews").add({
      bookingId,
      reviewerId,
      reviewedId,
      rating,
      comment: comment?.trim() ?? "",
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Review failed.";
    return { success: false, error: message };
  }
}
