import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeftRight, Loader2, MapPin, Navigation, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleMaps } from "@/lib/maps/loader";

type RouteRecord = {
  id?: string;
  from_location: string;
  to_location: string;
  taxi_rank: string;
  fare: number;
  distance: string;
  duration: string;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
};

type RouteOption = {
  value: string;
  label: string;
};

const locationOptions: RouteOption[] = [
  { value: "Johannesburg CBD", label: "Johannesburg CBD" },
  { value: "Soweto", label: "Soweto" },
  { value: "Sandton", label: "Sandton" },
  { value: "Pretoria CBD", label: "Pretoria CBD" },
  { value: "Mamelodi", label: "Mamelodi" },
  { value: "Durban CBD", label: "Durban CBD" },
  { value: "Umlazi", label: "Umlazi" },
  { value: "Cape Town CBD", label: "Cape Town CBD" },
  { value: "Khayelitsha", label: "Khayelitsha" },
  { value: "Polokwane CBD", label: "Polokwane CBD" },
  { value: "Seshego", label: "Seshego" },
  { value: "Bloemfontein CBD", label: "Bloemfontein CBD" },
  { value: "Botshabelo", label: "Botshabelo" },
];

const fallbackRoutes: RouteRecord[] = [
  {
    from_location: "Johannesburg CBD",
    to_location: "Soweto",
    taxi_rank: "Nancefield Taxi Rank",
    fare: 45,
    distance: "22 km",
    duration: "45 min",
    latitude: -26.2041,
    longitude: 28.0473,
  },
  {
    from_location: "Johannesburg CBD",
    to_location: "Sandton",
    taxi_rank: "Park Station Taxi Rank",
    fare: 60,
    distance: "18 km",
    duration: "35 min",
    latitude: -26.2041,
    longitude: 28.0473,
  },
  {
    from_location: "Pretoria CBD",
    to_location: "Mamelodi",
    taxi_rank: "Pretoria Station Taxi Rank",
    fare: 38,
    distance: "25 km",
    duration: "50 min",
    latitude: -25.7461,
    longitude: 28.1881,
  },
  {
    from_location: "Durban CBD",
    to_location: "Umlazi",
    taxi_rank: "Durban Station Taxi Rank",
    fare: 32,
    distance: "31 km",
    duration: "55 min",
    latitude: -29.8587,
    longitude: 31.0218,
  },
  {
    from_location: "Cape Town CBD",
    to_location: "Khayelitsha",
    taxi_rank: "Cape Town Station Taxi Rank",
    fare: 40,
    distance: "35 km",
    duration: "60 min",
    latitude: -33.9249,
    longitude: 18.4241,
  },
  {
    from_location: "Polokwane CBD",
    to_location: "Seshego",
    taxi_rank: "Polokwane Taxi Rank",
    fare: 28,
    distance: "14 km",
    duration: "25 min",
    latitude: -23.9045,
    longitude: 29.4486,
  },
  {
    from_location: "Bloemfontein CBD",
    to_location: "Botshabelo",
    taxi_rank: "Bloemfontein Station Taxi Rank",
    fare: 35,
    distance: "40 km",
    duration: "70 min",
    latitude: -29.0852,
    longitude: 26.1596,
  },
];

