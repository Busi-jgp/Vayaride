import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Clock, MapPin, Users, Banknote, ArrowLeft, Star, Route as RouteIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RouteMap } from "@/components/maps/RouteMap";
import { DriverTrackingControl } from "@/components/maps/DriverTrackingControl";
import { useLiveRideLocation } from "@/lib/maps/useLiveRideLocation";
import { getEmergencyNumber, getSafetyChecklist } from "@/lib/safety";

export const Route = createFileRoute("/_authenticated/rides/$rideId")({
  component: RideDetail,
});

function RideDetail() {
  const { rideId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [rateOpen, setRateOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");

  const { data: ride, isLoading } = useQuery({
    queryKey: ["ride", rideId],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*").eq("id", rideId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: driverProfile } = useQuery({
    queryKey: ["driver-contact", rideId],
    enabled: !!ride?.driver_id,
    queryFn: async () => {
      // RPC reveals phone only to ride participants/driver, name to everyone.
      const { data } = await supabase.rpc("get_driver_contact", { p_ride_id: rideId });
      return data?.[0] ?? null;
    },
  });

  const { data: participants } = useQuery({
    queryKey: ["participants", rideId],
    queryFn: async () => {
      const { data: parts, error } = await supabase
        .from("ride_participants")
        .select("*")
        .eq("ride_id", rideId);
      if (error) throw error;
      const ids = (parts ?? []).map((p) => p.user_id);
      if (ids.length === 0) return parts ?? [];
      const { data: dir } = await supabase.rpc("get_profile_directory", { p_ids: ids });
      const byId = new Map((dir ?? []).map((d: any) => [d.id, d]));
      return (parts ?? []).map((p: any) => ({ ...p, profile: byId.get(p.user_id) }));
    },
  });

  const trackingEnabled = !!ride && (ride.status === "active" || ride.status === "upcoming");
  const live = useLiveRideLocation(rideId, trackingEnabled);

  if (isLoading || !ride) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;

  const isDriver = user?.id === ride.driver_id;
  const myPart = participants?.find((p: any) => p.user_id === user?.id);
  const joinedCount = participants?.length ?? 0;
  const splitFare = joinedCount > 0
    ? (Number(ride.price_per_seat) * joinedCount) / joinedCount
    : Number(ride.price_per_seat);

  const joinRide = async () => {
    if (!user) return;
    const { error } = await supabase.from("ride_participants").insert({
      ride_id: rideId,
      user_id: user.id,
      seats: 1,
      amount_paid: ride.price_per_seat,
      payment_method: "cash",
    });
    if (error) return toast.error(error.message);
    toast.success("Joined! Pay in cash on the day.");
    qc.invalidateQueries({ queryKey: ["ride", rideId] });
    qc.invalidateQueries({ queryKey: ["participants", rideId] });
  };

  const cancelJoin = async () => {
    if (!myPart) return;
    const { error } = await supabase.from("ride_participants").delete().eq("id", myPart.id);
    if (error) return toast.error(error.message);
    toast.success("You left the ride.");
    qc.invalidateQueries({ queryKey: ["ride", rideId] });
    qc.invalidateQueries({ queryKey: ["participants", rideId] });
  };

  const cancelRide = async () => {
    const { error } = await supabase.from("rides").update({ status: "cancelled" }).eq("id", rideId);
    if (error) return toast.error(error.message);
    toast.success("Ride cancelled.");
    qc.invalidateQueries({ queryKey: ["ride", rideId] });
  };

  const submitRefund = async () => {
    if (!user) return;
    // Server-side RPC validates participation and pulls the real amount paid.
    const { error } = await supabase.rpc("request_refund", {
      p_ride_id: rideId,
      p_reason: refundReason,
    });
    if (error) return toast.error(error.message);
    toast.success("Refund request submitted.");
    setRefundOpen(false);
    setRefundReason("");
  };

  const submitRating = async () => {
    if (!user) return;
    const { error } = await supabase.from("ratings").insert({
      ride_id: rideId,
      rater_id: user.id,
      ratee_id: ride.driver_id,
      stars,
      comment: comment || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Thanks for rating!");
    setRateOpen(false);
  };

  return (
    <div className="px-4 pt-3 pb-6 max-w-md mx-auto">
      <button onClick={() => navigate({ to: "/rides" })} className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {new Date(ride.scheduled_time).toLocaleString("en-ZA", {
            weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          })}
          <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase font-bold">{ride.status}</span>
        </div>
        <div className="mt-3 flex items-start gap-2">
          <MapPin className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <p className="font-medium">{ride.pickup_address}</p>
            <p className="text-muted-foreground text-sm">→ {ride.dropoff_address}</p>
          </div>
        </div>
        {ride.notes && <p className="mt-3 text-sm text-muted-foreground italic">"{ride.notes}"</p>}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat icon={<Users className="h-4 w-4" />} label="Seats" value={`${ride.available_seats}/${ride.total_seats}`} />
          <Stat icon={<Banknote className="h-4 w-4" />} label="Per seat" value={`R${Number(ride.price_per_seat).toFixed(0)}`} />
          <Stat icon={<Banknote className="h-4 w-4" />} label="Split" value={`R${splitFare.toFixed(0)}`} />
        </div>
        {(ride.distance_km != null || ride.duration_min != null) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <RouteIcon className="h-3.5 w-3.5" />
            {ride.distance_km != null && <span>{ride.distance_km} km</span>}
            {ride.duration_min != null && <span>· ~{ride.duration_min} min</span>}
          </div>
        )}
      </div>

      <div className="mt-4">
        <RouteMap
          pickupLat={ride.pickup_lat} pickupLng={ride.pickup_lng}
          dropoffLat={ride.dropoff_lat} dropoffLng={ride.dropoff_lng}
          liveLat={live?.lat} liveLng={live?.lng}
        />
        {ride.status === "active" && live && (
          <p className="mt-1 text-xs text-primary">
            ● Live · updated {new Date(live.updated_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border bg-card p-4">
        <h3 className="text-sm font-semibold mb-1">Driver</h3>
        <p className="text-sm">{driverProfile?.full_name ?? "Driver"}</p>
        <h3 className="text-sm font-semibold mt-4 mb-2">Riders ({joinedCount})</h3>
        <ul className="space-y-1 text-sm">
          {participants?.map((p: any) => (
            <li key={p.id} className="text-muted-foreground">• {p.profile?.full_name ?? "Rider"}</li>
          ))}
          {joinedCount === 0 && <li className="text-xs text-muted-foreground">No one has joined yet.</li>}
        </ul>
      </div>

      <div className="mt-4 rounded-2xl border bg-amber-50 p-4">
        <h3 className="text-sm font-semibold mb-2">Safety checklist</h3>
        <ul className="space-y-1 text-sm text-slate-700">
          {getSafetyChecklist().map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-600">
          For urgent support, call <span className="font-semibold">{getEmergencyNumber()}</span>.
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {ride.status === "upcoming" && !isDriver && !myPart && ride.available_seats > 0 && (
          <Button onClick={joinRide} className="w-full h-12 text-base">
            Join ride · pay R{Number(ride.price_per_seat).toFixed(0)} cash
          </Button>
        )}
        {myPart && ride.status === "upcoming" && (
          <>
            <Button variant="outline" onClick={cancelJoin} className="w-full">Leave ride</Button>
            <Button variant="ghost" onClick={() => setRefundOpen((v) => !v)} className="w-full">Request refund</Button>
          </>
        )}
        {isDriver && ride.status === "upcoming" && (
          <Button variant="destructive" onClick={cancelRide} className="w-full">Cancel ride</Button>
        )}
        {isDriver && (
          <DriverTrackingControl rideId={rideId} driverId={ride.driver_id} status={ride.status} />
        )}
        {(ride.status === "completed" || ride.status === "active") && myPart && (
          <Button variant="outline" onClick={() => setRateOpen((v) => !v)} className="w-full">
            <Star className="h-4 w-4 mr-1" /> Rate driver
          </Button>
        )}
      </div>

      {refundOpen && (
        <div className="mt-4 rounded-2xl border bg-card p-4 space-y-3">
          <h4 className="font-semibold text-sm">Refund request</h4>
          <Textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Why are you requesting a refund?" />
          <Button onClick={submitRefund} disabled={!refundReason} className="w-full">Submit</Button>
        </div>
      )}

      {rateOpen && (
        <div className="mt-4 rounded-2xl border bg-card p-4 space-y-3">
          <h4 className="font-semibold text-sm">Rate this ride</h4>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setStars(n)} type="button">
                <Star className={`h-7 w-7 ${n <= stars ? "fill-accent text-accent" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment" />
          <Button onClick={submitRating} className="w-full">Submit rating</Button>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary p-2.5">
      <div className="flex justify-center text-muted-foreground">{icon}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
      <div className="font-bold text-sm">{value}</div>
    </div>
  );
}
