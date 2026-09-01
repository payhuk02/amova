import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GeoPosition {
  latitude: number;
  longitude: number;
}

export const useGeolocation = () => {
  const { user } = useAuth();
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée");
      return null;
    }

    setLoading(true);
    return new Promise<GeoPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setPosition(coords);
          setError(null);
          setLoading(false);

          // Save to profile
          if (user) {
            await supabase
              .from("profiles")
              .update({
                latitude: coords.latitude,
                longitude: coords.longitude,
              } as any)
              .eq("user_id", user.id);
          }
          resolve(coords);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    });
  };

  return { position, error, loading, requestLocation };
};

export const useSmartMatches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMatches = async (maxDistance = 100) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_smart_matches", {
        p_max_distance: maxDistance,
        p_limit: 50,
      });
      if (!error && data) {
        setMatches(data);
      }
    } catch (e) {
      console.error("Smart match error:", e);
    }
    setLoading(false);
  };

  return { matches, loading, loadMatches };
};
