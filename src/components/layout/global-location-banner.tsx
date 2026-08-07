"use client";

import { useEffect, useState } from "react";
import { MapPin, AlertCircle, Loader2 } from "lucide-react";
import { getCurrentPosition, GeoLocation } from "@/lib/location";
import { usePathname } from "next/navigation";

export function GlobalLocationBanner() {
  const pathname = usePathname();
  const [locationStr, setLocationStr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // We only show this inside the dashboard layout or specific paths
  // But since it's mounted in the shell, it's fine.

  useEffect(() => {
    let mounted = true;

    async function fetchLocation() {
      setLoading(true);
      setError(null);
      try {
        const pos = await getCurrentPosition();
        
        // Reverse geocoding to get a readable string (using a free API or just showing lat/lng)
        // For simplicity, we can show a formatted lat/lng or "Location Granted"
        // Let's use OpenStreetMap Nominatim for a quick reverse geocode if possible, 
        // or just display the coordinates gracefully.
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&zoom=10`);
          if (res.ok) {
            const data = await res.json();
            if (mounted) {
              setLocationStr(data.address?.city || data.address?.state || data.name || `${pos.lat.toFixed(2)}, ${pos.lng.toFixed(2)}`);
            }
          } else {
            if (mounted) setLocationStr(`${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
          }
        } catch (e) {
          if (mounted) setLocationStr(`${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
        }
      } catch (err: any) {
        if (mounted) {
          setError("Location access denied or unavailable. Some features may not work.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchLocation();

    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="bg-primary/10 text-primary px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Detecting your location...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>{error}</span>
        <button 
          onClick={() => window.location.reload()} 
          className="underline ml-1 hover:text-destructive/80"
        >
          Retry
        </button>
      </div>
    );
  }

  if (locationStr) {
    return (
      <div className="bg-primary/10 text-primary px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium">
        <MapPin className="h-3.5 w-3.5" />
        <span>Current Location: {locationStr}</span>
      </div>
    );
  }

  return null;
}