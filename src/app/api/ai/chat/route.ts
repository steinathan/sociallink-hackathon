import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { chat as chatStream } from "@/ai/actions/bookingAssistant";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ai/chat
 * Body: { messages: UIMessage[], userId?: string }
 * Returns: a UIMessage stream the client can consume via useChat().
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { messages?: UIMessage[]; userId?: string };
  const uiMessages = body.messages ?? [];

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      try {
        const result = await chatStream({
          messages: uiMessages.map((m) => ({
            role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
            content: extractText(m),
          })),
          userId: body.userId,
        });
        writer.merge(
          result.toUIMessageStream({ originalMessages: uiMessages })
        );
      } catch (err) {
        // Surface the real error instead of "An error occurred." default.
        // The AI SDK writes {type:"error", errorText: ...} to the UIMessage
        // stream when onError in createUIMessageStream is invoked.
        const message = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.error("[api/ai/chat] streamText failed:", message);
        throw err;
      }
    },
    onError: (err) => {
      // Forward the error message into the UIMessage stream error event
      // so the client renders the actual cause instead of the generic default.
      const message = err instanceof Error ? err.message : String(err);
      return `AI stream failed: ${message}`;
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function extractText(m: UIMessage): string {
  const parts = (m as { parts?: Array<{ type: string; text?: string }> }).parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("\n");
}
