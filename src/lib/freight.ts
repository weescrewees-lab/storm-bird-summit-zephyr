const OPENING_BOOK = 12_480_000;

export function openingBook(): number {
  return OPENING_BOOK;
}

export function routeEtaMinutes(distanceKm: number, demand = 1, facilityBonus = 0): number {
  const base = Math.min(120, Math.max(60, Math.round(60 + distanceKm / 85)));
  const demandFactor = Math.max(0.86, Math.min(1.2, 1 + (demand - 1) * 0.06));
  return Math.max(60, Math.min(120, Math.round(base * demandFactor - facilityBonus)));
}

export function laneDemand(distanceKm: number, fromCapacity = 1, toCapacity = 1): number {
  const distanceFactor = Math.max(0.7, Math.min(1.45, 1800 / Math.max(400, distanceKm)));
  return Math.round(Math.max(1, Math.min(5, distanceFactor * (fromCapacity + toCapacity) * 1.5)));
}

export function quoteLane(distanceKm: number, demand = 1, facilityBonus = 1): number {
  const km = Math.max(80, distanceKm);
  const weeklyLoads = km > 4500 ? 1 : km > 2200 ? 2 : km > 900 ? 3 : 5;
  const usdPerKm = 1.74;
  const weeks = 50;
  const demandMultiplier = 0.78 + Math.max(1, Math.min(5, demand)) * 0.13;
  const raw = weeklyLoads * weeks * km * usdPerKm * demandMultiplier * Math.max(0.9, Math.min(1.2, facilityBonus));
  return Math.round(raw / 1000) * 1000;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function totalRevenue(quotes: number[]): number {
  return OPENING_BOOK + quotes.reduce((sum, q) => sum + q, 0);
}
