export const DEFAULTS = Object.freeze({
	playerSpeed: 11.5,
	enemySpeed: 8.2,
	boostMultiplier: 1.72,
	recharge: 9,
	gateWidth: 3.8,
	invincible: false,
	autopilot: false,
});
export const LEVELS = [
	{
		name: "THE NIGHT SHIFT",
		subtitle: "Four lanes. One way out.",
		rivals: 1,
		speed: 1,
		color: "#ffbd69",
		radio: "Keep your cool. Sweep the loop.",
	},
	{
		name: "RUSH HOUR",
		subtitle: "Company coming. Mind the gaps.",
		rivals: 2,
		speed: 1.1,
		color: "#fc796b",
		radio: "Two on your tail. Make that your nose.",
	},
	{
		name: "THE LAST LAUGH",
		subtitle: "Three rivals. One clean getaway.",
		rivals: 3,
		speed: 1.19,
		color: "#a89aeb",
		radio: "One last sweep. Bring it home!",
	},
];
export const LANES = [0, 1, 2, 3].map((i) => ({
	hx: 18 - i * 2.4,
	hz: 12.6 - i * 2.4,
	r: 3.5 - i * 0.12,
	count: 32 - i * 4,
}));
export const wrap = (x) => ((x % 1) + 1) % 1;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function rng(seed) {
	return () => {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
export function lengthOf(lane) {
	const a =
		typeof lane === "number" ? LANES[clamp(Math.round(lane), 0, 3)] : lane;
	return 4 * (a.hx + a.hz - 2 * a.r) + 2 * Math.PI * a.r;
}
export function trackPoint(u, lane = 0) {
	const a =
		typeof lane === "number" ? LANES[clamp(Math.round(lane), 0, 3)] : lane;
	const { hx, hz, r } = a,
		qf = wrap(u) * 4,
		q = Math.floor(qf),
		quarter = lengthOf(a) / 4;
	let s = (qf - q) * quarter,
		first = q % 2 === 0 ? hx - r : hz - r,
		arc = (Math.PI * r) / 2;
	const starts = [
			[0, -hz],
			[hx, 0],
			[0, hz],
			[-hx, 0],
		],
		dirs = [
			[1, 0],
			[0, 1],
			[-1, 0],
			[0, -1],
		];
	const corners = [
		[hx - r, -hz + r],
		[hx - r, hz - r],
		[-hx + r, hz - r],
		[-hx + r, -hz + r],
	];
	let x, z, dx, dz;
	if (s < first) {
		[dx, dz] = dirs[q];
		x = starts[q][0] + dx * s;
		z = starts[q][1] + dz * s;
	} else if (s < first + arc) {
		const angle = -Math.PI / 2 + (q * Math.PI) / 2 + (s - first) / r;
		x = corners[q][0] + Math.cos(angle) * r;
		z = corners[q][1] + Math.sin(angle) * r;
		dx = -Math.sin(angle);
		dz = Math.cos(angle);
	} else {
		const end = dirs[(q + 1) % 4];
		dx = end[0];
		dz = end[1];
		const endAngle = (q * Math.PI) / 2;
		x = corners[q][0] + Math.cos(endAngle) * r + dx * (s - first - arc);
		z = corners[q][1] + Math.sin(endAngle) * r + dz * (s - first - arc);
	}
	return { x, z, dx, dz, yaw: Math.atan2(dx, dz) };
}
export function actorPoint(a) {
	const p = trackPoint(a.u, a.lane),
		f = a.switchLeft > 0 ? 1 - a.switchLeft / 0.28 : 1;
	if (a.switchLeft > 0) {
		const p0 = trackPoint(a.u, a.fromLane),
			t = f * f * (3 - 2 * f);
		p.x = p0.x + (p.x - p0.x) * t;
		p.z = p0.z + (p.z - p0.z) * t;
	}
	return p;
}
export class Game {
	constructor(R, onEvent = () => {}) {
		this.R = R;
		this.onEvent = onEvent;
		this.tuning = { ...DEFAULTS };
		this.phase = "idle";
		this.players = [];
		this.rivals = [];
		this.tokens = [];
		this.debris = [];
		this.elapsed = 0;
		this.totalCollected = 0;
		this.nearMisses = 0;
		this.gatesTaken = 0;
		this.boostTime = 0;
		this.world = null;
		this.queue = null;
		this.serial = 0;
	}
	emit(type, data = {}) {
		this.onEvent({ type, ...data });
	}
	start({ mode = "arcade", players = 1, seed = 1980, attract = false } = {}) {
		this.mode = mode;
		this.playerCount = players;
		this.random = rng(seed);
		this.seed = seed;
		this.attract = attract;
		this.stage = 0;
		this.score = 0;
		this.lives = players > 1 ? 4 : 3;
		this.elapsed = 0;
		this.timeLeft = 150;
		this.raceStarted = false;
		this.totalCollected = 0;
		this.nearMisses = 0;
		this.gatesTaken = 0;
		this.boostTime = 0;
		this.chain = 0;
		this.multiplier = 1;
		this.resultReported = false;
		this.buildStage();
		this.phase = "countdown";
		this.wait = attract ? 0.6 : 2.8;
		this.emit("start");
	}
	buildStage() {
		const R = this.R;
		this.world?.free();
		this.queue?.free();
		this.world = new R.World({ x: 0, y: -18, z: 0 });
		this.world.timestep = 1 / 60;
		this.queue = new R.EventQueue(true);
		this.entities = new Map();
		this.debris = [];
		this.world.createCollider(
			R.ColliderDesc.cuboid(28, 0.3, 22)
				.setTranslation(0, -0.55, 0)
				.setRestitution(0.3),
		);
		this.tokens = [];
		this.players = [];
		this.rivals = [];
		for (let lane = 0; lane < 4; lane++)
			for (let j = 0; j < LANES[lane].count; j++)
				this.addToken(lane, (j + 0.5) / LANES[lane].count, "dot");
		this.addToken(1, 0.125, "cell");
		this.addToken(2, 0.625, "cell");
		this.remaining = this.tokens.filter((t) => t.type === "dot").length;
		this.stageTotal = this.remaining;
		for (let i = 0; i < this.playerCount; i++)
			this.players.push(
				this.makeCar({
					id: i,
					lane: i === 0 ? 0 : 2,
					u: i === 0 ? 0.01 : 0.51,
					dir: 1,
					enemy: false,
				}),
			);
		const level = LEVELS[this.stage % 3];
		for (let i = 0; i < level.rivals; i++)
			this.rivals.push(
				this.makeCar({
					id: i + 10,
					lane: i % 4,
					u: 0.43 + i * 0.21,
					dir: -1,
					enemy: true,
				}),
			);
		// Physical curb blocks catch the rigid-body crash debris.
		for (let lane = 0; lane < 3; lane++) {
			const a = LANES[lane],
				b = LANES[lane + 1],
				middle = {
					hx: (a.hx + b.hx) / 2,
					hz: (a.hz + b.hz) / 2,
					r: (a.r + b.r) / 2,
				};
			for (let j = 0; j < 64; j++) {
				const u = (j + 0.5) / 64;
				if ((Math.abs(u * 4 - Math.round(u * 4)) * lengthOf(middle)) / 4 < 2.3)
					continue;
				const p = trackPoint(u, middle);
				this.world.createCollider(
					R.ColliderDesc.cuboid(0.1, 0.2, lengthOf(middle) / 128)
						.setTranslation(p.x, 0, p.z)
						.setRotation({
							x: 0,
							y: Math.sin(p.yaw / 2),
							z: 0,
							w: Math.cos(p.yaw / 2),
						}),
				);
			}
		}
		this.emit("stage", { stage: this.stage, level });
	}
	addToken(lane, u, type) {
		const R = this.R,
			p = trackPoint(u, lane),
			t = {
				id: this.tokens.length,
				lane,
				u,
				type,
				taken: false,
				x: p.x,
				z: p.z,
			};
		t.collider = this.world.createCollider(
			R.ColliderDesc.ball(type === "cell" ? 0.7 : 0.6)
				.setTranslation(p.x, 0.45, p.z)
				.setSensor(true)
				.setActiveCollisionTypes(R.ActiveCollisionTypes.ALL)
				.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
		);
		this.entities.set(t.collider.handle, { kind: "token", data: t });
		this.tokens.push(t);
	}
	makeCar(data) {
		const R = this.R,
			a = {
				...data,
				fromLane: data.lane,
				switchLeft: 0,
				lastGate: -999,
				queueDir: 0,
				speed: 0,
				boost: 100,
				invuln: data.enemy ? 0 : 3,
				shield: 0,
				spin: 0,
				nearCooldown: 0,
				input: { lane: 0, boost: false, brake: false },
				gateCount: 0,
			};
		const p = actorPoint(a);
		a.x = p.x;
		a.z = p.z;
		a.yaw = p.yaw + (a.dir < 0 ? Math.PI : 0);
		a.body = this.world.createRigidBody(
			R.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, 0.45, p.z),
		);
		a.collider = this.world.createCollider(
			R.ColliderDesc.cuboid(0.46, 0.3, 0.81)
				.setSensor(true)
				.setActiveCollisionTypes(R.ActiveCollisionTypes.ALL)
				.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
			a.body,
		);
		this.entities.set(a.collider.handle, {
			kind: data.enemy ? "rival" : "player",
			data: a,
		});
		return a;
	}
	setInput(id, input) {
		if (this.players[id]) Object.assign(this.players[id].input, input);
	}
	queueLane(id, direction) {
		const a = this.players[id];
		if (a) a.queueDir = direction;
	}
	autoInput(a) {
		const counts = LANES.map(
			(_, i) =>
				this.tokens.filter((t) => !t.taken && t.type === "dot" && t.lane === i)
					.length,
		);
		let target = a.lane;
		if (!counts[target]) {
			let best = 100;
			for (let i = 0; i < 4; i++)
				if (counts[i] && Math.abs(i - a.lane) < best) {
					best = Math.abs(i - a.lane);
					target = i;
				}
		}
		let danger = this.rivals.some(
			(b) => b.lane === a.lane && wrap(b.u - a.u) < 0.12,
		);
		if (danger && !this.attract && !this.tuning.invincible) {
			const choices = [a.lane + 1, a.lane - 1].filter((i) => i >= 0 && i < 4);
			if (choices.length)
				target = choices.sort((l, r) => counts[r] - counts[l])[0];
		}
		return {
			lane: Math.sign(target - a.lane),
			boost: !danger && a.boost > 35,
			brake: danger && !this.attract && !this.tuning.invincible,
		};
	}
	tryLane(a, dir) {
		if (!dir || a.switchLeft > 0) return;
		const k = Math.round(a.u * 4),
			dist = Math.abs(a.u - k / 4) * lengthOf(a.lane);
		if (dist > this.tuning.gateWidth / 2 || a.lastGate === k) return;
		const lane = clamp(a.lane + dir, 0, 3);
		if (lane === a.lane) {
			a.queueDir = 0;
			return;
		}
		a.lastGate = k;
		a.fromLane = a.lane;
		a.lane = lane;
		a.switchLeft = 0.28;
		a.queueDir = 0;
		if (!a.enemy) {
			this.gatesTaken++;
			this.emit("switch", { actor: a });
		}
	}
	updateActor(a, dt) {
		const level = LEVELS[this.stage % 3];
		a.invuln = Math.max(0, a.invuln - dt);
		a.shield = Math.max(0, a.shield - dt);
		a.spin = Math.max(0, a.spin - dt);
		a.nearCooldown = Math.max(0, a.nearCooldown - dt);
		a.switchLeft = Math.max(0, a.switchLeft - dt);
		let desired;
		if (a.enemy) {
			desired = this.tuning.enemySpeed * level.speed * (a.id === 12 ? 1.12 : 1);
			const k = Math.round(a.u * 4),
				dist = Math.abs(a.u - k / 4) * lengthOf(a.lane);
			if (
				dist < this.tuning.gateWidth / 2 &&
				a.lastGate !== k &&
				a.switchLeft === 0
			) {
				const target = this.players.reduce(
					(best, p) =>
						Math.abs(p.lane - a.lane) < Math.abs(best.lane - a.lane) ? p : best,
					this.players[0],
				);
				let dir = Math.sign(target.lane - a.lane);
				if (this.stage === 0 && a.gateCount++ % 2 === 0)
					dir = a.lane === 0 ? 1 : -1;
				if (!dir && this.stage > 0 && this.random() < 0.32)
					dir = this.random() < 0.5 ? -1 : 1;
				this.tryLane(a, dir);
				a.lastGate = k;
			}
		} else {
			const inp =
				this.attract || this.tuning.autopilot ? this.autoInput(a) : a.input;
			if (inp.lane) a.queueDir = inp.lane;
			this.tryLane(a, a.queueDir);
			const boosting = inp.boost && a.boost > 1 && !inp.brake && !a.spin;
			a.boosting = boosting;
			desired =
				this.tuning.playerSpeed *
				(inp.brake ? 0.44 : boosting ? this.tuning.boostMultiplier : 1);
			if (boosting) {
				a.boost = Math.max(0, a.boost - 33 * dt);
				this.boostTime += dt;
			} else a.boost = Math.min(100, a.boost + this.tuning.recharge * dt);
			if (a.spin) desired *= 0.28;
		}
		a.speed += (desired - a.speed) * (1 - Math.exp(-dt * 7));
		a.u += ((a.dir * a.speed) / lengthOf(a.lane)) * dt;
		const p = actorPoint(a);
		a.x = p.x;
		a.z = p.z;
		a.yaw = p.yaw + (a.dir < 0 ? Math.PI : 0);
		a.body.setNextKinematicTranslation({ x: a.x, y: 0.45, z: a.z });
		a.body.setNextKinematicRotation({
			x: 0,
			y: Math.sin(a.yaw / 2),
			z: 0,
			w: Math.cos(a.yaw / 2),
		});
	}
	collect(a, t) {
		if (t.taken) return;
		t.taken = true;
		this.world.removeCollider(t.collider, true);
		this.entities.delete(t.collider.handle);
		if (t.type === "cell") {
			a.boost = 100;
			a.shield = 4;
			this.score += 100;
			this.emit("cell", { actor: a, token: t });
		} else {
			this.remaining--;
			this.totalCollected++;
			this.chain++;
			this.multiplier = Math.min(5, 1 + Math.floor(this.chain / 16));
			this.score += 10 * this.multiplier;
			a.boost = Math.min(100, a.boost + 1.1);
			this.emit("token", { actor: a, token: t });
		}
	}
	crash(a, b) {
		if (a.invuln > 0 || this.attract || this.tuning.invincible) return;
		if (a.shield > 0) {
			a.shield = 0;
			a.invuln = 1.5;
			this.score += 200;
			this.spawnDebris(a.x, a.z);
			this.emit("deflect", { actor: a });
			return;
		}
		this.lives--;
		this.chain = 0;
		this.multiplier = 1;
		a.invuln = 3.2;
		a.spin = 0.65;
		a.boost = Math.max(15, a.boost - 25);
		this.spawnDebris(a.x, a.z);
		this.emit("crash", { actor: a, rival: b });
		if (this.lives <= 0) {
			this.phase = "lost";
			this.emit("finish", { won: false });
		}
	}
	spawnDebris(x, z) {
		const R = this.R;
		for (let i = 0; i < 9; i++) {
			const r = this.random(),
				angle = this.random() * Math.PI * 2;
			const body = this.world.createRigidBody(
				R.RigidBodyDesc.dynamic()
					.setTranslation(x, 0.8 + i * 0.04, z)
					.setLinvel(
						Math.cos(angle) * (2 + r * 3),
						4 + r * 4,
						Math.sin(angle) * (2 + r * 3),
					)
					.setAngvel({ x: r * 8, y: (r - 0.5) * 12, z: r * 7 })
					.setLinearDamping(0.4),
			);
			this.world.createCollider(
				R.ColliderDesc.cuboid(0.12, 0.12, 0.22)
					.setRestitution(0.6)
					.setDensity(0.4),
				body,
			);
			this.debris.push({ id: ++this.serial, body, life: 3, color: i % 3 });
		}
	}
	finishStage() {
		this.score += 1000 + this.lives * 250;
		this.phase = "stageclear";
		this.wait = this.attract ? 1.1 : 3.1;
		this.emit("clear", { stage: this.stage });
	}
	skipStage() {
		if (this.phase === "playing") {
			this.tokens
				.filter((t) => !t.taken)
				.forEach((t) => this.collect(this.players[0], t));
			this.finishStage();
		}
	}
	tick(dt = 1 / 60) {
		if (["idle", "won", "lost", "ended"].includes(this.phase)) return;
		if (
			this.mode === "attack" &&
			(this.raceStarted || this.phase === "playing")
		) {
			this.raceStarted = true;
			this.timeLeft = Math.max(0, this.timeLeft - dt);
			if (this.timeLeft <= 0) {
				this.phase = "won";
				this.emit("finish", { won: true });
				return;
			}
		}
		if (this.phase === "countdown") {
			this.wait -= dt;
			if (this.wait <= 0) {
				this.phase = "playing";
				this.emit("go");
			}
			return;
		}
		if (this.phase === "stageclear") {
			this.wait -= dt;
			if (this.wait <= 0) {
				this.stage++;
				if (this.stage >= 3 && this.mode === "arcade" && !this.attract) {
					this.phase = "won";
					this.emit("finish", { won: true });
				} else {
					this.buildStage();
					this.phase = "countdown";
					this.wait = this.attract ? 0.6 : 1.8;
				}
			}
			return;
		}
		this.elapsed += dt;
		for (const a of [...this.players, ...this.rivals]) this.updateActor(a, dt);
		this.world.step(this.queue);
		const contacts = [];
		this.queue.drainCollisionEvents((h1, h2, started) => {
			if (started)
				contacts.push([this.entities.get(h1), this.entities.get(h2)]);
		});
		for (let [a, b] of contacts) {
			if (!a || !b) continue;
			if (b.kind === "player") [a, b] = [b, a];
			if (a.kind !== "player") continue;
			if (b.kind === "token") this.collect(a.data, b.data);
			if (b.kind === "rival") this.crash(a.data, b.data);
		}
		for (const a of this.players) {
			if (a.nearCooldown > 0 || a.spin) continue;
			for (const b of this.rivals) {
				const d = Math.hypot(a.x - b.x, a.z - b.z);
				if (d < 2.8 && d > 1.25 && Math.abs(a.lane - b.lane) === 1) {
					a.nearCooldown = 1.8;
					this.nearMisses++;
					this.score += 100 * this.multiplier;
					a.boost = Math.min(100, a.boost + 12);
					this.emit("near", { actor: a });
					break;
				}
			}
		}
		for (let i = this.debris.length - 1; i >= 0; i--) {
			const d = this.debris[i];
			d.life -= dt;
			if (d.life <= 0) {
				this.world.removeRigidBody(d.body);
				this.debris.splice(i, 1);
			}
		}
		if (this.remaining === 0 && this.phase === "playing") this.finishStage();
	}
	snapshot() {
		return {
			phase: this.phase,
			seed: this.seed,
			mode: this.mode,
			stage: this.stage,
			score: this.score,
			lives: this.lives,
			remaining: this.remaining,
			stageTotal: this.stageTotal,
			timeLeft: this.timeLeft,
			elapsed: this.elapsed,
			multiplier: this.multiplier,
			chain: this.chain,
			totalCollected: this.totalCollected,
			nearMisses: this.nearMisses,
			gatesTaken: this.gatesTaken,
			boostTime: this.boostTime,
			players: this.players.map((a) => ({
				id: a.id,
				lane: a.lane,
				u: wrap(a.u),
				boost: a.boost,
				invuln: a.invuln,
				shield: a.shield,
				speed: a.speed,
				queueDir: a.queueDir,
				x: a.x,
				z: a.z,
			})),
			rivals: this.rivals.map((a) => ({
				lane: a.lane,
				u: wrap(a.u),
				speed: a.speed,
			})),
			tuning: { ...this.tuning },
		};
	}
	dispose() {
		this.world?.free();
		this.queue?.free();
		this.world = null;
		this.queue = null;
	}
}
