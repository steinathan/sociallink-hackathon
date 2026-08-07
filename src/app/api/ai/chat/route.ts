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
