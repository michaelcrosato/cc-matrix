/* Krazy Wrap Party — deterministic, DOM-free garden rules. */
(function (root) {
	"use strict";
	const D = [
		[1, 0],
		[0, 1],
		[-1, 0],
		[0, -1],
	];
	const defaults = Object.freeze({
		playerSpeed: 5.2,
		crawlerSpeed: 3.6,
		sentrySpeed: 4.2,
		aggression: 1,
		frightDuration: 5,
		recoveryDuration: 2.5,
		chewDuration: 0.9,
		biteCooldown: 0.45,
		lives: 3,
	});
	const copy = (x) => JSON.parse(JSON.stringify(x));
	const key = (c) => c[0] + "," + c[1];
	const same = (a, b) => a[0] === b[0] && a[1] === b[1];
	const opp = (d) => [-d[0], -d[1]];
	const canon = (d) =>
		!d
			? null
			: Math.abs(d[0]) >= Math.abs(d[1])
				? d[0]
					? [Math.sign(d[0]), 0]
					: null
				: [0, Math.sign(d[1])];
	const caches = new WeakMap();
	function outward(l, c) {
		return c[0] === 0
			? [-1, 0]
			: c[0] === l.w - 1
				? [1, 0]
				: c[1] === 0
					? [0, -1]
					: c[1] === l.h - 1
						? [0, 1]
						: null;
	}
	function graph(l) {
		const signature = (l.rows || []).join("") + JSON.stringify(l.wraps || []);
		if (caches.get(l)?.signature === signature) return caches.get(l).result;
		const floor = (x, y) =>
			Number.isInteger(x) &&
			Number.isInteger(y) &&
			x >= 0 &&
			y >= 0 &&
			x < l.w &&
			y < l.h &&
			l.rows[y] &&
			l.rows[y][x] !== undefined &&
			l.rows[y][x] !== "#";
		const cells = [];
		for (let y = 0; y < l.h; y++)
			for (let x = 0; x < l.w; x++) if (floor(x, y)) cells.push([x, y]);
		const links = new Map();
		for (const p of l.wraps || [])
			for (const [a, b] of [
				[p?.a, p?.b],
				[p?.b, p?.a],
			]) {
				if (Array.isArray(a) && Array.isArray(b)) {
					const d = outward(l, a),
						o = outward(l, b);
					if (d && o)
						links.set(key(a) + ":" + key(d), {
							cell: b.slice(),
							dir: d,
							arrival: opp(o),
							wrap: true,
						});
				}
			}
		const neighbors = (c) => {
			const out = [];
			for (const d of D) {
				const x = c[0] + d[0],
					y = c[1] + d[1];
				if (floor(x, y))
					out.push({ cell: [x, y], dir: d, arrival: d, wrap: false });
				else {
					const p = links.get(key(c) + ":" + key(d));
					if (p) out.push(p);
				}
			}
			return out;
		};
		const path = (from, to, blocked) => {
			from = [Math.round(from[0]), Math.round(from[1])];
			to = [Math.round(to[0]), Math.round(to[1])];
			if (!floor(...from) || !floor(...to)) return [];
			const queue = [from],
				prev = new Map([[key(from), null]]);
			for (let i = 0; i < queue.length; i++) {
				const c = queue[i];
				if (same(c, to)) {
					const out = [];
					let k = key(c);
					while (k !== null) {
						out.push(k.split(",").map(Number));
						k = prev.get(k);
					}
					return out.reverse();
				}
				for (const n of neighbors(c)) {
					const k = key(n.cell);
					if (
						!prev.has(k) &&
						(!blocked || !blocked.has(k) || same(n.cell, to))
					) {
						prev.set(k, key(c));
						queue.push(n.cell);
					}
				}
			}
			return [];
		};
		const result = {
			floor,
			cells,
			neighbors,
			path,
			edge: (a, b) => neighbors(a).find((n) => same(n.cell, b)) || null,
		};
		caches.set(l, { signature, result });
		return result;
	}
	function makeLevel(
		id,
		name,
		w,
		h,
		bars,
		wrapRows,
		vertical,
		palette,
		segments,
		quip,
	) {
		const cells = Array.from({ length: h }, (_, y) =>
			Array.from({ length: w }, (_, x) =>
				x === 0 || y === 0 || x === w - 1 || y === h - 1 ? "#" : ".",
			),
		);
		for (const [x, y, ww, hh] of bars)
			for (let yy = y; yy < y + hh; yy++)
				for (let xx = x; xx < x + ww; xx++) cells[yy][xx] = "#";
		const wraps = [];
		for (const y of wrapRows) {
			cells[y][0] = cells[y][w - 1] = ".";
			wraps.push({ a: [0, y], b: [w - 1, y] });
		}
		for (const x of vertical) {
			cells[0][x] = cells[h - 1][x] = ".";
			wraps.push({ a: [x, 0], b: [x, h - 1] });
		}
		const l = {
			id,
			name,
			w,
			h,
			rows: cells.map((r) => r.join("")),
			wraps,
			palette,
			nursery: [1, h - 2],
			crawlers: [{ spawn: [w - 3, 1], segments: segments[0] }],
			sentries: [
				[w - 2, h - 2],
				[w - 2, Math.floor(h / 2)],
			],
			trees: [],
			quip,
		};
		if (segments.length === 2)
			l.crawlers.push({ spawn: [1, 1], segments: segments[1] });
		const g = graph(l);
		for (const c of g.cells)
			if (
				c[0] > 0 &&
				c[0] < w - 1 &&
				c[1] > 0 &&
				c[1] < h - 1 &&
				(c[0] * 7 + c[1] * 3) % 5 === 0 &&
				Math.abs(c[0] - 1) + Math.abs(c[1] - (h - 2)) > 2
			)
				l.trees.push(c);
		return l;
	}
	const levels = [
		makeLevel(
			"nursery",
			"The Nibble Nursery",
			15,
			9,
			[
				[3, 2, 3, 1],
				[9, 2, 3, 1],
				[3, 4, 3, 2],
				[8, 4, 4, 1],
			],
			[4],
			[],
			{
				ground: "#183746",
				wall: "#325d67",
				top: "#4b8280",
				accent: "#ffce70",
				leaf: "#54a878",
				sky: "#102334",
			},
			[6],
			"Small keeper. Big appetite. Appalling manners.",
		),
		makeLevel(
			"ribbons",
			"Ribbon Rift",
			17,
			11,
			[
				[3, 2, 4, 2],
				[10, 2, 4, 1],
				[3, 6, 3, 2],
				[9, 5, 4, 2],
				[9, 8, 5, 1],
			],
			[4, 8],
			[8],
			{
				ground: "#282c52",
				wall: "#55517d",
				top: "#8371a4",
				accent: "#ffc386",
				leaf: "#78a5af",
				sky: "#161b35",
			},
			[8],
			"Take the shortcut. Leave the long face behind.",
		),
		makeLevel(
			"orchard",
			"The Bait Estate",
			19,
			11,
			[
				[3, 2, 3, 2],
				[8, 2, 3, 1],
				[13, 2, 3, 3],
				[3, 6, 5, 2],
				[10, 5, 2, 3],
				[14, 7, 2, 1],
			],
			[5],
			[9],
			{
				ground: "#243a43",
				wall: "#40675a",
				top: "#70985e",
				accent: "#f5b96c",
				leaf: "#99ba59",
				sky: "#152a2d",
			},
			[9],
			"Plant a little lunch. Plot a little larceny.",
		),
		makeLevel(
			"crossing",
			"Crossed Caterwauls",
			19,
			13,
			[
				[3, 2, 4, 2],
				[10, 2, 5, 2],
				[3, 6, 3, 2],
				[8, 5, 3, 2],
				[13, 6, 3, 2],
				[5, 10, 4, 1],
				[12, 10, 3, 1],
			],
			[4, 9],
			[9],
			{
				ground: "#392d49",
				wall: "#70445f",
				top: "#a86a7f",
				accent: "#ffcf8d",
				leaf: "#b476a7",
				sky: "#271c38",
			},
			[5, 5],
			"Two tails. Two tantrums. One terrible gardener.",
		),
		makeLevel(
			"ballroom",
			"The Venus Wrap Ball",
			21,
			13,
			[
				[3, 2, 4, 2],
				[10, 2, 2, 3],
				[15, 2, 3, 2],
				[3, 6, 3, 2],
				[8, 6, 5, 1],
				[15, 6, 3, 2],
				[4, 10, 4, 1],
				[11, 9, 3, 2],
				[16, 10, 2, 1],
			],
			[4, 8, 10],
			[9, 13],
			{
				ground: "#183c4a",
				wall: "#365f79",
				top: "#639ca9",
				accent: "#ffe09b",
				leaf: "#74b59e",
				sky: "#112d3d",
			},
			[7, 7],
			"All dressed up. Everywhere to gnaw.",
		),
	];
	function validate(l) {
		const errors = [];
		if (
			!l ||
			!Number.isInteger(l.w) ||
			!Number.isInteger(l.h) ||
			l.w < 7 ||
			l.h < 7 ||
			l.w > 31 ||
			l.h > 23
		)
			return ["Garden dimensions must be 7–31 by 7–23 cells."];
		if (l.wraps != null && !Array.isArray(l.wraps))
			return ["Wraps must be an array of paired cells."];
		if (l.trees != null && !Array.isArray(l.trees))
			return ["Trees must be an array of cells."];
		if (l.crawlers != null && !Array.isArray(l.crawlers))
			return ["Crawlers must be an array."];
		if (l.sentries != null && !Array.isArray(l.sentries))
			return ["Sentries must be an array of cells."];
		if (
			!Array.isArray(l.rows) ||
			l.rows.length !== l.h ||
			l.rows.some(
				(r) => typeof r !== "string" || r.length !== l.w || /[^#.]/.test(r),
			)
		)
			return ["Rows must match the dimensions and use only # and ."];
		const g = graph(l),
			occupied = new Set();
		for (const p of l.wraps || []) {
			if (
				!p ||
				!Array.isArray(p.a) ||
				!Array.isArray(p.b) ||
				same(p.a, p.b) ||
				!outward(l, p.a) ||
				!outward(l, p.b) ||
				!g.floor(...p.a) ||
				!g.floor(...p.b)
			) {
				errors.push("Wraps need two different open boundary cells.");
				continue;
			}
			for (const c of [p.a, p.b]) {
				if (occupied.has(key(c)))
					errors.push("Each wrap mouth needs its own partner.");
				occupied.add(key(c));
			}
		}
		for (const c of g.cells)
			if (
				(c[0] === 0 || c[0] === l.w - 1 || c[1] === 0 || c[1] === l.h - 1) &&
				!occupied.has(key(c))
			)
				errors.push("Open boundary at " + key(c) + " needs a paired wrap.");
		if (!Array.isArray(l.nursery) || !g.floor(...l.nursery))
			errors.push("Place the nursery on a passage.");
		if (!l.crawlers || l.crawlers.length < 1 || l.crawlers.length > 2)
			errors.push("A garden needs one or two crawlers.");
		for (const c of l.crawlers || [])
			if (
				!c ||
				!Array.isArray(c.spawn) ||
				!g.floor(...c.spawn) ||
				!Number.isInteger(c.segments) ||
				c.segments < 1 ||
				c.segments > 16
			)
				errors.push("Each crawler needs a legal spawn and 1–16 segments.");
		if (
			!l.sentries ||
			l.sentries.length !== 2 ||
			l.sentries.some((c) => !Array.isArray(c) || !g.floor(...c))
		)
			errors.push("Place exactly two sentries on passages.");
		if ((l.trees || []).some((c) => !Array.isArray(c) || !g.floor(...c)))
			errors.push("Trees must grow on passages.");
		if (Array.isArray(l.nursery) && g.floor(...l.nursery)) {
			const seen = new Set([key(l.nursery)]),
				queue = [l.nursery];
			for (let i = 0; i < queue.length; i++)
				for (const n of g.neighbors(queue[i]))
					if (!seen.has(key(n.cell))) {
						seen.add(key(n.cell));
						queue.push(n.cell);
					}
			if (seen.size !== g.cells.length)
				errors.push("Every passage must connect to the nursery.");
			if (g.neighbors(l.nursery).length < 2)
				errors.push("Give the nursery at least two escape routes.");
			for (const c of l.crawlers || [])
				if (
					Array.isArray(c?.spawn) &&
					g.floor(...c.spawn) &&
					g.path(l.nursery, c.spawn).length < 4
				)
					errors.push(
						"Move the crawler at least three cells from the nursery.",
					);
		}
		for (const c of l.crawlers || [])
			if (Array.isArray(c?.spawn) && g.floor(...c.spawn)) {
				if (initialTrail(l, c.spawn, c.segments + 2).length < c.segments + 1)
					errors.push("Crawler needs a longer open initial path.");
			}
		return [...new Set(errors)];
	}
	function rng(s) {
		let x = s.rng | 0;
		x ^= x << 13;
		x ^= x >>> 17;
		x ^= x << 5;
		s.rng = x >>> 0;
		return s.rng / 4294967296;
	}
	function edgeArray(a, n) {
		return [
			a[0],
			a[1],
			n.cell[0],
			n.cell[1],
			n.dir[0],
			n.dir[1],
			n.arrival[0],
			n.arrival[1],
			n.wrap ? 1 : 0,
		];
	}
	function edgePoint(e, u) {
		if (!e[8])
			return { x: e[0] + (e[2] - e[0]) * u, y: e[1] + (e[3] - e[1]) * u };
		return u < 0.5
			? { x: e[0] + e[4] * u, y: e[1] + e[5] * u, wrap: true }
			: { x: e[2] - e[6] * (1 - u), y: e[3] - e[7] * (1 - u), wrap: true };
	}
	function initialTrail(l, spawn, length) {
		const g = graph(l),
			path = [spawn.slice()],
			seen = new Set([key(spawn)]);
		function search() {
			if (path.length >= length) return true;
			const choices = g
				.neighbors(path[path.length - 1])
				.filter((n) => !seen.has(key(n.cell)));
			for (const n of choices) {
				seen.add(key(n.cell));
				path.push(n.cell);
				if (search()) return true;
				path.pop();
				seen.delete(key(n.cell));
			}
			return false;
		}
		search();
		return path;
	}
	function actor(id, cell) {
		return {
			id,
			x: cell[0],
			y: cell[1],
			dir: [0, 0],
			m: { cell: cell.slice(), edge: null, u: 0, queued: null },
			invuln: 2,
			respawn: 0,
			plantHeld: false,
			actions: [],
			recent: [cell.slice()],
		};
	}
	function create(opts = {}) {
		const garden = opts.garden || 0,
			l = copy(opts.custom || levels[garden] || levels[0]),
			tuning = { ...defaults, ...opts.tuning };
		const players = Array.isArray(opts.players)
			? opts.players.map((p) => (typeof p === "object" ? p.id : p))
			: Array.from(
					{ length: Math.max(1, Math.min(2, opts.players || 1)) },
					(_, i) => i + 1,
				);
		const s = {
			version: 1,
			level: l,
			garden,
			seed: opts.seed || 271828,
			rng: opts.seed || 271828,
			tick: 0,
			time: 0,
			status: "playing",
			players: players.map((id, i) =>
				actor(id, [l.nursery[0] + i, l.nursery[1]]),
			),
			crawlers: [],
			sentries: [],
			trees: (l.trees || []).map((c) => ({ x: c[0], y: c[1] })),
			bait: [],
			lives: tuning.lives,
			seeds: 3,
			score: 0,
			combo: { count: 0, mult: 1, timer: 0 },
			damageGrace: 0,
			tuning,
			modified:
				!!opts.custom ||
				Object.keys(opts.tuning || {}).some(
					(k) => opts.tuning[k] !== defaults[k],
				),
			custom: !!opts.custom,
			events: [],
			stats: { bites: 0, catches: 0, trees: 0, wraps: 0, plants: 0, damage: 0 },
			gardenStats: { bites: 0, catches: 0, trees: 0 },
			plantResults: [],
		};
		for (let i = 0; i < l.crawlers.length; i++) {
			const def = l.crawlers[i],
				c = actor(i + 1, def.spawn),
				trail = initialTrail(l, def.spawn, def.segments + 5);
			c.segments = def.segments;
			c.totalSegments = def.segments;
			c.history = [];
			for (let j = 0; j < trail.length - 1; j++) {
				const from = trail[j + 1],
					to = trail[j],
					n = graph(l).edge(from, to);
				c.history.push(edgeArray(from, n));
			}
			c.dir = c.history.length ? [c.history[0][6], c.history[0][7]] : [1, 0];
			c.mode = "forage";
			c.modeTimer = 6 + i * 2;
			c.chew = 0;
			c.biteTimer = 0;
			c.body = [];
			c.target = null;
			s.crawlers.push(c);
			sampleBody(c);
		}
		for (let i = 0; i < 2; i++) {
			const sentry = actor(i + 1, l.sentries[i]);
			sentry.mode = "pursue";
			sentry.fright = 0;
			sentry.spin = 0;
			sentry.wake = 5.5 + i;
			sentry.target = null;
			s.sentries.push(sentry);
		}
		for (const p of s.players)
			if (!graph(l).floor(Math.round(p.x), Math.round(p.y))) {
				p.x = l.nursery[0];
				p.y = l.nursery[1];
				p.m.cell = l.nursery.slice();
			}
		checkpoint(s);
		return s;
	}
	function checkpoint(s) {
		delete s.checkpoint;
		s.checkpoint = copy(s);
	}
	function sampleBody(c) {
		const pieces = [];
		if (c.m.edge && c.m.u > 0)
			pieces.push({ e: c.m.edge, len: c.m.u, end: c.m.u });
		for (const e of c.history) pieces.push({ e, len: 1, end: 1 });
		c.body = [];
		for (let j = 1; j <= c.segments; j++) {
			let remain = j * 0.87,
				pt = { x: c.x, y: c.y };
			for (const piece of pieces) {
				if (remain <= piece.len) {
					pt = edgePoint(piece.e, piece.end - remain);
					break;
				}
				remain -= piece.len;
				pt = edgePoint(piece.e, 0);
			}
			c.body.push(pt);
		}
		c.tail = c.body[c.body.length - 1] || null;
	}
	function move(s, a, speed, choose, dt, history) {
		let travel = Math.max(0, speed * dt),
			g = graph(s.level),
			guard = 0;
		while (travel > 1e-9 && guard++ < 20) {
			if (!a.m.edge) {
				const n = choose(g, a.m.cell);
				if (!n) break;
				a.m.edge = edgeArray(a.m.cell, n);
				a.m.u = 0;
				a.dir = n.dir.slice();
			}
			const amount = Math.min(1 - a.m.u, travel);
			a.m.u += amount;
			travel -= amount;
			Object.assign(a, edgePoint(a.m.edge, a.m.u));
			if (a.m.u >= 1 - 1e-8) {
				const e = a.m.edge;
				a.m.cell = [e[2], e[3]];
				a.x = e[2];
				a.y = e[3];
				a.dir = [e[6], e[7]];
				if (history) {
					a.history.unshift(e);
					a.history.length = Math.min(a.history.length, 23);
				}
				if (e[8]) {
					s.events.push({ type: "wrap", x: a.x, y: a.y, id: a.id });
					if (s.players.includes(a)) s.stats.wraps++;
				}
				a.m.edge = null;
				a.m.u = 0;
				if (a.recent) {
					a.recent.push(a.m.cell.slice());
					if (a.recent.length > 12) a.recent.shift();
				}
			}
		}
	}
	function reverse(a, dir) {
		const e = a.m.edge;
		if (!e || dir[0] !== -e[4] || dir[1] !== -e[5]) return;
		const rev = [e[2], e[3], e[0], e[1], -e[6], -e[7], -e[4], -e[5], e[8]];
		a.m.cell = [rev[0], rev[1]];
		a.m.edge = rev;
		a.m.u = 1 - a.m.u;
		a.dir = [rev[4], rev[5]];
		Object.assign(a, edgePoint(rev, a.m.u));
	}
	function playerChoice(s, p, cmd) {
		const g = graph(s.level),
			dir = canon(cmd.dir);
		if (dir) {
			p.m.queued = dir;
			reverse(p, dir);
			p.clickTarget = null;
		} else if (cmd.target && g.floor(...cmd.target)) {
			p.clickTarget = cmd.target.slice();
		}
		return (gg, cell) => {
			let ds = p.m.queued;
			if (p.clickTarget) {
				const path = gg.path(cell, p.clickTarget);
				if (path.length > 1) ds = gg.edge(cell, path[1]).dir;
				else {
					p.clickTarget = null;
					p.dir = [0, 0];
					p.m.queued = null;
					return null;
				}
			}
			const choices = gg.neighbors(cell),
				wanted = ds && choices.find((n) => same(n.dir, ds));
			if (wanted) {
				if (p.m.queued && same(wanted.dir, p.m.queued)) p.m.queued = null;
				return wanted;
			}
			return choices.find((n) => same(n.dir, p.dir)) || null;
		};
	}
	function distance(g, a, b) {
		const p = g.path(
			[Math.round(a.x), Math.round(a.y)],
			[Math.round(b.x), Math.round(b.y)],
		);
		return p.length ? p.length - 1 : 999;
	}
	function nearest(s, a, items) {
		const g = graph(s.level);
		let best = null,
			d = Infinity;
		for (const b of items) {
			const dd = distance(g, a, b);
			if (dd < d) {
				best = b;
				d = dd;
			}
		}
		return best;
	}
	function chooseEnemy(s, a, target, flee, avoidBody) {
		return (g, cell) => {
			let ns = g.neighbors(cell);
			if (ns.length > 1) ns = ns.filter((n) => !same(n.dir, opp(a.dir)));
			if (!ns.length) return null;
			if (!target) return ns[Math.floor(rng(s) * ns.length)];
			let best = ns[0],
				score = Infinity;
			for (const n of ns) {
				let dd = distance(g, { x: n.cell[0], y: n.cell[1] }, target);
				if (flee) dd = -dd;
				if (avoidBody) {
					for (const b of a.body.slice(0, -1))
						if (Math.abs(n.cell[0] - b.x) + Math.abs(n.cell[1] - b.y) < 0.6)
							dd += 5;
				}
				dd += rng(s) * 0.3;
				if (dd < score) {
					score = dd;
					best = n;
				}
			}
			return best;
		};
	}
	function plantCell(s, p, requested) {
		const g = graph(s.level),
			cell = p.m.cell,
			ns = g.neighbors(cell);
		if (requested) return ns.find((n) => same(n.cell, requested))?.cell || null;
		return (
			ns.find((n) => same(n.dir, p.m.queued || p.dir))?.cell ||
			ns[0]?.cell ||
			null
		);
	}
	function emit(s, type, p, more = {}) {
		s.events.push({ type, x: p.x, y: p.y, ...more });
	}
	function award(s, base, type, p) {
		const value =
			type === "tree" || type === "clear" ? base : base * s.combo.mult;
		s.score += value;
		emit(s, type, p, { value, mult: s.combo.mult });
		if (type === "bite" || type === "catch") {
			s.combo.count++;
			s.combo.mult = Math.min(3, 1 + Math.floor(s.combo.count / 3));
			s.combo.timer = 6;
		}
	}
	function plant(s, p, cmd) {
		const action = cmd.actionId != null ? String(cmd.actionId) : null;
		const fresh = action ? !p.actions.includes(action) : !p.plantHeld;
		p.plantHeld = !!cmd.plant;
		if (!cmd.plant || !fresh) return;
		if (action) {
			p.actions.push(action);
			if (p.actions.length > 32) p.actions.shift();
		}
		const cell = plantCell(s, p, cmd.plantTarget);
		const accepted = !!(
			cell &&
			s.seeds > 0 &&
			p.respawn <= 0 &&
			!s.bait.some((b) => b.owner === p.id) &&
			!s.bait.some((b) => b.x === cell[0] && b.y === cell[1])
		);
		if (accepted) {
			s.seeds--;
			s.bait.push({ owner: p.id, x: cell[0], y: cell[1], age: 0 });
			s.stats.plants++;
			emit(s, "plant", { x: cell[0], y: cell[1] }, { id: p.id });
		} else emit(s, "invalid", p, { id: p.id });
		if (action) {
			s.plantResults.push({ id: p.id, actionId: action, accepted });
			if (s.plantResults.length > 24) s.plantResults.shift();
		}
	}
	function near(a, b, r) {
		return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < r * r;
	}
	function tick(s, commands, dt) {
		s.events = [];
		if (s.status !== "playing") return;
		s.tick++;
		s.time += dt;
		s.damageGrace = Math.max(0, s.damageGrace - dt);
		s.combo.timer = Math.max(0, s.combo.timer - dt);
		if (!s.combo.timer) {
			s.combo.count = 0;
			s.combo.mult = 1;
		}
		for (const p of s.players) {
			p.invuln = Math.max(0, p.invuln - dt);
			if (p.respawn > 0) {
				p.respawn = Math.max(0, p.respawn - dt);
				if (!p.respawn) {
					p.x = s.level.nursery[0];
					p.y = s.level.nursery[1];
					p.m = {
						cell: s.level.nursery.slice(),
						edge: null,
						u: 0,
						queued: null,
					};
					p.invuln = 2;
					emit(s, "respawn", p, { id: p.id });
				}
				plant(s, p, commands[p.id] || {});
				continue;
			}
			const cmd = commands[p.id] || {};
			if (!cmd.stop)
				move(s, p, s.tuning.playerSpeed, playerChoice(s, p, cmd), dt, false);
			plant(s, p, cmd);
		}
		for (const b of s.bait) b.age += dt;
		for (const c of s.crawlers) {
			c.biteTimer = Math.max(0, c.biteTimer - dt);
			c.modeTimer -= dt;
			c.chew = Math.max(0, c.chew - dt);
			if (c.chew > 0) {
				c.mode = "chew";
				sampleBody(c);
				continue;
			}
			if (c.mode === "chew") {
				c.mode = "forage";
				c.modeTimer = 4;
			}
			if (c.modeTimer <= 0) {
				c.mode = c.mode === "pursue" ? "forage" : "pursue";
				c.modeTimer = c.mode === "pursue" ? 2.1 + Math.min(s.garden, 0.8) : 7.5;
				if (c.mode === "pursue")
					emit(s, "warning", c, {
						id: c.id,
						text: "Head hunt! Find the tail.",
					});
			}
			let bait = nearest(s, c, s.bait);
			if (bait && distance(graph(s.level), c, bait) > 7) bait = null;
			const target =
				bait ||
				(c.mode === "pursue"
					? nearest(
							s,
							c,
							s.players.filter((p) => p.respawn <= 0),
						)
					: nearest(s, c, s.trees));
			c.target = target ? { x: target.x, y: target.y } : null;
			const speed =
				s.tuning.crawlerSpeed *
				(1 + s.garden * 0.035) *
				(s.players.length > 1 ? 1.025 : 1) *
				(c.segments <= 2 ? 1.035 : 1);
			move(s, c, speed, chooseEnemy(s, c, target, false, true), dt, true);
			sampleBody(c);
			const eaten = s.bait.find((b) => near(c, b, 0.52));
			if (eaten) {
				s.bait.splice(s.bait.indexOf(eaten), 1);
				c.chew = s.tuning.chewDuration;
				c.mode = "chew";
				emit(s, "chew", c, { id: c.id });
			}
			const tree = s.trees.find((t) => near(c, t, 0.35));
			if (tree) {
				s.trees.splice(s.trees.indexOf(tree), 1);
				emit(s, "treeEaten", tree);
			}
		}
		for (const a of s.sentries) {
			a.fright = Math.max(0, a.fright - dt);
			if (a.spin > 0) {
				a.spin = Math.max(0, a.spin - dt);
				a.mode = "spin";
				if (a.spin === 0) {
					a.mode = "pursue";
					emit(s, "recover", a, { id: a.id });
				}
				continue;
			}
			if (a.wake > 0) {
				a.wake -= dt;
				continue;
			}
			if (a.mode === "frightened" && a.fright === 0) {
				a.mode = "pursue";
				emit(s, "recover", a, { id: a.id });
			}
			const target = nearest(
				s,
				a,
				s.players.filter((p) => p.respawn <= 0),
			);
			let goal = target;
			if (target && a.mode !== "frightened") {
				if (a.id === 1 && target.recent.length > 4) {
					const q = target.recent[target.recent.length - 4];
					goal = { x: q[0], y: q[1] };
				}
				if (a.id === 2) {
					const g = graph(s.level),
						cell = target.m.cell;
					let q = cell;
					for (let i = 0; i < 2; i++) {
						const n = g.neighbors(q).find((n) => same(n.dir, target.dir));
						if (n) q = n.cell;
					}
					goal = { x: q[0], y: q[1] };
				}
			}
			a.target = goal ? { x: goal.x, y: goal.y } : null;
			const speed =
				s.tuning.sentrySpeed *
				(s.garden === 0 ? 0.65 : 0.78 + s.garden * 0.035) *
				(a.mode === "frightened" ? 0.68 : 1) *
				Math.max(0.35, s.tuning.aggression);
			move(
				s,
				a,
				speed,
				chooseEnemy(s, a, goal, a.mode === "frightened", false),
				dt,
				false,
			);
		}
		/* Collision policy: capture contacts, resolve dangerous hits, then surviving bites/pickups; defeat wins over clear. */
		const contacts = s.players.map((p) => ({
			p,
			head: s.crawlers.some((c) => near(p, c, 0.53)),
			sentries: s.sentries.filter((a) => near(p, a, 0.52)),
			tails: s.crawlers.filter(
				(c) => c.segments > 0 && c.tail && near(p, c.tail, 0.65),
			),
		}));
		const hurt = contacts.filter(
			(q) =>
				q.p.respawn <= 0 &&
				q.p.invuln <= 0 &&
				(q.head || q.sentries.some((a) => a.mode === "pursue" && a.wake <= 0)),
		);
		const dead = new Set();
		if (hurt.length && s.damageGrace <= 0 && !s.invulnerable) {
			s.lives = Math.max(0, s.lives - 1);
			s.stats.damage++;
			s.damageGrace = 0.85;
			for (const q of hurt) {
				dead.add(q.p.id);
				q.p.respawn = 0.65;
				emit(s, "hit", q.p, { id: q.p.id, lives: s.lives });
			}
		}
		for (const q of contacts) {
			const p = q.p;
			if (dead.has(p.id) || p.respawn > 0) continue;
			for (const c of q.tails)
				if (c.biteTimer <= 0 && c.segments > 0) {
					c.segments--;
					c.biteTimer = s.tuning.biteCooldown;
					sampleBody(c);
					s.stats.bites++;
					s.gardenStats.bites++;
					award(s, 3, "bite", p);
					for (const a of s.sentries)
						if (a.spin <= 0) {
							a.fright = s.tuning.frightDuration;
							a.mode = "frightened";
							a.wake = 0;
						}
					emit(s, "fright", p, { duration: s.tuning.frightDuration });
				}
			for (const a of q.sentries)
				if (a.mode === "frightened" && a.spin <= 0) {
					a.mode = "spin";
					a.spin = s.tuning.recoveryDuration;
					a.fright = 0;
					s.stats.catches++;
					s.gardenStats.catches++;
					award(s, 10, "catch", a);
				}
			for (let i = s.trees.length - 1; i >= 0; i--)
				if (near(p, s.trees[i], 0.45)) {
					const t = s.trees.splice(i, 1)[0];
					s.seeds = Math.min(3, s.seeds + 1);
					s.stats.trees++;
					s.gardenStats.trees++;
					award(s, 1, "tree", t);
				}
		}
		if (s.lives <= 0) {
			s.status = "defeat";
			emit(s, "defeat", s.players[0] || { x: 0, y: 0 });
		} else if (s.crawlers.every((c) => c.segments === 0)) {
			s.status = "clear";
			award(s, 20, "clear", s.players[0] || { x: 0, y: 0 });
			s.lives = Math.min(s.tuning.lives, s.lives + 1);
		}
	}
	function step(s, commands = {}, dt = 1 / 60) {
		dt = Math.min(0.25, Math.max(0, Number(dt) || 0));
		if (dt <= 1 / 60 + 1e-7) {
			tick(s, commands, dt);
			return s;
		}
		let remain = dt,
			events = [];
		while (remain > 1e-8) {
			const sub = Math.min(1 / 60, remain);
			tick(s, commands, sub);
			events.push(...s.events);
			remain -= sub;
		}
		s.events = events;
		return s;
	}
	function replace(s, n) {
		for (const k of Object.keys(s)) delete s[k];
		Object.assign(s, n);
		return s;
	}
	function next(s) {
		if (s.status !== "clear") return s;
		if (s.custom || s.garden >= levels.length - 1) {
			s.status = "victory";
			s.events = [{ type: "victory", x: 0, y: 0 }];
			return s;
		}
		const n = create({
			garden: s.garden + 1,
			players: s.players.map((p) => p.id),
			seed: s.seed,
			tuning: s.tuning,
		});
		n.score = s.score;
		n.lives = s.lives;
		n.seeds = Math.max(2, s.seeds);
		n.stats = copy(s.stats);
		n.time = s.time;
		n.modified = s.modified;
		checkpoint(n);
		return replace(s, n);
	}
	function retry(s) {
		const n = copy(
			s.checkpoint ||
				create({ garden: s.garden, players: s.players.length, seed: s.seed }),
		);
		n.modified = !!(s.modified || n.modified);
		checkpoint(n);
		return replace(s, n);
	}
	function snapshot(s) {
		return copy(s);
	}
	function restore(data) {
		const s = typeof data === "string" ? JSON.parse(data) : copy(data);
		const finite = (n) => typeof n === "number" && Number.isFinite(n);
		function valid(state, checkEntry) {
			if (
				!state ||
				state.version !== 1 ||
				validate(state.level).length ||
				!Array.isArray(state.players) ||
				state.players.length < 1 ||
				state.players.length > 2 ||
				!Array.isArray(state.crawlers) ||
				state.crawlers.length < 1 ||
				state.crawlers.length > 2 ||
				!Array.isArray(state.sentries) ||
				state.sentries.length !== 2
			)
				return false;
			const g = graph(state.level),
				coordinate = (c) =>
					Array.isArray(c) &&
					c.length === 2 &&
					c.every(Number.isInteger) &&
					g.floor(...c),
				edge = (e) =>
					Array.isArray(e) &&
					e.length === 9 &&
					e.every(finite) &&
					g.floor(e[0], e[1]) &&
					g.floor(e[2], e[3]);
			const actor = (a) =>
				a &&
				Number.isInteger(a.id) &&
				a.id > 0 &&
				finite(a.x) &&
				finite(a.y) &&
				a.x >= -1 &&
				a.y >= -1 &&
				a.x <= state.level.w &&
				a.y <= state.level.h &&
				a.m &&
				coordinate(a.m.cell) &&
				(a.m.edge === null || edge(a.m.edge)) &&
				finite(a.m.u) &&
				a.m.u >= 0 &&
				a.m.u <= 1 &&
				Array.isArray(a.dir) &&
				a.dir.length === 2 &&
				a.dir.every(Number.isInteger) &&
				Math.abs(a.dir[0]) + Math.abs(a.dir[1]) <= 1 &&
				finite(a.invuln) &&
				finite(a.respawn);
			if (
				!state.players.every(
					(a) =>
						actor(a) && Array.isArray(a.actions) && Array.isArray(a.recent),
				) ||
				new Set(state.players.map((a) => a.id)).size !== state.players.length
			)
				return false;
			if (
				!state.crawlers.every(
					(a) =>
						actor(a) &&
						Number.isInteger(a.segments) &&
						a.segments >= 0 &&
						a.segments <= 16 &&
						Array.isArray(a.history) &&
						a.history.every(edge) &&
						Array.isArray(a.body) &&
						a.body.every((p) => p && finite(p.x) && finite(p.y)) &&
						finite(a.chew) &&
						finite(a.biteTimer) &&
						["forage", "pursue", "chew"].includes(a.mode),
				)
			)
				return false;
			if (
				!state.sentries.every(
					(a) =>
						actor(a) &&
						finite(a.fright) &&
						finite(a.spin) &&
						finite(a.wake) &&
						["pursue", "frightened", "spin"].includes(a.mode),
				)
			)
				return false;
			if (
				!Array.isArray(state.trees) ||
				!state.trees.every((p) => p && coordinate([p.x, p.y])) ||
				!Array.isArray(state.bait) ||
				!state.bait.every(
					(p) => p && coordinate([p.x, p.y]) && Number.isInteger(p.owner),
				)
			)
				return false;
			if (
				!state.tuning ||
				Object.keys(defaults).some(
					(k) =>
						!finite(state.tuning[k]) ||
						state.tuning[k] < 0 ||
						state.tuning[k] > 100,
				) ||
				!Number.isInteger(state.lives) ||
				state.lives < 0 ||
				state.lives > 100 ||
				!Number.isInteger(state.seeds) ||
				state.seeds < 0 ||
				state.seeds > 3 ||
				!finite(state.score) ||
				state.score < 0 ||
				!finite(state.time) ||
				state.time < 0 ||
				!Number.isInteger(state.tick) ||
				state.tick < 0 ||
				!Number.isInteger(state.garden) ||
				state.garden < 0 ||
				state.garden >= levels.length ||
				!finite(state.rng) ||
				!finite(state.seed) ||
				!finite(state.damageGrace)
			)
				return false;
			if (
				!state.combo ||
				!["count", "mult", "timer"].every((k) => finite(state.combo[k])) ||
				!["playing", "clear", "defeat", "victory"].includes(state.status) ||
				!state.stats ||
				!state.gardenStats ||
				Object.values(state.stats).some((n) => !finite(n)) ||
				Object.values(state.gardenStats).some((n) => !finite(n)) ||
				!Array.isArray(state.events) ||
				!Array.isArray(state.plantResults)
			)
				return false;
			return !checkEntry || !state.checkpoint || valid(state.checkpoint, false);
		}
		if (!valid(s, true)) throw Error("Invalid garden snapshot");
		return s;
	}

	function removePlayer(s, id) {
		s.players = s.players.filter((p) => p.id !== id);
		s.bait = s.bait.filter((b) => b.owner !== id);
		if (s.checkpoint) {
			s.checkpoint.players = s.checkpoint.players.filter((p) => p.id !== id);
			s.checkpoint.bait = s.checkpoint.bait.filter((b) => b.owner !== id);
		}
		return s;
	}
	function bot(s, id, options = {}) {
		const p = s.players.find((p) => p.id === id);
		if (!p || p.respawn > 0 || s.status !== "playing") return {};
		const g = graph(s.level),
			cell = p.m.edge
				? p.m.u > 0.5
					? [p.m.edge[2], p.m.edge[3]]
					: p.m.cell
				: p.m.cell;
		const hazards = s.crawlers
			.map((c) => ({ x: c.x, y: c.y, r: 1.8 }))
			.concat(
				s.sentries
					.filter((a) => a.mode === "pursue" && a.wake <= 0)
					.map((a) => ({ x: a.x, y: a.y, r: 1.1 })),
			);
		const targets = s.crawlers
			.filter((c) => c.segments > 0)
			.map((c) => c.tail)
			.filter(Boolean);
		if (!targets.length) return {};
		let bestTarget = targets[0],
			bestDist = Infinity;
		for (const t of targets) {
			const d = distance(g, p, t);
			if (d < bestDist) {
				bestDist = d;
				bestTarget = t;
			}
		}
		// A deterministic weighted pathfinder routes toward the current tail while respecting current danger.
		const costs = new Map([[key(cell), 0]]),
			parent = new Map(),
			open = [cell],
			closed = new Set();
		let goal = null;
		const targetCell = [Math.round(bestTarget.x), Math.round(bestTarget.y)];
		while (open.length) {
			open.sort((a, b) => costs.get(key(a)) - costs.get(key(b)));
			const c = open.shift(),
				ck = key(c);
			if (closed.has(ck)) continue;
			closed.add(ck);
			if (same(c, targetCell)) {
				goal = c;
				break;
			}
			for (const n of g.neighbors(c)) {
				let danger = 0;
				for (const h of hazards) {
					const d = Math.hypot(n.cell[0] - h.x, n.cell[1] - h.y);
					if (d < h.r) danger += (h.r - d) * (p.invuln > 0 ? 1.5 : 18);
				}
				const cost = costs.get(ck) + 1 + danger,
					nk = key(n.cell);
				if (cost < (costs.get(nk) ?? Infinity)) {
					costs.set(nk, cost);
					parent.set(nk, c);
					open.push(n.cell);
				}
			}
		}
		let moveDir = null;
		if (goal) {
			let c = goal;
			while (parent.has(key(c)) && !same(parent.get(key(c)), cell))
				c = parent.get(key(c));
			if (!same(c, cell)) moveDir = g.edge(cell, c)?.dir || null;
		}
		if (!moveDir) {
			const ns = g.neighbors(cell);
			ns.sort((a, b) => {
				const safe = (n) =>
					hazards.reduce(
						(sum, h) =>
							sum + 1 / (0.2 + Math.hypot(n.cell[0] - h.x, n.cell[1] - h.y)),
						0,
					);
				return safe(a) - safe(b);
			});
			moveDir = ns[0]?.dir || null;
		}
		// Do not oscillate while crossing a cell. A queued turn is chosen at each arrival.
		if (p.m.edge && p.m.u < 0.78) moveDir = p.dir;

		// A short legal-motion lookahead permits emergency reversal while crossing a cell.
		// This is ordinary controller input; the world rules and enemy decisions are untouched.
		if (p.invuln <= 0.08 && s.damageGrace <= 0) {
			const dangers = s.crawlers
				.map((a) => ({
					a,
					speed: s.tuning.crawlerSpeed * (1 + s.garden * 0.035),
				}))
				.concat(
					s.sentries
						.filter((a) => a.mode === "pursue" && a.wake <= 0)
						.map((a) => ({
							a,
							speed:
								s.tuning.sentrySpeed *
								(s.garden === 0 ? 0.65 : 0.78 + s.garden * 0.035) *
								s.tuning.aggression,
						})),
				);
			function project(a, speed, t, command) {
				let cell = a.m.cell.slice(),
					e = a.m.edge && a.m.edge.slice(),
					u = a.m.u,
					dir = a.dir.slice(),
					distance = speed * t;
				if (e && command && same(command, [-e[4], -e[5]])) {
					e = [e[2], e[3], e[0], e[1], -e[6], -e[7], -e[4], -e[5], e[8]];
					u = 1 - u;
					cell = [e[0], e[1]];
					dir = [e[4], e[5]];
				}
				let guard = 0;
				while (distance > 1e-8 && guard++ < 5) {
					if (!e) {
						const ns = g.neighbors(cell),
							n =
								(command && ns.find((n) => same(n.dir, command))) ||
								ns.find((n) => same(n.dir, dir));
						if (!n) return { x: cell[0], y: cell[1] };
						e = edgeArray(cell, n);
						u = 0;
						dir = n.dir;
					}
					const amount = Math.min(1 - u, distance);
					u += amount;
					distance -= amount;
					if (u < 1 - 1e-8) return edgePoint(e, u);
					cell = [e[2], e[3]];
					dir = [e[6], e[7]];
					e = null;
					u = 0;
				}
				return e ? edgePoint(e, u) : { x: cell[0], y: cell[1] };
			}
			function clearance(dir) {
				let nearest = 100;
				for (const t of [0.07, 0.14, 0.23, 0.33]) {
					const hero = project(p, s.tuning.playerSpeed, t, dir);
					for (const h of dangers) {
						const threat = project(h.a, h.speed, t, null);
						nearest = Math.min(
							nearest,
							Math.hypot(hero.x - threat.x, hero.y - threat.y),
						);
					}
				}
				return nearest;
			}
			const initial = clearance(moveDir);
			if (initial < 0.95) {
				const options = p.m.edge
					? [p.dir, opp(p.dir)]
					: g.neighbors(cell).map((n) => n.dir);
				let best = moveDir,
					score = initial;
				for (const dir of options) {
					const value = clearance(dir);
					if (value > score + 0.08) {
						best = dir;
						score = value;
					}
				}
				moveDir = best;
			}
		}
		const plant =
			!options.noBait &&
			s.seeds > 0 &&
			!s.bait.some((b) => b.owner === p.id) &&
			s.crawlers.some((c) => distance(g, p, c) < 5) &&
			s.tick % 97 === id;
		return { dir: moveDir, plant };
	}
	const api = {
		defaults,
		levels,
		graph,
		validate,
		create,
		step,
		next,
		retry,
		snapshot,
		restore,
		bot,
		plantCell,
		removePlayer,
		cellToWorld: (c) => c * 16,
		worldToCell: (n) => n / 16,
		_sampleBody: sampleBody,
		_actor: actor,
	};
	root.GardenSim = api;
	if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
