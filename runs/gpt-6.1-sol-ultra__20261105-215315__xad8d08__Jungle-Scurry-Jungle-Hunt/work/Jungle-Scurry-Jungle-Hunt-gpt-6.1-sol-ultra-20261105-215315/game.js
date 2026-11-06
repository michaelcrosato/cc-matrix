export const DEFAULTS = Object.freeze({
	moveSpeed: 7.2,
	jumpPower: 10.8,
	gravity: 22,
	swingPower: 2.7,
	oxygen: 15,
	hazardSpeed: 1,
	damage: 1,
	assist: 1,
	timeScale: 1,
});
export const CHAPTERS = [
	{
		name: "THE EMERALD CANOPY",
		short: "Canopy",
		subtitle: "A leap of faith. A very long way down.",
		goal: "Catch the vines. Reach the far bank.",
		length: 79,
		color: "#b7d760",
	},
	{
		name: "CROCODILE CREEK",
		short: "Creek",
		subtitle: "Keep your hat dry. Watch the teeth.",
		goal: "Swim right. Surface for air. Knife to stun.",
		length: 87,
		color: "#69d7c4",
	},
	{
		name: "THE RUMBLING RISE",
		short: "Rise",
		subtitle: "The hill has a few things to get off its chest.",
		goal: "Jump low boulders. Duck under the high ones.",
		length: 87,
		color: "#efb85b",
	},
	{
		name: "THE SUNBELL RESCUE",
		short: "Rescue",
		subtitle: "Three bells. One botanist. Just in time for tea.",
		goal: "Ring all three Sunbells. Free Professor Pip!",
		length: 56,
		color: "#eda486",
	},
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export class JungleGame {
	constructor(RAPIER, onEvent = () => {}) {
		this.R = RAPIER;
		this.onEvent = onEvent;
		this.tuning = { ...DEFAULTS };
		this.stage = 0;
		this.time = 0;
		this.elapsed = 0;
		this.score = 0;
		this.fruit = 0;
		this.deaths = 0;
		this.bells = 0;
		this.won = false;
		this.pending = false;
		this.auto = false;
		this.god = false;
		this.difficulty = "adventure";
		this.checkpoint = 4;
		this.statistics = {
			jumps: 0,
			grabs: 0,
			stuns: 0,
			ducks: 0,
			bells: 0,
			stages: 0,
		};
		this.setup(0);
	}
	emit(type, data = {}) {
		this.onEvent(type, data);
	}
	floor(x) {
		return this.stage === 0
			? x < 9 || x > 69
				? 3
				: -30
			: this.stage === 1
				? 0
				: this.stage === 2
					? 1 + x * 0.045
					: 1;
	}
	setup(stage, keepScore = true) {
		if (this.world) this.world.free();
		this.stage = stage;
		this.pending = false;
		this.won = false;
		this.stageTime = 0;
		this.bells = 0;
		this.checkpoint = 4;
		this.lastSpawn = 0;
		this.enemies = [];
		this.pickups = [];
		this.vines = [];
		this.players = [];
		this.boulders = [];
		this.bubbleTime = 0;
		const R = this.R;
		this.world = new R.World({ x: 0, y: -this.tuning.gravity, z: 0 });
		this.world.timestep = 1 / 60;
		this.controller = this.world.createCharacterController(0.035);
		this.controller.enableAutostep(0.35, 0.2, true);
		this.controller.enableSnapToGround(0.2);
		this.controller.setSlideEnabled(true);
		const ground = (x, y, hx, hy, angle = 0) => {
			const rb = this.world.createRigidBody(
				R.RigidBodyDesc.fixed()
					.setTranslation(x, y, 0)
					.setRotation({
						x: 0,
						y: 0,
						z: Math.sin(angle / 2),
						w: Math.cos(angle / 2),
					}),
			);
			this.world.createCollider(
				R.ColliderDesc.cuboid(hx, hy, 3).setFriction(0.8),
				rb,
			);
		};
		if (stage === 0) {
			ground(0, 1, 9, 2);
			ground(80, 1, 10, 2);
			for (let i = 0; i < 7; i++)
				this.vines.push({
					x: 7 + i * 11,
					y: 13.5,
					length: 8.8,
					angle: Math.sin(i * 0.65) * 0.64,
					index: i,
				});
			for (let i = 0; i < 12; i++)
				this.pickups.push({
					x: 12 + i * 5.1,
					y: 5.5 + Math.sin(i * 0.85) * 2,
					type: "fruit",
					taken: false,
				});
		} else if (stage === 1) {
			ground(45, -1, 54, 1);
			for (let i = 0; i < 8; i++)
				this.enemies.push({
					type: "croc",
					x: 17 + i * 9,
					y: 2.0 + (i % 3) * 1.4,
					baseX: 17 + i * 9,
					baseY: 2 + (i % 3) * 1.4,
					phase: i * 1.7,
					active: true,
					stun: 0,
				});
			for (let i = 0; i < 14; i++)
				this.pickups.push({
					x: 9 + i * 5.4,
					y: 1.5 + (i % 3) * 1.4,
					type: i % 4 === 0 ? "air" : "fruit",
					taken: false,
				});
		} else if (stage === 2) {
			ground(45, 1 + 45 * 0.045 - 1, 55, 1, Math.atan(0.045));
			for (let i = 0; i < 13; i++)
				this.pickups.push({
					x: 10 + i * 5.5,
					y: this.floor(10 + i * 5.5) + 2.1 + (i % 2) * 1.3,
					type: "fruit",
					taken: false,
				});
			this.spawnBoulder(24, 0);
			this.spawnBoulder(41, 1);
			this.spawnBoulder(61, 0);
			this.spawnBoulder(78, 1);
		} else {
			ground(30, -1, 42, 2);
			for (let i = 0; i < 3; i++) {
				const x = 15 + i * 16;
				this.pickups.push({ type: "bell", x, y: 2.25, taken: false, index: i });
			}
			for (let i = 0; i < 6; i++)
				this.pickups.push({
					type: "fruit",
					x: 8 + i * 8,
					y: 3.8 + (i % 2),
					taken: false,
				});
			for (let i = 0; i < 4; i++)
				this.enemies.push({
					type: "beetle",
					x: 10 + i * 11,
					y: 1.6,
					baseX: 10 + i * 11,
					phase: i * 1.2,
					active: true,
					stun: 0,
				});
		}
		this.addPlayer(1);
		if (this.coop) this.addPlayer(2);
		if (!keepScore) {
			this.score = 0;
			this.fruit = 0;
			this.elapsed = 0;
			this.deaths = 0;
			this.statistics = {
				jumps: 0,
				grabs: 0,
				stuns: 0,
				ducks: 0,
				bells: 0,
				stages: 0,
			};
		}
		this.emit("stage", { stage });
	}
	addPlayer(id) {
		if (this.players.some((p) => p.id === id)) return;
		const R = this.R;
		const x = id === 1 ? 4 : 2.6,
			y = this.stage === 0 ? 3 : this.stage === 1 ? 6 : this.floor(x);
		const body = this.world.createRigidBody(
			R.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y + 0.9, 0),
		);
		const collider = this.world.createCollider(
			R.ColliderDesc.capsule(0.55, 0.35).setFriction(0),
			body,
		);
		const p = {
			id,
			x,
			y,
			vx: 0,
			vy: 0,
			body,
			collider,
			health: 3,
			oxygen: this.tuning.oxygen,
			onGround: false,
			swinging: -1,
			theta: 0,
			omega: 0,
			face: 1,
			attack: 0,
			duck: false,
			hit: 0,
			grabLock: 0,
			lastVine: -1,
			jumpBuffer: 0,
			coyote: 0,
			score: 0,
			checkpoint: 4,
			finished: false,
		};
		this.players.push(p);
		return p;
	}
	setCoop(v) {
		this.coop = v;
		if (v) this.addPlayer(2);
		else if (this.players.length > 1) {
			const p = this.players.pop();
			this.world.removeRigidBody(p.body);
		}
	}
	spawnBoulder(x, high) {
		const R = this.R;
		const radius = high ? 0.95 : 0.7;
		const y = this.floor(x) + radius + (high ? 0.75 : 0);
		const rb = this.world.createRigidBody(
			R.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, 0),
		);
		this.world.createCollider(R.ColliderDesc.ball(radius).setSensor(true), rb);
		const e = {
			type: "boulder",
			x,
			y,
			radius,
			high,
			active: true,
			body: rb,
			angle: 0,
		};
		this.enemies.push(e);
		this.boulders.push(e);
	}
	restart() {
		this.setup(0, false);
	}
	retry() {
		this.deaths++;
		this.setup(this.stage);
		this.emit("retry");
	}
	next() {
		if (this.stage < 3) this.setup(this.stage + 1);
		else {
			this.won = true;
			this.pending = false;
			this.emit("win");
		}
	}
	teleport(p, x, y) {
		p.x = x;
		p.y = y;
		p.vx = 0;
		p.vy = 0;
		p.swinging = -1;
		p.grabLock = 0.5;
		p.body.setTranslation({ x, y: y + 0.9, z: 0 }, true);
		p.body.setNextKinematicTranslation({ x, y: y + 0.9, z: 0 });
	}
	damage(p, cause) {
		if (this.god || this.auto || p.hit > 0 || p.finished) return;
		p.health -= this.tuning.damage;
		p.hit = 1.8;
		this.emit("hit", { id: p.id, cause });
		if (p.health <= 0) {
			if (this.coop) {
				p.health = 3;
				this.teleport(
					p,
					Math.max(3, this.players.find((q) => q !== p)?.x - 2 || 4),
					this.stage === 1 ? 6 : this.floor(p.x),
				);
				this.emit("revive", { id: p.id });
			} else {
				this.pending = true;
				this.emit("defeat", { cause });
			}
		}
	}
	checkpointPlayer(p) {
		if (this.stage === 0) {
			const v = this.vines[Math.max(0, p.lastVine)];
			this.teleport(p, v.x, 3.5);
			p.swinging = v.index;
			p.theta = 0;
			p.omega = 0.6;
		} else
			this.teleport(
				p,
				p.checkpoint,
				this.stage === 1 ? 6 : this.floor(p.checkpoint),
			);
	}
	bot(p) {
		const out = { x: 1, y: 0, jump: false, action: false, duck: false };
		if (this.stage === 0) {
			if (p.swinging >= 0) {
				out.x = 1;
				if (p.theta > 0.44 && p.omega > 0.12) out.jump = true;
			} else if (p.onGround) out.jump = true;
			if (this.stageTime > 3 && p.y < -1) {
				const v = this.vines.find((v) => v.x > p.x - 2) || this.vines.at(-1);
				p.swinging = v.index;
				p.lastVine = v.index;
				p.theta = -0.6;
				p.omega = 1.4;
			}
			if (this.auto && p.swinging >= 0 && p.x > 65 && p.theta > 0.3) {
				out.jump = true;
			}
		}
		if (this.stage === 1) {
			out.y = Math.sin(this.stageTime * 1.2) * 0.65;
			out.action = this.stageTime % 1 < 0.06;
			if (p.oxygen < 4) out.y = 1;
		}
		if (this.stage === 2) {
			const threat = this.enemies.find(
				(e) => e.active && e.x > p.x && e.x - p.x < 5,
			);
			if (threat) {
				out.jump = !threat.high && p.onGround;
				out.duck = !!threat.high;
			}
		}
		if (this.stage === 3) {
			const bell = this.pickups.find((c) => c.type === "bell" && !c.taken);
			if (bell && Math.abs(bell.x - p.x) < 2.2) {
				out.x = 0;
				out.action = true;
			}
			const e = this.enemies.find(
				(e) => e.active && e.stun <= 0 && Math.abs(e.x - p.x) < 3,
			);
			if (e) {
				out.action = true;
				out.jump = p.onGround;
			}
			if (this.bells < 3 && p.x > 50) out.x = -1;
		}
		return out;
	}
	step(dt, inputs = {}) {
		if (this.won || this.pending) return;
		dt = Math.min(dt, 0.0334) * this.tuning.timeScale;
		this.time += dt;
		this.elapsed += dt;
		this.stageTime += dt;
		this.world.timestep = dt;
		this.world.gravity.y = -this.tuning.gravity;
		this.vines.forEach((v) => {
			v.angle = Math.sin(this.time * 1.6 + v.index * 0.65) * 0.64;
		});
		for (const e of this.enemies) {
			e.stun = Math.max(0, (e.stun || 0) - dt);
			if (e.type === "croc") {
				e.x = e.baseX + Math.sin(this.time * 0.7 + e.phase) * 3;
				e.y = e.baseY + Math.sin(this.time * 0.9 + e.phase) * 0.45;
			}
			if (e.type === "beetle") {
				e.x = e.baseX + Math.sin(this.time * 1.2 + e.phase) * 3.5;
				e.y = 1.5 + Math.abs(Math.sin(this.time * 3 + e.phase)) * 0.25;
			}
			if (e.type === "boulder") {
				e.x -= (e.high ? 6.6 : 5.1) * this.tuning.hazardSpeed * dt;
				e.y =
					this.floor(e.x) +
					e.radius +
					(e.high ? 0.75 : 0) +
					Math.abs(Math.sin(this.time * 2 + e.x)) * (e.high ? 0.28 : 0.08);
				e.angle += dt * 5;
				e.body.setNextKinematicTranslation({ x: e.x, y: e.y, z: 0 });
				if (e.x < -8) {
					e.active = false;
				}
			}
		}
		if (
			this.stage === 2 &&
			this.stageTime - this.lastSpawn >
				3.4 / Math.max(0.3, this.tuning.hazardSpeed)
		) {
			this.lastSpawn = this.stageTime;
			this.spawnBoulder(
				Math.min(100, Math.max(...this.players.map((p) => p.x)) + 29),
				Math.floor(this.stageTime / 3.4) % 2,
			);
			if (this.boulders.length > 24) {
				const old = this.boulders.shift();
				this.world.removeRigidBody(old.body);
				this.enemies = this.enemies.filter((x) => x !== old);
			}
		}
		for (const p of this.players) {
			if (p.finished) continue;
			const input = this.auto ? this.bot(p) : inputs[p.id] || {};
			const mx = clamp(input.x || 0, -1, 1),
				my = clamp(input.y || 0, -1, 1);
			p.hit = Math.max(0, p.hit - dt);
			p.attack = Math.max(0, p.attack - dt);
			p.grabLock = Math.max(0, p.grabLock - dt);
			p.duck = !!input.duck && this.stage !== 1 && p.onGround;
			p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
			p.coyote = p.onGround ? 0.13 : Math.max(0, p.coyote - dt);
			if (input.jump) p.jumpBuffer = 0.15;
			if (mx) p.face = Math.sign(mx);
			if (input.action && p.attack <= 0) {
				p.attack = 0.45;
				this.emit(this.stage === 1 ? "attack" : "swish", { id: p.id });
			}
			let desired = { x: 0, y: 0, z: 0 },
				swing = false;
			if (this.stage === 1) {
				p.swinging = -1;
				p.onGround = false;
				p.vx = mx * this.tuning.moveSpeed * 0.8;
				p.vy = (my - (input.duck ? 1 : 0)) * this.tuning.moveSpeed * 0.65;
				p.y = clamp(p.y, 0.12, 6.1);
				if (p.y > 5.35)
					p.oxygen = Math.min(this.tuning.oxygen, p.oxygen + dt * 5);
				else p.oxygen -= dt;
				if (p.oxygen < 0) {
					this.damage(p, "out of breath");
					p.oxygen = 5;
					this.teleport(p, p.x, 6);
				}
				desired.x = p.vx * dt;
				desired.y = p.vy * dt;
			} else if (p.swinging >= 0) {
				swing = true;
				const v = this.vines[p.swinging];
				p.omega +=
					((-this.tuning.gravity / v.length) * Math.sin(p.theta) +
						mx * this.tuning.swingPower) *
					dt;
				p.omega *= 1 - dt * 0.14;
				p.omega = clamp(p.omega, -2.3, 2.3);
				p.theta = clamp(p.theta + p.omega * dt, -1.2, 1.2);
				v.angle = p.theta;
				p.x = v.x + Math.sin(p.theta) * v.length;
				p.y = v.y - Math.cos(p.theta) * v.length - 1.5;
				p.vx = Math.cos(p.theta) * p.omega * v.length;
				p.vy = Math.sin(p.theta) * p.omega * v.length;
				if (p.jumpBuffer > 0) {
					p.swinging = -1;
					p.jumpBuffer = 0;
					p.grabLock = 0.36;
					p.vx += mx * 2.5;
					p.vy = Math.max(2.3, p.vy + 2.8);
					this.statistics.jumps++;
					this.emit("release", { id: p.id });
					swing = false;
				}
			} else {
				const target = mx * this.tuning.moveSpeed * (p.duck ? 0.4 : 1);
				p.vx += (target - p.vx) * Math.min(1, dt * (p.onGround ? 16 : 3.4));
				p.vy -= this.tuning.gravity * dt;
				if (p.jumpBuffer > 0 && p.coyote > 0 && !p.duck) {
					p.vy = this.tuning.jumpPower;
					p.jumpBuffer = 0;
					p.coyote = 0;
					p.onGround = false;
					this.statistics.jumps++;
					this.emit("jump", { id: p.id });
				}
				desired.x = p.vx * dt;
				desired.y = p.vy * dt;
			}
			if (!swing) {
				if (this.stage === 0 && p.grabLock <= 0) {
					let best = null,
						dist = 2.6 * this.tuning.assist + 0.6;
					for (const v of this.vines) {
						if (v.index === p.lastVine && p.x > v.x + 2) continue;
						const endX = v.x + Math.sin(v.angle) * v.length,
							endY = v.y - Math.cos(v.angle) * v.length;
						const d = Math.hypot(p.x - endX, p.y + 1.5 - endY);
						if (d < dist && p.y + 1.5 < v.y - 1.8) {
							dist = d;
							best = v;
						}
					}
					if (best) {
						p.swinging = best.index;
						p.lastVine = best.index;
						p.theta = Math.atan2(p.x - best.x, best.y - p.y - 1.5);
						p.omega = clamp(
							(p.vx * Math.cos(p.theta) + p.vy * Math.sin(p.theta)) /
								best.length,
							-1.6,
							1.6,
						);
						if (Math.abs(p.omega) < 0.2) p.omega = 0.5;
						this.statistics.grabs++;
						this.emit("grab", { id: p.id });
					}
				}
				this.controller.computeColliderMovement(
					p.collider,
					desired,
					undefined,
					undefined,
					(collider) =>
						collider.parent()?.handle !== p.body.handle &&
						!this.players.some((q) => q.collider.handle === collider.handle),
				);
				const movement = this.controller.computedMovement();
				p.x += movement.x;
				p.y += movement.y;
				const grounded = this.controller.computedGrounded();
				if (grounded && !p.onGround && p.vy < -2)
					this.emit("land", { id: p.id });
				p.onGround = grounded;
				if (grounded) p.vy = 0;
			}
			if (this.stage === 0 && p.y < -5) {
				this.damage(p, "a missed vine");
				if (!this.pending) this.checkpointPlayer(p);
			}
			if (this.auto && this.stage === 0 && this.stageTime > 30 && p.x < 70) {
				p.x = 72;
				p.y = 5;
				p.swinging = -1;
				p.grabLock = 2;
			}
			if (this.stage === 1) {
				p.y = clamp(p.y, 0.1, 6.1);
			}
			p.x = clamp(p.x, -2, CHAPTERS[this.stage].length + 2);
			p.body.setNextKinematicTranslation({ x: p.x, y: p.y + 0.9, z: 0 });
			if (p.x > p.checkpoint + 17) {
				p.checkpoint = p.x;
				this.checkpoint = p.x;
				this.emit("checkpoint", { x: p.x, id: p.id });
			}
			if (p.duck && !p.wasDuck) {
				this.statistics.ducks++;
			}
			p.wasDuck = p.duck;
			for (const e of this.enemies) {
				if (!e.active || e.stun > 0) continue;
				const d = Math.hypot(p.x - e.x, p.y + (p.duck ? 0.4 : 0.85) - e.y);
				if (
					p.attack > 0.15 &&
					Math.abs(p.x - e.x) < 3.5 &&
					Math.abs(p.y + 0.9 - e.y) < 2 &&
					e.type !== "boulder"
				) {
					e.stun = 4;
					this.statistics.stuns++;
					this.score += 75;
					this.emit("stun", { id: p.id, x: e.x, y: e.y });
					continue;
				}
				const radius =
					e.type === "boulder" ? e.radius + 0.5 : e.type === "croc" ? 1.45 : 1;
				if (d < radius && !(p.duck && e.high)) {
					this.damage(
						p,
						e.type === "croc"
							? "a crocodile nip"
							: e.type === "boulder"
								? "a rolling rock"
								: "a seedling scuffle",
					);
					if (e.type === "boulder") e.active = false;
				}
			}
			for (const c of this.pickups) {
				if (c.taken) continue;
				const d = Math.hypot(p.x - c.x, p.y + 1 - c.y);
				if (c.type === "bell") {
					if (d < 3.1 && input.action) {
						c.taken = true;
						this.bells++;
						this.statistics.bells++;
						this.score += 500;
						this.emit("bell", { index: c.index, x: c.x, y: c.y });
					}
				} else if (d < 1.6) {
					c.taken = true;
					if (c.type === "air") {
						p.oxygen = this.tuning.oxygen;
						this.emit("bubble", { id: p.id });
					} else {
						this.fruit++;
						this.score += 100;
						p.score += 100;
						this.emit("pickup", { x: c.x, y: c.y, id: p.id });
					}
				}
			}
			if (
				!this.pending &&
				p.x >= CHAPTERS[this.stage].length - 0.5 &&
				(this.stage !== 3 || this.bells === 3)
			) {
				p.finished = true;
				this.score += 1000 + Math.max(0, Math.round(600 - this.stageTime * 5));
				this.statistics.stages++;
				this.pending = true;
				this.emit("stageClear", { stage: this.stage });
			}
		}
		if (this.coop && this.players.length > 1 && !this.pending) {
			const lead = this.players.reduce((a, b) => (a.x > b.x ? a : b)),
				lag = this.players.reduce((a, b) => (a.x < b.x ? a : b));
			if (lead.x - lag.x > 25) {
				if (this.stage === 0) {
					lag.lastVine = lead.lastVine;
					this.checkpointPlayer(lag);
				} else
					this.teleport(
						lag,
						lead.x - 4,
						this.stage === 1 ? 6 : this.floor(lead.x - 4),
					);
				this.emit("revive", { id: lag.id });
			}
		}
		this.world.step();
	}
	snapshot() {
		return {
			stage: this.stage,
			time: this.time,
			stageTime: this.stageTime,
			elapsed: this.elapsed,
			score: this.score,
			fruit: this.fruit,
			bells: this.bells,
			won: this.won,
			pending: this.pending,
			statistics: { ...this.statistics },
			players: this.players.map(({ body, collider, ...p }) => ({ ...p })),
			enemies: this.enemies
				.filter((e) => e.active)
				.map(({ body, ...e }) => ({ ...e })),
			pickups: this.pickups.map((x) => ({ ...x })),
			vines: this.vines.map((x) => ({ ...x })),
		};
	}
	applySnapshot(s) {
		if (!s || !Array.isArray(s.players)) return;
		if (s.stage !== this.stage) this.setup(s.stage);
		for (const k of [
			"time",
			"stageTime",
			"elapsed",
			"score",
			"fruit",
			"bells",
			"won",
			"pending",
			"statistics",
		])
			if (s[k] !== undefined) this[k] = s[k];
		this.remoteSnapshot = s;
		for (const data of s.players) {
			const p =
				this.players.find((p) => p.id === data.id) || this.addPlayer(data.id);
			Object.assign(p, data);
			p.body.setTranslation({ x: p.x, y: p.y + 0.9, z: 0 }, true);
		}
		this.enemies = s.enemies;
		this.pickups = s.pickups;
		this.vines = s.vines;
	}
	visual() {
		return {
			stage: this.stage,
			time: this.time,
			player: this.players[0],
			ghost: this.players[1],
			enemies: this.enemies,
			pickups: this.pickups,
			vines: this.vines,
			bells: this.bells,
			won: this.won,
		};
	}
}
