"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getScopedCollectionRef, getScopedDocRef } from "@/lib/firebase";
import { Booking } from "@/types";

export function useBookingListener(bookingId: string | null) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    const bookingRef = getScopedDocRef(db, "bookings", bookingId);

    const unsub = onSnapshot(
      bookingRef,
      (snap) => {
        if (snap.exists()) {
          setBooking({ bookingId: snap.id, ...snap.data() } as Booking);
        } else {
          setBooking(null);
          setError("Booking not found.");
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [bookingId]);

  return { booking, loading, error };
}
