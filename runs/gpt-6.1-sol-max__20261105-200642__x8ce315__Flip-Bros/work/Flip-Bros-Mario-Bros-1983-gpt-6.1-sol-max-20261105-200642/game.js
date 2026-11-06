const DEFAULTS = {
	speed: 7.6,
	jump: 16,
	gravity: 32,
	enemyPace: 1,
	stunTime: 7,
	spawnInterval: 2.8,
	timeScale: 1,
	invincible: false,
	autoplay: false,
};
const balance = { ...DEFAULTS };
const SHIFTS = [
	null,
	{
		name: "PIPE DREAMS",
		subtitle: "Bump below. Kick above.",
		types: ["crab", "crab", "crab", "crab", "crab", "crab"],
		color: C.teal,
	},
	{
		name: "DOUBLE TROUBLE",
		subtitle: "Hard hats take two bumps. Hoppers have spring!",
		types: [
			"hopper",
			"armored",
			"crab",
			"hopper",
			"armored",
			"crab",
			"hopper",
			"armored",
		],
		color: C.copper,
	},
	{
		name: "COLD FEET",
		subtitle: "Ice is slippery. Watch the travelling sparks!",
		types: [
			"frost",
			"crab",
			"frost",
			"hopper",
			"armored",
			"frost",
			"hopper",
			"crab",
			"armored",
			"frost",
		],
		color: C.ice,
	},
	{
		name: "KING CLOG",
		subtitle: "Three flip-and-kicks will blow his lid!",
		types: ["boss", "armored", "frost", "hopper", "crab", "armored", "hopper"],
		color: C.red,
	},
];
const EMPTY_INPUT = () => ({ x: 0, jump: false, dash: false, bell: false });
let uid = 1;
class Game {
	constructor() {
		this.world = null;
		this.players = [];
		this.enemies = [];
		this.coins = [];
		this.ice = [];
		this.sparks = [];
		this.phase = 1;
		this.status = "idle";
		this.score = 0;
		this.combo = 0;
		this.comboTime = 0;
		this.bestCombo = 0;
		this.time = 0;
		this.stageTime = 0;
		this.lives = 6;
		this.charges = 3;
		this.attract = false;
		this.clearTime = 0;
		this.left = [];
		this.network = false;
		this.usedDev = false;
		this.metrics = {
			bumps: 0,
			flips: 0,
			kicks: 0,
			coins: 0,
			hurts: 0,
			bells: 0,
		};
	}
	reset(records = [{ id: 0, name: "Axle" }], attract = false) {
		if (this.world) this.world.free();
		for (const a of [...this.players, ...this.enemies, ...this.coins])
			this.removeVisual(a);
		for (const i of this.ice) actors.remove(i.mesh);
		for (const s of this.sparks) actors.remove(s.mesh);
		this.players = [];
		this.enemies = [];
		this.coins = [];
		this.ice = [];
		this.sparks = [];
		this.world = new RAPIER.World({ x: 0, y: -balance.gravity });
		this.world.timestep = 1 / 60;
		this.platformColliders = platforms.map((p) =>
			this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(p.w / 2, 0.28)
					.setTranslation(p.x, p.y - 0.28)
					.setCollisionGroups(0x00010002)
					.setFriction(0),
			),
		);
		this.bellCollider = this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(0.78, 0.54)
				.setTranslation(0, 2.65)
				.setCollisionGroups(0x00010002)
				.setFriction(0),
		);
		bellVisual.position.y = 2.65;
		this.score = 0;
		this.time = 0;
		this.stageTime = 0;
		this.phase = 1;
		this.lives = 6 + Math.max(0, records.length - 1) * 2;
		this.charges = 3;
		this.combo = 0;
		this.comboTime = 0;
		this.bestCombo = 0;
		this.clearTime = 0;
		this.attract = attract;
		this.usedDev = false;
		this.left = [];
		this.metrics = {
			bumps: 0,
			flips: 0,
			kicks: 0,
			coins: 0,
			hurts: 0,
			bells: 0,
		};
		for (const [i, r] of records.entries())
			this.addPlayer(r.id, r.name, (i - (records.length - 1) / 2) * 2.1 - 3.3);
		this.status = "playing";
		this.startShift(1, false);
	}
	body(x, y, half = 0.3, radius = 0.33) {
		const b = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(x, y)
				.lockRotations()
				.setCcdEnabled(true)
				.setLinearDamping(0),
		);
		const c = this.world.createCollider(
			RAPIER.ColliderDesc.capsule(half, radius)
				.setCollisionGroups(0x00020001)
				.setFriction(0)
				.setRestitution(0),
			b,
		);
		return { body: b, collider: c };
	}
	addPlayer(id, name = "Repair crew", x = -4) {
		if (this.players.some((p) => p.id === id)) return;
		const m = heroModel(id);
		actors.add(m);
		const p = {
			id,
			name,
			...this.body(x, 1.12),
			m,
			shadow: shadow(),
			half: 0.63,
			x,
			y: 1.12,
			dir: 1,
			grounded: true,
			coyote: 0.12,
			buffer: 0,
			prevJump: false,
			prevBell: false,
			prevDash: false,
			inv: 1.5,
			dash: 0,
			dashCD: 0,
			bumpCD: 0,
			points: 0,
			botTimer: 0,
			botStep: 0,
		};
		this.players.push(p);
		return p;
	}
	removeVisual(e) {
		if (e.m) {
			e.m.userData.mixer?.stopAllAction();
			actors.remove(e.m);
		}
		if (e.shadow) actors.remove(e.shadow);
	}
	removeActor(e, list) {
		this.removeVisual(e);
		if (e.body && this.world.getRigidBody(e.body.handle))
			this.world.removeRigidBody(e.body);
		const i = list.indexOf(e);
		if (i >= 0) list.splice(i, 1);
	}
	removePlayer(id) {
		const p = this.players.find((p) => p.id === id);
		if (p) {
			this.left.push({ id, points: p.points });
			this.removeActor(p, this.players);
		}
	}
	startShift(n, announce = true) {
		this.phase = n;
		this.stageTime = 0;
		this.status = "playing";
		this.charges = 3;
		this.bellCD = 0;
		this.spawnClock = 0.7;
		this.queue = [...SHIFTS[n].types];
		this.total = this.queue.length;
		for (const e of [...this.enemies]) this.removeActor(e, this.enemies);
		for (const c of [...this.coins]) this.removeActor(c, this.coins);
		for (const i of this.ice) actors.remove(i.mesh);
		for (const s of this.sparks) actors.remove(s.mesh);
		this.ice = [];
		this.sparks = [];
		this.bonus = false;
		this.clearTime = 0;
		for (const [i, p] of this.players.entries()) {
			p.body.setTranslation({ x: -4 + i * 2, y: 1.12 }, true);
			p.body.setLinvel({ x: 0, y: 0 }, true);
			p.inv = 2;
		}
		if (announce) {
			notify(
				"SHIFT " + String(n).padStart(2, "0") + " · " + SHIFTS[n].name,
				2.6,
			);
			audio.voice("hello");
		}
		updateHUD();
	}
	spawnEnemy(type = "crab", x = null, y = null) {
		const boss = type === "boss";
		const dir = Math.random() < 0.5 ? 1 : -1;
		if (x === null) x = boss ? 0 : -dir * 11.5;
		if (y === null) y = boss ? 8.76 : 12.05;
		const e = {
			id: uid++,
			type,
			...this.body(x, y, boss ? 0.35 : 0.15, boss ? 0.78 : 0.42),
			x,
			y,
			half: boss ? 1.13 : 0.57,
			dir,
			stun: 0,
			armor: type === "armored" ? 1 : 0,
			hp: boss ? 3 : 1,
			immune: 0,
			speed: type === "hopper" ? 2.3 : type === "boss" ? 1.8 : 1.7,
			hop: 1.5 + Math.random() * 2,
			iceClock: 1.5,
			m: enemyModel(type),
			shadow: shadow(),
			grounded: false,
		};
		actors.add(e.m);
		this.enemies.push(e);
		burst(x, y, C.teal, 10, 2);
		return e;
	}
	coin(x, y, vx = 0, bonus = false) {
		const c = { id: uid++, x, y, bonus, life: bonus ? 25 : 13, m: coinModel() };
		if (!bonus) {
			Object.assign(c, this.body(x, y, 0, 0.24));
			c.body.setLinvel({ x: vx, y: 5.5 }, true);
			c.collider.setRestitution(0.45);
		}
		actors.add(c.m);
		const mix = new THREE.AnimationMixer(c.m);
		mix
			.clipAction(
				new THREE.AnimationClip("coin-spin", 1, [
					new THREE.NumberKeyframeTrack(
						".rotation[z]",
						[0, 0.5, 1],
						[0, Math.PI, Math.PI * 2],
					),
				]),
			)
			.play();
		c.m.userData.mixer = mix;
		this.coins.push(c);
		return c;
	}
	bump(platform, x, by) {
		this.metrics.bumps++;
		platform.action.reset().play();
		audio.sfx("bump");
		shake = Math.max(shake, 0.07);
		burst(x, platform.y, C.paper, 8, 2.5);
		let count = 0;
		for (const e of this.enemies) {
			const f = floorAt(e.x, e.y - e.half + 0.15);
			if (
				f?.index === platform.index &&
				Math.abs(e.x - x) < (e.type === "boss" ? 2.8 : 2.2) &&
				e.y - e.half - platform.y < 1.1
			) {
				if (this.flip(e, by)) count++;
			}
		}
		if (count)
			floatText(
				count > 1 ? "DOUBLE FLIP!" : "FLIP!",
				x,
				platform.y + 1.1,
				"#b5f2c8",
				true,
			);
	}
	flip(e, by) {
		if (e.immune > 0) return false;
		if (e.stun > 0) {
			e.stun = 0;
			e.dir *= -1;
			e.immune = 0.7;
			floatText("BACK UP!", e.x, e.y + 1, "#ffb77f");
			return false;
		}
		if (e.armor > 0) {
			e.armor--;
			e.immune = 0.35;
			burst(e.x, e.y, C.gold, 18, 5);
			audio.sfx("bump");
			floatText("CRACK!", e.x, e.y + 1, "#ffda70", true);
			return false;
		}
		e.stun = balance.stunTime;
		e.body.setLinvel({ x: 0, y: 3.7 }, true);
		e.by = by?.id ?? 0;
		this.metrics.flips++;
		audio.sfx("flip");
		burst(e.x, e.y, C.gold, 9, 3);
		return true;
	}
	ring(p) {
		if (this.charges <= 0 || this.bellCD > 0) return false;
		this.charges--;
		this.bellCD = 1.2;
		this.metrics.bells++;
		bellAction.reset().play();
		audio.sfx("bell");
		shake = 0.24;
		for (const e of this.enemies) if (!e.stun) this.flip(e, p);
		for (let i = 0; i < 35; i++) {
			const a = (i / 35) * Math.PI * 2;
			burst(Math.cos(a) * 3, 2.65 + Math.sin(a) * 1.3, C.gold, 1, 5);
		}
		floatText("RRRING!", 0, 3.5, "#ffda70", true);
		updateHUD();
		return true;
	}
	kick(e, p) {
		if (e.stun <= 0) return false;
		this.combo = this.comboTime > 0 ? Math.min(this.combo + 1, 8) : 1;
		this.comboTime = 4;
		this.bestCombo = Math.max(this.bestCombo, this.combo);
		const pts = (e.type === "boss" ? 750 : 200) * this.combo;
		this.score += pts;
		p.points += pts;
		this.metrics.kicks++;
		audio.sfx("kick");
		shake = 0.12;
		floatText("+" + pts, e.x, e.y + 1);
		burst(e.x, e.y, e.type === "frost" ? C.ice : C.gold, 22, 7);
		this.coin(e.x, e.y + 0.5, -1.3);
		this.coin(e.x, e.y + 0.5, 1.3);
		if (e.type === "boss" && e.hp > 1) {
			e.hp--;
			e.stun = 0;
			e.immune = 2.3;
			e.dir = -e.dir;
			e.body.setLinvel({ x: 0, y: 5 }, true);
			floatText(e.hp + " LIDS LEFT!", e.x, e.y + 2, "#ffad7c", true);
		} else {
			const dead = enemyModel(e.type);
			dead.position.set(e.x, e.y, 0.1);
			effectsGroup.add(dead);
			const thrown = {
				m: dead,
				x: e.x,
				y: e.y,
				z: 0,
				vx: p.dir * 9,
				vy: 12,
				t: 1.4,
				max: 1.4,
			};
			particles.push(thrown);
			this.removeActor(e, this.enemies);
		}
		if (this.combo >= 2) audio.voice("hello");
		updateHUD();
		return true;
	}
	hurt(p, sourceX) {
		if (p.inv > 0 || p.dash > 0 || balance.invincible || this.attract) return;
		p.inv = 2.3;
		this.lives--;
		this.metrics.hurts++;
		this.combo = 0;
		this.comboTime = 0;
		p.body.setLinvel({ x: (p.x < sourceX ? -1 : 1) * 7, y: 8.5 }, true);
		burst(p.x, p.y, C.red, 20, 6);
		audio.sfx("hurt");
		shake = 0.24;
		floatText("OUCH!", p.x, p.y + 1, "#ff9e8b", true);
		if (this.lives <= 0) this.finish(false);
		updateHUD();
	}
	bonusRound() {
		this.phase = 2;
		this.bonus = true;
		this.status = "playing";
		this.bonusLeft = 22;
		this.stageTime = 0;
		this.queue = [];
		for (const e of [...this.enemies]) this.removeActor(e, this.enemies);
		for (const c of [...this.coins]) this.removeActor(c, this.coins);
		for (let i = 0; i < 6; i++) this.coin(-11 + i * 4.4, 1.45, 0, true);
		for (const x of [-11, -7, -3.7, 3.7, 7, 11]) this.coin(x, 5.05, 0, true);
		for (const x of [-7, -2.3, 2.3, 7]) this.coin(x, 8.7, 0, true);
		for (const x of [-11, -6, 6, 11]) this.coin(x, 12.25, 0, true);
		this.bonusTotal = this.coins.length;
		notify("PAYDAY! · Grab every coin!", 3);
		audio.sfx("clear");
		updateHUD();
	}
	finish(won) {
		if (this.status === "won" || this.status === "lost") return;
		this.status = won ? "won" : "lost";
		this.won = won;
		if (won) {
			this.score += this.lives * 250;
			audio.sfx("clear");
			audio.voice("win", 0.6);
		} else audio.sfx("lose");
		if (!this.attract) {
			try {
				if (
					!AIHub.active &&
					this.score > Number(localStorage.getItem("flipbros-best") || 0)
				)
					localStorage.setItem("flipbros-best", String(this.score));
			} catch {}
			finishOnline(won);
			if (!AIHub.active) showResult(won);
		}
		updateHUD();
	}
	autopilot(p, dt) {
		p.botTimer -= dt;
		const available = this.enemies.filter((e) => !this.botClaims?.has(e.id));
		let target = available.find((e) => e.stun > 0) || available[0];
		if (target) this.botClaims?.add(target.id);
		if (this.bonus) {
			const c = this.coins[0];
			if (c) {
				if (p.botTimer <= 0) {
					p.body.setTranslation({ x: c.x - 0.65, y: c.y }, true);
					p.body.setLinvel({ x: 0, y: 0 }, true);
					p.botTimer = 0.5;
				}
				return { x: 1, jump: false, dash: false, bell: false };
			}
			return EMPTY_INPUT();
		}
		if (!target) return EMPTY_INPUT();
		if (p.botTimer <= 0) {
			if (target.stun) {
				p.body.setTranslation({ x: target.x - 1.5, y: target.y + 0.12 }, true);
				p.body.setLinvel({ x: 0, y: 0 }, true);
				p.botTimer = 1;
			} else {
				const f = floorAt(target.x, target.y - target.half + 0.2);
				if (f && f.index > 0) {
					p.body.setTranslation({ x: target.x, y: f.y - 1.5 }, true);
					p.body.setLinvel({ x: 0, y: balance.jump }, true);
					p.botTimer = 0.7;
				} else {
					if (this.charges <= 0) this.charges = 3;
					this.bellCD = 0;
					this.ring(p);
					p.botTimer = 0.5;
				}
			}
		}
		return {
			x: target.stun ? Math.sign(target.x - p.x) : 0,
			jump: false,
			dash: false,
			bell: false,
		};
	}
	step(dt, inputs = {}) {
		if (!this.world || !["playing", "clear"].includes(this.status)) return;
		this.time += dt;
		this.stageTime += dt;
		this.comboTime = Math.max(0, this.comboTime - dt);
		if (this.comboTime === 0) this.combo = 0;
		this.bellCD = Math.max(0, (this.bellCD || 0) - dt);
		this.world.gravity.y = -balance.gravity;
		this.world.timestep = dt;
		if (this.status === "clear") {
			this.clearTime -= dt;
			if (this.clearTime <= 0) {
				if (this.phase === 2 && !this.bonus) this.bonusRound();
				else this.startShift(this.phase + 1);
			}
			return;
		}
		if (this.bonus) {
			this.bonusLeft -= dt;
			if (this.bonusLeft <= 0 || this.coins.length === 0) {
				const perfect = this.coins.length === 0;
				if (perfect) {
					this.score += 1500;
					this.lives = Math.min(12, this.lives + 1);
					notify("PERFECT PAYDAY! +1500 · +1 LIFE", 3);
				}
				this.startShift(3, false);
				audio.sfx("clear");
				return;
			}
		} else {
			this.spawnClock -= dt;
			if (this.queue.length && this.spawnClock <= 0) {
				this.spawnEnemy(this.queue.shift());
				this.spawnClock = balance.spawnInterval * (this.attract ? 0.65 : 1);
			}
			if (this.phase >= 3 && this.stageTime > 12 && this.sparks.length === 0)
				this.makeSparks();
		}
		this.botClaims = new Set();
		for (const p of this.players) {
			const pos = p.body.translation();
			let vel = p.body.linvel();
			p.x = pos.x;
			p.y = pos.y;
			p.inv = Math.max(0, p.inv - dt);
			p.dashCD = Math.max(0, p.dashCD - dt);
			p.dash = Math.max(0, p.dash - dt);
			p.bumpCD = Math.max(0, p.bumpCD - dt);
			const f = floorAt(p.x, p.y - p.half + 0.12);
			p.grounded = !!f && Math.abs(p.y - p.half - f.y) < 0.14 && vel.y < 1.2;
			p.coyote = p.grounded ? 0.12 : Math.max(0, p.coyote - dt);
			const inp =
				this.attract || balance.autoplay
					? this.autopilot(p, dt)
					: inputs[p.id] || EMPTY_INPUT();
			vel = p.body.linvel();
			const axis = clamp(Number(inp.x) || 0, -1, 1);
			if (Math.abs(axis) > 0.1) p.dir = Math.sign(axis);
			if (inp.jump && !p.prevJump) p.buffer = 0.14;
			else p.buffer = Math.max(0, p.buffer - dt);
			if (inp.bell && !p.prevBell) this.ring(p);
			if (inp.dash && !p.prevDash && p.dashCD <= 0) {
				p.dash = 0.2;
				p.dashCD = 0.95;
				audio.sfx("dash");
				burst(p.x, p.y, C.paper, 5, 3);
			}
			p.prevJump = !!inp.jump;
			p.prevBell = !!inp.bell;
			p.prevDash = !!inp.dash;
			let vy = vel.y;
			if (p.buffer > 0 && p.coyote > 0) {
				vy = balance.jump;
				p.buffer = 0;
				p.coyote = 0;
				p.grounded = false;
				audio.sfx("jump");
			}
			if (
				!inp.jump &&
				p.prevHeldJump &&
				vy > 6 &&
				!this.attract &&
				!balance.autoplay
			)
				vy *= 0.65;
			p.prevHeldJump = !!inp.jump;
			const icy = this.ice.some(
				(i) =>
					Math.abs(i.x - p.x) < 1.25 && Math.abs(i.y - (p.y - p.half)) < 0.3,
			);
			const accel = icy ? 2.5 : p.grounded ? 26 : 13;
			let vx =
				p.dash > 0
					? p.dir * balance.speed * 2.25
					: lerp(vel.x, axis * balance.speed, Math.min(1, dt * accel));
			if (p.inv > 1.8 && Math.abs(vel.x) > balance.speed) vx = vel.x * 0.98;
			p.preY = p.body.translation().y;
			p.preVy = vy;
			p.body.setLinvel({ x: vx, y: vy }, true);
		}
		for (const e of this.enemies) {
			e.x = e.body.translation().x;
			e.y = e.body.translation().y;
			e.immune = Math.max(0, e.immune - dt);
			const v = e.body.linvel();
			const f = floorAt(e.x, e.y - e.half + 0.15);
			e.grounded =
				!!f && Math.abs(e.y - e.half - f.y) < 0.18 && Math.abs(v.y) < 1.2;
			if (e.grounded && f && e.lastFloor !== f.index) {
				if (f.index === 1 || f.index === 2) e.dir = -Math.sign(e.x || 1);
				e.lastFloor = f.index;
			}
			e.stun = Math.max(0, e.stun - dt);
			let vy = v.y;
			e.hop -= dt;
			e.iceClock -= dt;
			if (e.type === "hopper" && e.grounded && e.hop <= 0 && !e.stun) {
				vy = 6.4;
				e.hop = 1.8;
			}
			if (e.type === "boss" && Math.abs(e.x) > 8.4) e.dir = -Math.sign(e.x);
			if (e.type === "frost" && e.grounded && !e.stun && e.iceClock <= 0) {
				this.addIce(e.x, f.y);
				e.iceClock = 1.6;
			}
			e.body.setLinvel(
				{
					x: e.stun
						? 0
						: e.dir *
							e.speed *
							balance.enemyPace *
							(e.type === "boss" ? 1 + (3 - e.hp) * 0.22 : 1),
					y: vy,
				},
				true,
			);
		}
		this.world.step();
		for (const p of this.players) {
			const pos = p.body.translation(),
				v = p.body.linvel();
			p.x = pos.x;
			p.y = pos.y;
			if (Math.abs(p.x) > 15.2) {
				p.x = -Math.sign(p.x) * 14.8;
				p.body.setTranslation({ x: p.x, y: p.y }, true);
				burst(p.x, p.y, C.teal, 6, 2);
			}
			if (p.y < -0.5) {
				p.body.setTranslation({ x: -4, y: 1.15 }, true);
				p.body.setLinvel({ x: 0, y: 0 }, true);
				this.hurt(p, 0);
			}
			if (p.preVy > 1 && v.y < 1 && p.bumpCD <= 0) {
				const head = p.y + p.half;
				if (Math.abs(head - 2.11) < 0.22 && Math.abs(p.x) < 1.1) {
					this.ring(p);
					p.bumpCD = 0.28;
				} else {
					for (const f of platforms) {
						const underside = f.y - 0.56;
						if (
							f.index > 0 &&
							p.x > f.x - f.w / 2 - 0.25 &&
							p.x < f.x + f.w / 2 + 0.25 &&
							Math.abs(head - underside) < 0.25
						) {
							this.bump(f, p.x, p);
							p.bumpCD = 0.28;
							break;
						}
					}
				}
			}
			for (const e of [...this.enemies]) {
				if (
					Math.abs(e.x - p.x) < (e.type === "boss" ? 1.37 : 0.94) &&
					Math.abs(e.y - p.y) < (e.type === "boss" ? 1.35 : 0.9)
				) {
					if (e.stun > 0) this.kick(e, p);
					else if (e.immune < 1.5) this.hurt(p, e.x);
				}
			}
			for (const c of [...this.coins])
				if (Math.hypot(c.x - p.x, c.y - p.y) < 1.05) {
					const pts = c.bonus ? 100 : 50;
					this.score += pts;
					p.points += pts;
					this.metrics.coins++;
					audio.sfx("coin");
					burst(c.x, c.y, C.gold, 6, 2);
					this.removeActor(c, this.coins);
				}
			for (const s of this.sparks)
				if (Math.hypot(s.x - p.x, s.y - p.y) < 0.95) this.hurt(p, s.x);
		}
		for (const e of this.enemies) {
			e.x = e.body.translation().x;
			e.y = e.body.translation().y;
			if (e.y < 1.2 && Math.abs(e.x) > 13.1) {
				const x = Math.sign(e.x) * 11.6;
				e.body.setTranslation({ x, y: 12.2 }, true);
				e.body.setLinvel({ x: -Math.sign(x) * e.speed, y: 0 }, true);
				e.dir = -Math.sign(x);
				e.speed = Math.min(3.4, e.speed * 1.08);
				burst(x, 12, C.teal, 8, 3);
			} else if (Math.abs(e.x) > 15.1) {
				e.body.setTranslation({ x: -Math.sign(e.x) * 14.8, y: e.y }, true);
			}
			if (e.y < -0.5) {
				e.body.setTranslation({ x: 11, y: 12.3 }, true);
			}
		}
		for (const c of [...this.coins]) {
			c.life -= dt;
			if (c.body) {
				c.x = c.body.translation().x;
				c.y = c.body.translation().y;
			}
			if (c.life <= 0 || c.y < -2) this.removeActor(c, this.coins);
		}
		for (let i = this.ice.length - 1; i >= 0; i--) {
			this.ice[i].life -= dt;
			this.ice[i].mesh.scale.x = Math.min(1, this.ice[i].life);
			if (this.ice[i].life <= 0) {
				actors.remove(this.ice[i].mesh);
				this.ice.splice(i, 1);
			}
		}
		for (const [i, s] of this.sparks.entries()) {
			s.x = Math.sin(this.stageTime * 0.45 + i * Math.PI) * 13.5;
			s.y = 2.05 + i * 3.6 + Math.sin(this.stageTime * 2) * 0.12;
			s.mesh.position.set(s.x, s.y, 0.4);
			s.mesh.rotation.z += dt * 4;
		}
		if (
			!this.bonus &&
			this.queue.length === 0 &&
			this.enemies.length === 0 &&
			this.status === "playing"
		) {
			if (this.phase === 4) this.finish(true);
			else {
				this.status = "clear";
				this.clearTime = 3;
				this.score += 500;
				notify("SHIFT CLEAR! · +500", 2.6);
				audio.sfx("clear");
			}
		}
		updateHUD();
	}
	addIce(x, y) {
		const m = box(actors, 0xb0f1ef, [x, y + 0.03, 0.15], [2.3, 0.09, 1.6]);
		this.ice.push({ x, y, life: 7.5, mesh: m });
	}
	makeSparks() {
		for (let i = 0; i < (this.phase === 4 ? 2 : 1); i++) {
			const m = new THREE.Group();
			ball(m, C.gold, [0, 0, 0], [0.38, 0.38, 0.3]);
			for (let j = 0; j < 8; j++) {
				const a = (j * Math.PI) / 4,
					ray = box(
						m,
						C.copper,
						[Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0],
						[0.38, 0.1, 0.1],
					);
				ray.rotation.z = a;
			}
			actors.add(m);
			this.sparks.push({ x: 0, y: 2.05 + i * 3.6, mesh: m });
		}
		notify("HOT STUFF! Watch the sparks.", 2.5);
	}
	draw(dt) {
		for (const p of this.players) {
			const pos = p.body.translation(),
				v = p.body.linvel(),
				ud = p.m.userData;
			const target = new THREE.Vector3(
				pos.x,
				pos.y - p.half,
				0.25 + p.id * 0.04,
			);
			p.m.position.lerp(target, Math.min(1, dt * 25));
			p.m.rotation.y = lerp(p.m.rotation.y, p.dir * 0.4, Math.min(1, dt * 12));
			p.m.rotation.z = lerp(
				p.m.rotation.z,
				p.dash > 0 ? -p.dir * 0.2 : 0,
				Math.min(1, dt * 14),
			);
			p.m.visible =
				this.status === "idle" || p.inv <= 0 || Math.sin(this.time * 35) > 0.0;
			let anim =
				Math.abs(v.y) > 1.5 ? "jump" : Math.abs(v.x) > 0.7 ? "walk" : "idle";
			if (anim !== ud.current) {
				ud.actions[ud.current].fadeOut(0.1);
				ud.actions[anim].reset().fadeIn(0.1).play();
				ud.current = anim;
			}
			ud.mixer.timeScale =
				anim === "walk" ? Math.max(0.6, Math.abs(v.x) / 5) : 1;
			ud.mixer.update(dt);
			const f = floorAt(pos.x, pos.y - p.half + 0.1);
			p.shadow.visible = !!f;
			p.shadow.position.set(pos.x, (f?.y || 0.45) + 0.035, 0.1);
			p.shadow.scale.setScalar(
				Math.max(0.4, 1 - (pos.y - p.half - (f?.y || 0.45)) * 0.1),
			);
		}
		for (const e of this.enemies) {
			if (e.m.userData.helmet) e.m.userData.helmet.visible = e.armor > 0;
			const pos = e.body.translation();
			e.m.position.lerp(
				new THREE.Vector3(
					pos.x,
					pos.y - e.half + (e.stun ? e.half * 1.8 : 0),
					0.1,
				),
				Math.min(1, dt * 20),
			);
			e.m.rotation.z = lerp(
				e.m.rotation.z,
				e.stun ? Math.PI : 0,
				Math.min(1, dt * 16),
			);
			e.m.rotation.y = lerp(e.m.rotation.y, e.dir * 0.2, dt * 6);
			e.m.userData.mixer.timeScale = e.stun ? 0.12 : balance.enemyPace;
			e.m.userData.mixer.update(dt);
			if (e.stun > 0 && e.stun < 2)
				e.m.visible = Math.sin(this.time * 20) > 0.0;
			else e.m.visible = true;
			const f = floorAt(pos.x, pos.y - e.half + 0.15);
			e.shadow.visible = !!f;
			e.shadow.position.set(pos.x, (f?.y || 0.45) + 0.02, 0.1);
			e.shadow.scale.setScalar(e.type === "boss" ? 1.8 : 1);
		}
		for (const c of this.coins) {
			c.m.position.set(
				c.x,
				c.y + (c.bonus ? Math.sin(this.time * 3 + c.x) * 0.12 : 0),
				0.55,
			);
			c.m.userData.mixer?.update(dt);
		}
		bellVisual.children[1].material = mat(this.charges > 0 ? C.gold : 0x67746a);
	}
	snapshot() {
		return {
			t: "world",
			phase: this.phase,
			status: this.status,
			won: !!this.won,
			score: this.score,
			lives: this.lives,
			charges: this.charges,
			combo: this.combo,
			bestCombo: this.bestCombo,
			time: this.time,
			stageTime: this.stageTime,
			bonus: !!this.bonus,
			bonusLeft: this.bonusLeft || 0,
			remaining: this.queue?.length || 0,
			metrics: this.metrics,
			players: this.players.map((p) => {
				const a = p.body.translation(),
					v = p.body.linvel();
				return {
					id: p.id,
					name: p.name,
					x: a.x,
					y: a.y,
					vx: v.x,
					vy: v.y,
					dir: p.dir,
					inv: p.inv,
					dash: p.dash,
					points: p.points,
				};
			}),
			enemies: this.enemies.map((e) => {
				const a = e.body.translation();
				return {
					id: e.id,
					type: e.type,
					x: a.x,
					y: a.y,
					dir: e.dir,
					stun: e.stun,
					armor: e.armor,
					hp: e.hp,
				};
			}),
			coins: this.coins.map((c) => ({
				id: c.id,
				x: c.x,
				y: c.y,
				bonus: c.bonus,
			})),
			ice: this.ice.map((i) => ({ x: i.x, y: i.y, life: i.life })),
			sparks: this.sparks.map((s) => ({ x: s.x, y: s.y })),
		};
	}
	receive(s) {
		if (!this.world) this.reset(s.players);
		this.phase = s.phase;
		this.status = s.status;
		this.won = s.won;
		this.score = s.score;
		this.lives = s.lives;
		this.charges = s.charges;
		this.combo = s.combo;
		this.bestCombo = s.bestCombo;
		this.time = s.time;
		this.stageTime = s.stageTime;
		this.bonus = s.bonus;
		this.bonusLeft = s.bonusLeft;
		this.queue = Array(s.remaining).fill("crab");
		this.metrics = s.metrics;
		for (const p of [...this.players])
			if (!s.players.some((x) => x.id === p.id))
				this.removeActor(p, this.players);
		for (const a of s.players) {
			let p =
				this.players.find((p) => p.id === a.id) ||
				this.addPlayer(a.id, a.name, a.x);
			Object.assign(p, a);
			p.body.setTranslation({ x: a.x, y: a.y }, true);
			p.body.setLinvel({ x: a.vx, y: a.vy }, true);
		}
		for (const e of [...this.enemies])
			if (!s.enemies.some((x) => x.id === e.id))
				this.removeActor(e, this.enemies);
		for (const a of s.enemies) {
			let e = this.enemies.find((e) => e.id === a.id);
			if (!e) {
				e = this.spawnEnemy(a.type, a.x, a.y);
				e.id = a.id;
			}
			Object.assign(e, a);
			e.body.setTranslation({ x: a.x, y: a.y }, true);
		}
		for (const c of [...this.coins])
			if (!s.coins.some((x) => x.id === c.id)) this.removeActor(c, this.coins);
		for (const a of s.coins) {
			let c = this.coins.find((c) => c.id === a.id);
			if (!c) {
				c = this.coin(a.x, a.y, 0, true);
				c.id = a.id;
			}
			Object.assign(c, a);
		}
		for (const i of this.ice) actors.remove(i.mesh);
		this.ice = [];
		for (const i of s.ice) {
			this.addIce(i.x, i.y);
			this.ice.at(-1).life = i.life;
		}
		while (this.sparks.length > s.sparks.length)
			actors.remove(this.sparks.pop().mesh);
		if (this.sparks.length < s.sparks.length) {
			this.makeSparks();
			while (this.sparks.length > s.sparks.length)
				actors.remove(this.sparks.pop().mesh);
		}
		s.sparks.forEach((a, i) => {
			Object.assign(this.sparks[i], a);
			this.sparks[i].mesh.position.set(a.x, a.y, 0.4);
		});
		updateHUD();
	}
}
const game = new Game();
