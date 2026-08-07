import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Bookings",
  description: "View and manage your active, pending, and completed sessions on SocialLink.",
};

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
