import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonOk, parseQuery, route } from "@/lib/api-helpers";
import { artistSearchSchema } from "@/lib/validators";
import { findNearbyArtistIds } from "@/lib/geo";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const q = parseQuery(req, artistSearchSchema);
  const { page, pageSize } = q;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ArtistProfileWhereInput = {
    user: { suspended: false },
  };
  if (q.q) {
    where.OR = [
      { displayName: { contains: q.q, mode: "insensitive" } },
      { tagline: { contains: q.q, mode: "insensitive" } },
      { services: { some: { name: { contains: q.q, mode: "insensitive" } } } },
    ];
  }
  if (q.city) where.city = { equals: q.city, mode: "insensitive" };
  if (q.category) where.categories = { has: q.category };
  if (q.minRating) where.ratingAvg = { gte: q.minRating };
  if (q.verifiedOnly) where.verificationStatus = "VERIFIED";
  if (q.maxPrice) {
    where.services = { some: { isActive: true, priceFrom: { lte: q.maxPrice } } };
  } else {
    where.services = { some: { isActive: true } };
  }

  // Location-aware discovery via PostGIS (or haversine fallback).
  let nearby: Map<string, number> | null = null;
  if (q.lat != null && q.lng != null) {
    const radiusKm = q.radiusKm ?? 25;
    const rows = await findNearbyArtistIds(q.lat, q.lng, radiusKm);
    nearby = new Map(rows.map((r) => [r.id, r.distanceKm]));
    if (nearby.size === 0) {
      return jsonOk({ artists: [], total: 0, page, pageSize });
    }
    where.id = { in: [...nearby.keys()] };
  }

  let orderBy: Prisma.ArtistProfileOrderByWithRelationInput[] = [{ ratingAvg: "desc" }, { ratingCount: "desc" }];
  if (!nearby) {
    if (q.sort === "price") orderBy = [{ services: { _count: "asc" } }];
    if (q.sort === "newest") orderBy = [{ createdAt: "desc" }];
  }

  const [total, profiles] = await Promise.all([
    db.artistProfile.count({ where }),
    db.artistProfile.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        user: { select: { avatarUrl: true } },
        services: {
          where: { isActive: true },
          select: { id: true, name: true, priceFrom: true },
          orderBy: { priceFrom: "asc" },
        },
      },
    }),
  ]);

  let artists = profiles.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    tagline: p.tagline,
    city: p.city,
    avatarUrl: p.user.avatarUrl,
    coverUrl: p.coverUrl,
    verificationStatus: p.verificationStatus,
    onlineStatus: p.onlineStatus,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    completedJobs: p.completedJobs,
    yearsExperience: p.yearsExperience,
    categories: p.categories,
    services: p.services,
    lat: p.lat,
    lng: p.lng,
    distanceKm: null as number | null,
  }));

  if (nearby) {
    artists = artists
      .map((a) => ({ ...a, distanceKm: nearby!.get(a.id) ?? null }))
      .sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
  } else if (q.sort === "price") {
    artists.sort(
      (a, b) =>
        Math.min(...(a.services.length ? a.services.map((s) => s.priceFrom) : [Infinity])) -
        Math.min(...(b.services.length ? b.services.map((s) => s.priceFrom) : [Infinity]))
    );
  }

  return jsonOk({ artists, total, page, pageSize });
});
