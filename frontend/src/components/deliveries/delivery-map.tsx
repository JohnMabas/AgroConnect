"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export interface DeliveryMapProps {
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  currentAccuracyMeters?: number | null;
  currentRecordedAt?: string | null;
  pickupLabel?: string;
  deliveryLabel?: string;
}

interface MapPoint {
  latitude: number;
  longitude: number;
  label: string;
  detail?: string;
}

function popupContent(point: MapPoint): HTMLElement {
  const container = document.createElement("div");
  container.className = "space-y-1 text-deep-navy";
  const title = document.createElement("p");
  title.className = "text-sm font-bold";
  title.textContent = point.label;
  container.append(title);
  if (point.detail) {
    const detail = document.createElement("p");
    detail.className = "text-xs text-deep-navy/65";
    detail.textContent = point.detail;
    container.append(detail);
  }
  return container;
}

function formatRecordedAt(value: string | null | undefined): string {
  if (!value) return "Time not reported";
  try {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "Time not reported";
  }
}

export function DeliveryMap({
  pickupLatitude,
  pickupLongitude,
  deliveryLatitude,
  deliveryLongitude,
  currentLatitude,
  currentLongitude,
  currentAccuracyMeters = null,
  currentRecordedAt = null,
  pickupLabel = "Pickup location",
  deliveryLabel = "Delivery location",
}: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapError, setMapError] = useState("");

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  const hasCoordinates =
    pickupLatitude !== null &&
    pickupLongitude !== null &&
    deliveryLatitude !== null &&
    deliveryLongitude !== null;

  useEffect(() => {
    if (!token || !hasCoordinates || !containerRef.current) return;

    setMapError("");
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [pickupLongitude as number, pickupLatitude as number],
      zoom: 12,
      attributionControl: true,
    });
    mapRef.current = map;

    const points: MapPoint[] = [
      {
        latitude: pickupLatitude as number,
        longitude: pickupLongitude as number,
        label: pickupLabel,
      },
      {
        latitude: deliveryLatitude as number,
        longitude: deliveryLongitude as number,
        label: deliveryLabel,
      },
    ];

    if (currentLatitude !== null && currentLongitude !== null) {
      points.push({
        latitude: currentLatitude,
        longitude: currentLongitude,
        label: "Last known transporter position",
        detail: `Reported ${formatRecordedAt(currentRecordedAt)}${
          currentAccuracyMeters !== null
            ? ` · Accuracy ${Math.round(currentAccuracyMeters)} m`
            : ""
        }`,
      });
    }

    map.on("load", () => {
      const coordinates = points.map(
        (point) => [point.longitude, point.latitude] as [number, number],
      );
      map.addSource("delivery-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates,
          },
        },
      });
      map.addLayer({
        id: "delivery-route-line",
        type: "line",
        source: "delivery-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#176B45",
          "line-width": 4,
          "line-opacity": 0.75,
        },
      });

      for (const point of points) {
        const element = document.createElement("div");
        element.className =
          point.label === "Pickup location"
            ? "delivery-map-marker delivery-map-marker--pickup"
            : point.label === "Delivery location"
              ? "delivery-map-marker delivery-map-marker--delivery"
              : "delivery-map-marker delivery-map-marker--current";
        const marker = new mapboxgl.Marker({ element })
          .setLngLat([point.longitude, point.latitude])
          .setPopup(new mapboxgl.Popup({ offset: 24 }).setDOMContent(popupContent(point)))
          .addTo(map);
        markersRef.current.push(marker);
      }

      const bounds = new mapboxgl.LngLatBounds();
      for (const coordinate of coordinates) bounds.extend(coordinate);
      map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 0 });
    });

    map.on("error", (event) => {
      setMapError(event.error?.message ?? "The map could not be loaded.");
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [
    token,
    hasCoordinates,
    pickupLatitude,
    pickupLongitude,
    deliveryLatitude,
    deliveryLongitude,
    currentLatitude,
    currentLongitude,
    currentAccuracyMeters,
    currentRecordedAt,
    pickupLabel,
    deliveryLabel,
  ]);

  if (!token) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-deep-navy/20 bg-soft-bg px-6 text-center">
        <p className="font-heading text-sm font-bold text-deep-navy">
          Map is awaiting configuration
        </p>
        <p className="mt-2 max-w-md text-sm text-deep-navy/55">
          Add a restricted public Mapbox token as{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">
            NEXT_PUBLIC_MAPBOX_TOKEN
          </code>{" "}
          to display delivery coordinates.
        </p>
      </div>
    );
  }

  if (!hasCoordinates) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-deep-navy/20 bg-soft-bg px-6 text-center">
        <p className="font-heading text-sm font-bold text-deep-navy">
          Coordinates are not available
        </p>
        <p className="mt-2 max-w-md text-sm text-deep-navy/55">
          This delivery has text addresses only, so no map points can be shown.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="h-80 w-full rounded-xl" />
      <p className="text-xs text-deep-navy/45">
        Route guide connects reported pickup, destination, and live position points;
        it is not a road-accurate route or arrival estimate.
      </p>
      {mapError && (
        <p role="alert" className="text-xs text-red-600">
          {mapError}
        </p>
      )}
    </div>
  );
}
