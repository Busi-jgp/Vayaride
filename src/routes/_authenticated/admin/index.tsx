import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Car, Activity, DollarSign, AlertTriangle, ClipboardCheck, TrendingUp, TrendingDown } from "lucide-react";

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
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
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
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: async () => {
      const [ridesCount, usersCount, refundsCount] = await Promise.all([
        supabase.from("rides").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("refunds").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      return {
        totalUsers: usersCount.count ?? 0,
        totalDrivers: 0,
        activeDrivers: 0,
        ridesToday: 0,
        ridesTotal: ridesCount.count ?? 0,
        revenueToday: 0,
        revenueTotal: 0,
        pendingRefunds: refundsCount.count ?? 0,
        pendingVerifications: 0,
        cancellationRate: 0,
        avgRating: 0,
        groupRidePct: 0,
      };
    },
  });

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <h1 className="font-semibold text-sm mb-5">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Total Users" value={stats!.totalUsers.toLocaleString()} icon={Users} trend="up" sub="Registered riders" />
            <StatCard label="Total Drivers" value={stats!.totalDrivers} icon={Car} trend="up" sub="Registered drivers" />
            <StatCard label="Total Rides" value={stats!.ridesTotal.toLocaleString()} icon={Activity} trend="up" />
            <StatCard label="Revenue" value="—" icon={DollarSign} sub="Coming soon" />
            <StatCard label="Pending Refunds" value={stats!.pendingRefunds} icon={AlertTriangle} trend={stats!.pendingRefunds > 0 ? "down" : "neutral"} sub="Awaiting review" />
            <StatCard label="Pending Verifs" value={stats!.pendingVerifications} icon={ClipboardCheck} trend="neutral" sub="Driver verifications" />
          </>
        )}
      </div>

      {/* Badges */}
      {stats && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <Badge variant="secondary">Cancel rate: —</Badge>
          <Badge variant="secondary">Avg rating: — ★</Badge>
          <Badge variant="secondary">Group ride share: —</Badge>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Data will be populated as rides are completed.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Charts and analytics coming soon with real-time data.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}