"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Footer } from "@/components/layout/footer";
import { LogoFull } from "@/components/layout/logo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowUpRight,
  ArrowRight,
  BadgeCheck,
  Coins,
  Lock as LockIcon,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

/* ─── Content ────────────────────────────────────────────────────────── */

const navigation = [
  { name: "The platform", href: "#platform" },
  { name: "Themes", href: "#themes" },
  { name: "How it works", href: "#flow" },
  { name: "FAQ", href: "#faq" },
];

const tickerItems = [
  "Lagos",
  "Abuja",
  "Port Harcourt",
  "Ibadan",
  "Cultural Guide",
  "Business Networking",
  "Event Attendance",
  "Dining Companion",
  "Language Exchange",
  "Travel Partner",
  "Lifestyle Coaching",
  "Fitness Partner",
  "Verified",
  "Escrowed",
  "Considered",
];

const principles = [
  {
    figure: "01",
    title: "Intent, parsed",
    text: "Our AI Booking Agent reads natural language — “Lagos dinner Friday 8pm, budget $80” — and turns it into a structured booking with a verified Consultant match.",
  },
  {
    figure: "02",
    title: "Money, onchain",
    text: "USDC locks in a Solidity contract on X Layer the moment a session is accepted. Funds release only when both parties honour the settlement — verifiable by anyone.",
  },
  {
    figure: "03",
    title: "Conversation, contained",
    text: "Messaging opens only after escrow is funded, and stays on-platform until the work is done.",
  },
  {
    figure: "04",
    title: "Disputes, AI-signed",
    text: "When something goes wrong, Claude reads the chat evidence and signs an EIP-712 message settling the split onchain. Trustless, auditable, instant.",
  },
];

const themes = [
  { name: "Cultural Guide", note: "Lagos, Abuja, PH" },
  { name: "Business Networking", note: "Exec & founder circles" },
  { name: "Event Attendance", note: "Gala, premiere, launch" },
  { name: "Dining Companion", note: "Reservation-ready" },
  { name: "Travel Partner", note: "In-country and regional" },
  { name: "Lifestyle Coaching", note: "Wardrobe, taste, presence" },
  { name: "Language Exchange", note: "Yorùbá, Igbo, Hausa, French" },
  { name: "Fitness Partner", note: "Gym, padel, running club" },
];

const flow = [
  {
    step: "I",
    title: "Verify",
    body: "Connect your OKX Wallet to sign in — or use your phone with OTP if you prefer. Both Members and Consultants get a verified profile.",
  },
  {
    step: "II",
    title: "Discover",
    body: "Browse Consultants by city and theme. Filter by availability, retainer, and rating — the way you'd choose a hotel concierge.",
  },
  {
    step: "III",
    title: "Request",
    body: "Pick a session, lock the retainer in escrow. Your Consultant has 30 minutes to accept or your funds return to you automatically.",
  },
  {
    step: "IV",
    title: "Meet, settle, review",
    body: "Use the in-platform chat during the session. On completion, release funds; your Consultant keeps 85% and we keep 15%.",
  },
];

const stats = [
  { label: "Verified Consultants", value: "12K+" },
  { label: "Sessions completed", value: "98K+" },
  { label: "USDC settled on X Layer", value: "$2.4M+" },
  { label: "Settlement time", value: "~2 sec" },
];

const trust = [

  {
    icon: LockIcon,
    title: "Onchain USDC escrow",
    text: "Funds lock in a Solidity contract on X Layer the moment a session is booked. No intermediary, no chargeback.",
  },
  {
    icon: Sparkles,
    title: "AI Booking Agent",
    text: "Tell it what you want in plain language. Claude parses the intent, matches a verified Consultant, and locks escrow — bookings in seconds.",
  },
  {
    icon: Workflow,
    title: "AI-signed settlements",
    text: "Disputes are read by Claude, then an EIP-712 message settles the split onchain. Verifiable, trustless.",
  },
  {
    icon: Coins,
    title: "Zero gas via OKX Wallet",
    text: "USDC and USDT transfers on X Layer pay zero gas. Members fund, lock, and settle without holding OKB.",
  },
];

