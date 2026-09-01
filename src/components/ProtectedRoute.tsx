import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  /** When false, allows incomplete profiles (e.g. /profile-setup). */
  requireProfile?: boolean;
}

const ProtectedRoute = ({ children, requireProfile = true }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { data: profileStatus, isLoading: profileLoading } = useProfileComplete();
  const location = useLocation();

  if (loading || (user && requireProfile && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (requireProfile && profileStatus && !profileStatus.complete) {
    return <Navigate to="/profile-setup" replace />;
  }

  if (!requireProfile && profileStatus?.complete && location.pathname === "/profile-setup") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
