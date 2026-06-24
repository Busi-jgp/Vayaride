import { createServerFn } from "@tanstack/react-start";

// Calls the Google Routes API directly using your own server-side API key.
// Set GOOGLE_MAPS_API_KEY in your .env (server-side, never expose to the browser).
export const computeRoute = createServerFn({ method: "GET" }).handler(
  async ({ data }: { data: { originLat: number; originLng: number; destLat: number; destLng: number } }) => {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return { distance_km: null, duration_min: null };

    const body = {
      origin: { location: { latLng: { latitude: data.originLat, longitude: data.originLng } } },
      destination: { location: { latLng: { latitude: data.destLat, longitude: data.destLng } } },
      travelMode: "DRIVE",
    };

    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) return { distance_km: null, duration_min: null };

    const json = await res.json();
    const route = json.routes?.[0];
    return {
      distance_km: route ? +(route.distanceMeters / 1000).toFixed(2) : null,
      duration_min: route ? Math.round(parseInt(route.duration) / 60) : null,
    };
  },
);
