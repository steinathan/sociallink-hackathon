import { Timestamp, GeoPoint } from "firebase/firestore";

// ─── User ────────────────────────────────────────────────────────────────────
export type UserRole = "MEMBER" | "CONSULTANT" | "ADMIN";
export type AuthProvider = "phone" | "google" | "wallet";

export interface Wallet {
  availableBalance: number;
  escrowBalance: number;
  // Web3 (X Layer) — additive, parallel to fiat balances
  cryptoAddress?: `0x${string}`;
  usdcBalance?: number; // cached USDC balance on X Layer
  usdcBalanceUpdatedAt?: Timestamp;
}

export interface UserDocument {
  uid: string;
  phoneNumber?: string; // optional when wallet-only auth
  role: UserRole;
  authProvider?: AuthProvider;
  email?: string;
  banned?: boolean;
  wallet: Wallet;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  fcmToken?: string;
  // Web3 linkage
  primaryWalletAddress?: `0x${string}`; // bound OKX Wallet (EIP-4361 login)
  walletLinkedAt?: Timestamp;
}

// ─── Profile ─────────────────────────────────────────────────────────────────
export interface Service {
  id: string;
  title: string;
  description: string;
  price: number; // in Naira
}

export interface Profile {
  uid: string;
  displayName: string;
  bio: string;
  gender?: string;
  sexualOrientation?: string;
  country?: string;
  state?: string;
  city?: string;
  bodyBuild?: string;
  smoking?: boolean;
  dateOfBirth?: string; // YYYY-MM-DD
  services: Service[];
  retainer: number; // legacy/default retainer
  themes: string[]; // special interests / themes
  location: GeoPoint | null;
  locationLabel?: string; // human-readable city/area
  isOnline: boolean;
  avatarUrl?: string;
  blurAvatar?: boolean; // toggle to blur avatar for privacy
  galleryUrls?: string[];
  averageRating: number;
  totalReviews: number;
  whatsappAiConsent?: boolean;
  authProvider?: AuthProvider;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Booking ──────────────────────────────────────────────────────────────────
export type BookingStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "ACTIVE"
  | "COMPLETED"
  | "SETTLED"
  | "CANCELLED"
  | "DISPUTED"
  | "REFUNDED";

export interface BookingReceipt {
  totalAmount: number;
  platformFee: number; // 15%
  consultantPayout: number; // 85%
}

export interface Booking {
  bookingId: string;
  memberId: string;
  consultantId: string;
  selectedServices: Array<{
    id: string;
    title: string;
    price: number;
  }>;
  amountLocked: number; // in Naira (fiat path)
  currency?: "USDC" | "NGN"; // explicit currency chosen at request time
  status: BookingStatus;
  chatId?: string;
  memberConfirmedComplete?: boolean;
  consultantMarkedComplete?: boolean;
  receipt?: BookingReceipt;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  acceptedAt?: Timestamp;
  completedAt?: Timestamp;
  settledAt?: Timestamp;
  // Web3 escrow — additive, parallel to fiat flow
  escrowId?: `0x${string}`; // bytes32 from Escrow contract on X Layer
  escrowTxHash?: string; // last escrow-related tx hash
  escrowChain?: "xlayer-testnet" | "xlayer-mainnet";
  usdcAmountLocked?: string; // bigint serialized — escrow value
  usdcReleasedAt?: Timestamp;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export type NotificationType =
  | "BOOKING_REQUESTED"
  | "BOOKING_ACCEPTED"
  | "BOOKING_CANCELLED"
  | "BOOKING_ACTIVE"
  | "BOOKING_COMPLETED"
  | "BOOKING_SETTLED"
  | "BOOKING_DISPUTED"
  | "FUNDS_RELEASED"
  | "WALLET_FUNDED"
  | "REVIEW_RECEIVED";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  bookingId?: string;
  read: boolean;
  createdAt: Timestamp;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface Chat {
  chatId: string;
  bookingId: string;
  memberId: string;
  consultantId: string;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface ChatMessage {
  messageId: string;
  senderId: string;
  text?: string;
  imageUrl?: string; // blurred until clicked
  createdAt: Timestamp;
}

// ─── Review ──────────────────────────────────────────────────────────────────
export interface Review {
  reviewId: string;
  bookingId: string;
  reviewerId: string;
  reviewedId: string;
  rating: number; // 1–5
  comment?: string;
  createdAt: Timestamp;
}

// ─── Report ──────────────────────────────────────────────────────────────────
export type ReportReason = "NO_SHOW" | "SAFETY_CONCERN" | "FRAUD" | "OTHER";
export type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";

export interface Report {
  reportId: string;
  reporterId: string;
  reportedId: string;
  bookingId: string;
  reason: ReportReason;
  detailedDescription: string;
  evidenceUrls: string[];
  status: ReportStatus;
  adminNotes?: string;
  resolvedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Wallet Transaction ───────────────────────────────────────────────────────
export type TransactionType =
  | "DEPOSIT"
  | "ESCROW_LOCK"
  | "ESCROW_RELEASE"
  | "PAYOUT"
  | "REFUND"
  | "COMMISSION"
  | "CRYPTO_DEPOSIT"
  | "CRYPTO_WITHDRAW"
  | "CRYPTO_ESCROW_LOCK"
  | "CRYPTO_ESCROW_RELEASE"
  | "CRYPTO_ESCROW_DISPUTE"
  | "CRYPTO_REFUND";

export interface WalletTransaction {
  transactionId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  reference?: string;
  bookingId?: string;
  description: string;
  createdAt: Timestamp;
}

// ─── Platform Wallet ─────────────────────────────────────────────────────────
export interface PlatformWallet {
  totalCommissionEarned: number;
  updatedAt: Timestamp;
}

// ─── SIWE Wallet Auth ─────────────────────────────────────────────────────────
export interface AuthWalletNonce {
  address: string;
  nonce: string;
  issuedAt: Timestamp;
  expiresAt: Timestamp;
}

// ─── Payout Request ──────────────────────────────────────────────────────────
export type PayoutStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

export interface PayoutRequest {
  payoutId: string;
  consultantId: string;
  amount: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  paystackTransferCode?: string;
  status: PayoutStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Chain Sync Meta (X Layer event listener cursor) ─────────────────────────
export interface ChainSyncMeta {
  lastSeenBlock: string; // bigint serialized
  chainId: number;
  updatedAt: Timestamp;
}
