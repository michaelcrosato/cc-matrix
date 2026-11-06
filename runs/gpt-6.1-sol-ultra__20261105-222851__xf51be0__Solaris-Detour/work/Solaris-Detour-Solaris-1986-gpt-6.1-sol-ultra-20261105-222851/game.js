import RAPIER from "rapier";

const DEFAULTS = {
	speed: 11,
	enemyRate: 1,
	damage: 1,
	fireRate: 0.16,
	fuelDrain: 1,
	assist: 5.5,
};
const SECTORS = [
	{
		name: "BREAKWATER",
		label: "Defend the uplink",
		type: "defense",
		biome: "space",
		code: "01",
		description:
			"Spaceway sneaks on the doorstep! Blast three attack waves before the uplink falls.",
		reward: "Uplink signal",
	},
	{
		name: "COPPER MOON",
		label: "Rescue five cadets",
		type: "rescue",
		biome: "surface",
		code: "02",
		description:
			"Five cadets. One very unfriendly moon. Skim the glowing rescue beacons to bring them home.",
		reward: "Pioneer coordinates",
	},
	{
		name: "LANTERN BAY",
		label: "Refuel & repair",
		type: "dock",
		biome: "surface",
		code: "03",
		description:
			"A friendly port in a fiendish galaxy. Fly through the cyan docking ring for fuel and repairs.",
		reward: "Full fuel & hull",
	},
	{
		name: "THE NEEDLE",
		label: "Unlock the ion door",
		type: "corridor",
		biome: "corridor",
		code: "04",
		description:
			"A key, a corridor, a colossal door. Collect the gold key, dodge the blockaders, and keep going!",
		reward: "Ion key signal",
	},
	{
		name: "THE WRONG TURN",
		label: "Ride the wormhole",
		type: "rift",
		biome: "space",
		code: "05",
		description:
			"Three signals point through this wormhole. Keep your fighter in focus. Solaris is on the other side!",
		reward: "Solaris revealed",
	},
	{
		name: "SOLARIS",
		label: "Bring everybody home",
		type: "boss",
		biome: "solar",
		code: "06",
		description:
			"The lost planet! Knock out the Sun Eater, break its shield with a nova pulse, then rescue the pioneers.",
		reward: "A galaxy worth saving",
	},
];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;

