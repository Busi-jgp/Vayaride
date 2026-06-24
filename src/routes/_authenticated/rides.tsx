import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, MapPin, Users, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/rides")({
  component: RidesList,
});

function RidesList() {
  const [search, setSearch] = useState("");
  const [after5, setAfter5] = useState(false);

  const { data: rides, isLoading } = useQuery({
    queryKey: ["rides", "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("status", "upcoming")
        .gte("scheduled_time", new Date().toISOString())
        .order("scheduled_time", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (rides ?? []).filter((r: any) => {
    const matchesSearch =
      !search ||
      r.pickup_address.toLowerCase().includes(search.toLowerCase()) ||
      r.dropoff_address.toLowerCase().includes(search.toLowerCase());
    const hour = new Date(r.scheduled_time).getHours();
    const matchesTime = !after5 || hour >= 17;
    return matchesSearch && matchesTime;
  });

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-bold">Find a ride</h1>
      <p className="text-sm text-muted-foreground">Scheduled lifts, shared and affordable.</p>

      <div className="mt-4 space-y-2">
        <Input placeholder="Search by pickup or destination…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button
          onClick={() => setAfter5(!after5)}
          className={`text-xs rounded-full px-3 py-1.5 border ${after5 ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}
        >
          🌙 After 5pm only
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading rides…</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-10 rounded-2xl border bg-card">
            <p className="text-sm text-muted-foreground">No rides match yet.</p>
            <Link to="/rides/new" className="mt-3 inline-block text-sm font-medium text-primary">
              Offer the first ride →
            </Link>
          </div>
        )}
        {filtered.map((r: any) => (
          <Link key={r.id} to="/rides/$rideId" params={{ rideId: r.id }}
            className="block rounded-2xl border bg-card p-4 hover:border-primary transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(r.scheduled_time).toLocaleString("en-ZA", {
                    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.pickup_address}</p>
                    <p className="text-sm text-muted-foreground truncate">→ {r.dropoff_address}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3 w-3" /> {r.available_seats}/{r.total_seats}
                  </span>
                  <span className="font-bold text-primary">R{Number(r.price_per_seat).toFixed(0)} /seat</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
