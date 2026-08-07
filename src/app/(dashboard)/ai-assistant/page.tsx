import { ChatPanel } from "@/components/ai/ChatPanel";
import { Web3Provider } from "@/lib/web3/web3-provider";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AiAssistantPage() {
  return (
    <Web3Provider>
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              AI · Booking concierge
            </p>
            <h1 className="mt-1 flex items-center gap-2 font-serif text-3xl font-medium tracking-tight">
              <Sparkles className="h-6 w-6 text-primary" strokeWidth={1.6} />
              Book with AI
            </h1>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              Describe what you&apos;re looking for — the assistant parses your
              intent, surfaces matched Consultants, and guides you into a
              USDC-escrowed booking on X Layer.
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary"
          >
            Powered by X Layer
          </Badge>
        </header>
        <ChatPanel />
      </div>
    </Web3Provider>
  );
}
