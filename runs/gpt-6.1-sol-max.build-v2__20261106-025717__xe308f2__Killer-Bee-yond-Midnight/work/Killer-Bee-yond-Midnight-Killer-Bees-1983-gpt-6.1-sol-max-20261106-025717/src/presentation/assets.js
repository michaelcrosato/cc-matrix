export function installAssets(E) {
	E.MATERIALS.midnightGlaze = { color: "#476e69", pattern: "glaze" };
	E.MATERIALS.midnightSoil = {
		color: "#34433c",
		pattern: "speck",
		amount: 0.07,
	};
	E.MATERIALS.midnightGold = { color: "#ba9a60", pattern: "metal" };
	E.SHAPES["garden-bed"] = {
		about: "glazed moonflower bed with copper corner studs",
		tags: "garden planter",
		mats: { g: "midnightGlaze", s: "midnightSoil", c: "midnightGold" },
		params: { w: 32, d: 20 },
		make: (p) => [
			["box", "g", [0, 0, 0], [p.w, p.d, 5]],
			["box", "s", [0, 0, 5], [p.w - 5, p.d - 5, 1]],
			["mirror", "xy", ["cyl", "c", [p.w / 2 - 2, p.d / 2 - 2, 5], 1, 1]],
		],
	};
	E.SHAPES["garden-dial"] = {
		about: "a clockwork sundial for a garden that never sees the sun",
		tags: "garden clock",
		mats: { s: "slate", g: "midnightGold", c: "copper" },
		parts: [
			["cyl", "s", [0, 0, 0], 19, 3, { seg: 12 }],
			["cyl", "g", [0, 0, 3], 17, 1, { seg: 12 }],
			["cyl", "s", [0, 0, 4], 15, 1, { seg: 12 }],
			["ring", 12, 13, ["box", "g", [0, 0, 5], [1, 2, 1]]],
			["wedge", "c", [0, 0, 5], [2, 16, 8]],
		],
	};
	E.SHAPES["garden-jewel"] = {
		about: "a pale glowing dew jewel in a copper bezel",
		tags: "garden jewel",
		mats: {
			c: "midnightGold",
			j: { color: "#a0d6c7", pattern: "glaze", glow: 0.25 },
		},
		parts: [
			["cyl", "c", [0, 0, 0], 7, 2, { seg: 6 }],
			["ball", "j", [0, 0, 4], 5, { sz: 0.7 }],
		],
	};
}
