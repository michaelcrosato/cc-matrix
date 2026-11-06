import RAPIER from "@dimforge/rapier3d-compat";

export { RAPIER };
export const DEFAULTS = Object.freeze({
	speed: 17,
	steering: 21,
	fuelBurn: 1.45,
	refuelRate: 30,
	damage: 1,
	enemyRate: 1,
	fireRate: 7,
	pulseCost: 12,
	pulseCooldown: 10,
});
export const SECTORS = [
	{
		name: "JADE REACH",
		sub: "Find your wings.",
		start: 0,
		end: 840,
		color: 0x91b98c,
	},
	{
		name: "COPPER NARROWS",
		sub: "Mind the banks.",
		start: 840,
		end: 1740,
		color: 0xc39269,
	},
	{
		name: "IRON DELTA",
		sub: "Break the blockade.",
		start: 1740,
		end: 2840,
		color: 0x71899b,
	},
];
export const FINISH = 2840;
export function river(d) {
	let center = Math.sin(d * 0.018) * 4.6 + Math.sin(d * 0.047) * 1.8;
	let width = 11.5 + Math.sin(d * 0.029 + 1) * 1.5;
	if (d > 900 && d < 1660) width -= 1.7;
	if (d > 2580) {
		width = 12.7;
		center = Math.sin(d * 0.0075) * 2;
	}
	return { center, width };
}
export function random(seed = 1234) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
export function course() {
	const a = [],
		r = random(1982);
	let id = 1;
	const add = (type, d, x = 0, more = {}) => {
		a.push({ id: id++, type, d, x, ...more });
	};
	for (let d = 95; d < 2600; d += 67) {
		const v = river(d),
			stage = d > 1740 ? 2 : d > 840 ? 1 : 0;
		const type = d % 201 < 80 ? "heli" : "boat";
		add(type, d, v.center + (r() - 0.5) * (v.width * 1.35), {
			phase: r() * 6.28,
		});
		if (stage > 0 && r() > 0.36)
			add("mine", d + 22, v.center + (r() - 0.5) * v.width * 1.4);
		if (stage > 0 && d % 3 < 1)
			add("jet", d + 42, v.center - 8, { phase: r() * 6.28 });
		if (stage > 0 && r() > 0.58)
			add("turret", d + 30, v.center + (r() > 0.5 ? 1 : -1) * (v.width - 1));
	}
	for (let d = 160; d < 2650; d += 175) {
		const v = river(d);
		add("fuel", d, v.center + (r() - 0.5) * v.width * 0.8);
	}
	[285, 1080, 1875, 2350].forEach((d, i) => {
		add(i % 2 ? "repair" : "upgrade", d, river(d).center);
	});
	[770, 1670, 2520].forEach((d, i) => {
		add("bridge", d, river(d).center, { bridge: i });
	});
	[1140, 1440, 2020].forEach((d) => {
		add("island", d, river(d).center);
	});
	add("bossTurret", 2744, -5, { part: 0 });
	add("bossTurret", 2744, 5, { part: 1 });
	add("boss", 2750, 0);
	// Keep a clear refueling lane, including a helicopter's lateral sweep.
	for (const dock of a.filter((e) => e.type === "fuel")) {
		for (const e of a) {
			if (
				!["boat", "heli", "mine", "turret"].includes(e.type) ||
				Math.abs(e.d - dock.d) >= 20 ||
				Math.abs(e.x - dock.x) >= 6.2
			)
				continue;
			const r = river(e.d),
				lo = r.center - r.width + 2.2,
				hi = r.center + r.width - 2.2;
			e.x = Math.abs(lo - dock.x) > Math.abs(hi - dock.x) ? lo : hi;
		}
	}
	return a.sort((x, y) => x.d - y.d);
}
const stats = {
	island: [9999, 0, 2, 6],
	boat: [2, 30, 1.25, 2.1],
	heli: [2, 60, 1.6, 1.5],
	jet: [2, 100, 1.5, 1.3],
	mine: [1, 50, 0.9, 0.9],
	turret: [4, 120, 1.25, 1.3],
	fuel: [4, 80, 1.55, 8],
	bridge: [13, 500, 14, 1.3],
	bossTurret: [16, 400, 1.6, 1.8],
	boss: [64, 2000, 4.8, 5],
	upgrade: [1, 100, 1, 1],
	repair: [1, 100, 1, 1],
};
export class Game {
	constructor(tuning = {}) {
		this.tuning = { ...DEFAULTS, ...tuning };
		this.events = [];
		this.metrics = {};
		this.god = false;
		this.noFuel = false;
		this.autopilot = false;
		this.reset(1);
	}
	reset(count = 1, opts = {}) {
		if (this.world) this.world.free();
		this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		this.world.timestep = 1 / 60;
		this.progress = opts.progress || 0;
		this.time = 0;
		this.clock = 0;
		this.score = 0;
		this.bridges = 0;
		this.kills = 0;
		this.combo = 0;
		this.comboTime = 0;
		this.nextExtra = 10000;
		this.checkpoint = 0;
		this.over = false;
		this.won = false;
		this.finished = false;
		this.bossDead = false;
		this.next = 0;
		this.uid = 1000;
		this.rng = random(1982);
		this.entities = [];
		this.bullets = [];
		this.events = [];
		this.metrics = {
			shots: 0,
			hits: 0,
			refueled: 0,
			pulses: 0,
			deaths: 0,
			bankHits: 0,
			enemyHits: 0,
			pickups: 0,
			bossHits: 0,
			physicsSteps: 0,
		};
		this.specs = course();
		this.byCollider = new Map();
		this.banks = [];
		this.bankAt = -Infinity;
		this.players = [];
		const ids = opts.ids || Array.from({ length: count }, (_, i) => i);
		for (let i = 0; i < count; i++) {
			const x = river(this.progress + 7).center + (i - (count - 1) / 2) * 3;
			const p = {
				id: ids[i],
				x,
				d: this.progress + 7,
				vx: 0,
				hp: 3,
				lives: 3,
				fuel: 100,
				score: 0,
				cool: 0,
				pulse: 0,
				twin: 0,
				invuln: 2,
				respawn: 0,
				removed: false,
				refueling: false,
				bank: false,
				fire: false,
			};
			p.body = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
					x,
					1.5,
					-p.d,
				),
			);
			p.collider = this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(0.72, 0.65, 1.05)
					.setSensor(true)
					.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL),
				p.body,
			);
			this.byCollider.set(p.collider.handle, { kind: "player", p });
			this.players.push(p);
		}
		this.setBanks();
		this.spawn();
		this.world.step();
		return this;
	}
	event(type, data = {}) {
		this.events.push({ type, ...data });
		if (this.events.length > 120) this.events.shift();
	}
	takeEvents() {
		const e = this.events;
		this.events = [];
		return e;
	}
	setBanks() {
		if (Math.abs(this.progress - this.bankAt) < 10) return;
		this.bankAt = this.progress;
		for (const c of this.banks) {
			this.byCollider.delete(c.handle);
			this.world.removeCollider(c, true);
		}
		this.banks = [];
		const start = Math.floor((this.progress - 30) / 3) * 3;
		for (let d = start; d < this.progress + 115; d += 3) {
			const { center, width } = river(d + 1.5);
			for (const sign of [-1, 1]) {
				const c = this.world.createCollider(
					RAPIER.ColliderDesc.cuboid(25, 3, 1.5)
						.setTranslation(center + sign * (width + 25), 1.5, -d - 1.5)
						.setSensor(true)
						.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL),
				);
				this.byCollider.set(c.handle, { kind: "bank" });
				this.banks.push(c);
			}
		}
	}
	spawn() {
		while (
			this.next < this.specs.length &&
			this.specs[this.next].d < this.progress + 110
		) {
			const s = this.specs[this.next++];
			if (s.d < this.progress - 20) continue;
			this.addEntity(s);
		}
	}
	addEntity(s) {
		const [hp, points, rx, rz] = stats[s.type];
		const e = {
			...s,
			hp,
			maxHp: hp,
			points,
			rx,
			rz,
			baseX: s.x,
			age: 0,
			shoot: 1.5 + (s.id % 3) * 0.7,
			dead: false,
			flash: 0,
			phase: s.phase || 0,
		};
		if (e.type === "bridge") e.rx = river(e.d).width + 1;
		e.body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
				e.x,
				1.5,
				-e.d,
			),
		);
		e.collider = this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(e.rx, 0.8, e.rz)
				.setSensor(true)
				.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL),
			e.body,
		);
		this.byCollider.set(e.collider.handle, { kind: "entity", e });
		this.entities.push(e);
		return e;
	}
	removeEntity(e) {
		if (e.body) {
			this.byCollider.delete(e.collider.handle);
			this.world.removeRigidBody(e.body);
			e.body = null;
		}
		this.entities.splice(this.entities.indexOf(e), 1);
	}
	addBullet(x, d, vx, vd, owner, enemy = false) {
		const b = {
			id: this.uid++,
			x,
			d,
			vx,
			vd,
			owner,
			enemy,
			life: enemy ? 6 : 1.6,
		};
		this.bullets.push(b);
		if (!enemy) this.metrics.shots++;
		return b;
	}
	damage(e, amount, owner) {
		if (e.dead || ["upgrade", "repair", "island"].includes(e.type)) return;
		if (
			e.type === "boss" &&
			this.entities.some((q) => q.type === "bossTurret" && !q.dead)
		) {
			this.event("shield", { x: e.x, d: e.d });
			return;
		}
		e.hp -= amount;
		e.flash = 0.1;
		this.metrics.hits++;
		if (e.type === "boss") this.metrics.bossHits++;
		this.event("spark", { x: e.x, d: e.d });
		if (e.hp > 0) return;
		e.dead = true;
		this.kills++;
		this.combo = this.comboTime > 0 ? Math.min(4, this.combo + 1) : 1;
		this.comboTime = 3.5;
		const points =
			e.points * (e.type === "bridge" || e.type === "boss" ? 1 : this.combo);
		const p = this.players.find((p) => p.id === owner) || this.players[0];
		if (p) p.score += points;
		this.score += points;
		this.event("kill", {
			x: e.x,
			d: e.d,
			kind: e.type,
			points,
			combo: this.combo,
		});
		if (e.type === "bridge") {
			this.bridges++;
			this.checkpoint = e.d + 5;
			this.players.forEach((p) => {
				if (!p.removed) {
					p.fuel = Math.min(100, p.fuel + 25);
					p.hp = Math.min(3, p.hp + 1);
				}
			});
			this.event("bridge", { index: e.bridge });
		}
		if (e.type === "boss") {
			this.bossDead = true;
			this.event("bossDown");
			for (const q of this.entities) if (q.type === "bossTurret") q.dead = true;
		}
		if (this.score >= this.nextExtra) {
			this.nextExtra += 10000;
			this.players.forEach((p) => {
				p.lives = Math.min(9, p.lives + 1);
			});
			this.event("reserve");
		}
	}
	hitPlayer(p, kind = "enemy") {
		if (p.invuln > 0 || p.respawn > 0 || p.lives <= 0 || p.removed || this.god)
			return;
		p.hp -= this.tuning.damage;
		p.invuln = 1.7;
		this.metrics.enemyHits++;
		if (kind === "bank") this.metrics.bankHits++;
		this.event("hurt", { id: p.id, x: p.x, d: p.d, kind });
		if (p.hp <= 0) this.crash(p, kind);
	}
	crash(p, kind) {
		if (this.god) {
			p.fuel = Math.max(p.fuel, 30);
			return;
		}
		p.lives--;
		p.hp = 0;
		p.respawn = 1.6;
		p.invuln = 3;
		this.metrics.deaths++;
		this.event("crash", { id: p.id, x: p.x, d: p.d, kind });
	}
	pulse(p) {
		if (
			p.pulse > 0 ||
			p.fuel < this.tuning.pulseCost ||
			p.respawn > 0 ||
			p.lives <= 0
		)
			return false;
		p.pulse = this.tuning.pulseCooldown;
		p.fuel -= this.tuning.pulseCost;
		this.metrics.pulses++;
		this.event("pulse", { x: p.x, d: p.d });
		for (const e of this.entities)
			if (
				!e.dead &&
				!["fuel", "island"].includes(e.type) &&
				e.d > p.d - 8 &&
				e.d < p.d + 32 &&
				Math.abs(e.x - p.x) < 18
			)
				this.damage(e, 6, p.id);
		this.bullets = this.bullets.filter(
			(b) => !b.enemy || Math.hypot(b.x - p.x, b.d - p.d) > 35,
		);
		return true;
	}
	bot(p, cheat = false) {
		const upcoming = this.entities.filter(
			(e) => !e.dead && e.d > p.d + 2 && e.d < p.d + 65,
		);
		let target = upcoming.find((e) => e.type === "fuel" && p.fuel < 75);
		let fire = true;
		if (!target) {
			const tur = upcoming.filter((e) => e.type === "bossTurret");
			target =
				tur[0] ||
				upcoming.find((e) => e.type === "bridge") ||
				upcoming.find((e) =>
					["boat", "heli", "jet", "turret", "boss"].includes(e.type),
				);
		} else fire = false;
		let aim = target ? target.x : river(p.d + 14).center;
		const island = upcoming.find(
			(e) =>
				["mine", "island"].includes(e.type) &&
				e.d < p.d + 25 &&
				Math.abs(e.x - aim) < 3.5,
		);
		if (island) aim += aim < river(p.d).center ? 4.3 : -4.3;
		const v = river(p.d);
		aim = Math.max(
			v.center - v.width + 2,
			Math.min(v.center + v.width - 2, aim),
		);
		if (cheat) p.fuel = Math.max(45, p.fuel);
		return {
			x: Math.max(-1, Math.min(1, (aim - p.x) * 0.7)),
			y: target ? 0.15 : -0.1,
			fire,
			pulse:
				upcoming.some((e) => e.type !== "fuel" && e.d < p.d + 18) &&
				p.pulse <= 0 &&
				p.fuel > 35,
		};
	}
	update(dt, inputs = {}) {
		if (this.over || this.finished) return;
		this.time += dt;
		this.clock += dt;
		this.comboTime = Math.max(0, this.comboTime - dt);
		if (!this.comboTime) this.combo = 0;
		let speed = this.tuning.speed;
		const active = this.players.filter((p) => !p.removed && p.lives > 0);
		let throttle = 0;
		for (const p of active) {
			const input = this.autopilot ? this.bot(p, true) : inputs[p.id] || {};
			throttle += input.y || 0;
		}
		throttle /= Math.max(1, active.length);
		speed *= 1 - throttle * 0.36;
		const bossIn = this.progress > 2720 && !this.bossDead;
		if (!bossIn) {
			const bridge = this.entities.find(
				(e) => e.type === "bridge" && !e.dead && e.d > this.progress,
			);
			const limit = bridge ? bridge.d - 12 : Infinity;
			this.progress = Math.min(
				this.progress + speed * dt,
				Math.max(this.progress, limit),
			);
		}
		this.lastSpeed = bossIn ? 0 : speed;
		this.setBanks();
		this.spawn();
		for (const e of this.entities) {
			e.age += dt;
			e.flash = Math.max(0, e.flash - dt);
			if (e.dead) continue;
			if (e.type === "heli")
				e.x = e.baseX + Math.sin(e.age * 0.8 + e.phase) * 2.8;
			if (e.type === "jet") {
				e.x = e.baseX + Math.sin(e.age * 1.4 + e.phase) * 7;
				e.d -= dt * 8;
			}
			if (e.type === "boat")
				e.x = e.baseX + Math.sin(e.age * 0.45 + e.phase) * 0.5;
			if (e.type === "boss" || e.type === "bossTurret")
				e.x = e.baseX + Math.sin(this.time * 0.55) * 1.6;
			const v = river(e.d);
			if (e.type !== "bridge")
				e.x = Math.max(
					v.center - v.width + e.rx,
					Math.min(v.center + v.width - e.rx, e.x),
				);
			e.body.setNextKinematicTranslation({ x: e.x, y: 1.5, z: -e.d });
			if (
				["heli", "turret", "boss", "bossTurret"].includes(e.type) &&
				e.d > this.progress &&
				e.d < this.progress + 65
			) {
				e.shoot -= dt * this.tuning.enemyRate;
				if (e.shoot <= 0) {
					e.shoot =
						e.type === "boss" ? 0.8 : 2.6 - (this.progress > 1740 ? 0.6 : 0);
					const p = active[Math.floor(this.clock) % Math.max(1, active.length)];
					if (p) {
						const dx = p.x - e.x,
							dd = p.d - e.d,
							_len = Math.hypot(dx, dd),
							vel = e.type === "boss" ? 15 : 12;
						const angle = Math.atan2(dx, -dd);
						for (const offset of e.type === "boss" ? [-0.28, 0, 0.28] : [0])
							this.addBullet(
								e.x,
								e.d - 2,
								Math.sin(angle + offset) * vel,
								-Math.cos(angle + offset) * vel,
								-1,
								true,
							);
						this.event("enemyShot");
					}
				}
			}
		}
		for (const p of this.players) {
			if (p.removed || p.lives <= 0) continue;
			p.cool -= dt;
			p.invuln = Math.max(0, p.invuln - dt);
			p.pulse = Math.max(0, p.pulse - dt);
			p.twin = Math.max(0, p.twin - dt);
			p.refueling = false;
			p.bank = false;
			if (p.respawn > 0) {
				p.respawn -= dt;
				if (p.respawn <= 0) {
					p.hp = 3;
					p.fuel = 75;
					p.x = river(this.progress + 7).center + (p.id % 2 ? 2 : -2);
					p.invuln = 3;
					this.event("respawn", { id: p.id });
				}
				continue;
			}
			const input = this.autopilot ? this.bot(p, true) : inputs[p.id] || {};
			let ix = Math.max(-1, Math.min(1, input.x || 0));
			if (Number.isFinite(input.targetX))
				ix = Math.max(-1, Math.min(1, (input.targetX - p.x) * 1.4));
			p.vx += (ix * this.tuning.steering - p.vx) * Math.min(1, dt * 11);
			p.x += p.vx * dt;
			p.x = Math.max(-27, Math.min(27, p.x));
			p.d = this.progress + 7 + (input.offset || 0);
			p.fire = !!input.fire;
			if (this.noFuel) p.fuel = 100;
			else
				p.fuel = Math.max(
					0,
					p.fuel -
						dt * this.tuning.fuelBurn * (0.94 + (1 - throttle * 0.36) * 0.1),
				);
			if (p.fuel <= 0) {
				this.crash(p, "fuel");
				continue;
			}
			if (input.pulse) this.pulse(p);
			if (input.fire && p.cool <= 0) {
				p.cool = 1 / this.tuning.fireRate;
				for (const off of p.twin > 0 ? [-0.45, 0.45] : [0])
					this.addBullet(p.x + off, p.d + 1.7, ix * 1.3, 64, p.id);
				this.event("shot", { id: p.id });
			}
			p.body.setNextKinematicTranslation({ x: p.x, y: 1.5, z: -p.d });
		}
		this.world.timestep = dt;
		this.world.step();
		this.metrics.physicsSteps++;
		for (const p of this.players) {
			if (p.removed || p.lives <= 0 || p.respawn > 0) continue;
			this.world.intersectionPairsWith(p.collider, (c) => {
				const v = this.byCollider.get(c.handle);
				if (!v) return;
				if (v.kind === "bank") {
					p.bank = true;
					this.hitPlayer(p, "bank");
					const r = river(p.d);
					p.x = Math.max(
						r.center - r.width + 1,
						Math.min(r.center + r.width - 1, p.x),
					);
					p.vx = 0;
				} else if (v.kind === "entity") {
					const e = v.e;
					if (e.dead) return;
					if (e.type === "fuel") {
						p.refueling = true;
						const before = p.fuel;
						p.fuel = Math.min(100, p.fuel + this.tuning.refuelRate * dt);
						this.metrics.refueled += p.fuel - before;
						if (
							Math.floor(this.clock * 5) !== Math.floor((this.clock - dt) * 5)
						)
							this.event("fuel", { id: p.id, full: p.fuel > 99 });
					} else if (e.type === "upgrade" || e.type === "repair") {
						e.dead = true;
						p.score += 100;
						this.score += 100;
						this.metrics.pickups++;
						if (e.type === "upgrade") p.twin = 24;
						else p.hp = Math.min(3, p.hp + 1);
						this.event("pickup", { kind: e.type, id: p.id, x: e.x, d: e.d });
					} else this.hitPlayer(p, "collision");
				}
			});
		}
		for (let i = this.bullets.length - 1; i >= 0; i--) {
			const b = this.bullets[i];
			b.life -= dt;
			let hit = false;
			const length = Math.hypot(b.vx, b.vd) * dt;
			const ray = new RAPIER.Ray(
				{ x: b.x, y: 1.5, z: -b.d },
				{
					x: b.vx / Math.hypot(b.vx, b.vd),
					y: 0,
					z: -b.vd / Math.hypot(b.vx, b.vd),
				},
			);
			const result = this.world.castRay(
				ray,
				length + 0.22,
				true,
				undefined,
				undefined,
				undefined,
				undefined,
				(c) => {
					const v = this.byCollider.get(c.handle);
					if (!v) return false;
					return b.enemy
						? v.kind === "player" &&
								v.p.respawn <= 0 &&
								v.p.lives > 0 &&
								!v.p.removed
						: v.kind === "entity" &&
								!v.e.dead &&
								!["upgrade", "repair"].includes(v.e.type);
				},
			);
			if (result) {
				const v = this.byCollider.get(result.collider.handle);
				if (b.enemy) this.hitPlayer(v.p, "bullet");
				else this.damage(v.e, 1, b.owner);
				hit = true;
			}
			b.x += b.vx * dt;
			b.d += b.vd * dt;
			if (
				hit ||
				b.life <= 0 ||
				b.d < this.progress - 25 ||
				b.d > this.progress + 115
			)
				this.bullets.splice(i, 1);
		}
		for (const e of [...this.entities])
			if (e.dead || e.d < this.progress - 30) this.removeEntity(e);
		if (active.length === 0) {
			this.over = true;
			this.event("gameover");
		}
		if (this.progress >= FINISH && this.bossDead && this.bridges === 3) {
			this.won = true;
			this.over = true;
			this.event("win");
		}
		if (this.progress > FINISH + 10 && !this.bossDead) {
			this.progress = 2721;
		}
	}
	snapshot() {
		return {
			progress: this.progress,
			time: this.time,
			score: this.score,
			bridges: this.bridges,
			kills: this.kills,
			combo: this.combo,
			checkpoint: this.checkpoint,
			bossDead: this.bossDead,
			won: this.won,
			over: this.over,
			lastSpeed: this.lastSpeed,
			players: this.players.map(({ body, collider, ...p }) => p),
			entities: this.entities
				.filter((e) => !e.dead)
				.map(({ body, collider, ...e }) => e),
			bullets: this.bullets.map((b) => ({ ...b })),
			metrics: { ...this.metrics },
		};
	}
	dispose() {
		this.world.free();
	}
}
