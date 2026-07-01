import { Link, useRouter } from "@tanstack/react-router";
import { Home, Map, Hand, Bookmark, User, Shield } from "lucide-react";
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
            onClick={() => {
              const langs = ["en", "zu", "xh", "st", "tn", "af", "ve", "ts", "nr", "nso", "ss"];
              const idx = langs.indexOf(lang);
              setLang(langs[(idx + 1) % langs.length] as any);
            }}
            className="text-xs font-medium rounded-md border px-2 py-1 hover:bg-accent/20"
          >
            {lang.toUpperCase()}
          </button>
          {user && <SOSButton />}
        </div>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      {user && (
        <nav className="fixed bottom-0 inset-x-0 z-30 border-t bg-card grid grid-cols-5 h-16 safe-area-bottom">
          <NavItem to="/" active={path === "/"} icon={<Home className="h-5 w-5" />} label={t("navHome")} />
          <NavItem to="/taxi-signs" active={path.startsWith("/taxi-signs")} icon={<Hand className="h-5 w-5" />} label={t("navTaxiSigns")} />
          <NavItem to="/routes" active={path === "/routes"} icon={<Map className="h-5 w-5" />} label={t("navRoutes")} />
          <NavItem to="/saved" active={path === "/saved"} icon={<Bookmark className="h-5 w-5" />} label={t("navSaved")} />
          {isAdmin ? (
            <NavItem to="/admin" active={path.startsWith("/admin")} icon={<Shield className="h-5 w-5" />} label={t("navAdmin")} />
          ) : (
            <NavItem to="/profile" active={path === "/profile"} icon={<User className="h-5 w-5" />} label={t("navProfile")} />
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