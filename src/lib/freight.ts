const OPENING_BOOK = 12_480_000;

export function openingBook(): number {
  return OPENING_BOOK;
}

export function quoteLane(distanceKm: number): number {
  const km = Math.max(80, distanceKm);
  const weeklyLoads = km > 4500 ? 1 : km > 2200 ? 2 : km > 900 ? 3 : 5;
  const usdPerKm = 1.74;
  const weeks = 50;
  const raw = weeklyLoads * weeks * km * usdPerKm;
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
