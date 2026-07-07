import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bookmark,
  Briefcase,
  ChevronRight,
  Clock3,
  Hand,
  Heart,
  Home as HomeIcon,
  Map,
  MapPin,
  Moon,
  Navigation,
  Search,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { loadGoogleMaps } from "@/lib/maps/loader";
import { Skeleton } from "@/components/ui/skeleton";
import { SOSButton } from "@/components/SOSButton";

type SavedLocation = {
  id: string;
  label: string;
  address: string;
};

type TaxiSign = {
  id: string;
  destination: string;
  city: string;
  province: string;
  taxi_rank: string;
  hand_sign_description: string;
  verified: boolean;
};

type RecentSearch = {
  label: string;
  savedAt: number;
};

type RouteSpotlight = {
  from: string;
  to: string;
  taxiRank: string;
  fare: string;
  duration: string;
};

const popularRoutes: RouteSpotlight[] = [
  { from: "Johannesburg CBD", to: "Soweto", taxiRank: "Nancefield", fare: "R45", duration: "45 min" },
  { from: "Pretoria CBD", to: "Mamelodi", taxiRank: "Pretoria Station", fare: "R38", duration: "50 min" },
  { from: "Durban CBD", to: "Umlazi", taxiRank: "Durban Station", fare: "R32", duration: "55 min" },
];

