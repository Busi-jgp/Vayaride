// Subscribes to ride_locations for a given ride and returns the latest fix.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LiveFix = { lat: number; lng: number; updated_at: string } | null;

export function useLiveRideLocation(rideId: string, enabled: boolean): LiveFix {
  const [fix, setFix] = useState<LiveFix>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    // Initial fetch
    supabase.from("ride_locations").select("lat,lng,updated_at").eq("ride_id", rideId).maybeSingle()
      .then(({ data }) => { if (!cancelled && data) setFix(data); });

    const channel = supabase
      .channel(`ride-loc-${rideId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ride_locations", filter: `ride_id=eq.${rideId}` },
        (payload) => {
          const row = (payload.new as { lat: number; lng: number; updated_at: string } | null);
          if (row) setFix({ lat: row.lat, lng: row.lng, updated_at: row.updated_at });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [rideId, enabled]);

  return fix;
}
