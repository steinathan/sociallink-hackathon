import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read the Privacy Policy for SocialLink to understand how your personal data, identity documents, and payment information are protected.",
  alternates: {
    canonical: "https://sociallink.ng/privacy",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
