"use client";

import { APIProvider, Map as GoogleMap, AdvancedMarker } from "@vis.gl/react-google-maps";

/**
 * Google Maps wrapper (@vis.gl/react-google-maps).
 * Renders a graceful placeholder when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is absent
 * (e.g. preview environments), so pages never break.
 */

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label?: string;
}

export function SevikaMap({
  points,
  center,
  zoom = 12,
  className = "h-80 w-full",
  onSelect,
}: {
  points: MapPoint[];
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  onSelect?: (id: string) => void;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return (
      <div className={`flex items-center justify-center rounded-2xl border border-dashed bg-secondary/50 text-sm text-muted-foreground ${className}`}>
        Map preview unavailable — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      </div>
    );
  }

  const c =
    center ??
    (points.length > 0
      ? { lat: points[0].lat, lng: points[0].lng }
      : { lat: 19.076, lng: 72.8777 });

  return (
    <div className={`overflow-hidden rounded-2xl border ${className}`}>
      <APIProvider apiKey={key}>
        <GoogleMap
          defaultCenter={c}
          center={c}
          defaultZoom={zoom}
          mapId="sevika-map"
          disableDefaultUI
          zoomControl
        >
          {points.map((p) => (
            <AdvancedMarker
              key={p.id}
              position={{ lat: p.lat, lng: p.lng }}
              title={p.label}
              onClick={onSelect ? () => onSelect(p.id) : undefined}
            />
          ))}
        </GoogleMap>
      </APIProvider>
    </div>
  );
}
