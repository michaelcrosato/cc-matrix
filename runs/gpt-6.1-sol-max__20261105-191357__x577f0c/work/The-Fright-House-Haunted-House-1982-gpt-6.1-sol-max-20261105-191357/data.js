export const TITLE = "The Fright House";
export const TAGLINE = "Some houses have good bones. This one keeps them.";
export const DEFAULTS = Object.freeze({
	speed: 4,
	enemySpeed: 1,
	matchDuration: 12,
	lightRadius: 5.7,
	timeScale: 1,
});
export const FLOOR_NAMES = [
	"The Receiving Rooms",
	"The Family Quarters",
	"The Unquiet Rooms",
	"The Forgotten Attic",
];
const names = [
	[
		"The Foyer",
		"The Cloakroom",
		"The Dining Room",
		"The Grand Stair",
		"The Library",
		"The Winter Garden",
	],
	[
		"The Landing",
		"The Music Room",
		"The Guest Bedroom",
		"The Upper Stair",
		"The Trophy Room",
		"The Tea Room",
	],
	[
		"The Quiet Landing",
		"The Sewing Room",
		"The Nursery",
		"The Crooked Stair",
		"The Séance Room",
		"The Moon Room",
	],
	[
		"The Attic Landing",
		"The Storeroom",
		"The Cobweb Room",
		"The Last Stair",
		"The Observatory",
		"The Urn Room",
	],
];
const themes = [
	"foyer",
	"cloak",
	"dining",
	"stair",
	"library",
	"garden",
	"landing",
	"music",
	"bedroom",
	"stair",
	"trophy",
	"tea",
	"landing",
	"sewing",
	"nursery",
	"stair",
	"seance",
	"moon",
	"landing",
	"storage",
	"web",
	"stair",
	"observatory",
	"urn",
];
const coords = [
	[1, 1],
	[0, 1],
	[0, 0],
	[1, 0],
	[2, 0],
	[2, 1],
];
const palettes = [
	{
		wall: "#294c50",
		floor: "#7b6153",
		trim: "#b5a374",
		rug: "#9c4d49",
		accent: "#d6bd7d",
	},
	{
		wall: "#43503f",
		floor: "#806756",
		trim: "#bd9b6b",
		rug: "#6c516e",
		accent: "#b3c3a3",
	},
	{
		wall: "#50465e",
		floor: "#75616e",
		trim: "#be9b80",
		rug: "#3b706d",
		accent: "#c5b4d2",
	},
	{
		wall: "#354854",
		floor: "#685f59",
		trim: "#a79775",
		rug: "#a16a45",
		accent: "#b6c6c9",
	},
];
export const ROOMS = names.flatMap((ns, f) =>
	ns.map((name, n) => {
		const [col, row] = coords[n];
		const neighbors = {};
		for (const [dir, dx, dy] of [
			["west", -1, 0],
			["east", 1, 0],
			["north", 0, -1],
			["south", 0, 1],
		]) {
			const next = coords.findIndex(
				([x, y]) => x === col + dx && y === row + dy,
			);
			if (next >= 0) neighbors[dir] = f * 6 + next;
		}
		return {
			id: f * 6 + n,
			floor: f,
			n,
			name,
			theme: themes[f * 6 + n],
			col,
			row,
			neighbors,
			palette: palettes[f],
			up: n === 3 && f < 3 ? { room: (f + 1) * 6, x: -3.8, z: -2.65 } : null,
			down:
				n === 0 && f > 0 ? { room: (f - 1) * 6 + 3, x: 3.8, z: -2.65 } : null,
		};
	}),
);
export const DOORS = {
	west: { x: -6.85, z: 0 },
	east: { x: 6.85, z: 0 },
	north: { x: 0, z: -4.85 },
	south: { x: 0, z: 4.85 },
};
export const OPPOSITE = {
	west: "east",
	east: "west",
	north: "south",
	south: "north",
};
export const lockId = (a, b) => [a, b].sort((x, y) => x - y).join("-");
export const INITIAL_LOCKS = [
	"0-5",
	"3-4",
	"9-up",
	"12-17",
	"15-16",
	"18-23",
	"21-22",
];
export const ITEM_START = [
	{ id: "key", type: "key", room: 1, x: 2.7, z: 1.5, parts: 0 },
	{ id: "scepter", type: "scepter", room: 2, x: -2.6, z: 1.3, parts: 0 },
	{ id: "urn-a", type: "urn", room: 10, x: 2.7, z: 1.4, parts: 1 },
	{ id: "urn-b", type: "urn", room: 14, x: -2.7, z: 1.3, parts: 2 },
	{ id: "urn-c", type: "urn", room: 23, x: 2.6, z: 1.3, parts: 4 },
];
export const itemName = (item) =>
	!item
		? "Empty hand"
		: item.type === "key"
			? "Master key"
			: item.type === "scepter"
				? "Moon scepter"
				: item.parts === 7
					? "The restored urn"
					: `Urn · ${bitCount(item.parts)} of 3 pieces`;
