const GOOGLE_PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
const GOOGLE_GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";
const GOOGLE_DIRECTIONS_BASE = "https://maps.googleapis.com/maps/api/directions/json";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY || "";

export type PlacePrediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

export type PlaceDetails = {
  address: string;
  lat: number;
  lng: number;
  place_id?: string;
};

export type RouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
  summary: string;
  legs: Array<{ distance: string; duration: string; end_address: string; start_address: string }>;
};

function buildUrl(base: string, params: Record<string, string>) {
  const url = new URL(base);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

export async function searchPlaces(input: string, countryCode = "za") {
  if (!API_KEY) {
    console.warn("Missing VITE_GOOGLE_MAPS_BROWSER_KEY");
    return [] as PlacePrediction[];
  }

  const url = buildUrl(`${GOOGLE_PLACES_BASE}/autocomplete/json`, {
    input,
    key: API_KEY,
    types: "geocode|establishment",
    components: `country:${countryCode}`,
    location: "-26.2041,28.0473",
    radius: "50000",
    sessiontoken: crypto.randomUUID(),
    language: "en",
  });

  const res = await fetch(url);
  const data = await res.json();
  return (data.predictions ?? []).map((prediction: any) => ({
    place_id: prediction.place_id,
    description: prediction.description,
    structured_formatting: prediction.structured_formatting,
  }));
}

export async function getPlaceCoordinates(placeId: string): Promise<PlaceDetails | null> {
  if (!API_KEY) return null;
  const url = buildUrl(`${GOOGLE_PLACES_BASE}/details/json`, {
    place_id: placeId,
    key: API_KEY,
    fields: "formatted_address,geometry,place_id",
  });
  const res = await fetch(url);
  const json = await res.json();
  const place = json.result;
  if (!place) return null;
  return {
    address: place.formatted_address,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    place_id: place.place_id,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<PlaceDetails | null> {
  if (!API_KEY) return null;
  const url = buildUrl(GOOGLE_GEOCODE_BASE, {
    latlng: `${lat},${lng}`,
    key: API_KEY,
    result_type: "street_address|locality|premise",
    language: "en",
  });
  const res = await fetch(url);
  const json = await res.json();
  const result = json.results?.[0];
  if (!result) return null;
  return {
    address: result.formatted_address,
    lat,
    lng,
  };
}

export async function getRoute(origin: PlaceDetails, destination: PlaceDetails, waypoints: PlaceDetails[] = []) {
  if (!API_KEY) return null;
  const waypointString = waypoints.map((waypoint) => `${waypoint.lat},${waypoint.lng}`).join("|");
  const url = buildUrl(GOOGLE_DIRECTIONS_BASE, {
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    key: API_KEY,
    mode: "driving",
    departure_time: "now",
    waypoints: waypointString,
    alternatives: "false",
  });
  const res = await fetch(url);
  const json = await res.json();
  const route = json.routes?.[0];
  if (!route) return null;
  const leg = route.legs[0];
  return {
    distanceMeters: leg.distance.value,
    durationSeconds: leg.duration.value,
    polyline: route.overview_polyline.points,
    summary: route.summary,
    legs: route.legs.map((leg: any) => ({
      distance: leg.distance.text,
      duration: leg.duration.text,
      end_address: leg.end_address,
      start_address: leg.start_address,
    })),
  };
}

export function decodePolyline(encoded: string) {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = null;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

export async function getCurrentLocation() {
  return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export async function nearbyPlaces(lat: number, lng: number, type = "restaurant", radius = 2500) {
  if (!API_KEY) return [];
  const url = buildUrl(`${GOOGLE_PLACES_BASE}/nearbysearch/json`, {
    location: `${lat},${lng}`,
    radius: String(radius),
    type,
    key: API_KEY,
  });
  const res = await fetch(url);
  const json = await res.json();
  return (json.results ?? []).map((place: any) => ({
    place_id: place.place_id,
    description: place.name,
    structured_formatting: {
      main_text: place.name,
      secondary_text: place.vicinity,
    },
  }));
}

export function buildSavedPlace(name: string, address: string, lat: number, lng: number) {
  return { label: name, address, lat, lng, created_at: new Date().toISOString() };
}

export function buildCurrentLocationOption() {
  return { place_id: "current_location", description: "Current location", structured_formatting: { main_text: "Current location", secondary_text: "Use your phone GPS" } };
}

export function routeDistanceKm(route: RouteResult) {
  return Math.round((route.distanceMeters / 1000) * 100) / 100;
}

export function routeEtaMinutes(route: RouteResult) {
  return Math.round(route.durationSeconds / 60);
}

export function buildMapRegion(points: Array<{ lat: number; lng: number }>) {
  if (!points.length) return null;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    northEast: { lat: Math.max(...lats), lng: Math.max(...lngs) },
    southWest: { lat: Math.min(...lats), lng: Math.min(...lngs) },
  };
}
