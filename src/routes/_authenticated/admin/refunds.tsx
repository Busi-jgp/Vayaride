import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/refunds")({
  component: AdminRefunds,
});

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

function AdminRefunds() {
  const [statusFilter, setStatusFilter] = useState("all");
  const qc = useQueryClient();

  const { data: refunds, isLoading, refetch } = useQuery({
    queryKey: ["admin", "refunds", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("refunds")
        .select("*, rides(pickup_address, dropoff_address, scheduled_time)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter as any);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateRefund = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("refunds").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Refund ${status}`);
    qc.invalidateQueries({ queryKey: ["admin", "refunds"] });
  };

  const pending = (refunds ?? []).filter((r) => r.status === "pending").length;

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-semibold">{refunds?.length ?? 0} refund request{(refunds?.length ?? 0) !== 1 ? "s" : ""}</p>
          {pending > 0 && <p className="text-xs text-amber-600 dark:text-amber-400">{pending} pending review</p>}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (refunds ?? []).length === 0 ? (
        <div className="py-24 text-center text-muted-foreground text-sm">No refund requests match your filters.</div>
      ) : (
        <div className="space-y-3">
          {(refunds ?? []).map((refund: any) => {
            const status = STATUS_BADGE[refund.status] ?? { label: refund.status, className: "bg-muted text-muted-foreground" };
            return (
              <Card key={refund.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">R{Number(refund.amount).toFixed(0)} refund</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>{status.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-0.5">{refund.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {refund.rides?.pickup_address} → {refund.rides?.dropoff_address}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(refund.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {refund.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline"
                          className="h-8 gap-1.5 text-xs border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30"
                          onClick={() => updateRefund(refund.id, "approved")}>
                          <Check size={12} /> Approve
                        </Button>
                        <Button size="sm" variant="outline"
                          className="h-8 gap-1.5 text-xs border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                          onClick={() => updateRefund(refund.id, "rejected")}>
                          <X size={12} /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}