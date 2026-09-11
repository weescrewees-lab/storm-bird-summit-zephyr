import { i as __toESM } from "../_runtime.mjs";
import { L as require_react, v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as create } from "../_libs/zustand.mjs";
import { i as ya, n as Sh, r as gm, t as Em } from "../_libs/maplibre-gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-D61Wubs-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var OPENING_BOOK = 1248e4;
function quoteLane(distanceKm) {
	const km = Math.max(80, distanceKm);
	const raw = (km > 4500 ? 1 : km > 2200 ? 2 : km > 900 ? 3 : 5) * 50 * km * 1.74;
	return Math.round(raw / 1e3) * 1e3;
}
function formatUsd(amount) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0
	}).format(amount);
}
function totalRevenue(quotes) {
	return OPENING_BOOK + quotes.reduce((sum, q) => sum + q, 0);
}
function haversineKm(a, b) {
	const R = 6371;
	const toRad = (d) => d * Math.PI / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const sin = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(sin)));
}
function greatCircle(a, b, stepKm = 60) {
	const km = haversineKm(a, b);
	const steps = Math.max(2, Math.round(km / stepKm));
	const toRad = (d) => d * Math.PI / 180;
	const toDeg = (r) => r * 180 / Math.PI;
	const lat1 = toRad(a.lat);
	const lng1 = toRad(a.lng);
	const lat2 = toRad(b.lat);
	const lng2 = toRad(b.lng);
	const d = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2));
	if (d < 1e-9) return [[a.lng, a.lat], [b.lng, b.lat]];
	const coords = [];
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
function lineDistanceKm(coordinates) {
	let km = 0;
	for (let i = 1; i < coordinates.length; i += 1) {
		const prev = coordinates[i - 1];
		const curr = coordinates[i];
		if (!prev || !curr) continue;
		km += haversineKm({
			lng: prev[0],
			lat: prev[1]
		}, {
			lng: curr[0],
			lat: curr[1]
		});
	}
	return km;
}
var SILK = [
	{
		lng: 27.5615,
		lat: 53.9006
	},
	{
		lng: 49.1221,
		lat: 55.8304
	},
	{
		lng: 71.4704,
		lat: 51.1605
	},
	{
		lng: 80.4136,
		lat: 44.2231
	},
	{
		lng: 87.6168,
		lat: 43.8256
	},
	{
		lng: 103.8343,
		lat: 36.0611
	}
];
var SIBERIA = [
	{
		lng: 37.6173,
		lat: 55.7558
	},
	{
		lng: 60.6057,
		lat: 56.8389
	},
	{
		lng: 82.9357,
		lat: 55.0084
	},
	{
		lng: 104.2807,
		lat: 52.287
	},
	{
		lng: 117.4792,
		lat: 49.5977
	}
];
var OSRM_ENDPOINTS = ["https://router.project-osrm.org/route/v1/driving", "https://routing.openstreetmap.de/routed-car/route/v1/driving"];
function corridorVias(from, to) {
	const regions = /* @__PURE__ */ new Set([from.region, to.region]);
	if (regions.size === 1) return [];
	const destChina = from.region === "china" ? from : to.region === "china" ? to : null;
	let corridor = [];
	if (regions.has("europe") && regions.has("china")) corridor = destChina && destChina.lat >= 38 && destChina.lng >= 110 ? SIBERIA : SILK;
	else if (regions.has("europe") && regions.has("russia")) {
		if (haversineKm(from, to) < 1800) return [];
		corridor = [SIBERIA[0], SIBERIA[1]];
	} else if (regions.has("russia") && regions.has("china")) corridor = from.lng > 120 || to.lng > 120 ? [SIBERIA[4]] : [SILK[3], SILK[4]];
	const minLng = Math.min(from.lng, to.lng) + 3;
	const maxLng = Math.max(from.lng, to.lng) - 3;
	return corridor.filter((via) => via.lng > minLng && via.lng < maxLng);
}
function pathString(points) {
	return points.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
}
async function osrmRoute(points, signal) {
	const path = pathString(points);
	const query = "overview=full&geometries=geojson&steps=false&annotations=false";
	let lastError = null;
	for (const base of OSRM_ENDPOINTS) try {
		const response = await fetch(`${base}/${path}?${query}`, { signal });
		if (!response.ok) {
			lastError = /* @__PURE__ */ new Error(`OSRM ${response.status}`);
			continue;
		}
		const body = await response.json();
		const geometry = body.routes?.[0]?.geometry?.coordinates;
		if (body.code !== "Ok" || !geometry || geometry.length < 2) {
			lastError = /* @__PURE__ */ new Error("No route");
			continue;
		}
		return {
			coordinates: geometry,
			km: (body.routes?.[0]?.distance ?? 0) / 1e3 || lineDistanceKm(geometry),
			onRoad: true
		};
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") throw error;
		lastError = error instanceof Error ? error : /* @__PURE__ */ new Error("OSRM failed");
	}
	throw lastError ?? /* @__PURE__ */ new Error("OSRM failed");
}
async function fetchRoadRoute(from, to) {
	const controller = new AbortController();
	const timer = window.setTimeout(() => controller.abort(), 18e3);
	const vias = corridorVias(from, to);
	const direct = [from, to];
	const withVias = [
		from,
		...vias,
		to
	];
	try {
		try {
			return await osrmRoute(vias.length ? withVias : direct, controller.signal);
		} catch {
			if (vias.length) return await osrmRoute(direct, controller.signal);
			throw new Error("No road");
		}
	} catch {
		const coordinates = greatCircle(from, to);
		return {
			coordinates,
			km: lineDistanceKm(coordinates),
			onRoad: false
		};
	} finally {
		window.clearTimeout(timer);
	}
}
function pairKey(a, b) {
	return a < b ? `${a}__${b}` : `${b}__${a}`;
}
var STORAGE_KEY = "meridian-ops";
function readLanes() {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed.lanes) ? parsed.lanes : [];
	} catch {
		return [];
	}
}
function writeLanes(lanes) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ lanes }));
	} catch {}
}
var useOpsStore = create((set, get) => ({
	originId: null,
	pendingTo: null,
	routing: false,
	lanes: readLanes(),
	setOrigin: (id) => set({
		originId: id,
		pendingTo: null,
		routing: false
	}),
	setPending: (toId, routing) => set({
		pendingTo: toId,
		routing
	}),
	addLane: (lane) => {
		const lanes = [...get().lanes, lane];
		writeLanes(lanes);
		set({
			lanes,
			originId: null,
			pendingTo: null,
			routing: false
		});
	},
	hasLane: (a, b) => {
		const key = pairKey(a, b);
		return get().lanes.some((lane) => pairKey(lane.fromId, lane.toId) === key);
	}
}));
function useAnimatedNumber(target) {
	const [value, setValue] = (0, import_react.useState)(target);
	const valueRef = (0, import_react.useRef)(target);
	(0, import_react.useEffect)(() => {
		const from = valueRef.current;
		if (from === target) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			valueRef.current = target;
			setValue(target);
			return;
		}
		const delta = target - from;
		const duration = Math.min(900, 280 + Math.abs(delta) / 8e3);
		const start = performance.now();
		let frame = 0;
		const tick = (now) => {
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
function RevenueChip() {
	const amount = useAnimatedNumber(totalRevenue(useOpsStore((s) => s.lanes).map((lane) => lane.quote)));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "revenue-chip",
		"aria-live": "polite",
		"aria-label": "Revenue",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "revenue-chip__label",
			children: "Revenue"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "revenue-chip__amount",
			children: formatUsd(amount)
		})]
	});
}
var HUBS = [
	[
		"london",
		"London",
		"europe",
		-.1276,
		51.5072
	],
	[
		"manchester",
		"Manchester",
		"europe",
		-2.2426,
		53.4808
	],
	[
		"birmingham",
		"Birmingham",
		"europe",
		-1.8904,
		52.4862
	],
	[
		"edinburgh",
		"Edinburgh",
		"europe",
		-3.1883,
		55.9533
	],
	[
		"dublin",
		"Dublin",
		"europe",
		-6.2603,
		53.3498
	],
	[
		"paris",
		"Paris",
		"europe",
		2.3522,
		48.8566
	],
	[
		"lyon",
		"Lyon",
		"europe",
		4.8357,
		45.764
	],
	[
		"marseille",
		"Marseille",
		"europe",
		5.3698,
		43.2965
	],
	[
		"lille",
		"Lille",
		"europe",
		3.0573,
		50.6292
	],
	[
		"toulouse",
		"Toulouse",
		"europe",
		1.4442,
		43.6047
	],
	[
		"bordeaux",
		"Bordeaux",
		"europe",
		-.5792,
		44.8378
	],
	[
		"le-havre",
		"Le Havre",
		"europe",
		.1079,
		49.4944
	],
	[
		"strasbourg",
		"Strasbourg",
		"europe",
		7.7521,
		48.5734
	],
	[
		"brussels",
		"Brussels",
		"europe",
		4.3517,
		50.8503
	],
	[
		"antwerp",
		"Antwerp",
		"europe",
		4.4025,
		51.2194
	],
	[
		"liege",
		"Liège",
		"europe",
		5.5797,
		50.6326
	],
	[
		"amsterdam",
		"Amsterdam",
		"europe",
		4.9041,
		52.3676
	],
	[
		"rotterdam",
		"Rotterdam",
		"europe",
		4.47917,
		51.9225
	],
	[
		"eindhoven",
		"Eindhoven",
		"europe",
		5.4697,
		51.4416
	],
	[
		"luxembourg",
		"Luxembourg",
		"europe",
		6.1319,
		49.6116
	],
	[
		"berlin",
		"Berlin",
		"europe",
		13.405,
		52.52
	],
	[
		"hamburg",
		"Hamburg",
		"europe",
		9.9937,
		53.5511
	],
	[
		"munich",
		"Munich",
		"europe",
		11.582,
		48.1351
	],
	[
		"frankfurt",
		"Frankfurt",
		"europe",
		8.6821,
		50.1109
	],
	[
		"cologne",
		"Cologne",
		"europe",
		6.9603,
		50.9375
	],
	[
		"stuttgart",
		"Stuttgart",
		"europe",
		9.1829,
		48.7758
	],
	[
		"leipzig",
		"Leipzig",
		"europe",
		12.3731,
		51.3397
	],
	[
		"dusseldorf",
		"Düsseldorf",
		"europe",
		6.7735,
		51.2277
	],
	[
		"duisburg",
		"Duisburg",
		"europe",
		6.7623,
		51.4344
	],
	[
		"hannover",
		"Hannover",
		"europe",
		9.732,
		52.3759
	],
	[
		"nuremberg",
		"Nuremberg",
		"europe",
		11.0767,
		49.4521
	],
	[
		"dresden",
		"Dresden",
		"europe",
		13.7373,
		51.0504
	],
	[
		"zurich",
		"Zurich",
		"europe",
		8.5417,
		47.3769
	],
	[
		"geneva",
		"Geneva",
		"europe",
		6.1432,
		46.2044
	],
	[
		"basel",
		"Basel",
		"europe",
		7.5886,
		47.5596
	],
	[
		"vienna",
		"Vienna",
		"europe",
		16.3738,
		48.2082
	],
	[
		"graz",
		"Graz",
		"europe",
		15.4395,
		47.0707
	],
	[
		"linz",
		"Linz",
		"europe",
		14.2858,
		48.3069
	],
	[
		"prague",
		"Prague",
		"europe",
		14.4378,
		50.0755
	],
	[
		"brno",
		"Brno",
		"europe",
		16.6068,
		49.1951
	],
	[
		"warsaw",
		"Warsaw",
		"europe",
		21.0122,
		52.2297
	],
	[
		"krakow",
		"Kraków",
		"europe",
		19.945,
		50.0647
	],
	[
		"gdansk",
		"Gdańsk",
		"europe",
		18.6466,
		54.352
	],
	[
		"wroclaw",
		"Wrocław",
		"europe",
		17.0385,
		51.1079
	],
	[
		"poznan",
		"Poznań",
		"europe",
		16.9252,
		52.4064
	],
	[
		"lodz",
		"Łódź",
		"europe",
		19.456,
		51.7592
	],
	[
		"budapest",
		"Budapest",
		"europe",
		19.0402,
		47.4979
	],
	[
		"bratislava",
		"Bratislava",
		"europe",
		17.1077,
		48.1486
	],
	[
		"ljubljana",
		"Ljubljana",
		"europe",
		14.5058,
		46.0569
	],
	[
		"zagreb",
		"Zagreb",
		"europe",
		15.9819,
		45.815
	],
	[
		"split",
		"Split",
		"europe",
		16.4402,
		43.5081
	],
	[
		"belgrade",
		"Belgrade",
		"europe",
		20.4489,
		44.7866
	],
	[
		"sarajevo",
		"Sarajevo",
		"europe",
		18.4131,
		43.8563
	],
	[
		"skopje",
		"Skopje",
		"europe",
		21.4314,
		41.9981
	],
	[
		"tirana",
		"Tirana",
		"europe",
		19.8187,
		41.3275
	],
	[
		"sofia",
		"Sofia",
		"europe",
		23.3219,
		42.6977
	],
	[
		"plovdiv",
		"Plovdiv",
		"europe",
		24.7453,
		42.1354
	],
	[
		"varna",
		"Varna",
		"europe",
		27.9147,
		43.2141
	],
	[
		"bucharest",
		"Bucharest",
		"europe",
		26.1025,
		44.4268
	],
	[
		"cluj",
		"Cluj-Napoca",
		"europe",
		23.6236,
		46.7712
	],
	[
		"constanta",
		"Constanța",
		"europe",
		28.6348,
		44.1598
	],
	[
		"chisinau",
		"Chișinău",
		"europe",
		28.8575,
		47.0105
	],
	[
		"kyiv",
		"Kyiv",
		"europe",
		30.5234,
		50.4501
	],
	[
		"lviv",
		"Lviv",
		"europe",
		24.0297,
		49.8397
	],
	[
		"odesa",
		"Odesa",
		"europe",
		30.7233,
		46.4825
	],
	[
		"kharkiv",
		"Kharkiv",
		"europe",
		36.2304,
		49.9935
	],
	[
		"dnipro",
		"Dnipro",
		"europe",
		35.0462,
		48.4647
	],
	[
		"minsk",
		"Minsk",
		"europe",
		27.5615,
		53.9006
	],
	[
		"riga",
		"Riga",
		"europe",
		24.1052,
		56.9496
	],
	[
		"vilnius",
		"Vilnius",
		"europe",
		25.2797,
		54.6872
	],
	[
		"tallinn",
		"Tallinn",
		"europe",
		24.7536,
		59.437
	],
	[
		"stockholm",
		"Stockholm",
		"europe",
		18.0686,
		59.3293
	],
	[
		"gothenburg",
		"Gothenburg",
		"europe",
		11.9746,
		57.7089
	],
	[
		"malmo",
		"Malmö",
		"europe",
		13.0038,
		55.605
	],
	[
		"copenhagen",
		"Copenhagen",
		"europe",
		12.5683,
		55.6761
	],
	[
		"oslo",
		"Oslo",
		"europe",
		10.7522,
		59.9139
	],
	[
		"bergen",
		"Bergen",
		"europe",
		5.3221,
		60.3913
	],
	[
		"helsinki",
		"Helsinki",
		"europe",
		24.9384,
		60.1699
	],
	[
		"tampere",
		"Tampere",
		"europe",
		23.761,
		61.4978
	],
	[
		"madrid",
		"Madrid",
		"europe",
		-3.7038,
		40.4168
	],
	[
		"barcelona",
		"Barcelona",
		"europe",
		2.1734,
		41.3851
	],
	[
		"valencia",
		"Valencia",
		"europe",
		-.3763,
		39.4699
	],
	[
		"seville",
		"Seville",
		"europe",
		-5.9845,
		37.3891
	],
	[
		"bilbao",
		"Bilbao",
		"europe",
		-2.935,
		43.263
	],
	[
		"zaragoza",
		"Zaragoza",
		"europe",
		-.8891,
		41.6488
	],
	[
		"lisbon",
		"Lisbon",
		"europe",
		-9.1393,
		38.7223
	],
	[
		"porto",
		"Porto",
		"europe",
		-8.6291,
		41.1579
	],
	[
		"rome",
		"Rome",
		"europe",
		12.4964,
		41.9028
	],
	[
		"milan",
		"Milan",
		"europe",
		9.19,
		45.4642
	],
	[
		"naples",
		"Naples",
		"europe",
		14.2681,
		40.8518
	],
	[
		"turin",
		"Turin",
		"europe",
		7.6869,
		45.0703
	],
	[
		"bologna",
		"Bologna",
		"europe",
		11.3426,
		44.4949
	],
	[
		"genoa",
		"Genoa",
		"europe",
		8.9463,
		44.4056
	],
	[
		"venice",
		"Venice",
		"europe",
		12.3155,
		45.4408
	],
	[
		"bari",
		"Bari",
		"europe",
		16.8719,
		41.1171
	],
	[
		"palermo",
		"Palermo",
		"europe",
		13.3615,
		38.1157
	],
	[
		"athens",
		"Athens",
		"europe",
		23.7275,
		37.9838
	],
	[
		"thessaloniki",
		"Thessaloniki",
		"europe",
		22.9444,
		40.6401
	],
	[
		"istanbul",
		"Istanbul",
		"europe",
		28.9784,
		41.0082
	],
	[
		"moscow",
		"Moscow",
		"russia",
		37.6173,
		55.7558
	],
	[
		"petersburg",
		"Saint Petersburg",
		"russia",
		30.3609,
		59.9311
	],
	[
		"novosibirsk",
		"Novosibirsk",
		"russia",
		82.9357,
		55.0084
	],
	[
		"yekaterinburg",
		"Yekaterinburg",
		"russia",
		60.6057,
		56.8389
	],
	[
		"kazan",
		"Kazan",
		"russia",
		49.1221,
		55.8304
	],
	[
		"nizhny",
		"Nizhny Novgorod",
		"russia",
		44.002,
		56.2965
	],
	[
		"chelyabinsk",
		"Chelyabinsk",
		"russia",
		61.4368,
		55.1644
	],
	[
		"samara",
		"Samara",
		"russia",
		50.1002,
		53.1959
	],
	[
		"omsk",
		"Omsk",
		"russia",
		73.3686,
		54.9885
	],
	[
		"rostov",
		"Rostov-on-Don",
		"russia",
		39.7015,
		47.2357
	],
	[
		"ufa",
		"Ufa",
		"russia",
		55.9721,
		54.7388
	],
	[
		"krasnoyarsk",
		"Krasnoyarsk",
		"russia",
		92.8932,
		56.0153
	],
	[
		"voronezh",
		"Voronezh",
		"russia",
		39.1843,
		51.6605
	],
	[
		"perm",
		"Perm",
		"russia",
		56.2502,
		58.0105
	],
	[
		"volgograd",
		"Volgograd",
		"russia",
		44.5133,
		48.708
	],
	[
		"krasnodar",
		"Krasnodar",
		"russia",
		38.9753,
		45.0355
	],
	[
		"saratov",
		"Saratov",
		"russia",
		46.0347,
		51.5924
	],
	[
		"tyumen",
		"Tyumen",
		"russia",
		65.5272,
		57.1522
	],
	[
		"tolyatti",
		"Tolyatti",
		"russia",
		49.4204,
		53.5078
	],
	[
		"izhevsk",
		"Izhevsk",
		"russia",
		53.2115,
		56.8528
	],
	[
		"barnaul",
		"Barnaul",
		"russia",
		83.7698,
		53.3548
	],
	[
		"irkutsk",
		"Irkutsk",
		"russia",
		104.2807,
		52.287
	],
	[
		"khabarovsk",
		"Khabarovsk",
		"russia",
		135.072,
		48.4827
	],
	[
		"vladivostok",
		"Vladivostok",
		"russia",
		131.8855,
		43.1155
	],
	[
		"tomsk",
		"Tomsk",
		"russia",
		84.9482,
		56.4846
	],
	[
		"kemerovo",
		"Kemerovo",
		"russia",
		86.0873,
		55.3543
	],
	[
		"novokuznetsk",
		"Novokuznetsk",
		"russia",
		87.1361,
		53.7557
	],
	[
		"ryazan",
		"Ryazan",
		"russia",
		39.7342,
		54.6269
	],
	[
		"astrakhan",
		"Astrakhan",
		"russia",
		48.0408,
		46.3497
	],
	[
		"penza",
		"Penza",
		"russia",
		45.0183,
		53.195
	],
	[
		"lipetsk",
		"Lipetsk",
		"russia",
		39.5992,
		52.6031
	],
	[
		"tula",
		"Tula",
		"russia",
		37.6173,
		54.193
	],
	[
		"kaliningrad",
		"Kaliningrad",
		"russia",
		20.5108,
		54.7104
	],
	[
		"murmansk",
		"Murmansk",
		"russia",
		33.0827,
		68.9585
	],
	[
		"arkhangelsk",
		"Arkhangelsk",
		"russia",
		40.5433,
		64.5461
	],
	[
		"sochi",
		"Sochi",
		"russia",
		39.7231,
		43.6028
	],
	[
		"yakutsk",
		"Yakutsk",
		"russia",
		129.735,
		62.0355
	],
	[
		"ulan-ude",
		"Ulan-Ude",
		"russia",
		107.5841,
		51.8335
	],
	[
		"chita",
		"Chita",
		"russia",
		113.501,
		52.0515
	],
	[
		"blagoveshchensk",
		"Blagoveshchensk",
		"russia",
		127.5405,
		50.2906
	],
	[
		"novorossiysk",
		"Novorossiysk",
		"russia",
		37.7689,
		44.7239
	],
	[
		"orenburg",
		"Orenburg",
		"russia",
		55.1018,
		51.7682
	],
	[
		"magnitogorsk",
		"Magnitogorsk",
		"russia",
		58.9793,
		53.4072
	],
	[
		"surgut",
		"Surgut",
		"russia",
		73.3962,
		61.254
	],
	[
		"nizhnevartovsk",
		"Nizhnevartovsk",
		"russia",
		76.5696,
		60.9397
	],
	[
		"stavropol",
		"Stavropol",
		"russia",
		41.9691,
		45.0448
	],
	[
		"makhachkala",
		"Makhachkala",
		"russia",
		47.5047,
		42.9849
	],
	[
		"cheboksary",
		"Cheboksary",
		"russia",
		47.2489,
		56.1439
	],
	[
		"kirov",
		"Kirov",
		"russia",
		49.668,
		58.6035
	],
	[
		"tver",
		"Tver",
		"russia",
		35.9176,
		56.8587
	],
	[
		"smolensk",
		"Smolensk",
		"russia",
		32.0453,
		54.7826
	],
	[
		"kursk",
		"Kursk",
		"russia",
		36.1873,
		51.7373
	],
	[
		"belgorod",
		"Belgorod",
		"russia",
		36.5983,
		50.5997
	],
	[
		"vologda",
		"Vologda",
		"russia",
		39.8915,
		59.2205
	],
	[
		"kaluga",
		"Kaluga",
		"russia",
		36.2612,
		54.5138
	],
	[
		"beijing",
		"Beijing",
		"china",
		116.4074,
		39.9042
	],
	[
		"shanghai",
		"Shanghai",
		"china",
		121.4737,
		31.2304
	],
	[
		"guangzhou",
		"Guangzhou",
		"china",
		113.2644,
		23.1291
	],
	[
		"shenzhen",
		"Shenzhen",
		"china",
		114.0579,
		22.5431
	],
	[
		"chengdu",
		"Chengdu",
		"china",
		104.0668,
		30.5728
	],
	[
		"chongqing",
		"Chongqing",
		"china",
		106.5516,
		29.563
	],
	[
		"tianjin",
		"Tianjin",
		"china",
		117.3616,
		39.3434
	],
	[
		"wuhan",
		"Wuhan",
		"china",
		114.3055,
		30.5928
	],
	[
		"xian",
		"Xi'an",
		"china",
		108.9398,
		34.3416
	],
	[
		"hangzhou",
		"Hangzhou",
		"china",
		120.1551,
		30.2741
	],
	[
		"nanjing",
		"Nanjing",
		"china",
		118.7969,
		32.0603
	],
	[
		"suzhou",
		"Suzhou",
		"china",
		120.5853,
		31.2989
	],
	[
		"qingdao",
		"Qingdao",
		"china",
		120.3826,
		36.0671
	],
	[
		"zhengzhou",
		"Zhengzhou",
		"china",
		113.6253,
		34.7466
	],
	[
		"changsha",
		"Changsha",
		"china",
		112.9388,
		28.2282
	],
	[
		"shenyang",
		"Shenyang",
		"china",
		123.4315,
		41.8057
	],
	[
		"harbin",
		"Harbin",
		"china",
		126.5349,
		45.8038
	],
	[
		"dalian",
		"Dalian",
		"china",
		121.6147,
		38.914
	],
	[
		"jinan",
		"Jinan",
		"china",
		117.1205,
		36.6512
	],
	[
		"fuzhou",
		"Fuzhou",
		"china",
		119.2965,
		26.0745
	],
	[
		"xiamen",
		"Xiamen",
		"china",
		118.0894,
		24.4798
	],
	[
		"kunming",
		"Kunming",
		"china",
		102.8329,
		24.8801
	],
	[
		"hefei",
		"Hefei",
		"china",
		117.2272,
		31.8206
	],
	[
		"nanning",
		"Nanning",
		"china",
		108.3669,
		22.817
	],
	[
		"taiyuan",
		"Taiyuan",
		"china",
		112.5489,
		37.8706
	],
	[
		"shijiazhuang",
		"Shijiazhuang",
		"china",
		114.5149,
		38.0428
	],
	[
		"changchun",
		"Changchun",
		"china",
		125.3235,
		43.8171
	],
	[
		"wuxi",
		"Wuxi",
		"china",
		120.3119,
		31.491
	],
	[
		"ningbo",
		"Ningbo",
		"china",
		121.544,
		29.8683
	],
	[
		"foshan",
		"Foshan",
		"china",
		113.122,
		23.0215
	],
	[
		"dongguan",
		"Dongguan",
		"china",
		113.7518,
		23.0205
	],
	[
		"wenzhou",
		"Wenzhou",
		"china",
		120.6994,
		27.9939
	],
	[
		"guiyang",
		"Guiyang",
		"china",
		106.6302,
		26.647
	],
	[
		"urumqi",
		"Ürümqi",
		"china",
		87.6168,
		43.8256
	],
	[
		"lanzhou",
		"Lanzhou",
		"china",
		103.8343,
		36.0611
	],
	[
		"hohhot",
		"Hohhot",
		"china",
		111.7519,
		40.8414
	],
	[
		"nanchang",
		"Nanchang",
		"china",
		115.8921,
		28.682
	],
	[
		"haikou",
		"Haikou",
		"china",
		110.1999,
		20.0444
	],
	[
		"lhasa",
		"Lhasa",
		"china",
		91.1409,
		29.6456
	],
	[
		"yinchuan",
		"Yinchuan",
		"china",
		106.2309,
		38.4872
	],
	[
		"xining",
		"Xining",
		"china",
		101.7782,
		36.6171
	],
	[
		"zhuhai",
		"Zhuhai",
		"china",
		113.5767,
		22.271
	],
	[
		"huizhou",
		"Huizhou",
		"china",
		114.416,
		23.1115
	],
	[
		"guilin",
		"Guilin",
		"china",
		110.2902,
		25.2736
	],
	[
		"weifang",
		"Weifang",
		"china",
		119.1619,
		36.7069
	],
	[
		"yantai",
		"Yantai",
		"china",
		121.4478,
		37.4646
	],
	[
		"tangshan",
		"Tangshan",
		"china",
		118.1802,
		39.6309
	],
	[
		"luoyang",
		"Luoyang",
		"china",
		112.4539,
		34.6197
	],
	[
		"xuzhou",
		"Xuzhou",
		"china",
		117.1859,
		34.261
	],
	[
		"nantong",
		"Nantong",
		"china",
		120.8946,
		32.0162
	],
	[
		"changzhou",
		"Changzhou",
		"china",
		119.9741,
		31.811
	],
	[
		"jiaxing",
		"Jiaxing",
		"china",
		120.7555,
		30.7522
	],
	[
		"shaoxing",
		"Shaoxing",
		"china",
		120.5801,
		30.0299
	],
	[
		"quanzhou",
		"Quanzhou",
		"china",
		118.6757,
		24.8741
	],
	[
		"shantou",
		"Shantou",
		"china",
		116.682,
		23.3541
	],
	[
		"zhanjiang",
		"Zhanjiang",
		"china",
		110.3594,
		21.2707
	],
	[
		"liuzhou",
		"Liuzhou",
		"china",
		109.4281,
		24.3264
	],
	[
		"mianyang",
		"Mianyang",
		"china",
		104.6796,
		31.4675
	],
	[
		"kashgar",
		"Kashgar",
		"china",
		75.9898,
		39.4704
	],
	[
		"korla",
		"Korla",
		"china",
		86.1746,
		41.726
	],
	[
		"hami",
		"Hami",
		"china",
		93.5151,
		42.8193
	],
	[
		"baotou",
		"Baotou",
		"china",
		109.8403,
		40.6562
	],
	[
		"datong",
		"Datong",
		"china",
		113.3001,
		40.0768
	],
	[
		"handan",
		"Handan",
		"china",
		114.5391,
		36.6256
	],
	[
		"linyi",
		"Linyi",
		"china",
		118.3564,
		35.1041
	],
	[
		"zibo",
		"Zibo",
		"china",
		118.0548,
		36.8131
	],
	[
		"jilin",
		"Jilin",
		"china",
		126.5494,
		43.8378
	],
	[
		"qiqihar",
		"Qiqihar",
		"china",
		123.9182,
		47.3543
	],
	[
		"anshan",
		"Anshan",
		"china",
		122.9945,
		41.1086
	],
	[
		"jinzhou",
		"Jinzhou",
		"china",
		121.127,
		41.0951
	],
	[
		"yichang",
		"Yichang",
		"china",
		111.2865,
		30.702
	],
	[
		"ganzhou",
		"Ganzhou",
		"china",
		114.9336,
		25.8318
	],
	[
		"ordos",
		"Ordos",
		"china",
		109.7811,
		39.6083
	],
	[
		"golmud",
		"Golmud",
		"china",
		94.9055,
		36.4072
	],
	[
		"shihezi",
		"Shihezi",
		"china",
		86.0804,
		44.3061
	]
].map(([id, name, region, lng, lat]) => ({
	id,
	name,
	region,
	lng,
	lat
}));
var HUB_BY_ID = new Map(HUBS.map((hub) => [hub.id, hub]));
function hubsToGeoJSON() {
	return {
		type: "FeatureCollection",
		features: HUBS.map((hub, index) => ({
			type: "Feature",
			id: index,
			properties: {
				id: hub.id,
				name: hub.name,
				region: hub.region
			},
			geometry: {
				type: "Point",
				coordinates: [hub.lng, hub.lat]
			}
		}))
	};
}
if (typeof window !== "undefined") Sh("/maplibre-gl-worker.mjs");
var INDEX_BY_ID = new Map(HUBS.map((hub, index) => [hub.id, index]));
var STYLE = {
	version: 8,
	glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
	sources: {
		satellite: {
			type: "raster",
			tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
			tileSize: 256,
			maxzoom: 19,
			attribution: "Imagery © Esri, Maxar, Earthstar Geographics"
		},
		places: {
			type: "raster",
			tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
			tileSize: 256,
			maxzoom: 16
		},
		hubs: {
			type: "geojson",
			data: hubsToGeoJSON()
		},
		lanes: {
			type: "geojson",
			data: {
				type: "FeatureCollection",
				features: []
			},
			lineMetrics: true
		},
		preview: {
			type: "geojson",
			data: {
				type: "Feature",
				properties: {},
				geometry: {
					type: "LineString",
					coordinates: []
				}
			}
		}
	},
	layers: [
		{
			id: "satellite",
			type: "raster",
			source: "satellite"
		},
		{
			id: "places",
			type: "raster",
			source: "places",
			paint: { "raster-opacity": .62 }
		},
		{
			id: "preview-line",
			type: "line",
			source: "preview",
			paint: {
				"line-color": "#d7ddd4",
				"line-width": 1.1,
				"line-opacity": .45,
				"line-dasharray": [2, 2]
			}
		},
		{
			id: "lane-casing",
			type: "line",
			source: "lanes",
			layout: {
				"line-cap": "round",
				"line-join": "round"
			},
			paint: {
				"line-color": "#0b0c0b",
				"line-width": 4,
				"line-opacity": .62
			}
		},
		{
			id: "lane-line",
			type: "line",
			source: "lanes",
			layout: {
				"line-cap": "round",
				"line-join": "round"
			},
			paint: {
				"line-color": "#e8ece8",
				"line-width": 2.05,
				"line-opacity": .96,
				"line-gradient": [
					"interpolate",
					["linear"],
					["line-progress"],
					0,
					"#c5ccc4",
					1,
					"#f3f6f2"
				]
			}
		},
		{
			id: "hubs-hit",
			type: "circle",
			source: "hubs",
			paint: {
				"circle-radius": 14,
				"circle-color": "#ffffff",
				"circle-opacity": 0,
				"circle-pitch-alignment": "viewport"
			}
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
					[
						"boolean",
						["feature-state", "origin"],
						false
					],
					.28,
					[
						"boolean",
						["feature-state", "pending"],
						false
					],
					.22,
					0
				],
				"circle-pitch-alignment": "viewport"
			}
		},
		{
			id: "hubs-core",
			type: "circle",
			source: "hubs",
			paint: {
				"circle-radius": 2.4,
				"circle-color": [
					"case",
					[
						"boolean",
						["feature-state", "origin"],
						false
					],
					"#f4f7f3",
					[
						"boolean",
						["feature-state", "pending"],
						false
					],
					"#e7ece6",
					[
						"boolean",
						["feature-state", "active"],
						false
					],
					"#dce3db",
					"#e6eae6"
				],
				"circle-stroke-width": .9,
				"circle-stroke-color": "#0c0d0c",
				"circle-opacity": .96,
				"circle-pitch-alignment": "viewport"
			}
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
				"text-ignore-placement": true
			},
			paint: {
				"text-color": "#f2f4f2",
				"text-halo-color": "#0a0a0b",
				"text-halo-width": 1.15,
				"text-opacity": [
					"case",
					[
						"boolean",
						["feature-state", "origin"],
						false
					],
					1,
					[
						"boolean",
						["feature-state", "pending"],
						false
					],
					1,
					[
						"boolean",
						["feature-state", "hover"],
						false
					],
					1,
					0
				]
			}
		}
	]
};
function lanesToGeoJSON(lanes) {
	return {
		type: "FeatureCollection",
		features: lanes.map((lane) => ({
			type: "Feature",
			properties: { id: lane.id },
			geometry: {
				type: "LineString",
				coordinates: lane.coordinates
			}
		}))
	};
}
function setLineData(map, sourceId, data) {
	const source = map.getSource(sourceId);
	if (source && "setData" in source) source.setData(data);
}
function SatelliteMap() {
	const rootRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const root = rootRef.current;
		if (!root) return;
		let disposed = false;
		let map;
		let hoverIndex;
		let resizeObserver;
		let unsub;
		let onKey;
		const marked = /* @__PURE__ */ new Set();
		const clearPreview = () => {
			if (!map?.getSource("preview")) return;
			setLineData(map, "preview", {
				type: "Feature",
				properties: {},
				geometry: {
					type: "LineString",
					coordinates: []
				}
			});
		};
		const markHub = (index, state) => {
			if (index == null || !map) return;
			map.setFeatureState({
				source: "hubs",
				id: index
			}, state);
			marked.add(index);
		};
		const syncState = () => {
			if (!map?.isStyleLoaded()) return;
			const ops = useOpsStore.getState();
			const next = /* @__PURE__ */ new Set();
			const originIndex = ops.originId ? INDEX_BY_ID.get(ops.originId) : void 0;
			const pendingIndex = ops.pendingTo ? INDEX_BY_ID.get(ops.pendingTo) : void 0;
			if (originIndex != null) next.add(originIndex);
			if (pendingIndex != null) next.add(pendingIndex);
			for (const lane of ops.lanes) {
				const a = INDEX_BY_ID.get(lane.fromId);
				const b = INDEX_BY_ID.get(lane.toId);
				if (a != null) next.add(a);
				if (b != null) next.add(b);
			}
			if (hoverIndex != null) next.add(hoverIndex);
			for (const index of marked) if (!next.has(index)) map.setFeatureState({
				source: "hubs",
				id: index
			}, {
				origin: false,
				pending: false,
				active: false,
				hover: false
			});
			marked.clear();
			for (const index of next) markHub(index, {
				origin: index === originIndex,
				pending: index === pendingIndex,
				active: true,
				hover: index === hoverIndex
			});
			setLineData(map, "lanes", lanesToGeoJSON(ops.lanes));
		};
		const fitLane = (lane) => {
			if (!map) return;
			const bounds = new ya();
			for (const coord of lane.coordinates) bounds.extend(coord);
			const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			const maxZoom = lane.km > 3500 ? 4.6 : lane.km > 1200 ? 5.8 : 7.4;
			map.fitBounds(bounds, {
				padding: {
					top: 72,
					right: 88,
					bottom: 48,
					left: 48
				},
				maxZoom,
				duration: reduce ? 0 : 1100
			});
		};
		const handleHub = async (id) => {
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
				const existing = ops.lanes.find((lane) => pairKey(lane.fromId, lane.toId) === pairKey(ops.originId, id));
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
			const route = await fetchRoadRoute(from, to);
			if (disposed) return;
			const lane = {
				id: `${from.id}__${to.id}__${Date.now()}`,
				fromId: from.id,
				toId: to.id,
				coordinates: route.coordinates,
				km: route.km,
				quote: quoteLane(route.km),
				onRoad: route.onRoad
			};
			useOpsStore.getState().addLane(lane);
			fitLane(lane);
		};
		map = new Em({
			container: root,
			style: STYLE,
			center: [75, 48.2],
			zoom: 3.15,
			minZoom: 2.5,
			maxZoom: 18,
			maxBounds: [[-28, 12], [172, 78]],
			attributionControl: false,
			dragRotate: false,
			pitchWithRotate: false,
			touchPitch: false,
			pitch: 0,
			bearing: 0,
			renderWorldCopies: false,
			fadeDuration: 180,
			pixelRatio: Math.min(window.devicePixelRatio || 1, 2)
		});
		map.addControl(new gm({ compact: true }), "bottom-left");
		map.touchZoomRotate.disableRotation();
		const canvas = map.getCanvas();
		map.on("load", () => {
			if (!disposed) syncState();
		});
		map.on("click", (event) => {
			const id = map.queryRenderedFeatures(event.point, { layers: ["hubs-hit"] })[0]?.properties?.id;
			if (typeof id === "string") {
				handleHub(id);
				return;
			}
			useOpsStore.getState().setOrigin(null);
			clearPreview();
		});
		map.on("mousemove", (event) => {
			if (!map) return;
			const hits = map.queryRenderedFeatures(event.point, { layers: ["hubs-hit"] });
			const nextIndex = typeof hits[0]?.id === "number" ? hits[0].id : void 0;
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
				if (from) setLineData(map, "preview", {
					type: "Feature",
					properties: {},
					geometry: {
						type: "LineString",
						coordinates: [[from.lng, from.lat], [event.lngLat.lng, event.lngLat.lat]]
					}
				});
			}
		});
		map.on("mouseout", () => {
			hoverIndex = void 0;
			canvas.style.cursor = "";
			syncState();
		});
		onKey = (event) => {
			if (event.key === "Escape") {
				useOpsStore.getState().setOrigin(null);
				clearPreview();
			}
		};
		window.addEventListener("keydown", onKey);
		window.__selectHub = (id) => {
			handleHub(id);
		};
		unsub = useOpsStore.subscribe(() => {
			syncState();
			if (!useOpsStore.getState().originId) clearPreview();
		});
		resizeObserver = new ResizeObserver(() => {
			map?.resize();
		});
		resizeObserver.observe(root);
		return () => {
			disposed = true;
			unsub?.();
			resizeObserver?.disconnect();
			if (onKey) window.removeEventListener("keydown", onKey);
			delete window.__selectHub;
			map?.remove();
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: rootRef,
		className: "h-full w-full"
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "map-stage",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "sr-only",
				children: "Meridian satellite freight map"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SatelliteMap, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RevenueChip, {})
		]
	});
}
//#endregion
export { Home as component };
