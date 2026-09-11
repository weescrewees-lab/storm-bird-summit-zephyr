import type { Hub } from "@/data/hubs";
import { greatCircle, haversineKm, lineDistanceKm, type LngLat } from "@/lib/geo";

export type RoadRoute = {
  coordinates: [number, number][];
  km: number;
  onRoad: boolean;
};

const SILK: LngLat[] = [
  { lng: 27.5615, lat: 53.9006 },
  { lng: 49.1221, lat: 55.8304 },
  { lng: 71.4704, lat: 51.1605 },
  { lng: 80.4136, lat: 44.2231 },
  { lng: 87.6168, lat: 43.8256 },
  { lng: 103.8343, lat: 36.0611 },
];

const SIBERIA: LngLat[] = [
  { lng: 37.6173, lat: 55.7558 },
  { lng: 60.6057, lat: 56.8389 },
  { lng: 82.9357, lat: 55.0084 },
  { lng: 104.2807, lat: 52.287 },
  { lng: 117.4792, lat: 49.5977 },
];

const OSRM_ENDPOINTS = [
  "https://router.project-osrm.org/route/v1/driving",
  "https://routing.openstreetmap.de/routed-car/route/v1/driving",
];

function corridorVias(from: Hub, to: Hub): LngLat[] {
  const regions = new Set([from.region, to.region]);
  if (regions.size === 1) return [];

  const destChina = from.region === "china" ? from : to.region === "china" ? to : null;
  let corridor: LngLat[] = [];

  if (regions.has("europe") && regions.has("china")) {
    corridor =
      destChina && destChina.lat >= 38 && destChina.lng >= 110 ? SIBERIA : SILK;
  } else if (regions.has("europe") && regions.has("russia")) {
    if (haversineKm(from, to) < 1800) return [];
    corridor = [SIBERIA[0]!, SIBERIA[1]!];
  } else if (regions.has("russia") && regions.has("china")) {
    const farEast = from.lng > 120 || to.lng > 120;
    corridor = farEast ? [SIBERIA[4]!] : [SILK[3]!, SILK[4]!];
  }

  const minLng = Math.min(from.lng, to.lng) + 3;
  const maxLng = Math.max(from.lng, to.lng) - 3;
  return corridor.filter((via) => via.lng > minLng && via.lng < maxLng);
}

function pathString(points: LngLat[]): string {
  return points.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
}

async function osrmRoute(points: LngLat[], signal: AbortSignal): Promise<RoadRoute> {
  const path = pathString(points);
  const query = "overview=full&geometries=geojson&steps=false&annotations=false";
  let lastError: Error | null = null;

  for (const base of OSRM_ENDPOINTS) {
    try {
      const response = await fetch(`${base}/${path}?${query}`, { signal });
      if (!response.ok) {
        lastError = new Error(`OSRM ${response.status}`);
        continue;
      }
      const body = (await response.json()) as {
        code?: string;
        routes?: {
          distance: number;
          geometry?: { coordinates?: [number, number][] };
        }[];
      };
      const geometry = body.routes?.[0]?.geometry?.coordinates;
      if (body.code !== "Ok" || !geometry || geometry.length < 2) {
        lastError = new Error("No route");
        continue;
      }
      const km = (body.routes?.[0]?.distance ?? 0) / 1000;
      return { coordinates: geometry, km: km || lineDistanceKm(geometry), onRoad: true };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      lastError = error instanceof Error ? error : new Error("OSRM failed");
    }
  }

  throw lastError ?? new Error("OSRM failed");
}

export async function fetchRoadRoute(from: Hub, to: Hub): Promise<RoadRoute> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 18000);
  const vias = corridorVias(from, to);
  const direct = [from, to];
  const withVias = [from, ...vias, to];

  try {
    try {
      return await osrmRoute(vias.length ? withVias : direct, controller.signal);
    } catch {
      if (vias.length) {
        return await osrmRoute(direct, controller.signal);
      }
      throw new Error("No road");
    }
  } catch {
    const coordinates = greatCircle(from, to);
    return { coordinates, km: lineDistanceKm(coordinates), onRoad: false };
  } finally {
    window.clearTimeout(timer);
  }
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}
