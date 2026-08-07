import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { verifyPaystackSignature, creditWalletFromPaystack } from "@/actions/wallet.actions";
import { adminDb, adminCollection } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature") ?? "";

    // Verify webhook authenticity
    if (!(await verifyPaystackSignature(rawBody, signature))) {
      console.error("Invalid Paystack webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const { event: eventType, data } = event;

    switch (eventType) {
      case "charge.success": {
        const reference = data.reference;
        const result = await creditWalletFromPaystack(reference);
        if (!result.success) {
          console.error("Failed to credit wallet:", result.error);
        }
        break;
      }

      case "transfer.success": {
        await adminCollection("payouts").where("paystackTransferCode", "==", data.transfer_code).get().then(async (snap) => {
          for (const doc of snap.docs) {
            await doc.ref.update({
              status: "SUCCESS",
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        });
        break;
      }

      case "transfer.failed":
      case "transfer.reversed": {
        // Refund the consultant
        const payoutSnap = await adminCollection("payouts")
          .where("paystackTransferCode", "==", data.transfer_code)
          .get();

        for (const payoutDoc of payoutSnap.docs) {
          const payout = payoutDoc.data();
          if (payout.status !== "FAILED") {
            await adminDb.runTransaction(async (tx) => {
              tx.update(
                adminCollection("users").doc(payout.consultantId),
                {
                  "wallet.availableBalance": FieldValue.increment(payout.amount),
                  updatedAt: FieldValue.serverTimestamp(),
                }
              );
              tx.update(payoutDoc.ref, {
                status: "FAILED",
                updatedAt: FieldValue.serverTimestamp(),
              });
            });
          }
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
