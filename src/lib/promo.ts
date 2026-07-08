import { supabase } from "@/integrations/supabase/client";

export type PromoCode = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_fare: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  first_ride_only: boolean;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export const promo = {
  // ── Validate Promo Code ────────────────────────────────
  validate: async (code: string, userId: string, isFirstRide: boolean) => {
    const { data, error } = await (supabase as any)
      .from("promo_codes")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .single();
    if (error || !data) return { valid: false, reason: "Invalid or expired promo code", discount: 0 };
    const promo = data as PromoCode;
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return { valid: false, reason: "This promo code has expired", discount: 0 };
    }
    if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
      return { valid: false, reason: "This promo code has reached its usage limit", discount: 0 };
    }
    if (promo.first_ride_only && !isFirstRide) {
      return { valid: false, reason: "This promo is for first-time riders only", discount: 0 };
    }
    return { valid: true, reason: null, discount: promo };
  },

  // ── Calculate Discount ─────────────────────────────────
  calculateDiscount: (promo: PromoCode, fare: number): number => {
    if (promo.min_fare && fare < promo.min_fare) return 0;
    const discount = promo.type === "percentage" ? fare * (promo.value / 100) : promo.value;
    return promo.max_discount ? Math.min(discount, promo.max_discount) : discount;
  },

  // ── Apply Promo (increment usage) ──────────────────────
  apply: async (code: string) => {
    const { error } = await (supabase as any)
      .rpc("increment_promo_usage", { promo_code: code });
    return { error };
  },
};

export const PROMO_MESSAGES = {
  firstRide: (discount: string) => `🎉 First ride! You save ${discount}`,
  applied: (discount: string) => `Promo applied: ${discount} off`,
  expired: "Promo code has expired",
  invalid: "Invalid promo code",
  minFare: (min: number) => `Minimum fare of R${min.toFixed(2)} required`,
};