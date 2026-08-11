"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { getScopedCollectionRef, getScopedDocRef } from "@/lib/firebase";
import { Profile } from "@/types";
import { ConsultantCard } from "@/components/explore/consultant-card";
import { MapProvider } from "@/components/maps/map-provider";
import { ExploreMap } from "@/components/maps/explore-map";
import { BookingRequestDialog } from "@/components/booking/booking-request-dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin, LayoutGrid, Crosshair, ArrowUpRight } from "lucide-react";
import { GeoLocation, calculateDistance, DEFAULT_LOCATION, getCurrentPosition } from "@/lib/location";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

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

function ConsultantCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-foreground/[0.08] bg-card shadow-sm">
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="px-4 pb-4 pt-10 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-full rounded-md" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="border-t border-foreground/[0.06] pt-3 flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const { userDoc } = useAuthStore();
  const [consultants, setConsultants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [userLocation, setUserLocation] = useState<GeoLocation>(DEFAULT_LOCATION);
  const [maxDistance, setMaxDistance] = useState(50);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState<Profile | null>(null);

  useEffect(() => {
    if (userDoc?.role === "CONSULTANT") router.replace("/dashboard");
  }, [userDoc, router]);

  useEffect(() => {
    async function getLocation() {
      try {
        const pos = await getCurrentPosition();
        setUserLocation(pos);
      } catch {
        const user = auth.currentUser;
        if (user) {
          const profileSnap = await getDocs(
            query(getScopedCollectionRef(db, "profiles"), where("uid", "==", user.uid))
          );
          if (!profileSnap.empty) {
            const data = profileSnap.docs[0].data();
            if (data.location) {
              setUserLocation({ lat: data.location.latitude, lng: data.location.longitude });
            }
          }
        }
      }
    }
    getLocation();
  }, []);

  useEffect(() => {
    async function fetchConsultants() {
      setLoading(true);
      try {
        const usersRef = getScopedCollectionRef(db, "users");
        const usersQ = query(usersRef, where("role", "==", "CONSULTANT"));
        const usersSnap = await getDocs(usersQ);
        const consultantUids = usersSnap.docs.map((d) => d.id);
        if (consultantUids.length === 0) {
          setConsultants([]);
          return;
        }
        const profilesRef = getScopedCollectionRef(db, "profiles");
        // Firestore `in` caps at 30 values per query; the seed ships 200
        // consultants, so split the uid list into chunks and merge.
        const IN_LIMIT = 30;
        const found: Profile[] = [];
        for (let i = 0; i < consultantUids.length; i += IN_LIMIT) {
          const chunk = consultantUids.slice(i, i + IN_LIMIT);
          const q = selectedTheme
            ? query(profilesRef, where("uid", "in", chunk), where("themes", "array-contains", selectedTheme), limit(100))
            : query(profilesRef, where("uid", "in", chunk), limit(100));
          const snap = await getDocs(q);
          found.push(...snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Profile)));
        }
        setConsultants(found);
      } catch (err) {
        console.error("Failed to fetch consultants", err);
      } finally {
        setLoading(false);
      }
    }
    fetchConsultants();
  }, [selectedTheme]);

  const consultantsWithDistance = useMemo(() => {
    const all = consultants.map((c) => {
      if (!c.location) return { ...c, distance: Infinity };
      const consultantLoc = { lat: c.location.latitude, lng: c.location.longitude };
      return { ...c, distance: calculateDistance(userLocation, consultantLoc) };
    });
    const strictNearby = all.filter((c) => c.distance <= maxDistance);
    const results = strictNearby.length > 0 ? strictNearby : all;
    return results.sort((a, b) => a.distance - b.distance);
  }, [consultants, userLocation, maxDistance]);

  const filtered = consultantsWithDistance.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const matchesProfile =
      c.displayName?.toLowerCase().includes(s) ||
      c.bio?.toLowerCase().includes(s) ||
      c.locationLabel?.toLowerCase().includes(s);
    const matchesServices = c.services?.some(
      (service) =>
        service.title.toLowerCase().includes(s) || service.description.toLowerCase().includes(s)
    );
    return matchesProfile || matchesServices;
  });

  const detectLocation = async () => {
    setLocationLoading(true);
    try {
      const pos = await getCurrentPosition();
      setUserLocation(pos);
      toast.success("Location updated");
    } catch {
      toast.error("Could not detect location — please enable permissions.");
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <header>
        <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Discovery
        </div>
        <h1 className="font-serif text-3xl font-light leading-tight tracking-tight sm:text-4xl">
          Find someone worth an afternoon.
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
          Verified Consultants across Lagos, Abuja, Port Harcourt, and beyond.
          Filter by theme, distance, or availability.
        </p>
      </header>

      {/* Location + distance */}
      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card p-6 lg:p-8">
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Your location
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-[13px] tabular-nums text-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
              {userLocation.lat.toFixed(3)}, {userLocation.lng.toFixed(3)}
            </div>
            <button
              type="button"
              onClick={detectLocation}
              disabled={locationLoading}
              className="btn-ghost-warm inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-medium text-foreground"
            >
              {locationLoading ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Crosshair className="h-3 w-3" strokeWidth={1.5} />
              )}
              Update
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card p-6 lg:p-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Maximum distance
            </div>
            <div className="font-serif text-xl font-medium tabular-nums tracking-tight">
              {maxDistance}<span className="text-sm text-muted-foreground"> km</span>
            </div>
          </div>
          <Slider
            value={[maxDistance]}
            onValueChange={(val) => setMaxDistance(Array.isArray(val) ? val[0] : val)}
            min={1}
            max={100}
            step={1}
          />
        </div>
      </section>

      {/* Search */}
      <section className="relative">
        <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
        <Input
          placeholder="Search by name, city, service…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-14 rounded-2xl border-foreground/[0.08] bg-card pl-12 font-[15px]"
        />
      </section>

      {/* Themes as editorial menu */}
      <section>
        <div className="mb-4 flex items-end justify-between border-b border-foreground/[0.06] pb-3">
          <h2 className="font-serif text-lg font-medium tracking-tight">Browse by theme</h2>
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {THEMES.length} curated
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[24px] border border-foreground/[0.08] bg-foreground/[0.06] sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setSelectedTheme(null)}
            className={cn(
              "group flex items-center justify-between gap-3 bg-card px-3.5 py-3.5 text-left transition-colors hover:bg-background sm:px-5 sm:py-4",
              selectedTheme === null && "bg-primary/5"
            )}
          >
            <div className="min-w-0">
              <div className="font-serif text-[13.5px] font-medium tracking-tight sm:text-[15px]">All themes</div>
              <div className="mt-0.5 font-mono text-[10.5px] tabular-nums text-muted-foreground sm:text-[11px]">
                {consultants.length} consultants
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary" />
          </button>
          {THEMES.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => setSelectedTheme(selectedTheme === t.name ? null : t.name)}
              className={cn(
                "group flex items-center justify-between gap-3 bg-card px-3.5 py-3.5 text-left transition-colors hover:bg-background sm:px-5 sm:py-4",
                selectedTheme === t.name && "bg-primary/5"
              )}
            >
              <div className="min-w-0">
                <div className="truncate font-serif text-[13.5px] font-medium tracking-tight sm:text-[15px]">{t.name}</div>
                <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground sm:text-[11.5px]">{t.note}</div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary" />
            </button>
          ))}
        </div>
      </section>

      {/* View mode tabs + result count */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-foreground/[0.06] pb-3">
          <div>
            <h2 className="font-serif text-lg font-medium tracking-tight">
              {selectedTheme ?? "All Consultants"}
            </h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              {loading
                ? "Loading…"
                : `${filtered.length} consultant${filtered.length !== 1 ? "s" : ""} within ${maxDistance} km`}
            </p>
          </div>
          <TabsList className="inline-flex h-11 rounded-full bg-muted p-1">
            <TabsTrigger
              value="grid"
              className="h-9 rounded-full px-4 text-[12.5px] data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              Grid
            </TabsTrigger>
            <TabsTrigger
              value="map"
              className="h-9 rounded-full px-4 text-[12.5px] data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <MapPin className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              Map
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="grid" className="mt-0">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ConsultantCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card py-20 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <MapPin className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-lg font-medium tracking-tight">
                No Consultants in range.
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
                {selectedTheme
                  ? `Try removing the "${selectedTheme}" filter.`
                  : "Increase the distance slider to widen the search."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((c) => (
                <ConsultantCard key={c.uid} profile={c} distance={c.distance} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-0">
          <div className="overflow-hidden rounded-[28px] border border-foreground/[0.08]">
            <MapProvider>
              <ExploreMap
                consultants={filtered.filter((c) => c.location !== null)}
                userLocation={userLocation}
                onSelectConsultant={setSelectedConsultant}
              />
            </MapProvider>
          </div>
        </TabsContent>
      </Tabs>

      {selectedConsultant && (
        <BookingRequestDialog
          open={!!selectedConsultant}
          onOpenChange={(open) => !open && setSelectedConsultant(null)}
          consultantProfile={selectedConsultant}
        />
      )}
    </div>
  );
}
