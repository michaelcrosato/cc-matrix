import RAPIER from "@dimforge/rapier3d-compat";
import {
	BRIDGES,
	bankSafe,
	islandAt,
	LENGTH,
	riverAt,
	safeLane,
} from "./world.js";

export const DEFAULTS = {
	scrollSpeed: 36,
	steerSpeed: 24,
	fuelBurn: 1.25,
	enemyFire: 1,
	bulletDamage: 1,
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const emptyInput = () => ({
	x: 0,
	y: 0,
	fire: false,
	roll: false,
	burst: false,
	aim: 0,
});
export class Sortie {
	constructor(onEvent) {
		this.onEvent = onEvent;
		this.params = { ...DEFAULTS };
		this.god = false;
		this.autopilot = false;
		this.phase = "title";
		this.time = 0;
		this.progress = 0;
		this.players = [];
		this.entities = [];
		this.bullets = [];
		this.score = 0;
		this.fuel = 100;
		this.reserves = 3;
		this.checkpoint = 0;
		this.shake = 0;
		this.elapsed = 0;
		this.eventHistory = [];
		this.stats = {
			kills: 0,
			shots: 0,
			hits: 0,
			fuelStops: 0,
			bridges: 0,
			rolls: 0,
			bursts: 0,
			deaths: 0,
		};
		this.world = null;
		this.ids = 1;
		this.bulletId = 1;
		this.stage = 0;
		this.combo = 0;
		this.comboTimer = 0;
		this.inputs = new Map();
		this.rngSeed = 1982;
		this.ended = false;
	}
	random() {
		this.rngSeed = (Math.imul(this.rngSeed, 1664525) + 1013904223) >>> 0;
		return this.rngSeed / 4294967296;
	}
	emit(type, data = {}) {
		const event = { type, ...data, time: this.time };
		this.eventHistory.push(event);
		if (this.eventHistory.length > 100) this.eventHistory.shift();
		this.onEvent?.(event);
	}
	reset(seats = [{ id: 0, name: "PILOT 01" }], attract = false) {
		this.world?.free();
		this.queue?.free();
		this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		this.queue = new RAPIER.EventQueue(true);
		this.colliderMap = new Map();
		this.phase = attract ? "attract" : "playing";
		this.time = 0;
		this.elapsed = 0;
		this.progress = 0;
		this.score = 0;
		this.fuel = 100;
		this.reserves = Math.max(3, seats.length + 1);
		this.checkpoint = 0;
		this.checkpointScore = 0;
		this.entities = [];
		this.bullets = [];
		this.players = [];
		this.ids = 1;
		this.bulletId = 1;
		this.rngSeed = 1982;
		this.shake = 0;
		this.stage = 0;
		this.combo = 0;
		this.comboTimer = 0;
		this.bossStarted = false;
		this.bossDown = false;
		this.bossTime = 0;
		this.ended = false;
		this.lowFuel = false;
		this.eventHistory = [];
		this.stats = {
			kills: 0,
			shots: 0,
			hits: 0,
			fuelStops: 0,
			bridges: 0,
			rolls: 0,
			bursts: 0,
			deaths: 0,
		};
		for (const [i, seat] of seats.entries()) {
			this.addPlayer(seat, (i - (seats.length - 1) / 2) * 5, 11 + (i % 2) * 4);
		}
		for (let s = 145; s < 4890; s += 76 + this.random() * 34) {
			if (BRIDGES.some((v) => Math.abs(s - v) < 100)) continue;
			const r = riverAt(s),
				type =
					s > 1700 && this.random() > 0.68
						? "gunboat"
						: this.random() > 0.64
							? "heli"
							: "boat";
			let x = r.center + (this.random() * 2 - 1) * (r.width - 4);
			const island = islandAt(s);
			if (island && Math.abs(x - island.x) < island.width + 3)
				x = safeLane(s, x < r.center ? -1 : 1);
			this.addEntity(
				type,
				x,
				s,
				type === "gunboat" ? 4 : type === "heli" ? 2 : 2,
			);
			if (s > 1800 && this.random() > 0.6)
				this.addEntity("heli", safeLane(s + 23, 1), s + 23, 2);
		}
		[300, 1060, 1410, 1870, 2480, 3030, 3590, 4380, 4780].forEach((s, i) => {
			this.addEntity(
				"fuel",
				safeLane(s, i % 2 ? 1 : -1) + (islandAt(s) ? 0 : i % 2 ? 7 : -7),
				s,
				6,
			);
		});
		BRIDGES.forEach((s) => {
			this.addEntity("bridge", riverAt(s).center, s, 14);
		});
		[520, 1720, 3380, 4560].forEach((s) => {
			this.addEntity("cache", safeLane(s), s, 1);
		});
		this.addEntity(
			"boss",
			riverAt(5150).center,
			5150,
			145 + (seats.length - 1) * 70,
		);
		this.entities.sort((a, b) => a.s - b.s);
		this.emit("radio", {
			text: "Keep the water under your wings.",
			speaker: "CONTROL / 01",
		});
	}
	addPlayer(seat, x = safeLane(this.progress - 11), y = 11) {
		const player = {
			id: seat.id,
			name: seat.name,
			x,
			y,
			vx: 0,
			vy: 0,
			hp: 3,
			invuln: 2,
			roll: 0,
			rollCooldown: 0,
			rollStamp: 0,
			fireTimer: 0,
			bursts: 2,
			burstHeld: false,
			rollHeld: false,
			left: false,
		};
		player._physics = this.sensor(player, 1, 2 | 8 | 16 | 32, [1, 0.8, 1.2]);
		this.players.push(player);
		return player;
	}
	sensor(object, member, filter, size, ball = false) {
		const body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
				object.x || 0,
				2.8,
				-(object.s || 0),
			),
		);
		let desc = ball
			? RAPIER.ColliderDesc.ball(size[0])
			: RAPIER.ColliderDesc.cuboid(...size);
		desc = desc
			.setSensor(true)
			.setCollisionGroups((member << 16) | filter)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
			.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
		const collider = this.world.createCollider(desc, body);
		this.colliderMap.set(collider.handle, object);
		return { body, collider };
	}
	addEntity(type, x, s, hp) {
		const e = {
			id: this.ids++,
			type,
			x,
			baseX: x,
			s,
			hp,
			maxHp: hp,
			dead: false,
			timer: 0.5 + this.random() * 2,
			refueled: false,
		};
		const dims = {
			boat: [1.6, 1, 3.2],
			gunboat: [1.8, 1, 3.2],
			heli: [1.7, 1, 2.5],
			fuel: [3.6, 1, 5.8],
			bridge: [4.2, 1, 3],
			cache: [1.8, 1, 1.8],
			boss: [5.5, 1, 12],
		}[type];
		const member = type === "fuel" ? 16 : type === "cache" ? 32 : 2;
		e._physics = this.sensor(e, member, type === "cache" ? 1 : 1 | 4, dims);
		this.entities.push(e);
		return e;
	}
	removePhysics(object) {
		if (object._physics) {
			this.colliderMap.delete(object._physics.collider.handle);
			this.world.removeRigidBody(object._physics.body);
			object._physics = null;
		}
	}
	shoot(player, input) {
		const angle = clamp(input.aim || 0, -0.65, 0.65),
			s = this.progress - player.y;
		const b = {
			id: this.bulletId++,
			x: player.x,
			s: s + 3.1,
			vx: Math.sin(angle) * 145,
			vs: Math.cos(angle) * 145,
			enemy: false,
			owner: player.id,
			age: 0,
			used: false,
		};
		b._physics = this.sensor(b, 4, 2 | 16, [0.28], true);
		this.bullets.push(b);
		this.stats.shots++;
		this.emit("shoot", { player: player.id });
	}
	enemyShot(e, vx, vs, offsetX = 0) {
		const b = {
			id: this.bulletId++,
			x: e.x + offsetX,
			s: e.s - 4,
			vx,
			vs,
			enemy: true,
			owner: e.id,
			age: 0,
			used: false,
		};
		b._physics = this.sensor(b, 8, 1, [0.5], true);
		this.bullets.push(b);
	}
	hitPlayer(player, reason = "hit") {
		if (
			player.invuln > 0 ||
			player.roll > 0 ||
			this.god ||
			this.phase === "attract"
		)
			return;
		player.hp--;
		player.invuln = 1.8;
		this.combo = 0;
		this.shake = 0.6;
		this.emit("damage", { x: player.x, s: this.progress - player.y, reason });
		if (player.hp <= 0) {
			this.reserves--;
			this.stats.deaths++;
			player.hp = 3;
			player.invuln = 4;
			player.x = safeLane(this.progress - player.y);
			this.fuel = Math.max(this.fuel, 25);
			this.emit("death", { x: player.x, s: this.progress - player.y });
			if (this.reserves < 0) this.end(false, "NO AIRFRAMES LEFT");
			else
				this.emit("radio", {
					text: "Fresh wings. Same questionable plan.",
					speaker: "CONTROL / RESCUE",
				});
		}
	}
	damageEntity(e, damage, owner = 0) {
		if (e.dead || e.type === "cache") return;
		e.hp -= damage;
		this.stats.hits++;
		if (e.hp > 0) {
			this.emit("impact", { x: e.x, s: e.s });
			return;
		}
		e.dead = true;
		this.removePhysics(e);
		this.combo = Math.min(8, this.combo + 1);
		this.comboTimer = 4;
		const value =
			{
				boat: 100,
				gunboat: 200,
				heli: 150,
				fuel: 50,
				bridge: 1200,
				boss: 5000,
			}[e.type] || 100;
		this.score += value * Math.max(1, this.combo);
		this.stats.kills++;
		this.shake = e.type === "boss" ? 1.5 : e.type === "bridge" ? 0.9 : 0.2;
		this.emit("destroy", { x: e.x, s: e.s, kind: e.type, owner });
		if (e.type === "fuel")
			this.emit("radio", {
				text: "That was the petrol. Try flying over the next one.",
				speaker: "CONTROL / DRY HUMOR",
			});
		if (e.type === "bridge") {
			this.stats.bridges++;
			this.checkpoint = e.s + 20;
			this.checkpointScore = this.score;
			this.fuel = Math.min(100, this.fuel + 35);
			for (const p of this.players) {
				p.hp = 3;
				p.bursts = 2;
				p.invuln = 2;
			}
			this.emit("checkpoint", { index: this.stats.bridges });
			this.emit("radio", {
				text:
					this.stats.bridges === 1
						? "A bridge too few. Welcome to Splitwater."
						: "Estuary ahead. Someone brought a bigger boat.",
				speaker: "CONTROL / CHECKPOINT",
			});
		}
		if (e.type === "boss") {
			this.bossDown = true;
			this.fuel = 100;
			this.emit("radio", {
				text: "River clear. Put it on my tab.",
				speaker: "CONTROL / ALL CLEAR",
			});
		}
	}
	rollPlayer(player) {
		if (player.rollCooldown > 0) return false;
		player.roll = 0.8;
		player.rollCooldown = 4.8;
		player.rollStamp++;
		this.stats.rolls++;
		this.emit("roll", { player: player.id });
		return true;
	}
	burstPlayer(player) {
		if (player.bursts <= 0) return false;
		player.bursts--;
		this.stats.bursts++;
		this.shake = 1.2;
		const s = this.progress - player.y;
		for (const e of this.entities)
			if (
				!e.dead &&
				e.s > s - 15 &&
				e.s < s + 95 &&
				e.type !== "fuel" &&
				e.type !== "cache"
			)
				this.damageEntity(
					e,
					e.type === "boss" ? 30 : e.type === "bridge" ? 8 : 99,
					player.id,
				);
		for (const b of this.bullets) if (b.enemy) b.used = true;
		this.emit("burst", { x: player.x, s });
		return true;
	}
	ai(player) {
		const s = this.progress - player.y;
		let targetX = safeLane(s + 26, player.id % 2 ? 1 : -1),
			target = null;
		const fuel = this.entities.find(
			(e) => !e.dead && e.type === "fuel" && e.s > s - 4 && e.s < s + 150,
		);
		if (fuel && this.fuel < 89) {
			target = fuel;
			targetX = fuel.x;
		} else {
			target = this.entities
				.filter(
					(e) =>
						!e.dead &&
						!["fuel", "cache"].includes(e.type) &&
						e.s > s + 8 &&
						e.s < s + 130,
				)
				.sort((a, b) => a.s - b.s)[0];
			if (target && bankSafe(target.x, s + 20, 2)) targetX = target.x;
		}
		const here = riverAt(s),
			island = islandAt(s + 8);
		if (island && Math.abs(targetX - island.x) < island.width + 3)
			targetX = safeLane(s + 15, player.x < here.center ? -1 : 1);
		const aim =
			target && target.type !== "fuel"
				? Math.atan2(target.x - player.x, target.s - s)
				: 0;
		return {
			x: clamp((targetX - player.x) * 0.6, -1, 1),
			y: fuel && Math.abs(fuel.s - s) < 9 ? 0.8 : -0.12,
			fire: !fuel || Math.abs(fuel.s - s) > 30,
			roll: Math.floor(this.time / 7) > Math.floor((this.time - 1 / 60) / 7),
			burst:
				this.bossStarted &&
				player.bursts > 0 &&
				Math.floor(this.bossTime / 5) >
					Math.floor((this.bossTime - 1 / 60) / 5),
			aim,
		};
	}
	step(dt = 1 / 60) {
		if (!["playing", "attract"].includes(this.phase) || !this.world) return;
		this.time += dt;
		this.elapsed += dt;
		this.shake = Math.max(0, this.shake - dt * 2);
		this.comboTimer -= dt;
		if (this.comboTimer <= 0) this.combo = 0;
		let throttle = 0,
			pilots = 0;
		for (const p of this.players) {
			if (p.left) continue;
			const input =
				this.autopilot || this.phase === "attract"
					? this.ai(p)
					: this.inputs.get(p.id) || emptyInput();
			throttle += clamp(input.y || 0, -1, 1);
			pilots++;
			p.vx +=
				((input.x || 0) * this.params.steerSpeed - p.vx) * Math.min(1, dt * 12);
			p.vy += ((input.y || 0) * 11 - p.vy) * Math.min(1, dt * 10);
			p.x += p.vx * dt;
			p.y = clamp(p.y + p.vy * dt, -11, 20);
			const s = this.progress - p.y,
				r = riverAt(s);
			p.x = clamp(p.x, r.center - r.width - 2, r.center + r.width + 2);
			if (!bankSafe(p.x, s)) {
				this.hitPlayer(p, "BANK");
				p.x += (safeLane(s, p.x < r.center ? -1 : 1) - p.x) * dt * 6;
			}
			p.invuln = Math.max(0, p.invuln - dt);
			p.roll = Math.max(0, p.roll - dt);
			p.rollCooldown = Math.max(0, p.rollCooldown - dt);
			p.fireTimer -= dt;
			if (input.roll && !p.rollHeld) this.rollPlayer(p);
			p.rollHeld = !!input.roll;
			if (input.burst && !p.burstHeld) this.burstPlayer(p);
			p.burstHeld = !!input.burst;
			const pad = this.entities.find(
				(e) =>
					e.type === "fuel" &&
					!e.dead &&
					Math.abs(e.s - s) < 8 &&
					Math.abs(e.x - p.x) < 3.5,
			);
			if (pad) {
				this.fuel = Math.min(100, this.fuel + dt * 38);
				if (!pad.refueled) {
					pad.refueled = true;
					this.stats.fuelStops++;
					this.emit("refuel", { x: pad.x, s: pad.s });
				}
			}
			if (input.fire && !pad && p.fireTimer <= 0) {
				this.shoot(p, input);
				p.fireTimer = 0.12;
			}
		}
		const livingBridge = this.entities.find(
			(e) => e.type === "bridge" && !e.dead && e.s >= this.progress - 10,
		);
		let speed =
			this.params.scrollSpeed * (1 - (pilots ? throttle / pilots : 0) * 0.32);
		if (livingBridge && livingBridge.s - this.progress < 85)
			speed *= clamp((livingBridge.s - this.progress - 25) / 60, 0, 1);
		const boss = this.entities.find((e) => e.type === "boss");
		if (this.progress > 4940 && !boss.dead) {
			if (!this.bossStarted) {
				this.bossStarted = true;
				this.emit("boss");
				this.emit("radio", {
					text: "The Tax Collector. Aim for the yellow power core.",
					speaker: "CONTROL / HEAVY TRAFFIC",
				});
			}
			this.bossTime += dt;
			speed *= clamp((5105 - this.progress) / 100, 0, 1);
		}
		this.progress += speed * dt;
		this.fuel -=
			this.params.fuelBurn *
			dt *
			(this.phase === "attract" || this.god ? 0 : 1);
		if (this.fuel <= 20 && !this.lowFuel) {
			this.lowFuel = true;
			this.emit("lowfuel");
			this.emit("radio", {
				text: "Your tank is mostly optimism. Find yellow.",
				speaker: "CONTROL / FUEL LOW",
			});
		}
		if (this.fuel > 28) this.lowFuel = false;
		if (this.fuel <= 0) {
			this.fuel = 0;
			this.end(false, "TANK EMPTY");
		}
		const stage = this.progress < 1600 ? 0 : this.progress < 3280 ? 1 : 2;
		if (stage !== this.stage) {
			this.stage = stage;
			this.emit("stage", { index: stage });
		}
		for (const p of this.players)
			if (p._physics)
				p._physics.body.setNextKinematicTranslation({
					x: p.x,
					y: 2.8,
					z: -this.progress + p.y,
				});
		for (const e of this.entities) {
			if (e.dead || e.s < this.progress - 60 || e.s > this.progress + 220)
				continue;
			if (e.type === "heli") {
				e.x = e.baseX + Math.sin(this.time * 1.1 + e.id) * 4.5;
				const r = riverAt(e.s);
				e.x = clamp(e.x, r.center - r.width + 3, r.center + r.width - 3);
			}
			if (e.type === "boss" && this.bossStarted) {
				e.x = e.baseX + Math.sin(this.bossTime * 0.6) * 7;
			}
			e._physics?.body.setNextKinematicTranslation({ x: e.x, y: 2.8, z: -e.s });
			if (
				["boat", "gunboat", "heli", "boss"].includes(e.type) &&
				e.s > this.progress + 3 &&
				e.s < this.progress + 140
			) {
				e.timer -= dt * this.params.enemyFire;
				if (e.timer <= 0 && this.params.enemyFire > 0) {
					if (e.type === "boss") {
						const phase = Math.floor(this.bossTime / 6) % 3;
						if (phase === 0)
							for (let i = -2; i <= 2; i++)
								this.enemyShot(e, i * 8, -27, i * 1.5);
						else if (phase === 1) {
							for (const p of this.players)
								if (!p.left) {
									const d = Math.max(20, e.s - this.progress + p.y);
									this.enemyShot(e, ((p.x - e.x) / d) * 34, -34);
								}
						} else
							for (const side of [-1, 1])
								this.enemyShot(
									e,
									Math.sin(this.bossTime * 3 + side) * 15,
									-32,
									side * 3.5,
								);
						e.timer = phase === 1 ? 0.85 : 0.55;
					} else {
						const p = this.players.find((p) => !p.left) || {
							x: riverAt(this.progress).center,
							y: 12,
						};
						const d = Math.max(30, e.s - this.progress + p.y),
							vx = e.type === "gunboat" ? ((p.x - e.x) / d) * 28 : 0;
						this.enemyShot(e, vx, e.type === "heli" ? -31 : -23);
						e.timer =
							e.type === "gunboat" ? 1.2 : e.type === "heli" ? 1.6 : 2.6;
					}
				}
			}
		}
		for (const b of this.bullets) {
			b.x += b.vx * dt;
			b.s += b.vs * dt;
			b.age += dt;
			b._physics?.body.setNextKinematicTranslation({ x: b.x, y: 2.8, z: -b.s });
			if (b.age > 5 || b.s < this.progress - 65 || b.s > this.progress + 240)
				b.used = true;
		}
		this.world.timestep = dt;
		this.world.step(this.queue);
		this.queue.drainCollisionEvents((a, b, started) => {
			if (!started) return;
			let one = this.colliderMap.get(a),
				two = this.colliderMap.get(b);
			if (!one || !two) return;
			if ("enemy" in two) [one, two] = [two, one];
			if ("enemy" in one) {
				if (one.used || two.dead) return;
				if (!one.enemy && two.type) {
					one.used = true;
					this.damageEntity(two, this.params.bulletDamage, one.owner);
				} else if (one.enemy && "bursts" in two) {
					one.used = true;
					this.hitPlayer(two);
				}
			} else {
				const player = "bursts" in one ? one : "bursts" in two ? two : null,
					entity = one.type ? one : two.type ? two : null;
				if (!player || !entity || entity.dead) return;
				if (entity.type === "cache") {
					entity.dead = true;
					this.removePhysics(entity);
					player.hp = Math.min(3, player.hp + 1);
					player.bursts = Math.min(3, player.bursts + 1);
					this.score += 250;
					this.emit("cache");
				} else if (entity.type !== "fuel") this.hitPlayer(player, "COLLISION");
			}
		});
		for (let i = this.bullets.length - 1; i >= 0; i--)
			if (this.bullets[i].used) {
				this.removePhysics(this.bullets[i]);
				this.bullets.splice(i, 1);
			}
		if (this.bossDown && this.progress > LENGTH)
			this.end(true, "RIVER LIBERATED");
	}
	end(won, reason) {
		if (this.ended) return;
		this.ended = true;
		if (this.phase === "attract") {
			this.emit("attractend");
			return;
		}
		this.phase = won ? "won" : "lost";
		this.emit("end", { won, reason });
	}
	retry() {
		const checkpoint = this.checkpoint,
			score = this.checkpointScore;
		const seats = this.players.map((p) => ({ id: p.id, name: p.name }));
		this.reset(seats);
		this.progress = checkpoint;
		this.score = score;
		this.checkpoint = checkpoint;
		this.checkpointScore = score;
		for (const e of this.entities)
			if (e.s < checkpoint) {
				e.dead = true;
				this.removePhysics(e);
			}
		this.stage = checkpoint > 3280 ? 2 : checkpoint > 1600 ? 1 : 0;
		this.stats.bridges = checkpoint > 3280 ? 2 : checkpoint > 1600 ? 1 : 0;
		for (const p of this.players) p.x += safeLane(checkpoint - p.y);
	}
	jump(stage) {
		const points = [0, 1610, 3290, 4950];
		const target = points[stage] || 0;
		this.progress = target;
		this.fuel = 100;
		for (const p of this.players) {
			p.x = safeLane(target - p.y);
			p.invuln = 4;
		}
		for (const e of this.entities)
			if (e.type === "bridge" && e.s < target && !e.dead)
				this.damageEntity(e, 999);
		this.emit("radio", {
			text: [
				"Inkwood Reach. Watch your fuel.",
				"Splitwater. Pick a channel.",
				"Iron Estuary. Watch the crossfire.",
				"Tax Collector. Time to settle up.",
			][stage],
			speaker: "FLIGHT TEST / SECTOR SKIP",
		});
	}
	snapshot() {
		return {
			kind: "state",
			progress: this.progress,
			time: this.time,
			elapsed: this.elapsed,
			fuel: this.fuel,
			score: this.score,
			reserves: this.reserves,
			stage: this.stage,
			phase: this.phase,
			stats: this.stats,
			combo: this.combo,
			checkpoint: this.checkpoint,
			bossTime: this.bossTime,
			bossStarted: this.bossStarted,
			players: this.players.map(({ _physics, ...p }) => p),
			dead: this.entities.filter((e) => e.dead).map((e) => e.id),
			entities: this.entities
				.filter(
					(e) =>
						!e.dead && e.s > this.progress - 70 && e.s < this.progress + 240,
				)
				.map((e) => [e.id, e.x, e.s, e.hp, e.refueled]),
			bullets: this.bullets.map(({ _physics, used, ...b }) => b),
		};
	}
	receive(snap) {
		const oldDead = new Set(
			this.entities.filter((e) => e.dead).map((e) => e.id),
		);
		for (const key of [
			"progress",
			"time",
			"elapsed",
			"fuel",
			"score",
			"reserves",
			"stage",
			"phase",
			"stats",
			"combo",
			"checkpoint",
			"bossTime",
			"bossStarted",
		])
			this[key] = snap[key];
		this.players = snap.players;
		this.bullets = snap.bullets;
		const dead = new Set(snap.dead);
		for (const e of this.entities) {
			e.dead = dead.has(e.id);
			if (
				e.dead &&
				!oldDead.has(e.id) &&
				e.s > this.progress - 65 &&
				e.s < this.progress + 200
			)
				this.onEvent?.({ type: "destroy", x: e.x, s: e.s, kind: e.type });
		}
		for (const [id, x, s, hp, refueled] of snap.entities) {
			const e = this.entities.find((e) => e.id === id);
			if (e) Object.assign(e, { x, s, hp, refueled });
		}
	}
	inspect() {
		return {
			phase: this.phase,
			progress: this.progress,
			time: this.time,
			fuel: this.fuel,
			score: this.score,
			reserves: this.reserves,
			stage: this.stage,
			stats: { ...this.stats },
			checkpoint: this.checkpoint,
			bossStarted: this.bossStarted,
			bossHp: this.entities.find((e) => e.type === "boss")?.hp,
			players: this.players.map(({ _physics, ...p }) => p),
			bullets: this.bullets.length,
			physics: this.world ? this.world.bodies.len() : 0,
			params: this.params,
			events: this.eventHistory.map((e) => e.type),
			snapshotBytes: JSON.stringify(this.snapshot()).length,
		};
	}
}
export async function initPhysics() {
	await RAPIER.init();
}
