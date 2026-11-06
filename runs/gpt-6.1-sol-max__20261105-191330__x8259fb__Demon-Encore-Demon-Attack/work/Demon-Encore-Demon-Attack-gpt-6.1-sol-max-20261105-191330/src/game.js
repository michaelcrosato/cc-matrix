import RAPIER from "@dimforge/rapier3d-compat";

export const DEFAULTS = Object.freeze({
	enemySpeed: 1,
	bulletSpeed: 1,
	fireRate: 1,
	shipSpeed: 1,
	damage: 1,
	timeScale: 1,
	god: false,
	auto: false,
	hitboxes: false,
});
export const WAVES = [
	{
		name: "FIRST CONTACT",
		subtitle: "Hold fire. Make a little space.",
		kinds: ["moth", "moth", "moth", "moth", "moth", "moth"],
	},
	{
		name: "SPLIT DECISION",
		subtitle: "Big demons split. Finish the little troublemakers.",
		kinds: ["fiend", "fiend", "fiend", "fiend", "moth", "moth"],
	},
	{
		name: "CROSSFIRE CHOIR",
		subtitle: "Near misses charge your Encore. Close, but not too close.",
		kinds: ["artillery", "moth", "fiend", "moth", "artillery", "moth", "fiend"],
	},
	{
		name: "DIVE BAR",
		subtitle: "They are coming down. Phase dash straight through.",
		kinds: [
			"diver",
			"diver",
			"fiend",
			"diver",
			"moth",
			"diver",
			"fiend",
			"diver",
		],
	},
	{
		name: "DOUBLE TROUBLE",
		subtitle: "Catch a Prism. Give the whole sky something to worry about.",
		kinds: [
			"fiend",
			"artillery",
			"fiend",
			"fiend",
			"artillery",
			"fiend",
			"diver",
			"diver",
		],
	},
	{
		name: "CURTAIN CALL",
		subtitle: "One last swarm. Save something for the headliner.",
		kinds: [
			"fiend",
			"fiend",
			"artillery",
			"diver",
			"fiend",
			"artillery",
			"diver",
			"fiend",
			"diver",
		],
	},
	{
		name: "THE HEADLINER",
		subtitle: "Break the crown. Bring down the house.",
		kinds: ["boss"],
	},
];
export const DIFFICULTIES = {
	chill: { hp: 5, speed: 0.78, shots: 0.8, score: 0.8, label: "CHILL" },
	arcade: { hp: 4, speed: 1, shots: 1, score: 1, label: "ARCADE" },
	wild: { hp: 3, speed: 1.2, shots: 1.25, score: 1.5, label: "WILD" },
};
export async function initPhysics() {
	await RAPIER.init();
}
export function seeded(seed = 7351) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const GROUP = { player: 1, enemy: 2, shot: 4, bolt: 8, pickup: 16 };
const FILTER = { player: 26, enemy: 5, shot: 2, bolt: 1, pickup: 1 };

