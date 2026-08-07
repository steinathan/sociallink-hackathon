import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { createPublicClient, http, getAddress, parseAbiItem, type Hex, type AbiEvent } from "viem";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const firestoreNamespace = (process.env.FIREBASE_NAMESPACE || process.env.NEXT_PUBLIC_FIREBASE_NAMESPACE || "sociallink")
  .trim()
  .replace(/^\/+|\/+$/g, "");

function scopedCollection(collectionId: string) {
  return db.collection("stores").doc(firestoreNamespace).collection(collectionId);
}

const RPC_URL = process.env.X_LAYER_RPC_URL ?? "https://testrpc.xlayer.tech";
const ESCROW_ADDRESS = (process.env.ESCROW_CONTRACT_ADDRESS ?? "") as Hex;

// X Layer testnet chain id 195 — define inline (no viem chain import needed for public client).
const xLayerTestnet = { id: 195, name: "X Layer Testnet", nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 }, rpcUrls: { default: { http: [RPC_URL] } } } as const;

const publicClient = createPublicClient({ chain: xLayerTestnet, transport: http(RPC_URL) });

// EscrowStatus enum (matches Escrow.sol): 0=ACTIVE, 1=RELEASED, 2=REFUNDED, 3=DISPUTED, 4=RESOLVED

const ESCROW_RELEASED_EVENT = parseAbiItem(
  "event EscrowReleased(bytes32 indexed bookingId, address indexed consultant, uint256 amount)"
) as AbiEvent;
const ESCROW_REFUNDED_EVENT = parseAbiItem(
  "event EscrowRefunded(bytes32 indexed bookingId, address indexed member, uint256 amount)"
) as AbiEvent;
const ESCROW_RESOLVED_EVENT = parseAbiItem(
  "event EscrowResolved(bytes32 indexed bookingId, address winner, uint256 memberAmount, uint256 consultantAmount)"
) as AbiEvent;

// ponytail: global cursor via meta/lastSeenBlock. Upgrade to per-chain cursors
// (testnet + mainnet) if we ever index both in one project.
export const escrowEventsListener = onSchedule("every 1 minutes", async () => {
  if (!ESCROW_ADDRESS) {
    console.warn("[escrowEvents] ESCROW_CONTRACT_ADDRESS not configured — skipping");
    return;
  }

  const metaRef = scopedCollection("meta").doc("lastSeenBlock");
  const metaSnap = await metaRef.get();
  const latest = await publicClient.getBlockNumber();

  let fromBlock: bigint;
  if (metaSnap.exists) {
    fromBlock = BigInt((metaSnap.data()?.lastSeenBlock as string) ?? "0") + BigInt(1);
  } else {
    // First run: scan last 1000 blocks for safety (covers ~3h on X Layer).
    fromBlock = latest > BigInt(1000) ? latest - BigInt(1000) : BigInt(0);
  }

  if (fromBlock > latest) {
    console.log(`[escrowEvents] cursor ahead of chain (${fromBlock} > ${latest}) — sleeping`);
    return;
  }

  // Cap to avoid huge logs on first run.
  const toBlock = latest;

  const logs = await publicClient.getLogs({
    address: getAddress(ESCROW_ADDRESS),
    events: [ESCROW_RELEASED_EVENT, ESCROW_REFUNDED_EVENT, ESCROW_RESOLVED_EVENT],
    fromBlock,
    toBlock,
  });

  console.log(`[escrowEvents] scanned blocks ${fromBlock}–${toBlock}, ${logs.length} log(s)`);

  for (const log of logs) {
    const bookingId = (log as unknown as { args: { bookingId: Hex } }).args.bookingId;
    const txHash = log.transactionHash ?? "";
    if (!bookingId) continue;

    // Find Firestore booking doc by escrowId (hex bytes32 stored with 0x prefix).
    const escId = bookingId;
    const snap = await scopedCollection("bookings")
      .where("escrowId", "==", escId)
      .limit(1)
      .get();

    if (snap.empty) continue;
    const bookingRef = snap.docs[0].ref;
    const bookingDoc = snap.docs[0];

    const eventName = log.eventName;

    if (eventName === "EscrowReleased") {
      await bookingRef.update({
        status: "SETTLED",
        escrowTxHash: txHash,
        settledAt: admin.firestore.FieldValue.serverTimestamp(),
        settledReason: "AUTO_RELEASED_ONCHAIN",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (eventName === "EscrowRefunded") {
      await bookingRef.update({
        status: "REFUNDED",
        escrowTxHash: txHash,
        settledAt: admin.firestore.FieldValue.serverTimestamp(),
        settledReason: "AUTO_REFUNDED_ONCHAIN",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (eventName === "EscrowResolved") {
      const args = (log as unknown as { args: { winner: string; memberAmount: bigint; consultantAmount: bigint } }).args;
      await bookingRef.update({
        status: "SETTLED",
        escrowTxHash: txHash,
        settledAt: admin.firestore.FieldValue.serverTimestamp(),
        settledReason: "AI_DISPUTE_RESOLVED",
        "aiResolution.winner": args.winner,
        "aiResolution.memberAmount": args.memberAmount?.toString() ?? "0",
        "aiResolution.consultantAmount": args.consultantAmount?.toString() ?? "0",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log(`[escrowEvents] processed ${eventName} for booking ${bookingDoc.id} (tx=${txHash})`);
  }

  // Persist cursor.
  await metaRef.set(
    {
      lastSeenBlock: toBlock.toString(),
      chainId: 195,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
});