class Campaign {
	constructor(audio, onEvent = () => {}) {
		this.audio = audio;
		this.onEvent = onEvent;
		this.settings = { ...DEFAULTS };
		this.entities = new Map();
		this.serial = 0;
		this.god = false;
		this.reset();
	}
	async init() {
		await RAPIER.init();
		this.makeWorld();
		return this;
	}
	makeWorld() {
		if (this.world) this.world.free();
		if (this.events) this.events.free();
		this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		this.events = new RAPIER.EventQueue(true);
		this.entities.clear();
		this.bodies = new Map();
		this.hero = this.body(
			{ id: "hero", kind: "hero", x: 0, y: -1, z: 3 },
			0.85,
		);
		this.wing = this.body(
			{ id: "wing", kind: "wing", x: -3, y: -1, z: 3 },
			0.85,
		);
	}
	reset() {
		this.s = {
			time: 0,
			mode: "title",
			biome: "space",
			player: { x: 0, y: -1, z: 3, roll: 0, shield: 0, boost: false },
			ally: { x: -3, y: -1, z: 3, active: false },
			enemies: [],
			shots: [],
			objects: [],
			particles: [],
			sector: 0,
			sectorTime: 0,
			score: 0,
			hull: 100,
			fuel: 100,
			lives: 3,
			pulse: 0,
			invulnerable: 0,
			shake: 0,
			cleared: [],
			rescued: 0,
			pioneers: 0,
			key: false,
			wave: 0,
			threat: 110,
			redZone: false,
			warpProgress: 0,
			warpFocus: 0,
			focusTarget: 0,
			focusError: 0,
			kills: 0,
			usedPulse: 0,
			stage: "approach",
			objective: "",
			message: "",
			messageTime: 0,
			attract: false,
			victory: false,
			combo: 0,
			bestCombo: 0,
		};
		this.cool = 0;
		this.allyCool = 0;
		this.spawnClock = 0;
		this.nextCadet = 0;
		this.gateClock = 30;
		this.keyClock = 8;
		this.bossPhase = 0;
		this.riftRings = 0;
		this.damageClock = 0;
		this.eventHistory = [];
	}
	start(attract = false) {
		this.reset();
		this.s.attract = attract;
		this.makeWorld();
		this.s.mode = "map";
		this.message("GALACTIC PATROL", "Find Solaris. Bring our people home.");
		this.event("start");
	}
	body(e, radius = 1) {
		const b = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
				e.x,
				e.y,
				e.z,
			),
		);
		const c = this.world.createCollider(
			RAPIER.ColliderDesc.ball(radius)
				.setSensor(true)
				.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
				.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL),
			b,
		);
		this.entities.set(c.handle, e);
		this.bodies.set(e.id, { b, c, e });
		return e;
	}
	sync(e) {
		const q = this.bodies.get(e.id);
		if (q) q.b.setNextKinematicTranslation({ x: e.x, y: e.y, z: e.z });
	}
	remove(e) {
		const q = this.bodies.get(e.id);
		if (q) {
			this.entities.delete(q.c.handle);
			this.world.removeRigidBody(q.b);
			this.bodies.delete(e.id);
		}
		e.dead = true;
	}
	clearField() {
		for (const a of [this.s.enemies, this.s.shots, this.s.objects])
			for (const e of a) this.remove(e);
		this.s.enemies = [];
		this.s.shots = [];
		this.s.objects = [];
		this.s.particles = [];
	}
	event(type, data = {}) {
		this.eventHistory.push({ type, ...data });
		this.onEvent(type, data);
	}
	message(title, text = "") {
		this.s.message = title;
		this.s.messageDetail = text;
		this.s.messageTime = 4.5;
	}
	unlocked(i) {
		return (
			i < 4 ||
			(i === 4 && [0, 1, 3].every((x) => this.s.cleared.includes(x))) ||
			(i === 5 && this.s.cleared.includes(4))
		);
	}
	travel(i) {
		if (!this.unlocked(i)) return false;
		this.clearField();
		this.s.sector = i;
		this.s.mode = "warp";
		this.s.warpProgress = 0;
		this.s.warpFocus = 0;
		this.s.focusError = 0;
		this.s.sectorTime = 0;
		this.s.biome = SECTORS[i].biome;
		this.audio.setScene(
			i === 5
				? "boss"
				: SECTORS[i].biome === "surface"
					? "surface"
					: SECTORS[i].biome === "corridor"
						? "corridor"
						: "space",
		);
		this.audio.sfx("warp");
		this.event("warp", { sector: i });
		return true;
	}
	enterSector() {
		const s = this.s,
			sector = SECTORS[s.sector];
		s.mode = "flight";
		s.sectorTime = 0;
		s.wave = 0;
		s.stage = "approach";
		s.key = false;
		s.rescued = 0;
		s.pioneers = 0;
		this.spawnClock = 0.6;
		this.nextCadet = 0;
		this.keyClock = 7;
		this.gateClock = 28;
		this.bossPhase = 0;
		this.riftRings = 0;
		s.player.x = 0;
		s.player.y = -1;
		this.message(sector.name, sector.description);
		this.audio.voice(s.sector + 2);
		this.event("enter", { sector: s.sector });
		if (sector.type === "dock") this.object("dock", 0, -1, -65, 4);
		if (sector.type === "boss") this.spawnEnemy("boss", 0, 1, -52);
	}
	complete() {
		const s = this.s;
		if (!s.cleared.includes(s.sector)) s.cleared.push(s.sector);
		s.score += s.sector === 5 ? 12000 : 4000;
		s.stage = "complete";
		s.mode = s.sector === 5 ? "victory" : "debrief";
		s.victory = s.sector === 5;
		this.clearField();
		this.message(
			s.victory ? "EVERYBODY HOME." : "SECTOR SECURED",
			s.victory
				? "Solaris found. Spaceway sneaks confounded. Nice flying, cadet."
				: SECTORS[s.sector].reward + " acquired.",
		);
		this.audio.sfx(s.victory ? "victory" : "rescue");
		this.audio.voice(s.victory ? 9 : 4);
		if (s.victory) this.audio.setScene("victory");
		this.event(s.victory ? "victory" : "complete", {
			sector: s.sector,
			score: s.score,
		});
	}
	toMap() {
		if (["flight", "debrief", "map"].includes(this.s.mode)) {
			this.clearField();
			this.s.mode = "map";
			this.event("map");
		}
	}
	spawnEnemy(type = "scout", x = 0, y = 0, z = -65) {
		const maxHp =
			type === "boss"
				? 560
				: type === "mech"
					? 65
					: type === "raider"
						? 38
						: 22;
		const e = {
			id: ++this.serial,
			kind: "enemy",
			type,
			x,
			y,
			z,
			hp: maxHp,
			maxHp,
			t: Math.random() * 6,
			baseX: x,
			baseY: y,
			fire: 1.8 + Math.random() * 2,
			phase: 0,
			shield: false,
		};
		this.s.enemies.push(e);
		this.body(e, type === "boss" ? 5 : type === "mech" ? 1.8 : 1.35);
		return e;
	}
	object(type, x, y, z, r = 1.5, extra = {}) {
		const o = {
			id: ++this.serial,
			kind: "object",
			type,
			x,
			y,
			z,
			collected: false,
			...extra,
		};
		this.s.objects.push(o);
		this.body(o, r);
		return o;
	}
	shot(player, input, ally = false) {
		const s = this.s;
		let tx = input.aimX ?? player.x,
			ty = input.aimY ?? player.y;
		let tz = -42;
		const assist = this.settings.assist;
		let nearest = null,
			dist = assist;
		for (const e of s.enemies) {
			if (e.z > 1) continue;
			const d = Math.hypot(e.x - tx, e.y - ty);
			if (d < dist) {
				dist = d;
				nearest = e;
			}
		}
		if (nearest) {
			tx = nearest.x;
			ty = nearest.y;
			tz = nearest.z;
		}
		const dz = tz - 2,
			dx = tx - player.x,
			dy = ty - player.y;
		const mag = Math.hypot(dx, dy, dz);
		const q = {
			id: ++this.serial,
			kind: "shot",
			x: player.x,
			y: player.y,
			z: 1.5,
			vx: (dx / mag) * 112,
			vy: (dy / mag) * 112,
			vz: (dz / mag) * 112,
			enemy: false,
			ally,
			life: 2,
		};
		s.shots.push(q);
		this.body(q, 0.38);
		this.audio.sfx("laser");
	}
	enemyShot(e, spread = 0) {
		const p =
			this.s.ally.active && Math.random() > 0.5 ? this.s.ally : this.s.player;
		const dx = p.x - e.x + spread,
			dy = p.y - e.y,
			dz = 3 - e.z,
			mag = Math.hypot(dx, dy, dz);
		const q = {
			id: ++this.serial,
			kind: "shot",
			x: e.x,
			y: e.y,
			z: e.z + 2,
			vx: (dx / mag) * 24,
			vy: (dy / mag) * 24,
			vz: (dz / mag) * 24,
			enemy: true,
			life: 5,
		};
		this.s.shots.push(q);
		this.body(q, 0.5);
		this.audio.sfx("enemy");
	}
	burst(x, y, z, color = "#ffab76", amount = 18) {
		for (let i = 0; i < amount; i++)
			this.s.particles.push({
				id: ++this.serial,
				x,
				y,
				z,
				vx: (Math.random() - 0.5) * 15,
				vy: (Math.random() - 0.5) * 15,
				vz: (Math.random() - 0.5) * 15,
				life: 0.7 + Math.random() * 0.5,
				color,
			});
	}
	hurtEnemy(e, damage) {
		if (e.dead) return;
		if (e.shield) damage *= 0.18;
		e.hp -= damage;
		this.burst(e.x, e.y, e.z, e.shield ? "#59efff" : "#ffc685", 4);
		if (e.hp <= 0) {
			this.remove(e);
			this.s.score += e.type === "boss" ? 8000 : e.type === "mech" ? 500 : 200;
			this.s.kills++;
			this.s.combo++;
			this.s.bestCombo = Math.max(this.s.bestCombo, this.s.combo);
			this.burst(
				e.x,
				e.y,
				e.z,
				e.type === "boss" ? "#ffe3a0" : "#ff7a6c",
				e.type === "boss" ? 60 : 20,
			);
			this.audio.sfx("explosion");
			this.s.shake = 0.3;
			if (e.type === "boss") {
				this.s.stage = "pioneers";
				this.nextCadet = 0;
				this.spawnClock = 0.3;
				this.message(
					"SUN EATER: SNUFFED",
					"Six pioneers below! Fly through every beacon.",
				);
				this.event("boss-defeated");
			}
		}
	}
	damage(amount) {
		const s = this.s;
		if (s.invulnerable > 0 || this.god || s.attract) return;
		s.hull -= amount * this.settings.damage;
		s.invulnerable = 1.0;
		s.combo = 0;
		s.shake = 0.7;
		this.audio.sfx("hit");
		this.event("damage", { amount });
		if (s.hull <= 0) {
			s.lives--;
			this.burst(s.player.x, s.player.y, 3, "#ffad70", 45);
			if (s.lives <= 0) {
				s.hull = 0;
				s.mode = "gameover";
				this.audio.sfx("explosion");
				this.event("gameover");
			} else {
				s.hull = 100;
				s.fuel = Math.max(s.fuel, 55);
				s.invulnerable = 4;
				this.message(
					"RESERVE FIGHTER DEPLOYED",
					s.lives + " fighters remain. Make this one count!",
				);
			}
		}
	}
	pulse() {
		const s = this.s;
		if (s.pulse > 0) return false;
		s.pulse = 12;
		s.player.shield = 1;
		s.usedPulse++;
		s.shake = 0.3;
		for (const e of [...s.enemies]) {
			e.shield = false;
			e.shieldBreak = 6;
			this.hurtEnemy(e, 65);
		}
		for (const q of s.shots) if (q.enemy) this.remove(q);
		for (const o of s.objects) if (o.type === "rock") this.remove(o);
		this.burst(s.player.x, s.player.y, 1, "#69f8ed", 45);
		this.audio.sfx("shield");
		this.event("pulse");
		return true;
	}
	collide(a, b) {
		if (!a || !b || a.dead || b.dead) return;
		if (b.kind === "shot" && a.kind !== "shot") [a, b] = [b, a];
		if (a.kind === "shot") {
			if (!a.enemy && b.kind === "enemy") {
				this.remove(a);
				this.hurtEnemy(b, 14);
			} else if (
				a.enemy &&
				(b.kind === "hero" || (b.kind === "wing" && this.s.ally.active))
			) {
				this.remove(a);
				this.damage(12);
			} else if (!a.enemy && b.kind === "object" && b.type === "rock") {
				this.remove(a);
				this.remove(b);
				this.burst(b.x, b.y, b.z);
				this.s.score += 50;
			}
			return;
		}
		if (b.kind === "hero" || b.kind === "wing") [a, b] = [b, a];
		if (a.kind !== "hero" && a.kind !== "wing") return;
		if (a.kind === "wing" && !this.s.ally.active) return;
		if (b.kind === "enemy") {
			this.damage(22);
			if (b.type !== "boss") this.hurtEnemy(b, 100);
		}
		if (b.kind === "object") {
			if (b.type === "cadet") {
				this.remove(b);
				b.collected = true;
				if (this.s.sector === 5) this.s.pioneers++;
				else this.s.rescued++;
				this.s.score += 700;
				this.audio.sfx("rescue");
				this.audio.voice(this.s.rescued + this.s.pioneers);
				this.burst(b.x, b.y, b.z, "#8bffe0");
				this.event("rescue", { index: b.index });
			}
			if (b.type === "key") {
				this.remove(b);
				this.s.key = true;
				this.s.score += 1200;
				this.audio.sfx("key");
				this.message(
					"ION KEY ACQUIRED",
					"Now fly through the great gold door.",
				);
				this.event("key");
			}
			if (b.type === "rock") {
				this.remove(b);
				this.damage(18);
				this.burst(b.x, b.y, b.z);
			}
			if (b.type === "dock") {
				this.remove(b);
				this.s.hull = 100;
				this.s.fuel = 100;
				this.s.lives = Math.min(this.s.lives + 1, 4);
				this.audio.sfx("dock");
				this.event("dock");
				this.complete();
			}
		}
	}
	step(dt, input = {}, allyInput = {}) {
		const s = this.s;
		s.time += dt;
		s.messageTime = Math.max(0, s.messageTime - dt);
		s.shake = Math.max(0, s.shake - dt * 2);
		for (const p of s.particles) {
			p.life -= dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.z += p.vz * dt;
		}
		s.particles = s.particles.filter((p) => p.life > 0);
		if (!["flight", "warp", "map"].includes(s.mode)) return;
		if (!s.cleared.includes(0) && !s.redZone) {
			s.threat = Math.max(0, s.threat - dt);
			if (s.threat === 0) {
				s.redZone = true;
				this.audio.sfx("alarm");
				this.message(
					"RED ZONE!",
					"The uplink fell. Flight controls reversed until Breakwater is cleared.",
				);
				this.event("red-zone");
			}
		}
		if (s.mode === "map") return;
		if (s.mode === "warp") {
			s.warpProgress += dt / 3.4;
			s.focusTarget = Math.sin(s.warpProgress * 6.28) * 0.65;
			s.warpFocus = clamp(s.warpFocus + (input.x || 0) * dt * 1.9, -1, 1);
			s.focusError += Math.abs(s.warpFocus - s.focusTarget) * dt;
			if (s.warpProgress >= 1) {
				s.fuel -= 6 + Math.min(7, s.focusError * 2);
				this.enterSector();
			}
			return;
		}
		s.sectorTime += dt;
		s.invulnerable = Math.max(0, s.invulnerable - dt);
		s.pulse = Math.max(0, s.pulse - dt);
		s.player.shield = Math.max(0, s.player.shield - dt * 1.5);
		const speed = this.settings.speed,
			inv = s.redZone ? -1 : 1;
		const move = (p, inp) => {
			p.boost = !!inp.boost;
			p.x = clamp(
				p.x + (inp.x || 0) * speed * dt * (p.boost ? 1.8 : 1) * inv,
				-9,
				9,
			);
			p.y = clamp(
				p.y + (inp.y || 0) * speed * 0.7 * dt * (p.boost ? 1.4 : 1) * inv,
				-3.2,
				5,
			);
			p.roll = mix(p.roll, -(inp.x || 0) * 0.55, Math.min(1, dt * 8));
		};
		move(s.player, input);
		if (s.ally.active) move(s.ally, allyInput);
		s.fuel -= dt * (0.09 + (input.boost ? 0.38 : 0)) * this.settings.fuelDrain;
		if (s.attract) s.fuel = 100;
		if (s.fuel <= 0) {
			s.fuel = 55;
			this.damage(200);
			this.audio.sfx("alarm");
		}
		if (input.pulse) this.pulse();
		if (allyInput.pulse && s.ally.active) this.pulse();
		this.cool -= dt;
		this.allyCool -= dt;
		if (input.fire && this.cool <= 0) {
			this.shot(s.player, input);
			this.cool = this.settings.fireRate;
		}
		if (s.ally.active && allyInput.fire && this.allyCool <= 0) {
			this.shot(s.ally, allyInput, true);
			this.allyCool = this.settings.fireRate;
		}
		this.hero.x = s.player.x;
		this.hero.y = s.player.y;
		this.sync(this.hero);
		this.wing.x = s.ally.x;
		this.wing.y = s.ally.y;
		this.wing.z = s.ally.active ? 3 : 1000;
		this.sync(this.wing);
		for (const e of s.enemies) {
			if (e.dead) continue;
			e.t += dt;
			e.fire -= dt * this.settings.enemyRate;
			e.shieldBreak = Math.max(0, (e.shieldBreak || 0) - dt);
			if (e.type === "boss") {
				e.z = mix(e.z, -33, dt * 0.8);
				e.x = Math.sin(e.t * 0.45) * 5;
				e.y = 1 + Math.sin(e.t * 0.8) * 2;
				e.phase = e.hp / e.maxHp < 0.33 ? 3 : e.hp / e.maxHp < 0.66 ? 2 : 1;
				e.shield = e.shieldBreak <= 0 && Math.sin(e.t * 0.75) > 0.4;
				if (e.phase > this.bossPhase) {
					this.bossPhase = e.phase;
					if (e.phase > 1) {
						this.message(
							"SUN EATER • PHASE " + e.phase,
							"Shield cycling! Use a nova pulse to crack it.",
						);
						for (let i = 0; i < 3; i++)
							this.spawnEnemy(
								i % 2 ? "raider" : "scout",
								(i - 1) * 7,
								-1,
								-65 - i * 5,
							);
						this.event("boss-phase", { phase: e.phase });
					}
				}
				if (e.fire <= 0) {
					for (let j = -e.phase; j <= e.phase; j++) this.enemyShot(e, j * 4);
					e.fire = 2.2 / e.phase + 0.6;
				}
			} else {
				e.z = Math.min(-8, e.z + dt * (e.type === "scout" ? 10 : 7));
				e.x = clamp(
					e.baseX + Math.sin(e.t * (e.type === "raider" ? 1.5 : 0.7)) * 2.5,
					-11,
					11,
				);
				e.y = clamp(e.baseY + Math.sin(e.t * 0.9) * 1.8, -4, 5);
				if (e.fire <= 0) {
					this.enemyShot(e);
					e.fire = 3.7 + Math.random() * 1.5;
				}
			}
			this.sync(e);
		}
		const typ = SECTORS[s.sector].type;
		this.spawnClock -= dt;
		if (typ === "defense") {
			if (s.wave < 3 && this.spawnClock <= 0) {
				for (let i = 0; i < 4; i++)
					this.spawnEnemy(
						i === 3 ? "mech" : i === 2 ? "raider" : "scout",
						(i - 1.5) * 5,
						Math.sin(i * 2) * 3,
						-60 - i * 7,
					);
				s.wave++;
				this.spawnClock = 12;
				this.event("wave", { wave: s.wave });
			}
			if (s.wave === 3 && s.enemies.every((e) => e.dead)) {
				s.redZone = false;
				this.complete();
				return;
			}
		}
		if (typ === "rescue" || (typ === "boss" && s.stage === "pioneers")) {
			const goal = typ === "rescue" ? 5 : 6,
				count = typ === "rescue" ? s.rescued : s.pioneers;
			if (count >= goal) {
				if (typ === "rescue") s.lives = Math.min(4, s.lives + 1);
				this.complete();
				return;
			}
			if (this.spawnClock <= 0) {
				const outstanding = s.objects.filter(
					(o) => o.type === "cadet" && !o.dead,
				).length;
				if (count + outstanding < goal) {
					const i = this.nextCadet++;
					this.object(
						"cadet",
						[-6, 4, 0, 7, -4, 2][i % 6],
						[-2, 1, -1, 2, -2, 0][i % 6],
						-78,
						2.5,
						{ index: i },
					);
				}
				if (typ === "rescue" && s.enemies.filter((e) => !e.dead).length < 4)
					this.spawnEnemy(
						this.nextCadet % 2 ? "scout" : "raider",
						(Math.random() - 0.5) * 17,
						2,
						-85,
					);
				this.spawnClock = 4.5;
			}
		}
		if (typ === "corridor") {
			this.keyClock -= dt;
			this.gateClock -= dt;
			if (this.spawnClock <= 0) {
				this.object(
					"rock",
					(Math.random() - 0.5) * 20,
					(Math.random() - 0.5) * 8,
					-95,
					1.6,
				);
				this.spawnClock = 1.6;
			}
			if (
				!s.key &&
				this.keyClock <= 0 &&
				!s.objects.some((o) => o.type === "key" && !o.dead)
			) {
				this.object("key", Math.sin(s.sectorTime) * 6, 0, -72, 2.2);
				this.keyClock = 8;
			}
			if (
				this.gateClock <= 0 &&
				!s.objects.some((o) => o.type === "gate" && !o.dead)
			) {
				this.object("gate", 0, 0, -100, 1);
				this.gateClock = 14;
			}
		}
		if (typ === "rift") {
			s.warpProgress = s.sectorTime / 18;
			s.focusTarget = Math.sin(s.sectorTime * 0.7) * 6;
			s.focusError = Math.abs(s.player.x - s.focusTarget);
			if (this.spawnClock <= 0) {
				this.object(
					"key",
					s.focusTarget,
					Math.sin(s.sectorTime) * 2,
					-80,
					2.7,
					{ rift: true },
				);
				this.spawnClock = 3;
			}
			if (s.sectorTime >= 18) {
				this.complete();
				return;
			}
		}
		for (const o of s.objects) {
			if (o.dead) continue;
			o.z +=
				dt *
				(o.type === "dock" ? 10 : typ === "corridor" ? 24 : 18) *
				(input.boost ? 1.2 : 1);
			if (o.type === "gate" && o.z >= 3) {
				if (s.key) {
					this.audio.sfx("key");
					this.event("gate");
					this.complete();
					return;
				}
				this.damage(28);
				this.message(
					"THE DOOR SAYS NO",
					"Collect the gold key. Another door is ahead.",
				);
				this.remove(o);
			} else if (o.z > 11) {
				this.remove(o);
				if (o.type === "dock") {
					this.object("dock", 0, -1, -50, 4);
					this.message("COME AROUND AGAIN", "Fly into the cyan ring to dock.");
				}
			}
			this.sync(o);
		}
		for (const q of s.shots) {
			if (q.dead) continue;
			q.life -= dt;
			q.x += q.vx * dt;
			q.y += q.vy * dt;
			q.z += q.vz * dt;
			if (q.life < 0 || q.z < -120 || q.z > 20) this.remove(q);
			else this.sync(q);
		}
		this.world.timestep = dt;
		this.world.step(this.events);
		const pairs = [];
		this.events.drainCollisionEvents((a, b, started) => {
			if (started) pairs.push([this.entities.get(a), this.entities.get(b)]);
		});
		for (const [a, b] of pairs) this.collide(a, b);
		s.enemies = s.enemies.filter((e) => !e.dead);
		s.shots = s.shots.filter((e) => !e.dead);
		s.objects = s.objects.filter((e) => !e.dead);
		s.objective =
			typ === "defense"
				? `ATTACK WAVES ${s.wave}/3 • ${s.enemies.length} HOSTILES`
				: typ === "rescue"
					? `CADETS ABOARD ${s.rescued}/5`
					: typ === "corridor"
						? s.key
							? "ION KEY SECURED • REACH THE DOOR"
							: "COLLECT THE GOLD ION KEY"
						: typ === "dock"
							? "FLY THROUGH THE CYAN DOCKING RING"
							: typ === "rift"
								? "RIDE THE WORMHOLE • KEEP IN FOCUS"
								: s.stage === "pioneers"
									? `PIONEERS ABOARD ${s.pioneers}/6`
									: "DESTROY THE SUN EATER • PULSE BREAKS ITS SHIELD";
	}
	pilot() {
		const s = this.s;
		if (s.mode === "warp")
			return { x: clamp((s.focusTarget - s.warpFocus) * 7, -1, 1) };
		let tx = 0,
			ty = -1,
			target =
				s.enemies.find((e) => e.type === "boss") ||
				s.enemies.reduce((a, e) => (!a || e.z > a.z ? e : a), null);
		const obj = s.objects
			.filter((o) => ["cadet", "key", "dock"].includes(o.type) && !o.dead)
			.sort((a, b) => b.z - a.z)[0];
		if (obj) {
			tx = obj.x;
			ty = obj.y;
		} else if (target) {
			tx = target.x * 0.55;
			ty = target.y * 0.6;
		}
		if (SECTORS[s.sector].type === "rift") tx = s.focusTarget;
		const inv = s.redZone ? -1 : 1;
		return {
			x: clamp((tx - s.player.x) * 2, -1, 1) * inv,
			y: clamp((ty - s.player.y) * 2, -1, 1) * inv,
			aimX: target?.x ?? tx,
			aimY: target?.y ?? ty,
			fire: !!target,
			pulse: s.pulse <= 0 && s.enemies.length > 0,
			boost: false,
		};
	}
	nextSector() {
		return (
			[0, 1, 2, 3, 4, 5].find(
				(i) => !this.s.cleared.includes(i) && this.unlocked(i),
			) ?? 0
		);
	}
	snapshot() {
		return JSON.parse(JSON.stringify(this.s));
	}
	diagnostics() {
		return {
			physics: "Rapier " + RAPIER.version(),
			bodies: this.bodies.size,
			events: this.eventHistory.slice(-100),
			settings: { ...this.settings },
		};
	}
}
