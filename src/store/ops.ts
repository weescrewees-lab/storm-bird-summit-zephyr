import { create } from "zustand";
import { pairKey } from "@/lib/routing";

const STORAGE_KEY = "meridian-ops";

export type Lane = {
  id: string;
  fromId: string;
  toId: string;
  coordinates: [number, number][];
  km: number;
  quote: number;
  onRoad: boolean;
  etaMinutes?: number;
  demand?: number;
};

type OpsState = {
  originId: string | null;
  pendingTo: string | null;
  routing: boolean;
  lanes: Lane[];
  setOrigin: (id: string | null) => void;
  setPending: (toId: string | null, routing: boolean) => void;
  addLane: (lane: Lane) => void;
  hasLane: (a: string, b: string) => boolean;
};

function readLanes(): Lane[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { lanes?: Lane[] };
    return Array.isArray(parsed.lanes) ? parsed.lanes : [];
  } catch {
    return [];
  }
}

function writeLanes(lanes: Lane[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ lanes }));
  } catch {
    /* quota */
  }
}

export const useOpsStore = create<OpsState>((set, get) => ({
  originId: null,
  pendingTo: null,
  routing: false,
  lanes: readLanes(),
  setOrigin: (id) => set({ originId: id, pendingTo: null, routing: false }),
  setPending: (toId, routing) => set({ pendingTo: toId, routing }),
  addLane: (lane) => {
    const lanes = [...get().lanes, lane];
    writeLanes(lanes);
    set({
      lanes,
      originId: null,
      pendingTo: null,
      routing: false,
    });
  },
  hasLane: (a, b) => {
    const key = pairKey(a, b);
    return get().lanes.some((lane) => pairKey(lane.fromId, lane.toId) === key);
  },
}));
