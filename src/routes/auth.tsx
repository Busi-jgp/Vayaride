import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { auth } from "@/integrations/auth/index";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type AuthMode = "signin" | "signup";
type EmailStep = "email" | "details";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/rides" });
  },
  component: AuthPage,
});

function normalizePhoneNumber(value: string) {
  const compact = value.replace(/[\s().-]/g, "");
  if (!compact.startsWith("+")) return compact;
  return `+${compact.slice(1).replace(/\+/g, "")}`;
}

function isValidInternationalPhone(value: string) {
  return /^\+\d{8,15}$/.test(value);
}

function isMissingPhoneAccountError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("not found") ||
    lower.includes("no user") ||
    lower.includes("user not") ||
    lower.includes("signup") ||
    lower.includes("signups")
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [emailStep, setEmailStep] = useState<EmailStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle OAuth callback: after the auth page loads client-side,
  // Supabase may have just processed the OAuth tokens from the URL hash.
  // If a session is now available, redirect to /rides.
  useEffect(() => {
    // Show OAuth errors from the URL immediately (before session check)
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      toast.error(decodeURIComponent(oauthError.replace(/\+/g, " ")));
      // Clean up the URL so the error doesn't persist on refresh
      window.history.replaceState({}, "", window.location.pathname);
    }

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/rides" });
      }
    };
    // The OAuth flow lands on /auth (the redirectTo target). The Supabase
    // client on the client side picks up the access_token from the URL hash
    // and stores it. We give it a tick to settle, then check for a session.
    const timer = setTimeout(checkSession, 500);
    return () => clearTimeout(timer);
  }, [navigate]);

  // Log the Supabase project URL for debugging OAuth
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    if (supabaseUrl) {
      console.debug("[Auth] Supabase URL:", supabaseUrl);
      console.debug("[Auth] Google OAuth callback should be registered as:", supabaseUrl + "/auth/v1/callback");
    }
  }, []);

  const selectedEmail = email.trim();

  const selectMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setEmailStep("email");
    setPassword("");
    setOtp("");
    setOtpSent(false);
  };

  const continueEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail) {
      toast.error("Enter your email address first.");
      return;
    }
    setEmail(selectedEmail);
    setEmailStep("details");
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: selectedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/rides`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: selectedEmail,
          password,
        });
        if (error) throw error;
        navigate({ to: "/rides" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    const phoneNumber = normalizePhoneNumber(phone);
    if (!isValidInternationalPhone(phoneNumber)) {
      toast.error("Enter a valid phone number with country code, e.g. +27712345678.");
      return;
    }

    setPhone(phoneNumber);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
      options: { shouldCreateUser: mode === "signup" },
    });
    setLoading(false);

    if (error) {
      if (mode === "signin" && isMissingPhoneAccountError(error.message)) {
        toast.error("No account exists for this phone number. Switch to Sign up to create one.");
        return;
      }
      toast.error(error.message);
      return;
    }

    setOtpSent(true);
    toast.success(
      mode === "signin" ? "Phone number found. Code sent via SMS." : "Code sent via SMS.",
    );
  };

  const verifyOtp = async () => {
    const phoneNumber = normalizePhoneNumber(phone);
    if (!otp.trim()) {
      toast.error("Enter the SMS code.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: otp.trim(),
      type: "sms",
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/rides" });
  };

  const oauth = async (provider: "google" | "apple") => {
    setLoading(true);
    const res = await auth.signInWithOAuth(provider, {
      // Redirect to /auth so the server-side _authenticated guard doesn't
      // intercept the OAuth callback and strip the URL hash tokens.
      redirect_uri: window.location.origin + "/auth",
      scopes: provider === "apple" ? "name email" : "email profile",
      extraParams:
        provider === "google" ? { prompt: "select_account" } : { prompt: "login" },
    });

    if (res.error) {
      setLoading(false);
      toast.error(res.error.message ?? "Sign-in failed");
      return;
    }
    if (!res.redirected) {
      setLoading(false);
      navigate({ to: "/rides" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary">VayaRide</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome — let's get you a ride.</p>
        </div>

        <div className="rounded-2xl bg-card border p-5 shadow-sm">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => selectMode("signin")}
              aria-pressed={mode === "signin"}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                mode === "signin" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => selectMode("signup")}
              aria-pressed={mode === "signup"}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                mode === "signup" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              Sign up
            </button>
          </div>

          <Tabs defaultValue="email">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="mt-4">
              {emailStep === "email" ? (
                <form onSubmit={continueEmail} className="space-y-3">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-11">
                    Continue
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleEmail} className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Email address</p>
                      <p className="truncate text-sm font-medium">{selectedEmail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailStep("email");
                        setPassword("");
                      }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  {mode === "signup" && (
                    <div>
                      <Label>Full name</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-11">
                    {mode === "signup" ? "Create account" : "Sign in"}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="phone" className="mt-4 space-y-3">
              <div>
                <Label>Phone (with country code)</Label>
                <Input
                  placeholder="+27 71 234 5678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setOtp("");
                    setOtpSent(false);
                  }}
                  disabled={otpSent}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {mode === "signin"
                    ? "We will only send a code if this number already exists."
                    : "We will send a code to create or confirm this phone login."}
                </p>
              </div>
              {!otpSent ? (
                <Button onClick={sendOtp} disabled={loading} className="w-full h-11">
                  {mode === "signin" ? "Verify phone" : "Continue with phone"}
                </Button>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Phone number</p>
                      <p className="truncate text-sm font-medium">{phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtp("");
                        setOtpSent(false);
                      }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <div>
                    <Label>6-digit code</Label>
                    <Input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" />
                  </div>
                  <Button onClick={verifyOtp} disabled={loading} className="w-full h-11">
                    Verify
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 justify-center gap-3 rounded-md border-neutral-900 bg-neutral-950 font-semibold text-white hover:bg-neutral-900 hover:text-white [&_svg]:size-5"
              onClick={() => oauth("google")}
              disabled={loading}
            >
              <GoogleIcon />
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 justify-center gap-3 rounded-md border-neutral-900 bg-neutral-950 font-semibold text-white hover:bg-neutral-900 hover:text-white [&_svg]:size-5"
              onClick={() => oauth("apple")}
              disabled={loading}
            >
              <AppleIcon />
              Continue with Apple
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5c-.2 1.2-1 2.3-2 3v2.5h3.2c1.9-1.7 3.1-4.3 3.1-7.2Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.5l-3.2-2.5c-.9.6-2 1-3.5 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.8 19.7 8.1 22 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.5H3.1C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.5l3.3-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3 14.7 2 12 2 8.1 2 4.8 4.3 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M16.4 1.5c0 1.1-.4 2.1-1.2 2.9-.9.9-1.9 1.3-2.9 1.3-.1-1.1.4-2.2 1.2-3 .8-.8 2.2-1.4 2.9-1.2ZM20.4 17.1c-.6 1.3-.9 1.9-1.6 3.1-1 1.6-2.5 3.5-4.2 3.5-1.6 0-2-.9-4.2-.9s-2.6 1-4.2.9c-1.8 0-3.1-1.8-4.2-3.4-2.9-4.4-3.2-9.6-1.4-12.4 1.3-2 3.2-3.1 5.1-3.1s3.1 1 4.7 1c1.5 0 2.4-1 4.6-1 1.7 0 3.4.9 4.7 2.4-4.1 2.2-3.5 7.8.7 9.9Z"
      />
    </svg>
  );
}