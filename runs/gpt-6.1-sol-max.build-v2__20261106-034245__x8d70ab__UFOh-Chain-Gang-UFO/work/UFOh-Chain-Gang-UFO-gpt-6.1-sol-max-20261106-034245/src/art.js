// Original pixel machinery. All animation is a projection of supplied state/time.
// No draw operation writes gameplay state or advances any random stream.
let E;
let P;
let ramps;
const TAU = Math.PI * 2;
const PALETTES = [
	{
		sky: ["#040b17", "#09182a", "#07111e"],
		mist: "#134662",
		planet: "#234665",
		rim: "#4f8c9d",
		wire: "#18344b",
	},
	{
		sky: ["#0d0a1b", "#171326", "#0a1120"],
		mist: "#3a284e",
		planet: "#58465a",
		rim: "#a38780",
		wire: "#392c46",
	},
	{
		sky: ["#0b0b20", "#151326", "#08151f"],
		mist: "#30345c",
		planet: "#433b70",
		rim: "#7879b5",
		wire: "#2b314b",
	},
	{
		sky: ["#100b1d", "#1a1521", "#090e19"],
		mist: "#4a253b",
		planet: "#653947",
		rim: "#b37871",
		wire: "#39273d",
	},
];

function ensure() {
	if (!E) registerArt(globalThis.My3D2dge);
}

/** Registers optional native shape/sprite data and returns the original icon set. */
export function registerArt(engine) {
	E = engine;
	P = E.px;
	ramps = {
		hull: E.tones("#809aa7"),
		p1: E.tones("#58e8bc"),
		p2: E.tones("#ffd174"),
		drifter: E.tones("#e5a16b"),
		hunter: E.tones("#ed6481"),
		gunship: E.tones("#c77f9d"),
		boss: E.tones("#8c839d"),
	};
	E.MATERIALS.cgHull = { color: "#25344c", pattern: "metal", rivet: 4 };
	E.MATERIALS.cgEdge = { color: "#54667b", pattern: "none" };
	E.MATERIALS.cgLamp = { color: "#48b8b4", pattern: "none", glow: 1 };
	E.SHAPES.cgRelay = {
		about:
			"Original distant orbital relay: forked aerial, jointed solar wings, lamp core",
		tags: "space station relay antenna",
		mats: { h: "cgHull", e: "cgEdge", l: "cgLamp" },
		parts: [
			["cyl", "h", [0, 0, 0], 7, 8, { seg: 8 }],
			["cyl", "e", [0, 0, 8], 4, 2, { seg: 8 }],
			["box", "h", [0, 0, 9], [3, 3, 24]],
			["mirror", "x", ["box", "e", [8, 0, 25], [2, 2, 12]]],
			["box", "e", [0, 0, 25], [18, 2, 2]],
			["cyl", "l", [0, 0, 33], 2.5, 1, { seg: 6 }],
			["mirror", "x", ["box", "e", [18, 0, 6], [25, 2, 2]]],
			["mirror", "x", ["box", "h", [28, 0, 3], [17, 20, 3]]],
			["mirror", "x", ["box", "e", [28, 0, 6], [1, 20, 1]]],
		],
	};
	E.SHAPES.cgWreck = {
		about: "Original broken satellite body with two mismatched solar fins",
		tags: "space debris wreck satellite",
		mats: { h: "cgHull", e: "cgEdge" },
		parts: [
			["cyl", "h", [0, 0, 0], 5.5, 5, { seg: 6 }],
			["cyl", "e", [0, 0, 5], 3, 2, { seg: 6 }],
			["box", "e", [9, 0, 1], [13, 2, 1], { rot: 12 }],
			["box", "h", [14, 0, 2], [8, 9, 1], { rot: 12 }],
			["box", "h", [-7, 0, 2], [7, 5, 2], { rot: -26 }],
		],
	};
	const icons = {
		saucer: E.sprite(
			[
				"....cc....",
				"...cCCc...",
				".ssCCCCss.",
				"sSSSSSSSSs",
				".a.a..a.a.",
				"...gggg...",
			],
			{
				c: "#459d94",
				C: "#b5ffe1",
				s: "#597888",
				S: "#e4f0e8",
				a: "#ffdd84",
				g: "#235c78",
			},
		),
		drifter: E.sprite(
			[
				"...aa...",
				"...aA...",
				"..sAA...",
				"aaAAASaa",
				"aAAASsAa",
				"...As...",
				"...Aa...",
				"...aa...",
			],
			{ a: "#ac724d", A: "#f2c28a", s: "#283947", S: "#dcebe5" },
		),
		hunter: E.sprite(
			[
				"..r..r..",
				".rRrrRr.",
				"rR.cc.Rr",
				".rCccCr.",
				".rCccCr.",
				"rR.cc.Rr",
				".rRrrRr.",
				"..r..r..",
			],
			{ r: "#8a3f6c", R: "#ff9baf", c: "#fff0da", C: "#f9597c" },
		),
	};
	return icons;
}

