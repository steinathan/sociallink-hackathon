"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getScopedCollectionRef, getScopedDocRef } from "@/lib/firebase";
import { Profile } from "@/types";

interface SessionProfiles {
  memberProfile: Profile | null;
  consultantProfile: Profile | null;
  loading: boolean;
}

/**
 * Subscribes to both the member's and consultant's Firestore profiles
 * in real-time so location, online status, etc. stay live during a session.
 */
export function useSessionProfiles(
  memberId: string | null,
  consultantId: string | null
): SessionProfiles {
  const [memberProfile, setMemberProfile] = useState<Profile | null>(null);
  const [consultantProfile, setConsultantProfile] = useState<Profile | null>(null);
  const [loadingMember, setLoadingMember] = useState(true);
  const [loadingConsultant, setLoadingConsultant] = useState(true);

  useEffect(() => {
    if (!memberId) { setLoadingMember(false); return; }
    const ref = getScopedDocRef(db, "profiles", memberId);
    const unsub = onSnapshot(ref, (snap) => {
      setMemberProfile(snap.exists() ? ({ uid: snap.id, ...snap.data() } as Profile) : null);
      setLoadingMember(false);
    });
    return () => unsub();
  }, [memberId]);

  useEffect(() => {
    if (!consultantId) { setLoadingConsultant(false); return; }
    const ref = getScopedDocRef(db, "profiles", consultantId);
    const unsub = onSnapshot(ref, (snap) => {
      setConsultantProfile(snap.exists() ? ({ uid: snap.id, ...snap.data() } as Profile) : null);
      setLoadingConsultant(false);
    });
    return () => unsub();
  }, [consultantId]);

  return {
    memberProfile,
    consultantProfile,
    loading: loadingMember || loadingConsultant,
  };
}
