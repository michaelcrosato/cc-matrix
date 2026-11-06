import { THEMES } from "../content/gardens.js";
import { key, MazeGraph } from "../sim/maze.js";

const E = globalThis.My3D2dge;
const { px } = E;
const T = 16;
const hash = (x, y, s = 0) => {
	let n =
		Math.imul(x + 113 + s * 31, 374761393) ^ Math.imul(y + 127, 668265263);
	n = Math.imul(n ^ (n >>> 13), 1274126177);
	return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
const point = (c) => [(c[0] + 0.5) * T, (c[1] + 0.5) * T];
const fitText = (s, w, scale = 1) => {
	const text = String(s ?? "");
	if (E.font.width(text, { scale }) <= w) return text;
	let cut = text;
	while (cut.length && E.font.width(`${cut}…`, { scale }) > w)
		cut = cut.slice(0, -1);
	return `${cut}…`;
};
function boxOutline(g, x, y, w, h, color, k = 1) {
	px.rect(g, x, y, w, k, color);
	px.rect(g, x, y + h - k, w, k, color);
	px.rect(g, x, y, k, h, color);
	px.rect(g, x + w - k, y, k, h, color);
}

/** Fixed whole-garden camera and native pixel diorama. No gameplay state lives here. */
export class GardenView {
	constructor(game, rigs) {
		this.game = game;
		this.rigs = rigs;
		this.bounds = { x: 0, y: 0, w: 0, h: 0, x0: 0, y0: 0, x1: 0, y1: 0 };
		this.zoom = 1;
		this.lastView = null;
		this.mode = { title: false, workshop: false };
		this.graph = null;
		this.signature = "";
	}
	fit(view, { title = false, workshop = false } = {}) {
		if (!view?.garden) return this.bounds;
		this.lastView = view;
		this.mode = { title, workshop };
		const g = this.game,
			l = view.garden,
			W = g.W,
			H = g.H,
			portrait = H > W * 1.3;
		let area = { x: 20, y: 49, w: W - 40, h: H - 86 };
		if (portrait) {
			const bh = Math.min(H * 0.46, H - 210);
			area = { x: 20, y: H * 0.42 - bh / 2, w: W - 40, h: bh };
		}
		if (title) {
			area = portrait
				? { x: 20, y: H * 0.47 - (H * 0.34) / 2, w: W - 40, h: H * 0.34 }
				: { x: W * 0.42 + 17, y: 49, w: W * 0.58 - 37, h: H - 85 };
		}
		if (workshop) {
			area = portrait
				? { x: 20, y: 61, w: W - 40, h: Math.max(120, H - 260) }
				: { x: 18, y: 51, w: Math.max(130, W - 190), h: H - 93 };
		}
		const z = Math.max(
			0.5,
			Math.min(
				2.6,
				Math.floor(Math.min(area.w / (l.w * T), area.h / (l.h * T)) * 100) /
					100,
			),
		);
		if (g.baseView?.id !== "overhead") g.setView("overhead");
		if (Math.abs(g.zoom - z) > 0.0001) g.setZoom(z);
		this.zoom = g.view.scale || z;
		const w = l.w * T * this.zoom,
			h = l.h * T * this.zoom,
			cx = area.x + area.w / 2,
			cy = area.y + area.h / 2;
		const x = Math.round(cx - w / 2),
			y = Math.round(cy - h / 2);
		this.bounds = { x, y, w, h, x0: x, y0: y, x1: x + w, y1: y + h };
		g.follow(null);
		g.cam.bounds = null;
		g.cam.room = null;
		g.cam.window = null;
		g.cam.smooth = 0;
		g.cam.offset = [cx - W / 2, cy - H / 2];
		g.focus((l.w * T) / 2, (l.h * T) / 2, 0);
		const sig = `${l.w}:${l.h}:${l.rows.join("")}${JSON.stringify(l.wraps || [])}`;
		if (sig !== this.signature) {
			this.graph = new MazeGraph(l);
			this.signature = sig;
		}
		const theme = THEMES[l.theme] || THEMES[0];
		if (this._theme !== theme) {
			g.lights.enabled = true;
			g.lights.ambient = 0.78;
			g.lights.dark = [5, 13, 28];
			g.lights.darkness = 0.48;
			g.lights.refresh();
			this._theme = theme;
		}
		return this.bounds;
	}
	cellAt(x, y) {
		const b = this.bounds,
			l = this.lastView?.garden;
		if (!l || x < b.x || y < b.y || x >= b.x1 || y >= b.y1) return null;
		const c = [
			Math.floor((x - b.x) / (T * this.zoom)),
			Math.floor((y - b.y) / (T * this.zoom)),
		];
		return c[0] >= 0 && c[1] >= 0 && c[0] < l.w && c[1] < l.h ? c : null;
	}
	_backdrop(r, v, theme) {
		r.sky(theme.sky);
		const t = this.game.reduceMotion ? 0 : (v.t ?? this.game.time);
		// Gentle orbital haze, distant spores and Venusian moons frame the tiny garden.
		const g = r.ctx;
		for (let i = 0; i < 65; i++) {
			const x = hash(i, 17, 2) * r.W,
				y = hash(i, 31, 4) * r.H,
				bright = i % 8 === 0;
			px.dot(
				g,
				x + (this.game.reduceMotion ? 0 : Math.sin(t * 0.2 + i) * 1.6),
				y,
				bright ? "#778a9c" : E.shade(theme.sky[1], 0.24),
			);
			if (bright && i % 3 === 0)
				px.dot(g, x, y - 1, E.shade(theme.sky[2], 0.5));
		}
		const mx = this.mode.title ? r.W * 0.88 : r.W * 0.11,
			my = this.mode.title ? r.H * 0.19 : r.H * 0.23,
			moon = Math.min(22, r.W * 0.04);
		px.ell(g, mx, my, moon, moon, "#39455b");
		px.ell(g, mx - 3, my - 2, moon * 0.84, moon * 0.84, "#4b6472");
		px.ell(
			g,
			mx + moon * 0.5,
			my - moon * 0.23,
			moon * 0.6,
			moon * 0.8,
			theme.sky[1],
		);
		for (let i = 0; i < 7; i++) {
			const xx = hash(i, 5, 8) * r.W,
				yy = r.H * (0.14 + hash(i, 7, 2) * 0.68);
			px.blend(g, 0.1, "screen", () =>
				px.ell(
					g,
					xx,
					yy,
					20 + hash(i, 8) * 24,
					4 + hash(i, 9) * 5,
					theme.wallHi,
				),
			);
		}
	}
	_ground(r, v, theme) {
		const l = v.garden,
			z = r.view.scale || 1,
			t = this.game.reduceMotion ? 0 : (v.t ?? 0);
		r.decal((g) => {
			const [x0, y0] = r.w(0, 0),
				bw = l.w * T * z,
				bh = l.h * T * z;
			// A raised slice of garden soil with a dark underside anchors the whole composition.
			px.poly(
				g,
				[
					[x0 - 7 * z, y0 + 2 * z],
					[x0 + bw + 6 * z, y0 + 2 * z],
					[x0 + bw + 10 * z, y0 + bh - 3 * z],
					[x0 + bw - 2 * z, y0 + bh + 9 * z],
					[x0 + 5 * z, y0 + bh + 11 * z],
					[x0 - 11 * z, y0 + bh - 2 * z],
				],
				"#0b1d2c",
			);
			px.poly(
				g,
				[
					[x0 - 5 * z, y0 + 1 * z],
					[x0 + bw + 4 * z, y0 + 1 * z],
					[x0 + bw + 7 * z, y0 + bh - 3 * z],
					[x0 + bw - 2 * z, y0 + bh + 5 * z],
					[x0 + 5 * z, y0 + bh + 7 * z],
					[x0 - 7 * z, y0 + bh - 2 * z],
				],
				E.shade(theme.wallDark, -0.14),
			);
			px.rect(g, x0, y0, bw, bh, theme.floor);
			for (let y = 0; y < l.h; y++)
				for (let x = 0; x < l.w; x++) {
					const xx = x0 + x * T * z,
						yy = y0 + y * T * z;
					if (l.rows[y][x] === ".") {
						const tone =
							hash(x, y, l.theme) > 0.5 ? theme.floor : theme.floorHi;
						px.rect(g, xx, yy, T * z, T * z, E.mix(theme.floor, tone, 0.3));
						for (let i = 0; i < 5; i++) {
							const nx = (1 + hash(x * 5 + i, y, 2) * 14) * z,
								ny = (1 + hash(x, y * 7 + i, 3) * 14) * z;
							px.dot(
								g,
								xx + nx,
								yy + ny,
								i % 3
									? E.shade(theme.floor, 0.12)
									: E.shade(theme.floor, -0.12),
							);
						}
						if (hash(x, y, 7) > 0.89) {
							px.line(
								g,
								xx + 4 * z,
								yy + 11 * z,
								xx + 7 * z,
								yy + 10 * z,
								E.shade(theme.floorHi, 0.12),
							);
							px.line(
								g,
								xx + 7 * z,
								yy + 10 * z,
								xx + 10 * z,
								yy + 11 * z,
								E.shade(theme.floor, -0.12),
							);
						}
					}
				}
			// Small safe nursery flagstones use petals, never new collision geometry.
			for (const [i, c] of (l.nursery || []).entries()) {
				const [wx, wy] = point(c),
					[xx, yy] = r.w(wx, wy),
					co = i ? "#dc9c97" : "#8fc6db";
				px.ell(g, xx, yy, 5.5 * z, 5.5 * z, E.shade(theme.floorHi, 0.08));
				for (let q = 0; q < 4; q++) {
					const a = (q * Math.PI) / 2;
					px.dot(g, xx + Math.cos(a) * 5 * z, yy + Math.sin(a) * 5 * z, co);
				}
			}
			// Low, contiguous hedges are bevelled only where a real passage begins.
			const wall = (x, y) => l.rows[y]?.[x] === "#";
			for (let y = 0; y < l.h; y++)
				for (let x = 0; x < l.w; x++)
					if (wall(x, y)) {
						const xx = x0 + x * T * z,
							yy = y0 + y * T * z,
							S = T * z;
						px.rect(g, xx, yy, S, S, theme.wallDark);
						px.rect(
							g,
							xx + 1 * z,
							yy + 1 * z,
							S - 2 * z,
							S - 2 * z,
							theme.wall,
						);
						if (wall(x - 1, y))
							px.rect(g, xx, yy + 1 * z, 2 * z, S - 2 * z, theme.wall);
						if (wall(x + 1, y))
							px.rect(
								g,
								xx + S - 2 * z,
								yy + 1 * z,
								2 * z,
								S - 2 * z,
								theme.wall,
							);
						if (wall(x, y - 1))
							px.rect(g, xx + 1 * z, yy, S - 2 * z, 2 * z, theme.wall);
						if (wall(x, y + 1))
							px.rect(
								g,
								xx + 1 * z,
								yy + S - 2 * z,
								S - 2 * z,
								2 * z,
								theme.wall,
							);
						if (!wall(x, y - 1)) {
							px.rect(g, xx + 1 * z, yy, S - 2 * z, z, theme.wallHi);
							px.rect(
								g,
								xx + 2 * z,
								yy + z,
								S - 4 * z,
								z,
								E.mix(theme.wall, theme.wallHi, 0.5),
							);
						}
						if (!wall(x - 1, y))
							px.rect(
								g,
								xx,
								yy + 1 * z,
								z,
								S - 2 * z,
								E.mix(theme.wall, theme.wallHi, 0.4),
							);
						if (!wall(x, y + 1)) {
							px.rect(g, xx, yy + S - 2 * z, S, 2 * z, theme.wallDark);
							px.rect(g, xx, yy + S, S, z, E.shade(theme.floor, -0.15));
						}
						if (!wall(x + 1, y))
							px.rect(g, xx + S - z, yy + z, z, S - z, theme.wallDark);
						for (let i = 0; i < 4; i++) {
							const dx = (3 + hash(x * 4 + i, y, 4) * 9) * z,
								dy = (3 + hash(x, y * 5 + i, 5) * 9) * z,
								light =
									i % 2
										? E.mix(theme.wall, theme.wallHi, 0.27)
										: E.shade(theme.wall, -0.07);
							px.ell(g, xx + dx, yy + dy, 2 * z, 1.1 * z, light);
						}
						if (hash(x, y, 9) > 0.81) {
							const cx = xx + 8 * z,
								cy = yy + 7 * z,
								sway = Math.sin(t * 2 + x + y) * 0.5 * z;
							px.line(g, cx, cy + 3 * z, cx + sway, cy - z, theme.wallDark, z);
							px.ell(g, cx + sway, cy - z, 2.2 * z, 1.5 * z, theme.flower);
							px.dot(g, cx + sway, cy - 1.5 * z, theme.accent);
						}
					}
		});
	}
	_dressing(r, v, theme) {
		const l = v.garden,
			t = v.t ?? 0,
			z = r.view.scale || 1;
		// Dressing remains outside the board, so foliage never conceals a passage or a danger silhouette.
		for (let i = 0; i < 12; i++) {
			const side = i % 4,
				q = Math.floor(i / 4),
				x =
					side === 0
						? -14
						: side === 1
							? l.w * T + 13
							: ((q + 0.6) * l.w * T) / 3,
				y =
					side === 2
						? -12
						: side === 3
							? l.h * T + 13
							: ((q + 0.6) * l.h * T) / 3;
			if (i % 3 === 0)
				r.shape("rock", x, y, 0, {
					params: { r: 3.8, seed: i + 12 },
					scale: 0.8,
					mats: { rock: theme.wallDark },
					shadow: true,
				});
			else
				r.actor(x, y, 0, (g, ox, oy) => {
					const p = E.tones(i % 2 ? theme.wall : theme.flower),
						lean = this.game.reduceMotion ? 0 : Math.sin(t * 1.6 + i) * 1.2 * z;
					px.ell(g, ox, oy + z, 5 * z, 2 * z, theme.wallDark);
					if (l.theme === 1) {
						for (let s = -1; s <= 1; s++) {
							const xx = ox + s * 3 * z,
								h = (6 + hash(i, s) * 5) * z;
							px.poly(
								g,
								[
									[xx - 2 * z, oy],
									[xx - 2 * z, oy - h * 0.65],
									[xx, oy - h],
									[xx + 2 * z, oy - h * 0.7],
									[xx + 2 * z, oy],
								],
								p.sh,
							);
							px.poly(
								g,
								[
									[xx, oy],
									[xx, oy - h],
									[xx + 2 * z, oy - h * 0.7],
									[xx + z, oy],
								],
								p.lt,
							);
						}
						return;
					}
					if (l.theme === 3) {
						for (let s = -1; s <= 1; s++) {
							const xx = ox + s * 3 * z,
								yy = oy - (5 + hash(i, s) * 3) * z;
							px.rect(g, xx - z, yy, 2 * z, oy - yy, p.lt);
							px.ell(g, xx, yy, 3.5 * z, 2 * z, p.sh);
							px.ell(g, xx - z, yy - z, 2.5 * z, 1.5 * z, p.base);
							px.dot(g, xx - 2 * z, yy - z, theme.accent);
							px.dot(g, xx + z, yy, theme.accent);
						}
						return;
					}
					for (let s = -1; s <= 1; s++) {
						const xx = ox + s * 2 * z,
							yy = oy - (3 + hash(i, s) * 3) * z;
						px.line(g, xx, oy, xx + lean, yy, p.sh, z);
						px.ell(g, xx + lean, yy, 2.3 * z, 1.2 * z, p.base);
						px.dot(g, xx + lean - z, yy - z, p.lt);
						if (l.theme === 2) {
							px.ell(g, xx + lean + z, yy + z, 1.4 * z, 1.7 * z, theme.accent);
							px.dot(g, xx + lean, yy, theme.flower);
						} else if (l.theme === 4) {
							for (let q = 0; q < 4; q++) {
								const a = (q * Math.PI) / 2;
								px.ell(
									g,
									xx + lean + Math.cos(a) * 2 * z,
									yy + Math.sin(a) * 2 * z,
									1.5 * z,
									1.5 * z,
									p.base,
								);
							}
							px.ell(g, xx + lean, yy, z, z, theme.accent);
						}
					}
				});
		}
		for (let i = 0; i < 4; i++) {
			const x = (0.15 + i * 0.24) * l.w * T,
				y = l.h * T + 16 + (i % 2) * 3;
			this.rigs.spectator(r, x, y, theme, t, i);
		}
		// Warm, low lights give the raised garden a jewel-box glow without hiding the rules.
		this.game.lights.add(l.w * T * 0.23, l.h * T * 0.2, 8, 65, 0.15, {
			color: theme.accent,
		});
		this.game.lights.add(l.w * T * 0.78, l.h * T * 0.8, 8, 68, 0.13, {
			color: theme.flower,
		});
	}
	_preview(r, v, theme) {
		if (this.mode.title || this.mode.workshop) return;
		for (const p of v.players || []) {
			if (
				!p.preview ||
				p.respawn > 0 ||
				v.seeds <= 0 ||
				(v.bait || []).some((b) => b.owner === p.id)
			)
				continue;
			const [x, y] = point([p.preview.x, p.preview.y]);
			r.decal((g) => {
				const [sx, sy] = r.w(x, y),
					z = r.view.scale || 1,
					c = E.mix(theme.floorHi, theme.accent, 0.45),
					S = 5 * z;
				for (const a of [
					[-1, -1],
					[1, -1],
					[-1, 1],
					[1, 1],
				]) {
					px.line(
						g,
						sx + a[0] * S,
						sy + a[1] * S,
						sx + a[0] * (S - 2 * z),
						sy + a[1] * S,
						c,
					);
					px.line(
						g,
						sx + a[0] * S,
						sy + a[1] * S,
						sx + a[0] * S,
						sy + a[1] * (S - 2 * z),
						c,
					);
				}
				px.dot(g, sx, sy, c);
			});
		}
	}
	draw(r, v, { hud = true, debug = {}, workshop = null } = {}) {
		if (!v?.garden) return;
		const theme = THEMES[v.garden.theme] || THEMES[0],
			l = v.garden;
		this._backdrop(r, v, theme);
		this._ground(r, v, theme);
		this._dressing(r, v, theme);
		this._preview(r, v, theme);
		for (const c of v.trees || []) this.rigs.tree(r, ...point(c), theme, v.t);
		for (const b of v.bait || [])
			this.rigs.sprout(r, ...point([b.x, b.y]), theme, v.t);
		for (const w of l.wraps || []) {
			this.rigs.wrap(r, ...point(w.a), w.ad, w.label, theme, v.t);
			this.rigs.wrap(r, ...point(w.b), w.bd, w.label, theme, v.t);
		}
		for (const c of v.crawlers || []) {
			for (const b of c.body || [])
				this.rigs.drawActor(r, "segment", b, {
					key: `${c.id}:${b.index}`,
					index: b.index,
					tail: b.tail,
					theme,
				});
			this.rigs.drawActor(r, "head", c, { theme });
		}
		for (const a of v.sentries || [])
			this.rigs.drawActor(r, "sentry", a, {
				index: (v.sentries || []).indexOf(a),
				theme,
			});
		for (const a of v.players || [])
			this.rigs.drawActor(r, "hero", a, {
				index: (v.players || []).indexOf(a),
				theme,
			});
		if (Object.values(debug || {}).some(Boolean)) this._debug(r, v, debug);
		if (workshop) this._workshop(r, v, workshop);
		if (hud) this._hud(r, v, theme);
	}
	_hud(r, v, theme) {
		const W = r.W,
			H = r.H,
			portrait = H > W * 1.3;
		r.overlay((g) => {
			px.blend(g, 0.9, "normal", () => px.rect(g, 0, 0, W, 43, "#0d1c2b"));
			px.rect(g, 16, 42, W - 32, 1, E.shade(theme.wallHi, -0.3));
			const xs = [
					16,
					Math.round(W * 0.29),
					Math.round(W * 0.56),
					Math.round(W * 0.78),
				],
				labels = ["LIVES", "SCORE", "SEEDS", "TAIL"];
			labels.forEach((s, i) => {
				E.font.text(g, s, xs[i], 5, "#97aaa8", {
					outline: false,
				});
			});
			const life = `♥ ${Math.max(0, v.lives)}`,
				seed = `• ${Math.max(0, v.seeds)}`,
				tail = String(v.remaining ?? 0).padStart(2, "0");
			[life, String(v.score || 0).padStart(4, "0"), seed, tail].forEach(
				(s, i) => {
					E.font.text(
						g,
						s,
						xs[i],
						15,
						i === 0 ? "#f3abb1" : i === 2 ? "#ffce83" : "#f7ebc8",
						{ outline: false, shadow: "#08121f", scale: 2 },
					);
				},
			);
			const garden = (v.level ?? 0) + 1;
			const course =
				(v.garden.courses || 1) > 1
					? `   COURSE ${(v.wave || 0) + 1}/${v.garden.courses}`
					: "";
			E.font.text(
				g,
				fitText(`${garden} / 5  ${v.garden.name}${course}`, W - 155),
				16,
				33,
				"#b4c9c1",
				{ outline: false },
			);
			if (v.combo > 1 && v.comboLeft > 0)
				E.font.text(
					g,
					`×${v.combo} CHAIN ${Math.ceil(v.comboLeft)}s`,
					W - 116,
					33,
					theme.accent,
					{ outline: false },
				);
			else if (v.modified)
				E.font.text(g, "MODIFIED", W - 105, 33, "#dfadc2", { outline: false });
			const touch = this.game.input.touchArea?.();
			let footerX = 14,
				footerW = W - 28;
			if (touch && touch.y1 >= H - 34 && touch.y0 <= H - 5) {
				if ((touch.x0 + touch.x1) / 2 > W / 2) {
					footerW = Math.max(96, touch.x0 - footerX - 8);
				} else {
					footerX = touch.x1 + 8;
					footerW = Math.max(96, W - footerX - 14);
				}
			}
			const notice = v.noticeLeft > 0 ? v.notice : v.garden.lesson,
				lines = E.font
					.wrap(String(notice || ""), footerW - 16, { scale: 1 })
					.slice(0, 2),
				by = H - (lines.length > 1 ? 29 : 21);
			px.blend(g, 0.78, "normal", () =>
				px.rect(g, footerX, by - 5, footerW, lines.length * 10 + 8, "#0d1d2c"),
			);
			lines.forEach((s, i) => {
				E.font.text(g, s, footerX + footerW / 2, by + i * 10, theme.accent, {
					align: "center",
					outline: false,
				});
			});
			if (portrait && !this.mode.workshop) {
				const by2 = Math.min(H - 112, this.bounds.y1 + 52);
				E.font.text(g, "A LITTLE VENUSIAN GARDENING", W / 2, by2, "#a9bfb8", {
					align: "center",
					outline: false,
				});
				E.font.text(
					g,
					"Drag to steer. Bite the gold fruit.",
					W / 2,
					by2 + 17,
					"#e6d9b9",
					{ align: "center", outline: false },
				);
				E.font.text(
					g,
					"Plant a sprout. Bamboozle a beast.",
					W / 2,
					by2 + 30,
					"#c1cabc",
					{ align: "center", outline: false },
				);
			}
		});
	}
	_debug(r, v, d) {
		const z = r.view.scale || 1,
			l = v.garden;
		r.overlay((g) => {
			if (d.grid) {
				for (let x = 0; x <= l.w; x++) {
					const a = r.w(x * T, 0),
						b = r.w(x * T, l.h * T);
					px.line(g, ...a, ...b, "#65778a");
				}
				for (let y = 0; y <= l.h; y++) {
					const a = r.w(0, y * T),
						b = r.w(l.w * T, y * T);
					px.line(g, ...a, ...b, "#65778a");
				}
			}
			if (d.graph && this.graph) {
				for (const c of this.graph.floors)
					for (const e of this.graph.edges(c)) {
						const a = r.w(...point(e.a));
						if (e.wrap) {
							const b = r.w(
								point(e.a)[0] + e.dir[0] * 8,
								point(e.a)[1] + e.dir[1] * 8,
							);
							px.line(g, ...a, ...b, "#ffbf7f");
						} else if (key(e.a) < key(e.b)) {
							const b = r.w(...point(e.b));
							px.line(g, ...a, ...b, "#5ab3ab");
						}
					}
			}
			if (d.history)
				for (const c of v.crawlers || [])
					for (const h of c.history || []) {
						const e = h.edge;
						if (!e || e.wrap) continue;
						const a = r.w(...point(e.a)),
							b = r.w(...point(e.b));
						px.line(g, ...a, ...b, c.id ? "#f3a0be" : "#e8cd73");
					}
			if (d.targets)
				for (const a of [...(v.crawlers || []), ...(v.sentries || [])])
					if (a.target) {
						const p = r.w(...point(a.target)),
							from = r.w((a.x + 0.5) * T, (a.y + 0.5) * T);
						px.line(g, ...from, ...p, "#f2a96d");
						boxOutline(g, p[0] - 3, p[1] - 3, 7, 7, "#ffe8b0");
					}
			if (d.hitboxes)
				for (const a of [
					...(v.players || []),
					...(v.crawlers || []),
					...(v.sentries || []),
				]) {
					const p = r.w((a.x + 0.5) * T, (a.y + 0.5) * T),
						rad = 4.7 * z;
					boxOutline(g, p[0] - rad, p[1] - rad, rad * 2, rad * 2, "#fff2b0");
				}
		});
	}
	_workshop(r, _v, w) {
		r.overlay((g) => {
			const z = r.view.scale || 1,
				c = w.cursor || [1, 1],
				[x, y] = r.w(c[0] * T, c[1] * T),
				S = T * z;
			boxOutline(g, x + 1, y + 1, S - 2, S - 2, "#fff0ac", 2);
			for (const e of w.errors || []) {
				const p = e.cell;
				if (!p) continue;
				const a = r.w(p[0] * T, p[1] * T);
				boxOutline(g, a[0] + 2, a[1] + 2, S - 4, S - 4, "#ff9fa6", 1);
			}
			for (const p of w.route || []) {
				const a = r.w(...point(p));
				px.ell(g, a[0], a[1], 2.2 * z, 2.2 * z, "#ffda8c");
			}
			if (w.wrapPending) {
				const a = r.w(...point(w.wrapPending));
				boxOutline(g, a[0] - 4 * z, a[1] - 4 * z, 8 * z, 8 * z, "#aee9db", 1);
			}
		});
	}
	effects(e) {
		if (!e) return;
		const P = this.game.particles,
			at = [(e.x + 0.5) * T, (e.y + 0.5) * T],
			x = at[0],
			y = at[1],
			theme = THEMES[this.lastView?.garden?.theme] || THEMES[0],
			reduced = this.game.reduceMotion;
		if (e.type === "bite") {
			P.glints(x, y, 3, reduced ? 4 : 11, "#ffdc87", 13);
			P.ring(x, y, 3, 17, "#ffdc87", 0.3);
			P.text(x, y, 5, `+${e.value}`, "#fff0b5", { scale: 1, bounce: true });
			this.game.shake(1.1);
		} else if (e.type === "catch") {
			P.glints(x, y, 3, reduced ? 4 : 12, "#d7f3f0", 16);
			P.text(x, y, 7, `+${e.value}`, "#d7f3f0", { bounce: true });
		} else if (e.type === "tree") {
			P.glints(x, y, 2, 4, "#c5e9ae", 8);
			P.text(x, y, 3, "+1", "#c5e9ae");
		} else if (e.type === "hit") {
			P.bits(x, y, 3, reduced ? 6 : 16, ["#89d8ef", "#f3b2af", "#ffe2a3"]);
			P.ring(x, y, 3, 19, "#f6b8bd", 0.4);
			this.game.shake(2.5);
		} else if (e.type === "wrap") {
			P.glints(x, y, 2, reduced ? 3 : 8, theme.accent, 10);
			P.ring(x, y, 2, 10, theme.accent, 0.25);
		} else if (e.type === "plant" || e.type === "respawn") {
			P.glints(x, y, 2, reduced ? 4 : 9, "#c0e8b1", 11);
		} else if (e.type === "fright") {
			P.ring(x, y, 4, 28, "#cbe9e0", 0.5);
		} else if (e.type === "clear" || e.type === "victory") {
			const l = this.lastView?.garden;
			if (l)
				for (let i = 0; i < (reduced ? 8 : 24); i++) {
					const xx = (1 + hash(i, 7, e.id || 0) * (l.w - 2)) * T,
						yy = (1 + hash(i, 8, e.id || 0) * (l.h - 2)) * T;
					P.glints(xx, yy, 4, 4, i % 2 ? theme.accent : theme.flower, 13);
				}
		}
	}
}