export class Game {
	constructor({
		seed = 7351,
		count = 1,
		ids = null,
		difficulty = "arcade",
		attract = false,
		width = 9,
		emit = () => {},
	} = {}) {
		this.rng = seeded(seed);
		this.seed = seed;
		this.count = count;
		this.difficulty = difficulty;
		this.diff = DIFFICULTIES[difficulty] || DIFFICULTIES.arcade;
		this.attract = attract;
		this.width = width;
		this.emit = emit;
		this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		this.queue = new RAPIER.EventQueue(true);
		this.byHandle = new Map();
		this.entities = new Map();
		this.nextId = 1;
		this.players = [];
		this.time = 0;
		this.wave = -1;
		this.waveTime = 0;
		this.phase = "countdown";
		this.timer = 2.7;
		this.score = 0;
		this.combo = 1;
		this.comboKills = 0;
		this.comboTime = 0;
		this.kills = 0;
		this.grazes = 0;
		this.tuning = { ...DEFAULTS };
		this.events = [];
		this.seq = 0;
		this.pending = [];
		this.result = null;
		this.stats = {
			shots: 0,
			hits: 0,
			kills: 0,
			splits: 0,
			grazes: 0,
			dashes: 0,
			encores: 0,
			pickups: 0,
			damage: 0,
			waves: 0,
			bossPhases: 0,
		};
		const seats = ids || Array.from({ length: count }, (_, i) => i);
		for (let i = 0; i < count; i++) {
			const p = this.make("player", (-count / 2 + 0.5 + i) * 2, -4.05, 0.34, {
				seat: seats[i],
				hp: this.diff.hp,
				maxHp: this.diff.hp,
				charge: 25,
				inv: 2,
				dash: 0,
				dashCD: 0,
				fireCD: 0,
				weapon: "pulse",
				weaponTime: 0,
				dx: 1,
				score: 0,
				alive: true,
				afk: 0,
			});
			this.players.push(p);
		}
	}
	make(type, x, y, r, props = {}) {
		const id = this.nextId++;
		const kinematic = ["player", "enemy", "pickup"].includes(type);
		const desc = kinematic
			? RAPIER.RigidBodyDesc.kinematicPositionBased()
			: RAPIER.RigidBodyDesc.dynamic().setGravityScale(0).setCcdEnabled(true);
		const body = this.world.createRigidBody(
			desc.setTranslation(x, y, 0).lockRotations().setCanSleep(false),
		);
		const collider = this.world.createCollider(
			RAPIER.ColliderDesc.ball(r)
				.setSensor(true)
				.setCollisionGroups((GROUP[type] << 16) | FILTER[type])
				.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
				.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL),
			body,
		);
		const entity = {
			id,
			type,
			x,
			y,
			r,
			body,
			collider,
			dead: false,
			age: 0,
			...props,
		};
		this.entities.set(id, entity);
		this.byHandle.set(collider.handle, entity);
		return entity;
	}
	event(type, data = {}) {
		const e = { type, ...data, seq: ++this.seq };
		this.events.push(e);
		if (this.events.length > 30) this.events.shift();
		this.emit(e);
	}
	remove(e) {
		if (!e || e.dead) return;
		e.dead = true;
		this.byHandle.delete(e.collider.handle);
		this.entities.delete(e.id);
		this.world.removeRigidBody(e.body);
	}
	move(e, x, y) {
		e.x = x;
		e.y = y;
		e.body.setNextKinematicTranslation({ x, y, z: 0 });
	}
	spawnEnemy(kind, index = 0, total = 1, extra = {}) {
		const boss = kind === "boss",
			tiny = kind === "hatchling";
		const x =
			extra.x ?? (index / Math.max(1, total - 1) - 0.5) * this.width * 1.5;
		const y = extra.y ?? 3.6 + (index % 3) * 0.58;
		const hp = boss
			? 180 + 60 * (this.count - 1)
			: (tiny ? 1 : kind === "artillery" ? 5 : kind === "moth" ? 2 : 3) +
				Math.floor((this.count - 1) * 0.5);
		const e = this.make("enemy", x, y, boss ? 1.45 : tiny ? 0.27 : 0.56, {
			kind,
			hp,
			maxHp: hp,
			baseX: x,
			baseY: y,
			seed: this.rng() * 6.28,
			fire: 1.2 + this.rng() * 1.7,
			spawn: this.time,
			phase: 0,
			damageFlash: 0,
			...extra,
		});
		if (boss) e.phase = 1;
		return e;
	}
	startWave(index) {
		this.wave = index;
		this.waveTime = 0;
		this.phase = "wave";
		this.stats.waves = Math.max(this.stats.waves, index + 1);
		for (const e of [...this.entities.values()])
			if (e.type !== "player") this.remove(e);
		this.pending = [];
		this.comboTime = 0;
		for (const p of this.players) {
			if (p.left) continue;
			if (!p.alive) {
				p.alive = true;
				p.hp = 2;
				p.inv = 3;
				this.move(p, clamp(p.x, -this.width, this.width), -4.05);
				this.event("revive", { seat: p.seat, x: p.x, y: p.y });
			}
			p.charge = clamp(p.charge + 12, 0, 100);
		}
		const wave = WAVES[index];
		wave.kinds.forEach((kind, i) => {
			this.pending.push({
				at: i * 0.38,
				kind,
				index: i,
				total: wave.kinds.length,
			});
		});
		this.event("wave", {
			wave: index,
			name: wave.name,
			subtitle: wave.subtitle,
		});
		if (index === 2 || index === 4)
			this.drop(index === 2 ? "rapid" : "prism", 0, 1);
	}
	fire(p) {
		p.fireCD = (p.weapon === "rapid" ? 0.1 : 0.19) / this.tuning.fireRate;
		this.stats.shots++;
		const fan = p.weapon === "prism" ? [-0.22, 0, 0.22] : [0];
		for (const angle of fan) {
			const s = this.make("shot", p.x, p.y + 0.52, 0.13, {
				seat: p.seat,
				ttl: 1.3,
				vx: Math.sin(angle) * 15,
				vy: Math.cos(angle) * 15,
				weapon: p.weapon,
			});
			s.body.setLinvel({ x: s.vx, y: s.vy, z: 0 }, true);
		}
		this.event("fire", { seat: p.seat, x: p.x, y: p.y });
	}
	bolt(x, y, angle, speed = 3.4, style = 0) {
		const e = this.make("bolt", x, y, 0.13, {
			vx: Math.sin(angle) * speed,
			vy: -Math.cos(angle) * speed,
			ttl: 8,
			style,
			grazed: [],
		});
		e.body.setLinvel({ x: e.vx, y: e.vy, z: 0 }, true);
		return e;
	}
	attack(e) {
		const targets = this.players.filter((p) => p.alive);
		if (!targets.length) return;
		const p = targets[Math.floor(this.rng() * targets.length)];
		const aim = Math.atan2(p.x - e.x, e.y - p.y);
		if (e.kind === "boss") {
			const fan = e.phase === 3 ? 11 : 7;
			for (let i = 0; i < fan; i++)
				this.bolt(
					e.x + (i % 2 ? -0.5 : 0.5),
					e.y - 0.7,
					(i - (fan - 1) / 2) * 0.19 + Math.sin(this.time) * 0.14,
					3.2 + e.phase * 0.35,
					1,
				);
			if (e.phase >= 2)
				for (let a = -1; a <= 1; a++)
					this.bolt(e.x, e.y - 1, aim + a * 0.12, 4.1, 2);
			this.event("bossFire", { x: e.x, y: e.y, phase: e.phase });
		} else if (e.kind === "artillery") {
			for (let i = -1; i <= 1; i++)
				this.bolt(e.x, e.y - 0.3, aim + i * 0.23, 3.2, 1);
		} else if (e.kind === "diver") {
			this.bolt(e.x, e.y - 0.3, aim, 4.4, 2);
		} else if (e.kind !== "hatchling" || this.wave > 3) {
			this.bolt(
				e.x,
				e.y - 0.3,
				clamp(aim, -0.8, 0.8),
				e.kind === "hatchling" ? 3.7 : 3.2,
			);
		}
	}
	drop(kind, x, y) {
		this.make("pickup", x, y, 0.38, { kind, ttl: 12 });
		this.event("drop", { kind, x, y });
	}
	hitEnemy(e, damage, seat) {
		if (e.dead) return;
		e.hp -= damage;
		e.damageFlash = 0.12;
		this.stats.hits++;
		if (e.hp > 0) {
			if (e.kind === "boss") this.checkBossPhase(e);
			return;
		}
		const kind = e.kind,
			x = e.x,
			y = e.y;
		this.remove(e);
		this.kills++;
		this.stats.kills++;
		this.comboKills++;
		this.comboTime = 3.5;
		this.combo = Math.min(5, 1 + Math.floor(this.comboKills / 5));
		const points = Math.round(
			(kind === "boss"
				? 3000
				: kind === "hatchling"
					? 60
					: kind === "artillery"
						? 180
						: 100) *
				this.combo *
				this.diff.score,
		);
		this.score += points;
		const p = this.players.find((v) => v.seat === seat) || this.players[0];
		if (p) {
			p.score += points;
			p.charge = clamp(p.charge + (kind === "hatchling" ? 4 : 8), 0, 100);
		}
		this.event("kill", { x, y, kind, points, seat, combo: this.combo });
		if (kind === "fiend") {
			this.stats.splits++;
			for (const dir of [-1, 1])
				this.spawnEnemy("hatchling", 0, 1, {
					x: x + dir * 0.36,
					y,
					baseX: x + dir * 0.36,
					baseY: y,
					dir,
					seed: this.rng() * 6.28,
				});
			this.event("split", { x, y });
		}
		if (kind !== "hatchling" && kind !== "boss" && this.kills % 6 === 0) {
			const kind = ["repair", "rapid", "prism"][
				Math.floor(this.kills / 6 - 1) % 3
			];
			this.drop(kind, x, y);
		}
		if (kind === "boss") {
			this.phase = "victory";
			this.timer = 2.7;
			this.event("bossDown", { x, y });
		}
	}
	checkBossPhase(e) {
		const phase = e.hp / e.maxHp < 0.32 ? 3 : e.hp / e.maxHp < 0.66 ? 2 : 1;
		if (phase > e.phase) {
			e.phase = phase;
			this.stats.bossPhases++;
			this.event("bossPhase", { phase, x: e.x, y: e.y });
			for (let i = 0; i < 2; i++)
				this.spawnEnemy(phase === 3 ? "fiend" : "diver", i, 2, {
					y: 4.6,
					baseY: 4.6,
				});
		}
	}
	damage(p) {
		if (!p.alive || p.inv > 0 || p.dash > 0 || this.tuning.god || this.attract)
			return;
		p.hp--;
		p.inv = 1.8;
		this.stats.damage++;
		this.combo = 1;
		this.comboKills = 0;
		this.event("hurt", { x: p.x, y: p.y, seat: p.seat, hp: p.hp });
		if (p.hp <= 0) {
			p.alive = false;
			this.move(p, p.x, -20);
			this.event("down", { seat: p.seat, x: p.x, y: -4.05 });
			if (!this.players.some((v) => v.alive)) {
				this.phase = "defeat";
				this.timer = 1.6;
			}
		}
	}
	encore(p) {
		if (p.charge < 100 || !p.alive) return false;
		p.charge = 0;
		p.inv = Math.max(p.inv, 1.2);
		this.stats.encores++;
		this.event("encore", { x: p.x, y: p.y, seat: p.seat });
		for (const e of [...this.entities.values()]) {
			if (e.type === "bolt") this.remove(e);
			else if (e.type === "enemy")
				this.hitEnemy(e, e.kind === "boss" ? 28 : 20, p.seat);
		}
		return true;
	}
	collect(e, p) {
		if (e.kind === "repair") p.hp = Math.min(p.maxHp, p.hp + 1);
		else {
			p.weapon = e.kind;
			p.weaponTime = 14;
		}
		this.stats.pickups++;
		this.event("pickup", { kind: e.kind, seat: p.seat, x: p.x, y: p.y });
		this.remove(e);
	}
	pilot(p) {
		const enemies = [...this.entities.values()].filter(
			(e) => e.type === "enemy",
		);
		const bolts = [...this.entities.values()].filter(
			(e) => e.type === "bolt" && e.y < -0.8 && e.y > -5.3,
		);
		let target =
			enemies.sort((a, b) => a.y - b.y)[0]?.x ?? Math.sin(this.time) * 4;
		const pickup = [...this.entities.values()].find(
			(e) => e.type === "pickup" && e.y < 0,
		);
		if (pickup) target = pickup.x;
		const danger = bolts.find(
			(e) => Math.abs(e.x - p.x) < 0.65 && e.y > -4.6 && e.y < -2,
		);
		if (danger)
			target = clamp(p.x + (p.x < danger.x ? -2 : 2), -this.width, this.width);
		const delta = target - p.x;
		return {
			move: clamp(delta * 2, -1, 1),
			fire: true,
			dash: !!danger && p.dashCD <= 0,
			nova: p.charge >= 100 && enemies.length > 3,
		};
	}
	step(dt, inputs = {}) {
		if (this.result) return;
		dt *= this.tuning.timeScale;
		this.time += dt;
		this.waveTime += dt;
		if (this.phase === "countdown") {
			this.timer -= dt;
			if (this.timer <= 0) this.startWave(0);
		} else if (this.phase === "interlude") {
			this.timer -= dt;
			if (this.timer <= 0) this.startWave(this.wave + 1);
		} else if (this.phase === "victory" || this.phase === "defeat") {
			this.timer -= dt;
			if (this.timer <= 0) {
				this.result = {
					won: this.phase === "victory",
					score: this.score,
					time: this.time,
					stats: { ...this.stats },
				};
				this.event("result", this.result);
			}
		}
		if (this.phase === "wave") {
			while (this.pending.length && this.pending[0].at <= this.waveTime) {
				const q = this.pending.shift();
				this.spawnEnemy(q.kind, q.index, q.total);
			}
		}
		this.comboTime -= dt;
		if (this.comboTime <= 0) {
			this.combo = 1;
			this.comboKills = 0;
		}
		for (const p of this.players) {
			p.inv = Math.max(0, p.inv - dt);
			p.dashCD = Math.max(0, p.dashCD - dt);
			p.fireCD -= dt;
			p.weaponTime -= dt;
			if (p.weaponTime <= 0) p.weapon = "pulse";
			if (!p.alive) continue;
			const ai = this.attract || this.tuning.auto;
			const input = ai ? this.pilot(p) : inputs[p.seat] || {};
			let movement = clamp(Number(input.move) || 0, -1, 1);
			if (input.target != null)
				movement = clamp((input.target - p.x) * 12, -1, 1);
			if (movement !== 0) p.dx = Math.sign(movement);
			if (input.dash && p.dashCD <= 0 && this.phase === "wave") {
				p.dash = 0.23;
				p.dashCD = 2.2;
				this.stats.dashes++;
				this.event("dash", { x: p.x, y: p.y, seat: p.seat, dir: p.dx });
			}
			p.dash = Math.max(0, p.dash - dt);
			const v = p.dash > 0 ? p.dx * 22 : movement * 8.8 * this.tuning.shipSpeed;
			this.move(p, clamp(p.x + v * dt, -this.width, this.width), -4.05);
			if (input.fire && p.fireCD <= 0 && this.phase === "wave") this.fire(p);
			if (input.nova && this.phase === "wave") this.encore(p);
		}
		for (const e of [...this.entities.values()]) {
			e.age += dt;
			if (e.type === "enemy") {
				e.damageFlash = Math.max(0, e.damageFlash - dt);
				const t =
					(this.time - e.spawn) * this.tuning.enemySpeed * this.diff.speed;
				let x, y;
				if (e.kind === "boss") {
					x = Math.sin(t * 0.65) * this.width * 0.54;
					y = 1.95 + Math.sin(t * 1.2) * 0.15;
				} else if (e.kind === "diver") {
					const cycle = (t + e.seed) % 8;
					x = clamp(
						e.baseX + Math.sin(t * 1.4 + e.seed) * 2.5,
						-this.width + 0.3,
						this.width - 0.3,
					);
					y =
						cycle < 4
							? e.baseY + Math.sin(t * 2) * 0.3
							: cycle < 6
								? e.baseY - (cycle - 4) * 4.2
								: -4.8 + (cycle - 6) * 4.7;
				} else if (e.kind === "hatchling") {
					x = Math.sin(t * 1.6 + e.seed) * this.width * 0.88;
					y = clamp(e.baseY - 0.35 + Math.sin(t * 2.3 + e.seed) * 0.65, 0, 4.7);
				} else {
					x = clamp(
						e.baseX +
							Math.sin(t * (e.kind === "artillery" ? 0.7 : 1.3) + e.seed) *
								Math.min(2.3, this.width * 0.45),
						-this.width + 0.3,
						this.width - 0.3,
					);
					y =
						e.baseY +
						Math.sin(t * 1.9 + e.seed) * 0.4 -
						Math.min(1.6, this.waveTime * 0.025);
				}
				this.move(e, x, y);
				e.fire -= dt * this.diff.shots;
				if (e.fire <= 0 && this.phase === "wave") {
					this.attack(e);
					e.fire =
						e.kind === "boss"
							? e.phase === 3
								? 0.72
								: 1.1
							: e.kind === "hatchling"
								? 3
								: 2.1 + this.rng() * 1.6;
				}
			} else if (e.type === "shot" || e.type === "bolt") {
				e.ttl -= dt;
				const speed =
					e.type === "bolt" ? this.tuning.bulletSpeed * this.diff.speed : 1;
				e.body.setLinvel({ x: e.vx * speed, y: e.vy * speed, z: 0 }, true);
				if (
					e.ttl <= 0 ||
					Math.abs(e.x) > this.width + 2 ||
					e.y > 7.7 ||
					e.y < -6.4
				)
					this.remove(e);
			} else if (e.type === "pickup") {
				const p = this.players
					.filter((v) => v.alive)
					.sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0];
				const magnet =
					p && e.y < -2
						? clamp((p.x - e.x) * 3, -5, 5)
						: Math.sin(e.age * 3) * 0.25;
				this.move(
					e,
					clamp(e.x + magnet * dt, -this.width, this.width),
					e.y - 1.25 * dt,
				);
				e.ttl -= dt;
				if (e.ttl <= 0 || e.y < -6) this.remove(e);
			}
		}
		this.world.timestep = dt;
		this.world.step(this.queue);
		for (const e of this.entities.values())
			if (e.type === "shot" || e.type === "bolt") {
				const v = e.body.translation();
				e.x = v.x;
				e.y = v.y;
			}
		const collisions = [];
		this.queue.drainCollisionEvents((a, b, started) => {
			if (started)
				collisions.push([this.byHandle.get(a), this.byHandle.get(b)]);
		});
		for (let [a, b] of collisions) {
			if (!a || !b || a.dead || b.dead) continue;
			if (a.type === "enemy" && b.type === "shot") [a, b] = [b, a];
			if (a.type === "shot" && b.type === "enemy") {
				this.hitEnemy(b, this.tuning.damage, a.seat);
				this.remove(a);
				continue;
			}
			if (b.type === "player") [a, b] = [b, a];
			if (a.type === "player" && a.alive) {
				if (b.type === "bolt") {
					this.damage(a);
					this.remove(b);
				} else if (b.type === "enemy") this.damage(a);
				else if (b.type === "pickup") this.collect(b, a);
			}
		}
		for (const e of this.entities.values())
			if (e.type === "bolt") {
				for (const p of this.players)
					if (p.alive && !e.grazed.includes(p.seat)) {
						const d = Math.hypot(p.x - e.x, p.y - e.y);
						if (d < 0.95 && d > 0.43) {
							e.grazed.push(p.seat);
							p.charge = clamp(p.charge + 3, 0, 100);
							this.grazes++;
							this.stats.grazes++;
							this.event("graze", { x: p.x, y: p.y, seat: p.seat });
						}
					}
			}
		if (
			this.phase === "wave" &&
			!this.pending.length &&
			![...this.entities.values()].some((e) => e.type === "enemy")
		) {
			this.phase = "interlude";
			this.timer = 2.8;
			this.score += 250 * (this.wave + 1);
			this.event("clear", { wave: this.wave, bonus: 250 * (this.wave + 1) });
			for (const e of [...this.entities.values()])
				if (e.type === "bolt") this.remove(e);
		}
	}
	skipWave() {
		if (this.wave >= 6) {
			for (const e of [...this.entities.values()])
				if (e.type === "enemy") this.hitEnemy(e, 999, this.players[0].seat);
		} else this.startWave(Math.max(0, this.wave + 1));
	}
	snapshot() {
		return {
			seed: this.seed,
			count: this.count,
			width: this.width,
			difficulty: this.difficulty,
			time: this.time,
			wave: this.wave,
			waveTime: this.waveTime,
			phase: this.phase,
			timer: this.timer,
			score: this.score,
			combo: this.combo,
			comboTime: this.comboTime,
			kills: this.kills,
			grazes: this.grazes,
			stats: this.stats,
			result: this.result,
			seq: this.seq,
			events: this.events.slice(-8),
			players: this.players.map((p) => ({
				id: p.id,
				seat: p.seat,
				x: p.x,
				y: p.y,
				hp: p.hp,
				maxHp: p.maxHp,
				charge: p.charge,
				inv: p.inv,
				dash: p.dash,
				dashCD: p.dashCD,
				weapon: p.weapon,
				weaponTime: p.weaponTime,
				alive: p.alive,
				left: !!p.left,
				score: p.score,
			})),
			entities: [...this.entities.values()]
				.filter((e) => e.type !== "player")
				.map((e) => [
					e.id,
					e.type,
					e.kind || e.style || 0,
					+e.x.toFixed(3),
					+e.y.toFixed(3),
					e.hp || 0,
					e.maxHp || 0,
					e.seat ?? -1,
					e.phase || 0,
					e.damageFlash || 0,
					e.vx || 0,
					e.vy || 0,
				]),
		};
	}
	dispose() {
		this.queue.free();
		this.world.free();
		this.entities.clear();
		this.byHandle.clear();
	}
}

export function readSnapshot(s) {
	const g = { ...s, entities: new Map(), players: s.players };
	for (const p of g.players) g.entities.set(p.id, { ...p, type: "player" });
	for (const e of s.entities)
		g.entities.set(e[0], {
			id: e[0],
			type: e[1],
			kind: e[2],
			style: e[2],
			x: e[3],
			y: e[4],
			hp: e[5],
			maxHp: e[6],
			seat: e[7],
			phase: e[8],
			damageFlash: e[9],
			vx: e[10],
			vy: e[11],
		});
	return g;
}