function painter(g, x, y, k, angle = 0) {
	const c = Math.cos(angle);
	const s = Math.sin(angle);
	const at = (u, v) => [x + (u * c - v * s) * k, y + (u * s + v * c) * k];
	const poly = (pts, col) =>
		P.poly(
			g,
			pts.map((p) => at(p[0], p[1])),
			col,
		);
	const line = (x0, y0, x1, y1, col, w = 1) =>
		P.line(
			g,
			...at(x0, y0),
			...at(x1, y1),
			col,
			Math.max(1, Math.round(w * k)),
		);
	const dot = (u, v, col, size = 1) => {
		const q = at(u, v);
		const n = Math.max(1, Math.round(size * k));
		P.rect(g, q[0] - n / 2, q[1] - n / 2, n, n, col);
	};
	const ell = (u, v, rx, ry, col) => {
		if (Math.abs(angle) < 0.001) P.ell(g, ...at(u, v), rx * k, ry * k, col);
		else
			poly(
				Array.from({ length: 28 }, (_, i) => [
					u + Math.cos((i / 28) * TAU) * rx,
					v + Math.sin((i / 28) * TAU) * ry,
				]),
				col,
			);
	};
	const rect = (u, v, w, h, col) =>
		poly(
			[
				[u, v],
				[u + w, v],
				[u + w, v + h],
				[u, v + h],
			],
			col,
		);
	const ring = (u, v, rx, ry, col, width = 1, phase = 0, n = 36) => {
		for (let i = 0; i < n; i++) {
			const a = (i / n) * TAU + phase;
			const b = ((i + 1) / n) * TAU + phase;
			line(
				u + Math.cos(a) * rx,
				v + Math.sin(a) * ry,
				u + Math.cos(b) * rx,
				v + Math.sin(b) * ry,
				col,
				width,
			);
		}
	};
	return { at, poly, line, dot, ell, rect, ring };
}

function lights(g, x, y, radius, color, strength = 0.4) {
	P.blend(g, strength, "add", () => P.ddisc(g, x, y, radius, color, 0.6));
}

