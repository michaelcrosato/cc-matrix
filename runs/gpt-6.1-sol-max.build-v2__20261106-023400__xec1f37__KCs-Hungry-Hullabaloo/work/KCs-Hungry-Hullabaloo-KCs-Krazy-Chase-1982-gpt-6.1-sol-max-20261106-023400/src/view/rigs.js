const E = globalThis.My3D2dge;
const { px } = E;
const MINT = {
	dk: "#15524e",
	base: "#61bd7c",
	lt: "#b4e28f",
	spec: "#edffd4",
	eye: "#fff7d6",
	pupil: "#172d34",
	ext: "#1b6d58",
};
const HERO = [
	{
		dk: "#174e86",
		base: "#58b5eb",
		lt: "#a4e4fb",
		spec: "#edffff",
		eye: "#fcf6dc",
		pupil: "#173344",
		ext: "#285a85",
	},
	{
		dk: "#803b60",
		base: "#ef8c91",
		lt: "#ffd2a8",
		spec: "#fff2d6",
		eye: "#fff6dc",
		pupil: "#442a45",
		ext: "#864654",
	},
];
const SENTRY = [
	{
		dk: "#693a77",
		base: "#bb7ab6",
		lt: "#ebadd4",
		spec: "#ffebda",
		eye: "#fff3d6",
		pupil: "#352440",
		ext: "#623667",
	},
	{
		dk: "#8b4f30",
		base: "#efaa56",
		lt: "#ffe198",
		spec: "#fff7c5",
		eye: "#fff8d8",
		pupil: "#413235",
		ext: "#7c4a38",
	},
];
const PALE = {
	dk: "#697e99",
	base: "#d0e3e1",
	lt: "#f9f5d7",
	spec: "#ffffff",
	eye: "#ffffff",
	pupil: "#48657c",
	ext: "#6e8b9d",
};
const GOLD = {
	dk: "#a95632",
	base: "#ffb955",
	lt: "#ffe791",
	spec: "#fff7d6",
	eye: "#ffb955",
	pupil: "#ffb955",
};
const T = 16;
const actorPoint = (a) => [(a.x + 0.5) * T, (a.y + 0.5) * T];
const dir = (a) => a.dir || [1, 0];
const discStar = (g, x, y, r, color) => {
	px.poly(
		g,
		[
			[x, y - r],
			[x + r * 0.34, y - r * 0.34],
			[x + r, y],
			[x + r * 0.34, y + r * 0.34],
			[x, y + r],
			[x - r * 0.34, y + r * 0.34],
			[x - r, y],
			[x - r * 0.34, y - r * 0.34],
		],
		color,
	);
};
function leaf(g, x, y, size, c, lean = 0) {
	const p = E.tones(c);
	px.poly(
		g,
		[
			[x, y],
			[x - size * 0.75, y - size * 0.25],
			[x - size * 0.5 + lean, y - size],
			[x + lean, y - size * 0.75],
			[x + size * 0.5, y - size * 0.7],
			[x + size * 0.5, y - size * 0.2],
		],
		p.deep,
	);
	px.poly(
		g,
		[
			[x, y - size * 0.12],
			[x - size * 0.48, y - size * 0.3],
			[x - size * 0.3 + lean, y - size * 0.82],
			[x + lean, y - size * 0.55],
			[x + size * 0.35, y - size * 0.6],
			[x + size * 0.3, y - size * 0.24],
		],
		p.base,
	);
	px.line(g, x - size * 0.3 + lean, y - size * 0.65, x, y - size * 0.12, p.lt);
}
function bead(g, x, y, r, c) {
	const p = E.tones(c);
	px.ell(g, x, y, r, r * 0.86, p.deep);
	px.ell(
		g,
		x,
		y - r * 0.12,
		Math.max(0.6, r - 0.8),
		Math.max(0.6, r * 0.7),
		p.base,
	);
	px.ell(
		g,
		x - r * 0.22,
		y - r * 0.28,
		Math.max(0.6, r * 0.45),
		Math.max(0.5, r * 0.27),
		p.lt,
	);
	px.dot(g, x - r * 0.25, y - r * 0.4, p.hi);
}

