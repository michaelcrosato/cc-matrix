const E = globalThis.My3D2dge;
export const DIRS = [
	[1, 0],
	[0, 1],
	[-1, 0],
	[0, -1],
];
export const key = (c) => c.join(",");
export const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
export const reverse = (d) => [-d[0] || 0, -d[1] || 0];
export const cell = (m) => [m.cx, m.cy];
export const worldPoint = (p) => [(p.x + 0.5) * 16, (p.y + 0.5) * 16];
export function edgePoint(e, u) {
	if (!e.wrap)
		return {
			x: e.a[0] + (e.b[0] - e.a[0]) * u,
			y: e.a[1] + (e.b[1] - e.a[1]) * u,
		};
	const c = u < 0.5 ? e.a : e.b,
		d = u < 0.5 ? e.dir : e.back,
		t = u < 0.5 ? u : 1 - u;
	return { x: c[0] + d[0] * t, y: c[1] + d[1] * t };
}
export class MazeGraph extends E.Grid {
	constructor(level) {
		super(level.w, level.h, { walkable: (x, y) => level.rows[y]?.[x] === "." });
		this.level = level;
		this.links = new Map();
		for (const w of level.wraps || []) {
			this.links.set(`${key(w.a)}/${key(w.ad)}`, {
				a: w.a,
				b: w.b,
				dir: w.ad,
				back: w.bd,
				wrap: true,
				label: w.label,
			});
			this.links.set(`${key(w.b)}/${key(w.bd)}`, {
				a: w.b,
				b: w.a,
				dir: w.bd,
				back: w.ad,
				wrap: true,
				label: w.label,
			});
		}
		this.floors = [];
		for (let y = 0; y < this.h; y++)
			for (let x = 0; x < this.w; x++)
				if (this.walk([x, y])) this.floors.push([x, y]);
		this._distances = new Map();
	}
	edge(c, d) {
		if (!d || !DIRS.some((n) => same(n, d))) return null;
		const warp = this.links.get(`${key(c)}/${key(d)}`);
		if (warp) return warp;
		const b = [c[0] + d[0], c[1] + d[1]];
		return this.walk(b)
			? { a: c.slice(), b, dir: d.slice(), back: reverse(d), wrap: false }
			: null;
	}
	edges(c) {
		return DIRS.map((d) => this.edge(c, d)).filter(Boolean);
	}
	neighbours(c) {
		return this.edges(c).map((e) => e.b);
	}
	dist(a, b) {
		return this.links.size ? 0 : super.dist(a, b);
	}
	direction(a, b) {
		return this.edges(a).find((e) => same(e.b, b))?.dir || null;
	}
	distances(from) {
		const k = key(from);
		if (this._distances.has(k)) return this._distances.get(k);
		const out = new Map([[k, 0]]),
			q = [from];
		for (let i = 0; i < q.length; i++)
			for (const n of this.neighbours(q[i]))
				if (!out.has(key(n))) {
					out.set(key(n), out.get(key(q[i])) + 1);
					q.push(n);
				}
		this._distances.set(k, out);
		return out;
	}
	distance(a, b) {
		return this.distances(a).get(key(b)) ?? 999;
	}
	nearest(c) {
		return this.floors.reduce(
			(b, n) =>
				Math.abs(n[0] - c[0]) + Math.abs(n[1] - c[1]) <
				Math.abs(b[0] - c[0]) + Math.abs(b[1] - c[1])
					? n
					: b,
			this.floors[0],
		);
	}
}
// Native GridMover extension: paired graph edges and immediate, position-preserving reversal.
export class MazeMover extends E.GridMover {
	constructor(o = {}) {
		super(o);
		this._edge = null;
		this.travel = 0;
		this.pieces = [];
	}
	update(dt, graph, want, opts = { keep: true }) {
		this.pieces = [];
		this.arrived = false;
		if (want && (want[0] || want[1])) {
			this._want = want.slice();
			if (
				this.moving &&
				same(want, reverse(this.dir)) &&
				opts.reversal !== false
			) {
				const e = this._edge;
				this._edge = {
					a: e.b.slice(),
					b: e.a.slice(),
					dir: e.back.slice(),
					back: e.dir.slice(),
					wrap: e.wrap,
					label: e.label,
				};
				this._u = 1 - this._u;
				[this.cx, this.cy] = this._edge.a;
				this._to = this._edge.b;
				this.dir =
					this._edge.wrap && this._u >= 0.5
						? reverse(this._edge.back)
						: this._edge.dir.slice();
			}
		}
		let remaining = dt * this.speed;
		for (let guard = 0; guard < 12 && remaining > 1e-10; guard++) {
			if (!this.moving) {
				const e =
					graph.edge(cell(this), this._want) ||
					(opts.keep !== false && graph.edge(cell(this), this.dir));
				if (!e) break;
				this._edge = e;
				this._to = e.b;
				this.dir = e.dir.slice();
				this._u = 0;
				this.moving = true;
				if (opts.keep === false) this._want = null;
			}
			const start = this._u,
				step = Math.min(1 - start, remaining);
			this._u += step;
			remaining -= step;
			this.travel += step;
			this.pieces.push({ edge: this._edge, u0: start, u1: this._u, ds: step });
			Object.assign(this, edgePoint(this._edge, this._u));
			if (this._edge.wrap && this._u >= 0.5) {
				this.dir = reverse(this._edge.back);
				if (start < 0.5 && same(this._want, this._edge.dir))
					this._want = this.dir.slice();
			}
			if (this._u >= 1 - 1e-9) {
				[this.cx, this.cy] = this._to;
				this.x = this.cx;
				this.y = this.cy;
				this.moving = false;
				this.arrived = true;
				if (opts.keep === false) break;
			}
		}
		return this.arrived;
	}
	place(x, y) {
		super.place(x, y);
		this._edge = null;
		this._to = null;
		this._u = 0;
		this.dir = [0, 0];
		this.pieces = [];
	}
	save() {
		return {
			cx: this.cx,
			cy: this.cy,
			x: this.x,
			y: this.y,
			speed: this.speed,
			dir: this.dir,
			moving: this.moving,
			_want: this._want,
			_to: this._to,
			_u: this._u,
			_edge: this._edge,
			travel: this.travel,
		};
	}
	static restore(s) {
		return Object.assign(new MazeMover(), s, { pieces: [] });
	}
}
export function validateLevel(l) {
	const errors = [],
		warnings = [],
		bad = (text, c = [0, 0]) => errors.push({ text, cell: c });
	if (
		l?.version !== 1 ||
		!Number.isInteger(l.w) ||
		!Number.isInteger(l.h) ||
		l.w < 9 ||
		l.h < 7 ||
		l.w > 25 ||
		l.h > 17 ||
		!Array.isArray(l.rows) ||
		l.rows.length !== l.h ||
		l.rows.some(
			(r) => typeof r !== "string" || r.length !== l.w || /[^.#]/.test(r),
		)
	) {
		bad("Use a version 1 maze, 9–25 by 7–17 cells.");
		return { ok: false, errors, warnings };
	}
	const coord = (c) =>
		Array.isArray(c) && c.length === 2 && c.every(Number.isInteger);
	if (!Array.isArray(l.wraps || [])) {
		bad("Wrap links must be an array.");
		return { ok: false, errors, warnings };
	}
	for (const w of l.wraps || [])
		if (!w || ![w.a, w.ad, w.b, w.bd].every(coord)) {
			bad("Each wrap needs two cells and two outward cardinal directions.");
			return { ok: false, errors, warnings };
		}
	if (
		!Array.isArray(l.nursery) ||
		!l.nursery.every(coord) ||
		!Array.isArray(l.sentries) ||
		!l.sentries.every(coord) ||
		!Array.isArray(l.trees) ||
		!l.trees.every(coord) ||
		!Array.isArray(l.crawlers) ||
		l.crawlers.some(
			(c) => !c || !Array.isArray(c.route) || !c.route.every(coord),
		)
	) {
		bad("Use cell pairs for all spawns, routes and trees.");
		return { ok: false, errors, warnings };
	}
	const labels = new Set();
	for (const w of l.wraps || []) {
		if (
			typeof w.label !== "string" ||
			!/^[A-Z0-9]{1,2}$/.test(w.label) ||
			labels.has(w.label)
		) {
			bad("Give each wrap pair its own one- or two-character mark.", w.a);
		}
		labels.add(w.label);
	}
	const g = new MazeGraph(l),
		used = new Set();
	for (const w of l.wraps || []) {
		for (const [c, d] of [
			[w.a, w.ad],
			[w.b, w.bd],
		]) {
			if (
				!Array.isArray(c) ||
				!Array.isArray(d) ||
				!g.walk(c) ||
				!DIRS.some((n) => same(n, d)) ||
				g.inside([c[0] + d[0], c[1] + d[1]])
			)
				bad("Wrap mouths must face outward from legal edge floor.", c);
			const k = `${key(c)}/${key(d)}`;
			if (used.has(k)) bad("Each wrap mouth needs one partner.", c);
			used.add(k);
		}
		if (same(w.a, w.b)) bad("A wrap needs two different mouths.", w.a);
	}
	for (const c of g.floors)
		if (
			(c[0] === 0 || c[1] === 0 || c[0] === l.w - 1 || c[1] === l.h - 1) &&
			!Array.from(g.links.values()).some((e) => same(e.a, c))
		)
			bad("An open edge needs a paired wrap mouth.", c);
	const nursery = l.nursery || [];
	if (nursery.length < 2 || nursery.some((c) => !g.walk(c)))
		bad("Place two nursery cells on floor.", nursery[0]);
	if (nursery.length && g.walk(nursery[0])) {
		const seen = g.distances(nursery[0]);
		if (seen.size !== g.floors.length)
			bad(
				"Every passage must connect to the nursery.",
				g.floors.find((c) => !seen.has(key(c))),
			);
		if (g.edges(nursery[0]).length < 2)
			bad("Give the nursery at least two ways out.", nursery[0]);
	}
	if (!Array.isArray(l.sentries) || l.sentries.length !== 2)
		bad("Place exactly two sentries.");
	else
		for (const c of l.sentries)
			if (!g.walk(c)) bad("A sentry must start on floor.", c);
	if (
		!Array.isArray(l.crawlers) ||
		l.crawlers.length < 1 ||
		l.crawlers.length > 2
	)
		bad("Place one or two crawlers.");
	for (const cr of l.crawlers || []) {
		const route = cr.route || [];
		if (
			!Number.isInteger(cr.segments) ||
			cr.segments < 1 ||
			cr.segments > 14 ||
			route.length < Math.ceil(cr.segments * 0.8) + 2
		)
			bad("Crawler route is too short for its tail.", route[0]);
		for (let i = 0; i < route.length; i++)
			if (
				!g.walk(route[i]) ||
				(i && !g.edges(route[i - 1]).some((e) => same(e.b, route[i])))
			)
				bad("Draw a continuous crawler route on floor.", route[i]);
		if (new Set(route.map(key)).size !== route.length)
			bad("Initial crawler route must not fold over itself.", route[0]);
		const head = route.at(-1);
		if (head && nursery.some((c) => g.distance(c, head) < 4))
			bad("Keep a head four cells from the nursery.", head);
	}
	for (const c of l.trees || [])
		if (!g.walk(c)) bad("Trees belong on reachable floor.", c);
	if (g.floors.length < 30) bad("Give your creatures at least 30 floor cells.");
	if (g.floors.some((c) => g.edges(c).length === 1))
		warnings.push("Dead ends make daring dining. Loops are kinder.");
	return { ok: !errors.length, errors, warnings };
}