const serviceAlerts = [
  "Peak traffic on the M1 northbound near Sandton — expect 10-15 min delays.",
  "Temporary route updates in Khayelitsha after 18:00.",
];

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [nearbySigns, setNearbySigns] = useState<TaxiSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    auth.getSession().then(({ session }) => {
      setSession(session);
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("vayaride-recent-searches");
      if (raw) {
        setRecentSearches(JSON.parse(raw));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const user = session.user;
      const { data: locations } = await supabase
        .from("saved_locations")
        .select("id, label, address")
        .eq("user_id", user.id)
        .order("label");
      if (locations) setSavedLocations(locations as SavedLocation[]);

      const { data: signs } = await (supabase as any)
        .from("taxi_signs")
        .select("id, destination, city, province, taxi_rank, hand_sign_description, verified")
        .eq("status", "approved")
        .limit(4);
      if (signs) setNearbySigns(signs as unknown as TaxiSign[]);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const res = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pos.coords.latitude},${pos.coords.longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY}&result_type=locality`
              );
              const data = await res.json();
              const city = data.results?.[0]?.address_components?.find((c: any) => c.types.includes("locality"))?.long_name;
              if (city) setUserCity(city);
            } catch {}
          },
          () => {},
          { timeout: 5000 }
        );
      }

      setLoading(false);
    };

    load();
  }, [session]);

  useEffect(() => {
    if (!session || !mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapRef.current) return;
        const center = userCity ? { lat: -26.2041, lng: 28.0473 } : { lat: -26.2041, lng: 28.0473 };
        const map = new maps.Map(mapRef.current, {
          center,
          zoom: 10,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });
        new maps.Marker({ map, position: center, label: "V" });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [session, userCity]);

  const saveSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const next = [{ label: trimmed, savedAt: Date.now() }, ...recentSearches.filter((item) => item.label !== trimmed)].slice(0, 4);
    setRecentSearches(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("vayaride-recent-searches", JSON.stringify(next));
    }
    navigate({ to: "/taxi-signs" });
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    saveSearch(searchQuery);
  };

  if (checking) return null;

  if (session) {
    return (
      <div className="flex flex-col bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_55%)] pb-24">
        <div className="px-4 pt-4">
          <div className="rounded-[28px] border border-emerald-100 bg-white/90 p-4 shadow-[0_12px_50px_-18px_rgba(0,0,0,0.2)] backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-700">Welcome back</p>
                <h1 className="text-2xl font-semibold text-slate-900">{t("appName")}</h1>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  {userCity ?? "Johannesburg"}
                </p>
              </div>
              <div className="rounded-full bg-emerald-600/10 p-2 text-emerald-700">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>

            <form onSubmit={handleSearchSubmit} className="mt-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">Search taxis and signs</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search destinations, taxi ranks or signs"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none ring-0"
                />
              </div>
            </form>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/taxi-signs" className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Hand className="h-5 w-5" />
              </div>
              <p className="font-semibold text-slate-900">Find taxi signs</p>
              <p className="mt-1 text-sm text-slate-600">Browse route signs and taxi ranks instantly.</p>
            </Link>
            <Link to="/routes" className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <Map className="h-5 w-5" />
              </div>
              <p className="font-semibold text-slate-900">Plan a route</p>
              <p className="mt-1 text-sm text-slate-600">Get fares, travel time and a route preview.</p>
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-4 px-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Popular routes</h2>
              <Link to="/routes" className="text-sm font-medium text-emerald-700">Open planner</Link>
            </div>
            <div className="space-y-3">
              {popularRoutes.map((route) => (
                <div key={`${route.from}-${route.to}`} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <div>
                    <p className="font-medium text-slate-800">{route.from} → {route.to}</p>
                    <p className="text-sm text-slate-600">{route.taxiRank}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-700">{route.fare}</p>
                    <p className="text-sm text-slate-500">{route.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Service alerts</h2>
              <div className="rounded-full bg-amber-100 p-1.5 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-2">
              {serviceAlerts.map((alert) => (
                <div key={alert} className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                  {alert}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 px-4 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Your saved spots</h2>
              <Link to="/saved" className="text-sm font-medium text-emerald-700">View all</Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
              </div>
            ) : savedLocations.length > 0 ? (
              <div className="space-y-2">
                {savedLocations.map((loc) => (
                  <div key={loc.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      {loc.label.toLowerCase() === "home" ? <HomeIcon className="h-4 w-4" /> : loc.label.toLowerCase() === "work" ? <BriefcaseIcon /> : <MapPin className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">{loc.label}</p>
                      <p className="truncate text-sm text-slate-600">{loc.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">
                Save your favourite routes and destinations here.
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Recent searches</h2>
              <div className="rounded-full bg-slate-100 p-1.5 text-slate-600">
                <Clock3 className="h-4 w-4" />
              </div>
            </div>
            {recentSearches.length > 0 ? (
              <div className="space-y-2">
                {recentSearches.map((item) => (
                  <button key={item.savedAt} onClick={() => setSearchQuery(item.label)} className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700">
                    <span>{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">
                Your recent route searches will appear here.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 px-4">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Live city map</p>
                <p className="text-sm text-slate-600">Nearby taxi activity and route preview</p>
              </div>
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                <Navigation className="h-4 w-4" />
              </div>
            </div>
            <div ref={mapRef} className="h-56 w-full bg-slate-50" />
          </div>
        </div>

        <div className="mt-4 px-4">
          <div className="rounded-[28px] border border-slate-200 bg-linear-to-br from-emerald-600 to-emerald-700 p-4 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-100">Need help immediately?</p>
                <p className="text-lg font-semibold">Tap the SOS button for fast support.</p>
              </div>
              <div className="rounded-full bg-white/15 p-3">
                <Shield className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <SOSButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-emerald-50">
      <header className="flex items-center justify-between px-5 py-5">
        <span className="text-xl font-bold text-emerald-700">VayaRide</span>
        <Link to="/auth" className="text-sm font-medium text-emerald-700 hover:underline">Sign in</Link>
      </header>

      <section className="mx-auto max-w-xl px-5 pb-12 pt-8 text-center">
        <span className="mb-4 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Built for South Africa
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Ride smarter with <span className="text-emerald-700">VayaRide</span>
        </h1>
        <p className="mt-4 text-base text-slate-600">
          Discover taxi signs, plan routes and stay safe with a polished navigation experience built for everyday journeys.
        </p>
        <Link to="/auth" className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-emerald-700">
          Get started <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="mx-auto grid max-w-xl gap-3 px-5 pb-16 sm:grid-cols-2">
        <Feature icon={<Banknote className="h-5 w-5" />} title="Trusted fares" body="See clear taxi estimates before you ride." />
        <Feature icon={<Users className="h-5 w-5" />} title="Route planning" body="Smart route discovery with live map previews." />
        <Feature icon={<Moon className="h-5 w-5" />} title="Safe after dark" body="Emergency SOS and route awareness built in." />
        <Feature icon={<Shield className="h-5 w-5" />} title="Reliable guidance" body="Official signage and route information in one view." />
      </section>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">{icon}</div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}

function BriefcaseIcon() {
  return <Briefcase className="h-4 w-4" />;
}