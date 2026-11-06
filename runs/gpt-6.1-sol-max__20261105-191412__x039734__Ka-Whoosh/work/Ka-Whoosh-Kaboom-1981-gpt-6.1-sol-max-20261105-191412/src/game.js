import R from "@dimforge/rapier3d-compat";
export const DEFAULTS = {
	fall: 1,
	rate: 1,
	width: 1.85,
	speed: 18,
	gravity: 4.6,
	recharge: 7,
	timeScale: 1,
};
export const WAVES = [
	{
		name: "A little drip",
		subtitle: "KEEP THE WATER UNDER THE FUSE.",
		count: 18,
		interval: 0.94,
		fall: 2.7,
		wind: 0,
		tip: "Catch the bombs. Three misses and the shift is over.",
	},
	{
		name: "The golden hour",
		subtitle: "SOME TROUBLE IS WORTH EXTRA.",
		count: 24,
		interval: 0.8,
		fall: 3,
		wind: 0,
		tip: "Gold bombs: bonus points and a big douse refill.",
	},
	{
		name: "Breeze, please",
		subtitle: "THE WIND HAS OTHER PLANS.",
		count: 28,
		interval: 0.74,
		fall: 3.2,
		wind: 1.1,
		tip: "Watch the drift. Lead the bomb, not the bandit.",
	},
	{
		name: "Double delivery",
		subtitle: "TWO FOR THE PRICE OF PANIC.",
		count: 32,
		interval: 0.67,
		fall: 3.5,
		wind: 0.35,
		tip: "Paired drops! Keep your tubs moving.",
	},
	{
		name: "Short fuse",
		subtitle: "QUICK FEET. COOL WATER.",
		count: 38,
		interval: 0.58,
		fall: 3.8,
		wind: 0.6,
		tip: "Red rush bombs fall faster. They still hate water.",
	},
	{
		name: "The last splash",
		subtitle: "MAKE IT RAIN.",
		count: 44,
		interval: 0.5,
		fall: 4,
		wind: 0.9,
		tip: "Everything at once. Save a douse for the big finish.",
	},
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function rng(seed) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
export class Game {
	constructor(stage, sound, emit) {
		this.view = stage;
		this.sound = sound;
		this.emit = emit;
		this.tune = { ...DEFAULTS };
		this.invulnerable = false;
		this.auto = false;
		this.hitboxes = false;
		this.effects = true;
		this.phase = "idle";
		this.bombs = [];
		this.players = [];
		this.id = 1;
		this.accumulator = 0;
		this.clock = 0;
		this.elapsed = 0;
		this.score = 0;
		this.charge = 100;
		this.stats = {};
		this.mode = "solo";
		this.difficulty = "arcade";
		this.assist = false;
		this.unranked = false;
	}
	async init() {
		await R.init();
		this.version = R.version();
		this.makeWorld();
	}
	makeWorld() {
		if (this.world) this.world.free();
		if (this.events) this.events.free();
		this.world = new R.World({ x: 0, y: -this.tune.gravity, z: 0 });
		this.world.timestep = 1 / 120;
		this.events = new R.EventQueue(true);
		this.bombs = [];
		this.colliderBomb = new Map();
		this.colliderPlayer = new Map();
		const floor = this.world.createRigidBody(
			R.RigidBodyDesc.fixed().setTranslation(0, 0.33, 0),
		);
		this.world.createCollider(
			R.ColliderDesc.cuboid(15, 0.1, 4).setCollisionGroups((8 << 16) | 4),
			floor,
		);
		this.debris = [];
	}
	start({
		mode = "solo",
		seed = 0x1981,
		attract = false,
		difficulty = this.difficulty,
	} = {}) {
		this.mode = mode;
		this.attract = attract;
		this.difficulty = difficulty;
		this.random = rng(seed);
		this.seed = seed;
		this.makeWorld();
		this.view.clearBombs();
		this.view.setPlayers(mode === "coop" ? 2 : 1);
		this.players = Array.from({ length: mode === "coop" ? 2 : 1 }, (_, i) => ({
			x: mode === "coop" ? (i ? 3 : -3) : 0,
			buckets: 3,
			velocity: 0,
		}));
		this.players.forEach((p, i) => {
			this.makePlayerBody(p, i);
		});
		this.wave = 0;
		this.score = 0;
		this.charge = 100;
		this.combo = 0;
		this.multiplier = 1;
		this.elapsed = 0;
		this.clock = 0;
		this.accumulator = 0;
		this.grace = 0;
		this.douseFlash = 0;
		this.completed = false;
		this.stats = {
			caught: 0,
			perfect: 0,
			gold: 0,
			misses: 0,
			doused: 0,
			douses: 0,
			bestCombo: 0,
			stages: 0,
		};
		this.unranked =
			this.auto ||
			this.invulnerable ||
			Object.keys(DEFAULTS).some((k) => this.tune[k] !== DEFAULTS[k]);
		this.beginWave(0);
		this.view.targetOffset = 0;
		this.emit("start", { attract });
		if (!attract) {
			this.sound.play("start");
			this.sound.babble(true);
		}
	}
	makePlayerBody(p, i) {
		p.body = this.world.createRigidBody(
			R.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, 0, 0.45),
		);
		p.sensors = [];
		for (let j = 0; j < 3; j++) {
			const c = this.world.createCollider(
				R.ColliderDesc.cuboid(this.effectiveWidth() / 2, 0.11, 0.8)
					.setTranslation(0, 1.36 + j * 0.82, 0)
					.setSensor(true)
					.setCollisionGroups((2 << 16) | 1)
					.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
				p.body,
			);
			p.sensors.push(c);
			this.colliderPlayer.set(c.handle, { i, j });
		}
	}
	effectiveWidth() {
		return (
			this.tune.width *
			(this.difficulty === "chill"
				? 1.22
				: this.difficulty === "wild"
					? 0.87
					: 1) *
			(this.assist ? 1.13 : 1)
		);
	}
	applyTune() {
		this.world.gravity = { x: 0, y: -this.tune.gravity, z: 0 };
		for (const p of this.players)
			for (const c of p.sensors)
				c.setShape(new R.Cuboid(this.effectiveWidth() / 2, 0.11, 0.8));
	}
	beginWave(index) {
		this.wave = index;
		this.waveClock = 0;
		this.spawned = 0;
		this.spawnTimer = 0.6;
		this.waveMisses = 0;
		this.phase = "intro";
		this.phaseTimer = 2.4;
		this.bomberX = 0;
		this.emit("wave", { index, ...WAVES[index] });
	}
	positionAt(time = this.waveClock) {
		const k = this.wave,
			t = time * 0.75;
		if (k === 0) return Math.sin(t) * 6.8;
		if (k === 1) return Math.sin(t * 0.9) * 5.8 + Math.sin(t * 2.1) * 1.5;
		if (k === 2) return Math.sin(t * 1.12) * 7;
		if (k === 3) return Math.sin(t * 1.18) * 6.5 + Math.sin(t * 3) * 0.5;
		return (
			Math.sin(t * (1.25 + (k - 4) * 0.17)) * 6.5 + Math.sin(t * 2.4) * 1.1
		);
	}
	spawn(kind = null, x = null, y = 9.9) {
		if (!this.players.length) return null;
		const w = WAVES[this.wave];
		kind ??=
			this.wave >= 1 && this.spawned % 9 === 7
				? "gold"
				: this.wave >= 4 && this.spawned % 4 === 2
					? "rush"
					: "normal";
		const diff =
			this.difficulty === "chill" ? 0.8 : this.difficulty === "wild" ? 1.2 : 1;
		const wind = w.wind * Math.sin(this.waveClock * 0.4 + 0.7);
		const bx = clamp(x ?? this.bomberX, -9, 9),
			vx = wind * 0.9;
		const body = this.world.createRigidBody(
			R.RigidBodyDesc.dynamic()
				.setTranslation(bx, y, 0.45)
				.setLinvel(
					vx,
					-w.fall * this.tune.fall * diff * (kind === "rush" ? 1.55 : 1),
					0,
				)
				.setCcdEnabled(true)
				.enabledTranslations(true, true, false)
				.enabledRotations(false, false, false),
		);
		const c = this.world.createCollider(
			R.ColliderDesc.ball(0.29)
				.setCollisionGroups((1 << 16) | 2)
				.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS)
				.setRestitution(0),
			body,
		);
		const b = {
			id: this.id++,
			kind,
			body,
			collider: c,
			x: bx,
			y,
			prevY: y,
			vx,
			spin: (this.random() - 0.5) * 0.5,
			wind,
			dead: false,
		};
		this.bombs.push(b);
		this.colliderBomb.set(c.handle, b);
		if (this.effects) this.view.addBomb(b);
		if (!this.attract) this.sound.play("drop");
		return b;
	}
	remove(b) {
		if (b.dead) return;
		b.dead = true;
		this.colliderBomb.delete(b.collider.handle);
		this.world.removeRigidBody(b.body);
		this.view.removeBomb(b.id);
	}
	clear() {
		for (const b of this.bombs) if (!b.dead) this.remove(b);
		this.bombs = [];
	}
	douse() {
		if (!["playing", "intro"].includes(this.phase) || this.charge < 99.9) {
			if (!this.attract) this.sound.play("empty");
			return false;
		}
		this.charge = 0;
		this.stats.douses++;
		this.douseFlash = 1;
		for (const b of this.bombs) {
			if (b.dead) continue;
			this.score += 5 * this.multiplier;
			this.stats.doused++;
			if (this.effects) this.view.burst(b.x, b.y, "water", 18);
			this.remove(b);
		}
		this.bombs = [];
		if (this.effects) {
			this.view.ring(this.players[0].x, 1.5, undefined, true);
			this.view.popup("DOUSED!", this.players[0].x, 4.2, "#8aeeed", 1);
		}
		if (!this.attract) this.sound.play("douse");
		this.emit("douse");
		return true;
	}
	catch(b, i) {
		if (b.dead) return;
		const p = this.players[i],
			perfect = Math.abs(b.x - p.x) < this.effectiveWidth() * 0.2;
		const gold = b.kind === "gold",
			base = gold ? 60 : perfect ? 20 : 10;
		this.score += base * this.multiplier;
		this.combo++;
		this.multiplier = Math.min(5, 1 + Math.floor(this.combo / 10));
		this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
		this.stats.caught++;
		if (perfect) this.stats.perfect++;
		if (gold) this.stats.gold++;
		this.charge = clamp(this.charge + (gold ? 28 : this.tune.recharge), 0, 100);
		if (this.effects) {
			this.view.splash(i);
			this.view.burst(b.x, b.y, gold ? "gold" : "water", gold ? 40 : 20);
			this.view.ring(b.x, b.y);
			if (gold)
				this.view.popup(
					`GOLD! +${base * this.multiplier}`,
					b.x,
					b.y + 0.65,
					"#ffdf6c",
					0.7,
				);
			else if (this.combo % 10 === 0)
				this.view.popup(
					`×${this.multiplier} SPLASH!`,
					b.x,
					b.y + 1,
					"#a0f3e0",
					0.75,
				);
			else if (perfect && this.stats.perfect % 3 === 1)
				this.view.popup("PERFECT", b.x, b.y + 0.6, "#fff2cd", 0.48);
		}
		if (!this.attract)
			this.sound.play(
				gold ? "gold" : perfect ? "perfect" : "catch",
				0.9 + this.multiplier * 0.07,
			);
		this.remove(b);
		this.emit("catch", { i, gold, perfect });
	}
	miss(b) {
		if (b.kind === "gold") {
			this.remove(b);
			return;
		}
		if (this.grace > 0) {
			this.remove(b);
			return;
		}
		const active = this.players
			.map((p, i) => ({ p, i }))
			.filter((o) => o.p.buckets > 0);
		if (!active.length) return;
		active.sort((a, c) => Math.abs(a.p.x - b.x) - Math.abs(c.p.x - b.x));
		const { p, i } = active[0];
		this.stats.misses++;
		this.waveMisses++;
		this.combo = 0;
		this.multiplier = 1;
		if (!this.invulnerable && !this.attract) {
			p.buckets--;
			this.syncSensors(p);
		}
		this.charge = clamp(this.charge + 15, 0, 100);
		this.grace = 1;
		this.spawnTimer = Math.max(this.spawnTimer, 0.9);
		if (this.effects) {
			this.view.burst(b.x, 0.8, "boom", 55);
			this.view.shake = 0.5;
			this.view.popup(
				this.attract || this.invulnerable ? "PHEW!" : "ONE TUB DOWN",
				clamp(b.x, -6, 6),
				2,
				"#ffb36d",
				0.85,
			);
		}
		if (!this.attract) {
			this.sound.play("boom");
			this.sound.babble(false);
		}
		this.clear();
		this.emit("miss", { i });
		if (this.players.every((p) => p.buckets <= 0)) this.finish(false);
	}
	syncSensors(p) {
		p.sensors.forEach((c, j) => {
			c.setEnabled(j < p.buckets);
		});
	}
	restore() {
		for (const p of this.players) {
			p.buckets = Math.min(3, p.buckets + 1);
			this.syncSensors(p);
		}
		this.charge = clamp(this.charge + 25, 0, 100);
	}
	finish(won, reason = "complete") {
		if (["won", "lost", "ended"].includes(this.phase)) return;
		this.phase = won ? "won" : "lost";
		this.completed = won;
		this.clear();
		if (won) {
			this.score += 1000;
			this.stats.stages = 6;
			if (!this.attract) {
				this.sound.play("win");
				this.sound.babble(true);
			}
		}
		this.emit("finish", {
			won,
			reason,
			score: this.score,
			stats: { ...this.stats },
			unranked: this.unranked,
			attract: this.attract,
		});
	}
	aiTarget(i) {
		const p = this.players[i];
		let nearest = null,
			best = Infinity;
		for (const b of this.bombs) {
			if (b.dead) continue;
			if (
				this.mode === "coop" &&
				this.players.every((p) => p.buckets > 0) &&
				(i === 0 ? b.x > 0 : b.x < 0)
			)
				continue;
			const v = b.body.linvel(),
				dy = Math.max(0, b.y - (1.36 + (p.buckets - 1) * 0.82)),
				t =
					(-Math.abs(v.y) + Math.sqrt(v.y * v.y + 2 * this.tune.gravity * dy)) /
					Math.max(0.01, this.tune.gravity);
			if (t < best) {
				best = t;
				nearest = clamp(b.x + v.x * t + b.wind * 0.12 * t * t, -9.2, 9.2);
			}
		}
		return nearest ?? this.bomberX;
	}
	update(dt, inputs = []) {
		if (["idle", "won", "lost", "ended"].includes(this.phase)) return;
		this.accumulator += Math.min(dt, 0.25) * this.tune.timeScale;
		while (this.accumulator >= 1 / 120) {
			this.step(1 / 120, inputs);
			this.accumulator -= 1 / 120;
			if (["won", "lost"].includes(this.phase)) break;
		}
	}
	step(dt, inputs = []) {
		if (["idle", "won", "lost", "ended"].includes(this.phase)) return;
		this.clock += dt;
		this.elapsed += dt;
		this.grace = Math.max(0, this.grace - dt);
		this.douseFlash = Math.max(0, this.douseFlash - dt * 2);
		for (let i = 0; i < this.players.length; i++) {
			const p = this.players[i],
				input = inputs[i] || {};
			if (p.buckets <= 0) continue;
			let target = input.target;
			if (this.attract || this.auto) target = this.aiTarget(i);
			let delta = Number.isFinite(target)
				? clamp(target - p.x, -this.tune.speed * dt, this.tune.speed * dt)
				: (input.axis || 0) * this.tune.speed * dt;
			// Kiosk AI may teleport to demonstrate every mechanic without losing the show.
			if (this.attract && Number.isFinite(target)) delta = target - p.x;
			p.x = clamp(p.x + delta, -9.15, 9.15);
			p.velocity = delta / dt;
			p.body.setNextKinematicTranslation({ x: p.x, y: 0, z: 0.45 });
		}
		if (this.phase === "intro") {
			this.phaseTimer -= dt;
			this.bomberX = this.positionAt(0);
			if (this.phaseTimer <= 0) {
				this.phase = "playing";
				this.emit("go");
			}
		} else if (this.phase === "intermission") {
			this.phaseTimer -= dt;
			this.bomberX = this.positionAt();
			if (this.phaseTimer <= 0) {
				this.restore();
				this.beginWave(this.wave + 1);
			}
		} else if (this.phase === "playing") {
			this.waveClock += dt;
			this.bomberX = this.positionAt();
			const w = WAVES[this.wave];
			this.spawnTimer -= dt;
			if (this.spawnTimer <= 0 && this.spawned < w.count && this.grace === 0) {
				this.spawn();
				this.spawned++;
				if (
					this.wave >= 3 &&
					this.spawned % 6 === 0 &&
					this.spawned < w.count
				) {
					this.spawn(
						"normal",
						this.bomberX + (this.bomberX > 0 ? -0.8 : 0.8),
						10.15,
					);
					this.spawned++;
				}
				this.spawnTimer =
					(w.interval / this.tune.rate) *
					(this.difficulty === "chill"
						? 1.18
						: this.difficulty === "wild"
							? 0.87
							: 1);
			}
			this.charge = clamp(this.charge + dt * 0.65, 0, 100);
			if (
				this.attract &&
				this.charge >= 100 &&
				this.bombs.length >= 2 &&
				this.stats.douses < this.wave + 1
			)
				this.douse();
			if (this.spawned >= w.count && this.bombs.every((b) => b.dead)) {
				this.stats.stages = this.wave + 1;
				this.score += 150 * (this.wave + 1) + (this.waveMisses === 0 ? 200 : 0);
				if (this.wave === 5) this.finish(true);
				else {
					this.phase = "intermission";
					this.phaseTimer = 2.8;
					this.emit("clear", {
						wave: this.wave,
						perfect: this.waveMisses === 0,
					});
					if (!this.attract) this.sound.play("gold");
				}
			}
		}
		this.world.step(this.events);
		const caught = [];
		this.events.drainCollisionEvents((a, b, started) => {
			if (!started) return;
			const bomb = this.colliderBomb.get(a) || this.colliderBomb.get(b),
				player = this.colliderPlayer.get(a) || this.colliderPlayer.get(b);
			if (bomb && player && player.j < this.players[player.i].buckets)
				caught.push([bomb, player.i]);
		});
		// Read positions before consuming the sensor events.
		for (const b of this.bombs) {
			if (b.dead) continue;
			const p = b.body.translation();
			b.prevY = b.y;
			b.x = p.x;
			b.y = p.y;
			if (b.wind) {
				b.body.resetForces(true);
				b.body.addForce({ x: b.wind * 0.02, y: 0, z: 0 }, true);
			}
		}
		for (const [b, i] of caught) if (!b.dead) this.catch(b, i);
		for (const b of [...this.bombs]) {
			if (b.dead) continue;
			if (b.y < 0.65 || Math.abs(b.x) > 11) {
				this.miss(b);
				if (this.phase === "lost") break;
			}
		}
		this.bombs = this.bombs.filter((b) => !b.dead);
	}
	jumpWave(index) {
		if (this.phase === "idle") return;
		this.unranked = true;
		this.clear();
		this.restore();
		this.beginWave(clamp(index, 0, 5));
	}
	snapshot() {
		return {
			phase: this.phase,
			wave: this.wave,
			score: this.score,
			charge: this.charge,
			combo: this.combo,
			multiplier: this.multiplier,
			elapsed: this.elapsed,
			spawned: this.spawned,
			players: this.players.map((p) => ({ x: p.x, buckets: p.buckets })),
			bombs: this.bombs.map((b) => ({
				id: b.id,
				x: b.x,
				y: b.y,
				kind: b.kind,
			})),
			stats: { ...this.stats },
			unranked: this.unranked,
			seed: this.seed,
		};
	}
}