/** A raised glass dome and a thick, banked disk. The defensive ring is external. */
export function drawSaucer(g, x, y, pilot, k = 1, time = 0, comfort = {}) {
	ensure();
	const p = pilot || {};
	const two = (p.index ?? p.id ?? 0) % 2 === 1;
	const accent = two ? ramps.p2 : ramps.p1;
	const motion = !(comfort.reduceMotion || comfort.motion === false);
	const t = motion ? time : 0;
	const bank = motion ? Math.max(-0.11, Math.min(0.11, (p.vx || 0) / 2000)) : 0;
	const a = painter(g, x, y, k, bank);
	const metal = ramps.hull;
	const dark = "#06101c";
	if (p.down) {
		a.ell(0, 3, 20, 11, dark);
		a.poly(
			[
				[-19, 0],
				[-10, -8],
				[3, -9],
				[11, -4],
				[19, -1],
				[13, 7],
				[0, 11],
				[-12, 8],
			],
			"#334454",
		);
		a.poly(
			[
				[-18, -1],
				[-8, -6],
				[-1, -5],
				[-6, 0],
				[-1, 2],
				[-4, 6],
				[-12, 5],
			],
			"#71828d",
		);
		a.poly(
			[
				[2, -8],
				[12, -5],
				[18, 0],
				[9, 3],
				[11, 7],
				[2, 8],
				[-1, 3],
			],
			"#4b586b",
		);
		a.line(-14, -1, -4, 1, "#bec6be");
		a.line(-1, -4, 4, -1, "#d68268");
		a.ell(-1, -4, 7, 6, "#1b293a");
		a.poly(
			[
				[-5, -7],
				[-1, -10],
				[4, -6],
				[0, -3],
				[-4, -4],
			],
			"#648a91",
		);
		for (let i = 0; i < 5; i++) {
			const u = (t * 1.7 + i * 0.27) % 1;
			const q = a.at((i - 2) * 6 + Math.sin(i * 9) * u * 10, -2 - u * 13);
			P.dot(g, q[0], q[1], u < 0.4 ? "#ffdda1" : "#926264");
		}
		return;
	}
	const speed = Math.hypot(p.vx || 0, p.vy || 0);
	lights(g, x, y + 5 * k, 24 * k, two ? "#b18a52" : "#2f8aa0", 0.24);
	a.ell(0, 4, 17, 10, "#0b2138");
	a.ell(0, 6, 10 + Math.min(speed / 80, 3), 6, "#163e5a");
	a.ell(0, 7, 7, 3, "#2d7792");
	a.ell(-2, 7, 4, 1.5, "#8de7d1");
	if (two) {
		// Two swept fins distinguish pilot two even without color.
		a.poly(
			[
				[-16, -2],
				[-24, -7],
				[-21, 6],
				[-14, 7],
			],
			dark,
		);
		a.poly(
			[
				[16, -2],
				[24, -7],
				[21, 6],
				[14, 7],
			],
			dark,
		);
		a.poly(
			[
				[-16, -1],
				[-22, -5],
				[-19, 5],
				[-13, 5],
			],
			accent.sh,
		);
		a.poly(
			[
				[16, -1],
				[22, -5],
				[19, 5],
				[13, 5],
			],
			accent.base,
		);
	} else {
		a.line(-11, -5, -13, -15, dark, 3);
		a.line(-11, -5, -13, -14, metal.lt);
		a.ell(-13, -14, 2, 2, accent.lt);
	}
	a.ell(0, 2, 20, 12, dark);
	a.ell(0, 1, 19, 10, metal.deep);
	a.ell(0, -1, 19, 10, metal.sh);
	a.ell(-1, -3, 18, 8, metal.base);
	a.ell(-3, -5, 14, 5, metal.lt);
	a.ell(-6, -6, 8, 3, metal.hi);
	a.ell(1, 0, 15, 6, metal.base);
	a.line(-15, 1, -10, 4, "#b9ced1");
	a.line(10, 3, 17, 0, metal.lt);
	a.line(-10, 7, 10, 7, "#263e51");
	a.ell(0, -5, 10, 9, dark);
	a.ell(0, -6, 9, 8, accent.deep);
	a.ell(-1, -8, 8, 7, accent.sh);
	a.ell(-2, -9, 6.5, 5.5, accent.base);
	a.ell(-3.5, -10.5, 4.5, 3.5, accent.lt);
	a.ell(-5, -12, 2, 1.5, "#f1ffe9");
	a.line(4, -10, 6, -7, accent.base);
	a.line(-7, -4, 5, -2, metal.hi);
	const lampA = two ? "#ffda87" : "#86ffdc";
	for (let i = 0; i < 8; i++) {
		const a0 = (i / 8) * TAU;
		const on = (i + Math.floor(t * 4)) % 4 !== 0;
		a.ell(
			Math.cos(a0) * 16,
			Math.sin(a0) * 6 + 1,
			1.7,
			1.2,
			on ? lampA : accent.sh,
		);
	}
	// Black pilot marker, one stripe versus two, is legible on both trims.
	a.line(-3, -3, -3, 0, dark, 2);
	if (two) a.line(2, -3, 2, 0, dark, 2);
	if ((p.invuln || 0) > 0) {
		const bright =
			comfort.flashes === false || comfort.reducedFlash
				? true
				: Math.floor(time * 8) % 2 === 0;
		if (bright) {
			a.line(-17, -5, -12, -9, "#ffffff");
			a.line(-17, -5, -20, 0, "#ffffff");
			a.line(13, 7, 18, 3, "#ffffff");
			a.dot(-4, -14, "#ffffff", 2);
		}
	}
}

