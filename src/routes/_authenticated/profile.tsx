import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, CircleHelp, FileText, Globe2, Lock, LogOut, MoonStar, ShieldCheck, Sparkles, UserRound, WalletCards } from "lucide-react";
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
    <div className="mx-auto max-w-5xl px-4 py-4">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-linear-to-r from-emerald-600 to-emerald-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-100">Your profile</p>
              <h1 className="text-2xl font-semibold">{form.full_name || "VayaRide rider"}</h1>
              <p className="text-sm text-emerald-100">{user?.email ?? user?.phone}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-4 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={save} className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-700" />
                <h2 className="font-semibold text-slate-900">Personal details</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Full name</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+27..." />
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <h2 className="mb-3 font-semibold text-slate-900">Emergency contact</h2>
              <div className="space-y-3">
                <Input placeholder="Name" value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
                <Input placeholder="Phone" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Offer rides</h3>
                  <p className="text-xs text-muted-foreground">Turn this on to become a driver</p>
                </div>
                <Switch checked={form.is_driver} onCheckedChange={(v) => setForm({ ...form, is_driver: v })} />
              </div>
              {form.is_driver && (
                <div className="mt-3 space-y-2">
                  <Input placeholder="Vehicle make" value={form.vehicle_make} onChange={(e) => setForm({ ...form, vehicle_make: e.target.value })} />
                  <Input placeholder="Vehicle model" value={form.vehicle_model} onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })} />
                  <Input placeholder="Number plate" value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} />
                </div>
              )}
            </div>

            <Button type="submit" disabled={saving} className="w-full h-11 rounded-full bg-emerald-600 hover:bg-emerald-700">{saving ? "Saving…" : "Save profile"}</Button>
          </form>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 font-semibold text-slate-900">Preferences</h2>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-3"><span className="flex items-center gap-2"><Globe2 className="h-4 w-4" />Language</span><span>English</span></div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-3"><span className="flex items-center gap-2"><MoonStar className="h-4 w-4" />Theme</span><span>System</span></div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-3"><span className="flex items-center gap-2"><Bell className="h-4 w-4" />Alerts</span><span>On</span></div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 font-semibold text-slate-900">Support</h2>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-100 p-3"><CircleHelp className="h-4 w-4 text-emerald-700" />Help Centre</div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-100 p-3"><FileText className="h-4 w-4 text-emerald-700" />Terms & Conditions</div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-100 p-3"><ShieldCheck className="h-4 w-4 text-emerald-700" />Privacy Policy</div>
              </div>
            </div>

            <Button type="button" variant="outline" onClick={signOut} className="w-full rounded-full border-rose-200 text-rose-600 hover:bg-rose-50">
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
