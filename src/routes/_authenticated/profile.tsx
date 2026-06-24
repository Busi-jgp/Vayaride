import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    is_driver: false,
    vehicle_make: "",
    vehicle_model: "",
    vehicle_plate: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        emergency_contact_name: profile.emergency_contact_name ?? "",
        emergency_contact_phone: profile.emergency_contact_phone ?? "",
        is_driver: profile.is_driver ?? false,
        vehicle_make: profile.vehicle_make ?? "",
        vehicle_model: profile.vehicle_model ?? "",
        vehicle_plate: profile.vehicle_plate ?? "",
      });
    }
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...form });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="px-4 pt-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Your profile</h1>
      <p className="text-sm text-muted-foreground">{user?.email ?? user?.phone}</p>

      <form onSubmit={save} className="mt-5 space-y-4">
        <div>
          <Label>Full name</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+27..." />
        </div>

        <div className="rounded-2xl border p-4 space-y-3 bg-card">
          <h3 className="font-semibold text-sm">Emergency contact</h3>
          <Input placeholder="Name" value={form.emergency_contact_name}
            onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
          <Input placeholder="Phone" value={form.emergency_contact_phone}
            onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
        </div>

        <div className="rounded-2xl border p-4 space-y-3 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">I want to offer rides</h3>
              <p className="text-xs text-muted-foreground">Enable to become a driver</p>
            </div>
            <Switch checked={form.is_driver} onCheckedChange={(v) => setForm({ ...form, is_driver: v })} />
          </div>
          {form.is_driver && (
            <div className="space-y-2 pt-2">
              <Input placeholder="Vehicle make" value={form.vehicle_make}
                onChange={(e) => setForm({ ...form, vehicle_make: e.target.value })} />
              <Input placeholder="Vehicle model" value={form.vehicle_model}
                onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })} />
              <Input placeholder="Number plate" value={form.vehicle_plate}
                onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} />
            </div>
          )}
        </div>

        <Button type="submit" disabled={saving} className="w-full h-11">{saving ? "Saving…" : "Save profile"}</Button>
        <Button type="button" variant="outline" onClick={signOut} className="w-full">Sign out</Button>
      </form>
    </div>
  );
}
