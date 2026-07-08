import { supabase } from "@/integrations/supabase/client";

export type Rating = {
  id: string;
  ride_id: string;
  rater_id: string;
  ratee_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
};

export type RatingStats = {
  average: number;
  total: number;
  distribution: Record<number, number>;
};

export const ratings = {
  // ── Submit Rating ──────────────────────────────────────
  submitRating: async (
    rideId: string,
    raterId: string,
    rateeId: string,
    stars: number,
    comment?: string,
  ) => {
    if (stars < 1 || stars > 5) return { data: null, error: new Error("Stars must be between 1 and 5") };
    const { data, error } = await (supabase as any)
      .from("ratings")
      .insert({
        ride_id: rideId,
        rater_id: raterId,
        ratee_id: rateeId,
        stars,
        comment: comment || null,
      })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as unknown as Rating, error: null };
  },

  // ── Get Ratings for a User (as ratee) ──────────────────
  getUserRatings: async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from("ratings")
      .select("*")
      .eq("ratee_id", userId)
      .order("created_at", { ascending: false });
    if (error) return { data: null, error };
    return { data: data as unknown as Rating[], error: null };
  },

  // ── Get Rating Stats ───────────────────────────────────
  getRatingStats: async (userId: string): Promise<{ data: RatingStats | null; error: any }> => {
    const { data, error } = await (supabase as any)
      .from("ratings")
      .select("stars")
      .eq("ratee_id", userId);
    if (error) return { data: null, error };
    const ratings = (data as { stars: number }[]) || [];
    if (!ratings.length) {
      return {
        data: { average: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
        error: null,
      };
    }
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      if (r.stars >= 1 && r.stars <= 5) distribution[r.stars]++;
    });
    const total = ratings.length;
    const average = Math.round((ratings.reduce((sum, r) => sum + r.stars, 0) / total) * 10) / 10;
    return { data: { average, total, distribution }, error: null };
  },

  // ── Check If User Already Rated a Ride ─────────────────
  hasRated: async (rideId: string, userId: string) => {
    const { data } = await (supabase as any)
      .from("ratings")
      .select("id")
      .eq("ride_id", rideId)
      .eq("rater_id", userId)
      .maybeSingle();
    return !!data;
  },
};