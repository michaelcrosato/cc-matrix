(function (S) {
	"use strict";
	const E = My3D2dge,
		{ px } = E,
		C = {
			navy: "#07141f",
			ink: "#0b1d2d",
			line: "#294354",
			cream: "#f0dfb4",
			cyan: "#8ae5dc",
			red: "#ec8b79",
			muted: "#7d98a9",
		};
	const txt = (g, s, x, y, color = C.muted, scale = 1, align = "left") =>
		E.font.text(g, s, x, y, color, {
			scale,
			align,
			outline: false,
			shadow: "#050e18",
		});
	function line(g, x0, y0, x1, y1, c, w = 1) {
		px.line(
			g,
			Math.round(x0),
			Math.round(y0),
			Math.round(x1),
			Math.round(y1),
			c,
			w,
		);
	}
	function ring(g, x, y, r, c, w = 1, start = 0, end = Math.PI * 2) {
		const n = Math.ceil(r * 0.5),
			steps = Math.max(12, n);
		for (let i = 0; i < steps; i++) {
			const a = start + ((end - start) * i) / steps,
				b = start + ((end - start) * (i + 1)) / steps;
			line(
				g,
				x + Math.cos(a) * r,
				y + Math.sin(a) * r,
				x + Math.cos(b) * r,
				y + Math.sin(b) * r,
				c,
				w,
			);
		}
	}
	function panel(g, x, y, w, h, color = "#516c7c") {
		const t = E.tones(color);
		px.rect(g, x, y, w, h, t.deep);
		px.rect(g, x + 1, y + 1, w - 2, h - 3, t.base);
		px.rect(g, x + 1, y + 1, w - 2, 2, t.lt);
		px.rect(g, x + w - 3, y + 2, 2, h - 5, t.sh);
		if (w > 14 && h > 12)
			for (const dx of [3, w - 5])
				for (const dy of [4, h - 6]) px.rect(g, x + dx, y + dy, 2, 2, t.deep);
	}
	function fortress(
		g,
		x,
		y,
		k,
		t,
		{ heat = 0, locks = [false, false, false, false], damaged = false } = {},
	) {
		const P = (a, b) => [x + a * k, y + b * k],
			R = (a, b, w, h, c) => px.rect(g, ...P(a, b), w * k, h * k, c),
			L = (a, b, c, d, col, w = 1) =>
				line(g, ...P(a, b), ...P(c, d), col, w * k);
		const round = (a, b, r, c, w = 1) => ring(g, ...P(a, b), r * k, c, w * k);
		// Four radiators are individually lit, locked and animated, attached to a continuous armored ring.
		round(0, 5, 70, "#0c1b29", 8);
		round(0, 1, 67, "#8b9a9b", 2);
		round(0, 2, 61, "#273f50", 7);
		for (let i = 0; i < 4; i++) {
			const a = (i * Math.PI) / 2 + Math.PI / 4,
				rx = Math.cos(a) * 64,
				ry = Math.sin(a) * 64;
			const locked = locks[i],
				col = locked ? "#c09bce" : heat > 65 ? "#d77d65" : "#67a49e";
			panel(g, x + (rx - 16) * k, y + (ry - 12) * k, 32 * k, 24 * k, col);
			for (let j = 0; j < 5; j++)
				R(
					rx - 11 + j * 5,
					ry - 8,
					2,
					16,
					locked
						? "#493951"
						: heat > 65
							? "#f5b98b"
							: Math.sin(t * 2 + j) > 0.1
								? "#b6e6c8"
								: "#578d8d",
				);
			if (locked) L(rx - 11, ry - 8, rx + 11, ry + 8, "#f0d6ff", 2);
			else if (heat > 2)
				for (let n = 0; n < 3; n++) {
					const d = (t * 8 + n * 8) % 23;
					px.blend(g, (1 - d / 24) * 0.25, "add", () =>
						R(
							rx + (i === 0 || i === 3 ? 1 : -1) * d - 8,
							ry + (i < 2 ? 1 : -1) * d - 5,
							15,
							9,
							"#93dcc6",
						),
					);
				}
		}
		px.poly(
			g,
			[
				P(-43, -40),
				P(-22, -60),
				P(22, -60),
				P(43, -40),
				P(43, 34),
				P(24, 52),
				P(-24, 52),
				P(-43, 34),
			],
			"#263e50",
		);
		px.poly(
			g,
			[
				P(-40, -40),
				P(-21, -55),
				P(21, -55),
				P(39, -39),
				P(39, 31),
				P(22, 47),
				P(-21, 47),
				P(-40, 31),
			],
			"#5b7280",
		);
		R(-36, -34, 72, 4, "#a8b6ad");
		R(-34, 25, 68, 9, "#1a2c3c");
		for (const sign of [-1, 1]) {
			panel(g, x + (sign * 26 - 11) * k, y - 31 * k, 22 * k, 55 * k, "#708792");
			for (let i = 0; i < 6; i++)
				R(
					sign * 26 - 7,
					-24 + i * 7,
					13,
					2,
					i === Math.floor(t * 2) % 6 ? "#d5e8cd" : "#304b5e",
				);
		}
		R(-11, -45, 22, 79, "#21354a");
		R(-7, -42, 14, 64, "#9caeae");
		R(-4, -39, 3, 49, "#dce0bf");
		round(0, 0, 25, "#253749", 6);
		round(0, -2, 22, "#b2b69a", 2);
		round(0, -2, 18, "#273f4c", 5);
		px.disc(g, x, y - 2 * k, 13 * k, "#315d64");
		px.disc(g, x - 3 * k, y - 5 * k, 8 * k, heat > 70 ? "#e9a17b" : "#a3d5c1");
		R(-3, -10, 6, 16, "#def0cf");
		R(-8, -5, 16, 5, "#def0cf");
		// Antenna masts, docking clamps, windows and the thirteen stencil.
		L(-18, -49, -18, -86, "#8c9fa4", 1);
		L(-18, -81, -10, -81, "#b5c5b6");
		R(-20, -89, 4, 3, Math.sin(t * 3) > 0 ? "#ebac7c" : "#5d5960");
		L(22, -43, 22, -73, "#8c9fa4");
		round(22, -76, 8, "#98afa8");
		L(16, -80, 28, -71, "#d9dbc0");
		R(-12, 38, 24, 7, "#1c3445");
		txt(g, "13", x, y + 37 * k, C.cream, Math.max(1, Math.round(k)), "center");
		for (const dx of [-38, 34]) R(dx, 38, 5, 8, "#c4ba92");
		if (damaged) {
			R(12, -36, 12, 13, "#1a2835");
			L(13, -35, 24, -23, "#c78164", 2);
			R(-36, 15, 10, 7, "#1a2835");
		}
	}
	function siege(g, x, y, k, t, boss) {
		const P = (a, b) => [x + a * k, y + b * k],
			R = (a, b, w, h, c) => px.rect(g, ...P(a, b), w * k, h * k, c);
		px.poly(
			g,
			[
				P(-173, -18),
				P(-125, -38),
				P(-88, -27),
				P(-44, -54),
				P(44, -54),
				P(88, -27),
				P(125, -38),
				P(173, -18),
				P(157, 26),
				P(103, 31),
				P(61, 47),
				P(-61, 47),
				P(-103, 31),
				P(-157, 26),
			],
			"#172635",
		);
		px.poly(
			g,
			[
				P(-169, -18),
				P(-124, -34),
				P(-87, -22),
				P(-43, -48),
				P(43, -48),
				P(87, -22),
				P(124, -34),
				P(169, -18),
				P(153, 21),
				P(100, 24),
				P(59, 40),
				P(-59, 40),
				P(-100, 24),
				P(-153, 21),
			],
			"#59606e",
		);
		for (const sign of [-1, 1]) {
			panel(
				g,
				x + (sign * 115 - 35) * k,
				y - 21 * k,
				70 * k,
				40 * k,
				"#615b69",
			);
			R(sign * 115 - 29, -17, 58, 3, "#a99b9c");
			for (let j = 0; j < 6; j++)
				R(sign * 115 - 25 + j * 9, -8, 5, 14, "#252738");
			R(sign * 80 - 12, -20, 24, 53, "#303447");
			R(sign * 80 - 8, -16, 4, 37, "#b096a4");
		}
		panel(g, x - 49 * k, y - 42 * k, 98 * k, 71 * k, "#6b6972");
		px.poly(
			g,
			[P(0, -36), P(32, -8), P(24, 27), P(0, 41), P(-24, 27), P(-32, -8)],
			"#2b3444",
		);
		ring(g, x, y + 6 * k, 22 * k, "#8e758b", 4 * k);
		ring(g, x, y + 6 * k, 15 * k, "#bd8e9d", 2 * k);
		R(-13, -21, 26, 7, "#1c2939");
		for (let j = 0; j < 5; j++) R(-11 + j * 5, -20, 3, 3, "#f6a17f");
		for (let j = 0; j < 11; j++)
			R(
				-80 + j * 16,
				32,
				7,
				3,
				j === Math.floor(t * 3) % 11 ? "#f1c79a" : "#9d7174",
			);
		if (!boss) {
			R(-6, 1, 12, 14, "#ecb0a2");
			return;
		}
		for (const c of boss.parts) {
			const cx = c.x,
				cy = c.y,
				alive = c.hp > 0,
				col = !alive
					? "#17232f"
					: c.hit > 0
						? "#f7edcb"
						: c.open
							? "#f5b791"
							: "#6e6c79";
			panel(
				g,
				cx - (c.kind === "core" ? 21 : 14),
				cy - 12,
				c.kind === "core" ? 42 : 28,
				26,
				alive ? "#746579" : "#283442",
			);
			if (alive) {
				px.poly(
					g,
					[
						[cx, cy - 10],
						[cx + 9, cy],
						[cx, cy + 13],
						[cx - 9, cy],
					],
					col,
				);
				const phase = c.index < 2 ? 0 : c.index < 4 ? 1 : 2,
					cycle = boss.phaseAge % 8;
				const gate =
					phase !== boss.phase
						? 0
						: cycle < 1.5
							? S.clamp((cycle - 1.1) / 0.4, 0, 1)
							: cycle > 7.5
								? 1 - S.clamp((cycle - 7.5) / 0.5, 0, 1)
								: 1;
				const offset = gate * 16;
				panel(g, cx - 12 - offset, cy - 11, 12, 23, "#5f5f70");
				panel(g, cx + offset, cy - 11, 12, 23, "#5f5f70");
				if (c.open) {
					ring(g, cx, cy, 23 + Math.sin(t * 5) * 2, "#ecc5a0");
					txt(g, "FIRE", cx, cy + 30, C.cream, 1, "center");
				}
			} else {
				line(g, cx - 10, cy - 8, cx + 11, cy + 8, "#956a67", 2);
				px.rect(g, cx - 5, cy - 2, 10, 7, "#111c29");
			}
		}
	}
	class Painter {
		constructor(game) {
			this.game = game;
			this.lastEvent = 0;
			this.shake = 0;
			this.skins = new Map();
			this.bg = new E.Backdrop({
				sky: ["#040e18", "#0b2033", "#152e42"],
				stars: 170,
				moon: { x: 0.83, y: 0.28, r: 62, color: "#466a7a" },
				layers: [
					{
						kind: "clouds",
						color: "#1c4553",
						y: 0.35,
						height: 0.44,
						parallax: 0.015,
						drift: 1,
						nebula: true,
						seed: 23,
					},
					{
						kind: "clouds",
						color: "#30304b",
						y: 0.68,
						height: 0.3,
						parallax: 0.01,
						drift: 0.5,
						nebula: true,
						seed: 7,
					},
				],
			});
		}
		background(r, t, act = 0) {
			this.bg.draw(r);
			r.starfield({ count: 90, speed: act === 2 ? 1 : 4, dir: "down" });
			r.overlay((g) => {
				// Survey grid, navigation scars and debris make a single place across the retreat.
				for (let x = 0; x < 960; x += 80)
					for (let y = 90; y < 480; y += 64) {
						px.dot(g, x, y, "#244052");
					}
				for (let i = 0; i < 16; i++) {
					const x = (i * 173 + 31) % 960,
						y = 100 + ((i * 97) % 365);
					if (i % 3 === 0) line(g, x, y, x + 7, y - 4, "#34505d");
					else px.rect(g, x, y, 2 + (i % 3), 2, "#254053");
				}
				ring(g, 480, 277, 210, "#17394a");
				ring(g, 480, 277, 278, "#173444");
				if (act === 2) {
					// Same planet, now a damaged industrial horizon and a mechanically detailed gun rail.
					for (let i = 0; i < 23; i++) {
						const x = i * 45,
							h = 12 + ((i * 19) % 52);
						px.rect(g, x, 462 - h, 38, h, "#203747");
						px.rect(g, x + 3, 464 - h, 25, 3, "#3c5360");
						for (let j = 0; j < 4; j++)
							px.rect(g, x + 7 + j * 7, 470 - h, 3, 5, "#6e897e");
					}
					px.rect(g, 0, 482, 960, 58, "#102332");
					px.rect(g, 0, 481, 960, 4, "#97a8a5");
					for (let i = 0; i < 32; i++) {
						panel(g, i * 32, 494, 30, 24, "#344d5d");
						px.rect(g, i * 32 + 8, 487, 12, 2, "#d1bc83");
					}
					for (let j = 0; j < 3; j++)
						line(g, 0, 505 + j * 9, 960, 505 + j * 9, "#193444");
				}
			});
		}
		title(r, t) {
			this.background(r, t, 0);
			r.overlay((g) => {
				// A technical poster made from the actual installation and fleet, all in motion.
				ring(g, 700, 290, 175, "#3c5b65", 1);
				ring(g, 700, 290, 194, "#2e4b58");
				for (let i = 0; i < 48; i++) {
					const a = (i * Math.PI) / 24;
					line(
						g,
						700 + Math.cos(a) * 184,
						290 + Math.sin(a) * 184,
						700 + Math.cos(a) * (i % 4 === 0 ? 195 : 190),
						290 + Math.sin(a) * (i % 4 === 0 ? 195 : 190),
						"#527279",
					);
				}
				siege(g, 774, 77, 0.72, t);
				fortress(g, 700, 292, 1.65, t, { heat: 20 });
				line(g, 727, 174, 863, 151, C.muted);
				txt(g, "FORTRESS 13", 814, 135, C.cream, 1);
				txt(g, "RADIATOR ARRAY / ONLINE", 590, 452, C.cyan, 1);
				line(g, 569, 447, 615, 411, "#517570");
				line(g, 863, 325, 911, 349, "#517570");
				txt(g, "CORE", 865, 354, C.muted);
				// Left gradient is native stepped alpha, with no painting outside the engine.
				for (let i = 0; i < 15; i++)
					px.blend(g, 0.42 - i * 0.025, "normal", () =>
						px.rect(g, i * 35, 0, 35, 540, "#07131f"),
					);
				txt(g, "FORTRESS COMMAND // SECTOR 13", 57, 63, C.cyan, 1);
				E.font.title(g, "SPACE", 56, 108, {
					scale: 7,
					colors: ["#fff1cf", "#e8cf9c", "#b89869"],
					outline: "#0a1a28",
					depth: 3,
					depthColor: "#495362",
				});
				E.font.title(g, "FORTNIGHT", 56, 176, {
					scale: 7,
					colors: ["#fff1cf", "#e8cf9c", "#b89869"],
					outline: "#0a1a28",
					depth: 3,
					depthColor: "#495362",
				});
				px.rect(g, 57, 249, 48, 3, C.cyan);
				txt(g, "THREE LINES. ONE LAST STAND.", 119, 245, C.cream, 1);
				txt(g, "A SIEGE IN THREE MOVEMENTS", 57, 284, C.muted, 1);

				txt(g, "CENTURY / 1981 REIMAGINED", 57, 503, "#648392", 1);
				txt(g, "VIPER WING - STANDING BY", 905, 504, C.cyan, 1, "right");
			});
			for (let i = 0; i < 3; i++) {
				const a = t * 0.18 + i * 2.2,
					x = 700 + Math.cos(a) * 230,
					y = 292 + Math.sin(a) * 122;
				r.sprite(x, y, 0, S.ASSETS.player[i].thrust, {
					t,
					rot: a + Math.PI,
					anchor: "center",
					scale: 0.8,
				});
			}
		}
		events(s) {
			for (const e of s.events)
				if (e.id > this.lastEvent) {
					if (["hurt", "objective", "component"].includes(e.type))
						this.shake = Math.max(this.shake, e.type === "component" ? 5 : 2);
				}
			this.lastEvent = s.eventSeq;
		}
		draw(r, s, t, opts = {}) {
			opts = {
				...opts,
				celebration: Number.isFinite(opts.celebration) ? opts.celebration : 0,
			};
			this.events(s);
			this.background(r, t, s.act);
			if (s.act === 0)
				r.overlay((g) => {
					fortress(g, 805, 330, 0.42, t, { damaged: false });
					siege(g, 610, 104, 0.48, t);
					txt(g, "FORTRESS 13 / 18 km", 784, 375, "#637f8b", 1, "center");
				});
			if (s.act === 1) {
				r.actor(480, 277, 0, (g, ox, oy) =>
					fortress(g, ox, oy, 1, t, {
						heat: s.heat,
						locks: s.locks,
						damaged: !s.outcomes[0]?.held,
					}),
				);
			}
			if (s.act === 2 && s.outcomes[1] && !s.outcomes[1].held)
				r.overlay((g) => {
					for (const x of [117, 729]) {
						px.rect(g, x, 427, 29, 52, "#152936");
						px.poly(
							g,
							[
								[x, 427],
								[x + 8, 438],
								[x + 17, 432],
								[x + 29, 447],
								[x + 29, 480],
								[x, 480],
							],
							"#1c2d38",
						);
						line(g, x + 4, 447, x + 23, 467, "#9c6b60", 2);
						for (let j = 0; j < 4; j++)
							px.rect(
								g,
								x + 8 + j * 4,
								450 + Math.sin(t * 2 + j) * 5,
								2,
								3,
								"#d59876",
							);
					}
				});
			if (s.act === 2 && !s.boss)
				r.overlay((g) => {
					siege(g, 480 + Math.sin(t * 0.1) * 100, 124, 0.65, t);
					txt(g, "THE NIGHT ADMIRAL", 480, 177, "#aa858a", 1, "center");
				});
			if (s.boss) {
				const boss = s.boss,
					cx = boss.parts[4].x,
					cy = boss.parts[4].y - 15;
				r.overlay((g) => {
					siege(g, cx, cy, 1, t, boss);
					const cycle = boss.phaseAge % 8;
					if (cycle < 1.5) {
						for (const c of boss.parts.filter(
							(c) =>
								c.hp > 0 &&
								(boss.phase === 0
									? c.index < 2
									: boss.phase === 1
										? c.index === 2 || c.index === 3
										: c.index === 4),
						)) {
							const p = s.players.find((p) => p.hp > 0 && !p.gone);
							if (p) {
								line(g, c.x, c.y, p.x, 480, "#715d68");
								ring(g, p.x, 457, 20, "#e4ae8f");
							}
						}
						txt(
							g,
							boss.phase === 0
								? "BATTERIES ACQUIRING"
								: boss.phase === 1
									? "TRACTOR EMITTERS OPENING"
									: "CORE VOLLEY CHARGING",
							cx,
							cy + 81,
							C.red,
							1,
							"center",
						);
					}
					if (boss.phase === 0 && boss.wind > 0)
						for (const lane of boss.lanes || []) {
							const c = boss.parts[lane.index];
							line(g, c.x, c.y, lane.x, 483, "#d8a98f", 2);
							ring(g, lane.x, 457, 28, "#edc49b");
							txt(g, "IMPACT LANE", lane.x, 423, C.cream, 1, "center");
						}
					if (boss.phase === 1 && cycle > 1.5 && cycle < 5.5)
						for (const c of boss.parts.slice(2, 4))
							if (c.hp > 0) {
								const p = s.players.find((p) => p.hp > 0 && !p.gone);
								if (p) {
									line(g, c.x, c.y, p.x, p.y, "#ac93bf", 2);
									ring(g, p.x, p.y, 27, "#a48dbd");
								}
							}
				});
			}
			r.overlay((g) => {
				for (const e of s.enemies) {
					if (e.tele > 0) {
						ring(g, e.x, e.y, e.r + 8 + e.tele * 8, "#bfa98a");
						line(g, e.x - 6, e.y, e.x + 6, e.y, C.cream);
						line(g, e.x, e.y - 6, e.x, e.y + 6, C.cream);
						txt(g, "INBOUND", e.x, e.y + e.r + 20, C.muted, 1, "center");
						continue;
					}
					if (e.kind === "anchor") {
						for (let i = 0; i < 4; i++) {
							const rad = 25 + (1 - ((t * 0.55 + i / 4) % 1)) * 145;
							ring(
								g,
								e.x,
								e.y,
								rad,
								e.charge > 0 ? "#615379" : "#9c8ab7",
								e.charge > 0 ? 1 : 2,
							);
						}
						ring(g, e.x, e.y, 24, "#dbc7f2");
						txt(
							g,
							e.charge > 0 ? "GRAVITY CHARGING" : "GRAVITY ACTIVE",
							e.x,
							e.y - 40,
							"#dfcef3",
							1,
							"center",
						);
					}
					if (e.wind > 0 && e.kind === "hunter") {
						const p = s.players.find((p) => p.id === e.target);
						if (p) line(g, e.x, e.y, p.x, p.y, "#b17c72");
					}
					if (e.wind > 0 && e.kind === "bomber") {
						px.blend(g, 0.15, "normal", () =>
							px.rect(g, e.lane - 20, 100, 40, 380, "#e6ac70"),
						);
						for (let j = 0; j < 9; j++) {
							const yy = 110 + j * 40 + ((t * 25) % 40);
							line(g, e.lane - 16, yy, e.lane, yy + 12, "#e2b47e");
							line(g, e.lane, yy + 12, e.lane + 16, yy, "#e2b47e");
						}
						txt(g, "BOMB LANE", e.lane, 441, "#f0cc91", 1, "center");
					}
					if (e.kind === "rammer" && !e.launched) {
						const target =
							s.act === 1
								? { x: 480, y: 277 }
								: s.players.find((p) => p.hp > 0);
						if (target) line(g, e.x, e.y, target.x, target.y, "#a27170");
					}
					if (e.kind === "tractor" && e.wind > 0) {
						const p = s.players.find((p) => p.id === e.target),
							target =
								e.lock >= 0
									? {
											x: 480 + [48, -48, -48, 48][e.lock],
											y: 277 + [48, 48, -48, -48][e.lock],
										}
									: p;
						if (target) {
							line(
								g,
								e.x,
								e.y,
								target.x,
								target.y,
								e.wind < 3.1 ? "#ceb6e0" : "#74677f",
								e.wind < 3.1 ? 2 : 1,
							);
							txt(
								g,
								e.wind < 3.1 ? "LOCK" : "ACQUIRING",
								e.x,
								e.y - 32,
								"#dfc7eb",
								1,
								"center",
							);
						}
					}
					if (e.kind === "dive" && e.launched && e.wind > 0)
						line(g, e.x, e.y, e.x + e.vx * 3, 480, "#bb9b71");
				}
			});
			for (const d of s.drops)
				r.sprite(d.x, d.y, 0, S.ASSETS.drop, {
					t,
					anchor: "center",
					glow: 0.4,
				});
			for (const e of s.enemies) {
				if (e.tele > 0) continue;
				const rot =
					e.kind === "anchor" || e.kind === "relay"
						? 0
						: e.kind === "rammer" && e.launched
							? Math.atan2(e.vy, e.vx) + Math.PI / 2
							: e.kind === "dive"
								? 0
								: e.a + Math.PI / 2;
				r.sprite(e.x, e.y, 0, S.ASSETS.enemy[e.kind], {
					anchor: "center",
					rot,
					flash:
						e.hit > 0 && !this.game.settings.reducedFlashes ? "#fff0d3" : null,
					scale: 1,
				});
				if (e.hp < e.maxHp)
					r.overlay((g) => {
						px.rect(g, e.x - 16, e.y - e.r - 10, 32, 3, "#243646");
						px.rect(
							g,
							e.x - 16,
							e.y - e.r - 10,
							(32 * e.hp) / e.maxHp,
							3,
							"#d7a27e",
						);
					});
			}
			for (const [i, p] of s.players.entries()) {
				if (p.gone || p.hp <= 0) continue;
				const transition = s.phase === "retreat",
					off = transition ? (4.5 - s.phaseTime) * 100 : 0;
				const skinKey = p.color + "-" + i;
				if (!this.skins.has(skinKey))
					this.skins.set(skinKey, S.playerSkin(p.color, i));
				const docking = s.act === 2 && s.phase === "briefing";
				const dock = docking
					? E.ease.outCubic(S.clamp(1 - s.phaseTime / 3.2, 0, 1))
					: 1;
				const ship = this.skins.get(skinKey),
					spr =
						p.thrust > 0.1 ||
						p.boost > 0 ||
						transition ||
						(docking && dock < 0.98) ||
						(s.result?.won && opts.celebration < 1)
							? ship.thrust
							: ship.idle;
				if (s.act === 2)
					r.overlay((g) => {
						panel(g, p.x - 28, p.y + 10, 56, 13, "#607986");
						for (const dx of [-25, 17]) {
							px.rect(g, p.x + dx, p.y + 22, 9, 5, "#0b1926");
							px.rect(g, p.x + dx + 1, p.y + 23, 7, 2, "#8b9d9c");
						}
					});
				const xx = p.x,
					yy =
						p.y +
						off -
						(docking ? (1 - dock) * 190 : 0) -
						(s.result?.won ? opts.celebration * 85 : 0);
				if (p.boost > 0)
					for (let j = 1; j < 4; j++)
						r.sprite(
							xx - p.vx * 0.025 * j,
							yy - p.vy * 0.025 * j,
							0,
							ship.idle,
							{
								rot: p.a + Math.PI / 2,
								anchor: "center",
								alpha: 0.2 * (1 - j / 4),
							},
						);
				r.sprite(
					xx - Math.cos(p.a) * p.recoil * 20,
					yy - Math.sin(p.a) * p.recoil * 20,
					0,
					spr,
					{
						t,
						rot: p.a + Math.PI / 2,
						anchor: "center",
						flash:
							p.hit > 0 && !this.game.settings.reducedFlashes
								? "#fff6d8"
								: null,
					},
				);
				r.overlay((g) => {
					if (
						p.inv > 0 &&
						(this.game.settings.reducedFlashes || Math.floor(t * 10) % 2 === 0)
					)
						ring(g, xx, yy, 27, "#9edcd6", 1);
					txt(g, String(i + 1).padStart(2, "0"), xx + 27, yy - 15, p.color, 1);
					const reserveWidth = 28 + 14 * p.upgrades.boost;
					px.rect(g, xx - 14, yy + 28, reserveWidth, 3, "#1b3343");
					px.rect(
						g,
						xx - 14,
						yy + 28,
						(reserveWidth * p.energy) / p.maxEnergy,
						3,
						p.color,
					);
					if (p.pulse <= 0) {
						px.rect(g, xx - 3, yy + 33, 6, 2, "#dce8bd");
					} else
						px.rect(
							g,
							xx - 3,
							yy + 33,
							6 *
								(1 -
									p.pulse /
										(s.balance.pulseCooldown *
											Math.pow(0.75, p.upgrades.pulse))),
							2,
							"#69898f",
						);
				});
			}
			r.overlay((g) => {
				if (s.result?.won && s.boss && opts.celebration < 1) {
					const u = opts.celebration,
						c = s.boss.parts[4];
					for (let i = 0; i < 9; i++) {
						const x = c.x + Math.sin(i * 2.39) * 140,
							y = c.y + Math.cos(i * 1.71) * 34,
							r = 8 + ((u * 3 + i * 0.11) % 1) * 28;
						ring(g, x, y, r, u < 0.7 ? "#e2bc8a" : "#8f7278", 2);
						if (!this.game.settings.reducedFlashes && u < 0.42)
							px.disc(g, x, y, r * 0.5, "#ffe5b3");
					}
					txt(
						g,
						"SIEGE BROKEN / VIPER WING, COME HOME",
						480,
						329,
						C.cream,
						2,
						"center",
					);
				}
			});
			r.overlay((g) => {
				for (const b of s.shots) {
					const col = b.foe ? (b.bomb ? "#f7bf7a" : "#f1a490") : "#b5f6e5";
					if (b.bomb) {
						px.disc(g, b.x, b.y, 8, "#5c4b4b");
						ring(g, b.x, b.y, 7, "#efba7c", 2);
						px.rect(g, b.x - 2, b.y - 2, 4, 4, "#ffecd0");
					} else {
						line(
							g,
							b.px - b.vx * 0.012,
							b.py - b.vy * 0.012,
							b.x,
							b.y,
							col,
							b.foe ? 3 : b.dmg > s.balance.laserDamage * 1.1 ? 4 : 3,
						);
						line(g, b.px, b.py, b.x, b.y, "#fff4d3", 1);
					}
				}
				for (const f of s.effects) {
					const u = (f.t + (s.result?.won ? opts.celebration * 2 : 0)) / f.life;
					if (u >= 1) continue;
					if (f.kind === "pulse") {
						ring(g, f.x, f.y, 8 + f.size * u, "#a6eee3", 3 * (1 - u) + 1);
						ring(g, f.x, f.y, 8 + f.size * u * 0.8, "#638e94");
					} else {
						const rad = f.size * (0.1 + u * 0.9);
						if (u < 0.3)
							px.disc(
								g,
								f.x,
								f.y,
								rad * (1 - u),
								u < 0.15 ? "#fff0ca" : "#eabc84",
							);
						ring(g, f.x, f.y, rad, u < 0.35 ? "#f5cc94" : "#826c6f");
						for (let i = 0; i < 10; i++) {
							const a = i * 2.399 + f.id;
							const rr = rad * (0.7 + (i % 3) * 0.15);
							px.rect(
								g,
								f.x + Math.cos(a) * rr,
								f.y + Math.sin(a) * rr,
								Math.max(1, 4 - u * 3),
								2,
								u < 0.6 ? "#e1b083" : "#6f656b",
							);
						}
					}
				}
				if (s.options.overlays) {
					for (const e of s.enemies) ring(g, e.x, e.y, e.r, "#f3d77f");
					for (const p of s.players)
						if (p.hp > 0) ring(g, p.x, p.y, 10, "#80f1da");
					txt(
						g,
						`SEED ${s.seed}   TICK ${s.tick}   ENTITIES ${s.enemies.length}   SHOTS ${s.shots.length}`,
						35,
						463,
						C.cream,
					);
				}
				if (s.phase === "briefing" || s.phase === "retreat") {
					px.blend(g, 0.68, "normal", () =>
						px.rect(g, 110, 192, 740, 126, "#0a1b29"),
					);
					const label =
						s.phase === "briefing"
							? S.ACTS[s.act].name
							: s.outcomes[s.act]?.held
								? "LINE SECURED / FALL BACK"
								: "EMERGENCY EXTRACTION";
					txt(
						g,
						s.phase === "briefing"
							? `DEFENSIVE LINE ${S.ACTS[s.act].code}`
							: "FORTRESS COMMAND",
						480,
						207,
						C.cyan,
						1,
						"center",
					);
					E.font.title(g, label, 480, 232, {
						align: "center",
						scale: 3,
						colors: ["#fff0cb", "#c5ac85"],
						depth: 1,
					});
					txt(
						g,
						s.phase === "briefing"
							? S.ACTS[s.act].objective
							: "KEEP YOUR WING TOGETHER",
						480,
						278,
						C.cream,
						1,
						"center",
					);
				}
				if (opts.demo) {
					px.rect(g, 390, 84, 180, 24, "#102a3a");
					txt(g, "DEMO / AUTOPILOT", 480, 91, C.cream, 1, "center");
					txt(
						g,
						"ANY INPUT RETURNS TO COMMAND",
						480,
						508,
						C.cream,
						1,
						"center",
					);
				}
			});
			if (!opts.hideHUD) this.hud(r, s, t);
		}
		hud(r, s, t) {
			r.overlay((g) => {
				px.rect(g, 0, 0, 960, 76, "#0a1926");
				line(g, 30, 76, 930, 76, "#48606a");
				txt(
					g,
					`LINE ${S.ACTS[s.act].code} / ${S.ACTS[s.act].name}`,
					31,
					17,
					C.cyan,
					1,
				);
				txt(
					g,
					s.boss
						? "THE NIGHT ADMIRAL"
						: S.WAVES[s.wave]?.title || "SIEGE BROKEN",
					31,
					39,
					C.cream,
					2,
				);
				txt(g, "TEAM SCORE", 895, 15, C.muted, 1, "right");
				txt(g, String(s.score).padStart(7, "0"), 895, 34, C.cream, 3, "right");
				txt(
					g,
					`CHAIN x${s.multiplier}`,
					742,
					54,
					s.multiplier > 1 ? C.cyan : C.muted,
					1,
					"right",
				);
				const label =
					s.act === 0
						? "ESCORT LINE"
						: s.act === 1
							? "FORTRESS HEAT"
							: "BASE INTEGRITY";
				const value =
					s.act === 0
						? Math.min(
								1,
								(s.wave +
									Math.min(1, s.waveTime / (S.WAVES[s.wave]?.min || 60))) /
									S.WAVES.filter((w) => w.act === 0).length,
							)
						: s.act === 1
							? s.heat / 100
							: s.base / 100;
				txt(g, label, 539, 15, s.act === 1 && s.heat > 65 ? C.red : C.muted, 1);
				px.rect(g, 539, 31, 180, 9, "#1a3040");
				px.rect(
					g,
					540,
					32,
					178 * value,
					7,
					s.act === 1 ? (value > 0.65 ? C.red : "#e6bf79") : C.cyan,
				);
				txt(
					g,
					s.act === 1
						? `${Math.round(s.heat)}% / ${s.locks.filter((v) => !v).length} RADIATORS`
						: s.act === 2
							? `${Math.ceil(s.base)}% / HOLD THE RAIL`
							: `BEAT ${s.wave + 1} / 3`,
					539,
					50,
					C.muted,
					1,
				);
				if (s.boss) {
					const boss = s.boss,
						total = boss.parts.reduce((v, c) => v + c.maxHp, 0),
						hp = boss.parts.reduce((v, c) => v + c.hp, 0);
					px.rect(g, 260, 85, 440, 14, "#1a2a39");
					px.rect(g, 261, 86, (438 * hp) / total, 12, "#b5777e");
					txt(
						g,
						[
							"I / SIDE BATTERIES",
							"II / TRACTOR EMITTERS",
							"III / EXPOSED CORE",
						][boss.phase],
						480,
						107,
						C.cream,
						1,
						"center",
					);
				}
				if (s.act !== 2) {
					px.rect(g, 0, 488, 960, 52, "#091b29");
					line(g, 30, 488, 930, 488, "#48606a");
				}
				const players = s.players.filter((p) => !p.gone),
					width = Math.min(220, 850 / players.length);
				for (const [i, p] of players.entries()) {
					const x = 31 + i * width;
					txt(
						g,
						`${String(i + 1).padStart(2, "0")} ${p.name}`,
						x,
						498,
						p.color,
						1,
					);
					if (p.hp <= 0)
						txt(g, `REDEPLOY ${Math.ceil(p.dead)}s`, x, 516, C.red, 1);
					else {
						for (let j = 0; j < p.maxHp; j++)
							px.rect(g, x + j * 8, 516, 6, 7, j < p.hp ? p.color : "#28404d");
						txt(
							g,
							`BOOST ${Math.ceil(p.energy)}/${p.maxEnergy}`,
							x + 153,
							516,
							C.muted,
							1,
						);
						txt(
							g,
							p.pulse <= 0 ? "PULSE READY" : `PULSE ${Math.ceil(p.pulse)}s`,
							x + 85,
							516,
							p.pulse <= 0 ? C.cream : C.muted,
							1,
						);
					}
				}
				if (s.modified) txt(g, "MODIFIED RUN", 929, 518, "#b6a0c6", 1, "right");
			});
		}
	}
	Object.assign(S, { Painter, fortress, siege, ring, panel, txt, C });
})(globalThis.Fortnight);
