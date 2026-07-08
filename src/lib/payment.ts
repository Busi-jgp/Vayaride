import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = "card" | "cash" | "wallet";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type TransactionType = "fare" | "commission" | "refund" | "payout";

export type PaymentRecord = {
  id: string;
  ride_id: string;
  user_id: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  transaction_ref: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedPaymentMethod = {
  id: string;
  user_id: string;
  method_type: PaymentMethod;
  label: string;
  is_default: boolean;
  last_four?: string;
  card_brand?: string;
  expiry_date?: string;
};

export type PaymentReceipt = {
  id: string;
  ride_id: string;
  receipt_number: string;
  fare_breakdown: FareBreakdown;
  paid_at: string;
};

export type FareBreakdown = {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  bookingFee: number;
  surgeMultiplier: number;
  nightMultiplier: number;
  promoDiscount: number;
  total: number;
};

export const payment = {
  // ── Process Payment ────────────────────────────────────
  processPayment: async (
    userId: string,
    rideId: string,
    amount: number,
    method: PaymentMethod,
  ) => {
    const transactionRef = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { data, error } = await (supabase as any)
      .from("payments")
      .insert({
        ride_id: rideId,
        user_id: userId,
        amount,
        status: method === "cash" ? "pending" : "paid",
        method,
        transaction_ref: transactionRef,
      })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data, error: null };
  },

  // ── Get Payment History ────────────────────────────────
  getPaymentHistory: async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return { data: null, error };
    return { data: data as unknown as PaymentRecord[], error: null };
  },

  // ── Get Single Payment ─────────────────────────────────
  getPayment: async (paymentId: string) => {
    const { data, error } = await (supabase as any)
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();
    if (error) return { data: null, error };
    return { data: data as unknown as PaymentRecord, error: null };
  },

  // ── Refund Payment ─────────────────────────────────────
  refundPayment: async (paymentId: string, userId: string) => {
    const { data, error } = await (supabase as any)
      .from("payments")
      .update({ status: "refunded" })
      .eq("id", paymentId)
      .eq("user_id", userId);
    if (error) return { error };
    return { error: null };
  },

  // ── Save Payment Method ────────────────────────────────
  savePaymentMethod: async (
    userId: string,
    methodType: PaymentMethod,
    label: string,
    lastFour?: string,
    cardBrand?: string,
  ) => {
    const { data, error } = await (supabase as any)
      .from("saved_payment_methods")
      .insert({
        user_id: userId,
        method_type: methodType,
        label,
        last_four: lastFour,
        card_brand: cardBrand,
      })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as unknown as SavedPaymentMethod, error: null };
  },

  // ── Get Saved Payment Methods ──────────────────────────
  getSavedMethods: async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from("saved_payment_methods")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false });
    if (error) return { data: null, error };
    return { data: data as unknown as SavedPaymentMethod[], error: null };
  },

  // ── Set Default Method ─────────────────────────────────
  setDefaultMethod: async (userId: string, methodId: string) => {
    // Clear existing default
    await (supabase as any)
      .from("saved_payment_methods")
      .update({ is_default: false })
      .eq("user_id", userId);
    // Set new default
    const { error } = await (supabase as any)
      .from("saved_payment_methods")
      .update({ is_default: true })
      .eq("id", methodId)
      .eq("user_id", userId);
    return { error };
  },

  // ── Delete Payment Method ──────────────────────────────
  deletePaymentMethod: async (userId: string, methodId: string) => {
    const { error } = await (supabase as any)
      .from("saved_payment_methods")
      .delete()
      .eq("id", methodId)
      .eq("user_id", userId);
    return { error };
  },

  // ── Transactions ───────────────────────────────────────
  getTransactions: async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return { data: null, error };
    return { data, error: null };
  },

  // ── Receipt Generation ─────────────────────────────────
  generateReceipt: (payment: PaymentRecord, breakdown: FareBreakdown): PaymentReceipt => ({
    id: payment.id,
    ride_id: payment.ride_id,
    receipt_number: `RCP-${payment.id.slice(0, 8)}`,
    fare_breakdown: breakdown,
    paid_at: payment.updated_at,
  }),

  // ── Payment Status Labels ──────────────────────────────
  statusLabel: (status: PaymentStatus): string => ({
    pending: "Pending",
    paid: "Paid",
    failed: "Failed",
    refunded: "Refunded",
  }[status] || status),

  // ── Available Payment Methods ──────────────────────────
  availableMethods: (): { type: PaymentMethod; label: string; icon: string }[] => [
    { type: "card", label: "Card Payment", icon: "credit-card" },
    { type: "cash", label: "Cash", icon: "banknote" },
    { type: "wallet", label: "Wallet", icon: "wallet" },
  ],
};