function drifter(g, x, y, enemy, k, t) {
	const a = painter(g, x, y, k, enemy.rot || 0);
	const c = ramps.drifter;
	const rim = "#101b2c";
	const cross = [
		[-5, -18],
		[5, -18],
		[5, -6],
		[18, -6],
		[18, 5],
		[6, 5],
		[6, 18],
		[-5, 18],
		[-5, 6],
		[-18, 6],
		[-18, -5],
		[-5, -5],
	];
	a.poly(
		cross.map((p) => [p[0], p[1] + 3]),
		rim,
	);
	a.poly(cross, c.deep);
	const top = cross.map((p) => [p[0] * 0.9 - 0.6, p[1] * 0.9 - 1]);
	a.poly(top, c.base);
	for (const dir of [-1, 1]) {
		a.rect(-3, dir < 0 ? -16 : 8, 5, 8, "#31465a");
		a.rect(dir < 0 ? -16 : 8, -3, 8, 5, "#31465a");
		a.line(-2, dir < 0 ? -15 : 9, 1, dir < 0 ? -15 : 9, "#81a1ad");
		a.line(dir < 0 ? -15 : 9, -2, dir < 0 ? -15 : 9, 1, "#81a1ad");
		a.line(-2, dir < 0 ? -12 : 12, 1, dir < 0 ? -12 : 12, "#5d798a");
		a.line(dir < 0 ? -12 : 12, -2, dir < 0 ? -12 : 12, 1, "#5d798a");
	}
	a.line(-4, -17, -4, -6, c.hi);
	a.line(-17, -4, -6, -4, c.hi);
	a.ell(0, 0, 7, 7, rim);
	a.ell(-0.5, -1, 5.8, 5.8, c.lt);
	a.ell(1, 0.5, 3.5, 3.5, c.sh);
	a.ell(-1, -2, 2, 2, "#fff2bc");
	a.dot(2, 2, "#80544f", 2);
	if (enemy.merge != null && enemy.merge !== false) {
		lights(g, x, y, 22 * k, "#f1ad73", 0.25);
		a.dot(-4, 0, Math.sin(t * 8) > 0 ? "#fff2b2" : "#e3a378", 2);
		a.dot(4, 0, Math.sin(t * 8) > 0 ? "#fff2b2" : "#e3a378", 2);
	}
}

function hunter(g, x, y, enemy, k, t) {
	const a = painter(g, x, y, k, enemy.rot || 0);
	const c = ramps.hunter;
	const black = "#100f21";
	const sharp = [
		[0, -23],
		[7, -12],
		[17, -16],
		[14, -5],
		[23, 0],
		[13, 7],
		[16, 18],
		[5, 15],
		[0, 23],
		[-6, 14],
		[-17, 17],
		[-14, 5],
		[-23, 0],
		[-13, -6],
		[-17, -18],
		[-5, -14],
	];
	a.poly(
		sharp.map((p) => [p[0], p[1] + 2]),
		black,
	);
	a.poly(sharp, c.deep);
	a.poly(
		sharp.map((p) => [p[0] * 0.82 - 0.5, p[1] * 0.82 - 1]),
		c.base,
	);
	a.ring(0, 0, 16, 16, "#241c36", 4, 0, 16);
	a.ring(0, -1, 16, 16, c.lt, 1, 0, 16);
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * TAU;
		a.line(
			Math.cos(angle) * 13,
			Math.sin(angle) * 13,
			Math.cos(angle) * 17,
			Math.sin(angle) * 17,
			c.sh,
			3,
		);
		a.dot(
			Math.cos(angle) * 17,
			Math.sin(angle) * 17,
			i % 2 ? "#ffc1ac" : "#ffe2ca",
			1,
		);
	}
	a.ell(-4, -1, 7, 9, black);
	a.ell(4, -1, 7, 9, black);
	a.ell(-4, -2, 5, 7, c.sh);
	a.ell(4, -2, 5, 7, c.base);
	a.ell(-4, -3, 3, 4, "#f5c79b");
	a.ell(4, -3, 3, 4, "#f5c79b");
	a.line(-8, 1, 8, 1, black, 3);
	a.line(-4, 1, 4, 1, "#ff5e79");
	a.ell(-1, -4, 2, 2, "#fff3d6");
	if ((enemy.arm || 0) > 0) {
		a.ring(
			0,
			0,
			23 + Math.sin(t * 7),
			23 + Math.sin(t * 7),
			"#9b717f",
			1,
			0,
			12,
		);
	}
}

