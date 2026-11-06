export const CONTENT_VERSION = 1;
export const ARENA = Object.freeze({
	x0: 0,
	y0: 0,
	x1: 960,
	y1: 540,
	cleanup: 120,
});
export const DEFAULT_BALANCE = Object.freeze({
	speed: 230,
	response: 13,
	slew: 6.28318530718,
	shotInterval: 0.25,
	recharge: 1.6,
	recoverySpeed: 0.5,
	immunity: 1.1,
	contactGrace: 0.12,
	shotSpeed: 680,
	drifterSpeed: 26,
	hunterSpeed: 92,
	hunterTurn: 2.1,
	fusionRadius: 44,
	fusionWindup: 1.4,
	hunterArm: 1.1,
	gunWarning: 1.7,
	gunVolley: 2.6,
	missileSpeed: 155,
	chainRadius: 76,
	chainDelay: 0.11,
	chainCap: 8,
	bossHealth: 8,
	bossInterval: 7.4,
	bossRepair: 1,
	environmentalOwner: "team",
});
export const BALANCE_PAGES = [
	{
		title: "Pilot & cannon",
		rows: [
			["speed", "Flight speed", 100, 400, 10],
			["response", "Steering response", 3, 25, 1],
			["slew", "Clockwise cannon speed", 1, 14, 0.25],
			["shotInterval", "Shot interval", 0.12, 0.8, 0.02],
			["recharge", "Shield recharge", 0.5, 3.5, 0.1],
			["recoverySpeed", "Exposed speed", 0.2, 0.9, 0.05],
			["immunity", "Damage immunity", 0.3, 3, 0.1],
		],
	},
	{
		title: "Satellites & signals",
		rows: [
			["drifterSpeed", "Drifter speed", 0, 65, 5],
			["hunterSpeed", "Hunter speed", 35, 180, 5],
			["hunterTurn", "Hunter turn rate", 0.5, 5, 0.25],
			["fusionRadius", "Fusion range", 20, 100, 2],
			["gunWarning", "Lane warning", 0.6, 4, 0.1],
			["gunVolley", "Missile interval", 1, 6, 0.2],
			["chainRadius", "Cascade reach", 35, 130, 5],
		],
	},
	{
		title: "Command craft",
		rows: [
			["bossHealth", "Emitter hull per phase", 2, 20, 1],
			["bossInterval", "Attack interval", 4, 12, 0.5],
			["missileSpeed", "Hostile shot speed", 70, 240, 10],
		],
	},
];
export const ENEMIES = Object.freeze({
	drifter: { r: 14, score: 1, hp: 1, merge: true, blast: 1 },
	hunter: { r: 18, score: 3, hp: 1, merge: false, blast: 1.1 },
	gunship: { r: 22, score: 10, hp: 2, merge: false, blast: 1.3 },
});
export const SECTORS = [
	{
		id: "launch",
		name: "01 / LITTLE SAUCER, BIG JOB",
		short: "Launch channel",
		color: "#55e6dc",
		subtitle: "Earth sent its best. You were nearest.",
		motif: "planet",
	},
	{
		id: "field",
		name: "02 / THE CHAIN GANG",
		short: "Drifting field",
		color: "#c4a3ff",
		subtitle: "They have learned to hold hands. How rude.",
		motif: "relay",
	},
	{
		id: "crossing",
		name: "03 / CROSSING SIGNALS",
		short: "Crossing signals",
		color: "#ffbc72",
		subtitle: "Mind the lanes. Make your own opening.",
		motif: "lanes",
	},
	{
		id: "command",
		name: "04 / MANAGEMENT HAS ARRIVED",
		short: "Command encounter",
		color: "#ff759b",
		subtitle: "Three phases. No manners.",
		motif: "eclipse",
	},
];
// Coordinates in world units, relative to each authored formation's anchor.
export const FORMATIONS = {
	pair: [
		[-25, 0],
		[25, 0],
	],
	chain: [
		[-126, 0],
		[-63, -12],
		[0, 0],
		[63, 12],
		[126, 0],
	],
	crown: [
		[-150, 12],
		[-100, -44],
		[-38, -70],
		[38, -70],
		[100, -44],
		[150, 12],
	],
	ladder: [
		[-92, -55],
		[-28, -55],
		[36, -55],
		[-60, 10],
		[4, 10],
		[68, 10],
	],
	fork: [
		[-135, -54],
		[-70, -10],
		[0, 30],
		[70, -10],
		[135, -54],
	],
	diamonds: [
		[-130, 0],
		[-65, -40],
		[-65, 40],
		[0, 0],
		[65, -40],
		[65, 40],
		[130, 0],
	],
	cover: [
		[-110, 0],
		[-40, -8],
		[30, 8],
		[100, 0],
	],
	hunters: [
		[-96, 0],
		[96, 0],
	],
	solo: [[0, 0]],
};
const spawn = (at, formation, x, y, extra = {}) => ({
	at,
	formation,
	x,
	y,
	kind: "drifter",
	...extra,
});
export const MISSION = [
	{
		id: "first-contact",
		sector: 0,
		name: "Permission to be overconfident",
		learning:
			"Move, fire once, release fire to recharge, then ram a satellite with the complete ring.",
		tutorial: true,
		spawns: [
			spawn(2, "solo", 480, 160, { merge: false, practice: "shot", speed: 0 }),
			spawn(9, "solo", 675, 350, { merge: false, practice: "ram", speed: 0 }),
		],
	},
	{
		id: "open-a-door",
		sector: 0,
		name: "One shot. A very large opening.",
		learning:
			"A blast jumps through nearby machinery. Keep a way out while exposed.",
		spawns: [
			spawn(0, "chain", 480, 165, { merge: false }),
			spawn(14, "cover", 500, 360, { merge: false }),
			spawn(24, "solo", 750, 220, { kind: "hunter" }),
		],
	},
	{
		id: "return-to-blue",
		sector: 0,
		name: "Wait for the blue",
		learning:
			"The incomplete ring is only a recharge gauge. Protection returns at the chime.",
		spawns: [
			spawn(0, "fork", 480, 190, { merge: false }),
			spawn(12, "pair", 245, 350, { kind: "hunter" }),
			spawn(25, "cover", 670, 350, { merge: false }),
		],
	},
	{
		id: "first-fusion",
		sector: 1,
		name: "Unfriendly introductions",
		learning: "A tether means fusion. Two drifters become one turning hunter.",
		spawns: [
			spawn(0, "pair", 480, 140, { forcedMerge: true }),
			spawn(9, "chain", 480, 350),
			spawn(25, "pair", 230, 240, { forcedMerge: true }),
		],
	},
	{
		id: "switchyard",
		sector: 1,
		name: "The switchyard",
		learning: "Lead the hunters into the field. Let the blast do the work.",
		spawns: [
			spawn(0, "ladder", 360, 220),
			spawn(12, "ladder", 670, 330),
			spawn(28, "hunters", 480, 130, { kind: "hunter" }),
		],
	},
	{
		id: "constellation",
		sector: 1,
		name: "A very bad constellation",
		learning:
			"A chain keeps its first pilot as owner. The team takes every point.",
		spawns: [
			spawn(0, "diamonds", 480, 200),
			spawn(13, "crown", 480, 400),
			spawn(30, "pair", 260, 170, { forcedMerge: true }),
		],
	},
	{
		id: "pincer",
		sector: 1,
		name: "Ring confidence",
		learning: "Hunters turn slowly. A full shield makes an excellent argument.",
		spawns: [
			spawn(0, "hunters", 250, 190, { kind: "hunter" }),
			spawn(10, "chain", 650, 280),
			spawn(26, "hunters", 550, 400, { kind: "hunter" }),
		],
	},
	{
		id: "long-fuse",
		sector: 1,
		name: "The long fuse",
		learning: "Give a cascade space to grow. Its multiplier stops at eight.",
		spawns: [
			spawn(0, "chain", 285, 180),
			spawn(9, "chain", 665, 270),
			spawn(18, "crown", 480, 390),
			spawn(31, "pair", 480, 120, { forcedMerge: true }),
		],
	},
	{
		id: "first-crossing",
		sector: 2,
		name: "Look both ways",
		learning:
			"Amber lock lines announce gunships. Their missiles can break your cover.",
		spawns: [
			spawn(0, "cover", 480, 280, { merge: false }),
			spawn(3, "solo", 60, 90, { kind: "gunship", lane: 0 }),
			spawn(17, "solo", 900, 140, { kind: "gunship", lane: 1 }),
			spawn(29, "chain", 480, 390),
		],
	},
	{
		id: "traffic",
		sector: 2,
		name: "Heavy traffic",
		learning:
			"Move across a lane before its warning ends. Burst fire, then recover.",
		spawns: [
			spawn(0, "crown", 480, 250),
			spawn(4, "solo", 60, 80, { kind: "gunship", lane: 0 }),
			spawn(15, "hunters", 480, 410, { kind: "hunter" }),
			spawn(32, "solo", 900, 70, { kind: "gunship", lane: 1 }),
		],
	},
	{
		id: "cover-story",
		sector: 2,
		name: "A cover story",
		learning:
			"Satellites block hostile shots. Environmental cascades score for the team.",
		spawns: [
			spawn(0, "ladder", 480, 290, { merge: false }),
			spawn(3, "solo", 50, 60, { kind: "gunship", lane: 0 }),
			spawn(16, "solo", 910, 60, { kind: "gunship", lane: 1 }),
			spawn(34, "diamonds", 480, 300),
		],
	},
	{
		id: "rescue-channel",
		sector: 2,
		name: "No saucer left behind",
		learning:
			"Co-op: touch a wreck with a READY shield to revive it. Rescue spends your ring.",
		spawns: [
			spawn(0, "hunters", 480, 120, { kind: "hunter" }),
			spawn(9, "cover", 480, 290),
			spawn(19, "solo", 60, 70, { kind: "gunship", lane: 0 }),
			spawn(32, "hunters", 480, 400, { kind: "hunter" }),
		],
	},
	{
		id: "rush-hour",
		sector: 2,
		name: "Rush hour is cancelled",
		learning: "Clear the marked crossing craft. Management is listening.",
		spawns: [
			spawn(0, "solo", 70, 65, { kind: "gunship", lane: 0 }),
			spawn(8, "chain", 480, 250),
			spawn(17, "solo", 890, 65, { kind: "gunship", lane: 1 }),
			spawn(31, "crown", 480, 390),
		],
	},
	{
		id: "the-doorman",
		sector: 3,
		name: "Your appointment",
		learning:
			"Command emitters open after the lane volley. Shoot, ram or cascade into an open emitter.",
		spawns: [
			spawn(0, "chain", 480, 250),
			spawn(10, "hunters", 260, 160, { kind: "hunter" }),
			spawn(22, "cover", 670, 350),
		],
	},
	{
		id: "command",
		sector: 3,
		name: "The Grand Unidentified",
		learning:
			"Break all three emitters in each phase. Their covers are solid while closed.",
		boss: true,
		spawns: [],
	},
];
export const BOSS_PHASES = [
	{
		name: "01 / KNOCK POLITELY",
		offsets: [
			[-87, 8],
			[0, 45],
			[87, 8],
		],
		open: 4.8,
		adds: "cover",
		missiles: 3,
	},
	{
		name: "02 / BE LESS POLITE",
		offsets: [
			[-85, -10],
			[0, 57],
			[85, -10],
		],
		open: 4.6,
		adds: "hunters",
		missiles: 4,
	},
	{
		name: "03 / FILE A COMPLAINT",
		offsets: [
			[-100, 22],
			[0, 63],
			[100, 22],
		],
		open: 4.4,
		adds: "chain",
		missiles: 5,
	},
];
export function validateContent(data) {
	if (
		!data ||
		data.version !== CONTENT_VERSION ||
		!Array.isArray(data.mission) ||
		!data.formations ||
		typeof data.formations !== "object"
	)
		throw new Error("Content needs version 1, mission and formations.");
	if (data.mission.length < 1 || data.mission.length > 40)
		throw new Error("Mission must have 1–40 encounters.");
	const ids = new Set();
	for (const [name, points] of Object.entries(data.formations)) {
		if (
			!/^[a-z][a-z0-9-]{0,30}$/.test(name) ||
			!Array.isArray(points) ||
			points.length < 1 ||
			points.length > 16 ||
			points.some(
				(p) =>
					!Array.isArray(p) ||
					p.length !== 2 ||
					p.some((n) => !Number.isFinite(n) || Math.abs(n) > 400),
			)
		)
			throw new Error(`Invalid formation: ${name}`);
	}
	for (const required of Object.keys(FORMATIONS))
		if (!Object.hasOwn(data.formations, required))
			throw new Error(
				"Missing required formation: " +
					required +
					" (used by mission, score attack or command craft).",
			);
	let bosses = 0;
	for (const w of data.mission) {
		if (
			!w ||
			typeof w.id !== "string" ||
			ids.has(w.id) ||
			typeof w.name !== "string" ||
			w.name.length > 80 ||
			typeof w.learning !== "string" ||
			w.learning.length > 240 ||
			!Number.isInteger(w.sector) ||
			w.sector < 0 ||
			w.sector >= SECTORS.length ||
			!Array.isArray(w.spawns) ||
			w.spawns.length > 20
		)
			throw new Error("Invalid or duplicate encounter.");
		ids.add(w.id);
		if (w.boss) bosses++;
		if (
			(w.boss !== undefined && typeof w.boss !== "boolean") ||
			(w.tutorial !== undefined && typeof w.tutorial !== "boolean")
		)
			throw new Error(`Encounter flags must be true or false: ${w.id}`);
		for (const s of w.spawns)
			if (
				!s ||
				!Object.hasOwn(data.formations, s.formation) ||
				!Object.hasOwn(ENEMIES, s.kind) ||
				!Number.isFinite(s.at) ||
				s.at < 0 ||
				s.at > 180 ||
				!Number.isFinite(s.x) ||
				!Number.isFinite(s.y) ||
				s.x < 30 ||
				s.x > 930 ||
				s.y < 30 ||
				s.y > 510 ||
				(s.speed !== undefined &&
					(!Number.isFinite(s.speed) || s.speed < 0 || s.speed > 100)) ||
				(s.lane !== undefined && ![0, 1].includes(s.lane)) ||
				["merge", "forcedMerge", "instant"].some(
					(k) => s[k] !== undefined && typeof s[k] !== "boolean",
				)
			)
				throw new Error(`Invalid spawn in ${w.id}`);
	}
	if (bosses !== 1 || !data.mission.at(-1).boss)
		throw new Error("The mission must end with exactly one command encounter.");
	return structuredClone(data);
}
export function defaultContent() {
	return {
		version: CONTENT_VERSION,
		formations: structuredClone(FORMATIONS),
		mission: structuredClone(MISSION),
	};
}
