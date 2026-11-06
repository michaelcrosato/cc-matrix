/* Turtle Shell Service: original native pixel bodies and miniature hotel scenery. */
(() => {
	"use strict";
	const T = (globalThis.TSS ||= {});
	const E = globalThis.My3D2dge;
	const { px, clamp } = E;
	const INK = "#10252a",
		CREAM = "#fff0cb",
		GOLD = "#ecc17a";
	const DIR = [
		[0, -1],
		[1, 0],
		[0, 1],
		[-1, 0],
	];
	const shade = (c, n) => E.shade(c || "#43816b", n);
	const poly = (g, pts, c) => px.poly(g, pts, c);
	const text = (g, s, x, y, c, o = {}) =>
		E.font.text(g, s, x, y, c, { outline: false, ...o });
	const P = (x, y, s) => [x * s, y * s];

	function symbol(g, value, x, y, s, color = CREAM) {
		const name = String(value || "star").toLowerCase();
		if (name.includes("heart") || name === "♥") {
			poly(
				g,
				[
					[-3, -2],
					[-1, -3],
					[0, -1],
					[1, -3],
					[3, -2],
					[3, 0],
					[0, 3],
					[-3, 0],
				].map(([a, b]) => [x + a * s, y + b * s]),
				color,
			);
		} else if (name.includes("diamond") || name === "◆" || name === "♦") {
			poly(
				g,
				[
					[x, y - 3 * s],
					[x + 3 * s, y],
					[x, y + 3 * s],
					[x - 3 * s, y],
				],
				color,
			);
			px.dot(g, x - s, y - s, CREAM);
		} else if (name === "●" || name === "circle") {
			px.disc(g, x, y, 2.8 * s, color);
			px.dot(g, x - s, y - s, CREAM);
		} else if (
			name.includes("flower") ||
			name.includes("clover") ||
			name === "✿"
		) {
			for (const [a, b] of [
				[-1.5, 0],
				[1.5, 0],
				[0, -1.5],
				[0, 1.5],
			])
				px.disc(g, x + a * s, y + b * s, 1.7 * s, color);
			px.dot(g, x, y, CREAM);
		} else if (name.includes("moon") || name === "☾") {
			px.disc(g, x, y, 3 * s, color);
			px.disc(g, x + 1.8 * s, y - s, 2.6 * s, INK);
		} else if (name.includes("sun") || name === "☀" || name === "circle") {
			px.disc(g, x, y, 2.6 * s, color);
			for (let i = 0; i < 8; i++) {
				const a = (i * Math.PI) / 4;
				px.dot(g, x + Math.cos(a) * 4 * s, y + Math.sin(a) * 4 * s, color);
			}
		} else {
			const pts = [];
			for (let i = 0; i < 10; i++) {
				const a = -Math.PI / 2 + (i * Math.PI) / 5,
					r = (i % 2 ? 1.6 : 3.5) * s;
				pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
			}
			poly(g, pts, color);
		}
	}

	class TurtleRig {
		constructor(seat = 1) {
			this.seat = seat;
			// The engine spring, look interpolation, squash and walk clock are the rig foundation.
			this.spring = new E.Blob({ R: 5, feet: true });
			this.phase = seat * 0.8;
			this.turn = -Math.PI / 2;
			this.state = { dir: 0 };
			this.walk = 0;
			this.skin = E.tones(seat === 2 ? "#91ba83" : "#9bc784");
			this.shell = E.tones(seat === 2 ? "#d99d57" : "#559568");
		}
		update(dt, state, reduce = false) {
			this.state = state;
			const d = DIR[state.dir] || DIR[2];
			this.walk = Math.min(1, Math.hypot(state.vx || 0, state.vy || 0) / 40);
			this.phase +=
				dt * (state.carry ? 10 : 13) * (this.walk > 0.05 ? 1 : 0.14);
			let a = Math.atan2(d[1], d[0]),
				delta = Math.atan2(Math.sin(a - this.turn), Math.cos(a - this.turn));
			this.turn += delta * Math.min(1, dt * 24);
			this.spring.update(dt, {
				walk: this.walk,
				look: d,
				squash: reduce
					? 0
					: Math.sin(this.phase * 2) * this.walk * 0.055 +
						(state.hurt > 0 ? -0.25 : 0),
				squint: state.hurt > 0,
			});
		}
		kick(v = 6) {
			this.spring.kick(v);
		}
		draw(g, x, y, s = 1, room = null, reduce = false) {
			const st = this.state,
				skin = this.skin,
				shell = this.shell;
			const a = this.turn,
				fx = Math.cos(a),
				fy = Math.sin(a),
				sx = -fy,
				sy = fx;
			const hurt = st.hurt > 0,
				retract = hurt ? Math.min(1, st.hurt * 3) : 0;
			const squash = reduce ? 0 : this.spring.sq;
			const bob = reduce
				? 0
				: Math.sin(this.phase * 2) * this.walk * 0.35 - squash * 2;
			y += bob * s;
			const point = (side, forward, h = 0) => [
				x + (side * sx + forward * fx) * s,
				y + (side * sy + forward * fy - h) * s,
			];
			const ellipse = (side, forward, rx, ry, c) => {
				const q = point(side, forward);
				px.ell(g, q[0], q[1], rx * s, ry * s, c);
			};
			// Four separate feet, an honest tail, and a head that withdraws into the shell.
			if (retract < 0.9) {
				const tail = point(0, -6.3 * (1 - retract)),
					l = point(-1.2, -4.5),
					r = point(1.2, -4.5);
				poly(g, [tail, l, r], skin.sh);
				for (const sd of [-1, 1])
					for (const fr of [-1, 1]) {
						const gait = reduce
							? 0
							: Math.sin(this.phase + (sd * fr > 0 ? 0 : Math.PI)) *
								1.15 *
								this.walk;
						ellipse(
							sd * 4.9 * (1 - retract * 0.8),
							fr * 3.2 + gait,
							2.1,
							1.8,
							INK,
						);
						ellipse(
							sd * 4.8 * (1 - retract * 0.8),
							fr * 3.2 + gait - 0.4,
							1.65,
							1.35,
							skin.base,
						);
						const q = point(sd * 5.3, fr * 3.2 + gait - 0.6);
						px.dot(g, q[0], q[1], skin.hi);
					}
				const h = point(0, 6.4 * (1 - retract * 0.65));
				px.disc(g, h[0], h[1], 3.15 * s, INK);
				px.disc(g, h[0] - 0.25 * s, h[1] - 0.45 * s, 2.7 * s, skin.base);
				px.ell(g, h[0] - 0.6 * s, h[1] - s, 1.8 * s, 1.3 * s, skin.lt);
				const blink = (this.spring.t + this.seat * 0.7) % 4.9 > 4.72;
				for (const sd of [-1, 1]) {
					const e = point(sd * 1.3, 7.1 * (1 - retract * 0.6));
					if (blink)
						px.line(
							g,
							e[0] - 0.65 * s,
							e[1],
							e[0] + 0.65 * s,
							e[1],
							INK,
							Math.max(1, s),
						);
					else {
						px.disc(g, e[0], e[1], 1.2 * s, CREAM);
						px.disc(
							g,
							e[0] + fx * 0.35 * s,
							e[1] + fy * 0.35 * s,
							0.65 * s,
							INK,
						);
					}
				}
				const m = point(0, 8.2 * (1 - retract * 0.6));
				px.dot(g, m[0], m[1], skin.sh);
			}
			// Rounded shaded shell with a raised rim and a different pattern for each rescuer.
			const egg = (rx, ry, offY = 0) =>
				Array.from({ length: 24 }, (_, i) => {
					const z = (i * Math.PI) / 12,
						side = Math.cos(z) * rx,
						forward = Math.sin(z) * ry;
					const q = point(side, forward);
					return [q[0], q[1] + offY * s];
				});
			poly(g, egg(5.65, 6.2, 1), INK);
			poly(
				g,
				egg(5.2 * (1 - squash * 0.2), 5.9 * (1 + squash * 0.15), 0.1),
				shell.sh,
			);
			poly(g, egg(4.55, 5.25, -0.6), shell.base);
			poly(
				g,
				[
					point(-3.8, -2.3),
					point(-4.1, 2.2),
					point(-2.5, 4.2),
					point(0, 4.5),
					point(-1.2, 2),
					point(-2.4, -1.6),
				],
				shell.lt,
			);
			if (this.seat === 1) {
				const hex = [
					[-2, -1.4],
					[0, -2.6],
					[2, -1.4],
					[2, 1.2],
					[0, 2.5],
					[-2, 1.2],
				].map(([u, v]) => point(u, v));
				poly(g, hex, shell.sh);
				poly(
					g,
					[
						[-1.3, -0.9],
						[0, -1.8],
						[1.3, -0.9],
						[1.3, 0.8],
						[0, 1.7],
						[-1.3, 0.8],
					].map(([u, v]) => point(u, v)),
					shell.lt,
				);
				for (const [u, v, du, dv] of [
					[-2, -1.4, -4, -2.8],
					[2, -1.4, 4, -2.8],
					[-2, 1.2, -4.2, 2.5],
					[2, 1.2, 4.2, 2.5],
					[0, -2.6, 0, -5],
					[0, 2.5, 0, 5],
				]) {
					const p = point(u, v),
						q = point(du, dv);
					px.line(g, ...p, ...q, shell.sh, Math.max(1, s));
				}
			} else {
				for (const f of [-2.5, 0, 2.5])
					poly(
						g,
						[
							point(-3.7, f - 1),
							point(0, f + 0.7),
							point(3.7, f - 1),
							point(3.5, f + 0.4),
							point(0, f + 2),
							point(-3.5, f + 0.4),
						],
						shell.sh,
					);
				const tag = point(4.1, -3.9);
				px.rect(
					g,
					tag[0] - 1.3 * s,
					tag[1] - 1.6 * s,
					2.6 * s,
					3.2 * s,
					"#70ced1",
				);
				px.dot(g, tag[0], tag[1] - s, CREAM);
				// Blue scarf belongs to P2 in every palette, so seats are readable without color alone.
				const q = point(0, 4.6);
				px.line(
					g,
					q[0] - sx * 3 * s,
					q[1] - sy * 3 * s,
					q[0] + sx * 3 * s,
					q[1] + sy * 3 * s,
					"#7be0da",
					1.4 * s,
				);
			}
			const shine = point(-2.1, 3.4);
			px.rect(g, shine[0], shine[1], 1.5 * s, s, CREAM);
			if (hurt) {
				const q = point(0, 0);
				text(g, "!", q[0], q[1] - 3 * s, CREAM, {
					align: "center",
					scale: Math.max(1, s),
				});
			}
			if (st.carry && room) {
				const t =
					st.action === "pickup"
						? clamp((0.55 - (st.actionTimer || 0)) / 0.55, 0, 1)
						: 1;
				const climb = E.ease.outBack(t),
					forward = -4 * (1 - climb),
					q = point(0, forward, -2.5 * climb);
				baby(
					g,
					q[0],
					q[1],
					s * 0.63,
					this.spring.t,
					room.color || "#d6e89a",
					this.turn,
					reduce,
				);
				if (st.action !== "pickup") {
					const b = point(0, -1.5, 10);
					px.ell(g, b[0], b[1], 3.3 * s, 3.2 * s, INK);
					symbol(g, room.symbol, b[0], b[1], 0.7 * s, room.color || GOLD);
				}
			}
		}
	}

	function baby(
		g,
		x,
		y,
		s,
		t,
		color = "#d7ed9b",
		angle = -Math.PI / 2,
		reduce = false,
	) {
		const f = [Math.cos(angle), Math.sin(angle)],
			v = [-f[1], f[0]],
			b = reduce ? 0 : Math.sin(t * 5) * 0.3 * s;
		y += b;
		for (const sd of [-1, 1])
			for (const z of [-1, 1])
				px.disc(
					g,
					x + (v[0] * sd * 3.1 + f[0] * z * 1.8) * s,
					y + (v[1] * sd * 3.1 + f[1] * z * 1.8) * s,
					1.1 * s,
					"#a9d68d",
				);
		px.disc(g, x + f[0] * 4 * s, y + f[1] * 4 * s, 2.5 * s, INK);
		px.disc(
			g,
			x + f[0] * 4 * s - 0.3 * s,
			y + f[1] * 4 * s - 0.5 * s,
			2 * s,
			"#c5e7a1",
		);
		for (const sd of [-1, 1]) {
			const ex = x + (f[0] * 4.5 + v[0] * sd * 0.9) * s,
				ey = y + (f[1] * 4.5 + v[1] * sd * 0.9) * s;
			px.disc(g, ex, ey, 0.85 * s, CREAM);
			px.dot(g, ex + f[0] * 0.3 * s, ey + f[1] * 0.3 * s, INK);
		}
		px.ell(g, x, y, 3.6 * s, 3.8 * s, INK);
		px.ell(g, x - 0.2 * s, y - 0.5 * s, 3 * s, 3.1 * s, shade(color, -0.15));
		px.ell(g, x - 0.8 * s, y - 1.2 * s, 2 * s, 1.9 * s, color);
		px.line(
			g,
			x - 1.5 * s,
			y,
			x + 1.5 * s,
			y,
			shade(color, -0.4),
			Math.max(1, s),
		);
		px.line(
			g,
			x,
			y - 1.5 * s,
			x,
			y + 1.8 * s,
			shade(color, -0.4),
			Math.max(1, s),
		);
		px.dot(g, x - s, y - 2 * s, CREAM);
	}

	class BeetleRig {
		constructor() {
			this.spring = new E.Blob({ R: 4 });
			this.state = { dir: 2, state: "blue" };
			this.phase = 0;
			this.angle = 0;
		}
		update(dt, st, reduce = false) {
			this.state = st;
			this.phase +=
				dt * (st.state === "red" ? 19 : st.state === "yellow" ? 15 : 11);
			const d = DIR[st.dir] || DIR[2],
				target = Math.atan2(d[1], d[0]);
			this.angle +=
				Math.atan2(
					Math.sin(target - this.angle),
					Math.cos(target - this.angle),
				) * Math.min(1, dt * 16);
			this.spring.update(dt, {
				look: d,
				walk: st.state === "stunned" ? 0 : 1,
				squash: reduce ? 0 : Math.sin(this.phase) * 0.04,
			});
		}
		draw(g, x, y, s, reduce = false) {
			const st = this.state,
				stun = st.state === "stunned",
				warn = st.warn > 0,
				red = st.state === "red",
				yellow = st.state === "yellow";
			const c = E.tones(
				stun ? "#91a8b8" : red ? "#e56769" : yellow ? "#f2c65c" : "#68a8d2",
			);
			const f = [Math.cos(this.angle), Math.sin(this.angle)],
				v = [-f[1], f[0]],
				q = (side, forward) => [
					x + (v[0] * side + f[0] * forward) * s,
					y + (v[1] * side + f[1] * forward) * s,
				];
			const wobble = stun && !reduce ? Math.sin(this.phase * 1.3) * 0.6 : 0;
			y += wobble * s;
			for (const sd of [-1, 1])
				for (const fr of [-1, 0, 1]) {
					const swing = stun ? 0 : Math.sin(this.phase + fr * 1.1 + sd) * 1.1,
						a = q(sd * 3, fr * 2),
						b = q(sd * 5.3, fr * 2 + swing),
						tip = q(sd * 5.8, fr * 2 + 1.3 + swing);
					px.line(g, ...a, ...b, INK, Math.max(1, 1.3 * s));
					px.line(g, ...b, ...tip, stun ? c.sh : c.lt, Math.max(1, s));
				}
			const head = q(0, 4);
			px.disc(g, ...head, 2.7 * s, INK);
			px.disc(g, head[0] - 0.2 * s, head[1] - 0.3 * s, 2.2 * s, c.sh);
			for (const sd of [-1, 1]) {
				const a = q(sd * 1, 5),
					b = q(sd * (yellow || red ? 2 : 2.8), yellow || red ? 8 : 6.4);
				px.line(g, ...a, ...b, c.lt, Math.max(1, s));
				px.disc(g, ...b, 0.8 * s, c.lt);
			}
			const egg = (rx, ry) =>
				Array.from({ length: 20 }, (_, i) => {
					const a = (i * Math.PI) / 10;
					return q(Math.cos(a) * rx, Math.sin(a) * ry);
				});
			poly(g, egg(4.5, 4.8), INK);
			poly(g, egg(3.8, 4.2), c.base);
			const p = q(-1.4, 1.5);
			px.ell(g, ...p, 2.2 * s, 2.7 * s, c.lt);
			const a = q(0, -4),
				b = q(0, 3.6);
			px.line(g, ...a, ...b, c.sh, Math.max(1, s));
			if (red) {
				for (const fr of [-1.6, 1.2])
					poly(
						g,
						[
							q(-2.6, fr - 1.2),
							q(0, fr + 0.5),
							q(2.6, fr - 1.2),
							q(1.6, fr + 0.7),
							q(0, fr + 1.7),
							q(-1.6, fr + 0.7),
						],
						c.deep,
					);
			} else if (yellow) {
				for (const sd of [-1, 1]) {
					const q0 = q(sd * 2, 0);
					px.rect(g, q0[0] - 0.7 * s, q0[1] - 1.5 * s, 1.4 * s, 3 * s, c.sh);
				}
			} else {
				for (const sd of [-1, 1]) {
					const z = q(sd * 1.9, -0.5);
					px.disc(g, ...z, 1 * s, c.sh);
				}
			}
			for (const sd of [-1, 1]) {
				const e = q(sd * 1.1, 4.7);
				if (stun) {
					px.line(
						g,
						e[0] - 0.6 * s,
						e[1] - 0.6 * s,
						e[0] + 0.6 * s,
						e[1] + 0.6 * s,
						CREAM,
						Math.max(1, s),
					);
				} else {
					px.disc(g, ...e, 0.95 * s, CREAM);
					px.dot(g, e[0] + f[0] * 0.3 * s, e[1] + f[1] * 0.3 * s, INK);
				}
			}
			if (stun) {
				for (let i = 0; i < 3; i++) {
					const a = (reduce ? 0 : this.spring.t * 2.3) + (i * Math.PI * 2) / 3;
					symbol(
						g,
						"star",
						x + Math.cos(a) * 6 * s,
						y - 4 * s + Math.sin(a) * 2.5 * s,
						0.45 * s,
						GOLD,
					);
				}
				if (st.stun < 0.75 && !reduce) {
					px.line(
						g,
						x - 3 * s,
						y + 6 * s,
						x + 3 * s,
						y + 6 * s,
						CREAM,
						Math.max(1, s),
					);
				}
			}
			if ((warn || st.alert > 0) && !stun) {
				text(g, "!", x, y - 9 * s, GOLD, {
					align: "center",
					scale: Math.max(1, s),
				});
			}
		}
	}

	class Art {
		constructor(game) {
			this.game = game;
			this.time = 0;
			this.floor = -1;
			this.run = "";
			this.rigs = new Map();
			this.beetles = new Map();
			this.effects = [];
			this.seen = new Set();
			this.map = null;
			this.reduced = false;
			this.lastState = null;
		}
		configure(floor) {
			const content = T.FLOORS?.[floor];
			if (!content) return;
			this.floor = floor;
			this.content = content;
			const p = content.palette || {};
			const floorA = E.hex(p.floor || "#274445"),
				floorB = E.hex(p.floor2 || "#2b4a47");
			const mortar = E.hex(shade(p.floor || "#274445", -0.16));
			const rows = content.rows;
			const wallpaper = "tss-hotel-" + floor;
			E.MATERIALS[wallpaper] = {
				color: p.top || p.wall || "#8b7860",
				roof: (wx, wy, tt) => {
					const lx = ((Math.floor(wx) % 12) + 12) % 12,
						ly = ((Math.floor(wy) % 12) + 12) % 12;
					const diamond = Math.abs(lx - 6) + Math.abs(ly - 6);
					if (diamond === 2) return tt.sh;
					if (lx === 6 && ly === 5) return tt.lt;
					return E.hash2(Math.floor(wx), Math.floor(wy)) > 0.97 ? tt.lt : null;
				},
			};
			this.map = new E.TileMap({
				rows,
				legend: { "#": 1 },
				types: {
					1: {
						h: 5,
						top: p.top || p.wall || "#8b7860",
						side: shade(p.wall || "#8b7860", -0.3),
						line: shade(p.wall || "#8b7860", -0.38),
						roof:
							floor === 2 || floor === 4
								? "leaves"
								: floor === 1
									? "slab"
									: wallpaper,
						face: "plaster",
					},
				},
				outside: false,
				ao: 2,
				floorTex: (x, y) => {
					const ix = Math.floor(x),
						iy = Math.floor(y),
						cx = Math.floor(ix / 16),
						cy = Math.floor(iy / 16),
						lx = ((ix % 16) + 16) % 16,
						ly = ((iy % 16) + 16) % 16;
					if (lx === 0 || ly === 0) return mortar;
					const c = (cx + cy) % 2 ? floorA : floorB,
						n = (E.hash2(ix, iy) - 0.5) * 5;
					return c.map((v) => v + n);
				},
			});
			this.grid = E.Grid.from(this.map);
			this.effects = [];
			this.rigs.clear();
			this.beetles.clear();
		}
		update(dt, source, events = [], opts = {}) {
			const state = source?.state || source;
			if (!state) return;
			this.lastState = state;
			this.time += dt;
			this.reduced = !!opts.reducedMotion;
			if (this.floor !== state.floor || this.run !== state.runId) {
				this.configure(state.floor);
				this.run = state.runId;
				this.seen.clear();
			}
			for (const st of state.players || []) {
				if (!this.rigs.has(st.id)) this.rigs.set(st.id, new TurtleRig(st.seat));
				this.rigs.get(st.id).update(dt, st, this.reduced);
			}
			for (const st of state.enemies || []) {
				if (!this.beetles.has(st.id)) this.beetles.set(st.id, new BeetleRig());
				this.beetles.get(st.id).update(dt, st, this.reduced);
			}
			this.effects = this.effects.filter((e) => (e.life -= dt) > 0);
			for (const ev of events) {
				if (ev.floor !== undefined && ev.floor !== state.floor) continue;
				if (this.seen.has(ev.id)) continue;
				this.seen.add(ev.id);
				if (this.seen.size > 400)
					this.seen.delete(this.seen.values().next().value);
				if (ev.kind === "floor") continue;
				const p = state.players?.find((p) => p.seat === ev.seat),
					x = ev.x ?? p?.x ?? 168,
					y = ev.y ?? p?.y ?? 104;
				if (
					ev.kind === "pickup" ||
					ev.kind === "deliver" ||
					ev.kind === "hit" ||
					ev.kind === "bomb"
				)
					this.rigs.get(p?.id)?.kick(ev.kind === "hit" ? -7 : 6);
				const color =
					ev.kind === "hit"
						? "#ff9a93"
						: ev.kind === "stun" || ev.kind === "trigger"
							? "#a4dfef"
							: ev.kind === "supply"
								? "#8ee0b1"
								: GOLD;
				if (
					[
						"pickup",
						"deliver",
						"stun",
						"trigger",
						"supply",
						"hit",
						"clear",
						"empty",
					].includes(ev.kind)
				) {
					this.effects.push({
						...ev,
						x,
						y,
						color,
						life: ev.kind === "deliver" ? 1.3 : 0.65,
						max: ev.kind === "deliver" ? 1.3 : 0.65,
					});
					if (!this.reduced && this.game.particles) {
						this.game.particles.glints(
							x,
							y,
							4,
							ev.kind === "deliver" ? 10 : 4,
							color,
						);
						this.game.particles.ring(
							x,
							y,
							3,
							ev.kind === "deliver" ? 16 : 10,
							color,
							0.4,
						);
					}
				}
				if (ev.points && this.game.particles)
					this.game.particles.text(x, y, 8, "+" + ev.points, color, {
						scale: 1,
						bounce: !this.reduced,
					});
			}
		}
		draw(r, source, opts = {}) {
			const state = source?.state || source || this.lastState;
			if (!state) return;
			if (this.floor !== state.floor) this.configure(state.floor);
			if (!this.map) return;
			const p = this.content.palette || {},
				t = this.time,
				sc = r.view.scale || 1,
				reduce = opts.reducedMotion ?? this.reduced;
			r.sky([
				p.bg || "#102a30",
				p.bg || "#102a30",
				shade(p.bg || "#102a30", -0.12),
			]);
			// A raised miniature hotel rests in the surrounding night. Its rim never changes collision.
			{
				const g = r.ctx;
				const [x, y] = r.w(0, 0),
					w = 21 * 16 * sc,
					h = 13 * 16 * sc;
				px.rect(g, x - 7 * sc, y - 5 * sc, w + 14 * sc, h + 15 * sc, "#0a1d22");
				px.rect(
					g,
					x - 4 * sc,
					y - 4 * sc,
					w + 8 * sc,
					h + 9 * sc,
					shade(p.trim || GOLD, -0.5),
				);
				px.rect(
					g,
					x - 2 * sc,
					y - 2 * sc,
					w + 4 * sc,
					h + 4 * sc,
					p.trim || GOLD,
				);
				px.rect(g, x, y, w, h, p.floor || "#274445");
			}
			this.map.drawFloor(r);
			// Carpet seams and moulding run along the real corridor boundaries.
			r.decal((g) => {
				const rows = this.content.rows,
					wall = (x, y) => rows[y]?.[x] === "#";
				for (let cy = 0; cy < rows.length; cy++)
					for (let cx = 0; cx < rows[cy].length; cx++) {
						const [x, y] = r.w(cx * 16, cy * 16),
							z = 16 * sc;
						if (wall(cx, cy)) continue;
						const hi = shade(p.floor || "#274445", 0.24),
							lo = shade(p.floor || "#274445", -0.18);
						if (wall(cx - 1, cy))
							px.rect(g, x + 1 * sc, y + sc, sc, z - 2 * sc, hi);
						if (wall(cx, cy - 1))
							px.rect(g, x + sc, y + sc, z - 2 * sc, sc, hi);
						if (wall(cx + 1, cy))
							px.rect(g, x + 14 * sc, y + sc, sc, z - 2 * sc, lo);
						if (wall(cx, cy + 1))
							px.rect(g, x + sc, y + 14 * sc, z - 2 * sc, sc, lo);
						if ((cx + cy) % 4 === 0) {
							const [a, b] = r.w(cx * 16 + 8, cy * 16 + 8);
							px.dot(g, a, b, shade(p.floor || "#274445", 0.1));
						}
					}
			});
			this.map.queueWalls(r);
			this.drawSurroundings(r, state, p, reduce);
			// Wall-top ornaments are deliberately confined to blocked cells.
			for (const decoration of this.content.decorations || [])
				this.drawDecoration(r, decoration, p);
			for (const home of state.homes || [])
				this.drawHome(r, home, state, reduce);
			if (state.supply) this.drawSupply(r, state.supply, state, reduce);
			for (let i = 0; i < (state.rooms || []).length; i++)
				this.drawRoom(r, state.rooms[i], i, state, reduce);
			if (state.bomb) this.drawBomb(r, state.bomb, reduce);
			for (const enemy of state.enemies || []) {
				const rig = this.beetles.get(enemy.id);
				if (!rig) continue;
				r.shadow(enemy.x, enemy.y, 4.8, 0.4, INK);
				if (enemy.emerge > 0) {
					const u = clamp(1 - enemy.emerge / 0.9, 0.1, 1);
					r.actor(
						enemy.x,
						enemy.y,
						0,
						(g, x, y) => {
							px.ell(g, x, y, 5 * sc, 3 * sc, INK);
							rig.draw(g, x, y, sc * u, reduce);
						},
						{ outline: false, rim: false },
					);
				} else
					r.actor(
						enemy.x,
						enemy.y,
						0,
						(g, x, y) => rig.draw(g, x, y, sc, reduce),
						{ outline: false, rim: false },
					);
				if (enemy.state === "red" && this.game.lights)
					this.game.lights.add(enemy.x, enemy.y, 4, 18, 0.18, {
						color: "#f17a75",
					});
				if (
					enemy.alert > 0 &&
					enemy.target &&
					(enemy.state === "yellow" || opts.los)
				) {
					const target = state.players.find((p) => p.seat === enemy.target);
					if (target && this.map.los(enemy.x, enemy.y, target.x, target.y))
						r.decal((g) => {
							const a = r.w(enemy.x, enemy.y),
								b = r.w(target.x, target.y);
							px.line(g, ...a, ...b, "#edbd61", Math.max(1, sc));
						});
				}
			}
			for (const player of state.players || []) {
				if (!player.active) continue;
				const rig = this.rigs.get(player.id);
				if (!rig) continue;
				const room = state.rooms?.find((q) => q.id === player.carry),
					inv = player.invulnerable > 0;
				r.shadow(player.x, player.y, 5.7, 0.55, INK);
				if (inv)
					r.decal((g) => {
						const [x, y] = r.w(player.x, player.y);
						px.ell(g, x, y, 8 * sc, 8 * sc, shade("#72d9d3", -0.55));
					});
				r.actor(
					player.x,
					player.y,
					0,
					(g, x, y) => rig.draw(g, x, y, sc, room, reduce),
					{
						outline: false,
						rim: false,
						alpha: inv && !reduce ? 0.75 + 0.25 * Math.sin(t * 12) : 1,
					},
				);
				if (this.game.lights)
					this.game.lights.add(player.x, player.y, 6, 22, 0.15, {
						color: "#c6ecc4",
					});
			}
			this.drawEffects(r, state, reduce);
			const inspect = {
				...opts,
				graph: opts.graph || state.dev?.overlays,
				los: opts.los || state.dev?.overlays,
				collision: opts.collision || state.dev?.overlays,
				reveal: opts.reveal || state.dev?.reveal,
			};
			if (
				inspect.graph ||
				inspect.los ||
				inspect.collision ||
				inspect.reveal ||
				inspect.debug
			)
				this.drawDebug(r, state, inspect, source?.grid || this.grid);
			if (state.phase === "celebrate" || state.phase === "won")
				this.drawCelebration(r, state, reduce);
		}
		drawRoom(r, room, index, state, reduce) {
			const sc = r.view.scale || 1,
				t = this.time;
			if (room.delivered || room.carrier) return;
			if (room.revealed && room.outcome === "beetle") {
				r.actor(
					room.x,
					room.y,
					0,
					(g, x, y) => {
						px.rect(g, x - 5 * sc, y - 5 * sc, 10 * sc, 10 * sc, "#1b3337");
						px.line(
							g,
							x - 4 * sc,
							y + 4 * sc,
							x + 4 * sc,
							y - 4 * sc,
							"#526e68",
							sc,
						);
					},
					{ outline: false, rim: false },
				);
				return;
			}
			r.actor(
				room.x,
				room.y,
				0,
				(g, x, y) => {
					if (room.revealed) {
						px.ell(g, x, y, 7 * sc, 6 * sc, "#234c43");
						baby(
							g,
							x,
							y,
							sc * 0.9,
							t,
							room.color || "#d5e99e",
							-Math.PI / 2,
							reduce,
						);
						return;
					}
					const bob = reduce ? 0 : Math.sin(t * 2.5 + index) * 0.35 * sc;
					px.rect(g, x - 6 * sc, y - 7 * sc, 12 * sc, 14 * sc, INK);
					px.rect(g, x - 5 * sc, y - 6 * sc, 10 * sc, 12 * sc, "#deb77f");
					px.rect(g, x - 4 * sc, y - 5 * sc, 8 * sc, 10 * sc, "#805d49");
					px.rect(g, x - 3 * sc, y - 4 * sc, 6 * sc, 8 * sc, "#a87d57");
					px.rect(g, x - 4 * sc, y - 5 * sc, 7 * sc, sc, "#f7dfac");
					text(g, "?", x, y - 4 * sc + bob, CREAM, {
						align: "center",
						scale: Math.max(1, sc),
					});
					px.dot(g, x + 3 * sc, y + 2 * sc, GOLD);
					px.rect(g, x - 5 * sc, y + 6 * sc, 10 * sc, sc, "#f2d797");
				},
				{ outline: false, rim: false },
			);
		}
		drawSurroundings(r, state, p, reduce) {
			const sc = r.view.scale || 1;
			const left = r.w(-26, 104),
				right = r.w(362, 104);
			if (left[0] > 17 * sc) {
				r.actor(
					-26,
					104,
					0,
					(g, x, y) => {
						// A little brass lift outside the cutaway gives every playable floor a hotel address.
						px.rect(g, x - 12 * sc, y - 31 * sc, 24 * sc, 60 * sc, "#0b2328");
						px.rect(g, x - 10 * sc, y - 29 * sc, 20 * sc, 55 * sc, "#8b8263");
						px.rect(g, x - 8 * sc, y - 22 * sc, 16 * sc, 45 * sc, "#466760");
						px.rect(g, x - 7 * sc, y - 21 * sc, 6 * sc, 42 * sc, "#718674");
						px.rect(g, x + sc, y - 21 * sc, 6 * sc, 42 * sc, "#5b7569");
						px.rect(g, x - sc, y - 21 * sc, 2 * sc, 42 * sc, "#c4b37c");
						px.rect(g, x - 5 * sc, y + sc, sc, 5 * sc, GOLD);
						px.rect(g, x + 4 * sc, y + sc, sc, 5 * sc, GOLD);
						px.rect(g, x - 8 * sc, y - 28 * sc, 16 * sc, 5 * sc, "#213e3f");
						for (let i = 0; i < 5; i++)
							px.rect(
								g,
								x + (-6 + i * 2.7) * sc,
								y - 26.5 * sc,
								1.5 * sc,
								2 * sc,
								i === state.floor ? "#ffe5a7" : "#657e67",
							);
						text(g, String(state.floor + 1), x, y - 16 * sc, CREAM, {
							align: "center",
							scale: Math.max(1, sc),
						});
						px.rect(g, x - 14 * sc, y + 24 * sc, 28 * sc, 3 * sc, "#c5ad7e");
						px.rect(g, x - 12 * sc, y + 28 * sc, 24 * sc, 7 * sc, "#385e57");
						px.rect(g, x - 10 * sc, y + 30 * sc, 20 * sc, 3 * sc, "#86a586");
					},
					{ outline: false, rim: false },
				);
				r.actor(
					-26,
					39,
					0,
					(g, x, y) => {
						px.rect(g, x - 5 * sc, y + 2 * sc, 10 * sc, 8 * sc, "#b6905e");
						px.ell(g, x, y - 2 * sc, 9 * sc, 9 * sc, "#345e49");
						px.ell(g, x - 2 * sc, y - 4 * sc, 6 * sc, 7 * sc, "#82a36f");
						px.ell(g, x - 3 * sc, y - 6 * sc, 3 * sc, 4 * sc, "#b5c18c");
					},
					{ outline: false, rim: false },
				);
			}
			if (right[0] < r.W - 17 * sc) {
				r.actor(
					362,
					72,
					0,
					(g, x, y) => {
						// Tall arched windows and brass sconces occupy the nonplayable service wing.
						px.rect(g, x - 9 * sc, y - 27 * sc, 18 * sc, 51 * sc, "#526d60");
						px.ell(g, x, y - 26 * sc, 9 * sc, 8 * sc, "#526d60");
						px.rect(g, x - 7 * sc, y - 26 * sc, 14 * sc, 47 * sc, "#90a78a");
						px.ell(g, x, y - 26 * sc, 7 * sc, 6 * sc, "#b9c69b");
						px.rect(g, x - 5 * sc, y - 25 * sc, 10 * sc, 43 * sc, "#4f827e");
						px.rect(g, x - 4 * sc, y - 24 * sc, 4 * sc, 40 * sc, "#7baba0");
						px.rect(g, x - sc, y - 26 * sc, 2 * sc, 45 * sc, "#dac997");
						for (const yy of [-12, 2, 16])
							px.rect(g, x - 6 * sc, y + yy * sc, 12 * sc, sc, "#dac997");
						px.rect(g, x - 11 * sc, y + 21 * sc, 22 * sc, 3 * sc, "#c0b48c");
					},
					{ outline: false, rim: false },
				);
				r.actor(
					362,
					162,
					0,
					(g, x, y) => {
						px.rect(g, x - 9 * sc, y + 4 * sc, 18 * sc, 5 * sc, "#947b58");
						px.rect(g, x - 10 * sc, y + 2 * sc, 20 * sc, 3 * sc, "#d1b984");
						for (let i = 0; i < 3; i++) {
							const xx = x + (i - 1) * 6 * sc,
								yy =
									y + (reduce ? 0 : Math.sin(this.time * 0.8 + i)) * 0.3 * sc;
							px.line(g, xx, yy + 3 * sc, xx, yy - 7 * sc, "#668966", sc);
							px.ell(g, xx - 2 * sc, yy - 2 * sc, 3 * sc, 1.5 * sc, "#81a173");
							px.ell(g, xx + 2 * sc, yy - 5 * sc, 3 * sc, 1.5 * sc, "#9ebc87");
							px.disc(g, xx, yy - 8 * sc, 2.5 * sc, p.accent || GOLD);
							px.dot(g, xx, yy - 9 * sc, CREAM);
						}
					},
					{ outline: false, rim: false },
				);
			}
		}
		drawHome(r, home, state, reduce) {
			const sc = r.view.scale || 1,
				reserved = home.reservedBy != null,
				active = reserved || home.welcoming > 0,
				player = state.players?.find((q) => q.seat === home.reservedBy),
				room = state.rooms?.find((q) => q.id === player?.carry),
				color = room?.color || home.color || GOLD;
			const sign = room?.symbol || home.symbol;
			if (active && this.game.lights)
				this.game.lights.add(home.x, home.y, 5, 30, 0.65, { color });
			r.actor(
				home.x,
				home.y,
				0,
				(g, x, y) => {
					if (active) {
						px.ell(g, x, y, 8 * sc, 8 * sc, shade(color, -0.55));
						px.ell(g, x, y, 6.3 * sc, 6.3 * sc, shade(color, -0.3));
					}
					px.rect(g, x - 6 * sc, y - 5 * sc, 12 * sc, 11 * sc, INK);
					px.rect(
						g,
						x - 5 * sc,
						y - 5 * sc,
						10 * sc,
						10 * sc,
						active ? "#ffe2a5" : "#9c9277",
					);
					px.rect(
						g,
						x - 3 * sc,
						y - 3 * sc,
						6 * sc,
						8 * sc,
						active ? "#ffc97f" : "#394f48",
					);
					poly(
						g,
						[
							[x - 7 * sc, y - 5 * sc],
							[x, y - 10 * sc],
							[x + 7 * sc, y - 5 * sc],
						],
						active ? color : "#6c8871",
					);
					px.line(
						g,
						x - 6 * sc,
						y - 5 * sc,
						x,
						y - 9 * sc,
						active ? CREAM : "#91a48b",
						Math.max(1, sc),
					);
					symbol(
						g,
						sign,
						x,
						y - 1 * sc,
						0.8 * sc,
						active ? shade(color, -0.58) : "#aeb69b",
					);
					px.rect(
						g,
						x - 6 * sc,
						y + 6 * sc,
						12 * sc,
						sc,
						active ? CREAM : "#647866",
					);
					if (reserved) {
						const bob = reduce ? 0 : Math.sin(this.time * 4) * 1.1;
						poly(
							g,
							[
								[x - 2 * sc, y + (9 + bob) * sc],
								[x + 2 * sc, y + (9 + bob) * sc],
								[x, y + (6 + bob) * sc],
							],
							color,
						);
					}
				},
				{ outline: false, rim: false },
			);
		}
		drawSupply(r, supply, state, reduce) {
			const sc = r.view.scale || 1,
				ready = supply.ready,
				t = this.time;
			if (ready && this.game.lights)
				this.game.lights.add(supply.x, supply.y, 6, 27, 0.4, {
					color: "#aee8d0",
				});
			r.actor(
				supply.x,
				supply.y,
				0,
				(g, x, y) => {
					px.ell(g, x, y + 3 * sc, 8 * sc, 4.8 * sc, "#102e30");
					px.rect(g, x - 7 * sc, y - 5 * sc, 14 * sc, 10 * sc, INK);
					px.rect(g, x - 6 * sc, y - 4 * sc, 12 * sc, 8 * sc, "#789c89");
					px.rect(g, x - 5 * sc, y - 5 * sc, 10 * sc, 2 * sc, GOLD);
					px.rect(
						g,
						x - 3 * sc,
						y - 3 * sc,
						6 * sc,
						6 * sc,
						ready ? "#b7e7b7" : "#4d7465",
					);
					px.rect(
						g,
						x - sc,
						y - 2 * sc,
						2 * sc,
						4 * sc,
						ready ? CREAM : "#7e9d80",
					);
					px.rect(
						g,
						x - 2 * sc,
						y - sc,
						4 * sc,
						2 * sc,
						ready ? CREAM : "#7e9d80",
					);
					for (const sd of [-1, 1]) {
						px.rect(
							g,
							x + sd * 5 * sc - sc * 0.5,
							y - 2 * sc,
							sc,
							4 * sc,
							ready ? "#88e5b0" : "#547365",
						);
					}
					if (!ready) {
						const ratio = clamp(1 - (supply.cooldown || 0) / 6, 0, 1);
						px.rect(g, x - 5 * sc, y + 5 * sc, 10 * sc, sc, "#1d4440");
						px.rect(g, x - 5 * sc, y + 5 * sc, 10 * sc * ratio, sc, GOLD);
					} else if (!reduce && Math.sin(t * 3) > 0.6) {
						const sx = x + 6 * sc,
							sy = y - 6 * sc;
						px.line(g, sx - 2 * sc, sy, sx + 2 * sc, sy, CREAM, sc);
						px.line(g, sx, sy - 2 * sc, sx, sy + 2 * sc, CREAM, sc);
					}
				},
				{ outline: false, rim: false },
			);
		}
		drawBomb(r, bomb, reduce) {
			const sc = r.view.scale || 1;
			r.decal((g) => {
				const [x, y] = r.w(bomb.x, bomb.y),
					rad = (bomb.radius || 25) * sc;
				for (let i = 0; i < 28; i++) {
					const a = (i * Math.PI) / 14;
					px.dot(g, x + Math.cos(a) * rad, y + Math.sin(a) * rad, "#477c79");
				}
			});
			r.actor(
				bomb.x,
				bomb.y,
				0,
				(g, x, y) => {
					const pulse = reduce ? 0 : Math.sin(this.time * 8) * 0.5;
					px.ell(g, x, y + 2 * sc, 5 * sc, 3 * sc, INK);
					px.disc(g, x, y, 4.5 * sc, INK);
					px.disc(g, x - 0.3 * sc, y - 0.7 * sc, 3.6 * sc, "#a9d0c2");
					px.disc(g, x - sc, y - 1.5 * sc, 2 * sc, "#e4ebbc");
					px.rect(g, x - sc, y - 5 * sc, 2 * sc, 2 * sc, "#678c7c");
					px.disc(g, x, y - 5.5 * sc, (1 + pulse) * sc, "#f7c56f");
					symbol(g, "flower", x, y, 0.5 * sc, "#326054");
				},
				{ outline: false, rim: false },
			);
		}
		drawDecoration(r, d, p) {
			let c = d.cell || [d.cx || 0, d.cy || 0];
			if (this.content.rows[c[1]]?.[c[0]] !== "#") {
				const shifts = [
					[0, 1],
					[0, -1],
					[1, 0],
					[-1, 0],
					[1, 1],
					[-1, 1],
					[1, -1],
					[-1, -1],
				];
				const moved = shifts
					.map(([dx, dy]) => [c[0] + dx, c[1] + dy])
					.find(
						([cx, cy]) =>
							cx > 0 &&
							cx < 20 &&
							cy > 0 &&
							cy < 12 &&
							this.content.rows[cy]?.[cx] === "#",
					);
				if (!moved) return;
				c = moved;
			}
			const x = (c[0] + 0.5) * 16,
				y = (c[1] + 0.5) * 16,
				sc = r.view.scale || 1,
				k = d.kind || "plant";
			// Native shape library supplies ordinary furniture; bespoke stage dressing stays pixel-native.
			if (
				[
					"bench",
					"chair",
					"bookcase",
					"shelf",
					"table",
					"stool",
					"crate",
					"chest",
				].includes(k)
			) {
				r.shape(k, x, y, 5, {
					scale: 0.32,
					mats: { w: "walnut" },
					shadow: false,
					hides: false,
				});
				return;
			}
			r.actor(
				x,
				y,
				5,
				(g, sx, sy) => {
					const color = d.color || p.plant || "#77a36e";
					if (/plant|flower|bush|fern|palm/.test(k)) {
						px.ell(g, sx, sy + 3 * sc, 4 * sc, 2.5 * sc, "#523e34");
						px.rect(g, sx - 3 * sc, sy, 6 * sc, 4 * sc, "#c99562");
						px.rect(g, sx - 4 * sc, sy, 8 * sc, sc, "#e5b97e");
						for (let i = 0; i < 5; i++) {
							const a = i * 2.399,
								ex = sx + Math.cos(a) * 4.7 * sc,
								ey = sy - 2 * sc + Math.sin(a) * 3.4 * sc;
							px.line(g, sx, sy, ex, ey, "#405c45", sc);
							px.ell(
								g,
								ex,
								ey,
								2.9 * sc,
								1.8 * sc,
								shade(color, i % 2 ? 0.18 : -0.1),
							);
						}
						if (k === "flower")
							for (const i of [0, 2, 4]) {
								const a = i * 2.399;
								px.disc(
									g,
									sx + Math.cos(a) * 4 * sc,
									sy - 2 * sc + Math.sin(a) * 3 * sc,
									1.4 * sc,
									p.accent || "#e5a68c",
								);
							}
					} else if (/laundry|washer|machine/.test(k)) {
						px.rect(g, sx - 6 * sc, sy - 6 * sc, 12 * sc, 12 * sc, "#d1d5bd");
						px.rect(g, sx - 5 * sc, sy - 5 * sc, 10 * sc, 2 * sc, "#f2e4bf");
						px.disc(g, sx, sy + sc, 4 * sc, "#486f76");
						px.disc(g, sx - sc, sy, 2.7 * sc, "#9bc1c1");
						px.dot(g, sx + 4 * sc, sy - 4 * sc, "#d28564");
					} else if (/towel|linen/.test(k)) {
						for (let i = 0; i < 3; i++) {
							px.rect(
								g,
								sx - 5 * sc,
								sy + (i * 2 - 3) * sc,
								10 * sc,
								2 * sc,
								i % 2 ? "#dba894" : "#e9d9b4",
							);
							px.rect(
								g,
								sx - 4 * sc,
								sy + (i * 2 - 3) * sc,
								8 * sc,
								sc,
								"#fff1cf",
							);
						}
					} else if (/luggage|case|bag/.test(k)) {
						px.rect(g, sx - 5 * sc, sy - 4 * sc, 10 * sc, 9 * sc, "#786048");
						px.rect(g, sx - 4 * sc, sy - 4 * sc, 8 * sc, 7 * sc, "#c9855f");
						px.rect(g, sx - 3 * sc, sy - 4 * sc, sc, 7 * sc, "#e3bb7f");
						px.rect(g, sx + 2 * sc, sy - 4 * sc, sc, 7 * sc, "#e3bb7f");
						px.rect(g, sx - 2 * sc, sy - 6 * sc, 4 * sc, 2 * sc, "#91754e");
					} else if (/bell|desk|reception/.test(k)) {
						px.rect(g, sx - 7 * sc, sy + sc, 14 * sc, 5 * sc, "#885f45");
						px.rect(g, sx - 7 * sc, sy, 14 * sc, 2 * sc, "#d4ae78");
						px.ell(g, sx, sy - sc, 4 * sc, 3 * sc, "#d49e52");
						px.ell(g, sx - sc, sy - 2 * sc, 2.8 * sc, 1.8 * sc, "#ffe1a1");
						px.rect(g, sx - 0.5 * sc, sy - 5 * sc, sc, 2 * sc, GOLD);
					} else if (/fountain|pond/.test(k)) {
						px.ell(g, sx, sy, 6.5 * sc, 5.5 * sc, "#b9b697");
						px.ell(g, sx, sy, 5 * sc, 4 * sc, "#65a4a2");
						px.ell(g, sx, sy, 3 * sc, 2.5 * sc, "#a7d5c3");
						px.disc(g, sx, sy - 2 * sc, 2 * sc, CREAM);
					} else if (/light|lamp/.test(k)) {
						px.rect(g, sx - sc, sy - 5 * sc, 2 * sc, 10 * sc, "#bc935a");
						px.ell(g, sx, sy - 5 * sc, 4 * sc, 3 * sc, GOLD);
						px.ell(g, sx - sc, sy - 6 * sc, 2.5 * sc, 1.8 * sc, CREAM);
					} else if (/wind/.test(k)) {
						px.rect(g, sx - 5 * sc, sy - 7 * sc, sc, 14 * sc, GOLD);
						for (let i = 0; i < 5; i++) {
							const z = Math.sin(this.time * 4 - i * 0.4) * sc;
							px.rect(
								g,
								sx + (-4 + i * 2) * sc,
								sy + (-6 + i * 0.3) * sc + z,
								2 * sc,
								4 * sc,
								i % 2 ? CREAM : "#dc967a",
							);
						}
					} else {
						px.rect(g, sx - 4 * sc, sy - 3 * sc, 8 * sc, 6 * sc, "#9d8064");
						px.rect(g, sx - 3 * sc, sy - 2 * sc, 6 * sc, sc, "#d1b28b");
					}
				},
				{ outline: false, rim: false },
			);
		}
		drawEffects(r, state, reduce) {
			const sc = r.view.scale || 1;
			for (const e of this.effects) {
				const u = 1 - e.life / e.max;
				if (e.kind === "deliver") {
					const home = state.homes?.find((h) => h.id === e.home),
						x = home?.x ?? e.x,
						y = home?.y ?? e.y;
					r.actor(
						x,
						y,
						0,
						(g, sx, sy) => {
							const hop = reduce
								? 0
								: Math.sin(Math.PI * clamp(u * 1.8, 0, 1)) * 7 * sc;
							baby(
								g,
								sx,
								sy - hop,
								sc * 0.75,
								this.time,
								e.color,
								-Math.PI / 2,
								reduce,
							);
							if (u > 0.3 && u < 0.9)
								symbol(g, "heart", sx, sy - 12 * sc, 0.7 * sc, "#ffc29c");
						},
						{ outline: false, rim: false, alpha: clamp((1 - u) * 3, 0, 1) },
					);
				}
				if (e.kind === "empty")
					r.textAt(e.x, e.y, 15, "SUPPLY!", GOLD, { scale: 1 });
			}
		}
		drawDebug(r, state, opts, grid = this.grid) {
			if (!grid) return;
			const sc = r.view.scale || 1,
				toCell = (e) => grid.toCell(e.x, e.y),
				at = (c) => r.w(...grid.center(c));
			const dashed = (g, a, b, color) => {
				const len = Math.hypot(b[0] - a[0], b[1] - a[1]),
					steps = Math.max(1, Math.ceil(len / 3));
				for (let i = 0; i <= steps; i += 2) {
					const u = i / steps,
						v = Math.min(1, (i + 1) / steps);
					px.line(
						g,
						a[0] + (b[0] - a[0]) * u,
						a[1] + (b[1] - a[1]) * u,
						a[0] + (b[0] - a[0]) * v,
						a[1] + (b[1] - a[1]) * v,
						color,
					);
				}
			};
			const circle = (g, x, y, rad, color) => {
				const center = r.w(x, y);
				for (let i = 0; i < 32; i++) {
					const a = (i * Math.PI) / 16;
					px.dot(
						g,
						center[0] + Math.cos(a) * rad * sc,
						center[1] + Math.sin(a) * rad * sc,
						color,
					);
				}
			};
			r.overlay((g) => {
				if (opts.graph || opts.debug) {
					// The native graph is the same walkability authority used by movement and pursuit.
					for (let cy = 0; cy < grid.h; cy++)
						for (let cx = 0; cx < grid.w; cx++) {
							const c = [cx, cy];
							if (!grid.walk(c)) continue;
							const a = at(c);
							for (const n of grid.neighbours(c))
								if (grid.walk(n) && (n[1] > cy || (n[1] === cy && n[0] > cx))) {
									const b = at(n);
									px.line(g, ...a, ...b, "#4b9189");
								}
							px.dot(g, ...a, "#b9d7b1");
						}
				}
				if (opts.los || opts.debug)
					for (const enemy of state.enemies || []) {
						if (enemy.emerge > 0 || enemy.stun > 0) continue;
						const c = toCell(enemy),
							a = r.w(enemy.x, enemy.y);
						if (enemy.state === "yellow")
							for (const [dx, dy] of DIR) {
								let end = c;
								for (let n = 1; n < Math.max(grid.w, grid.h); n++) {
									const candidate = [c[0] + dx * n, c[1] + dy * n];
									if (!grid.walk(candidate) || !grid.sees(c, candidate)) break;
									end = candidate;
								}
								if (end !== c) dashed(g, a, at(end), "#e9bf68");
							}
						const target = state.players?.find(
							(p) => p.seat === enemy.target && p.active,
						);
						const goal =
							enemy.state === "red" && target ? toCell(target) : enemy.lastSeen;
						if (goal) {
							const path = grid.path(c, goal),
								color = enemy.state === "red" ? "#f8958c" : "#efd69c";
							for (let i = 1; i < path.length; i++)
								dashed(g, at(path[i - 1]), at(path[i]), color);
							const q = at(goal);
							px.line(g, q[0] - 3, q[1], q[0] + 3, q[1], color);
							px.line(g, q[0], q[1] - 3, q[0], q[1] + 3, color);
						}
					}
				if (opts.collision || opts.debug) {
					for (const actor of [
						...(state.players || []),
						...(state.enemies || []),
					]) {
						if (actor.active === false) continue;
						circle(
							g,
							actor.x,
							actor.y,
							3.75,
							actor.stun > 0 ? "#9de2ca" : "#ffafaa",
						);
						const q = r.w(actor.x, actor.y);
						px.dot(g, q[0], q[1], CREAM);
					}
					if (state.bomb) {
						circle(g, state.bomb.x, state.bomb.y, 8, "#e9bd71");
						circle(g, state.bomb.x, state.bomb.y, state.bomb.radius, "#91d8ca");
					}
					for (const home of state.homes || [])
						circle(g, home.x, home.y, 5.5, "#a8db94");
					if (state.supply)
						circle(g, state.supply.x, state.supply.y, 7, "#e8d191");
				}
				if (opts.reveal)
					for (const room of state.rooms || []) {
						const [x, y] = r.w(room.x, room.y),
							label = room.delivered
								? "SAFE"
								: room.carrier
									? "P" + room.carrier
									: room.outcome === "baby"
										? "HATCH"
										: "BUG",
							color = room.outcome === "baby" ? "#bce4a4" : "#f3b0a1";
						const w = E.font.width(label, { scale: 1 }) + 6;
						px.rect(g, x - w / 2, y - 17 * sc, w, 10, "#10272c");
						text(g, label, x, y - 16 * sc, color, {
							align: "center",
							scale: 1,
						});
					}
				const labels = [
					opts.graph ? "GRAPH" : null,
					opts.los ? "SIGHT" : null,
					opts.collision ? "CONTACT" : null,
					opts.reveal ? "ROOM DATA" : null,
				].filter(Boolean);
				text(g, "INSPECT · " + labels.join(" / "), r.W / 2, 39, "#d6d7a4", {
					align: "center",
					scale: 1,
				});
			});
		}
		drawPortrait(g, x, y, seat = 1, scale = 3, carry = false) {
			const rig = this.rigs.get("p" + seat) || new TurtleRig(seat);
			if (!this.rigs.has("p" + seat))
				rig.update(1 / 60, {
					dir: 2,
					carry: carry ? "preview" : null,
					vx: 0,
					vy: 0,
					hurt: 0,
				});
			rig.draw(
				g,
				x,
				y,
				scale,
				carry ? { color: "#c4e38c", symbol: "star" } : null,
				this.reduced,
			);
		}
		drawTitle(r, time = this.time, opts = {}) {
			const tall = r.H > r.W * 1.1;
			r.sky(["#102c36", "#204b50", "#497e73"]);
			r.overlay((g) => {
				const W = r.W,
					H = r.H;
				for (let i = 0; i < 40; i++) {
					const x = (i * 73 + 31) % W,
						y = (i * 47 + 13) % Math.max(1, H * 0.5);
					const blink = opts.reducedMotion ? 1 : Math.sin(time * 0.6 + i) > 0.2;
					px.dot(g, x, y, blink ? "#81aaa0" : "#548e89");
				}
				// Moon, faraway hotel district and quiet water frame the miniature.
				const moonX = tall ? W * 0.8 : W * 0.48,
					moonY = tall ? H * 0.06 : H * 0.12;
				px.disc(g, moonX, moonY, 13, "#e2dcab");
				px.disc(g, moonX + 5, moonY - 4, 12, "#173c43");
				const horizon = tall ? H * 0.3 : H * 0.65;
				for (let i = 0; i < 16; i++) {
					const x = i * 37 - 10,
						h = 18 + ((i * 19) % 50);
					px.rect(g, x, horizon - h, 30, h, "#245052");
					px.rect(g, x + 2, horizon - h + 3, 24, 2, "#326663");
					for (let j = 0; j < 3; j++)
						px.rect(g, x + 6 + j * 7, horizon - h + 10, 2, 3, "#b9b58b");
				}
				px.rect(g, 0, horizon, W, H - horizon, "#1b4345");
				for (let i = 0; i < 23; i++) {
					const x = (i * 61 + 11) % W,
						y = horizon + 10 + ((i * 23) % Math.max(10, H - horizon - 10));
					px.rect(g, x, y, 10 + (i % 4) * 3, 1, "#346961");
				}
				let sc = tall
					? Math.min(W / 270, (H * 0.36) / 220)
					: Math.min((W * 0.51) / 225, (H * 0.69) / 220);
				sc = Math.max(0.65, sc);
				const x = tall ? W * 0.5 : W * 0.28,
					y = tall ? H * 0.34 : H * 0.83;
				this.hotel(g, x, y, sc, time, opts);
				// Two patient bellhops make the passenger promise visible on the title itself.
				const a = new TurtleRig(1);
				a.update(0.016, {
					dir: 1,
					carry: "preview",
					vx: 22,
					vy: 0,
					action: "idle",
					hurt: 0,
				});
				a.spring.t = time;
				a.phase = time * 5;
				a.turn = -0.6;
				a.draw(
					g,
					x - 51 * sc,
					y + 11 * sc,
					sc * 2.05,
					{ symbol: "star", color: "#d5edac" },
					!!opts.reducedMotion,
				);
				const b = new TurtleRig(2);
				b.update(0.016, { dir: 3, vx: 0, vy: 0, hurt: 0 });
				b.spring.t = time;
				b.phase = time * 5 + 0.7;
				b.turn = -2.3;
				b.draw(
					g,
					x + 29 * sc,
					y + 10 * sc,
					sc * 1.8,
					null,
					!!opts.reducedMotion,
				);
				if (!tall) {
					text(
						g,
						"A LITTLE SHELL. A BIG RESPONSIBILITY.",
						W * 0.28,
						H - 24,
						"#cfdbb2",
						{ align: "center", scale: 1 },
					);
				}
			});
		}
		hotel(g, x, y, s, time, opts = {}) {
			const R = (a, b, w, h, c) =>
				px.rect(g, x + a * s, y + b * s, w * s, h * s, c);
			const Q = (pts, c) =>
				poly(
					g,
					pts.map(([a, b]) => [x + a * s, y + b * s]),
					c,
				);
			// Side wall and sloping roof are three-quarter staging only; the maze camera remains overhead.
			Q(
				[
					[-83, 2],
					[66, 2],
					[88, -10],
					[88, -20],
					[-64, -20],
				],
				"#142c2d",
			);
			Q(
				[
					[-78, -4],
					[58, -4],
					[78, -18],
					[78, -25],
					[-58, -25],
				],
				"#bd9e70",
			);
			Q(
				[
					[52, -16],
					[78, -33],
					[78, -162],
					[52, -147],
				],
				"#7b7960",
			);
			R(-77, -148, 130, 132, "#d0b687");
			R(-74, -145, 124, 127, "#d9c597");
			R(-77, -147, 5, 130, "#efe0b5");
			R(47, -147, 6, 130, "#9a8d69");
			for (let floor = 0; floor < 4; floor++) {
				const yy = -141 + floor * 29;
				R(-73, yy + 24, 124, 4, "#7b8b6e");
				R(-73, yy + 24, 124, 1, "#f5e5b5");
				Q(
					[
						[53, yy + 24],
						[78, yy + 9],
						[78, yy + 13],
						[53, yy + 28],
					],
					"#5d715e",
				);
				for (let col = 0; col < 3; col++) {
					const xx = -62 + col * 36,
						lit = (floor + col) % 3 !== 0;
					if (lit)
						px.blend(g, 0.16, "add", () =>
							px.ell(
								g,
								x + (xx + 9) * s,
								y + (yy + 9) * s,
								15 * s,
								14 * s,
								"#e6b571",
							),
						);
					R(xx - 2, yy - 2, 23, 23, "#6f8b73");
					R(xx, yy, 19, 19, "#2b5554");
					R(xx + 1, yy + 1, 8, 16, lit ? "#f5daa0" : "#6f9a85");
					R(xx + 10, yy + 1, 7, 16, lit ? "#c7b67e" : "#558475");
					R(xx + 9, yy, 1, 18, "#91ac83");
					R(xx, yy + 8, 18, 1, "#9aaf85");
					R(xx - 2, yy + 18, 23, 3, "#f5dfab");
					if (lit) {
						R(xx + 1, yy + 1, 2, 6, "#fff0c2");
						R(xx + 2, yy + 19, 12, 1, "#fff0c2");
					}
					if (floor === 1 && col === 0) {
						const yy0 =
							yy + 11 + (opts.reducedMotion ? 0 : Math.sin(time * 2) * 1);
						baby(
							g,
							x + (xx + 9) * s,
							y + yy0 * s,
							s * 0.9,
							time,
							"#a7ca7a",
							0,
							!!opts.reducedMotion,
						);
					}
				}
				for (let side = 0; side < 2; side++) {
					const sx = 59 + side * 10,
						sy = yy - 4 - side * 6;
					Q(
						[
							[sx, sy],
							[sx + 5, sy - 3],
							[sx + 5, sy + 10],
							[sx, sy + 13],
						],
						"#cfb77d",
					);
				}
			}
			// Rooftop garden and brass shell sign.
			Q(
				[
					[-83, -150],
					[55, -150],
					[83, -167],
					[-55, -167],
				],
				"#698e75",
			);
			Q(
				[
					[-83, -153],
					[55, -153],
					[83, -170],
					[-55, -170],
				],
				"#dae0ad",
			);
			Q(
				[
					[-77, -156],
					[51, -156],
					[74, -169],
					[-54, -169],
				],
				"#426e5e",
			);
			for (let i = 0; i < 7; i++) {
				R(-69 + i * 18, -161, 10, 4, "#8eaa7e");
				px.ell(g, x + (-64 + i * 18) * s, y - 163 * s, 5 * s, 3 * s, "#a8c68d");
			}
			R(-31, -181, 63, 20, "#1a4143");
			R(-29, -179, 59, 16, "#b99d68");
			R(-27, -177, 55, 12, "#204e4c");
			text(g, "SHELL HOTEL", x, y - 174 * s, CREAM, {
				align: "center",
				scale: Math.max(1, s),
			});
			for (const sd of [-1, 1]) {
				px.disc(g, x + sd * 27 * s, y - 171 * s, s, "#ffe6ad");
				px.disc(g, x + sd * 23 * s, y - 171 * s, 0.7 * s, "#ffe6ad");
			}
			// Canopied lobby with a welcoming door and tiny brass bell.
			R(-28, -39, 48, 22, "#577565");
			R(-23, -36, 38, 20, "#234b47");
			R(-21, -34, 16, 17, "#f8dc9e");
			R(-2, -34, 15, 17, "#d6bd7f");
			R(-5, -36, 3, 20, "#78947a");
			Q(
				[
					[-40, -41],
					[28, -41],
					[20, -51],
					[-31, -51],
				],
				"#a35749",
			);
			for (let i = 0; i < 6; i++)
				R(-39 + i * 11, -42, 6, 5, i % 2 ? "#f0cda0" : "#cf8462");
			R(-40, -42, 68, 1, "#f3d8a4");
			R(-34, -16, 60, 4, "#e5cea1");
			R(-41, -12, 73, 4, "#bda778");
			R(-47, -8, 85, 4, "#e5cea1");
			// Luggage and clipped topiary lead toward the entrance.
			for (const sd of [-1, 1]) {
				const xx = sd < 0 ? -65 : 45;
				R(xx - 4, -7, 8, 9, "#ae8156");
				R(xx - 5, -8, 10, 2, "#d8b37a");
				px.ell(g, x + xx * s, y - 15 * s, 8 * s, 9 * s, "#214d3c");
				px.ell(g, x + (xx - 2) * s, y - 17 * s, 6 * s, 7 * s, "#70a16b");
				px.ell(g, x + (xx - 3) * s, y - 19 * s, 3 * s, 4 * s, "#9bb97a");
			}
			R(63, -7, 10, 10, "#a47150");
			R(64, -7, 2, 9, "#efc48b");
			R(69, -7, 2, 9, "#efc48b");
			R(66, -9, 4, 2, "#c7a06a");
			// A wee lift light climbs the front of the hotel to foreshadow ascent.
			const level = opts.floor ?? Math.floor(time * 0.25) % 5;
			for (let i = 0; i < 5; i++) {
				R(-87, -25 - i * 27, 4, 7, i === level ? "#ffdfa1" : "#446c60");
			}
		}
		drawCelebration(r, state, reduce) {
			const sc = r.view.scale || 1,
				t = this.time;
			r.overlay((g) => {
				const W = r.W,
					H = r.H,
					cx = W * 0.5,
					cy = Math.min(H - 46, H * 0.78),
					s = Math.min(2.1, W / 240);
				// A little evacuation airship takes the entire family up beyond the hotel.
				const lift =
					state.phase === "won"
						? 0
						: Math.max(0, 4 - (state.phaseTimer || 0)) * 3;
				const yy = cy - lift * s;
				px.ell(g, cx, yy - 46 * s, 43 * s, 22 * s, "#193e3c");
				px.ell(g, cx - s, yy - 48 * s, 40 * s, 20 * s, "#9ec58b");
				px.ell(g, cx - 10 * s, yy - 54 * s, 24 * s, 10 * s, "#d2deb0");
				px.line(
					g,
					cx - 22 * s,
					yy - 27 * s,
					cx - 15 * s,
					yy,
					GOLD,
					Math.max(1, s),
				);
				px.line(
					g,
					cx + 22 * s,
					yy - 27 * s,
					cx + 15 * s,
					yy,
					GOLD,
					Math.max(1, s),
				);
				px.rect(g, cx - 27 * s, yy - 4 * s, 54 * s, 18 * s, "#a77c52");
				px.rect(g, cx - 28 * s, yy - 5 * s, 56 * s, 4 * s, "#eed09b");
				for (let i = 0; i < 8; i++)
					baby(
						g,
						cx + (-23 + i * 6.5) * s,
						yy - 7 * s - (reduce ? 0 : Math.sin(t * 5 + i) * 1.2 * s),
						s * 0.65,
						t + i,
						"#c0d989",
						-Math.PI / 2,
						reduce,
					);
				for (let i = 0; i < 7; i++)
					px.rect(g, cx + (-23 + i * 8) * s, yy + 3 * s, s, 8 * s, "#c79f6c");
				symbol(g, "heart", cx, yy + 6 * s, 1.2 * s, "#f2dbad");
				if (!reduce)
					for (let i = 0; i < 18; i++) {
						const x = (i * 53 + t * (i % 2 ? 9 : -7)) % W,
							y = (i * 31 + t * 23) % (H + 20);
						px.rect(
							g,
							(x + W) % W,
							y,
							2,
							2,
							["#e9c77c", "#a7d6ac", "#e6a28a"][i % 3],
						);
					}
			});
		}
	}
	T.Art = Art;
	T.TurtleRig = TurtleRig;
	T.BeetleRig = BeetleRig;
	T.drawSymbol = symbol;
	T.drawBaby = baby;
})();
