import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "signin" | "signup" | "reset";

const FRIENDLY_ERRORS: Record<string, string> = {
  "Invalid login credentials": "Incorrect email or password. Please try again.",
  "Email not confirmed": "Please check your inbox and confirm your email first.",
  "User already registered": "An account with this email already exists. Try signing in.",
  "Password should be at least 6 characters": "Password must be at least 6 characters long.",
  "Unable to validate email or password": "Please enter a valid email and password.",
};

function friendlyError(raw: string): string {
  return FRIENDLY_ERRORS[raw] || raw;
}

function VayaRideLogo() {
  return (
    <div className="flex flex-col items-center gap-2 mb-6">
      <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
        <span className="text-3xl font-bold text-white">V</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">VayaRide</h1>
      <p className="text-sm text-muted-foreground">Your ride, your way.</p>
    </div>
  );
}

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    if (await auth.isAuthenticated()) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      const msg = decodeURIComponent(oauthError.replace(/\+/g, " "));
      setErrorMessage(friendlyError(msg));
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("reset") === "true") {
      setMode("reset");
      setErrorMessage(null);
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      if (await auth.isAuthenticated()) navigate({ to: "/" });
    };
    check();
  }, [navigate]);

  const clearError = () => setErrorMessage(null);

  const selectMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword("");
    setErrorMessage(null);
    setResetSent(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await auth.signUpWithEmail(email.trim(), password, fullName);
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
        selectMode("signin");
      } else {
        const { error } = await auth.signInWithEmail(email.trim(), password);
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err: any) {
      setErrorMessage(friendlyError(err.message || "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    setLoading(true);
    const { error } = await auth.resetPassword(email.trim());
    setLoading(false);
    if (error) {
      setErrorMessage(friendlyError(error.message));
      return;
    }
    setResetSent(true);
    toast.success("Password reset link sent to your email.");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await auth.updatePassword(password);
    setLoading(false);
    if (error) {
      setErrorMessage(friendlyError(error.message));
      return;
    }
    toast.success("Password updated successfully!");
    selectMode("signin");
  };

  const oauth = async (provider: "google" | "apple") => {
    setLoading(true);
    const res = provider === "google"
      ? await auth.signInWithGoogle(window.location.origin + "/auth")
      : await auth.signInWithApple(window.location.origin + "/auth");
    if (res.error) {
      setLoading(false);
      setErrorMessage(friendlyError(res.error.message || "Sign-in failed. Please try again."));
    }
    // If redirected, page will reload automatically
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <VayaRideLogo />

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-4 rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 flex items-start gap-2">
            <div className="h-5 w-5 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-destructive">!</span>
            </div>
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        )}

        {mode === "reset" ? (
          // ── Password Reset ──────────────────────────────
          <div className="rounded-3xl bg-card border shadow-lg p-6">
            <button
              onClick={() => selectMode("signin")}
              className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            {resetSent ? (
              <div className="text-center py-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <p className="font-semibold">Check your email</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We sent a reset link to <strong>{email}</strong>
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-1">Reset password</h2>
                <p className="text-sm text-muted-foreground mb-4">Enter your email and we'll send you a reset link.</p>
                <form onSubmit={handleResetRequest} className="space-y-4">
                  <div>
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="h-12 rounded-xl mt-1"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send reset link"}
                  </Button>
                </form>
              </>
            )}
          </div>
        ) : (
          // ── Sign In / Sign Up ───────────────────────────
          <div className="rounded-3xl bg-card border shadow-lg p-6">
            {/* Mode Toggle */}
            <div className="flex bg-muted rounded-xl p-1 mb-5">
              <button
                type="button"
                onClick={() => selectMode("signin")}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => selectMode("signup")}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <Label htmlFor="auth-email">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="h-12 rounded-xl mt-1"
                />
              </div>

              {mode === "signup" && (
                <div>
                  <Label htmlFor="auth-name">Full name</Label>
                  <Input
                    id="auth-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="h-12 rounded-xl mt-1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="auth-password">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"}
                    className="h-12 rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => selectMode("reset")}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : mode === "signup" ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-3 text-xs text-muted-foreground">or continue with</span>
              </div>
            </div>

            {/* Social Logins */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => oauth("google")}
                disabled={loading}
                className="w-full h-12 rounded-xl border bg-background hover:bg-muted/50 transition-colors flex items-center justify-center gap-3 text-sm font-medium disabled:opacity-50"
              >
                <GoogleIcon />
                Continue with Google
              </button>
              <button
                type="button"
                onClick={() => oauth("apple")}
                disabled={loading}
                className="w-full h-12 rounded-xl border bg-neutral-900 text-white hover:bg-neutral-800 transition-colors flex items-center justify-center gap-3 text-sm font-medium disabled:opacity-50"
              >
                <AppleIcon />
                Continue with Apple
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5c-.2 1.2-1 2.3-2 3v2.5h3.2c1.9-1.7 3.1-4.3 3.1-7.2Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.5l-3.2-2.5c-.9.6-2 1-3.5 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.8 19.7 8.1 22 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.5H3.1C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.5l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3 14.7 2 12 2 8.1 2 4.8 4.3 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M16.4 1.5c0 1.1-.4 2.1-1.2 2.9-.9.9-1.9 1.3-2.9 1.3-.1-1.1.4-2.2 1.2-3 .8-.8 2.2-1.4 2.9-1.2ZM20.4 17.1c-.6 1.3-.9 1.9-1.6 3.1-1 1.6-2.5 3.5-4.2 3.5-1.6 0-2-.9-4.2-.9s-2.6 1-4.2.9c-1.8 0-3.1-1.8-4.2-3.4-2.9-4.4-3.2-9.6-1.4-12.4 1.3-2 3.2-3.1 5.1-3.1s3.1 1 4.7 1c1.5 0 2.4-1 4.6-1 1.7 0 3.4.9 4.7 2.4-4.1 2.2-3.5 7.8.7 9.9Z" />
    </svg>
  );
}