function normalizeRoute(record: RouteRecord | null | undefined): RouteRecord | null {
  if (!record) return null;
  return {
    ...record,
    fare: Number(record.fare ?? 0),
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function RoutePlanner() {
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<RouteRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const mapRef = useRef<HTMLDivElement | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    return () => {
      directionsRendererRef.current?.setMap(null);
      directionsRendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selectedRoute) {
      setMapStatus("idle");
      return;
    }

    if (!mapRef.current) {
      setMapStatus("idle");
      return;
    }

    let cancelled = false;
    setMapStatus("loading");

    directionsRendererRef.current?.setMap(null);

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapRef.current) return;

        const map = new maps.Map(mapRef.current, {
          center: { lat: -26.2041, lng: 28.0473 },
          zoom: 10,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });

        const renderer = new maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#0f8a3d",
            strokeOpacity: 0.9,
            strokeWeight: 5,
          },
        });

        directionsRendererRef.current = renderer;

        const directionsService = new maps.DirectionsService();
        directionsService.route(
          {
            origin: `${selectedRoute.from_location}, South Africa`,
            destination: `${selectedRoute.to_location}, South Africa`,
            travelMode: maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (cancelled) return;
            if (status === maps.DirectionsStatus.OK && result) {
              renderer.setDirections(result);
              const leg = result.routes[0]?.legs[0];
              if (leg) {
                new maps.Marker({
                  map,
                  position: leg.start_location,
                  label: "A",
                  icon: {
                    path: maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#0f8a3d",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2,
                  },
                });
                new maps.Marker({
                  map,
                  position: leg.end_location,
                  label: "B",
                  icon: {
                    path: maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#f59e0b",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2,
                  },
                });
                const bounds = new maps.LatLngBounds();
                bounds.extend(leg.start_location);
                bounds.extend(leg.end_location);
                map.fitBounds(bounds, 40);
              }
              setMapStatus("ready");
              return;
            }

            setMapStatus("error");
            setFeedback("Google Maps could not render this route preview. You can still use the taxi details below.");
          }
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMapStatus("error");
          setFeedback("Google Maps is not available right now. Add your browser key to load the live route map.");
        }
      });

    return () => {
      cancelled = true;
      directionsRendererRef.current?.setMap(null);
      directionsRendererRef.current = null;
    };
  }, [selectedRoute]);

  async function handleFindRoute() {
    if (!fromLocation || !toLocation) {
      setFeedback("Select both a pickup and a destination before searching.");
      setSelectedRoute(null);
      return;
    }

    if (fromLocation === toLocation) {
      setFeedback("Choose different locations to plan your taxi route.");
      setSelectedRoute(null);
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    setSelectedRoute(null);
    setMapStatus("idle");

    try {
      const { data, error } = (await supabase
        .from("routes")
        .select("*")
        .eq("from_location", fromLocation)
        .eq("to_location", toLocation)
        .limit(1)) as { data: RouteRecord[] | null; error: Error | null };

      const normalized = normalizeRoute(Array.isArray(data) ? data[0] : null);
      const fallback = fallbackRoutes.find(
        (route) => route.from_location === fromLocation && route.to_location === toLocation
      );
      const route = normalized ?? fallback ?? null;

      if (!route || error) {
        setFeedback("No taxi route is available for that journey yet. Try another route pair.");
        return;
      }

      setSelectedRoute(route);
    } catch (err) {
      console.error(err);
      setFeedback("We could not search for a route right now. Please try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSwapLocations() {
    if (!fromLocation && !toLocation) return;
    setFromLocation(toLocation);
    setToLocation(fromLocation);
  }

  function openInGoogleMaps() {
    if (!selectedRoute) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${selectedRoute.from_location}, South Africa`)}&destination=${encodeURIComponent(`${selectedRoute.to_location}, South Africa`)}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="px-4 py-4 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-sm font-medium text-emerald-700">
                <Sparkles className="h-4 w-4" />
                Smart taxi route planning
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Plan a fast route in seconds</h2>
              <p className="mt-2 text-sm text-slate-600">
                Search taxi ranks, compare fares, and preview the journey with a live map for major South African routes.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-emerald-700">Popular routes</p>
              <p className="mt-1">Johannesburg, Pretoria, Durban, Cape Town and more</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Navigation className="h-5 w-5 text-emerald-600" />
                Find your taxi route
              </CardTitle>
              <CardDescription>
                Pick a starting point and destination to get the best route and fare estimate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">From</label>
                  <Select value={fromLocation} onValueChange={setFromLocation}>
                    <SelectTrigger className="w-full rounded-2xl border-slate-200">
                      <SelectValue placeholder="Choose pickup" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="button" variant="outline" size="icon" onClick={handleSwapLocations} className="rounded-full border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50">
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">To</label>
                  <Select value={toLocation} onValueChange={setToLocation}>
                    <SelectTrigger className="w-full rounded-2xl border-slate-200">
                      <SelectValue placeholder="Choose destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button onClick={handleFindRoute} disabled={isLoading} className="rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>Find Route</>
                  )}
                </Button>
                <p className="text-sm text-slate-500">Realistic fares and travel estimates for our taxi network.</p>
              </div>

              {feedback && (
                <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{feedback}</span>
                </div>
              )}

              {selectedRoute ? (
                <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Route found</p>
                      <h3 className="text-xl font-semibold text-slate-900">
                        {selectedRoute.from_location} to {selectedRoute.to_location}
                      </h3>
                    </div>
                    <div className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">
                      {formatCurrency(selectedRoute.fare)}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Taxi rank</p>
                      <p className="mt-1 font-medium text-slate-800">{selectedRoute.taxi_rank}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Travel time</p>
                      <p className="mt-1 font-medium text-slate-800">{selectedRoute.duration}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Distance</p>
                      <p className="mt-1 font-medium text-slate-800">{selectedRoute.distance}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button type="button" onClick={openInGoogleMaps} className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
                      Open in Google Maps
                    </Button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 p-3 text-sm font-medium text-slate-700">Live route preview</div>
                    {mapStatus === "loading" ? (
                      <div className="flex h-72 items-center justify-center bg-slate-50 text-sm text-slate-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading map...
                      </div>
                    ) : mapStatus === "error" ? (
                      <div className="flex h-72 items-center justify-center bg-slate-50 px-6 text-center text-sm text-slate-500">
                        The map preview is temporarily unavailable, but your route details are ready.
                      </div>
                    ) : (
                      <div ref={mapRef} className="h-72 w-full" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Ready to ride</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Choose your pickup and destination to discover the nearest taxi rank, fare and route preview.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Why riders love VayaRide</CardTitle>
              <CardDescription>Simple planning, clear fares, and quick route guidance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-800">Fast route discovery</p>
                <p className="mt-1 text-sm text-emerald-700">
                  Search through built-in taxi routes and get a response in seconds.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">Transparent pricing</p>
                <p className="mt-1 text-sm text-slate-600">
                  See the estimated fare and expected travel time before you travel.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">Route guidance</p>
                <p className="mt-1 text-sm text-slate-600">
                  Use the Google Maps preview to confirm the route and launch directions instantly.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
