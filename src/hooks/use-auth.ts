"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getScopedCollectionRef, getScopedDocRef } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth-store";
import { UserDocument } from "@/types";

export function useAuth() {
  const { firebaseUser, userDoc, isLoading, setFirebaseUser, setUserDoc, setLoading } =
    useAuthStore();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserDoc(null);
        setLoading(false);
        return;
      }

      // Real-time listener on user document
      const userRef = getScopedDocRef(db, "users", user.uid);
      const unsubDoc = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            setUserDoc({ uid: snap.id, ...snap.data() } as UserDocument);
          } else {
            setUserDoc(null);
          }
          setLoading(false);
        },
        () => {
          setLoading(false);
        }
      );

      return () => unsubDoc();
    });

    return () => unsubAuth();
  }, [setFirebaseUser, setUserDoc, setLoading]);

  return { firebaseUser, userDoc, isLoading };
}
