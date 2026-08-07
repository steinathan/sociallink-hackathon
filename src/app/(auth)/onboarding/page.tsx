import { Metadata } from "next";
import { RoleSelectionForm } from "@/components/auth/role-selection-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { GlobalLocationBanner } from "@/components/layout/global-location-banner";
import { LogoFull } from "@/components/layout/logo";

export const metadata: Metadata = {
  title: "Set up your account",
  description:
    "Tell us how you'll use SocialLink — as a Member discovering Consultants, or as a Consultant offering sessions.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Set up your SocialLink account",
    description:
      "Tell us how you'll use SocialLink — Member or Consultant.",
  },
};

export default function OnboardingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <GlobalLocationBanner />

      <header className="relative z-10 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <LogoFull />
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-4xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="w-full">
          <div className="relative w-full overflow-hidden rounded-2xl border border-border/70 bg-card px-6 py-7 shadow-sm sm:px-8 sm:py-8">
            <div className="mb-8">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Account onboarding
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Choose the role and complete your professional profile.
              </h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                This setup configures your discovery visibility, verification flow, and wallet permissions.
              </p>
            </div>

            <RoleSelectionForm />
          </div>
        </section>
      </main>
    </div>
  );
}
