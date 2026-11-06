/* Native pixel forms, house palettes and depth-sorted actors. Draw is read-only. */
const E = globalThis.My3D2dge;
const { px, TAU } = E;
const C = {
	ink: "#eceddf",
	dim: "#8b9ba4",
	teal: "#8ff4da",
	gold: "#f6cd7a",
	red: "#ff836b",
	blue: "#8fbdf8",
	space: "#071018",
};
E.MATERIALS.orbitAlloy = { color: "#607f89", pattern: "metal", rivet: 8 };
E.MATERIALS.orbitGlow = { color: "#93e6d4", pattern: "none", glow: 1 };
E.SHAPES.orbitBeacon = {
	about: "Orbital rail beacon with shaded alloy body and emissive antenna",
	tags: "space station beacon",
	mats: { m: "orbitAlloy", g: "orbitGlow" },
	parts: [
		["cyl", "m", [0, 0, 0], 10, 5, { seg: 6 }],
		["box", "m", [0, 0, 5], [6, 8, 10]],
		["box", "g", [0, 0, 15], [12, 3, 3]],
		["row", 2, [18, 0, 0], ["box", "m", [0, 0, 4], [11, 15, 2]]],
	],
};
const palettes = [
	["#0a1822", "#112b34", "#75ddcb"],
	["#121526", "#26233e", "#bdabef"],
	["#201721", "#3c2630", "#f7ad78"],
	["#111c23", "#1a333b", "#a3ead4"],
];
const probePath = new E.Path(
	[
		[0, 0, 0],
		[50, -15, 0],
		[80, 25, 0],
		[35, 52, 0],
		[-20, 25, 0],
	],
	{ closed: true, smooth: "catmull" },
);
const stars = Array.from({ length: 210 }, (_, i) => {
	const rng = E.rng(91011 + i * 337);
	return { x: rng(), y: rng(), r: rng(), p: rng() * TAU };
});
export function fitArena(game) {
	const W = game.W,
		H = game.H,
		portrait = H > W * 1.15;
	const top = portrait ? Math.min(125, H * 0.19) : 67,
		bottom = portrait ? Math.min(150, H * 0.22) : 56;
	const k = Math.min((W - 44) / 960, (H - top - bottom) / 540);
	const cy = top + (540 * k) / 2;
	if (Math.abs((game.baseView.scale || 0) - k) > 0.0001)
		game.setView(new E.View("overhead", "Orbital arena", 0, 90, k, 1));
	game.cam.offset = [0, cy - H / 2];
	game.cam.smooth = 0;
	game.focus(480, 270, 0);
	return { k, x: (W - 960 * k) / 2, y: top, w: 960 * k, h: 540 * k, portrait };
}
function txt(g, s, x, y, c = C.ink, opt = {}) {
	E.font.text(g, String(s), x, y, c, {
		outline: false,
		shadow: "#03080d",
		...opt,
	});
}
function lineRing(g, x, y, r, c, n = 40, th = 1, phase = 0) {
	for (let i = 0; i < n; i++) {
		const a = phase + (i / n) * TAU,
			b = phase + ((i + 0.65) / n) * TAU;
		px.line(
			g,
			x + Math.cos(a) * r,
			y + Math.sin(a) * r,
			x + Math.cos(b) * r,
			y + Math.sin(b) * r,
			c,
			th,
		);
	}
}
function poly(g, x, y, points, angle, color, k = 1) {
	const cs = Math.cos(angle),
		sn = Math.sin(angle);
	px.poly(
		g,
		points.map(([a, b]) => [
			x + (a * cs - b * sn) * k,
			y + (a * sn + b * cs) * k,
		]),
		color,
	);
}
export function drawSaucer(g, x, y, k, t, p = {}) {
	const tns = E.tones(p.pilot === 1 ? "#c5a6d8" : "#8badb4"),
		trim = p.pilot === 1 ? C.gold : C.teal;
	const tilt = E.clamp((p.vx || 0) / 150, -1, 1) * 2 * k;
	const bob = Math.sin(t * 2.7) * 1.4 * k;
	x -= Math.cos(p.angle || 0) * (p.recoil || 0) * 2 * k;
	y -= Math.sin(p.angle || 0) * (p.recoil || 0) * 2 * k;
	y += bob;
	px.ell(g, x, y + 10 * k, 20 * k, 6 * k, "#040a10");
	if (p.down) {
		poly(
			g,
			x,
			y,
			[
				[-18, -2],
				[-5, -8],
				[9, -6],
				[17, 5],
				[0, 9],
				[-16, 6],
			],
			0.15,
			tns.deep,
			k,
		);
		px.line(g, x - 13 * k, y + 5 * k, x + 11 * k, y - 3 * k, C.red, 2 * k);
		lineRing(g, x, y, 29 * k, C.gold, 14);
		txt(g, "WRECK", x, y + 32 * k, C.gold, { align: "center" });
		return;
	}
	px.blend(g, 0.18, "add", () => px.ell(g, x, y + 7 * k, 27 * k, 10 * k, trim));
	px.ell(g, x, y + 4 * k + tilt, 23 * k, 11 * k, tns.deep);
	px.ell(g, x, y + tilt, 23 * k, 11 * k, tns.sh);
	px.ell(g, x, y - 3 * k + tilt, 21 * k, 9 * k, tns.base);
	px.ell(g, x - 2 * k, y - 5 * k + tilt, 18 * k, 7 * k, tns.lt);
	px.ell(g, x, y - 7 * k, 11 * k, 9 * k, "#243e4c");
	px.ell(g, x - 2 * k, y - 9 * k, 9 * k, 7 * k, "#78c9cb");
	px.ell(g, x - 4 * k, y - 11 * k, 5 * k, 3 * k, "#dafff0");
	px.line(
		g,
		x - 17 * k,
		y - 2 * k + tilt,
		x - 10 * k,
		y - 5 * k + tilt,
		tns.hi,
		k,
	);
	for (let i = 0; i < 7; i++) {
		const a = (i / 7) * TAU + t * 0.4;
		px.rect(
			g,
			x + Math.cos(a) * 18 * k - 1 * k,
			y + Math.sin(a) * 6 * k + 3 * k,
			3 * k,
			2 * k,
			Math.sin(a + t * 3) > 0 ? trim : tns.sh,
		);
	}
	if (p.pilot === 1) {
		poly(
			g,
			x,
			y,
			[
				[-23, -4],
				[-29, -1],
				[-23, 3],
			],
			0,
			C.gold,
			k,
		);
		poly(
			g,
			x,
			y,
			[
				[23, -4],
				[29, -1],
				[23, 3],
			],
			0,
			C.gold,
			k,
		);
	} else {
		px.rect(g, x - 2 * k, y + 6 * k, 4 * k, 4 * k, C.teal);
	}
	const ready = !(p.shield > 0),
		fill = ready ? 1 : Math.max(0, 1 - p.shield / (p.recharge || 1.6));
	for (let i = 0; i < 28; i++) {
		const a = (i / 28) * TAU;
		const filled = i < fill * 28;
		px.disc(
			g,
			x + Math.cos(a) * 33 * k,
			y + Math.sin(a) * 33 * k,
			Math.max(1, k * (ready ? 1.8 : 1.2)),
			ready ? trim : filled ? "#617a84" : "#263b45",
		);
	}
	if (!ready) {
		lineRing(g, x, y, 36 * k, "#b46a52", 8, Math.max(1, k), t * 0.2);
	}
	if (p.invuln > 0) {
		lineRing(g, x, y, 39 * k, "#fff3c9", 12, Math.max(1, 2 * k), t * 1.4);
	}
	if (p.angle !== undefined) {
		const a = p.angle;
		px.blend(g, 0.3, "add", () =>
			px.disc(
				g,
				x + Math.cos(a) * 34 * k,
				y + Math.sin(a) * 34 * k,
				5 * k,
				"#ffffff",
			),
		);
		px.disc(
			g,
			x + Math.cos(a) * 34 * k,
			y + Math.sin(a) * 34 * k,
			Math.max(2, 3 * k),
			"#ffffff",
		);
		if (
			Math.abs(
				Math.atan2(Math.sin(p.targetAngle - a), Math.cos(p.targetAngle - a)),
			) > 0.08
		) {
			const b = p.targetAngle;
			poly(
				g,
				x + Math.cos(b) * 43 * k,
				y + Math.sin(b) * 43 * k,
				[
					[-3, -3],
					[3, 0],
					[-3, 3],
				],
				b,
				C.gold,
				k,
			);
		}
	}
}
function drifter(g, x, y, k, t, e) {
	const tones = E.tones(e.mergeWith || e.mergeId ? "#b6a0e4" : "#cf9c78"),
		a = (e.angle ?? e.rot ?? e.id * 0.4) + t * 0.36;
	for (let i = 0; i < 4; i++) {
		const b = a + (i * TAU) / 4;
		poly(
			g,
			x,
			y,
			[
				[5, -4],
				[19, -5],
				[19, 4],
				[7, 4],
			],
			b,
			tones.deep,
			k,
		);
		poly(
			g,
			x,
			y,
			[
				[6, -5],
				[19, -5],
				[17, 1],
				[6, 2],
			],
			b,
			tones.base,
			k,
		);
		poly(
			g,
			x,
			y,
			[
				[8, -4],
				[16, -4],
				[15, -2],
				[8, -2],
			],
			b,
			tones.lt,
			k,
		);
	}
	px.disc(g, x + 2 * k, y + 3 * k, 9 * k, tones.deep);
	px.disc(g, x, y, 8 * k, tones.sh);
	px.disc(g, x - 1 * k, y - 2 * k, 5 * k, tones.lt);
	px.disc(g, x - 1 * k, y - 2 * k, 2 * k, C.gold);
}
function hunter(g, x, y, k, t, e) {
	const a = e.angle || Math.atan2(e.vy || 0, e.vx || 1),
		c = e.arm > 0 ? "#b6a0e4" : "#ff856e";
	lineRing(g, x, y, 23 * k, c, 8, 2 * k, t * 0.5);
	poly(
		g,
		x,
		y,
		[
			[22, 0],
			[-9, -13],
			[-3, 0],
			[-9, 13],
		],
		a,
		"#602a37",
		k,
	);
	poly(
		g,
		x - 1 * k,
		y - 2 * k,
		[
			[18, 0],
			[-10, -11],
			[-5, 0],
			[-10, 11],
		],
		a,
		c,
		k,
	);
	px.disc(g, x, y, 5 * k, "#fce3bb");
}
function gunship(g, x, y, k, t, e) {
	const a = e.angle ?? Math.atan2(e.vy || 0.4, e.vx || 1);
	poly(
		g,
		x,
		y,
		[
			[-32, -8],
			[0, -14],
			[35, 0],
			[0, 14],
			[-32, 8],
			[-22, 0],
		],
		a,
		"#452e42",
		k,
	);
	poly(
		g,
		x - 1 * k,
		y - 3 * k,
		[
			[-28, -7],
			[0, -12],
			[31, 0],
			[0, 10],
			[-28, 7],
			[-18, 0],
		],
		a,
		"#c87783",
		k,
	);
	poly(
		g,
		x - 2 * k,
		y - 4 * k,
		[
			[-12, -4],
			[12, -3],
			[20, 0],
			[-12, 3],
		],
		a,
		"#f4c5a4",
		k,
	);
	for (const v of [-1, 1])
		poly(
			g,
			x,
			y,
			[
				[-28, v * 5],
				[-38 - Math.sin(t * 28) * 5, v * 6],
				[-28, v * 9],
			],
			a,
			C.teal,
			k,
		);
}
function boss(g, x, y, k, t, e) {
	const phase = e.phase || 1,
		tones = E.tones("#748b9a");
	lineRing(g, x, y, 82 * k, "#47616e", 48, k, t * 0.08);
	for (let i = 0; i < 6; i++) {
		const a = (i * TAU) / 6 + t * 0.08;
		poly(
			g,
			x,
			y,
			[
				[28, -13],
				[65, -17],
				[74, 0],
				[65, 17],
				[28, 13],
			],
			a,
			tones.deep,
			k,
		);
		poly(
			g,
			x,
			y - 4 * k,
			[
				[28, -12],
				[63, -15],
				[70, 0],
				[63, 12],
				[28, 10],
			],
			a,
			tones.base,
			k,
		);
	}
	px.ell(g, x, y + 7 * k, 48 * k, 40 * k, tones.deep);
	px.ell(g, x, y, 46 * k, 37 * k, tones.sh);
	px.ell(g, x - 4 * k, y - 6 * k, 39 * k, 30 * k, tones.lt);
	px.disc(g, x, y - 8 * k, 22 * k, "#1b3a49");
	px.disc(g, x - 4 * k, y - 12 * k, 14 * k, C.teal);
	px.disc(g, x - 8 * k, y - 16 * k, 7 * k, "#ebffe6");
	const components = e.components || [
		{ x: x - 65, y },
		{ x: x + 65, y },
		{ x, y: y + 62 },
	];
	for (let i = 0; i < components.length; i++) {
		const q = components[i],
			qx = q.x ?? x + Math.cos((i * TAU) / 3) * 64,
			qy = q.y ?? y + Math.sin((i * TAU) / 3) * 64;
		const xx = x + (qx - e.x) * k,
			yy = y + (qy - e.y) * k;
		const open = q.open ?? q.vulnerable ?? e.vulnerable ?? true;
		px.disc(g, xx, yy, 15 * k, "#253a45");
		lineRing(g, xx, yy, 17 * k, open ? C.gold : "#657481", 12, 2 * k, t * 0.4);
		px.disc(g, xx, yy, 9 * k, open ? "#ffc178" : "#637b88");
		px.disc(g, xx - 2 * k, yy - 3 * k, 4 * k, open ? "#fff3b8" : "#adc0c5");
	}
	txt(g, "COMMAND / " + phase, x, y - 94 * k, C.gold, { align: "center" });
}
export class Presentation {
	constructor(game) {
		this.game = game;
		this.time = 0;
		this.layout = null;
		this.pulses = [];
		this.lastEvent = 0;
		this.titlePose = { lift: 1 };
		this.subtitle = "";
		this.debugOverlay = false;
	}
	update(dt, world) {
		this.time += dt;
		this.layout = fitArena(this.game);
		this.pulses = this.pulses.filter((p) => this.time - p.at < 1.5);
		if (world)
			for (const e of world.events || [])
				if (e.id > this.lastEvent) {
					this.lastEvent = e.id;
					if (
						[
							"destroy",
							"chain",
							"fusion-warning",
							"fusion",
							"hull-hit",
							"rescue",
							"boss-phase",
							"shield-spent",
							"shield-ready",
							"gunship-warning",
							"shot",
							"boss-hit",
						].includes(e.type)
					)
						this.pulses.push({ ...e, at: this.time });
				}
	}
	reset() {
		this.lastEvent = 0;
		this.pulses = [];
	}
	background(r, sector = 0) {
		const t = this.game.reduceMotion ? 0 : this.time,
			pal = palettes[sector % 4];
		r.sky([pal[0], C.space, "#080f17"]);
		r.decal((g) => {
			// Soft stepped nebulae, far star layers, and an etched orbital chart.
			for (let i = 10; i > 0; i--)
				px.blend(g, 0.025, "add", () =>
					px.ell(
						g,
						r.W * 0.75 + Math.sin(i) * 20,
						r.H * 0.36,
						30 + i * 19,
						12 + i * 12,
						pal[1],
					),
				);
			for (const s of stars) {
				const xx = (s.x * r.W + t * (0.25 + s.r)) % r.W,
					yy = s.y * r.H;
				px.rect(
					g,
					xx,
					yy,
					s.r > 0.88 ? 2 : 1,
					1,
					s.r > 0.9 ? "#a8bbb7" : s.r > 0.55 ? "#526a77" : "#253846",
				);
				if (s.r > 0.97) {
					px.dot(g, xx, yy - 2, "#526a77");
					px.dot(g, xx, yy + 2, "#526a77");
				}
			}
			const cx = r.W * 0.81,
				cy = r.H * 0.26,
				rad = Math.min(r.W, r.H) * 0.22;
			for (let i = 0; i < 5; i++)
				lineRing(g, cx, cy, rad + i * 5, "#172c35", 72, 1, 0.2);
			px.disc(g, cx, cy, rad, "#172c35");
			px.disc(g, cx - rad * 0.12, cy - rad * 0.12, rad * 0.91, "#1a333b");
			px.disc(g, cx - rad * 0.26, cy - rad * 0.2, rad * 0.69, "#213e43");
			for (let i = 0; i < 12; i++) {
				const a = i * 2.399;
				px.ell(
					g,
					cx + Math.cos(a) * rad * 0.55,
					cy + Math.sin(a) * rad * 0.55,
					rad * (0.08 + (i % 3) * 0.03),
					rad * 0.045,
					"#1c363f",
				);
			}
		});
	}
	title(r) {
		this.background(r, 0);
		r.overlay((g) => {
			const compact = r.H > r.W * 1.15;
			const x = compact ? r.W * 0.72 : r.W * 0.74,
				y = compact ? r.H * 0.26 : r.H * 0.5,
				k = Math.min(r.W / 630, r.H / 380) * (compact ? 1.1 : 1.75);
			const t = this.game.reduceMotion ? 0 : this.time;
			lineRing(g, x, y, 95 * k, "#37535a", 100, k, -0.3);
			lineRing(g, x, y, 124 * k, "#223b46", 110, k, 0.2);
			for (let i = 0; i < 12; i++) {
				const a = (i * TAU) / 12;
				px.line(
					g,
					x + Math.cos(a) * 118 * k,
					y + Math.sin(a) * 118 * k,
					x + Math.cos(a) * 125 * k,
					y + Math.sin(a) * 125 * k,
					"#52716e",
					k,
				);
			}
			drawSaucer(g, x, y, k * 2.1, t, {
				angle: t * 0.45,
				targetAngle: t * 0.45,
				shield: 0,
			});
			const probe = probePath.at((t * 12) % probePath.length);
			drifter(
				g,
				x - 90 * k + probe.x * 0.35 * k,
				y - 80 * k + probe.y * 0.35 * k,
				k * 0.8,
				t,
				{ id: 3 },
			);
			hunter(g, x + 94 * k, y + 55 * k, k * 0.7, t, { angle: 3.5 });
			txt(
				g,
				"01 / ORBITAL DEFENCE DIVISION",
				compact ? 18 : r.W * 0.07,
				25,
				C.teal,
				{ scale: 1 },
			);
			txt(g, "A VERY CONFIDENT LITTLE SAUCER.", x, r.H - 55, C.dim, {
				align: "center",
			});
			txt(g, "ONE SHOT. NO SHIELD. YOUR MOVE.", x, r.H - 39, C.gold, {
				align: "center",
			});
			px.rect(g, 18, r.H - 19, r.W - 36, 1, "#29424a");
			txt(g, "AN ARCADE FIELD MANUAL", 20, r.H - 12, "#6e9294");
			txt(g, "EST. 1981 / REIMAGINED 2026", r.W - 20, r.H - 12, "#6e9294", {
				align: "right",
			});
		});
	}
	world(r, w, { attract = false, hub = null } = {}) {
		this.background(r, w.sector || 0);
		const L = this.layout || fitArena(this.game),
			t = this.game.reduceMotion ? w.time : this.time,
			pal = palettes[(w.sector || 0) % 4],
			P = (x, y) => [L.x + x * L.k, L.y + y * L.k];
		r.decal((g) => {
			const x = L.x,
				y = L.y,
				ww = L.w,
				hh = L.h;
			px.blend(g, 0.83, "normal", () => px.rect(g, x, y, ww, hh, "#07131b"));
			for (let ix = 0; ix <= 960; ix += 80)
				for (let iy = 0; iy <= 540; iy += 60) {
					const [xx, yy] = P(ix, iy);
					px.rect(g, xx, yy, 1, 1, "#24414a");
				}
			for (let i = 0; i < 4; i++) {
				const xx = x + (i % 2) * ww,
					yy = y + Math.floor(i / 2) * hh,
					dx = i % 2 ? -1 : 1,
					dy = i > 1 ? -1 : 1;
				px.line(g, xx, yy, xx + dx * 24, yy, pal[2], 2);
				px.line(g, xx, yy, xx, yy + dy * 20, pal[2], 2);
			}
			px.line(g, x + 27, y, x + ww - 27, y, "#2f5358");
			px.line(g, x + 27, y + hh, x + ww - 27, y + hh, "#2f5358");
			px.line(g, x, y + 23, x, y + hh - 23, "#2f5358");
			px.line(g, x + ww, y + 23, x + ww, y + hh - 23, "#2f5358");
			for (let i = 0; i < 12; i++) {
				const xx = x + (ww * i) / 12;
				px.rect(g, xx, y - 5, 8, 2, i % 3 === 0 ? pal[2] : "#294149");
				px.rect(g, xx, y + hh + 4, 8, 2, i % 3 === 0 ? pal[2] : "#294149");
			}
			if (w.extraction) {
				const [ex, ey] = P(w.extraction.x, w.extraction.y);
				lineRing(g, ex, ey, (60 + Math.sin(t * 4) * 6) * L.k, C.teal, 30, 2);
				txt(g, "EXTRACTION CLEAR", ex, ey - 75 * L.k, C.teal, {
					align: "center",
					scale: 2,
				});
			}
			for (const gate of w.gates || []) {
				const [xx, yy] = P(gate.x, gate.y);
				lineRing(g, xx, yy, (30 + Math.sin(t * 10) * 4) * L.k, C.gold, 12, 2);
				txt(g, "INCOMING", xx, yy - 35 * L.k, C.gold, { align: "center" });
			}
			for (const e of w.enemies || []) {
				if (
					e.type === "gunship" &&
					(e.warning > 0 || e.warn > 0 || e.state === "warning")
				) {
					const [a, b] = P(e.lane?.x1 ?? e.x, e.lane?.y1 ?? e.y),
						[c, d] = P(e.lane?.x2 ?? 960, e.lane?.y2 ?? 540);
					for (let i = 0; i < 20; i += 2)
						px.line(
							g,
							a + ((c - a) * i) / 20,
							b + ((d - b) * i) / 20,
							a + ((c - a) * (i + 1)) / 20,
							b + ((d - b) * (i + 1)) / 20,
							C.red,
						);
				}
			}
			for (const f of w.fusions || []) {
				const a = (w.enemies || []).find((e) => e.id === f.a),
					b = (w.enemies || []).find((e) => e.id === f.b);
				if (a && b) px.line(g, ...P(a.x, a.y), ...P(b.x, b.y), "#c0a1f7", 2);
			}
			for (const e of w.enemies || []) {
				const mate = (w.enemies || []).find(
					(m) => m.id === (e.mergeWith || e.mergeId || e.partner),
				);
				if (mate)
					px.line(g, ...P(e.x, e.y), ...P(mate.x, mate.y), "#ba99ef", 2);
			}
			for (const b of w.blasts || []) {
				const [xx, yy] = P(b.x, b.y),
					age = b.age ?? w.time - (b.born ?? w.time),
					rad = (b.radius ?? b.r ?? 55) * L.k;
				lineRing(
					g,
					xx,
					yy,
					rad * (0.3 + Math.min(1, age * 4)),
					C.gold,
					30,
					Math.max(1, 3 * (1 - age) * L.k),
				);
			}
		});
		for (const [xx, yy] of [
			[-45, 55],
			[1005, 55],
			[-45, 485],
			[1005, 485],
		])
			r.shape("orbitBeacon", xx, yy, 0, {
				scale: 0.9,
				shadow: false,
				light: true,
			});
		for (const e of w.enemies || []) {
			if (e.dead) continue;
			const fn =
				e.type === "boss"
					? boss
					: e.type === "hunter" || e.type === "pursuer"
						? hunter
						: e.type === "gunship"
							? gunship
							: drifter;
			r.actor(e.x, e.y, 0, (g, x, y) => fn(g, x, y, L.k, t, e), {
				emissive: true,
			});
		}
		for (const p of w.players || []) {
			if (p.active === false) continue;
			r.actor(
				p.x,
				p.y,
				0,
				(g, x, y) =>
					drawSaucer(
						g,
						x,
						y,
						L.k *
							(this.game.reduceMotion ? 1 : 0.65 + 0.35 * this.titlePose.lift),
						t,
						{
							...p,
							pilot: (w.players || []).indexOf(p),
							recharge: w.balance?.recharge ?? w.balance?.shieldRecharge ?? 1.6,
						},
					),
				{ emissive: true },
			);
		}
		for (const b of w.bullets || []) {
			r.actor(
				b.x,
				b.y,
				0,
				(g, x, y) => {
					const c = b.hostile ? C.red : "#d6fff0";
					const v = Math.hypot(b.vx, b.vy) || 1;
					px.line(
						g,
						x - (b.vx / v) * 9 * L.k,
						y - (b.vy / v) * 9 * L.k,
						x,
						y,
						c,
						Math.max(1, 2 * L.k),
					);
					px.disc(g, x, y, Math.max(1, 2 * L.k), "#fff5d3");
				},
				{ emissive: true },
			);
		}
		r.overlay((g) => {
			for (const e of this.pulses) {
				const age = this.time - e.at,
					[x, y] = P(e.x ?? 480, e.y ?? 270),
					n = e.type === "destroy" ? 14 : 8;
				if (
					[
						"destroy",
						"chain",
						"hull-hit",
						"rescue",
						"shield-spent",
						"fusion-warning",
						"fusion",
						"shield-ready",
					].includes(e.type)
				) {
					for (let i = 0; i < n; i++) {
						const a = (i * TAU) / n + e.id * 0.5,
							dist = (15 + age * 70) * (e.type === "chain" ? 1.5 : 1) * L.k;
						px.rect(
							g,
							x + Math.cos(a) * dist,
							y + Math.sin(a) * dist,
							Math.max(1, (3 - age * 2) * L.k),
							Math.max(1, (3 - age * 2) * L.k),
							e.type === "hull-hit"
								? C.red
								: e.type === "shield-ready" || e.type === "rescue"
									? C.teal
									: C.gold,
						);
					}
					if (age < 0.45)
						lineRing(
							g,
							x,
							y,
							(12 + E.ease.outQuad(Math.min(1, age)) * 75) * L.k,
							e.type === "hull-hit" ? C.red : C.gold,
							22,
							Math.max(1, 3 - age * 4),
						);
				}
			}
			const chains = Array.isArray(w.chains)
				? w.chains
				: Object.values(w.chains || {});
			for (const c of chains) {
				const age = w.time - (c.last ?? c.lastTime ?? c.born ?? w.time);
				if ((c.count || c.depth || 0) > 1 && age < 1.5) {
					const [x, y] = P(c.x ?? 480, c.y ?? 270);
					txt(
						g,
						`CHAIN ${c.count ?? c.depth} / x${Math.min(8, c.depth || 1)}`,
						x,
						y - 30,
						C.gold,
						{ align: "center", scale: 1 },
					);
				}
			}
			if (this.debugOverlay) {
				for (const e of [...w.enemies, ...w.players])
					lineRing(g, ...P(e.x, e.y), (e.r || 20) * L.k, "#f081cb", 24);
				for (const p of w.players) {
					px.line(
						g,
						...P(p.x, p.y),
						...P(p.x + Math.cos(p.angle) * 90, p.y + Math.sin(p.angle) * 90),
						C.gold,
					);
				}
			}
			this.hud(g, r, w, L, attract, hub);
		});
	}
	hud(g, r, w, L, attract, hub) {
		const sectorNames = [
			"FIRST CONTACT",
			"THE DRIFTING FIELD",
			"CROSSING SIGNALS",
			"COMMAND / EXTRACTION",
		];
		txt(g, "UFOh ORBIT", 22, 15, C.teal, { scale: 2 });
		txt(g, String(w.score || 0).padStart(6, "0"), r.W / 2, 13, C.ink, {
			scale: 3,
			align: "center",
		});
		txt(
			g,
			w.mode === "score" || w.mode === "score-attack"
				? "SCORE ATTACK"
				: `SECTOR ${(w.sector || 0) + 1} / 4`,
			r.W - 65,
			17,
			C.gold,
			{ align: "right" },
		);
		txt(g, sectorNames[w.sector || 0], 22, 37, C.dim);
		txt(g, `BEST CHAIN ${w.bestChain || 0}`, r.W - 65, 34, C.dim, {
			align: "right",
		});
		if (attract) {
			px.rect(g, r.W / 2 - 97, 47, 194, 17, "#e8d8ad");
			txt(g, "DEMO / ANY INPUT TO PILOT", r.W / 2, 52, "#172a31", {
				align: "center",
			});
		} else if (hub && hub.state !== "running") {
			px.rect(g, r.W / 2 - 105, 47, 210, 17, "#d0edd9");
			txt(
				g,
				hub.state === "countdown"
					? "LINK READY / LAUNCH IN 3"
					: "AI HUB / SYNCHRONISING",
				r.W / 2,
				52,
				"#172a31",
				{ align: "center" },
			);
		}
		const bottom = L.y + L.h + 16;
		(w.players || []).forEach((p, i) => {
			const x = i ? r.W - 188 : 22,
				c = i ? C.gold : C.teal;
			txt(g, p.name ? String(p.name).slice(0, 12) : `P${i + 1}`, x, bottom, c);
			for (let j = 0; j < 3; j++) {
				poly(
					g,
					x + 26 + j * 11,
					bottom + 3,
					[
						[0, -3],
						[4, 0],
						[0, 3],
						[-4, 0],
					],
					0,
					j < p.hull ? c : "#33444e",
				);
			}
			txt(
				g,
				p.active === false
					? "PILOT DEPARTED"
					: p.down
						? "READY RING TO RESCUE"
						: p.shield > 0
							? "RECHARGING / HALF SPEED"
							: "SHIELD READY / RAM SAFE",
				x,
				bottom + 13,
				p.down ? C.gold : p.shield > 0 ? C.red : c,
			);
		});
		let objective = w.objective || "RING READY? RAM. CANNON READY? THINK.";
		if (w.sector === 0 && w.tutorial) {
			const q = w.tutorial;
			if (!q.moved) objective = "STEER THE SAUCER / WASD OR LEFT STICK";
			else if (!q.fired)
				objective = "POINT AT A DRIFTER / WAIT FOR THE WHITE BEAD / FIRE";
			else if (!q.recharged)
				objective = "STOP FIRING / LET THE WHOLE RING RETURN";
			else if (!q.rammed)
				objective = "RING READY / TOUCH A DRIFTER TO RAM IT SAFELY";
		}
		txt(
			g,
			objective.length > 78 ? objective.slice(0, 76) + ".." : objective,
			r.W / 2,
			r.H - 17,
			C.ink,
			{ align: "center" },
		);
		if (this.subtitle)
			txt(g, this.subtitle, r.W / 2, r.H - 39, C.gold, { align: "center" });
		if (w.boss && !w.boss.dead) {
			const b = w.boss,
				hp = b.health ?? 1,
				max = b.maxHealth ?? hp;
			E.ui.bar(g, r.W * 0.3, 49, r.W * 0.4, 5, Math.max(0, hp / max), C.red);
		}
		if (w.debug)
			txt(g, "DEV / RECORDS DISABLED", r.W / 2, 64, C.red, { align: "center" });
		for (const p of w.players || [])
			if (
				p.down &&
				p.active !== false &&
				(w.players || []).some(
					(q) =>
						!q.down && q.shield <= 0 && Math.hypot(p.x - q.x, p.y - q.y) < 100,
				)
			) {
				const [x, y] = [L.x + p.x * L.k, L.y + p.y * L.k];
				txt(g, "READY RING: TOUCH TO RESCUE", x, y - 40, C.gold, {
					align: "center",
				});
			}
	}
}
export { C };
