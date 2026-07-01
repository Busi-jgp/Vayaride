import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, MapPin, Hand, Map, Home as HomeIcon, Briefcase, ChevronRight, ArrowRight, Users, Banknote, Moon, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/AppShell";
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

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const { t } = useI18n();
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [nearbySigns, setNearbySigns] = useState<TaxiSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCity, setUserCity] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
  }, []);

  // Load authenticated home data
  useEffect(() => {
    if (!session) { setLoading(false); return; }

    const load = async () => {
      const user = session.user;

      // Load saved locations
      const { data: locations } = await supabase
        .from("saved_locations")
        .select("id, label, address")
        .eq("user_id", user.id)
        .order("label");
      if (locations) setSavedLocations(locations as SavedLocation[]);

      // Load some taxi signs
      const { data: signs } = await supabase
        .from("taxi_signs")
        .select("id, destination, city, province, taxi_rank, hand_sign_description, verified")
        .eq("status", "approved")
        .limit(4);
      if (signs) setNearbySigns(signs as unknown as TaxiSign[]);

      // Try geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const res = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pos.coords.latitude},${pos.coords.longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY}&result_type=locality`
              );
              const data = await res.json();
              const city = data.results?.[0]?.address_components?.find((c: any) =>
                c.types.includes("locality")
              )?.long_name;
              if (city) setUserCity(city);
            } catch {}
          },
          () => {},
          { timeout: 5000 },
        );
      }

      setLoading(false);
    };
    load();
  }, [session]);

  if (checking) return null;

  // Authenticated user — show the VayaRide home screen
  if (session) {
    return (
      <div className="flex flex-col">
        {/* Welcome header with map area */}
        <div className="relative h-52 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <svg viewBox="0 0 400 200" className="w-full h-full">
              <path d="M0,100 Q100,50 200,100 T400,80 L400,200 L0,200 Z" fill="currentColor" className="text-primary" />
              <path d="M0,130 Q150,80 300,130 T400,100 L400,200 L0,200 Z" fill="currentColor" className="text-primary/50" />
            </svg>
          </div>

          <div className="relative z-10 p-4 pt-6">
            <h1 className="text-2xl font-bold">
              {t("appName")}
            </h1>
            {userCity && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {userCity}
              </p>
            )}

            {/* Search bar */}
            <Link to="/taxi-signs" className="block mt-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <div className="pl-10 h-12 rounded-xl bg-white/90 dark:bg-gray-900/90 border shadow-sm backdrop-blur text-base flex items-center text-muted-foreground">
                  {t("searchDestination")}
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-4 -mt-5 z-20">
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/taxi-signs"
              className="rounded-xl bg-card border p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Hand className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-semibold">{t("findTaxiSign")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("taxiSignsSubtitle")}</p>
            </Link>
            <Link
              to="/routes"
              className="rounded-xl bg-card border p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                <Map className="h-5 w-5 text-accent" />
              </div>
              <p className="text-sm font-semibold">{t("planRoute")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("comingSoon")}</p>
            </Link>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-5 pb-4">
          {/* Saved places */}
          {savedLocations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">{t("savedPlaces")}</h2>
              </div>
              <div className="space-y-2">
                {savedLocations.map((loc) => (
                  <div key={loc.id} className="flex items-center gap-3 rounded-xl bg-card border p-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      loc.label.toLowerCase() === "home" ? "bg-primary/10 text-primary" :
                      loc.label.toLowerCase() === "work" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                    }`}>
                      {loc.label.toLowerCase() === "home" ? <HomeIcon className="h-4 w-4" /> :
                       loc.label.toLowerCase() === "work" ? <Briefcase className="h-4 w-4" /> :
                       <MapPin className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{loc.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby taxi signs */}
          {nearbySigns.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">{t("popularSearches")}</h2>
                <Link to="/taxi-signs" className="text-xs font-medium text-primary flex items-center gap-0.5">
                  {t("viewAll")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {nearbySigns.map((sign) => (
                  <Link
                    key={sign.id}
                    to="/taxi-signs/$signId"
                    params={{ signId: sign.id }}
                    className="flex items-center gap-3 rounded-xl bg-card border p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Hand className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{sign.destination}</p>
                      <p className="text-xs text-muted-foreground truncate">{sign.city}, {sign.province}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Unauthenticated — show the landing page
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <header className="px-5 py-5 flex items-center justify-between">
        <span className="font-bold text-xl text-primary">VayaRide</span>
        <Link to="/auth" className="text-sm font-medium text-primary hover:underline">Sign in</Link>
      </header>

      <section className="px-5 pt-10 pb-12 max-w-xl mx-auto text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent-foreground text-xs font-medium mb-4">
          🇿🇦 Built for South Africa
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
          Share the ride.<br /><span className="text-primary">Split the fare.</span>
        </h1>
        <p className="mt-4 text-muted-foreground text-base">
          Affordable group rides and scheduled lifts for after-5pm trips — Vaaloewer to the Vaal Triangle and beyond.
        </p>
        <Link
          to="/auth"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-primary-foreground font-semibold shadow-lg hover:bg-primary/90"
        >
          Get started <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="px-5 pb-16 max-w-xl mx-auto grid sm:grid-cols-2 gap-3">
        <Feature icon={<Banknote className="h-5 w-5" />} title="Cheaper than Uber" body="Split fare with up to 4 other riders." />
        <Feature icon={<Users className="h-5 w-5" />} title="Lift clubs" body="Join scheduled rides on your usual route." />
        <Feature icon={<Moon className="h-5 w-5" />} title="After-5pm focus" body="Get home safely when other options dry up." />
        <Feature icon={<Shield className="h-5 w-5" />} title="SOS built-in" body="One tap to share your location with someone." />
      </section>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-card border p-4">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">{icon}</div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{body}</p>
    </div>
  );
}