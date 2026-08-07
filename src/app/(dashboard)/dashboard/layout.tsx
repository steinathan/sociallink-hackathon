import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your SocialLink activity, wallet balance, and recent sessions overview.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
