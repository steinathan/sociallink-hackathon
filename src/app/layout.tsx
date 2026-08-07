import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono, Fraunces } from "next/font/google";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/layout/service-worker-registration";
import { AuthProvider } from "@/components/auth/auth-provider";
import { GlobalPwaInstallPrompt } from "@/components/layout/global-pwa-install-prompt";
import { Web3Provider } from "@/lib/web3/web3-provider";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "https://sociallink.ng";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "opsz"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SocialLink — Social Discovery, Considered",
    template: "%s | SocialLink",
  },
  description:
    "Nigeria's most considered social discovery and specialized consultation platform. Verified Consultants, escrowed retainers, and considered experiences — by design.",
  keywords: [
    "SocialLink",
    "Social Discovery Nigeria",
    "Verified Consultants Lagos",
    "Escrow Sessions Nigeria",
    "Lifestyle Coaching",
    "Event Companion",
    "Business Networking Nigeria",
    "Abuja Social",
    "Port Harcourt Consultants",
    "Considered Sessions",
  ],
  authors: [{ name: "SocialLink Technologies Ltd." }],
  creator: "SocialLink",
  publisher: "SocialLink",
  applicationName: "SocialLink",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: SITE_URL,
    siteName: "SocialLink",
    title: "SocialLink — Social Discovery, Considered",
    description:
      "Verified Consultants. Escrowed retainers. Considered sessions across Lagos, Abuja, and Port Harcourt.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SocialLink — Social Discovery, Considered",
    description:
      "Verified Consultants. Escrowed retainers. Considered sessions.",
    creator: "@SocialLinkNG",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/icons/favicon.ico" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icons/favicon.svg",
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-NG": "/",
    },
  },
  category: "social",
  classification: "Social discovery and specialized consultation",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F1EA" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1410" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NG" className={`${plusJakartaSans.variable} ${spaceGrotesk.variable} ${fraunces.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className={`antialiased font-sans`}>
        <ServiceWorkerRegistration />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <Web3Provider>
              {children}
              <GlobalPwaInstallPrompt />
            </Web3Provider>
          </AuthProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
