"use client";

import Link from "next/link";
import { MapPin, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingStars, OnlineStatusBadge } from "@/components/shared";
import { categoryEmoji, categoryLabel } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";

export interface ArtistCardData {
  id: string;
  displayName: string;
  tagline: string | null;
  city: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  verificationStatus: string;
  onlineStatus: string;
  ratingAvg: number;
  ratingCount: number;
  completedJobs: number;
  yearsExperience: number;
  categories: string[];
  services?: Array<{ id: string; name: string; priceFrom: number }>;
  lat?: number | null;
  lng?: number | null;
  distanceKm?: number | null;
}

export function ArtistCard({ artist, className }: { artist: ArtistCardData; className?: string }) {
  return (
    <Link
      href={`/artists/${artist.id}`}
      className={cn(
        "group block overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <div className="relative h-28 brand-gradient opacity-90">
        {artist.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artist.coverUrl} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute -bottom-6 left-4">
          <Avatar className="h-14 w-14 border-2 border-background">
            {artist.avatarUrl ? <AvatarImage src={artist.avatarUrl} alt={artist.displayName} /> : null}
            <AvatarFallback className="text-base">{initials(artist.displayName)}</AvatarFallback>
          </Avatar>
        </div>
        <div className="absolute right-2 top-2">
          <OnlineStatusBadge status={artist.onlineStatus} className="backdrop-blur bg-background/80" />
        </div>
      </div>
      <div className="px-4 pb-4 pt-8">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-sm font-semibold">
              {artist.displayName}
              {artist.verificationStatus === "VERIFIED" && (
                <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified by Sevika" />
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{artist.tagline || "Beauty professional"}</p>
          </div>
          <RatingStars rating={artist.ratingAvg} count={artist.ratingCount} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {artist.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {artist.city}
              {artist.distanceKm != null ? ` · ${artist.distanceKm.toFixed(1)} km` : ""}
            </span>
          )}
          <span>{artist.completedJobs} jobs done</span>
          {artist.yearsExperience > 0 && <span>{artist.yearsExperience}+ yrs exp</span>}
        </div>
        {artist.categories.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {artist.categories.slice(0, 3).map((c) => (
              <span key={c} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                {categoryEmoji(c)} {categoryLabel(c)}
              </span>
            ))}
          </div>
        )}
        {artist.services && artist.services.length > 0 && (
          <div className="mt-3 border-t pt-2.5 text-xs text-muted-foreground">
            From{" "}
            <span className="font-semibold text-foreground">
              ₹{Math.min(...artist.services.map((s) => s.priceFrom)).toLocaleString("en-IN")}
            </span>{" "}
            · {artist.services.length} service{artist.services.length > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </Link>
  );
}
