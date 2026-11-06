import { clamp, footprint } from "../sim/world.js";
export function createRigs(E) {
	const { px } = E;
	function ellipse(g, x, y, rx, ry, color) {
		px.ell(g, x, y, Math.max(0.6, rx), Math.max(0.6, ry), color);
	}
	function bee(g, x, y, a, k, time, colors = {}, agitated = false) {
		const C = {
				body: "#f5d47a",
				light: "#fff5cb",
				dark: "#73502b",
				stripe: "#292e35",
				wing: "#c8e8e2",
				...colors,
			},
			cs = Math.cos(a),
			sn = Math.sin(a);
		const P = (u, v) => [x + (u * cs - v * sn) * k, y + (u * sn + v * cs) * k];
		const line = (u, v, uu, vv, c, w = 1) =>
			px.line(g, ...P(u, v), ...P(uu, vv), c, Math.max(1, w * k));
		const wing = 0.7 + 0.5 * Math.sin(time * 54);
		for (const side of [-1, 1]) {
			const pts = [
				P(-0.7, side * 0.4),
				P(-2.4, side * (2.4 + wing)),
				P(0.1, side * (3 + wing)),
				P(1.3, side * 1.3),
			];
			px.poly(g, pts, "#466a73");
			px.poly(g, [pts[0], pts[1], P(0.2, side * (2.5 + wing)), pts[3]], C.wing);
			line(-0.6, side * 0.8, -1.1, side * (2.8 + wing), "#f1fbdd");
			line(-1, side, -2, side * 1.9, C.dark);
			line(0.7, side, 0.3, side * 2, C.dark);
			line(2, side * 0.4, 3.4, side * 1.5, C.dark);
			line(3.4, side * 1.5, 3.6, side * 1.8, C.light);
		}
		const [ax, ay] = P(-1.3, 0);
		ellipse(g, ax, ay, 2.6 * k, 1.75 * k, C.dark);
		ellipse(g, ax - 0.25 * k, ay - 0.5 * k, 2.15 * k, 1.45 * k, C.body);
		for (const u of [-2.4, -0.8]) line(u, -1.25, u, 1.25, C.stripe, 0.7);
		line(-3.4, 0, -4.5, 0, agitated ? "#fff5cb" : C.dark);
		const [tx, ty] = P(1.25, 0);
		ellipse(g, tx, ty, 1.65 * k, 1.65 * k, C.dark);
		ellipse(g, tx - 0.2 * k, ty - 0.35 * k, 1.25 * k, 1.2 * k, C.body);
		const [hx, hy] = P(2.25, 0);
		ellipse(g, hx, hy, 1.1 * k, 1.2 * k, C.light);
		for (const side of [-1, 1]) {
			const q = P(2.65, side * 0.58);
			px.disc(g, ...q, Math.max(0.55, 0.42 * k), "#172b35");
		}
		px.dot(g, ax - k, ay - k, C.light);
	}
	class BeeRig extends E.Blob {
		constructor(id) {
			super({
				R: 3,
				wings: true,
				colors: { base: id ? "#bce1d5" : "#f5d47a" },
			});
			this.id = id;
			this.positions = [];
			this.state = null;
			this.lastCount = 0;
		}
		update(dt, state) {
			if (state.bees > this.lastCount) this.kick(2.4);
			this.lastCount = state.bees;
			super.update(dt, {
				look: [Math.cos(state.facing), Math.sin(state.facing)],
				flap: state.contact ? 1 : 0.72,
				squash: state.focus
					? -0.18
					: (Math.hypot(state.vx, state.vy) / 120) * 0.12,
				squint: state.contact,
			});
			this.state = state;
		}
		draw(g, ox, oy, view) {
			const p = this.state;
			if (!p) return;
			const k = (view.scale || 1) * (view.zoom || 1),
				R = footprint(p),
				color = this.id ? "#d0f3e6" : "#ffdc86";
			if (!p.bees) {
				px.line(g, ox - 4 * k, oy - 4 * k, ox + 4 * k, oy + 4 * k, color);
				px.line(g, ox + 4 * k, oy - 4 * k, ox - 4 * k, oy + 4 * k, color);
				return;
			}
			for (let i = 0; i < p.bees; i++) {
				const a = i * 2.399963 + this.t * (p.contact ? 1.6 : 0.65),
					rr =
						p.bees === 1
							? 0
							: Math.sqrt((i + 1) / p.bees) * Math.max(0, R - 4.3),
					flutter = Math.sin(this.t * 10 + i) * 0.35;
				const dx = Math.cos(a) * rr,
					dy = Math.sin(a) * rr;
				let last = this.positions[i];
				if (!last) last = this.positions[i] = { x: dx, y: dy };
				// Followers spring within the authoritative footprint; the center stays responsive.
				last.x += (dx - last.x) * 0.24;
				last.y += (dy - last.y) * 0.24;
				const length = Math.hypot(last.x, last.y),
					limit = Math.max(0, R - 4.3);
				if (length > limit) {
					last.x *= limit / length;
					last.y *= limit / length;
				}
				const f = p.contact
					? Math.atan2(-last.y, -last.x)
					: p.facing + Math.sin(i * 2 + this.t * 4) * 0.16;
				bee(
					g,
					ox + last.x * k,
					oy + (last.y + flutter) * k,
					f,
					0.66 * k * (1 + this.sq * 0.16),
					this.t + i * 1.3,
					this.id
						? {
								body: "#b9decf",
								light: "#effff0",
								dark: "#3a6460",
								wing: "#d4edff",
							}
						: {},
					p.contact,
				);
			}
			const pts = this.id
				? [
						[ox, oy - 2],
						[ox + 2, oy],
						[ox, oy + 2],
						[ox - 2, oy],
					]
				: [
						[ox - 1, oy - 1],
						[ox + 1, oy - 1],
						[ox + 1, oy + 1],
						[ox - 1, oy + 1],
					];
			px.poly(g, pts, color);
		}
	}
	class GardenerRig extends E.Blob {
		constructor(type) {
			super({ R: 7, wings: false, feet: true });
			this.type = type;
			this.state = null;
		}
		update(dt, state) {
			super.update(dt, {
				flap: 0,
				walk: state.warning > 0 ? 0 : state.hp / state.maxHp,
				squash: state.hp / state.maxHp < 0.5 ? -0.15 : 0,
				squint: state.hp < state.maxHp,
			});
			this.state = state;
		}
		draw(g, ox, oy, view) {
			const t = this.state;
			if (!t) return;
			const k = (view.scale || 1) * (view.zoom || 1),
				C =
					this.type === "right"
						? {
								dark: "#244644",
								base: "#548d80",
								light: "#a9d2b5",
								rim: "#debd7d",
							}
						: {
								dark: "#4f3837",
								base: "#bd8057",
								light: "#f4c086",
								rim: "#d0e1c0",
							},
				health = t.hp / t.maxHp;
			const bank = Math.sin(this.t * 20) * (1 - health) * 1.3 * k,
				xx = ox + bank,
				yy = oy;
			if (this.type === "bell") {
				this.bell(g, ox, oy, k);
				return;
			}
			for (const side of [-1, 1])
				for (let i = 0; i < 2; i++) {
					const st = Math.sin(this.t * 13 + i * Math.PI + side) * health,
						dx = side * (7 + st) * k,
						dy = (i ? 3 : -3) * k;
					px.line(
						g,
						xx + side * 4 * k,
						yy + dy,
						xx + dx,
						yy + dy + st * k,
						C.dark,
						Math.max(1, k),
					);
					px.rect(g, xx + dx - k, yy + dy - k, 3 * k, 2 * k, C.light);
				}
			if (this.type === "right") {
				px.poly(
					g,
					[
						[xx - 7 * k, yy - 3 * k],
						[xx - 3 * k, yy - 7 * k],
						[xx + 5 * k, yy - 5 * k],
						[xx + 7 * k, yy + 4 * k],
						[xx, yy + 7 * k],
						[xx - 6 * k, yy + 4 * k],
					],
					C.dark,
				);
				px.poly(
					g,
					[
						[xx - 5 * k, yy - 3 * k],
						[xx - 2 * k, yy - 6 * k],
						[xx + 4 * k, yy - 4 * k],
						[xx + 5 * k, yy + 3 * k],
						[xx, yy + 5 * k],
						[xx - 4 * k, yy + 3 * k],
					],
					C.base,
				);
				px.line(
					g,
					xx - 2 * k,
					yy - 5 * k,
					xx + 3 * k,
					yy - 4 * k,
					C.light,
					Math.max(1, k),
				);
				px.line(g, xx, yy - 5 * k, xx, yy - 11 * k, C.rim);
				px.poly(
					g,
					[
						[xx, yy - 11 * k],
						[xx + 4 * k, yy - 13 * k],
						[xx + 3 * k, yy - 9 * k],
					],
					C.light,
				);
			} else {
				ellipse(g, xx, yy, 7 * k, 6.5 * k, C.dark);
				ellipse(g, xx - 0.4 * k, yy - 1 * k, 5.7 * k, 5.3 * k, C.base);
				ellipse(g, xx - 2 * k, yy - 3 * k, 2.6 * k, 1.6 * k, C.light);
				for (const side of [-1, 1]) {
					px.line(
						g,
						xx + side * 3 * k,
						yy - 5 * k,
						xx + side * 4 * k,
						yy - 9 * k,
						C.rim,
					);
					px.disc(g, xx + side * 4 * k, yy - 9 * k, 1.2 * k, C.light);
				}
			}
			px.rect(g, xx - 4 * k, yy - k, 8 * k, 3 * k, C.dark);
			for (const side of [-1, 1]) {
				px.rect(
					g,
					xx + side * 2.5 * k - k,
					yy,
					2 * k,
					health < 0.4 ? k : 2 * k,
					health < 0.4 ? "#f4a879" : "#fff0c8",
				);
			}
			px.line(g, xx - 2 * k, yy + 4 * k, xx + 2 * k, yy + 4 * k, C.rim);
			px.rect(g, xx - k, yy + 6 * k, 2 * k, 3 * k, C.dark);
			// The turning arrow is part of the shell's anatomy, separate from color.
			px.line(g, xx - 2 * k, yy - 3 * k, xx + 2 * k, yy - 3 * k, C.dark);
			const side = this.type === "right" ? 1 : -1;
			px.line(
				g,
				xx + side * 2 * k,
				yy - 3 * k,
				xx + side * k,
				yy - 4 * k,
				C.dark,
			);
			if (health < 0.96) {
				const n = 16;
				for (let i = 0; i < n; i++) {
					const a = (i / n) * Math.PI * 2,
						aa = a + 0.2;
					const c = i / n < 1 - health ? "#f8d786" : "#283b40";
					px.line(
						g,
						ox + Math.cos(a) * 10 * k,
						oy + Math.sin(a) * 10 * k,
						ox + Math.cos(aa) * 10 * k,
						oy + Math.sin(aa) * 10 * k,
						c,
					);
				}
			}
			if (t.recovering) {
				px.line(g, xx - 2 * k, yy - 13 * k, xx, yy - 15 * k, "#a6d4d1");
				px.line(g, xx, yy - 15 * k, xx + 2 * k, yy - 13 * k, "#a6d4d1");
			}
		}
		bell(g, x, y, k) {
			const t = this.state,
				open = t.bossPhase === "open",
				pulse = t.bossPhase === "pulse",
				wob = pulse ? Math.sin(this.t * 28) * 1.3 * k : 0,
				C = { dark: "#624b36", base: "#c39858", light: "#f9d995" };
			x += wob;
			for (const side of [-1, 1])
				for (const v of [-1, 1]) {
					px.line(
						g,
						x + side * 9 * k,
						y + v * 7 * k,
						x + side * 19 * k,
						y + v * 11 * k,
						"#52675f",
						2 * k,
					);
					ellipse(
						g,
						x + side * 19 * k,
						y + v * 11 * k,
						3 * k,
						2 * k,
						"#b4c1a1",
					);
				}
			ellipse(g, x, y, 17 * k, 16 * k, C.dark);
			ellipse(g, x - k, y - k, 15 * k, 14 * k, C.base);
			ellipse(g, x - 5 * k, y - 7 * k, 7 * k, 3 * k, C.light);
			px.rect(g, x - 6 * k, y - 21 * k, 12 * k, 4 * k, "#71827a");
			px.rect(g, x - 4 * k, y - 25 * k, 8 * k, 5 * k, C.dark);
			px.rect(g, x - 2 * k, y - 24 * k, 4 * k, 3 * k, C.light);
			ellipse(g, x, y + 2 * k, 11 * k, 10 * k, "#324443");
			if (open) {
				for (let i = 0; i < 6; i++) {
					const a = (i * Math.PI) / 3 + this.t * 0.6;
					px.poly(
						g,
						[
							[x + Math.cos(a) * 7 * k, y + Math.sin(a) * 7 * k],
							[x + Math.cos(a + 0.2) * 15 * k, y + Math.sin(a + 0.2) * 15 * k],
							[x + Math.cos(a + 0.5) * 14 * k, y + Math.sin(a + 0.5) * 14 * k],
						],
						C.light,
					);
				}
				ellipse(g, x, y + 1 * k, 6 * k, 6 * k, "#f9da8d");
				ellipse(g, x - 1 * k, y - k, 3.5 * k, 3.5 * k, "#fff9dc");
			} else {
				px.rect(g, x - 10 * k, y, 20 * k, 4 * k, "#88978b");
				px.line(g, x, y - 8 * k, x, y + 9 * k, "#c7b373", Math.max(1, k));
				for (const side of [-1, 1])
					px.rect(
						g,
						x + side * 5 * k - 1,
						y - 4 * k,
						3 * k,
						2 * k,
						pulse ? "#ffc68b" : "#dfefce",
					);
			}
			px.rect(g, x - 14 * k, y + 13 * k, 28 * k, 4 * k, C.dark);
			px.rect(g, x - 12 * k, y + 13 * k, 24 * k, 2 * k, C.light);
			const n = 24;
			for (let i = 0; i < n; i++) {
				const a = (i / n) * Math.PI * 2,
					aa = a + 0.15;
				px.line(
					g,
					x + Math.cos(a) * 21 * k,
					y + Math.sin(a) * 21 * k,
					x + Math.cos(aa) * 21 * k,
					y + Math.sin(aa) * 21 * k,
					i / n < 1 - t.hp / t.maxHp ? "#ffe1a3" : "#45565b",
				);
			}
		}
	}
	return { BeeRig, GardenerRig, bee };
}
