/**
 * Analytics tracking module — uses the canonical `rides` table.
 */

import { supabase } from "@/integrations/supabase/client";

export type AnalyticsMetric = {
  label: string;
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
};

export const analytics = {
  // ── Daily Active Rides (created today) ────────────────
  getDailyActiveRides: async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("rides")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today.toISOString());
    return count ?? 0;
  },

  // ── Monthly Active Rides ──────────────────────────────
  getMonthlyActiveRides: async () => {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("rides")
      .select("id", { count: "exact", head: true })
      .gte("created_at", firstOfMonth.toISOString());
    return count ?? 0;
  },

  // ── Completed Rides ──────────────────────────────────
  getCompletedRides: async () => {
    const { count } = await supabase
      .from("rides")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed");
    return count ?? 0;
  },

  // ── Cancellation Rate ────────────────────────────────
  getCancellationRate: async () => {
    const { count: total } = await supabase
      .from("rides")
      .select("id", { count: "exact", head: true });
    const { count: cancelled } = await supabase
      .from("rides")
      .select("id", { count: "exact", head: true })
      .eq("status", "cancelled");
    if (!total) return 0;
    return Math.round((cancelled ?? 0) / total * 100);
  },

  // ── Total Revenue (sum of price_per_seat for completed rides) ─
  getTotalRevenue: async () => {
    const { data } = await supabase
      .from("rides")
      .select("price_per_seat, available_seats, total_seats")
      .eq("status", "completed");
    if (!data) return 0;
    return (data as any[]).reduce((sum: number, r: any) => {
      const seatsTaken = (r.total_seats ?? 0) - (r.available_seats ?? 0);
      return sum + (r.price_per_seat ?? 0) * Math.max(seatsTaken, 1);
    }, 0);
  },

  // ── Revenue for Period ────────────────────────────────
  getRevenueForPeriod: async (startDate: string, endDate: string) => {
    const { data } = await supabase
      .from("rides")
      .select("price_per_seat, available_seats, total_seats")
      .eq("status", "completed")
      .gte("created_at", startDate)
      .lte("created_at", endDate);
    if (!data) return 0;
    return (data as any[]).reduce((sum: number, r: any) => {
      const seatsTaken = (r.total_seats ?? 0) - (r.available_seats ?? 0);
      return sum + (r.price_per_seat ?? 0) * Math.max(seatsTaken, 1);
    }, 0);
  },

  getDailyRevenue: async () => {
    const today = new Date().toISOString().slice(0, 10);
    return analytics.getRevenueForPeriod(`${today}T00:00:00Z`, `${today}T23:59:59Z`);
  },

  getWeeklyRevenue: async () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return analytics.getRevenueForPeriod(weekAgo.toISOString(), new Date().toISOString());
  },

  getMonthlyRevenue: async () => {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    return analytics.getRevenueForPeriod(firstOfMonth.toISOString(), new Date().toISOString());
  },

  // ── Active Rides (currently active) ───────────────────
  getActiveRideCount: async () => {
    const { count } = await supabase
      .from("rides")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    return count ?? 0;
  },

  // ── Get Dashboard Metrics ────────────────────────────
  getDashboardMetrics: async (): Promise<AnalyticsMetric[]> => {
    const [daily, monthly, completed, cancelled, dailyRev, weeklyRev, monthlyRev, active] =
      await Promise.all([
        analytics.getDailyActiveRides(),
        analytics.getMonthlyActiveRides(),
        analytics.getCompletedRides(),
        analytics.getCancellationRate(),
        analytics.getDailyRevenue(),
        analytics.getWeeklyRevenue(),
        analytics.getMonthlyRevenue(),
        analytics.getActiveRideCount(),
      ]);

    return [
      { label: "Daily Rides", value: daily, change: 0, trend: "neutral" },
      { label: "Monthly Rides", value: monthly, change: 0, trend: "neutral" },
      { label: "Completed Rides", value: completed, change: 0, trend: "neutral" },
      { label: "Cancellation Rate (%)", value: cancelled, change: 0, trend: cancelled < 20 ? "up" : "down" },
      { label: "Daily Revenue (R)", value: dailyRev, change: 0, trend: "neutral" },
      { label: "Weekly Revenue (R)", value: weeklyRev, change: 0, trend: "neutral" },
      { label: "Monthly Revenue (R)", value: monthlyRev, change: 0, trend: "neutral" },
      { label: "Active Rides", value: active, change: 0, trend: "neutral" },
    ];
  },

  // ── Average Trip Distance ────────────────────────────
  getAverageTripDistance: async () => {
    const { data } = await supabase
      .from("rides")
      .select("distance_km")
      .eq("status", "completed");
    if (!data || !data.length) return 0;
    const total = (data as any[]).reduce((sum: number, r: any) => sum + (r.distance_km ?? 0), 0);
    return Math.round((total / data.length) * 100) / 100;
  },

  // ── Average Trip Duration ────────────────────────────
  getAverageTripDuration: async () => {
    const { data } = await supabase
      .from("rides")
      .select("duration_min")
      .eq("status", "completed");
    if (!data || !data.length) return 0;
    const total = (data as any[]).reduce((sum: number, r: any) => sum + (r.duration_min ?? 0), 0);
    return Math.round(total / data.length);
  },

  // ── Peak Hours ───────────────────────────────────────
  getPeakHours: async () => {
    const { data } = await supabase
      .from("rides")
      .select("created_at");
    if (!data) return [];
    const hours: Record<number, number> = {};
    (data as any[]).forEach((r: any) => {
      const hour = new Date(r.created_at).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    });
    return Object.entries(hours)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count);
  },
};