import type { LucideIcon } from "lucide-react";
import {
  Compass, MapPin, Heart, Eye, MessageCircle, Bell,
  BookOpen, Calendar, Zap, Crown, Settings, User,
} from "lucide-react";

export interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  badge?: "notifications";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Découvrir",
    items: [
      { path: "/discover", icon: Compass, label: "Mode swipe" },
      { path: "/nearby", icon: MapPin, label: "À proximité" },
      { path: "/dashboard", icon: Heart, label: "Tous les profils" },
    ],
  },
  {
    label: "Connexions",
    items: [
      { path: "/liked-me", icon: Eye, label: "Qui m'aime" },
      { path: "/messages", icon: MessageCircle, label: "Messages" },
      { path: "/notifications", icon: Bell, label: "Activité", badge: "notifications" },
    ],
  },
  {
    label: "Communauté",
    items: [
      { path: "/stories", icon: BookOpen, label: "Stories" },
      { path: "/events", icon: Calendar, label: "Événements" },
      { path: "/speed-dating", icon: Zap, label: "Speed Dating" },
    ],
  },
  {
    label: "Mon espace",
    items: [
      { path: "/edit-profile", icon: User, label: "Mon profil" },
      { path: "/premium", icon: Crown, label: "Premium" },
      { path: "/settings", icon: Settings, label: "Paramètres" },
    ],
  },
];

export interface MobileNavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  matchPaths: string[];
  showNotificationBadge?: boolean;
}

export const mobileNavItems: MobileNavItem[] = [
  {
    path: "/discover",
    icon: Compass,
    label: "Découvrir",
    matchPaths: ["/discover", "/nearby", "/dashboard"],
  },
  {
    path: "/messages",
    icon: MessageCircle,
    label: "Connexions",
    matchPaths: ["/messages", "/liked-me", "/notifications"],
    showNotificationBadge: true,
  },
  {
    path: "/stories",
    icon: BookOpen,
    label: "Communauté",
    matchPaths: ["/stories", "/events", "/speed-dating"],
  },
  {
    path: "/settings",
    icon: User,
    label: "Mon espace",
    matchPaths: ["/settings", "/premium", "/edit-profile", "/coach"],
  },
];

export function isNavActive(pathname: string, path: string, matchPaths?: string[]): boolean {
  if (matchPaths?.length) {
    return matchPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}