function gunship(g, x, y, enemy, k, t) {
	const velocity = Math.hypot(enemy.vx || 0, enemy.vy || 0);
	const angle =
		velocity > 0.01 ? Math.atan2(enemy.vy, enemy.vx) : enemy.rot || 0.5;
	const a = painter(g, x, y, k, angle);
	const c = ramps.gunship;
	const edge = "#100f24";
	const body = [
		[32, 0],
		[16, -8],
		[-5, -10],
		[-18, -7],
		[-28, -13],
		[-21, -2],
		[-28, 13],
		[-5, 10],
		[16, 8],
	];
	a.poly(
		body.map((p) => [p[0], p[1] + 2]),
		edge,
	);
	a.poly(body, c.deep);
	a.poly(
		[
			[30, -1],
			[12, -7],
			[-5, -8],
			[-17, -5],
			[-23, -10],
			[-17, 1],
			[-22, 9],
			[-5, 7],
			[14, 5],
		],
		c.base,
	);
	a.poly(
		[
			[27, -1],
			[8, -5],
			[-10, -5],
			[-14, -2],
			[7, -1],
		],
		c.lt,
	);
	a.poly(
		[
			[12, 5],
			[-5, 7],
			[-19, 6],
			[-11, 1],
			[24, 0],
		],
		c.sh,
	);
	a.line(-21, -10, -13, -6, "#f3b9c1");
	a.line(-11, 9, 17, 6, "#744b73");
	a.line(-9, -11, 17, -11, edge, 4);
	a.line(-9, -12, 18, -12, "#9b9bab", 2);
	a.line(-9, -11, 22, -11, "#f6ad8c");
	a.line(-9, 12, 17, 12, edge, 4);
	a.line(-9, 11, 22, 11, "#f6ad8c");
	a.line(20, -11, 24, -11, "#ffdbc2", 2);
	a.line(20, 11, 24, 11, "#ffdbc2", 2);
	a.ell(0, -1, 8, 7, edge);
	a.ell(0, -2, 6, 5, "#8b3557");
	a.ell(-2, -3, 4, 3, "#f17e85");
	a.dot(-3, -4, "#ffe3bd", 2);
	a.line(9, 0, 18, 0, "#e7a09e", 2);
	const flame = 7 + (Math.sin(t * 17) + 1) * 2;
	a.poly(
		[
			[-20, -5],
			[-20 - flame, -3],
			[-20, -1],
		],
		"#903f69",
	);
	a.poly(
		[
			[-20, 1],
			[-20 - flame, 3],
			[-20, 5],
		],
		"#903f69",
	);
	a.line(-21, -3, -26, -3, "#ffc57f");
	a.line(-21, 3, -26, 3, "#ffc57f");
	if (enemy.warning) {
		lights(g, ...a.at(17, 0), 14 * k, "#ff8a7b", 0.28);
		a.dot(17, 0, "#fff1c8", 3);
	}
}

export function drawEnemy(g, x, y, enemy, k = 1, time = 0, comfort = {}) {
	ensure();
	const t = comfort.reduceMotion || comfort.motion === false ? 0 : time;
	if (enemy.kind === "hunter") hunter(g, x, y, enemy, k, t);
	else if (enemy.kind === "gunship") gunship(g, x, y, enemy, k, t);
	else drifter(g, x, y, enemy, k, t);
}

function turret(g, x, y, k, component, phase) {
	const a = painter(g, x, y, k, component.angle || 0);
	const dead = component.hp <= 0;
	const open = !dead && !!component.open;
	a.ell(0, 3, 17, 14, "#0c1021");
	a.ell(0, 1, 16, 13, "#46415d");
	a.ell(-1, -1, 15, 12, "#a0a1af");
	a.ell(0, 0, 12, 10, "#1d2436");
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * TAU;
		a.dot(
			Math.cos(angle) * 14,
			Math.sin(angle) * 11 - 1,
			i < 4 ? "#c7c8ca" : "#56506c",
			1,
		);
	}
	if (dead) {
		a.ell(0, 0, 9, 8, "#0a0f1d");
		a.poly(
			[
				[-8, -5],
				[-2, -2],
				[-4, 4],
				[3, 1],
				[7, 4],
				[0, 7],
				[-7, 4],
			],
			"#443344",
		);
		a.line(-7, -5, -2, -2, "#936e70");
		a.dot(4, 2, "#bd6f60", 2);
		return;
	}
	if (open) {
		lights(g, x, y, 24 * k, "#f2bd77", 0.4);
		a.ell(0, 0, 10, 8, "#ab5c62");
		a.ell(-1, -1, 8, 7, "#f5a66b");
		a.ell(-1, -1, 5, 5, "#fff4c4");
		a.ell(-2, -2, 2, 2, "#ffffff");
		a.poly(
			[
				[-11, -7],
				[-3, -8],
				[-5, -13],
				[-14, -11],
			],
			"#b2acb3",
		);
		a.poly(
			[
				[11, 7],
				[3, 8],
				[5, 13],
				[14, 11],
			],
			"#62546f",
		);
		a.line(-11, -9, -5, -10, "#f5d5c2");
		a.line(5, 9, 11, 9, "#d6948a");
	} else {
		a.poly(
			[
				[-11, -7],
				[2, -9],
				[11, -4],
				[2, 1],
				[-9, 4],
			],
			"#7c758e",
		);
		a.poly(
			[
				[-9, 5],
				[3, 0],
				[11, -3],
				[10, 7],
				[-1, 10],
			],
			"#55475f",
		);
		a.line(-9, -5, 1, -7, "#c2b8bf");
		a.line(-9, 5, 9, -3, "#22243a", 2);
		a.dot(0, 1, phase > 1 ? "#ed8085" : "#b18d87", 2);
	}
}

