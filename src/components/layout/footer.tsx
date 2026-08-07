"use client";

import Link from "next/link";
import Image from "next/image";
import { Twitter, Instagram, Mail, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-foreground/[0.08] bg-background">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        {/* Top section */}
        <div className="grid gap-12 py-20 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand col */}
          <div>
            <Link href="/" className="mb-6 inline-flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-foreground/[0.08] bg-card p-1.5">
                <Image src="/icons/favicon.svg" alt="SocialLink" width={28} height={28} className="h-full w-full object-contain" />
              </div>
              <span className="font-serif text-xl font-medium tracking-tight">
                Social<span className="text-primary">Link</span>
              </span>
            </Link>
            <p className="mb-7 max-w-xs text-[13.5px] leading-[1.65] text-muted-foreground">
              Nigeria&apos;s most considered social discovery platform.
              Verified identities, escrowed retainers, real-time settlement.
            </p>
            <div className="flex gap-2.5">
              {[
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: Instagram, href: "#", label: "Instagram" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-foreground/[0.08] bg-card text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
                >
                  <s.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-6 font-serif text-sm font-medium uppercase tracking-[0.18em] text-foreground">
              Platform
            </h4>
            <ul className="space-y-3.5">
              {[
                { label: "How it works", href: "/#flow" },
                { label: "Browse Consultants", href: "/explore" },
                { label: "Become a Consultant", href: "/login" },
                { label: "Trust & safety", href: "/#platform" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[13.5px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-6 font-serif text-sm font-medium uppercase tracking-[0.18em] text-foreground">
              Support
            </h4>
            <ul className="space-y-3.5">
              {[
                { label: "Help centre", href: "#faq" },
                { label: "Dispute resolution", href: "/admin/disputes" },
                { label: "Community guidelines", href: "/terms" },
                { label: "Report an issue", href: "mailto:support@sociallink.ng" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[13.5px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-6 font-serif text-sm font-medium uppercase tracking-[0.18em] text-foreground">
              Contact
            </h4>
            <ul className="space-y-3.5">
              <li>
                <a
                  href="mailto:support@sociallink.ng"
                  className="inline-flex items-center gap-2.5 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                  support@sociallink.ng
                </a>
              </li>
              <li>
                <a
                  href="tel:+2348000000000"
                  className="inline-flex items-center gap-2.5 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Phone className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                  +234 800 000 0000
                </a>
              </li>
            </ul>
            <div className="mt-7 rounded-2xl border border-foreground/[0.08] bg-card p-5">
              <div className="font-serif text-sm font-medium">Get platform updates</div>
              <p className="mt-1 text-[12px] leading-[1.5] text-muted-foreground">
                Quarterly notes on new themes, settlement changes, and trust.
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-foreground/[0.08]" />

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 py-7 text-[12px] text-muted-foreground md:flex-row">
          <p>
            © {new Date().getFullYear()} SocialLink Technologies Ltd. · RC 1234567
          </p>
          <div className="flex flex-wrap justify-center gap-5 md:justify-end">
            {[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Cookies", href: "/privacy#cookies" },
              { label: "Compliance", href: "/terms#compliance" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
