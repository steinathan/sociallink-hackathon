// ─── Location Utilities ─────────────────────────────────────────────────────

export interface GeoLocation {
  lat: number;
  lng: number;
}

// ─── Calculate distance between two points (Haversine formula) ───────────────
export function calculateDistance(
  point1: GeoLocation,
  point2: GeoLocation
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Return km with 1 decimal
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ─── Format distance for display ─────────────────────────────────────────────
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  if (km < 10) {
    return `${km.toFixed(1)}km`;
  }
  return `${Math.round(km)}km`;
}

// ─── Get current position using browser geolocation ──────────────────────────
export function getCurrentPosition(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

// ─── Default location (Lagos, Nigeria) ───────────────────────────────────────
export const DEFAULT_LOCATION: GeoLocation = {
  lat: 6.5244,
  lng: 3.3792,
};

// ─── Major Nigerian cities for quick selection ───────────────────────────────
export const NIGERIAN_CITIES = [
  { name: "Lagos", lat: 6.5244, lng: 3.3792 },
  { name: "Abuja", lat: 9.0765, lng: 7.3986 },
  { name: "Port Harcourt", lat: 4.8156, lng: 7.0498 },
  { name: "Ibadan", lat: 7.3775, lng: 3.947 },
  { name: "Kano", lat: 12.0022, lng: 8.592 },
  { name: "Enugu", lat: 6.5244, lng: 7.5186 },
  { name: "Benin City", lat: 6.335, lng: 5.6037 },
];

// ─── Allowed cities (for now, only Lagos and Abuja) ───────────────────────────
export const ALLOWED_CITIES = ["Lagos", "Abuja"];

// ─── Check if a location is within allowed cities ─────────────────────────────
export function isLocationAllowed(location: GeoLocation): boolean {
  const threshold = 50; // km tolerance
  for (const city of ALLOWED_CITIES) {
    const cityData = NIGERIAN_CITIES.find((c) => c.name === city);
    if (cityData) {
      const distance = calculateDistance(location, { lat: cityData.lat, lng: cityData.lng });
      if (distance <= threshold) {
        return true;
      }
    }
  }
  return false;
}