/** The command ship is constructed from the same disk, cross and rail vocabulary. */
export function drawBoss(g, x, y, boss, k = 1, time = 0, comfort = {}) {
	ensure();
	if (!boss) return;
	const t = comfort.reduceMotion || comfort.motion === false ? 0 : time;
	const phase = Math.max(0, Math.min(2, boss.phase || 0));
	const a = painter(g, x, y, k);
	const c = ramps.boss;
	const edge = "#090f1b";
	lights(g, x, y + 12 * k, 79 * k, "#593655", 0.18);
	a.ell(0, 12, 72, 43, "#07101f");
	// Outrigger rails and jointed wings belong to the same machine as the gunships.
	for (const side of [-1, 1]) {
		a.poly(
			[
				[side * 38, -18],
				[side * 72, -29],
				[side * 83, -18],
				[side * 69, -1],
				[side * 80, 14],
				[side * 62, 26],
				[side * 38, 15],
			],
			edge,
		);
		a.poly(
			[
				[side * 40, -16],
				[side * 71, -25],
				[side * 78, -17],
				[side * 64, -1],
				[side * 74, 12],
				[side * 61, 21],
				[side * 40, 12],
			],
			c.sh,
		);
		a.line(side * 46, -15, side * 70, -21, c.lt, 2);
		a.line(side * 62, 17, side * 69, 12, "#b68b9c");
		a.rect(side < 0 ? -74 : 59, -7, 15, 10, "#302f48");
		a.line(side * 66, -7, side * 66, 3, "#b198a8");
		for (let j = 0; j < 4; j++)
			a.line(side * (46 + j * 6), 5, side * (48 + j * 6), 13, "#161f35", 2);
		a.line(side * 55, -24, side * 55, -40, edge, 5);
		a.line(side * 55, -25, side * 55, -39, c.base, 2);
		a.ell(side * 55, -40, 4, 2.5, phase > 0 ? "#f5b38e" : "#768b9c");
	}
	a.ell(0, 5, 62, 40, edge);
	a.ell(0, 2, 60, 37, c.deep);
	a.ell(-1, -3, 59, 34, c.sh);
	a.ell(-3, -8, 56, 29, c.base);
	a.ell(-10, -13, 44, 19, c.lt);
	a.ell(-15, -17, 30, 11, "#c1bbc4");
	a.ell(6, 0, 49, 24, c.base);
	a.ell(4, 6, 47, 19, c.sh);
	a.line(-48, 11, -34, 23, "#a2a4ae", 2);
	a.line(-34, 23, -14, 29, "#74758a");
	a.line(19, 27, 44, 15, "#30334c", 2);
	// Radial armor divisions preserve the segmented silhouette during every phase.
	for (let i = 0; i < 10; i++) {
		const angle = (i / 10) * TAU;
		a.line(
			Math.cos(angle) * 31,
			Math.sin(angle) * 17 - 4,
			Math.cos(angle) * 56,
			Math.sin(angle) * 31 - 4,
			"#4b4761",
		);
		a.dot(Math.cos(angle) * 54, Math.sin(angle) * 28 - 4, "#d6c3b6", 2);
	}
	a.ell(0, -11, 27, 22, edge);
	a.ell(0, -13, 25, 20, "#332e4b");
	a.ell(-3, -16, 22, 17, "#655675");
	a.ell(-6, -20, 17, 12, "#99839a");
	a.ell(-11, -24, 10, 5, "#cbb8bc");
	a.ell(2, -9, 18, 12, "#473a58");
	// A command eye, three stacked slit windows, and an animated mechanical iris.
	const aperture =
		4 + E.ease.inOutSine((Math.sin(t * 0.8) + 1) / 2) * (phase + 1);
	a.ell(0, -13, 10, aperture, "#221d34");
	a.ell(0, -14, 8, Math.max(2, aperture - 1), "#d4778e");
	a.ell(-2, -15, 5, Math.max(1, aperture - 3), "#ffe2bb");
	a.line(-17, -2, 17, -2, "#1d2035", 3);
	for (let i = -2; i <= 2; i++) a.line(i * 6, -2, i * 6 + 2, -2, "#efa78f");
	for (let i = 0; i < 12; i++) {
		const angle = (i / 12) * TAU;
		const lamp = (i + Math.floor(t * (phase + 2))) % 4 === 0;
		a.ell(
			Math.cos(angle) * 51,
			Math.sin(angle) * 26 + 2,
			2.4,
			1.5,
			lamp ? "#ffdb9e" : "#975d73",
		);
	}
	for (const component of boss.components || []) {
		const sx = x + ((component.x ?? boss.x) - boss.x) * k;
		const sy = y + ((component.y ?? boss.y) - boss.y) * k;
		turret(g, sx, sy, k, component, phase);
	}
}

