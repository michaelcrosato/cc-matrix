export const TITLE = "K.C.’s Hungry Hullabaloo";
export const TAGLINE = "Small keeper. Big appetite.";
export const DEFAULTS = Object.freeze({
	playerSpeed: 5.2,
	crawlerSpeed: 1,
	sentrySpeed: 1,
	aggression: 0.65,
	fright: 5,
	recovery: 2.5,
	chew: 0.9,
	biteCooldown: 0.45,
	lives: 3,
});
export const TUNING = [
	["playerSpeed", "Keeper speed", "cells/s", 3, 8, 0.1],
	["crawlerSpeed", "Crawler speed", "×", 0.3, 1.8, 0.05],
	["sentrySpeed", "Sentry speed", "×", 0.3, 1.8, 0.05],
	["aggression", "Sentry ambition", "ratio", 0, 1, 0.05],
	["fright", "Fright window", "seconds", 1, 12, 0.5],
	["recovery", "Spin recovery", "seconds", 0.5, 6, 0.25],
	["chew", "Bait chew", "seconds", 0.3, 4, 0.1],
	["biteCooldown", "Bite cooldown", "seconds", 0.15, 1, 0.05],
	["lives", "Life cap", "lives", 1, 9, 1],
];
export const THEMES = [
	{
		name: "Moonmint",
		sky: ["#070f24", "#102634", "#183d43"],
		floor: "#203640",
		floorHi: "#2a4449",
		wall: "#176c67",
		wallHi: "#44bd9c",
		wallDark: "#0d454a",
		accent: "#ffcf70",
		flower: "#c79be8",
		pond: "#1c526a",
	},
	{
		name: "Amethyst",
		sky: ["#160f29", "#28203e", "#3c2d4c"],
		floor: "#322e48",
		floorHi: "#403853",
		wall: "#6b477e",
		wallHi: "#c18cb5",
		wallDark: "#43325e",
		accent: "#a8f0db",
		flower: "#ffba6b",
		pond: "#3a506c",
	},
	{
		name: "Saffron",
		sky: ["#121d26", "#233638", "#344638"],
		floor: "#303c39",
		floorHi: "#3b4941",
		wall: "#77733f",
		wallHi: "#c3c270",
		wallDark: "#484b30",
		accent: "#ffba70",
		flower: "#f29ca3",
		pond: "#315c61",
	},
	{
		name: "Blueberry",
		sky: ["#090f30", "#182c48", "#283959"],
		floor: "#29364d",
		floorHi: "#354660",
		wall: "#3c5e96",
		wallHi: "#7c9ed0",
		wallDark: "#273a68",
		accent: "#f5b9d5",
		flower: "#f0cc76",
		pond: "#254568",
	},
	{
		name: "Venus velvet",
		sky: ["#190e2b", "#372137", "#512d43"],
		floor: "#3e3045",
		floorHi: "#4d3b50",
		wall: "#85475a",
		wallHi: "#db8c91",
		wallDark: "#572d46",
		accent: "#ffe096",
		flower: "#9de1cb",
		pond: "#544066",
	},
];
const horizontalWrap = (w, y, label = "A") => ({
	a: [0, y],
	ad: [-1, 0],
	b: [w - 1, y],
	bd: [1, 0],
	label,
});
const verticalWrap = (h, x, label = "B") => ({
	a: [x, 0],
	ad: [0, -1],
	b: [x, h - 1],
	bd: [0, 1],
	label,
});
function garden(
	id,
	name,
	quip,
	lesson,
	rows,
	wraps,
	nursery,
	crawlers,
	sentries,
	theme,
) {
	const w = rows[0].length,
		h = rows.length;
	const trees = [];
	for (let y = 1; y < h - 1; y++)
		for (let x = 1; x < w - 1; x++)
			if (
				rows[y][x] === "." &&
				((x * 3 + y * 7 + id) % 9 === 0 || (y === 1 && x % 4 === 1)) &&
				!nursery.some((c) => c[0] === x && c[1] === y)
			)
				trees.push([x, y]);
	return {
		version: 1,
		id,
		name,
		quip,
		lesson,
		w,
		h,
		rows,
		wraps,
		nursery,
		crawlers,
		sentries,
		trees,
		theme,
		courses: 3,
	};
}
const line = (x0, x1, y) =>
	Array.from({ length: Math.abs(x1 - x0) + 1 }, (_, i) => [
		x0 + Math.sign(x1 - x0) * i,
		y,
	]);
