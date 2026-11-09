"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { clsx } from "clsx";
import { MapPin } from "lucide-react";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { GeoJSONSource, MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { useResolvedTheme } from "@/lib/theme/use-theme";
import type { LngLat } from "@/mocks/types";
import styles from "./LocationMap.module.scss";

// OpenFreeMap: free vector tiles from OpenStreetMap data, no API key.
const MAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

const AREA_SOURCE = "public-area";

type Bounds = readonly [west: number, south: number, east: number, north: number];

type LocationMapProps = {
  /** Where the map should look. Changing it from outside moves the map. */
  center: LngLat;
  zoom?: number;
  /** Called when the user finishes moving the map (the pin's new position). */
  onMove?: (center: LngLat) => void;
  /** false: a fixed view (no panning or zooming), e.g. to show a saved place. */
  interactive?: boolean;
  /** A square to shade, e.g. the public area customers will see. */
  highlight?: Bounds | null;
  /** Accessible name for the map region. */
  label: string;
  className?: string;
};

const square = ([west, south, east, north]: Bounds): Feature<Polygon> => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  },
});

const emptyArea: FeatureCollection = { type: "FeatureCollection", features: [] };

/**
 * Uber-style location map: the pin stays fixed in the middle and the map moves
 * underneath it, which is easy with a thumb. MapLibre is loaded on demand in
 * the browser (it needs WebGL and is ~800 kB), so it never weighs down other
 * pages or server rendering.
 */
export function LocationMap({
  center,
  zoom = 16,
  onMove,
  highlight = null,
  interactive = true,
  label,
  className,
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onMoveRef = useRef(onMove);
  const [ready, setReady] = useState(false);
  const theme = useResolvedTheme();

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;

    void import("maplibre-gl").then((maplibre) => {
      if (cancelled || !containerRef.current) return;
      const { MapLibreMap: Map, NavigationControl } = maplibre;
      // The tile worker is served from public/ (see scripts/copy-map-worker.mjs).
      maplibre.setWorkerUrl(`/maplibre/maplibre-gl-worker-${maplibre.getVersion()}.js`);
      map = new Map({
        container: containerRef.current,
        style: MAP_STYLES[theme],
        center: [center.lng, center.lat],
        zoom,
        interactive,
        attributionControl: { compact: true },
        // MapLibre labels its own canvas region; give it our translated name.
        locale: { "Map.Title": label },
      });
      if (interactive) {
        map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      }
      map.on("moveend", (event) => {
        // Only user gestures report back; our own easeTo calls don't.
        if (!("originalEvent" in event) || !event.originalEvent) return;
        const { lng, lat } = map!.getCenter();
        onMoveRef.current?.({ lng, lat });
      });
      map.on("load", () => {
        // Start the attribution collapsed on small maps (the "i" button opens
        // it), so it doesn't cover the pin's surroundings.
        containerRef.current
          ?.querySelector(".maplibregl-ctrl-attrib")
          ?.classList.remove("maplibregl-compact-show");
        setReady(true);
      });
      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // Recreated only when the theme or interactivity changes; other props
    // update the live map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, interactive]);

  // Follow `center` when it changes from outside (search, "use my location").
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const current = map.getCenter();
    if (
      Math.abs(current.lng - center.lng) > 1e-6 ||
      Math.abs(current.lat - center.lat) > 1e-6
    ) {
      map.easeTo({
        center: [center.lng, center.lat],
        zoom: Math.max(map.getZoom(), zoom),
      });
    }
  }, [center, zoom, ready]);

  // Shade the highlighted square (added once the style has loaded).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const data = highlight ? square(highlight) : emptyArea;
    const source = map.getSource<GeoJSONSource>(AREA_SOURCE);
    if (source) {
      void source.setData(data);
      return;
    }
    // Map paint needs real colours, so read the theme's token at runtime.
    const primary = getComputedStyle(containerRef.current!).getPropertyValue(
      "--color-primary",
    );
    map.addSource(AREA_SOURCE, { type: "geojson", data });
    map.addLayer({
      id: `${AREA_SOURCE}-fill`,
      type: "fill",
      source: AREA_SOURCE,
      paint: { "fill-color": primary, "fill-opacity": 0.15 },
    });
    map.addLayer({
      id: `${AREA_SOURCE}-line`,
      type: "line",
      source: AREA_SOURCE,
      paint: { "line-color": primary, "line-width": 2, "line-dasharray": [2, 2] },
    });
  }, [highlight, ready]);

  return (
    <div className={clsx(styles.wrapper, className)}>
      <div ref={containerRef} className={styles.map} />
      <MapPin aria-hidden className={styles.pin} />
    </div>
  );
}
