"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getScopedCollectionRef, getScopedDocRef } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth-store";
import { GeoLocation, isLocationAllowed, ALLOWED_CITIES } from "@/lib/location";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MapPin, ExternalLink } from "lucide-react";

export function LocationRestricted() {
  const router = useRouter();
  const { firebaseUser } = useAuthStore();
  const [isRestricted, setIsRestricted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkLocation() {
      if (!firebaseUser?.uid) {
        setLoading(false);
        return;
      }

      try {
        const profileSnap = await getDoc(getScopedDocRef(db, "profiles", firebaseUser.uid));
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          if (data.location) {
            const userLocation: GeoLocation = {
              lat: data.location.latitude,
              lng: data.location.longitude,
            };
            const allowed = isLocationAllowed(userLocation);
            setIsRestricted(!allowed);
          }
        }
      } catch {
        // If we can't check, don't restrict
      } finally {
        setLoading(false);
      }
    }

    checkLocation();
  }, [firebaseUser?.uid]);

  if (loading || !isRestricted) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95">
      <Card className="mx-4 max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Location Not Supported</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            SocialLink is currently only available in <strong>{ALLOWED_CITIES.join(" and ")}</strong>. 
            Your current location is outside our service area.
          </p>
          <p className="text-sm text-muted-foreground">
            You can still update your location in your profile to one of our supported cities.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => router.push("/profile")}>
              <MapPin className="mr-2 h-4 w-4" />
              Update Location
            </Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Go to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
