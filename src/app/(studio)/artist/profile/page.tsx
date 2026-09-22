"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2, MapPin, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/misc";
import { CATEGORIES, CITIES } from "@/lib/constants";
import { api, uploadFile } from "@/lib/client";

interface ArtistProfileData {
  id: string;
  displayName: string;
  tagline: string | null;
  bio: string | null;
  city: string | null;
  serviceArea: string | null;
  addressLine: string | null;
  lat: number | null;
  lng: number | null;
  yearsExperience: number;
  categories: string[];
  specialties: string[];
  languages: string[];
  coverUrl: string | null;
}

export default function ArtistProfileEditPage() {
  const { update } = useSession();
  const qc = useQueryClient();
  const avatarRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [cats, setCats] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState("");
  const [languages, setLanguages] = useState("");
  const [geolocating, setGeolocating] = useState(false);

  const me = useQuery<{ user: { artistProfile: ArtistProfileData | null; avatarUrl: string | null } }>({
    queryKey: ["me"],
    queryFn: () => api("/api/me"),
  });

  const profile = me.data?.user.artistProfile;

  useEffect(() => {
    if (profile) {
      setCats(profile.categories);
      setSpecialties(profile.specialties.join(", "));
      setLanguages(profile.languages.join(", "));
    }
  }, [profile]);

  async function pickAvatar(file: File) {
    try {
      const url = await uploadFile(file);
      await api("/api/me", { method: "PATCH", json: { avatarUrl: url } });
      await update();
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Photo updated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function locate() {
    if (!navigator.geolocation) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        const latInput = document.querySelector<HTMLInputElement>("input[name=lat]");
        const lngInput = document.querySelector<HTMLInputElement>("input[name=lng]");
        if (latInput) latInput.value = String(lat);
        if (lngInput) lngInput.value = String(lng);
        setGeolocating(false);
        toast.success("Location captured");
      },
      () => {
        setGeolocating(false);
        toast.error("Couldn't get your location — enter coordinates manually if you like");
      },
      { timeout: 8000 }
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api("/api/me", {
        method: "PUT",
        json: {
          displayName: String(fd.get("displayName") ?? ""),
          tagline: String(fd.get("tagline") ?? ""),
          bio: String(fd.get("bio") ?? ""),
          city: String(fd.get("city") ?? ""),
          serviceArea: String(fd.get("serviceArea") ?? ""),
          addressLine: String(fd.get("addressLine") ?? ""),
          lat: fd.get("lat") ? Number(fd.get("lat")) : null,
          lng: fd.get("lng") ? Number(fd.get("lng")) : null,
          yearsExperience: Number(fd.get("yearsExperience") ?? 0),
          categories: cats,
          specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12),
          languages: languages.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10),
        },
      });
      toast.success("Profile saved ✨");
      await update();
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["artist", "dashboard"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (me.isLoading || !profile) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div>
      <PageHeader title="My profile" description="This is what customers see — make it shine" />

      <form onSubmit={onSubmit}>
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-5">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={me.data?.user.avatarUrl ?? "/icon.svg"}
                  alt="Profile"
                  className="h-20 w-20 rounded-full border object-cover"
                />
                <button
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  className="absolute -bottom-1 -right-1 rounded-full brand-gradient p-2 text-white shadow"
                  aria-label="Change photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => e.target.files?.[0] && pickAvatar(e.target.files[0])} />
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Studio photo</p>
                <p>Shown on your profile, cards and in chat</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display name *</Label>
                <Input id="displayName" name="displayName" defaultValue={profile.displayName} required minLength={2} maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tagline">Tagline</Label>
                <Input id="tagline" name="tagline" defaultValue={profile.tagline ?? ""} placeholder="e.g. Bridal & party makeup specialist" maxLength={160} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">About you</Label>
              <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} rows={5} maxLength={4000} placeholder="Your story, training, signature styles…" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="city">City *</Label>
                <select
                  id="city"
                  name="city"
                  defaultValue={profile.city ?? ""}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select city</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="serviceArea">Service area</Label>
                <Input id="serviceArea" name="serviceArea" defaultValue={profile.serviceArea ?? ""} placeholder="e.g. West Mumbai + 15km travel" maxLength={300} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="yearsExperience">Years of experience</Label>
                <Input id="yearsExperience" name="yearsExperience" type="number" min={0} max={60} defaultValue={profile.yearsExperience} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Categories you work in</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c.slug}
                    onClick={() => setCats(cats.includes(c.slug) ? cats.filter((x) => x !== c.slug) : [...cats, c.slug].slice(0, 8))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      cats.includes(c.slug) ? "brand-gradient border-transparent text-white" : "bg-card hover:border-primary/40"
                    }`}
                  >
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="specialties">Specialties (comma separated)</Label>
                <Input id="specialties" value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="Airbrush makeup, Saree draping" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="languages">Languages (comma separated)</Label>
                <Input id="languages" value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Hindi, English, Marathi" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="addressLine">Studio address (optional)</Label>
              <Input id="addressLine" name="addressLine" defaultValue={profile.addressLine ?? ""} placeholder="Shown only when you accept studio bookings" maxLength={300} />
            </div>

            <div className="rounded-xl border border-dashed p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-primary" /> Map location</p>
              <p className="mb-3 text-xs text-muted-foreground">Used for nearby discovery and the map on your profile.</p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input id="lat" name="lat" type="number" step="any" defaultValue={profile.lat ?? ""} className="w-36" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input id="lng" name="lng" type="number" step="any" defaultValue={profile.lng ?? ""} className="w-36" />
                </div>
                <Button type="button" variant="outline" onClick={locate} disabled={geolocating}>
                  {geolocating ? <Loader2 className="animate-spin" /> : <MapPin />} Use my location
                </Button>
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />} Save profile
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
