"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminCollection, adminDb } from "@/lib/firebase-admin";

// ─── SIWE (EIP-4361) — Sign-In With OKX Wallet on X Layer testnet ─────────────
// Parallel to phone + Google flows. The wallet address (lowercased) is the user
// uid — every wallet-linked user gets a Firebase Auth account regardless.

const WALLET_NONCE_TTL_SECONDS = 10 * 60; // 10 min
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const X_LAYER_TESTNET_CHAIN_ID = 195;

export interface WalletNonce {
  nonce: string;
  issuedAt: string;
  expiresAt: string;
}

export interface WalletSignInResult {
  success: true;
  customToken: string;
  isNewUser: boolean;
  needsPhone: boolean;
}

export interface WalletSignInError {
  success: false;
  error: string;
}

// ─── Nonce issuance ──────────────────────────────────────────────────────────
export async function getWalletNonce(rawAddress: string): Promise<WalletNonce> {
  if (!ADDRESS_REGEX.test(rawAddress)) {
    throw new Error("Invalid wallet address.");
  }

  const address = rawAddress.toLowerCase();
  const now = Date.now();
  const nonce = crypto
    .randomBytes(16)
    .toString("base64url")
    .replace(/[-_]/g, "0")
    .slice(0, 17);
  const issuedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + WALLET_NONCE_TTL_SECONDS * 1000).toISOString();

  await adminCollection("auth_wallet_nonces").doc(address).set(
    {
      address,
      nonce,
      issuedAt: new Date(now),
      expiresAt: new Date(now + WALLET_NONCE_TTL_SECONDS * 1000),
    },
    { merge: true }
  );

  return { nonce, issuedAt, expiresAt };
}

// ─── Signature verification (low-level; also called from signInWithWallet) ────
export interface VerifyWalletArgs {
  address: string;
  message: string;
  signature: string;
}

export async function verifyWalletSignature({
  address,
  message,
  signature,
}: VerifyWalletArgs): Promise<{ success: true; fields: ReturnType<SiweMessage["toMessage"]> }> {
  if (!ADDRESS_REGEX.test(address)) {
    throw new Error("Invalid wallet address.");
  }

  const siweMessage = new SiweMessage(message);
  const lowerAddress = address.toLowerCase();
  const nonceRef = adminCollection("auth_wallet_nonces").doc(lowerAddress);
  const nonceSnap = await nonceRef.get();

  if (!nonceSnap.exists) {
    throw new Error("Nonce not found. Request a new one.");
  }

  const stored = nonceSnap.data() as {
    nonce: string;
    expiresAt: { toMillis: () => number } | Date;
  };
  const expiresAtMs =
    stored.expiresAt instanceof Date
      ? stored.expiresAt.getTime()
      : stored.expiresAt.toMillis();

  if (Date.now() > expiresAtMs) {
    await nonceRef.delete().catch(() => undefined);
    throw new Error("Nonce expired, please try again.");
  }

  if (siweMessage.nonce !== stored.nonce) {
    throw new Error("Nonce mismatch.");
  }

  if (siweMessage.chainId !== X_LAYER_TESTNET_CHAIN_ID) {
    throw new Error("Wrong chain. Connect to X Layer testnet (chain 195).");
  }

  if (siweMessage.address.toLowerCase() !== lowerAddress) {
    throw new Error("Address mismatch.");
  }

  const valid = await siweMessage.verify({ signature, nonce: stored.nonce });
  if (!valid) {
    throw new Error("Invalid signature.");
  }

  // Single-use: burn the nonce doc so it can't be replayed.
  await nonceRef.delete().catch(() => undefined);

  return { success: true, fields: siweMessage.toMessage() };
}

// ─── Sign-in: verify, upsert user, issue Firebase custom token ────────────────
export async function signInWithWallet(
  args: VerifyWalletArgs
): Promise<WalletSignInResult | WalletSignInError> {
  try {
    await verifyWalletSignature(args);

    const uid = args.address.toLowerCase();
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
            role: "MEMBER",
            authProvider: "wallet",
            primaryWalletAddress: uid as `0x${string}`,
            walletLinkedAt: FieldValue.serverTimestamp(),
            wallet: {
              availableBalance: 0,
              escrowBalance: 0,
              cryptoAddress: uid as `0x${string}`,
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        tx.update(userRef, {
          primaryWalletAddress: uid as `0x${string}`,
          walletLinkedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      await profileRef.set({
        uid,
        displayName: `${uid.slice(0, 6)}…${uid.slice(-4)}`,
        bio: "",
        services: [],
        themes: [],
        location: null,
        isOnline: true,
        averageRating: 0,
        totalReviews: 0,
        avatarUrl: "",
        galleryUrls: [],
        authProvider: "wallet",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Ensure the Firebase Auth user exists with the wallet address as uid.
    try {
      await adminAuth.getUser(uid);
    } catch (error) {
      const authError = error as { code?: string };
      if (authError.code === "auth/user-not-found") {
        await adminAuth.createUser({ uid });
      } else {
        throw error;
      }
    }

    const customToken = await adminAuth.createCustomToken(uid, {
      walletAddress: uid,
    });

    // Also surface the same cookie surface as phone/Google so /api/auth/verify-session
    // accepts the user before the client has finished exchanging the custom token.
    const expiresIn = 60 * 60 * 24 * 14 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(customToken, {
      expiresIn,
    }).catch(() => null);
    if (sessionCookie) {
      const cookieStore = await cookies();
      cookieStore.set("__session", sessionCookie, {
        maxAge: expiresIn / 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
      });
    }

    const finalUserSnap = await userRef.get();
    const phoneNumber =
      typeof finalUserSnap.data()?.phoneNumber === "string"
        ? (finalUserSnap.data()?.phoneNumber as string)
        : "";

    return {
      success: true,
      customToken,
      isNewUser,
      needsPhone: !phoneNumber,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Wallet sign-in failed.",
    };
  }
}

// ─── Link a wallet to an already-authenticated Firebase user ──────────────────
export async function linkWalletToExistingAccount({
  idToken,
  address,
}: {
  idToken: string;
  address: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  if (!ADDRESS_REGEX.test(address)) {
    return { success: false, error: "Invalid wallet address." };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const uid = decoded.uid;
    const lowerAddress = address.toLowerCase() as `0x${string}`;

    await adminCollection("users").doc(uid).update({
      primaryWalletAddress: lowerAddress,
      walletLinkedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not link wallet.",
    };
  }
}