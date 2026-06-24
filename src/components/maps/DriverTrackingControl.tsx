// Driver-side: starts geolocation watch, upserts ride_locations every ~10s
// while the ride is active. Also flips ride.status to 'active' on start
// and 'completed' on stop.
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, StopCircle } from "lucide-react";

export function DriverTrackingControl({ rideId, driverId, status }: {
  rideId: string; driverId: string; status: string;
}) {
  const [tracking, setTracking] = useState(status === "active");
  const watchRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const start = async () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    const { error } = await supabase.from("rides").update({ status: "active" }).eq("id", rideId);
    if (error) return toast.error(error.message);
    setTracking(true);
    toast.success("Trip started — sharing location with riders");

    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastSentRef.current < 8000) return; // throttle to ~10s
        lastSentRef.current = now;
        await supabase.from("ride_locations").upsert({
          ride_id: rideId,
          driver_id: driverId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading ?? null,
          speed_kph: pos.coords.speed != null ? pos.coords.speed * 3.6 : null,
          updated_at: new Date().toISOString(),
        });
      },
      (err) => toast.error(`Location error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  };

  const stop = async () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setTracking(false);
    await supabase.from("rides").update({ status: "completed" }).eq("id", rideId);
    await supabase.from("ride_locations").delete().eq("ride_id", rideId);
    toast.success("Trip completed");
  };

  if (status === "completed" || status === "cancelled") return null;

  return tracking ? (
    <Button variant="destructive" onClick={stop} className="w-full h-12">
      <StopCircle className="h-4 w-4 mr-1" /> End trip
    </Button>
  ) : (
    <Button onClick={start} className="w-full h-12">
      <MapPin className="h-4 w-4 mr-1" /> Start trip & share location
    </Button>
  );
}
