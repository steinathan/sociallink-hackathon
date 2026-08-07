import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your personal profile, services, privacy settings, and verification status on SocialLink.",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
