"use server";

import crypto from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb, adminCollection } from "@/lib/firebase-admin";
import {
  normalizeNigerianPhoneToE164,
  toBulkSmsNigeriaRecipient,
} from "@/lib/phone";

type ActionResult =
  | { success: true; message?: string; cooldownSeconds?: number; customToken?: string }
  | { success: false; error: string; cooldownSeconds?: number };

interface OtpChallengeDocument {
  phoneE164: string;
  codeHash: string;
  expiresAt: Timestamp;
  resendAvailableAt: Timestamp;
  lockedUntil: Timestamp | null;
  attemptCount: number;
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
}

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_LOCK_SECONDS = 15 * 60;

function getOtpSigningSecret(): string {
  const secret = process.env.OTP_SIGNING_SECRET;
  if (!secret) {
    throw new Error("OTP_SIGNING_SECRET is not configured.");
  }
  return secret;
}

function phoneHash(phoneE164: string): string {
  return crypto.createHash("sha256").update(phoneE164).digest("hex");
}

function otpHash(phoneE164: string, otp: string): string {
  const hmac = crypto.createHmac("sha256", getOtpSigningSecret());
  hmac.update(`${phoneE164}:${otp}`);
  return hmac.digest("hex");
}

function randomOtp(): string {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

function parseBulkSmsResponse(payload: unknown): { ok: boolean; error?: string } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid SMS provider response." };
  }

  const response = payload as {
    success?: unknown;
    status?: unknown;
    message?: unknown;
    error?: unknown;
  };

  const maybeSuccess = response.success;
  const status = typeof response.status === "string" ? response.status.toLowerCase() : "";
  const message = typeof response.message === "string" ? response.message : "";
  const error = typeof response.error === "string" ? response.error : "";

  const successByBoolean = maybeSuccess === true || maybeSuccess === "true" || maybeSuccess === 1;
  const successByStatus = status === "success" || status === "ok" || status === "sent";
  const successByMessage =
    message.toLowerCase().includes("message sent successfully") ||
    message.toLowerCase().includes("sent successfully");

  if (successByBoolean || successByStatus || successByMessage) {
    return { ok: true };
  }

  const failureMessage = message || error || "SMS provider rejected the request.";

  return { ok: false, error: failureMessage };
}

