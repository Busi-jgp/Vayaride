import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/history")({
  component: History,
});

function History() {
  const { user } = useAuth();

  const { data: driven } = useQuery({
    queryKey: ["history", "driven", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides").select("*").eq("driver_id", user!.id)
        .order("scheduled_time", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: joined } = useQuery({
    queryKey: ["history", "joined", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ride_participants").select("*, rides(*)").eq("user_id", user!.id)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="px-4 pt-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">My trips</h1>

      <h2 className="mt-5 text-sm font-semibold text-muted-foreground uppercase">As driver</h2>
      <div className="mt-2 space-y-2">
        {(!driven || driven.length === 0) && <p className="text-sm text-muted-foreground">No rides offered yet.</p>}
        {driven?.map((r) => <Card key={r.id} ride={r} />)}
      </div>

      <h2 className="mt-6 text-sm font-semibold text-muted-foreground uppercase">As rider</h2>
      <div className="mt-2 space-y-2">
        {(!joined || joined.length === 0) && <p className="text-sm text-muted-foreground">You haven't joined any rides yet.</p>}
        {joined?.map((p: any) => p.rides && <Card key={p.id} ride={p.rides} />)}
      </div>
    </div>
  );
}

function Card({ ride }: { ride: any }) {
  return (
    <Link to="/rides/$rideId" params={{ rideId: ride.id }} className="block rounded-2xl border bg-card p-3">
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {new Date(ride.scheduled_time).toLocaleString("en-ZA")}
        <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase">{ride.status}</span>
      </div>
      <div className="mt-1 flex items-start gap-2">
        <MapPin className="h-4 w-4 text-primary mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">{ride.pickup_address}</p>
          <p className="text-muted-foreground">→ {ride.dropoff_address}</p>
        </div>
      </div>
    </Link>
  );
}
