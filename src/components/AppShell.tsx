import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, Shield } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import { useNotificationCount } from "@/hooks/useNotifications";
import { useTrackOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useWebPush } from "@/hooks/useWebPush";
import { useNativePush } from "@/hooks/useNativePush";
import { useAdmin } from "@/hooks/useAdmin";
import IncomingCallOverlay from "@/components/IncomingCallOverlay";
import { navGroups, mobileNavItems, isNavActive, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto min-w-5 h-5 px-1 bg-brand text-primary-foreground text-[10px] rounded-md flex items-center justify-center font-semibold">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function SidebarNav({
  pathname,
  unreadCount,
  isAdmin,
  onNavigate,
  variant,
}: {
  pathname: string;
  unreadCount: number;
  isAdmin: boolean;
  onNavigate: (path: string) => void;
  variant: "desktop" | "drawer";
}) {
  const itemClass = (active: boolean) =>
    cn(
      "w-full flex items-center gap-3 text-sm font-medium transition-colors touch-manipulation",
      variant === "desktop" ? "px-3 py-2.5 rounded-lg" : "px-5 py-3 active:scale-[0.98]",
      active
        ? variant === "desktop"
          ? "bg-secondary text-foreground"
          : "bg-secondary/80 text-foreground border-r-2 border-brand"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40",
    );

  const renderItem = (item: NavItem) => {
    const active = isNavActive(pathname, item.path);
    const badgeCount = item.badge === "notifications" ? unreadCount : 0;

    return (
      <button key={item.path} onClick={() => onNavigate(item.path)} className={itemClass(active)}>
        <item.icon size={18} strokeWidth={active ? 2 : 1.75} className={active ? "text-brand" : "text-muted-foreground"} />
        <span>{item.label}</span>
        <NavBadge count={badgeCount} />
      </button>
    );
  };

  return (
    <nav className={cn("flex-1 overflow-y-auto", variant === "desktop" ? "py-5 px-3" : "py-2")}>
      {navGroups.map((group, gi) => (
        <div key={group.label} className={cn(gi > 0 && "mt-6")}>
          <p
            className={cn(
              "text-[10px] font-body uppercase tracking-[0.16em] text-muted-foreground/60 mb-2",
              variant === "drawer" ? "px-5" : "px-3",
            )}
          >
            {group.label}
          </p>
          <div className="space-y-0.5">{group.items.map(renderItem)}</div>
        </div>
      ))}

      {isAdmin && (
        <div className="mt-6 pt-5 border-t border-border/30">
          <p
            className={cn(
              "text-[10px] font-body uppercase tracking-[0.16em] text-muted-foreground/60 mb-2",
              variant === "drawer" ? "px-5" : "px-3",
            )}
          >
            Administration
          </p>
          <button onClick={() => onNavigate("/admin")} className={itemClass(pathname.startsWith("/admin"))}>
            <Shield size={18} />
            <span>Panneau admin</span>
          </button>
        </div>
      )}
    </nav>
  );
}

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = useNotificationCount();
  const { isAdmin } = useAdmin();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useTrackOnlineStatus();
  usePushNotifications();
  useWebPush();
  useNativePush();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleNavigate = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <IncomingCallOverlay />

      <aside className="hidden lg:flex flex-col w-64 border-r border-border/40 bg-elevated z-40">
        <div className="flex items-center h-16 px-5 border-b border-border/40">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            aria-label="Amova — Accueil"
          >
            <Logo variant="mark" className="h-8 w-8" />
            <span className="font-display text-xl font-medium tracking-tight">Amova</span>
          </button>
        </div>

        <SidebarNav
          pathname={location.pathname}
          unreadCount={unreadCount}
          isAdmin={isAdmin}
          onNavigate={handleNavigate}
          variant="desktop"
        />

        <div className="px-4 py-3 border-t border-border/40">
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive gap-2"
            >
              <LogOut size={16} />
              Déconnexion
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <SubscriptionBanner />
        <header className="lg:hidden border-b border-border/40 bg-background/90 backdrop-blur-xl sticky top-0 z-40 safe-area-top">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setDrawerOpen(true)}
                className="p-2 -ml-1 rounded-lg text-foreground hover:bg-secondary/50 transition-colors touch-manipulation"
                aria-label="Menu"
              >
                <Menu size={22} />
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2"
                aria-label="Amova — Accueil"
              >
                <Logo variant="mark" />
                <span className="font-display text-lg font-medium tracking-tight">Amova</span>
              </button>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
            <aside
              className="absolute top-0 left-0 h-full w-72 bg-background border-r border-border/40 shadow-premium animate-in slide-in-from-left duration-200 safe-area-top flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 h-14 border-b border-border/40">
                <span className="flex items-center gap-2.5 font-display text-lg font-medium">
                  <Logo variant="mark" className="h-8 w-8" />
                  Amova
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground"
                  aria-label="Fermer"
                >
                  <X size={20} />
                </button>
              </div>

              <SidebarNav
                pathname={location.pathname}
                unreadCount={unreadCount}
                isAdmin={isAdmin}
                onNavigate={handleNavigate}
                variant="drawer"
              />

              <div className="p-4 border-t border-border/40 safe-area-bottom">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full justify-start text-muted-foreground gap-2 hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut size={16} />
                  Déconnexion
                </Button>
              </div>
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto w-full relative">{children}</main>

        <nav className="lg:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl sticky bottom-0 z-40 safe-area-bottom">
          <div className="flex items-stretch justify-around px-1 py-1">
            {mobileNavItems.map((item) => {
              const active = isNavActive(location.pathname, item.path, item.matchPaths);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-2 rounded-lg transition-colors active:scale-95 touch-manipulation",
                    active ? "text-brand" : "text-muted-foreground",
                  )}
                >
                  <item.icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                  <span className="text-[9px] font-medium truncate max-w-full px-0.5">{item.label}</span>
                  {item.showNotificationBadge && unreadCount > 0 && (
                    <span className="absolute top-1 right-[18%] min-w-3.5 h-3.5 px-0.5 bg-brand text-primary-foreground text-[8px] rounded-md flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "+" : unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default AppShell;
