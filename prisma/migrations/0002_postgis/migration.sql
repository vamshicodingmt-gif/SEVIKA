-- Sevika — PostGIS location support (graceful, idempotent)
-- Enables index-backed radius search for artist discovery. If the PostGIS
-- extension is not available on this PostgreSQL server, everything here is
-- skipped and Sevika automatically falls back to a haversine formula over the
-- lat/lng columns (see src/lib/geo.ts) — the app works either way.

DO $geo$
DECLARE
  available boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'postgis'
  ) INTO available;

  IF NOT available THEN
    RAISE NOTICE 'PostGIS is not available on this server. Skipping geo setup — Sevika will use the haversine fallback for nearby discovery.';
    RETURN;
  END IF;

  EXECUTE 'CREATE EXTENSION IF NOT EXISTS postgis';

  EXECUTE 'ALTER TABLE "ArtistProfile" ADD COLUMN IF NOT EXISTS "location" geography(Point, 4326)';

  EXECUTE 'UPDATE "ArtistProfile"
           SET "location" = ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography
           WHERE "lat" IS NOT NULL AND "lng" IS NOT NULL AND "location" IS NULL';

  EXECUTE 'CREATE INDEX IF NOT EXISTS "ArtistProfile_location_gix" ON "ArtistProfile" USING GIST ("location")';

  EXECUTE 'CREATE OR REPLACE FUNCTION "sevika_sync_artist_location"() RETURNS trigger AS $fn$
    BEGIN
      IF NEW."lat" IS NOT NULL AND NEW."lng" IS NOT NULL THEN
        NEW."location" = ST_SetSRID(ST_MakePoint(NEW."lng", NEW."lat"), 4326)::geography;
      ELSE
        NEW."location" = NULL;
      END IF;
      RETURN NEW;
    END;
  $fn$ LANGUAGE plpgsql';

  EXECUTE 'DROP TRIGGER IF EXISTS "ArtistProfile_sync_location" ON "ArtistProfile"';

  EXECUTE 'CREATE TRIGGER "ArtistProfile_sync_location"
           BEFORE INSERT OR UPDATE OF "lat", "lng" ON "ArtistProfile"
           FOR EACH ROW EXECUTE FUNCTION "sevika_sync_artist_location"()';

  RAISE NOTICE 'PostGIS enabled: location column, GIST index and sync trigger created.';
EXCEPTION
  WHEN OTHERS THEN
    -- e.g. managed providers where CREATE EXTENSION requires special privileges
    RAISE NOTICE 'PostGIS setup skipped (%). Sevika will use the haversine fallback for nearby discovery.', SQLERRM;
END
$geo$;
