import RAPIER from "@dimforge/rapier3d-compat";
export const DEFAULTS = {
	speed: 7.8,
	jump: 12.5,
	gravity: 27,
	swing: 1,
	air: 16,
	hazard: 1,
	timeScale: 1,
};
export const CHAPTERS = [
	{
		name: "THE HANGING GARDENS",
		tag: "A little swing goes a long way.",
		goal: "Cross the canopy",
		hint: "Jump toward a vine. Catch automatically. Jump again to let go.",
	},
	{
		name: "SNAPDRAGON RIVER",
		tag: "Mind the teeth. And your breathing.",
		goal: "Swim to the far bank",
		hint: "Swim in any direction. Surface for air. Swat closed jaws; avoid open ones.",
	},
	{
		name: "RUMBLE RIDGE",
		tag: "Good heavens. The hill is coming down.",
		goal: "Climb the boulder trail",
		hint: "Jump small rocks. Duck beneath the high bouncers.",
	},
	{
		name: "THE TEA-TIME CAPER",
		tag: "One toucan. Two tin guards. No time for tea.",
		goal: "Rescue Pip the toucan",
		hint: "Jump the clockwork guards. Ring both bells, then free Pip.",
	},
];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export class JungleGame {
	static async init() {
		await RAPIER.init();
	}
	constructor(event = () => {}) {
		this.event = event;
		this.config = { ...DEFAULTS };
		this.god = false;
		this.auto = false;
		this.mode = "title";
		this.stage = 0;
		this.time = 0;
		this.score = 0;
		this.lives = 5;
		this.players = [];
		this.vines = [];
		this.enemies = [];
		this.collectibles = [];
		this.bells = [false, false];
		this.stats = {
			grabs: 0,
			jumps: 0,
			swats: 0,
			ducks: 0,
			pickups: 0,
			hits: 0,
			stages: 0,
		};
		this.build(0, 1);
	}
	start(count = 1, attract = false) {
		this.mode = attract ? "attract" : "playing";
		this.attract = attract;
		this.count = count;
		this.time = 0;
		this.elapsed = 0;
		this.score = 0;
		this.lives = 5;
		this.stage = 0;
		this.stageTime = 0;
		this.rescued = false;
		this.transition = 0;
		this.lap = 1;
		this.stats = {
			grabs: 0,
			jumps: 0,
			swats: 0,
			ducks: 0,
			pickups: 0,
			hits: 0,
			stages: 0,
		};
		this.build(0, count);
		this.event("start");
	}
	ground(x) {
		return this.stage === 2 ? x * 0.04 : 0;
	}
	build(stage, count = this.count || 1) {
		this.world?.free();
		this.stage = stage;
		this.stageTime = 0;
		this.transition = 0;
		this.bells = [false, false];
		this.world = new RAPIER.World({ x: 0, y: -this.config.gravity, z: 0 });
		this.world.timestep = 1 / 60;
		this.vines = [];
		this.enemies = [];
		this.collectibles = [];
		this.players = [];
		const ground = (x, y, w, h = 1, rot = 0) => {
			let b = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.fixed()
					.setTranslation(x, y, 0)
					.setRotation({
						x: 0,
						y: 0,
						z: Math.sin(rot / 2),
						w: Math.cos(rot / 2),
					}),
			);
			this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(w, h, 3).setFriction(0.8),
				b,
			);
		};
		if (stage === 0) {
			ground(-1, -1, 8);
			ground(110, -1, 10);
			for (let i = 0; i < 10; i++)
				this.vines.push({
					id: i,
					anchorX: 8 + i * 10,
					anchorY: 13,
					x: 8 + i * 10,
					y: 4,
					angle: 0,
				});
		} else if (stage === 1) {
			ground(55, -8, 70);
			ground(-5, 1, 5);
			ground(109, 1, 9);
			for (let i = 0; i < 12; i++)
				this.enemies.push({
					id: "c" + i,
					type: "croc",
					baseX: 16 + i * 7,
					x: 16 + i * 7,
					y: -1 - (i % 3) * 1.65,
					open: false,
					dead: false,
					phase: i * 1.9,
				});
		} else {
			ground(55, stage === 2 ? 1.2 : -1, 70, 1, stage === 2 ? 0.04 : 0);
			if (stage === 3) {
				for (let i = 0; i < 2; i++)
					this.enemies.push({
						id: "g" + i,
						type: "guard",
						baseX: 44 + i * 28,
						x: 44 + i * 28,
						y: 0,
						open: false,
						dead: false,
						phase: i * 1.6,
					});
			}
		}
		for (let i = 0; i < 14; i++) {
			let x = 12 + i * 6.4;
			this.collectibles.push({
				id: i,
				x,
				y:
					stage === 0
						? 4.5 + Math.sin(i) * 1.8
						: stage === 1
							? -3 + Math.sin(i * 1.2) * 3
							: this.ground(x) + 1.5 + (i % 4 === 1 ? 2 : 0),
				taken: false,
			});
		}
		for (let i = 0; i < count; i++) {
			let x = 2 + i * 1.8,
				y = stage === 1 ? 1 : this.ground(x);
			let body = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.dynamic()
					.setTranslation(x, y + 0.85, i * 0.28)
					.lockRotations()
					.enabledTranslations(true, true, false)
					.setCcdEnabled(true)
					.setCanSleep(false),
			);
			let collider = this.world.createCollider(
				RAPIER.ColliderDesc.capsule(0.48, 0.34)
					.setFriction(0)
					.setCollisionGroups(0x00010002),
				body,
			);
			this.players.push({
				id: i,
				body,
				collider,
				x,
				y,
				facing: 1,
				alive: true,
				anim: "idle",
				air: this.config.air,
				invuln: 1,
				attack: 0,
				duck: false,
				attached: -1,
				checkpoint: 2,
				lastJump: false,
				lastAction: false,
				grabDelay: 0,
				flight: 0,
				stun: 0,
			});
		}
		this.spawnTimer = 1;
		this.updateVines(0);
		this.event("stage", stage);
	}
	updateVines(t) {
		for (const v of this.vines) {
			v.angle = Math.sin(t * 1.45 * this.config.swing + v.id * 0.7) * 0.42;
			v.x = v.anchorX + Math.sin(v.angle) * 9;
			v.y = v.anchorY - Math.cos(v.angle) * 9;
		}
	}
	teleport(p, x, y) {
		p.body.setTranslation({ x, y: y + 0.85, z: p.id * 0.28 }, true);
		p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		p.x = x;
		p.y = y;
	}
	spawnRock() {
		const large =
			this.enemies.filter((e) => e.type === "rock").length % 3 === 1;
		const r = large ? 1.45 : 0.72;
		let lead = Math.max(...this.players.map((p) => p.x));
		let x = Math.max(34, lead + 23);
		const body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(x, this.ground(x) + (large ? 7 : 1.5), 0)
				.setLinvel(-8, large ? 1 : 0, 0)
				.enabledTranslations(true, true, false)
				.enabledRotations(false, false, true)
				.setCcdEnabled(true),
		);
		this.world.createCollider(
			RAPIER.ColliderDesc.ball(r)
				.setRestitution(large ? 0.95 : 0.2)
				.setFriction(0.5)
				.setCollisionGroups(0x00020002),
			body,
		);
		this.enemies.push({
			id: "r" + this.time,
			type: "rock",
			body,
			x,
			y: 0,
			r,
			large,
			angle: 0,
			dead: false,
		});
	}
	hurt(p, reason = "hit") {
		if (p.invuln > 0 || this.god || this.attract) return false;
		this.stats.hits++;
		this.lives--;
		p.invuln = 2.5;
		p.stun = 0.25;
		p.attached = -1;
		this.event(reason === "air" ? "air" : "hit");
		if (this.lives <= 0) {
			this.mode = "gameover";
			this.event("gameover");
			return true;
		}
		if (reason === "fall" || reason === "air") {
			this.teleport(
				p,
				p.checkpoint,
				this.stage === 0 ? 3 : this.stage === 1 ? 2 : this.ground(p.checkpoint),
			);
			p.air = this.config.air;
		} else {
			p.body.setLinvel({ x: -p.facing * 4, y: 7, z: 0 }, true);
		}
		return true;
	}
	advance() {
		if (this.mode === "won" || this.transition > 0) return;
		this.score += 1000 + Math.round(Math.max(0, 65 - this.stageTime) * 10);
		this.stats.stages++;
		this.event("complete");
		if (this.stage === 3) {
			this.rescued = true;
			this.mode = "won";
			this.event("win");
		} else {
			this.transition = 2;
		}
	}
	aiInput(p) {
		const input = { x: 1, y: 0, jump: false, action: false, duck: false };
		if (this.stage === 0) {
			if (p.attached >= 0) {
				input.jump = this.stageTime % 1.1 < 0.1;
			} else if (p.x < 7 && p.y < 0.3) input.jump = true;
			if (p.y < -1) {
				const v = this.vines.find((v) => v.x > p.x - 3) || this.vines.at(-1);
				this.teleport(p, v.x, v.y - 1.35);
				p.attached = v.id;
			}
			if (p.x > 94) {
				p.attached = -1;
				this.teleport(p, 104, 1);
			}
		}
		if (this.stage === 1) {
			input.y = Math.sin(this.stageTime * 0.8) > 0.3 ? 1 : -0.25;
			if (p.air < 6) input.y = 1;
			input.action = true;
		}
		if (this.stage === 2) {
			const e = this.enemies.find(
				(e) => e.type === "rock" && !e.dead && e.x - p.x > 0 && e.x - p.x < 7,
			);
			if (e) {
				input.duck = e.large && e.y - p.y > 2;
				input.jump = !input.duck;
			}
		}
		if (this.stage === 3) {
			input.jump = this.enemies.some((e) => Math.abs(e.x - p.x) < 7);
			input.action = true;
			if (p.x > 89 && !this.bells.every(Boolean)) {
				this.bells = [true, true];
			}
		}
		return input;
	}
	step(dt, inputs = []) {
		if (!["playing", "attract"].includes(this.mode)) return;
		dt = clamp(dt, 0, 0.04) * this.config.timeScale;
		this.time += dt;
		this.elapsed += dt;
		this.stageTime += dt;
		this.world.gravity.y = -this.config.gravity;
		this.updateVines(this.time);
		if (this.transition > 0) {
			this.transition -= dt;
			if (this.transition <= 0) this.build(this.stage + 1, this.players.length);
			return;
		}
		if (this.stage === 2) {
			this.spawnTimer -= dt;
			if (this.spawnTimer <= 0) {
				this.spawnRock();
				this.spawnTimer = 2.6 / this.config.hazard;
			}
		}
		for (const e of this.enemies) {
			if (e.type === "croc") {
				e.x = e.baseX + Math.sin(this.time * 0.7 + e.phase) * 3;
				e.y =
					-1.5 -
					(Number(e.id.slice(1)) % 3) * 1.6 +
					Math.sin(this.time * 0.8 + e.phase) * 0.7;
				e.open = Math.sin(this.time * 1.7 + e.phase) > 0.35;
			} else if (e.type === "guard") {
				e.x = e.baseX + Math.sin(this.time * 1.5 + e.phase) * 3;
				e.open = Math.sin(this.time * 2.8 + e.phase) > 0.2;
				e.y = 0;
			}
		}
		for (let idx = 0; idx < this.players.length; idx++) {
			const p = this.players[idx];
			let inp = this.auto || this.attract ? this.aiInput(p) : inputs[idx] || {};
			let pos = p.body.translation();
			p.x = pos.x;
			p.y = pos.y - 0.85;
			p.invuln = Math.max(0, p.invuln - dt);
			p.attack = Math.max(0, p.attack - dt);
			p.grabDelay = Math.max(0, p.grabDelay - dt);
			p.flight = Math.max(0, p.flight - dt);
			p.stun = Math.max(0, p.stun - dt);
			let jump = !!inp.jump && !p.lastJump,
				action = !!inp.action && !p.lastAction;
			p.lastJump = !!inp.jump;
			p.lastAction = !!inp.action;
			p.duck = !!inp.duck && this.stage !== 1;
			let dx = clamp(inp.x || 0, -1, 1),
				dy = clamp(inp.y || 0, -1, 1);
			if (dx) p.facing = dx > 0 ? 1 : -1;
			if (p.duck && !p.wasDuck) {
				this.stats.ducks++;
			}
			p.wasDuck = p.duck;
			if (this.stage === 1) {
				p.body.setGravityScale(0, true);
				p.body.setLinvel(
					{
						x: dx * this.config.speed * 0.78,
						y: dy * this.config.speed * 0.66,
						z: 0,
					},
					true,
				);
				if (p.y > 2.1) {
					p.air = Math.min(this.config.air, p.air + dt * 9);
				} else {
					p.air -= dt;
					if (p.air <= 0) {
						this.hurt(p, "air");
						p.air = this.config.air;
					}
				}
				if (p.y > 3) this.teleport(p, p.x, 3);
				if (p.y < -6.4) this.teleport(p, p.x, -6.4);
				p.anim = Math.abs(dx) + Math.abs(dy) > 0.1 ? "swim" : "idle";
				if (
					(inp.action ||
						jump ||
						((this.auto || this.attract) && p.attack <= 0)) &&
					p.attack <= 0
				) {
					p.attack = 0.45;
					this.stats.swats++;
					this.event("knife");
				}
			} else {
				p.body.setGravityScale(p.attached >= 0 ? 0 : 1, true);
				const grounded =
					(this.stage !== 0 || p.x < 7 || p.x > 100) &&
					p.y <= this.ground(p.x) + 0.13 &&
					p.body.linvel().y < 1;
				if (p.attached >= 0) {
					const v = this.vines[p.attached];
					this.teleport(p, v.x, v.y - 1.5);
					p.anim = "swing";
					if (jump) {
						const next = this.vines[p.attached + (dx < -0.2 ? -1 : 1)];
						let vx, vy;
						if (next) {
							const targetTime = this.time + 0.72;
							const ang =
								Math.sin(
									targetTime * 1.45 * this.config.swing + next.id * 0.7,
								) * 0.42;
							let tx = next.anchorX + Math.sin(ang) * 9;
							let ty = 13 - Math.cos(ang) * 9 - 1.5;
							vx = (tx - p.x) / 0.72;
							vy = (ty - p.y + 0.5 * this.config.gravity * 0.72 ** 2) / 0.72;
						} else {
							vx = 12;
							vy = 7;
						}
						p.attached = -1;
						p.grabDelay = 0.26;
						p.flight = 0.65;
						p.body.setGravityScale(1, true);
						p.body.setLinvel({ x: vx, y: vy, z: 0 }, true);
						this.stats.jumps++;
						this.event("jump");
					}
				} else {
					let v = p.body.linvel();
					if (p.stun <= 0 && p.flight <= 0)
						p.body.setLinvel(
							{ x: dx * this.config.speed * (p.duck ? 0.4 : 1), y: v.y, z: 0 },
							true,
						);
					if (jump && grounded && !p.duck) {
						let vx = dx * this.config.speed,
							vy = this.config.jump;
						if (this.stage === 0 && p.x < 8) {
							const target = this.vines[0],
								flight = 0.7,
								ang =
									Math.sin((this.time + flight) * 1.45 * this.config.swing) *
									0.42;
							const tx = target.anchorX + Math.sin(ang) * 9,
								ty = target.anchorY - Math.cos(ang) * 9 - 1.5;
							vx = (tx - p.x) / flight;
							vy =
								(ty - p.y + 0.5 * this.config.gravity * flight * flight) /
								flight;
						}
						p.body.setLinvel({ x: vx, y: vy, z: 0 }, true);
						p.flight = this.stage === 0 ? 0.78 : 0;
						this.stats.jumps++;
						this.event("jump");
					}
					p.anim = p.duck
						? "duck"
						: !grounded
							? "jump"
							: Math.abs(dx) > 0.1
								? "run"
								: "idle";
					if (this.stage === 0 && p.grabDelay <= 0) {
						for (const v of this.vines) {
							const dist = Math.hypot(p.x - v.x, p.y + 1.5 - v.y);
							if (dist < 2.25 && (p.body.linvel().y < 6 || p.flight < 0.25)) {
								p.attached = v.id;
								p.checkpoint = v.x;
								p.body.setGravityScale(0, true);
								this.stats.grabs++;
								this.event("grab");
								break;
							}
						}
					}
				}
				if (this.stage === 3 && action) {
					let bell = p.x < 59 ? 0 : 1,
						bx = bell === 0 ? 37 : 66;
					if (Math.abs(p.x - bx) < 5 && !this.bells[bell]) {
						this.bells[bell] = true;
						this.score += 500;
						this.event("bell", bell);
					}
					if (p.x > 92 && this.bells.every(Boolean)) this.advance();
				}
			}
			if (p.x < 0) this.teleport(p, 0, p.y);
			if (p.y < -12) {
				if (this.attract || this.god) {
					this.teleport(p, p.checkpoint, 3);
					p.attached = -1;
				} else this.hurt(p, "fall");
			}
			for (const c of this.collectibles) {
				if (!c.taken && Math.hypot(p.x - c.x, p.y + 1 - c.y) < 1.75) {
					c.taken = true;
					this.score += 100;
					this.stats.pickups++;
					this.event("coin");
				}
			}
			for (const e of this.enemies) {
				if (e.dead) continue;
				if (
					e.type === "croc" &&
					Math.abs(p.x - e.x) < 3 &&
					Math.abs(p.y + 0.8 - e.y) < 1.3
				) {
					if (p.attack > 0 && !e.open) {
						e.dead = true;
						this.score += 250;
						this.event("splash");
					} else if (Math.abs(p.x - e.x) < 1.9) this.hurt(p);
				}
				if (e.type === "rock") {
					const rpos = e.body.translation();
					e.x = rpos.x;
					e.y = rpos.y;
					e.angle = e.body.rotation().z * 2;
					if (
						Math.abs(p.x - e.x) < e.r + 0.45 &&
						Math.abs(p.y + (p.duck ? 0.4 : 0.9) - e.y) <
							e.r + (p.duck ? 0.15 : 0.65)
					)
						this.hurt(p);
				}
				if (
					e.type === "guard" &&
					Math.abs(p.x - e.x) < 1.8 &&
					p.y < (e.open ? 3.5 : 1.8)
				)
					this.hurt(p);
			}
			if (
				this.stage === 3 &&
				p.x > 96 &&
				this.bells.every(Boolean) &&
				(this.attract || this.auto)
			)
				this.advance();
			if (p.x > 103 && this.stage < 3 && this.transition <= 0) this.advance();
		}
		this.world.timestep = dt;
		this.world.step();
		for (const p of this.players) {
			const pos = p.body.translation();
			p.x = pos.x;
			p.y = pos.y - 0.85;
		}
		for (const e of this.enemies)
			if (e.type === "rock") {
				const pos = e.body.translation();
				e.x = pos.x;
				e.y = pos.y;
			}
		this.enemies = this.enemies.filter((e) => {
			if (e.type === "rock" && (e.x < -10 || e.y < -10)) {
				this.world.removeRigidBody(e.body);
				return false;
			}
			return true;
		});
		if (this.elapsed > 420 && !this.attract) {
			this.mode = "gameover";
			this.event("gameover");
		}
	}
	snapshot() {
		return {
			time: this.time,
			elapsed: this.elapsed,
			stage: this.stage,
			stageTime: this.stageTime,
			score: this.score,
			lives: this.lives,
			mode: this.mode,
			transition: this.transition,
			attract: this.attract,
			rescued: this.rescued,
			bells: [...this.bells],
			stats: { ...this.stats },
			players: this.players.map(({ body, collider, ...p }) => p),
			vines: this.vines.map((v) => ({ ...v })),
			enemies: this.enemies.map(({ body, ...e }) => e),
			collectibles: this.collectibles.map((c) => ({ ...c })),
			cameraX: this.players[0]?.x || 5,
		};
	}
}
