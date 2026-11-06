import RAPIER from "@dimforge/rapier2d-compat";
export const TITLE = "The Great Below-About";
export const DEFAULTS = Object.freeze({
	speed: 8.2,
	jump: 11.8,
	gravity: 22,
	swimSpeed: 5.8,
	climbSpeed: 5,
	balloonSpeed: 3.6,
	enemySpeed: 1,
	penalty: 1,
});
export const PLATFORMS = [
	[-12, 16, 0, 2.5, "moss"],
	[22, 32, 0, 2.5, "moss"],
	[36, 62, 0, 2.5, "moss"],
	[-12, 32, -12, 2.2, "stone"],
	[36, 52, -12, 2.2, "stone"],
	[56, 66, -12, 2.2, "stone"],
	[-12, -6, -26, 3, "river"],
	[-2, 5, -26, 3, "river"],
	[42, 52, -26, 3, "river"],
	[56, 66, -26, 3, "river"],
	[5, 42, -32, 2, "river"],
	[-12, 18, -40, 3.5, "gold"],
	[23, 48, -40, 3.5, "gold"],
	[53, 96, -40, 3.5, "gold"],
	[66, 70, 4, 3, "loft"],
	[80, 96, 4, 3, "loft"],
];
export const LADDERS = [
	{ x: 34, lo: -12, hi: 0 },
	{ x: 54, lo: -26, hi: -12 },
	{ x: -4, lo: -40, hi: -26 },
];
export const CHECKPOINTS = [
	{ x: 3, y: 0.85, name: "Fernfall Porch" },
	{ x: 38, y: -11.15, name: "Frogstep Galleries" },
	{ x: 59, y: -25.15, name: "Inkfin River" },
	{ x: 1, y: -25.15, name: "Foxglove Bank" },
	{ x: 64, y: -39.15, name: "Balloon Belfry" },
	{ x: 84, y: 4.85, name: "Sunseed Loft" },
];
const GOLD = [
	[10, 1],
	[24, 1],
	[43, 1],
	[59, 1],
	[27, -11],
	[19, -11],
	[13, -11],
	[4, -11],
	[42, -11],
	[61, -11],
	[47, -25],
	[36, -29],
	[28, -30.8],
	[19, -29],
	[10, -30.8],
	[2, -39],
	[12, -39],
	[28, -39],
	[38, -39],
	[59, -39],
	[81, -39],
	[74, -28],
	[75, -17],
	[75, -6],
];
export const ZONES = [
	{
		id: "porch",
		title: "Fernfall Porch",
		sub: "A perfectly sensible place to get lost.",
		x: 17,
		y: 0,
	},
	{
		id: "galleries",
		title: "Frogstep Galleries",
		sub: "The locals are rather jumpy.",
		x: 25,
		y: -12,
	},
	{
		id: "river",
		title: "Inkfin River",
		sub: "Lovely water. Questionable company.",
		x: 24,
		y: -27,
	},
	{
		id: "belfry",
		title: "Balloon Belfry",
		sub: "Going up? Mind the bats.",
		x: 45,
		y: -40,
	},
	{
		id: "loft",
		title: "Sunseed Loft",
		sub: "Some things are worth falling for.",
		x: 86,
		y: 4,
	},
];
const ENEMIES = [
	["frog", 27, -11.55, 2.5, 1.8],
	["frog", 46, -11.55, 2, 2.4],
	["scorpion", 12, 0.4, 2.3, 2],
	["scorpion", 43, -11.6, 2.3, 1.2],
	["condor", 38, 3.8, 11, 1],
	["bat", 28, -5, 7, 1.5],
	["bat", 17, -17, 8, 1.2],
	["eel", 17, -28.6, 6, 1.3],
	["eel", 33, -30.2, 6, 1.8],
	["scorpion", 10, -39.6, 4, 1.3],
	["scorpion", 34, -39.6, 4, 2],
	["bat", 76, -20, 5, 1.6],
	["bat", 77, -9, 7, 1.3],
	["condor", 87, 8.2, 6, 1.4],
	["rat", 58, -39.5, 1.8, 0.65],
];
const approach = (v, target, rate) =>
	v < target ? Math.min(target, v + rate) : Math.max(target, v - rate);
