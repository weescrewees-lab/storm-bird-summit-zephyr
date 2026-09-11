import { useEffect, useRef, useState } from "react";
import { formatUsd, totalRevenue } from "@/lib/freight";
import { useOpsStore } from "@/store/ops";

function useAnimatedNumber(target: number): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);

  useEffect(() => {
    const from = valueRef.current;
    if (from === target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      valueRef.current = target;
      setValue(target);
      return;
    }
    const delta = target - from;
    const duration = Math.min(900, 280 + Math.abs(delta) / 8000);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + delta * eased);
      valueRef.current = next;
      setValue(next);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

export function RevenueChip() {
  const lanes = useOpsStore((s) => s.lanes);
  const target = totalRevenue(lanes.map((lane) => lane.quote));
  const amount = useAnimatedNumber(target);

  return (
    <div className="revenue-chip" aria-live="polite" aria-label="Revenue">
      <span className="revenue-chip__label">Revenue</span>
      <span className="revenue-chip__amount">{formatUsd(amount)}</span>
    </div>
  );
}
