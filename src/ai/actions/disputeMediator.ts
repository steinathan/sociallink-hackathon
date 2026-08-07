"use server";

import { generateText, Output } from "ai";
import { keccak256, toBytes, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { adminCollection } from "@/lib/firebase-admin";
import { llm, DISPUTE_MEDIATOR_SYSTEM } from "@/ai/agent";
import { DisputeAnalysisSchema, type DisputeAnalysis } from "@/ai/schemas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bookingIdToBytes32(bookingId: string): Hex {
  // Canonical mapping per contracts/src/Escrow.sol: keccak256(bytes(bookingId)).
  return keccak256(toBytes(bookingId));
}

function splitBpsForWinner(
  winner: "member" | "consultant",
  analysis: DisputeAnalysis
): number {
  return winner === "member"
    ? analysis.recommendedSplit.memberBps
    : analysis.recommendedSplit.consultantBps;
}

// ─── Context assembly ─────────────────────────────────────────────────────────

export type DisputeContext = {
  bookingId: string;
  bookingSummary: {
    status: string;
    amountLocked: number;
    selectedServices: Array<{ id: string; title: string; price: number }>;
    memberId: string;
    consultantId: string;
  };
  chatExcerpts: Array<{ senderId: string; text?: string; imageUrl?: string; at: number }>;
  memberHistory: {
    totalBookings: number;
    completedBookings: number;
    disputedBookings: number;
    averageRating?: number;
  };
  consultantHistory: {
    totalBookings: number;
    completedBookings: number;
    disputedBookings: number;
    averageRating: number;
    totalReviews: number;
  };
  reportSummary: { reason: string; description: string; evidenceCount: number };
};

// ─── analyzeDispute ───────────────────────────────────────────────────────────

export async function analyzeDispute(
  bookingId: string
): Promise<{ analysis: DisputeAnalysis; context: DisputeContext }> {
  const bookingSnap = await adminCollection("bookings").doc(bookingId).get();
  if (!bookingSnap.exists) throw new Error("Booking not found");
  const booking = bookingSnap.data()!;

  const memberId = booking.memberId as string;
  const consultantId = booking.consultantId as string;
  const chatId = booking.chatId as string | undefined;

  const [chatMsgsSnap, reportSnap, memberBookingsSnap, consultantBookingsSnap] =
    await Promise.all([
      chatId
        ? adminCollection("chats").doc(chatId).collection("messages").orderBy("createdAt", "asc").limit(200).get()
        : Promise.resolve({ docs: [] } as { docs: Array<{ data: () => unknown }> }),
      adminCollection("reports").where("bookingId", "==", bookingId).limit(1).get(),
      adminCollection("bookings").where("memberId", "==", memberId).get(),
      adminCollection("bookings").where("consultantId", "==", consultantId).get(),
    ]);

  const chatExcerpts = chatMsgsSnap.docs.map((d) => {
    const m = d.data() as { senderId: string; text?: string; imageUrl?: string; createdAt?: { toMillis?: () => number } };
    return {
      senderId: m.senderId,
      text: m.text,
      imageUrl: m.imageUrl,
      at: m.createdAt?.toMillis?.() ?? 0,
    };
  });

  const memberBookings = memberBookingsSnap.docs.map((d) => d.data() as { status?: string });
  const consultantBookings = consultantBookingsSnap.docs.map((d) => d.data() as { status?: string });

  const memberHistory = {
    totalBookings: memberBookings.length,
    completedBookings: memberBookings.filter((b) => b.status === "COMPLETED" || b.status === "SETTLED").length,
    disputedBookings: memberBookings.filter((b) => b.status === "DISPUTED").length,
  };

  const consultantProfileSnap = await adminCollection("profiles").doc(consultantId).get();
  const consultantProfile = consultantProfileSnap.data() as
    | { averageRating?: number; totalReviews?: number }
    | undefined;
  const consultantHistory = {
    totalBookings: consultantBookings.length,
    completedBookings: consultantBookings.filter((b) => b.status === "COMPLETED" || b.status === "SETTLED").length,
    disputedBookings: consultantBookings.filter((b) => b.status === "DISPUTED").length,
    averageRating: consultantProfile?.averageRating ?? 0,
    totalReviews: consultantProfile?.totalReviews ?? 0,
  };

  const report = reportSnap.docs[0]?.data() as
    | { reason?: string; detailedDescription?: string; evidenceUrls?: string[] }
    | undefined;

  const context: DisputeContext = {
    bookingId,
    bookingSummary: {
      status: booking.status as string,
      amountLocked: booking.amountLocked as number,
      selectedServices: (booking.selectedServices as Array<{ id: string; title: string; price: number }>) ?? [],
      memberId,
      consultantId,
    },
    chatExcerpts,
    memberHistory,
    consultantHistory,
    reportSummary: {
      reason: report?.reason ?? "UNKNOWN",
      description: report?.detailedDescription ?? "(no description)",
      evidenceCount: report?.evidenceUrls?.length ?? 0,
    },
  };

  const chatDump = chatExcerpts
    .map((m) => {
      const who = m.senderId === memberId ? "MEMBER" : m.senderId === consultantId ? "CONSULTANT" : m.senderId;
      return `[${who}]${m.text ? `: ${m.text}` : m.imageUrl ? " (image)" : ""}`;
    })
    .join("\n");

  const userPrompt = `Booking ${bookingId} (status: ${context.bookingSummary.status}, amount locked: ₦${context.bookingSummary.amountLocked.toLocaleString()})

Services: ${context.bookingSummary.selectedServices.map((s) => s.title).join(", ") || "(none)"}

Report reason: ${context.reportSummary.reason}
Report description: ${context.reportSummary.description}
Evidence files: ${context.reportSummary.evidenceCount}

Chat transcript (${chatExcerpts.length} messages):
${chatDump || "(no chat yet)"}

Member history: ${memberHistory.totalBookings} bookings, ${memberHistory.completedBookings} completed, ${memberHistory.disputedBookings} previously disputed.
Consultant history: ${consultantHistory.totalBookings} bookings, ${consultantHistory.completedBookings} completed, ${consultantHistory.disputedBookings} previously disputed, rating ${consultantHistory.averageRating.toFixed(1)} (${consultantHistory.totalReviews} reviews).

Recommend a fair refund split.`;

  const { output } = await generateText({
    model: llm,
    system: DISPUTE_MEDIATOR_SYSTEM,
    prompt: userPrompt,
    output: Output.object({
      schema: DisputeAnalysisSchema,
      name: "dispute_analysis",
      description: "AI dispute mediator recommendation",
    }),
  });

  if (!output) throw new Error("AI produced no structured output");
  return { analysis: output as DisputeAnalysis, context };
}

