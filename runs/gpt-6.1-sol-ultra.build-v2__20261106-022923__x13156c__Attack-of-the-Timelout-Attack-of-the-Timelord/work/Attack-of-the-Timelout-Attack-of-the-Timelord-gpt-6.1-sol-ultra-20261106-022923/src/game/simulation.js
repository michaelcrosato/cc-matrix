import {
	BOSS_PHASES,
	DEFAULT_TUNING,
	PATHS,
	THREAT_VALUES,
	WAVES,
} from "../content/campaign.js";

export const STEP = 1 / 120;
export const ARENA = Object.freeze({
	left: -450,
	right: 450,
	top: -300,
	bottom: 300,
	lane: 240,
	playerRadius: 9,
});
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const livePlayers = (w) =>
	w.players
		.filter((p) => p.connected && p.hp > 0)
		.sort((a, b) => String(a.id).localeCompare(String(b.id)));
const clone = (value) => JSON.parse(JSON.stringify(value));
const pathCache = new Map();
function rng(w) {
	let x = w.rngState >>> 0;
	x ^= x << 13;
	x ^= x >>> 17;
	x ^= x << 5;
	w.rngState = x >>> 0;
	return w.rngState / 4294967296;
}
function event(w, type, data = {}) {
	const e = { id: ++w.eventId, type, ...data };
	w.events.push(e);
	return e;
}
function say(w, text, emotion = "gloat") {
	w.subtitle = { text, until: w.time + 5, emotion };
	event(w, "voice", { text, emotion });
}
function addScore(w, n, category) {
	w.score += n;
	w.stats[category] = (w.stats[category] || 0) + n;
}
function markModified(w) {
	w.modified = true;
}
function effectiveTuning(overrides = {}) {
	const t = { ...DEFAULT_TUNING };
	for (const key of Object.keys(t))
		if (Number.isFinite(overrides[key]) && overrides[key] > 0)
			t[key] = overrides[key];
	return t;
}

export function createWorld({
	seed = 0x1982,
	players = [{ id: "p1", name: "PILOT" }],
	tuning = {},
	assists = {},
	demo = false,
} = {}) {
	const balance = effectiveTuning(tuning);
	const w = {
		version: 1,
		seed: seed >>> 0,
		rngState: seed >>> 0 || 1,
		tick: 0,
		time: 0,
		hostileTime: 0,
		phase: "countdown",
		phaseTime: 2.4,
		wave: 0,
		bossPhase: 0,
		players: [],
		enemies: [],
		threats: [],
		shots: [],
		boss: null,
		events: [],
		eventId: 0,
		nextId: 1,
		score: 0,
		charge: 0,
		brake: 0,
		cooldown: 0,
		outcome: null,
		tuning: balance,
		assists: {
			autoFire: false,
			reducedSpeed: false,
			emergencyBrake: false,
			...assists,
		},
		assisted: Object.values(assists).some(Boolean),
		modified: Object.keys(DEFAULT_TUNING).some(
			(k) => balance[k] !== DEFAULT_TUNING[k],
		),
		demo: !!demo,
		subtitle: {
			text: "THE RIFT IS OPENING. HOLD THE LINE.",
			until: 4,
			emotion: "gloat",
		},
		encounterTime: 0,
		fireClock: 0,
		launchIndex: 0,
		targetCursor: 0,
		safeCorridors: [],
		lastRoller: -100,
		stats: {
			kills: 0,
			intercepts: 0,
			hits: 0,
			brakes: 0,
			waveClears: 0,
			bossPhases: 0,
			fleetPoints: 0,
			interceptPoints: 0,
			bonusPoints: 0,
			visited: [],
			threatsSeen: [],
		},
	};
	const seats = players.slice(0, 4);
	w.players = seats.map((p, i) => ({
		id: String(p.id ?? `p${i + 1}`),
		name: String(p.name ?? `PILOT ${i + 1}`).slice(0, 24),
		x: (i - (seats.length - 1) / 2) * 110,
		y: ARENA.lane,
		hp: 3,
		invuln: 2.4,
		vx: 0,
		recoil: 0,
		connected: true,
		colorIndex: i,
		cool: 0,
		brakeHeld: false,
		lastInputSeq: -1,
		hit: 0,
	}));
	return w;
}

