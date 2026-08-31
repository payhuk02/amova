import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Heart, MessageCircle, Bell, Compass, User, Settings, Zap, Eye, Menu, X, BookOpen, Calendar, MapPin, Crown } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useNotificationCount } from "@/hooks/useNotifications";
import { useTrackOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import IncomingCallOverlay from "@/components/IncomingCallOverlay";

// All nav items for the drawer (used on all screen sizes)
const drawerNavItems = [
  { path: "/discover", icon: Compass, label: "Découvrir" },
  { path: "/nearby", icon: MapPin, label: "À proximité" },
  { path: "/speed-dating", icon: Zap, label: "Speed Dating" },
  { path: "/dashboard", icon: Heart, label: "Profils" },
  { path: "/liked-me", icon: Eye, label: "Qui m'aime" },
  { path: "/messages", icon: MessageCircle, label: "Messages" },
  { path: "/notifications", icon: Bell, label: "Activité" },
  { path: "/stories", icon: BookOpen, label: "Stories" },
  { path: "/events", icon: Calendar, label: "Événements" },
  { path: "/premium", icon: Crown, label: "Premium" },
  { path: "/settings", icon: Settings, label: "Paramètres" },
];

// Mobile bottom nav — only 5 most important
const mobileNavItems = [
  { path: "/discover", icon: Compass, label: "Découvrir" },
  { path: "/dashboard", icon: Heart, label: "Profils" },
  { path: "/messages", icon: MessageCircle, label: "Messages" },
  { path: "/notifications", icon: Bell, label: "Activité" },
  { path: "/edit-profile", icon: User, label: "Profil" },
];

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = useNotificationCount();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useTrackOnlineStatus();
  usePushNotifications();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDrawerNav = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-x-hidden">
      <IncomingCallOverlay />
      {/* Top header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-xl sticky top-0 z-50 safe-area-top">
        <div className="container flex h-12 sm:h-14 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="p-1.5 rounded-lg text-foreground hover:bg-secondary/50 transition-colors touch-manipulation"
              aria-label="Menu"
            >
              {drawerOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="font-display text-lg sm:text-xl font-semibold tracking-wide text-foreground"
            >
              Amova
            </button>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-3">
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </header>

      {/* Drawer overlay — all screen sizes */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <aside
            className="absolute top-0 left-0 h-full w-72 bg-background border-r border-border/30 shadow-xl animate-in slide-in-from-left duration-200 safe-area-top"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-12 border-b border-border/30">
              <span className="font-display text-lg font-semibold tracking-wide text-foreground">Amova</span>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col py-2 overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 48px - 60px)' }}>
              {drawerNavItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleDrawerNav(item.path)}
                    className={`relative flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors touch-manipulation active:scale-[0.98] ${
                      active
                        ? "bg-primary/10 text-foreground border-r-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                    {item.path === "/notifications" && unreadCount > 0 && (
                      <span className="ml-auto w-5 h-5 bg-accent text-accent-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/30 safe-area-bottom">
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start text-muted-foreground gap-2">
                <LogOut size={16} />
                Déconnexion
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">{children}</div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl sticky bottom-0 z-50 safe-area-bottom">
        <div className="flex items-center justify-around py-1 px-0.5">
          {mobileNavItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center gap-0.5 min-w-0 flex-1 py-1.5 rounded-lg transition-colors active:scale-95 touch-manipulation ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <item.icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[9px] font-medium truncate max-w-full">{item.label}</span>
                {item.path === "/notifications" && unreadCount > 0 && (
                  <span className="absolute top-0 right-1/4 w-3.5 h-3.5 bg-accent text-accent-foreground text-[8px] rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "+" : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppShell;