function fixedHash(n) {
	const s = Math.sin(n * 127.1 + 31.7) * 43758.5453;
	return s - Math.floor(s);
}

function distantStation(g, x, y, size, tilt, color) {
	const a = painter(g, x, y, size, tilt);
	a.line(-55, 0, 55, 0, color, 4);
	a.rect(-5, -15, 10, 30, "#1a2335");
	a.rect(-4, -15, 3, 25, color);
	for (const side of [-1, 1]) {
		a.rect(side < 0 ? -58 : 18, -22, 40, 44, "#0c1728");
		a.rect(side < 0 ? -57 : 19, -21, 38, 42, "#15243b");
		for (let j = 0; j < 5; j++)
			a.line(side * (21 + j * 8), -21, side * (21 + j * 8), 20, color);
		for (let j = 0; j < 4; j++)
			a.line(side * 20, -20 + j * 13, side * 57, -20 + j * 13, color);
	}
	a.ell(0, -8, 10, 13, "#152034");
	a.ell(-2, -10, 8, 10, color);
	a.ell(-4, -13, 5, 6, "#263b50");
	a.line(0, -17, 0, -39, color, 2);
	a.line(-9, -34, 9, -34, color);
	a.line(-6, -39, -6, -30, color);
	a.line(6, -39, 6, -30, color);
}

