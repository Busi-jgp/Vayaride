import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users, Car, Activity, DollarSign, AlertTriangle, ClipboardCheck,
  TrendingUp, TrendingDown, UserCheck, Hand, MapPin, Percent, Clock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function StatCard({ label, value, icon: Icon, sub, trend }: {
  label: string; value: string | number; icon: React.ElementType; sub?: string; trend?: "up" | "down" | "neutral"
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon size={16} className="text-primary" />
            </div>
            {trend === "up" && <TrendingUp size={12} className="text-green-500" />}
            {trend === "down" && <TrendingDown size={12} className="text-red-500" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["admin", "dashboard-metrics"],
    queryFn: async () => {
      const [
        completedRides, totalUsers, activeRides, driversCount,
        dailyRev, weeklyRev, monthlyRev, cancelRate,
        avgDistance, pendingRefunds, promoCount,
      ] = await Promise.all([
        analytics.getCompletedRides(),
        supabase.from("profiles").select("id", { count: "exact", head: true }).then(r => r.count ?? 0),
        supabase.from("rides").select("id", { count: "exact", head: true }).eq("status", "active").then(r => r.count ?? 0),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_driver", true).then(r => r.count ?? 0),
        analytics.getDailyRevenue(),
        analytics.getWeeklyRevenue(),
        analytics.getMonthlyRevenue(),
        analytics.getCancellationRate(),
        analytics.getAverageTripDistance(),
        supabase.from("refunds").select("id", { count: "exact", head: true }).eq("status", "pending").then(r => r.count ?? 0),
        (supabase as any).from("promo_codes").select("id", { count: "exact", head: true }).then((r: any) => r.count ?? 0),
      ]);

      return {
        completedRides, totalUsers, activeRides, driversCount,
        dailyRev, weeklyRev, monthlyRev, cancelRate,
        avgDistance, pendingRefunds, promoCount,
      };
    },
  });

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-lg">Dashboard</h1>
        <Badge variant="outline" className="text-xs">Live</Badge>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Completed Rides" value={metrics!.completedRides.toLocaleString()} icon={Activity} trend="up" />
            <StatCard label="Active Rides" value={metrics!.activeRides} icon={Car} trend="up" />
            <StatCard label="Total Users" value={metrics!.totalUsers.toLocaleString()} icon={Users} trend="up" sub="Registered riders" />
            <StatCard label="Drivers" value={metrics!.driversCount} icon={UserCheck} trend={metrics!.driversCount > 0 ? "up" : "neutral"} />
            <StatCard label="Daily Revenue" value={`R${metrics!.dailyRev.toFixed(2)}`} icon={DollarSign} trend={metrics!.dailyRev > 0 ? "up" : "neutral"} />
            <StatCard label="Weekly Revenue" value={`R${metrics!.weeklyRev.toFixed(2)}`} icon={DollarSign} trend={metrics!.weeklyRev > 0 ? "up" : "neutral"} />
            <StatCard label="Monthly Revenue" value={`R${metrics!.monthlyRev.toFixed(2)}`} icon={DollarSign} trend={metrics!.monthlyRev > 0 ? "up" : "neutral"} />
            <StatCard label="Cancel Rate" value={`${metrics!.cancelRate}%`} icon={Percent} trend={metrics!.cancelRate < 20 ? "up" : "down"} />
          </>
        )}
      </div>

      {/* Badge Row */}
      {metrics && (
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1"><MapPin className="h-3 w-3" /> Avg {metrics.avgDistance} km</Badge>
          <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" /> {metrics.pendingRefunds} pending refunds</Badge>
          <Badge variant="secondary" className="gap-1"><Hand className="h-3 w-3" /> {metrics.promoCount} promos</Badge>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/admin/users" className="rounded-2xl border bg-card p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <div><p className="font-medium text-sm">Manage Users</p><p className="text-xs text-muted-foreground">View and suspend users</p></div>
          </div>
        </Link>
        <Link to="/admin/drivers" className="rounded-2xl border bg-card p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/10"><Car className="h-5 w-5 text-accent" /></div>
            <div><p className="font-medium text-sm">Drivers</p><p className="text-xs text-muted-foreground">Verify and manage drivers</p></div>
          </div>
        </Link>
        <Link to="/admin/taxi-signs" className="rounded-2xl border bg-card p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100"><Hand className="h-5 w-5 text-emerald-700" /></div>
            <div><p className="font-medium text-sm">Taxi Signs</p><p className="text-xs text-muted-foreground">Moderate submissions</p></div>
          </div>
        </Link>
        <Link to="/admin/refunds" className="rounded-2xl border bg-card p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100"><AlertTriangle className="h-5 w-5 text-rose-600" /></div>
            <div><p className="font-medium text-sm">Refunds</p><p className="text-xs text-muted-foreground">{metrics?.pendingRefunds ?? 0} pending</p></div>
          </div>
        </Link>
        <Link to="/admin/rides" className="rounded-2xl border bg-card p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100"><Activity className="h-5 w-5 text-blue-600" /></div>
            <div><p className="font-medium text-sm">Rides</p><p className="text-xs text-muted-foreground">Browse ride history</p></div>
          </div>
        </Link>
        <Link to="/admin/analytics" className="rounded-2xl border bg-card p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100"><ClipboardCheck className="h-5 w-5 text-purple-600" /></div>
            <div><p className="font-medium text-sm">Analytics</p><p className="text-xs text-muted-foreground">Detailed reports</p></div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {metrics?.activeRides ?? 0} active rides · {metrics?.completedRides ?? 0} total completed · {metrics?.totalUsers ?? 0} users
          </p>
        </CardContent>
      </Card>
    </div>
  );
}