/**
 * Payment module — uses canonical `rides` and `refunds` tables.
 */

import { supabase } from "@/integrations/supabase/client";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type PaymentRecord = {
  id: string;
  ride_id: string;
  user_id: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
};

export type SavedPaymentMethod = {
  id: string;
  user_id: string;
  label: string;
  method_type: string;
  is_default: boolean;
};

export const payment = {
  // ── Process payment via ride_participants ─────────────
  processPayment: async (userId: string, rideId: string, amount: number, method: string) => {
    const { error } = await supabase
      .from("ride_participants")
      .update({ payment_method: method, amount_paid: amount })
      .eq("user_id", userId)
      .eq("ride_id", rideId)
      .is("cancelled_at", null);
    return { error };
  },

  // ── Get payment history from ride_participants ────────
  getPaymentHistory: async (userId: string) => {
    const { data, error } = await supabase
      .from("ride_participants")
      .select("id, ride_id, amount_paid, payment_method, joined_at, ride:rides(pickup_address, dropoff_address, status, driver_id, price_per_seat)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false });
    if (error) return { data: null, error };
    return { data, error: null };
  },

  // ── Request a refund (uses existing refunds table) ────
  requestRefund: async (rideId: string, reason: string) => {
    const { data, error } = await supabase
      .rpc("request_refund", { p_ride_id: rideId, p_reason: reason });
    return { data, error };
  },

  // ── Save a payment method preference ──────────────────
  savePaymentMethod: async (userId: string, methodType: string, label: string) => {
    return { data: { id: "local", user_id: userId, label, method_type: methodType, is_default: false }, error: null };
  },

  // ── Generate a receipt from ride data ─────────────────
  generateReceipt: (payment: any, breakdown: any) => ({
    id: payment.id,
    ride_id: payment.ride_id,
    receipt_number: `RCP-${(payment.id ?? "").toString().slice(0, 8)}`,
    fare_breakdown: breakdown,
    paid_at: payment.joined_at ?? new Date().toISOString(),
  }),

  // ── Status labels ─────────────────────────────────────
  statusLabel: (status: string): string => ({
    pending: "Pending",
    paid: "Paid",
    refunded: "Refunded",
  }[status] || status),

  availableMethods: () => [
    { type: "card", label: "Card Payment" },
    { type: "cash", label: "Cash" },
  ],
};