/** Native Blob springs drive every creature; adornments share its continuous pose. */
export class GardenRigs {
	constructor(game) {
		this.game = game;
		this.states = new Map();
		this.views = new Map();
		this.t = 0;
		this.view = null;
	}
	_key(kind, a, o = {}) {
		return `${kind}:${String(o.key ?? a.key ?? a.id ?? o.index ?? a.index ?? 0)}`;
	}
	_state(kind, a, o = {}) {
		const k = this._key(kind, a, o);
		let s = this.states.get(k);
		if (!s) {
			const index = Number(o.index ?? a.index ?? a.id ?? 0) || 0,
				tail = kind === "segment" && (o.tail ?? a.tail),
				colors =
					kind === "hero"
						? HERO[index % 2]
						: kind === "head"
							? MINT
							: kind === "sentry"
								? SENTRY[index % 2]
								: tail
									? GOLD
									: MINT;
			const R =
				kind === "hero"
					? 5.3
					: kind === "head"
						? 6.3
						: kind === "sentry"
							? 4.5
							: tail
								? 5.0
								: 4.65;
			const faceColors =
				kind === "segment"
					? { ...colors, eye: colors.base, pupil: colors.base }
					: colors;
			const rig = new E.Blob({
				R,
				face: "front",
				mouth: kind === "hero",
				feet: kind === "hero",
				colors: faceColors,
				charView: false,
			});
			s = {
				rig,
				index,
				kind,
				colors,
				lastX: a.x,
				lastY: a.y,
				walk: 0,
				bite: 0,
				plant: 0,
				respawn: 0,
				spin: 0,
				tail,
				seen: this.t,
			};
			this.states.set(k, s);
		}
		s.seen = this.t;
		return s;
	}
	_spriteView(view) {
		const scale = view.scale || 1,
			key = String(scale);
		let cv = this.views.get(key);
		if (!cv) {
			cv = new E.View("garden-sprite", "Garden sprite", 0, 30, scale, 0.9);
			this.views.set(key, cv);
		}
		return cv;
	}
	_tick(kind, a, dt, o = {}) {
		const s = this._state(kind, a, o),
			reduced = this.game.reduceMotion,
			dx = a.x - s.lastX,
			dy = a.y - s.lastY;
		s.lastX = a.x;
		s.lastY = a.y;
		const speed = Math.hypot(dx, dy) / Math.max(dt, 0.001);
		s.walk = Math.min(1, speed / 4);
		if (speed > 20) s.walk = 0;
		const bite = Number(a.bite) || 0,
			plant = Number(a.plant) || 0,
			spin = Number(a.spin) || 0,
			respawn = Number(a.respawn) || 0;
		if (bite > s.bite + 0.05) s.rig.kick(reduced ? -0.5 : -2.9);
		if (plant > s.plant + 0.05) s.rig.kick(reduced ? 0.5 : 2.5);
		if (spin > s.spin + 0.05) s.rig.kick(reduced ? 0.5 : 3.2);
		if (s.respawn > 0 && respawn <= 0) s.rig.kick(reduced ? 0.5 : 3.5);
		s.bite = bite;
		s.plant = plant;
		s.spin = spin;
		s.respawn = respawn;
		const chew = Number(a.chew) || 0,
			fright = Number(a.fright) || 0;
		let squash =
			kind === "segment"
				? Math.sin(this.t * 7 - s.index * 0.8) * 0.05
				: s.walk *
					Math.sin(this.t * (kind === "hero" ? 18 : 11) + s.index) *
					0.07;
		if (kind === "segment" && (a.brush || 0) > 0) squash = -0.24;
		if (kind === "head" && chew > 0) squash = Math.sin(this.t * 20) * 0.13;
		if (kind === "head" && a.warning > 0)
			squash = -0.12 + Math.sin(this.t * 16) * 0.035;
		if (kind === "sentry" && fright > 0)
			squash = Math.sin(this.t * 28 + s.index) * 0.06;
		if (kind === "hero" && ["clear", "victory"].includes(this.view?.phase))
			squash = Math.sin(this.t * 8 + s.index) * 0.13;
		if (spin > 0) squash = Math.sin(this.t * 17) * 0.1;
		if (reduced) squash *= 0.3;
		const colors = kind === "sentry" && fright > 0 ? PALE : s.colors;
		if (kind === "segment") {
			s.tail = !!(o.tail ?? a.tail);
			s.colors = s.tail ? GOLD : MINT;
			Object.assign(s.rig.C, s.colors, {
				eye: s.colors.base,
				pupil: s.colors.base,
			});
		} else Object.assign(s.rig.C, colors);
		s.rig.update(dt, {
			look: dir(a),
			walk: s.walk,
			squash,
			squint:
				(kind === "head" && a.mode === "pursue") ||
				(kind === "sentry" && spin > 0),
		});
		return s;
	}
	update(dt, view) {
		this.t += dt;
		this.view = view;
		for (const a of view?.players || [])
			this._tick("hero", a, dt, { index: (view.players || []).indexOf(a) });
		for (const a of view?.crawlers || []) {
			this._tick("head", a, dt);
			for (const b of a.body || [])
				this._tick(
					"segment",
					{
						...b,
						brush: (view.players || []).some(
							(p) => p.bump > 0 && Math.hypot(p.x - b.x, p.y - b.y) < 0.85,
						)
							? 1
							: 0,
					},
					dt,
					{
						key: `${a.id}:${b.index}`,
						index: b.index,
						tail: b.tail,
					},
				);
		}
		for (const a of view?.sentries || [])
			this._tick("sentry", { ...a, fright: a.fright ?? view.fright }, dt);
		for (const [k, s] of this.states)
			if (this.t - s.seen > 10) this.states.delete(k);
	}
	drawActor(r, kind, a, o = {}) {
		if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y)) return;
		const s = this._state(kind, a, o),
			[x, y] = actorPoint(a),
			sc = r.view.scale || 1,
			t = this.t,
			motion = this.game.reduceMotion ? 0 : 1,
			cv = this._spriteView(r.view),
			theme = o.theme || {},
			inv = Number(a.invuln) || 0;
		// Very short contact shadows stay under the actor and never masquerade as walls.
		r.shadow(
			x,
			y,
			kind === "head" ? 5.8 : kind === "segment" ? 4.2 : 4.7,
			0.3,
			"#091b29",
		);
		if (kind === "segment" && (o.tail ?? a.tail)) {
			const beat = 1 + (motion ? Math.sin(t * 5) * 0.06 : 0);
			r.groundRing(x, y, 7.0 * beat, theme.accent || "#ffdf88", 0.45);
			this.game.lights.add(x, y, 5, 23, 0.22, { color: "#ffd679" });
		}
		if (kind === "hero" && inv > 0) {
			r.groundRing(x, y, 6.7, "#c8f4ff", 0.65);
		}
		const opt = { outline: true, xray: false };
		if (kind === "hero" && inv > 0) {
			opt.flash = "#d3faff";
			opt.flashMix = 0.18 + (motion ? Math.sin(t * 10) * 0.13 : 0);
		}
		if (kind === "hero" && a.respawn > 0) {
			r.actor(
				x,
				y,
				0,
				(g, ox, oy) => {
					const p = HERO[s.index % 2];
					bead(g, ox, oy - 3 * sc, 3.4 * sc, p.base);
					leaf(g, ox, oy - 6 * sc, 4 * sc, "#b0e2ad", Math.sin(t * 8) * sc);
					for (let i = 0; i < 4; i++) {
						const q = t * 3 + (i * Math.PI) / 2;
						px.dot(
							g,
							ox + Math.cos(q) * 7 * sc,
							oy - 3 * sc + Math.sin(q) * 3 * sc,
							"#d9faff",
						);
					}
				},
				{ emissive: true },
			);
			return;
		}
		r.actor(
			x,
			y,
			0,
			(g, ox, oy) => {
				if (kind === "hero") this._hero(g, ox, oy, sc, cv, a, s, t, motion);
				else if (kind === "head")
					this._head(g, ox, oy, sc, cv, a, s, t, motion);
				else if (kind === "segment")
					this._segment(g, ox, oy, sc, cv, a, s, t, motion, o);
				else if (kind === "sentry")
					this._sentry(g, ox, oy, sc, cv, a, s, t, motion);
			},
			opt,
		);
	}
	_hero(g, x, y, k, view, a, s, t, motion) {
		const hop =
				motion * Math.max(0, Math.sin(t * 18 + s.index)) * s.walk * 0.8 * k,
			yy = y - hop;
		// A leaf cap and stubby garden boots make the keepers distinct from the bare crawler.
		s.rig.draw(g, x, yy, view);
		const cy = yy - 4.2 * k,
			capY = cy - 3.7 * k,
			lean = motion * Math.sin(t * 5 + s.index) * 0.7 * k;
		px.ell(g, x, capY, 5.1 * k, 1.8 * k, "#194e56");
		px.ell(
			g,
			x - 0.4 * k,
			capY - 0.7 * k,
			4.6 * k,
			1.3 * k,
			s.index % 2 ? "#7ba16d" : "#80ba8a",
		);
		leaf(
			g,
			x + 0.8 * k,
			capY - 0.1 * k,
			4.6 * k,
			s.index % 2 ? "#b4d288" : "#b4e7b0",
			lean,
		);
		// One warm neckerchief ties both heroes into the same gardening crew.
		px.poly(
			g,
			[
				[x - 2 * k, yy - 0.9 * k],
				[x + 2.5 * k, yy - 1.0 * k],
				[x + 1.2 * k, yy + 1.2 * k],
			],
			"#ffe2a3",
		);
		px.dot(g, x + 2 * k, yy + 0.5 * k, "#ba8b58");
		if (a.bite > 0) {
			const d = dir(a),
				mx = x + (Math.abs(d[0]) ? d[0] * 4 * k : 0),
				my = cy + 2 * k;
			px.ell(
				g,
				mx,
				my,
				2.4 * k,
				(1 + Math.min(0.8, a.bite * 2)) * k,
				"#1a3042",
			);
			px.rect(g, mx - 1 * k, my - 1 * k, 2 * k, k, "#fff5c6");
		}
		if (a.plant > 0) {
			const d = dir(a);
			px.line(
				g,
				x + d[0] * 4 * k,
				yy - 2 * k,
				x + d[0] * 7 * k,
				yy - 3 * k,
				"#fff0bd",
				Math.max(1, k),
			);
			bead(g, x + d[0] * 7 * k, yy - 3 * k, 1.2 * k, "#e7b264");
		}
		if (["clear", "victory"].includes(this.view?.phase)) {
			for (const side of [-1, 1]) {
				const wave = motion * Math.sin(t * 8 + s.index) * 1.2 * k;
				px.line(
					g,
					x + side * 4 * k,
					cy + k,
					x + side * 7 * k,
					cy - 3 * k - wave,
					"#c8edeb",
					Math.max(1, k),
				);
			}
		}
		// Idle comedy: a tiny single snore bubble, with its own gentle timing.
		if (s.walk < 0.02 && Math.floor(t + s.index) % 11 === 9) {
			px.ell(g, x + 5 * k, cy - 3 * k, 1.4 * k, 1.4 * k, "#c4e6e4");
			px.dot(g, x + 5 * k, cy - 4 * k, "#ffffff");
		}
	}
	_head(g, x, y, k, view, a, s, t, motion) {
		const d = dir(a),
			cy = y - 4.8 * k,
			warning = (a.warning || 0) > 0,
			chewing = (a.chew || 0) > 0,
			angry = a.mode === "pursue" || a.mode === "cutoff";
		const swing = motion * Math.sin(t * 8) * 0.7 * k;
		// Hooked antennae and a broad jaw retain a dangerous silhouette with zero tail segments.
		for (const side of [-1, 1]) {
			const ax = x + side * 3.7 * k,
				ay = cy - 4 * k;
			px.line(
				g,
				ax,
				ay,
				ax + side * 1.2 * k + swing,
				ay - 3 * k,
				"#184b49",
				Math.max(1, k),
			);
			bead(
				g,
				ax + side * 1.2 * k + swing,
				ay - 3 * k,
				1.1 * k,
				warning || angry ? "#ffad70" : "#bcdf92",
			);
		}
		s.rig.draw(g, x, y, view);
		// Chestnut brows, triangular danger teeth, and a dark mouth are visible regardless of color vision.
		for (const side of [-1, 1]) {
			const ex = x + side * 2.4 * k + d[0] * 0.7 * k,
				ey = cy - 0.5 * k;
			px.line(
				g,
				ex - side * 1.3 * k,
				ey - 2 * k,
				ex + side * 0.8 * k,
				ey - (warning || angry ? 0.2 : 1.1) * k,
				"#25493c",
				Math.max(1, k),
			);
		}
		const jaw = chewing
			? 1.6 + motion * Math.sin(t * 21) * 0.9
			: warning
				? 2.6
				: 1.8;
		px.ell(
			g,
			x + d[0] * 0.8 * k,
			cy + 2.8 * k,
			4.8 * k,
			(jaw + 1) * k,
			"#1b383c",
		);
		px.ell(
			g,
			x + d[0] * 0.8 * k,
			cy + 3.3 * k,
			3.5 * k,
			Math.max(0.8, jaw * 0.65) * k,
			"#663e54",
		);
		for (const side of [-1, 1])
			px.poly(
				g,
				[
					[x + (side * 2.7 - 0.8) * k, cy + 1.2 * k],
					[x + (side * 2.7 + 0.8) * k, cy + 1.2 * k],
					[x + side * 2.7 * k, cy + 3.7 * k],
				],
				"#fff0bd",
			);
		px.rect(g, x - 1 * k, cy + 3.7 * k, 2.5 * k, k, "#e99290");
		if (chewing) {
			for (let i = 0; i < 3; i++) {
				const q = t * 7 + i * 2,
					rr = (2 + i) * k;
				px.dot(
					g,
					x + Math.cos(q) * rr,
					cy + 5 * k + Math.sin(q) * 2 * k,
					"#ffd984",
				);
			}
		}
		if (warning) {
			px.poly(
				g,
				[
					[x + 7 * k, cy - 9 * k],
					[x + 10 * k, cy - 3 * k],
					[x + 4 * k, cy - 3 * k],
				],
				"#ffd47c",
			);
			px.rect(g, x + 6.5 * k, cy - 7 * k, k, 2 * k, "#3c3941");
			px.dot(g, x + 6.5 * k, cy - 4 * k, "#3c3941");
		}
	}
	_segment(g, x, y, k, view, a, s, t, motion, o) {
		const tail = !!(o.tail ?? a.tail),
			idx = o.index ?? a.index ?? s.index;
		if (tail) {
			// Ripened tail fruit: lobed, warm, leaf-topped, and marked with an animated diamond.
			const sq = s.rig.sq,
				rr = (5 - sq * 0.8) * k,
				cy = y - 2 * k - motion * Math.sin(t * 4) * 0.4 * k;
			bead(g, x - 1.4 * k, cy, rr * 0.77, "#f5a751");
			bead(g, x + 1.5 * k, cy - 0.2 * k, rr * 0.77, "#ffce70");
			px.ell(g, x, cy + 2.5 * k, 3.8 * k, 1 * k, "#cf7f45");
			leaf(
				g,
				x + 0.5 * k,
				cy - 3.2 * k,
				4 * k,
				"#9dd48b",
				motion * Math.sin(t * 5) * 0.6 * k,
			);
			px.line(
				g,
				x,
				cy - 2.7 * k,
				x - 0.8 * k,
				cy - 5 * k,
				"#7c5b3f",
				Math.max(1, k),
			);
			const rise = (motion ? Math.sin(t * 4) * 0.6 : 0) * k,
				dy = cy - 9.8 * k + rise;
			px.poly(
				g,
				[
					[x, dy - 3 * k],
					[x + 2.5 * k, dy],
					[x, dy + 3 * k],
					[x - 2.5 * k, dy],
				],
				"#a4653b",
			);
			px.poly(
				g,
				[
					[x, dy - 2 * k],
					[x + 1.5 * k, dy],
					[x, dy + 2 * k],
					[x - 1.5 * k, dy],
				],
				"#fff0bb",
			);
			px.dot(g, x, dy, "#ffffff");
		} else {
			s.rig.draw(g, x, y + 1 * k, view);
			const cy = y - 2.6 * k;
			px.ell(g, x, cy + 2 * k, 3.4 * k, 1.2 * k, "#4fa16c");
			px.line(
				g,
				x - 2 * k,
				cy - 1.8 * k,
				x + 2 * k,
				cy - 1.8 * k,
				"#acd38c",
				Math.max(1, k),
			);
			px.dot(g, x - 1.3 * k, cy + 0.5 * k, "#477e58");
			// Six soft little feet, pattering in offset waves along the train.
			const foot = motion * Math.sin(t * 15 - idx * 0.8) * 0.7 * k;
			for (const side of [-1, 1])
				for (let j = 0; j < 2; j++)
					px.ell(
						g,
						x + side * (3.7 * k + foot),
						y + (-1 + j * 2) * k,
						1.2 * k,
						0.6 * k,
						"#2d725b",
					);
		}
	}
	_sentry(g, x, y, k, view, a, s, t, motion) {
		const fright = (a.fright ?? this.view?.fright ?? 0) > 0,
			spin = (a.spin || 0) > 0,
			cy = y - 3.5 * k,
			index = s.index % 2,
			colors = fright ? PALE : s.colors;
		if (spin) {
			const q = motion ? t * 14 : 0;
			px.ell(g, x, y - 1 * k, 5.5 * k, 2.2 * k, "#64798e");
			for (let i = 0; i < 3; i++) {
				const ang = q + i * 2.1,
					rr = 4.7 * k;
				discStar(
					g,
					x + Math.cos(ang) * rr,
					cy - 3 * k + Math.sin(ang) * 2.4 * k,
					1.25 * k,
					"#fff0b8",
				);
			}
			bead(g, x, cy, 3.6 * k, colors.base);
			px.line(g, x - 2 * k, cy - 1 * k, x - k, cy, colors.pupil);
			px.line(g, x - k, cy - 1 * k, x - 2 * k, cy, colors.pupil);
			px.line(g, x + k, cy - 1 * k, x + 2 * k, cy, colors.pupil);
			px.line(g, x + 2 * k, cy - 1 * k, x + k, cy, colors.pupil);
			return;
		}
		const shake = fright ? motion * Math.sin(t * 31 + s.index) * 0.5 * k : 0,
			xx = x + shake;
		if (index === 0) {
			// The moth trails a route; tall fan wings make its outline unlike the beetle's shell.
			const flap = 0.85 + motion * Math.sin(t * (fright ? 24 : 12)) * 0.15;
			for (const side of [-1, 1]) {
				const pts = [
					[xx + side * 1.5 * k, cy - 1 * k],
					[xx + side * 8.2 * k * flap, cy - 4 * k],
					[xx + side * 7.2 * k * flap, cy + 2.8 * k],
					[xx + side * 2 * k, cy + 2 * k],
				];
				px.poly(g, pts, E.tones(colors.base).deep);
				px.poly(
					g,
					[
						[xx + side * 2 * k, cy - 0.8 * k],
						[xx + side * 6.8 * k * flap, cy - 2.5 * k],
						[xx + side * 6.3 * k * flap, cy + 1.2 * k],
						[xx + side * 2.4 * k, cy + 1.7 * k],
					],
					colors.lt,
				);
				px.dot(
					g,
					xx + side * 4.2 * k * flap,
					cy,
					fright ? "#6c8398" : "#8c4d88",
				);
			}
		} else {
			// Side legs and a split domed shell give the junction beetle its distinct wide silhouette.
			for (const side of [-1, 1])
				for (let i = 0; i < 3; i++) {
					const leg = motion * Math.sin(t * 14 + i * 1.5) * 0.6 * k;
					px.line(
						g,
						xx + side * 2.5 * k,
						cy + (-1 + i * 2) * k,
						xx + side * (5.2 * k + leg),
						cy + (-2 + i * 2.2) * k,
						colors.dk,
						Math.max(1, k),
					);
				}
		}
		s.rig.draw(g, xx, y, view);
		if (index === 1) {
			px.line(g, xx, cy - 3 * k, xx, cy - 0.5 * k, colors.dk, Math.max(1, k));
			px.dot(g, xx - 2 * k, cy - 2 * k, colors.lt);
			px.dot(g, xx + 2 * k, cy - 2 * k, colors.lt);
		}
		for (const side of [-1, 1]) {
			const ax = xx + side * 1.8 * k,
				ay = cy - 4 * k;
			px.line(
				g,
				ax,
				ay,
				ax + side * 1.1 * k,
				ay - 2.5 * k + (fright ? motion * Math.sin(t * 28) * 0.6 * k : 0),
				colors.dk,
				Math.max(1, k),
			);
			px.dot(
				g,
				ax + side * 1.1 * k,
				ay - 2.5 * k,
				fright ? "#fff7db" : colors.lt,
			);
		}
		if (fright) {
			// Big open eyes, a round gasp, and nervous sweat stay legible without a color change.
			for (const side of [-1, 1]) {
				px.rect(
					g,
					xx + side * 1.8 * k - k,
					cy - 1 * k,
					2 * k,
					3 * k,
					"#fffef0",
				);
				px.dot(g, xx + side * 1.8 * k, cy, "#4a6278");
			}
			px.ell(g, xx, cy + 3 * k, 1.1 * k, 1.3 * k, "#4a6278");
			px.poly(
				g,
				[
					[xx + 4 * k, cy - 5 * k],
					[xx + 3 * k, cy - 2 * k],
					[xx + 5 * k, cy - 2 * k],
				],
				"#bdedfa",
			);
			if ((a.fright ?? this.view?.fright ?? 0) < 1.5) {
				const beat = motion ? Math.floor(t * 3) % 3 : 1;
				for (let i = 0; i < 3; i++)
					px.rect(
						g,
						xx + (-3 + i * 3) * k,
						y + 3 * k,
						k,
						k,
						i === beat ? "#fff0ac" : "#718c9a",
					);
			}
		}
	}
	tree(r, x, y, theme = {}, t = this.t) {
		const k = r.view.scale || 1,
			motion = this.game.reduceMotion ? 0 : 1;
		r.shadow(x, y, 3.2, 0.23, "#102931");
		r.actor(x, y, 0, (g, ox, oy) => {
			const sway = motion * Math.sin(t * 2 + x * 0.1) * 0.45 * k;
			px.ell(g, ox, oy + 1 * k, 3.4 * k, 1.2 * k, "#173e40");
			px.rect(g, ox - 0.8 * k, oy - 5 * k, 1.6 * k, 5 * k, "#a48d64");
			px.ell(g, ox + sway, oy - 5.8 * k, 4.6 * k, 3.4 * k, "#315f55");
			px.ell(g, ox - 1 * k + sway, oy - 6.8 * k, 3.5 * k, 2.7 * k, "#6b9d71");
			px.ell(g, ox - 1.2 * k + sway, oy - 7.8 * k, 2.4 * k, 1.7 * k, "#acd3a0");
			bead(
				g,
				ox + 2.0 * k + sway,
				oy - 5.5 * k,
				1.25 * k,
				theme.accent || "#f5c76e",
			);
			px.dot(g, ox - 2.3 * k, oy - 6 * k, "#c8e5aa");
		});
	}
	sprout(r, x, y, theme = {}, t = this.t) {
		const k = r.view.scale || 1,
			motion = this.game.reduceMotion ? 0 : 1,
			beat = motion * Math.sin(t * 6) * 0.35;
		r.shadow(x, y, 3.2, 0.22, "#102931");
		r.groundRing(x, y, 5.8 + beat, theme.accent || "#ffce75", 0.35);
		this.game.lights.add(x, y, 2, 17, 0.18, { color: "#ffd27a" });
		r.actor(
			x,
			y,
			0,
			(g, ox, oy) => {
				px.ell(g, ox, oy, 3.6 * k, 1.6 * k, "#55444a");
				px.ell(g, ox, oy - 1 * k, 3 * k, 1.2 * k, "#a76a48");
				bead(g, ox, oy - 3 * k, 2.8 * k, "#ffce75");
				leaf(g, ox, oy - 4 * k, 3.1 * k, "#9bcc87", beat * k);
				px.dot(g, ox - k, oy - 3 * k, "#63414a");
				px.dot(g, ox + k, oy - 3 * k, "#63414a");
				px.rect(g, ox, oy - 1.4 * k, k, k, "#fff0bd");
				for (let i = 0; i < 2; i++) {
					const q = t * 2 + i * 3;
					px.dot(
						g,
						ox + Math.cos(q) * 5 * k,
						oy - 4 * k + Math.sin(q) * 3 * k,
						"#ffe7a3",
					);
				}
			},
			{ emissive: true },
		);
	}
	wrap(r, x, y, d, label, theme = {}, t = this.t) {
		const k = r.view.scale || 1,
			accent = theme.accent || "#ffd17a",
			mint = theme.wallHi || "#74baa3",
			reduced = this.game.reduceMotion;
		// The passage itself remains completely open; the mouth's lips sit beside its edge.
		r.actor(
			x,
			y,
			0,
			(g, ox, oy) => {
				const side = [-d[1], d[0]],
					ex = ox + d[0] * 5 * k,
					ey = oy + d[1] * 5 * k;
				for (const sign of [-1, 1]) {
					const ax = ex + side[0] * sign * 6 * k,
						ay = ey + side[1] * sign * 6 * k;
					bead(g, ax, ay, 1.7 * k, mint);
					px.dot(g, ax - d[0] * k, ay - d[1] * k, accent);
				}
				for (let i = 0; i < 2; i++) {
					const advance = reduced ? i * 3 : (t * 8 + i * 4) % 8,
						cx = ox + d[0] * (advance - 2) * k,
						cy = oy + d[1] * (advance - 2) * k;
					px.line(
						g,
						cx - d[0] * k - side[0] * k,
						cy - d[1] * k - side[1] * k,
						cx,
						cy,
						accent,
						Math.max(1, k),
					);
					px.line(
						g,
						cx,
						cy,
						cx - d[0] * k + side[0] * k,
						cy - d[1] * k + side[1] * k,
						accent,
						Math.max(1, k),
					);
				}
				const lx = ox + d[0] * 11 * k,
					ly = oy + d[1] * 11 * k;
				px.ell(g, lx, ly, 4.3 * k, 4.3 * k, "#173541");
				px.ell(g, lx, ly, 3.6 * k, 3.6 * k, mint);
				E.font.text(
					g,
					String(label || "A"),
					Math.round(lx),
					Math.round(ly - 2 * k),
					"#17333c",
					{
						align: "center",
						font: "tiny",
						outline: false,
						scale: Math.max(1, Math.round(k)),
					},
				);
			},
			{ emissive: true },
		);
	}
	spectator(r, x, y, theme = {}, t = this.t, index = 0) {
		const k = r.view.scale || 1,
			motion = this.game.reduceMotion ? 0 : 1,
			hop = motion * Math.max(0, Math.sin(t * 2.3 + index * 2)) * 1.2 * k,
			c = index % 3 === 0 ? "#d6b5d5" : index % 3 === 1 ? "#8dcbb5" : "#e8ba82";
		r.shadow(x, y, 3.2, 0.2, "#112b35");
		r.actor(x, y, 0, (g, ox, oy) => {
			const cy = oy - 3 * k - hop;
			// Tiny Venusian garden committee: shells, peeping eyes, and applauding fronds.
			bead(g, ox, cy, 3.2 * k, c);
			px.rect(g, ox - 2 * k, cy - k, k, 2 * k, "#2a4351");
			px.rect(g, ox + k, cy - k, k, 2 * k, "#2a4351");
			leaf(
				g,
				ox,
				cy - 2 * k,
				3 * k,
				theme.wallHi || "#80bd9e",
				motion * Math.sin(t * 3 + index) * k,
			);
			for (const side of [-1, 1])
				px.line(
					g,
					ox + side * 3 * k,
					cy + k,
					ox + side * 4 * k,
					cy + motion * Math.sin(t * 5 + index) * k,
					E.tones(c).sh,
					Math.max(1, k),
				);
		});
	}
}