export function bitCount(x) {
	let n = 0;
	for (; x; x >>= 1) n += x & 1;
	return n;
}
export function rng(seed) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
export const ENEMY_ROOMS = {
	0: [],
	1: [],
	2: ["spider"],
	3: [],
	4: ["bat"],
	5: ["spider"],
	6: [],
	7: ["spider"],
	8: ["bat"],
	9: [],
	10: ["ghost"],
	11: ["bat"],
	12: [],
	13: ["spider", "bat"],
	14: ["spider"],
	15: ["ghost"],
	16: ["ghost", "bat"],
	17: ["spider"],
	18: [],
	19: ["spider", "spider"],
	20: ["bat", "spider"],
	21: ["ghost"],
	22: ["bat", "ghost"],
	23: ["ghost", "spider"],
};
export const ROOM_FLAVOR = [
	"The front door is still behind you. How reassuring.",
	"One key. A great many doors. You may see the difficulty.",
	"The scepter keeps bad company at a distance.",
	"Four floors. They do not get friendlier.",
	"A house this old has plenty of stories. Most end badly.",
	"Nobody has watered these plants. Something else has.",
	"The air upstairs is colder. It knows you are here.",
	"The piano has not been tuned. It plays anyway.",
	"The guest has overstayed. By about ninety years.",
	"This stair is locked. The key will have to come too.",
	"The first piece. Do try not to drop it.",
	"Tea for two. Both places have been taken.",
	"You can hear someone counting. It is not you.",
	"Something has been stitching the shadows together.",
	"The second piece. The rocking horse saw everything.",
	"The stair leans away from the room. A sensible stair.",
	"If the table answers, do not ask another question.",
	"The moon is watching through the wrong window.",
	"The attic smells of rain and unfinished business.",
	"Most of these boxes have been packed from the inside.",
	"Please mind the residents. They have eight legs.",
	"No more stairs. That ought to be good news.",
	"The telescope is pointed at something much too close.",
	"The last piece. Now the house would like a word.",
];
export function propsFor(room) {
	const t = room.theme;
	const p = [];
	const put = (kind, x, z, s = 1) => p.push({ kind, x, z, s });
	if (["foyer", "landing", "stair"].includes(t)) {
		put("clock", -5.25, -3.5);
		put("table", room.down ? 4.7 : 4.5, room.down ? 2.8 : -3.3);
		put("chest", -4.7, 2.9);
	}
	if (["library", "observatory"].includes(t)) {
		put("shelf", -4.4, -3.85);
		put("shelf", 3.9, -3.85);
		put(t === "observatory" ? "telescope" : "desk", -4.8, 2.8);
	}
	if (["dining", "tea", "seance"].includes(t)) {
		put(t === "seance" ? "seance" : "table", -3.8, -2.5, 1.35);
		put("cabinet", 4.6, -3.6);
		put("chair", -5, 2.5);
	}
	if (t === "cloak") {
		put("cabinet", -4.6, -3.6);
		put("coat", 3.7, -3.7);
		put("chest", -4.8, 2.8);
	}
	if (t === "garden") {
		put("plant", -4.9, -3.2, 1.6);
		put("plant", 4.6, -3.1, 1.5);
		put("bench", -4.9, 2.7);
		put("plant", 5.3, 3);
	}
	if (t === "music") {
		put("piano", -4.6, -2.7);
		put("sofa", 4.1, -3.1);
		put("chair", -4.9, 2.8);
	}
	if (t === "bedroom") {
		put("bed", -4.5, -2.9);
		put("cabinet", 4.5, -3.6);
		put("chair", -4.8, 2.7);
	}
	if (t === "nursery") {
		put("horse", -4.8, -2.9);
		put("bed", 4.7, -2.8, 0.8);
		put("blocks", -4.7, 2.9);
	}
	if (t === "sewing") {
		put("desk", -4.6, -2.9);
		put("coat", 4.4, -3.4);
		put("chest", -4.8, 2.9);
	}
	if (["trophy", "urn"].includes(t)) {
		put("bust", -4.7, -3.3, 1.4);
		put("bust", 4.8, -3.3, 1.4);
		put("cabinet", -5, 2.9);
	}
	if (t === "moon") {
		put("telescope", -4.8, -2.9);
		put("sofa", 4.2, -3.4);
		put("plant", -4.9, 2.9);
	}
	if (["storage", "web"].includes(t)) {
		put("crates", -4.6, -3);
		put("cabinet", 4.7, -3.6);
		put("crates", -4.8, 2.8, 0.8);
	}
	return p;
}
export function propSize(p) {
	const sizes = {
		clock: [0.55, 0.5],
		table: [1.3, 0.65],
		chest: [0.95, 0.5],
		shelf: [1.6, 0.4],
		desk: [1.2, 0.6],
		cabinet: [1.15, 0.45],
		chair: [0.5, 0.5],
		seance: [1.35, 1],
		coat: [0.4, 0.4],
		plant: [0.5, 0.5],
		bench: [1.15, 0.45],
		piano: [1.2, 0.7],
		sofa: [1.5, 0.6],
		bed: [1.05, 1.55],
		horse: [0.9, 0.4],
		blocks: [0.8, 0.6],
		telescope: [0.6, 0.6],
		bust: [0.45, 0.45],
		crates: [1.05, 0.7],
	};
	return (sizes[p.kind] || [0.6, 0.6]).map((v) => v * p.s);
}
export const GUIDE = [
	{
		title: "Do you dare enter?",
		text: "Somewhere in this house lie three pieces of an old urn. Find them, fit them together, and carry the whole urn back to the front door. You have nine chances to keep your nerve.",
		tip: "Four floors. Six rooms each. One very poor decision.",
	},
	{
		title: "Keep a match handy.",
		text: "Strike a match to reveal hidden objects. Matches are unlimited, but every one counts against your score. A gust or a nearby creature can blow one out. White eyes are a useful warning.",
		tip: "Walk quietly. Hurrying is quicker, but the house can hear you.",
	},
	{
		title: "One hand. Choose wisely.",
		text: "The master key unlocks doors for good. The moon scepter drives creatures away. Urn pieces join together when carried. Taking a new object leaves the old one on the floor.",
		tip: "You may carry the key, the scepter, or the urn. You cannot carry all three.",
	},
	{
		title: "Bad company.",
		text: "Spiders creep, bats swoop and steal, and the ghost passes through walls. Watch their warning rings, then keep moving. The scepter protects you—except from the ghost on Nightmare.",
		tip: "Keep your map close. It remembers rooms and objects you have seen.",
	},
];
