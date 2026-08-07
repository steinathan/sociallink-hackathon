"use server";

import { generateText, streamText, tool, Output, stepCountIs } from "ai";
import { z } from "zod";
import { adminCollection } from "@/lib/firebase-admin";
import { llm, BOOKING_ASSISTANT_SYSTEM } from "@/ai/agent";
import {
  BookingIntentSchema,
  ProviderMatchSchema,
  type BookingIntent,
  type ProviderMatch,
} from "@/ai/schemas";

// ─── parseBookingIntent ───────────────────────────────────────────────────────

export async function parseBookingIntent(
  message: string,
  userId?: string
): Promise<BookingIntent> {
  const { output } = await generateText({
    model: llm,
    system: BOOKING_ASSISTANT_SYSTEM,
    prompt: `Member (uid: ${userId ?? "anonymous"}) says: "${message}"

Extract the structured booking intent. Resolve relative dates (e.g. "Friday") to absolute ISO 8601 using today's date as the anchor.`,
    output: Output.object({
      schema: BookingIntentSchema,
      name: "booking_intent",
      description: "Structured booking intent extracted from natural language",
    }),
  });
  if (!output) throw new Error("AI produced no structured intent");
  return output as BookingIntent;
}

// ─── recommendProviders ───────────────────────────────────────────────────────

async function fetchProfilesServer(limit = 50): Promise<
  Array<{
    uid: string;
    displayName: string;
    city?: string;
    services: Array<{ id: string; title: string; price: number }>;
    themes: string[];
    averageRating: number;
    totalReviews: number;
    isOnline: boolean;
  }>
> {
  const snap = await adminCollection("profiles").limit(limit).get();
  return snap.docs.map((d) => {
    const p = d.data() as Record<string, unknown>;
    return {
      uid: d.id,
      displayName: (p.displayName as string) ?? "Anonymous",
      city: p.city as string | undefined,
      services: (p.services as Array<{ id: string; title: string; price: number }>) ?? [],
      themes: (p.themes as string[]) ?? [],
      averageRating: (p.averageRating as number) ?? 0,
      totalReviews: (p.totalReviews as number) ?? 0,
      isOnline: Boolean(p.isOnline),
    };
  });
}

function scoreProvider(
  p: Awaited<ReturnType<typeof fetchProfilesServer>>[number],
  intent: BookingIntent
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Theme overlap (free text → case-insensitive substring)
  const intentWords = [intent.serviceType, intent.location, ...(intent.preferences ?? [])]
    .join(" ")
    .toLowerCase();
  const themeHits = p.themes.filter((t) => intentWords.includes(t.toLowerCase()));
  if (themeHits.length > 0) {
    score += 0.35 + 0.1 * Math.min(themeHits.length, 3);
    reasons.push(`matches theme(s): ${themeHits.join(", ")}`);
  }

  // Location match
  if (p.city && intent.location && p.city.toLowerCase().includes(intent.location.toLowerCase())) {
    score += 0.25;
    reasons.push(`based in ${p.city}`);
  }

  // Service title keyword match
  const serviceHits = p.services.filter((s) =>
    intentWords.includes(s.title.toLowerCase())
  );
  if (serviceHits.length > 0) {
    score += 0.2;
    reasons.push(`offers: ${serviceHits.map((s) => s.title).join(", ")}`);
  }

  // Rating + reviews (small weight)
  if (p.totalReviews > 0) {
    score += Math.min(0.15, (p.averageRating / 5) * 0.1 + Math.min(p.totalReviews / 50, 1) * 0.05);
    reasons.push(`${p.averageRating.toFixed(1)}★ from ${p.totalReviews} reviews`);
  } else {
    score += 0.02;
  }

  if (p.isOnline) {
    score += 0.03;
    reasons.push("online now");
  }

  return { score: Math.min(score, 1), reasons };
}

export async function recommendProviders(
  intent: BookingIntent,
  userId?: string,
  limit = 5
): Promise<ProviderMatch[]> {
  const profiles = await fetchProfilesServer();
  const ranked = profiles
    .map((p) => {
      const { score, reasons } = scoreProvider(p, intent);
      return { providerId: p.uid, displayName: p.displayName, matchScore: score, reasoning: reasons.join("; ") };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  // Validate shape before returning — cheap safety net
  return ranked.map((r) => ProviderMatchSchema.parse(r));
}

// ─── chat (streamed) ──────────────────────────────────────────────────────────

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

/**
 * Server-streaming chat for useChat(). The model can call parseBookingIntent and
 * recommendProviders tools; results stream back to the client via UIMessage chunks.
 */
export async function chat({
  messages,
  userId,
}: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  userId?: string;
}) {
  return streamText({
    model: llm,
    system: `${BOOKING_ASSISTANT_SYSTEM}\nMember uid: ${userId ?? "anonymous"}`,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    tools: {
      parseBookingIntent: tool({
        description:
          "Extract a structured BookingIntent from the member's natural-language request",
        inputSchema: z.object({
          message: z.string().describe("The user's natural-language request"),
        }),
        execute: async ({ message }) => parseBookingIntent(message, userId),
      }),
      recommendProviders: tool({
        description:
          "Given a BookingIntent, recommend up to N Consultants (uid, displayName, matchScore 0-1, reasoning)",
        inputSchema: z.object({
          intent: BookingIntentSchema,
          limit: z.number().int().min(1).max(10).default(5),
        }),
        execute: async ({ intent, limit }) => recommendProviders(intent, userId, limit),
      }),
    },
    stopWhen: stepCountIs(5),
  });
}
