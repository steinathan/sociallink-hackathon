import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Consultants",
  description: "Browse and discover verified consultants near you. Filter by specializations, location, and read reviews before booking a session.",
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
