export const STONES = [
	{
		id: 0,
		name: "Roundstone",
		short: "ROUND",
		color: "#d9e5ed",
		damage: 1,
		radius: 3,
		reload: "reload",
		description: "Quick, precise. Harass a crew or finish a remnant.",
	},
	{
		id: 1,
		name: "Masonry stone",
		short: "MASONRY",
		color: "#e5b56b",
		damage: 2.6,
		radius: 4,
		reload: "heavyReload",
		description: "Break reinforced supports. Let gravity do the rest.",
	},
	{
		id: 2,
		name: "Split stone",
		short: "SPLIT",
		color: "#b0dc98",
		damage: 0.8,
		radius: 2.5,
		reload: "splitReload",
		description: "Three fragments at the apex. Cover an upper wall.",
	},
];
export const RIVALS = [
	{
		name: "Sir Nearly",
		title: "The village optimist",
		style: "mason",
		reaction: 2.4,
		error: 0.075,
		boast: "A perfectly good castle! What a shame.",
		hint: "Hold, watch the landing pennant, release. Full power overshoots.",
	},
	{
		name: "Dame Nudge",
		title: "A sporting nuisance",
		style: "harasser",
		reaction: 1.9,
		error: 0.055,
		boast: "Mind your little hat!",
		hint: "Crew = 7. Launcher = 13. Both recover; the castle is the goal.",
	},
	{
		name: "Baron Bedrock",
		title: "The careful mason",
		style: "mason",
		reaction: 1.7,
		error: 0.04,
		boast: "That column was decorative. Mostly.",
		hint: "Masonry stone breaks strong supports. Unsupported blocks tumble.",
	},
	{
		name: "Lady Wrench",
		title: "The repair enthusiast",
		style: "harasser",
		reaction: 1.45,
		error: 0.035,
		boast: "Tools down. Stones up!",
		hint: "Interrupt the launcher, then use the opening to break a support.",
	},
	{
		name: "Count Crumble",
		title: "A broad-wall destroyer",
		style: "broad",
		reaction: 1.55,
		error: 0.035,
		boast: "One stone? How provincial.",
		hint: "Split stone fans into three. Wide walls invite it.",
	},
	{
		name: "Sir Sliver",
		title: "The last-piece specialist",
		style: "mason",
		reaction: 1.35,
		error: 0.027,
		boast: "A tiny tower is still a tower.",
		hint: "Return to Roundstone to finish small surviving pieces.",
	},
	{
		name: "Duchess Dusk",
		title: "A changeable schemer",
		style: "adaptive",
		reaction: 1.3,
		error: 0.025,
		boast: "A lovely evening for renovations.",
		hint: "Watch their charge: interrupt a throw, then attack the castle.",
	},
	{
		name: "The Night Porter",
		title: "Keeper of the hammer",
		style: "harasser",
		reaction: 1.2,
		error: 0.023,
		boast: "Our opening hours are brief!",
		hint: "Glowing gold means protected return. Choose another target.",
	},
	{
		name: "Queen Rubble",
		title: "The deliberate rival",
		style: "adaptive",
		reaction: 1.08,
		error: 0.022,
		boast: "The crown requires a lower skyline.",
		hint: "All stones. All targets. One gloriously questionable sport.",
	},
	{
		name: "Queen Rubble",
		title: "The royal rematch",
		style: "adaptive",
		reaction: 0.85,
		error: 0.018,
		boast: "Again! This time I have a plan.",
		hint: "Bout ten is worth ten times its direct score. Finish strong.",
	},
];
// Local definitions: z is height above the ground; support edges are authored, not inferred each frame.
const layouts = [
	[
		[0, 0, 26, 28, "stone"],
		[28, 0, 26, 28, "stone"],
		[56, 0, 26, 28, "stone"],
		[0, 28, 26, 26, "stone"],
		[28, 28, 26, 26, "stone"],
		[56, 28, 26, 26, "stone"],
		[0, 54, 24, 22, "wood"],
		[58, 54, 24, 22, "wood"],
		[2, 76, 9, 10, "wood"],
		[71, 76, 9, 10, "wood"],
	],
	[
		[0, 0, 18, 34, "reinforced"],
		[33, 0, 18, 34, "stone"],
		[66, 0, 18, 34, "reinforced"],
		[0, 34, 28, 22, "stone"],
		[28, 34, 28, 22, "stone"],
		[56, 34, 28, 22, "stone"],
		[0, 56, 28, 22, "stone"],
		[28, 56, 28, 22, "stone"],
		[56, 56, 28, 22, "stone"],
		[0, 78, 13, 12, "wood"],
		[35, 78, 13, 12, "wood"],
		[71, 78, 13, 12, "wood"],
	],
	[
		[0, 0, 22, 28, "stone"],
		[0, 28, 22, 28, "stone"],
		[0, 56, 22, 28, "stone"],
		[0, 84, 22, 24, "reinforced"],
		[0, 108, 9, 12, "wood"],
		[30, 0, 22, 26, "stone"],
		[30, 26, 22, 26, "stone"],
		[30, 52, 22, 26, "wood"],
		[62, 0, 22, 28, "stone"],
		[62, 28, 22, 28, "stone"],
		[62, 56, 22, 28, "stone"],
		[62, 84, 22, 28, "wood"],
		[62, 112, 10, 10, "wood"],
	],
	[
		[0, 0, 24, 26, "stone"],
		[0, 26, 24, 26, "wood"],
		[0, 52, 24, 26, "wood"],
		[0, 78, 24, 20, "stone"],
		[0, 98, 10, 10, "wood"],
		[30, 0, 24, 26, "reinforced"],
		[30, 26, 24, 26, "stone"],
		[30, 52, 24, 22, "stone"],
		[60, 0, 24, 26, "stone"],
		[60, 26, 24, 26, "wood"],
		[60, 52, 24, 26, "stone"],
		[60, 78, 24, 26, "wood"],
		[74, 104, 10, 10, "wood"],
	],
	[
		[0, 0, 20, 30, "reinforced"],
		[0, 30, 20, 30, "stone"],
		[0, 60, 20, 28, "stone"],
		[0, 88, 20, 28, "wood"],
		[0, 116, 10, 12, "wood"],
		[29, 0, 24, 30, "stone"],
		[29, 30, 24, 26, "stone"],
		[20, 56, 42, 22, "reinforced"],
		[29, 78, 24, 24, "wood"],
		[64, 0, 20, 30, "reinforced"],
		[64, 30, 20, 30, "stone"],
		[64, 60, 20, 28, "stone"],
		[64, 88, 20, 30, "wood"],
		[74, 118, 10, 12, "wood"],
	],
];
export const COURTS = [
	{
		name: "Village Exhibition",
		short: "VILLAGE",
		mood: "day",
		stone: "#d6c69d",
		sky: ["#547f99", "#b8d1cc", "#f6e7b8"],
		water: "#437e8d",
		accent: "#d69b54",
		subtitle: "The annual questionable sporting picnic",
	},
	{
		name: "Quarry Meet",
		short: "QUARRY",
		mood: "desert",
		stone: "#dbc9a5",
		sky: ["#8b9fa5", "#d7c9ab", "#f3ddac"],
		water: "#638e8e",
		accent: "#bb7356",
		subtitle: "Exposed columns. Enthusiastic spectators.",
	},
	{
		name: "High Keep",
		short: "HIGH KEEP",
		mood: "dusk",
		stone: "#b6bac4",
		sky: ["#5c6389", "#b9a1b1", "#e6b497"],
		water: "#566d94",
		accent: "#b689b1",
		subtitle: "Taller towers. Smaller excuses.",
	},
	{
		name: "Lakeside Night Court",
		short: "LAKESIDE",
		mood: "castle-night",
		stone: "#949daa",
		sky: ["#151e3a", "#334467", "#69758c"],
		water: "#2b4967",
		accent: "#dfb46a",
		subtitle: "Torches, timber, and a moonlit grudge",
	},
	{
		name: "Royal Final",
		short: "ROYAL FINAL",
		mood: "dusk",
		stone: "#d3bc9e",
		sky: ["#56566e", "#b87d84", "#f1bc90"],
		water: "#526a83",
		accent: "#e6b94f",
		subtitle: "Her Majesty requests a lower skyline",
	},
].map((c, i) => ({ ...c, id: i, layout: layouts[i] }));
export function makeBlocks(court = 0, scale = 1, custom = null) {
	const layout = custom?.layout || COURTS[court].layout;
	const out = [];
	for (let seat = 0; seat < 2; seat++) {
		const start = out.length;
		// Three stable foundation pads, decoration and support only.
		for (let i = 0; i < 3; i++)
			out.push({
				id: out.length,
				seat,
				x: seat ? 640 - (40 + i * 28 + 28) : 40 + i * 28,
				z: 34,
				w: 28,
				h: 6,
				hp: 999,
				maxHp: 999,
				material: "foundation",
				foundation: true,
				supports: [],
				alive: true,
			});
		for (const [lx, lz, bw, bh, material] of layout) {
			const hp =
				({ wood: 1.5, stone: 4, reinforced: 6 }[material] || 2) * scale;
			out.push({
				id: out.length,
				seat,
				x: seat ? 640 - (40 + lx + bw) : 40 + lx,
				z: 40 + lz,
				w: bw,
				h: bh,
				hp,
				maxHp: hp,
				material,
				foundation: false,
				supports: [],
				alive: true,
			});
		}
		const own = out.slice(start);
		for (const b of own.filter((b) => !b.foundation)) {
			b.supports = own
				.filter(
					(a) =>
						a.id !== b.id &&
						Math.abs(a.z + a.h - b.z) < 0.1 &&
						Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1,
				)
				.map((a) => a.id);
			// The quarry lintel and royal arch transfer load to their side piers.
			if (!b.supports.length)
				b.supports = own
					.filter(
						(a) =>
							a.id !== b.id &&
							a.z < b.z &&
							Math.abs(a.z + a.h - b.z) < 3 &&
							Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > -2,
					)
					.map((a) => a.id);
		}
	}
	return out;
}
