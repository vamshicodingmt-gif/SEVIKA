"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Compass, Filter, LayoutGrid, List, LocateFixed, Search, SlidersHorizontal } from "lucide-react";
import { ArtistCard, type ArtistCardData } from "@/components/artist-card";
import { EmptyState } from "@/components/shared";
import { PageHeader } from "@/components/page-header";
import { SevikaMap } from "@/components/map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/misc";
import { CATEGORIES, CITIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ArtistsResponse {
  artists: ArtistCardData[];
  total: number;
  page: number;
  pageSize: number;
}

export function DiscoverContent() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [city, setCity] = useState(params.get("city") ?? "ALL");
  const [category, setCategory] = useState(params.get("category") ?? "ALL");
  const [minRating, setMinRating] = useState("0");
  const [maxPrice, setMaxPrice] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState("rating");
  const [page, setPage] = useState(1);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [view, setView] = useState<"grid" | "map">("grid");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => setPage(1), [debouncedQ, city, category, minRating, maxPrice, verifiedOnly, sort, coords, radiusKm]);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (debouncedQ) sp.set("q", debouncedQ);
    if (city !== "ALL") sp.set("city", city);
    if (category !== "ALL") sp.set("category", category);
    if (minRating !== "0") sp.set("minRating", minRating);
    if (maxPrice) sp.set("maxPrice", maxPrice);
    if (verifiedOnly) sp.set("verifiedOnly", "true");
    if (coords) {
      sp.set("lat", String(coords.lat));
      sp.set("lng", String(coords.lng));
      sp.set("radiusKm", String(radiusKm));
    }
    if (!coords) sp.set("sort", sort);
    sp.set("page", String(page));
    return sp.toString();
  }, [debouncedQ, city, category, minRating, maxPrice, verifiedOnly, coords, radiusKm, sort, page]);

  const { data, isFetching } = useQuery<ArtistsResponse>({
    queryKey: ["artists", queryString],
    queryFn: () => fetch(`/api/artists?${queryString}`).then((r) => r.json()),
    placeholderData: keepPreviousData,
  });

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort("distance");
      },
      () => setCoords(null),
      { timeout: 8000 }
    );
  }

  const artists = data?.artists ?? [];
  const totalPages = data ? Math.max(Math.ceil(data.total / data.pageSize), 1) : 1;

  return (
    <div className="container py-8">
      <PageHeader
        title="Discover professionals"
        description="Search verified beauty & grooming artists by city, category and budget"
        actions={
          <div className="flex rounded-xl border p-1">
            <Button variant={view === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setView("grid")}>
              <LayoutGrid /> Grid
            </Button>
            <Button variant={view === "map" ? "secondary" : "ghost"} size="sm" onClick={() => setView("map")}>
              <List /> Map
            </Button>
          </div>
        }
      />

      {/* Filters ------------------------------------------------------- */}
      <div className="mb-6 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search artists or services — e.g. bridal makeup"
              className="pl-9"
            />
          </div>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-40"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All cities</SelectItem>
              {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.emoji} {c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={coords ? "secondary" : "outline"} size="sm" onClick={locateMe}>
            <LocateFixed /> {coords ? "Using my location" : "Near me"}
          </Button>
          {coords && (
            <Select value={String(radiusKm)} onValueChange={(v) => setRadiusKm(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 25, 50, 100].map((r) => <SelectItem key={r} value={String(r)}>Within {r} km</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Select value={minRating} onValueChange={setMinRating}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any rating</SelectItem>
              <SelectItem value="3">3★ & up</SelectItem>
              <SelectItem value="4">4★ & up</SelectItem>
              <SelectItem value="4.5">4.5★ & up</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            placeholder="Max price ₹"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-36"
          />
          <label className="inline-flex cursor-pointer items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="h-4 w-4 rounded accent-rose-600"
            />
            Verified only
          </label>
          {!coords && (
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Top rated</SelectItem>
                <SelectItem value="price">Lowest price</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          )}
          {data && (
            <span className="ml-auto text-xs text-muted-foreground">
              {isFetching ? "Searching…" : `${data.total} artist${data.total === 1 ? "" : "s"} found`}
            </span>
          )}
        </div>
      </div>

      {/* Results -------------------------------------------------------- */}
      {view === "map" ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <SevikaMap
            className="h-[560px]"
            points={artists
              .filter((a) => a.lat != null && a.lng != null)
              .map((a) => ({ id: a.id, lat: a.lat!, lng: a.lng!, label: a.displayName }))}
          />
          <div className="max-h-[560px] space-y-4 overflow-y-auto pr-1 scrollbar-thin">
            {artists.map((a) => <ArtistCard key={a.id} artist={a} />)}
            {artists.length === 0 && (
              <EmptyState icon={<Filter />} title="No artists in this area" description="Try a wider radius or different filters." />
            )}
          </div>
        </div>
      ) : artists.length === 0 && !isFetching ? (
        <EmptyState
          icon={<Compass />}
          title="No artists match your search"
          description="Try removing some filters, widening the radius, or exploring another city."
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isFetching && artists.length === 0
              ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64" />)
              : artists.map((a) => <ArtistCard key={a.id} artist={a} className="animate-fade-up" />)}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
