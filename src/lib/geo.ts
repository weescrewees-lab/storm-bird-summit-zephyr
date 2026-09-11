export type LngLat = { lng: number; lat: number };

export function haversineKm(a: LngLat, b: LngLat): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sin =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(sin)));
}

export function greatCircle(
  a: LngLat,
  b: LngLat,
  stepKm = 60,
): [number, number][] {
  const km = haversineKm(a, b);
  const steps = Math.max(2, Math.round(km / stepKm));
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lng1 = toRad(a.lng);
  const lat2 = toRad(b.lat);
  const lng2 = toRad(b.lng);
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2,
      ),
    );
  if (d < 1e-9) return [[a.lng, a.lat], [b.lng, b.lat]];

  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i += 1) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    coords.push([toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))]);
  }
  return coords;
}

export function lineDistanceKm(coordinates: [number, number][]): number {
  let km = 0;
  for (let i = 1; i < coordinates.length; i += 1) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    if (!prev || !curr) continue;
    km += haversineKm(
      { lng: prev[0], lat: prev[1] },
      { lng: curr[0], lat: curr[1] },
    );
  }
  return km;
}
