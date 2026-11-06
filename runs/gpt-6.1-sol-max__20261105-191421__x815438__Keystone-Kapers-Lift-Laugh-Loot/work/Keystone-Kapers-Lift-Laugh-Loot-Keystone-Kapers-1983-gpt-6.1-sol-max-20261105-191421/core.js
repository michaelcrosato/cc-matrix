import RAPIER from "@dimforge/rapier3d-compat";

export const FLOOR = 6;
export const EDGE = 26;
export const DEFAULTS = Object.freeze({
	speed: 8.4,
	jump: 11.4,
	crookSpeed: 1,
	hazardRate: 1,
	hitPenalty: 9,
	liftSpeed: 3.2,
	timeScale: 1,
	invincible: false,
	infiniteTime: false,
	colliders: false,
	overview: false,
});
export const CASES = [
	{
		name: "THE GREAT BARGAIN BOLT",
		department: "Haberdashery havoc",
		note: "Bertie Baggs has sticky fingers. Give him the slip!",
		floor: 1,
		x: 17,
		speed: 3.25,
		time: 95,
		kinds: ["cart", "radio"],
		color: "#e5a44e",
	},
	{
		name: "TOY DEPARTMENT TROUBLE",
		department: "Some assembly required",
		note: "Those toys have a mind of their own. Mind your hat!",
		floor: 2,
		x: -20,
		speed: 3.5,
		time: 90,
		kinds: ["ball", "plane", "cart"],
		color: "#79b6ad",
	},
	{
		name: "THE CLOSING-TIME CAPER",
		department: "Everything must go!",
		note: "Last call! Bag that bandit before the rooftop getaway.",
		floor: 1,
		x: 15,
		speed: 4.35,
		time: 85,
		kinds: ["plane", "cart", "ball", "radio"],
		color: "#e68769",
	},
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cleanInput = (i) => ({
	axis: clamp(Number(i?.axis) || 0, -1, 1),
	duck: !!i?.duck,
	up: !!i?.up,
	down: !!i?.down,
	jump: !!i?.jump,
	whistle: !!i?.whistle,
});
export function seeded(seed) {
	let v = seed >>> 0;
	return () => {
		v += 0x6d2b79f5;
		let t = v;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export class Shift {
	static async init() {
		await RAPIER.init();
	}
	constructor(emit = () => {}) {
		this.emit = emit;
		this.tune = { ...DEFAULTS };
		this.world = null;
		this.players = [];
		this.hazards = [];
		this.loot = [];
		this.events = [];
		this.state = "title";
		this.caseIndex = 0;
		this.score = 0;
		this.badges = 3;
		this.clock = 95;
		this.time = 0;
		this.totalTime = 0;
		this.recovered = 0;
		this.captures = 0;
		this.combos = 0;
		this.attract = false;
		this.seed = 1983;
		this.serial = 0;
		this.metrics = {
			jumps: 0,
			ducks: 0,
			lifts: 0,
			escalators: 0,
			hits: 0,
			whistles: 0,
			pickups: 0,
			captures: 0,
			spawns: { cart: 0, ball: 0, plane: 0, radio: 0 },
		};
	}
	announce(type, data = {}) {
		const e = { type, ...data, id: ++this.serial };
		this.events.push(e);
		if (this.events.length > 16) this.events.shift();
		this.emit(e);
	}
	start(count = 1, attract = false, seed = 1983) {
		this.attract = attract;
		this.seed = seed;
		this.count = count;
		this.caseIndex = 0;
		this.score = 0;
		this.badges = 3;
		this.totalTime = 0;
		this.recovered = 0;
		this.captures = 0;
		this.caseScores = [];
		this.metrics = {
			jumps: 0,
			ducks: 0,
			lifts: 0,
			escalators: 0,
			hits: 0,
			whistles: 0,
			pickups: 0,
			captures: 0,
			spawns: { cart: 0, ball: 0, plane: 0, radio: 0 },
		};
		this.buildCase();
	}
	buildCase() {
		if (this.world) this.world.free();
		this.world = new RAPIER.World({ x: 0, y: -28, z: 0 });
		this.world.timestep = 1 / 60;
		this.rng = seeded(this.seed + this.caseIndex * 1327);
		this.players = [];
		this.hazards = [];
		this.loot = [];
		this.events = [];
		this.time = 0;
		this.clock = CASES[this.caseIndex].time;
		this.caseStartScore = this.score;
		this.caseStartRecovered = this.recovered;
		this.spawnTimer = 1.4;
		this.nextHazard = 0;
		this.lootSerial = 0;
		this.hazardSerial = 0;
		this.state = "playing";
		this.intro = 2.1;
		this.resultTimer = 0;
		this.lift = {
			floor: 0,
			next: 1,
			dir: 1,
			y: 0,
			phase: "dwell",
			t: 0,
			open: 1,
		};
		for (let floor = 0; floor < 4; floor++) {
			this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(27.3, 0.22, 2.4)
					.setTranslation(0, floor * FLOOR - 0.22, 0)
					.setFriction(0)
					.setCollisionGroups(0x0001000a),
			);
		}
		for (let i = 0; i < this.count; i++) this.addPlayer(i);
		const c = CASES[this.caseIndex];
		this.crook = {
			x: c.x,
			y: c.floor * FLOOR,
			floor: c.floor,
			dir: c.floor % 2 ? -1 : 1,
			ride: null,
			stun: 0,
			rummage: 0,
			rummageClock: 4.8,
			escape: 0,
			pose: "run",
		};
		for (let floor = 0; floor < 4; floor++) {
			for (const x of [-15, -6, 7, 16])
				this.makeLoot(x, floor, this.loot.length % 3 === 0 ? "case" : "bag");
		}
		// A clearly visible first obstacle teaches the running jump without a wall of instructions.
		this.spawnHazard("cart", 0, -9, -1);
		if (this.caseIndex > 0) this.spawnHazard("plane", 2, 20, -1);
		if (this.caseIndex === 2) this.spawnHazard("radio", 1, -9, 0);
		this.world.step();
		this.announce("case", { caseIndex: this.caseIndex });
	}
	addPlayer(id) {
		const x = -23 + this.players.length * 1.4;
		const body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(x, 0.82, 0)
				.lockRotations()
				.enabledTranslations(true, true, false)
				.setLinearDamping(0),
		);
		const col = this.world.createCollider(
			RAPIER.ColliderDesc.capsule(0.5, 0.3)
				.setFriction(0)
				.setRestitution(0)
				.setCollisionGroups(0x00020015),
			body,
		);
		const p = {
			id,
			x,
			y: 0,
			floor: 0,
			dir: 1,
			grounded: true,
			duck: false,
			pose: "idle",
			body,
			col,
			ride: null,
			invuln: 1.8,
			stun: 0,
			whistle: 0,
			score: 0,
			input: cleanInput(null),
			remote: false,
			prevDuck: false,
			coyote: 0.1,
			jumpBuffer: 0,
			rideCooldown: 0,
		};
		this.players.push(p);
		return p;
	}
	makeLoot(x, floor, kind) {
		const id = ++this.lootSerial;
		const body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.fixed().setTranslation(x, floor * FLOOR + 0.72, 0),
		);
		const col = this.world.createCollider(
			RAPIER.ColliderDesc.ball(0.7)
				.setSensor(true)
				.setCollisionGroups(0x00100002),
			body,
		);
		this.loot.push({
			id,
			x,
			y: floor * FLOOR + 0.72,
			floor,
			kind,
			taken: false,
			body,
			col,
		});
	}
	spawnHazard(kind, floor, x, dir) {
		if (this.hazards.length > 38) return;
		const random = this.rng || Math.random;
		if (x === undefined) {
			dir = random() > 0.5 ? -1 : 1;
			x = dir > 0 ? -28 : 28;
		}
		const h = {
			id: ++this.hazardSerial,
			kind,
			floor,
			x,
			y: floor * FLOOR,
			dir,
			phase: random() * 6.28,
			stunned: 0,
			age: 0,
			speed:
				(kind === "plane"
					? 8.1
					: kind === "ball"
						? 4.6
						: kind === "radio"
							? 0
							: 4.1) + (kind === "radio" ? 0 : this.caseIndex * 0.6),
		};
		h.y +=
			kind === "plane"
				? 1.62
				: kind === "ball"
					? 0.5
					: kind === "cart"
						? 0.58
						: 0.55;
		h.body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(h.x, h.y, 0),
		);
		const shape =
			kind === "ball"
				? RAPIER.ColliderDesc.ball(0.44)
				: RAPIER.ColliderDesc.cuboid(
						kind === "plane" ? 0.82 : 0.64,
						kind === "plane" ? 0.24 : 0.47,
						0.5,
					);
		h.col = this.world.createCollider(
			shape.setSensor(true).setCollisionGroups(0x00040002),
			h.body,
		);
		this.hazards.push(h);
		this.metrics.spawns[kind]++;
		this.announce("hazard", { kind, floor, x: h.x });
		return h;
	}
	removeHazard(h) {
		this.world.removeRigidBody(h.body);
		this.hazards.splice(this.hazards.indexOf(h), 1);
	}
	input(id, i) {
		const p = this.players.find((p) => p.id === id);
		if (p) p.input = cleanInput(i);
	}
	board(p, kind) {
		p.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
		p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		if (kind === "lift") {
			p.ride = { type: "lift" };
			this.metrics.lifts++;
			this.announce("lift", { player: p.id });
		} else {
			const dir = p.floor % 2 === 0 ? 1 : -1;
			p.ride = {
				type: "escalator",
				t: 0,
				from: p.floor,
				to: p.floor + 1,
				x0: dir * 20,
				x1: dir * 24,
				duration: 1.55,
			};
			this.metrics.escalators++;
			this.announce("escalator", { player: p.id, floor: p.floor });
		}
	}
	unboard(p, floor, x) {
		p.floor = floor;
		p.x = x;
		p.y = floor * FLOOR;
		p.ride = null;
		p.rideCooldown = 0.6;
		p.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
		p.body.setTranslation({ x, y: p.y + 0.82, z: 0 }, true);
		p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		p.grounded = true;
	}
	teleport(id, floor, x = 0) {
		const p = this.players.find((p) => p.id === id);
		if (p) {
			this.unboard(p, floor, clamp(x, -25, 25));
			p.rideCooldown = 0;
			p.invuln = 2;
		}
	}
	step(dt = 1 / 60) {
		if (this.state !== "playing") {
			if (
				this.attract &&
				["caught", "gameover", "victory"].includes(this.state)
			) {
				this.resultTimer += dt;
				if (this.resultTimer > 2.4)
					this.state === "caught"
						? this.nextCase()
						: this.start(this.count, true, this.seed + 1);
			}
			return;
		}
		dt *= this.tune.timeScale;
		this.world.timestep = dt;
		this.time += dt;
		this.totalTime += dt;
		this.intro = Math.max(0, this.intro - dt);
		if (!this.tune.infiniteTime && !this.attract) this.clock -= dt;
		if (this.clock <= 0) {
			this.loseBadge("TIME’S UP!");
			return;
		}
		this.updateLift(dt);
		this.updateCrook(dt);
		if (this.state !== "playing") return;
		this.spawnTimer -= dt * this.tune.hazardRate;
		if (this.spawnTimer <= 0) {
			const c = CASES[this.caseIndex];
			const kind = c.kinds[this.nextHazard++ % c.kinds.length];
			const lead = this.players[this.nextHazard % this.players.length];
			const floor =
				this.nextHazard % 3 === 0 ? Math.min(2, this.crook.floor) : lead.floor;
			const dir = lead.dir > 0 ? -1 : 1;
			this.spawnHazard(
				kind,
				floor,
				kind === "radio" ? (dir < 0 ? 15 : -15) : dir < 0 ? 28 : -28,
				dir,
			);
			this.spawnTimer =
				Math.max(1.25, 3.6 - this.caseIndex * 0.6) + this.rng() * 0.65;
		}
		for (const h of [...this.hazards]) {
			h.age += dt;
			h.stunned = Math.max(0, h.stunned - dt);
			if (h.stunned <= 0) h.x += h.dir * h.speed * dt;
			if (h.kind === "ball")
				h.y =
					h.floor * FLOOR +
					0.5 +
					Math.abs(Math.sin(h.age * 2.5 + h.phase)) *
						(this.caseIndex > 0 ? 1.7 : 1.15);
			h.body.setNextKinematicTranslation({ x: h.x, y: h.y, z: 0 });
			if (Math.abs(h.x) > 31 || h.age > 24) this.removeHazard(h);
		}
		for (const p of this.players) this.updatePlayer(p, dt);
		this.world.step();
		for (const p of this.players) {
			const pos = p.body.translation();
			p.x = pos.x;
			p.y = pos.y - 0.82;
			if (!p.ride) {
				p.grounded = p.y <= p.floor * FLOOR + 0.07 && p.body.linvel().y <= 0.15;
				if (p.grounded) p.coyote = 0.1;
				if (p.y < -3) this.teleport(p.id, 0, -23);
				p.pose =
					p.stun > 0
						? "stumble"
						: p.duck
							? "duck"
							: !p.grounded
								? "jump"
								: Math.abs(p.body.linvel().x) > 0.3
									? "run"
									: "idle";
			}
			for (const h of this.hazards) {
				if (
					!p.ride &&
					!h.stunned &&
					p.invuln <= 0 &&
					this.world.intersectionPair(p.col, h.col)
				)
					this.hit(p, h);
			}
			for (const l of this.loot) {
				if (!l.taken && this.world.intersectionPair(p.col, l.col)) {
					l.taken = true;
					l.col.setEnabled(false);
					this.score += 150;
					p.score += 150;
					this.recovered++;
					this.metrics.pickups++;
					this.announce("pickup", { player: p.id, x: l.x, y: l.y, value: 150 });
				}
			}
			if (
				!p.ride &&
				!this.crook.ride &&
				p.floor === this.crook.floor &&
				Math.abs(p.x - this.crook.x) < 1.25 &&
				Math.abs(p.y - this.crook.y) < 1.25
			) {
				this.catchCrook(p.id);
				break;
			}
			p.input.jump = false;
			p.input.whistle = false;
		}
	}
	updatePlayer(p, dt) {
		const i = p.input;
		p.invuln = Math.max(0, p.invuln - dt);
		p.stun = Math.max(0, p.stun - dt);
		p.whistle = Math.max(0, p.whistle - dt);
		p.coyote -= dt;
		p.rideCooldown -= dt;
		if (p.ride) {
			const r = p.ride;
			p.duck = false;
			this.setCrouch(p, false);
			if (r.type === "lift") {
				p.x = 0.1 + (p.id % 2) * 0.4;
				p.y = this.lift.y;
				p.pose = "idle";
				if (this.lift.phase === "dwell" && (i.down || (i.up && this.attract)))
					this.unboard(p, this.lift.floor, 1.8 * (this.crook.x < 0 ? -1 : 1));
			} else {
				r.t = Math.min(1, r.t + dt / r.duration);
				p.x = r.x0 + (r.x1 - r.x0) * r.t;
				p.y = (r.from + r.t) * FLOOR;
				p.pose = "idle";
				if (r.t >= 1) this.unboard(p, r.to, r.x1);
			}
			if (p.ride)
				p.body.setNextKinematicTranslation({ x: p.x, y: p.y + 0.82, z: 0 });
			return;
		}
		p.duck = i.duck && p.grounded && p.stun <= 0;
		if (p.duck && !p.prevDuck) this.metrics.ducks++;
		p.prevDuck = p.duck;
		this.setCrouch(p, p.duck);
		if (i.jump) p.jumpBuffer = 0.13;
		else p.jumpBuffer -= dt;
		const velocity = p.body.linvel();
		let vx = i.axis * this.tune.speed * (p.duck ? 0.36 : 1);
		if (p.stun > 0) vx = -p.dir * 2.4;
		if (Math.abs(i.axis) > 0.15) p.dir = Math.sign(i.axis);
		let vy = velocity.y;
		if (p.jumpBuffer > 0 && p.coyote > 0 && p.stun <= 0 && !p.duck) {
			vy = this.tune.jump;
			p.grounded = false;
			p.coyote = 0;
			p.jumpBuffer = 0;
			this.metrics.jumps++;
			this.announce("jump", { player: p.id, x: p.x, y: p.y });
		}
		if ((p.x > EDGE && vx > 0) || (p.x < -EDGE && vx < 0)) vx = 0;
		p.body.setLinvel({ x: vx, y: vy, z: 0 }, true);
		if (i.whistle && p.whistle <= 0) {
			p.whistle = 8;
			this.metrics.whistles++;
			const c = this.crook;
			if (p.floor === c.floor && Math.abs(p.x - c.x) <= 9) {
				c.stun = 1.7;
				this.announce("stunned", { x: c.x, y: c.y });
			}
			for (const h of this.hazards)
				if (h.floor === p.floor && Math.abs(h.x - p.x) < 7) h.stunned = 2;
			this.announce("whistle", { player: p.id, x: p.x, y: p.y });
		}
		if (p.grounded && p.rideCooldown <= 0) {
			if (
				p.floor < 3 &&
				Math.abs(p.x) < 1.55 &&
				i.up &&
				this.lift.phase === "dwell" &&
				this.lift.floor === p.floor &&
				this.lift.open > 0.7
			)
				this.board(p, "lift");
			else if (
				p.floor < 3 &&
				Math.abs(p.x - (p.floor % 2 === 0 ? 20 : -20)) < 1 &&
				(i.axis * (p.floor % 2 === 0 ? 1 : -1) > 0.1 || i.up)
			)
				this.board(p, "escalator");
		}
	}
	setCrouch(p, on) {
		if (p.col.isEnabled() && p.isCrouched !== on) {
			p.isCrouched = on;
			p.col.setHalfHeight(on ? 0.12 : 0.5);
			p.col.setTranslationWrtParent({ x: 0, y: on ? -0.38 : 0, z: 0 });
		}
	}
	updateLift(dt) {
		const l = this.lift;
		l.t += dt;
		if (l.phase === "dwell") {
			l.open =
				l.t < 1.8
					? Math.min(1, l.t * 5 + 0.2)
					: Math.max(0, 1 - (l.t - 1.8) * 5);
			l.y = l.floor * FLOOR;
			if (l.t >= 2.1) {
				l.phase = "travel";
				l.t = 0;
				l.next = l.floor + l.dir;
			}
		} else {
			const duration = FLOOR / this.tune.liftSpeed;
			const t = clamp(l.t / duration, 0, 1);
			l.y = (l.floor + (l.next - l.floor) * (t * t * (3 - 2 * t))) * FLOOR;
			l.open = 0;
			if (t >= 1) {
				l.floor = l.next;
				if (l.floor === 2 || l.floor === 0) l.dir *= -1;
				l.phase = "dwell";
				l.t = 0;
				this.announce("ding", { floor: l.floor });
			}
		}
	}
	updateCrook(dt) {
		const c = this.crook;
		c.stun = Math.max(0, c.stun - dt);
		c.rummage = Math.max(0, c.rummage - dt);
		if (c.ride) {
			const r = c.ride;
			r.t = Math.min(1, r.t + dt / 1.7);
			c.x = r.x0 + (r.x1 - r.x0) * r.t;
			c.y = (r.from + r.t) * FLOOR;
			c.pose = "idle";
			if (r.t >= 1) {
				c.floor = r.to;
				c.dir *= -1;
				c.ride = null;
				c.rummage = 1;
			}
			return;
		}
		c.y = c.floor * FLOOR;
		if (c.stun > 0 || c.rummage > 0) {
			c.pose = c.stun > 0 ? "stumble" : "idle";
			return;
		}
		c.rummageClock -= dt;
		if (c.rummageClock <= 0 && c.floor < 3) {
			c.rummage = 1.65;
			c.rummageClock = 7;
			this.announce("rummage", { x: c.x, y: c.y });
			return;
		}
		c.pose = "run";
		c.x += c.dir * CASES[this.caseIndex].speed * this.tune.crookSpeed * dt;
		if (c.floor < 3 && c.dir * c.x >= 20) {
			c.ride = {
				t: 0,
				from: c.floor,
				to: c.floor + 1,
				x0: c.dir * 20,
				x1: c.dir * 24,
			};
		} else if (c.floor === 3 && c.x <= -24.5) {
			c.x = -24.5;
			c.pose = "idle";
			c.escape += dt;
			if (c.escape > 6 && !this.attract)
				this.loseBadge("THE CROOK FLEW THE COOP!");
		}
	}
	hit(p, h) {
		if (this.tune.invincible || this.attract) return;
		p.invuln = 2.2;
		p.stun = 0.55;
		this.metrics.hits++;
		this.announce("hit", { player: p.id, kind: h.kind, x: p.x, y: p.y });
		if (h.kind === "plane") {
			this.badges--;
			this.announce("badge", { message: "MIND YOUR HAT! −1 BADGE" });
			if (this.badges <= 0) this.gameOver("THOSE PESKY PLANES!");
		} else this.clock = Math.max(0.01, this.clock - this.tune.hitPenalty);
	}
	loseBadge(message) {
		if (this.tune.invincible || this.attract) {
			this.clock = CASES[this.caseIndex].time;
			return;
		}
		this.badges--;
		this.announce("badge", { message });
		if (this.badges <= 0) this.gameOver(message);
		else {
			this.score = this.caseStartScore;
			this.recovered = this.caseStartRecovered;
			this.buildCase();
			this.announce("retry", { message, badges: this.badges });
		}
	}
	catchCrook(id = this.players[0]?.id) {
		if (this.state !== "playing") return;
		const bonus = Math.ceil(this.clock) * 100;
		this.score += bonus;
		this.captures++;
		this.metrics.captures++;
		const p = this.players.find((p) => p.id === id);
		if (p) p.score += bonus;
		this.caseScores.push({
			bonus,
			loot: this.recovered - this.caseStartRecovered,
			clock: Math.ceil(this.clock),
		});
		this.state = "caught";
		this.resultTimer = 0;
		for (const q of this.players) {
			q.pose = "cheer";
			q.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		}
		this.crook.pose = "stumble";
		if (!this.attract && this.badges < 3) this.badges++;
		this.announce("caught", { player: id, bonus, caseIndex: this.caseIndex });
	}
	nextCase() {
		if (this.state !== "caught") return;
		if (this.caseIndex < CASES.length - 1) {
			this.caseIndex++;
			this.buildCase();
		} else {
			this.state = "victory";
			this.resultTimer = 0;
			this.announce("victory", { score: this.score });
		}
	}
	gameOver(message) {
		this.state = "gameover";
		this.resultTimer = 0;
		this.reason = message;
		this.announce("gameover", { message });
	}
	retry() {
		this.score = this.caseStartScore;
		this.recovered = this.caseStartRecovered;
		this.badges = 3;
		this.buildCase();
	}
	getAI(p) {
		const c = this.crook;
		const i = {
			axis: 0,
			jump: false,
			duck: false,
			up: false,
			down: false,
			whistle: false,
		};
		if (p.ride?.type === "lift") {
			i.down =
				this.lift.phase === "dwell" && this.lift.floor >= Math.min(2, c.floor);
			return i;
		}
		if (p.ride) return i;
		let target = c.x;
		if (p.floor < c.floor) {
			// Choose the lift when it is a real shortcut; otherwise keep the chase moving.
			if (
				p.floor < 2 &&
				c.floor <= 2 &&
				Math.abs(p.x) < 13 &&
				this.lift.floor === p.floor &&
				this.lift.phase === "dwell"
			) {
				target = 0;
				i.up = Math.abs(p.x) < 1.4;
			} else target = p.floor % 2 === 0 ? 20 : -20;
		} else if (p.floor > c.floor) target = 0;
		i.axis = Math.abs(target - p.x) > 0.65 ? Math.sign(target - p.x) : 0;
		for (const h of this.hazards) {
			if (h.floor !== p.floor || h.stunned) continue;
			const d = (h.x - p.x) * (i.axis || p.dir);
			if (d < -0.6 || d > 3.7) continue;
			if (
				h.kind === "plane" ||
				(h.kind === "ball" && h.y > p.floor * FLOOR + 1.2)
			)
				i.duck = true;
			else if (d < 3.1 && p.grounded) i.jump = true;
		}
		i.whistle =
			c.floor === p.floor && Math.abs(c.x - p.x) < 8 && p.whistle <= 0;
		return i;
	}
	snapshot() {
		return {
			state: this.state,
			caseIndex: this.caseIndex,
			score: this.score,
			badges: this.badges,
			clock: this.clock,
			time: this.time,
			totalTime: this.totalTime,
			recovered: this.recovered,
			captures: this.captures,
			intro: this.intro,
			reason: this.reason,
			attract: this.attract,
			caseScores: this.caseScores,
			serial: this.serial,
			lift: { ...this.lift },
			crook: { ...this.crook },
			players: this.players.map((p) => ({
				id: p.id,
				x: p.x,
				y: p.y,
				floor: p.floor,
				dir: p.dir,
				grounded: p.grounded,
				pose: p.pose,
				duck: p.duck,
				ride: p.ride,
				invuln: p.invuln,
				whistle: p.whistle,
				score: p.score,
			})),
			hazards: this.hazards.map((h) => ({
				id: h.id,
				kind: h.kind,
				x: h.x,
				y: h.y,
				floor: h.floor,
				dir: h.dir,
				age: h.age,
				stunned: h.stunned,
			})),
			loot: this.loot.map((l) => ({
				id: l.id,
				x: l.x,
				y: l.y,
				floor: l.floor,
				kind: l.kind,
				taken: l.taken,
			})),
			events: this.events.slice(-6),
		};
	}
	dispose() {
		this.world?.free();
		this.world = null;
	}
}
