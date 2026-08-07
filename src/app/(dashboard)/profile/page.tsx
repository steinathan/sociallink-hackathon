"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useAuth } from "@/hooks/use-auth";
import { auth, db } from "@/lib/firebase";
import { getScopedDocRef } from "@/lib/firebase";
import { getDoc } from "firebase/firestore";
import { updateProfile, addPhoneNumber } from "@/actions/user.actions";
import { uploadAvatarToStorage } from "@/actions/storage.actions";
import { Profile, Service } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapProvider } from "@/components/maps/map-provider";
import { LocationPicker } from "@/components/maps/location-picker";
import { ServiceManager } from "@/components/profile/service-manager";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Upload, Star, MapPin, Plus, Trash2, EyeOff, MessageSquare, ArrowUpRight, Phone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { GeoLocation } from "@/lib/location";

const THEMES = [
  "Cultural Guide",
  "Event Attendance",
  "Travel Partner",
  "Lifestyle Coaching",
  "Dining Companion",
  "Business Networking",
  "Language Exchange",
  "Fitness Partner",
];

export default function ProfilePage() {
  const { firebaseUser, userDoc } = useAuthStore();
  useAuth();

  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [locationLabel, setLocationLabel] = useState("");
  const [location, setLocation] = useState<GeoLocation | undefined>(undefined);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [blurAvatar, setBlurAvatar] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  const [gender, setGender] = useState("");
  const [sexualOrientation, setSexualOrientation] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [bodyBuild, setBodyBuild] = useState("");
  const [smoking, setSmoking] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [whatsappAiConsent, setWhatsappAiConsent] = useState(false);

  // Phone-number editor (Google users can add or update their phone without OTP;
  // phone-OTP users can update theirs too — it's just saved to their user doc).
  const [phoneDraft, setPhoneDraft] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!firebaseUser?.uid) return;
      try {
        const snap = await getDoc(getScopedDocRef(db, "profiles", firebaseUser.uid));
        if (snap.exists()) {
          const data = snap.data() as Profile;
          setProfile(data);
          setDisplayName(data.displayName ?? "");
          setBio(data.bio ?? "");
          setServices(data.services ?? []);
          setLocationLabel(data.locationLabel ?? "");
          setSelectedThemes(data.themes ?? []);
          setBlurAvatar(data.blurAvatar ?? false);
          setGalleryUrls(data.galleryUrls ?? []);
          setWhatsappAiConsent(data.whatsappAiConsent ?? false);
          setGender(data.gender ?? "");
          setSexualOrientation(data.sexualOrientation ?? "");
          setCountry(data.country ?? "Nigeria");
          setState(data.state ?? "");
          setCity(data.city ?? "");
          setBodyBuild(data.bodyBuild ?? "");
          setSmoking(data.smoking ?? false);
          setDateOfBirth(data.dateOfBirth ?? "");
          setIsOnline(data.isOnline ?? false);
          if (data.location) {
            setLocation({ lat: data.location.latitude, lng: data.location.longitude });
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [firebaseUser?.uid]);

  function toggleTheme(theme: string) {
    setSelectedThemes((prev) =>
      prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme]
    );
  }

  async function handleAvatarUpload(file: File) {
    if (!firebaseUser) return;
    setAvatarUploading(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const base64 = await base64Promise;
      const url = await uploadAvatarToStorage(base64, firebaseUser.uid);
      const idToken = await firebaseUser.getIdToken();
      await updateProfile(idToken, { avatarUrl: url });
      setProfile((prev) => ({ ...prev, avatarUrl: url }));
      toast.success("Avatar updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!firebaseUser) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setGalleryUploading(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const base64 = await base64Promise;
        const url = await uploadAvatarToStorage(base64, `${firebaseUser.uid}_gallery_${Date.now()}_${i}`);
        newUrls.push(url);
      }
      const updatedGallery = [...galleryUrls, ...newUrls];
      setGalleryUrls(updatedGallery);
      const idToken = await firebaseUser.getIdToken();
      await updateProfile(idToken, { galleryUrls: updatedGallery });
      toast.success("Gallery updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload images");
    } finally {
      setGalleryUploading(false);
      e.target.value = "";
    }
  }

  async function removeGalleryImage(urlToRemove: string) {
    if (!firebaseUser) return;
    const updatedGallery = galleryUrls.filter((url) => url !== urlToRemove);
    setGalleryUrls(updatedGallery);
    try {
      const idToken = await firebaseUser.getIdToken();
      await updateProfile(idToken, { galleryUrls: updatedGallery });
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image");
    }
  }

  async function handleSave() {
    if (!firebaseUser) return;
    setSaving(true);
    setError("");
    try {
      const idToken = await firebaseUser.getIdToken();
      const updateData: Record<string, unknown> = {
        displayName,
        bio,
        services,
        themes: selectedThemes,
        locationLabel,
        blurAvatar,
        galleryUrls,
        gender,
        sexualOrientation,
        country,
        state,
        city,
        bodyBuild,
        smoking,
        dateOfBirth,
        isOnline,
        whatsappAiConsent,
      };
      if (location) updateData.location = location;
      const result = await updateProfile(idToken, updateData);
      if (!result.success) {
        setError(result.error ?? "Save failed.");
        return;
      }
      toast.success("Profile saved");
    } catch (err) {
      console.error(err);
      setError("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  function handleLocationChange(loc: GeoLocation, label: string) {
    setLocation(loc);
    setLocationLabel(label);
    setShowLocationPicker(false);
  }

  async function handleAddPhone() {
    if (!firebaseUser) return;
    const trimmed = phoneDraft.trim();
    if (!trimmed) {
      toast.error("Enter a Nigerian phone number.");
      return;
    }
    setPhoneSaving(true);
    try {
      const idToken = await firebaseUser.getIdToken(true);
      const result = await addPhoneNumber(idToken, trimmed);
      if (!result.success || !result.phoneE164) {
        toast.error(result.error ?? "Could not save phone.");
        return;
      }
      toast.success("Phone number saved.");
      setPhoneDraft("");
      setEditingPhone(false);
      // Auth store will re-snapshot on next listen tick and pick up the new number.
    } catch (err) {
      console.error(err);
      toast.error("Could not save phone.");
    } finally {
      setPhoneSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const isConsultant = userDoc?.role === "CONSULTANT";
  const initials = displayName?.charAt(0)?.toUpperCase() ?? "·";

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {isConsultant ? "Public profile" : "Account"}
          </div>
          <h1 className="font-serif text-3xl font-light leading-tight tracking-tight sm:text-4xl">
            {displayName || "Your profile"}.
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {isConsultant
              ? "How Members see you in discovery."
              : "Manage your account and preferences."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-coral inline-flex h-12 items-center gap-2 rounded-full px-6 text-[13px] font-semibold tracking-tight disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={1.5} />}
          Save changes
        </button>
      </header>

      {error && (
        <Alert className="border-destructive/25 bg-destructive/[0.06] text-destructive">
          <AlertDescription className="text-[12.5px] font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* Avatar + identity card */}
      <section className="overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card">
        <div className="h-24 tape-grain bg-gradient-to-br from-primary/30 via-primary/15 to-accent/30" />
        <div className="px-6 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-6">
            <div className="flex items-end gap-5">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-card shadow-lg">
                  <AvatarImage src={profile.avatarUrl ?? ""} className={blurAvatar ? "blur-md scale-110" : ""} />
                  <AvatarFallback className="bg-primary font-serif text-3xl text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/60">
                    <Loader2 className="h-5 w-5 animate-spin text-background" />
                  </div>
                )}
              </div>
<div className="pb-1">
                  <div className="font-serif text-xl font-medium tracking-tight">
                    {displayName || "Set your name"}
                  </div>
                  <div className="mt-1 font-mono text-[12px] tabular-nums text-muted-foreground">
                    {userDoc?.phoneNumber || (userDoc?.authProvider === "google" ? "No phone on file — add one below" : "")}
                  </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pb-1">
              <label className="btn-ghost-warm inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-[12.5px] font-medium text-foreground">
                <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                Change photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatarUpload(f);
                  }}
                />
              </label>
              {profile.averageRating !== undefined && profile.averageRating > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/[0.08] bg-background px-3 py-1.5 text-[12px]">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{profile.averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({profile.totalReviews})</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Phone number — Google users can add one here without an SMS code */}
      <section className="overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-card">
        <div className="flex flex-wrap items-start justify-between gap-6 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
              <Phone className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <div className="font-serif text-lg font-medium tracking-tight">
                Phone number
              </div>
              <div className="mt-1 max-w-md text-[12.5px] leading-[1.6] text-muted-foreground">
                {userDoc?.phoneNumber
                  ? "Used so other Members and Consultants can reach you about a session."
                  : "Add a Nigerian number so Members and Consultants can reach you about a session. No SMS code required."}
              </div>
            </div>
          </div>

          {userDoc?.phoneNumber ? (
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 font-mono text-[14px] tabular-nums">
                <CheckCircle2 className="h-4 w-4 text-primary" strokeWidth={1.5} />
                {userDoc.phoneNumber}
              </div>
              {!editingPhone && (
                <button
                  type="button"
                  onClick={() => setEditingPhone(true)}
                  className="text-[11.5px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Update
                </button>
              )}
            </div>
          ) : null}
        </div>

        {(!userDoc?.phoneNumber || editingPhone) && (
          <div className="border-t border-foreground/[0.06] bg-background/40 p-6 sm:p-8">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  {userDoc?.phoneNumber ? "New phone number" : "Nigerian phone number"}
                </Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={phoneDraft}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  placeholder="0803 123 4567"
                  className="h-12 rounded-2xl border-foreground/[0.08] bg-card px-4 font-mono text-[14px] tabular-nums"
                />
              </div>
              <button
                type="button"
                onClick={handleAddPhone}
                disabled={phoneSaving || !phoneDraft.trim()}
                className="btn-coral inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-6 text-[12.5px] font-semibold tracking-tight disabled:opacity-50"
              >
                {phoneSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
                {userDoc?.phoneNumber ? "Update phone" : "Save phone"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Basic info */}
      <section className="space-y-6">
        <div className="border-b border-foreground/[0.06] pb-3">
          <h2 className="font-serif text-xl font-medium tracking-tight">Basic information</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2.5 sm:col-span-2">
            <Label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Display name
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or alias"
              className="h-14 rounded-2xl border-foreground/[0.08] bg-card px-5 text-[15px]"
            />
          </div>

          <div className="space-y-2.5 sm:col-span-2">
            <Label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Short bio
            </Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A line or two about you"
              rows={3}
              maxLength={300}
              className="rounded-2xl border-foreground/[0.08] bg-card px-5 py-4 text-[14px]"
            />
            <div className="text-right text-[11px] text-muted-foreground">{bio.length}/300</div>
          </div>

          <div className="space-y-2.5 sm:col-span-2">
            <Label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Location
            </Label>
            <div className="flex items-center gap-3">
              <div className="flex flex-1 items-center gap-2.5 rounded-2xl border border-foreground/[0.08] bg-card px-4 py-3">
                <MapPin className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-[13.5px]">{locationLabel || "Not set"}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationPicker((v) => !v)}
                className="btn-ghost-warm h-12 shrink-0 rounded-full px-5 text-[12.5px] font-medium text-foreground"
              >
                {showLocationPicker ? "Cancel" : "Set location"}
              </button>
            </div>
            {showLocationPicker && (
              <div className="overflow-hidden rounded-2xl border border-primary/20">
                <MapProvider>
                  <LocationPicker
                    value={location}
                    onChange={handleLocationChange}
                    label={locationLabel}
                  />
                </MapProvider>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Optional demographics — collapsed by default */}
      <section className="space-y-6">
        <details className="group rounded-[24px] border border-foreground/[0.08] bg-card">
          <summary className="cursor-pointer list-none px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-medium tracking-tight">
                  Optional details
                </h3>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Helps with better matching. Always optional.
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
            </div>
          </summary>
          <div className="space-y-5 border-t border-foreground/[0.06] px-6 py-6 sm:px-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Date of birth
                </Label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="h-12 rounded-2xl border-foreground/[0.08] bg-background px-4 font-mono text-[13px]"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Gender
                </Label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-foreground/[0.08] bg-background px-4 text-[13.5px]"
                >
                  <option value="">Prefer not to say</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Non-binary</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Country
                </Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} className="h-12 rounded-2xl border-foreground/[0.08] bg-background px-4" />
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  State
                </Label>
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Lagos" className="h-12 rounded-2xl border-foreground/[0.08] bg-background px-4" />
              </div>
              <div className="space-y-2.5 sm:col-span-2">
                <Label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  City / Area
                </Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lekki Phase 1" className="h-12 rounded-2xl border-foreground/[0.08] bg-background px-4" />
              </div>
            </div>
          </div>
        </details>
      </section>

      {/* Consultant-only settings */}
      {isConsultant && (
        <>
          <section className="space-y-6">
            <div className="border-b border-foreground/[0.06] pb-3">
              <h2 className="font-serif text-xl font-medium tracking-tight">Availability</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className={`flex items-center justify-between gap-4 rounded-[20px] border bg-card p-5 transition-colors ${
                  isOnline ? "border-primary/40 bg-primary/[0.04]" : "border-foreground/[0.08]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-muted-foreground"}`}
                  />
                  <div>
                    <div className="font-serif text-[15px] font-medium tracking-tight">
                      {isOnline ? "Available now" : "Offline"}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground">
                      {isOnline ? "Accepting session requests" : "Hidden from discovery"}
                    </div>
                  </div>
                </div>
                <Switch checked={isOnline} onCheckedChange={setIsOnline} />
              </div>

              <div
                className={`flex items-center justify-between gap-4 rounded-[20px] border bg-card p-5 transition-colors ${
                  blurAvatar ? "border-primary/40 bg-primary/[0.04]" : "border-foreground/[0.08]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <EyeOff className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <div>
                    <div className="font-serif text-[15px] font-medium tracking-tight">
                      Blurred avatar
                    </div>
                    <div className="text-[11.5px] text-muted-foreground">
                      Photo reveals only after booking
                    </div>
                  </div>
                </div>
                <Switch checked={blurAvatar} onCheckedChange={setBlurAvatar} />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="border-b border-foreground/[0.06] pb-3">
              <h2 className="font-serif text-xl font-medium tracking-tight">Sessions</h2>
            </div>
            <div className="rounded-[24px] border border-foreground/[0.08] bg-card p-6 sm:p-8">
              <ServiceManager services={services} onChange={setServices} />
            </div>
          </section>

          <section className="space-y-6">
            <div className="border-b border-foreground/[0.06] pb-3">
              <h2 className="font-serif text-xl font-medium tracking-tight">Themes</h2>
            </div>
            <div className="rounded-[24px] border border-foreground/[0.08] bg-card p-6 sm:p-8">
              <div className="grid gap-px overflow-hidden rounded-[20px] border border-foreground/[0.08] bg-foreground/[0.06] sm:grid-cols-2">
                {THEMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTheme(t)}
                    className={`flex items-center justify-between gap-3 bg-card px-5 py-3.5 text-left transition-colors hover:bg-background ${
                      selectedThemes.includes(t) ? "bg-primary/[0.06]" : ""
                    }`}
                  >
                    <div className="font-serif text-[14px] font-medium tracking-tight">{t}</div>
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                        selectedThemes.includes(t)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-foreground/[0.15]"
                      }`}
                    >
                      {selectedThemes.includes(t) && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-end justify-between border-b border-foreground/[0.06] pb-3">
              <h2 className="font-serif text-xl font-medium tracking-tight">Gallery</h2>
              <label className="btn-ghost-warm inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-[12.5px] font-medium text-foreground">
                {galleryUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />}
                Add photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleGalleryUpload}
                  disabled={galleryUploading}
                />
              </label>
            </div>
            {galleryUrls.length === 0 ? (
              <div className="rounded-[24px] border-2 border-dashed border-foreground/[0.08] py-16 text-center">
                <p className="font-serif text-[15px] font-medium tracking-tight text-muted-foreground">
                  No photos yet.
                </p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Showcase your work or lifestyle.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {galleryUrls.map((url, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-2xl border border-foreground/[0.08] bg-muted">
                    <img src={url} alt="Gallery" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/60 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(url)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Notifications / opt-in */}
      <section className="rounded-[24px] border border-foreground/[0.08] bg-card p-6 sm:p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="font-serif text-[15px] font-medium tracking-tight">
              WhatsApp AI assistant
            </div>
            <p className="mt-1.5 max-w-md text-[12.5px] leading-[1.55] text-muted-foreground">
              Allow our AI to reach you about new services and platform updates.
            </p>
          </div>
          <Switch checked={whatsappAiConsent} onCheckedChange={setWhatsappAiConsent} />
        </div>
      </section>

      {/* Footer save */}
      <div className="sticky bottom-4 z-10 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-coral inline-flex h-12 items-center gap-2 rounded-full px-7 text-[13px] font-semibold tracking-tight shadow-xl disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={1.5} />}
          Save changes
        </button>
      </div>
    </div>
  );
}
