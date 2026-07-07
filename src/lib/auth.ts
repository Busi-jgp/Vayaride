import { supabase } from "@/integrations/supabase/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

type OAuthProvider = "google" | "apple";

type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

export type AuthResult = {
  user: User | null;
  session: Session | null;
  error: Error | null;
};

export const auth = {
  // ── OAuth ──────────────────────────────────────────────
  signInWithOAuth: async (
    provider: OAuthProvider,
    redirectTo = window.location.origin + "/auth",
    scopes?: string,
    queryParams?: Record<string, string>,
  ) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, scopes, queryParams },
    });
    if (error) return { data, error, redirected: false };
    if (data?.url) {
      window.location.assign(data.url);
      return { data, error: null, redirected: true };
    }
    return { data, error: null, redirected: false };
  },

  signInWithGoogle: async (redirectTo = window.location.origin + "/auth") => {
    return auth.signInWithOAuth("google", redirectTo, "email profile", {
      prompt: "select_account",
    });
  },

  signInWithApple: async (redirectTo = window.location.origin + "/auth") => {
    return auth.signInWithOAuth("apple", redirectTo, "name email", {
      prompt: "login",
    });
  },

  // ── Email / Password ───────────────────────────────────
  signInWithEmail: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  signUpWithEmail: async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin + "/rides",
      },
    });
    return { data, error };
  },

  // ── Phone OTP ──────────────────────────────────────────
  signInWithPhoneOtp: async (phone: string, shouldCreateUser = false) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser },
    });
    return { data, error };
  },

  verifyPhoneOtp: async (phone: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    return { data, error };
  },

  // ── Password Reset ─────────────────────────────────────
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth?reset=true",
    });
    return { data, error };
  },

  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },

  // ── Session ────────────────────────────────────────────
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getSession: async (): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.getSession();
    return { user: data.session?.user ?? null, session: data.session, error };
  },

  refreshSession: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    return { data, error };
  },

  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user ?? null, error };
  },

  // ── Listeners ──────────────────────────────────────────
  onAuthStateChange: (listener: AuthListener) => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      listener(event, session);
    });
    return subscription;
  },

  // ── Guards ─────────────────────────────────────────────
  isAuthenticated: async () => {
    const { data } = await supabase.auth.getSession();
    return !!data.session?.user;
  },

  requireAuth: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
  },

  isAdmin: async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    return data?.role === "admin";
  },

  // ── Error Handling ─────────────────────────────────────
  handleAuthError: (error: Error | null) => {
    if (!error) return null;
    return new Error(error.message ?? "Authentication failed");
  },
};