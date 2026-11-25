"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deliveriesApi,
  type ApiError,
  type DeliveryCurrentLocation,
} from "@/lib/api";

interface UseDeliveryLocationSharingOptions {
  token: string | null;
  deliveryId: string;
  enabled: boolean;
  onLocationUpdate?: (location: DeliveryCurrentLocation) => void;
}

interface DeliveryLocationSharingState {
  sharing: boolean;
  error: string;
  warning: string;
  start: () => void;
  stop: () => void;
}

const LOCATION_SEND_INTERVAL_MS = 10_000;

function geolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Enable location access for this site and try again.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your location is currently unavailable. Check your device location settings.";
  }
  if (error.code === error.TIMEOUT) {
    return "Getting your location timed out. Try again in an open area.";
  }
  return "Your location could not be determined.";
}

export function useDeliveryLocationSharing({
  token,
  deliveryId,
  enabled,
  onLocationUpdate,
}: UseDeliveryLocationSharingOptions): DeliveryLocationSharingState {
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const stop = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
  }, []);

  const start = useCallback(() => {
    if (!token || !enabled || typeof navigator === "undefined") return;
    if (!navigator.geolocation) {
      setError("This browser does not support location sharing.");
      return;
    }
    if (watchIdRef.current !== null) return;

    setError("");
    setWarning("");
    lastSentRef.current = 0;
    setSharing(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        if (now - lastSentRef.current < LOCATION_SEND_INTERVAL_MS) return;

        const accuracy = position.coords.accuracy;
        if (Number.isFinite(accuracy) && accuracy > 200) {
          setWarning(
            `Location accuracy is about ${Math.round(accuracy)} m. Waiting for a more accurate fix before sharing.`,
          );
          return;
        }
        setWarning("");

        lastSentRef.current = now;
        try {
          const response = await deliveriesApi.updateLocation(token, deliveryId, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy_meters: Number.isFinite(accuracy) ? accuracy : undefined,
            recorded_at: new Date(position.timestamp).toISOString(),
          });
          onLocationUpdate?.(response.data.location.current_location ?? {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy_meters: Number.isFinite(accuracy) ? accuracy : null,
            recorded_at: new Date(position.timestamp).toISOString(),
          });
          setError("");
        } catch (err) {
          setError(
            (err as ApiError).message || "Live location could not be shared.",
          );
          stop();
        }
      },
      (positionError) => {
        setError(geolocationErrorMessage(positionError));
        stop();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 10_000,
      },
    );
  }, [token, enabled, deliveryId, onLocationUpdate, stop]);

  useEffect(() => {
    if (enabled && token) return;
    const timer = window.setTimeout(() => stop(), 0);
    return () => window.clearTimeout(timer);
  }, [enabled, token, stop]);

  useEffect(() => () => stop(), [stop]);

  return { sharing, error, warning, start, stop };
}