const faqs = [
  {
    q: "What is SocialLink?",
    a: "A social discovery platform for finding verified Consultants across Nigeria — cultural guides, dining companions, business introducers, language tutors. Members book a session, the Consultant accepts, the USDC locks in escrow, and the session settles on X Layer when both sides honour the arrangement.",
  },
  {
    q: "How does the AI Booking Agent work?",
    a: "Tell it what you want in plain language — “Lagos dinner companion Friday 8pm, budget $80” — and Claude parses the intent into a structured booking, recommends the best-matching verified Consultants, and locks the escrow on X Layer. You review, confirm, and the AI handles settlement when the session wraps.",
  },
  {
    q: "Where does my money sit during a session?",
    a: "USDC locks in our audited Solidity escrow contract on X Layer the moment your Consultant accepts. Neither side can withdraw unilaterally. Funds release to the Consultant only when you confirm the session was completed; if the Consultant never shows, the USDC returns to your wallet automatically after the auto-release window.",
  },
  {
    q: "What happens if there's a dispute?",
    a: "Claude reads the chat history, the booking terms, and the evidence both sides submit, then proposes a fair refund split. An admin reviews and signs an EIP-712 message calling the contract's resolveDispute function — the USDC redistributes onchain in seconds. The full reasoning and the signed payload are auditable on OKLink.",
  },
  {
    q: "How do Consultants get paid?",
    a: "After escrow releases, 85% of the USDC lands in the Consultant's OKX Wallet immediately. The remaining 15% is the platform fee — it covers the AI agent, X Layer settlement costs, dispute review, and the escrow contract audit. Withdraw to any Nigerian bank via Paystack Transfers, or hold USDC onchain for your next session.",
  },
  {
    q: "What does it cost to use SocialLink?",
    a: "Nothing upfront. Members connect an OKX Wallet (free, Chrome extension) and pay only when a session is booked. USDC and USDT transfers on X Layer pay zero gas — no OKB required. Consultants keep 85% of every session; the 15% platform fee is only charged on completed bookings, never on disputes or cancellations.",
  },
];

/* ─── SEO — JSON-LD structured data ────────────────────────────────────── */

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "https://sociallink.ng";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SocialLink Technologies Ltd.",
  legalName: "SocialLink Technologies Ltd.",
  url: SITE_URL,
  logo: `${SITE_URL}/icons/web-app-manifest-512x512.png`,
  description:
    "Nigeria's most considered social discovery and specialized consultation platform.",
  foundingLocation: "Lagos, Nigeria",
  areaServed: { "@type": "Country", name: "Nigeria" },
  sameAs: [
    "https://twitter.com/SocialLinkNG",
    "https://instagram.com/sociallink.ng",
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@sociallink.ng",
      availableLanguage: ["English"],
      areaServed: "NG",
    },
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SocialLink",
  url: SITE_URL,
  inLanguage: "en-NG",
  publisher: { "@type": "Organization", name: "SocialLink Technologies Ltd." },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/explore?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

