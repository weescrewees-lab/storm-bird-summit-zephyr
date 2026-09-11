import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RevenueChip } from "@/components/revenue-chip";
import { SatelliteMap } from "@/components/satellite-map";
import { HUBS } from "@/data/hubs";
import { useOpsStore } from "@/store/ops";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<"all" | "europe" | "russia" | "china">("all");
  const lanes = useOpsStore((state) => state.lanes);
  const originId = useOpsStore((state) => state.originId);
  const routing = useOpsStore((state) => state.routing);
  const filteredHubs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return HUBS.filter((hub) => {
      const matchesRegion = region === "all" || hub.region === region;
      const matchesQuery = !normalized || hub.name.toLowerCase().includes(normalized);
      return matchesRegion && matchesQuery;
    }).slice(0, 12);
  }, [query, region]);

  const selectHub = (id: string) => {
    (window as Window & { __selectHub?: (hubId: string) => void }).__selectHub?.(id);
  };

  return (
    <main className="map-stage">
      <h1 className="sr-only">Meridian logistics manager</h1>
      <SatelliteMap />
      <RevenueChip />
      <header className="ops-brand" aria-label="Meridian Logistics Manager">
        <span className="ops-brand__mark">M</span>
        <span><strong>MERIDIAN</strong><small>LOGISTICS MANAGER</small></span>
      </header>
      <aside className="dispatch-panel" aria-label="Dispatch controls">
        <div className="dispatch-panel__eyebrow">NETWORK CONTROL / 01</div>
        <h2>Build your freight network</h2>
        <p className="dispatch-panel__hint">
          {originId ? "Select a destination city on the map." : "Select an origin city to open a lane."}
        </p>
        <label className="city-search">
          <span className="sr-only">Search city</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a city" />
          <span aria-hidden="true">⌕</span>
        </label>
        <div className="region-tabs" role="tablist" aria-label="Regions">
          {(["all", "europe", "russia", "china"] as const).map((item) => (
            <button key={item} className={region === item ? "is-active" : ""} onClick={() => setRegion(item)} role="tab" aria-selected={region === item}>
              {item === "all" ? "All" : item}
            </button>
          ))}
        </div>
        <div className="city-list">
          {filteredHubs.map((hub) => (
            <button className="city-row" key={hub.id} onClick={() => selectHub(hub.id)} disabled={routing}>
              <span className={`city-dot city-dot--${hub.region}`} />
              <span><strong>{hub.name}</strong><small>{hub.region} / {hub.lat.toFixed(2)}°N</small></span>
              <span className="city-arrow">→</span>
            </button>
          ))}
        </div>
        <footer className="dispatch-panel__footer"><span>{lanes.length.toString().padStart(2, "0")} ACTIVE LANES</span><span className={routing ? "is-live" : ""}>{routing ? "CALCULATING" : "SYSTEM LIVE"}</span></footer>
      </aside>
      <div className="map-legend" aria-label="Map legend"><span><i className="legend-dot legend-dot--europe" />EUROPE</span><span><i className="legend-dot legend-dot--russia" />RUSSIA</span><span><i className="legend-dot legend-dot--china" />CHINA</span></div>
    </main>
  );
}
