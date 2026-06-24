import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlaceAutocomplete } from "@/components/maps/PlaceAutocomplete";
import { RouteMap } from "@/components/maps/RouteMap";
import { computeRoute } from "@/lib/api/routes.functions";

export const Route = createFileRoute("/_authenticated/rides/new")({
  component: NewRide,
});

function NewRide() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const compute = useServerFn(computeRoute);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    pickup_address: "",
    pickup_lat: null as number | null,
    pickup_lng: null as number | null,
    dropoff_address: "",
    dropoff_lat: null as number | null,
    dropoff_lng: null as number | null,
    scheduled_time: "",
    total_seats: 3,
    price_per_seat: 30,
    notes: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    // Try to fetch a road distance/duration if we have coordinates
    let distance_km: number | null = null;
    let duration_min: number | null = null;
    if (form.pickup_lat != null && form.dropoff_lat != null) {
      try {
        const r = await compute({
          data: {
            originLat: form.pickup_lat, originLng: form.pickup_lng!,
            destLat: form.dropoff_lat, destLng: form.dropoff_lng!,
          },
        });
        distance_km = r.distance_km;
        duration_min = r.duration_min;
      } catch (err) { console.warn("route compute failed", err); }
    }

    const { data, error } = await supabase
      .from("rides")
      .insert({
        driver_id: user.id,
        pickup_address: form.pickup_address,
        pickup_lat: form.pickup_lat,
        pickup_lng: form.pickup_lng,
        dropoff_address: form.dropoff_address,
        dropoff_lat: form.dropoff_lat,
        dropoff_lng: form.dropoff_lng,
        scheduled_time: new Date(form.scheduled_time).toISOString(),
        total_seats: form.total_seats,
        available_seats: form.total_seats,
        price_per_seat: form.price_per_seat,
        notes: form.notes || null,
        distance_km,
        duration_min,
      })
      .select()
      .single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Ride created!");
    navigate({ to: "/rides/$rideId", params: { rideId: data.id } });
  };

  return (
    <div className="px-4 pt-4 pb-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Offer a ride</h1>
      <p className="text-sm text-muted-foreground">Set your route, time, and price per seat.</p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <Label>Pickup</Label>
          <PlaceAutocomplete
            value={form.pickup_address}
            placeholder="e.g. Vaaloewer Spar"
            onChange={(v) => setForm({ ...form, pickup_address: v, pickup_lat: null, pickup_lng: null })}
            onSelect={(s) => setForm({ ...form, pickup_address: s.address, pickup_lat: s.lat, pickup_lng: s.lng })}
          />
        </div>
        <div>
          <Label>Drop-off</Label>
          <PlaceAutocomplete
            value={form.dropoff_address}
            placeholder="e.g. Vanderbijlpark Square"
            onChange={(v) => setForm({ ...form, dropoff_address: v, dropoff_lat: null, dropoff_lng: null })}
            onSelect={(s) => setForm({ ...form, dropoff_address: s.address, dropoff_lat: s.lat, dropoff_lng: s.lng })}
          />
        </div>

        {form.pickup_lat != null && form.dropoff_lat != null && (
          <RouteMap
            pickupLat={form.pickup_lat} pickupLng={form.pickup_lng}
            dropoffLat={form.dropoff_lat} dropoffLng={form.dropoff_lng}
          />
        )}

        <div>
          <Label>Date & time</Label>
          <Input type="datetime-local" value={form.scheduled_time}
            onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Seats available</Label>
            <Input type="number" min={1} max={8} value={form.total_seats}
              onChange={(e) => setForm({ ...form, total_seats: +e.target.value })} />
          </div>
          <div>
            <Label>Price / seat (R)</Label>
            <Input type="number" min={0} value={form.price_per_seat}
              onChange={(e) => setForm({ ...form, price_per_seat: +e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Tip: typical Vaal area short trip is R20–R40 per seat.
        </p>
        <div>
          <Label>Notes (optional)</Label>
          <Textarea placeholder="Meeting point, vehicle colour, etc." value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <Button type="submit" disabled={loading} className="w-full h-11">
          {loading ? "Creating…" : "Create ride"}
        </Button>
      </form>
    </div>
  );
}
