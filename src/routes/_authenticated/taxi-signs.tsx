import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Search, MapPin, Plus, ChevronRight, Loader2, Navigation, Hand, ShieldCheck, Bookmark, BookmarkCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type TaxiSign = {
  id: string;
  province: string;
  city: string;
  suburb: string;
  destination: string;
  taxi_rank: string;
  hand_sign_description: string;
  alternative_sign: string | null;
  notes: string | null;
  hand_sign_image: string | null;
  hand_sign_illustration: string | null;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
  status: string;
  created_by: string | null;
};

const PROVINCES = [
  "Gauteng", "KwaZulu-Natal", "Western Cape", "Eastern Cape",
  "Free State", "Mpumalanga", "Limpopo", "North West", "Northern Cape",
];

const POPULAR_SEARCHES = [
  "Johannesburg CBD", "Soweto", "Sandton", "Pretoria", "Durban",
  "Cape Town", "Midrand", "Fourways", "Randburg", "Alexandra",
];

export const Route = createFileRoute("/_authenticated/taxi-signs")({
  component: TaxiSignsPage,
});

function TaxiSignsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TaxiSign[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [userLocation, setUserLocation] = useState<{ city?: string; lat?: number; lng?: number }>({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [filterProvince, setFilterProvince] = useState("");
  const [filterVerified, setFilterVerified] = useState(false);

  // Load saved sign IDs
  useEffect(() => {
    if (!user) return;
    supabase
      .from("saved_taxi_signs")
      .select("sign_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setSavedIds(new Set(data.map((s) => s.sign_id)));
      });
  }, [user]);

  const searchSigns = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);

    let queryBuilder = supabase
      .from("taxi_signs")
      .select("*")
      .eq("status", "approved");

    // Fuzzy search using ilike
    queryBuilder = queryBuilder.ilike("destination", `%${searchQuery.trim()}%`);

    if (filterProvince) {
      queryBuilder = queryBuilder.eq("province", filterProvince);
    }
    if (filterVerified) {
      queryBuilder = queryBuilder.eq("verified", true);
    }

    const { data } = await queryBuilder.order("destination").limit(50);
    setResults((data as TaxiSign[]) || []);
    setLoading(false);
  }, [filterProvince, filterVerified]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchSigns(query);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY}&result_type=locality`
          );
          const data = await res.json();
          const city = data.results?.[0]?.address_components?.find((c: any) =>
            c.types.includes("locality")
          )?.long_name;
          if (city) {
            setUserLocation((prev) => ({ ...prev, city }));
            // Auto-search for nearby signs
            const { data: nearby } = await supabase
              .from("taxi_signs")
              .select("*")
              .eq("status", "approved")
              .ilike("city", `%${city}%`)
              .order("destination")
              .limit(50);
            if (nearby) {
              setResults(nearby as TaxiSign[]);
              setSearched(true);
            }
          }
        } catch {}
        setLocationLoading(false);
      },
      () => setLocationLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const toggleSave = async (signId: string) => {
    if (!user) return;
    if (savedIds.has(signId)) {
      await supabase
        .from("saved_taxi_signs")
        .delete()
        .eq("user_id", user.id)
        .eq("sign_id", signId);
      setSavedIds((prev) => { const next = new Set(prev); next.delete(signId); return next; });
    } else {
      await supabase
        .from("saved_taxi_signs")
        .insert({ user_id: user.id, sign_id: signId });
      setSavedIds((prev) => { const next = new Set(prev); next.add(signId); return next; });
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">{t("taxiSigns")}</h1>
        <p className="text-sm text-muted-foreground">{t("taxiSignsSubtitle")}</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchDestinationPlaceholder")}
          className="pl-9 h-12 rounded-xl bg-muted/50 border-0 text-base"
        />
      </form>

      {/* Location detect */}
      <Button
        variant="outline"
        className="w-full h-11 gap-2 rounded-xl"
        onClick={detectLocation}
        disabled={locationLoading}
      >
        {locationLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Navigation className="h-4 w-4 text-primary" />
        )}
        {t("useMyLocation")}
      </Button>

      {userLocation.city && (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-primary" />
          <span>
            {t("youAreIn")} <strong>{userLocation.city}</strong>
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <select
          value={filterProvince}
          onChange={(e) => setFilterProvince(e.target.value)}
          className="text-xs rounded-lg border bg-background px-3 py-1.5 shrink-0"
        >
          <option value="">{t("filterByProvince")}</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button
          onClick={() => setFilterVerified(!filterVerified)}
          className={`text-xs rounded-lg border px-3 py-1.5 shrink-0 flex items-center gap-1 transition-colors ${
            filterVerified ? "bg-primary text-primary-foreground border-primary" : "bg-background"
          }`}
        >
          <ShieldCheck className="h-3 w-3" />
          {t("verifiedOnly")}
        </button>
      </div>

      {/* Popular searches (when no search done) */}
      {!searched && !loading && results.length === 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">{t("popularSearches")}</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); searchSigns(s); }}
                className="text-xs rounded-full border bg-muted/30 px-3 py-1.5 hover:bg-muted/60 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : searched && results.length === 0 ? (
        <div className="text-center py-10">
          <Hand className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">{t("noSignsFound")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("tryDifferentSearch")}</p>
        </div>
      ) : results.length > 0 ? (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {results.length} {t("results")}
          </p>
          <div className="space-y-3">
            {results.map((sign) => (
              <Link
                key={sign.id}
                to="/taxi-signs/$signId"
                params={{ signId: sign.id }}
                className="block rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base truncate">{sign.destination}</h3>
                      {sign.verified && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
                          <ShieldCheck className="h-3 w-3 mr-0.5" />
                          {t("verified")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {sign.city}, {sign.province}
                    </p>
                    {sign.taxi_rank && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {sign.taxi_rank}
                      </p>
                    )}
                    <p className="text-sm mt-2 line-clamp-2 text-foreground/80">
                      {sign.hand_sign_description}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.preventDefault(); toggleSave(sign.id); }}
                      className="p-1.5 rounded-full hover:bg-muted transition-colors"
                    >
                      {savedIds.has(sign.id) ? (
                        <BookmarkCheck className="h-5 w-5 text-primary" />
                      ) : (
                        <Bookmark className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* FAB: Add Taxi Sign */}
      <Link
        to="/taxi-signs/add"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}