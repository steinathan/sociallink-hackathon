"use client";

import { motion } from "framer-motion";
import { Footer } from "@/components/layout/footer";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LogoFull } from "@/components/layout/logo";
import { Shield, Lock, FileText, CheckCircle, Mail } from "lucide-react";

const sections = [
  {
    n: "01",
    icon: CheckCircle,
    title: "Acceptance of terms",
    body: "By accessing or using SocialLink (the &ldquo;Platform&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, you may not use the platform. Our services are intended for individuals aged 18 and above.",
    list: [],
  },
  {
    n: "02",
    icon: Shield,
    title: "Platform policy",
    body: "SocialLink is a social discovery and specialized consultation platform. We strictly prohibit the use of our platform for any illegal activities, including but not limited to solicitation, adult-oriented services, or any exchange prohibited by Nigerian law.",
    list: [
      "Consultants offer social companionship, event attendance, business networking, and lifestyle coaching.",
      "Members use the platform for legitimate social discovery and professional consultation.",
      "All payments flow through Paystack escrow — never direct transfers between Members and Consultants.",
    ],
  },
  {
    n: "03",
    icon: FileText,
    title: "Account integrity",
    body: "You agree to provide accurate information at sign-up. Phone numbers are verified via OTP. We reserve the right to suspend or terminate any account found providing false information or misusing the platform.",
    list: [],
  },
  {
    n: "04",
    icon: Lock,
    title: "Escrow and payments",
    body: "When a session is booked, the retainer is held in escrow. The Consultant has 30 minutes to accept; otherwise the funds return to the Member automatically. On session completion, funds release with a 15% platform fee deducted; the Consultant receives 85%. Disputes are reviewed by our team.",
    list: [],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-foreground/[0.06] bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <LogoFull />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
            <FileText className="h-3 w-3" strokeWidth={1.5} />
            Terms
          </div>
          <h1 className="font-serif text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl">
            Terms of service.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-[1.65] text-muted-foreground">
            The agreement between you and SocialLink. Please read it — it covers your account, your sessions, and your money.
          </p>
          <div className="mt-4 font-mono text-[11px] tabular-nums text-muted-foreground">
            Last updated · March 2026
          </div>
        </motion.div>

        <div className="mt-16 space-y-12">
          {sections.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.section
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="border-t border-foreground/[0.06] pt-8"
              >
                <div className="flex items-start gap-5">
                  <div className="font-serif text-2xl font-light text-primary/40">
                    {s.n}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                      <h2 className="font-serif text-xl font-medium tracking-tight">
                        {s.title}
                      </h2>
                    </div>
                    <p className="mt-3 text-[15px] leading-[1.65] text-muted-foreground">
                      {s.body}
                    </p>
                    {s.list.length > 0 && (
                      <ul className="mt-5 space-y-3">
                        {s.list.map((item, j) => (
                          <li key={j} className="flex gap-3 text-[14px] leading-[1.6] text-muted-foreground">
                            <div className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                            <span dangerouslySetInnerHTML={{ __html: item }} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </motion.section>
            );
          })}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="mt-16 overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card p-8 sm:p-10"
        >
          <div className="flex items-start gap-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Mail className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-xl font-medium tracking-tight">
                Questions about these terms?
              </h3>
              <p className="mt-2 max-w-md text-[14px] leading-[1.6] text-muted-foreground">
                Reach our legal team — we&apos;ll come back to you within two business days.
              </p>
              <a
                href="mailto:legal@sociallink.ng"
                className="mt-4 inline-flex items-center gap-2 font-mono text-[13px] font-medium text-primary hover:underline"
              >
                legal@sociallink.ng
              </a>
            </div>
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
}
