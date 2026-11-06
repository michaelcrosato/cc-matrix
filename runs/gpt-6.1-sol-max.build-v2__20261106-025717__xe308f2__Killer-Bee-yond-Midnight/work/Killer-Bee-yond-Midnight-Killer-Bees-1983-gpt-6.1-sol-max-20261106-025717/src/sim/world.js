import {
	ARENA,
	DEFAULT_TUNING,
	STAGES,
	TUNING_SPECS,
} from "../../content/stages.js";
export const STEP = 1 / 120;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const clone = (v) => JSON.parse(JSON.stringify(v));
export function rng(seed) {
	let a = seed >>> 0;
	return () => {
		a += 0x6d2b79f5;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
export function footprint(p) {
	if (p.bees === 1) return p.focus ? 3.5 : 4.5;
	return (p.focus ? 4.2 : 7) + Math.sqrt(p.bees) * (p.focus ? 1.05 : 2.25);
}
export function circleRect(x, y, r, o) {
	return (
		Math.hypot(x - clamp(x, o.x, o.x + o.w), y - clamp(y, o.y, o.y + o.h)) <
		r - 0.001
	);
}
export function blocked(s, x, y, r, extra = null) {
	const a = ARENA;
	if (x < a.x0 + r || x > a.x1 - r || y < a.y0 + r || y > a.y1 - r) return true;
	for (const o of (s.definition || STAGES[s.stage]).obstacles)
		if (circleRect(x, y, r, o)) return true;
	for (const h of s.husks)
		if (Math.hypot(x - h.x, y - h.y) < r + h.r - 0.001) return true;
	return !!(
		extra && Math.hypot(x - extra.x, y - extra.y) < r + extra.r - 0.001
	);
}
export function freePoint(s, x, y, r, extra = null) {
	if (!blocked(s, x, y, r, extra)) return { x, y };
	for (let d = 2; d < 400; d += 2)
		for (let i = 0; i < 24; i++) {
			const a = (i * Math.PI) / 12,
				xx = clamp(x + Math.cos(a) * d, r, 384 - r),
				yy = clamp(y + Math.sin(a) * d, r, 240 - r);
			if (!blocked(s, xx, yy, r, extra)) return { x: xx, y: yy };
		}
	return null;
}
// Fixed topology lattice. Clearance is the smallest full Focus formation, plus edge safety.
export function topology(s, extra = null, r = 8) {
	const w = 48,
		h = 30,
		open = new Uint8Array(w * h);
	let total = 0,
		start = -1;
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++)
			if (!blocked(s, x * 8 + 4, y * 8 + 4, r, extra)) {
				open[y * w + x] = 1;
				total++;
				start = y * w + x;
			}
	if (start < 0) return false;
	const queue = [start];
	open[start] = 0;
	let seen = 0;
	for (let i = 0; i < queue.length; i++) {
		const p = queue[i];
		seen++;
		const x = p % w,
			y = (p / w) | 0;
		for (const q of [
			x > 0 ? p - 1 : -1,
			x < w - 1 ? p + 1 : -1,
			y > 0 ? p - w : -1,
			y < h - 1 ? p + w : -1,
		])
			if (q >= 0 && open[q]) {
				open[q] = 0;
				queue.push(q);
			}
	}
	return seen === total;
}
export function validateStages(stages = STAGES) {
	const errors = [],
		ids = new Set();
	for (let index = 0; index < stages.length; index++) {
		const a = stages[index];
		if (ids.has(a.id)) errors.push(`Duplicate stage ${a.id}`);
		ids.add(a.id);
		if (a.bounds.x1 !== 384 || a.bounds.y1 !== 240)
			errors.push(`${a.id}: unsupported bounds`);
		if (!a.schedule?.length || !a.entrances?.length)
			errors.push(`${a.id}: missing schedule or entrance`);
		if (!["all-targets", "all-targets-and-bell"].includes(a.finish))
			errors.push(`${a.id}: impossible finish`);
		for (const o of a.obstacles) {
			if (
				![o.x, o.y, o.w, o.h].every(Number.isFinite) ||
				o.w <= 0 ||
				o.h <= 0 ||
				o.x < 0 ||
				o.y < 0 ||
				o.x + o.w > 384 ||
				o.y + o.h > 240
			)
				errors.push(`${a.id}: impossible obstacle`);
		}
		for (const e of a.schedule || []) {
			if (
				!["left", "right", "bell"].includes(e.type) ||
				!Number.isFinite(e.at) ||
				e.at < 0 ||
				!a.entrances[e.entrance]
			)
				errors.push(`${a.id}: invalid schedule`);
		}
		if (
			a.finish === "all-targets-and-bell" &&
			(!a.boss || !a.schedule.some((e) => e.type === "bell"))
		)
			errors.push(`${a.id}: missing concluding target`);
		if (!topology({ stage: index, definition: a, husks: [] }))
			errors.push(`${a.id}: disconnected floor`);
	}
	return errors;
}
export function newWorld({
	seed = 4117,
	players = 1,
	stage = 0,
	assisted = false,
	tuning = {},
} = {}) {
	const s = {
		v: 1,
		seed: seed >>> 0,
		random: seed >>> 0,
		tick: 0,
		time: 0,
		stage,
		phase: "play",
		phaseT: 0,
		stageTime: 0,
		score: 0,
		streak: 0,
		assisted,
		players: [],
		targets: [],
		rivals: [],
		husks: [],
		queue: [],
		nextRival: 0,
		nextId: 1,
		eid: 0,
		events: [],
		result: null,
		checkpoint: { score: 0, streak: 0 },
		tuning: { ...DEFAULT_TUNING, ...tuning },
		dev: { invulnerable: false },
		stats: {
			kills: 0,
			rays: 0,
			zaps: 0,
			losses: 0,
			focusTicks: 0,
			contactTicks: 0,
			recoveries: 0,
			maturations: 0,
			huskNudges: 0,
			bossExposures: 0,
			bossPulses: 0,
			clears: 0,
			refills: 0,
		},
		cleared: [],
	};
	for (let i = 0; i < players; i++)
		s.players.push({
			id: i,
			x: 176 + i * 32,
			y: 125,
			bees: 12,
			charge: 1,
			focus: false,
			vx: 0,
			vy: 0,
			facing: -Math.PI / 2,
			inv: 1.5,
			lastRay: 0,
			emptyAt: 0,
			contact: false,
			lostAt: -10,
			joined: true,
			contribution: 0,
		});
	enterStage(s, stage);
	return s;
}
function random(s) {
	s.random = (Math.imul(s.random, 1664525) + 1013904223) >>> 0;
	return s.random / 4294967296;
}
export function emit(s, type, data = {}) {
	const e = { id: ++s.eid, t: s.time, type, ...data };
	s.events.push(e);
	if (s.events.length > 70) s.events.shift();
	return e;
}
export function enterStage(s, index) {
	s.stage = clamp(index, 0, 5);
	s.phase = "play";
	s.phaseT = 0;
	s.stageTime = 0;
	s.targets = [];
	s.rivals = [];
	s.husks = [];
	s.result = null;
	const d = STAGES[s.stage];
	s.queue = clone([
		...d.schedule,
		...(s.players.filter((p) => p.joined).length > 1 ? d.coOpExtra : []),
	]).sort((a, b) => a.at - b.at);
	s.nextRival = d.rivals.first;
	s.checkpoint = { score: s.score, streak: s.streak };
	for (const p of s.players) {
		const q = freePoint(
			s,
			176 + p.id * 32,
			126,
			footprint({ ...p, bees: 12, focus: false }),
		);
		Object.assign(p, q || { x: 192, y: 216 }, {
			bees: p.joined ? 12 : 0,
			charge: 1,
			focus: false,
			vx: 0,
			vy: 0,
			inv: 1.5,
			contact: false,
			emptyAt: s.tick,
		});
	}
	emit(s, "encounter", { stage: s.stage });
}
export function retry(s) {
	s.assisted = true;
	s.score = s.checkpoint.score;
	s.streak = s.checkpoint.streak;
	enterStage(s, s.stage);
}
export function restartCampaign(s) {
	const fresh = newWorld({ seed: s.seed, players: s.players.length });
	fresh.tick = s.tick;
	fresh.time = s.time;
	fresh.eid = s.eid;
	fresh.nextId = s.nextId;
	fresh.events = [];
	for (const p of fresh.players) {
		p.lastRay = s.players[p.id].lastRay;
		p.joined = s.players[p.id].joined;
	}
	enterStage(fresh, 0);
	Object.assign(s, fresh);
}
export function tune(s, key, value) {
	const a = TUNING_SPECS[key];
	if (!a || !Number.isFinite(value)) return false;
	s.tuning[key] = clamp(value, a.min, a.max);
	s.assisted = true;
	return true;
}
export function moveCircle(s, a, vx, vy, dt, r) {
	const ox = a.x,
		oy = a.y,
		parts = Math.max(1, Math.ceil((Math.hypot(vx, vy) * dt) / 3));
	for (let i = 0; i < parts; i++) {
		const dx = (vx * dt) / parts,
			dy = (vy * dt) / parts;
		if (!blocked(s, a.x + dx, a.y + dy, r)) {
			a.x += dx;
			a.y += dy;
		} else {
			if (!blocked(s, a.x + dx, a.y, r)) a.x += dx;
			if (!blocked(s, a.x, a.y + dy, r)) a.y += dy;
		}
	}
	a.x = clamp(a.x, r, 384 - r);
	a.y = clamp(a.y, r, 240 - r);
	return Math.hypot(a.x - ox, a.y - oy);
}
export function spawnTarget(s, q) {
	const d = STAGES[s.stage],
		e = d.entrances[q.entrance],
		coop = s.players.filter((p) => p.joined).length > 1,
		kind = q.type;
	const r = kind === "bell" ? 17 : 7,
		origin = kind === "bell" ? { x: 100, y: 58 } : e,
		p = freePoint(s, origin.x, origin.y, r);
	if (!p) return false;
	const hp =
		kind === "bell"
			? d.boss.health * (coop ? 1.6 : 1)
			: s.tuning.health * (coop ? 1.25 : 1);
	const t = {
		id: s.nextId++,
		type: kind,
		...p,
		r,
		hp,
		maxHp: hp,
		dir: Math.atan2(e.dy, e.dx),
		turn: kind === "right" ? 1 : -1,
		lastContact: -100,
		contrib: s.players.map(() => 0),
		warning: s.tuning.warning,
		stuck: 0,
		think: 0,
		recovering: false,
		dead: false,
		bossPhase: "move",
		bossT: 0,
		circuit: 0,
	};
	s.targets.push(t);
	emit(s, "arrival", { x: t.x, y: t.y, target: t.id, kind });
	return true;
}
export function spawnRival(s) {
	const d = STAGES[s.stage],
		offset = Math.floor(random(s) * d.entrances.length);
	for (let j = 0; j < d.entrances.length; j++) {
		const e = d.entrances[(j + offset) % d.entrances.length],
			p = freePoint(s, e.x, e.y, 9);
		if (!p || s.players.some((a) => a.bees && distance(a, p) < 40)) continue;
		const a = {
			id: s.nextId++,
			...p,
			dir: Math.atan2(e.dy, e.dx),
			r: 8,
			age: 0,
			state: 0,
			warning: s.tuning.warning,
			turn: 0,
			matureAt: -10,
			dead: false,
		};
		s.rivals.push(a);
		emit(s, "warning", { x: a.x, y: a.y });
		return true;
	}
	return false;
}
function ray(s, p) {
	if (!p.charge) {
		emit(s, "dry", { player: p.id });
		return;
	}
	p.charge = 0;
	p.emptyAt = s.tick;
	s.stats.rays++;
	emit(s, "ray", { player: p.id, x: p.x, y: p.y });
	for (const a of s.rivals)
		if (!a.dead && Math.abs(a.y - p.y) <= s.tuning.rayWidth + a.r) {
			a.dead = true;
			s.stats.zaps++;
			s.score += 25;
			emit(s, "zap", { x: a.x, y: a.y });
		}
}
function advanceTarget(s, t, dt) {
	if (t.dead) return;
	if (t.warning > 0) {
		t.warning -= dt;
		return;
	}
	if (t.type === "bell") {
		const b = STAGES[s.stage].boss;
		t.bossT += dt;
		if (t.bossPhase === "move") {
			const point = b.circuit[t.circuit],
				dx = point[0] - t.x,
				dy = point[1] - t.y,
				dd = Math.hypot(dx, dy);
			t.dir = Math.atan2(dy, dx);
			if (dd > 1)
				moveCircle(
					s,
					t,
					(dx / (dd || 1)) * 46,
					(dy / (dd || 1)) * 46,
					Math.min(dt, dd / 46),
					t.r,
				);
			if (dd < 2 || t.bossT > b.travel + 3) {
				t.bossPhase = "open";
				t.bossT = 0;
				s.stats.bossExposures++;
				emit(s, "expose", { x: t.x, y: t.y });
			}
		} else if (
			t.bossPhase === "open" &&
			t.bossT > b.expose + (s.players.length > 1 ? 1 : 0)
		) {
			t.bossPhase = "pulse";
			t.bossT = 0;
			emit(s, "pulse-warning", { x: t.x, y: t.y });
		} else if (t.bossPhase === "pulse" && t.bossT > b.pulse) {
			s.stats.bossPulses++;
			for (const p of s.players)
				if (p.bees && distance(p, t) < 95) {
					const a = Math.atan2(p.y - t.y, p.x - t.x);
					moveCircle(
						s,
						p,
						Math.cos(a) * 130,
						Math.sin(a) * 130,
						0.3,
						footprint(p),
					);
				}
			emit(s, "pulse", { x: t.x, y: t.y });
			t.bossPhase = "move";
			t.bossT = 0;
			t.circuit = (t.circuit + 1) % b.circuit.length;
		}
		return;
	}
	t.think -= dt;
	const near = s.players
		.filter((p) => p.bees)
		.sort((a, b) => distance(a, t) - distance(b, t))[0];
	// Only reconsider a route on a discrete beat, so the turn preference remains visible.
	if (t.think <= 0) {
		t.think = 2.6;
		if (near && distance(near, t) < 60 && s.stageTime - t.lastContact > 0.1)
			t.dir += (t.turn * Math.PI) / 2;
	}
	const weakening = clamp(t.hp / t.maxHp, 0.15, 1),
		speed = (29 + s.stage * 1.6) * weakening;
	const d = moveCircle(
		s,
		t,
		Math.cos(t.dir) * speed,
		Math.sin(t.dir) * speed,
		dt,
		t.r,
	);
	if (d < speed * dt * 0.4) {
		t.stuck += dt;
		t.dir += (t.turn * Math.PI) / 2;
		if (t.stuck > 0.4) {
			t.dir -= t.turn * Math.PI;
		}
	} else t.stuck = Math.max(0, t.stuck - dt * 2);
	// Congestion fallback: a visibly hesitating, uncontacted target walks to its nearest legal point.
	if (t.stuck > 1.5 && s.stageTime - t.lastContact > 1) {
		const p = freePoint(s, t.x, t.y, t.r + 1);
		if (p) {
			t.x = p.x;
			t.y = p.y;
			t.dir += Math.PI;
			s.stats.huskNudges++;
			emit(s, "unstuck", { x: t.x, y: t.y });
		}
		t.stuck = 0;
	}
}
function angDiff(a, b) {
	return ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}
function advanceRival(s, a, dt) {
	if (a.dead) return;
	if (a.warning > 0) {
		a.warning -= dt;
		return;
	}
	a.age += dt;
	const d = STAGES[s.stage].rivals,
		stage =
			a.age > d.hunter * s.tuning.maturation
				? 2
				: a.age > d.guard * s.tuning.maturation
					? 1
					: 0;
	if (stage !== a.state) {
		a.state = stage;
		a.matureAt = s.time;
		s.stats.maturations++;
		emit(s, "mature", { x: a.x, y: a.y, state: stage });
	}
	let desired = a.dir;
	if (stage === 2) {
		const p = s.players
			.filter((p) => p.bees)
			.sort((x, y) => distance(x, a) - distance(y, a))[0];
		if (p) desired = Math.atan2(p.y - a.y, p.x - a.x);
	} else if (stage === 1) {
		const t = s.targets
			.filter((t) => !t.dead && t.warning <= 0)
			.sort((x, y) => distance(x, a) - distance(y, a))[0];
		if (t) {
			const orbit = a.age * 0.8 + a.id;
			desired = Math.atan2(
				t.y + Math.sin(orbit) * 25 - a.y,
				t.x + Math.cos(orbit) * 25 - a.x,
			);
		}
	} else {
		a.turn -= dt;
		if (a.turn <= 0) {
			a.turn = 1.3 + random(s) * 1.5;
			desired = a.dir + (random(s) - 0.5) * 2;
		}
		a.want = desired;
	}
	if (stage === 0) desired = a.want ?? desired;
	a.dir += clamp(
		angDiff(a.dir, desired),
		-dt * (stage === 2 ? 2.7 : 3.5),
		dt * (stage === 2 ? 2.7 : 3.5),
	);
	const pressure = 1 + Math.min(0.24, s.stageTime / 600),
		speed =
			d.speed *
			s.tuning.hunterSpeed *
			(stage === 0 ? 0.42 : stage === 1 ? 0.62 : 1) *
			pressure;
	// Rival insects can fly above the beds/shells; the friendly swarm must navigate them.
	a.x += Math.cos(a.dir) * speed * dt;
	a.y += Math.sin(a.dir) * speed * dt;
	if (a.x < 10 || a.x > 374) {
		a.x = clamp(a.x, 10, 374);
		a.dir = Math.PI - a.dir;
		a.want = a.dir;
	}
	if (a.y < 10 || a.y > 230) {
		a.y = clamp(a.y, 10, 230);
		a.dir = -a.dir;
		a.want = a.dir;
	}
}
function placeHusk(s, t) {
	const h = {
		id: t.id,
		x: t.x,
		y: t.y,
		r: t.type === "bell" ? 17 : 10.5,
		type: t.type,
		born: s.time,
	};
	for (const r of [h.r, 8, 6, 4, 2]) {
		h.r = r;
		if (topology(s, h)) break;
	}
	s.husks.push(h);
	for (const p of s.players)
		if (p.bees && blocked(s, p.x, p.y, footprint(p))) {
			const q = freePoint(s, p.x, p.y, footprint(p));
			if (q) {
				Object.assign(p, q);
				p.inv = Math.max(p.inv, 0.35);
				emit(s, "shell-push", { player: p.id, x: p.x, y: p.y });
			}
		}
	for (const a of s.targets)
		if (a !== t && !a.dead && blocked(s, a.x, a.y, a.r)) {
			a.stuck = 1.2;
			const q = freePoint(s, a.x, a.y, a.r);
			if (q) {
				a.escape = q;
			}
		}
}
function killTarget(s, t) {
	if (t.dead) return;
	t.dead = true;
	s.stats.kills++;
	const points = t.type === "bell" ? 1500 : 200 + s.stage * 25;
	s.score += points;
	const candidates = s.players.filter(
		(p) => p.bees > 0 && p.joined && !p.charge,
	);
	const contributors = candidates
		.filter((p) => (t.contrib[p.id] || 0) > 0)
		.sort(
			(a, b) => (t.contrib[b.id] || 0) - (t.contrib[a.id] || 0) || a.id - b.id,
		);
	const receiver =
		contributors[0] ||
		candidates.sort((a, b) => a.emptyAt - b.emptyAt || a.id - b.id)[0];
	if (receiver) {
		receiver.charge = 1;
		s.stats.refills++;
		emit(s, "charge", { player: receiver.id });
	}
	for (const p of s.players) p.contribution += t.contrib[p.id] || 0;
	placeHusk(s, t);
	emit(s, "collapse", { target: t.id, x: t.x, y: t.y, points, kind: t.type });
}
function complete(s) {
	s.stats.clears++;
	const survivors = s.players.reduce((n, p) => n + p.bees, 0),
		perfect = s.players.filter((p) => p.joined).every((p) => p.bees === 12);
	s.streak = perfect ? s.streak + 1 : 0;
	const bonus = survivors * 10 * (1 + s.streak);
	s.score += bonus;
	s.result = { stage: s.stage, survivors, perfect, bonus, streak: s.streak };
	s.cleared.push(clone(s.result));
	s.rivals = [];
	s.phase = "result";
	s.phaseT = 0;
	emit(s, "clear", { ...s.result, score: s.score });
}
// Order: validate/consume action counters -> spend rays -> move -> sting -> target deaths/refills
// -> rival contact -> schedule/entrance warnings -> wipe or completion. Spending precedes refill in the same tick.
export function step(s, commands = [], dt = STEP) {
	if (!Number.isFinite(dt) || dt <= 0) return;
	s.tick++;
	s.time += dt;
	s.phaseT += dt;
	if (s.phase === "result") {
		if (s.phaseT >= 4) {
			if (s.stage === 5) {
				s.phase = "ending";
				s.phaseT = 0;
				emit(s, "victory", { score: s.score });
			} else enterStage(s, s.stage + 1);
		}
		return;
	}
	if (s.phase !== "play") return;
	s.stageTime += dt;
	const d = STAGES[s.stage],
		u = s.tuning;
	for (const p of s.players) {
		p.contact = false;
		p.inv = Math.max(0, p.inv - dt);
		if (!p.bees || !p.joined) continue;
		const c = commands[p.id] || {},
			x = Number.isFinite(c.x) ? clamp(c.x, -1, 1) : 0,
			y = Number.isFinite(c.y) ? clamp(c.y, -1, 1) : 0,
			n = Math.max(1, Math.hypot(x, y));
		const rayCount = Number.isSafeInteger(c.ray) ? c.ray : p.lastRay;
		if (rayCount > p.lastRay && rayCount <= p.lastRay + 16) {
			p.lastRay = rayCount;
			ray(s, p);
		}
		const oldR = footprint(p);
		p.focus = !!c.focus;
		if (!p.focus && oldR < footprint(p) && blocked(s, p.x, p.y, footprint(p))) {
			const q = freePoint(s, p.x, p.y, footprint(p));
			if (q) Object.assign(p, q);
		}
		if (p.focus) s.stats.focusTicks++;
		const sp = u.speed * (p.focus ? u.focusMove : 1);
		p.vx = (x / n) * sp;
		p.vy = (y / n) * sp;
		if (Math.hypot(x, y) > 0.05) p.facing = Math.atan2(y, x);
		moveCircle(s, p, p.vx, p.vy, dt, footprint(p));
	}
	for (const t of s.targets) advanceTarget(s, t, dt);
	for (const a of s.rivals) advanceRival(s, a, dt);
	const deaths = [];
	for (const t of s.targets) {
		if (t.dead || t.warning > 0) continue;
		let damage = 0;
		const vulnerable = t.type !== "bell" || t.bossPhase === "open";
		if (vulnerable)
			for (const p of s.players)
				if (p.bees > 0 && p.joined && distance(p, t) < footprint(p) + t.r) {
					const rate = u.sting * (p.bees / 12) * (p.focus ? u.focusPower : 1),
						hit = rate * dt;
					t.contrib[p.id] = (t.contrib[p.id] || 0) + hit;
					damage += hit;
					p.contact = true;
					s.stats.contactTicks++;
				}
		if (damage) {
			t.hp = Math.max(0, t.hp - damage);
			t.lastContact = s.stageTime;
			t.recovering = false;
		} else if (
			t.hp < t.maxHp &&
			s.stageTime - t.lastContact > u.recoveryDelay
		) {
			if (!t.recovering) {
				s.stats.recoveries++;
				emit(s, "recover", { x: t.x, y: t.y });
				t.recovering = true;
			}
			t.hp = Math.min(
				t.maxHp,
				t.hp + u.recovery * dt * (t.type === "bell" ? 0.14 : 1),
			);
			if (t.hp === t.maxHp) t.contrib = s.players.map(() => 0);
		}
		if (t.hp <= 0) deaths.push(t);
		if (t.escape && s.stageTime - t.lastContact > 1) {
			const dx = t.escape.x - t.x,
				dy = t.escape.y - t.y,
				dd = Math.hypot(dx, dy);
			t.x += (dx / (dd || 1)) * Math.min(dd, 12 * dt);
			t.y += (dy / (dd || 1)) * Math.min(dd, 12 * dt);
			if (dd < 1) t.escape = null;
		}
	}
	// All sting contacts are sampled before any new shell can displace a contributor.
	for (const t of deaths.sort((a, b) => a.id - b.id)) killTarget(s, t);
	for (const p of s.players)
		if (p.bees > 0 && p.inv <= 0 && !s.dev.invulnerable) {
			const a = s.rivals.find(
				(a) => !a.dead && a.warning <= 0 && distance(p, a) < footprint(p) + a.r,
			);
			if (a) {
				p.bees--;
				p.lostAt = s.time;
				p.inv = u.lossInterval;
				s.stats.losses++;
				const angle = Math.atan2(p.y - a.y, p.x - a.x);
				moveCircle(
					s,
					p,
					Math.cos(angle) * 85,
					Math.sin(angle) * 85,
					0.065,
					footprint(p),
				);
				emit(s, "loss", { player: p.id, x: p.x, y: p.y, bees: p.bees });
				if (!p.bees) emit(s, "fallen", { player: p.id, x: p.x, y: p.y });
			}
		}
	s.targets = s.targets.filter((t) => !t.dead);
	s.rivals = s.rivals.filter((a) => !a.dead);
	// Delay target release rather than spawning inside a living swarm.
	if (s.queue.length && s.queue[0].at <= s.stageTime && s.targets.length < 4) {
		const q = s.queue[0],
			e = d.entrances[q.entrance];
		if (
			q.type === "bell" ||
			!s.players.some((p) => p.bees && distance(p, e) < 30)
		) {
			if (spawnTarget(s, q)) s.queue.shift();
		}
	}
	if (s.stageTime >= s.nextRival) {
		const coop = s.players.filter((p) => p.joined).length > 1,
			cap = coop ? (d.rivals.coOpCap ?? d.rivals.cap + 1) : d.rivals.cap,
			interval = coop
				? (d.rivals.coOpInterval ?? d.rivals.interval)
				: d.rivals.interval;
		if (s.rivals.length < cap) spawnRival(s);
		s.nextRival = s.stageTime + interval * u.spawnInterval;
	}
	if (!s.players.some((p) => p.bees > 0 && p.joined)) {
		s.phase = "failed";
		s.phaseT = 0;
		emit(s, "defeat", { score: s.score });
	} else if (!s.targets.length && !s.queue.length) complete(s);
}
export function leave(s, id) {
	const p = s.players.find((p) => p.id === id);
	if (p) {
		p.joined = false;
		p.bees = 0;
		p.vx = p.vy = 0;
		emit(s, "leave", { player: id });
	}
}
export function invariants(s) {
	const errors = [];
	for (const p of s.players) {
		if (![p.x, p.y, p.vx, p.vy].every(Number.isFinite))
			errors.push("Nonfinite player");
		if (p.bees < 0 || p.bees > 12 || ![0, 1].includes(p.charge))
			errors.push("Bee/charge range");
		if (p.x < 0 || p.x > 384 || p.y < 0 || p.y > 240)
			errors.push("Player bounds");
	}
	for (const a of [...s.targets, ...s.rivals])
		if (![a.x, a.y, a.dir].every(Number.isFinite))
			errors.push("Nonfinite entity");
	if (s.score < 0 || !Number.isFinite(s.score)) errors.push("Invalid score");
	return errors;
}
