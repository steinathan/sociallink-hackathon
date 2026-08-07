"use client";

import { useState, useCallback } from "react";
import { Map, AdvancedMarker, MapMouseEvent } from "@vis.gl/react-google-maps";
import { GeoLocation, NIGERIAN_CITIES, DEFAULT_LOCATION } from "@/lib/location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Crosshair, CheckCircle } from "lucide-react";

interface LocationPickerProps {
  value?: GeoLocation;
  onChange: (location: GeoLocation, label: string) => void;
  label?: string;
}

export function LocationPicker({ value, onChange, label }: LocationPickerProps) {
  const [position, setPosition] = useState<GeoLocation>(value ?? DEFAULT_LOCATION);
  const [locationLabel, setLocationLabel] = useState(label ?? "");
  const [isDetecting, setIsDetecting] = useState(false);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const latLng = (e as any).latLng;
      if (latLng) {
        const newPos = { lat: latLng.lat(), lng: latLng.lng() };
        setPosition(newPos);
      }
    },
    []
  );

  const detectLocation = useCallback(async () => {
    setIsDetecting(true);
    try {
      const { getCurrentPosition } = await import("@/lib/location");
      const pos = await getCurrentPosition();
      setPosition(pos);
      setLocationLabel("My Current Location");
      onChange(pos, "My Current Location");
    } catch {
      alert("Could not detect location. Please enable location permissions.");
    } finally {
      setIsDetecting(false);
    }
  }, [onChange]);

  const handleCitySelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityName = e.target.value;
    if (!cityName) return;
    const city = NIGERIAN_CITIES.find((c) => c.name === cityName);
    if (city) {
      const pos = { lat: city.lat, lng: city.lng };
      setPosition(pos);
      setLocationLabel(city.name);
      onChange(pos, city.name);
    }
  }, [onChange]);

  const handleSave = useCallback(() => {
    onChange(position, locationLabel || "Custom Location");
  }, [onChange, position, locationLabel]);

  return (
    <div className="space-y-4">
      {/* City Quick Select */}
      <div className="space-y-2">
        <Label>Quick Select City</Label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          onChange={handleCitySelect}
          value=""
        >
          <option value="" disabled>Select a city...</option>
          {NIGERIAN_CITIES.map((city) => (
            <option key={city.name} value={city.name}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      {/* Detect Location Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={detectLocation}
        disabled={isDetecting}
      >
        {isDetecting ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Detecting...
          </>
        ) : (
          <>
            <Crosshair className="mr-2 h-4 w-4" />
            Use My Current Location
          </>
        )}
      </Button>

      {/* Map */}
      <div className="h-[300px] overflow-hidden rounded-lg border border-border">
        <Map
          defaultZoom={12}
          center={position}
          gestureHandling="greedy"
          disableDefaultUI={false}
          onClick={handleMapClick}
          className="h-full w-full"
        >
          <AdvancedMarker position={position}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500 shadow-lg ring-2 ring-white">
              <MapPin className="h-4 w-4 text-white" />
            </div>
          </AdvancedMarker>
        </Map>
      </div>
      <p className="text-xs text-muted-foreground">
        Click anywhere on the map to set your exact location
      </p>

      {/* Location Label */}
      <div className="space-y-2">
        <Label htmlFor="location-label">Location Name</Label>
        <Input
          id="location-label"
          placeholder="e.g., Victoria Island, Lagos"
          value={locationLabel}
          onChange={(e) => setLocationLabel(e.target.value)}
        />
      </div>

      {/* Coordinates Display */}
      <div className="flex items-center justify-between rounded-lg bg-muted p-2 text-xs">
        <span className="text-muted-foreground">
          Lat: {position.lat.toFixed(4)}, Lng: {position.lng.toFixed(4)}
        </span>
        <Button size="sm" onClick={handleSave}>
          <CheckCircle className="mr-1 h-3 w-3" />
          Save
        </Button>
      </div>
    </div>
  );
}