// ─── signResolution ───────────────────────────────────────────────────────────

export type SignedResolution = {
  domain: {
    name: "SocialLinkEscrow";
    version: "1";
    chainId: 195;
    verifyingContract: Address;
  };
  types: {
    ResolveDispute: Array<{ name: string; type: string }>;
  };
  primaryType: "ResolveDispute";
  message: { bookingId: Hex; winner: Address; splitBps: number };
  signature: Hex;
  winner: "member" | "consultant";
};

/**
 * Build an EIP-712 typed-data payload for Escrow.resolveDispute and sign it
 * server-side with AI_RESOLVER_PRIVATE_KEY. Returns the signed payload only —
 * does NOT broadcast. The Tier-3 broadcast step is wired separately.
 *
 * chainId=195 binds this signature to X Layer testnet; replay on chain 196
 * (mainnet) or any other chain will fail EIP-712 domain check.
 */
export async function signResolution(
  bookingId: string,
  memberBps: number,
  consultantBps: number
): Promise<SignedResolution> {
  if (memberBps + consultantBps !== 10000) {
    throw new Error(`Invalid split: memberBps (${memberBps}) + consultantBps (${consultantBps}) must equal 10000`);
  }
  if (memberBps < 0 || consultantBps < 0 || memberBps > 10000 || consultantBps > 10000) {
    throw new Error("Split bps out of range");
  }

  const bookingSnap = await adminCollection("bookings").doc(bookingId).get();
  if (!bookingSnap.exists) throw new Error("Booking not found");
  const booking = bookingSnap.data()!;

  const [memberUserSnap, consultantUserSnap] = await Promise.all([
    adminCollection("users").doc(booking.memberId as string).get(),
    adminCollection("users").doc(booking.consultantId as string).get(),
  ]);
  const memberWallet = (memberUserSnap.data() as { primaryWalletAddress?: Address } | undefined)?.primaryWalletAddress;
  const consultantWallet = (consultantUserSnap.data() as { primaryWalletAddress?: Address } | undefined)?.primaryWalletAddress;
  if (!memberWallet || !consultantWallet) {
    throw new Error("Booking parties have no linked OKX Wallet — cannot sign on X Layer");
  }

  const winner: "member" | "consultant" =
    memberBps >= consultantBps ? "member" : "consultant";
  const splitBps = splitBpsForWinner(winner, {
    summary: "",
    confidence: 0,
    reasoning: "",
    recommendedSplit: { memberBps, consultantBps },
  });

  const privateKey = process.env.AI_RESOLVER_PRIVATE_KEY as Hex | undefined;
  if (!privateKey) {
    throw new Error("AI_RESOLVER_PRIVATE_KEY is not configured");
  }

  const escrowAddress = process.env.ESCROW_CONTRACT_ADDRESS as Address | undefined;
  if (!escrowAddress) {
    throw new Error("ESCROW_CONTRACT_ADDRESS is not configured");
  }

  const account = privateKeyToAccount(privateKey);

  const domain = {
    name: "SocialLinkEscrow" as const,
    version: "1" as const,
    chainId: 195 as const,
    verifyingContract: escrowAddress,
  };

  const types = {
    ResolveDispute: [
      { name: "bookingId", type: "bytes32" },
      { name: "winner", type: "address" },
      { name: "splitBps", type: "uint16" },
    ],
  };

  const message = {
    bookingId: bookingIdToBytes32(bookingId),
    winner: winner === "member" ? memberWallet : consultantWallet,
    splitBps,
  };

  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: "ResolveDispute",
    message,
  });

  return { domain, types, primaryType: "ResolveDispute", message, signature, winner };
}

// ─── broadcastResolution (Tier-3 stub) ────────────────────────────────────────

/**
 * Tier-2 ships analyzeDispute + signResolution. This wrapper returns the signed
 * payload unchanged so callers can preview it; a future Tier-3 broadcast step
 * will submit it to Escrow.resolveDispute on X Layer.
 *
 * ponytail: real broadcast deferred — the AI agent should NEVER submit txs
 * autonomously. Add when a relay with an admin-key signer is wired.
 */
export async function broadcastResolution(
  bookingId: string,
  memberBps: number,
  consultantBps: number
): Promise<SignedResolution> {
  return signResolution(bookingId, memberBps, consultantBps);
}

// ─── AI_RESOLVER_PUBLIC utility ────────────────────────────────────────────────

/** Returns the public address corresponding to AI_RESOLVER_PRIVATE_KEY. */
export async function getAiResolverAddress(): Promise<Address | null> {
  const privateKey = process.env.AI_RESOLVER_PRIVATE_KEY as Hex | undefined;
  if (!privateKey) return null;
  return privateKeyToAccount(privateKey).address;
}

export { };
