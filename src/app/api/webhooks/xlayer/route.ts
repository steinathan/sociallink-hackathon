import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { recordCryptoDeposit } from "@/actions/wallet-crypto.actions";

export const runtime = "nodejs"; // node crypto for HMAC + firebase-admin on the action path
export const dynamic = "force-dynamic";

/**
 * X Layer webhook receiver.
 * Per AGENTS.md: await request.text() for raw body BEFORE any parsing — Next.js
 * auto-parses JSON otherwise and the HMAC mismatches.
 *
 * Verify X-Layer-Signature with HMAC-SHA256 of the raw body against
 * X_LAYER_WEBHOOK_SECRET. On valid usdc.deposit events, call recordCryptoDeposit
 * (no idToken — the HMAC is the auth).
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-layer-signature") ?? "";
    const secret = process.env.X_LAYER_WEBHOOK_SECRET ?? "";

    if (!secret) {
      console.error("[xlayer-webhook] X_LAYER_WEBHOOK_SECRET not set");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 },
      );
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    // timingSafeEqual requires equal-length buffers; gate the comparison.
    const a = Buffer.from(signature, "hex");
    const b = Buffer.from(expected, "hex");
    if (
      a.length === 0 ||
      a.length !== b.length ||
      !crypto.timingSafeEqual(a, b)
    ) {
      console.error("[xlayer-webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let event: {
      type?: string;
      uid?: string;
      txHash?: string;
      fromAddress?: string;
      amount?: number;
      blockNumber?: number;
    };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (event.type === "usdc.deposit" && event.uid && event.txHash) {
      const result = await recordCryptoDeposit({
        uid: event.uid,
        txHash: event.txHash as `0x${string}`,
        fromAddress: (event.fromAddress ?? "0x0") as `0x${string}`,
        amount: Number(event.amount ?? 0),
        blockNumber: event.blockNumber,
      });
      if (!result.success) {
        console.error("[xlayer-webhook] recordCryptoDeposit failed:", result.error);
        return NextResponse.json(
          { error: result.error ?? "Deposit processing failed" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[xlayer-webhook] handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
