export const U = 16;
export const STATIONS = ["pilot", "nose", "starboard", "tail", "port", "bombs"];
export const BEARINGS = {
	nose: 0,
	starboard: Math.PI / 2,
	tail: Math.PI,
	port: -Math.PI / 2,
};
export const LABELS = {
	pilot: "FLIGHT DECK",
	nose: "12 O’CLOCK · NOSE",
	starboard: "3 O’CLOCK · STARBOARD",
	tail: "6 O’CLOCK · TAIL",
	port: "9 O’CLOCK · PORT",
	bombs: "BOMBARDIER",
};
export const DEFAULT_BALANCE = {
	flightResponse: 1,
	courseHold: 1,
	fuelConsumption: 1,
	enemyAccuracy: 0.3,
	flakWindow: 5.2,
	aimHelp: 0.16,
	bombDrift: 1,
	damageMultiplier: 1,
};
export const TUNING = [
	["flightResponse", "Flight response", 0.3, 2, 0.05, "×"],
	["courseHold", "Course hold", 0.3, 2, 0.05, "×"],
	["fuelConsumption", "Fuel burn", 0.1, 2, 0.05, "×"],
	["enemyAccuracy", "Fighter accuracy", 0, 1, 0.05, ""],
	["flakWindow", "Flak warning", 1.5, 8, 0.1, "s"],
	["aimHelp", "Gun aim help", 0, 0.45, 0.01, "rad"],
	["bombDrift", "Wind drift", 0, 2, 0.05, "×"],
	["damageMultiplier", "Damage", 0, 2, 0.05, "×"],
];
export const LOADOUTS = {
	balanced: {
		name: "STANDARD",
		bombs: 8,
		fuel: 1080,
		desc: "8 bombs · ample return reserve",
		reserve: "~35% return reserve",
	},
	longrange: {
		name: "LONG LEGS",
		bombs: 6,
		fuel: 1320,
		desc: "6 bombs · maximum endurance",
		reserve: "~48% return reserve",
	},
	heavy: {
		name: "HEAVY HAND",
		bombs: 12,
		fuel: 1040,
		desc: "12 bombs · slower climb",
		reserve: "~28% return reserve",
	},
};
export const DIFFICULTIES = {
	easy: { name: "CADET", accuracy: 0.55, damage: 0.7, fuel: 1.12, aim: 0.14 },
	normal: { name: "CREW", accuracy: 1, damage: 1, fuel: 1, aim: 0 },
	hard: {
		name: "VETERAN",
		accuracy: 1.35,
		damage: 1.2,
		fuel: 0.93,
		aim: -0.06,
	},
};
export const MISSION = {
	version: 1,
	name: "OPERATION COPPER TIDE",
	deadline: 720,
	cruise: 900 * U,
	home: { x: 0, y: 0, label: "ROOKFIELD" },
	waypoints: {
		harbor: { x: 340000, y: 18000, label: "GREYHAVEN DOCKS" },
		home: { x: 0, y: 0, label: "ROOKFIELD" },
		refinery: { x: 375000, y: 60000, label: "BRACKEN REFINERY" },
		battery: { x: 270000, y: -12000, label: "CLIFF BATTERY" },
		dogleg: { x: 140000, y: -66000, label: "NORTHERN DOGLEG" },
	},
	targets: [
		{
			id: "ship",
			label: "Armed transport",
			x: 340000,
			y: 18000,
			z: 0,
			r: 1800,
			hp: 2,
			maxHp: 2,
			value: 2500,
			primary: true,
		},
		{
			id: "tanks",
			label: "Dock fuel tanks",
			x: 343200,
			y: 21300,
			z: 0,
			r: 1500,
			hp: 1,
			maxHp: 1,
			value: 1000,
		},
		{
			id: "works",
			label: "Naval machine works",
			x: 338000,
			y: 21800,
			z: 0,
			r: 1500,
			hp: 1,
			maxHp: 1,
			value: 1000,
		},
		{
			id: "battery",
			label: "Cliff battery",
			x: 270000,
			y: -12000,
			z: 0,
			r: 1500,
			hp: 1,
			maxHp: 1,
			value: 800,
		},
		{
			id: "refinery",
			label: "Bracken refinery",
			x: 375000,
			y: 60000,
			z: 0,
			r: 2200,
			hp: 2,
			maxHp: 2,
			value: 1500,
		},
	],
	encounters: [
		{ id: "nose-pass", x: 65000, bearing: "nose", pattern: "headon" },
		{ id: "port-cross", x: 138000, bearing: "port", pattern: "cross" },
		{
			id: "starboard-cross",
			x: 220000,
			bearing: "starboard",
			pattern: "cross",
		},
		{ id: "tail-pursuit", x: 290000, bearing: "tail", pattern: "pursuit" },
	],
	crew: {
		pilot: "CAPT. WREN",
		gunner: "SGT. FINCH",
		bombardier: "LT. ROOK",
		engineer: "CPL. PIPER",
	},
};
export function validateMission(m) {
	const errors = [];
	if (m.version !== 1) errors.push("Unsupported mission version");
	if (!m.targets?.some((t) => t.primary))
		errors.push("A primary target is required");
	for (const t of m.targets || [])
		if (
			!t.id ||
			![t.x, t.y, t.r, t.hp].every(Number.isFinite) ||
			t.r <= 0 ||
			t.hp <= 0
		)
			errors.push("Invalid target " + t.id);
	for (const [k, w] of Object.entries(m.waypoints || {}))
		if (![w.x, w.y].every(Number.isFinite))
			errors.push("Invalid waypoint " + k);
	if (!(m.deadline >= 120 && m.deadline <= 900))
		errors.push("Deadline must be 120–900 seconds");
	return errors;
}