export const GARDENS = [
	garden(
		0,
		"The Nibble Nursery",
		"A garden variety catastrophe!",
		"Bite the glowing fruit. Mind the head.",
		[
			"###############",
			"#.............#",
			"#.###.###.###.#",
			"#.............#",
			"...##.###.##...",
			"#.............#",
			"#.###.###.###.#",
			"#.............#",
			"###############",
		],
		[horizontalWrap(15, 4)],
		[
			[2, 7],
			[3, 7],
		],
		[{ route: line(4, 11, 7), segments: 6 }],
		[
			[11, 1],
			[13, 3],
		],
		0,
	),
	garden(
		1,
		"The Loophole Lagoon",
		"Take the scenic shortcut!",
		"Matching letter mouths share a passage.",
		[
			"########.########",
			"#...............#",
			"#.###.#####.###.#",
			"#.....#...#.....#",
			"...#..#.#.#..#...",
			"#..#....#....#..#",
			"#..###..#..###..#",
			"#...............#",
			"...###.###.###...",
			"#...............#",
			"########.########",
		],
		[
			horizontalWrap(17, 4),
			horizontalWrap(17, 8, "B"),
			verticalWrap(11, 8, "C"),
		],
		[
			[2, 9],
			[3, 9],
		],
		[{ route: line(3, 13, 9), segments: 8 }],
		[
			[13, 1],
			[15, 5],
		],
		1,
	),
	garden(
		2,
		"The Bamboozle Orchard",
		"Bait expectations. Bite everything!",
		"Plant a snack ahead; intercept the chewing crawler.",
		[
			"###################",
			"#.................#",
			"#.###.###.###.###.#",
			"#...#.....#...#...#",
			"#.#.#.###.#.#.#.#.#",
			"....#...#...#......",
			"#.#.###.#.###.###.#",
			"#.................#",
			"#.###.###.###.###.#",
			"#.................#",
			"###################",
		],
		[horizontalWrap(19, 5)],
		[
			[2, 9],
			[3, 9],
		],
		[{ route: line(3, 15, 9), segments: 9 }],
		[
			[15, 1],
			[17, 7],
		],
		2,
	),
	garden(
		3,
		"The Double Drat Crossing",
		"Two heads are worse than one!",
		"Both tails must go. One bite scares both sentries.",
		[
			"###################",
			"#.................#",
			"#.###.###.###.###.#",
			"#.....#.....#.....#",
			"#.###.#.###.#.###.#",
			"......#.....#......",
			"#.###...#...###.#.#",
			"#.....#...#.......#",
			"#.###.#.#.#.###.#.#",
			"#.................#",
			"#.###.###.###.###.#",
			"#.................#",
			"###################",
		],
		[horizontalWrap(19, 5)],
		[
			[2, 11],
			[3, 11],
		],
		[
			{ route: line(4, 11, 11), segments: 5 },
			{ route: line(14, 7, 1), segments: 5 },
		],
		[
			[15, 7],
			[1, 1],
		],
		3,
	),
	garden(
		4,
		"The Grand Gobble Gala",
		"Venus has a vacancy for a victor!",
		"Wrap, bait, bite. Give this gala a grand finale.",
		[
			"##########.##########",
			"#...................#",
			"#.###.###.#.###.###.#",
			"#...#.....#.....#...#",
			"#.#.#.###...###.#.#.#",
			"....#...#.#...#......",
			"#.#.###...#.#.###.#.#",
			"#.....#.#...#.......#",
			"#.###.#.###.#.###.#.#",
			"........#...#........",
			"#.###.###.#.###.###.#",
			"#...................#",
			"##########.##########",
		],
		[
			horizontalWrap(21, 5),
			horizontalWrap(21, 9, "B"),
			verticalWrap(13, 10, "C"),
		],
		[
			[2, 11],
			[3, 11],
		],
		[
			{ route: line(4, 13, 11), segments: 7 },
			{ route: line(17, 8, 1), segments: 7 },
		],
		[
			[17, 7],
			[1, 3],
		],
		4,
	),
];
export const clone = (value) => JSON.parse(JSON.stringify(value));

// Each finite course re-stages the same lesson from a different legal approach.
// No new rule is introduced after the first course; workshop gardens use one.
export function courseGarden(garden, wave = 0) {
	const l = clone(garden);
	if (typeof l.id !== "number" || !wave) return l;
	const bottom = l.h - 2;
	for (let i = 0; i < l.crawlers.length; i++) {
		const c = l.crawlers[i];
		const original = c.route;
		const y = wave === 1 ? (i === 0 ? 1 : bottom) : i === 0 ? 1 : bottom;
		const reverse = wave === 2;
		let a = original[0][0],
			b = original.at(-1)[0];
		if (reverse) [a, b] = [b, a];
		c.route = line(a, b, y);
		c.segments = Math.min(c.route.length - 2, c.segments + wave);
	}
	l.quip =
		wave === 1
			? "Second helping. Same scandalous appetite!"
			: "Last course. Leave no tail untasted!";
	return l;
}
