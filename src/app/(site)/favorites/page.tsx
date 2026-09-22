"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, Heart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ArtistCard, type ArtistCardData } from "@/components/artist-card";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";

export default function FavoritesPage() {
  const { data, isLoading } = useQuery<{ favorites: ArtistCardData[] }>({
    queryKey: ["favorites"],
    queryFn: () => api("/api/favorites"),
  });

  return (
    <div className="container py-8">
      <PageHeader title="Favorites" description="Artists you've saved for quick rebooking" />
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : (data?.favorites.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Heart />}
          title="No favorites yet"
          description="Tap the heart on any artist profile to save them here."
          action={<Button asChild><Link href="/discover">Discover artists</Link></Button>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data!.favorites.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      )}
    </div>
  );
}
