import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { HUB_BY_ID, HUBS, hubsToGeoJSON } from "@/data/hubs";
import { quoteLane } from "@/lib/freight";
import { fetchRoadRoute, pairKey } from "@/lib/routing";
import { useOpsStore, type Lane } from "@/store/ops";
import type { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";

if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
}

const INDEX_BY_ID = new Map(HUBS.map((hub, index) => [hub.id, index]));

const EMPTY_LINES = {
  type: "FeatureCollection" as const,
  features: [] as Array<{
    type: "Feature";
    properties: { id: string };
    geometry: { type: "LineString"; coordinates: [number, number][] };
  }>,
};

const STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    },
    places: {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 16,
    },
    hubs: {
      type: "geojson",
      data: hubsToGeoJSON(),
    },
    lanes: {
      type: "geojson",
      data: EMPTY_LINES,
      lineMetrics: true,
    },
    preview: {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      },
    },
  },
  layers: [
    { id: "satellite", type: "raster", source: "satellite" },
    {
      id: "places",
      type: "raster",
      source: "places",
      paint: { "raster-opacity": 0.62 },
    },
    {
      id: "preview-line",
      type: "line",
      source: "preview",
      paint: {
        "line-color": "#d7ddd4",
        "line-width": 1.1,
        "line-opacity": 0.45,
        "line-dasharray": [2, 2],
      },
    },
    {
      id: "lane-casing",
      type: "line",
      source: "lanes",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#0b0c0b",
        "line-width": 4,
        "line-opacity": 0.62,
      },
    },
    {
      id: "lane-line",
      type: "line",
      source: "lanes",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#e8ece8",
        "line-width": 2.05,
        "line-opacity": 0.96,
        "line-gradient": ["interpolate", ["linear"], ["line-progress"], 0, "#c5ccc4", 1, "#f3f6f2"],
      },
    },
    {
      id: "hubs-hit",
      type: "circle",
      source: "hubs",
      paint: {
        "circle-radius": 14,
        "circle-color": "#ffffff",
        "circle-opacity": 0,
        "circle-pitch-alignment": "viewport",
      },
    },
    {
      id: "hubs-halo",
      type: "circle",
      source: "hubs",
      paint: {
        "circle-radius": 5.4,
        "circle-color": "#e8ece8",
        "circle-opacity": [
          "case",
          ["boolean", ["feature-state", "origin"], false],
          0.28,
          ["boolean", ["feature-state", "pending"], false],
          0.22,
          0,
        ],
        "circle-pitch-alignment": "viewport",
      },
    },
    {
      id: "hubs-core",
      type: "circle",
      source: "hubs",
      paint: {
        "circle-radius": 2.4,
        "circle-color": [
          "case",
          ["boolean", ["feature-state", "origin"], false],
          "#f4f7f3",
          ["boolean", ["feature-state", "pending"], false],
          "#e7ece6",
          ["boolean", ["feature-state", "active"], false],
          "#dce3db",
          "#e6eae6",
        ],
        "circle-stroke-width": 0.9,
        "circle-stroke-color": "#0c0d0c",
        "circle-opacity": 0.96,
        "circle-pitch-alignment": "viewport",
      },
    },
    {
      id: "hubs-label",
      type: "symbol",
      source: "hubs",
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-padding": 2,
        "text-optional": true,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#f2f4f2",
        "text-halo-color": "#0a0a0b",
        "text-halo-width": 1.15,
        "text-opacity": [
          "case",
          ["boolean", ["feature-state", "origin"], false],
          1,
          ["boolean", ["feature-state", "pending"], false],
          1,
          ["boolean", ["feature-state", "hover"], false],
          1,
          0,
        ],
      },
    },
  ],
};

function lanesToGeoJSON(lanes: Lane[]) {
  return {
    type: "FeatureCollection" as const,
    features: lanes.map((lane) => ({
      type: "Feature" as const,
      properties: { id: lane.id },
      geometry: {
        type: "LineString" as const,
        coordinates: lane.coordinates,
      },
    })),
  };
}

function setLineData(
  map: MapLibreMap,
  sourceId: string,
  data: Parameters<GeoJSONSource["setData"]>[0],
) {
  const source = map.getSource(sourceId);
  if (source && "setData" in source) {
    (source as GeoJSONSource).setData(data);
  }
}