// Like the FORMATION kit, paths are Catmull-smoothed and sampled by distance.
// Cache is presentation-independent and never enters serialized authoritative state.
function sampledPath(id) {
	if (pathCache.has(id)) return pathCache.get(id);
	const pts = PATHS[id];
	let samples;
	const NativePath = globalThis.My3D2dge?.Path;
	if (NativePath) {
		const p = new NativePath(pts, { smooth: "catmull" });
		samples = Array.from({ length: 181 }, (_, i) => {
			const a = p.at((i * p.length) / 180);
			return [a.x, a.y];
		});
	} else {
		samples = [];
		for (let j = 0; j < pts.length - 1; j++)
			for (let k = 0; k < 36; k++) {
				const t = k / 36,
					t2 = t * t,
					t3 = t2 * t,
					p0 = pts[Math.max(0, j - 1)],
					p1 = pts[j],
					p2 = pts[j + 1],
					p3 = pts[Math.min(pts.length - 1, j + 2)];
				samples.push(
					[0, 1].map(
						(d) =>
							0.5 *
							(2 * p1[d] +
								(-p0[d] + p2[d]) * t +
								(2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 +
								(-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3),
					),
				);
			}
		samples.push(pts.at(-1));
	}
	// Normalize both implementations to an arc-length lookup.
	let length = 0;
	const distances = [0];
	for (let i = 1; i < samples.length; i++) {
		length += Math.hypot(
			samples[i][0] - samples[i - 1][0],
			samples[i][1] - samples[i - 1][1],
		);
		distances.push(length);
	}
	const result = { samples, distances, length };
	pathCache.set(id, result);
	return result;
}
function pointOnPath(id, t) {
	const p = sampledPath(id),
		d = clamp(t, 0, 1) * p.length;
	let i = 1;
	while (i < p.distances.length - 1 && p.distances[i] < d) i++;
	const f =
			(d - p.distances[i - 1]) / (p.distances[i] - p.distances[i - 1] || 1),
		a = p.samples[i - 1],
		b = p.samples[i];
	return {
		x: a[0] + (b[0] - a[0]) * f,
		y: a[1] + (b[1] - a[1]) * f,
		angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
	};
}

function startEncounter(w) {
	w.enemies = [];
	w.threats = [];
	w.shots = [];
	w.safeCorridors = [];
	w.brake = 0;
	w.encounterTime = 0;
	w.launchIndex = 0;
	w.fireClock = 0;
	if (w.wave < 8) {
		const c = WAVES[w.wave],
			f = c.formation;
		w.phase = "playing";
		w.boss = null;
		w.fireClock = c.firstLaunch;
		for (let i = 0; i < f.count; i++) {
			const cols = Math.ceil(f.count / f.rows),
				row = Math.floor(i / cols),
				column = i % cols,
				group = Math.floor(i / 6),
				slotX = ((column - (cols - 1) / 2) * f.spread) / (cols - 1),
				slotY = -185 + row * 54;
			const delay = group * 0.65 + (i % 6) * f.stagger,
				pathId = f.paths[group % f.paths.length],
				p = pointOnPath(pathId, 0);
			w.enemies.push({
				id: w.nextId++,
				kind: row % 3,
				x: p.x,
				y: p.y,
				px: p.x,
				py: p.y,
				hp: w.wave >= 4 && i % 7 === 0 ? 2 : 1,
				maxHp: w.wave >= 4 && i % 7 === 0 ? 2 : 1,
				angle: p.angle,
				arrival: 0,
				delay,
				slotX,
				slotY,
				group,
				index: i,
				pathId,
				hit: 0,
			});
		}
		w.stats.visited.push(`wave-${w.wave + 1}`);
		say(w, c.line, c.emotion);
	} else {
		const c = BOSS_PHASES[w.bossPhase];
		w.phase = "finale";
		w.boss = {
			x: 0,
			y: -142,
			hp: c.hp,
			maxHp: c.hp,
			vulnerable: false,
			cycle: 0,
			phase: w.bossPhase,
			hit: 0,
		};
		w.fireClock = 2;
		w.stats.visited.push(`boss-${w.bossPhase + 1}`);
		say(w, c.line, c.emotion);
	}
	event(w, "phase", { wave: w.wave, bossPhase: w.bossPhase });
}
function clearHazards(w) {
	for (const t of w.threats)
		event(w, "dissolve", { x: t.x, y: t.y, kind: t.type });
	w.threats = [];
	w.shots = [];
	w.safeCorridors = [];
}
function waveClear(w) {
	if (w.phase !== "playing" && w.phase !== "finale") return;
	clearHazards(w);
	w.brake = 0;
	const survivors = w.players.filter((p) => p.connected);
	const integrityBonus = survivors.reduce((sum, p) => sum + p.hp * 5, 0),
		interceptBonus = Math.min(40, w.stats.intercepts * 2);
	addScore(w, integrityBonus + interceptBonus, "bonusPoints");
	for (const p of survivors) {
		const old = p.hp;
		p.hp = Math.min(3, Math.max(1, p.hp + 1));
		p.invuln = 2.5;
		p.hit = 0;
		p.vx = 0;
		if (p.hp > old)
			event(w, "recover", { owner: p.id, x: p.x, y: p.y, hp: p.hp });
	}
	if (w.wave < 8) {
		w.stats.waveClears++;
		say(w, WAVES[w.wave].clear, "annoyed");
		w.wave++;
	} else {
		w.stats.bossPhases++;
		say(w, BOSS_PHASES[w.bossPhase].clear, "furious");
		w.bossPhase++;
		if (w.bossPhase >= 3) {
			finishWorld(w, "victory");
			return;
		}
	}
	w.phase = "intermission";
	w.phaseTime = 3.2;
	event(w, "clear", {
		wave: w.wave,
		bossPhase: w.bossPhase,
		bonus: integrityBonus + interceptBonus,
	});
}
export function finishWorld(w, outcome = "defeat") {
	if (w.outcome) return false;
	w.outcome = outcome;
	clearHazards(w);
	w.enemies = [];
	w.brake = 0;
	w.boss = null;
	w.phase = "ending";
	w.phaseTime = outcome === "victory" ? 6 : 2.4;
	for (const p of w.players) p.vx = 0;
	event(w, outcome, { score: w.score });
	say(
		w,
		outcome === "victory"
			? "The clocks are free. Tomorrow belongs to everyone."
			: "A moment lost. The next one is still yours.",
		outcome === "victory" ? "praise" : "annoyed",
	);
	return true;
}
export function removePlayer(w, id) {
	const p = w.players.find((p) => p.id === String(id));
	if (!p) return false;
	p.connected = false;
	p.vx = 0;
	p.brakeHeld = false;
	w.shots = w.shots.filter((s) => s.owner !== p.id);
	if (!w.outcome && !livePlayers(w).length) finishWorld(w, "defeat");
	return true;
}
export function hitPlayer(w, id) {
	const p = w.players.find((p) => p.id === String(id));
	if (!p || !p.connected || p.hp <= 0 || p.invuln > 0 || w.outcome)
		return false;
	if (w.demo || w.invulnerable) {
		p.invuln = 0.4;
		return false;
	}
	p.hp--;
	p.invuln = 2.1;
	p.hit = 0.45;
	p.recoil = 0.32;
	w.stats.hits++;
	event(w, "hit", { owner: p.id, x: p.x, y: p.y, hp: p.hp });
	// Remove immediate overlapping hazards once, before the next machine is checked.
	w.threats = w.threats.filter((t) => Math.hypot(t.x - p.x, t.y - p.y) > 70);
	if (!livePlayers(w).length) finishWorld(w, "defeat");
	return true;
}
function charge(w, n) {
	const old = w.charge;
	w.charge = clamp(old + n, 0, 100);
	if (old < 100 && w.charge >= 100) {
		event(w, "brake-ready");
		if (w.stats.brakes === 0)
			say(
				w,
				"Stealing my seconds? Press TIME BRAKE. How uncivilized!",
				"annoyed",
			);
	}
}
function activateBrake(w, owner) {
	if (w.charge < 100 || w.brake > 0 || w.cooldown > 0) return false;
	w.charge = 0;
	w.brake = w.tuning.brakeDuration;
	w.cooldown = 2.2;
	w.stats.brakes++;
	event(w, "brake", { owner });
	if (w.stats.brakes === 1)
		say(w, "That is MY time you are spending!", "furious");
	return true;
}
function nextTarget(w) {
	const p = livePlayers(w);
	if (!p.length) return null;
	const target = p[w.targetCursor % p.length];
	w.targetCursor++;
	return target;
}
function safeAt(w, x) {
	return w.safeCorridors.some((c) => Math.abs(x - c.x) < c.radius);
}
function avoidSafeLane(w, x) {
	if (!safeAt(w, x)) return clamp(x, -415, 415);
	const alternatives = [x - 130, x + 130, -360, 360, 0].filter(
		(a) => a >= -415 && a <= 415 && !safeAt(w, a),
	);
	return alternatives.length
		? alternatives.reduce((a, b) => (Math.abs(a - x) < Math.abs(b - x) ? a : b))
		: null;
}

export function spawnThreat(w, type, overrides = {}) {
	if (!(type in THREAT_VALUES)) return null;
	// A seeking orb must not bend into a roller's promised escape corridor.
	if (type === "mine" && w.safeCorridors.length) return null;
	const target = nextTarget(w);
	if (!target) return null;
	const config =
		w.wave < 8 ? WAVES[w.wave] : BOSS_PHASES[Math.min(2, w.bossPhase)];
	let x = Number.isFinite(overrides.x)
		? overrides.x
		: target.x + (rng(w) - 0.5) * 100;
	const origin =
		w.boss ||
		w.enemies.filter((e) => e.arrival >= 1)[
			Math.floor(
				rng(w) * Math.max(1, w.enemies.filter((e) => e.arrival >= 1).length),
			)
		];
	const y = Number.isFinite(overrides.y)
		? overrides.y
		: (origin?.y ?? -160) + 18;
	x = avoidSafeLane(w, x);
	if (x === null) return null;
	if (type === "roller") {
		// At most one sweep. Its full segment and one reachable exit are decided before descent.
		if (
			w.hostileTime - w.lastRoller < 6.5 ||
			w.threats.some((t) => t.type === "roller")
		)
			return null;
		x = clamp(target.x, -330, 330);
		const left = clamp(x - 105, -395, 185),
			right = left + 210;
		const exits = [left - 60, right + 60].filter(
			(exit) => exit >= -420 && exit <= 420,
		);
		const safeX = exits.reduce((a, b) =>
			Math.abs(a - target.x) < Math.abs(b - target.x) ? a : b,
		);
		const routeLeft = Math.min(target.x, safeX) - 55,
			routeRight = Math.max(target.x, safeX) + 55;
		if (
			w.threats.some(
				(t) =>
					t.type === "mine" ||
					(t.y > 20 && t.x >= routeLeft && t.x <= routeRight) ||
					(t.type === "hunter" &&
						t.targetX >= routeLeft &&
						t.targetX <= routeRight),
			)
		)
			return null;
		w.lastRoller = w.hostileTime;
		w.safeCorridors.push({
			x: safeX,
			radius: 64,
			until: w.hostileTime + (ARENA.lane - y) / 145 + config.warning + 3,
		});
		overrides = { left, right, safeX, dir: safeX < x ? 1 : -1, ...overrides };
	}
	let targetX = clamp(
		target.x + target.vx * w.tuning.hunterPrediction,
		-420,
		420,
	);
	if (type === "hunter") {
		targetX = avoidSafeLane(w, targetX);
		if (targetX === null) return null;
	}
	const t = {
		id: w.nextId++,
		type,
		x,
		y,
		px: x,
		py: y,
		vx: 0,
		vy:
			type === "mine"
				? w.tuning.mineSpeed
				: type === "roller"
					? 145
					: w.tuning.missileSpeed,
		r: type === "missile" ? 6 : type === "mine" ? 12 : 11,
		warning: type === "hunter" ? 1.0 : config.warning,
		age: 0,
		targetId: target.id,
		targetX,
		targetY: ARENA.lane,
		grounded: false,
		left: 0,
		right: 0,
		safeX: 0,
		life: 12,
		committed: false,
		angle: 0,
		...overrides,
	};
	w.threats.push(t);
	if (!w.stats.threatsSeen.includes(type)) w.stats.threatsSeen.push(type);
	event(w, "launch", { kind: type, x: t.x, y: t.y, owner: target.id });
	if (type === "hunter" || type === "roller")
		event(w, "warning", {
			kind: type,
			x: t.x,
			y: t.y,
			targetX: t.targetX,
			safeX: t.safeX,
		});
	return t;
}
function moveEnemies(w, dt) {
	const f = WAVES[w.wave]?.formation;
	if (!f) return;
	for (const e of w.enemies) {
		e.px = e.x;
		e.py = e.y;
		e.hit = Math.max(0, e.hit - dt);
		if (e.delay > 0) {
			e.delay -= dt;
			continue;
		}
		if (e.arrival < 1) {
			e.arrival = Math.min(1, e.arrival + f.arrivalSpeed * dt);
			const p = pointOnPath(e.pathId, e.arrival);
			const blend = e.arrival ** 4;
			e.x = p.x * (1 - blend) + e.slotX * blend;
			e.y = p.y * (1 - blend) + e.slotY * blend;
			e.angle = p.angle * (1 - blend) + (Math.PI / 2) * blend;
		} else {
			const braid =
				w.wave >= 4 ? Math.sin(w.encounterTime * 0.42 + e.group * 1.1) * 23 : 0;
			e.x = clamp(
				e.slotX +
					Math.sin(w.encounterTime * 0.62 + e.group * 0.34) * f.sway +
					braid,
				-420,
				420,
			);
			e.y = e.slotY + Math.sin(w.encounterTime * 1.8 + e.index * 0.63) * 7;
			e.angle = Math.PI / 2 + Math.cos(w.encounterTime * 0.62 + e.group) * 0.12;
		}
	}
}
function updateBoss(w, dt) {
	const b = w.boss,
		c = BOSS_PHASES[w.bossPhase];
	if (!b || !c) return;
	b.cycle = (b.cycle + dt) % c.cycle;
	b.x = Math.sin(w.encounterTime * c.xSpeed) * c.xAmplitude;
	b.y = -145 + Math.sin(w.encounterTime * 0.65) * 20;
	b.vulnerable = b.cycle >= c.openAt && b.cycle < c.openAt + c.openFor;
	b.hit = Math.max(0, b.hit - dt);
}
function moveThreats(w, dt) {
	for (const t of w.threats) {
		t.px = t.x;
		t.py = t.y;
		t.age += dt;
		t.life -= dt;
		t.angle += dt * (t.type === "mine" ? 3 : 5);
		if (t.warning > 0) {
			t.warning = Math.max(0, t.warning - dt);
			if (t.warning === 0 && t.type === "hunter") {
				const d = Math.hypot(t.targetX - t.x, ARENA.lane - t.y) || 1;
				t.vx = ((t.targetX - t.x) / d) * w.tuning.hunterSpeed;
				t.vy = ((ARENA.lane - t.y) / d) * w.tuning.hunterSpeed;
				t.committed = true;
				event(w, "warning", { kind: "hunter-commit", x: t.x, y: t.y });
			}
			continue;
		}
		if (t.type === "missile") {
			t.y += w.tuning.missileSpeed * dt;
			t.x += t.vx * dt;
		} else if (t.type === "mine") {
			const p = w.players.find(
				(p) => p.id === t.targetId && p.connected && p.hp > 0,
			);
			if (p && t.y < 200) {
				const desired = clamp((p.x - t.x) * 0.75, -88, 88);
				t.vx += clamp(
					desired - t.vx,
					-w.tuning.mineTurnRate * dt,
					w.tuning.mineTurnRate * dt,
				);
			}
			t.y += w.tuning.mineSpeed * dt;
			t.x = clamp(t.x + t.vx * dt, -440, 440);
		} else if (t.type === "roller") {
			if (!t.grounded) {
				t.y += 145 * dt;
				if (t.y >= ARENA.lane) {
					t.y = ARENA.lane;
					t.grounded = true;
					t.life = 2.4;
					event(w, "land", { x: t.x, y: t.y, kind: "roller" });
				}
			} else {
				t.x += t.dir * w.tuning.rollerSpeed * dt;
				if (t.x <= t.left || t.x >= t.right) t.life = 0;
			}
		} else {
			t.x += t.vx * dt;
			t.y += t.vy * dt;
		}
	}
	w.threats = w.threats.filter(
		(t) => t.life > 0 && t.y < 305 && t.x > -510 && t.x < 510,
	);
}
// Relative swept-circle intersection catches fast projectiles between fixed ticks.
export function sweptHit(ax, ay, bx, by, cx, cy, dx, dy, r) {
	const x = ax - cx,
		y = ay - cy,
		vx = bx - ax - (dx - cx),
		vy = by - ay - (dy - cy),
		d = vx * vx + vy * vy,
		t = d ? clamp(-(x * vx + y * vy) / d, 0, 1) : 0;
	return (x + vx * t) ** 2 + (y + vy * t) ** 2 <= r * r;
}
function shotCollisions(w) {
	const removedThreats = new Set(),
		removedShots = new Set(),
		removedEnemies = new Set();
	for (const s of w.shots) {
		let hit = null,
			kind = null,
			best = Infinity;
		// Interceptions take precedence for simultaneous overlapped targets, then nearest target along shot.
		for (const t of w.threats)
			if (
				!removedThreats.has(t.id) &&
				!t.grounded &&
				sweptHit(s.x, s.py, s.x, s.y, t.px, t.py, t.x, t.y, t.r + 3)
			) {
				const d = Math.abs(t.y - s.py);
				if (d < best) {
					hit = t;
					kind = "threat";
					best = d;
				}
			}
		for (const e of w.enemies)
			if (
				!removedEnemies.has(e.id) &&
				e.delay <= 0 &&
				sweptHit(s.x, s.py, s.x, s.y, e.px, e.py, e.x, e.y, 16)
			) {
				const d = Math.abs(e.y - s.py);
				if (d < best) {
					hit = e;
					kind = "enemy";
					best = d;
				}
			}
		const b = w.boss;
		if (
			b &&
			sweptHit(s.x, s.py, s.x, s.y, b.x, b.y, b.x, b.y, 34) &&
			Math.abs(b.y - s.py) < best
		) {
			hit = b;
			kind = b.vulnerable ? "boss" : "shield";
		}
		if (!hit) continue;
		removedShots.add(s.id);
		if (kind === "threat") {
			removedThreats.add(hit.id);
			w.stats.intercepts++;
			addScore(w, THREAT_VALUES[hit.type], "interceptPoints");
			charge(w, w.tuning.chargeGain);
			event(w, "intercept", {
				x: hit.x,
				y: hit.y,
				owner: s.owner,
				kind: hit.type,
				value: THREAT_VALUES[hit.type],
			});
		} else if (kind === "enemy") {
			hit.hp--;
			hit.hit = 0.18;
			if (hit.hp <= 0) {
				removedEnemies.add(hit.id);
				w.stats.kills++;
				addScore(w, 5, "fleetPoints");
				charge(w, 2);
				event(w, "kill", {
					x: hit.x,
					y: hit.y,
					owner: s.owner,
					kind: "ship",
					value: 5,
				});
			} else event(w, "armor", { x: hit.x, y: hit.y, owner: s.owner });
		} else if (kind === "shield") {
			event(w, "armor", { x: hit.x, y: hit.y, owner: s.owner, kind: "shield" });
		} else {
			hit.hp--;
			hit.hit = 0.14;
			addScore(w, 2, "fleetPoints");
			event(w, "boss-hit", { x: hit.x, y: hit.y, owner: s.owner });
			if (hit.hp <= 0) break;
		}
	}
	w.shots = w.shots.filter((s) => !removedShots.has(s.id) && s.y > -325);
	w.enemies = w.enemies.filter((e) => !removedEnemies.has(e.id));
	w.threats = w.threats.filter((t) => !removedThreats.has(t.id));
}
function hostileCollisions(w) {
	for (const p of livePlayers(w)) {
		if (p.invuln > 0) continue;
		for (const t of w.threats)
			if (
				t.warning <= 0 &&
				sweptHit(
					p.x - p.vx * STEP,
					p.y,
					p.x,
					p.y,
					t.px,
					t.py,
					t.x,
					t.y,
					t.r + ARENA.playerRadius,
				)
			) {
				if (hitPlayer(w, p.id)) break;
			}
		if (w.outcome) break;
	}
}
function emergency(w, p) {
	return (
		w.threats.some(
			(t) => t.warning <= 0 && t.y > 100 && Math.abs(t.x - p.x) < 50,
		) || w.threats.some((t) => t.grounded && Math.abs(t.x - p.x) < 100)
	);
}

export function stepWorld(w, actions = {}, dt = STEP) {
	w.assisted ||= Object.values(w.assists || {}).some(Boolean);
	if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1)
		throw new Error(
			"Simulation step must be finite, positive and no more than 0.1s.",
		);
	w.events = [];
	if (w.phase === "results" || w.phase === "terminated") return w;
	w.tick++;
	w.time += dt;
	for (const p of w.players) {
		p.invuln = Math.max(0, p.invuln - dt);
		p.recoil = Math.max(0, p.recoil - dt);
		p.hit = Math.max(0, p.hit - dt);
	}
	if (["countdown", "intermission", "ending"].includes(w.phase)) {
		w.phaseTime -= dt;
		if (w.phaseTime <= 0) {
			if (w.phase === "ending") {
				w.phase = "results";
				event(w, "results", { outcome: w.outcome });
			} else startEncounter(w);
		}
		return w;
	}
	if (w.outcome) return w;
	if (w.brake > 0) {
		w.brake = Math.max(0, w.brake - dt);
		if (w.brake === 0) event(w, "brake-end");
	}
	w.cooldown = Math.max(0, w.cooldown - dt);
	for (const p of livePlayers(w)) {
		const a = actions[p.id] || {};
		let direction = Number.isFinite(a.move) ? clamp(a.move, -1, 1) : 0;
		if (Math.abs(direction) < 0.05 && Number.isFinite(a.targetX))
			direction = clamp(
				(clamp(a.targetX, -450, 450) - p.x) / (w.tuning.playerSpeed * dt),
				-1,
				1,
			);
		p.vx = direction * w.tuning.playerSpeed;
		p.x = clamp(p.x + p.vx * dt, ARENA.left, ARENA.right);
		p.cool = Math.max(0, p.cool - dt);
		const fire = !!a.fire || w.assists.autoFire;
		if (fire && p.cool <= 0 && !w.shots.some((s) => s.owner === p.id)) {
			w.shots.push({
				id: w.nextId++,
				owner: p.id,
				x: p.x,
				y: p.y - 20,
				py: p.y - 20,
			});
			p.cool = w.tuning.fireInterval;
			p.recoil = 0.11;
			event(w, "fire", { owner: p.id, x: p.x, y: p.y - 20 });
		}
		if (a.brake && !p.brakeHeld) activateBrake(w, p.id);
		p.brakeHeld = !!a.brake;
		if (w.assists.emergencyBrake && w.charge >= 100 && emergency(w, p))
			activateBrake(w, p.id);
	}
	const hdt =
		dt *
		(w.brake > 0 ? w.tuning.slowdownFactor : 1) *
		(w.assists.reducedSpeed ? 0.75 : 1);
	w.hostileTime += hdt;
	w.encounterTime += hdt;
	w.safeCorridors = w.safeCorridors.filter((c) => c.until > w.hostileTime);
	if (w.phase === "playing") moveEnemies(w, hdt);
	else updateBoss(w, hdt);
	const config =
		w.phase === "playing" ? WAVES[w.wave] : BOSS_PHASES[w.bossPhase];
	w.fireClock -= hdt;
	if (w.fireClock <= 0) {
		const type = config.mix[w.launchIndex++ % config.mix.length];
		spawnThreat(w, type);
		w.fireClock =
			config.interval *
			w.tuning.enemyFireInterval *
			(w.players.filter((p) => p.connected).length > 1 ? 0.92 : 1);
	}
	for (const s of w.shots) {
		s.py = s.y;
		s.y -= w.tuning.shotSpeed * dt;
	}
	moveThreats(w, hdt);
	// Contract: shots remove targets, surviving hostiles hit players, completion is last.
	shotCollisions(w);
	hostileCollisions(w);
	if (
		!w.outcome &&
		((w.phase === "playing" && !w.enemies.length) ||
			(w.phase === "finale" && w.boss.hp <= 0))
	)
		waveClear(w);
	return w;
}

export function getSnapshot(w) {
	return clone(w);
}
export function applySnapshot(w, snapshot) {
	for (const k of Object.keys(w)) delete w[k];
	Object.assign(w, clone(snapshot));
	return w;
}
export function resetTuning(w) {
	w.tuning = { ...DEFAULT_TUNING };
	return w.tuning;
}
export function jumpEncounter(w, index, bossPhase = 0) {
	markModified(w);
	w.outcome = null;
	w.wave = clamp(Math.floor(index), 0, 8);
	w.bossPhase = clamp(Math.floor(bossPhase), 0, 2);
	for (const p of w.players)
		if (p.connected) {
			p.hp = 3;
			p.invuln = 2.5;
		}
	startEncounter(w);
	return w;
}
export function refillWorld(w) {
	markModified(w);
	w.charge = 100;
	for (const p of w.players)
		if (p.connected) {
			p.hp = 3;
			p.invuln = 2.1;
		}
	event(w, "recover");
}

// The ordinary-action autopilot is shared by the attract sequence and whole-run tests.
// It anticipates trajectories but has no authority to edit health, charge, phases or score.
export function autoPilot(w, id) {
	const p = w.players.find((p) => p.id === String(id));
	if (!p || p.hp <= 0 || !p.connected)
		return { move: 0, fire: false, brake: false };
	let aim = p.x;
	const targetThreat = w.threats
		.filter((t) => !t.grounded && t.y < 215 && t.y > 20)
		.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
	if (targetThreat && Math.abs(targetThreat.x - p.x) < 115)
		aim =
			targetThreat.x +
			(targetThreat.vx * (p.y - targetThreat.y)) / w.tuning.shotSpeed;
	else if (w.boss?.vulnerable) {
		const c = BOSS_PHASES[w.bossPhase],
			flight = (p.y - w.boss.y) / w.tuning.shotSpeed;
		aim = Math.sin((w.encounterTime + flight) * c.xSpeed) * c.xAmplitude;
	} else {
		const enemies = w.enemies.filter((e) => e.delay <= 0 && e.y > -250);
		const e = enemies.sort(
			(a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x),
		)[0];
		if (e) {
			const flight = (p.y - e.y) / w.tuning.shotSpeed;
			aim =
				e.arrival >= 1
					? e.slotX +
						Math.sin((w.encounterTime + flight) * 0.62 + e.group * 0.34) *
							WAVES[w.wave].formation.sway
					: e.x;
		} else if (w.boss) aim = w.boss.x;
	}
	aim = clamp(aim, -430, 430);
	// Try the desired firing lane, then increasingly distant lanes. Penalize every
	// sampled position along the reachable route, including grounded sweep segments.
	let bestX = p.x,
		bestCost = Infinity;
	const candidates = [
		aim,
		p.x,
		...Array.from({ length: 19 }, (_, i) => -432 + i * 48),
	];
	for (const x of candidates) {
		let cost = Math.abs(x - aim) * 0.065 + Math.abs(x - p.x) * 0.018;
		for (const t of w.threats) {
			if (t.warning > 0 && t.type !== "hunter" && t.type !== "roller") continue;
			for (const future of [0.15, 0.35, 0.6, 0.9]) {
				const time = Math.max(0, future - t.warning),
					px =
						p.x +
						clamp(
							x - p.x,
							-w.tuning.playerSpeed * future,
							w.tuning.playerSpeed * future,
						);
				let tx = t.x,
					ty = t.y;
				if (t.type === "roller" && t.grounded) {
					tx = t.x + t.dir * w.tuning.rollerSpeed * time;
					ty = ARENA.lane;
					if (tx < t.left || tx > t.right || time > t.life) continue;
				} else if (t.type === "hunter") {
					if (t.warning > 0) {
						const dx = t.targetX - t.x,
							dy = ARENA.lane - t.y,
							len = Math.hypot(dx, dy);
						tx += (dx / len) * w.tuning.hunterSpeed * time;
						ty += (dy / len) * w.tuning.hunterSpeed * time;
					} else {
						tx += t.vx * time;
						ty += t.vy * time;
					}
				} else {
					tx += t.vx * time;
					ty +=
						(t.type === "mine"
							? w.tuning.mineSpeed
							: t.type === "roller"
								? 145
								: w.tuning.missileSpeed) * time;
					if (t.type === "roller" && ty >= ARENA.lane) {
						ty = ARENA.lane;
						tx =
							t.x +
							t.dir *
								w.tuning.rollerSpeed *
								Math.max(0, time - (ARENA.lane - t.y) / 145);
					}
				}
				if (ty > 275 || ty < 170) continue;
				const distance = Math.hypot((px - tx) * 1.1, (ARENA.lane - ty) * 0.7);
				if (distance < 55)
					cost += (55 - distance) ** 2 * (future < 0.4 ? 1.8 : 0.7);
			}
		}
		if (cost < bestCost) {
			bestCost = cost;
			bestX = x;
		}
	}
	return {
		move: 0,
		targetX: bestX,
		fire: true,
		brake:
			w.charge >= 100 &&
			(bestCost > 80 || w.threats.length >= 2 || w.boss?.vulnerable),
		seq: w.tick,
	};
}
