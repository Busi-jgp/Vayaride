import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, ShieldCheck, Bookmark, BookmarkCheck, Share2, ChevronLeft, ExternalLink, Hand } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
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
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/taxi-signs/$signId")({
  component: TaxiSignDetailPage,
});

function TaxiSignDetailPage() {
  const { signId } = Route.useParams();
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sign, setSign] = useState<TaxiSign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("taxi_signs")
        .select("*")
        .eq("id", signId)
        .single();
      if (data) setSign(data as unknown as TaxiSign);
      setLoading(false);
    };
    load();
  }, [signId]);

  useEffect(() => {
    if (!user || !signId) return;
    supabase
      .from("saved_taxi_signs")
      .select("id")
      .eq("user_id", user.id)
      .eq("sign_id", signId)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, signId]);

  const toggleSave = async () => {
    if (!user || !signId) return;
    if (saved) {
      await supabase
        .from("saved_taxi_signs")
        .delete()
        .eq("user_id", user.id)
        .eq("sign_id", signId);
      setSaved(false);
    } else {
      await supabase
        .from("saved_taxi_signs")
        .insert({ user_id: user.id, sign_id: signId });
      setSaved(true);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-4 space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (!sign) {
    return (
      <div className="px-4 py-10 text-center">
        <Hand className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="font-medium">Taxi sign not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/taxi-signs" })}>
          {t("back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/taxi-signs" })}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("back")}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSave}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            {saved ? (
              <BookmarkCheck className="h-5 w-5 text-primary" />
            ) : (
              <Bookmark className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Hand sign illustration area */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border p-8 flex items-center justify-center min-h-[200px]">
        {sign.hand_sign_illustration ? (
          <img
            src={sign.hand_sign_illustration}
            alt={sign.destination}
            className="max-h-48 object-contain"
          />
        ) : sign.hand_sign_image ? (
          <img
            src={sign.hand_sign_image}
            alt={sign.destination}
            className="max-h-48 object-contain rounded-lg"
          />
        ) : (
          <div className="text-center">
            <Hand className="h-20 w-20 mx-auto text-primary/40" />
            <p className="text-xs text-muted-foreground mt-2">Hand sign illustration</p>
          </div>
        )}
      </div>

      {/* Destination header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">{sign.destination}</h1>
          {sign.verified && (
            <Badge variant="secondary" className="text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" />
              {t("verified")}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {sign.city}, {sign.province}
          {sign.suburb && ` · ${sign.suburb}`}
        </p>
      </div>

      {/* Hand sign description */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold mb-2">{t("handSignDescription")}</h2>
        <p className="text-base">{sign.hand_sign_description}</p>
      </div>

      {/* Alternative sign */}
      {sign.alternative_sign && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-2">{t("alternativeSign")}</h2>
          <p className="text-sm text-muted-foreground">{sign.alternative_sign}</p>
        </div>
      )}

      {/* Taxi rank */}
      {sign.taxi_rank && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-2">{t("servingRanks")}</h2>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span>{sign.taxi_rank}</span>
          </div>
          {sign.latitude && sign.longitude && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${sign.latitude},${sign.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium"
            >
              <ExternalLink className="h-3 w-3" />
              Open in Google Maps
            </a>
          )}
        </div>
      )}

      {/* Notes */}
      {sign.notes && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-2">{t("notes")}</h2>
          <p className="text-sm text-muted-foreground">{sign.notes}</p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-xl bg-muted/50 p-4">
        <p className="text-xs text-muted-foreground">
          {t("varyByAssociation")}
        </p>
      </div>
    </div>
  );
}