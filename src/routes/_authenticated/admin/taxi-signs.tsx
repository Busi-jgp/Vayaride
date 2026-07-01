import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, X, Eye, ShieldCheck, Hand, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type PendingSign = {
  id: string;
  destination: string;
  city: string;
  province: string;
  taxi_rank: string;
  hand_sign_description: string;
  alternative_sign: string | null;
  notes: string | null;
  verified: boolean;
  status: string;
  created_by: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/admin/taxi-signs")({
  component: AdminTaxiSignsPage,
});

function AdminTaxiSignsPage() {
  const { t } = useI18n();
  const [pending, setPending] = useState<PendingSign[]>([]);
  const [approved, setApproved] = useState<PendingSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("taxi_signs")
        .select("*")
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false });
      if (data) {
        const all = data as unknown as PendingSign[];
        setPending(all.filter((s) => s.status === "pending"));
        setApproved(all.filter((s) => s.status === "approved"));
      }
      setLoading(false);
    };
    load();
  }, []);

  const approveSign = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from("taxi_signs")
      .update({ status: "approved", verified: true })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      const sign = pending.find((s) => s.id === id);
      if (sign) {
        setPending((prev) => prev.filter((s) => s.id !== id));
        setApproved((prev) => [{ ...sign, status: "approved", verified: true }, ...prev]);
      }
      toast.success("Sign approved");
    }
    setActionLoading(null);
  };

  const rejectSign = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from("taxi_signs")
      .update({ status: "rejected" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      setPending((prev) => prev.filter((s) => s.id !== id));
      toast.success("Sign rejected");
    }
    setActionLoading(null);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">{t("moderationQueue")}</h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} pending · {approved.length} approved
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("pending")}
          className={`text-sm rounded-lg px-4 py-2 font-medium transition-colors ${
            tab === "pending" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setTab("approved")}
          className={`text-sm rounded-lg px-4 py-2 font-medium transition-colors ${
            tab === "approved" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          Approved ({approved.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : tab === "pending" && pending.length === 0 ? (
        <div className="text-center py-10">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">All caught up!</p>
          <p className="text-xs text-muted-foreground mt-1">No pending signs to review.</p>
        </div>
      ) : tab === "pending" ? (
        <div className="space-y-3">
          {pending.map((sign) => (
            <div key={sign.id} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{sign.destination}</h3>
                  <p className="text-sm text-muted-foreground">
                    {sign.city}, {sign.province}
                  </p>
                </div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                  {sign.status}
                </Badge>
              </div>
              {sign.taxi_rank && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {sign.taxi_rank}
                </p>
              )}
              <p className="text-sm line-clamp-3">{sign.hand_sign_description}</p>
              {sign.notes && (
                <p className="text-xs text-muted-foreground italic">Note: {sign.notes}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => approveSign(sign.id)}
                  disabled={actionLoading === sign.id}
                >
                  {actionLoading === sign.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {t("approve")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1 text-destructive"
                  onClick={() => rejectSign(sign.id)}
                  disabled={actionLoading === sign.id}
                >
                  <X className="h-3 w-3" />
                  {t("reject")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {approved.map((sign) => (
            <div key={sign.id} className="rounded-xl border bg-card p-3 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{sign.destination}</p>
                <p className="text-xs text-muted-foreground">{sign.city}, {sign.province}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                <ShieldCheck className="h-3 w-3 mr-0.5" />
                {t("verified")}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}