export const DEFAULTS = Object.freeze({
	playerSpeed: 12,
	fireRate: 6,
	enemySpeed: 1,
	enemyFire: 1,
	pulseCooldown: 7,
	damage: 1,
	gameSpeed: 1,
});
export const WAVES = [
	{
		name: "WINGING IT",
		subtitle: "They came for the ice. You brought the heat.",
		count: 9,
		max: 3,
		types: ["moth"],
		hint: "Slide beneath them. Hold fire. Keep moving.",
	},
	{
		name: "A WARM WELCOME",
		subtitle: "The sky has developed a temper.",
		count: 11,
		max: 4,
		types: ["moth", "firebird"],
		hint: "Firebirds throw fans of fire. Pulse turns them back.",
	},
	{
		name: "DOUBLE TROUBLE",
		subtitle: "One down. Two very angry problems.",
		count: 10,
		max: 4,
		types: ["splitter", "moth"],
		hint: "Split demons become two diving imps. Finish both!",
	},
	{
		name: "COLD SHOULDER",
		subtitle: "Thick shells. Thin patience.",
		count: 11,
		max: 4,
		types: ["armor", "splitter", "firebird"],
		hint: "Armored demons take four hits. Watch the beam warnings.",
	},
	{
		name: "THE WHOLE FLOCK",
		subtitle: "Nobody said this was a fair fight.",
		count: 15,
		max: 5,
		types: ["splitter", "firebird", "armor", "moth"],
		hint: "Grab golden overdrive. A clean wave earns a bunker.",
	},
	{
		name: "THE BIG FLAP",
		subtitle: "Royalty has arrived. Return to sender.",
		count: 1,
		max: 1,
		types: ["boss"],
		hint: "Break the orbiting seals, then hit the crowned demon.",
	},
];
export const COLORS = ["#9ceaca", "#ff987e", "#b5a5ff", "#ffda81"];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function rng(seed = 12345) {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
export class Game {
	constructor(R, options = {}) {
		this.R = R;
		this.tuning = { ...DEFAULTS };
		this.listeners = [];
		this.seed = options.seed ?? 1982;
		this.random = rng(this.seed);
		this.world = new R.World({ x: 0, y: 0 });
		this.queue = new R.EventQueue(true);
		this.world.timestep = 1 / 60;
		this.entities = new Map();
		this.colliders = new Map();
		this.inputs = new Map();
		this.players = [];
		this.nextId = 1;
		this.stats = {
			shots: 0,
			hits: 0,
			kills: 0,
			splits: 0,
			dives: 0,
			pulses: 0,
			reflected: 0,
			dashes: 0,
			pickups: 0,
			cleanWaves: 0,
			collisions: 0,
			beams: 0,
		};
		this.phase = "idle";
		this.time = 0;
		this.wave = 0;
		this.score = 0;
		this.combo = 0;
		this.comboTime = 0;
		this.lives = 3;
		this.maxLives = 6;
		this.god = false;
		this.bot = false;
		this.endless = false;
		this.run = 0;
		this.upgrades = { twin: 0, cool: 0, power: 0 };
		this.hitWave = false;
		this.events = [];
	}
	on(fn) {
		this.listeners.push(fn);
		return () => this.listeners.splice(this.listeners.indexOf(fn), 1);
	}
	emit(type, data = {}) {
		const e = { type, ...data };
		this.events.push(e);
		for (const fn of this.listeners) fn(e);
	}
	clear() {
		for (const e of [...this.entities.values()]) this.remove(e);
		this.entities.clear();
		this.colliders.clear();
		this.inputs.clear();
		this.players = [];
	}
	start(count = 1, { attract = false, seed = this.seed } = {}) {
		this.clear();
		this.random = rng(seed);
		this.seed = seed;
		this.nextId = 1;
		this.time = 0;
		this.wave = 0;
		this.score = 0;
		this.combo = 0;
		this.comboTime = 0;
		this.lives = count > 1 ? 5 : 3;
		this.god = attract;
		this.bot = attract;
		this.attract = attract;
		this.run = 0;
		this.endless = false;
		this.upgrades = { twin: 0, cool: 0, power: 0 };
		for (const k of Object.keys(this.stats)) this.stats[k] = 0;
		for (let i = 0; i < count; i++) this.addPlayer(i, count);
		this.beginWave(0);
	}
	addPlayer(seat, count = 1) {
		const p = this.spawn("player", -3 * (count - 1) + seat * 6, -6.4, {
			seat,
			hp: 1,
			radius: 0.55,
		});
		p.cool = 0;
		p.pulse = 0;
		p.dash = 0;
		p.dashLeft = 0;
		p.invul = 2;
		p.aim = 0;
		p.overdrive = 0;
		p.score = 0;
		p.lastDir = seat % 2 ? -1 : 1;
		p.connected = true;
		this.players.push(p);
		return p;
	}
	spawn(kind, x, y, data = {}) {
		const R = this.R,
			id = this.nextId++;
		const dynamic = kind === "shot" || kind === "bomb" || kind === "pickup";
		const desc = dynamic
			? R.RigidBodyDesc.dynamic()
			: R.RigidBodyDesc.kinematicPositionBased();
		desc.setTranslation(x, y).setGravityScale(0).setCanSleep(false);
		if (dynamic) desc.setCcdEnabled(true).setLinearDamping(0);
		const body = this.world.createRigidBody(desc);
		const group = { player: 1, enemy: 2, shot: 4, bomb: 8, pickup: 16 }[kind];
		const filter = { player: 26, enemy: 5, shot: 2, bomb: 1, pickup: 1 }[kind];
		const shape = R.ColliderDesc.ball(data.radius ?? 0.22)
			.setSensor(true)
			.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS)
			.setActiveCollisionTypes(R.ActiveCollisionTypes.ALL)
			.setCollisionGroups((group << 16) | filter);
		const collider = this.world.createCollider(shape, body);
		const e = {
			id,
			kind,
			x,
			y,
			prevX: x,
			prevY: y,
			vx: 0,
			vy: 0,
			age: 0,
			dead: false,
			body,
			collider,
			radius: data.radius ?? 0.22,
			...data,
		};
		this.entities.set(id, e);
		this.colliders.set(collider.handle, e);
		if (dynamic) body.setLinvel({ x: e.vx, y: e.vy }, true);
		this.emit("spawn", { entity: e });
		return e;
	}
	remove(e) {
		if (!e || e.dead) return;
		e.dead = true;
		this.colliders.delete(e.collider.handle);
		this.entities.delete(e.id);
		this.world.removeRigidBody(e.body);
		this.emit("remove", { id: e.id });
	}
	enemy(type, x, y, extra = {}) {
		const hp =
			{
				moth: 1,
				firebird: 2,
				splitter: 2,
				armor: 4,
				imp: 1,
				seal: 5,
				boss: 90 + this.players.length * 20,
			}[type] ?? 1;
		const e = this.spawn("enemy", x, y, {
			type,
			hp,
			maxHp: hp,
			radius:
				type === "boss"
					? 2.15
					: type === "seal"
						? 0.57
						: type === "imp"
							? 0.42
							: 0.78,
			baseX: x,
			baseY: y,
			phase: this.random() * 6.28,
			fire: 1.3 + this.random() * 2.5,
			phaseNo: 1,
			shield: false,
			...extra,
		});
		if (type === "boss") this.spawnSeals(e);
		return e;
	}
	spawnSeals(boss) {
		boss.shield = true;
		for (let i = 0; i < 3; i++)
			this.enemy(
				"seal",
				boss.x + Math.cos(i * 2.094) * 3.3,
				boss.y + Math.sin(i * 2.094) * 1.5,
				{ parent: boss.id, orbit: i * 2.094 },
			);
		this.emit("shield", { x: boss.x, y: boss.y });
	}
	beginWave(index) {
		// Each wave is a separate Rapier arena. Rebuild its broad phase rather than
		// recycling every collider handle at once during a wave transition.
		const retained = this.players
			.filter((p) => p.connected)
			.map((p) => ({
				seat: p.seat,
				x: p.x,
				score: p.score,
				overdrive: p.overdrive,
				pulse: p.pulse,
				connected: p.connected,
			}));
		this.clear();
		this.queue.free();
		this.world.free();
		this.world = new this.R.World({ x: 0, y: 0 });
		this.queue = new this.R.EventQueue(true);
		this.world.timestep = 1 / 60;
		for (const old of retained) {
			const p = this.addPlayer(old.seat, 1);
			p.x = old.x;
			p.body.setTranslation({ x: p.x, y: p.y }, true);
			p.score = old.score;
			p.overdrive = old.overdrive;
			p.pulse = old.pulse;
			p.connected = old.connected;
		}
		this.wave = index;
		this.hitWave = false;
		this.spawned = 0;
		this.spawnTimer = 0.45;
		this.waveKills = 0;
		this.waveTime = 0;
		this.phase = "playing";
		for (const e of [...this.entities.values()])
			if (e.kind !== "player") this.remove(e);
		for (const p of this.players) {
			p.invul = 2;
			p.pulse = Math.min(p.pulse, 1);
		}
		this.emit("wave", {
			wave: index,
			name: WAVES[index % 6].name,
			hint: WAVES[index % 6].hint,
		});
	}
	setInput(seat, input) {
		this.inputs.set(seat, {
			move: clamp(Number(input.move) || 0, -1, 1),
			aim: clamp(Number(input.aim) || 0, -0.38, 0.38),
			fire: !!input.fire,
			pulse: !!input.pulse,
			dash: !!input.dash,
		});
	}
	fireShot(p, angle = p.aim, reflected = false, x = p.x, y = p.y + 0.7) {
		const speed = reflected ? 25 : 24;
		const e = this.spawn("shot", x, y, {
			vx: Math.sin(angle) * speed,
			vy: Math.cos(angle) * speed,
			owner: p.seat,
			damage:
				this.tuning.damage +
				(p.overdrive > 0 ? 1 : 0) +
				this.upgrades.power * 0.45,
			reflected,
			radius: 0.16,
		});
		this.stats.shots++;
		return e;
	}
	fireBomb(e, vx, vy, type = "orb") {
		return this.spawn("bomb", e.x, e.y - 0.5, {
			vx,
			vy,
			radius: type === "beam" ? 0.48 : 0.23,
			type,
			life: 5,
		});
	}
	pulse(p) {
		if (p.pulse > 0) return false;
		p.pulse = Math.max(1, this.tuning.pulseCooldown - this.upgrades.cool * 1.8);
		p.invul = Math.max(p.invul, 0.65);
		this.stats.pulses++;
		let n = 0;
		for (const e of [...this.entities.values()]) {
			if (e.kind === "bomb" && Math.hypot(e.x - p.x, e.y - p.y) < 10) {
				const x = e.x,
					y = e.y;
				this.remove(e);
				const target = this.closestEnemy(x, y);
				const a = target
					? clamp(Math.atan2(target.x - x, target.y - y), -0.8, 0.8)
					: 0;
				this.fireShot(p, a, true, x, y);
				n++;
			}
			if (
				e.kind === "enemy" &&
				e.type !== "boss" &&
				Math.hypot(e.x - p.x, e.y - p.y) < 5
			)
				this.hurtEnemy(e, 2, p.seat);
		}
		this.stats.reflected += n;
		this.emit("pulse", { x: p.x, y: p.y, reflected: n, seat: p.seat });
		return true;
	}
	closestEnemy(x, y) {
		return [...this.entities.values()]
			.filter((e) => e.kind === "enemy" && e.y > y + 0.3)
			.sort(
				(a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y),
			)[0];
	}
	ai(p) {
		const enemies = [...this.entities.values()].filter(
			(e) => e.kind === "enemy" && !(e.type === "boss" && e.shield),
		);
		let target = enemies.find((e) => e.id === p.target);
		if (!target || target.dead || target.y < -5)
			target = enemies.sort(
				(a, b) =>
					(a.type === "seal" ? -8 : 0) +
					Math.abs(a.x - p.x) +
					a.y * 0.5 -
					((b.type === "seal" ? -8 : 0) + Math.abs(b.x - p.x) + b.y * 0.5),
			)[0];
		p.target = target?.id;
		const shots = [...this.entities.values()].filter(
			(e) => e.kind === "bomb" && e.y < -2 && Math.abs(e.x - p.x) < 1.4,
		);
		let dest = target
			? clamp(target.x + (target.vx || 0) * 0.25, -13.5, 13.5)
			: Math.sin(this.time) * 5;
		if (shots.length && !this.attract)
			dest = p.x + (shots[0].x >= p.x ? -3 : 3);
		const move = clamp((dest - p.x) * 2, -1, 1),
			distance = target ? Math.max(1, target.y - p.y) : 10;
		return {
			move,
			aim: target
				? clamp(
						Math.atan2(target.x + (target.vx * distance) / 24 - p.x, distance),
						-0.38,
						0.38,
					)
				: 0,
			fire: true,
			pulse: shots.length > 0 || this.time % 8 < 0.1,
			dash: shots.length > 1,
		};
	}
	update(dt = 1 / 60) {
		if (
			this.phase === "idle" ||
			this.phase === "victory" ||
			this.phase === "gameover"
		)
			return;
		this.time += dt;
		this.comboTime -= dt;
		if (this.comboTime <= 0) this.combo = 0;
		if (this.phase === "upgrade") {
			if (this.bot && this.time - this.phaseAt > 1.6)
				this.chooseUpgrade(this.wave === 1 ? "twin" : "cool");
			return;
		}
		if (this.phase === "intermission") {
			if (this.time - this.phaseAt > 2.7) {
				if (this.wave === 1 || this.wave === 3) {
					this.phase = "upgrade";
					this.phaseAt = this.time;
					this.emit("upgrade", { wave: this.wave });
				} else this.beginWave(this.wave + 1);
			}
			return;
		}
		this.waveTime += dt;
		const wave = WAVES[this.wave % 6];
		const main = [...this.entities.values()].filter(
			(e) => e.kind === "enemy" && !e.parent && e.type !== "imp",
		);
		this.spawnTimer -= dt;
		if (
			this.spawned < wave.count &&
			main.length < wave.max &&
			this.spawnTimer <= 0
		) {
			const type = wave.types[this.spawned % wave.types.length];
			const slot = this.spawned % wave.max;
			this.enemy(
				type,
				type === "boss" ? 0 : (slot - (wave.max - 1) / 2) * 5.5,
				type === "boss" ? 6.2 : 7.3 - (slot % 3) * 2.25,
			);
			this.spawned++;
			this.spawnTimer = 0.9;
		}
		for (const p of this.players) {
			if (!p.connected) continue;
			const input = this.bot ? this.ai(p) : this.inputs.get(p.seat) || {};
			p.cool -= dt;
			p.pulse = Math.max(0, p.pulse - dt);
			p.dash = Math.max(0, p.dash - dt);
			p.invul = Math.max(0, p.invul - dt);
			p.overdrive = Math.max(0, p.overdrive - dt);
			p.dashLeft = Math.max(0, p.dashLeft - dt);
			let move = input.move || 0;
			if (Math.abs(move) > 0.1) p.lastDir = Math.sign(move);
			p.aim = input.aim || 0;
			if (input.dash && p.dash <= 0) {
				p.dash = 1.7;
				p.dashLeft = 0.2;
				p.invul = Math.max(p.invul, 0.3);
				this.stats.dashes++;
				this.emit("dash", { x: p.x, y: p.y, seat: p.seat });
			}
			if (p.dashLeft > 0) move = p.lastDir * 2.8;
			p.prevX = p.x;
			p.x = clamp(p.x + move * this.tuning.playerSpeed * dt, -14.2, 14.2);
			p.body.setNextKinematicTranslation({ x: p.x, y: p.y });
			if (input.fire && p.cool <= 0) {
				this.fireShot(p);
				if (this.upgrades.twin || p.overdrive > 0) {
					this.fireShot(p, p.aim - 0.13);
					this.fireShot(p, p.aim + 0.13);
				}
				if (this.upgrades.twin > 1) {
					this.fireShot(p, p.aim - 0.24);
					this.fireShot(p, p.aim + 0.24);
				}
				p.cool = 1 / this.tuning.fireRate;
				this.emit("fire", { x: p.x, y: p.y, seat: p.seat });
			}
			if (input.pulse) this.pulse(p);
		}
		const enemies = [...this.entities.values()].filter(
			(e) => e.kind === "enemy",
		);
		for (const e of enemies) {
			if (e.dead) continue;
			e.age += dt;
			e.prevX = e.x;
			e.prevY = e.y;
			const t = e.age * this.tuning.enemySpeed;
			if (e.type === "seal") {
				const parent = this.entities.get(e.parent);
				if (!parent) {
					this.remove(e);
					continue;
				}
				e.x = parent.x + Math.cos(t * 0.85 + e.orbit) * 3.35;
				e.y = parent.y + Math.sin(t * 0.85 + e.orbit) * 1.85;
			} else if (e.type === "imp") {
				if (e.age > 0.75 && !e.diving) {
					e.diving = true;
					const p =
						this.players[Math.floor(this.random() * this.players.length)];
					e.diveX = p?.x ?? 0;
					this.stats.dives++;
					this.emit("dive", { id: e.id, x: e.x, y: e.y });
				}
				if (e.diving) {
					e.x += (e.diveX - e.x) * dt * 1.25;
					e.y -= dt * (3.7 + this.run * 0.3) * this.tuning.enemySpeed;
					if (e.y < -8.8) {
						this.remove(e);
						continue;
					}
				} else {
					e.x = clamp(e.baseX + Math.sin(t * 3.2 + e.phase) * 2.5, -14, 14);
					e.y = e.baseY - Math.max(0, t * 0.24);
				}
			} else if (e.type === "boss") {
				e.x = Math.sin(t * 0.7) * 6;
				e.y = e.baseY + Math.sin(t * 0.9) * 0.6;
				e.shield = enemies.some(
					(s) => s.type === "seal" && s.parent === e.id && !s.dead,
				);
				const phase = e.hp / e.maxHp > 0.66 ? 1 : e.hp / e.maxHp > 0.33 ? 2 : 3;
				if (phase > e.phaseNo) {
					e.phaseNo = phase;
					this.spawnSeals(e);
					this.emit("bossPhase", { phase });
				}
				if (this.waveTime % 11 < dt && e.phaseNo > 1) {
					this.enemy("splitter", -9, 4);
					this.enemy("firebird", 9, 5);
				}
			} else {
				e.x = clamp(
					Math.sin(t * (e.type === "armor" ? 0.58 : 0.82) + e.phase) *
						(e.type === "armor" ? 10 : 11.7),
					-13,
					13,
				);
				e.y = e.baseY + Math.sin(t * 1.8 + e.phase) * 0.45;
			}
			e.vx = (e.x - e.prevX) / dt;
			e.vy = (e.y - e.prevY) / dt;
			e.body.setNextKinematicTranslation({ x: e.x, y: e.y });
			e.fire -= dt * this.tuning.enemyFire;
			if (e.warning) {
				e.warning.left -= dt;
				if (e.warning.left <= 0) {
					this.fireBomb({ x: e.warning.x, y: 11 }, 0, -25, "beam");
					this.stats.beams++;
					e.warning = null;
				}
			}
			if (e.fire <= 0 && e.type !== "seal") {
				e.fire =
					(e.type === "boss"
						? 1.5
						: e.type === "imp"
							? 3
							: 2.8 + this.random() * 2.3) /
					(1 + this.run * 0.12);
				const target =
					this.players.filter((p) => p.connected)[
						Math.floor(
							this.random() * this.players.filter((p) => p.connected).length,
						)
					] || this.players[0];
				const aim = clamp(((target?.x ?? 0) - e.x) / (e.y + 7), -0.8, 0.8);
				const speed = 4.8 + this.wave * 0.28 + this.run * 0.3;
				if (e.type === "firebird" || e.type === "boss") {
					const n = e.type === "boss" ? 5 + 2 * (e.phaseNo - 1) : 3;
					for (let i = 0; i < n; i++) {
						const a = aim + (i - (n - 1) / 2) * 0.25;
						this.fireBomb(e, Math.sin(a) * speed, -Math.cos(a) * speed);
					}
				} else this.fireBomb(e, aim * speed * 0.6, -speed);
				if (e.type === "armor" || (e.type === "boss" && e.phaseNo >= 2)) {
					e.warning = { x: target?.x ?? 0, left: 1.1 };
					this.emit("warning", { x: e.warning.x, duration: 1.1 });
				}
			}
		}
		for (const e of [...this.entities.values()]) {
			if (e.dead || e.kind === "player" || e.kind === "enemy") continue;
			e.age += dt;
			e.prevX = e.x;
			e.prevY = e.y;
			if (e.kind === "shot") {
				// The source's tracer variant: cannon movement gently steers airborne shots.
				const owner = this.players.find((p) => p.seat === e.owner);
				if (owner && !e.reflected) {
					const steer = owner.aim * 6 + (owner.x - owner.prevX) * 10;
					e.body.setLinvel({ x: e.vx + steer, y: e.vy }, true);
				}
			}
			if (
				e.age > (e.kind === "pickup" ? 12 : 5) ||
				e.x < -18 ||
				e.x > 18 ||
				e.y > 14 ||
				e.y < -10
			)
				this.remove(e);
		}
		this.world.timestep = dt;
		this.world.step(this.queue);
		const collisions = [];
		this.queue.drainCollisionEvents((a, b, started) => {
			if (started)
				collisions.push([this.colliders.get(a), this.colliders.get(b)]);
		});
		for (const [a, b] of collisions) {
			if (!a || !b || a.dead || b.dead) continue;
			this.stats.collisions++;
			this.collide(a, b);
		}
		for (const e of this.entities.values()) {
			if (e.kind !== "player" && e.kind !== "enemy") {
				const v = e.body.translation();
				e.x = v.x;
				e.y = v.y;
			}
		}
		if (this.lives < 0 && !this.god) {
			this.phase = "gameover";
			this.phaseAt = this.time;
			this.emit("gameover", { score: this.score });
			return;
		}
		if (
			this.spawned >= wave.count &&
			![...this.entities.values()].some((e) => e.kind === "enemy")
		)
			this.completeWave();
	}
	collide(a, b) {
		if (
			(a.kind === "shot" && b.kind === "enemy") ||
			(b.kind === "shot" && a.kind === "enemy")
		) {
			const shot = a.kind === "shot" ? a : b,
				enemy = a.kind === "enemy" ? a : b;
			this.stats.hits++;
			this.hurtEnemy(enemy, shot.damage, shot.owner);
			this.remove(shot);
			return;
		}
		const p = a.kind === "player" ? a : b.kind === "player" ? b : null;
		if (!p) return;
		const other = p === a ? b : a;
		if (other.kind === "pickup") {
			p.overdrive = 9;
			this.stats.pickups++;
			this.score += 100;
			p.score += 100;
			this.emit("pickup", { x: p.x, y: p.y, seat: p.seat });
			this.remove(other);
		} else if (other.kind === "bomb" || other.kind === "enemy") {
			if (other.kind === "bomb") this.remove(other);
			else if (other.type === "imp") this.hurtEnemy(other, 10, p.seat);
			this.hitPlayer(p);
		}
	}
	hitPlayer(p) {
		if (p.invul > 0 || this.god) return false;
		this.hitWave = true;
		this.lives--;
		this.combo = 0;
		p.invul = 2.4;
		p.overdrive = 0;
		this.emit("hurt", { x: p.x, y: p.y, seat: p.seat, lives: this.lives });
		return true;
	}
	hurtEnemy(e, damage, owner = 0) {
		if (e.dead) return;
		if (e.type === "imp" && e.age < 0.65) return;
		if (e.type === "boss" && e.shield) {
			this.emit("block", { x: e.x, y: e.y });
			return;
		}
		e.hp -= damage;
		this.emit("hit", { id: e.id, x: e.x, y: e.y, hp: e.hp });
		if (e.hp > 0) return;
		const { x, y, type } = e;
		this.stats.kills++;
		this.waveKills++;
		this.combo = Math.min(8, this.combo + 1);
		this.comboTime = 2.8;
		const points =
			(type === "boss"
				? 3000
				: type === "imp"
					? 100
					: type === "seal"
						? 150
						: type === "armor"
							? 120
							: 60) * Math.max(1, Math.ceil(this.combo / 2));
		this.score += points;
		const p = this.players.find((p) => p.seat === owner);
		if (p) p.score += points;
		this.emit("kill", { x, y, enemyType: type, points, seat: owner });
		this.remove(e);
		if (type === "splitter") {
			this.stats.splits++;
			this.enemy("imp", x - 0.7, y - 0.45, { phase: 0 });
			this.enemy("imp", x + 0.7, y - 0.45, { phase: Math.PI });
			this.emit("split", { x, y });
		}
		if (!["imp", "seal", "boss"].includes(type) && this.stats.kills % 5 === 0)
			this.spawn("pickup", x, y, { vx: 0, vy: -2, radius: 0.5 });
	}
	completeWave() {
		if (!this.hitWave) {
			this.lives = Math.min(this.maxLives, this.lives + 1);
			this.stats.cleanWaves++;
			this.emit("clean", { lives: this.lives });
		}
		for (const e of [...this.entities.values()])
			if (e.kind === "bomb" || e.kind === "shot") this.remove(e);
		if (this.wave % 6 === 5) {
			this.phase = "victory";
			this.phaseAt = this.time;
			this.emit("victory", { score: this.score });
		} else {
			this.phase = "intermission";
			this.phaseAt = this.time;
			this.emit("clear", { wave: this.wave, clean: !this.hitWave });
		}
	}
	chooseUpgrade(key) {
		if (this.phase !== "upgrade") return false;
		if (key === "repair") {
			this.lives = Math.min(this.maxLives, this.lives + 2);
			this.upgrades.power++;
		} else if (key === "twin") this.upgrades.twin++;
		else if (key === "cool") this.upgrades.cool++;
		else return false;
		this.emit("blessing", { key });
		this.beginWave(this.wave + 1);
		return true;
	}
	encore() {
		if (this.phase !== "victory") return;
		this.run++;
		this.endless = true;
		this.lives = Math.min(6, this.lives + 2);
		this.tuning.enemySpeed *= 1.15;
		this.tuning.enemyFire *= 1.12;
		this.beginWave(0);
	}
	snapshot() {
		return {
			phase: this.phase,
			time: this.time,
			wave: this.wave,
			score: this.score,
			lives: this.lives,
			combo: this.combo,
			run: this.run,
			spawned: this.spawned,
			upgrades: this.upgrades,
			stats: this.stats,
			hitWave: this.hitWave,
			phaseAt: this.phaseAt,
			entities: [...this.entities.values()].map((e) => [
				e.id,
				e.kind,
				e.type || "",
				+e.x.toFixed(3),
				+e.y.toFixed(3),
				e.hp || 0,
				e.maxHp || 0,
				e.seat ?? e.owner ?? -1,
				+(e.aim || 0).toFixed(2),
				+(e.pulse || 0).toFixed(1),
				+(e.invul || 0).toFixed(1),
				+(e.overdrive || 0).toFixed(1),
				e.shield ? 1 : 0,
				e.reflected ? 1 : 0,
				e.phaseNo || 1,
			]),
		};
	}
	dispose() {
		this.clear();
		this.queue.free();
		this.world.free();
	}
}
export function decodeSnapshot(s) {
	return s.entities.map((a) => ({
		id: a[0],
		kind: a[1],
		type: a[2],
		x: a[3],
		y: a[4],
		hp: a[5],
		maxHp: a[6],
		seat: a[7],
		owner: a[7],
		aim: a[8],
		pulse: a[9],
		invul: a[10],
		overdrive: a[11],
		shield: !!a[12],
		reflected: !!a[13],
		phaseNo: a[14],
	}));
}
