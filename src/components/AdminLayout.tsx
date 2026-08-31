import { Link, useLocation } from "react-router-dom";
import { Users, Flag, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Tableau de bord" },
  { path: "/admin/users", icon: Users, label: "Utilisateurs" },
  { path: "/admin/reports", icon: Flag, label: "Signalements" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-secondary/30 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border/50 flex items-center gap-3">
          <img src="/logo.png" alt="Amova" className="h-8 w-8 object-contain" />
          <span className="font-display font-semibold text-xl tracking-wide">Amova Admin</span>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50 space-y-2">
          <ThemeToggle />
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background/50">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/95 backdrop-blur-lg flex justify-around p-2 z-50">
         {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center p-2 rounded-lg ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon size={24} />
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              </Link>
            );
          })}
      </nav>
    </div>
  );
}
