"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  userId?: string;
  /** Optional starter message displayed in the input on first render. */
  initialInput?: string;
  className?: string;
}

/**
 * Demo flow:
 *   "Book a Lagos dinner companion Friday 8pm, budget $80"
 *   → parseBookingIntent extracts intent
 *   → recommendProviders surfaces matches
 *   → user clicks a match to open the booking dialog (handled by parent)
 */
export function ChatPanel({ userId, initialInput, className }: ChatPanelProps) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ai/chat", body: { userId } }),
    [userId]
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, status]);

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className={cn("flex h-[520px] flex-col gap-0 p-0", className)}>
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Booking Assistant</p>
            <p className="text-[11px] text-muted-foreground">Powered by Claude · X Layer</p>
          </div>
        </div>
        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[10px] font-medium text-primary">
          Powered by X Layer
        </Badge>
      </div>

      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as never}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-[13px] leading-relaxed text-muted-foreground">
              Try: <span className="font-medium text-foreground">&ldquo;Book a Lagos dinner companion Friday 8pm, budget $80&rdquo;</span>
              <br />
              Or: <span className="font-medium text-foreground">&ldquo;I need a quiet brunch companion in Lekki this Saturday morning&rdquo;</span>
            </div>
          )}

          {messages.map((m) => (
            <Bubble key={m.id} role={m.role as "user" | "assistant" | "system"} content={extractText(m)} />
          ))}

          {status === "submitted" && (
            <div className="flex items-start gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-card px-3 py-2 text-[13px]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-[12px] text-destructive">
              {error.message}
            </div>
          )}
        </div>
      </ScrollArea>

      <form
        className="flex gap-2 border-t border-border/60 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const value = inputRef.current?.value?.trim();
          if (!value || status !== "ready") return;
          sendMessage({ text: value });
          if (inputRef.current) inputRef.current.value = "";
        }}
      >
        <Input
          ref={inputRef}
          defaultValue={initialInput}
          placeholder="Describe what you're looking for…"
          className="flex-1 rounded-xl border-border/60"
          disabled={status !== "ready"}
        />
        <Button
          type="submit"
          size="icon"
          disabled={status !== "ready"}
          className="shrink-0 rounded-xl"
        >
          {status !== "ready" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </Card>
  );
}

function extractText(m: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!Array.isArray(m.parts)) return "";
  return m.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("\n");
}

function Bubble({ role, content }: { role: "user" | "assistant" | "system"; content: string }) {
  const isUser = role === "user";
  const text = content;
  if (!text) return null;
  return (
    <div className={cn("flex items-start gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          isUser ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm border border-border/60 bg-card text-foreground"
        )}
      >
        {text}
      </div>
    </div>
  );
}
