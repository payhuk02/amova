import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Users, Flag, LayoutDashboard, LogOut, ShieldCheck, CreditCard,
  Crown, MessageSquare, Calendar, Bell, Shield, Menu, X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { STATUS_LABELS, statusBadgeClass } from "@/lib/admin";
import Logo from "@/components/Logo";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Tableau de bord", exact: true },
  { path: "/admin/users", icon: Users, label: "Utilisateurs" },
  { path: "/admin/admins", icon: Shield, label: "Administrateurs" },
  { path: "/admin/verifications", icon: ShieldCheck, label: "Vérifications" },
  { path: "/admin/subscriptions", icon: Crown, label: "Abonnements" },
  { path: "/admin/payments", icon: CreditCard, label: "Paiements" },
  { path: "/admin/reports", icon: Flag, label: "Signalements" },
  { path: "/admin/moderation", icon: MessageSquare, label: "Modération" },
  { path: "/admin/events", icon: Calendar, label: "Événements" },
  { path: "/admin/notifications", icon: Bell, label: "Notifications" },
];

function isNavActive(pathname: string, path: string, exact?: boolean) {
  if (exact) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <>
      {navItems.map((item) => {
        const active = isNavActive(location.pathname, item.path, item.exact);
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${
              active
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <item.icon size={18} />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 border-r border-border/50 bg-secondary/30 flex-col hidden md:flex">
        <div className="p-5 border-b border-border/50 flex items-center gap-3">
          <Logo variant="mark" />
          <span className="font-display font-semibold text-lg tracking-wide">Admin</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-border/50 space-y-2">
          <ThemeToggle />
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-red-500 hover:bg-red-500/10 transition-colors text-sm"
          >
            <LogOut size={18} />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden border-b border-border/50 bg-background/95 backdrop-blur-lg px-4 h-14 flex items-center justify-between shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-secondary">
            <Menu size={22} />
          </button>
          <span className="font-display font-semibold">Administration</span>
          <ThemeToggle />
        </header>

        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute top-0 left-0 h-full w-72 bg-background border-r border-border/50 flex flex-col shadow-xl">
              <div className="flex items-center justify-between px-4 h-14 border-b border-border/50">
                <span className="font-display font-semibold">Menu admin</span>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </nav>
              <div className="p-4 border-t border-border/50">
                <button
                  onClick={signOut}
                  className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-red-500 hover:bg-red-500/10 text-sm"
                >
                  <LogOut size={18} />
                  Déconnexion
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-background/50 pb-6">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function AdminPageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="text-2xl sm:text-3xl font-display font-semibold mb-1">{title}</h1>
      {description && <p className="text-muted-foreground text-sm sm:text-base">{description}</p>}
    </div>
  );
}

export function AdminTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-secondary/30 rounded-2xl border border-border/50 overflow-x-auto">
      {children}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(status)}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
