/**
 * Analytics tracking module.
 * Tracks key metrics for the admin dashboard and internal monitoring.
 */

import { supabase } from "@/integrations/supabase/client";

export type AnalyticsMetric = {
  label: string;
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
};

export type DailyStats = {
  date: string;
  rides: number;
  revenue: number;
  distance_km: number;
  duration_min: number;
};

export const analytics = {
  // ── Get Daily Active Users ─────────────────────────────
  getDailyActiveUsers: async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("ride_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today.toISOString());
    return count ?? 0;
  },

  // ── Get Monthly Active Users ───────────────────────────
  getMonthlyActiveUsers: async () => {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("ride_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", firstOfMonth.toISOString());
    return count ?? 0;
  },

  // ── Get Completed Rides Count ──────────────────────────
  getCompletedRides: async () => {
    const { count } = await supabase
      .from("completed_rides")
      .select("id", { count: "exact", head: true });
    return count ?? 0;
  },

  // ── Get Cancellation Rate ──────────────────────────────
  getCancellationRate: async () => {
    const { count: total } = await supabase
      .from("ride_requests")
      .select("id", { count: "exact", head: true });
    const { count: cancelled } = await supabase
      .from("ride_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "cancelled");
    if (!total) return 0;
    return Math.round((cancelled ?? 0) / total * 100);
  },

  // ── Get Total Revenue ──────────────────────────────────
  getTotalRevenue: async () => {
    const { data } = await supabase
      .from("payments")
      .select("amount")
      .eq("status", "paid");
    if (!data) return 0;
    return (data as any[]).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  },

  // ── Get Revenue for Period ─────────────────────────────
  getRevenueForPeriod: async (startDate: string, endDate: string) => {
    const { data } = await supabase
      .from("payments")
      .select("amount")
      .eq("status", "paid")
      .gte("created_at", startDate)
      .lte("created_at", endDate);
    if (!data) return 0;
    return (data as any[]).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  },

  // ── Get Daily Revenue (today) ──────────────────────────
  getDailyRevenue: async () => {
    const today = new Date().toISOString().slice(0, 10);
    return analytics.getRevenueForPeriod(`${today}T00:00:00Z`, `${today}T23:59:59Z`);
  },

  // ── Get Weekly Revenue ─────────────────────────────────
  getWeeklyRevenue: async () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return analytics.getRevenueForPeriod(weekAgo.toISOString(), new Date().toISOString());
  },

  // ── Get Monthly Revenue ────────────────────────────────
  getMonthlyRevenue: async () => {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    return analytics.getRevenueForPeriod(firstOfMonth.toISOString(), new Date().toISOString());
  },

  // ── Get Active Drivers ─────────────────────────────────
  getActiveDrivers: async () => {
    const { count } = await supabase
      .from("drivers")
      .select("id", { count: "exact", head: true })
      .eq("status", "verified");
    return count ?? 0;
  },

  // ── Get Dashboard Metrics ──────────────────────────────
  getDashboardMetrics: async (): Promise<AnalyticsMetric[]> => {
    const [dailyUsers, monthlyUsers, completedRides, cancellationRate, dailyRevenue, weeklyRevenue, monthlyRevenue, activeDrivers] =
      await Promise.all([
        analytics.getDailyActiveUsers(),
        analytics.getMonthlyActiveUsers(),
        analytics.getCompletedRides(),
        analytics.getCancellationRate(),
        analytics.getDailyRevenue(),
        analytics.getWeeklyRevenue(),
        analytics.getMonthlyRevenue(),
        analytics.getActiveDrivers(),
      ]);

    return [
      { label: "Daily Active Users", value: dailyUsers, change: 0, trend: "neutral" },
      { label: "Monthly Active Users", value: monthlyUsers, change: 0, trend: "neutral" },
      { label: "Completed Rides", value: completedRides, change: 0, trend: "neutral" },
      { label: "Cancellation Rate", value: cancellationRate, change: 0, trend: cancellationRate < 20 ? "up" : "down" },
      { label: "Daily Revenue (R)", value: dailyRevenue, change: 0, trend: "neutral" },
      { label: "Weekly Revenue (R)", value: weeklyRevenue, change: 0, trend: "neutral" },
      { label: "Monthly Revenue (R)", value: monthlyRevenue, change: 0, trend: "neutral" },
      { label: "Active Drivers", value: activeDrivers, change: 0, trend: "neutral" },
    ];
  },

  // ── Get Peak Hours ─────────────────────────────────────
  getPeakHours: async () => {
    const { data } = await supabase
      .from("ride_requests")
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

  // ── Get Average Trip Distance ──────────────────────────
  getAverageTripDistance: async () => {
    const { data } = await supabase
      .from("completed_rides")
      .select("distance_meters");
    if (!data || !data.length) return 0;
    const total = (data as any[]).reduce((sum: number, r: any) => sum + (r.distance_meters ?? 0), 0);
    return Math.round((total / data.length / 1000) * 100) / 100;
  },

  // ── Get Average Trip Duration ──────────────────────────
  getAverageTripDuration: async () => {
    const { data } = await supabase
      .from("completed_rides")
      .select("duration_seconds");
    if (!data || !data.length) return 0;
    const total = (data as any[]).reduce((sum: number, r: any) => sum + (r.duration_seconds ?? 0), 0);
    return Math.round(total / data.length / 60);
  },

  // ── Get Driver Utilization ─────────────────────────────
  getDriverUtilization: async () => {
    const { count: totalDrivers } = await supabase
      .from("drivers")
      .select("id", { count: "exact", head: true });
    const { count: activeRides } = await supabase
      .from("active_rides")
      .select("id", { count: "exact", head: true });
    if (!totalDrivers) return 0;
    return Math.round((activeRides ?? 0) / totalDrivers * 100);
  },
};