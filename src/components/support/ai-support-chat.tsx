"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, 
  User, 
  Send, 
  HelpCircle, 
  Loader2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "assistant" | "user";
  content: string;
}

const FAQ_DATA = [
  {
    keywords: ["what", "sociallink", "how it works"],
    answer: "SocialLink is a premium platform connecting Members with Consultants for social experiences. Members book sessions, and funds are held in escrow until completion."
  },
  {
    keywords: ["safety", "safe", "secure", "verification", "trust"],
    answer: "Trust is enforced by code: phone OTP verification, escrowed retainers in Paystack, real-time booking audit trails, and a human dispute team. Membership is opt-in, in-app messaging is contained, and reviews are visible after each session."
  },
  {
    keywords: ["escrow", "payment", "money", "funds", "release"],
    answer: "Our escrow system holds your payment securely. Funds are only released to the Consultant once you confirm the session is completed. If the session doesn't happen, you get a refund."
  },
  {
    keywords: ["fee", "commission", "cost", "charge"],
    answer: "SocialLink takes a 15% commission on successful sessions. Consultants receive 85% of their listed retainer fee."
  },
  {
    keywords: ["become", "consultant", "apply", "join as consultant"],
    answer: "To become a Consultant, sign in with your phone, complete your profile, set your retainer and themes, and list at least one session. Your profile appears in discovery immediately."
  },
  {
    keywords: ["cancel", "refund"],
    answer: "If a booking sits PENDING for more than 30 minutes without a Consultant response, it auto-cancels and your wallet is refunded in full. You can also dispute a session from the booking detail page."
  }
];

export function AiSupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your SocialLink AI assistant. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsTyping(true);

    // Simulate AI thinking
    setTimeout(() => {
      let response = "I'm not sure about that. Would you like to speak with a human support agent?";
      
      const lowerInput = userMessage.toLowerCase();
      for (const faq of FAQ_DATA) {
        if (faq.keywords.some(k => lowerInput.includes(k))) {
          response = faq.answer;
          break;
        }
      }

      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button 
            variant="outline" 
            className="gap-2 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10"
          >
            <HelpCircle className="h-4 w-4 text-primary" />
            Support Center
          </Button>
        }
      />
      <SheetContent side="right" className="flex flex-col p-0 sm:max-w-md border-l border-border/40 bg-background/95 backdrop-blur-xl">
        <SheetHeader className="p-6 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-left">Support Assistant</SheetTitle>
              <p className="text-xs text-muted-foreground">Always active to help you</p>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-start gap-3",
                  m.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  m.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {m.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm max-w-[85%]",
                  m.role === "assistant" 
                    ? "bg-card border border-border/60 text-foreground rounded-tl-none" 
                    : "bg-primary text-primary-foreground rounded-tr-none"
                )}>
                  {m.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-card border border-border/60 rounded-2xl rounded-tl-none px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-6 border-t border-border/40 bg-card/50">
          <div className="flex gap-2">
            <Input 
              placeholder="Ask anything..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="rounded-xl border-border/60 bg-background focus-visible:ring-primary"
            />
            <Button size="icon" onClick={handleSend} disabled={!input.trim() || isTyping} className="rounded-xl shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-3 text-[10px] text-center text-muted-foreground">
            Our AI uses platform FAQs to provide instant answers.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