export class Game {
	constructor(onEvent = () => {}) {
		this.emit = onEvent;
		this.params = { ...DEFAULTS };
		this.invincible = false;
		this.noclip = false;
		this.speedScale = 1;
		this.ready = false;
	}
	async init() {
		await RAPIER.init();
		this.ready = true;
		this.reset();
		return this;
	}
	reset() {
		if (this.world) this.world.free();
		this.world = new RAPIER.World({ x: 0, y: -this.params.gravity });
		this.world.timestep = 1 / 60;
		for (const [a, b, y, h] of PLATFORMS) {
			this.world.createCollider(
				RAPIER.ColliderDesc.cuboid((b - a) / 2, h / 2)
					.setTranslation((a + b) / 2, y - h / 2)
					.setFriction(0),
			);
		}
		this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(0.5, 40).setTranslation(-13, -15),
		);
		this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(0.5, 40).setTranslation(97, -15),
		);
		this.body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(3, 0.82)
				.lockRotations()
				.setCcdEnabled(true),
		);
		this.collider = this.world.createCollider(
			RAPIER.ColliderDesc.capsule(0.43, 0.32).setFriction(0).setRestitution(0),
			this.body,
		);
		this.time = 0;
		this.enemyTime = 0;
		this.score = 4000;
		this.deaths = 0;
		this.falls = 0;
		this.collected = new Set();
		this.rescued = { pip: false, fox: false, prism: false };
		this.checkpoint = 0;
		this.visited = new Set([0]);
		this.seenZones = new Set();
		this.zone = "porch";
		this.finished = false;
		this.finishTime = 0;
		this.grounded = false;
		this.coyote = 0;
		this.jumpBuffer = 0;
		this.invuln = 1.4;
		this.rewind = 0;
		this.climbing = null;
		this.carry = false;
		this.boardCooldown = 0;
		this.balloon = { x: 74, y: -38.1, active: true, respawn: 0 };
		this.mode = "idle";
		this.face = 1;
		this.vx = 0;
		this.vy = 0;
		this.lastJump = false;
		this.lastAction = false;
		this.lastFoot = 0;
		this.waterTime = 0;
		this.maxFall = 0;
		this.fallPeak = 0.82;
		this.stepCount = 0;
		this.gold = GOLD.map(([x, y], i) => ({ id: "gold" + i, x, y }));
		this.enemies = ENEMIES.map(([type, x, y, range, speed], i) => ({
			id: i,
			type,
			bx: x,
			by: y,
			x,
			y,
			range,
			speed,
			dir: 1,
			active: true,
		}));
	}
	zoneAt(x, y) {
		if (y > 1 && x > 65) return "loft";
		if (y > -6) return "porch";
		if (y > -20) return "galleries";
		if (y > -35) return "river";
		return "belfry";
	}
	get position() {
		return this.body.translation();
	}
	teleport(x, y) {
		this.body.setTranslation({ x, y }, true);
		this.body.setLinvel({ x: 0, y: 0 }, true);
		this.body.setGravityScale(1, true);
		this.climbing = null;
		this.carry = false;
		this.grounded = false;
		this.vx = 0;
		this.vy = 0;
		this.invuln = 1;
		this.maxFall = 0;
		this.fallPeak = y;
	}
	checkpointWarp(i) {
		if (!CHECKPOINTS[i]) return;
		this.checkpoint = i;
		const c = CHECKPOINTS[i];
		this.teleport(c.x, c.y);
		this.emit("checkpoint", { ...c, index: i });
	}
	hurt(cause = "a cave creature") {
		if (this.invincible || this.invuln > 0 || this.rewind > 0 || this.finished)
			return false;
		const p = this.position,
			c = CHECKPOINTS[this.checkpoint];
		this.score = Math.max(
			0,
			this.score -
				Math.round(
					(300 + Math.hypot(p.x - c.x, p.y - c.y) * 22) * this.params.penalty,
				),
		);
		this.deaths++;
		this.rewind = 0.9;
		this.carry = false;
		this.climbing = null;
		this.balloon.respawn = 1.2;
		this.body.setGravityScale(0, true);
		this.body.setLinvel({ x: 0, y: 0 }, true);
		this.emit("hit", { cause, from: { x: p.x, y: p.y }, to: c });
		return true;
	}
	collect(id) {
		if (this.collected.has(id)) return;
		this.collected.add(id);
		this.score += 5000;
		this.emit("collect", { kind: "gold", id });
	}
	rescue(kind) {
		if (this.rescued[kind]) return;
		this.rescued[kind] = true;
		this.score += kind === "prism" ? 20000 : 10000;
		this.emit("rescue", { kind });
		if (Object.values(this.rescued).every(Boolean) && !this.finished) {
			this.finished = true;
			this.finishTime = this.time;
			this.emit("finish", this.snapshot());
		}
	}
	updateEnemies(dt) {
		this.enemyTime += dt * this.params.enemySpeed;
		for (const e of this.enemies) {
			const t = this.enemyTime * e.speed + e.id * 0.72;
			const wave = Math.sin(t);
			e.x = e.bx + wave * e.range;
			e.dir = Math.cos(t) >= 0 ? 1 : -1;
			e.y = e.by;
			if (e.type === "frog") e.y += Math.max(0, Math.sin(t * 2.4)) ** 1.3 * 1.9;
			if (e.type === "bat") e.y += Math.sin(t * 1.7) * 1.1;
			if (e.type === "condor") e.y += Math.sin(t * 1.4) * 1.85;
			if (e.type === "eel") e.y += Math.sin(t * 1.8) * 0.38;
		}
	}
	tick(dt, input = {}) {
		dt = Math.min(dt, 1 / 30) * this.speedScale;
		if (!dt) return;
		this.stepCount++;
		this.time += dt;
		this.updateEnemies(dt);
		this.invuln = Math.max(0, this.invuln - dt);
		this.boardCooldown = Math.max(0, this.boardCooldown - dt);
		const jump = !!input.jump && !this.lastJump,
			act = !!input.action && !this.lastAction;
		this.lastJump = !!input.jump;
		this.lastAction = !!input.action;
		let p = this.position;
		if (this.rewind > 0) {
			this.rewind -= dt;
			const c = CHECKPOINTS[this.checkpoint];
			const f = 1 - Math.exp(-dt * 6);
			this.body.setTranslation(
				{ x: p.x + (c.x - p.x) * f, y: p.y + (c.y - p.y) * f },
				true,
			);
			if (this.rewind <= 0) {
				this.teleport(c.x, c.y);
				this.invuln = 2;
			}
			this.mode = "rewind";
			return;
		}
		const ix = Math.max(-1, Math.min(1, input.x || 0)),
			iy = Math.max(-1, Math.min(1, input.y || 0));
		if (Math.abs(ix) > 0.1) this.face = Math.sign(ix);
		this.world.gravity.y = -this.params.gravity;
		this.world.timestep = dt;
		if (this.noclip) {
			this.collider.setSensor(true);
			this.body.setGravityScale(0, true);
			this.body.setLinvel({ x: ix * 15, y: iy * 15 }, true);
			this.world.step();
			this.mode = "float";
			this.interactions();
			return;
		}
		this.collider.setSensor(false);
		const hit = this.world.castRay(
			new RAPIER.Ray({ x: p.x, y: p.y - 0.71 }, { x: 0, y: -1 }),
			0.18,
			true,
			undefined,
			undefined,
			this.collider,
		);
		this.grounded = !!hit && this.body.linvel().y <= 1.5;
		this.coyote = this.grounded ? 0.12 : Math.max(0, this.coyote - dt);
		this.jumpBuffer = jump ? 0.14 : Math.max(0, this.jumpBuffer - dt);
		const inWater = p.x > 5.05 && p.x < 41.95 && p.y < -25.7 && p.y > -33;
		if (inWater && this.mode !== "swim") {
			this.emit("water", { x: p.x, y: -26.2 });
		}
		let ladder = this.climbing !== null ? LADDERS[this.climbing] : null;
		if (!this.carry && !inWater && !ladder && Math.abs(iy) > 0.25) {
			const li = LADDERS.findIndex(
				(l) =>
					Math.abs(p.x - l.x) < 1.5 && p.y > l.lo - 0.2 && p.y < l.hi + 1.35,
			);
			if (li >= 0) {
				this.climbing = li;
				ladder = LADDERS[li];
				this.body.setGravityScale(0, true);
			}
		}
		if (this.carry) {
			this.body.setGravityScale(0, true);
			const by = p.y;
			this.vx = ix * this.params.balloonSpeed;
			this.vy = Math.max(1.1, this.params.balloonSpeed + iy * 2);
			if (p.x < 68 && this.vx < 0) this.vx = 0;
			if (p.x > 91 && this.vx > 0) this.vx = 0;
			if (by > 7.8) this.vy = 0;
			this.body.setLinvel({ x: this.vx, y: this.vy }, true);
			this.balloon.x = p.x;
			this.balloon.y = p.y;
			this.mode = "float";
			if ((jump || act) && this.boardCooldown <= 0) {
				this.carry = false;
				this.boardCooldown = 1.1;
				this.balloon.respawn = 2;
				this.body.setGravityScale(1, true);
				this.body.setLinvel({ x: ix * this.params.speed, y: 1 }, true);
				this.emit("balloon", { kind: "drop", x: p.x, y: p.y });
			}
		} else if (ladder) {
			this.body.setGravityScale(0, true);
			let vx = ix * this.params.climbSpeed,
				vy = iy * this.params.climbSpeed;
			if (Math.abs(ix) < 0.1) vx = (ladder.x - p.x) * 8;
			if (p.y >= ladder.hi + 0.85 && vy > 0) vy = 0;
			if (p.y <= ladder.lo + 0.82 && vy < 0) vy = 0;
			this.body.setLinvel({ x: vx, y: vy }, true);
			this.vx = vx;
			this.vy = vy;
			this.mode = "climb";
			if (Math.abs(p.x - ladder.x) > 2.25 || jump) {
				this.climbing = null;
				this.body.setGravityScale(1, true);
				if (jump)
					this.body.setLinvel(
						{ x: ix * this.params.speed, y: this.params.jump * 0.8 },
						true,
					);
			}
		} else if (inWater) {
			this.body.setGravityScale(0, true);
			this.vx = approach(
				this.body.linvel().x,
				ix * this.params.swimSpeed,
				20 * dt,
			);
			this.vy = approach(
				this.body.linvel().y,
				iy * this.params.swimSpeed * 0.82 + (Math.abs(iy) < 0.1 ? 0.85 : 0),
				18 * dt,
			);
			if (jump) {
				this.vy = 9.8;
				this.emit("jump", { water: true });
			}
			this.body.setLinvel({ x: this.vx, y: this.vy }, true);
			this.mode = "swim";
			this.waterTime += dt;
		} else {
			this.body.setGravityScale(1, true);
			this.vx = approach(
				this.body.linvel().x,
				ix * this.params.speed,
				(this.grounded ? 65 : 36) * dt,
			);
			this.vy = Math.max(this.body.linvel().y, -17.5);
			if (this.jumpBuffer > 0 && this.coyote > 0) {
				this.vy = this.params.jump;
				this.coyote = 0;
				this.jumpBuffer = 0;
				this.grounded = false;
				this.emit("jump", { x: p.x, y: p.y });
			}
			if (!input.jump && this.vy > 5 && this.lastMode === "jump")
				this.vy -= this.params.gravity * dt * 0.65;
			this.body.setLinvel({ x: this.vx, y: this.vy }, true);
			this.mode = this.grounded
				? Math.abs(this.vx) > 0.35
					? "run"
					: "idle"
				: "jump";
		}
		this.lastMode = this.mode;
		this.world.step();
		p = this.position;
		if (p.y < -45.5) {
			if (this.invincible) {
				this.teleport(
					CHECKPOINTS[this.checkpoint].x,
					CHECKPOINTS[this.checkpoint].y,
				);
			} else {
				this.invuln = 0;
				this.hurt("a very deep pit");
			}
		}
		if (!this.balloon.respawn && !this.carry) {
			this.balloon.x = 74 + Math.sin(this.time * 0.6) * 0.3;
			this.balloon.y = -38.15 + Math.sin(this.time * 1.7) * 0.22;
		}
		if (this.balloon.respawn > 0)
			this.balloon.respawn = Math.max(0, this.balloon.respawn - dt);
		if (
			!this.carry &&
			this.balloon.respawn <= 0 &&
			this.boardCooldown <= 0 &&
			Math.abs(p.x - this.balloon.x) < 1.45 &&
			Math.abs(p.y - this.balloon.y) < 2 &&
			(jump || iy > 0.25 || p.y > this.balloon.y + 0.2)
		) {
			this.carry = true;
			this.climbing = null;
			this.boardCooldown = 0.6;
			this.body.setGravityScale(0, true);
			this.emit("balloon", { kind: "board" });
		}
		if (this.carry) {
			for (const e of this.enemies) {
				if (
					e.type === "bat" &&
					Math.hypot(e.x - p.x, e.y - (p.y + 2.8)) < 1.35
				) {
					this.carry = false;
					this.balloon.respawn = 2.4;
					this.boardCooldown = 1.5;
					this.invuln = 1.4;
					this.body.setLinvel({ x: this.vx, y: -1 }, true);
					this.emit("balloon", { kind: "pop", x: p.x, y: p.y + 2.8 });
				}
			}
		}
		if (this.mode === "jump") {
			this.fallPeak = Math.max(this.fallPeak, p.y);
			this.maxFall = Math.max(this.maxFall, this.fallPeak - p.y);
		} else {
			if (
				this.maxFall > 8 &&
				(this.mode === "run" || this.mode === "idle" || this.mode === "swim")
			) {
				this.falls++;
				this.score = Math.max(
					0,
					this.score - Math.round(100 * this.params.penalty),
				);
				this.emit("fall", {
					distance: this.maxFall,
					cost: Math.round(100 * this.params.penalty),
				});
			}
			this.maxFall = 0;
			this.fallPeak = p.y;
		}
		if (
			this.mode === "run" &&
			this.grounded &&
			this.time - this.lastFoot > 0.27
		) {
			this.lastFoot = this.time;
			this.emit("step", { x: p.x, y: p.y });
		}
		this.interactions();
		const zone = this.zoneAt(p.x, p.y);
		if (zone !== this.zone || !this.seenZones.has(zone)) {
			this.zone = zone;
			this.seenZones.add(zone);
			this.emit(
				"zone",
				ZONES.find((z) => z.id === zone),
			);
		}
	}
	interactions() {
		const p = this.position;
		for (let i = 0; i < CHECKPOINTS.length; i++) {
			const c = CHECKPOINTS[i];
			if (Math.hypot(p.x - c.x, p.y - c.y) < 1.25 && this.checkpoint !== i) {
				this.checkpoint = i;
				this.visited.add(i);
				this.emit("checkpoint", { ...c, index: i });
			}
		}
		for (const g of this.gold)
			if (!this.collected.has(g.id) && Math.hypot(p.x - g.x, p.y - g.y) < 1.1)
				this.collect(g.id);
		if (Math.hypot(p.x - 8, p.y + 11.15) < 1.5) this.rescue("pip");
		if (Math.hypot(p.x - 0.4, p.y + 25.15) < 1.5) this.rescue("fox");
		if (Math.hypot(p.x - 88, p.y - 4.9) < 1.6) this.rescue("prism");
		for (const e of this.enemies) {
			if (
				!e.active ||
				Math.hypot(p.x - e.x, p.y - e.y) > (e.type === "condor" ? 1.05 : 0.88)
			)
				continue;
			if (e.type === "rat" && (p.x - e.x) * e.dir < -0.18) {
				e.active = false;
				this.collected.add("rat");
				this.score += 15000;
				this.emit("collect", { kind: "rat" });
			} else
				this.hurt(
					e.type === "eel"
						? "an electric eel"
						: e.type === "frog"
							? "an overexcited frog"
							: e.type === "rat"
								? "the business end of a cave rat"
								: `a ${e.type}`,
				);
		}
	}
	snapshot() {
		const p = this.position;
		return {
			ready: this.ready,
			x: p.x,
			y: p.y,
			vx: this.body.linvel().x,
			vy: this.body.linvel().y,
			mode: this.mode,
			face: this.face,
			score: this.score,
			deaths: this.deaths,
			gold: [...this.collected].filter((x) => x.startsWith("gold")).length,
			goldTotal: GOLD.length,
			collected: [...this.collected],
			rescued: { ...this.rescued },
			checkpoint: this.checkpoint,
			visited: [...this.visited],
			zone: this.zone,
			time: this.time,
			finished: this.finished,
			finishTime: this.finishTime,
			carry: this.carry,
			climbing: this.climbing,
			grounded: this.grounded,
			invincible: this.invincible,
			noclip: this.noclip,
			params: { ...this.params },
			waterTime: this.waterTime,
			balloon: { ...this.balloon },
			steps: this.stepCount,
			enemies: this.enemies.map((e) => ({
				type: e.type,
				x: e.x,
				y: e.y,
				active: e.active,
			})),
		};
	}
}
