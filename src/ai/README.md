# SocialLink AI Layer

BuildX AI Season — X Layer / OKX zkEVM L2 hackathon entry.

This module ships two server-side AI agents that drive the highest-leverage parts of SocialLink:

1. **Dispute Mediator** — reads chat history + reports, recommends a fair refund split, and produces an **EIP-712 typed-data signature** for `Escrow.resolveDispute` on **X Layer testnet (chainId 195)**.
2. **Booking Assistant** — parses natural-language requests into a structured `BookingIntent` and surfaces the best Consultant matches.

> Mention: this work targets **@XLayerOfficial**'s BuildX AI Season.

---

## Architecture

```
src/ai/
  schemas.ts                  # zod schemas for structured outputs
  agent.ts                    # shared LLM (claude-sonnet-4-5) + system prompts
  actions/
    disputeMediator.ts        # "use server" — analyzeDispute, signResolution, broadcastResolution
    bookingAssistant.ts       # "use server" — parseBookingIntent, recommendProviders, chat (streamText)
src/app/api/ai/chat/
  route.ts                    # POST endpoint for streaming chat → useChat client
src/components/ai/
  ChatPanel.tsx               # booking assistant UI (uses @ai-sdk/react useChat)
  DisputeMediatorPanel.tsx    # AI recommendation tab UI (slider, reasoning, sign)
```

All LLM calls run server-side. The client never sees `ANTHROPIC_API_KEY`.

### Stack
- `ai` v6 + `@ai-sdk/anthropic` v3 (`claude-sonnet-4-5`)
- `@ai-sdk/react` (client `useChat`)
- `viem` for EIP-712 (`privateKeyToAccount`, `signTypedData`)
- `zod` for structured-output schemas

---

## Dispute flow

```
[Member / Consultant]
    │
    ▼  disputes a session
src/actions/booking.actions.ts → disputeBooking()
    │
    ▼  status=DISPUTED, escrow frozen
Admin opens /admin/disputes → <DisputeDialog /> → "AI Recommendation" tab
    │
    ▼
src/ai/actions/disputeMediator.ts:
  • analyzeDispute(bookingId)     → generateText + Output.object(DisputeAnalysisSchema)
  • returns { analysis, context } where context bundles chat + history + report
    │
    ▼
  Admin reviews AI split + slider (still defaults to AI suggestion)
    │
    ▼
  • signResolution(bookingId, memberBps, consultantBps)
    builds EIP-712 typed data:
        domain   = { name: "SocialLinkEscrow", version: "1", chainId: 195, verifyingContract: ESCROW_CONTRACT_ADDRESS }
        types    = { ResolveDispute: [{name:"bookingId",type:"bytes32"}, {name:"winner",type:"address"}, {name:"splitBps",type:"uint16"}] }
        message  = { bookingId: keccak256(bytes(bookingId)), winner: memberWallet|consultantWallet, splitBps }
    signed with AI_RESOLVER_PRIVATE_KEY (server-side) → signature returned
    │
    ▼
  • broadcastResolution(...) is a Tier-3 stub — returns the signed payload unchanged.
    The relay that submits on-chain must run with an AI_RESOLVER_ROLE signer
    (see contracts/src/Escrow.sol: AI_RESOLVER_ROLE = keccak256("AI_RESOLVER_ROLE"))
```

`bookingId → bytes32` mapping follows the contract convention: `keccak256(bytes(bookingId))`. This is canonical — same booking id always produces the same escrow key.

### EIP-712 domain (X Layer testnet)

```ts
{
  name: "SocialLinkEscrow",
  version: "1",
  chainId: 195,                 // X Layer testnet — replay on 196 (mainnet) or any other chain fails
  verifyingContract: ESCROW_CONTRACT_ADDRESS,
}
```

Adding `chainId` to the domain prevents cross-chain replay. The contract is deployed on X Layer testnet for the hackathon; mainnet (196) goes live after judging.

---

## Booking flow