/* ─── Page ─────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();
    mm.add(
      {
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { reduceMotion } = context.conditions as { reduceMotion: boolean };
        if (reduceMotion) {
          gsap.set(root.querySelectorAll("[data-reveal]"), { opacity: 1, y: 0 });
          return;
        }

        gsap.fromTo(
          root.querySelectorAll("[data-reveal]"),
          { opacity: 0, y: 24, filter: "blur(8px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.1,
            ease: "expo.out",
            stagger: 0.08,
          }
        );

        gsap.fromTo(
          root.querySelectorAll("[data-rise]"),
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.06, delay: 0.2 }
        );

        gsap.to(root.querySelectorAll("[data-float]"), {
          y: "random(-6, 6)",
          duration: "random(4, 7)",
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: 0.3,
        });
      }
    );

    return () => mm.revert();
  }, []);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div
        ref={pageRef}
        className="relative min-h-screen w-full bg-background font-sans text-foreground selection:bg-primary/25"
      >
      {/* Subtle radial wash for atmosphere — warm, not cold */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[-15%] top-[-15%] h-[70%] w-[70%] rounded-full bg-primary/[0.06] blur-[140px]" />
        <div className="absolute right-[-20%] bottom-[-20%] h-[80%] w-[80%] rounded-full bg-accent/40 blur-[160px]" />
      </div>

      {/* ─── Header ─────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-10 z-50 border-b border-foreground/[0.06] bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 lg:px-10">
          <LogoFull />

          <nav className="hidden items-center gap-9 lg:flex">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-[13px] font-medium tracking-tight text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Get started
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* ─── Hero ───────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-7xl px-6 pb-20 pt-32 lg:px-10 lg:pb-28 lg:pt-44">
          <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
            {/* Left — editorial column */}
            <div className="relative">
              {/* Eyebrow */}
              <div
                data-reveal
                className="mb-10 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-[0.22em]"
              >
                <span className="flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <span className="text-muted-foreground">Built for the</span>
                <span className="font-serif text-[15px] font-light italic tracking-normal normal-case text-foreground">
                  BuildX AI Season
                </span>
                <span className="text-muted-foreground/50">·</span>
                <a
                  href="https://web3.okx.com/xlayer/build-x-series"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-serif text-[15px] font-light italic tracking-normal normal-case text-foreground underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-accent"
                >
                  X Layer
                </a>
              </div>

              {/* Headline — serif editorial */}
              <h1
                data-reveal
                className="font-serif text-[2.65rem] font-light leading-[1.02] tracking-[-0.035em] text-foreground sm:text-6xl lg:text-[5.5rem]"
              >
                Book a Consultant,
                <br />
                <span className="italic font-normal text-primary">settle onchain.</span>
              </h1>

              {/* Subhead */}
              <p
                data-reveal
                className="mt-9 max-w-xl text-[17px] leading-[1.65] text-muted-foreground sm:text-lg"
              >
                Tell our <span className="font-semibold text-foreground">AI Booking Agent</span> what you want — a Lagos dinner companion Friday at 8pm, a Yorùbá tutor, a business introducer in Abuja.
                We match you with a verified Consultant, lock USDC in escrow, and the session settles on <span className="font-semibold text-foreground">X Layer</span> in seconds.
              </p>

              {/* CTAs */}
              <div data-reveal className="mt-12 flex flex-wrap items-center gap-4">
                <Link
                  href="/login"
                  className="btn-coral inline-flex h-14 items-center gap-2 rounded-full px-7 text-[14px] font-semibold tracking-tight text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Find a Consultant
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="btn-ghost-warm inline-flex h-14 items-center gap-2 rounded-full px-7 text-[14px] font-semibold tracking-tight text-foreground transition-colors hover:bg-foreground/[0.04]"
                >
                  Apply as a Consultant
                </Link>
              </div>

              {/* Stat strip */}
              <div
                data-reveal
                className="mt-16 flex flex-wrap gap-x-12 gap-y-6 border-t border-foreground/[0.08] pt-8"
              >
                {stats.slice(0, 3).map((s) => (
                  <div key={s.label} className="min-w-[120px]">
                    <div className="font-serif text-3xl font-medium leading-none text-foreground sm:text-4xl">
                      {s.value}
                    </div>
                    <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — premium session panel */}
            <div data-reveal className="relative lg:pt-10">
              {/* Floating trust chip */}
              <div className="absolute -left-4 -top-6 z-20 hidden items-center gap-2 rounded-full border border-foreground/[0.08] bg-background/90 px-3.5 py-2 shadow-sm backdrop-blur md:flex">
                <span className="flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <span className="font-serif text-[12px] font-light italic tracking-normal text-foreground">
                  Powered by X Layer
                </span>
              </div>

              <div className="glow-coral tape-grain relative overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] sm:p-8">
                {/* Panel header */}
                <div className="mb-7 flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      Live session
                    </div>
                    <div className="mt-1 font-serif text-xl font-medium tracking-tight">
                      Adaeze · Cultural Guide
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
                      USDC in escrow
                    </span>
                  </div>
                </div>

                {/* Escrow figure — serif for emphasis */}
                <div className="mb-7 flex items-baseline justify-between border-y border-foreground/[0.06] py-6">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      Retainer
                    </div>
                    <div className="mt-1.5 font-serif text-4xl font-light tracking-tight sm:text-5xl">
                      USDC&nbsp;50.00
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      Settles in
                    </div>
                    <div className="mt-1.5 font-mono text-2xl font-medium tabular-nums tracking-tight text-foreground">
                      ~2 sec
                    </div>
                  </div>
                </div>

                {/* Settlement split */}
                <div className="mb-7">
                  <div className="mb-3 flex items-center justify-between text-[11px] font-medium">
                    <span className="uppercase tracking-[0.18em] text-muted-foreground">
                      Settlement split
                    </span>
                    <span className="text-muted-foreground">
                      85% Consultant · 15% platform
                    </span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-foreground/[0.06]">
                    <div className="bg-primary" style={{ width: "85%" }} />
                    <div className="bg-accent" style={{ width: "15%" }} />
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
                    <span>USDC 42.50</span>
                    <span>USDC 7.50</span>
                  </div>
                </div>

                {/* Verified rows */}
                <div className="space-y-2.5">
                  {[
                    { label: "AI Booking Agent · intent parsed", time: "Today · 14:02" },
                    { label: "Escrow · created on X Layer", time: "Today · 14:04" },
                    { label: "OKX Wallet · USDC locked", time: "Today · 14:06" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-2xl border border-foreground/[0.05] bg-background/40 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <BadgeCheck className="h-4 w-4 text-primary" />
                        <span className="text-[13px] font-medium">{row.label}</span>
                      </div>
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {row.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating secondary card — message preview */}
              <div className="absolute -bottom-10 -right-3 hidden w-[260px] sm:block">
                <div className="glow-champagne rounded-3xl border border-foreground/[0.08] bg-card p-5 shadow-xl tape-grain">
                  <div className="mb-3 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 font-serif text-[11px] font-medium italic text-accent">
                      ai
                    </div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                      Agent · just now
                    </div>
                  </div>
                  <p className="font-serif text-[15px] leading-snug">
                    &ldquo;Booked Lagos dinner with Adaeze at 8pm — USDC 50 in escrow on X Layer.&rdquo;
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-block h-1 w-1 rounded-full bg-primary" />
                    <span>Signed by AI Booking Agent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Ticker — signature element ─────────────────────── */}
        <section
          aria-hidden="true"
          className="hairline relative overflow-hidden border-y border-foreground/[0.08] bg-foreground/[0.02] py-5"
        >
          <div className="animate-ticker flex w-max gap-12 whitespace-nowrap">
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <div key={i} className="flex items-center gap-12">
                <span className="font-serif text-2xl font-light tracking-tight text-foreground/80">
                  {item}
                </span>
                <span className="text-2xl text-primary/40">✦</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Editorial manifesto ─────────────────────────────── */}
        <section id="platform" className="mx-auto max-w-5xl px-6 py-28 text-center lg:px-10 lg:py-40">
          <div
            data-reveal
            className="mb-8 text-[11px] font-medium uppercase tracking-[0.28em] text-primary"
          >
            The brief
          </div>
          <h2
            data-reveal
            className="font-serif text-3xl font-light leading-[1.15] tracking-[-0.025em] sm:text-5xl lg:text-[3.75rem]"
          >
            Most social platforms ask for your trust and give you nothing in
            return.
            <br />
            <span className="text-muted-foreground">
              We thought we&rsquo;d try the opposite.
            </span>
          </h2>
          <p
            data-reveal
            className="mx-auto mt-10 max-w-2xl text-[16px] leading-[1.7] text-muted-foreground sm:text-lg"
          >
            Every choice in SocialLink — from identity verification to escrow
            custody, from how disputes are reviewed to how payouts settle —
            exists so that the only thing you have to think about is the
            conversation itself.
          </p>
        </section>

        {/* ─── Principles (4-card grid, editorial spacing) ───── */}
        <section className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="hairline mb-16 border-t border-foreground/[0.08] pt-12">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
              <div data-reveal>
                <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  What we hold to
                </div>
                <h2 className="font-serif text-3xl font-light leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  Four promises, plainly stated.
                </h2>
              </div>
              <div
                data-reveal
                className="text-[13px] text-muted-foreground sm:max-w-[260px] sm:text-right"
              >
                Non-negotiable. If we ever drop one, drop us.
              </div>
            </div>

            <div className="grid gap-px overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-foreground/[0.06] sm:grid-cols-2 lg:grid-cols-4">
              {principles.map((p) => (
                <div
                  key={p.figure}
                  data-reveal
                  className="group relative bg-card p-8 transition-colors hover:bg-background lg:p-10"
                >
                  <div className="font-serif text-5xl font-light text-primary/30 transition-colors group-hover:text-primary/70">
                    {p.figure}
                  </div>
                  <h3 className="mt-8 font-serif text-[1.4rem] font-medium leading-tight tracking-tight">
                    {p.title}
                  </h3>
                  <p className="mt-4 text-[14px] leading-[1.65] text-muted-foreground">
                    {p.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Themes — curated menu ──────────────────────────── */}
        <section
          id="themes"
          className="mx-auto max-w-7xl px-6 py-28 lg:px-10 lg:py-36"
        >
          <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div data-reveal>
              <div className="mb-6 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                Discovery themes
              </div>
              <h2 className="font-serif text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.75rem]">
                Eight ways to spend
                <br />
                <span className="italic text-muted-foreground">an afternoon.</span>
              </h2>
              <p className="mt-8 max-w-md text-[15px] leading-[1.7] text-muted-foreground">
                Each theme is curated by our team. Consultants list what they
                actually do, in their own words — no buzzwords, no euphemisms.
              </p>

              <div className="mt-10 flex items-center gap-3 text-[12px] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>New themes added quarterly.</span>
              </div>
            </div>

            <div className="grid gap-px overflow-hidden rounded-[24px] border border-foreground/[0.08] bg-foreground/[0.06]">
              {themes.map((t, i) => (
                <div
                  key={t.name}
                  data-rise
                  className="group relative flex items-center justify-between gap-6 bg-card px-6 py-5 transition-colors hover:bg-background sm:px-8 sm:py-6"
                >
                  <div className="flex items-center gap-5">
                    <div className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div className="font-serif text-lg font-medium tracking-tight sm:text-xl">
                        {t.name}
                      </div>
                      <div className="mt-0.5 text-[12px] text-muted-foreground">{t.note}</div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How it works — Roman numerals (a real sequence) ── */}
        <section
          id="flow"
          className="mx-auto max-w-7xl px-6 py-28 lg:px-10 lg:py-36"
        >
          <div className="hairline mb-20 border-t border-foreground/[0.08] pt-12">
            <div className="mb-16 max-w-3xl" data-reveal>
              <div className="mb-6 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                How it works
              </div>
              <h2 className="font-serif text-3xl font-light leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.75rem]">
                From hello to settle
                <br />
                <span className="text-muted-foreground">in four movements.</span>
              </h2>
            </div>

            <div className="grid gap-px overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-foreground/[0.06] lg:grid-cols-4">
              {flow.map((f, i) => (
                <div
                  key={f.step}
                  data-reveal
                  className="relative bg-card p-8 transition-colors hover:bg-background lg:p-10"
                >
                  <div className="flex items-baseline justify-between">
                    <div className="font-serif text-6xl font-light text-primary/40 lg:text-7xl">
                      {f.step}
                    </div>
                    {i < flow.length - 1 && (
                      <ArrowRight className="hidden h-4 w-4 text-muted-foreground/40 lg:block" />
                    )}
                  </div>
                  <h3 className="mt-10 font-serif text-2xl font-medium tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-[14px] leading-[1.65] text-muted-foreground">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Trust — 4 explicit capabilities ────────────────── */}
        <section className="mx-auto max-w-7xl px-6 pb-28 lg:px-10 lg:pb-36">
          <div className="grid gap-px overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-foreground/[0.06] sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((t) => {
              const Icon = t.icon;
              return (
                <div
                  key={t.title}
                  data-reveal
                  className="bg-card p-9 transition-colors hover:bg-background lg:p-10"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-foreground/[0.08] bg-background">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-7 font-serif text-xl font-medium tracking-tight">
                    {t.title}
                  </h3>
                  <p className="mt-3 text-[13.5px] leading-[1.65] text-muted-foreground">
                    {t.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Numbers band — honest footer-stats ─────────────── */}
        <section className="border-y border-foreground/[0.08] bg-foreground/[0.02] py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="border-l border-foreground/[0.1] pl-6">
                  <div className="font-serif text-5xl font-light leading-none tracking-tight sm:text-6xl">
                    {s.value}
                  </div>
                  <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Closing CTA — quiet, considered ───────────────── */}
        <section className="mx-auto max-w-5xl px-6 py-32 text-center lg:px-10 lg:py-40">
          <div data-reveal>
            <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-foreground/[0.08] bg-card px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
              Open in Lagos
            </div>
            <h2 className="font-serif text-4xl font-light leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.5rem]">
              The rest of the evening
              <br />
              <span className="italic text-primary">is yours to design.</span>
            </h2>
            <p className="mx-auto mt-8 max-w-xl text-[16px] leading-[1.65] text-muted-foreground sm:text-lg">
              Connect your OKX Wallet to start. Zero gas, no card required.
              No card required to browse.
            </p>
            <div className="mt-14 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/login"
                className="btn-coral inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-9 text-[14px] font-semibold tracking-tight text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
              >
                Create an account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="btn-ghost-warm inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-9 text-[14px] font-semibold tracking-tight text-foreground transition-colors hover:bg-foreground/[0.04] sm:w-auto"
              >
                Apply as a Consultant
              </Link>
            </div>
          </div>
        </section>

        {/* ─── FAQ ───────────────────────────────────────────── */}
        <section id="faq" className="mx-auto max-w-3xl px-6 pb-32 lg:px-10">
          <div data-reveal className="mb-14 text-center">
            <div className="mb-5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Frequently asked
            </div>
            <h2 className="font-serif text-3xl font-light tracking-tight sm:text-5xl">
              What people want to know
            </h2>
          </div>

          <Accordion className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="rounded-2xl border border-foreground/[0.08] bg-card px-7 py-1 transition-colors data-open:bg-background data-open:shadow-sm"
              >
                <AccordionTrigger className="py-6 text-left font-serif text-[18px] font-medium tracking-tight text-foreground hover:no-underline sm:text-lg">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-[15px] leading-[1.7] text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>

      <Footer />
      </div>
    </>
  );
}