export function SatelliteMap() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let disposed = false;
    let hoverIndex: number | undefined;
    const marked = new Set<number>();

    const clearPreview = () => {
      if (!map?.getSource("preview")) return;
      setLineData(map, "preview", {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      });
    };

    const markHub = (
      index: number | undefined,
      state: {
        origin?: boolean;
        pending?: boolean;
        active?: boolean;
        hover?: boolean;
      },
    ) => {
      if (index == null || !map) return;
      map.setFeatureState({ source: "hubs", id: index }, state);
      marked.add(index);
    };

    const syncState = () => {
      if (!map?.isStyleLoaded()) return;
      const ops = useOpsStore.getState();
      const next = new Set<number>();
      const originIndex = ops.originId ? INDEX_BY_ID.get(ops.originId) : undefined;
      const pendingIndex = ops.pendingTo ? INDEX_BY_ID.get(ops.pendingTo) : undefined;
      if (originIndex != null) next.add(originIndex);
      if (pendingIndex != null) next.add(pendingIndex);
      for (const lane of ops.lanes) {
        const a = INDEX_BY_ID.get(lane.fromId);
        const b = INDEX_BY_ID.get(lane.toId);
        if (a != null) next.add(a);
        if (b != null) next.add(b);
      }
      if (hoverIndex != null) next.add(hoverIndex);

      for (const index of marked) {
        if (!next.has(index)) {
          map.setFeatureState(
            { source: "hubs", id: index },
            { origin: false, pending: false, active: false, hover: false },
          );
        }
      }
      marked.clear();
      for (const index of next) {
        markHub(index, {
          origin: index === originIndex,
          pending: index === pendingIndex,
          active: true,
          hover: index === hoverIndex,
        });
      }

      setLineData(map, "lanes", lanesToGeoJSON(ops.lanes));
    };

    const fitLane = (lane: Lane) => {
      if (!map) return;
      const bounds = new maplibregl.LngLatBounds();
      for (const coord of lane.coordinates) bounds.extend(coord);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const maxZoom = lane.km > 3500 ? 4.6 : lane.km > 1200 ? 5.8 : 7.4;
      map.fitBounds(bounds, {
        padding: { top: 72, right: 88, bottom: 48, left: 48 },
        maxZoom,
        duration: reduce ? 0 : 1100,
      });
    };

    const handleHub = async (id: string) => {
      const ops = useOpsStore.getState();
      if (ops.routing) return;
      if (!ops.originId) {
        ops.setOrigin(id);
        return;
      }
      if (ops.originId === id) {
        ops.setOrigin(null);
        clearPreview();
        return;
      }
      if (ops.hasLane(ops.originId, id)) {
        const existing = ops.lanes.find(
          (lane) => pairKey(lane.fromId, lane.toId) === pairKey(ops.originId!, id),
        );
        if (existing) fitLane(existing);
        ops.setOrigin(null);
        clearPreview();
        return;
      }
      const from = HUB_BY_ID.get(ops.originId);
      const to = HUB_BY_ID.get(id);
      if (!from || !to) return;
      ops.setPending(id, true);
      clearPreview();

      try {
        const route = await fetchRoadRoute(from, to);
        if (disposed) return;
        const lane: Lane = {
          id: `${from.id}__${to.id}__${Date.now()}`,
          fromId: from.id,
          toId: to.id,
          coordinates: route.coordinates,
          km: route.km,
          quote: quoteLane(route.km),
          onRoad: route.onRoad,
        };
        useOpsStore.getState().addLane(lane);
        fitLane(lane);
      } catch {
        useOpsStore.getState().setPending(null, false);
        useOpsStore.getState().setOrigin(null);
        clearPreview();
      }
    };

    const map = new maplibregl.Map({
      container: root,
      style: STYLE,
      center: [75, 48.2],
      zoom: 3.15,
      minZoom: 2.5,
      maxZoom: 18,
      maxBounds: [
        [-28, 12],
        [172, 78],
      ],
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      pitch: 0,
      bearing: 0,
      renderWorldCopies: false,
      fadeDuration: 180,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.touchZoomRotate.disableRotation();

    const canvas = map.getCanvas();

    map.on("load", () => {
      if (!disposed) syncState();
    });

    map.on("click", (event) => {
      const hits = map!.queryRenderedFeatures(event.point, {
        layers: ["hubs-hit"],
      });
      const id = hits[0]?.properties?.id;
      if (typeof id === "string") {
        void handleHub(id);
        return;
      }
      useOpsStore.getState().setOrigin(null);
      clearPreview();
    });

    map.on("mousemove", (event) => {
      if (!map) return;
      const hits = map.queryRenderedFeatures(event.point, {
        layers: ["hubs-hit"],
      });
      const nextIndex = typeof hits[0]?.id === "number" ? hits[0].id : undefined;
      const waiting = Boolean(useOpsStore.getState().originId);
      canvas.style.cursor = nextIndex != null ? "pointer" : waiting ? "crosshair" : "";
      if (nextIndex !== hoverIndex) {
        hoverIndex = nextIndex;
        syncState();
      }
      const originId = useOpsStore.getState().originId;
      const routing = useOpsStore.getState().routing;
      if (originId && !routing) {
        const from = HUB_BY_ID.get(originId);
        if (from) {
          setLineData(map, "preview", {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [from.lng, from.lat],
                [event.lngLat.lng, event.lngLat.lat],
              ],
            },
          });
        }
      }
    });

    map.on("mouseout", () => {
      hoverIndex = undefined;
      canvas.style.cursor = "";
      syncState();
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        useOpsStore.getState().setOrigin(null);
        clearPreview();
      }
    };
    window.addEventListener("keydown", onKey);

    (window as Window & { __selectHub?: (id: string) => void }).__selectHub = (id: string) => {
      void handleHub(id);
    };

    const unsub = useOpsStore.subscribe(() => {
      syncState();
      if (!useOpsStore.getState().originId) clearPreview();
    });

    const resizeObserver = new ResizeObserver(() => {
      map?.resize();
    });
    resizeObserver.observe(root);

    return () => {
      disposed = true;
      unsub?.();
      resizeObserver?.disconnect();
      if (onKey) window.removeEventListener("keydown", onKey);
      delete (window as Window & { __selectHub?: (id: string) => void }).__selectHub;
      map?.remove();
    };
  }, []);

  return <div ref={rootRef} className="h-full w-full" />;
}
