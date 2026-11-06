import RAPIER from "@dimforge/rapier2d-compat";

export const DEFAULTS = Object.freeze({
	speed: 6.2,
	jump: 15.8,
	gravity: 30,
	enemySpeed: 1,
	stun: 9,
	spawn: 2.7,
	lives: 5,
	timeScale: 1,
});
export const PHASES = [
	{
		name: "FIRST DRIP",
		lesson: "Bump the floor. Flip the pest. Give it the boot!",
		types: ["shell", "shell", "shell", "shell"],
		tint: "#75c7b3",
	},
	{
		name: "CRABBY COMPANY",
		lesson: "Clawbacks need TWO bumps. The first makes them mad!",
		types: ["crab", "shell", "crab", "shell", "crab"],
		tint: "#f1b260",
	},
	{
		name: "LOOSE CHANGE",
		lesson: "A little pocket money! Scoop up every brass token.",
		bonus: true,
		duration: 25,
		tint: "#efca68",
	},
	{
		name: "HOP TO IT",
		lesson: "Springwings flip only when their feet touch the floor.",
		types: ["hopper", "shell", "hopper", "crab", "hopper", "shell"],
		tint: "#b6a3dc",
	},
	{
		name: "COLD FEET",
		lesson: "Stop the Frosties before they turn the floors to ice!",
		types: ["ice", "crab", "shell", "ice", "hopper", "crab"],
		ice: true,
		tint: "#98dae1",
	},
	{
		name: "PAYDAY PARADE",
		lesson: "The clock is ticking. Leave no coin behind!",
		bonus: true,
		duration: 25,
		tint: "#efca68",
	},
	{
		name: "HOT WATER",
		lesson: "Watch the sparks! Keep moving and use your BOP.",
		types: ["crab", "hopper", "shell", "crab", "hopper", "shell", "crab"],
		fire: true,
		tint: "#ef946d",
	},
	{
		name: "THE BIG CLOG",
		lesson: "Three bumps crack the big lug. Then kick it clean!",
		types: ["boss", "crab", "hopper", "shell", "crab", "hopper"],
		fire: true,
		ice: true,
		finale: true,
		tint: "#e8af72",
	},
];
export const PLATFORMS = [
	{ id: "ground", x: 0, y: 0, w: 25, h: 0.65 },
	{ id: "lowL", x: -7.05, y: 3.3, w: 10.7, h: 0.42 },
	{ id: "lowR", x: 7.05, y: 3.3, w: 10.7, h: 0.42 },
	{ id: "mid", x: 0, y: 6.6, w: 15.6, h: 0.42 },
	{ id: "midL", x: -11.65, y: 6.6, w: 1.5, h: 0.42 },
	{ id: "midR", x: 11.65, y: 6.6, w: 1.5, h: 0.42 },
	{ id: "topL", x: -7.15, y: 9.9, w: 10.5, h: 0.42 },
	{ id: "topR", x: 7.15, y: 9.9, w: 10.5, h: 0.42 },
	{ id: "bop", x: 0, y: 2.35, w: 1.22, h: 0.9, special: true },
];
const DT = 1 / 60;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function seeded(a) {
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
export async function initPhysics() {
	await RAPIER.init();
}

export class Shift {
	constructor({
		seed = 1983,
		players = [0],
		config = {},
		attract = false,
	} = {}) {
		this.rng = seeded(seed);
		this.config = { ...DEFAULTS, ...config };
		this.world = new RAPIER.World({ x: 0, y: -this.config.gravity });
		this.world.timestep = DT;
		this.players = [];
		this.enemies = [];
		this.coins = [];
		this.hazards = [];
		this.events = [];
		this.tick = 0;
		this.elapsed = 0;
		this.phase = 0;
		this.phaseTime = 0;
		this.status = "playing";
		this.score = 0;
		this.pow = 3;
		this.combo = 0;
		this.comboTime = 0;
		this.maxCombo = 0;
		this.ice = [];
		this.nextId = 100;
		this.spawned = 0;
		this.cleared = 0;
		this.transition = 0;
		this.intro = 2.4;
		this.cheated = false;
		this.god = attract;
		this.attract = attract;
		this.stats = {
			bumps: 0,
			flips: 0,
			kicks: 0,
			coins: 0,
			jumps: 0,
			wraps: 0,
			hurts: 0,
			bops: 0,
			bonuses: 0,
		};
		this.platforms = PLATFORMS.map((p) => ({
			...p,
			collider: this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(p.w / 2, p.h / 2)
					.setTranslation(p.x, p.y - p.h / 2)
					.setFriction(0)
					.setCollisionGroups(0x0001000e),
			),
		}));
		for (const id of players) this.addPlayer(id);
		this.beginPhase(0);
	}
	event(type, data = {}) {
		this.events.push({ type, tick: this.tick, ...data });
	}
	body(x, y, hx, hy, group = 2) {
		const body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(x, y)
				.lockRotations()
				.setCcdEnabled(true),
		);
		const collider = this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(hx, hy)
				.setFriction(0)
				.setRestitution(0)
				.setCollisionGroups((group << 16) | 1),
			body,
		);
		return { body, collider };
	}
	addPlayer(id) {
		if (this.players.some((p) => p.id === id)) return;
		const x = [-3, 3, -5.5, 5.5][this.players.length % 4];
		const p = {
			id,
			x,
			y: 0.65,
			vx: 0,
			vy: 0,
			dir: x > 0 ? -1 : 1,
			lives: Math.round(this.config.lives),
			score: 0,
			grounded: true,
			ground: "ground",
			invuln: 2,
			dead: 0,
			kick: 0,
			kickCooldown: 0,
			jumpHeld: false,
			actionHeld: false,
			buffer: 0,
			coyote: 0,
			bumpCooldown: 0,
			drop: 0,
			wrapFlash: 0,
			...this.body(x, 0.65, 0.31, 0.62),
		};
		this.players.push(p);
		this.event("join", { id, x, y: 1 });
		return p;
	}
	removePlayer(id) {
		const p = this.players.find((p) => p.id === id);
		if (p) {
			this.world.removeRigidBody(p.body);
			this.players = this.players.filter((q) => q !== p);
			this.event("leave", { id });
		}
	}
	dispose() {
		this.world.free();
	}
	setPosition(p, x, y) {
		p.x = x;
		p.y = y;
		p.body.setTranslation({ x, y }, true);
		p.body.setLinvel({ x: 0, y: 0 }, true);
		p.vx = p.vy = 0;
	}
	groundFor(e, half) {
		return (
			this.platforms.find(
				(p) =>
					(!p.special || half === 0.62) &&
					Math.abs(e.x - p.x) < p.w / 2 + 0.1 &&
					Math.abs(e.y - half - p.y) < 0.13 &&
					e.vy < 1.2,
			) || null
		);
	}
	beginPhase(index) {
		for (const e of this.enemies)
			if (e.body) this.world.removeRigidBody(e.body);
		for (const c of this.coins) if (c.body) this.world.removeRigidBody(c.body);
		this.enemies = [];
		this.coins = [];
		this.hazards = [];
		this.phase = index;
		this.phaseTime = 0;
		this.spawned = 0;
		this.cleared = 0;
		this.transition = 0;
		this.ice = [];
		this.intro = 2.4;
		this.phaseDef = PHASES[index];
		this.pow = Math.min(3, this.pow + 1);
		this.nextSpawn = 0.7;
		this.nextHazard = 7;
		this.nextIcicle = 8;
		for (const [i, p] of this.players.entries()) {
			if (p.lives > 0) {
				this.setPosition(p, [-3, 3, -5.5, 5.5][i], 0.65);
				p.invuln = 2.5;
				p.dead = 0;
				p.collider.setCollisionGroups(0x00020001);
			}
		}
		if (this.phaseDef.bonus) {
			this.pow = 3;
			let idx = 0;
			for (const p of PLATFORMS.filter((p) => !p.special && p.w > 3)) {
				const count = p.id === "ground" ? 6 : p.id === "mid" ? 4 : 3;
				for (let i = 0; i < count; i++)
					this.coins.push({
						id: this.nextId++,
						x: p.x - p.w / 2 + 1 + (i * (p.w - 2)) / (count - 1),
						y: p.y + 0.92,
						bonus: true,
						age: 0,
						order: idx++,
					});
			}
			this.bonusTotal = this.coins.length;
			this.bonusCollected = 0;
		}
		this.event("phase", {
			phase: index,
			name: this.phaseDef.name,
			bonus: !!this.phaseDef.bonus,
		});
	}
	spawnEnemy(type = "shell", where = null) {
		const side = this.spawned % 2 === 0 ? -1 : 1;
		let x = -side * -11.3,
			y = 10.35;
		if (type === "boss") {
			x = 0;
			y = 7.4;
		}
		if (where) {
			x = where.x;
			y = where.y;
		}
		const half = type === "boss" ? 0.65 : 0.35;
		const e = {
			id: this.nextId++,
			type,
			x,
			y,
			vx: 0,
			vy: 0,
			dir: side < 0 ? 1 : -1,
			half,
			state: "walk",
			stun: 0,
			armor: type === "crab" ? 2 : type === "boss" ? 3 : 1,
			angry: false,
			age: 0,
			hop: 0.75,
			recoveries: 0,
			grounded: false,
			ground: null,
			...this.body(x, y, type === "boss" ? 0.85 : 0.39, half, 4),
		};
		this.enemies.push(e);
		this.event("spawn", { id: e.id, x, y, enemy: type });
		return e;
	}
	makeCoin(x, y, bonus = false) {
		const c = {
			id: this.nextId++,
			x,
			y,
			bonus,
			age: 0,
			...this.body(x, y, 0.19, 0.22, 8),
		};
		c.collider.setRestitution(0.55);
		c.body.setLinvel({ x: (this.rng() - 0.5) * 3, y: 6 }, true);
		this.coins.push(c);
	}
	award(p, amount) {
		this.score += amount;
		if (p) {
			const prev = Math.floor(p.score / 15000);
			p.score += amount;
			if (Math.floor(p.score / 15000) > prev) {
				p.lives++;
				if (p.lives === 1 && p.dead <= 0) {
					p.dead = 0.01;
					p.body.setGravityScale(1, true);
				}
				this.event("extra", { x: p.x, y: p.y + 1, id: p.id });
			}
		}
	}
	hitEnemy(e, p, power = false) {
		if (e.state === "gone") return false;
		if (!e.grounded && !power) return false;
		if (e.type === "hopper" && !e.grounded) return false;
		if (e.state === "flipped") {
			e.stun = this.config.stun;
			e.body.setLinvel({ x: 0, y: 3.8 }, true);
			return true;
		}
		if (e.type === "ice") {
			this.defeat(e, p, false);
			this.event("shatter", { x: e.x, y: e.y });
			return true;
		}
		e.armor--;
		if (e.armor > 0) {
			e.angry = true;
			e.body.setLinvel({ x: 0, y: 2.4 }, true);
			e.dir *= -1;
			this.event("armor", { x: e.x, y: e.y, armor: e.armor, enemy: e.type });
			return true;
		}
		e.state = "flipped";
		e.stun = this.config.stun;
		e.body.setLinvel({ x: 0, y: 4.5 }, true);
		this.stats.flips++;
		this.award(p, 50);
		this.event("flip", { id: e.id, x: e.x, y: e.y, enemy: e.type });
		return true;
	}
	bump(platform, x, p) {
		if (platform.special) {
			this.bop(p);
			return;
		}
		this.stats.bumps++;
		this.event("bump", { platform: platform.id, x, y: platform.y });
		for (const e of this.enemies)
			if (
				e.state !== "gone" &&
				Math.abs(e.x - x) < (e.type === "boss" ? 2.4 : 1.8) &&
				Math.abs(e.y - e.half - platform.y) < 0.2
			)
				this.hitEnemy(e, p);
		if (this.ice.includes(platform.id)) {
			this.ice = this.ice.filter((id) => id !== platform.id);
			this.event("shatter", { x, y: platform.y });
		}
	}
	bop(p) {
		if (this.pow <= 0 || this.powCooldown > 0 || this.phaseDef.bonus)
			return false;
		this.pow--;
		this.powCooldown = 0.7;
		this.stats.bops++;
		this.event("bop", { x: 0, y: 2, charges: this.pow });
		for (const e of this.enemies) if (e.grounded) this.hitEnemy(e, p, true);
		this.ice = [];
		this.hazards = this.hazards.filter((h) => h.type !== "fire");
		return true;
	}
	defeat(e, p, coin = true) {
		if (e.state === "gone") return;
		e.state = "gone";
		this.cleared++;
		this.world.removeRigidBody(e.body);
		e.body = null;
		if (p) {
			this.combo = this.comboTime > 0 ? this.combo + 1 : 1;
			this.comboTime = 4.5;
			this.maxCombo = Math.max(this.combo, this.maxCombo);
			this.stats.kicks++;
			p.kick = 0.28;
			const points =
				(e.type === "boss" ? 3000 : e.type === "ice" ? 400 : 500) *
				Math.min(this.combo, 5);
			this.award(p, points);
			this.event("kick", {
				id: e.id,
				x: e.x,
				y: e.y,
				dir: p.dir,
				enemy: e.type,
				combo: this.combo,
				points,
			});
		}
		if (coin) this.makeCoin(e.x, e.y + 0.5);
	}
	hurt(p) {
		if (p.invuln > 0 || p.dead > 0 || p.lives <= 0 || this.god) return;
		p.lives--;
		this.stats.hurts++;
		p.dead = 1.2;
		p.invuln = 4.2;
		p.body.setLinvel({ x: -p.dir * 3, y: 9 }, true);
		p.collider.setCollisionGroups(0x00020000);
		this.comboTime = 0;
		this.event("hurt", { id: p.id, x: p.x, y: p.y });
	}
	collect(c, p) {
		this.award(p, c.bonus ? 200 : 100);
		this.stats.coins++;
		if (c.bonus) this.bonusCollected++;
		c.gone = true;
		if (c.body) {
			this.world.removeRigidBody(c.body);
			c.body = null;
		}
		this.event("coin", { x: c.x, y: c.y, id: c.id });
	}
	controlPlayer(p, input = {}) {
		p.invuln = Math.max(0, p.invuln - DT);
		p.kick = Math.max(0, p.kick - DT);
		p.kickCooldown = Math.max(0, p.kickCooldown - DT);
		p.bumpCooldown = Math.max(0, p.bumpCooldown - DT);
		p.wrapFlash = Math.max(0, p.wrapFlash - DT);
		if (p.dead > 0) {
			p.dead -= DT;
			if (p.dead <= 0 && p.lives > 0) {
				this.setPosition(p, p.id % 2 ? 3 : -3, 1.4);
				p.collider.setCollisionGroups(0x00020001);
				this.event("respawn", { x: p.x, y: p.y, id: p.id });
			}
			return;
		}
		if (p.lives <= 0) {
			p.body.setLinvel({ x: 0, y: 0 }, true);
			p.body.setGravityScale(0, true);
			return;
		}
		p.drop = Math.max(0, p.drop - DT);
		if (p.drop <= 0) p.collider.setCollisionGroups(0x00020001);
		if (input.jump && !p.jumpHeld) p.buffer = 0.14;
		else p.buffer = Math.max(0, p.buffer - DT);
		p.jumpHeld = !!input.jump;
		p.coyote = p.grounded ? 0.1 : Math.max(0, p.coyote - DT);
		const axis = clamp(Number(input.x) || 0, -1, 1);
		if (Math.abs(axis) > 0.1) p.dir = axis > 0 ? 1 : -1;
		const sliding = this.ice.includes(p.ground);
		let vx = p.body.linvel().x;
		const target = axis * this.config.speed;
		const accel = p.grounded ? (sliding ? 9 : 55) : 38;
		vx += clamp(target - vx, -accel * DT, accel * DT);
		let vy = p.body.linvel().y;
		if (p.buffer > 0 && p.coyote > 0) {
			if (input.down && p.ground !== "ground" && p.y > 2.4) {
				p.drop = 0.26;
				p.collider.setCollisionGroups(0x00020000);
				vy = -3;
			} else {
				vy = this.config.jump;
				this.stats.jumps++;
				this.event("jump", { id: p.id, x: p.x, y: p.y });
			}
			p.buffer = 0;
			p.coyote = 0;
			p.grounded = false;
		}
		if (input.action && !p.actionHeld && p.kickCooldown <= 0) {
			p.kickCooldown = 0.3;
			p.kick = 0.25;
			if (Math.abs(p.x) < 2.1 && p.y < 3) this.bop(p);
			for (const e of this.enemies)
				if (
					e.state === "flipped" &&
					Math.abs(p.x - e.x) < 1.7 &&
					Math.abs(p.y - e.y) < 1.1
				)
					this.defeat(e, p);
			this.event("boot", { x: p.x, y: p.y, id: p.id });
		}
		p.actionHeld = !!input.action;
		p.prevY = p.y;
		p.prevVy = vy;
		p.body.setLinvel({ x: vx, y: vy }, true);
	}
	step(inputs = {}) {
		if (this.status !== "playing") return;
		this.tick++;
		this.elapsed += DT;
		this.powCooldown = Math.max(0, (this.powCooldown || 0) - DT);
		this.comboTime = Math.max(0, this.comboTime - DT);
		this.world.gravity.y = -this.config.gravity;
		const hold = this.intro > 0 || this.transition > 0;
		if (this.intro > 0) this.intro -= DT;
		else if (this.transition <= 0) this.phaseTime += DT;
		for (const p of this.players)
			this.controlPlayer(p, hold ? {} : inputs[p.id] || {});
		if (
			!hold &&
			!this.phaseDef.bonus &&
			this.spawned < this.phaseDef.types.length &&
			this.phaseTime >= this.nextSpawn
		) {
			this.spawnEnemy(this.phaseDef.types[this.spawned]);
			this.spawned++;
			this.nextSpawn += this.config.spawn;
		}
		for (const e of this.enemies) {
			if (e.state === "gone") continue;
			e.age += DT;
			if (e.state === "flipped") {
				e.stun -= DT;
				e.body.setLinvel({ x: 0, y: e.body.linvel().y }, true);
				if (e.stun <= 0) {
					e.state = "walk";
					e.angry = true;
					e.recoveries++;
					e.armor = e.type === "crab" ? 2 : e.type === "boss" ? 3 : 1;
					this.event("recover", { x: e.x, y: e.y, id: e.id });
				}
			} else {
				const last =
					this.spawned >= this.phaseDef.types?.length &&
					this.enemies.filter((n) => n.state !== "gone").length === 1;
				const speed =
					(e.type === "boss"
						? 1.1
						: e.type === "crab"
							? 1.55
							: e.type === "hopper"
								? 1.1
								: e.type === "ice"
									? 1.5
									: 1.35) *
					this.config.enemySpeed *
					(e.angry ? 1.5 : 1) *
					(last ? 1.22 : 1);
				let vy = e.body.linvel().y;
				if (e.type === "hopper" && e.grounded) {
					e.hop -= DT;
					if (e.hop <= 0) {
						vy = 6.8;
						e.hop = 0.95 + this.rng() * 0.45;
						this.event("hop", { x: e.x, y: e.y });
					}
				}
				if (e.type === "boss" && Math.abs(e.x) > 5.3) e.dir *= -1;
				e.body.setLinvel({ x: e.dir * speed, y: vy }, true);
				if (e.type === "ice" && e.grounded && e.age > 5 && !hold) {
					if (!this.ice.includes(e.ground) && e.ground !== "ground")
						this.ice.push(e.ground);
					this.event("freeze", { x: e.x, y: e.y, platform: e.ground });
					this.defeat(e, null, false);
				}
			}
		}
		this.world.step();
		for (const p of this.players) {
			const pos = p.body.translation(),
				vel = p.body.linvel();
			p.x = pos.x;
			p.y = pos.y;
			p.vx = vel.x;
			p.vy = vel.y;
			if (p.lives <= 0 && p.dead <= 0) continue;
			if (p.y < -3.5 && p.dead <= 0) {
				this.setPosition(p, 0, 1);
				this.hurt(p);
			}
			if (Math.abs(p.x) > 12.7) {
				p.x = p.x > 0 ? -12.5 : 12.5;
				p.body.setTranslation({ x: p.x, y: p.y }, true);
				this.stats.wraps++;
				p.wrapFlash = 0.4;
				this.event("wrap", { x: p.x, y: p.y });
			}
			const ground = this.groundFor(p, 0.62);
			p.grounded = !!ground;
			p.ground = ground?.id || null;
			if (p.dead <= 0 && p.bumpCooldown <= 0 && p.prevVy > 1) {
				const plat = this.platforms.find(
					(q) =>
						Math.abs(p.x - q.x) < q.w / 2 + 0.2 &&
						p.prevY + 0.62 < q.y - q.h + 0.2 &&
						p.y + 0.62 > q.y - q.h - 0.15 &&
						p.vy < 1,
				);
				if (plat) {
					this.bump(plat, p.x, p);
					p.bumpCooldown = 0.2;
				}
			}
		}
		for (const e of this.enemies) {
			if (e.state === "gone") continue;
			const pos = e.body.translation(),
				vel = e.body.linvel();
			e.x = pos.x;
			e.y = pos.y;
			e.vx = vel.x;
			e.vy = vel.y;
			const ground = this.groundFor(e, e.half);
			e.grounded = !!ground;
			e.ground = ground?.id || null;
			if (Math.abs(e.x) > 12.8 || e.y < -1.5) {
				if (e.y < 2) {
					e.x = e.dir > 0 ? -11.7 : 11.7;
					e.y = 10.3;
					e.angry = true;
				} else e.x = e.x > 0 ? -12.5 : 12.5;
				e.body.setTranslation({ x: e.x, y: e.y }, true);
				e.body.setLinvel({ x: 0, y: 0 }, true);
				this.event("pipe", { x: e.x, y: e.y });
			}
			if (this.intro <= 0 && this.transition <= 0)
				for (const p of this.players) {
					if (p.dead > 0 || p.lives <= 0) continue;
					if (
						Math.abs(p.x - e.x) < (e.type === "boss" ? 1.12 : 0.68) &&
						Math.abs(p.y - e.y) < (e.type === "boss" ? 1.15 : 0.8)
					) {
						if (e.state === "flipped") this.defeat(e, p);
						else this.hurt(p);
					}
				}
		}
		for (const c of this.coins) {
			c.age += DT;
			if (c.body) {
				const pos = c.body.translation();
				c.x = pos.x;
				c.y = pos.y;
			}
			if (c.gone) continue;
			for (const p of this.players)
				if (
					p.lives > 0 &&
					p.dead <= 0 &&
					Math.abs(p.x - c.x) < 0.78 &&
					Math.abs(p.y - c.y) < 1.05
				) {
					this.collect(c, p);
					break;
				}
			if (!c.gone && !c.bonus && (c.age > 14 || c.y < -2)) {
				c.gone = true;
				if (c.body) this.world.removeRigidBody(c.body);
				c.body = null;
			}
		}
		this.coins = this.coins.filter((c) => !c.gone);
		if (!hold) this.updateHazards();
		if (
			this.players.length &&
			this.players.every((p) => p.lives <= 0 && p.dead <= 0)
		)
			this.finish(false);
		if (this.transition > 0) {
			this.transition -= DT;
			if (this.transition <= 0) {
				if (this.phase >= PHASES.length - 1) this.finish(true);
				else this.beginPhase(this.phase + 1);
			}
		} else if (
			this.intro <= 0 &&
			(this.phaseDef.bonus
				? this.phaseTime >= this.phaseDef.duration || !this.coins.length
				: this.spawned >= this.phaseDef.types.length &&
					this.enemies.every((e) => e.state === "gone"))
		)
			this.completePhase();
	}
	updateHazards() {
		if (this.phaseDef.fire && this.phaseTime > this.nextHazard) {
			this.nextHazard += 9;
			const side = this.rng() < 0.5 ? -1 : 1;
			this.hazards.push({
				id: this.nextId++,
				type: "fire",
				x: side * 12,
				y: 4.3,
				base: [1.15, 4.3, 7.65][Math.floor(this.rng() * 3)],
				dir: -side,
				age: 0,
			});
			this.event("fire", { x: side * 12, y: 4.3 });
		}
		if (this.phaseDef.ice && this.phaseTime > this.nextIcicle) {
			this.nextIcicle += 10;
			const p = this.players.find((p) => p.lives > 0);
			if (p)
				this.hazards.push({
					id: this.nextId++,
					type: "icicle",
					x: p.x,
					y: 12.4,
					age: 0,
					vy: 0,
				});
		}
		for (const h of this.hazards) {
			h.age += DT;
			if (h.type === "fire") {
				h.x += h.dir * 3.6 * DT;
				h.y = h.base + Math.sin(h.age * 3) * 0.45;
				if (Math.abs(h.x) > 13.5) h.gone = true;
			} else if (h.age > 1.1) {
				h.vy -= 23 * DT;
				h.y += h.vy * DT;
				if (h.y < -0.1) h.gone = true;
			}
			for (const p of this.players)
				if (
					p.lives > 0 &&
					p.dead <= 0 &&
					Math.abs(p.x - h.x) < 0.67 &&
					Math.abs(p.y - h.y) < 0.9 &&
					(h.type === "fire" || h.age > 1.1)
				)
					this.hurt(p);
		}
		this.hazards = this.hazards.filter((h) => !h.gone);
	}
	completePhase() {
		if (this.transition > 0 || this.status !== "playing") return;
		this.transition = 2.5;
		const perfect =
			this.phaseDef.bonus && this.bonusCollected === this.bonusTotal;
		if (perfect) {
			this.stats.bonuses++;
			this.award(this.players[0], 5000);
		} else if (!this.phaseDef.bonus)
			this.award(
				this.players[0],
				Math.max(0, 1500 - Math.floor(this.phaseTime) * 10),
			);
		this.event("clear", {
			phase: this.phase,
			perfect,
			bonus: !!this.phaseDef.bonus,
			collected: this.bonusCollected || 0,
			total: this.bonusTotal || 0,
		});
	}
	finish(won) {
		if (this.status !== "playing") return;
		this.status = won ? "won" : "lost";
		this.event(won ? "victory" : "gameover", { score: this.score });
	}
	drainEvents() {
		return this.events.splice(0);
	}
	snapshot() {
		const pickPlayer = (p) => ({
			id: p.id,
			x: p.x,
			y: p.y,
			vx: p.vx,
			vy: p.vy,
			dir: p.dir,
			lives: p.lives,
			score: p.score,
			grounded: p.grounded,
			ground: p.ground,
			invuln: p.invuln,
			dead: p.dead,
			kick: p.kick,
		});
		return {
			tick: this.tick,
			phase: this.phase,
			phaseTime: this.phaseTime,
			elapsed: this.elapsed,
			status: this.status,
			score: this.score,
			pow: this.pow,
			combo: this.combo,
			comboTime: this.comboTime,
			maxCombo: this.maxCombo,
			spawned: this.spawned,
			cleared: this.cleared,
			ice: [...this.ice],
			intro: this.intro,
			transition: this.transition,
			cheated: this.cheated,
			stats: { ...this.stats },
			bonusTotal: this.bonusTotal || 0,
			bonusCollected: this.bonusCollected || 0,
			players: this.players.map(pickPlayer),
			enemies: this.enemies
				.filter((e) => e.state !== "gone")
				.map((e) => ({
					id: e.id,
					type: e.type,
					x: e.x,
					y: e.y,
					vx: e.vx,
					vy: e.vy,
					dir: e.dir,
					state: e.state,
					stun: e.stun,
					armor: e.armor,
					angry: e.angry,
					grounded: e.grounded,
					age: e.age,
				})),
			coins: this.coins.map((c) => ({
				id: c.id,
				x: c.x,
				y: c.y,
				bonus: c.bonus,
				age: c.age,
			})),
			hazards: this.hazards.map((h) => ({ ...h })),
		};
	}
	debugSpawn(type) {
		this.cheated = true;
		const p = this.players[0];
		return this.spawnEnemy(type, { x: p.x + 2, y: Math.max(3.8, p.y + 3) });
	}
	debugSkip() {
		this.cheated = true;
		this.beginPhase(Math.min(7, this.phase + 1));
	}
}

