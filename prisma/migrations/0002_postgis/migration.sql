-- Sevika — PostGIS location support
-- Enables index-backed radius search for artist discovery. Idempotent: if the
-- PostGIS extension is unavailable, Sevika automatically falls back to a
-- haversine formula over lat/lng columns (see src/lib/geo.ts).

CREATE EXTENSION IF NOT EXISTS postgis;

-- Point column mirroring (lat, lng).
ALTER TABLE "ArtistProfile" ADD COLUMN IF NOT EXISTS "location" geography(Point, 4326);

UPDATE "ArtistProfile"
SET "location" = ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography
WHERE "lat" IS NOT NULL AND "lng" IS NOT NULL AND "location" IS NULL;

CREATE INDEX IF NOT EXISTS "ArtistProfile_location_gix" ON "ArtistProfile" USING GIST ("location");

-- Keep location in sync when an artist updates their coordinates.
CREATE OR REPLACE FUNCTION "sevika_sync_artist_location"() RETURNS trigger AS $$
BEGIN
  IF NEW."lat" IS NOT NULL AND NEW."lng" IS NOT NULL THEN
    NEW."location" = ST_SetSRID(ST_MakePoint(NEW."lng", NEW."lat"), 4326)::geography;
  ELSE
    NEW."location" = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "ArtistProfile_sync_location" ON "ArtistProfile";

CREATE TRIGGER "ArtistProfile_sync_location"
BEFORE INSERT OR UPDATE OF "lat", "lng" ON "ArtistProfile"
FOR EACH ROW EXECUTE FUNCTION "sevika_sync_artist_location"();
