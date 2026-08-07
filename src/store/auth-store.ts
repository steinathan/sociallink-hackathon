"use client";

import { create } from "zustand";
import { User } from "firebase/auth";
import { UserDocument } from "@/types";

interface AuthState {
  firebaseUser: User | null;
  userDoc: UserDocument | null;
  isLoading: boolean;
  setFirebaseUser: (user: User | null) => void;
  setUserDoc: (doc: UserDocument | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  userDoc: null,
  isLoading: true,
  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setUserDoc: (doc) => set({ userDoc: doc }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () =>
    set({ firebaseUser: null, userDoc: null, isLoading: false }),
}));
