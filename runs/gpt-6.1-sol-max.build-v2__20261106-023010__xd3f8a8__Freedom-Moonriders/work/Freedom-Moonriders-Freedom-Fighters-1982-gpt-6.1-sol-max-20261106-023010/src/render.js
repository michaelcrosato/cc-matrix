/* Pixel drawing follows the handoff shooter's depth queue, palette ramps and animated sprites. */
(function (root) {
	"use strict";
	const F = root.Moonriders,
		E = root.My3D2dge,
		px = E.px,
		C = F.clamp;
	const ink = "#080f22",
		mint = "#9ef4d6",
		violet = "#ce9eff",
		amber = "#f4c287",
		coral = "#ff807b";
	const text = (g, s, x, y, color = "#dbe7e9", options = {}) =>
		E.font.text(g, s, x, y, color, {
			outline: false,
			shadow: "#081122",
			...options,
		});
	const ring = (g, x, y, r, color, width = 1, gap = false) => {
		for (let i = 0; i < 32; i++) {
			if (gap && i % 8 > 4) continue;
			const a = (i / 32) * Math.PI * 2,
				b = ((i + 1) / 32) * Math.PI * 2;
			px.line(
				g,
				x + Math.cos(a) * r,
				y + Math.sin(a) * r,
				x + Math.cos(b) * r,
				y + Math.sin(b) * r,
				color,
				width,
			);
		}
	};
	const glow = (g, x, y, r, col, alpha = 0.2) => {
		px.blend(g, alpha / 2, "add", () => px.disc(g, x, y, r, col));
		px.blend(g, alpha, "add", () => px.disc(g, x, y, r * 0.55, col));
	};
	const stars = [],
		rnd = F.rng(0x77bdaa);
	for (let i = 0; i < 270; i++)
		stars.push({
			x: rnd.next() * 2200,
			y: rnd.next() * 1400,
			z: rnd.next(),
			size: rnd.next() > 0.975 ? 2 : 1,
		});
	const polygon = (g, x, y, points, color) =>
		px.poly(
			g,
			points.map((p) => [x + p[0], y + p[1]]),
			color,
		);
	function planet(g, x, y, r, light = false) {
		const t = E.tones(light ? "#5b8283" : "#294054");
		px.ell(g, x, y, r * 1.6, r * 0.33, "#152d45");
		px.ell(g, x, y - 1, r * 1.6, r * 0.3, "#56616d");
		px.ell(g, x, y - 2, r * 1.52, r * 0.27, "#182940");
		px.disc(g, x, y, r, t.deep);
		px.disc(g, x - r * 0.09, y - r * 0.09, r * 0.96, t.sh);
		px.disc(g, x - r * 0.23, y - r * 0.16, r * 0.77, t.base);
		px.disc(g, x - r * 0.32, y - r * 0.21, r * 0.59, t.lt);
		for (let i = 0; i < 24; i++) {
			const a = i * 2.399,
				d = r * (0.14 + (i % 7) / 10),
				xx = x + Math.cos(a) * d - r * 0.15,
				yy = y + Math.sin(a) * d - r * 0.13;
			if (Math.hypot(xx - x, yy - y) < r * 0.85) {
				px.ell(g, xx, yy, 3 + (i % 6), 2 + (i % 4), i % 3 ? t.sh : t.hi);
				px.ell(g, xx + 1, yy + 1, 2 + (i % 6), 1 + (i % 4), t.base);
			}
		}
		px.blend(g, 0.5, "normal", () => {
			for (let i = 0; i < 4; i++)
				px.line(
					g,
					x - r - 20,
					y + r * 0.2 + i * 2,
					x + r + 26,
					y - r * 0.12 + i * 2,
					i % 2 ? "#a7a38f" : "#586b71",
					1,
				);
		});
		ring(g, x, y, r + 2, "#7a9ba0");
	}
	class Presentation {
		constructor(app) {
			this.app = app;
			this.fx = [];
			this.seen = 0;
			this.armed = new Set();
			this.camX = 0;
			this.camY = 135;
			this.lastSector = -1;
			this.lastRun = "";
			this.shake = 0;
		}
		update(dt, state) {
			if (!state) return;
			if (state.runId !== this.lastRun || state.sector !== this.lastSector) {
				this.fx = [];
				this.lastRun = state.runId;
				this.lastSector = state.sector;
				this.seen = 0;
				this.armed = new Set();
			}
			for (const q of state.entities)
				if (
					q.kind === "mine" &&
					q.state === "active" &&
					!this.armed.has(q.id)
				) {
					this.armed.add(q.id);
					if (Math.abs(q.x - state.ship.x) < 400)
						this.app.sound.event(
							{ type: "armed" },
							this.app.attract || this.app.ended,
						);
				}
			for (const e of state.events || [])
				if (e.n > this.seen) {
					this.seen = e.n;
					if (e.x !== undefined) this.fx.push({ ...e, age: 0 });
					this.app.sound.event(e, this.app.attract || this.app.ended);
					const p = this.app.game.particles;
					if (["destroy", "collapse", "damage", "rescue"].includes(e.type)) {
						if (e.type === "rescue") p.glints(e.x, e.y, 0, 12, violet);
						else
							p.sparks(e.x, e.y, 0, 8, null, {
								color: e.type === "collapse" ? mint : coral,
							});
					}
					if (e.type === "damage" && !this.app.game.reduceMotion)
						this.app.game.shake(3);
				}
			for (const f of this.fx) f.age += dt;
			this.fx = this.fx.filter(
				(f) =>
					f.age <
					(f.type === "rescue" ? 1.2 : f.type === "collapse" ? 1.1 : 0.65),
			);
			this.camX = Math.max(
				this.app.game.W * 0.5,
				state.ship.x + this.app.game.W * 0.15,
			);
			this.camY = 135;
			this.app.game.focus(this.camX, this.camY, 0);
		}
		background(r, state, title = false) {
			const t = this.app.game.real,
				W = r.W,
				H = r.H,
				sector = state?.sector || 0,
				x = state?.ship?.x || t * 7;
			r.sky(
				sector === 2
					? ["#071025", "#111c34", "#081224"]
					: sector === 3
						? ["#0b1027", "#211d36", "#091426"]
						: ["#071321", "#10273a", "#0a172b"],
			);
			const g = r.ctx,
				cx = title ? W * 0.76 : W * 0.78 - ((x * 0.018) % 60),
				cy = title ? H * 0.46 : H * 0.38;
			// Broad, stepped nebula bands and far orbital lights; no collision scenery.
			px.blend(g, 0.18, "add", () => {
				for (let i = 0; i < 14; i++) {
					const xx = ((i * 83 - x * 0.05 + W * 20) % (W + 180)) - 90;
					px.ell(
						g,
						xx,
						H * 0.5 + Math.sin(i * 2.1) * H * 0.18,
						88,
						16 + (i % 4) * 6,
						sector > 1 ? "#61426c" : "#255f70",
					);
				}
			});
			if (title || sector < 2)
				planet(g, cx, cy, title ? Math.min(H * 0.3, W * 0.23) : 38, title);
			if (sector === 2) {
				px.ell(g, W * 0.8 - ((x * 0.018) % 40), H * 0.14, 100, 48, "#162840");
				for (let i = 0; i < 8; i++) {
					const xx = ((i * 113 - ((x * 0.13) % 113) + W) % (W + 100)) - 50;
					polygon(
						g,
						xx,
						H * 0.35 + Math.sin(i * 7) * H * 0.36,
						[
							[-12, 0],
							[0, -4],
							[15, 3],
							[5, 9],
						],
						"#27364c",
					);
					px.line(
						g,
						xx - 9,
						H * 0.35 + Math.sin(i * 7) * H * 0.36,
						xx + 4,
						H * 0.35 + Math.sin(i * 7) * H * 0.36 - 2,
						"#405366",
					);
				}
			}
			if (sector === 3) {
				for (let i = 0; i < 5; i++) {
					const xx = ((i * 135 - ((x * 0.2) % 135) + W) % (W + 120)) - 60;
					px.rect(g, xx, H * 0.07, 6, H * 0.86, "#16253a");
					px.rect(g, xx + 5, H * 0.08, 1, H * 0.82, "#41505b");
					px.rect(g, xx - 22, H * 0.09, 45, 4, "#263044");
					px.rect(g, xx - 22, H * 0.89, 45, 4, "#263044");
				}
			}
			for (const s of stars) {
				const xx = (s.x - x * (0.02 + s.z * 0.11)) % W,
					yy = s.y % H;
				const xx2 = xx < 0 ? xx + W : xx;
				px.rect(
					g,
					xx2,
					yy,
					s.size,
					s.size,
					s.z > 0.85 ? "#b4bfc3" : s.z > 0.45 ? "#5d7684" : "#30495c",
				);
				if (s.size > 1) {
					px.line(g, xx2 - 2, yy + 1, xx2 + 3, yy + 1, "#617986");
					px.line(g, xx2 + 1, yy - 2, xx2 + 1, yy + 3, "#617986");
				}
			}
			// Foreground-free orbital rails frame the combat lane.
			if (!title) {
				const top = r.w(0, 24, 0)[1],
					bottom = r.w(0, 246, 0)[1];
				for (const yy of [top, bottom]) {
					px.line(g, 0, yy, W, yy, "#274151");
					for (let i = 0; i < W; i += 28)
						px.line(g, i - (x % 28), yy, i + 7 - (x % 28), yy, "#68898b");
				}
			}
		}
		title(r) {
			this.background(r, null, true);
			const g = r.ctx,
				W = r.W,
				H = r.H,
				x = W * 0.73,
				y = H * 0.54;
			const angle = -0.12,
				a = F.ART.ship;
			px.sprite(g, a, x - 63, y - 10, { rot: angle, scale: 2.7 });
			px.blend(g, 0.6, "add", () => {
				for (let i = 0; i < 4; i++) {
					px.line(
						g,
						x - 70 - i * 13,
						y + 10 + i * 2,
						x - 116 - i * 13,
						y + 14 + i * 2,
						i % 2 ? "#5da6ae" : "#a4edd8",
						2,
					);
				}
			});
			const crystalX = W * 0.89,
				crystalY = H * 0.7 + Math.sin(this.app.game.real) * 3;
			this.crystal(
				g,
				crystalX,
				crystalY,
				{ hp: 3, maxHp: 3, age: this.app.game.real },
				1.3,
			);
			for (const [xx, yy, label] of [
				[W * 0.7, H * 0.26, "M O O N  /  0 7"],
				[W * 0.68, H * 0.82, "RESCUE VECTOR  //  LIVE"],
			]) {
				px.line(g, xx, yy, xx + 55, yy, "#557578");
				text(g, label, xx, yy + 4, "#8eafaf", { font: "tiny" });
			}
		}
		crystal(g, x, y, q, scale = 1) {
			const age = q.age || 0,
				r = (17 + Math.sin(age * 3) * 1.1) * scale,
				col = q.hp < q.maxHp ? "#efb1aa" : violet;
			glow(g, x, y, r * 1.7, col, 0.16);
			ring(g, x, y, r + 5 * scale, col, 1, true);
			const points = [
				[0, -17],
				[11, -8],
				[10, 11],
				[0, 17],
				[-11, 8],
				[-10, -10],
			].map((p) => [p[0] * scale, p[1] * scale]);
			polygon(g, x, y, points, "#301b56");
			polygon(
				g,
				x,
				y,
				[
					[0, -17],
					[11, -8],
					[0, 3],
					[-10, -10],
				].map((p) => [p[0] * scale, p[1] * scale]),
				"#9563bd",
			);
			polygon(
				g,
				x,
				y,
				[
					[0, 3],
					[10, 11],
					[0, 17],
					[-11, 8],
				].map((p) => [p[0] * scale, p[1] * scale]),
				"#643d8d",
			);
			px.blend(g, 0.85, "normal", () =>
				px.sprite(g, F.ART.captive.frame(age), x - 4 * scale, y - 6 * scale, {
					scale,
					t: age,
				}),
			);
			px.line(g, x, y - 17 * scale, x - 10 * scale, y - 10 * scale, "#edceff");
			px.line(
				g,
				x - 10 * scale,
				y - 10 * scale,
				x - 11 * scale,
				y + 8 * scale,
				"#c0a3e2",
			);
			px.line(g, x + 10 * scale, y + 11 * scale, x, y + 17 * scale, "#ac83ce");
			if (q.hp < q.maxHp) {
				px.line(g, x - 4, y - 12, x + 3, y - 3, "#fff5dc");
				px.line(g, x + 3, y - 3, x - 4, y + 8, "#fff5dc");
				if (q.hp === 1) px.line(g, x - 4, y + 8, x + 6, y + 12, "#fff5dc");
			}
		}
		carrier(r, boss) {
			const [x, y] = r.w(boss.x + 100, 135, 0),
				g = r.ctx,
				destroyed = boss.phase === "destroyed";
			px.blend(g, destroyed ? 0.3 : 1, "normal", () => {
				glow(g, x - 20, y, 90, "#654769", 0.15);
				polygon(
					g,
					x,
					y,
					[
						[-69, -40],
						[-38, -69],
						[50, -69],
						[80, -44],
						[88, 40],
						[50, 69],
						[-38, 69],
						[-69, 40],
					],
					"#101526",
				);
				polygon(
					g,
					x,
					y,
					[
						[-62, -38],
						[-34, -62],
						[45, -62],
						[72, -39],
						[76, 38],
						[45, 62],
						[-34, 62],
						[-62, 38],
					],
					"#4d455c",
				);
				polygon(
					g,
					x,
					y,
					[
						[-60, -35],
						[-30, -54],
						[46, -54],
						[67, -36],
						[70, 32],
						[40, 53],
						[-30, 53],
						[-60, 35],
					],
					"#262b42",
				);
				for (let i = -2; i <= 2; i++) {
					px.rect(g, x - 25 + i * 20, y - 51, 8, 102, "#383d52");
					px.line(
						g,
						x - 25 + i * 20,
						y - 51,
						x - 25 + i * 20,
						y + 50,
						"#74718a",
					);
				}
				for (const side of [-1, 1]) {
					px.rect(g, x - 92, y + side * 68 - 9, 120, 18, "#141d30");
					px.rect(g, x - 92, y + side * 68 - 9, 120, 3, "#a08088");
					px.rect(g, x - 78, y + side * 68 - 4, 94, 5, "#635164");
					px.rect(g, x - 30, y + side * 50 - 3, 80, 6, "#7f6575");
				}
				px.rect(g, x - 67, y - 22, 37, 44, "#0b1726");
				px.rect(g, x - 66, y - 21, 33, 2, "#7a6885");
				if (boss.phase === "prisoners")
					for (let i = 0; i < 3; i++) {
						px.rect(g, x - 63, y - 15 + i * 13, 27, 8, "#9976bd");
						px.rect(g, x - 59, y - 13 + i * 13, 17, 4, "#bcebdc");
					}
				if (boss.phase === "core") {
					ring(g, x - 94, y, 29, coral, 2, true);
				}
				px.rect(g, x + 38, y - 8, 30, 16, "#152638");
				px.line(g, x + 43, y - 5, x + 66, y - 5, "#89bcb7", 2);
				text(g, "P R I S O N  /  0 7", x - 22, y + 20, "#b1a0b4", {
					font: "tiny",
				});
			});
			if (destroyed)
				for (let i = 0; i < 8; i++) {
					const a = this.app.game.real + i * 1.3;
					glow(
						g,
						x + Math.sin(a) * 60,
						y + Math.cos(a * 2) * 50,
						8,
						amber,
						0.7,
					);
				}
		}
		draw(r, s) {
			if (!s) {
				this.title(r);
				return;
			}
			this.background(r, s);
			const g = r.ctx,
				p = s.ship,
				t = s.elapsed;
			// Native still-shape library extension supplies shaded debris and relays in the distance.
			for (let i = -1; i < 4; i++) {
				const x = Math.floor(p.x / 380) * 380 + i * 380;
				if (s.sector > 0)
					r.shape(
						s.sector === 2 ? "moonriders:prisonFragment" : "moonriders:relay",
						x,
						i % 2 ? 251 : 15,
						0,
						{
							scale: 0.7,
							facing: 0.7,
							shadow: false,
							hides: false,
							light: false,
						},
					);
			}
			const m = F.MISSIONS[s.sector];
			if (m.shroud) {
				const x1 = r.w(m.shroud[0], 0, 0)[0],
					x2 = r.w(m.shroud[1], 0, 0)[0];
				if (x2 > 0 && x1 < r.W) {
					px.blend(g, 0.23, "add", () =>
						px.rect(g, x1, 0, x2 - x1, r.H, "#276184"),
					);
					for (let i = 0; i < 7; i++)
						px.line(
							g,
							x1 + i * 180 + ((t * 8) % 180),
							0,
							x1 + i * 180 - 25 + ((t * 8) % 180),
							r.H,
							"#2c5669",
						);
				}
			}
			if (s.boss) this.carrier(r, s.boss);
			for (const q of s.entities) {
				const [x, y] = r.w(q.x, q.y, 0);
				if ((x < 16 || x > r.W - 16) && q.warning > 0) {
					r.overlay((gg) => {
						const xx = C(x, 12, r.W - 12),
							yy = C(y, 45, r.H - 35);
						ring(gg, xx, yy, 7, amber, 1, true);
						text(gg, "INBOUND", xx + (x < 16 ? 11 : -11), yy - 3, amber, {
							align: x < 16 ? "left" : "right",
							font: "tiny",
						});
					});
				}
				if (x < -80 || x > r.W + 80) continue;
				r.queue(
					q.x,
					q.y,
					0,
					(gg) => {
						if (q.kind === "crystal") {
							this.crystal(gg, x, y, q);
							if (q.replacement)
								text(gg, "RELAY", x, y + 26, amber, {
									align: "center",
									font: "tiny",
								});
							else if (q.optional && s.mode !== "evasion")
								text(gg, "OPTIONAL", x, y + 26, amber, {
									align: "center",
									font: "tiny",
								});
							return;
						}
						if (q.kind === "mine") {
							const col =
									q.state === "disarmed"
										? mint
										: q.state === "active"
											? coral
											: "#c9ae80",
								rr = q.state === "active" ? 6 : 4;
							if (q.state === "active") glow(gg, x, y, 13, coral, 0.13);
							ring(gg, x, y, rr, col);
							for (let i = 0; i < 4; i++) {
								const a = (i * Math.PI) / 2 + t * 0.6;
								px.line(
									gg,
									x + Math.cos(a) * 5,
									y + Math.sin(a) * 5,
									x + Math.cos(a) * 9,
									y + Math.sin(a) * 9,
									col,
								);
							}
							px.disc(gg, x, y, 3, "#362134");
							px.disc(
								gg,
								x - 1,
								y - 1,
								1,
								q.state === "active" ? "#ffe3b2" : col,
							);
							if (q.state === "arming")
								ring(
									gg,
									x,
									y,
									11 + (1 - q.age / (this.app.sim.balance.arming + 0.3)) * 5,
									"#a18573",
									1,
									true,
								);
							return;
						}
						if (q.warning > 0) {
							ring(
								gg,
								x,
								y,
								20 + (Math.sin(q.age * 8) + 1) * 3,
								amber,
								1,
								true,
							);
							text(gg, "INBOUND", x, y + 28, amber, {
								align: "center",
								font: "tiny",
							});
						}
						if (q.kind === "core") {
							glow(gg, x, y, 34, coral, 0.5);
							polygon(
								gg,
								x,
								y,
								[
									[0, -20],
									[17, -10],
									[17, 10],
									[0, 20],
									[-17, 10],
									[-17, -10],
								],
								"#82374c",
							);
							polygon(
								gg,
								x,
								y,
								[
									[0, -13],
									[11, -6],
									[11, 6],
									[0, 13],
									[-11, 6],
									[-11, -6],
								],
								"#f5bf8d",
							);
							ring(gg, x, y, 22, coral, 2, true);
						} else if (q.kind === "organ") {
							px.sprite(gg, F.ART.layer, x - 17, y - 17, {
								scale: 2,
								rot: Math.sin(q.age) * 0.1,
							});
							glow(gg, x, y, 23, coral, 0.17);
						} else if (q.kind === "drone") {
							ring(gg, x, y, 17, amber, 1, true);
							polygon(
								gg,
								x,
								y,
								[
									[0, -10],
									[11, 0],
									[0, 10],
									[-11, 0],
								],
								"#cd9261",
							);
							polygon(
								gg,
								x,
								y,
								[
									[0, -6],
									[6, 0],
									[0, 6],
									[-6, 0],
								],
								"#e8d2a4",
							);
							text(gg, "CANNON TEST", x, y + 25, amber, {
								align: "center",
								font: "tiny",
							});
						} else {
							const art =
								q.kind === "layer"
									? F.ART.layer
									: q.kind === "guard"
										? F.ART.guard
										: F.ART.interceptor;
							px.sprite(gg, art, x - art.w, y - art.h, {
								scale: 2,
								rot: q.kind === "layer" ? Math.sin(q.age * 0.65) * 0.22 : 0,
							});
							if (q.kind === "guard" && !q.open)
								ring(gg, x, y, 23, "#83c9c7", 2, true);
							if (q.kind === "layer" && q.timer < 1.1) {
								ring(gg, x, y, 24 + (1.1 - q.timer) * 8, amber);
								text(gg, "LAYING", x, y - 33, amber, {
									align: "center",
									font: "tiny",
								});
							}
						}
						if (
							["interceptor", "guard", "core"].includes(q.kind) &&
							q.warning <= 0 &&
							q.timer < 0.8
						) {
							const an = Math.atan2(p.y - q.y, p.x - q.x);
							ring(gg, x, y, q.r + 7, amber, 1, true);
							px.line(
								gg,
								x + Math.cos(an) * 26,
								y + Math.sin(an) * 26,
								x + Math.cos(an) * 48,
								y + Math.sin(an) * 48,
								amber,
								1,
							);
						}
						if (q.flash > 0)
							px.blend(gg, q.flash * 3, "add", () =>
								px.disc(gg, x, y, q.r, "#fff4cf"),
							);
						if (q.hp < q.maxHp && q.kind !== "mine") {
							px.rect(gg, x - 15, y - q.r - 9, 30, 3, "#141b2d");
							px.rect(gg, x - 15, y - q.r - 9, (30 * q.hp) / q.maxHp, 2, coral);
						}
					},
					{ emissive: q.kind === "crystal" || q.kind === "mine" },
				);
			}
			for (const bullet of s.bullets) {
				const [x, y] = r.w(bullet.x, bullet.y, 0);
				r.queue(
					bullet.x,
					bullet.y,
					1,
					(gg) => {
						const col = bullet.team === "hostile" ? coral : mint;
						const n = F.direction(bullet.vx, bullet.vy);
						px.line(
							gg,
							x - n[0] * 7,
							y - n[1] * 7,
							x,
							y,
							col,
							bullet.team === "hostile" ? 2 : 1,
						);
						px.disc(gg, x, y, bullet.team === "hostile" ? 2 : 1, "#fff4de");
					},
					{ emissive: true },
				);
			}
			const activeBeacon = s.phase === "beacon" || s.phase === "extraction",
				bx = m.length - 80;
			if (s.mode !== "evasion") {
				const [x, y] = r.w(bx, 135, 0);
				if (x > -60 && x < r.W + 60) {
					const col = activeBeacon ? mint : "#4b6768";
					ring(g, x, y, 36, col, 2, true);
					ring(g, x, y, 29, col);
					for (let i = 0; i < 3; i++)
						px.line(g, x - 13 + i * 9, y - 6, x - 5 + i * 9, y, col, 2);
					text(g, activeBeacon ? "EVACUATE" : "BEACON LOCKED", x, y + 44, col, {
						align: "center",
					});
				}
			}
			const angle = Math.atan2(p.aimY, p.aimX),
				[sx, sy] = r.w(p.x, p.y, 0);
			const committed = p.drive === "windup" || p.drive === "burst";
			if (committed || s.roles.shared) {
				const dx = committed ? p.burstX : p.previewX,
					dy = committed ? p.burstY : p.previewY;
				px.line(
					g,
					sx + dx * 27,
					sy + dy * 27,
					sx + dx * 65,
					sy + dy * 65,
					mint,
					1,
				);
				polygon(
					g,
					sx + dx * 66,
					sy + dy * 66,
					[
						[-dy * 5 - dx * 9, dx * 5 - dy * 9],
						[0, 0],
						[dy * 5 - dx * 9, -dx * 5 - dy * 9],
					],
					mint,
				);
			}
			r.actor(p.x, p.y, 0, (gg, x, y) => {
				const warp = p.drive === "burst";
				if (warp) {
					glow(gg, x, y, 42, mint, 0.24);
					for (let i = 0; i < 6; i++)
						px.line(
							gg,
							x - p.burstX * (24 + i * 11) - p.burstY * (i % 2 ? 12 : -12),
							y - p.burstY * (24 + i * 11) + p.burstX * (i % 2 ? 12 : -12),
							x - p.burstX * (42 + i * 11),
							y - p.burstY * (42 + i * 11),
							"#83cfce",
							1,
						);
				}
				const flicker = p.grace > 0 && Math.floor(t * 16) % 2;
				px.blend(gg, flicker ? 0.45 : 1, "normal", () => {
					px.sprite(
						gg,
						F.ART.thruster.frame(t),
						x - p.aimX * 25 - 3,
						y - p.aimY * 25 - 2,
						{ rot: angle, scale: warp ? 3 : 1, t },
					);
					px.sprite(
						gg,
						F.ART.ship,
						x - 20 - p.aimX * p.recoil * 2,
						y - 10 + p.bank * 2,
						{ rot: angle },
					);
				});
				const gunx = x + p.aimX * 17,
					guny = y + p.aimY * 17;
				px.line(gg, x + p.aimX * 6, y + p.aimY * 6, gunx, guny, "#384d62", 4);
				px.line(gg, x + p.aimX * 8, y + p.aimY * 8, gunx, guny, "#d6f2de", 1);
				if (p.recoil > 0.7) glow(gg, gunx, guny, 8, mint, 0.5);
			});
			// Localized light sources retain the native engine's shaded pixel treatment.
			this.app.game.lights.add(p.x, p.y, 0, 68, 0.35, { color: "#a6dfda" });
			for (const q of s.entities)
				if (q.kind === "crystal")
					this.app.game.lights.add(q.x, q.y, 0, 40, 0.28, { color: violet });
			r.overlay((gg) => {
				for (const f of this.fx) {
					const [x, y] = r.w(f.x, f.y, 0),
						a = f.age;
					if (f.type === "denied")
						text(
							gg,
							f.reason === "busy" ? "DRIVE BUSY" : "ENERGY LOW",
							x,
							y + 25,
							amber,
							{ align: "center" },
						);
					if (f.type === "rescue") {
						ring(gg, x, y, 14 + a * 42, violet);
						const u = Math.min(1, a * 1.5);
						px.line(
							gg,
							x + (sx - x) * u,
							y + (sy - y) * u,
							x + (sx - x) * Math.min(1, u + 0.1),
							y + (sy - y) * Math.min(1, u + 0.1),
							mint,
							2,
						);
						text(gg, "+" + f.points, x, y - a * 24, amber, { align: "center" });
					}
					if (["destroy", "collapse", "damage"].includes(f.type)) {
						const col = f.type === "collapse" ? mint : coral;
						ring(gg, x, y, 4 + a * 45, col, 2);
						for (let i = 0; i < 7; i++) {
							const an = i * 0.897;
							px.line(
								gg,
								x + Math.cos(an) * a * 30,
								y + Math.sin(an) * a * 30,
								x + Math.cos(an) * (a * 30 + 5),
								y + Math.sin(an) * (a * 30 + 5),
								col,
							);
						}
					}
				}
				const target = s.target;
				if (target) {
					const [x, y] = r.w(target.x, target.y, 0);
					if (x < 25 || x > r.W - 25 || y < 35 || y > r.H - 32) {
						const xx = C(x, 22, r.W - 22),
							yy = C(y, 44, r.H - 42),
							a = Math.atan2(y - r.H / 2, x - r.W / 2);
						px.line(
							gg,
							xx - Math.cos(a) * 8,
							yy - Math.sin(a) * 8,
							xx,
							yy,
							target.kind === "crystal" ? violet : mint,
							2,
						);
						const d = Math.round(Math.hypot(target.x - p.x, target.y - p.y));
						text(
							gg,
							(target.kind === "crystal" ? "SIGNAL " : "ROUTE ") + d,
							xx + (x < 25 ? 8 : -8),
							yy + 7,
							target.kind === "crystal" ? violet : mint,
							{ align: x < 25 ? "left" : "right", font: "tiny" },
						);
					}
				}
				if (this.app.overlay) {
					for (const q of s.entities) {
						const [x, y] = r.w(q.x, q.y, 0);
						ring(gg, x, y, q.r, "#f2df86");
						if (q.owner) {
							const o = s.entities.find((x) => x.id === q.owner);
							if (o) {
								const [ox, oy] = r.w(o.x, o.y, 0);
								px.line(gg, x, y, ox, oy, "#6e8e78");
							}
						}
					}
					ring(gg, sx, sy, 7, mint);
					ring(gg, sx, sy, this.app.sim.balance.collar + 7, violet, 1, true);
				}
				if (this.app.attract) {
					E.ui.box(gg, r.W / 2 - 98, r.H - 32, 196, 24, {
						bg: "#0d2031",
						border: amber,
						alpha: 0.9,
					});
					text(gg, "DEMO · ANY INPUT TO RETURN", r.W / 2, r.H - 23, amber, {
						align: "center",
					});
				}
			});
		}
	}
	F.Presentation = Presentation;
})(typeof globalThis === "object" ? globalThis : window);
