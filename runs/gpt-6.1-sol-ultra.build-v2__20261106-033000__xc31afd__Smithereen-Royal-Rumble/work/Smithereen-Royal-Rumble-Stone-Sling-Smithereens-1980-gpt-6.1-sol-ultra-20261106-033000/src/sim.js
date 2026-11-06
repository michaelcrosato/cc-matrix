import { STONES, COURTS, RIVALS, makeBlocks } from "./content.js";
export { STONES, COURTS, RIVALS };
export const DT = 1 / 120;
export const DEFAULTS = {
	chargeTime: 1.4,
	maxSpeed: 290,
	gravity: 120,
	reload: 0.9,
	heavyReload: 1.35,
	splitReload: 1.7,
	damage: 1,
	healthScale: 1,
	crewDisable: 1.8,
	launcherDisable: 2.6,
	protection: 1.25,
	aiError: 0.025,
	aiReaction: 1,
	assist: 0,
};
export const RANGES = {
	chargeTime: [0.35, 3, 0.05],
	maxSpeed: [220, 390, 5],
	gravity: [70, 180, 5],
	reload: [0.2, 2.5, 0.05],
	heavyReload: [0.3, 3, 0.05],
	splitReload: [0.4, 3.5, 0.05],
	damage: [0.3, 4, 0.1],
	healthScale: [0.3, 3, 0.1],
	crewDisable: [0.3, 5, 0.1],
	launcherDisable: [0.4, 6, 0.1],
	protection: [0.5, 4, 0.05],
	aiError: [0, 0.15, 0.005],
	aiReaction: [0.3, 3, 0.1],
	assist: [0, 1, 0.05],
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angle = (50 * Math.PI) / 180;
function rng(w) {
	let n = w.rng | 0;
	n ^= n << 13;
	n ^= n >>> 17;
	n ^= n << 5;
	w.rng = n >>> 0;
	return w.rng / 4294967296;
}
export function event(w, type, data = {}) {
	const e = { id: ++w.eventId, type, time: w.time, ...data };
	w.events.push(e);
	if (w.events.length > 200) w.events.shift();
	return e;
}
export function createWorld(o = {}) {
	const config = { ...DEFAULTS };
	for (const [k, v] of Object.entries(o.config || {}))
		if (k in RANGES && Number.isFinite(v))
			config[k] = clamp(v, RANGES[k][0], RANGES[k][1]);
	const w = {
		version: 1,
		tick: 0,
		time: 0,
		seed: o.seed || 88417,
		rng: o.seed || 88417,
		mode: o.mode || "quick",
		phase: "play",
		court: clamp(o.court || 0, 0, 4),
		bout: clamp(o.bout || 1, 1, 10),
		limit: o.limit || 90,
		config,
		players: [],
		blocks: [],
		projectiles: [],
		events: [],
		eventId: 0,
		nextId: 1,
		throws: {},
		revision: 0,
		available: o.available || [0, 1, 2],
		stats: {
			shots: [0, 0],
			used: [[], []],
			collapses: 0,
			crew: 0,
			launcher: 0,
			recoveries: 0,
			damage: 0,
			cancels: 0,
		},
		outcome: null,
		cheated: false,
		invulnerable: false,
	};
	for (let seat = 0; seat < 2; seat++) {
		const p = {
			seat,
			x: seat ? 490 : 150,
			z: 70,
			crewX: seat ? 459 : 181,
			stone: 0,
			charge: null,
			held: false,
			buffer: false,
			reloadUntil: 0,
			crewUntil: 0,
			launcherUntil: 0,
			protectUntil: 0,
			score: 0,
			last: [null, null, null],
			ai: o.ai?.[seat]
				? { ...o.ai[seat], next: 1.5 + seat * 0.3, planned: null }
				: null,
		};
		w.players.push(p);
	}
	w.blocks = makeBlocks(w.court, config.healthScale, o.customCourt);
	w.maxHealth = [0, 1].map((s) =>
		w.blocks
			.filter((b) => b.seat === s && !b.foundation)
			.reduce((n, b) => n + b.maxHp, 0),
	);
	return w;
}
export const health = (w, s) =>
	w.blocks
		.filter((b) => b.seat === s && !b.foundation && b.alive)
		.reduce((n, b) => n + Math.max(0, b.hp), 0) / (w.maxHealth?.[s] || 1);
export const disabled = (w, p) =>
	Math.max(p.crewUntil, p.launcherUntil) > w.time + 1e-8;
export function command(w, seat, c) {
	if (
		!w ||
		w.phase !== "play" ||
		!Number.isInteger(seat) ||
		seat < 0 ||
		seat > 1 ||
		!c
	)
		return false;
	const p = w.players[seat];
	switch (c.type) {
		case "cancel":
			if (p.held || p.charge || p.buffer) {
				w.stats.cancels++;
				event(w, "cancel", { seat, x: p.x, z: p.z });
			}
			p.held = false;
			p.buffer = false;
			p.charge = null;
			return true;
		case "stone":
			if (
				p.charge ||
				!Number.isInteger(c.stone) ||
				!w.available.includes(c.stone)
			)
				return false;
			p.stone = c.stone;
			return true;
		case "begin":
			if (p.held || disabled(w, p)) return false;
			p.held = true;
			if (p.reloadUntil > w.time) {
				p.buffer = true;
				return true;
			}
			p.charge = {
				start: w.time,
				power: 0,
				duration: w.config.chargeTime * (1 + w.config.assist * 0.5),
			};
			return true;
		case "release": {
			if (!p.held) return false;
			p.held = false;
			p.buffer = false;
			if (!p.charge) return false;
			let duration = w.time - p.charge.start;
			if (Number.isFinite(c.duration))
				duration = clamp(
					c.duration,
					Math.max(0, duration - 0.22),
					duration + 0.22,
				);
			const power = clamp(
				duration /
					(p.charge.duration ||
						w.config.chargeTime * (1 + w.config.assist * 0.5)),
				0,
				1,
			);
			p.charge = null;
			if (disabled(w, p) || power < 0.08) {
				event(w, "cancel", { seat, x: p.x, z: p.z, reason: "too-short" });
				return false;
			}
			const id = w.nextId++;
			const speed = 50 + power * (w.config.maxSpeed - 50);
			const shot = {
				id,
				throwId: id,
				seat,
				type: p.stone,
				x: p.x,
				z: p.z,
				vx: Math.cos(angle) * speed * (seat ? -1 : 1),
				vz: Math.sin(angle) * speed,
				fragment: false,
				age: 0,
				power,
				gravity: w.config.gravity,
			};
			w.projectiles.push(shot);
			w.throws[id] = { hit: [], disabled: [] };
			p.reloadUntil = w.time + w.config[STONES[p.stone].reload];
			w.stats.shots[seat]++;
			if (!w.stats.used[seat].includes(p.stone))
				w.stats.used[seat].push(p.stone);
			event(w, "launch", {
				seat,
				x: p.x,
				z: p.z,
				stone: p.stone,
				power,
				throwId: id,
			});
			return true;
		}
		default:
			return false;
	}
}
// Segment/AABB and segment/circle return entry time in [0,1]; deterministic stable tie ordering.
export function segmentBox(x, z, X, Z, b, r = 0) {
	let lo = 0,
		hi = 1;
	for (const [p, d, a, c] of [
		[x, X - x, b.x - r, b.x + b.w + r],
		[z, Z - z, b.z - r, b.z + b.h + r],
	]) {
		if (Math.abs(d) < 1e-12) {
			if (p < a || p > c) return null;
		} else {
			let t = (a - p) / d,
				u = (c - p) / d;
			if (t > u) [t, u] = [u, t];
			lo = Math.max(lo, t);
			hi = Math.min(hi, u);
			if (lo > hi) return null;
		}
	}
	return lo >= 0 && lo <= 1 ? lo : null;
}
function segmentCircle(x, z, X, Z, cx, cz, r) {
	const dx = X - x,
		dz = Z - z,
		a = dx * dx + dz * dz;
	if (!a) return null;
	const ox = x - cx,
		oz = z - cz,
		b = 2 * (ox * dx + oz * dz),
		c = ox * ox + oz * oz - r * r;
	if (c <= 0) return 0;
	const d = b * b - 4 * a * c;
	if (d < 0) return null;
	const t = (-b - Math.sqrt(d)) / (2 * a);
	return t >= 0 && t <= 1 ? t : null;
}
function contact(w, s, X, Z, at = w.time) {
	let best = null;
	const radius = s.fragment ? 2 : STONES[s.type].radius;
	const enemy = 1 - s.seat;
	const test = (t, key, target, data) => {
		if (
			t !== null &&
			(!best ||
				t < best.t - 1e-8 ||
				(Math.abs(t - best.t) < 1e-8 && key < best.key))
		)
			best = { t, key, target, ...data };
	};
	if (
		(s.seat === 0 && Math.max(s.x, X) > 425) ||
		(s.seat === 1 && Math.min(s.x, X) < 215)
	) {
		for (const b of w.blocks)
			if (b.alive && !b.foundation && b.seat === enemy)
				test(segmentBox(s.x, s.z, X, Z, b, radius), 100 + b.id, "block", {
					id: b.id,
					seat: enemy,
				});
		const p = w.players[enemy];
		if (p.crewUntil <= at)
			test(segmentCircle(s.x, s.z, X, Z, p.crewX, 55, 10 + radius), 1, "crew", {
				seat: enemy,
			});
		if (p.launcherUntil <= at)
			test(segmentCircle(s.x, s.z, X, Z, p.x, 55, 15 + radius), 2, "launcher", {
				seat: enemy,
			});
	}
	test(
		segmentBox(
			s.x,
			s.z,
			X,
			Z,
			{ x: -2000, z: -1000, w: 2245, h: 1040 },
			radius,
		),
		10000,
		"ground",
		{},
	);
	test(
		segmentBox(s.x, s.z, X, Z, { x: 395, z: -1000, w: 2245, h: 1040 }, radius),
		10001,
		"ground",
		{},
	);
	test(
		segmentBox(s.x, s.z, X, Z, { x: 245, z: -1000, w: 150, h: 1019 }, radius),
		10002,
		"water",
		{},
	);
	if (best) {
		best.x = s.x + (X - s.x) * best.t;
		best.z = s.z + (Z - s.z) * best.t;
	}
	return best;
}
function fragments(s) {
	return [-1, 0, 1].map((n, i) => ({
		...s,
		id: s.id * 100 + i + 1,
		fragment: true,
		x: s.x + n * 3,
		vx: s.vx * (1 + n * 0.1),
		vz: 6 + n * 5,
		age: s.age,
	}));
}
function integrate(w, s, dt, at = w.time) {
	const g = s.gravity ?? w.config.gravity;
	const X = s.x + s.vx * dt,
		Z = s.z + s.vz * dt - 0.5 * g * dt * dt;
	const hit = contact(w, s, X, Z, at);
	if (hit) {
		s.x = hit.x;
		s.z = hit.z;
		return { hit };
	}
	s.x = X;
	s.z = Z;
	s.vz -= g * dt;
	s.age = (s.age || 0) + dt;
	if (s.type === 2 && !s.fragment && s.vz <= 0) return { split: fragments(s) };
	if (s.z < -50 || s.x < -400 || s.x > 1040 || s.age > 10)
		return { gone: true };
	return null;
}
export function predict(w, seat, power, type = w.players[seat].stone) {
	const p = w.players[seat],
		speed = 50 + clamp(power, 0, 1) * (w.config.maxSpeed - 50);
	const shots = [
		{
			id: 1,
			throwId: 1,
			seat,
			type,
			x: p.x,
			z: p.z,
			vx: Math.cos(angle) * speed * (seat ? -1 : 1),
			vz: Math.sin(angle) * speed,
			age: 0,
			fragment: false,
			gravity: w.config.gravity,
		},
	];
	const points = [[p.x, p.z]],
		impacts = [];
	let ticks = 0;
	while (shots.length && ticks < 1400) {
		ticks++;
		for (let i = shots.length - 1; i >= 0; i--) {
			const s = shots[i];
			const res = integrate(w, s, DT, w.time + ticks * DT);
			if (ticks % 6 === 0) points.push([s.x, s.z]);
			if (res?.hit) {
				impacts.push({ ...res.hit, time: ticks * DT, fragment: s.fragment });
				shots.splice(i, 1);
			} else if (res?.split) {
				shots.splice(i, 1, ...res.split);
			} else if (res?.gone) shots.splice(i, 1);
		}
	}
	return { points, impacts, power, type };
}
function connected(w) {
	const reached = new Set(
		w.blocks.filter((b) => b.alive && b.foundation).map((b) => b.id),
	);
	let change = true;
	while (change) {
		change = false;
		for (const b of w.blocks)
			if (
				b.alive &&
				!reached.has(b.id) &&
				b.supports.some((id) => reached.has(id))
			) {
				reached.add(b.id);
				change = true;
			}
	}
	return reached;
}
export function collapse(w) {
	const support = connected(w);
	const removed = [];
	for (const b of w.blocks)
		if (b.alive && !b.foundation && !support.has(b.id)) {
			b.alive = false;
			b.hp = 0;
			removed.push(b.id);
		}
	if (removed.length) {
		w.revision++;
		w.stats.collapses += removed.length;
		const b = w.blocks.find((b) => b.id === removed[0]);
		event(w, "collapse", {
			blockIds: removed,
			count: removed.length,
			seat: b.seat,
			x: b.x + b.w / 2,
			z: b.z + b.h / 2,
		});
	}
	return removed;
}
function interrupt(w, s, hit) {
	const p = w.players[hit.seat],
		record = w.throws[s.throwId] || { hit: [], disabled: [] };
	const key = hit.target + hit.seat;
	const prop = hit.target === "crew" ? "crewUntil" : "launcherUntil";
	if (
		record.disabled.includes(key) ||
		p.protectUntil > w.time ||
		p[prop] + (p[prop] > 0 ? w.config.protection : 0) > w.time
	)
		return false;
	record.disabled.push(key);
	p[prop] =
		w.time +
		w.config[hit.target === "crew" ? "crewDisable" : "launcherDisable"];
	p.charge = null;
	p.held = false;
	p.buffer = false;
	const score = hit.target === "crew" ? 7 : 13;
	w.players[s.seat].score += score;
	w.stats[hit.target]++;
	event(w, hit.target, {
		seat: hit.seat,
		by: s.seat,
		x: hit.x,
		z: hit.z,
		until: p[prop],
	});
	return true;
}
function impact(w, s, hit) {
	const p = w.players[s.seat];
	p.last[s.type] = { x: hit.x, z: hit.z, target: hit.target, power: s.power };
	let removed = false,
		scored = 0;
	if (hit.target === "block") {
		const b = w.blocks.find((b) => b.id === hit.id);
		if (b?.alive && !w.invulnerable) {
			const damage = STONES[s.type].damage * w.config.damage;
			b.hp = Math.max(0, b.hp - damage);
			w.stats.damage += damage;
			const rec = w.throws[s.throwId];
			const key = "castle" + b.id;
			if (rec && !rec.hit.includes(key)) {
				rec.hit.push(key);
				p.score += 3;
				scored = 3;
			}
			if (b.hp <= 0) {
				b.alive = false;
				removed = true;
				w.revision++;
			}
		}
	} else if (hit.target === "crew" || hit.target === "launcher")
		interrupt(w, s, hit);
	event(w, "impact", {
		seat: s.seat,
		x: hit.x,
		z: hit.z,
		target: hit.target,
		blockId: hit.id,
		stone: s.type,
		removed,
		scored,
	});
}
export function finish(w, winner, reason = "demolition") {
	if (w.phase !== "play") return false;
	w.phase = "over";
	w.outcome = {
		winner,
		reason,
		scores: w.players.map((p) => p.score),
		banked: w.players.map((p, s) => (s === winner ? p.score * w.bout : 0)),
	};
	for (const p of w.players) {
		p.charge = null;
		p.held = false;
		p.buffer = false;
	}
	w.projectiles = [];
	event(w, "outcome", { winner, reason });
	return true;
}
export function timeout(w) {
	const h = [health(w, 0), health(w, 1)],
		sc = w.players.map((p) => p.score);
	const winner =
		Math.abs(h[0] - h[1]) > 1e-9
			? h[0] > h[1]
				? 0
				: 1
			: sc[0] === sc[1]
				? -1
				: sc[0] > sc[1]
					? 0
					: 1;
	finish(w, winner, "time");
}
function adjudicate(w) {
	const alive = [0, 1].map((s) =>
		w.blocks.some((b) => b.seat === s && !b.foundation && b.alive),
	);
	if (!alive[0] || !alive[1])
		finish(w, !alive[0] && !alive[1] ? -1 : alive[0] ? 0 : 1);
	else if (w.time >= w.limit) timeout(w);
}
function supportValue(w, b, damage) {
	if (damage < b.hp) return damage * 0.8;
	const removed = new Set([b.id]);
	let change = true;
	while (change) {
		change = false;
		for (const a of w.blocks)
			if (
				a.alive &&
				!a.foundation &&
				!removed.has(a.id) &&
				a.supports.length &&
				a.supports.every((id) => removed.has(id))
			) {
				removed.add(a.id);
				change = true;
			}
	}
	return damage + removed.size * 2.6;
}
export function planShot(w, seat, profile = {}) {
	const enemy = 1 - seat,
		p = w.players[enemy];
	let best = { power: 0.68, type: 0, value: -1e9, target: "ground" };
	const types = w.available;
	const breadth = profile.breadth || 61;
	const duration = disabled(w, p)
		? Math.max(p.crewUntil, p.launcherUntil) - w.time
		: 0;
	for (const type of types)
		for (let i = 0; i < breadth; i++) {
			const power = 0.18 + (i / (breadth - 1)) * 0.82;
			const pred = predict(w, seat, power, type);
			let value = 0,
				nearest = 999;
			const seen = new Set();
			for (const h of pred.impacts) {
				if (h.target === "block") {
					const b = w.blocks.find((b) => b.id === h.id);
					if (!seen.has(b.id)) {
						seen.add(b.id);
						value +=
							supportValue(w, b, STONES[type].damage * w.config.damage) *
							(profile.style === "mason" ? 1.5 : 1);
					}
				} else if (h.target === "crew" || h.target === "launcher") {
					const key = h.target;
					if (!seen.has(key)) {
						seen.add(key);
						const protectedAt =
							p.protectUntil > w.time + h.time ||
							(duration && duration + w.config.protection > h.time);
						let n = h.target === "launcher" ? 4.4 : 2.8;
						if (profile.style === "harasser") n *= 2.5;
						if (profile.style === "mason") n *= 0.4;
						if (profile.style === "broad") n *= 0.5;
						if (profile.style === "adaptive" && p.charge) n *= 2.3;
						if (protectedAt) n = 0.05;
						value += n;
					}
				} else if (h.target === "ground")
					nearest = Math.min(nearest, Math.abs(h.x - (seat ? 90 : 550)));
			}
			if (profile.style === "broad" && type === 2) value *= 1.5;
			value /= 1 + w.config[STONES[type].reload] * 0.18;
			if (value === 0) value = -nearest * 0.01;
			if (value > best.value + 1e-9) {
				best = {
					power,
					type,
					value,
					target: pred.impacts[0]?.target || "ground",
				};
			}
		}
	if (best.value <= 0 && breadth < 181)
		return planShot(w, seat, { ...profile, breadth: 181 });
	return best;
}
function aiStep(w, p) {
	const a = p.ai;
	if (!a) return;
	if (disabled(w, p)) {
		a.planned = null;
		return;
	}
	if (p.charge) {
		if (w.time >= a.releaseAt) {
			command(w, p.seat, { type: "release" });
			a.planned = null;
			a.next =
				w.time +
				Math.max(
					0.2,
					(a.reaction || 1.2) * w.config.aiReaction * (0.85 + rng(w) * 0.3),
				);
		}
		return;
	}
	if (p.held) command(w, p.seat, { type: "cancel" });
	if (w.time < a.next || w.time < p.reloadUntil) return;
	const shot = planShot(w, p.seat, a);
	let error =
		(a.error ?? 0.025) * (w.config.aiError / 0.025) * (rng(w) * 2 - 1);
	if (a.perfect) error = 0;
	const power = clamp(shot.power + error, 0.1, 1);
	command(w, p.seat, { type: "stone", stone: shot.type });
	if (command(w, p.seat, { type: "begin" })) {
		a.planned = shot;
		a.releaseAt =
			w.time + power * w.config.chargeTime * (1 + w.config.assist * 0.5);
	}
}
export function step(w, dt = DT) {
	if (!w || w.phase !== "play") return;
	w.tick++;
	w.time = w.tick * DT;
	for (const p of w.players) {
		const was = Math.max(p.crewUntil, p.launcherUntil);
		if (was > 0 && was <= w.time && p._recovered !== was) {
			p._recovered = was;
			p.protectUntil = w.time + w.config.protection;
			w.stats.recoveries++;
			event(w, "recover", { seat: p.seat, x: p.x, z: 55 });
		}
		if (p.buffer && p.held && p.reloadUntil <= w.time && !disabled(w, p)) {
			p.buffer = false;
			p.charge = {
				start: w.time,
				power: 0,
				duration: w.config.chargeTime * (1 + w.config.assist * 0.5),
			};
		}
		if (p.charge)
			p.charge.power = clamp(
				(w.time - p.charge.start) /
					(p.charge.duration ||
						w.config.chargeTime * (1 + w.config.assist * 0.5)),
				0,
				1,
			);
		aiStep(w, p);
	}
	const keep = [],
		hits = [];
	for (const s of w.projectiles) {
		const result = integrate(w, s, dt);
		if (result?.hit) hits.push({ s, hit: result.hit });
		else if (result?.split) {
			keep.push(...result.split);
			event(w, "split", { seat: s.seat, x: s.x, z: s.z, throwId: s.throwId });
		} else if (!result?.gone) keep.push(s);
	}
	w.projectiles = keep;
	// All impacts in the same fixed tick resolve before objective adjudication.
	hits.sort((a, b) => a.s.id - b.s.id);
	for (const { s, hit } of hits) impact(w, s, hit);
	if (hits.some((x) => x.hit.target === "block")) collapse(w);
	adjudicate(w);
	if (w.tick % 120 === 0) {
		const active = new Set(w.projectiles.map((s) => String(s.throwId)));
		for (const id of Object.keys(w.throws))
			if (!active.has(id)) delete w.throws[id];
	}
}
export function resetCastles(w) {
	w.blocks = makeBlocks(w.court, w.config.healthScale);
	w.maxHealth = [0, 1].map((s) =>
		w.blocks
			.filter((b) => b.seat === s && !b.foundation)
			.reduce((n, b) => n + b.maxHp, 0),
	);
	w.projectiles = [];
	w.revision++;
	w.cheated = true;
}
export function validateCourt(data) {
	const errors = [];
	if (Array.isArray(data?.blocks)) {
		if (data.version !== 1) errors.push("Court version must be 1.");
		if (data.blocks.length < 2 || data.blocks.length > 180)
			errors.push("Use 2–180 blocks.");
		const ids = new Set();
		for (const b of data.blocks) {
			if (!Number.isInteger(b.id) || b.id < 0 || ids.has(b.id))
				errors.push("Block IDs must be unique nonnegative integers.");
			ids.add(b.id);
			if (
				![0, 1].includes(b.seat) ||
				![b.x, b.z, b.w, b.h, b.hp, b.maxHp].every(Number.isFinite) ||
				b.maxHp <= 0 ||
				b.hp < 0 ||
				b.hp > b.maxHp ||
				b.w < 4 ||
				b.h < 4 ||
				b.x < 30 ||
				b.x + b.w > 610 ||
				b.z < 30 ||
				b.z + b.h > 205 ||
				!["wood", "stone", "reinforced", "foundation"].includes(b.material) ||
				!Array.isArray(b.supports)
			)
				errors.push("Invalid block dimensions, material or supports.");
		}
		for (const b of data.blocks) {
			if (
				(b.seat === 0 && (b.x < 30 || b.x + b.w > 140)) ||
				(b.seat === 1 && (b.x < 500 || b.x + b.w > 610))
			)
				errors.push(
					"Keep Rose blocks in x30–140 and Azure blocks in x500–610.",
				);
			if (b.supports?.some((id) => !ids.has(id)))
				errors.push("Support ID is missing.");
			if (
				b.supports?.some(
					(id) => data.blocks.find((a) => a.id === id)?.seat !== b.seat,
				)
			)
				errors.push("Support must belong to the same castle.");
		}
		for (const seat of [0, 1])
			if (
				!data.blocks.some((b) => b.seat === seat && b.foundation && b.alive) ||
				!data.blocks.some((b) => b.seat === seat && !b.foundation && b.alive)
			)
				errors.push("Each castle needs a living foundation and objective.");
		if (!errors.length) {
			const reached = connected({ blocks: data.blocks });
			if (
				data.blocks.some((b) => b.alive && !b.foundation && !reached.has(b.id))
			)
				errors.push("Every objective needs a foundation path.");
			for (const b of data.blocks.filter((b) => !b.foundation)) {
				const target = b.x + b.w / 2,
					dx = Math.abs(target - (b.seat ? 150 : 490)),
					dz = b.z + b.h / 2 - 70,
					den = 2 * Math.cos(angle) ** 2 * (dx * Math.tan(angle) - dz);
				if (den <= 0 || Math.sqrt((120 * dx * dx) / den) > 290)
					errors.push("A block is outside the legal ballistic envelope.");
			}
		}
		return { valid: errors.length === 0, errors };
	}
	if (data?.version !== 1) errors.push("Court version must be 1.");
	const a = data?.layout;
	if (!Array.isArray(a) || a.length < 1 || a.length > 80)
		errors.push("Use 1–80 blocks.");
	else
		for (const b of a) {
			if (
				!Array.isArray(b) ||
				b.length !== 5 ||
				!b.slice(0, 4).every(Number.isFinite) ||
				b[0] < 0 ||
				b[0] + b[2] > 92 ||
				b[1] < 0 ||
				b[1] + b[3] > 150 ||
				b[2] < 4 ||
				b[3] < 4 ||
				!["wood", "stone", "reinforced"].includes(b[4])
			)
				errors.push("Invalid block dimensions or material.");
		}
	if (!errors.length) {
		const blocks = makeBlocks(0, 1, data);
		const fake = { blocks };
		const reached = connected(fake);
		if (blocks.some((b) => !b.foundation && !reached.has(b.id)))
			errors.push("Every block needs a path to a foundation.");
	}
	return { valid: errors.length === 0, errors };
}
export const pack = (w) => JSON.parse(JSON.stringify(w));
export const unpack = (data) => {
	if (
		data?.version !== 1 ||
		!Array.isArray(data.players) ||
		data.players.length !== 2 ||
		!Array.isArray(data.blocks)
	)
		throw new Error("Invalid world snapshot");
	return pack(data);
};
