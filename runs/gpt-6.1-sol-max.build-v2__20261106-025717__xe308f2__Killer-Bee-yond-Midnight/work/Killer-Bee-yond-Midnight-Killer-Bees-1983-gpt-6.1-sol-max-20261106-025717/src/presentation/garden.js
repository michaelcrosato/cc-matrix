import { PALETTES, STAGES } from "../../content/stages.js";
import { clamp, footprint, rng } from "../sim/world.js";
import { installAssets } from "./assets.js";
import { createRigs } from "./rigs.js";
export class Garden {
	constructor(E, game) {
		this.E = E;
		this.game = game;
		installAssets(E);
		this.rigs = createRigs(E);
		this.bees = new Map();
		this.gardeners = new Map();
		this.particles = [];
		this.lastEvent = 0;
		this.overlay = false;
		this.labels = false;
		this.rect = null;
		game.screen.listeners.push(() => this.fit());
		this.cacheStage = -1;
		this.t = 0;
		this.weather = [];
		const R = rng(23);
		for (let i = 0; i < 100; i++)
			this.weather.push({
				x: R() * 650 - 130,
				y: R() * 430 - 95,
				a: R() * 6.28,
				s: 0.2 + R() * 0.7,
			});
	}
	fit() {
		const g = this.game,
			W = g.W,
			H = g.H,
			portrait = H > W * 1.15;
		const top = portrait ? 86 : 46,
			bottom = portrait ? 100 : 32,
			margin = portrait ? 19 : 30;
		const fit = Math.min((W - margin * 2) / 400, (H - top - bottom) / 256),
			zoom = clamp(fit, 0.5, 1.6);
		if (Math.abs(g.zoom - zoom) > 0.001) g.setZoom(zoom);
		const centerY = (top + H - bottom) / 2;
		g.cam.offset = [0, centerY - H / 2];
		g.cam.smooth = 0;
		g.focus(192, 120, 0);
		g.cam.snap = true;
		const projected = g.view.p(192, 120, 0);
		g.cam.x = projected[0] - W / 2;
		g.cam.y = projected[1] - centerY;
		this.rect = {
			x: (W - 384 * zoom) / 2,
			y: centerY - 120 * zoom,
			w: 384 * zoom,
			h: 240 * zoom,
			zoom,
			portrait,
			top,
			bottom,
		};
		return this.rect;
	}
	reset(s) {
		this.lastEvent = s?.eid || 0;
		this.particles = [];
		this.bees.clear();
		this.gardeners.clear();
	}
	update(dt, s) {
		this.t = s.time;
		this.fit();
		for (const p of s.players) {
			if (!this.bees.has(p.id)) this.bees.set(p.id, new this.rigs.BeeRig(p.id));
			this.bees.get(p.id).update(dt, p);
		}
		for (const t of s.targets) {
			if (!this.gardeners.has(t.id))
				this.gardeners.set(t.id, new this.rigs.GardenerRig(t.type));
			this.gardeners.get(t.id).update(dt, t);
		}
		for (const e of s.events)
			if (e.id > this.lastEvent) {
				this.effect(e);
				this.lastEvent = e.id;
			}
		this.particles = this.particles.filter((p) => s.time - p.born < p.life);
	}
	effect(e) {
		const palette = {
			collapse: "#e9bd79",
			zap: "#d3e8b1",
			loss: "#e5a397",
			charge: "#ffe5a0",
			mature: "#df9890",
			pulse: "#ebd695",
			clear: "#e5e9b8",
		};
		if (palette[e.type] && Number.isFinite(e.x)) {
			const R = rng(e.id * 37);
			for (let i = 0; i < (e.type === "collapse" ? 16 : 8); i++) {
				const a = R() * 6.28,
					s = 8 + R() * 35;
				this.particles.push({
					x: e.x,
					y: e.y,
					vx: Math.cos(a) * s,
					vy: Math.sin(a) * s,
					born: e.t,
					life: 0.4 + R() * 0.7,
					c: palette[e.type],
					kind: e.type,
				});
			}
		}
	}
	draw(r, s, { hud = true, demo = false, prompt = "", names = [] } = {}) {
		const E = this.E,
			{ px } = E,
			g = this.game,
			d = STAGES[s.stage],
			C = PALETTES[d.garden],
			time = g.reduceMotion ? 0 : s.time;
		r.sky(["#08151d", "#101e29", "#18272c"]);
		r.decal((ctx) => {
			const q = (x, y) => r.w(x, y, 0),
				rect = (x, y, w, h, c) => {
					const a = q(x, y),
						b = q(x + w, y + h);
					px.rect(ctx, a[0], a[1], b[0] - a[0], b[1] - a[1], c);
				};
			rect(-70, -65, 524, 370, "#101f27");
			// Worn stone and soil strata framing the quiet play surface.
			rect(-20, -20, 424, 284, "#0a141c");
			rect(-16, -16, 416, 276, "#283b40");
			rect(-12, -12, 408, 268, C.edge);
			rect(-10, -10, 404, 264, "#15272d");
			rect(-5, -5, 394, 250, "#42605b");
			rect(-3, -3, 390, 246, "#253e3e");
			rect(0, 0, 384, 240, C.floor);
			for (let x = 0; x < 384; x += 16) {
				rect(x, -10, 15, 3, "#63726b");
				rect(x, 247, 15, 3, "#263a3b");
				if (x % 48 === 0) {
					const a = q(x + 7, -8);
					px.dot(ctx, ...a, "#c1ac78");
				}
			}
			for (let y = 0; y < 240; y += 16) {
				rect(-10, y, 3, 15, "#5c716a");
				rect(391, y, 3, 15, "#283e3d");
			}
			// Sparse, low contrast floor grain. No animated decorative motion in collision lanes.
			for (let i = 0; i < 240; i++) {
				const x = ((i * 173 + 19) % 382) + 1,
					y = ((i * 83 + 7) % 238) + 1,
					a = q(x, y);
				px.dot(ctx, ...a, i % 3 ? "#182a2e" : "#233437");
			}
			for (let x = 32; x < 384; x += 64)
				for (let y = 26; y < 240; y += 64) {
					const a = q(x, y);
					px.line(ctx, a[0] - 2, a[1], a[0] + 2, a[1], "#263738");
				}
			// Hand-placed pots, petal beds and copper irrigation rails live outside the arena.
			for (let i = 0; i < 17; i++) {
				const x = -25 + i * 27;
				this.flower(ctx, r, x, -28, 8 + (i % 4), C, i, time);
				this.flower(ctx, r, x, 269, 8 + ((i * 3) % 5), C, i + 23, time);
			}
			for (let i = 0; i < 10; i++) {
				this.flower(ctx, r, -31, i * 28 - 10, 11, C, i + 41, time);
				this.flower(ctx, r, 416, i * 28 - 10, 11, C, i + 67, time);
			}
			for (let i = 0; i < 24; i++) {
				const x = i % 2 ? -58 : 442,
					y = ((i * 47) % 320) - 36;
				this.leaf(
					ctx,
					r,
					x,
					y,
					15 + (i % 6),
					(i % 2 ? 1 : -1) * 0.7,
					C.leaf,
					time,
					i,
				);
			}
			for (let i = 0; i < 7; i++) {
				const x = -65 + i * 85,
					qq = q(x, -48);
				px.line(ctx, qq[0], qq[1], qq[0] + 40 * r.ppu, qq[1], "#294449");
			}
			// Visible collision outlines for authored beds.
			for (const o of d.obstacles) {
				rect(o.x - 1, o.y - 1, o.w + 2, o.h + 2, "#5d7469");
				rect(o.x, o.y, o.w, o.h, "#293e3d");
			}
			for (const h of s.husks) {
				const a = q(h.x, h.y);
				px.ell(
					ctx,
					a[0] + 2,
					a[1] + 3,
					h.r * r.ppu + 3,
					h.r * r.ppu + 2,
					"#071318",
				);
			}
			if (this.overlay) {
				for (const o of d.obstacles) {
					const a = q(o.x, o.y),
						b = q(o.x + o.w, o.y + o.h);
					px.line(ctx, ...a, b[0], a[1], "#e5a4b7");
					px.line(ctx, b[0], a[1], ...b, "#e5a4b7");
					px.line(ctx, ...b, a[0], b[1], "#e5a4b7");
					px.line(ctx, a[0], b[1], ...a, "#e5a4b7");
				}
			}
		});
		for (const o of d.obstacles) {
			if (o.kind === "dial")
				r.shape("garden-dial", o.x + o.w / 2, o.y + o.h / 2, 0, {
					scale: o.w / 42,
					shadow: false,
				});
			else {
				r.shape("garden-bed", o.x + o.w / 2, o.y + o.h / 2, 0, {
					params: { w: o.w, d: o.h },
					mats: { g: d.garden === 1 ? "slate" : "midnightGlaze" },
					shadow: false,
				});
				r.queue(o.x + o.w / 2, o.y + o.h / 2, 3, (ctx) => {
					for (let i = 0; i < Math.max(1, Math.floor(o.w / 12)); i++)
						this.flower(
							ctx,
							r,
							o.x + 6 + i * 11,
							o.y + o.h / 2,
							Math.min(5, o.h / 3),
							C,
							i + o.x,
							time,
							true,
						);
				});
				if (o.kind === "trellis")
					r.queue(o.x + o.w / 2, o.y + o.h / 2, 4, (ctx) => {
						const a = r.w(o.x + 3, o.y + 3, 0),
							b = r.w(o.x + o.w - 3, o.y + o.h - 3, 0);
						px.line(ctx, ...a, ...b, "#8c9878");
						px.line(ctx, a[0], b[1], b[0], a[1], "#6d867a");
					});
			}
		}
		for (const [i, e] of d.entrances.entries()) {
			r.shape("garden-jewel", e.x, e.y, 0, { scale: 0.9, shadow: false });
			r.decal((ctx) => {
				const a = r.w(e.x, e.y, 0);
				for (let j = 0; j < 4; j++) {
					const x = a[0] + e.dx * (j * 3 - 9) * r.ppu,
						y = a[1] + e.dy * (j * 3 - 9) * r.ppu;
					px.dot(ctx, x, y, "#678a80");
				}
			});
		}
		for (const h of s.husks) {
			const age = s.time - h.born,
				k = r.ppu,
				settle = g.reduceMotion ? 0 : Math.max(0, 1 - age / 0.45) * 3;
			r.actor(
				h.x,
				h.y,
				0,
				(ctx, x, y) => {
					const R = h.r * k;
					px.ell(ctx, x, y, R, R, "#5f6658");
					px.ell(ctx, x - 0.5, y - settle, R - 1, R - 2, "#9c9d7b");
					px.ell(ctx, x - 1, y - 2 - settle, R - 3, R - 4, "#c7bf8a");
					px.line(ctx, x - R * 0.7, y, x + R * 0.6, y + R * 0.2, "#535b51");
					px.line(ctx, x, y - R * 0.6, x - 2, y + R * 0.5, "#626950");
					px.rect(ctx, x + R * 0.5, y - R * 0.5, 2, 1, "#ede0ad");
					if (h.type === "bell") {
						px.rect(ctx, x - 4 * k, y - 5 * k, 8 * k, 4 * k, "#c6a469");
						px.rect(ctx, x - 2 * k, y - 3 * k, 4 * k, 2 * k, "#394a49");
					}
				},
				{ outline: false, rim: false },
			);
			if (this.overlay)
				r.decal(() => r.groundRing(h.x, h.y, h.r, "#ffd28c", 1));
		}
		// Charged alignment preview, kept weaker than enemies and the ray itself.
		for (const p of s.players)
			if (p.bees && p.charge) {
				const threat = s.rivals.some(
					(a) => Math.abs(a.y - p.y) < s.tuning.rayWidth + a.r,
				);
				r.decal((ctx) => {
					const a = r.w(0, p.y),
						b = r.w(384, p.y);
					const c = p.id ? "#5f8583" : "#69684b";
					for (let x = a[0]; x < b[0]; x += threat ? 5 : 10)
						px.rect(ctx, x, a[1], threat ? 3 : 1, 1, c);
				});
			}
		for (const t of s.targets) {
			r.shadow(t.x, t.y, t.r + 2, 0.5, "#06151a");
			if (t.warning > 0) {
				r.decal(() =>
					r.groundRing(
						t.x,
						t.y,
						11 + (Math.sin(s.time * 8) + 1) * 2,
						"#e3b17b",
						0.8,
					),
				);
				r.textAt(t.x, t.y, 0, "!", "#ffda90");
			}
			const rig = this.gardeners.get(t.id);
			if (rig)
				r.actor(t.x, t.y, 0, (ctx, x, y) => rig.draw(ctx, x, y, r.view), {
					outline: false,
					rim: false,
				});
			if (t.type === "bell" && t.bossPhase === "pulse")
				r.decal((ctx) => {
					r.groundRing(t.x, t.y, 20 + (70 * t.bossT) / 1.5, "#c3a176", 0.65);
					r.groundRing(t.x, t.y, 95, "#786d55", 0.4);
				});
			if (this.labels)
				r.textAt(
					t.x,
					t.y,
					10,
					t.type === "bell"
						? t.bossPhase
						: t.type === "left"
							? "LEFTENANT"
							: "RIGHTO",
					"#f5de9b",
				);
		}
		for (const a of s.rivals) {
			const k = r.ppu,
				state = a.state,
				color = ["#95b57f", "#9bb3d4", "#e89280"][state],
				shapeN = [5, 7, 9][state];
			r.shadow(a.x, a.y, 9, 0.35, "#071018");
			if (a.warning > 0 || s.time - a.matureAt < 0.8)
				r.decal(() =>
					r.groundRing(a.x, a.y, 12 + Math.sin(s.time * 6) * 2, color, 0.7),
				);
			r.actor(
				a.x,
				a.y,
				0,
				(ctx, x, y) => {
					if (a.warning > 0) {
						const w = Math.sin(s.time * 9) * 0.2 + 0.5;
						px.ell(ctx, x, y, 8 * k, 8 * k, "#344643");
						px.ell(ctx, x, y, 6 * k, 6 * k, color);
						px.rect(ctx, x - k, y - 4 * k, 2 * k, 5 * k, "#202e30");
						px.dot(ctx, x, y + 3 * k, "#202e30");
						return;
					}
					for (let i = 0; i < shapeN; i++) {
						const angle =
								state === 2
									? a.dir + Math.PI + (i - shapeN / 2) * 0.32
									: i * 2.399 + s.time * (state === 1 ? 1.6 : 0.8),
							radius =
								state === 2
									? 3 + Math.abs(i - shapeN / 2) * 1.1
									: 2 + Math.sqrt(i) * 2;
						const xx = x + Math.cos(angle) * radius * k,
							yy = y + Math.sin(angle) * radius * k,
							wa = Math.sin(s.time * 49 + i) * 1.5;
						px.ell(ctx, xx, yy - 2 * k, 2 * k, (1.7 + wa * 0.2) * k, "#cbded4");
						px.ell(ctx, xx, yy, 1.8 * k, 2.4 * k, "#253334");
						px.rect(ctx, xx - k, yy - k, 2 * k, 3 * k, color);
						px.dot(ctx, xx, yy - 2 * k, "#fff4d7");
					}
					if (state === 2) {
						const cs = Math.cos(a.dir),
							sn = Math.sin(a.dir);
						px.line(
							ctx,
							x + cs * 9 * k,
							y + sn * 9 * k,
							x + cs * 12 * k,
							y + sn * 12 * k,
							color,
						);
					}
				},
				{ outline: false, rim: false },
			);
			if (this.labels)
				r.textAt(a.x, a.y, 10, ["SCOUT", "GUARD", "HUNTER"][state], color);
		}
		for (const p of s.players) {
			const color = p.id ? "#bce6d3" : "#ffe2a0",
				R = footprint(p);
			if (p.bees) {
				r.shadow(p.x, p.y, R, 0.25, "#071419");
				if (p.contact || p.focus || this.overlay)
					r.decal(() =>
						r.groundRing(p.x, p.y, R, color, p.contact ? 0.8 : 0.35),
					);
				if (s.time - p.lostAt < 0.45)
					r.decal(() =>
						r.groundRing(p.x, p.y, R + 4 * (s.time - p.lostAt), "#efaa9a", 0.8),
					);
			}
			const rig = this.bees.get(p.id);
			if (rig)
				r.actor(p.x, p.y, 1, (ctx, x, y) => rig.draw(ctx, x, y, r.view), {
					outline: false,
					rim: false,
				});
			if (s.players.length > 1)
				r.textAt(
					p.x,
					p.y + R + 6,
					0,
					p.bees ? (p.id ? "2" : "1") : "OUT",
					color,
				);
		}
		for (const e of s.events) {
			const age = s.time - e.t;
			if (age < 0) continue;
			if (e.type === "ray" && age < 0.4) {
				r.queue(
					192,
					e.y,
					1,
					(ctx) => {
						const a = r.w(0, e.y, 0),
							b = r.w(384, e.y, 0),
							height = (age < 0.07 ? 3 : 1) * r.ppu,
							alpha = (g.settings.flashes === 0 ? 0.4 : 0.8) * (1 - age / 0.4);
						px.blend(ctx, alpha, "add", () => {
							px.rect(
								ctx,
								a[0],
								a[1] - s.tuning.rayWidth * r.ppu,
								b[0] - a[0],
								s.tuning.rayWidth * 2 * r.ppu,
								"#697f6a",
							);
							px.rect(
								ctx,
								a[0],
								a[1] - height / 2,
								b[0] - a[0],
								height,
								"#fff4c7",
							);
						});
					},
					{ emissive: true },
				);
			}
			if (e.type === "collapse" && age < 1.3)
				r.textAt(e.x, e.y - 10 - age * 9, 0, "+" + e.points, "#f6de9f");
			if (e.type === "pulse" && age < 0.65)
				r.decal(() =>
					r.groundRing(e.x, e.y, 15 + age * 150, "#f7d9a2", 1 - age / 0.65),
				);
		}
		for (const p of this.particles) {
			const age = s.time - p.born,
				a = 1 - age / p.life;
			r.actor(
				p.x + p.vx * age,
				p.y + p.vy * age,
				1,
				(ctx, x, y) => {
					px.rect(ctx, x, y, a > 0.5 ? 2 : 1, 1, p.c);
				},
				{ outline: false, rim: false },
			);
		}
		r.overlay((ctx) => {
			// A few fireflies float over the perimeter only.
			for (const a of this.weather) {
				const xx = a.x + Math.sin(time * 0.3 + a.a) * 5,
					yy = a.y + Math.cos(time * 0.4 + a.a) * 5;
				if (xx > 0 && xx < 384 && yy > 0 && yy < 240) continue;
				const q = r.w(xx, yy, 0);
				if (q[0] < 0 || q[0] > r.W || q[1] < 0 || q[1] > r.H) continue;
				if (Math.sin(time * 0.7 + a.a) > 0.3) px.dot(ctx, ...q, "#b2c78b");
			}
		});
		if (hud) this.hud(r, s, { demo, prompt, names });
	}
	leaf(ctx, r, x, y, size, angle, color, time, id) {
		const { px } = this.E,
			k = r.ppu,
			a = angle + Math.sin(time * 0.4 + id) * 0.06,
			p = r.w(x, y, 0),
			cs = Math.cos(a),
			sn = Math.sin(a),
			P = (u, v) => [
				p[0] + (u * cs - v * sn) * k,
				p[1] + (u * sn + v * cs) * k,
			];
		px.poly(
			ctx,
			[
				P(0, 0),
				P(-size * 0.5, -size * 0.6),
				P(-size * 0.2, -size * 1.2),
				P(0, -size * 1.55),
				P(size * 0.4, -size * 0.7),
			],
			"#1d3639",
		);
		px.poly(
			ctx,
			[
				P(0, 0),
				P(-size * 0.3, -size * 0.65),
				P(0, -size * 1.55),
				P(size * 0.32, -size * 0.7),
			],
			color,
		);
		px.line(ctx, ...P(0, 0), ...P(0, -size * 1.3), "#658372");
	}
	flower(ctx, r, x, y, size, C, id, time, small = false) {
		const { px } = this.E,
			k = r.ppu,
			p = r.w(x, y, 0),
			angle = id * 1.73,
			sw = Math.sin(time * 0.7 + id) * 1.3;
		if (!small) {
			this.leaf(ctx, r, x - 3, y + 5, size, angle, C.leaf, time, id);
			this.leaf(
				ctx,
				r,
				x + 3,
				y + 4,
				size * 0.8,
				angle + 2,
				C.leaf,
				time,
				id + 4,
			);
		}
		const rad = size * 0.42 * k;
		for (let i = 0; i < 5; i++) {
			const a = (i * Math.PI * 2) / 5 + angle,
				xx = p[0] + Math.cos(a) * rad,
				yy = p[1] + Math.sin(a) * rad + sw * k;
			px.ell(ctx, xx, yy, rad * 0.95, rad * 0.85, "#69596a");
			px.ell(ctx, xx - 0.5, yy - 1, rad * 0.8, rad * 0.65, C.flower);
			px.dot(ctx, xx - 1, yy - 1, "#f5e2c2");
		}
		px.disc(ctx, p[0], p[1] + sw * k, Math.max(1, rad * 0.55), "#574c3c");
		px.disc(
			ctx,
			p[0] - 0.5,
			p[1] - 1 + sw * k,
			Math.max(1, rad * 0.4),
			"#e5c580",
		);
		if (id % 3 === 0 && !small) {
			px.disc(
				ctx,
				p[0] + rad * 1.3,
				p[1] + rad * 1.2,
				Math.max(1, k),
				"#9dc8b4",
			);
			px.dot(ctx, p[0] + rad * 1.3 - 1, p[1] + rad * 1.2 - 1, "#e9f1d4");
		}
	}
	hud(r, s, { demo, prompt, names }) {
		const { px, font } = this.E,
			W = r.W,
			H = r.H,
			p = this.rect?.portrait,
			score = String(s.score).padStart(6, "0"),
			d = STAGES[s.stage];
		r.overlay((ctx) => {
			px.rect(ctx, 0, 0, W, p ? 73 : 43, "#0c1922");
			px.rect(ctx, 12, p ? 72 : 42, W - 24, 1, "#3b5353");
			font.text(ctx, "TEAM", 16, 8, "#92a6a1", { outline: false });
			font.text(ctx, score, 16, 20, "#f8e4ac", { scale: 2, outline: false });
			const cx = p ? W * 0.58 : W / 2;
			font.text(
				ctx,
				`${String(s.stage + 1).padStart(2, "0")} / 06`,
				cx,
				8,
				"#f1d49c",
				{ align: "center", outline: false },
			);
			if (!p)
				font.text(ctx, d.name, cx, 22, "#d0dfcc", {
					align: "center",
					outline: false,
				});
			s.players.forEach((a, i) => {
				const xx = p ? 16 + i * W * 0.46 : W - 140 + i * 72,
					yy = p ? 53 : 8;
				const c = i ? "#bce6d3" : "#f1d49c";
				font.text(ctx, `P${i + 1}  ${a.bees}/12`, xx, yy, c, {
					outline: false,
				});
				font.text(
					ctx,
					a.bees ? (a.charge ? "RAY READY" : "RAY EMPTY") : "OBSERVER",
					xx,
					yy + 12,
					a.charge ? c : "#829595",
					{ font: "tiny", outline: false },
				);
			});
			const by = H - (p ? 77 : 25);
			px.rect(ctx, 12, by - 7, W - 24, 1, "#334b4c");
			const teaching =
				s.stageTime < 10 ? d.lesson : s.stageTime < 20 ? d.hint : prompt;
			const lines = font.wrap(
				demo ? "DEMO  •  ANY INPUT TO PLAY" : teaching,
				W - 35,
				{ scale: 1 },
			);
			font.text(
				ctx,
				lines.slice(0, p ? 3 : 2).join("\n"),
				W / 2,
				by,
				"#c4d1b9",
				{ align: "center", outline: false },
			);
			if (s.assisted && !demo)
				font.text(ctx, "ASSISTED", W - 17, p ? 81 : 47, "#b6b8a5", {
					align: "right",
					font: "tiny",
					outline: false,
				});
			if (demo)
				font.text(
					ctx,
					"KILLER BEE-YOND MIDNIGHT",
					W / 2,
					p ? 93 : 50,
					"#f8e3ac",
					{ align: "center", outline: false },
				);
		});
	}
}
