import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Users, Clock } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/admin/rides")({
  component: AdminRides,
});

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  active: { label: "Active", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  upcoming: { label: "Upcoming", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
};

function AdminRides() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: rides, isLoading, refetch } = useQuery({
    queryKey: ["admin", "rides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    let list = rides ?? [];
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.pickup_address.toLowerCase().includes(q) ||
        r.dropoff_address.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rides, statusFilter, search]);

  const exportCSV = () => {
    const csv = [
      ["ID", "Pickup", "Dropoff", "Status", "Date"].join(","),
      ...filtered.map((r) =>
        [r.id, r.pickup_address, r.dropoff_address, r.status, r.created_at].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rides.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm">All Rides</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Search route, driver…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-xs w-44"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 text-xs w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={exportCSV} className="h-7 gap-1.5 text-xs">
                <Download size={12} /> CSV
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} ride{filtered.length !== 1 ? "s" : ""}</p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">No rides match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">Driver</th>
                    <th className="text-left px-4 py-2 font-medium">Route</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-right px-4 py-2 font-medium">Seats</th>
                    <th className="text-right px-4 py-2 font-medium">Fare</th>
                    <th className="text-left px-4 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ride) => {
                    const status = STATUS_BADGE[ride.status] ?? { label: ride.status, className: "bg-muted text-muted-foreground" };
                    return (
                      <tr key={ride.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-muted-foreground font-mono text-xs">{ride.driver_id.substring(0, 8)}…</span>
                        </td>
                        <td className="px-4 py-2.5 max-w-[200px] truncate text-muted-foreground">
                          {ride.pickup_address} → {ride.dropoff_address}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full font-medium ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="flex items-center justify-end gap-1">
                            <Users size={10} className="text-muted-foreground" />
                            {ride.available_seats}/{ride.total_seats}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium">
                          R{Number(ride.price_per_seat).toFixed(0)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          <Clock size={10} className="inline mr-1" />
                          {new Date(ride.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}