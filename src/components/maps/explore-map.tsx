"use client";

import { useState, useCallback } from "react";
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { Profile } from "@/types";
import { GeoLocation, calculateDistance, formatDistance } from "@/lib/location";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Star } from "lucide-react";

interface ExploreMapProps {
  consultants: Profile[];
  userLocation: GeoLocation;
  onSelectConsultant: (consultant: Profile) => void;
}

export function ExploreMap({
  consultants,
  userLocation,
  onSelectConsultant,
}: ExploreMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const map = useMap();

  const handleMarkerClick = useCallback(
    (consultant: Profile) => {
      setSelectedId(consultant.uid);
      if (map && consultant.location) {
        map.panTo({
          lat: consultant.location.latitude,
          lng: consultant.location.longitude,
        });
      }
    },
    [map]
  );

  const selectedConsultant = consultants.find((c) => c.uid === selectedId);

  return (
    <div className="relative h-[500px] w-full overflow-hidden rounded-xl border border-border">
      <Map
        defaultZoom={12}
        defaultCenter={userLocation}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID}
        className="h-full w-full"
      >
        {/* User location marker */}
        <AdvancedMarker position={userLocation}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 shadow-lg ring-2 ring-white">
            <MapPin className="h-4 w-4 text-white" />
          </div>
        </AdvancedMarker>

        {/* Consultant markers */}
        {consultants.map((consultant) => {
          if (!consultant.location) return null;
          const position = {
            lat: consultant.location.latitude,
            lng: consultant.location.longitude,
          };
          const distance = calculateDistance(userLocation, position);

          return (
            <AdvancedMarker
              key={consultant.uid}
              position={position}
              onClick={() => handleMarkerClick(consultant)}
            >
              <div
                className={`flex flex-col items-center transition-transform ${
                  selectedId === consultant.uid ? "scale-110" : ""
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg ring-2 ring-white transition-colors ${
                    consultant.isOnline
                      ? "bg-gradient-to-br from-pink-500 to-rose-500"
                      : "bg-gray-400"
                  }`}
                >
                  <Heart className="h-5 w-5 text-white fill-current" />
                </div>
                <div className="mt-1 rounded-full bg-white px-2 py-0.5 text-xs font-bold shadow-md">
                  {formatDistance(distance)}
                </div>
              </div>
            </AdvancedMarker>
          );
        })}
      </Map>

      {/* Info Window for selected consultant */}
      {selectedConsultant && selectedConsultant.location && (
        <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-border bg-white p-4 shadow-lg dark:bg-card">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500">
              <span className="text-lg font-bold text-white">
                {selectedConsultant.displayName?.charAt(0) ?? "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">
                  {selectedConsultant.displayName || "Anonymous"}
                </h3>
                {selectedConsultant.isOnline && (
                  <Badge
                    variant="outline"
                    className="border-green-500 text-green-500 text-xs"
                  >
                    Online
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {formatDistance(
                  calculateDistance(userLocation, {
                    lat: selectedConsultant.location.latitude,
                    lng: selectedConsultant.location.longitude,
                  })
                )}{" "}
                away
              </div>
              {selectedConsultant.themes && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedConsultant.themes.slice(0, 3).map((theme) => (
                    <Badge key={theme} variant="secondary" className="text-[10px]">
                      {theme}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button size="sm" onClick={() => onSelectConsultant(selectedConsultant)}>
              View
            </Button>
          </div>
        </div>
      )}

      {/* Map legend */}
      <div className="absolute left-4 top-4 rounded-lg border border-border bg-white/90 p-2 text-xs shadow-sm backdrop-blur-sm dark:bg-card/90">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span>You</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-pink-500" />
          <span>Available</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-gray-400" />
          <span>Offline</span>
        </div>
      </div>
    </div>
  );
}