/** Screen-space backdrop queued as a decal, under every actor and projectile. */
export function drawBackdrop(r, sector = 0, time = 0, options = {}) {
	ensure();
	const index = typeof sector === "number" ? sector : sector.index || 0;
	const palette = PALETTES[((index % 4) + 4) % 4];
	const still = r.game?.reduceMotion;
	const t = still ? 0 : time;
	const title = !!options.title;
	r.sky(palette.sky);
	const W = r.W;
	const H = r.H;
	r.decal((g) => {
		// Large bands of low-value color create a painted cloud field from sharp pixels.
		for (let layer = 0; layer < 3; layer++) {
			for (let i = 0; i < 9; i++) {
				const u = fixedHash(i * 4.3 + index * 17 + layer * 31);
				const v = fixedHash(i * 11.2 + index * 23 + layer * 13);
				const x = u * W + Math.sin(t * 0.007 + i) * (still ? 0 : 5);
				const y = v * H;
				P.blend(g, 0.125, "add", () =>
					P.ell(
						g,
						x,
						y,
						38 + layer * 24 + fixedHash(i) * 55,
						12 + layer * 12,
						palette.mist,
					),
				);
			}
		}
		for (let i = 0; i < 170; i++) {
			const depth = 1 + (i % 3);
			const x =
				(fixedHash(i * 3.71) * (W + 8) -
					4 +
					Math.sin(t * 0.006) * depth * 2 +
					W) %
				W;
			const y =
				(fixedHash(i * 7.23 + 18) * H + (title ? t * depth * 0.08 : 0)) % H;
			const bright = i % 19 === 0;
			const col = bright ? "#8098ac" : i % 5 === 0 ? "#4c6179" : "#263d57";
			P.dot(g, x, y, col);
			if (bright && (still || Math.sin(t * 0.4 + i) > 0.4)) {
				P.line(g, x - 2, y, x + 2, y, "#334e67");
				P.line(g, x, y - 2, x, y + 2, "#334e67");
				P.dot(g, x, y, "#a8b4bb");
			}
		}
		const planetX = title ? W * 0.78 : W * 0.91;
		const planetY = title ? H * 0.22 : H * 0.04;
		const radius = Math.min(W, H) * (title ? 0.29 : 0.21);
		P.blend(g, 0.2, "normal", () =>
			P.disc(g, planetX - 1, planetY - 1, radius + 3, palette.rim),
		);
		P.disc(g, planetX, planetY, radius, "#111d30");
		P.disc(
			g,
			planetX - radius * 0.04,
			planetY - radius * 0.04,
			radius * 0.97,
			palette.planet,
		);
		P.disc(
			g,
			planetX + radius * 0.24,
			planetY + radius * 0.17,
			radius * 0.9,
			"#142338",
		);
		P.disc(
			g,
			planetX + radius * 0.4,
			planetY + radius * 0.28,
			radius * 0.81,
			"#0c1729",
		);
		// Sparse lit terrain contour on the crescent; no downloaded textures.
		for (let i = 0; i < 22; i++) {
			const angle = 2.5 + fixedHash(i + 900) * 2.7;
			const rr = radius * (0.88 + fixedHash(i + 410) * 0.07);
			const px = planetX + Math.cos(angle) * rr;
			const py = planetY + Math.sin(angle) * rr;
			P.line(
				g,
				px,
				py,
				px + 2 + fixedHash(i) * 3,
				py - 1,
				i % 3 === 0 ? palette.rim : "#34465c",
			);
		}
		if (index === 1) {
			const a = painter(g, W * 0.04, H * 0.23, Math.min(W, H) / 350, -0.45);
			for (let i = 0; i < 48; i++) {
				if ((i > 12 && i < 19) || (i > 31 && i < 38)) continue;
				const angle = (i / 48) * TAU;
				const b = ((i + 1) / 48) * TAU;
				a.line(
					Math.cos(angle) * 95,
					Math.sin(angle) * 95,
					Math.cos(b) * 95,
					Math.sin(b) * 95,
					"#2b2a40",
					6,
				);
				a.line(
					Math.cos(angle) * 90,
					Math.sin(angle) * 90,
					Math.cos(b) * 90,
					Math.sin(b) * 90,
					"#45364a",
				);
				if (i % 4 === 0)
					a.line(
						Math.cos(angle) * 85,
						Math.sin(angle) * 85,
						Math.cos(angle) * 102,
						Math.sin(angle) * 102,
						"#393346",
						3,
					);
			}
		}
		if (index === 2) {
			distantStation(g, W * 0.065, H * 0.22, 0.73, -0.6, "#26364c");
			distantStation(g, W * 0.94, H * 0.82, 0.58, 0.7, "#21334b");
		} else if (index === 3) {
			const a = painter(g, W * 0.14, -H * 0.08, Math.min(W, H) / 300, 0);
			a.ring(0, 0, 100, 100, "#3a2a40", 5);
			a.ring(0, 0, 94, 94, "#503348", 1);
			for (let i = 0; i < 12; i++) {
				const angle = (i / 12) * TAU;
				a.line(
					Math.cos(angle) * 75,
					Math.sin(angle) * 75,
					Math.cos(angle) * 115,
					Math.sin(angle) * 115,
					"#2a2338",
					5,
				);
			}
		} else {
			distantStation(g, W * 0.06, H * 0.84, 0.55, -0.2, "#22394e");
		}
		// Vignetting is a handful of flat pixel bands, preserving a dark combat field.
		P.blend(g, 0.25, "normal", () => {
			P.rect(g, 0, 0, W, 9, "#020611");
			P.rect(g, 0, H - 8, W, 8, "#020611");
			P.rect(g, 0, 0, 5, H, "#020611");
			P.rect(g, W - 5, 0, 5, H, "#020611");
		});
	});
}
