/**
 * Notification system abstraction.
 *
 * Currently uses an in-app polling + UI approach via Supabase.
 * Designed so that Firebase Cloud Messaging or Expo Push Notifications
 * can be added later with minimal changes — just replace the `send` function.
 */

import { supabase } from "@/integrations/supabase/client";

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read_at: string | null;
  created_at: string;
};

export type NotificationType =
  | "ride_accepted"
  | "driver_arrived"
  | "ride_started"
  | "ride_completed"
  | "payment_successful"
  | "promo_available"
  | "rating_reminder"
  | "scheduled_ride_reminder";

const NOTIFICATION_TITLES: Record<NotificationType, string> = {
  ride_accepted: "Ride Accepted",
  driver_arrived: "Driver Has Arrived",
  ride_started: "Ride Started",
  ride_completed: "Ride Completed",
  payment_successful: "Payment Successful",
  promo_available: "Promo Available",
  rating_reminder: "Rate Your Ride",
  scheduled_ride_reminder: "Upcoming Ride Reminder",
};

export const notifications = {
  // ── Send Notification ──────────────────────────────────
  send: async (
    userId: string,
    type: NotificationType,
    body: string,
    data?: Record<string, any>,
  ) => {
    const title = NOTIFICATION_TITLES[type] || type;
    const { error } = await (supabase as any)
      .from("notifications")
      .insert({ user_id: userId, title, body, data: data || null });
    return { error };
  },

  // ── Get User's Notifications ───────────────────────────
  getNotifications: async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { data: null, error };
    return { data: data as unknown as AppNotification[], error: null };
  },

  // ── Mark as Read ───────────────────────────────────────
  markAsRead: async (notificationId: string) => {
    const { error } = await (supabase as any)
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);
    return { error };
  },

  // ── Mark All as Read ───────────────────────────────────
  markAllAsRead: async (userId: string) => {
    const { error } = await (supabase as any)
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    return { error };
  },

  // ── Get Unread Count ───────────────────────────────────
  getUnreadCount: async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from("notifications")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) return { count: 0, error };
    return { count: (data as any[])?.length ?? 0, error: null };
  },

  // ── Subscribe to New Notifications (Realtime) ──────────
  subscribe: (
    userId: string,
    onNotification: (notification: AppNotification) => void,
  ) => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          onNotification(payload.new as AppNotification);
        },
      )
      .subscribe();
    return channel;
  },

  // ── Unsubscribe ────────────────────────────────────────
  unsubscribe: (channel: ReturnType<typeof supabase.channel>) => {
    supabase.removeChannel(channel);
  },
};