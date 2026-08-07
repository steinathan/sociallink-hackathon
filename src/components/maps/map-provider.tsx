"use client";

import { APIProvider } from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export function MapProvider({ children }: { children: React.ReactNode }) {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "your_google_maps_api_key") {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-border bg-muted">
        <p className="text-sm text-muted-foreground">
          Google Maps API key not configured
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      {children}
    </APIProvider>
  );
}
