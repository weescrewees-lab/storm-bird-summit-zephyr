import { createFileRoute } from "@tanstack/react-router";
import { RevenueChip } from "@/components/revenue-chip";
import { SatelliteMap } from "@/components/satellite-map";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="map-stage">
      <h1 className="sr-only">Meridian satellite freight map</h1>
      <SatelliteMap />
      <RevenueChip />
    </main>
  );
}
