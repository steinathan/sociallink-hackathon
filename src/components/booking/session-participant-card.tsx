"use client";

import { Profile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BadgeCheck,
  MapPin,
  Star,
  Users,
  Briefcase,
  Cigarette,
  Dumbbell,
  Navigation,
  Calendar,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistance, calculateDistance, GeoLocation } from "@/lib/location";
import { differenceInYears, parseISO } from "date-fns";

interface SessionParticipantCardProps {
  profile: Profile;
  role: "MEMBER" | "CONSULTANT";
  /** The other party's location — used to show distance to them */
  otherLocation?: GeoLocation | null;
  /** Label shown in the card header */
  viewerLabel?: string;
}

export function SessionParticipantCard({
  profile,
  role,
  otherLocation,
  viewerLabel,
}: SessionParticipantCardProps) {
  const profileLoc: GeoLocation | null = profile.location
    ? { lat: profile.location.latitude, lng: profile.location.longitude }
    : null;

  const distanceKm =
    profileLoc && otherLocation
      ? calculateDistance(profileLoc, otherLocation)
      : null;

  const age = profile.dateOfBirth
    ? differenceInYears(new Date(), parseISO(profile.dateOfBirth))
    : null;

  const isConsultant = role === "CONSULTANT";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5",
        isConsultant
          ? "shadow-md shadow-purple-500/5"
          : "shadow-md shadow-primary/5"
      )}
    >
      {/* Top glow accent */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-0.5",
          isConsultant
            ? "bg-gradient-to-r from-transparent via-purple-500/70 to-transparent"
            : "bg-gradient-to-r from-transparent via-primary/70 to-transparent"
        )}
      />

      {/* Header label */}
      <div className="mb-4 flex items-center justify-between">
        <Badge
          className={cn(
            "rounded-full text-xs font-bold",
            isConsultant
              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
              : "bg-primary/10 text-primary"
          )}
        >
          {isConsultant ? (
            <Briefcase className="mr-1 h-3 w-3" />
          ) : (
            <Users className="mr-1 h-3 w-3" />
          )}
          {viewerLabel ?? (isConsultant ? "Consultant" : "Member")}
        </Badge>

        {/* Online dot - Only show for Consultants */}
        {isConsultant && (
          <span
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-medium",
              profile.isOnline ? "text-green-500" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "relative flex h-2 w-2 rounded-full",
                profile.isOnline ? "bg-green-500" : "bg-muted-foreground"
              )}
            >
              {profile.isOnline && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              )}
            </span>
            {profile.isOnline ? "Online" : "Offline"}
          </span>
        )}
      </div>

      {/* Avatar + name */}
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <Avatar className="h-16 w-16 border-2 border-border shadow-md">
            <AvatarImage
              src={profile.avatarUrl ?? ""}
              className={profile.blurAvatar ? "blur-sm scale-110" : ""}
            />
            <AvatarFallback
              className={cn(
                "text-xl font-bold text-white",
                isConsultant
                  ? "bg-gradient-to-br from-purple-500 to-violet-600"
                  : "bg-gradient-to-br from-primary to-pink-400"
              )}
            >
              {profile.displayName?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          {/* Verified tick */}
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full shadow",
              isConsultant ? "bg-purple-600" : "bg-primary"
            )}
          >
            <BadgeCheck className="h-3 w-3 text-white" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold leading-tight">
            {profile.displayName || "Anonymous"}
          </h3>

          {/* Rating */}
          <div className="mt-0.5 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {profile.averageRating?.toFixed(1) ?? "0.0"}
            </span>
            <span className="text-xs text-muted-foreground">
              ({profile.totalReviews ?? 0} reviews)
            </span>
          </div>

          {/* Location */}
          {profile.locationLabel && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0 text-primary/60" />
              <span className="truncate">{profile.locationLabel}</span>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Bio */}
      {profile.bio && (
        <p className="mb-4 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {profile.bio}
        </p>
      )}

      {/* Attributes row */}
      <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
        {age && (
          <span className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 font-medium text-muted-foreground">
            <Calendar className="h-3 w-3" /> {age} years
          </span>
        )}
        {profile.gender && (
          <span className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 font-medium text-muted-foreground">
            {profile.gender}
          </span>
        )}
        {profile.sexualOrientation && (
          <span className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 font-medium text-muted-foreground">
            <Heart className="h-3 w-3" /> {profile.sexualOrientation}
          </span>
        )}
        {profile.bodyBuild && (
          <span className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 font-medium text-muted-foreground">
            <Dumbbell className="h-3 w-3" /> {profile.bodyBuild}
          </span>
        )}
        {profile.smoking && (
          <span className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 font-medium text-muted-foreground">
            <Cigarette className="h-3 w-3" /> Smoker
          </span>
        )}
        {profile.city && (
          <span className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 font-medium text-muted-foreground">
            {profile.city}
          </span>
        )}
      </div>

      {/* Themes */}
      {profile.themes && profile.themes.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {profile.themes.slice(0, 4).map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className="rounded-full px-2 py-0.5 text-[10px]"
            >
              {t}
            </Badge>
          ))}
          {profile.themes.length > 4 && (
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0.5 text-[10px]"
            >
              +{profile.themes.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* Distance to other party */}
      {distanceKm !== null && (
        <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs">
          <Navigation className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="font-medium">
            {formatDistance(distanceKm)} from{" "}
            {isConsultant ? "member" : "consultant"}
          </span>
          <span className="ml-auto text-muted-foreground">
            ~{Math.ceil((distanceKm / 30) * 60)} min ETA
          </span>
        </div>
      )}
    </div>
  );
}
