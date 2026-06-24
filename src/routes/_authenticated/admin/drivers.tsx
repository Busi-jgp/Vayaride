import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Check, X } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/drivers")({
  component: AdminDrivers,
});

function AdminDrivers() {
  const [search, setSearch] = useState("");

  const { data: profiles, isLoading, refetch } = useQuery({
    queryKey: ["admin", "drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_driver", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    let list = profiles ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        (d.full_name ?? "").toLowerCase().includes(q) ||
        (d.phone ?? "").includes(q) ||
        (d.vehicle_plate ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [profiles, search]);

  const exportCSV = () => {
    const csv = [
      ["ID", "Name", "Phone", "Vehicle", "Joined"].join(","),
      ...filtered.map((p) =>
        [p.id, p.full_name ?? "", p.phone ?? "", `${p.vehicle_make ?? ""} ${p.vehicle_model ?? ""} ${p.vehicle_plate ?? ""}`, p.created_at].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drivers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm">Driver Profiles</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Search name, phone, vehicle…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-xs w-52"
              />
              <Button variant="ghost" size="sm" onClick={exportCSV} className="h-7 gap-1.5 text-xs">
                <Download size={12} /> CSV
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} driver{filtered.length !== 1 ? "s" : ""}</p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">No drivers found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    <th className="text-left px-4 py-2 font-medium">Contact</th>
                    <th className="text-left px-4 py-2 font-medium">Vehicle</th>
                    <th className="text-left px-4 py-2 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((driver) => (
                    <tr key={driver.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {(driver.full_name ?? "?").charAt(0)}
                          </div>
                          <span className="font-medium">{driver.full_name || "Unnamed"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{driver.phone || "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {driver.vehicle_make ? `${driver.vehicle_make} ${driver.vehicle_model} · ${driver.vehicle_plate}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {new Date(driver.created_at).toLocaleDateString()}
                      </td>
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