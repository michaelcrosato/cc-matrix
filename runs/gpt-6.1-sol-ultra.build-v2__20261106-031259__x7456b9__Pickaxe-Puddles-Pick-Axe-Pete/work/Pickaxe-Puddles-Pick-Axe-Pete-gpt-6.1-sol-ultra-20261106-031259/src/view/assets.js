/* Pickaxe Puddles: native shapes, gear hooks and held poses. */
(() => {
	const E = My3D2dge,
		{ px } = E;
	globalThis.PP ||= {};
	const PP = globalThis.PP;
	const GOLD = "#efbb57",
		TEAL = "#59d4c5",
		CORAL = "#e77d67";
	E.MATERIALS.ppOak = { color: "#73573a", pattern: "planks", bw: 4, len: 20 };
	E.MATERIALS.ppIron = { color: "#3d626b", pattern: "metal", rivet: 5 };
	E.MATERIALS.ppGold = { color: GOLD, pattern: "metal", glow: 0.16 };
	E.MATERIALS.ppTeal = { color: TEAL, pattern: "metal", glow: 0.2 };
	E.MATERIALS.ppCoral = { color: CORAL, pattern: "metal", glow: 0.15 };
	E.MATERIALS.ppDark = { color: "#142d35", pattern: "none" };
	E.MATERIALS.ppOre = {
		color: "#65868a",
		pattern: "stones",
		size: 5,
		over: [["cracks"]],
	};
	E.SHAPES.ppMechanism = {
		about:
			"reinforced mine gate with paired pistons, gold lock and an overhead pressure wheel",
		tags: "mine machinery gate",
		mats: { w: "ppOak", m: "ppIron", d: "ppDark", g: "ppGold" },
		parts: [
			["box", "d", [0, 0, 0], [28, 5, 36]],
			["mirror", "x", ["box", "w", [17, 0, 0], [6, 8, 40]]],
			["box", "w", [0, 0, 38], [42, 8, 6]],
			["box", "m", [0, 4, 0], [26, 2, 3]],
			["row", 4, [7, 0, 0], ["box", "m", [0, 4, 3], [2, 2, 28]]],
			["mirror", "x", ["cyl", "m", [23, 0, 2], 3, 26, { seg: 8 }]],
			["mirror", "x", ["cyl", "g", [23, 0, 16], 3.6, 5, { seg: 8 }]],
			["box", "g", [0, 6, 16], [5, 2, 7]],
			["cyl", "m", [0, 0, 44], 7, 4, { seg: 8 }],
		],
	};
	E.SHAPES.ppOre = {
		about: "faceted rolling gold-bearing ore",
		tags: "mine rock gold",
		mats: { r: "ppOre", g: "ppGold" },
		parts: [
			["rock", "r", [0, 0, 7], 9, { seed: 19, rough: 0.3 }],
			["box", "g", [-3, 6, 9], [3, 1.5, 2]],
			["box", "g", [4, 4, 13], [2, 2, 2]],
		],
	};
	E.SHAPES.ppBounce = {
		about: "spurred cyan high-bouncing ore",
		tags: "mine rock spring",
		mats: { r: "ppIron", c: "ppTeal" },
		parts: [
			["rock", "r", [0, 0, 8], 9, { seed: 34, rough: 0.35 }],
			[
				"ring",
				5,
				7,
				[
					"prism",
					"c",
					[0, 0, 7],
					[
						[-2, 0],
						[2, 0],
						[0, 6],
					],
					2,
					{ axis: "y" },
				],
			],
		],
	};
	E.SHAPES.ppHeavy = {
		about: "large heavy boulder with unmistakable metal bands",
		tags: "mine rock heavy",
		mats: { r: "ppOre", m: "ppIron", g: "ppCoral" },
		parts: [
			["rock", "r", [0, 0, 10], 12, { seed: 8, rough: 0.2 }],
			["row", 2, [0, 0, 8], ["cyl", "g", [0, 0, 6], 12.3, 2, { seg: 10 }]],
			["box", "m", [0, 11, 5], [4, 2, 14]],
		],
	};
	E.SHAPES.ppPickStand = {
		about: "replacement pickaxe set on a gold supply plinth",
		tags: "mine tool pickaxe",
		mats: { w: "ppOak", m: "steel", g: "ppGold" },
		parts: [
			["box", "g", [0, 0, 0], [17, 9, 3]],
			["box", "w", [0, 0, 3], [2, 2, 21], { rot: 0 }],
			[
				"prism",
				"m",
				[0, 0, 21],
				[
					[-12, -4],
					[-8, 2],
					[0, 4],
					[8, 2],
					[12, -4],
					[4, 0],
					[-4, 0],
				],
				3,
				{ axis: "y" },
			],
		],
	};
	E.SHAPES.ppExtraction = {
		about: "winding drum and extraction gear",
		tags: "mine machinery extraction",
		mats: { w: "ppOak", m: "ppIron", g: "ppGold" },
		parts: [
			["mirror", "x", ["box", "w", [24, 0, 0], [7, 10, 44]]],
			["box", "w", [0, 0, 41], [60, 12, 7]],
			["cyl", "m", [0, 0, 8], 21, 5, { seg: 12 }],
			["cyl", "g", [0, 0, 15], 14, 4, { seg: 10 }],
			["box", "m", [0, 0, 20], [8, 8, 16]],
		],
	};

	E.Humanoid.hat("ppLamp", (h) => {
		const { g, r, c } = h,
			t = E.tones(c),
			crown = h.at(-0.3, 0, 1.15),
			brimA = h.at(4.1, 0, -0.15),
			brimB = h.at(-4.6, 0, -0.15),
			lamp = h.at(3.8, 0, 1.05);
		px.disc(g, crown[0], crown[1], r * 1.06, t.sh);
		px.disc(g, crown[0] - 0.6, crown[1] - 0.8, r * 0.87, t.base);
		px.line(
			g,
			crown[0] - r * 0.5,
			crown[1] - r * 0.68,
			crown[0] + r * 0.42,
			crown[1] - r * 0.68,
			t.hi,
			Math.max(1, r * 0.22),
		);
		px.line(
			g,
			brimA[0],
			brimA[1],
			brimB[0],
			brimB[1],
			t.deep,
			Math.max(2, r * 0.5),
		);
		px.line(
			g,
			brimA[0],
			brimA[1] - 0.7,
			brimB[0],
			brimB[1] - 0.7,
			t.lt,
			Math.max(1, r * 0.24),
		);
		px.disc(g, lamp[0], lamp[1], Math.max(2, r * 0.49), "#182f38");
		px.disc(g, lamp[0] - 0.4, lamp[1] - 0.4, Math.max(1, r * 0.28), "#fff3c4");
	});
	E.Humanoid.hat("ppTwinLamp", (h) => {
		E.Humanoid.hats.ppLamp(h);
		const a = h.at(-1.2, -2, 3),
			b = h.at(-1.2, 2, 3);
		px.rect(h.g, a[0] - 1, a[1] - 2, 3, 3, "#c8f8ed");
		px.rect(h.g, b[0] - 1, b[1] - 2, 3, 3, "#c8f8ed");
	});
	E.Humanoid.weapon("ppPick", {
		length: 12,
		rest: [0.55, 0.1, -0.85],
		blade: true,
		draw(w) {
			const { g } = w,
				bot = w.at(-3),
				top = w.at(11),
				head = w.at(9.7),
				u = Math.max(0.7, w.u),
				dx = top[0] - bot[0],
				dy = top[1] - bot[1],
				len = Math.hypot(dx, dy) || 1,
				nx = -dy / len,
				ny = dx / len;
			const steel = E.tones(w.rig._ppWear === 1 ? CORAL : "#c2d9d8");
			w.push((bot[2] + top[2]) / 2 + 0.03, () => {
				px.line(
					g,
					bot[0],
					bot[1],
					top[0],
					top[1],
					"#172830",
					Math.max(3, u * 2.8),
				);
				px.line(
					g,
					bot[0] - 0.5,
					bot[1] - 0.5,
					top[0] - 0.5,
					top[1] - 0.5,
					"#af7744",
					Math.max(1, u * 1.3),
				);
				const hx = head[0],
					hy = head[1],
					f = u * 8.4;
				const verts = [
					[hx + nx * f - (dx / len) * u * 2, hy + ny * f - (dy / len) * u * 2],
					[
						hx + nx * f * 0.63 + (dx / len) * u * 2,
						hy + ny * f * 0.63 + (dy / len) * u * 2,
					],
					[hx + (dx / len) * u * 3, hy + (dy / len) * u * 3],
					[
						hx - nx * f * 0.65 + (dx / len) * u * 2,
						hy - ny * f * 0.65 + (dy / len) * u * 2,
					],
					[hx - nx * f - (dx / len) * u * 2, hy - ny * f - (dy / len) * u * 2],
					[hx - nx * f * 0.4, hy - ny * f * 0.4],
					[hx + nx * f * 0.4, hy + ny * f * 0.4],
				];
				px.poly(g, verts, steel.sh);
				px.line(
					g,
					verts[0][0],
					verts[0][1],
					verts[2][0],
					verts[2][1],
					steel.hi,
					Math.max(1, u),
				);
				px.line(
					g,
					verts[2][0],
					verts[2][1],
					verts[4][0],
					verts[4][1],
					steel.lt,
					Math.max(1, u),
				);
				px.disc(g, hx, hy, u * 1.6, "#e5b664");
			});
		},
	});
	const blend = (J, key, to, w) => {
		if (J[key])
			for (let i = 0; i < 3; i++)
				J[key][i] += ((to[i] ?? J[key][i]) - J[key][i]) * w;
	};
	E.Humanoid.pose("ppBoast", (J, w) => {
		blend(J, "handL", [-1, -6, 16], w);
		blend(J, "elbowL", [-3, -7, 18], w);
		blend(J, "handR", [3, 5, 24], w);
	});
	E.Humanoid.pose("ppBreak", (J, w) => {
		blend(J, "handR", [7, 6, 17], w);
		blend(J, "handL", [5, -6, 17], w);
		blend(J, "head", [-1, 0, 24], w);
	});
	E.Humanoid.pose("ppJam", (J, w) => {
		blend(J, "handR", [8, 5, 17], w);
		blend(J, "handL", [8, -5, 17], w);
		blend(J, "head", [3, 0, 22], w);
	});
	E.Humanoid.pose("ppRescue", (J, w) => {
		blend(J, "handR", [10, 3, 9], w);
		blend(J, "handL", [10, -3, 9], w);
		blend(J, "head", [3, 0, 20], w);
	});
	E.Humanoid.pose("ppRedirect", (J, w) => {
		blend(J, "handR", [8, 4, 24], w);
		blend(J, "handL", [0, -6, 13], w);
	});

	const key = (g, x, y, s = 1, c = GOLD) => {
		px.disc(g, x - 4 * s, y - 2 * s, 5 * s, "#17343b");
		px.disc(g, x - 4 * s, y - 2 * s, 3.8 * s, c);
		px.disc(g, x - 4 * s, y - 2 * s, 1.7 * s, "#17343b");
		px.line(g, x, y, x + 10 * s, y + 6 * s, "#17343b", 4 * s);
		px.line(g, x, y - 1 * s, x + 10 * s, y + 5 * s, c, 2 * s);
		px.line(g, x + 6 * s, y + 3 * s, x + 4 * s, y + 6 * s, c, 2 * s);
		px.line(g, x + 9 * s, y + 5 * s, x + 7 * s, y + 8 * s, c, 2 * s);
		px.dot(g, x - 6 * s, y - 4 * s, "#fff8d4");
	};
	const pick = (g, x, y, s = 1) => {
		px.line(g, x - 6 * s, y + 9 * s, x + 5 * s, y - 9 * s, "#132e35", 4 * s);
		px.line(g, x - 6 * s, y + 9 * s, x + 5 * s, y - 9 * s, "#c3985e", 2 * s);
		px.poly(
			g,
			[
				[x - 8 * s, y - 9 * s],
				[x - 4 * s, y - 13 * s],
				[x + 7 * s, y - 11 * s],
				[x + 13 * s, y - 4 * s],
				[x + 6 * s, y - 7 * s],
				[x - 4 * s, y - 9 * s],
			],
			"#b7d6d8",
		);
		px.line(g, x - 7 * s, y - 10 * s, x + 6 * s, y - 12 * s, "#f5f6dc", s);
	};
	const diamond = (g, x, y, s, c) => {
		px.poly(
			g,
			[
				[x, y - s],
				[x + s * 0.7, y],
				[x, y + s],
				[x - s * 0.7, y],
			],
			c,
		);
		px.line(g, x, y - s, x, y + s, E.tones(c).lt);
	};
	PP.Assets = { GOLD, TEAL, CORAL, key, pick, diamond };
})();
