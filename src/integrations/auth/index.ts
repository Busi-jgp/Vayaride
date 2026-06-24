// Custom OAuth integration using Supabase directly.

import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
  scopes?: string;
};

export const auth = {
  signInWithOAuth: async (provider: "google" | "apple", opts?: SignInOptions) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: opts?.redirect_uri ?? window.location.origin + "/auth",
        scopes: opts?.scopes,
        queryParams: opts?.extraParams,
      },
    });

    if (error) return { error };
    if (data.url) {
      window.location.assign(data.url);
    }
    return { redirected: !!data.url, error: null };
  },
};
