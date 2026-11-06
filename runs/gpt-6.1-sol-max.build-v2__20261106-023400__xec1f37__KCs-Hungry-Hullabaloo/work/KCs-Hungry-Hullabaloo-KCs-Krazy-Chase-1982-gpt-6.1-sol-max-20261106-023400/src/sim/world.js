import { clone, courseGarden, DEFAULTS, GARDENS } from "../content/gardens.js";
import {
	cell,
	DIRS,
	edgePoint,
	key,
	MazeGraph,
	MazeMover,
	reverse,
	same,
} from "./maze.js";
export const SNAPSHOT_VERSION = 1;
export const STEP = 1 / 120;
const SPACING = 0.82;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const near = (a, b, r) => Math.hypot(a.x - b.x, a.y - b.y) < r;
export class World {
	constructor({
		level = 0,
		players = 1,
		ids = null,
		seed = 0x48b00,
		demo = false,
		custom = null,
		tuning = null,
	} = {}) {
		this.levels = custom ? [clone(custom)] : GARDENS;
		this.custom = !!custom;
		this.tuning = { ...DEFAULTS, ...tuning };
		this.events = [];
		this.entry = null;
		this.s = {
			version: 1,
			level: clamp(level, 0, this.levels.length - 1),
			seed: seed >>> 0,
			rng: seed >>> 0,
			ids: ids || Array.from({ length: players }, (_, i) => i),
			mode: players > 1 ? "coop" : "solo",
			wave: 0,
			score: 0,
			lives: this.tuning.lives,
			seeds: 2,
			t: 0,
			totalTime: 0,
			phase: "play",
			fright: 0,
			combo: 1,
			comboLeft: 0,
			streak: 0,
			grace: 0,
			demo,
			modified: !!custom,
			stats: { bites: 0, catches: 0, trees: 0, wraps: 0, plants: 0, hits: 0 },
			gardenStats: { bites: 0, catches: 0, trees: 0 },
			notice: "",
			noticeLeft: 0,
			serial: 0,
		};
		this.enter();
	}
	random() {
		this.s.rng = (this.s.rng + 0x6d2b79f5) >>> 0;
		let a = this.s.rng;
		a = Math.imul(a ^ (a >>> 15), a | 1);
		a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
		return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
	}
	get garden() {
		return this._garden || this.levels[this.s.level];
	}
	emit(type, at = {}, more = {}) {
		const e = {
			type,
			x: at.x ?? 0,
			y: at.y ?? 0,
			...more,
			id: ++this.s.serial,
		};
		this.events.push(e);
		return e;
	}
	say(text, seconds = 3) {
		this.s.notice = text;
		this.s.noticeLeft = seconds;
	}
	enter(preserveEntry = false) {
		const s = this.s;
		this._garden = courseGarden(this.levels[s.level], s.wave);
		const l = this.garden;
		this.graph = new MazeGraph(l);
		s.phase = "play";
		s.t = 0;
		s.fright = 0;
		s.combo = 1;
		s.comboLeft = 0;
		s.streak = 0;
		s.grace = 1.3;
		s.notice = l.quip;
		s.noticeLeft = 3.6;
		if (!preserveEntry) s.gardenStats = { bites: 0, catches: 0, trees: 0 };
		s.seeds = Math.max(2, s.seeds);
		this.players = s.ids.map((id, i) => ({
			id,
			m: new MazeMover({
				cx: l.nursery[i % l.nursery.length][0],
				cy: l.nursery[i % l.nursery.length][1],
				speed: this.tuning.playerSpeed,
			}),
			invuln: 2.2,
			respawn: 0,
			bite: 0,
			plant: 0,
			bump: 0,
			trail: [],
			lastAction: null,
		}));
		this.crawlers = l.crawlers.map((c, i) => {
			const route = c.route,
				head = route.at(-1),
				m = new MazeMover({ cx: head[0], cy: head[1], speed: 3.6 });
			m.dir = this.graph.direction(route.at(-2), head) || [1, 0];
			const history = [];
			for (let j = 1; j < route.length; j++) {
				const d = this.graph.direction(route[j - 1], route[j]);
				history.push({ s: j - 1, edge: this.graph.edge(route[j - 1], d) });
			}
			return {
				id: i,
				m,
				segments: c.segments,
				history,
				distance: route.length - 1,
				cool: 0,
				chew: 0,
				mode: "forage",
				warning: 0,
				target: null,
				patrol: i,
				phase: 0,
			};
		});
		this.sentries = l.sentries.map((c, i) => ({
			id: i,
			m: new MazeMover({ cx: c[0], cy: c[1], speed: 4.2 }),
			spin: 0,
			fright: 0,
			target: null,
			warmup: 4 + i,
		}));
		this.trees = l.trees.map((c) => c.slice());
		this.bait = [];
		this.events = [];
		if (!preserveEntry) this.entry = this.snapshot(false);
		this.emit("arrival", {}, { garden: s.level });
	}
	positions(c) {
		const out = [];
		for (let i = 1; i <= c.segments; i++) {
			const at = c.distance - i * SPACING;
			let seg = c.history[0];
			for (let j = c.history.length - 1; j >= 0; j--)
				if (c.history[j].s <= at + 1e-8) {
					seg = c.history[j];
					break;
				}
			const p = seg
				? edgePoint(seg.edge, clamp(at - seg.s, 0, 1))
				: { x: c.m.x, y: c.m.y };
			out.push({ ...p, tail: i === c.segments, index: i });
		}
		return out;
	}
	nearestPlayer(m) {
		return this.players
			.filter((p) => p.respawn <= 0)
			.reduce(
				(b, p) =>
					!b ||
					this.graph.distance(cell(m), cell(p.m)) <
						this.graph.distance(cell(m), cell(b.m))
						? p
						: b,
				null,
			);
	}
	choose(m, target, { flee = false, avoid = [], reversal = false } = {}) {
		let edges = this.graph.edges(cell(m));
		if (!reversal && edges.length > 1)
			edges = edges.filter((e) => !same(e.dir, reverse(m.dir)));
		if (!edges.length) return null;
		const distance = this.graph.distances(this.graph.nearest(target));
		let best = null,
			bd = Infinity;
		for (const e of edges) {
			const d = distance.get(key(e.b)) ?? 999;
			const cost =
				(flee ? -d : d) +
				avoid.reduce(
					(n, c) =>
						n +
						(Math.abs(c.x - e.b[0]) + Math.abs(c.y - e.b[1]) < 0.65 ? 4 : 0),
					0,
				) +
				this.random() * 0.18;
			if (cost < bd) {
				bd = cost;
				best = e.dir;
			}
		}
		return best;
	}
	crawlerStep(c, dt) {
		c.cool = Math.max(0, c.cool - dt);
		c.warning = Math.max(0, c.warning - dt);
		if (c.chew > 0) {
			c.chew = Math.max(0, c.chew - dt);
			return;
		}
		const s = this.s,
			g = this.graph;
		c.m.speed =
			(3.6 + s.level * 0.12) *
			(s.ids.length > 1 ? 1.035 : 1) *
			this.tuning.crawlerSpeed *
			(c.segments <= 2 ? 1.04 : 1);
		let want = null;
		if (!c.m.moving) {
			const closest = this.nearestPlayer(c.m);
			if (!closest) return;
			const bait = this.bait
				.filter((b) => g.distance(cell(c.m), [b.x, b.y]) <= 8)
				.sort(
					(a, b) =>
						g.distance(cell(c.m), [a.x, a.y]) -
						g.distance(cell(c.m), [b.x, b.y]),
				)[0];
			const period = 14.5,
				phase = (s.t + c.id * 4) % period;
			if (bait) {
				c.mode = "bait";
				c.target = [bait.x, bait.y];
				if (same(cell(c.m), c.target)) {
					this.bait = this.bait.filter((b) => b !== bait);
					c.chew = this.tuning.chew;
					this.emit("chew", c.m, { actor: c.id });
					this.say("Mmm. Suspiciously scrumptious.", 1.7);
					return;
				}
			} else if (phase > 10 && phase < 10.9 && s.t > 8) {
				if (c.mode !== "warning") {
					this.emit("warning", c.m, { actor: c.id });
					this.say("Head hunt! Find a loop.", 1.7);
				}
				c.mode = "warning";
				c.warning = 0.9;
				c.target = cell(closest.m);
			} else if (phase >= 10.9 && s.t > 8) {
				c.mode = "pursue";
				const lead = c.id ? 2 : 0;
				c.target = g.nearest([
					closest.m.cx + closest.m.dir[0] * lead,
					closest.m.cy + closest.m.dir[1] * lead,
				]);
			} else {
				c.mode = "forage";
				if (
					!c.target ||
					g.distance(cell(c.m), c.target) < 1 ||
					!g.walk(c.target) ||
					(phase < 1 && c.phase > 1)
				) {
					const trees = this.trees.filter((t) => g.distance(cell(c.m), t) > 2);
					const choices = trees.length
						? trees
						: g.floors.filter(
								(t) => g.distance(cell(c.m), t) > Math.min(6, g.w / 2),
							);
					c.target =
						choices[Math.floor(this.random() * choices.length)] || g.floors[0];
				}
			}
			c.phase = phase;
			want = this.choose(c.m, c.target, {
				avoid: this.positions(c).slice(0, -1),
			});
			const ti = this.trees.findIndex((t) => same(t, cell(c.m)));
			if (ti >= 0) {
				this.trees.splice(ti, 1);
				c.chew = 0.18;
				this.emit("nibble", c.m, { actor: c.id });
			}
		}
		c.m.update(dt, g, want, { keep: true, reversal: false });
		for (const piece of c.m.pieces) {
			if (piece.u0 < 1e-8)
				c.history.push({ s: c.distance, edge: clone(piece.edge) });
			c.distance += piece.ds;
		}
		const minimum = c.distance - 14;
		while (c.history.length > 2 && c.history[1].s < minimum) c.history.shift();
	}
	sentryStep(w, dt) {
		const s = this.s;
		w.fright = s.fright;
		w.warmup = Math.max(0, w.warmup - dt);
		if (w.spin > 0) {
			w.spin = Math.max(0, w.spin - dt);
			if (!w.spin) this.emit("recover", w.m, { actor: w.id });
			return;
		}
		const p = this.nearestPlayer(w.m);
		if (!p) return;
		let want = null;
		w.m.speed =
			(4.2 + s.level * 0.1) *
			this.tuning.sentrySpeed *
			(s.fright > 0 ? 0.62 : 1) *
			(w.warmup > 0 ? 0.48 : 1);
		if (!w.m.moving) {
			if (s.fright > 0) w.target = cell(p.m);
			else if (w.warmup > 0 || s.t % 12 > 7 + this.tuning.aggression * 4) {
				w.target = w.id ? [this.graph.w - 2, 1] : [1, this.graph.h - 2];
			} else if (w.id === 0) {
				w.target = p.trail[Math.max(0, p.trail.length - 3)] || cell(p.m);
			} else {
				let n = cell(p.m);
				for (let i = 0; i < 3; i++) {
					const e = this.graph.edge(n, p.m.dir);
					if (!e) break;
					n = e.b;
				}
				w.target = n;
			}
			want = this.choose(w.m, w.target, { flee: s.fright > 0 });
		}
		w.m.update(dt, this.graph, want, { keep: true, reversal: false });
	}
	placement(p) {
		if (!p || p.respawn > 0) return null;
		const c = cell(p.m),
			directions = [p.m._want || p.m.dir, ...DIRS];
		for (const d of directions) {
			const e = this.graph.edge(c, d);
			if (
				e &&
				!e.wrap &&
				!this.bait.some((b) => b.x === e.b[0] && b.y === e.b[1]) &&
				!this.garden.nursery.some((n) => same(n, e.b))
			)
				return { x: e.b[0], y: e.b[1] };
		}
		return null;
	}
	plant(p, actionId = null) {
		if (actionId && p.lastAction === actionId)
			return { accepted: false, reason: "duplicate" };
		if (actionId) p.lastAction = actionId;
		const at = this.placement(p);
		if (
			this.s.phase !== "play" ||
			p.respawn > 0 ||
			!at ||
			this.s.seeds <= 0 ||
			this.bait.some((b) => b.owner === p.id)
		) {
			this.emit("invalid", p.m, { actor: p.id });
			return { accepted: false, reason: "no legal sprout" };
		}
		this.s.seeds--;
		this.bait.push({ ...at, owner: p.id });
		p.plant = 0.45;
		this.s.stats.plants++;
		this.emit("plant", at, { actor: p.id });
		return { accepted: true };
	}
	addScore(base, type, at) {
		const s = this.s;
		let value = base;
		if (type === "bite" || type === "catch") {
			if (s.comboLeft > 0) s.streak++;
			else s.streak = 1;
			s.combo = Math.min(3, 1 + Math.floor((s.streak - 1) / 3));
			s.comboLeft = 6;
			value *= s.combo;
		}
		s.score += value;
		this.emit(type, at, { value, mult: s.combo });
	}
	// Contact order is one policy: capture -> dangerous hits -> surviving bites/pickups -> defeat before clear.
	step(dt = STEP, commands = {}) {
		const s = this.s;
		if (s.phase !== "play") return;
		this.events = [];
		s.t += dt;
		s.totalTime += dt;
		s.noticeLeft = Math.max(0, s.noticeLeft - dt);
		s.grace = Math.max(0, s.grace - dt);
		const wasFright = s.fright;
		s.fright = Math.max(0, s.fright - dt);
		if (wasFright > 0 && !s.fright) this.emit("frightEnd");
		s.comboLeft = Math.max(0, s.comboLeft - dt);
		if (!s.comboLeft) {
			s.combo = 1;
			s.streak = 0;
		}
		for (const p of this.players) {
			p.invuln = Math.max(0, p.invuln - dt);
			p.bite = Math.max(0, p.bite - dt);
			p.plant = Math.max(0, p.plant - dt);
			p.bump = Math.max(0, p.bump - dt);
			if (p.respawn > 0) {
				p.respawn = Math.max(0, p.respawn - dt);
				if (!p.respawn) {
					const at =
						this.garden.nursery[
							this.players.indexOf(p) % this.garden.nursery.length
						];
					p.m.place(...at);
					p.invuln = 2.2;
					this.emit("respawn", p.m, { actor: p.id });
				}
				continue;
			}
			const cmd = commands[p.id] || {};
			p.m.speed = this.tuning.playerSpeed;
			if (cmd.stop) {
				p.m._want = null;
				p.m.dir = [0, 0];
			}
			p.m.update(dt, this.graph, cmd.dir, { keep: !cmd.stop });
			if (p.m.arrived) {
				p.trail.push(cell(p.m));
				if (p.trail.length > 10) p.trail.shift();
			}
			for (const part of p.m.pieces)
				if (part.edge.wrap && part.u0 < 0.5 && part.u1 >= 0.5) {
					this.emit("wrap", p.m, { actor: p.id });
					s.stats.wraps++;
				}
			if (cmd.plant) this.plant(p, cmd.actionId);
		}
		for (const c of this.crawlers) this.crawlerStep(c, dt);
		for (const w of this.sentries) this.sentryStep(w, dt);
		const bodies = this.crawlers.map((c) => this.positions(c));
		const active = this.players.filter((p) => p.respawn <= 0);
		const dangerous = active.filter(
			(p) =>
				p.invuln <= 0 &&
				s.grace <= 0 &&
				(this.crawlers.some((c) => near(p.m, c.m, 0.57)) ||
					this.sentries.some(
						(w) => w.spin <= 0 && s.fright <= 0 && near(p.m, w.m, 0.55),
					)),
		);
		const killed = new Set(dangerous.map((p) => p.id));
		if (dangerous.length && !s.demo && !this.invulnerable) {
			s.lives = Math.max(0, s.lives - 1);
			s.stats.hits++;
			s.grace = 0.85;
			s.comboLeft = 0;
			s.combo = 1;
			s.streak = 0;
			for (const p of dangerous) {
				p.respawn = 0.72;
				p.m._want = null;
				p.m.moving = false;
			}
			this.emit("hit", dangerous[0].m);
			this.say(
				s.lives
					? "Nursery time. Keep your chomp up!"
					: "Out of munch. Out of luck.",
				2,
			);
		}
		if (s.demo || this.invulnerable) killed.clear();
		for (const p of active) {
			if (killed.has(p.id)) continue;
			for (let i = 0; i < this.crawlers.length; i++) {
				const c = this.crawlers[i],
					body = bodies[i],
					tail = body.at(-1);
				if (tail && c.cool <= 0 && near(p.m, tail, 0.64)) {
					c.segments--;
					c.cool = this.tuning.biteCooldown;
					p.bite = 0.3;
					s.fright = this.tuning.fright;
					s.stats.bites++;
					s.gardenStats.bites++;
					this.addScore(3, "bite", tail);
					this.emit("fright", tail);
					this.say(
						c.segments
							? "Tail tasted! Catch the pale pair."
							: "Tail toast! Mind that head.",
						2.2,
					);
				} else if (
					!p.bump &&
					body.slice(0, -1).some((b) => near(p.m, b, 0.6))
				) {
					p.bump = 0.5;
					this.emit("brush", p.m, { actor: p.id });
				}
			}
			for (const w of this.sentries)
				if (w.spin <= 0 && s.fright > 0 && near(p.m, w.m, 0.62)) {
					w.spin = this.tuning.recovery;
					s.stats.catches++;
					s.gardenStats.catches++;
					this.addScore(10, "catch", w.m);
					this.say("Dizzy drat! A spinning success.", 1.5);
				}
			const ti = this.trees.findIndex((t) =>
				near(p.m, { x: t[0], y: t[1] }, 0.52),
			);
			if (ti >= 0) {
				const t = this.trees.splice(ti, 1)[0];
				s.seeds = Math.min(3, s.seeds + 1);
				s.stats.trees++;
				s.gardenStats.trees++;
				this.addScore(1, "tree", { x: t[0], y: t[1] });
			}
		}
		if (s.lives <= 0) {
			s.phase = "defeat";
			this.emit("defeat");
		} else if (this.crawlers.every((c) => c.segments <= 0)) {
			s.score += 20;
			if ((s.wave || 0) + 1 >= (this.custom ? 1 : this.garden.courses || 1))
				s.lives = Math.min(this.tuning.lives, s.lives + 1);
			s.phase = "clear";
			this.emit("clear", {}, { value: 20, garden: s.level });
		}
	}
	nextGarden() {
		if (this.s.phase !== "clear") return false;
		const courses = this.custom ? 1 : this.garden.courses || 1;
		if (this.s.wave + 1 < courses) {
			this.s.wave++;
			this.enter(true);
			return true;
		}
		this.s.wave = 0;
		if (this.s.level === this.levels.length - 1) {
			this.s.phase = "victory";
			this.emit("victory");
			return true;
		}
		this.s.level++;
		this.enter();
		return true;
	}
	retry() {
		const modified = this.s.modified;
		const entry = clone(this.entry);
		this.restore(entry);
		this.s.modified = this.s.modified || modified;
		this.events = [];
		this.s.phase = "play";
		this.say("Fresh start. Same appetite.", 2);
		this.emit("arrival", {}, { garden: this.s.level });
	}
	removePlayer(id) {
		this.players = this.players.filter((p) => p.id !== id);
		this.s.ids = this.s.ids.filter((n) => n !== id);
		this.bait = this.bait.filter((b) => b.owner !== id);
		if (this.entry) {
			this.entry.s.ids = this.entry.s.ids.filter((n) => n !== id);
			this.entry.players = this.entry.players.filter((p) => p.id !== id);
			this.entry.bait = this.entry.bait.filter((b) => b.owner !== id);
		}
		this.s.grace = Math.max(this.s.grace, 1.2);
	}
	tune(k, v) {
		if (!(k in DEFAULTS) || !Number.isFinite(v)) return;
		this.tuning[k] = v;
		this.s.modified = true;
		if (k === "lives") this.s.lives = v;
	}
	resetTuning() {
		this.tuning = { ...DEFAULTS };
		this.s.modified = true;
		this.s.lives = DEFAULTS.lives;
	}
	dev(action, arg) {
		this.s.modified = true;
		switch (action) {
			case "invulnerable":
				this.invulnerable = !this.invulnerable;
				break;
			case "refill":
				this.s.lives = this.tuning.lives;
				this.s.seeds = 3;
				break;
			case "actors":
				this.crawlers = new World({
					custom: clone(this.garden),
					players: this.s.ids.length,
					ids: this.s.ids,
					seed: this.s.seed,
					demo: true,
				}).crawlers;
				this.players.forEach((p, i) => {
					p.m.place(...this.garden.nursery[i % 2]);
					p.respawn = 0;
					p.invuln = 2;
				});
				this.sentries.forEach((w, i) => {
					w.m.place(...this.garden.sentries[i]);
					w.spin = 0;
				});
				break;
			case "garden":
				this.s.level = clamp(arg, 0, this.levels.length - 1);
				this.s.wave = 0;
				this.enter();
				this.s.modified = true;
				break;
			case "reseed":
				this.s.seed = this.s.rng = arg >>> 0;
				break;
			case "teleport": {
				const p = this.players[0];
				if (p && this.graph.walk(arg)) {
					p.m.place(...arg);
					p.invuln = 2;
				}
				break;
			}
		}
	}
	snapshot(withEntry = true) {
		return {
			version: SNAPSHOT_VERSION,
			s: clone(this.s),
			tuning: clone(this.tuning),
			custom: this.custom ? clone(this.garden) : null,
			players: this.players.map((p) => ({
				...clone({ ...p, m: null }),
				m: p.m.save(),
			})),
			crawlers: this.crawlers.map((c) => ({
				...clone({ ...c, m: null }),
				m: c.m.save(),
			})),
			sentries: this.sentries.map((w) => ({
				...clone({ ...w, m: null }),
				m: w.m.save(),
			})),
			trees: clone(this.trees),
			bait: clone(this.bait),
			entry: withEntry && this.entry ? clone(this.entry) : null,
		};
	}
	restore(snap) {
		this.invulnerable = false;
		if (snap?.version !== 1 || !snap.s || !Array.isArray(snap.players))
			throw new Error("Unsupported garden snapshot");
		this.s = clone(snap.s);
		this.tuning = { ...DEFAULTS, ...snap.tuning };
		this.custom = !!snap.custom;
		this.levels = this.custom ? [clone(snap.custom)] : GARDENS;
		this._garden = courseGarden(this.levels[this.s.level], this.s.wave || 0);
		this.graph = new MazeGraph(this.garden);
		const actors = (list) =>
			list.map((a) => ({ ...clone(a), m: MazeMover.restore(a.m) }));
		this.players = actors(snap.players);
		this.crawlers = actors(snap.crawlers);
		this.sentries = actors(snap.sentries);
		this.trees = clone(snap.trees);
		this.bait = clone(snap.bait);
		this.entry = snap.entry
			? clone(snap.entry)
			: clone({ ...snap, entry: null });
		this.events = [];
		return this;
	}
	view() {
		const s = this.s;
		const pose = (m) => ({
			x: m.x,
			y: m.y,
			dir: m.dir,
			moving: m.moving,
			edge: m._edge,
			u: m._u,
		});
		return {
			...s,
			garden: this.garden,
			remaining: this.crawlers.reduce((n, c) => n + c.segments, 0),
			players: this.players.map((p) => ({
				id: p.id,
				...pose(p.m),
				invuln: p.invuln,
				respawn: p.respawn,
				bite: p.bite,
				plant: p.plant,
				bump: p.bump,
				preview: this.placement(p),
			})),
			crawlers: this.crawlers.map((c) => ({
				id: c.id,
				...pose(c.m),
				segments: c.segments,
				mode: c.mode,
				chew: c.chew,
				warning: c.warning,
				body: this.positions(c),
				target: c.target,
				history: c.history,
			})),
			sentries: this.sentries.map((w) => ({
				id: w.id,
				...pose(w.m),
				spin: w.spin,
				fright: s.fright,
				target: w.target,
			})),
			trees: this.trees,
			bait: this.bait,
		};
	}
}
