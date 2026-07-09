import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bell, CircleHelp, CreditCard, FileText, Globe2, Heart, History,
  LogOut, MapPin, MoonStar, Percent, ShieldCheck, Smartphone,
  Sparkles, Star, UserRound, WalletCards, Car, Phone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { useI18n, type SupportedLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { t, lang, setLang, availableLangs } = useI18n();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", emergency_contact_name: "", emergency_contact_phone: "",
    is_driver: false, vehicle_make: "", vehicle_model: "", vehicle_plate: "",
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: ratingStats } = useQuery({
    queryKey: ["rating-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("ratings").select("stars").eq("ratee_id", user!.id);
      if (!data?.length) return { average: 0, total: 0 };
      const total = data.reduce((s: number, r: any) => s + r.stars, 0);
      return { average: (total / data.length).toFixed(1), total: data.length };
    },
  });

  const { data: rideCount } = useQuery({
    queryKey: ["ride-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("ride_participants").select("id", { count: "exact", head: true }).eq("user_id", user!.id).is("cancelled_at", null);
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (profile) setForm({
      full_name: profile.full_name ?? "", phone: profile.phone ?? "",
      emergency_contact_name: profile.emergency_contact_name ?? "", emergency_contact_phone: profile.emergency_contact_phone ?? "",
      is_driver: profile.is_driver ?? false, vehicle_make: profile.vehicle_make ?? "",
      vehicle_model: profile.vehicle_model ?? "", vehicle_plate: profile.vehicle_plate ?? "",
    });
  }, [profile]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...form });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("vayaride-theme", next ? "dark" : "light");
  };

  const signOut = async () => {
    await auth.signOut();
    navigate({ to: "/" });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Profile Header */}
      <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {(form.full_name || "V")[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{form.full_name || "Rider"}</h1>
            <p className="text-sm text-white/80">{user?.email}</p>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-white/70">
              <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> {ratingStats?.average || "—"} ({ratingStats?.total || 0})</span>
              <span className="flex items-center gap-1"><Car className="h-3.5 w-3.5" /> {rideCount || 0} rides</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/saved" className="rounded-2xl border bg-card p-4 text-center hover:shadow-sm transition-shadow">
          <MapPin className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-xs font-medium">{t("saved")}</p>
        </Link>
        <button className="rounded-2xl border bg-card p-4 text-center hover:shadow-sm transition-shadow" onClick={() => navigate({ to: "/taxi-signs" } as any)}>
          <History className="h-5 w-5 mx-auto text-accent mb-1" />
          <p className="text-xs font-medium">History</p>
        </button>
        <button className="rounded-2xl border bg-card p-4 text-center hover:shadow-sm transition-shadow">
          <CreditCard className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
          <p className="text-xs font-medium">Payments</p>
        </button>
      </div>

      {/* Personal Info Form */}
      <form onSubmit={saveProfile} className="rounded-3xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Personal Details</h2>
        <div>
          <Label>Full name</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="h-11 rounded-xl mt-1" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+27..." className="h-11 rounded-xl mt-1" />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
          <div><p className="font-medium text-sm">Offer rides</p><p className="text-xs text-muted-foreground">Become a driver</p></div>
          <Switch checked={form.is_driver} onCheckedChange={(v) => setForm({ ...form, is_driver: v })} />
        </div>
        {form.is_driver && (
          <div className="space-y-3 p-3 rounded-xl bg-muted/30">
            <Input placeholder="Vehicle make" value={form.vehicle_make} onChange={(e) => setForm({ ...form, vehicle_make: e.target.value })} className="h-11 rounded-xl" />
            <Input placeholder="Model" value={form.vehicle_model} onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })} className="h-11 rounded-xl" />
            <Input placeholder="Plate number" value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} className="h-11 rounded-xl" />
          </div>
        )}
        <Button type="submit" disabled={saving} className="w-full h-11 rounded-xl">{saving ? "Saving..." : "Save"}</Button>
      </form>

      {/* Emergency Contact */}
      <div className="rounded-3xl border bg-card p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Heart className="h-4 w-4 text-rose-500" /> Emergency Contact</h2>
        <Input placeholder="Name" value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} className="h-11 rounded-xl" />
        <Input placeholder="Phone" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} className="h-11 rounded-xl" />
      </div>

      {/* Preferences */}
      <div className="rounded-3xl border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Preferences</h2>
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
          <span className="flex items-center gap-2 text-sm"><MoonStar className="h-4 w-4" /> Dark mode</span>
          <Switch checked={darkMode} onCheckedChange={toggleDark} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
          <span className="flex items-center gap-2 text-sm"><Globe2 className="h-4 w-4" /> Language</span>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as SupportedLang)}
            className="text-sm bg-transparent border-none outline-none text-right"
          >
            {availableLangs.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Support */}
      <div className="rounded-3xl border bg-card p-5 space-y-2">
        <h2 className="font-semibold mb-2">Support</h2>
        {[
          { icon: CircleHelp, label: "Help Centre" },
          { icon: FileText, label: "Terms & Conditions" },
          { icon: ShieldCheck, label: "Privacy Policy" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 cursor-pointer transition-colors">
            <item.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Sign Out */}
      <Button variant="outline" onClick={signOut} className="w-full h-12 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50">
        <LogOut className="mr-2 h-4 w-4" /> Sign Out
      </Button>
    </div>
  );
}