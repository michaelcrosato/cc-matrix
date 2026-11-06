import RAPIER from "@dimforge/rapier3d-compat";
import {
	bitCount,
	DEFAULTS,
	DOORS,
	ENEMY_ROOMS,
	INITIAL_LOCKS,
	ITEM_START,
	lockId,
	OPPOSITE,
	propSize,
	propsFor,
	ROOMS,
	rng,
} from "./data.js";
export const readyPhysics = RAPIER.init();
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export class Mansion {
	constructor(emit = () => {}) {
		this.emit = emit;
		this.tuning = { ...DEFAULTS };
		this.cheats = {
			invincible: false,
			noclip: false,
			reveal: false,
			pilot: false,
			freeze: false,
		};
		this.difficulty = "midnight";
		this.started = false;
		this.reset();
	}
	reset() {
		this.room = 0;
		this.x = 0;
		this.z = 2.6;
		this.facing = 0;
		this.match = 0;
		this.matches = 0;
		this.lives = 9;
		this.time = 0;
		this.carried = null;
		this.items = structuredClone(ITEM_START);
		this.locks = new Set(INITIAL_LOCKS);
		this.visited = new Set([0]);
		this.seen = new Set();
		this.scared = 0;
		this.transition = 0;
		this.cooldown = 0;
		this.windAt = 19;
		this.result = null;
		this.finalChase = false;
		this.haunted = false;
		this.threat = 0;
		this.lastSteps = 0;
		this.moving = false;
		this.sprinting = false;
		this.enemyCounter = 0;
		this.stats = {
			unlocks: 0,
			stairs: 0,
			pickups: 0,
			merges: 0,
			scares: 0,
			batThefts: 0,
			repels: 0,
			rooms: 1,
			wind: 0,
		};
		this.started = true;
		this.makePhysics();
		this.spawnEnemies();
	}
	makePhysics() {
		if (this.world) this.world.free();
		this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		this.world.timestep = 1 / 60;
		this.wallColliders = [];
		this.doorColliders = new Map();
		const box = (x, z, hx, hz) => {
			const c = this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(hx, 1.5, hz).setTranslation(x, 1, z),
			);
			this.wallColliders.push(c);
			return c;
		};
		const r = ROOMS[this.room];
		for (const dir of ["west", "east", "north", "south"]) {
			const d = DOORS[dir],
				has =
					r.neighbors[dir] !== undefined ||
					(this.room === 0 && dir === "south");
			if (dir === "west" || dir === "east") {
				if (has) {
					box(d.x, -3, 0.22, 1.85);
					box(d.x, 3, 0.22, 1.85);
				} else box(d.x, 0, 0.22, 5.1);
			} else {
				if (has) {
					box(-4, d.z, 2.85, 0.22);
					box(4, d.z, 2.85, 0.22);
				} else box(0, d.z, 7.1, 0.22);
			}
			if (
				r.neighbors[dir] !== undefined &&
				this.locks.has(lockId(this.room, r.neighbors[dir]))
			) {
				const c =
					dir === "west" || dir === "east"
						? box(d.x, d.z, 0.24, 1.13)
						: box(d.x, d.z, 1.13, 0.24);
				this.doorColliders.set(dir, c);
			}
		}
		for (const p of propsFor(r)) {
			const [hx, hz] = propSize(p);
			box(p.x, p.z, hx, hz);
		}
		this.body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
				this.x,
				0.55,
				this.z,
			),
		);
		this.collider = this.world.createCollider(
			RAPIER.ColliderDesc.capsule(0.22, 0.25),
			this.body,
		);
		this.controller = this.world.createCharacterController(0.025);
		this.world.step();
	}
	spawnEnemies() {
		const random = rng(831 + this.room * 117);
		this.enemies = (ENEMY_ROOMS[this.room] || []).map((type, i) => ({
			id: i,
			type,
			x: (i % 2 ? -1 : 1) * (4 + random()),
			z: -2.2 + random() * 3,
			phase: random() * 6,
			mode: "prowl",
			timer: 1.5 + i * 0.8,
			tx: 0,
			tz: 0,
			windCooldown: 0,
		}));
		if (
			this.haunted &&
			(ROOMS[this.room].floor > 0 || this.finalChase) &&
			!this.enemies.some((e) => e.type === "ghost")
		)
			this.enemies.push({
				id: this.enemies.length,
				type: "ghost",
				x: this.x > 0 ? -5.7 : 5.7,
				z: -3.4,
				phase: 0,
				mode: "dormant",
				timer: this.finalChase ? 1.6 : 2.8,
				tx: 0,
				tz: 0,
				windCooldown: 0,
			});
	}
	enter(room, from = null) {
		if (room < 0 || room >= 24) return false;
		const previous = this.room;
		this.room = room;
		const p = from && DOORS[from];
		this.x = p ? p.x * 0.86 : 0;
		this.z = p ? p.z * 0.76 : 2.4;
		this.visited.add(room);
		this.stats.rooms = this.visited.size;
		this.transition = 0.7;
		this.cooldown = 0.8;
		this.makePhysics();
		this.spawnEnemies();
		this.emit("room", { room, previous });
		return true;
	}
	strike() {
		if (this.result || this.cooldown > 0.8) return false;
		this.matches++;
		this.match = this.tuning.matchDuration;
		this.emit("match", {});
		return true;
	}
	drop() {
		if (!this.carried) return false;
		const item = this.carried;
		item.room = this.room;
		item.x = this.x;
		item.z = Math.min(3.8, this.z + 0.8);
		this.items.push(item);
		this.carried = null;
		this.cooldown = 0.25;
		this.emit("drop", { item });
		return true;
	}
	unlock(dir) {
		const next = ROOMS[this.room].neighbors[dir],
			id = lockId(this.room, next);
		if (!this.locks.has(id)) return true;
		if (this.carried?.type !== "key") {
			this.emit("locked", {});
			return false;
		}
		this.locks.delete(id);
		const c = this.doorColliders.get(dir);
		if (c) {
			this.world.removeCollider(c, true);
			this.doorColliders.delete(dir);
		}
		this.stats.unlocks++;
		this.emit("unlock", { dir });
		return true;
	}
	context() {
		const r = ROOMS[this.room];
		let closest = null,
			best = 1.8;
		for (const item of this.items) {
			if (item.room !== this.room || !(this.match > 0 || this.cheats.reveal))
				continue;
			const d = dist(this, item);
			if (d < best) {
				closest = {
					kind: "item",
					item,
					label:
						this.carried?.type === "urn" && item.type === "urn"
							? "Join urn pieces"
							: this.carried
								? "Swap for " +
									(item.type === "key"
										? "master key"
										: item.type === "scepter"
											? "moon scepter"
											: "urn piece")
								: "Take " +
									(item.type === "key"
										? "master key"
										: item.type === "scepter"
											? "moon scepter"
											: "urn piece"),
				};
				best = d;
			}
		}
		for (const dir in r.neighbors) {
			const d = dist(this, DOORS[dir]);
			if (
				d < 1.7 &&
				this.locks.has(lockId(this.room, r.neighbors[dir])) &&
				d < best
			) {
				closest = {
					kind: "door",
					dir,
					label:
						this.carried?.type === "key"
							? "Unlock door"
							: "The master key is needed",
				};
				best = d;
			}
		}
		for (const way of ["up", "down"])
			if (r[way] && dist(this, r[way]) < 1.9 && dist(this, r[way]) < best) {
				closest = {
					kind: "stair",
					way,
					label: way === "up" ? "Climb upstairs" : "Go downstairs",
				};
				if (this.locks.has(`${this.room}-up`))
					closest.label =
						this.carried?.type === "key"
							? "Unlock the stair"
							: "A key for the upper stair";
				best = dist(this, r[way]);
			}
		if (
			this.room === 0 &&
			this.z > 3 &&
			Math.abs(this.x) < 1.7 &&
			this.carried?.parts === 7
		)
			closest = { kind: "exit", label: "Leave with the urn" };
		return closest;
	}
	interact() {
		if (this.cooldown > 0 || this.result) return false;
		const c = this.context();
		if (!c) return false;
		if (c.kind === "item") {
			const item = c.item;
			if (this.carried?.type === "urn" && item.type === "urn") {
				this.carried.parts |= item.parts;
				this.items.splice(this.items.indexOf(item), 1);
				this.stats.merges++;
				this.emit("join", { parts: this.carried.parts });
				if (this.carried.parts === 7) {
					this.finalChase = true;
					this.emit("final", {});
				}
			} else {
				const previous = this.carried;
				this.items.splice(this.items.indexOf(item), 1);
				if (previous) {
					previous.room = this.room;
					previous.x = this.x;
					previous.z = this.z + 0.85;
					this.items.push(previous);
				}
				this.carried = item;
				this.stats.pickups++;
				this.emit("pickup", { item });
				if (item.type === "urn" && !this.haunted) {
					this.haunted = true;
					this.emit("haunted", {});
				}
			}
			this.cooldown = 0.5;
			return true;
		}
		if (c.kind === "door") return this.unlock(c.dir);
		if (c.kind === "stair") {
			const r = ROOMS[this.room],
				lock = `${this.room}-up`;
			if (c.way === "up" && this.locks.has(lock)) {
				if (this.carried?.type !== "key") {
					this.emit("locked", {});
					return false;
				}
				this.locks.delete(lock);
				this.stats.unlocks++;
				this.emit("unlock", {});
			}
			this.stats.stairs++;
			this.emit(c.way, {});
			const target = r[c.way].room;
			this.enter(target);
			return true;
		}
		if (c.kind === "exit") {
			this.win();
			return true;
		}
		return false;
	}
	win() {
		if (this.carried?.parts !== 7 || this.room !== 0) return false;
		this.result = "win";
		this.emit("win", { score: this.score() });
		return true;
	}
	score() {
		const parts = this.items
			.filter((i) => i.type === "urn")
			.reduce((n, i) => n | i.parts, 0);
		void parts;
		return this.result === "win"
			? Math.max(
					100,
					10000 +
						this.lives * 500 -
						this.matches * 25 -
						Math.floor(this.time * 3),
				)
			: bitCount(this.carried?.parts || 0) * 2200 +
					this.visited.size * 70 +
					this.stats.unlocks * 120 +
					this.lives * 20;
	}
	scare(enemy) {
		if (this.scared > 0 || this.cheats.invincible || this.result) return false;
		if (
			this.carried?.type === "scepter" &&
			(enemy.type !== "ghost" || this.difficulty !== "nightmare")
		) {
			enemy.timer = 2;
			enemy.mode = "repelled";
			this.stats.repels++;
			this.emit("repel", { type: enemy.type });
			return false;
		}
		this.lives--;
		this.stats.scares++;
		this.scared = 3;
		this.match = 0;
		this.emit("scare", { type: enemy.type });
		if (enemy.type === "bat" && this.carried) {
			const item = this.carried;
			item.room = this.room;
			item.x = this.x < 0 ? 4 : -4;
			item.z = 2.7;
			this.items.push(item);
			this.carried = null;
			this.stats.batThefts++;
			this.emit("theft", {});
		}
		if (this.lives <= 0) {
			this.result = "lose";
			this.emit("lose", {});
		}
		return true;
	}
	step(dt, input = {}) {
		if (this.result) return;
		dt = Math.min(0.05, dt) * this.tuning.timeScale;
		this.time += dt;
		this.cooldown = Math.max(0, this.cooldown - dt);
		this.scared = Math.max(0, this.scared - dt);
		this.transition = Math.max(0, this.transition - dt);
		this.match = Math.max(0, this.match - dt);
		if (input.match) this.strike();
		if (input.interact) this.interact();
		if (input.drop) this.drop();
		let dx = input.x || 0,
			dz = input.z || 0;
		const length = Math.hypot(dx, dz);
		if (length > 1) {
			dx /= length;
			dz /= length;
		}
		this.moving = length > 0.08;
		this.sprinting = !!input.sprint && this.moving;
		const speed =
			this.tuning.speed *
			(this.sprinting ? 1.5 : 1) *
			(this.difficulty === "candlelit" ? 1.05 : 1);
		if (this.moving) this.facing = Math.atan2(dx, dz);
		if (this.cheats.noclip) {
			this.x += dx * speed * dt;
			this.z += dz * speed * dt;
		} else {
			this.controller.computeColliderMovement(this.collider, {
				x: dx * speed * dt,
				y: 0,
				z: dz * speed * dt,
			});
			const m = this.controller.computedMovement();
			this.x += m.x;
			this.z += m.z;
		}
		this.body.setNextKinematicTranslation({ x: this.x, y: 0.55, z: this.z });
		this.world.timestep = Math.max(0.001, dt);
		this.world.step();
		if (
			this.moving &&
			this.time - this.lastSteps > (this.sprinting ? 0.26 : 0.4)
		) {
			this.emit("step", {});
			this.lastSteps = this.time;
		}
		const r = ROOMS[this.room];
		for (const dir in r.neighbors) {
			const p = DOORS[dir];
			if (
				this.carried?.type === "key" &&
				dist(this, p) < 1.4 &&
				this.locks.has(lockId(this.room, r.neighbors[dir]))
			)
				this.unlock(dir);
			const cross =
				dir === "west"
					? this.x < -6.65
					: dir === "east"
						? this.x > 6.65
						: dir === "north"
							? this.z < -4.65
							: this.z > 4.65;
			if (
				cross &&
				this.cooldown <= 0 &&
				!this.locks.has(lockId(this.room, r.neighbors[dir]))
			) {
				this.emit("door", {});
				this.enter(r.neighbors[dir], OPPOSITE[dir]);
				return;
			}
		}
		this.x = Math.max(-7.3, Math.min(7.3, this.x));
		this.z = Math.max(-5.3, Math.min(5.3, this.z));
		if (this.room === 0 && this.z > 4.6 && Math.abs(this.x) < 1.15) {
			if (this.carried?.parts === 7) this.win();
			else this.z = 4.5;
		}
		if (this.match > 0 || this.cheats.reveal)
			for (const i of this.items)
				if (i.room === this.room && dist(this, i) < this.tuning.lightRadius + 1)
					this.seen.add(i.id);
		if (this.time > this.windAt) {
			this.windAt = this.time + 22 + (this.room % 7);
			if (this.match > 0) {
				this.match = 0;
				this.stats.wind++;
				this.emit("wind", {});
			}
		}
		this.threat = 0;
		if (this.cheats.freeze) return;
		for (const e of this.enemies) {
			e.timer -= dt;
			e.phase += dt;
			e.windCooldown -= dt;
			if (e.mode === "dormant") {
				if (e.timer > 0) continue;
				e.mode = "warning";
				e.timer = 1.1;
				this.emit("ghost", {});
			}
			const d = dist(this, e);
			this.threat = Math.max(this.threat, Math.max(0, 1 - d / 7));
			const protectedNow =
				this.carried?.type === "scepter" &&
				(e.type !== "ghost" || this.difficulty !== "nightmare");
			let vx = 0,
				vz = 0,
				es =
					(e.type === "bat" ? 2.7 : e.type === "ghost" ? 1.9 : 1.25) *
					this.tuning.enemySpeed *
					(this.difficulty === "candlelit"
						? 0.65
						: this.difficulty === "nightmare"
							? 1.3
							: 1) *
					(this.finalChase ? 1.18 : 1);
			if (protectedNow && d < 5) {
				if (e.mode !== "repelled") {
					this.stats.repels++;
					this.emit("repel", { type: e.type });
				}
				e.mode = "repelled";
				vx = (e.x - this.x) / Math.max(0.1, d);
				vz = (e.z - this.z) / Math.max(0.1, d);
			} else if (e.mode === "warning") {
				if (e.timer <= 0) {
					e.mode = "rush";
					e.timer = e.type === "bat" ? 0.9 : 1.6;
				}
			} else if (e.mode === "rush") {
				const target = e.type === "bat" ? { x: e.tx, z: e.tz } : this;
				const dd = dist(e, target);
				vx = (target.x - e.x) / Math.max(0.1, dd);
				vz = (target.z - e.z) / Math.max(0.1, dd);
				es *= e.type === "bat" ? 2.25 : 1.25;
				if (e.timer <= 0 || dd < 0.25) {
					e.mode = "prowl";
					e.timer = 1.5;
				}
			} else if (
				(d < (this.sprinting ? 6.5 : 4.3) || this.finalChase) &&
				e.timer <= 0
			) {
				e.mode = "warning";
				e.timer = e.type === "bat" ? 0.75 : 1.1;
				e.tx = this.x;
				e.tz = this.z;
				this.emit(e.type, {});
				if (this.match > 0 && d < 3 && e.windCooldown <= 0) {
					this.match = 0;
					e.windCooldown = 8;
					this.emit("wind", {});
				}
			} else {
				e.mode = "prowl";
				vx = Math.cos(e.phase * 0.6 + e.id);
				vz = Math.sin(e.phase * 0.45);
				es *= 0.35;
			}
			e.x = Math.max(-6, Math.min(6, e.x + vx * es * dt));
			e.z = Math.max(-3.9, Math.min(3.9, e.z + vz * es * dt));
			if (d < 0.72) this.scare(e);
		}
	}
	snapshot() {
		return {
			room: this.room,
			floor: ROOMS[this.room].floor,
			x: this.x,
			z: this.z,
			match: this.match,
			matches: this.matches,
			lives: this.lives,
			time: this.time,
			carried: this.carried ? { ...this.carried } : null,
			items: structuredClone(this.items),
			locks: [...this.locks],
			visited: [...this.visited],
			seen: [...this.seen],
			enemies: structuredClone(this.enemies),
			result: this.result,
			stats: { ...this.stats },
			score: this.score(),
			tuning: { ...this.tuning },
			cheats: { ...this.cheats },
		};
	}
}
