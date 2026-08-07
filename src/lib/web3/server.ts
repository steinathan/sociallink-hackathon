// Server-side Web3 helpers. NEVER import in client code (holds private keys).
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import EscrowAbi from "@/../contracts/abis/Escrow.json";
import { xLayerTestnet } from "./xlayer-chain";
import { adminCollection } from "@/lib/firebase-admin";

// ponytail: cast through `unknown` — viem wants `as const` literals, but JSON imports aren't.
const ESCROW_ABI = EscrowAbi as unknown as import("viem").Abi;
const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS as Address | undefined;
const USDC_ADDRESS = process.env.USDC_X_LAYER_ADDRESS as Address | undefined;
const RPC_URL = process.env.X_LAYER_RPC_URL ?? "https://testrpc.xlayer.tech";

export function bookingIdToBytes32(bookingId: string): Hex {
  return keccak256(toBytes(bookingId));
}

function getAdminWalletClient() {
  const pk = process.env.X_LAYER_PRIVATE_KEY as Hex | undefined;
  if (!pk) throw new Error("X_LAYER_PRIVATE_KEY not configured");
  const account = privateKeyToAccount(pk);
  return createWalletClient({
    account,
    chain: xLayerTestnet,
    transport: http(RPC_URL),
  });
}

function getPublicClient() {
  return createPublicClient({ chain: xLayerTestnet, transport: http(RPC_URL) });
}

export function hasEscrowConfig(): boolean {
  return Boolean(ESCROW_ADDRESS && USDC_ADDRESS);
}

export async function fetchUserWalletAddress(uid: string): Promise<Address | null> {
  const snap = await adminCollection("users").doc(uid).get();
  const addr = (snap.data()?.primaryWalletAddress as Address | undefined) ?? null;
  return addr ?? null;
}

/**
 * ponytail: hackathon assumes 1 NGN ≈ 1 USDC for the escrow value.
 * Replace with a real FX feed (e.g. parallel rate fetch from X Layer DEX) before mainnet.
 */
export function nairaToUsdcUnits(ngnAmount: number): bigint {
  return parseUnits(String(Math.round(ngnAmount)), 6);
}

/**
 * Create + log an escrow for a booking. Member must fund it separately
 * via fundEscrow() from their wallet; server only stages the escrow.
 */
export async function createBookingEscrow(
  bookingId: string,
  consultantAddress: Address,
  usdcAmount: bigint
): Promise<{ escrowId: Hex; txHash: Hex }> {
  if (!ESCROW_ADDRESS) throw new Error("ESCROW_CONTRACT_ADDRESS not configured");
  const wallet = getAdminWalletClient();
  const publicClient = getPublicClient();

  const escrowId = bookingIdToBytes32(bookingId);
  // 24h auto-release timelock — matches AUTO_RELEASE_HOURS in server actions
  const releaseAfter = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);

  const txHash = await wallet.writeContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "createEscrow",
    args: [escrowId, consultantAddress, USDC_ADDRESS!, usdcAmount, releaseAfter],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { escrowId, txHash };
}

export async function releaseBookingEscrow(escrowId: Hex): Promise<Hex> {
  if (!ESCROW_ADDRESS) throw new Error("ESCROW_CONTRACT_ADDRESS not configured");
  const wallet = getAdminWalletClient();
  const publicClient = getPublicClient();
  const txHash = await wallet.writeContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "release",
    args: [escrowId],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function disputeBookingEscrow(escrowId: Hex): Promise<Hex> {
  if (!ESCROW_ADDRESS) throw new Error("ESCROW_CONTRACT_ADDRESS not configured");
  const wallet = getAdminWalletClient();
  const publicClient = getPublicClient();
  const txHash = await wallet.writeContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "dispute",
    args: [escrowId],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function aiResolveBookingEscrow(
  escrowId: Hex,
  winner: Address,
  splitBps: number
): Promise<Hex> {
  if (!ESCROW_ADDRESS) throw new Error("ESCROW_CONTRACT_ADDRESS not configured");
  const pk = process.env.AI_RESOLVER_PRIVATE_KEY as Hex | undefined;
  if (!pk) throw new Error("AI_RESOLVER_PRIVATE_KEY not configured");
  const account = privateKeyToAccount(pk);
  const wallet = createWalletClient({
    account,
    chain: xLayerTestnet,
    transport: http(RPC_URL),
  });
  const publicClient = getPublicClient();
  const txHash = await wallet.writeContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "resolveDispute",
    args: [escrowId, winner, BigInt(splitBps)],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function readEscrowStatus(escrowId: Hex): Promise<number | null> {
  if (!ESCROW_ADDRESS) return null;
  const publicClient = getPublicClient();
  try {
    return (await publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "statusOf",
      args: [escrowId],
    })) as number;
  } catch {
    return null;
  }
}

export const ESCROW_CONTRACT_ADDRESS = ESCROW_ADDRESS;
export const ESCROW_ABI_EXPORTED = ESCROW_ABI;
