import RAPIER from "@dimforge/rapier3d-compat";

export const DEFAULTS = Object.freeze({
	moveSpeed: 5.2,
	beltSpeed: 0.19,
	foodSpeed: 3.0,
	spawnInterval: 2.4,
	penaltyScale: 1,
	catchRadius: 0.85,
	steamInterval: 15,
});
export const FOOD = [
	{ name: "Tomato", color: "#f15a44", short: "T", lane: -4.0 },
	{ name: "Cheese", color: "#ffc84b", short: "C", lane: -1.5 },
	{ name: "Lettuce", color: "#75b95c", short: "L", lane: 1.0 },
	{ name: "Onion", color: "#b99bd6", short: "O", lane: 3.5 },
];
export const COLORS = ["#ed654e", "#53b5ac", "#709fda", "#e8ba4e"];
export const CHUTES = [-2.8, 1.6, 6.0];
export const SHIFTS = [
	{
		name: "THE EARLY BIRD",
		subtitle: "A little sizzle. A lot of possibility.",
		goal: 4,
		types: 3,
		ingredients: 2,
		pace: 0.78,
	},
	{
		name: "LUNCH, WITH FEELING",
		subtitle: "Here come the onions. Here comes the crowd.",
		goal: 5,
		types: 4,
		ingredients: 3,
		pace: 1.05,
	},
	{
		name: "THE SUPPER SQUEEZE",
		subtitle: "All four toppings. Every bun for itself!",
		goal: 6,
		types: 4,
		ingredients: 4,
		pace: 1.3,
	},
];
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function seeded(seed = 123456) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
export class Kitchen {
	static async init() {
		await RAPIER.init();
	}
	constructor(seed = 1983, count = 1) {
		this.tuning = { ...DEFAULTS };
		this.invincible = false;
		this.autoChef = false;
		this.reset(seed, count);
	}
	reset(seed = 1983, count = 1) {
		this.world?.free();
		this.rng = seeded(seed);
		this.nextId = 1;
		this.events = [];
		this.world = new RAPIER.World({ x: 0, y: -18, z: 0 });
		this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(12, 0.15, 10).setTranslation(0, -0.2, 0),
		);
		this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(1.05, 0.7, 5.1).setTranslation(
				-5.65,
				0.7,
				-0.6,
			),
		);
		this.controller = this.world.createCharacterController(0.025);
		this.bodies = new Map();
		this.foodBodies = new Map();
		this.state = {
			mode: "brief",
			shift: 0,
			shiftServed: 0,
			totalServed: 0,
			score: 0,
			rating: 50,
			combo: 0,
			bestCombo: 0,
			time: 0,
			shiftTime: 0,
			brake: 0,
			brakeCooldown: 0,
			rush: 0,
			players: [],
			burgers: [],
			foods: [],
			steam: false,
			spawn: 0.5,
			burgerSpawn: 0,
			result: null,
			stats: {
				caught: 0,
				rejected: 0,
				served: 0,
				wrongChute: 0,
				wrongTopping: 0,
				wasted: 0,
				lost: 0,
				brakes: 0,
				dashes: 0,
				steamHits: 0,
			},
		};
		for (let i = 0; i < count; i++) this.addPlayer(i);
	}
	addPlayer(id) {
		const existing = this.state.players.find((p) => p.id === id);
		if (existing) {
			existing.disconnected = false;
			this.bodies.get(id)?.c.setEnabled(true);
			return;
		}
		const p = {
			id,
			x: 0.3 + id * 1.1,
			z: 0.5,
			held: null,
			dash: 0,
			cooldown: 0,
			stunned: 0,
			face: 0,
			moving: false,
			actionLock: false,
			reject: false,
			points: 0,
			disconnected: false,
		};
		this.state.players.push(p);
		const b = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
				p.x,
				0.9,
				p.z,
			),
		);
		const c = this.world.createCollider(
			RAPIER.ColliderDesc.capsule(0.3, 0.34),
			b,
		);
		this.bodies.set(id, { b, c });
	}
	removePlayer(id) {
		const p = this.state.players.find((p) => p.id === id);
		if (p) {
			p.disconnected = true;
			p.held = null;
			p.moving = false;
		}
		this.bodies.get(id)?.c.setEnabled(false);
	}
	emit(type, data = {}) {
		this.events.push({
			...data,
			foodType: typeof data.type === "number" ? data.type : undefined,
			type,
		});
	}
	drainEvents() {
		return this.events.splice(0);
	}
	beginShift() {
		const s = this.state;
		s.mode = "playing";
		s.shiftTime = 0;
		s.shiftServed = 0;
		s.brake = 0;
		s.rush = 0;
		s.burgerSpawn = 0;
		s.spawn = 0.4;
		this.emit("shift", { shift: s.shift });
		this.spawnBurger();
	}
	nextShift() {
		if (this.state.shift >= 2) return;
		this.state.shift++;
		this.state.rating = Math.min(99, this.state.rating + 16);
		this.state.combo = 0;
		this.beginShift();
	}
	spawnBurger() {
		const s = this.state,
			cfg = SHIFTS[s.shift];
		if (
			s.burgers.length >= 3 ||
			s.shiftServed +
				s.burgers.length +
				s.players.filter((p) => p.held?.kind === "burger").length >=
				cfg.goal
		)
			return;
		const used = s.burgers
			.map((b) => b.chute)
			.concat(
				s.players
					.filter((p) => p.held?.kind === "burger")
					.map((p) => p.held.burger.chute),
			);
		const chute = [0, 1, 2].find((i) => !used.includes(i));
		if (chute === undefined) return;
		const types = Array.from({ length: cfg.types }, (_, i) => i).sort(
			() => this.rng() - 0.5,
		);
		const length =
			s.totalServed === 0 ? 1 : 1 + Math.floor(this.rng() * cfg.ingredients);
		const b = {
			id: this.nextId++,
			x: -5.65,
			z: -4.8,
			chute,
			recipe: types.slice(0, length).sort(),
			toppings: [],
			ready: false,
			age: 0,
		};
		s.burgers.push(b);
		this.emit("order", { id: b.id });
	}
	spawnFood(type) {
		const s = this.state;
		if (type === undefined) {
			const needed = s.burgers.flatMap((b) =>
				b.recipe.filter((t) => !b.toppings.includes(t)),
			);
			const carried = s.players
				.filter((p) => p.held?.kind === "topping")
				.map((p) => p.held.type);
			const useful = needed.filter((t) => !carried.includes(t));
			type =
				useful.length && this.rng() < 0.78
					? useful[Math.floor(this.rng() * useful.length)]
					: Math.floor(this.rng() * SHIFTS[s.shift].types);
		}
		const f = {
			id: this.nextId++,
			type,
			x: 7.3,
			z: FOOD[type].lane,
			returning: false,
			age: 0,
		};
		const body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicVelocityBased().setTranslation(
				f.x,
				1.2,
				f.z,
			),
		);
		this.world.createCollider(
			RAPIER.ColliderDesc.ball(0.28).setSensor(true),
			body,
		);
		this.foodBodies.set(f.id, body);
		s.foods.push(f);
		this.emit("launch", { type });
		return f;
	}
	removeFood(f) {
		const b = this.foodBodies.get(f.id);
		if (b) this.world.removeRigidBody(b);
		this.foodBodies.delete(f.id);
		this.state.foods = this.state.foods.filter((x) => x.id !== f.id);
	}
	penalty(amount, reason, pos) {
		const s = this.state;
		if (!this.invincible)
			s.rating = Math.max(0, s.rating - amount * this.tuning.penaltyScale);
		if (amount >= 3) s.combo = 0;
		this.emit("mistake", { message: reason, amount, ...pos });
		if (s.rating <= 0) this.finish(false);
	}
	finish(won) {
		if (this.state.mode === "won" || this.state.mode === "lost") return;
		this.state.mode = won ? "won" : "lost";
		this.state.result = won;
		this.emit(won ? "won" : "lost");
	}
	useBrake() {
		const s = this.state;
		if (s.brakeCooldown > 0 || s.mode !== "playing") return false;
		s.brake = 5;
		s.brakeCooldown = 18;
		s.stats.brakes++;
		this.emit("brake");
		return true;
	}
	interact(p) {
		const s = this.state;
		if (p.stunned > 0) return;
		if (p.held?.kind === "burger") {
			const chute = CHUTES.findIndex(
				(x) => Math.hypot(p.x - x, p.z - 5.7) < 1.55,
			);
			if (chute < 0) return;
			const b = p.held.burger;
			if (b.chute !== chute) {
				s.stats.wrongChute++;
				this.penalty(5, "Wrong window! Match the number.", p);
				return;
			}
			p.held = null;
			s.totalServed++;
			s.shiftServed++;
			s.stats.served++;
			s.combo++;
			s.bestCombo = Math.max(s.bestCombo, s.combo);
			const value = 100 + b.recipe.length * 25 + Math.min(5, s.combo) * 25;
			s.score += value;
			p.points += value;
			s.rating = Math.min(99, s.rating + 3);
			this.emit("served", { chute, value, x: p.x, z: p.z, combo: s.combo });
			if (s.combo % 3 === 0) {
				s.rush = 12;
				this.emit("rush");
			}
			if (s.shiftServed >= SHIFTS[s.shift].goal) {
				s.score += Math.round(s.rating * 10);
				s.mode = s.shift === 2 ? "won" : "intermission";
				for (const f of [...s.foods]) this.removeFood(f);
				this.emit(s.shift === 2 ? "won" : "intermission");
				if (s.shift === 2) s.result = true;
			}
			return;
		}
		const b = s.burgers
			.filter((b) => Math.hypot(p.x - -3.9, p.z - b.z) < 1.55)
			.sort((a, b) => Math.abs(p.z - a.z) - Math.abs(p.z - b.z))[0];
		if (!b) return;
		if (p.held?.kind === "topping") {
			const type = p.held.type;
			p.held = null;
			if (b.toppings.includes(type) || !b.recipe.includes(type)) {
				s.stats.wrongTopping++;
				this.penalty(2, "That topping is not on this ticket.", p);
				return;
			}
			b.toppings.push(type);
			s.score += 10;
			b.ready = b.recipe.every((t) => b.toppings.includes(t));
			this.emit("topping", { ...p, type, ready: b.ready });
			if (b.ready) this.emit("bun", { x: b.x, z: b.z });
		} else if (b.ready) {
			p.held = { kind: "burger", burger: { ...b } };
			s.burgers = s.burgers.filter((x) => x.id !== b.id);
			this.emit("pickup", { ...p });
		}
	}
	reject(p) {
		if (p.held?.kind === "topping") {
			this.emit("reject", {
				x: p.x,
				z: p.z,
				type: p.held.type,
				fromHand: true,
			});
			p.held = null;
			this.state.stats.rejected++;
		}
	}
	tick(dt, inputs = {}) {
		const s = this.state;
		if (s.mode !== "playing") return;
		dt = Math.min(dt, 1 / 30);
		s.time += dt;
		s.shiftTime += dt;
		for (const k of ["brake", "brakeCooldown", "rush"])
			s[k] = Math.max(0, s[k] - dt);
		s.steam =
			s.shift > 0 &&
			s.shiftTime % this.tuning.steamInterval > this.tuning.steamInterval - 3;
		for (const p of s.players) {
			if (p.disconnected) continue;
			const input = inputs[p.id] || {},
				body = this.bodies.get(p.id);
			p.cooldown = Math.max(0, p.cooldown - dt);
			p.stunned = Math.max(0, p.stunned - dt);
			p.dash = Math.max(0, p.dash - dt);
			if (input.brake) this.useBrake();
			if (input.dash && p.cooldown === 0 && p.stunned === 0) {
				p.dash = 0.2;
				p.cooldown = 2;
				s.stats.dashes++;
				this.emit("dash", { ...p });
			}
			let x = input.x || 0,
				z = input.z || 0;
			const len = Math.hypot(x, z);
			if (len > 1) {
				x /= len;
				z /= len;
			}
			p.moving = Math.hypot(x, z) > 0.1 && p.stunned === 0;
			if (p.moving) p.face = Math.atan2(x, z);
			const speed =
				this.tuning.moveSpeed *
				(p.dash > 0 ? 2.4 : 1) *
				(p.stunned > 0 ? 0.1 : 1) *
				(p.held?.kind === "burger" ? 0.88 : 1);
			this.controller.computeColliderMovement(body.c, {
				x: x * speed * dt,
				y: 0,
				z: z * speed * dt,
			});
			const m = this.controller.computedMovement();
			p.x = clamp(p.x + m.x, -3.65, 7.65);
			p.z = clamp(p.z + m.z, -5.55, 5.8);
			body.b.setNextKinematicTranslation({ x: p.x, y: 0.9, z: p.z });
			if (input.action && (!p.actionLock || input.actionPress))
				this.interact(p);
			input.actionPress = false;
			p.actionLock = !!input.action;
			p.reject = !!input.reject;
			if (input.reject) this.reject(p);
			if (s.steam && Math.hypot(p.x - 1.2, p.z + 0.2) < 1.1 && p.stunned <= 0) {
				p.stunned = 0.85;
				s.stats.steamHits++;
				this.penalty(2, "Hot feet! Watch the steam grate.", p);
			}
		}
		const pace = SHIFTS[s.shift].pace * (s.rush > 0 ? 1.18 : 1);
		for (const b of [...s.burgers]) {
			b.age += dt;
			if (s.brake <= 0) b.z += dt * this.tuning.beltSpeed * pace;
			if (b.z > 4.4) {
				s.burgers = s.burgers.filter((x) => x.id !== b.id);
				s.stats.lost++;
				this.penalty(10, "Burger overboard! Ten points down.", b);
				this.emit("spill", { ...b });
			}
		}
		s.burgerSpawn -= dt;
		if (s.burgerSpawn <= 0 && s.burgers.every((b) => b.z > -2.3)) {
			this.spawnBurger();
			s.burgerSpawn = 1;
		}
		s.spawn -= dt;
		if (s.spawn <= 0 && s.burgers.length) {
			this.spawnFood();
			s.spawn = this.tuning.spawnInterval / pace;
		}
		for (const f of s.foods)
			this.foodBodies.get(f.id)?.setLinvel(
				{
					x: (f.returning ? 1.8 : -1) * this.tuning.foodSpeed * pace,
					y: 0,
					z: 0,
				},
				true,
			);
		this.world.timestep = dt;
		this.world.step();
		for (const f of [...s.foods]) {
			const body = this.foodBodies.get(f.id);
			if (!body) continue;
			const t = body.translation();
			f.x = t.x;
			f.z = t.z;
			f.age += dt;
			if (f.returning) {
				if (f.x > 7.7) this.removeFood(f);
				continue;
			}
			const p = s.players.find(
				(p) =>
					!p.disconnected &&
					p.stunned <= 0 &&
					Math.hypot(p.x - f.x, p.z - f.z) < this.tuning.catchRadius,
			);
			if (p?.reject) {
				f.returning = true;
				s.stats.rejected++;
				this.emit("reject", { ...f });
			} else if (p && !p.held) {
				p.held = { kind: "topping", type: f.type };
				s.score += 5;
				s.stats.caught++;
				this.removeFood(f);
				this.emit("catch", { ...p, type: f.type });
			} else if (f.x < -4.5) {
				s.stats.wasted++;
				this.penalty(1, "A little less on the floor, chef!", f);
				this.emit("spill", { ...f });
				this.removeFood(f);
			}
		}
	}
	snapshot() {
		return JSON.parse(JSON.stringify(this.state));
	}
	bot(id, cheat = false) {
		const s = this.state,
			p = s.players.find((p) => p.id === id);
		if (!p || s.mode !== "playing") return {};
		let target,
			action = false;
		if (p.held?.kind === "burger") {
			target = { x: CHUTES[p.held.burger.chute], z: 5.5 };
			action = dist(p, target) < 0.8;
		} else if (p.held?.kind === "topping") {
			const b = s.burgers.find(
				(b) =>
					b.recipe.includes(p.held.type) && !b.toppings.includes(p.held.type),
			);
			if (b) {
				target = { x: -3.55, z: b.z };
				action = dist(p, target) < 0.65;
			} else return { reject: true };
		} else {
			const ready = s.burgers.find((b) => b.ready);
			if (ready) {
				target = { x: -3.55, z: ready.z };
				action = dist(p, target) < 0.65;
			} else {
				const needed = s.burgers.flatMap((b) =>
					b.recipe.filter((t) => !b.toppings.includes(t)),
				);
				const foods = s.foods
					.filter(
						(f) => !f.returning && needed.includes(f.type) && f.x > p.x - 1.2,
					)
					.sort((a, b) => a.x - b.x);
				const f = foods[0];
				target = f
					? { x: clamp(f.x - 0.4, 0, 5.6), z: f.z }
					: { x: 3.1, z: needed.length ? FOOD[needed[0]].lane : -2 };
				if (cheat && !f && needed.length && s.spawn > 0.6) s.spawn = 0;
			}
		}
		if (!target) return {};
		return {
			x: clamp((target.x - p.x) * 3, -1, 1),
			z: clamp((target.z - p.z) * 3, -1, 1),
			action: action && !p.actionLock,
			brake: s.burgers.some((b) => b.z > 2.8) && s.brakeCooldown === 0,
			dash: dist(p, target) > 4 && p.cooldown === 0,
		};
	}
}
