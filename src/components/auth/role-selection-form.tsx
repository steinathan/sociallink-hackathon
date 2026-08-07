"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { createUserDocument } from "@/actions/user.actions";
import { UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Briefcase,
  Check,
  Loader2,
  ShieldCheck,
  Star,
  Wallet,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const THEMES = [
  { name: "Cultural Guide", note: "Lagos · Abuja" },
  { name: "Event Attendance", note: "Gala · Premiere" },
  { name: "Travel Partner", note: "In-country · Regional" },
  { name: "Lifestyle Coaching", note: "Wardrobe · Presence" },
  { name: "Dining Companion", note: "Reservation-ready" },
  { name: "Business Networking", note: "Exec circles" },
  { name: "Language Exchange", note: "Yorùbá · Igbo · French" },
  { name: "Fitness Partner", note: "Gym · Padel · Run" },
];

const roles = [
  {
    id: "MEMBER" as UserRole,
    icon: Users,
    title: "Join as a Member",
    tagline: "Discover & book Consultants",
    perks: [
      { icon: ShieldCheck, text: "Browse verified Consultants" },
      { icon: Wallet, text: "Escrowed retainers, every time" },
      { icon: Star, text: "Rated by Members after each session" },
    ],
  },
  {
    id: "CONSULTANT" as UserRole,
    icon: Briefcase,
    title: "Apply as a Consultant",
    tagline: "Offer specialized sessions",
    perks: [
      { icon: Wallet, text: "Set your own retainer & themes" },
      { icon: ShieldCheck, text: "Accept incoming session requests" },
      { icon: Star, text: "Keep 85% of every session fee" },
    ],
  },
];

const SERVICE_TEMPLATES = [
  {
    title: "Cultural Guide Session",
    price: "20000",
    description: "Help Members discover local culture, food, and city highlights through a guided in-person session.",
  },
  {
    title: "Event Attendance Support",
    price: "35000",
    description: "Attend social or professional events with a Member and provide confident, friendly support throughout.",
  },
  {
    title: "Business Networking Session",
    price: "50000",
    description: "Support Members with local networking etiquette, introductions, and event-based professional connection.",
  },
  {
    title: "Lifestyle Coaching Session",
    price: "100000",
    description: "Provide practical guidance on communication, confidence, and social presence in real-world settings.",
  },
];

export function RoleSelectionForm() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);

  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [servicePrice, setServicePrice] = useState("");

  function handleNextStep() {
    if (step === 1 && !selectedRole) {
      setError("Please select how you'd like to join.");
      return;
    }
    if (step === 2) {
      if (!displayName.trim()) {
        setError("Display name is required.");
        return;
      }
      if (selectedRole === "MEMBER") {
        submitForm();
        return;
      }
    }
    setError("");
    setStep((s) => (s + 1) as 1 | 2 | 3);
  }

  function handlePrevStep() {
    setError("");
    setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3);
  }

  async function submitForm() {
    if (selectedRole === "CONSULTANT" && (!serviceTitle.trim() || !servicePrice)) {
      setError("Please add at least one session to continue.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const idToken = await user.getIdToken();

      const services =
        selectedRole === "CONSULTANT"
          ? [
              {
                id: crypto.randomUUID(),
                title: serviceTitle,
                description: serviceDesc,
                price: parseInt(servicePrice),
              },
            ]
          : [];

      const result = await createUserDocument(
        idToken,
        selectedRole!,
        user.phoneNumber ?? "",
        {
          displayName,
          bio,
          themes: selectedThemes,
          services,
        }
      );

      if (!result.success) {
        setError(result.error ?? "Failed to create account.");
        return;
      }

      toast.success("Profile complete");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  const totalSteps = selectedRole === "CONSULTANT" ? 3 : 2;
  const progressPct = (step / totalSteps) * 100;

  return (
    <div className="space-y-10">
      {/* Progress rail */}
      <div>
        <div className="mb-3 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          <span>
            Step {String(step).padStart(2, "0")} of {String(totalSteps).padStart(2, "0")}
          </span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="h-full rounded-full bg-primary"
          />
        </div>
      </div>

      {error && (
        <Alert className="border-destructive/25 bg-destructive/[0.06] text-destructive">
          <AlertDescription className="text-[12.5px] font-medium">{error}</AlertDescription>
        </Alert>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            <header>
              <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
                Getting started
              </div>
              <h2 className="mt-3 font-serif text-3xl font-light leading-tight tracking-tight">
                How will you use SocialLink?
              </h2>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Pick the role that fits you best. You can refine your profile afterward.
              </p>
            </header>

            <div className="grid gap-3 lg:grid-cols-2">
              {roles.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;

                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    className={cn(
                      "group relative overflow-hidden rounded-[24px] border bg-card p-7 text-left transition-all",
                      isSelected
                        ? "border-primary/40 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.18)]"
                        : "border-foreground/[0.08] hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      </div>
                      {isSelected && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                    <h3 className="mt-5 font-serif text-xl font-medium tracking-tight">
                      {role.title}
                    </h3>
                    <div className="mt-1 text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
                      {role.tagline}
                    </div>
                    <ul className="mt-6 space-y-3">
                      {role.perks.map((p, i) => {
                        const PIcon = p.icon;
                        return (
                          <li key={i} className="flex items-start gap-3 text-[13px]">
                            <PIcon
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                              strokeWidth={1.5}
                            />
                            <span className="text-muted-foreground">{p.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="space-y-8"
          >
            <header>
              <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
                Your profile
              </div>
              <h2 className="mt-3 font-serif text-3xl font-light leading-tight tracking-tight">
                Tell people who you are.
              </h2>
            </header>

            <div className="space-y-6">
              <div className="space-y-2.5">
                <Label
                  htmlFor="displayName"
                  className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                >
                  Display name <span className="text-primary">*</span>
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How you'd like to be addressed"
                  autoFocus
                  className="h-14 rounded-2xl border-foreground/[0.08] bg-card px-5 text-[15px]"
                />
              </div>

              <div className="space-y-2.5">
                <Label
                  htmlFor="bio"
                  className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                >
                  Short bio
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A line or two about you"
                  rows={3}
                  className="rounded-2xl border-foreground/[0.08] bg-card px-5 py-4 text-[14px]"
                />
              </div>

              <div>
                <Label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Themes
                </Label>
                <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                  Optional — pick what resonates with you.
                </p>
                <div className="mt-5 grid gap-px overflow-hidden rounded-[20px] border border-foreground/[0.08] bg-foreground/[0.06] sm:grid-cols-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() =>
                        setSelectedThemes((prev) =>
                          prev.includes(t.name)
                            ? prev.filter((x) => x !== t.name)
                            : [...prev, t.name]
                        )
                      }
                      className={cn(
                        "flex items-center justify-between gap-3 bg-card px-5 py-3.5 text-left transition-colors hover:bg-background",
                        selectedThemes.includes(t.name) && "bg-primary/[0.06]"
                      )}
                    >
                      <div>
                        <div className="font-serif text-[14px] font-medium tracking-tight">
                          {t.name}
                        </div>
                        <div className="text-[11.5px] text-muted-foreground">{t.note}</div>
                      </div>
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                          selectedThemes.includes(t.name)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-foreground/[0.15]"
                        )}
                      >
                        {selectedThemes.includes(t.name) && (
                          <Check className="h-3 w-3" strokeWidth={3} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && selectedRole === "CONSULTANT" && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="space-y-8"
          >
            <header>
              <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
                Your first session
              </div>
              <h2 className="mt-3 font-serif text-3xl font-light leading-tight tracking-tight">
                List a session Members can request.
              </h2>
              <p className="mt-2 text-[14px] text-muted-foreground">
                You can add more sessions, adjust pricing, and update anytime.
              </p>
            </header>

            <div>
              <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
                <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />
                Quick start templates
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {SERVICE_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setServiceTitle(tmpl.title);
                      setServicePrice(tmpl.price);
                      setServiceDesc(tmpl.description);
                    }}
                    className="rounded-2xl border border-foreground/[0.08] bg-card p-5 text-left transition-all hover:border-primary/30"
                  >
                    <div className="font-serif text-[14px] font-medium tracking-tight">
                      {tmpl.title}
                    </div>
                    <div className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">
                      {tmpl.description}
                    </div>
                    <div className="mt-3 font-mono text-[12px] tabular-nums text-primary">
                      ₦{parseInt(tmpl.price).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6 border-t border-foreground/[0.06] pt-8">
              <div className="space-y-2.5">
                <Label
                  htmlFor="svc-title"
                  className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                >
                  Session title <span className="text-primary">*</span>
                </Label>
                <Input
                  id="svc-title"
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                  placeholder="e.g. Event Attendance Support"
                  className="h-14 rounded-2xl border-foreground/[0.08] bg-card px-5 text-[14px]"
                />
              </div>

              <div className="space-y-2.5">
                <Label
                  htmlFor="svc-price"
                  className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                >
                  Retainer per session (₦) <span className="text-primary">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-5 flex items-center font-serif text-base text-muted-foreground">
                    ₦
                  </span>
                  <Input
                    id="svc-price"
                    type="number"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    placeholder="50000"
                    min={1000}
                    className="h-14 rounded-2xl border-foreground/[0.08] bg-card pl-9 font-serif text-[16px] tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label
                  htmlFor="svc-desc"
                  className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                >
                  Description
                </Label>
                <Textarea
                  id="svc-desc"
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  placeholder="What the Member gets"
                  rows={4}
                  className="rounded-2xl border-foreground/[0.08] bg-card px-5 py-4 text-[14px]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="space-y-4 border-t border-foreground/[0.06] pt-6">
        {step === (selectedRole === "CONSULTANT" ? 3 : 2) && (
          <p className="text-center text-[11.5px] text-muted-foreground">
            By completing setup, you agree to our{" "}
            <a href="/terms" target="_blank" className="text-foreground underline-offset-4 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" className="text-foreground underline-offset-4 hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={loading}
              className="btn-ghost-warm h-12 rounded-full px-6 text-[13px] font-medium"
            >
              <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Back
            </Button>
          )}
          <Button
            onClick={step < totalSteps ? handleNextStep : submitForm}
            disabled={loading}
            className="btn-coral h-12 flex-1 rounded-full text-[13px] font-semibold tracking-tight"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : step < totalSteps ? (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
              </>
            ) : (
              <>
                Complete profile
                <Check className="ml-2 h-4 w-4" strokeWidth={2} />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
