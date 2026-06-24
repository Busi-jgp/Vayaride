import { Link, useRouter } from "@tanstack/react-router";
import { Home, PlusCircle, History, User as UserIcon, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { SOSButton } from "./SOSButton";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const path = router.state.location.pathname;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg tracking-tight text-primary">
          {t("appName")}
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "en" ? "af" : "en")}
            className="text-xs font-medium rounded-md border px-2 py-1 hover:bg-accent/20"
          >
            {lang.toUpperCase()}
          </button>
          {user && <SOSButton />}
        </div>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      {user && (
        <nav className="fixed bottom-0 inset-x-0 z-30 border-t bg-card grid grid-cols-5 h-16">
          <NavItem to="/rides" active={path === "/rides"} icon={<Home className="h-5 w-5" />} label={t("findRides")} />
          <NavItem to="/rides/new" active={path === "/rides/new"} icon={<PlusCircle className="h-5 w-5" />} label={t("offerRide")} />
          <NavItem to="/history" active={path === "/history"} icon={<History className="h-5 w-5" />} label={t("myTrips")} />
          <NavItem to="/profile" active={path === "/profile"} icon={<UserIcon className="h-5 w-5" />} label={t("profile")} />
          {isAdmin ? (
            <NavItem to="/admin" active={path === "/admin"} icon={<Shield className="h-5 w-5" />} label={t("admin")} />
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function NavItem({
  to, active, icon, label,
}: { to: string; active: boolean; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
