import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Bookmark, MapPin, Hand, ShieldCheck, Trash2, ChevronRight, Search, Route as RouteIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type SavedSign = {
  id: string;
  sign_id: string;
  taxi_signs: {
    id: string;
    destination: string;
    city: string;
    province: string;
    taxi_rank: string;
    hand_sign_description: string;
    verified: boolean;
  } | null;
};

type SavedRoute = {
  id: string;
  route_key: string;
  from_location: string;
  to_location: string;
  taxi_rank: string;
  fare: number;
  distance: string;
  duration: string;
};

export const Route = createFileRoute("/_authenticated/saved")({
  component: SavedPage,
});

function SavedPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [savedSigns, setSavedSigns] = useState<SavedSign[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: signData }, { data: routeData }] = await Promise.all([
        (supabase as any)
          .from("saved_taxi_signs")
          .select("id, sign_id, taxi_signs!inner(id, destination, city, province, taxi_rank, hand_sign_description, verified)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("saved_routes")
          .select("id, route_key, from_location, to_location, taxi_rank, fare, distance, duration")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      if (signData) setSavedSigns(signData as unknown as SavedSign[]);
      if (routeData) setSavedRoutes(routeData as unknown as SavedRoute[]);
      setLoading(false);
    };
    load();
  }, [user]);

  const removeSign = async (signId: string) => {
    await (supabase as any)
      .from("saved_taxi_signs")
      .delete()
      .eq("user_id", user!.id)
      .eq("sign_id", signId);
    setSavedSigns((prev) => prev.filter((s) => s.sign_id !== signId));
  };

  const removeRoute = async (routeKey: string) => {
    await (supabase as any)
      .from("saved_routes")
      .delete()
      .eq("user_id", user!.id)
      .eq("route_key", routeKey);
    setSavedRoutes((prev) => prev.filter((item) => item.route_key !== routeKey));
  };

  const filteredSigns = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return savedSigns;
    return savedSigns.filter((saved) => {
      const sign = saved.taxi_signs;
      return sign ? `${sign.destination} ${sign.city} ${sign.province}`.toLowerCase().includes(term) : false;
    });
  }, [query, savedSigns]);

  const filteredRoutes = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return savedRoutes;
    return savedRoutes.filter((route) => `${route.from_location} ${route.to_location} ${route.taxi_rank}`.toLowerCase().includes(term));
  }, [query, savedRoutes]);

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Saved</h1>
        <p className="text-sm text-muted-foreground">Keep your favourite routes, taxi signs and ranks close at hand.</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search favourites"
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filteredSigns.length === 0 && filteredRoutes.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center">
          <Bookmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">No favourites yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Save a route or taxi sign to see it here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRoutes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <RouteIcon className="h-4 w-4 text-emerald-700" />
                <h2 className="text-sm font-semibold text-slate-900">Saved routes</h2>
              </div>
              {filteredRoutes.map((route) => (
                <div key={route.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{route.from_location} → {route.to_location}</p>
                      <p className="mt-1 text-sm text-slate-600">{route.taxi_rank}</p>
                      <p className="mt-2 text-sm text-emerald-700">{route.distance} • {route.duration}</p>
                    </div>
                    <button onClick={() => removeRoute(route.route_key)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredSigns.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-emerald-700" />
                <h2 className="text-sm font-semibold text-slate-900">Saved taxi signs</h2>
              </div>
              {filteredSigns.map((saved) => {
            const sign = saved.taxi_signs;
            if (!sign) return null;
            return (
              <Link
                key={saved.id}
                to="/taxi-signs/$signId"
                params={{ signId: sign.id }}
                className="block rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5"
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
                    <p className="text-sm text-muted-foreground">
                      {sign.city}, {sign.province}
                    </p>
                    {sign.taxi_rank && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {sign.taxi_rank}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.preventDefault(); removeSign(sign.id); }}
                      className="p-1.5 rounded-full hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-destructive/70" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            );
          })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}