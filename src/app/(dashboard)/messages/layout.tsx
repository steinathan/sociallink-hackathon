import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
  description: "Secure, encrypted in-app messaging with your connected consultants and members.",
};

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
