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

// All nav items for the drawer/sidebar
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
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <IncomingCallOverlay />
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border/30 bg-background/95 z-40">
        <div className="flex items-center h-16 px-6 border-b border-border/30">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 font-display text-xl font-semibold tracking-wide text-foreground hover:opacity-80 transition-opacity"
          >
            <img src="/logo.png" alt="Amova" className="h-7 w-7 object-contain" />
            Amova
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {drawerNavItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <item.icon size={20} className={active ? "text-primary" : "text-muted-foreground"} />
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

        <div className="p-4 border-t border-border/30 flex items-center justify-between">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-red-500 gap-2">
            <LogOut size={16} />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Mobile Top Header */}
        <header className="lg:hidden border-b border-border/30 bg-background/80 backdrop-blur-xl sticky top-0 z-40 safe-area-top">
          <div className="container flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDrawerOpen(!drawerOpen)}
                className="p-1.5 -ml-1.5 rounded-lg text-foreground hover:bg-secondary/50 transition-colors touch-manipulation"
                aria-label="Menu"
              >
                <Menu size={24} />
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 font-display text-lg font-semibold tracking-wide text-foreground"
              >
                <img src="/logo.png" alt="Amova" className="h-6 w-6 object-contain" />
                Amova
              </button>
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Mobile Drawer Overlay */}
        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50" onClick={() => setDrawerOpen(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <aside
              className="absolute top-0 left-0 h-full w-72 bg-background border-r border-border/30 shadow-xl animate-in slide-in-from-left duration-200 safe-area-top flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 h-14 border-b border-border/30">
                <span className="flex items-center gap-2 font-display text-lg font-semibold tracking-wide text-foreground">
                  <img src="/logo.png" alt="Amova" className="h-6 w-6 object-contain" />
                  Amova
                </span>
                <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-2">
                {drawerNavItems.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleDrawerNav(item.path)}
                      className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors touch-manipulation active:scale-[0.98] ${
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
              <div className="p-4 border-t border-border/30 safe-area-bottom">
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start text-muted-foreground gap-2 hover:text-red-500 hover:bg-red-500/10">
                  <LogOut size={16} />
                  Déconnexion
                </Button>
              </div>
            </aside>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto w-full relative">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl sticky bottom-0 z-40 safe-area-bottom">
          <div className="flex items-center justify-around py-1 px-0.5">
            {mobileNavItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`relative flex flex-col items-center gap-0.5 min-w-0 flex-1 py-1.5 rounded-lg transition-colors active:scale-95 touch-manipulation ${
                    active ? "text-primary" : "text-muted-foreground"
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
    </div>
  );
};

export default AppShell;
