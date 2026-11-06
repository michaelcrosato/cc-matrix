import RAPIER from "@dimforge/rapier2d-compat";

export const DEFAULTS = Object.freeze({
	speed: 6.2,
	jump: 16.8,
	gravity: 27,
	enemySpeed: 1.65,
	stunTime: 9,
	spawnRate: 1,
	invincible: false,
});
export const PLATFORMS = [
	{ x: 0, y: 0, w: 25 },
	{ x: -7.5, y: 4, w: 9 },
	{ x: 7.5, y: 4, w: 9 },
	{ x: 0, y: 8, w: 15 },
	{ x: -8, y: 12, w: 8 },
	{ x: 8, y: 12, w: 8 },
];
export const SHIFTS = [
	{
		name: "FIRST THINGS THIRST",
		subtitle: "Bump the floor. Boot the beetles.",
		types: ["beetle", "beetle", "beetle", "beetle", "beetle"],
	},
	{
		name: "SHELL SHOCK",
		subtitle: "Crabs need two bumps. Don’t let them get comfy.",
		types: ["beetle", "crab", "beetle", "crab", "crab", "beetle"],
	},
	{
		name: "LOOSE CHANGE",
		subtitle: "A little overtime. Grab all 18 brass tokens!",
		bonus: true,
		time: 24,
	},
	{
		name: "THE NIGHT SHIFT",
		subtitle: "Slippery boots. Fireflies. Same old plumbing.",
		types: ["fly", "beetle", "crab", "fly", "crab", "fly", "beetle"],
		ice: true,
	},
	{
		name: "THE BIG CLOG",
		subtitle: "Three bumps crack the boss. Then give it the boot.",
		types: ["boss", "beetle", "crab", "fly", "beetle"],
	},
];
export async function initPhysics() {
	await RAPIER.init();
	return RAPIER;
}
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export class Game {
	constructor(onEvent = () => {}) {
		this.emit = onEvent;
		this.settings = { ...DEFAULTS };
		this.serial = 0;
		this.reset(1);
	}
	reset(count = 1) {
		this.world?.free();
		this.world = new RAPIER.World({ x: 0, y: -this.settings.gravity });
		this.world.timestep = 1 / 60;
		for (const q of PLATFORMS) {
			const body = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.fixed().setTranslation(q.x, q.y - 0.3),
			);
			this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(q.w / 2, 0.3)
					.setFriction(0)
					.setCollisionGroups(0x00010006),
				body,
			);
		}
		const pressureBody = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.fixed().setTranslation(0, 2.45),
		);
		this.pressureCollider = this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(1.075, 0.6)
				.setFriction(0)
				.setCollisionGroups(0x00010004),
			pressureBody,
		);
		this.nextTimer = 0;
		this.demoTimer = 0;
		this.time = 0;
		this.score = 0;
		this.lives = 5;
		this.phase = 1;
		this.combo = 0;
		this.comboTime = 0;
		this.powCharges = 2;
		this.powCooldown = 0;
		this.shake = 0;
		this.ended = false;
		this.won = false;
		this.attract = false;
		this.stats = {
			bumps: 0,
			kicks: 0,
			coins: 0,
			pows: 0,
			hits: 0,
			bossHits: 0,
			bonusCoins: 0,
		};
		this.players = [];
		this.enemies = [];
		this.coins = [];
		this.particles = [];
		for (let i = 0; i < 2; i++) {
			let p = {
				id: i,
				x: i ? 2 : -2,
				y: 0.7,
				vx: 0,
				vy: 0,
				face: i ? -1 : 1,
				grounded: true,
				hurt: 0,
				active: i < count,
				dead: false,
				coyote: 0,
				buffer: 0,
				lastJump: false,
				lastAction: false,
			};
			p.body = this.body(p.x, p.y, 0.29, 0.3, 0x00040001);
			this.players.push(p);
		}
		this.enterPhase(1);
		return this;
	}
	body(x, y, halfHeight, radius, groups) {
		let b = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(x, y)
				.lockRotations()
				.setCcdEnabled(true),
		);
		this.world.createCollider(
			RAPIER.ColliderDesc.capsule(halfHeight, radius)
				.setFriction(0)
				.setRestitution(0)
				.setCollisionGroups(groups),
			b,
		);
		return b;
	}
	setPlayers(count) {
		this.players.forEach((p, i) => {
			p.active = i < count;
			p.body.setEnabled(p.active);
		});
	}
	enterPhase(n) {
		for (const e of this.enemies) this.world.removeRigidBody(e.body);
		this.enemies = [];
		this.coins = [];
		this.phase = n;
		this.nextTimer = 0;
		this.phaseTime = 0;
		this.phaseDelay = 2.6;
		this.spawnIndex = 0;
		this.spawnTimer = 1;
		this.bonusCollected = 0;
		this.banner = SHIFTS[n - 1].name;
		this.bannerTime = 3;
		if (n > 1) this.powCharges = Math.min(3, this.powCharges + 1);
		this.players.forEach((p, i) => {
			p.body.setTranslation({ x: i ? 2 : -2, y: 0.7 }, true);
			p.body.setLinvel({ x: 0, y: 0 }, true);
			p.hurt = 2;
		});
		if (SHIFTS[n - 1].bonus) {
			for (let i = 0; i < 18; i++) {
				const platform = PLATFORMS[1 + (i % 5)];
				this.coins.push({
					id: ++this.serial,
					x: platform.x + ((Math.floor(i / 5) % 4) - 1.5) * 1.45,
					y: platform.y + 1.1,
					vx: 0,
					vy: 0,
					static: true,
					life: 99,
				});
			}
		}
		this.emit("phase", { phase: n, name: this.banner });
	}
	spawn(type = "beetle", x, y) {
		const side = this.spawnIndex % 2 ? 1 : -1;
		const size = type === "boss" ? 0.73 : 0.38;
		let e = {
			id: ++this.serial,
			type,
			x: x ?? side * 10.5,
			y: y ?? 13.4,
			vx: -side * this.settings.enemySpeed,
			vy: 0,
			face: -side,
			flipped: false,
			stun: 0,
			angry: false,
			hp: type === "boss" ? 3 : type === "crab" ? 2 : 1,
			tell: 1.2,
			grounded: false,
		};
		e.body = this.body(
			e.x,
			e.y,
			type === "boss" ? 0.3 : 0.12,
			size,
			0x00020001,
		);
		this.enemies.push(e);
		this.emit("spawn", e);
		return e;
	}
	supported(e, r = 0.6) {
		return (
			PLATFORMS.some(
				(q) =>
					Math.abs(e.x - q.x) < q.w / 2 + 0.12 &&
					Math.abs(e.y - r - q.y) < 0.16 &&
					e.vy < 0.8,
			) ||
			(this.powCharges > 0 &&
				Math.abs(e.x) < 1.18 &&
				Math.abs(e.y - r - 3.05) < 0.16 &&
				e.vy < 0.8)
		);
	}
	bump(x, top, global = false) {
		this.stats.bumps++;
		this.shake = Math.max(this.shake, 0.16);
		this.emit("bump", { x, y: top });
		let hit = 0;
		for (const e of this.enemies) {
			if (
				(global ||
					(Math.abs(e.x - x) < 2.65 &&
						Math.abs(e.y - (top + (e.type === "boss" ? 1 : 0.5))) < 1.2)) &&
				(!global || e.grounded || e.type === "fly")
			) {
				this.flip(e);
				hit++;
			}
		}
		for (const c of this.coins) {
			if (!c.static && Math.abs(c.x - x) < 2.5 && Math.abs(c.y - top) < 2)
				c.vy = 8;
		}
		return hit;
	}
	flip(e) {
		if (e.flipped) {
			e.stun = this.settings.stunTime;
			return;
		}
		e.hp--;
		if (e.type === "boss") this.stats.bossHits++;
		if (e.hp > 0) {
			e.angry = true;
			e.tell = 0.7;
			e.body.setLinvel({ x: 0, y: 4 }, true);
			this.emit("armor", e);
			return;
		}
		e.flipped = true;
		e.stun = this.settings.stunTime;
		e.body.setLinvel({ x: 0, y: 4.8 }, true);
		this.emit("flip", e);
	}
	kick(e, p) {
		if (!this.enemies.includes(e) || !e.flipped) return false;
		this.enemies.splice(this.enemies.indexOf(e), 1);
		this.world.removeRigidBody(e.body);
		this.combo = this.comboTime > 0 ? Math.min(this.combo + 1, 8) : 1;
		this.comboTime = 4.5;
		const points =
			(e.type === "boss" ? 2500 : e.type === "crab" ? 250 : 150) * this.combo;
		this.score += points;
		this.stats.kicks++;
		this.shake = 0.15;
		this.coins.push({
			id: ++this.serial,
			x: e.x,
			y: e.y + 0.5,
			vx: (p?.face || 1) * 1.8,
			vy: 7,
			life: 12,
			static: false,
			pickupDelay: 0.25,
		});
		this.emit("kick", { ...e, points, combo: this.combo, face: p?.face || 1 });
		return true;
	}
	hurt(p) {
		if (p.hurt > 0 || this.settings.invincible || this.attract || this.ended)
			return;
		this.lives--;
		this.stats.hits++;
		p.hurt = 3;
		p.body.setLinvel({ x: -p.face * 5, y: 7 }, true);
		this.shake = 0.6;
		this.combo = 0;
		this.emit("hurt", p);
		if (this.lives <= 0) {
			this.ended = true;
			this.won = false;
			this.emit("lose", { score: this.score });
		}
	}
	pow() {
		if (this.powCharges <= 0 || this.powCooldown > 0) return false;
		this.powCharges--;
		this.powCooldown = 0.6;
		this.stats.pows++;
		this.bump(0, 8, true);
		this.shake = 0.8;
		this.emit("pow", {});
		return true;
	}
	collect(c) {
		if (!this.coins.includes(c)) return;
		this.coins.splice(this.coins.indexOf(c), 1);
		this.score += 100;
		this.stats.coins++;
		if (c.static) {
			this.bonusCollected++;
			this.stats.bonusCoins++;
		}
		this.emit("coin", c);
	}
	teleport(p, x, y) {
		p.body.setTranslation({ x, y }, true);
		p.body.setLinvel({ x: 0, y: 0 }, true);
		p.x = x;
		p.y = y;
	}
	step(dt = 1 / 60, inputs = []) {
		if (this.ended) return;
		dt = 1 / 60;
		this.time += dt;
		this.phaseTime += dt;
		this.phaseDelay = Math.max(0, this.phaseDelay - dt);
		this.bannerTime = Math.max(0, this.bannerTime - dt);
		this.comboTime = Math.max(0, this.comboTime - dt);
		this.powCooldown = Math.max(0, this.powCooldown - dt);
		this.shake = Math.max(0, this.shake - dt * 2);
		const shift = SHIFTS[this.phase - 1];
		this.world.gravity.y = -this.settings.gravity;
		this.pressureCollider.setEnabled(this.powCharges > 0);
		if (!shift.bonus && this.phaseDelay <= 0) {
			this.spawnTimer -= dt * this.settings.spawnRate;
			if (this.spawnIndex < shift.types.length && this.spawnTimer <= 0) {
				this.spawn(shift.types[this.spawnIndex]);
				this.spawnIndex++;
				this.spawnTimer = this.phase === 5 ? 3.8 : 2.5;
			}
		}
		for (let i = 0; i < this.players.length; i++) {
			const p = this.players[i];
			p.body.setEnabled(p.active);
			if (!p.active) continue;
			const input = inputs[i] || {};
			const pos = p.body.translation(),
				vel = p.body.linvel();
			p.x = pos.x;
			p.y = pos.y;
			p.vy = vel.y;
			p.vx = vel.x;
			p.hurt = Math.max(0, p.hurt - dt);
			p.grounded = this.supported(p, 0.6);
			p.coyote = p.grounded ? 0.11 : Math.max(0, p.coyote - dt);
			p.buffer = input.jump && !p.lastJump ? 0.14 : Math.max(0, p.buffer - dt);
			const axis = clamp(input.x || 0, -1, 1);
			if (Math.abs(axis) > 0.1) p.face = Math.sign(axis);
			const accel = shift.ice && p.grounded ? 17 : 65,
				target = axis * this.settings.speed;
			const vx = vel.x + clamp(target - vel.x, -accel * dt, accel * dt);
			let vy = vel.y;
			if (p.buffer > 0 && p.coyote > 0) {
				vy = this.settings.jump;
				p.buffer = 0;
				p.coyote = 0;
				p.grounded = false;
				this.emit("jump", p);
			}
			if (!input.jump && p.lastJump && vy > 6) vy *= 0.56;
			if (input.action && !p.lastAction) this.pow();
			p.lastAction = !!input.action;
			p.lastJump = !!input.jump;
			p.beforeVy = vy;
			p.body.setLinvel({ x: vx, y: vy }, true);
		}
		for (const e of this.enemies) {
			const pos = e.body.translation(),
				vel = e.body.linvel();
			e.x = pos.x;
			e.y = pos.y;
			e.vy = vel.y;
			e.grounded = this.supported(e, e.type === "boss" ? 1.03 : 0.5);
			e.tell = Math.max(0, e.tell - dt);
			if (e.flipped) {
				e.stun -= dt;
				if (e.stun <= 0) {
					e.flipped = false;
					e.hp = e.type === "boss" ? 1 : e.type === "crab" ? 2 : 1;
					e.angry = true;
					this.emit("recover", e);
				}
			}
			let speed =
				this.settings.enemySpeed *
				(e.type === "fly" ? 1.45 : e.type === "boss" ? 0.7 : 1) *
				(e.angry ? 1.55 : 1);
			e.vx = e.flipped ? 0 : e.face * speed;
			e.body.setLinvel({ x: e.vx, y: vel.y }, true);
		}
		this.world.step();
		for (const p of this.players) {
			if (!p.active) continue;
			const pos = p.body.translation(),
				v = p.body.linvel();
			p.x = pos.x;
			p.y = pos.y;
			p.vx = v.x;
			p.vy = v.y;
			if (p.beforeVy > 1 && v.y < 0.5) {
				if (
					this.powCharges > 0 &&
					Math.abs(p.x) < 1.35 &&
					Math.abs(p.y + 0.6 - 1.85) < 0.22
				)
					this.pow();
				else
					for (const q of PLATFORMS) {
						if (
							q.y > 0 &&
							Math.abs(p.x - q.x) < q.w / 2 + 0.25 &&
							Math.abs(p.y + 0.6 - (q.y - 0.6)) < 0.22
						) {
							this.bump(p.x, q.y);
							break;
						}
					}
			}
			if (p.x > 12.5) this.teleport(p, -12.3, p.y);
			else if (p.x < -12.5) this.teleport(p, 12.3, p.y);
			if (p.y < -3) {
				this.hurt(p);
				this.teleport(p, p.id ? 2 : -2, 0.75);
			}
			for (const e of [...this.enemies]) {
				let radius = e.type === "boss" ? 1.45 : 0.95;
				if (
					Math.abs(e.x - p.x) < radius &&
					Math.abs(e.y - p.y) < (e.type === "boss" ? 1.5 : 0.88)
				) {
					if (e.flipped) this.kick(e, p);
					else if (e.tell < 0.25) this.hurt(p);
				}
			}
			for (const c of [...this.coins])
				if (
					!(c.pickupDelay > 0) &&
					Math.abs(c.x - p.x) < 0.9 &&
					Math.abs(c.y - p.y) < 1.1
				)
					this.collect(c);
		}
		for (const e of this.enemies) {
			let pos = e.body.translation();
			e.x = pos.x;
			e.y = pos.y;
			e.vy = e.body.linvel().y;
			if (e.x > 12.8 || e.x < -12.8) {
				if (e.y < 2) {
					e.body.setTranslation({ x: Math.sign(e.x) * 10.5, y: 13.3 }, true);
					e.face = -Math.sign(e.x);
					e.angry = true;
					e.tell = 1;
				} else
					e.body.setTranslation({ x: -Math.sign(e.x) * 12.5, y: e.y }, true);
			}
			if (e.y < -3)
				e.body.setTranslation({ x: e.face < 0 ? 10 : -10, y: 13.3 }, true);
		}
		for (const c of [...this.coins]) {
			if (c.static) continue;
			c.pickupDelay = Math.max(0, (c.pickupDelay || 0) - dt);
			c.life -= dt;
			c.vy -= 18 * dt;
			c.x += c.vx * dt;
			c.y += c.vy * dt;
			for (const q of PLATFORMS)
				if (
					Math.abs(c.x - q.x) < q.w / 2 &&
					c.y < q.y + 0.35 &&
					c.y - c.vy * dt > q.y + 0.2 &&
					c.vy < 0
				) {
					c.y = q.y + 0.35;
					c.vy = Math.abs(c.vy) * 0.5;
					c.vx *= 0.7;
				}
			if (c.life <= 0 || c.y < -2) this.coins.splice(this.coins.indexOf(c), 1);
		}
		if (shift.bonus) {
			if (this.phaseTime >= shift.time + 2.6 || this.bonusCollected >= 18) {
				if (!this.nextTimer) {
					this.nextTimer = 2;
					this.banner =
						this.bonusCollected >= 18 ? "POCKETS FULL!" : "NICE LITTLE BONUS!";
					this.bannerTime = 2.1;
					this.score += this.bonusCollected >= 18 ? 2000 : 500;
					this.emit("clear", {});
				}
			}
		} else if (
			this.spawnIndex >= shift.types.length &&
			this.enemies.length === 0 &&
			!this.nextTimer
		) {
			this.nextTimer = 3;
			this.banner = this.phase === 5 ? "CLOG CONQUERED!" : "SHIFT COMPLETE!";
			this.bannerTime = 3;
			this.score += 500;
			this.emit("clear", {});
		}
		if (this.nextTimer) {
			this.nextTimer -= dt;
			if (this.nextTimer <= 0) {
				this.nextTimer = 0;
				if (this.phase >= 5) {
					this.ended = true;
					this.won = true;
					this.score += this.lives * 500;
					this.emit("win", { score: this.score });
				} else this.enterPhase(this.phase + 1);
			}
		}
	}
	demoStep() {
		this.attract = true;
		this.demoTimer = (this.demoTimer || 0) + 1 / 60;
		const p = this.players[0];
		let target = this.enemies.find((e) => e.flipped) || this.enemies[0];
		if (
			this.demoTimer > 8 &&
			this.demoTimer % 17 < 0.02 &&
			this.enemies.some((e) => e.grounded) &&
			this.powCharges > 0
		)
			this.pow();
		if (SHIFTS[this.phase - 1].bonus && this.coins.length) {
			const c =
				this.coins[Math.floor(this.demoTimer * 1.4) % this.coins.length];
			if (this.demoTimer % 1 < 0.025) this.teleport(p, c.x, c.y);
		} else if (target && this.demoTimer % 1.5 < 0.025) {
			if (target.flipped) {
				this.teleport(p, target.x, target.y);
				this.kick(target, p);
			} else {
				const floor = PLATFORMS.filter(
					(q) => Math.abs(target.x - q.x) < q.w / 2 && q.y < target.y,
				).sort((a, b) => b.y - a.y)[0];
				if (floor) {
					this.teleport(p, target.x, floor.y - 2);
					this.bump(target.x, floor.y);
				} else this.flip(target);
			}
		}
		this.step(1 / 60, [
			{ x: Math.sin(this.demoTimer) * 0.7, jump: this.demoTimer % 1.5 < 0.3 },
		]);
	}
	snapshot() {
		return {
			time: this.time,
			score: this.score,
			lives: this.lives,
			phase: this.phase,
			phaseTime: this.phaseTime,
			combo: this.combo,
			comboTime: this.comboTime,
			powCharges: this.powCharges,
			shake: this.shake,
			ended: this.ended,
			won: this.won,
			attract: this.attract,
			banner: this.banner,
			bannerTime: this.bannerTime,
			spawnIndex: this.spawnIndex,
			totalEnemies: SHIFTS[this.phase - 1].types?.length || 0,
			bonusCollected: this.bonusCollected,
			stats: { ...this.stats },
			players: this.players.map(({ body, ...p }) => p),
			enemies: this.enemies.map(({ body, ...e }) => e),
			coins: this.coins.map((c) => ({ ...c })),
		};
	}
}
