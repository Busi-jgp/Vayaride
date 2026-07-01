import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Bookmark, MapPin, Hand, ShieldCheck, Trash2, ChevronRight } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/saved")({
  component: SavedPage,
});

function SavedPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [savedSigns, setSavedSigns] = useState<SavedSign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("saved_taxi_signs")
        .select("id, sign_id, taxi_signs!inner(id, destination, city, province, taxi_rank, hand_sign_description, verified)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setSavedSigns(data as unknown as SavedSign[]);
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

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">{t("savedTaxiSigns")}</h1>
        <p className="text-sm text-muted-foreground">{t("saved")}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : savedSigns.length === 0 ? (
        <div className="text-center py-10">
          <Bookmark className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">{t("noSavedSigns")}</p>
          <Link
            to="/taxi-signs"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t("findTaxiSign")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {savedSigns.map((saved) => {
            const sign = saved.taxi_signs;
            if (!sign) return null;
            return (
              <Link
                key={saved.id}
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
  );
}