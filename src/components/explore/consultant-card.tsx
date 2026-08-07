"use client";

import { useState } from "react";
import { Profile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookingRequestDialog } from "@/components/booking/booking-request-dialog";
import { formatDistance } from "@/lib/location";
import {
  Star,
  MapPin,
  Navigation,
  BadgeCheck,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConsultantCardProps {
  profile: Profile;
  distance?: number;
}

/* Subtle warm gradient band per consultant UID */
function getGradientSeed(uid: string) {
  const seeds = [
    "from-primary/30 via-primary/15 to-accent/30",
    "from-amber-500/20 via-primary/15 to-rose-500/15",
    "from-orange-400/20 via-primary/15 to-amber-500/10",
    "from-rose-500/15 via-primary/15 to-amber-400/15",
    "from-primary/25 via-accent/30 to-amber-400/15",
  ];
  return seeds[uid.charCodeAt(0) % seeds.length];
}

export function ConsultantCard({ profile, distance }: ConsultantCardProps) {
  const [showBooking, setShowBooking] = useState(false);

  const minPrice =
    profile.services && profile.services.length > 0
      ? Math.min(...profile.services.map((s) => s.price))
      : profile.retainer ?? 0;

  const hasMultipleServices = profile.services && profile.services.length > 1;
  const gradient = getGradientSeed(profile.uid);
  const initials = profile.displayName?.charAt(0)?.toUpperCase() ?? "·";

  return (
    <>
      <article
        className="group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-foreground/[0.08] bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_20px_50px_-25px_rgba(0,0,0,0.2)]"
      >
        {/* Cover band */}
        <div
          className={cn(
            "relative h-28 bg-gradient-to-br tape-grain",
            gradient
          )}
        >
          {/* Top hairline */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          {profile.isOnline && (
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-400">
                Online
              </span>
            </span>
          )}

          {profile.averageRating > 0 && (
            <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1 backdrop-blur-sm">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={1} />
              <span className="font-mono text-[11px] font-medium tabular-nums">
                {profile.averageRating.toFixed(1)}
              </span>
            </span>
          )}
        </div>

        {/* Avatar — overlaps cover */}
        <div className="relative -mt-10 flex items-end justify-between px-5">
          <div className="relative">
            <Avatar className="h-20 w-20 border-[3px] border-card shadow-md">
              <AvatarImage
                src={profile.avatarUrl ?? ""}
                className={profile.blurAvatar ? "blur-md scale-110" : ""}
              />
              <AvatarFallback className="bg-primary font-serif text-2xl font-medium text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-primary shadow-sm">
              <BadgeCheck className="h-3 w-3 text-primary-foreground" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
          <h3 className="truncate font-serif text-lg font-medium tracking-tight">
            {profile.displayName || "Anonymous Consultant"}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
            {profile.locationLabel && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary/70" strokeWidth={1.5} />
                {profile.locationLabel}
              </span>
            )}
            {distance !== undefined && distance !== Infinity && (
              <span className="flex items-center gap-1 font-mono tabular-nums text-primary">
                <Navigation className="h-3 w-3" strokeWidth={1.5} />
                {formatDistance(distance)}
              </span>
            )}
          </div>

          {profile.bio && (
            <p className="mt-4 line-clamp-2 text-[12.5px] leading-[1.55] text-muted-foreground">
              {profile.bio}
            </p>
          )}

          {profile.themes && profile.themes.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {profile.themes.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-foreground/[0.08] bg-muted px-2.5 py-0.5 text-[10.5px] font-medium text-muted-foreground"
                >
                  {t}
                </span>
              ))}
              {profile.themes.length > 2 && (
                <span className="rounded-full border border-foreground/[0.08] bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                  +{profile.themes.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Bottom row — price + CTA */}
          <div className="mt-auto flex items-end justify-between gap-3 border-t border-foreground/[0.06] pt-5">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {hasMultipleServices ? "From" : "Retainer"}
              </div>
              <div className="mt-1 font-serif text-xl font-medium tracking-tight tabular-nums">
                ₦{minPrice.toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBooking(true)}
              disabled={!profile.isOnline}
              className={cn(
                "btn-coral inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-[12.5px] font-semibold tracking-tight transition-transform",
                !profile.isOnline && "opacity-50"
              )}
            >
              Request
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </article>

      <BookingRequestDialog
        open={showBooking}
        onOpenChange={setShowBooking}
        consultantProfile={profile}
      />
    </>
  );
}
