import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { LayoutDashboard, Car, Users, UserCheck, RotateCcw, BarChart3, Hand } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const user = await auth.requireAuth();
    if (!user) throw redirect({ to: "/auth" });
    const isUserAdmin = await auth.isAdmin(user.id);
    if (!isUserAdmin) throw redirect({ to: "/" });
  },
  component: AdminLayout,
});

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/rides", label: "Rides", icon: Car },
  { href: "/admin/drivers", label: "Drivers", icon: UserCheck },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
  { href: "/admin/taxi-signs", label: "Taxi Signs", icon: Hand },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col shrink-0 border-r bg-sidebar border-sidebar-border">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sm font-bold text-sidebar-primary-foreground shrink-0">
            V
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight text-sidebar-foreground">VayaRide</p>
            <p className="text-xs text-sidebar-foreground/60">Admin Console</p>
          </div>
        </div>
        <div className="h-px bg-sidebar-border" />
        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" }}
                inactiveProps={{ className: "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground" }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors"
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="h-px bg-sidebar-border" />
        <div className="px-4 py-3">
          <p className="text-xs text-sidebar-foreground/50 mb-1">VayaRide v1.0</p>
          <p className="text-xs text-sidebar-foreground/40">South Africa · Vaal Triangle</p>
        </div>
      </aside>
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}