import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [search, setSearch] = useState("");

  const { data: profiles, isLoading, refetch } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    let list = profiles ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((u) =>
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").includes(q)
      );
    }
    return list;
  }, [profiles, search]);

  const exportCSV = () => {
    const csv = [
      ["ID", "Name", "Phone", "Driver", "Joined"].join(","),
      ...filtered.map((p) =>
        [p.id, p.full_name ?? "", p.phone ?? "", p.is_driver ? "Yes" : "No", p.created_at].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm">All Users</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Search name, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-xs w-52"
              />
              <Button variant="ghost" size="sm" onClick={exportCSV} className="h-7 gap-1.5 text-xs">
                <Download size={12} /> CSV
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">No users match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    <th className="text-left px-4 py-2 font-medium">Contact</th>
                    <th className="text-left px-4 py-2 font-medium">Role</th>
                    <th className="text-left px-4 py-2 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {(user.full_name ?? "?").charAt(0)}
                          </div>
                          <span className="font-medium">{user.full_name || "Unnamed"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{user.phone || "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${user.is_driver ? "bg-primary/10 text-primary" : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"}`}>
                          {user.is_driver ? "Driver" : "Rider"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString()}
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