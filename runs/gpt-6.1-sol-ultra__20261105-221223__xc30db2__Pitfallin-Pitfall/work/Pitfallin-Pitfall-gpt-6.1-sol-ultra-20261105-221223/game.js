export const DEFAULTS = Object.freeze({
	speed: 7.2,
	jump: 10.8,
	gravity: 25,
	vineSpeed: 0.72,
	hazardSpeed: 1,
	timeLimit: 480,
});
export const LEVEL = {
	ground: [
		[-10, 30],
		[41, 69],
		[80, 116],
		[130, 166],
		[179, 210],
		[224, 290],
	],
	caves: [
		[78, 114],
		[178, 210],
	],
	ladders: [84, 108, 184, 204],
	vines: [
		{ x: 35.5, y: 9.5, length: 8.2, phase: -1.1 },
		{ x: 123, y: 10, length: 8.6, phase: 0.4 },
		{ x: 172.5, y: 9.8, length: 8.3, phase: -0.8 },
	],
	crocs: [71.4, 74.7, 78, 212.2, 215.5, 218.8, 222.1].map((x, i) => ({
		x,
		y: 0,
		phase: i * 0.48,
	})),
	logs: [14, 53, 142, 240].map((x) => ({ x, y: 0 })),
	snakes: [90, 158, 255].map((x) => ({ x, y: 0 })),
	scorpions: [94, 103, 190, 200].map((x) => ({ x, y: -5.8 })),
	checkpoints: [
		{ x: 3, name: "Base camp" },
		{ x: 45, name: "The crooked creek" },
		{ x: 82, name: "Roots & ruins" },
		{ x: 133, name: "The black lagoon" },
		{ x: 181, name: "The hollow earth" },
		{ x: 228, name: "The last leap" },
	],
	relics: [
		{ id: 0, x: 23, y: 0.55, name: "The Grinning Sun" },
		{ id: 1, x: 60, y: 0.55, name: "The Rain Dancer" },
		{ id: 2, x: 99, y: -5.25, name: "The Root Keeper" },
		{ id: 3, x: 150, y: 0.55, name: "The Moon Monkey" },
		{ id: 4, x: 195, y: -5.25, name: "The Sleeping Star" },
		{ id: 5, x: 267, y: 0.55, name: "The Golden Goodbye" },
	],
	zones: [
		"Fernway",
		"Crocodile creek",
		"Roots & ruins",
		"Tarwood",
		"Hollow earth",
		"Sunset run",
	],
	length: 280,
};
export class Game {
	constructor(R) {
		this.R = R;
		this.tuning = { ...DEFAULTS };
		this.dev = { invincible: false, noclip: false, freezeTime: false };
		this.events = [];
		this.world = new R.World({ x: 0, y: -25, z: 0 });
		this.world.timestep = 1 / 60;
		this.solids = [];
		const box = (x, y, hx, hy) => {
			const b = this.world.createRigidBody(
				R.RigidBodyDesc.fixed().setTranslation(x, y, 0),
			);
			const c = this.world.createCollider(
				R.ColliderDesc.cuboid(hx, hy, 1.5),
				b,
			);
			this.solids.push(c);
		};
		for (const [a, b] of LEVEL.ground)
			box((a + b) / 2, -0.28, (b - a) / 2, 0.28);
		for (const [a, b] of LEVEL.caves) box((a + b) / 2, -6.1, (b - a) / 2, 0.3);
		for (const c of LEVEL.crocs) box(c.x, -0.03, 0.92, 0.18);
		this.body = this.world.createRigidBody(
			R.RigidBodyDesc.kinematicPositionBased().setTranslation(3, 0.86, 0),
		);
		this.collider = this.world.createCollider(
			R.ColliderDesc.capsule(0.5, 0.3).setFriction(0),
			this.body,
		);
		this.controller = this.world.createCharacterController(0.025);
		this.controller.enableSnapToGround(0.18);
		this.controller.setMaxSlopeClimbAngle(Math.PI / 4);
		this.controller.setMinSlopeSlideAngle(Math.PI / 3);
		this.reset();
	}
	reset() {
		this.mode = "title";
		this.time = 0;
		this.remaining = this.tuning.timeLimit;
		this.collected = new Set();
		this.coins = new Set();
		this.score = 0;
		this.health = 3;
		this.checkpoint = 0;
		this.deaths = 0;
		this.finished = false;
		this.reason = "";
		this.visited = new Set([0]);
		this.player = {
			x: 3,
			y: 0.03,
			vx: 0,
			vy: 0,
			facing: 1,
			grounded: true,
			climbing: false,
			swinging: false,
			invuln: 0,
		};
		this.vineIndex = -1;
		this.grabCooldown = 0;
		this.jumpBuffer = 0;
		this.coyote = 0.1;
		this.particles = [];
		this.hazards = { logs: [], crocs: [], snakes: [], scorpions: [] };
		this.vines = [];
		this.events = [];
		this.attractTime = 0;
		this.stats = { jumps: 0, swings: 0, falls: 0, treasures: 0 };
		this.teleport(3, 0.03);
		this.updateHazards();
	}
	start(attract = false) {
		this.reset();
		this.mode = attract ? "attract" : "playing";
		this.attractTime = 0;
		this.emit("start");
	}
	emit(type, data = {}) {
		this.events.push({ type, ...data });
	}
	drainEvents() {
		return this.events.splice(0);
	}
	teleport(x, y) {
		const p = this.player;
		p.x = x;
		p.y = y;
		p.vx = 0;
		p.vy = 0;
		p.swinging = false;
		p.climbing = false;
		p.grounded = false;
		this.vineIndex = -1;
		this.collider.setEnabled(true);
		this.body.setTranslation({ x, y: y + 0.825, z: 0 }, true);
		this.body.setNextKinematicTranslation({ x, y: y + 0.825, z: 0 });
	}
	updateHazards() {
		const t = this.time * this.tuning.hazardSpeed;
		this.vines = LEVEL.vines.map((v) => ({
			...v,
			angle: Math.sin(this.time * this.tuning.vineSpeed + v.phase) * 0.99,
		}));
		this.hazards.logs = LEVEL.logs.map((h, i) => ({
			...h,
			x: h.x + (7 - ((t * 1.7 + i * 2) % 14)),
			rotation: t * 3,
		}));
		this.hazards.crocs = LEVEL.crocs.map((h) => ({
			...h,
			open: (t + h.phase) % 5.8 > 4.05,
		}));
		this.hazards.snakes = LEVEL.snakes.map((h, i) => ({
			...h,
			x: h.x + Math.sin(t * 1.4 + i) * 0.5,
		}));
		this.hazards.scorpions = LEVEL.scorpions.map((h, i) => ({
			...h,
			x: h.x + Math.sin(t * 1.05 + i) * 2.4,
		}));
	}
	update(dt, input = {}) {
		if (this.mode !== "playing" && this.mode !== "attract") return;
		dt = Math.min(dt, 1 / 20);
		const p = this.player;
		this.time += dt;
		if (!this.dev.freezeTime && this.mode !== "attract") this.remaining -= dt;
		this.updateHazards();
		p.invuln = Math.max(0, p.invuln - dt);
		this.grabCooldown = Math.max(0, this.grabCooldown - dt);
		if (this.mode === "attract") {
			this.attract(dt);
			this.updateParticles(dt);
			return;
		}
		if (this.remaining <= 0) {
			this.complete(false, "The sun has set. Another expedition awaits.");
			return;
		}
		this.world.timestep = dt;
		this.world.step();
		const move = Math.max(-1, Math.min(1, input.x || 0)),
			vertical = input.y || 0;
		if (Math.abs(move) > 0.1) p.facing = Math.sign(move);
		if (input.jump) this.jumpBuffer = 0.16;
		else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
		this.coyote = p.grounded ? 0.12 : Math.max(0, this.coyote - dt);
		if (this.dev.noclip) {
			p.x += move * this.tuning.speed * dt;
			p.y += -vertical * this.tuning.speed * dt;
			this.teleport(p.x, p.y);
			p.grounded = false;
		} else if (p.swinging) {
			const v = this.vines[this.vineIndex];
			p.x = v.x + Math.sin(v.angle) * v.length;
			p.y = v.y - Math.cos(v.angle) * v.length - 0.9;
			p.vx =
				Math.cos(v.angle) *
				v.length *
				Math.cos(this.time * this.tuning.vineSpeed + v.phase) *
				0.99 *
				this.tuning.vineSpeed;
			p.vy =
				Math.sin(v.angle) *
				v.length *
				Math.cos(this.time * this.tuning.vineSpeed + v.phase) *
				0.99 *
				this.tuning.vineSpeed;
			if (input.jump || input.drop || input.grab) {
				p.swinging = false;
				this.collider.setEnabled(true);
				p.vx += move * 2;
				p.vy = Math.max(p.vy, 4.8);
				this.grabCooldown = 0.65;
				this.jumpBuffer = 0;
				this.emit("release");
			}
			this.body.setTranslation({ x: p.x, y: p.y + 0.825, z: 0 }, true);
			this.body.setNextKinematicTranslation({ x: p.x, y: p.y + 0.825, z: 0 });
		} else if (p.climbing) {
			p.y -= vertical * 3.8 * dt;
			p.x += move * dt * 0.7;
			p.vx = 0;
			p.vy = 0;
			p.grounded = false;
			if (input.jump) {
				p.climbing = false;
				p.vy = this.tuning.jump * 0.8;
				p.vx = move * this.tuning.speed;
				this.collider.setEnabled(true);
				this.jumpBuffer = 0;
				this.emit("jump");
			}
			if (p.y >= 0.03) {
				p.y = 0.03;
				p.climbing = false;
				p.grounded = true;
				this.collider.setEnabled(true);
			}
			if (p.y <= -5.77) {
				p.y = -5.77;
				p.climbing = false;
				p.grounded = true;
				this.collider.setEnabled(true);
			}
			this.body.setTranslation({ x: p.x, y: p.y + 0.825, z: 0 }, true);
			this.body.setNextKinematicTranslation({ x: p.x, y: p.y + 0.825, z: 0 });
		} else {
			const ladder = LEVEL.ladders.find((x) => Math.abs(x - p.x) < 1.05);
			if (
				ladder !== undefined &&
				Math.abs(vertical) > 0.35 &&
				((p.y > -0.5 && vertical > 0) || (p.y < -4.7 && vertical < 0))
			) {
				p.climbing = true;
				p.x = ladder;
				p.y = p.y > -0.5 ? -0.08 : -5.65;
				this.collider.setEnabled(false);
				this.emit("climb");
			} else {
				const accel = p.grounded ? 40 : 20;
				p.vx += (move * this.tuning.speed - p.vx) * Math.min(1, accel * dt);
				if (!move && p.grounded) p.vx *= Math.max(0, 1 - 14 * dt);
				if (this.jumpBuffer > 0 && this.coyote > 0) {
					p.vy = this.tuning.jump;
					p.grounded = false;
					this.jumpBuffer = 0;
					this.coyote = 0;
					this.stats.jumps++;
					this.emit("jump");
				}
				p.vy = Math.max(-25, p.vy - this.tuning.gravity * dt);
				this.controller.computeColliderMovement(this.collider, {
					x: p.vx * dt,
					y: p.vy * dt,
					z: 0,
				});
				const delta = this.controller.computedMovement();
				const wasGrounded = p.grounded;
				p.x += delta.x;
				p.y += delta.y;
				p.grounded = this.controller.computedGrounded();
				if (p.grounded && p.vy < 0) {
					p.vy = 0;
					if (!wasGrounded) this.emit("land");
				}
				const tr = { x: p.x, y: p.y + 0.825, z: 0 };
				this.body.setTranslation(tr, true);
				this.body.setNextKinematicTranslation(tr);
			}
			if (
				(input.grab || input.autoGrab) &&
				this.grabCooldown <= 0 &&
				!p.grounded &&
				!p.climbing
			) {
				let best = -1,
					dist = 2.7;
				this.vines.forEach((v, i) => {
					const d = Math.hypot(
						v.x + Math.sin(v.angle) * v.length - p.x,
						v.y - Math.cos(v.angle) * v.length - (p.y + 1.3),
					);
					if (d < dist) {
						dist = d;
						best = i;
					}
				});
				if (best >= 0) {
					this.vineIndex = best;
					p.swinging = true;
					p.grounded = false;
					this.collider.setEnabled(false);
					this.stats.swings++;
					this.emit("grab");
				}
			}
		}
		p.x = Math.max(-2, Math.min(285, p.x));
		this.checkWorld();
		this.updateParticles(dt);
	}
	checkWorld() {
		const p = this.player;
		for (let i = 0; i < LEVEL.checkpoints.length; i++) {
			const c = LEVEL.checkpoints[i];
			if (p.x >= c.x && i > this.checkpoint && p.y > -0.6) {
				this.checkpoint = i;
				this.health = Math.min(3, this.health + 1);
				this.visited.add(i);
				this.emit("checkpoint", { name: c.name });
			}
		}
		for (const r of LEVEL.relics) {
			if (
				!this.collected.has(r.id) &&
				Math.hypot(p.x - r.x, p.y + 0.7 - r.y) < 1.5
			) {
				this.collected.add(r.id);
				this.score += 1000 + Math.floor(this.remaining);
				this.stats.treasures++;
				this.burst(r.x, r.y, 0xffcf55, 25);
				this.emit("relic", { name: r.name, id: r.id });
			}
		}
		const goldSpots = [
			10, 26, 46, 63, 87, 105, 136, 153, 161, 185, 202, 231, 249, 271,
		];
		goldSpots.forEach((x, i) => {
			const y = i === 5 || i === 10 ? -5.3 : 0.6;
			if (!this.coins.has(i) && Math.hypot(p.x - x, p.y + 0.5 - y) < 1) {
				this.coins.add(i);
				this.score += 75;
				this.burst(x, y, 0xfadc76, 8);
				this.emit("coin");
			}
		});
		if (!this.dev.invincible && p.invuln <= 0) {
			let cause = "";
			for (const h of this.hazards.logs)
				if (Math.abs(p.x - h.x) < 0.95 && p.y < 0.8 && p.y > -0.8)
					cause = "A rolling log!";
			for (const h of [...this.hazards.snakes, ...this.hazards.scorpions])
				if (Math.abs(p.x - h.x) < 0.8 && p.y - h.y < 0.75 && p.y - h.y > -0.65)
					cause = "Mind the wildlife!";
			for (const h of this.hazards.crocs)
				if (h.open && Math.abs(p.x - h.x) < 1.2 && p.y < 0.8 && p.y > -0.7)
					cause = "Those are not stepping stones!";
			const overMire = p.x > 116 && p.x < 130;
			if (overMire && p.y < -0.65)
				cause = "Tar takes its time. You should not.";
			if (p.y < -9) cause = "A little too much pit.";
			if (cause) this.hurt(cause);
		} else if (p.y < -9) this.respawn();
		if (p.x >= 278 && p.y > -0.5) {
			if (this.collected.size === 6)
				this.complete(true, "Six treasures. One very good story.");
			else if (!this.exitNotice || this.time - this.exitNotice > 7) {
				this.exitNotice = this.time;
				this.emit("notice", {
					text: `${6 - this.collected.size} sun relic${this.collected.size === 5 ? "" : "s"} still out there. Check your field map.`,
				});
			}
		}
	}
	hurt(cause) {
		this.health--;
		this.score = Math.max(0, this.score - 150);
		this.remaining = Math.max(1, this.remaining - 5);
		this.deaths++;
		this.stats.falls++;
		this.burst(this.player.x, this.player.y + 0.8, 0xff745b, 16);
		this.emit("hurt", { text: cause });
		if (this.health <= 0) {
			this.health = 3;
			this.score = Math.max(0, this.score - 200);
			this.emit("rescue");
		}
		this.respawn();
	}
	respawn() {
		const c = LEVEL.checkpoints[this.checkpoint];
		this.teleport(c.x + 1, 0.05);
		this.player.invuln = 2.6;
		this.grabCooldown = 0.5;
	}
	burst(x, y, color, count) {
		for (let i = 0; i < count; i++) {
			const a = (i / count) * Math.PI * 2;
			this.particles.push({
				x,
				y,
				z: 0.4,
				color,
				life: 1.1,
				size: 0.08 + (i % 3) * 0.03,
				vx: Math.cos(a) * (1 + (i % 4)),
				vy: Math.sin(a) * 3 + 2,
			});
		}
	}
	updateParticles(dt) {
		for (const f of this.particles) {
			f.life -= dt;
			f.x += f.vx * dt;
			f.y += f.vy * dt;
			f.vy -= 6 * dt;
		}
		this.particles = this.particles.filter((f) => f.life > 0);
	}
	complete(won, reason) {
		if (this.finished) return;
		this.finished = true;
		this.mode = "results";
		this.reason = reason;
		this.won = won;
		if (won) this.score += Math.floor(this.remaining * 10) + this.health * 250;
		this.emit("finish", { won });
	}
	attract(dt) {
		this.attractTime += dt;
		const t = this.attractTime;
		const route = [
			{ x: 17, y: 0.05, d: 5 },
			{ x: 36, y: 2.5, d: 5 },
			{ x: 74, y: 1.5, d: 5 },
			{ x: 84, y: 0.03, d: 3 },
			{ x: 99, y: -5.7, d: 6 },
			{ x: 123, y: 2.8, d: 5 },
			{ x: 153, y: 0.05, d: 4 },
			{ x: 173, y: 2.7, d: 4 },
			{ x: 195, y: -5.7, d: 6 },
			{ x: 217, y: 1.5, d: 5 },
			{ x: 267, y: 0.03, d: 5 },
			{ x: 279, y: 0.03, d: 4 },
		];
		let rem = t,
			index = 0;
		while (rem > route[index].d) {
			rem -= route[index].d;
			index++;
			if (index >= route.length) {
				this.start(true);
				return;
			}
		}
		const a = index ? route[index - 1] : { x: 3, y: 0.03 };
		const b = route[index];
		const q = Math.min(1, rem / b.d);
		const e = q * q * (3 - 2 * q);
		this.player.x = a.x + (b.x - a.x) * e;
		this.player.y =
			a.y + (b.y - a.y) * e + (b.y > 1 ? Math.sin(q * Math.PI) * 1.5 : 0);
		this.player.vx = 4;
		this.player.grounded = this.player.y > -0.1 && this.player.y < 0.2;
		this.player.facing = 1;
		this.player.climbing = b.y < -1 && q < 0.3;
		this.player.swinging = b.y > 2 && q > 0.2 && q < 0.8;
		for (const r of LEVEL.relics)
			if (Math.abs(this.player.x - r.x) < 2) this.collected.add(r.id);
	}
	context() {
		const p = this.player;
		if (p.swinging) return { text: "Release the vine", action: "jump" };
		if (p.climbing || LEVEL.ladders.some((x) => Math.abs(x - p.x) < 1.5))
			return {
				text: p.y < -3 ? "Climb to daylight" : "Explore below",
				action: "climb",
			};
		if (
			this.vines.some(
				(v) =>
					Math.hypot(
						v.x + Math.sin(v.angle) * v.length - p.x,
						v.y - Math.cos(v.angle) * v.length - (p.y + 1),
					) < 4,
			)
		)
			return { text: "Catch the vine", action: "grab" };
		return null;
	}
	snapshot() {
		return {
			mode: this.mode,
			time: this.time,
			remaining: this.remaining,
			player: { ...this.player },
			score: this.score,
			health: this.health,
			collected: [...this.collected],
			checkpoint: this.checkpoint,
			finished: this.finished,
			won: this.won,
			stats: { ...this.stats },
			tuning: { ...this.tuning },
			dev: { ...this.dev },
			physics: {
				bodies: this.world.bodies.len(),
				colliders: this.world.colliders.len(),
				engine: "Rapier 0.19.3",
			},
		};
	}
}
