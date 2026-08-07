import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet & Payments",
  description: "Manage your escrow funds, top-up balance, and request payouts securely.",
};

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
