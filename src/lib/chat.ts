import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ChatMessage = {
  id: string;
  ride_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

export type ChatConversation = {
  ride_id: string;
  sender_id: string;
  receiver_id: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

export const chat = {
  // ── Send Message ───────────────────────────────────────
  sendMessage: async (
    rideId: string,
    senderId: string,
    receiverId: string,
    content: string,
  ) => {
    const { data, error } = await (supabase as any)
      .from("ride_messages")
      .insert({
        ride_id: rideId,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
      })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as unknown as ChatMessage, error: null };
  },

  // ── Get Messages for a Ride ────────────────────────────
  getMessages: async (rideId: string) => {
    const { data, error } = await (supabase as any)
      .from("ride_messages")
      .select("*")
      .eq("ride_id", rideId)
      .order("created_at", { ascending: true });
    if (error) return { data: null, error };
    return { data: data as unknown as ChatMessage[], error: null };
  },

  // ── Mark Messages as Read ──────────────────────────────
  markAsRead: async (rideId: string, userId: string) => {
    const { error } = await (supabase as any)
      .from("ride_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("ride_id", rideId)
      .eq("receiver_id", userId)
      .is("read_at", null);
    return { error };
  },

  // ── Get Unread Count ───────────────────────────────────
  getUnreadCount: async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from("ride_messages")
      .select("id", { count: "exact" })
      .eq("receiver_id", userId)
      .is("read_at", null);
    if (error) return { count: 0, error };
    return { count: data?.length ?? 0, error: null };
  },

  // ── Subscribe to New Messages (Realtime) ───────────────
  subscribeToMessages: (
    rideId: string,
    userId: string,
    onMessage: (message: ChatMessage) => void,
  ): RealtimeChannel => {
    return supabase
      .channel(`chat:${rideId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ride_messages",
          filter: `ride_id=eq.${rideId}`,
        },
        (payload: any) => {
          const msg = payload.new as ChatMessage;
          if (msg.sender_id !== userId) {
            onMessage(msg);
          }
        },
      )
      .subscribe();
  },

  // ── Unsubscribe ────────────────────────────────────────
  unsubscribe: (channel: RealtimeChannel) => {
    supabase.removeChannel(channel);
  },
};