```
[Member]
    │
    ▼  types in: "Book a Lagos dinner companion Friday 8pm, budget $80"
src/components/ai/ChatPanel.tsx → POST /api/ai/chat
    │
    ▼
src/app/api/ai/chat/route.ts → src/ai/actions/bookingAssistant.ts
    • streamText with tools { parseBookingIntent, recommendProviders }
    • model picks tools, tool.execute() runs server-side
    │
    ▼  streams UI message back to client
ChatPanel renders bubbles + tool-call results
    │
    ▼  Member sees ranked Consultant cards
    (click → opens <BookingRequestDialog />, form pre-fills from intent if parent wires it)
```

`recommendProviders` is a small scoring function over profiles: theme overlap + location match + service title keyword + rating + reviews. Returns top N sorted by score, validated against `ProviderMatchSchema` before returning.

---

## Security

- **API key isolation.** `llm` lives in `src/ai/agent.ts` and is only imported from `actions/*.ts` (`"use server"`). The client UI never imports it.
- **EIP-712 chain binding.** `domain.chainId = 195` ensures signatures cannot be replayed on mainnet (196) or any other chain.
- **Server-side signer.** `AI_RESOLVER_PRIVATE_KEY` is read only inside `signResolution` and never returned to the client. `getAiResolverAddress()` exposes only the address.
- **No autonomous broadcast.** `broadcastResolution()` currently just returns the signed payload. A future relay (with explicit human approval) will submit it. The AI never spends funds without a human sign-off step.
- **Input validation at trust boundaries.** All bps splits are checked (`memberBps + consultantBps === 10000`, range `[0, 10000]`) before signing.
- **Firestore namespace.** Every collection lookup goes through `adminCollection(...)` from `src/lib/firebase-admin.ts`, which respects the `stores/{namespace}/` scoping rule from AGENTS.md.

---

## Cost & caching

- **Per call (estimate, claude-sonnet-4-5):**
  - `analyzeDispute` ≈ 3-6k input tokens (chat history can be long) + ~500 output. With cache hits on repeat prompts this stays around $0.02-$0.05 per dispute.
  - `parseBookingIntent` ≈ 200 in / 200 out ≈ <$0.001 per request.
  - `recommendProviders` ≈ 500 in / 500 out (tool call + result) ≈ <$0.005 per request.
- **Caching:** the AI SDK prompt cache hits automatically on identical prefixes; `analyzeDispute` re-uses prior chat-history inputs if the same dispute is re-analyzed within the cache window. We don't add a hand-rolled TTL cache — premature optimization, add only when the LLM bill dominates.
- **Streaming:** `chat()` uses `streamText` so first-token latency is well under 1s for the booking assistant.

---

## Environment

```ini
ANTHROPIC_API_KEY=                   # server-side only
ESCROW_CONTRACT_ADDRESS=             # SocialLinkEscrow on X Layer testnet
AI_RESOLVER_PRIVATE_KEY=             # signer with AI_RESOLVER_ROLE on Escrow
AI_RESOLVER_ADDRESS=                 # public 0x... corresponding to the private key
NEXT_PUBLIC_X_LAYER_CHAIN_ID=195     # EIP-712 chainId binding
```

All four are required for the dispute mediator to run end-to-end on testnet. Without `ANTHROPIC_API_KEY` the booking assistant and dispute analyzer will fail — fail loud, fail early.

---

## Tier-3 TODOs (out of scope today)

- Real `broadcastResolution` that submits the signed payload to `Escrow.resolveDispute` (needs a relay account that holds an `AI_RESOLVER_ROLE` grant).
- Auto-cache the last `analyzeDispute` result per booking for 24h so re-opens don't double-charge tokens.
- Tool-call UI affordances on `ChatPanel` so the assistant's `parseBookingIntent`/`recommendProviders` calls render as inline cards, not raw JSON.
- Admin-side audit log of every signed payload (who, when, bps split, AI confidence).

Each of these is a one-line spec; ship when the data shows the value.
