import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const { data: ridesData } = useQuery({
    queryKey: ["admin", "analytics-rides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("created_at, status, price_per_seat, available_seats, total_seats")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalCompleted = ridesData?.filter((r) => r.status === "completed").length ?? 0;
  const totalCancelled = ridesData?.filter((r) => r.status === "cancelled").length ?? 0;
  const totalActive = ridesData?.filter((r) => r.status === "active").length ?? 0;
  const totalUpcoming = ridesData?.filter((r) => r.status === "upcoming").length ?? 0;

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <h1 className="font-semibold text-sm mb-5">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Completed Rides</p>
            <p className="text-3xl font-bold text-green-600">{totalCompleted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Cancelled Rides</p>
            <p className="text-3xl font-bold text-red-600">{totalCancelled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Active Rides</p>
            <p className="text-3xl font-bold text-blue-600">{totalActive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Upcoming Rides</p>
            <p className="text-3xl font-bold text-yellow-600">{totalUpcoming}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Recent Rides (Last 100)</CardTitle>
        </CardHeader>
        <CardContent>
          {!ridesData ? (
            <Skeleton className="h-48" />
          ) : ridesData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No ride data available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-right py-2 font-medium">Seats</th>
                    <th className="text-right py-2 font-medium">Fare/seat</th>
                  </tr>
                </thead>
                <tbody>
                  {ridesData.slice(0, 20).map((ride) => (
                    <tr key={ride.created_at + ride.status} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 text-muted-foreground whitespace-nowrap">
                        {new Date(ride.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full font-medium capitalize ${
                          ride.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" :
                          ride.status === "cancelled" ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" :
                          ride.status === "active" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" :
                          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                        }`}>
                          {ride.status}
                        </span>
                      </td>
                      <td className="py-2 text-right">{ride.available_seats}/{ride.total_seats}</td>
                      <td className="py-2 text-right font-medium">R{Number(ride.price_per_seat).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}