export class Showman {
	constructor(game) {
		this.game = game;
		this.time = 0;
		this.cycle = 0;
		this.target = null;
		this.stage = 0;
		this.cooldown = 0;
	}
	update() {
		const g = this.game;
		this.time += DT;
		this.cooldown -= DT;
		if (g.status !== "playing") {
			g.status = "playing";
			g.beginPhase(0);
		}
		if (g.phaseDef.bonus) {
			const c = g.coins[0];
			if (c && this.cooldown <= 0) {
				const p = g.players[this.cycle++ % g.players.length];
				g.setPosition(p, c.x - 0.5, c.y);
				this.cooldown = 0.5;
				return { [p.id]: { x: 1, jump: true } };
			}
			return {};
		}
		if (g.phaseTime > 22 && !g.transition) {
			for (const e of g.enemies)
				if (e.state !== "gone") {
					e.grounded = true;
					e.armor = 1;
					g.hitEnemy(e, g.players[0], true);
					g.defeat(e, g.players[0]);
				}
			g.spawned = g.phaseDef.types.length;
		}
		const live = g.enemies.filter((e) => e.state !== "gone");
		if (!this.target || this.target.state === "gone") {
			this.target = live[0];
			this.stage = 0;
			this.cooldown = 1;
		}
		const e = this.target;
		if (!e || g.intro > 0 || g.transition > 0) return {};
		const p = g.players[this.cycle % g.players.length];
		if (this.cooldown <= 0) {
			const plat = g.platforms.find((s) => s.id === e.ground);
			if (e.state === "flipped") {
				g.setPosition(p, e.x - 1.25, e.y + 0.25);
				p.dir = 1;
				this.cooldown = 0.75;
				this.cycle++;
				return { [p.id]: { x: 1, action: true } };
			}
			if (plat && !plat.special && plat.y > 2) {
				g.setPosition(p, e.x, plat.y - 2.2);
				p.body.setLinvel({ x: 0, y: 11 }, true);
				p.prevVy = 11;
				this.cooldown = 1.25;
				return { [p.id]: { jump: true } };
			}
			if (e.grounded) {
				e.armor = Math.max(1, e.armor);
				g.hitEnemy(e, p, true);
				this.cooldown = 0.9;
			}
		}
		return {
			[p.id]: {
				x:
					e.state === "flipped"
						? Math.sign(e.x - p.x)
						: Math.sin(this.time) * 0.3,
			},
		};
	}
}
