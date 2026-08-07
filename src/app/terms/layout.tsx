import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the Terms of Service for SocialLink. Understand our platform rules, safety policies, and escrow protections.",
  alternates: {
    canonical: "https://sociallink.ng/terms",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
