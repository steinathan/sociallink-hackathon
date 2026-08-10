"use server";

import { adminDb, adminAuth, adminCollection } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { UserRole } from "@/types";
import { cookies } from "next/headers";
import { normalizeNigerianPhoneToE164 } from "@/lib/phone";

// ─── Create User Document ─────────────────────────────────────────────────────
export async function createUserDocument(
  idToken: string,
  role: UserRole,
  phoneNumber: string,
  profileData?: {
    displayName: string;
    bio: string;
    themes: string[];
    services?: Array<{
      id?: string;
      title?: string;
      description?: string;
      price: number;
    }>;
    gender?: string;
    sexualOrientation?: string;
    country?: string;
    state?: string;
    city?: string;
    bodyBuild?: string;
    smoking?: boolean;
    dateOfBirth?: string;
    blurAvatar?: boolean;
    galleryUrls?: string[];
    isOnline?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  console.log("[createUserDocument] START", { role, phoneNumber });
  try {
    console.log("[createUserDocument] Verifying ID token...");
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    console.log("[createUserDocument] Token verified. UID:", uid);

    console.log("[createUserDocument] Fetching user document...");
    const userRef = adminCollection("users").doc(uid);
    const existing = await userRef.get();
    console.log("[createUserDocument] Existing check complete. Exists:", existing.exists);

    const fallbackPhoneNumber = phoneNumber?.trim();
    let resolvedPhoneNumber = fallbackPhoneNumber;

    if (!resolvedPhoneNumber) {
      try {
        const authUser = await adminAuth.getUser(uid);
        resolvedPhoneNumber = authUser.phoneNumber ?? "";
      } catch (authErr) {
        console.warn("[createUserDocument] Could not resolve phone number from auth:", authErr);
      }
    }

    if (existing.exists) {
      // Returning user landing in /onboarding — Google and wallet sign-ins
      // pre-create the user doc, so onboarding lands here for first-time
      // setup. Update role + profile fields instead of silently no-op'ing,
      // otherwise the user's onboarding choices never persist.
      await adminDb.runTransaction(async (tx) => {
        const profileRef = adminCollection("profiles").doc(uid);

        const userPatch: Record<string, unknown> = {
          role,
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (resolvedPhoneNumber) userPatch.phoneNumber = resolvedPhoneNumber;
        tx.update(userRef, userPatch);

        const profilePatch: Record<string, unknown> = {
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (profileData?.displayName) profilePatch.displayName = profileData.displayName;
        if (profileData?.bio !== undefined) profilePatch.bio = profileData.bio;
        if (profileData?.themes) profilePatch.themes = profileData.themes;
        if (profileData?.services) profilePatch.services = profileData.services;
        if (profileData?.gender) profilePatch.gender = profileData.gender;
        if (profileData?.sexualOrientation) profilePatch.sexualOrientation = profileData.sexualOrientation;
        if (profileData?.country) profilePatch.country = profileData.country;
        if (profileData?.state) profilePatch.state = profileData.state;
        if (profileData?.city) profilePatch.city = profileData.city;
        if (profileData?.bodyBuild) profilePatch.bodyBuild = profileData.bodyBuild;
        if (profileData?.dateOfBirth) profilePatch.dateOfBirth = profileData.dateOfBirth;
        if (typeof profileData?.smoking === "boolean") profilePatch.smoking = profileData.smoking;
        if (profileData?.services?.[0]?.price) profilePatch.retainer = profileData.services[0].price;
        tx.update(profileRef, profilePatch);
      });

      return { success: true };
    }

    console.log("[createUserDocument] Setting user document...");
    await userRef.set({
      uid,
      phoneNumber: resolvedPhoneNumber ?? "",
      role,
      wallet: role === "MEMBER" ? {
        availableBalance: 0,
        escrowBalance: 0,
      } : {
        availableBalance: 0,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log("[createUserDocument] Setting profile document...");
    await adminCollection("profiles").doc(uid).set({
      uid,
      displayName: profileData?.displayName || "",
      bio: profileData?.bio || "",
      gender: profileData?.gender || "",
      sexualOrientation: profileData?.sexualOrientation || "",
      country: profileData?.country || "Nigeria",
      state: profileData?.state || "",
      city: profileData?.city || "",
      bodyBuild: profileData?.bodyBuild || "",
      smoking: profileData?.smoking || false,
      dateOfBirth: profileData?.dateOfBirth || "",
      retainer: profileData?.services?.[0]?.price || 0, // Fallback
      services: profileData?.services || [],
      themes: profileData?.themes || [],
      location: null,
      locationLabel: "",
      isOnline: role === "CONSULTANT", // Default to true for consultants
      avatarUrl: "",
      blurAvatar: false,
      galleryUrls: [],
      averageRating: 0,
      totalReviews: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log("[createUserDocument] SUCCESS");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[createUserDocument] FATAL ERROR:", message);
    return { success: false, error: message };
  }
}

// ─── Verify Session Cookie ────────────────────────────────────────────────────
export async function createSessionCookie(
  idToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    const cookieStore = await cookies();
    cookieStore.set("__session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ─── Revoke Session Cookie ─────────────────────────────────────────────────────
export async function revokeSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session");
  if (session?.value) {
    try {
      await adminAuth.verifySessionCookie(session.value, true);
    } catch {
      // Ignore
    }
  }
  cookieStore.delete("__session");
}

// ─── Update Profile ────────────────────────────────────────────────────────────
export async function updateProfile(
  idToken: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const updateData: Record<string, unknown> = { ...data };
    updateData.updatedAt = FieldValue.serverTimestamp();

    await adminCollection("profiles").doc(uid).update(updateData);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ─── Add Phone Later (Google users) ───────────────────────────────────────────
// No OTP roundtrip — Google has already verified the identity. We just persist
// the number on the user doc. The profile displays it as `phoneNumber` going
// forward. Existing phone-OTP users can also update their number here.
export async function addPhoneNumber(
  idToken: string,
  rawPhone: string
): Promise<{ success: boolean; phoneE164?: string; error?: string }> {
  try {
    const phoneE164 = normalizeNigerianPhoneToE164(rawPhone);
    if (!phoneE164) {
      return { success: false, error: "Enter a valid Nigerian phone number." };
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    await adminCollection("users").doc(uid).update({
      phoneNumber: phoneE164,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Reflect on Firebase Auth so existing UI that reads currentUser.phoneNumber works.
    try {
      await adminAuth.updateUser(uid, { phoneNumber: phoneE164 });
    } catch (error) {
      const authError = error as { code?: string };
      if (authError.code === "auth/phone-number-already-exists") {
        return {
          success: false,
          error: "That phone number is already linked to another account.",
        };
      }
      if (authError.code !== "auth/user-not-found") throw error;
    }

    return { success: true, phoneE164 };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save phone.";
    return { success: false, error: message };
  }
}
