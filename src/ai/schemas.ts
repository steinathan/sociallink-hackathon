import { z } from "zod";

// ─── Dispute Mediator ─────────────────────────────────────────────────────────

export const DisputeAnalysisSchema = z.object({
  summary: z
    .string()
    .describe("2-3 sentence summary of what happened based on chat history and reports"),
  recommendedSplit: z
    .object({
      memberBps: z.number().min(0).max(10000),
      consultantBps: z.number().min(0).max(10000),
    })
    .describe(
      "Refund split in basis points; memberBps + consultantBps MUST equal 10000. memberBps = share to Member; consultantBps = share to Consultant."
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("0-1 confidence in this recommendation"),
  reasoning: z
    .string()
    .describe("Detailed reasoning citing chat evidence and policy"),
});

export type DisputeAnalysis = z.infer<typeof DisputeAnalysisSchema>;

// ─── Booking Assistant ────────────────────────────────────────────────────────

export const BookingIntentSchema = z.object({
  serviceType: z.string().describe("Type of session requested, e.g. 'dinner companion'"),
  location: z.string().describe("City or area, e.g. 'Lagos'"),
  dateTime: z
    .string()
    .describe("ISO 8601 datetime; if the user gave a relative date, resolve to absolute"),
  budgetUsdc: z
    .number()
    .positive()
    .describe("Budget in USDC (approx USD). Convert from NGN at ~1600 NGN/USD if needed."),
  preferences: z
    .array(z.string())
    .default([])
    .describe("Free-form preferences like 'quiet', 'outdoor', 'vegetarian'"),
  notes: z.string().optional().describe("Optional additional context"),
});

export type BookingIntent = z.infer<typeof BookingIntentSchema>;

export const ProviderMatchSchema = z.object({
  providerId: z.string(),
  displayName: z.string(),
  matchScore: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type ProviderMatch = z.infer<typeof ProviderMatchSchema>;
