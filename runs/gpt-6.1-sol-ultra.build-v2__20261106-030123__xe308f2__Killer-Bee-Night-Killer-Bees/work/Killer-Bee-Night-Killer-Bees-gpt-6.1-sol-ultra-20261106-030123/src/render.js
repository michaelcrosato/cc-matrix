/* Native pixel rigs and overhead diorama. All combat geometry comes from NightSim. */
(() => {
	const E = My3D2dge,
		P = E.px,
		C = {
			ink: "#f8edce",
			gold: "#f5c85b",
			dim: "#8dafa2",
			floor: "#10272a",
			dark: "#06191e",
			mint: "#aff5da",
			pink: "#ed8eaf",
		};
	E.MATERIALS.nightClay = { color: "#41736f", pattern: "glaze" };
	E.MATERIALS.nightBrass = { color: "#cfa85b", pattern: "metal" };
	E.MATERIALS.nightLeaf = { color: "#32665c", pattern: "foliage", size: 3 };
	E.SHAPES.nightPlanter = {
		about: "glazed moon-garden planter with copper lip",
		mats: { c: "nightClay", b: "nightBrass", s: "dirt" },
		parts: [
			["box", "c", [0, 0, 0], [19, 16, 8]],
			["box", "b", [0, 0, 8], [21, 18, 2]],
			["box", "s", [0, 0, 10], [17, 14, 1]],
		],
	};
	E.SHAPES.nightBell = {
		about: "the garden midnight bell",
		mats: { b: "nightBrass", m: "iron" },
		parts: [
			[
				"lathe",
				"b",
				[0, 0, 4],
				[
					[11, 0],
					[9, 3],
					[6, 12],
					[4, 14],
					[0, 14],
				],
			],
			["ball", "m", [0, 0, 2], 3],
			["box", "m", [0, 0, 18], [3, 3, 6]],
		],
	};
	const palettes = [
		{
			soil: "#10282a",
			rim: "#467266",
			petal: "#f0a2ad",
			leaf: "#24534a",
			jewel: "#8af2d0",
		},
		{
			soil: "#182833",
			rim: "#47727e",
			petal: "#b6a7e3",
			leaf: "#295460",
			jewel: "#a3d5fa",
		},
		{
			soil: "#252d30",
			rim: "#706e56",
			petal: "#edc365",
			leaf: "#3f614d",
			jewel: "#f2d284",
		},
	];
	function text(g, s, x, y, col = C.ink, o = {}) {
		E.font.text(g, s, x, y, col, { outline: false, shadow: "#071417", ...o });
	}
	function ring(g, x, y, r, c, dash = false) {
		for (let a = 0; a < 48; a++) {
			if (dash && a % 4 > 1) continue;
			const u = (a * Math.PI) / 24,
				v = ((a + 1) * Math.PI) / 24;
			P.line(
				g,
				x + Math.cos(u) * r,
				y + Math.sin(u) * r,
				x + Math.cos(v) * r,
				y + Math.sin(v) * r,
				c,
			);
		}
	}
	class Bee extends E.Blob {
		constructor(color = C.gold) {
			super({ R: 3, wings: true, colors: { base: color } });
			this.color = color;
		}
		draw(g, x, y, view, size = 1, angle = 0) {
			const s = size * (view.zoom || 1),
				t = this.t;
			const T = E.tones(this.color),
				b = this.sq || 0;
			const wing = (2.5 + Math.sin(this.flapP * 3) * 1.2) * s;
			// Wings and anatomy use the Blob's spring and wing phase, at a true overhead angle.
			const pt = (a, b) => [
				x + (a * Math.cos(angle) - b * Math.sin(angle)) * s,
				y + (a * Math.sin(angle) + b * Math.cos(angle)) * s,
			];
			for (const sd of [-1, 1]) {
				let q = pt(-0.5, sd * 3);
				P.ell(g, q[0], q[1], wing, Math.max(1, 2 * s), "#bddfd5");
				q = pt(0, sd * 3.1);
				P.line(g, q[0] - s, q[1], q[0] + s, q[1], "#f2fff0");
			}
			let q = pt(-1.2, 0);
			P.ell(g, q[0] + s, q[1] + s, 3.5 * s, 2.7 * s, "#071a1b");
			P.ell(g, q[0], q[1], 3.3 * s, (2.5 - b * 0.4) * s, T.sh);
			P.ell(g, q[0] - s * 0.6, q[1] - s * 0.7, 2.8 * s, 1.9 * s, T.base);
			for (const a of [-2, 0]) {
				const q = pt(a, 0);
				P.line(
					g,
					q[0],
					q[1] - s * 1.8,
					q[0],
					q[1] + s * 1.5,
					"#343b2c",
					Math.max(1, s),
				);
			}
			q = pt(2.2, 0);
			P.disc(g, q[0], q[1], 2.1 * s, T.deep);
			P.disc(g, q[0] - 0.4 * s, q[1] - 0.5 * s, 1.5 * s, T.lt);
			const eye = pt(3, -0.7);
			P.dot(g, ...eye, "#162c2c");
			for (const sd of [-1, 1]) {
				const a = pt(2.2, sd * 1.2),
					b = pt(3.8 + Math.sin(t * 6) * 0.3, sd * 2.7);
				P.line(g, ...a, ...b, T.hi);
				P.dot(g, ...b, T.lt);
			}
			q = pt(-5, 0);
			P.poly(g, [q, pt(-3.6, -0.9), pt(-3.6, 0.9)], T.hi);
		}
	}
	class Gardener extends E.Blob {
		constructor(type) {
			super({ R: 7, feet: true });
			this.type = type;
			this.state = {};
		}
		update(dt, state) {
			super.update(dt, {
				walk: state.contact ? 0.3 : 1,
				squash: state.contact ? -0.12 : state.recovering ? 0.1 : 0,
			});
			this.state = state;
		}
		draw(g, x, y, v) {
			const s = v.zoom || 1,
				t = this.t,
				a = this.type === "left",
				boss = this.type === "bell",
				col = boss ? "#d7b363" : a ? "#e89e86" : "#8dbed8",
				T = E.tones(col),
				R = boss ? 12 : 7,
				sq = this.sq;
			const d = (dx, dy, r, c) => P.disc(g, x + dx * s, y + dy * s, r * s, c);
			for (const side of [-1, 1]) {
				const step = Math.sin(t * 10 + side) * 2.2;
				P.line(
					g,
					x + side * 4 * s,
					y - 3 * s,
					x + side * (R + 2) * s,
					y + (-3 + step) * s,
					T.deep,
					2 * s,
				);
				P.line(
					g,
					x + side * 4 * s,
					y + 4 * s,
					x + side * (R + 1) * s,
					y + (6 - step) * s,
					T.sh,
					2 * s,
				);
				d(side * (R + 1), 6 - step, 2, T.lt);
			}
			P.ell(g, x + s, y + 2 * s, (R + 1) * s, (R - 1) * s, "#071a1d");
			P.ell(g, x, y, R * s, (R - 1 + sq * 3) * s, T.deep);
			P.ell(g, x - s, y - s, (R - 1) * s, (R - 2) * s, T.sh);
			P.ell(g, x - s * 1.5, y - s * 2, (R - 3) * s, (R - 3) * s, T.base);
			P.line(
				g,
				x - (R - 3) * s,
				y - (R - 4) * s,
				x + (R - 4) * s,
				y - (R - 4) * s,
				T.hi,
			);
			if (boss) {
				P.line(g, x - 8 * s, y - 7 * s, x + 7 * s, y - 9 * s, T.hi, 2 * s);
				P.poly(
					g,
					[
						[x + 5 * s, y - 7 * s],
						[x + 8 * s, y - 16 * s],
						[x + 14 * s, y - 16 * s],
						[x + 18 * s, y - 7 * s],
					],
					T.deep,
				);
				P.poly(
					g,
					[
						[x + 6 * s, y - 8 * s],
						[x + 9 * s, y - 15 * s],
						[x + 13 * s, y - 15 * s],
						[x + 16 * s, y - 8 * s],
					],
					T.base,
				);
				P.line(g, x + 6 * s, y - 8 * s, x + 16 * s, y - 8 * s, T.hi, 2 * s);
				P.disc(g, x + 11 * s, y - 5 * s, 2 * s, T.hi);
				const open =
					this.state.bossPhase === "expose" ||
					this.state.bossPhase === "exposed";
				d(0, 0, 5, open ? "#f6e9a8" : "#6d6651");
				ring(g, x, y, 8 * s, T.hi);
				d(0, -9, 4, T.base);
				d(0, -10, 2, T.hi);
				P.line(g, x - 5 * s, y + 3 * s, x + 5 * s, y + 3 * s, T.deep);
			} else {
				d(a ? -2 : 2, -2, 2, "#ede8cb");
				d(a ? -2 : 2, -2, 1, "#122a2f");
				P.line(g, x - 3 * s, y + 2 * s, x + 3 * s, y + 2 * s, T.lt);
				const side = a ? -1 : 1;
				P.line(
					g,
					x + side * 3 * s,
					y - 5 * s,
					x + side * 6 * s,
					y - 10 * s,
					T.deep,
					2 * s,
				);
				d(side * 6, -10, 2, col);
				if (!a) {
					P.line(g, x - 3 * s, y - 5 * s, x - 6 * s, y - 9 * s, T.hi);
					d(-6, -9, 1, T.lt);
				}
			}
			if (this.state.contact) {
				P.line(
					g,
					x - 3 * s,
					y + R * s + 3,
					x + 3 * s,
					y + R * s + 3,
					"#f9d779",
				);
			}
		}
	}
	class Painter {
		constructor(game) {
			this.game = game;
			this.bees = new Map();
			this.gardeners = new Map();
			this.fx = [];
			this.lastEvent = 0;
			this.clock = 0;
			this.phaseClock = 0;
			this.phaseKey = "";
			this.decor = Array.from({ length: 150 }, (_, i) => ({
				x: ((i * 83 + 17) % 540) - 78,
				y: ((i * 53 + 21) % 370) - 65,
				n: i,
			}));
			this.hero = new Bee();
		}
		update(w, dt) {
			this.clock += dt * (this.game.reduceMotion ? 0.2 : 1);
			this.hero.update(dt, { flap: 1 });
			if (!w) return;
			if (this.phaseKey !== w.phase) {
				this.phaseKey = w.phase;
				this.phaseClock = 0;
			} else this.phaseClock += dt;
			for (const p of w.players) {
				if (!this.bees.has(p.id))
					this.bees.set(
						p.id,
						Array.from(
							{ length: 12 },
							() => new Bee(p.id === 0 ? C.gold : C.mint),
						),
					);
				this.bees.get(p.id).forEach((b) => {
					b.update(dt, {
						look: [p.vx || 1, p.vy || 0],
						squash: p.focus ? -0.1 : p.contact ? 0.14 : 0,
						flap: p.contact ? 1 : 0.8,
					});
				});
			}
			for (const q of w.targets) {
				if (!this.gardeners.has(q.id))
					this.gardeners.set(q.id, new Gardener(q.type));
				this.gardeners.get(q.id).update(dt, q);
			}
			for (const e of w.events || []) {
				if (e.id <= this.lastEvent) continue;
				this.lastEvent = e.id;
				if (
					[
						"ray",
						"kill",
						"beeLost",
						"loss",
						"collapse",
						"damage",
						"mature",
						"maturation",
						"pulse",
						"charge",
						"clear",
						"won",
						"stageClear",
						"rivalDown",
						"pulseWarning",
						"sting",
						"recover",
						"replenish",
						"win",
					].includes(e.type)
				)
					this.fx.push({ ...e, life: 0 });
			}
			for (const f of this.fx) f.life += dt;
			this.fx = this.fx.filter((f) => f.life < 1.1);
		}
		reset() {
			this.bees.clear();
			this.gardeners.clear();
			this.fx = [];
			this.lastEvent = 0;
			this.phaseKey = "";
			this.phaseClock = 0;
		}
		fit() {
			const g = this.game,
				W = g.W,
				H = g.H;
			const z = Math.min(1.45, (W - 96) / 384, (H - 126) / 240);
			if (Math.abs(g.zoom - z) > 0.001) g.setZoom(z);
			g.cam.smooth = 0;
			g.cam.offset = [0, 10];
			g.focus(192, 120, 0);
		}
		floor(r, w) {
			const g = this.game,
				T = palettes[Math.min(2, Math.floor((w?.stage || 0) / 2))],
				z = r.view.zoom || 1;
			const [x, y] = r.w(0, 0, 0),
				[x1, y1] = r.w(384, 240, 0);
			r.sky(["#071a20", "#102c30", "#071b22"]);
			r.decal((ctx) => {
				P.rect(ctx, 0, 0, r.W, r.H, "#0b2329");
				// Layered soil strata, carved brick edging and a quiet midnight planting bed.
				P.rect(ctx, x - 13 * z, y - 13 * z, 410 * z, 266 * z, "#08171e");
				P.rect(ctx, x - 10 * z, y - 10 * z, 404 * z, 260 * z, T.rim);
				P.rect(ctx, x - 7 * z, y - 7 * z, 398 * z, 254 * z, "#2b4b46");
				P.rect(ctx, x - 4 * z, y - 4 * z, 392 * z, 248 * z, "#081b20");
				P.rect(ctx, x, y, 384 * z, 240 * z, T.soil);
				for (let a = 0; a < 384; a += 16) {
					P.line(
						ctx,
						x + a * z,
						y - 9 * z,
						x + (a + 10) * z,
						y - 9 * z,
						"#68887c",
					);
					P.line(
						ctx,
						x + a * z,
						y1 + 7 * z,
						x + (a + 10) * z,
						y1 + 7 * z,
						"#47665b",
					);
				}
				for (let a = 0; a < 240; a += 16) {
					P.dot(ctx, x - 8 * z, y + a * z, "#759489");
					P.dot(ctx, x1 + 7 * z, y + a * z, "#759489");
				}
				for (let i = 0; i < 160; i++) {
					const a = ((i * 71 + 5) % 380) + 2,
						b = ((i * 37 + 11) % 236) + 2;
					P.dot(ctx, x + a * z, y + b * z, i % 5 ? "#183437" : "#23423f");
				}
				for (let a = 32; a < 384; a += 64)
					for (let b = 24; b < 240; b += 64) {
						P.line(
							ctx,
							x + (a - 2) * z,
							y + b * z,
							x + (a + 2) * z,
							y + b * z,
							"#27413d",
						);
						P.line(
							ctx,
							x + a * z,
							y + (b - 2) * z,
							x + a * z,
							y + (b + 2) * z,
							"#27413d",
						);
					}
				// Native pixel foliage, buds, dew and petals stay outside collision lanes.
				for (const o of this.decor) {
					if (o.x > -16 && o.x < 400 && o.y > -16 && o.y < 256) continue;
					const X = x + o.x * z,
						Y = y + o.y * z,
						n = o.n;
					for (let j = 0; j < 3; j++) {
						const a = n + j * 2,
							dx = Math.cos(a) * 9 * z,
							dy = Math.sin(a) * 7 * z;
						P.line(ctx, X, Y, X + dx, Y + dy, T.leaf, 2 * z);
						P.ell(
							ctx,
							X + dx,
							Y + dy,
							5 * z,
							2.5 * z,
							n % 3 ? "#1d4d47" : "#37675a",
						);
						P.line(
							ctx,
							X + dx - 2 * z,
							Y + dy,
							X + dx + 2 * z,
							Y + dy,
							"#4b7866",
						);
					}
					if (n % 3 === 0) {
						const R = (3 + (n % 4)) * z;
						for (let k = 0; k < 5; k++) {
							const a = k * 1.256 + n;
							P.ell(
								ctx,
								X + Math.cos(a) * R,
								Y + Math.sin(a) * R,
								R * 0.8,
								R * 0.65,
								E.shade(T.petal, k % 2 ? -0.15 : 0),
							);
						}
						P.disc(ctx, X, Y, 2 * z, "#ecc571");
					}
					if (n % 7 === 0) P.dot(ctx, X + 2 * z, Y - 3 * z, "#c7dfc7");
				}
				// Tiny drifting fireflies provide life without entering the combat surface.
				for (let i = 0; i < (this.game.reduceMotion ? 6 : 18); i++) {
					const a = i * 1.7 + this.clock * 0.17,
						fx = (i * 73) % r.W,
						fy = (i * 41 + Math.sin(a) * 9) % r.H;
					if (fx > x - 10 && fx < x1 + 10 && fy > y - 10 && fy < y1 + 10)
						continue;
					P.dot(ctx, fx, fy, i % 2 ? "#b8be6b" : "#4b7c64");
				}
			});
			if (w) {
				for (const o of w.obstacles || []) {
					const [a, b] = r.w(o.x, o.y, 0),
						ww = o.w * z,
						hh = o.h * z;
					r.decal((ctx) => {
						P.rect(
							ctx,
							a - 2 * z,
							b - 2 * z,
							ww + 4 * z,
							hh + 4 * z,
							"#091d20",
						);
						P.rect(ctx, a, b, ww, hh, "#3c645b");
						P.rect(ctx, a + z, b + z, ww - 2 * z, hh - 2 * z, "#295348");
						for (let j = 3; j < o.w; j += 7)
							P.line(
								ctx,
								a + j * z,
								b + 2 * z,
								a + j * z,
								b + hh - 2 * z,
								"#386658",
							);
						P.line(ctx, a, b, a + ww, b, "#829580");
					});
				}
				for (const e of NightContent.stages[w.stage].entrances || []) {
					const ex = Array.isArray(e) ? e[0] : e.x,
						ey = Array.isArray(e) ? e[1] : e.y;
					const [a, b] = r.w(ex, ey, 0);
					r.decal((ctx) => {
						P.ell(ctx, a, b, 10 * z, 8 * z, "#3b7770");
						P.ell(ctx, a, b, 8 * z, 6 * z, "#041719");
						P.line(ctx, a - 5 * z, b - 4 * z, a + 4 * z, b - 4 * z, T.jewel);
					});
				}
			}
			for (const [a, b] of [
				[-25, -26],
				[409, -26],
				[-25, 266],
				[409, 266],
			]) {
				r.shape("nightPlanter", a, b, 0, { scale: 1.2, shadow: true });
				r.prop("flowers", a, b, 11, { size: 1.8, color: T.petal });
			}
			g.lights.enabled = true;
			g.lights.ambient = 0.94;
			for (const a of [0, 384])
				g.lights.add(a, 120, 8, 42, 0.18, { color: T.jewel });
		}
		world(r, w, { inspect = false, labels = false, attract = false } = {}) {
			if (!w) return;
			this.floor(r, w);
			const z = r.view.zoom || 1;
			for (const h of w.husks) {
				r.shadow(h.x, h.y, h.r + 1, 0.38);
				r.actor(h.x, h.y, 0, (ctx, x, y) => {
					const rr = h.r * z;
					const settle = this.game.reduceMotion
						? 0
						: (1 - Math.min(1, Math.max(0, w.time - (h.born || 0)) / 0.4)) *
							2 *
							z;
					P.ell(ctx, x, y, rr, rr, "#081a1b");
					P.ell(ctx, x, y - z - settle, rr - z, rr - 2 * z, "#6e7258");
					P.ell(ctx, x - 2 * z, y - 3 * z, rr - 3 * z, rr - 4 * z, "#9e9a6e");
					P.line(ctx, x - 4 * z, y - 3 * z, x + 2 * z, y + 3 * z, "#4d5a49", z);
					P.line(ctx, x + 2 * z, y + 3 * z, x + 5 * z, y - z, "#d2bd78");
				});
			}
			for (const q of w.targets) {
				if (q.health <= 0) continue;
				r.shadow(q.x, q.y, q.r + 1, 0.32);
				if (q.warning > 0)
					r.decal((ctx) => {
						const [x, y] = r.w(q.x, q.y, 0);
						ring(
							ctx,
							x,
							y,
							(q.r + 4 + Math.sin(this.clock * 8)) * z,
							"#e8c16b",
							true,
						);
					});
				r.actor(q.x, q.y, 0, (ctx, x, y) => {
					const rig = this.gardeners.get(q.id);
					if (rig) rig.draw(ctx, x, y, r.view);
				});
				if (q.contact || q.recovering) {
					const [a, b] = r.w(q.x, q.y + q.r + 5, 0);
					r.overlay((ctx) => {
						P.rect(ctx, a - 9 * z, b, 18 * z, 2 * z, "#263b34");
						P.rect(
							ctx,
							a - 9 * z,
							b,
							18 * z * Math.max(0, 1 - q.health / q.maxHealth),
							2 * z,
							q.recovering ? "#86bda6" : "#f4ce73",
						);
						if (q.recovering)
							text(ctx, "mending", a, b + 4 * z, "#90c8ae", {
								align: "center",
							});
					});
				}
				if (q.type === "bell") {
					const [a, b] = r.w(q.x, q.y - 20, 0);
					r.text(
						q.bossPhase === "expose" || q.bossPhase === "exposed"
							? "STING THE CORE"
							: q.bossPhase === "pulse"
								? "PULSE!"
								: "LAST BELL",
						a,
						b,
						"#eacd8e",
						{ align: "center" },
					);
				}
			}
			for (const h of w.rivals) {
				const stage = h.stage,
					col =
						stage === "hunter"
							? "#f38198"
							: stage === "guard"
								? "#b29cec"
								: "#80c89f";
				r.shadow(h.x, h.y, h.r, 0.2);
				r.actor(h.x, h.y, 0, (ctx, x, y) => {
					if (h.warning > 0) {
						ring(ctx, x, y, (h.r + 5) * z, col, true);
						text(ctx, "!", x, y - 3, col, { align: "center", scale: 2 });
						return;
					}
					const n = stage === "hunter" ? 7 : stage === "guard" ? 6 : 5;
					for (let i = 0; i < n; i++) {
						const a =
								(i * Math.PI * 2) / n +
								this.clock * (stage === "hunter" ? 2 : -1),
							R = h.r * 0.7 * z,
							xx = x + Math.cos(a) * R,
							yy = y + Math.sin(a) * R;
						P.ell(ctx, xx, yy, 2.5 * z, 2 * z, E.shade(col, -0.4));
						P.ell(ctx, xx - z * 0.4, yy - z * 0.6, 1.7 * z, 1.2 * z, col);
						P.line(
							ctx,
							xx,
							yy - 2 * z,
							xx + Math.sin(this.clock * 40 + i) * 3 * z,
							yy - 3 * z,
							"#e0cddc",
						);
					}
					P.disc(ctx, x, y, 2 * z, col);
					if (stage === "hunter") {
						P.poly(
							ctx,
							[
								[x - 3 * z, y - 8 * z],
								[x, y - 12 * z],
								[x + 3 * z, y - 8 * z],
							],
							col,
						);
					} else if (stage === "guard") {
						ring(ctx, x, y, h.r * z, col, true);
					}
				});
			}
			const regroup =
				w.phase === "won"
					? Math.min(1, this.phaseClock / (this.game.reduceMotion ? 0.2 : 2))
					: 0;
			const presented = regroup
				? w.players.map((p) => ({
						...p,
						x: E.lerp(p.x, 172 + p.id * 40, regroup),
						y: E.lerp(p.y, 218, regroup),
						contact: false,
						focus: false,
						vx: 0,
						vy: 0,
					}))
				: w.players;
			for (const p of presented) {
				if (p.bees <= 0) {
					r.textAt(
						p.x,
						p.y,
						0,
						`P${p.id + 1} RESTING`,
						p.id === 0 ? C.gold : C.mint,
					);
					continue;
				}
				const col = p.id === 0 ? C.gold : C.mint,
					[a, b] = r.w(p.x, p.y, 0);
				r.shadow(p.x, p.y, p.r, 0.25);
				if (p.charge && w.phase === "playing") {
					const eligible = w.rivals.some(
						(h) => Math.abs(h.y - p.y) < (w.tuning.rayWidth || 8),
					);
					r.decal((ctx) => {
						for (let x = 0; x < 384; x += eligible ? 8 : 16) {
							const [a, b] = r.w(x, p.y, 0);
							P.line(ctx, a, b, a + 3 * z, b, eligible ? "#8d8155" : "#405345");
						}
						P.rect(ctx, r.w(0, p.y)[0] - 5 * z, b - 2 * z, 3 * z, 5 * z, col);
						P.rect(ctx, r.w(384, p.y)[0] + 2 * z, b - 2 * z, 3 * z, 5 * z, col);
					});
				}
				if (
					p.contact ||
					inspect ||
					p.focus ||
					p.hitUntil > w.time ||
					p.bees <= 3
				)
					r.decal((ctx) =>
						ring(
							ctx,
							a,
							b,
							p.r * z,
							p.hitUntil > w.time ? "#f58e96" : col,
							!p.contact,
						),
					);
				const rigs = this.bees.get(p.id) || [];
				for (let i = 0; i < p.bees; i++) {
					const a =
							i * 2.399963 + (p.focus ? this.clock * 0.25 : this.clock * 0.5),
						R =
							p.r *
							Math.sqrt((i + 0.5) / p.bees) *
							0.73 *
							(this.game.reduceMotion
								? 1
								: 0.35 + 0.65 * Math.min(1, w.stageTime / 0.7));
					const x = p.x + Math.cos(a) * R,
						y = p.y + Math.sin(a) * R;
					const h = p.hitUntil > w.time && Math.floor(this.clock * 14) % 2;
					r.actor(x, y, 0, (ctx, ox, oy) => {
						if (rigs[i])
							rigs[i].draw(
								ctx,
								ox,
								oy,
								r.view,
								0.76,
								Math.atan2(p.vy || 0, p.vx || 1),
							);
						if (h) P.dot(ctx, ox, oy - 3 * z, "#fff2dc");
					});
				}
				r.overlay((ctx) => {
					if (p.id === 0) {
						P.disc(ctx, a, b, 1.3 * z, C.ink);
					} else
						P.poly(
							ctx,
							[
								[a, b - 2 * z],
								[a + 2 * z, b],
								[a, b + 2 * z],
								[a - 2 * z, b],
							],
							C.mint,
						);
					text(ctx, `P${p.id + 1}`, a, b - p.r * z - 11, col, {
						align: "center",
					});
					if (p.focus)
						text(ctx, "FOCUS", a, b + p.r * z + 5, col, {
							align: "center",
							font: "tiny",
						});
				});
			}
			for (const f of this.fx) {
				const [x, y] = r.w(f.x || 0, f.y || 0, 0),
					u = f.life,
					motion = this.game.reduceMotion ? 0.25 : 1;
				if (f.type === "ray" && u < 0.35) {
					r.overlay((ctx) => {
						const a = r.w(0, f.y, 0),
							b = r.w(384, f.y, 0);
						P.blend(
							ctx,
							(1 - u / 0.35) *
								Math.max(0.18, this.game.settings.flashes) *
								(this.game.reduceMotion ? 0.65 : 1),
							"add",
							() => {
								P.rect(
									ctx,
									a[0],
									y - ((w.tuning.rayWidth || 12) * z) / 2,
									b[0] - a[0],
									(w.tuning.rayWidth || 12) * z,
									"#99844c",
								);
								P.rect(ctx, a[0], y - z, b[0] - a[0], 2 * z, "#fff5c7");
							},
						);
					});
				} else if (f.type === "sting" && u < 0.2) {
					r.overlay((ctx) => {
						for (let i = 0; i < 3; i++) {
							const a = i * 2.1 + u * 6;
							P.line(
								ctx,
								x + Math.cos(a) * 7 * z,
								y + Math.sin(a) * 7 * z,
								x + Math.cos(a) * (11 + u * 10) * z,
								y + Math.sin(a) * (11 + u * 10) * z,
								"#e9d589",
							);
						}
					});
				} else if (f.type === "recover" && u < 0.8) {
					r.overlay((ctx) =>
						text(ctx, "mending", x, y - 12 * z - u * 8 * z, "#91b8a5", {
							align: "center",
						}),
					);
				} else if (f.type === "pulseWarning") {
					r.decal((ctx) => ring(ctx, x, y, (15 + u * 60) * z, "#d8bd76", true));
				} else if (f.type === "mature") {
					r.overlay((ctx) => {
						ring(ctx, x, y, (8 + u * 19 * motion) * z, "#ddb1e3", true);
						if (u < 0.65)
							text(
								ctx,
								f.stage === "hunter" ? "HUNTER!" : "GUARD!",
								x,
								y - 15 * z - u * 8 * z,
								"#eac9e5",
								{ align: "center" },
							);
					});
				} else if (f.type === "pulse") {
					r.decal((ctx) => ring(ctx, x, y, u * 130 * z, "#d8c17f"));
				} else if (!["sting", "recover"].includes(f.type)) {
					r.overlay((ctx) => {
						for (let i = 0; i < 9; i++) {
							const a = i * 2.4,
								R = u * 26 * z * motion;
							P.disc(
								ctx,
								x + Math.cos(a) * R,
								y + Math.sin(a) * R - u * 9 * z,
								Math.max(0.5, (1 - u) * 2 * z),
								f.type === "damage" || f.type === "loss" ? "#f2a0a0" : C.gold,
							);
						}
						if (f.type === "kill" || f.type === "collapse")
							text(ctx, `+${f.points || 200}`, x, y - u * 24 * z, C.gold, {
								align: "center",
							});
					});
				}
			}
			if (inspect) {
				r.overlay((ctx) => {
					for (const q of [...w.targets, ...w.rivals, ...w.husks]) {
						const [a, b] = r.w(q.x, q.y, 0);
						ring(ctx, a, b, q.r * z, "#a0e0f0", true);
					}
					if (labels)
						for (const q of w.rivals)
							text(ctx, q.stage, ...r.w(q.x, q.y + 15, 0), "#eee0fa", {
								align: "center",
							});
				});
			}
		}
		hud(r, w, attract = false) {
			const g = this.game,
				st = NightContent.stages[w.stage],
				_z = r.view.zoom || 1,
				[_x, _y] = r.w(0, 0, 0),
				[_x1, y1] = r.w(384, 240, 0);
			r.overlay((ctx) => {
				const compact = r.W < 520;
				P.rect(ctx, 0, 0, r.W, compact ? 77 : 45, "#081c22");
				P.line(
					ctx,
					16,
					compact ? 76 : 44,
					r.W - 16,
					compact ? 76 : 44,
					"#345249",
				);
				text(ctx, "KILLER BEE NIGHT", 18, 9, C.gold);
				text(ctx, String(w.score).padStart(6, "0"), 18, 24, C.ink, {
					scale: 2,
				});
				text(
					ctx,
					`${w.stage + 1} / 6  ${st.title.toUpperCase()}`,
					r.W / 2,
					10,
					C.ink,
					{ align: "center" },
				);
				text(
					ctx,
					`${w.kills} / ${w.totalTargets} GARDENERS`,
					r.W / 2,
					27,
					C.dim,
					{ align: "center" },
				);
				const pw = w.players.length === 2 ? 85 : 100;
				w.players.forEach((p, i) => {
					const xx = compact
							? i === 0
								? 18
								: r.W - 140
							: r.W - 64 - pw * (w.players.length - i),
						col = i === 0 ? C.gold : C.mint;
					text(
						ctx,
						`P${i + 1}  ${String(p.bees).padStart(2, "0")}`,
						xx,
						compact ? 57 : 10,
						col,
					);
					text(
						ctx,
						p.charge ? "RAY READY" : "RAY EMPTY",
						xx + (compact ? 48 : 0),
						compact ? 57 : 27,
						p.charge ? col : C.dim,
					);
				});
				const hint = attract
					? "GARDEN IN MOTION  /  ANY INPUT TO RETURN"
					: w.stageTime < 13
						? st.lesson
						: `${g.input.label("ray")}  RAY     ${g.input.label("focus")}  HOLD FOCUS     ${g.input.label("pause")}  MENU`;
				text(
					ctx,
					hint,
					r.W / 2,
					Math.min(r.H - 17, Math.max(y1 + 19, r.H - 22)),
					w.stageTime < 13 ? C.gold : C.dim,
					{ align: "center", wrap: r.W - 28 },
				);
				if (w.assisted && !attract) text(ctx, "ASSISTED", 18, 51, "#bda6ce");
				if (attract)
					text(ctx, "DEMONSTRATION", r.W / 2, 54, C.gold, { align: "center" });
			});
		}
		title(r) {
			const W = r.W,
				H = r.H,
				t = this.clock;
			this.floor(r, null);
			r.overlay((ctx) => {
				const boxW = Math.min(470, W - 36),
					x = (W - boxW) / 2,
					y = Math.max(18, (H - 350) / 2);
				P.rect(ctx, x - 8, y - 8, boxW + 16, 333, "#0a2026");
				P.line(ctx, x - 8, y - 8, x + boxW + 8, y - 8, "#55776a");
				P.line(ctx, x - 8, y + 325, x + boxW + 8, y + 325, "#55776a");
				// Brass orbit, moon, and a generously sized custom rig form the title mark.
				const mx = W / 2 + boxW * 0.33,
					my = y + 71;
				ring(ctx, mx, my, 39, "#34574d");
				ring(ctx, mx, my, 44, "#23443e", true);
				P.disc(ctx, mx + 19, my - 21, 13, "#b5c8a0");
				P.disc(ctx, mx + 23, my - 25, 12, "#0a2026");
				this.hero.draw(
					ctx,
					mx,
					my,
					{ zoom: 1 },
					4.2,
					Math.sin(t * 0.5) * 0.1 - 0.2,
				);
				text(ctx, "A MIDNIGHT GARDEN CAPER", x + 18, y + 12, C.dim);
				E.font.title(ctx, "KILLER", x + 18, y + 39, {
					scale: 5,
					colors: ["#fcf1cf", "#e9c26a", "#c58d42"],
					depth: 2,
					depthColor: "#10201f",
				});
				E.font.title(ctx, "BEE NIGHT", x + 18, y + 85, {
					scale: 4,
					colors: ["#fcf1cf", "#e9c26a", "#c58d42"],
					depth: 2,
					depthColor: "#10201f",
				});
				text(ctx, "Twelve little bees. One big night.", W / 2, y + 130, C.ink, {
					align: "center",
				});
				text(ctx, "Surround. Sting. Make a beeline.", W / 2, y + 146, C.dim, {
					align: "center",
				});
			});
			return { y: Math.max(18, (H - 350) / 2) + 171 };
		}
	}
	globalThis.NightPaint = {
		Painter,
		Bee,
		Gardener,
		palettes,
		colors: C,
		text,
		ring,
	};
})();
