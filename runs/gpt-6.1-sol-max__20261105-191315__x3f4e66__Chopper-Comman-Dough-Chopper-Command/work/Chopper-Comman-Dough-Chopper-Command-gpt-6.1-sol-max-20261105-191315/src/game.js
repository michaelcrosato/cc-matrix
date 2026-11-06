import RAPIER from "@dimforge/rapier3d-compat";

export const DEFAULTS = {
	speed: 27,
	enemySpeed: 1,
	enemyDamage: 1,
	fireRate: 0.14,
	flareCooldown: 8,
	truckArmor: 3,
	aimAssist: 0.6,
	difficulty: 1,
};
export const DISPATCHES = [
	{
		name: "FRESH OFF THE TARMAC",
		subtitle: "Twelve trucks. One very hot delivery.",
		brief: "Cover the convoy. Keep those ovens waiting!",
		count: 12,
	},
	{
		name: "A DOUBLE HELPING",
		subtitle: "Fast jets. Splitting warheads. Stay sharp.",
		brief: "Those red diamonds split. Pop a flare when they close in!",
		count: 12,
	},
	{
		name: "HEAT IN THE KITCHEN",
		subtitle: "Armoured raiders in the dust.",
		brief: "Armour in the sky! Grab the gold supply crates.",
		count: 12,
	},
	{
		name: "THE LAST CRUMB",
		subtitle: "Bring down the Crumb Collector.",
		brief: "That carrier wants our cargo. Give it the works!",
		count: 6,
	},
];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const r = (a, b) => a + Math.random() * (b - a);
const groups = {
	pilot: [1, 2 | 8 | 32],
	heli: [2, 1 | 4],
	jet: [2, 1 | 4],
	boss: [2, 1 | 4],
	bullet: [4, 2],
	split: [8, 1 | 16],
	missile: [8, 1 | 16],
	truck: [16, 8],
	repair: [32, 1],
	power: [32, 1],
	debris: [64, 128],
};
export class Game {
	constructor(onEvent = () => {}) {
		this.onEvent = onEvent;
		this.config = { ...DEFAULTS };
		this.god = false;
		this.autoplay = false;
		this.cameraSeat = 0;
		this.entities = new Map();
		this.pilots = [];
		this.trucks = [];
		this.phase = "idle";
		this.time = 0;
		this.wave = 0;
		this.score = 0;
		this.stats = {};
		this.nextId = 1;
	}
	static async init() {
		await RAPIER.init();
	}
	reset(seats = [0], attract = false) {
		this.world?.free();
		this.queue?.free();
		this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		this.world.timestep = 1 / 60;
		this.queue = new RAPIER.EventQueue(true);
		this.entities.clear();
		this.handles = new Map();
		const floor = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.65, 0),
		);
		this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(400, 0.3, 12).setCollisionGroups(
				(128 << 16) | 64,
			),
			floor,
		);
		this.time = 0;
		this.wave = 0;
		this.score = 0;
		this.extraAt = 10000;
		this.combo = 0;
		this.comboTime = 0;
		this.phase = "play";
		this.wait = 1.5;
		this.nextWave = true;
		this.nextId = 1;
		this.spawnQueue = [];
		this.pilots = [];
		this.trucks = [];
		this.boss = null;
		this.attract = attract;
		this.autoplay = attract;
		this.finished = false;
		this.stats = {
			kills: 0,
			shots: 0,
			damage: 0,
			splits: 0,
			flares: 0,
			pickups: 0,
			repairs: 0,
			boostTime: 0,
			bosses: 0,
			convoyLost: 0,
			waves: 0,
		};
		for (let i = 0; i < 12; i++)
			this.trucks.push(
				this.create("truck", -62 + i * 10.5, 0, {
					index: i,
					hp: this.config.truckArmor,
					maxHp: this.config.truckArmor,
					vx: 2.1,
				}),
			);
		for (const seat of seats) this.addPilot(seat);
	}
	addPilot(seat) {
		if (this.pilots.some((p) => p.seat === seat && !p.dead)) return;
		const p = this.create("pilot", -5 + (seat % 4) * 7, 18 + (seat % 2) * 4, {
			seat,
			hp: 100,
			maxHp: 100,
			lives: 3,
			dir: 1,
			cool: 0,
			flare: 0,
			boost: 100,
			power: 0,
			invul: 3,
			respawn: 0,
		});
		this.pilots.push(p);
		return p;
	}
	removePilot(seat) {
		const p = this.getPilot(seat);
		if (p) {
			p.dead = true;
			this.cleanup();
		}
	}
	create(type, x, y, extra = {}) {
		const e = {
			id: this.nextId++,
			type,
			x,
			y,
			vx: 0,
			vy: 0,
			dir: 1,
			dead: false,
			age: 0,
			hp: 1,
			...extra,
		};
		let desc = RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(x, y, 0)
			.setLinearDamping(0)
			.setCanSleep(false);
		if (type === "bullet") desc = desc.setCcdEnabled(true);
		const body = this.world.createRigidBody(desc);
		body.setEnabledTranslations(true, true, false, true);
		if (type === "debris") body.setEnabledRotations(false, false, true, true);
		else body.lockRotations(true, true);
		let shape;
		if (type === "pilot" || type === "heli")
			shape = RAPIER.ColliderDesc.cuboid(2.25, 0.95, 0.9);
		else if (type === "jet") shape = RAPIER.ColliderDesc.cuboid(2.8, 0.62, 0.9);
		else if (type === "boss") shape = RAPIER.ColliderDesc.cuboid(9.2, 3.2, 1);
		else if (type === "truck")
			shape = RAPIER.ColliderDesc.cuboid(3, 1.9, 1.2).setTranslation(0, 1.7, 0);
		else
			shape = RAPIER.ColliderDesc.ball(
				type === "bullet" ? 0.4 : type === "debris" ? 0.3 : 0.65,
			);
		const [member, filter] = groups[type];
		shape = shape
			.setCollisionGroups((member << 16) | filter)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
			.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
		if (type !== "debris") shape.setSensor(true);
		else shape.setRestitution(0.45).setFriction(0.8);
		const collider = this.world.createCollider(shape, body);
		e.body = body;
		e.collider = collider;
		this.handles.set(collider.handle, e);
		body.setLinvel({ x: e.vx, y: e.vy, z: 0 }, true);
		this.entities.set(e.id, e);
		return e;
	}
	getPilot(seat) {
		return this.pilots.find((p) => p.seat === seat && !p.dead);
	}
	liveTrucks() {
		return this.trucks.filter((t) => !t.dead);
	}
	enemies() {
		return [...this.entities.values()].filter(
			(e) => ["heli", "jet", "boss"].includes(e.type) && !e.dead,
		);
	}
	event(type, data = {}) {
		this.onEvent(type, data);
	}
	beginWave() {
		this.wave++;
		this.wait = 0;
		this.nextWave = false;
		this.phase = "play";
		const dispatch = DISPATCHES[this.wave - 1];
		if (this.attract) {
			const p = this.pilots.find((p) => !p.dead);
			if (p)
				this.create("split", p.x + 25, p.y + 5, {
					vx: -8,
					vy: -1,
					ttl: 8,
					splitAt: 0.45,
					target: p.seat,
					owner: -1,
				});
		}
		this.spawnQueue = Array.from({ length: dispatch.count }, (_, i) => ({
			at: this.time + 1 + i * 1.5,
			type: (i + this.wave) % 3 === 0 ? "jet" : "heli",
			n: i,
		}));
		if (this.wave === 4) {
			const p = this.pilots.find((p) => !p.dead);
			this.boss = this.create("boss", clamp((p?.x || 0) + 36, -110, 110), 29, {
				hp: 125,
				maxHp: 125,
				cool: 3,
				dir: -1,
				anchor: 0,
			});
		}
		for (const p of this.pilots)
			if (!p.dead) {
				p.hp = Math.min(100, p.hp + 25);
				p.flare = 0;
				p.invul = Math.max(p.invul, 1.5);
			}
		this.event("dispatch", { wave: this.wave, ...dispatch });
	}
	spawnEnemy(type, n = 0) {
		const pilot = this.pilots.filter((p) => !p.dead)[
			n % Math.max(1, this.pilots.filter((p) => !p.dead).length)
		];
		const center = pilot?.x || 0;
		const side = n % 2 ? 1 : -1;
		const x = clamp(center + side * r(42, 65), -145, 145),
			y = [11, 21, 32][n % 3] + r(-2, 2);
		return this.create(type, x, y, {
			hp: this.wave >= 3 ? 3 : 2,
			maxHp: this.wave >= 3 ? 3 : 2,
			dir: -side,
			cool: r(2.4, 5.5),
			seed: r(0, 20),
			baseY: y,
			armor: this.wave >= 3,
			turn: 0,
		});
	}
	fire(p, angle) {
		const rate = this.config.fireRate * (p.power > 0 ? 0.58 : 1);
		if (p.cool > 0) return;
		p.cool = rate;
		this.stats.shots++;
		const dx = Math.cos(angle),
			dy = Math.sin(angle);
		p.dir = dx >= 0 ? 1 : -1;
		const muzzleX = p.x + dx * 3.3,
			muzzleY = p.y + dy * 1.2 - 0.3;
		this.create("bullet", muzzleX, muzzleY, {
			vx: dx * 96,
			vy: dy * 96,
			ttl: 1.6,
			owner: p.seat,
			damage: p.power > 0 ? 2 : 1,
		});
		if (p.power > 0)
			this.create("bullet", muzzleX, muzzleY - 0.8, {
				vx: dx * 96,
				vy: dy * 96,
				ttl: 1.6,
				owner: p.seat,
				damage: 2,
			});
		this.event("shot", { x: p.x, y: p.y });
	}
	aim(p, input) {
		if (Number.isFinite(input.angle)) return input.angle;
		let target = null,
			dist = Infinity;
		for (const e of this.enemies()) {
			const dx = e.x - p.x,
				dy = e.y - p.y,
				d = Math.hypot(dx, dy);
			if (
				Math.sign(dx) !== p.dir ||
				Math.abs(Math.atan2(dy, Math.abs(dx))) > this.config.aimAssist
			)
				continue;
			if (d < dist) {
				dist = d;
				target = e;
			}
		}
		return target
			? Math.atan2(
					target.y - p.y + ((target.vy || 0) * dist) / 96,
					target.x - p.x,
				)
			: p.dir > 0
				? 0
				: Math.PI;
	}
	popFlare(p) {
		if (p.flare > 0 || p.respawn > 0) return;
		p.flare = this.config.flareCooldown;
		p.invul = Math.max(p.invul, 1);
		this.stats.flares++;
		for (const e of this.entities.values())
			if (
				["split", "missile"].includes(e.type) &&
				Math.hypot(e.x - p.x, e.y - p.y) < 24
			)
				e.dead = true;
		this.event("flare", { x: p.x, y: p.y });
	}
	shootMissile(e, boss = false) {
		const candidates = this.pilots.filter((p) => !p.dead && p.respawn <= 0);
		const p = candidates.sort(
			(a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x),
		)[0];
		if (!p) return;
		const dx = p.x - e.x,
			dy = p.y - e.y,
			d = Math.hypot(dx, dy) || 1,
			s = 8 + this.wave * 0.75;
		this.create("split", e.x, e.y - 1.4, {
			vx: (dx / d) * s,
			vy: (dy / d) * s,
			ttl: 8,
			splitAt: 0.75,
			target: p.seat,
			owner: -1,
		});
		if (boss) {
			const ts = this.liveTrucks();
			const t = ts[Math.floor(Math.random() * ts.length)];
			if (t) this.missile(e.x - 6, e.y - 3, t.x, t.y + 1.5, 12);
		}
	}
	missile(x, y, tx, ty, speed) {
		const dx = tx - x,
			dy = ty - y,
			d = Math.hypot(dx, dy) || 1;
		return this.create("missile", x, y, {
			vx: (dx / d) * speed,
			vy: (dy / d) * speed,
			ttl: 9,
			owner: -1,
		});
	}
	split(e) {
		e.dead = true;
		this.stats.splits++;
		const p = this.getPilot(e.target) || this.pilots.find((p) => !p.dead);
		const ts = this.liveTrucks();
		const t = ts.sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0];
		const speed = (11 + this.wave) * this.config.difficulty;
		if (p)
			this.missile(
				e.x,
				e.y,
				p.x + (p.vx || 0) * 0.35,
				p.y + (p.vy || 0) * 0.35,
				speed,
			);
		if (t) this.missile(e.x, e.y, t.x + (t.vx || 0) * 0.5, 2, speed);
		this.event("split", { x: e.x, y: e.y });
	}
	hit(e, damage, owner = -1) {
		if (e.dead) return;
		if (
			e.type === "pilot" &&
			(e.invul > 0 || e.respawn > 0 || this.god || this.attract)
		)
			return;
		if (e.type === "truck" && this.attract) return;
		e.hp -= damage;
		if (e.type === "pilot") {
			e.invul = 0.7;
			this.stats.damage += damage;
			this.event("hurt", { x: e.x, y: e.y, seat: e.seat });
		}
		if (e.hp > 0) {
			if (e.type === "boss" || e.type === "heli" || e.type === "jet")
				this.event("hit", { x: e.x, y: e.y });
			return;
		}
		if (e.type === "pilot") {
			e.lives--;
			this.event("explosion", { x: e.x, y: e.y, big: true });
			if (e.lives > 0) {
				e.respawn = 2;
				e.hp = 100;
				e.invul = 4;
				e.body.setTranslation({ x: e.x, y: -100, z: 0 }, true);
				e.y = -100;
			} else e.dead = true;
			return;
		}
		e.dead = true;
		this.event("explosion", {
			x: e.x,
			y: e.y + (e.type === "truck" ? 2 : 0),
			big: e.type === "boss",
		});
		if (e.type === "truck") {
			this.stats.convoyLost++;
			this.event("message", {
				text: "Cargo down! Cover the remaining trucks.",
				tone: "warning",
			});
		}
		if (["heli", "jet", "boss"].includes(e.type)) {
			this.stats.kills++;
			this.combo = this.comboTime > 0 ? this.combo + 1 : 1;
			this.comboTime = 4;
			const pts =
				(e.type === "boss" ? 3000 : e.type === "jet" ? 200 : 100) *
				Math.min(5, 1 + Math.floor(this.combo / 4));
			this.score += pts;
			this.event("points", { x: e.x, y: e.y, text: "+" + pts });
			if (e.type === "boss") {
				this.stats.bosses++;
				for (let i = 0; i < 8; i++)
					this.makeDebris(e.x + r(-7, 7), e.y + r(-2, 2));
			} else for (let i = 0; i < 3; i++) this.makeDebris(e.x, e.y);
			if (this.stats.kills % 4 === 0)
				this.create(
					this.stats.kills % 8 === 0 ? "power" : "repair",
					e.x,
					clamp(e.y, 8, 31),
					{ ttl: 22, vy: -0.2 },
				);
		}
	}
	makeDebris(x, y) {
		const e = this.create("debris", x, y, {
			vx: r(-12, 12),
			vy: r(3, 11),
			ttl: 3.5,
		});
		e.body.setAngvel({ x: 0, y: 0, z: r(-8, 8) }, true);
		return e;
	}
	collide(a, b) {
		if (!a || !b || a.dead || b.dead) return;
		if (b.type === "bullet") return this.collide(b, a);
		if (a.type === "bullet" && ["heli", "jet", "boss"].includes(b.type)) {
			a.dead = true;
			this.hit(b, a.damage, a.owner);
			return;
		}
		if (
			["missile", "split"].includes(b.type) &&
			["pilot", "truck"].includes(a.type)
		)
			return this.collide(b, a);
		if (
			["missile", "split"].includes(a.type) &&
			["pilot", "truck"].includes(b.type)
		) {
			a.dead = true;
			this.hit(b, b.type === "truck" ? 1 : 18 * this.config.enemyDamage);
			return;
		}
		if (b.type === "pilot" && a.type !== "pilot") return this.collide(b, a);
		if (a.type === "pilot" && ["heli", "jet", "boss"].includes(b.type)) {
			this.hit(a, 35 * this.config.enemyDamage);
			if (b.type !== "boss") this.hit(b, 1, a.seat);
			return;
		}
		if (a.type === "pilot" && ["repair", "power"].includes(b.type)) {
			b.dead = true;
			this.stats.pickups++;
			if (b.type === "power") {
				a.power = 9;
				a.flare = 0;
			} else {
				a.hp = Math.min(100, a.hp + 35);
				const t = this.liveTrucks().sort((a, b) => a.hp - b.hp)[0];
				if (t) t.hp = t.maxHp;
			}
			this.score += 150;
			this.event("pickup", { x: b.x, y: b.y, kind: b.type });
		}
	}
	ai(p) {
		if (!p || p.dead) return {};
		const closeThreat = [...this.entities.values()].some(
			(e) =>
				["split", "missile"].includes(e.type) &&
				Math.hypot(e.x - p.x, e.y - p.y) < 15,
		);
		if (this.attract && this.nextWave && this.wave > 0) {
			const t = this.liveTrucks()[5] || this.liveTrucks()[0];
			return {
				x: clamp(((t?.x || 0) - p.x) * 0.4 + 0.075, -0.3, 0.3),
				y: clamp((7 - p.y) * 0.4, -1, 1),
				fire: false,
			};
		}
		const es = this.enemies();
		const target = es.sort(
			(a, b) =>
				Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
		)[0];
		if (!target) {
			const t = this.liveTrucks()[5] || this.liveTrucks()[0];
			return {
				x: clamp(((t?.x || 0) - p.x) * 0.08, -0.6, 0.6),
				y: clamp((19 + Math.sin(this.time * 0.7) * 7 - p.y) * 0.25, -1, 1),
				fire: true,
				flare: closeThreat,
			};
		}
		const dx = target.x - p.x,
			dy = target.y - p.y,
			lead = Math.hypot(dx, dy) / 96;
		const tx = target.x + (target.vx || 0) * lead,
			ty = target.y + (target.vy || 0) * lead;
		return {
			x: clamp((dx - Math.sign(dx || 1) * 20) * 0.08, -1, 1),
			y: clamp((ty - p.y) * 0.3, -1, 1),
			fire: true,
			angle: Math.atan2(ty - p.y, tx - p.x),
			flare: closeThreat,
			boost:
				Math.abs(dx) > 65 || (this.attract && Math.sin(this.time * 1.2) > 0.6),
		};
	}
	step(dt, inputs = {}) {
		if (!this.world || ["idle", "won", "lost", "ended"].includes(this.phase))
			return;
		dt = clamp(dt, 0.001, 1 / 30);
		this.time += dt;
		this.world.timestep = dt;
		this.comboTime = Math.max(0, this.comboTime - dt);
		if (this.comboTime === 0) this.combo = 0;
		if (this.wait > 0) {
			this.wait -= dt;
			if (this.wait <= 0 && this.nextWave) this.beginWave();
		}
		while (this.spawnQueue.length && this.spawnQueue[0].at <= this.time) {
			const s = this.spawnQueue.shift();
			this.spawnEnemy(s.type, s.n);
		}
		for (const e of [...this.entities.values()]) {
			if (e.dead) continue;
			e.age += dt;
			if (e.ttl !== undefined) {
				e.ttl -= dt;
				if (e.ttl <= 0) {
					e.dead = true;
					continue;
				}
			}
			if (e.type === "pilot") {
				if (e.respawn > 0) {
					e.respawn -= dt;
					if (e.respawn <= 0) {
						e.x = clamp(this.liveTrucks()[5]?.x || 0, -130, 130);
						e.y = 19;
						e.body.setTranslation({ x: e.x, y: e.y, z: 0 }, true);
						e.vx = 0;
						e.vy = 0;
					} else {
						e.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
						continue;
					}
				}
				e.cool = Math.max(0, e.cool - dt);
				e.flare = Math.max(0, e.flare - dt);
				e.invul = Math.max(0, e.invul - dt);
				e.power = Math.max(0, e.power - dt);
				const input = this.autoplay ? this.ai(e) : inputs[e.seat] || {};
				const ix = clamp(input.x || 0, -1, 1),
					iy = clamp(input.y || 0, -1, 1),
					len = Math.max(1, Math.hypot(ix, iy));
				const boost = input.boost && e.boost > 3;
				if (boost) {
					e.boost = Math.max(0, e.boost - dt * 32);
					this.stats.boostTime += dt;
				} else e.boost = Math.min(100, e.boost + dt * 20);
				const speed = this.config.speed * (boost ? 1.7 : 1);
				const smooth = 1 - Math.exp(-dt * 9);
				e.vx += ((ix / len) * speed - e.vx) * smooth;
				e.vy += ((iy / len) * speed * 0.82 - e.vy) * smooth;
				if (Math.abs(ix) > 0.15 && !Number.isFinite(input.angle))
					e.dir = ix > 0 ? 1 : -1;
				if (e.x < -148 && e.vx < 0) e.vx = 0;
				if (e.x > 148 && e.vx > 0) e.vx = 0;
				if (e.y < 5.5 && e.vy < 0) e.vy = 0;
				if (e.y > 39 && e.vy > 0) e.vy = 0;
				if (input.fire) this.fire(e, this.aim(e, input));
				if (input.flare) this.popFlare(e);
				const near = this.liveTrucks().find(
					(t) =>
						Math.abs(t.x - e.x) < 5 && e.y < 9 && Math.hypot(e.vx, e.vy) < 7,
				);
				e.repairing = !!near;
				if (near) {
					e.hp = Math.min(100, e.hp + dt * 5);
					near.repair = (near.repair || 0) + dt;
					if (near.repair > 1.8 && near.hp < near.maxHp) {
						near.hp++;
						near.repair = 0;
						this.stats.repairs++;
						this.event("repair", { x: near.x, y: 4 });
					}
				}
			} else if (e.type === "truck") {
				e.vx = 2.1;
				if (e.x > 143) {
					e.x = -143;
					e.body.setTranslation({ x: e.x, y: 0, z: 0 }, true);
				}
			} else if (e.type === "heli" || e.type === "jet") {
				const ps = this.pilots.filter((p) => !p.dead && p.respawn <= 0);
				const p = ps.sort(
					(a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x),
				)[0];
				const s =
					(e.type === "jet" ? 21 : 10) *
					(1 + (this.wave - 1) * 0.13) *
					this.config.enemySpeed;
				e.turn -= dt;
				if (e.type === "heli") {
					if (p && Math.abs(p.x - e.x) > 30) e.dir = p.x > e.x ? 1 : -1;
					if (p && Math.abs(p.x - e.x) < 14 && e.turn < 0) {
						e.dir *= -1;
						e.turn = 1.8;
					}
					e.vx = e.dir * s;
					e.vy = (e.baseY + Math.sin(this.time * 1.7 + e.seed) * 4 - e.y) * 1.6;
				} else {
					e.vx = e.dir * s;
					e.vy = (e.baseY + Math.sin(this.time * 1.9 + e.seed) * 3 - e.y) * 2;
				}
				if (e.x > 151) e.dir = -1;
				if (e.x < -151) e.dir = 1;
				e.cool -= dt;
				if (e.cool <= 0) {
					this.shootMissile(e);
					e.cool =
						(this.wave === 1 ? 5.8 : 4.5) / this.config.difficulty + r(0, 1.7);
				}
			} else if (e.type === "boss") {
				if (e.hp < 60 && !e.enraged) {
					e.enraged = true;
					this.event("message", {
						text: "Carrier's cracking! Watch that triple spread!",
						tone: "warning",
					});
				}
				const p = this.pilots.find((p) => !p.dead);
				e.vx = clamp(
					((p?.x || 0) + Math.sin(this.time * 0.25) * 30 - e.x) * 0.5,
					-8,
					8,
				);
				e.vy = (27 + Math.sin(this.time * 0.9) * 5 - e.y) * 2;
				e.cool -= dt;
				if (e.cool <= 0) {
					this.shootMissile(e, true);
					if (e.hp < 60) {
						this.shootMissile({ ...e, x: e.x + 6, y: e.y - 1 });
						this.missile(e.x, e.y - 3, e.x - 10, 0, 14);
						this.missile(e.x, e.y - 3, e.x + 10, 0, 14);
					}
					e.cool = e.hp < 60 ? 1.5 : 2.4;
				}
			} else if (e.type === "split" && e.age > e.splitAt) {
				this.split(e);
				continue;
			} else if (e.type === "debris") {
				e.body.resetForces(true);
				e.body.addForce({ x: 0, y: -15 * e.body.mass(), z: 0 }, true);
			}
			if (e.type !== "debris")
				e.body.setLinvel({ x: e.vx || 0, y: e.vy || 0, z: 0 }, true);
		}
		this.world.step(this.queue);
		this.queue.drainCollisionEvents((h1, h2, started) => {
			if (started) this.collide(this.handles.get(h1), this.handles.get(h2));
		});
		for (const e of this.entities.values()) {
			if (!e.dead) {
				const pos = e.body.translation();
				e.x = pos.x;
				e.y = pos.y;
				if (e.type === "missile" && (e.y < 0.2 || Math.abs(e.x) > 170))
					e.dead = true;
			}
		}
		this.cleanup();
		while (this.score >= this.extraAt) {
			for (const p of this.pilots)
				if (!p.dead) p.lives = Math.min(6, p.lives + 1);
			this.extraAt += 10000;
			this.event("message", {
				text: "Fresh wings! Extra chopper reserve.",
				tone: "good",
			});
		}
		if (!this.liveTrucks().length || this.pilots.every((p) => p.dead)) {
			this.finish(false);
			return;
		}
		if (
			this.wave > 0 &&
			!this.nextWave &&
			!this.spawnQueue.length &&
			!this.enemies().length
		) {
			this.stats.waves++;
			const bonus = this.liveTrucks().length * this.wave * 100;
			this.score += bonus;
			if (this.wave === 4) {
				this.finish(true);
			} else {
				this.nextWave = true;
				this.wait = 4;
				this.phase = "between";
				if (this.attract) {
					const t = this.liveTrucks()[5] || this.liveTrucks()[0],
						p = this.pilots[0];
					if (t && p) {
						t.hp = Math.max(1, t.maxHp - 1);
						p.x = t.x;
						p.y = 7;
						p.vx = 0;
						p.vy = 0;
						p.body.setTranslation({ x: p.x, y: p.y, z: 0 }, true);
					}
				}
				this.event("waveclear", {
					wave: this.wave,
					bonus,
					saved: this.liveTrucks().length,
				});
			}
		}
	}
	cleanup() {
		for (const [id, e] of this.entities)
			if (e.dead) {
				this.handles.delete(e.collider.handle);
				this.world.removeRigidBody(e.body);
				this.entities.delete(id);
			}
	}
	finish(won) {
		if (this.finished) return;
		this.finished = true;
		this.phase = won ? "won" : "lost";
		this.event("finish", {
			won,
			score: this.score,
			saved: this.liveTrucks().length,
			stats: { ...this.stats },
		});
	}
	snapshot() {
		return {
			type: "world",
			t: +this.time.toFixed(3),
			wave: this.wave,
			phase: this.phase,
			score: this.score,
			combo: this.combo,
			wait: +this.wait.toFixed(2),
			stats: this.stats,
			e: [...this.entities.values()]
				.filter((e) => e.type !== "debris")
				.slice(0, 160)
				.map((e) => [
					e.id,
					e.type,
					+e.x.toFixed(2),
					+e.y.toFixed(2),
					e.dir,
					e.hp,
					e.maxHp || 0,
					e.seat ?? e.index ?? -1,
					e.lives || 0,
					+(e.flare || 0).toFixed(2),
					+(e.boost || 0).toFixed(1),
					+(e.power || 0).toFixed(2),
					+(e.invul || 0).toFixed(2),
					+(e.vx || 0).toFixed(1),
					+(e.vy || 0).toFixed(1),
					e.repairing ? 1 : 0,
					+(e.respawn || 0).toFixed(2),
				]),
			pilots: this.pilots.map((p) => [p.seat, p.lives, p.dead ? 1 : 0]),
		};
	}
	applySnapshot(s) {
		this.time = s.t;
		this.wave = s.wave;
		this.phase = s.phase;
		this.score = s.score;
		this.combo = s.combo;
		this.wait = s.wait;
		this.stats = s.stats;
		this.entities.clear();
		for (const a of s.e) {
			const e = {
				id: a[0],
				type: a[1],
				x: a[2],
				y: a[3],
				dir: a[4],
				hp: a[5],
				maxHp: a[6],
				seat: a[7],
				index: a[7],
				lives: a[8],
				flare: a[9],
				boost: a[10],
				power: a[11],
				invul: a[12],
				vx: a[13],
				vy: a[14],
				repairing: !!a[15],
				respawn: a[16],
			};
			this.entities.set(e.id, e);
		}
		this.pilots = s.pilots.map(
			(a) => this.getBySeat(a[0]) || { seat: a[0], lives: a[1], dead: !!a[2] },
		);
		this.trucks = [...this.entities.values()].filter((e) => e.type === "truck");
		this.boss = [...this.entities.values()].find((e) => e.type === "boss");
	}
	getBySeat(seat) {
		return [...this.entities.values()].find(
			(e) => e.type === "pilot" && e.seat === seat,
		);
	}
	inspect() {
		return {
			phase: this.phase,
			time: this.time,
			wave: this.wave,
			score: this.score,
			pilots: this.pilots.map((p) => ({
				seat: p.seat,
				x: p.x,
				y: p.y,
				hp: p.hp,
				lives: p.lives,
				dead: !!p.dead,
				flare: p.flare,
				boost: p.boost,
				power: p.power,
			})),
			trucks: this.liveTrucks().length,
			enemies: this.enemies().length,
			entities: this.entities.size,
			stats: { ...this.stats },
			config: { ...this.config },
			physics: !!this.world,
		};
	}
}
