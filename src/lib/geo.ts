import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Location-aware artist discovery.
 *
 * PostGIS is the primary engine: when the extension is available we query a
 * geography(Point,4326) column (created in prisma/migrations/0002_postgis)
 * with ST_DWithin + ST_Distance for index-backed radius search. When PostGIS
 * is not installed (rare managed-PG configurations), we fall back to a
 * haversine formula over lat/lng columns so discovery keeps working.
 */

let postgisAvailable: boolean | null = null;

export async function hasPostgis(): Promise<boolean> {
  if (postgisAvailable !== null) return postgisAvailable;
  try {
    const rows = await db.$queryRaw<Array<{ available: boolean }>>(
      Prisma.sql`SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS available`
    );
    postgisAvailable = Boolean(rows[0]?.available);
  } catch {
    postgisAvailable = false;
  }
  return postgisAvailable;
}

export interface NearbyArtistRow {
  id: string;
  distanceKm: number;
}

/**
 * Artist ids within `radiusKm` of the point, ordered nearest-first.
 * Returns raw rows so callers can merge with Prisma filter results.
 */
export async function findNearbyArtistIds(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<NearbyArtistRow[]> {
  const point = Prisma.sql`ST_MakePoint(${lng}, ${lat})`;

  if (await hasPostgis()) {
    const rows = await db.$queryRaw<Array<{ id: string; distanceKm: number }>>(
      Prisma.sql`
        SELECT ap."id",
               ST_Distance(ap.location, ${point}::geography) / 1000.0 AS "distanceKm"
        FROM "ArtistProfile" ap
        WHERE ap.lat IS NOT NULL AND ap.lng IS NOT NULL
          AND ST_DWithin(ap.location, ${point}::geography, ${radiusKm * 1000})
        ORDER BY "distanceKm" ASC
        LIMIT 500
      `
    );
    return rows;
  }

  const rows = await db.$queryRaw<Array<{ id: string; distanceKm: number }>>(
    Prisma.sql`
      SELECT ap."id",
             (6371.0 * acos(
               LEAST(1.0, COS(RADIANS(${lat})) * COS(RADIANS(ap.lat)) *
                     COS(RADIANS(ap.lng) - RADIANS(${lng})) +
                     SIN(RADIANS(${lat})) * SIN(RADIANS(ap.lat))
               ))
             ) AS "distanceKm"
      FROM "ArtistProfile" ap
      WHERE ap.lat IS NOT NULL AND ap.lng IS NOT NULL
        AND (6371.0 * acos(
               LEAST(1.0, COS(RADIANS(${lat})) * COS(RADIANS(ap.lat)) *
                     COS(RADIANS(ap.lng) - RADIANS(${lng})) +
                     SIN(RADIANS(${lat})) * SIN(RADIANS(ap.lat))
               ))
             ) <= ${radiusKm}
      ORDER BY "distanceKm" ASC
      LIMIT 500
    `
  );
  return rows;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
