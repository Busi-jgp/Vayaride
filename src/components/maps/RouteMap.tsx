/// <reference types="google.maps" />
// Static route preview map — pickup + dropoff markers, fits bounds.
// Optional `liveLat/Lng` overlays the live driver position for tracking.
import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/maps/loader";

type Props = {
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  liveLat?: number | null;
  liveLng?: number | null;
  className?: string;
};

export function RouteMap({ pickupLat, pickupLng, dropoffLat, dropoffLng, liveLat, liveLng, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!ref.current || pickupLat == null || dropoffLat == null) return;
    let cancelled = false;
    loadGoogleMaps().then((g) => {
      if (cancelled || !ref.current) return;
      const map = new g.maps.Map(ref.current, {
        center: { lat: pickupLat, lng: pickupLng! },
        zoom: 11,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
      });
      mapRef.current = map;

      new g.maps.Marker({ map, position: { lat: pickupLat, lng: pickupLng! }, label: "A" });
      new g.maps.Marker({ map, position: { lat: dropoffLat, lng: dropoffLng! }, label: "B" });
      new g.maps.Polyline({
        map,
        path: [{ lat: pickupLat, lng: pickupLng! }, { lat: dropoffLat, lng: dropoffLng! }],
        strokeColor: "#1f7a4e",
        strokeOpacity: 0.9,
        strokeWeight: 4,
      });

      const bounds = new g.maps.LatLngBounds();
      bounds.extend({ lat: pickupLat, lng: pickupLng! });
      bounds.extend({ lat: dropoffLat, lng: dropoffLng! });
      map.fitBounds(bounds, 60);
    });
    return () => { cancelled = true; };
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng]);

  // Live driver marker update
  useEffect(() => {
    if (!mapRef.current || liveLat == null || liveLng == null) return;
    loadGoogleMaps().then((g) => {
      const pos = { lat: liveLat, lng: liveLng };
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new g.maps.Marker({
          map: mapRef.current!,
          position: pos,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#e67e22",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
          title: "Driver",
        });
      } else {
        driverMarkerRef.current.setPosition(pos);
      }
    });
  }, [liveLat, liveLng]);

  if (pickupLat == null || dropoffLat == null) {
    return (
      <div className={`rounded-xl bg-muted/40 border text-xs text-muted-foreground p-4 text-center ${className ?? ""}`}>
        No map preview — pickup/drop-off coordinates not set on this ride.
      </div>
    );
  }
  return <div ref={ref} className={`w-full h-56 rounded-xl overflow-hidden border ${className ?? ""}`} />;
}
