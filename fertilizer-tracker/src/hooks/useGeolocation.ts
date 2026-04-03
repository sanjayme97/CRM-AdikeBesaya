import { useState, useCallback } from 'react';

interface GeolocationResult {
  latitude: number;
  longitude: number;
}

interface UseGeolocationReturn {
  getCurrentPosition: () => Promise<GeolocationResult | null>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for capturing GPS coordinates using the browser Geolocation API.
 * Point-in-time capture only (no continuous tracking).
 * Works offline — GPS uses device hardware, not internet.
 */
export function useGeolocation(): UseGeolocationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = useCallback((): Promise<GeolocationResult | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by this browser');
        resolve(null);
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLoading(false);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          setLoading(false);
          let errorMessage = 'Failed to get location';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. You can still check in without GPS.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable. You can still check in without GPS.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out. You can still check in without GPS.';
              break;
          }
          setError(errorMessage);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return { getCurrentPosition, loading, error };
}
