const DEFAULTS = Object.freeze({
	speed: 12.8,
	trafficSpeed: 10.8,
	boostPower: 1.85,
	recharge: 9,
	gateWindow: 2.6,
	lives: 4,
	invincible: false,
});
const ROUND_INFO = [
	{
		name: "THE NIGHT SHIFT",
		note: "Sweep every lane. Mind the oncoming traffic.",
		cars: 1,
		color: "#ff9c43",
	},
	{
		name: "DOUBLE TROUBLE",
		note: "Two rivals. They change lanes at the crossings.",
		cars: 2,
		color: "#91e3c3",
	},
	{
		name: "THE RIOT RUN",
		note: "Three rivals. One last clean sweep.",
		cars: 3,
		color: "#f4c85e",
	},
];
const LANES = [
	{ w: 7.35, h: 3.7, r: 2.25 },
	{ w: 9.65, h: 6, r: 3.25 },
	{ w: 11.95, h: 8.3, r: 4.25 },
	{ w: 14.25, h: 10.6, r: 5.25 },
];
const mod = (x, n = 1) => ((x % n) + n) % n;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const curveCache = LANES.map(({ w, h, r }) => {
	const pieces = [];
	let total = 0;
	const line = (x, z, X, Z) => {
		const len = Math.hypot(X - x, Z - z);
		pieces.push({ len, at: (t) => ({ x: lerp(x, X, t), z: lerp(z, Z, t) }) });
		total += len;
	};
	const arc = (x, z, a) => {
		const len = (r * Math.PI) / 2;
		pieces.push({
			len,
			at: (t) => ({
				x: x + r * Math.cos(a + (t * Math.PI) / 2),
				z: z + r * Math.sin(a + (t * Math.PI) / 2),
			}),
		});
		total += len;
	};
	line(0, -h, w - r, -h);
	arc(w - r, -h + r, -Math.PI / 2);
	line(w, -h + r, w, h - r);
	arc(w - r, h - r, 0);
	line(w - r, h, -w + r, h);
	arc(-w + r, h - r, Math.PI / 2);
	line(-w, h - r, -w, -h + r);
	arc(-w + r, -h + r, Math.PI);
	line(-w + r, -h, 0, -h);
	return { pieces, total };
});
function trackPoint(lane, u) {
	const c = curveCache[clamp(Math.round(lane), 0, 3)];
	let d = mod(u) * c.total;
	for (const p of c.pieces) {
		if (d <= p.len) return p.at(d / p.len);
		d -= p.len;
	}
	return { x: 0, z: -LANES[lane].h };
}
function carPoint(car) {
	const p = trackPoint(car.lane, car.progress);
	if (car.change) {
		const a = trackPoint(car.change.from, car.progress),
			t = car.change.t;
		const smooth = t * t * (3 - 2 * t);
		return { x: lerp(a.x, p.x, smooth), z: lerp(a.z, p.z, smooth) };
	}
	return p;
}
function carHeading(car) {
	const a = trackPoint(car.lane, car.progress),
		b = trackPoint(car.lane, car.progress + 0.001 * car.direction);
	return Math.atan2(b.x - a.x, b.z - a.z);
}
class RiotSimulation {
	constructor(R, onEvent = () => {}) {
		this.R = R;
		this.onEvent = onEvent;
		this.config = { ...DEFAULTS };
		this.world = null;
		this.time = 0;
		this.players = [];
		this.enemies = [];
		this.dots = [];
		this.round = 1;
		this.score = 0;
		this.lives = 4;
		this.combo = 0;
		this.phase = "idle";
		this.events = [];
		this.serial = 0;
		this.seed = 5483;
		this.near = 0;
		this.stats = { dots: 0, boosts: 0, closeCalls: 0, hits: 0 };
	}
	emit(name, data = {}) {
		this.onEvent(name, data);
	}
	rng() {
		this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
		return this.seed / 4294967296;
	}
	start(count = 1, attract = false) {
		this.score = 0;
		this.lives = Math.round(this.config.lives);
		this.time = 0;
		this.combo = 0;
		this.attract = attract;
		this.count = count;
		this.stats = { dots: 0, boosts: 0, closeCalls: 0, hits: 0 };
		this.loadRound(1);
	}
	loadRound(n) {
		this.round = clamp(n, 1, 3);
		if (this.world) this.world.free();
		this.world = new this.R.World({ x: 0, y: 0, z: 0 });
		this.world.timestep = 1 / 60;
		this.serial++;
		this.dots = [];
		this.enemies = [];
		this.players = [];
		this.phase = "countdown";
		this.countdown = 2.4;
		this.roundTime = 0;
		this.combo = 0;
		this.comboTimer = 0;
		this.hazardTimer = 0;
		for (let i = 0; i < (this.count || 1); i++) {
			const p = {
				id: i,
				lane: i ? 2 : 3,
				progress: i ? 0.54 : 0.015,
				direction: 1,
				charge: 100,
				invuln: 3,
				boosting: false,
				boostGrace: 0,
				boostLatch: false,
				boostExhausted: false,
				queued: 0,
				change: null,
				ai: this.attract,
				braking: false,
			};
			this.createBody(p, 0.7);
			this.players.push(p);
		}
		for (let i = 0; i < ROUND_INFO[this.round - 1].cars; i++) {
			const e = {
				id: i,
				lane: i === 0 ? 3 : i === 1 ? 1 : 2,
				progress: 0.52 + i * 0.22,
				direction: -1,
				change: null,
				ai: true,
				turnCooldown: 0,
				nearCooldown: 0,
			};
			this.createBody(e, 0.7);
			this.enemies.push(e);
		}
		for (let lane = 0; lane < 4; lane++)
			for (let i = 0; i < 24; i++) {
				const pos = trackPoint(lane, i / 24);
				const d = {
					lane,
					progress: i / 24,
					collected: false,
					...pos,
					shield: i === 6 && lane === this.round - 1,
				};
				d.collider = this.world.createCollider(
					this.R.ColliderDesc.ball(0.37)
						.setTranslation(pos.x, 0, pos.z)
						.setSensor(true)
						.setActiveCollisionTypes(this.R.ActiveCollisionTypes.ALL),
				);
				this.dots.push(d);
			}
		this.emit("round", { round: this.round });
	}
	createBody(c, r) {
		const pos = carPoint(c);
		c.body = this.world.createRigidBody(
			this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(
				pos.x,
				0,
				pos.z,
			),
		);
		c.collider = this.world.createCollider(
			this.R.ColliderDesc.ball(r)
				.setSensor(true)
				.setActiveCollisionTypes(this.R.ActiveCollisionTypes.ALL),
			c.body,
		);
	}
	requestLane(p, delta) {
		if (!p || p.change) return;
		const next = clamp(p.lane + delta, 0, 3);
		if (next !== p.lane) {
			p.queued = delta;
			p.queueTime = 30;
		} else p.queued = 0;
	}
	changeLane(p, next) {
		if (p.change || next === p.lane) return;
		const from = p.lane;
		p.lane = next;
		p.change = { from, t: 0 };
		p.queued = 0;
		this.emit("lane", { player: p.id });
	}
	gateDistance(c) {
		return (
			Math.abs(mod(c.progress + 0.125, 0.25) - 0.125) * curveCache[c.lane].total
		);
	}
	aiPlayer(p, dt) {
		if (p.change) return;
		const gate = this.gateDistance(p);
		if (gate < 1.15) {
			const left = this.dots.filter(
				(d) => d.lane === p.lane && !d.collected,
			).length;
			let target = p.lane;
			if (left === 0) {
				let best = 1e9;
				for (let l = 0; l < 4; l++) {
					const count = this.dots.filter(
						(d) => d.lane === l && !d.collected,
					).length;
					const cost = Math.abs(l - p.lane) * 4 - count * 0.03;
					if (count && cost < best) {
						target = l;
						best = cost;
					}
				}
			} else {
				const danger = this.enemies.some(
					(e) =>
						e.lane === p.lane &&
						Math.abs(mod(e.progress - p.progress + 0.5) - 0.5) < 0.11,
				);
				if (danger && !this.attract) {
					target = clamp(p.lane + (p.lane === 3 ? -1 : 1), 0, 3);
				}
			}
			if (target !== p.lane)
				this.changeLane(p, p.lane + Math.sign(target - p.lane));
		}
		p.boosting = this.attract && Math.floor(this.time) % 9 < 3 && p.charge > 20;
	}
	tick(dt, inputs = []) {
		dt = Math.min(dt, 0.05);
		this.time += dt;
		if (this.phase === "countdown") {
			this.countdown -= dt;
			if (this.countdown <= 0) {
				this.phase = "running";
				this.emit("go");
			}
			return;
		}
		if (this.phase === "clear") {
			this.countdown -= dt;
			if (this.countdown <= 0) {
				if (this.round < 3) this.loadRound(this.round + 1);
				else {
					this.phase = "won";
					this.emit("win");
				}
			}
			return;
		}
		if (this.phase !== "running") return;
		this.roundTime += dt;
		this.comboTimer = Math.max(0, this.comboTimer - dt);
		if (this.comboTimer === 0) this.combo = 0;
		this.players.forEach((p, i) => {
			const input = inputs[i] || {};
			p.invuln = Math.max(0, p.invuln - dt);
			p.boostGrace = Math.max(0, p.boostGrace - dt);
			if (p.ai || input.assist) this.aiPlayer(p, dt);
			else p.boosting = !!input.boost;
			const wantsBoost = p.boosting || !!input.boost;
			if (!wantsBoost) p.boostExhausted = false;
			p.boosting =
				wantsBoost &&
				!p.boostExhausted &&
				p.charge > 0 &&
				(p.boostLatch || p.charge >= 12);
			if (input.lane) this.requestLane(p, input.lane);
			p.braking = !!input.brake;
			if (p.queued) {
				p.queueTime -= dt;
				if (this.gateDistance(p) < this.config.gateWindow)
					this.changeLane(p, clamp(p.lane + p.queued, 0, 3));
			}
			if (p.boosting && !p.boostLatch) {
				p.boostGrace = 0.48;
				this.stats.boosts++;
				this.emit("boost", { player: i });
			}
			p.boostLatch = p.boosting;
			p.charge = clamp(
				p.charge + dt * (p.boosting ? -34 : this.config.recharge),
				0,
				100,
			);
			if (p.boosting && p.charge === 0) p.boostExhausted = true;
			const speed =
				this.config.speed *
				(p.boosting ? this.config.boostPower : p.braking ? 0.55 : 1);
			p.progress = mod(p.progress + (speed / curveCache[p.lane].total) * dt);
			if (p.change) {
				p.change.t += dt / 0.22;
				if (p.change.t >= 1) p.change = null;
			}
			const at = carPoint(p);
			p.body.setNextKinematicTranslation({ x: at.x, y: 0, z: at.z });
		});
		this.enemies.forEach((e, i) => {
			e.turnCooldown = Math.max(0, e.turnCooldown - dt);
			e.nearCooldown = Math.max(0, e.nearCooldown - dt);
			if (
				this.round > 1 &&
				!e.change &&
				e.turnCooldown === 0 &&
				this.gateDistance(e) < 0.75
			) {
				e.turnCooldown = 2.8;
				const nearest = this.players.reduce(
					(a, p) =>
						Math.abs(mod(p.progress - e.progress + 0.5) - 0.5) <
						Math.abs(mod(a.progress - e.progress + 0.5) - 0.5)
							? p
							: a,
					this.players[0],
				);
				if (this.rng() < (this.round === 3 ? 0.85 : 0.6)) {
					const dir =
						nearest.lane === e.lane
							? this.rng() < 0.5
								? 1
								: -1
							: Math.sign(nearest.lane - e.lane);
					this.changeLane(e, clamp(e.lane + dir, 0, 3));
				}
			}
			e.progress = mod(
				e.progress -
					((this.config.trafficSpeed + (this.round - 1) * 1.5 + i * 0.5) /
						curveCache[e.lane].total) *
						dt,
			);
			if (e.change) {
				e.change.t += dt / 0.32;
				if (e.change.t >= 1) e.change = null;
			}
			const at = carPoint(e);
			e.body.setNextKinematicTranslation({ x: at.x, y: 0, z: at.z });
		});
		this.world.timestep = dt;
		this.world.step();
		this.players.forEach((p) => {
			for (const d of this.dots) {
				if (
					!d.collected &&
					this.world.intersectionPair(p.collider, d.collider)
				) {
					d.collected = true;
					d.collider.setEnabled(false);
					this.stats.dots++;
					this.combo++;
					this.comboTimer = 2.2;
					const mult = 1 + Math.min(4, Math.floor(this.combo / 12));
					this.score += 10 * mult;
					p.charge = clamp(p.charge + 1.4, 0, 100);
					if (d.shield) {
						p.invuln = 5;
						this.emit("shield", { player: p.id });
					}
					this.emit("dot", { ...d, combo: this.combo, mult, player: p.id });
				}
			}
			for (const e of this.enemies) {
				if (this.world.intersectionPair(p.collider, e.collider)) {
					if (
						p.invuln <= 0 &&
						p.boostGrace <= 0 &&
						!this.attract &&
						!this.config.invincible
					)
						this.hit(p);
					else if (e.nearCooldown <= 0) {
						e.nearCooldown = 2;
						this.stats.closeCalls++;
						this.score += 50;
						this.emit("close", { player: p.id });
					}
				} else if (
					!e.nearCooldown &&
					Math.hypot(
						carPoint(p).x - carPoint(e).x,
						carPoint(p).z - carPoint(e).z,
					) < 2.8
				) {
					e.nearCooldown = 2;
					this.score += 25;
					this.stats.closeCalls++;
					this.emit("close", { player: p.id });
				}
			}
		});
		if (this.dots.every((d) => d.collected) && this.phase === "running") {
			this.phase = "clear";
			this.countdown = 3.2;
			this.score += 500 + Math.max(0, Math.floor(120 - this.roundTime)) * 5;
			this.emit("clear", { round: this.round });
		}
	}
	hit(p = this.players[0]) {
		if (this.phase !== "running") return;
		this.lives--;
		this.stats.hits++;
		this.combo = 0;
		p.invuln = 3.5;
		p.charge = Math.max(p.charge, 35);
		this.emit("hit", { player: p.id });
		if (this.lives <= 0) {
			this.phase = "lost";
			this.emit("lose");
		}
	}
	collectAll() {
		for (const d of this.dots)
			if (!d.collected) {
				d.collected = true;
				d.collider.setEnabled(false);
				this.stats.dots++;
				this.score += 10;
			}
		if (this.phase === "countdown") this.phase = "running";
		this.tick(1 / 60, []);
	}
	snapshot() {
		return {
			phase: this.phase,
			round: this.round,
			roundTime: this.roundTime,
			score: this.score,
			lives: this.lives,
			time: this.time,
			countdown: this.countdown,
			combo: this.combo,
			serial: this.serial,
			attract: this.attract,
			players: this.players.map(
				({
					id,
					lane,
					progress,
					direction,
					charge,
					invuln,
					boosting,
					queued,
					change,
					braking,
					boostGrace,
				}) => ({
					id,
					lane,
					progress,
					direction,
					charge,
					invuln,
					boosting,
					queued,
					change: change ? { ...change } : null,
					braking,
					boostGrace,
				}),
			),
			enemies: this.enemies.map(
				({ id, lane, progress, direction, change }) => ({
					id,
					lane,
					progress,
					direction,
					change: change ? { ...change } : null,
				}),
			),
			dots: this.dots.map((d) => (d.collected ? 1 : 0)),
			dotsLeft: this.dots.filter((d) => !d.collected).length,
			stats: { ...this.stats },
		};
	}
	apply(s) {
		if (
			this.round !== s.round ||
			!this.world ||
			this.players.length !== s.players.length
		) {
			this.count = s.players.length;
			this.loadRound(s.round);
		}
		for (const key of [
			"phase",
			"round",
			"roundTime",
			"score",
			"lives",
			"time",
			"countdown",
			"combo",
			"attract",
			"stats",
		])
			this[key] = s[key];
		s.players.forEach((p, i) => Object.assign(this.players[i], p));
		s.enemies.forEach(
			(e, i) => this.enemies[i] && Object.assign(this.enemies[i], e),
		);
		s.dots.forEach((d, i) => (this.dots[i].collected = !!d));
	}
}
