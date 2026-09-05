import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
  /** When false, allows incomplete profiles (e.g. /profile-setup). */
  requireProfile?: boolean;
}

const ProtectedRoute = ({ children, requireProfile = true }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const {
    data: profileStatus,
    isLoading: profileLoading,
    isError: profileError,
    refetch,
  } = useProfileComplete();
  const location = useLocation();

  if (loading || (user && requireProfile && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  // Fail closed: never allow app access if completeness cannot be verified
  if (requireProfile && profileError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-muted-foreground text-center">
          Impossible de vérifier votre profil. Réessayez.
        </p>
        <Button variant="outline" onClick={() => void refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }

  if (requireProfile && !profileLoading && profileStatus && !profileStatus.complete) {
    return <Navigate to="/profile-setup" replace />;
  }

  // Still loading completeness for setup page redirect-away
  if (!requireProfile && profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!requireProfile && profileStatus?.complete && location.pathname === "/profile-setup") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
