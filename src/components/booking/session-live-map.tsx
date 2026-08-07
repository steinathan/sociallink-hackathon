"use client";

import { useEffect, useRef, useState } from "react";
import { Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { Profile } from "@/types";
import { GeoLocation, calculateDistance, formatDistance } from "@/lib/location";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, Heart, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentPosition } from "@/lib/location";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SessionLiveMapProps {
  memberProfile: Profile | null;
  consultantProfile: Profile | null;
  /** The UID of the current viewer, so we can label "You" vs the other person */
  viewerUid: string;
}

function PulsingMarker({ color, label }: { color: string; label: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <div
        className="absolute h-10 w-10 animate-ping rounded-full opacity-25"
        style={{ backgroundColor: color }}
      />
      <div
        className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-lg ring-2 ring-white"
        style={{ backgroundColor: color }}
      >
        {label === "You" ? (
          <Users className="h-5 w-5 text-white" />
        ) : (
          <Heart className="h-5 w-5 fill-current text-white" />
        )}
      </div>
      <div className="mt-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold shadow-md">
        {label}
      </div>
    </div>
  );
}

function FitBoundsOnLoad({
  memberLoc,
  consultantLoc,
}: {
  memberLoc: GeoLocation | null;
  consultantLoc: GeoLocation | null;
}) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (!map || fitted.current) return;
    if (!memberLoc && !consultantLoc) return;

    if (memberLoc && consultantLoc) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(memberLoc);
      bounds.extend(consultantLoc);
      map.fitBounds(bounds, 80);
      fitted.current = true;
    } else {
      const single = memberLoc ?? consultantLoc!;
      map.setCenter(single);
      map.setZoom(14);
      fitted.current = true;
    }
  }, [map, memberLoc, consultantLoc]);

  return null;
}

export function SessionLiveMap({
  memberProfile,
  consultantProfile,
  viewerUid,
}: SessionLiveMapProps) {
  const [liveViewerLoc, setLiveViewerLoc] = useState<GeoLocation | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const consultantLoc: GeoLocation | null = consultantProfile?.location
    ? { lat: consultantProfile.location.latitude, lng: consultantProfile.location.longitude }
    : null;

  const memberLoc: GeoLocation | null = memberProfile?.location
    ? { lat: memberProfile.location.latitude, lng: memberProfile.location.longitude }
    : null;

  // Use live GPS for the viewer if available, otherwise fall back to their profile location
  const isViewer = (uid: string) => uid === viewerUid;

  const resolvedMemberLoc = isViewer(memberProfile?.uid ?? "") && liveViewerLoc
    ? liveViewerLoc
    : memberLoc;

  const resolvedConsultantLoc = isViewer(consultantProfile?.uid ?? "") && liveViewerLoc
    ? liveViewerLoc
    : consultantLoc;

  const distance =
    resolvedMemberLoc && resolvedConsultantLoc
      ? calculateDistance(resolvedMemberLoc, resolvedConsultantLoc)
      : null;

  // ETA estimate: assume average travel speed of 30 km/h in city traffic
  const etaMinutes = distance !== null ? Math.ceil((distance / 30) * 60) : null;

  // Walking ETA for short distances
  const walkMinutes = distance !== null && distance < 2
    ? Math.ceil((distance / 5) * 60)
    : null;

  const defaultCenter = resolvedMemberLoc ??
    resolvedConsultantLoc ?? { lat: 6.5244, lng: 3.3792 };

  const refreshLocation = async () => {
    setIsRefreshing(true);
    try {
      const pos = await getCurrentPosition();
      setLiveViewerLoc(pos);
    } catch {
      // silently ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  // Try to get live location on mount
  useEffect(() => {
    refreshLocation();
    // Also watch for continuous updates
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      (pos) => setLiveViewerLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">Live Session Map</p>
            <p className="text-[10px] text-muted-foreground">Updates automatically</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={refreshLocation}
          disabled={isRefreshing}
          className="h-7 gap-1.5 rounded-lg text-xs"
        >
          <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Distance + ETA strip */}
      {distance !== null && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 divide-x divide-border/40 border-b border-border/40 bg-muted/30"
        >
          <div className="flex items-center justify-center gap-2 py-3">
            <Navigation className="h-4 w-4 text-primary" />
            <div className="text-center">
              <p className="text-xs font-semibold text-muted-foreground">Distance</p>
              <p className="text-sm font-bold">{formatDistance(distance)}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 py-3">
            <Clock className="h-4 w-4 text-primary" />
            <div className="text-center">
              <p className="text-xs font-semibold text-muted-foreground">
                {walkMinutes ? "Walk ETA" : "Drive ETA"}
              </p>
              <p className="text-sm font-bold">
                ~{walkMinutes ?? etaMinutes} min
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Map */}
      <div className="relative h-72">
        <Map
          defaultZoom={13}
          defaultCenter={defaultCenter}
          gestureHandling="greedy"
          disableDefaultUI
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID}
          className="h-full w-full"
        >
          <FitBoundsOnLoad
            memberLoc={resolvedMemberLoc}
            consultantLoc={resolvedConsultantLoc}
          />

          {/* Member marker */}
          {resolvedMemberLoc && (
            <AdvancedMarker position={resolvedMemberLoc}>
              <PulsingMarker
                color={isViewer(memberProfile?.uid ?? "") ? "#3b82f6" : "#6b7280"}
                label={
                  isViewer(memberProfile?.uid ?? "")
                    ? "You"
                    : memberProfile?.displayName?.split(" ")[0] ?? "Member"
                }
              />
            </AdvancedMarker>
          )}

          {/* Consultant marker */}
          {resolvedConsultantLoc && (
            <AdvancedMarker position={resolvedConsultantLoc}>
              <PulsingMarker
                color={isViewer(consultantProfile?.uid ?? "") ? "#3b82f6" : "#ec4899"}
                label={
                  isViewer(consultantProfile?.uid ?? "")
                    ? "You"
                    : consultantProfile?.displayName?.split(" ")[0] ?? "Consultant"
                }
              />
            </AdvancedMarker>
          )}
        </Map>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 rounded-xl border border-border/60 bg-background/90 p-2 text-[11px] shadow-md backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span>Your location</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-pink-500" />
            <span>Other party</span>
          </div>
        </div>

        {/* No location notice */}
        {!resolvedMemberLoc && !resolvedConsultantLoc && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60 backdrop-blur-sm">
            <div className="rounded-xl bg-card p-4 text-center shadow-lg">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">Location unavailable</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Enable location access for live tracking
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
