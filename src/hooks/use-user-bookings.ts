"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getScopedCollectionRef, getScopedDocRef } from "@/lib/firebase";
import { Booking } from "@/types";
import { useAuthStore } from "@/store/auth-store";

export function useUserBookings() {
  const { firebaseUser, userDoc } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser?.uid || !userDoc?.role) {
      setLoading(false);
      return;
    }

    const field = userDoc.role === "MEMBER" ? "memberId" : "consultantId";
    const bookingsRef = getScopedCollectionRef(db, "bookings");
    const q = query(
      bookingsRef,
      where(field, "==", firebaseUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const b = snap.docs.map((d) => ({ bookingId: d.id, ...d.data() } as Booking));
      setBookings(b);
      setLoading(false);
    });

    return () => unsub();
  }, [firebaseUser?.uid, userDoc?.role]);

  const pendingCount = bookings.filter((b) => b.status === "REQUESTED").length;
  const activeCount = bookings.filter((b) => b.status === "ACCEPTED" || b.status === "ACTIVE").length;

  return { bookings, pendingCount, activeCount, loading };
}