async function sendOtpWithBulkSmsNigeria(phoneE164: string, otp: string): Promise<void> {
  const apiToken = process.env.BULKSMSNIGERIA_API_TOKEN;
  if (!apiToken) {
    throw new Error("BULKSMSNIGERIA_API_TOKEN is not configured.");
  }

  const senderId = process.env.BULKSMSNIGERIA_SENDER_ID ?? "SocialLink";
  const message = `Your SocialLink is ${otp}.`;
  const baseUrl = process.env.BULKSMSNIGERIA_BASE_URL ?? "https://www.bulksmsnigeria.com/api/v2";

  const response = await fetch(`${baseUrl}/sms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      from: senderId,
      to: toBulkSmsNigeriaRecipient(phoneE164),
      body: message,
      gateway: "otp",
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  const parsed = parseBulkSmsResponse(payload);

  if (!response.ok || !parsed.ok) {
    throw new Error(parsed.error ?? `SMS request failed with status ${response.status}.`);
  }
}

export async function sendPhoneOtp(rawPhone: string): Promise<ActionResult> {
  let challengeDocId: string | null = null;
  try {
    const phoneE164 = normalizeNigerianPhoneToE164(rawPhone);
    if (!phoneE164) {
      return { success: false, error: "Enter a valid Nigerian phone number." };
    }

    const now = Timestamp.now();
    challengeDocId = phoneHash(phoneE164);
    const challengeRef = adminCollection("auth_otps").doc(challengeDocId);
    const otp = randomOtp();
    const codeHash = otpHash(phoneE164, otp);

    const txResult = await adminDb.runTransaction(async (tx) => {
      const existingSnap = await tx.get(challengeRef);
      if (existingSnap.exists) {
        const existing = existingSnap.data() as OtpChallengeDocument;
        const resendAtMillis = existing.resendAvailableAt.toMillis();
        const nowMillis = now.toMillis();
        if (nowMillis < resendAtMillis) {
          const cooldownSeconds = Math.max(
            1,
            Math.ceil((resendAtMillis - nowMillis) / 1000)
          );
          return { blocked: true as const, cooldownSeconds };
        }
      }

      tx.set(
        challengeRef,
        {
          phoneE164,
          codeHash,
          expiresAt: Timestamp.fromMillis(now.toMillis() + OTP_TTL_SECONDS * 1000),
          resendAvailableAt: Timestamp.fromMillis(
            now.toMillis() + RESEND_COOLDOWN_SECONDS * 1000
          ),
          lockedUntil: null,
          attemptCount: 0,
          createdAt: existingSnap.exists
            ? existingSnap.data()?.createdAt ?? FieldValue.serverTimestamp()
            : FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { blocked: false as const };
    });

    if (txResult.blocked) {
      return {
        success: false,
        error: `Please wait ${txResult.cooldownSeconds}s before requesting another code.`,
        cooldownSeconds: txResult.cooldownSeconds,
      };
    }

    await sendOtpWithBulkSmsNigeria(phoneE164, otp);

    return {
      success: true,
      message: "Verification code sent.",
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    };
  } catch (error) {
    if (challengeDocId) {
      await adminCollection("auth_otps").doc(challengeDocId).delete().catch(() => undefined);
    }
    const message =
      error instanceof Error ? error.message : "Failed to send verification code.";
    return { success: false, error: message };
  }
}

export async function verifyPhoneOtp(rawPhone: string, otp: string): Promise<ActionResult> {
  try {
    const phoneE164 = normalizeNigerianPhoneToE164(rawPhone);
    if (!phoneE164) {
      return { success: false, error: "Enter a valid Nigerian phone number." };
    }

    const sanitizedOtp = otp.replace(/\D/g, "");
    if (sanitizedOtp.length !== OTP_LENGTH) {
      return { success: false, error: "Enter the 6-digit code." };
    }

    const now = Timestamp.now();
    const challengeRef = adminCollection("auth_otps").doc(phoneHash(phoneE164));
    const identityRef = adminCollection("auth_phone_index").doc(phoneHash(phoneE164));
    const expectedHash = otpHash(phoneE164, sanitizedOtp);
    let existingAuthUid: string | null = null;

    try {
      const authUser = await adminAuth.getUserByPhoneNumber(phoneE164);
      existingAuthUid = authUser.uid;
    } catch (error) {
      const authError = error as { code?: string };
      if (authError.code !== "auth/user-not-found") {
        throw error;
      }
    }

    const { uid } = await adminDb.runTransaction(async (tx) => {
      const challengeSnap = await tx.get(challengeRef);
      if (!challengeSnap.exists) {
        throw new Error("Code session not found. Request a new code.");
      }

      const challenge = challengeSnap.data() as OtpChallengeDocument;
      if (challenge.phoneE164 !== phoneE164) {
        throw new Error("Verification session mismatch. Request a new code.");
      }

      if (challenge.lockedUntil && now.toMillis() < challenge.lockedUntil.toMillis()) {
        const remaining = Math.ceil(
          (challenge.lockedUntil.toMillis() - now.toMillis()) / 1000
        );
        throw new Error(`Too many failed attempts. Try again in ${remaining}s.`);
      }

      if (now.toMillis() > challenge.expiresAt.toMillis()) {
        tx.delete(challengeRef);
        throw new Error("Code expired. Request a new one.");
      }

      const validOtp =
        challenge.codeHash.length === expectedHash.length &&
        crypto.timingSafeEqual(
          Buffer.from(challenge.codeHash, "utf8"),
          Buffer.from(expectedHash, "utf8")
        );

      if (!validOtp) {
        const nextAttempts = challenge.attemptCount + 1;
        const reachedLimit = nextAttempts >= MAX_VERIFY_ATTEMPTS;
        tx.update(challengeRef, {
          attemptCount: nextAttempts,
          lockedUntil: reachedLimit
            ? Timestamp.fromMillis(now.toMillis() + VERIFY_LOCK_SECONDS * 1000)
            : null,
          updatedAt: FieldValue.serverTimestamp(),
        });

        if (reachedLimit) {
          throw new Error("Too many failed attempts. Request a new code later.");
        }
        throw new Error("Invalid verification code.");
      }

      const identitySnap = await tx.get(identityRef);
      let uid: string;

      if (identitySnap.exists) {
        uid = (identitySnap.data() as { uid: string }).uid;
      } else {
        uid = existingAuthUid ?? crypto.randomUUID();
        tx.set(identityRef, {
          uid,
          phoneE164,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      tx.delete(challengeRef);
      tx.set(
        identityRef,
        {
          uid,
          phoneE164,
          lastVerifiedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { uid };
    });

    // Keep auth user synchronized so existing UI reading currentUser.phoneNumber still works.
    try {
      await adminAuth.updateUser(uid, { phoneNumber: phoneE164 });
    } catch (error) {
      const authError = error as { code?: string };
      if (authError.code === "auth/user-not-found") {
        await adminAuth.createUser({
          uid,
          phoneNumber: phoneE164,
        });
      } else if (authError.code === "auth/phone-number-already-exists") {
        // If the phone is already bound elsewhere, fail closed.
        return {
          success: false,
          error: "This phone number is already linked to another account.",
        };
      } else {
        throw error;
      }
    }

    const customToken = await adminAuth.createCustomToken(uid, {
      phoneNumber: phoneE164,
    });

    return {
      success: true,
      customToken,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed.";
    return { success: false, error: message };
  }
}

// ─── Google sign-in ───────────────────────────────────────────────────────────
// Verifies a Google-issued Firebase ID token, upserts the user doc + profile,
// and returns whether the caller needs to set up a phone number later.
// No OTP roundtrip — phone is optional and can be added from /profile.
export interface GoogleSignInClaims {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export async function signInWithGoogle(
  idToken: string
): Promise<
  | { success: true; isNewUser: boolean; needsPhone: boolean; claims: GoogleSignInClaims }
  | { success: false; error: string }
> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const uid = decoded.uid;
    const providerId = decoded.firebase?.sign_in_provider;

    if (providerId !== "google.com") {
      return { success: false, error: "Unsupported sign-in provider." };
    }

    const email = typeof decoded.email === "string" ? decoded.email : null;
    const displayName =
      typeof decoded.name === "string" && decoded.name.trim().length > 0
        ? decoded.name.trim()
        : null;
    const photoURL =
      typeof decoded.picture === "string" && decoded.picture.trim().length > 0
        ? decoded.picture.trim()
        : null;

    const userRef = adminCollection("users").doc(uid);
    const profileRef = adminCollection("profiles").doc(uid);

    const userSnap = await userRef.get();
    const isNewUser = !userSnap.exists;

    await adminDb.runTransaction(async (tx) => {
      const fresh = await tx.get(userRef);
      if (!fresh.exists) {
        tx.set(
          userRef,
          {
            uid,
            phoneNumber: "",
            role: "MEMBER",
            authProvider: "google",
            email: email ?? "",
            wallet: {
              availableBalance: 0,
              escrowBalance: 0,
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        // Returning Google user — keep existing role/wallet, refresh profile bits.
        const patch: Record<string, unknown> = {
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (email && !fresh.data()?.email) patch.email = email;
        tx.update(userRef, patch);
      }
    });

    // Profile doc — first-touch with display name + Google avatar, never overwriting
    // curated choices the user has already made.
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      await profileRef.set({
        uid,
        displayName: displayName ?? (email ? email.split("@")[0] : ""),
        bio: "",
        services: [],
        themes: [],
        location: null,
        isOnline: true,
        averageRating: 0,
        totalReviews: 0,
        avatarUrl: photoURL ?? "",
        galleryUrls: [],
        authProvider: "google",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else if (photoURL && !profileSnap.data()?.avatarUrl) {
      await profileRef.update({
        avatarUrl: photoURL,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const finalUserSnap = await userRef.get();
    const phoneNumber =
      typeof finalUserSnap.data()?.phoneNumber === "string"
        ? (finalUserSnap.data()?.phoneNumber as string)
        : "";

    return {
      success: true,
      isNewUser,
      needsPhone: !phoneNumber,
      claims: {
        uid,
        email,
        displayName,
        photoURL,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Google sign-in failed.";
    return { success: false, error: message };
  }
}
