import RAPIER from "@dimforge/rapier3d-compat";
import { THREE } from "./graphics.js";

export const SECTORS = [
	{
		name: "Lantern Reach",
		subtitle: "The welcome party",
		type: "fleet",
		icon: "⌁",
		goal: "BREAK THE RAIDING FLEET",
		detail: "12 raiders stand between you and the lost sun.",
		radio: "Those Gloam goons picked the wrong planet. Clear the fleet!",
		color: 0x9de0d7,
	},
	{
		name: "Violet Shoals",
		subtitle: "No cadet left behind",
		type: "rescue",
		icon: "✳",
		goal: "RESCUE FOUR STRANDED CADETS",
		detail: "Fly low through the mint beacons. Tractor beam is automatic.",
		radio: "Four cadets, one very bad field trip. Fly LOW into their beacons.",
		color: 0xb697cb,
	},
	{
		name: "Wayfarer Bay",
		subtitle: "A little tender loving fuel",
		type: "dock",
		icon: "⊓",
		goal: "DOCK, REPAIR & REFUEL",
		detail: "Line up with the green bay. Take your finger off the trigger.",
		radio:
			"Home cooking, fresh fuel. Mind the paintwork. NO SHOOTING in the bay!",
		color: 0x87d0c0,
	},
	{
		name: "Needle Run",
		subtitle: "A key to the situation",
		type: "corridor",
		icon: "⋈",
		goal: "TAKE THE KEY. BREAK THE BLOCKADE.",
		detail: "Collect the golden key, then fly through the ion door.",
		radio: "Find the gold key. The door has a rather shocking security policy.",
		color: 0xf3bc85,
	},
	{
		name: "Eventide Fold",
		subtitle: "The scenic shortcut",
		type: "wormhole",
		icon: "◎",
		goal: "RIDE THE WORMHOLE",
		detail: "Steer through six focus rings for fuel and bonus points.",
		radio: "Space is folding. Lovely. Keep your wings inside the mint rings.",
		color: 0x92b8e6,
	},
	{
		name: "Last Light",
		subtitle: "Big ship. Bigger problem.",
		type: "boss",
		icon: "✦",
		goal: "DEFEAT THE NIGHTJAR",
		detail: "Three reactor phases. Dodge its fans; pulse clears incoming fire.",
		radio: "There it is! The Nightjar stole our sunlight. Go collect the debt.",
		color: 0xfa9b81,
	},
];
export const DEFAULT_TUNING = {
	enemyDamage: 16,
	fireRate: 6,
	fuelDrain: 0.16,
	flightSpeed: 12,
	aimAssist: 3,
	bossHealth: 150,
};
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export class Game {
	constructor(graphics, sound, callbacks) {
		this.g = graphics;
		this.sound = sound;
		this.cb = callbacks;
		this.tuning = { ...DEFAULT_TUNING };
		this.mode = "title";
		this.sector = 0;
		this.entities = [];
		this.handles = new Map();
		this.id = 1;
		this.time = 0;
		this.attract = false;
		this.autopilot = false;
		this.god = false;
		this.campaignTime = 0;
		this.metrics = {
			shots: 0,
			hits: 0,
			kills: 0,
			damage: 0,
			rescues: 0,
			docks: 0,
			keys: 0,
			gates: 0,
			rings: 0,
			warps: 0,
			bossPhases: 0,
			collisions: 0,
		};
		this.resetState();
	}
	async init() {
		await RAPIER.init();
		this.makeWorld();
	}
	makeWorld() {
		if (this.world) this.world.free();
		if (this.queue) this.queue.free();
		this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		this.world.timestep = 1 / 60;
		this.queue = new RAPIER.EventQueue(true);
		this.handles.clear();
		this.entities = [];
		this.shipBody = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0, 3),
		);
		this.shipCollider = this.world.createCollider(
			RAPIER.ColliderDesc.ball(0.72)
				.setSensor(true)
				.setCollisionGroups((1 << 16) | 58)
				.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
				.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL),
			this.shipBody,
		);
		this.handles.set(this.shipCollider.handle, { type: "ship" });
	}
	resetState() {
		this.score = 0;
		this.fuel = 100;
		this.health = 100;
		this.lives = 3;
		this.x = 0;
		this.y = 0;
		this.vx = 0;
		this.vy = 0;
		this.pulseCD = 0;
		this.rollCD = 0;
		this.invincible = 0;
		this.cleared = [];
		this.unlocked = 0;
		this.redZone = false;
		this.planet = 100;
		this.rescued = [];
		this.key = false;
		this.rings = 0;
		this.shotClock = 0;
		this.fireHeld = false;
		this.boss = null;
		this.completed = false;
		this.campaignTime = 0;
		this.stageTime = 0;
		this.spawnClock = 0;
		this.spawned = 0;
		this.killed = 0;
		this.elapsed = 0;
		this.rngState = 860511;
		this.metrics = Object.fromEntries(
			Object.keys(this.metrics ?? {}).map((k) => [k, 0]),
		);
	}
	rng() {
		this.rngState += 0x6d2b79f5;
		let t = this.rngState;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}
	clear() {
		for (const e of [...this.entities]) this.remove(e);
		this.boss = null;
	}
	start({ attract = false, save = null, seed = 860511 } = {}) {
		this.clear();
		this.makeWorld();
		this.resetState();
		this.rngState = seed;
		this.attract = attract;
		this.autopilot = attract;
		this.god = attract;
		if (save) {
			for (const key of [
				"score",
				"fuel",
				"health",
				"lives",
				"cleared",
				"unlocked",
				"redZone",
				"campaignTime",
			])
				if (save[key] !== undefined) this[key] = save[key];
		}
		this.cb.screen("flight");
		this.sound.mode = "fleet";
		this.warp(save?.sector ?? 0, true);
	}
	title() {
		this.clear();
		this.mode = "title";
		this.attract = false;
		this.autopilot = false;
		this.god = false;
		this.g.mode("title");
		this.cb.screen("title");
	}
	serial() {
		return {
			version: 1,
			sector: this.sector,
			score: this.score,
			fuel: this.fuel,
			health: this.health,
			lives: this.lives,
			cleared: [...this.cleared],
			unlocked: this.unlocked,
			redZone: this.redZone,
			campaignTime: this.campaignTime,
		};
	}
	warp(index, initial = false) {
		if (index > this.unlocked && !this.god) return false;
		if (this.fuel < 8 && !initial) {
			this.score = Math.max(0, this.score - 500);
			this.fuel = 25;
			this.cb.toast("RESCUE TUG • Emergency fuel delivered. −500 points");
		}
		this.clear();
		this.sector = index;
		this.mode = "warp";
		this.stageTime = 0;
		this.warpInitial = initial;
		this.x = 0;
		this.y = 0;
		this.key = false;
		this.cb.overlay(null);
		this.cb.banner(
			`HYPERWARP / ${String(index + 1).padStart(2, "0")}`,
			SECTORS[index].name,
			initial
				? "Your rescue route starts here."
				: "Keep your nose in the ring. Save your fuel.",
			2.4,
		);
		this.g.mode("warp");
		this.sound.play("warp");
		this.metrics.warps++;
		return true;
	}
	enter(index) {
		this.clear();
		this.makeWorld();
		this.sector = index;
		this.mode = "playing";
		this.stageTime = 0;
		this.spawnClock = 0.7;
		this.spawned = 0;
		this.killed = 0;
		this.elapsed = 0;
		this.x = 0;
		this.y = 0;
		this.vx = 0;
		this.vy = 0;
		this.invincible = 2;
		this.rescued = [];
		this.key = false;
		this.rings = 0;
		this.cadetSchedule = 0;
		this.ringSchedule = 0;
		this.dockSpawned = false;
		this.gateSpawned = false;
		this.keySpawned = false;
		this.repaired = false;
		this.missedRings = 0;
		this.planet = 100;
		const s = SECTORS[index];
		this.g.mode(s.type);
		this.sound.mode = s.type;
		this.cb.radio(s.radio);
		this.cb.banner(
			`SECTOR ${String(index + 1).padStart(2, "0")} / ${s.name}`,
			s.subtitle,
			s.detail,
			3,
		);
		this.g.player.position.set(0, 0, 3);
		if (s.type === "boss") this.spawnBoss();
		this.cb.save();
	}
	add({
		type,
		mesh,
		x = 0,
		y = 0,
		z = -85,
		radius = 1,
		hp = 1,
		vz = 0,
		team = "",
		...extra
	}) {
		const dynamic = type === "bolt";
		const desc = dynamic
			? RAPIER.RigidBodyDesc.dynamic().setGravityScale(0).setCcdEnabled(true)
			: RAPIER.RigidBodyDesc.kinematicPositionBased();
		desc.setTranslation(x, y, z);
		const body = this.world.createRigidBody(desc);
		const cdesc = extra.half
			? RAPIER.ColliderDesc.cuboid(...extra.half)
			: RAPIER.ColliderDesc.ball(radius);
		const member =
			type === "bolt"
				? team === "player"
					? 4
					: 8
				: type === "enemy"
					? 2
					: ["dock", "gate"].includes(type)
						? 32
						: 16;
		const filter =
			member === 4
				? 34
				: member === 8
					? 1
					: member === 2
						? 5
						: member === 32
							? 5
							: 1;
		const collider = this.world.createCollider(
			cdesc
				.setSensor(true)
				.setCollisionGroups((member << 16) | filter)
				.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
				.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL),
			body,
		);
		const e = {
			id: this.id++,
			type,
			mesh,
			body,
			collider,
			x,
			y,
			z,
			radius,
			hp,
			maxHp: hp,
			vz,
			team,
			age: 0,
			dead: false,
			...extra,
		};
		if (dynamic)
			body.setLinvel({ x: extra.vx ?? 0, y: extra.vy ?? 0, z: vz }, true);
		if (mesh) {
			mesh.position.set(x, y, z);
			this.g.scene.add(mesh);
		}
		this.entities.push(e);
		this.handles.set(collider.handle, e);
		return e;
	}
	remove(e) {
		if (e.removed) return;
		e.dead = true;
		e.removed = true;
		this.g.remove(e.mesh);
		this.handles.delete(e.collider.handle);
		this.world.removeRigidBody(e.body);
		const i = this.entities.indexOf(e);
		if (i >= 0) this.entities.splice(i, 1);
		if (this.boss === e) this.boss = null;
	}
	enemy(kind = "raider", x = null, y = null, z = -85, counts = true) {
		x ??= (this.rng() - 0.5) * 16;
		y ??= -0.8 + this.rng() * 6;
		const hp = kind === "mech" ? 4 : kind === "cobra" ? 3 : 2;
		const e = this.add({
			type: "enemy",
			kind,
			mesh: this.g.enemy(kind),
			x,
			y,
			z,
			radius: kind === "mech" ? 1.3 : 1.15,
			hp,
			counts,
			baseX: x,
			baseY: y,
			seed: this.rng() * 8,
			shoot: 1.5 + this.rng() * 2,
			speed: kind === "cobra" ? 8 : 13,
		});
		return e;
	}
	spawnBoss() {
		this.boss = this.add({
			type: "enemy",
			kind: "boss",
			mesh: this.g.enemy("boss"),
			x: 0,
			y: 2,
			z: -58,
			radius: 7.5,
			hp: this.tuning.bossHealth,
			counts: false,
			shoot: 2,
			phase: 1,
		});
		this.metrics.bossPhases++;
	}
	shoot(input) {
		this.shotClock -= 1 / 60;
		if (!input.fire || this.shotClock > 0) return;
		this.shotClock = 1 / this.tuning.fireRate;
		this.fireHeld = true;
		const from = new THREE.Vector3(this.x, this.y, 1.8);
		const target = this.aimTarget(input);
		const dest = target
			? new THREE.Vector3(target.x, target.y, target.z)
			: new THREE.Vector3(
					this.x + (input.aimX ?? 0) * 20,
					this.y + (input.aimY ?? 0) * 12,
					-100,
				);
		const vel = dest.sub(from).normalize().multiplyScalar(105);
		for (const side of [-1, 1]) {
			const b = this.add({
				type: "bolt",
				mesh: this.g.bolt(false),
				x: this.x + side * 0.55,
				y: this.y,
				z: 1.8,
				radius: 0.28,
				vx: vel.x,
				vy: vel.y,
				vz: vel.z,
				team: "player",
				damage: 0.65,
			});
			b.mesh.quaternion.setFromUnitVectors(
				new THREE.Vector3(0, 0, -1),
				vel.clone().normalize(),
			);
		}
		this.metrics.shots++;
		this.sound.play("fire");
	}
	aimTarget(input = {}) {
		const aimX = this.x + (input.aimX ?? 0) * 20,
			aimY = this.y + (input.aimY ?? 0) * 12;
		const assist = this.tuning.aimAssist + (input.touch ? 3 : 0);
		let best = null,
			d = 1e5;
		for (const e of this.entities) {
			if (e.type !== "enemy" || e.dead || e.z >= 0) continue;
			const dist = Math.hypot(e.x - aimX, (e.y - aimY) * 0.8);
			if ((e.kind === "boss" || dist < assist) && Math.abs(e.z) < d) {
				best = e;
				d = Math.abs(e.z);
			}
		}
		return best;
	}
	enemyShot(e, angle = 0, speed = 32) {
		const p = new THREE.Vector3(
			this.x - e.x,
			this.y - e.y,
			3 - e.z,
		).normalize();
		p.x += angle;
		const b = this.add({
			type: "bolt",
			mesh: this.g.bolt(true),
			x: e.x,
			y: e.y,
			z: e.z + 2,
			radius: 0.32,
			vx: p.x * speed,
			vy: p.y * speed,
			vz: p.z * speed,
			team: "enemy",
		});
		b.mesh.quaternion.setFromUnitVectors(
			new THREE.Vector3(0, 0, 1),
			p.normalize(),
		);
		this.sound.play("enemy");
	}
	pulse() {
		if (this.mode !== "playing" || this.pulseCD > 0) return false;
		this.pulseCD = 8;
		this.g.pulse(new THREE.Vector3(this.x, this.y, 3));
		this.sound.play("pulse");
		for (const e of [...this.entities]) {
			if (e.type === "bolt" && e.team === "enemy") this.remove(e);
			if (e.type === "enemy" && e.z > -90)
				this.hurtEnemy(e, e.kind === "boss" ? 10 : 3);
		}
		this.cb.toast("PULSE • Incoming fire cleared");
		return true;
	}
	roll() {
		if (this.mode !== "playing" || this.rollCD > 0) return false;
		this.rollCD = 3;
		this.invincible = Math.max(this.invincible, 0.75);
		this.g.player.userData.rollAction.reset().play();
		this.sound.play("roll");
		return true;
	}
	damage(amount) {
		if (this.invincible > 0 || this.god || this.attract) return;
		this.metrics.damage += amount;
		this.health = Math.max(0, this.health - amount);
		this.invincible = 0.7;
		this.g.shake = 0.55;
		this.sound.play("hit");
		this.cb.hit();
		if (this.health <= 0) {
			this.lives--;
			if (this.lives <= 0) {
				this.finish(false);
				return;
			}
			this.health = 100;
			this.fuel = Math.max(30, this.fuel);
			this.invincible = 3;
			this.cb.banner(
				"KESTREL LOST",
				"BACK IN THE SADDLE",
				`${this.lives} reserve craft remain.`,
				2,
			);
		}
	}
	hurtEnemy(e, amount) {
		if (e.dead) return;
		if (e.kind === "boss") {
			const phase = e.hp / e.maxHp > 2 / 3 ? 1 : e.hp / e.maxHp > 1 / 3 ? 2 : 3;
			const armored = phase === 1 && e.age % 7 > 4.8;
			amount *= armored ? 0.18 : 1;
		}
		e.hp -= amount;
		this.metrics.hits++;
		if (e.hp <= 0) {
			e.dead = true;
			this.metrics.kills++;
			this.score +=
				e.kind === "boss"
					? 6000
					: e.kind === "mech"
						? 320
						: e.kind === "cobra"
							? 250
							: 180;
			if (e.counts) this.killed++;
			this.g.burst(
				e.mesh.position.clone(),
				e.kind === "boss" ? 0xffb880 : 0xfa976f,
				e.kind === "boss" ? 90 : 22,
			);
			this.g.shake = e.kind === "boss" ? 0.8 : 0.14;
			this.sound.play("explode");
			if (e.kind === "boss") {
				this.remove(e);
				this.complete();
			} else {
				if (this.rng() < 0.2)
					this.add({
						type: "salvage",
						mesh: this.g.pickup("fuel"),
						x: e.x,
						y: e.y,
						z: e.z,
						radius: 1.5,
						speed: 18,
					});
				this.remove(e);
			}
		}
	}
	collide(a, b) {
		if (!a || !b || a.dead || b.dead) return;
		this.metrics.collisions++;
		if (a.type !== "bolt" && b.type === "bolt") [a, b] = [b, a];
		if (a.type === "bolt") {
			if (a.team === "player" && b.type === "enemy") {
				this.hurtEnemy(b, a.damage);
				a.dead = true;
			}
			if (a.team === "player" && b.type === "dock") {
				b.hp -= 4;
				a.dead = true;
				if (!b.warned) {
					b.warned = true;
					this.cb.radio(
						"Hey, hotshot! That is OUR docking bay. Cease fire!",
						true,
					);
				}
				if (b.hp <= 0 && !this.redZone) {
					this.redZone = true;
					this.cb.toast(
						"RED ZONE • Dock damaged. Emergency crew is repairing it.",
					);
					b.hp = 100;
					this.score = Math.max(0, this.score - 500);
				}
			}
			if (a.team === "enemy" && b.type === "ship") {
				this.damage(this.tuning.enemyDamage);
				a.dead = true;
			}
			return;
		}
		if (a.type !== "ship" && b.type === "ship") [a, b] = [b, a];
		if (a.type !== "ship") return;
		if (b.type === "enemy") {
			this.damage(this.tuning.enemyDamage * 1.5);
			if (b.kind !== "boss") {
				this.hurtEnemy(b, 10);
			}
		}
		if (b.type === "cadet") {
			if (!this.rescued.includes(b.cadet)) {
				this.rescued.push(b.cadet);
				this.metrics.rescues++;
				this.score += 500;
				this.fuel = Math.min(100, this.fuel + 4);
				this.g.burst(b.mesh.position, 0x94e8d1, 15);
				this.sound.play("pickup");
				this.cb.radio(
					[
						"One aboard! Their knees are still knocking.",
						"Two! That is one cheerful tractor beam.",
						"Three safe. One more space tourist to go.",
						"All cadets aboard. Good flying, Kestrel!",
					][this.rescued.length - 1],
				);
			}
			b.dead = true;
		}
		if (b.type === "key") {
			this.key = true;
			this.metrics.keys++;
			this.score += 400;
			this.sound.play("pickup");
			this.cb.toast("ION KEY ACQUIRED • The door is yours");
			b.dead = true;
			for (const gate of this.entities.filter((e) => e.type === "gate"))
				gate.mesh.userData.openAction.reset().play();
		}
		if (b.type === "salvage") {
			this.fuel = Math.min(100, this.fuel + 5);
			this.score += 50;
			b.dead = true;
			this.sound.play("pickup");
		}
		if (b.type === "focus") {
			this.rings++;
			this.metrics.rings++;
			this.score += 250;
			this.fuel = Math.min(100, this.fuel + 5);
			this.sound.play("pickup");
			b.dead = true;
			this.g.burst(b.mesh.position, 0x96e7da, 12);
		}
		if (b.type === "dock" && !this.repaired) {
			this.repaired = true;
			this.health = 100;
			this.fuel = 100;
			this.metrics.docks++;
			this.score += 750;
			this.g.burst(new THREE.Vector3(0, 0, 2), 0x91e6d1, 35);
			this.sound.play("pickup");
			this.cb.radio(
				"Tanks topped. Hull patched. Do try to bring this one back.",
			);
			this.complete();
		}
		if (b.type === "gate") {
			if (this.key) {
				this.metrics.gates++;
				this.score += 1800;
				this.complete();
			} else if (!b.blocked) {
				b.blocked = true;
				this.damage(35);
				this.cb.radio(
					"The GOLD KEY, Kestrel! The door is unimpressed by enthusiasm.",
					true,
				);
				b.z = -110;
				b.body.setTranslation({ x: b.x, y: b.y, z: b.z }, true);
				b.blocked = false;
				this.keySpawned = false;
			}
		}
	}
	complete() {
		if (this.mode !== "playing") return;
		const type = SECTORS[this.sector].type;
		this.cleared = [...new Set([...this.cleared, this.sector])];
		if (this.sector === 0) this.unlocked = Math.max(this.unlocked, 2);
		if (this.cleared.includes(1) && this.cleared.includes(2))
			this.unlocked = Math.max(this.unlocked, 3);
		if (this.sector >= 3)
			this.unlocked = Math.min(5, Math.max(this.unlocked, this.sector + 1));
		if (type === "rescue") {
			this.lives = Math.min(4, this.lives + 1);
			this.score += 2000;
		}
		if (type === "fleet") {
			this.score += 1000;
			this.health = Math.min(100, this.health + 15);
		}
		if (type === "wormhole") this.score += this.rings === 6 ? 1500 : 500;
		this.mode = "clear";
		this.stageTime = 0;
		this.cb.save();
		this.sound.play("win");
		this.cb.banner(
			type === "boss" ? "THE LOST SUN IS FOUND" : "SECTOR SECURED",
			type === "boss" ? "LET THERE BE MAYHEM" : "NICE FLYING, KESTREL",
			type === "boss"
				? "The Nightjar is scrap. The sunrise is yours."
				: type === "rescue"
					? "4 cadets safe · reserve craft earned"
					: "Open your scanner. Your next adventure is waiting.",
			3.3,
		);
	}
	finish(won) {
		this.completed = won;
		this.mode = won ? "victory" : "gameover";
		this.cb.save(true);
		this.sound.play(won ? "win" : "explode");
		this.cb.finish(won);
	}
	nextSector() {
		return (
			[0, 1, 2, 3, 4, 5].find(
				(i) => i <= this.unlocked && !this.cleared.includes(i),
			) ?? Math.min(5, this.unlocked)
		);
	}
	bot() {
		const type = SECTORS[this.sector].type;
		let tx = 0,
			ty = 0;
		const pickup = this.entities
			.filter(
				(e) => ["cadet", "key", "focus"].includes(e.type) && !e.dead && e.z < 7,
			)
			.sort((a, b) => b.z - a.z)[0];
		const enemy = this.entities
			.filter((e) => e.type === "enemy" && !e.dead && e.z < 0)
			.sort((a, b) => b.z - a.z)[0];
		if (pickup) {
			tx = pickup.x;
			ty = pickup.type === "cadet" ? -2 : pickup.y;
		} else if (enemy && type !== "dock") {
			tx = enemy.x;
			ty = enemy.y;
		} else {
			tx = Math.sin(this.elapsed * 0.6) * 4;
			ty = 1 + Math.sin(this.elapsed * 0.4);
		}
		if (type === "dock") {
			tx = 0;
			ty = 0;
		}
		return {
			x: clamp((tx - this.x) * 1.5, -1, 1),
			y: clamp((ty - this.y) * 1.5, -1, 1),
			fire: type !== "dock",
			boost: false,
			pulse:
				this.pulseCD <= 0 &&
				this.entities.filter((e) => e.team === "enemy").length > 10,
			roll: this.rollCD <= 0 && this.health < 50,
			aimX: 0,
			aimY: 0,
		};
	}
	step(dt, input = {}) {
		this.time += dt;
		if (
			[
				"title",
				"paused",
				"map",
				"victory",
				"gameover",
				"ended",
				"waiting",
			].includes(this.mode)
		)
			return;
		if (this.mode === "clear") {
			this.stageTime += dt;
			if (this.stageTime > 3.3) {
				if (this.sector === 5) {
					if (this.attract) {
						this.start({ attract: true });
					} else this.finish(true);
				} else if (this.attract || this.autopilot) this.warp(this.nextSector());
				else {
					this.mode = "map";
					this.cb.map();
				}
			}
			return;
		}
		if (this.mode === "warp") {
			this.stageTime += dt;
			if (this.stageTime > 2.7) {
				if (!this.warpInitial) this.fuel = Math.max(0, this.fuel - 8);
				this.enter(this.sector);
			}
			return;
		}
		if (this.autopilot || this.attract) input = this.bot();
		this.lastInput = input;
		this.elapsed += dt;
		this.campaignTime += dt;
		this.stageTime += dt;
		this.invincible = Math.max(0, this.invincible - dt);
		this.pulseCD = Math.max(0, this.pulseCD - dt);
		this.rollCD = Math.max(0, this.rollCD - dt);
		this.fireHeld = !!input.fire;
		const boost = !!input.boost && this.fuel > 1;
		const speed = this.tuning.flightSpeed * (boost ? 1.6 : 1);
		const a = 1 - Math.exp(-dt * 9);
		this.vx += (input.x * speed - this.vx) * a || 0;
		this.vy += (input.y * speed - this.vy) * a || 0;
		this.x = clamp(this.x + this.vx * dt, -10, 10);
		this.y = clamp(this.y + this.vy * dt, -2.5, 6);
		this.fuel = Math.max(
			0,
			this.fuel - dt * this.tuning.fuelDrain * (boost ? 4 : 1),
		);
		if (this.fuel <= 0 && !this.god) {
			this.damage(dt * 12);
			if (this.elapsed % 10 < dt)
				this.cb.radio(
					"Running on fumes! Scanner, then Wayfarer Bay. Or take the rescue tug.",
					true,
				);
		}
		this.shipBody.setNextKinematicTranslation({ x: this.x, y: this.y, z: 3 });
		if (input.pulse) this.pulse();
		if (input.roll) this.roll();
		this.shoot(input);
		const s = SECTORS[this.sector],
			type = s.type;
		if (type === "fleet") {
			this.planet = Math.max(0, this.planet - dt * 0.58);
			if (this.planet <= 0 && !this.redZone) {
				this.redZone = true;
				this.cb.radio(
					"Lantern has fallen! Red Zone. Finish the fleet and get moving.",
					true,
				);
			}
			this.spawnClock -= dt;
			if (this.spawnClock <= 0 && this.spawned < 12) {
				this.spawnClock = 1.45;
				this.enemy(
					this.spawned % 4 === 3
						? "mech"
						: this.spawned % 3 === 1
							? "cobra"
							: "raider",
				);
				this.spawned++;
			}
			if (this.killed >= 12) this.complete();
		}
		if (type === "rescue") {
			if (
				this.elapsed > 2 + this.cadetSchedule * 5.5 &&
				this.cadetSchedule < 4
			) {
				this.spawnCadet(this.cadetSchedule++);
			}
			if (this.rescued.length === 4) this.complete();
			if (this.elapsed > 3 && this.elapsed < 40 && this.elapsed % 5 < dt)
				this.enemy("mech", (this.rng() - 0.5) * 16, 3, -95, false);
		}
		if (type === "dock" && !this.dockSpawned) {
			this.dockSpawned = true;
			this.add({
				type: "dock",
				mesh: this.g.dock(),
				x: 0,
				y: 0,
				z: -65,
				hp: 100,
				half: [4.1, 3.5, 3],
				speed: 9,
			});
		}
		if (type === "corridor") {
			if (this.elapsed > 1 && !this.keySpawned && !this.key) {
				this.keySpawned = true;
				this.add({
					type: "key",
					mesh: this.g.pickup("key"),
					x: -5,
					y: 0.5,
					z: -65,
					radius: 1.6,
					speed: 13,
				});
			}
			if (this.elapsed > 4 && !this.gateSpawned) {
				this.gateSpawned = true;
				const e = this.add({
					type: "gate",
					mesh: this.g.gate(),
					x: 0,
					y: 0,
					z: -155,
					half: [10, 7, 0.8],
					speed: 12,
				});
				if (this.key) e.mesh.userData.openAction.play();
			}
			if (this.elapsed > 2 && this.elapsed < 20 && this.elapsed % 4 < dt)
				this.enemy("mech", (this.rng() - 0.5) * 14, 3, -90, false);
		}
		if (type === "wormhole") {
			if (this.ringSchedule < 6 && this.elapsed > 1 + this.ringSchedule * 3) {
				const i = this.ringSchedule++;
				const g = new THREE.Group();
				this.g.ring(0x9ce6d9, g, [0, 0, 0], 2.1, 0.1);
				this.g.ring(0x6c74ad, g, [0, 0, 0], 2.5, 0.04);
				this.add({
					type: "focus",
					mesh: g,
					x: [-5, 4, 0, -4, 5, 0][i],
					y: [1, -1, 3, 0, 2, 1][i],
					z: -85,
					radius: 2.1,
					speed: 24,
				});
			}
			if (this.elapsed > 23) this.complete();
		}
		for (const e of [...this.entities]) {
			if (e.dead) continue;
			e.age += dt;
			if (e.type === "bolt") {
				const p = e.body.translation();
				e.x = p.x;
				e.y = p.y;
				e.z = p.z;
				if (e.z < -180 || e.z > 40 || e.age > 7 || Math.abs(e.x) > 90)
					e.dead = true;
			} else if (e.type === "enemy") {
				if (e.kind === "boss") {
					const phase =
						e.hp / e.maxHp > 2 / 3 ? 1 : e.hp / e.maxHp > 1 / 3 ? 2 : 3;
					if (phase !== e.phase) {
						e.phase = phase;
						this.metrics.bossPhases++;
						this.cb.radio(
							phase === 2
								? "Armor cracked! Now watch those scatter cannons."
								: "Reactor exposed! One last push, Kestrel!",
							true,
						);
						this.sound.play("pulse");
					}
					e.x = Math.sin(e.age * 0.5) * 5;
					e.y = 2 + Math.sin(e.age * 0.7) * 1.4;
					e.z = -48 + Math.sin(e.age * 0.2) * 7;
					e.shoot -= dt;
					if (e.shoot <= 0) {
						e.shoot = phase === 1 ? 2 : phase === 2 ? 1.4 : 0.9;
						for (let i = -phase; i <= phase; i++)
							this.enemyShot(e, i * 0.12, phase === 3 ? 43 : 33);
						if (
							phase === 3 &&
							this.entities.filter((n) => n.type === "enemy").length < 4
						)
							this.enemy("cobra", e.x + 6, 2, -85, false);
					}
				} else {
					e.z += (e.speed + (boost ? 4 : 0)) * dt;
					e.x = clamp(
						e.baseX +
							Math.sin(e.age * (e.kind === "cobra" ? 2 : 0.8) + e.seed) *
								(e.kind === "mech" ? 1 : 2),
						-10,
						10,
					);
					e.y = clamp(e.baseY + Math.sin(e.age * 1.3) * 0.5, -1.5, 6);
					e.shoot -= dt;
					if (e.shoot <= 0 && e.z > -65 && e.z < -10) {
						e.shoot = this.redZone ? 1 : 2.8;
						this.enemyShot(e);
					}
				}
				if (e.mesh) e.mesh.rotation.z = Math.sin(e.age * 1.6) * 0.15;
				if (e.z > 15) {
					e.dead = true;
					if (e.counts) {
						this.spawned--;
						this.planet = Math.max(0, this.planet - 5);
					}
				}
			} else {
				e.z += (e.speed ?? 15) * dt;
				if (e.type === "key" || e.type === "salvage")
					e.mesh.rotation.y += dt * 2;
				if (e.type === "focus") e.mesh.rotation.z += dt * 0.3;
				if (e.z > 15) {
					if (e.type === "cadet" && !this.rescued.includes(e.cadet))
						this.spawnCadet(e.cadet);
					if (e.type === "key") this.keySpawned = false;
					if (e.type === "dock") {
						e.z = -75;
					} else if (e.type === "gate") {
						if (this.key) {
							this.metrics.gates++;
							this.score += 1800;
							this.complete();
						} else {
							e.z = -110;
							this.keySpawned = false;
						}
					} else e.dead = true;
				}
			}
			if (e.type !== "bolt" && !e.dead)
				e.body.setNextKinematicTranslation({ x: e.x, y: e.y, z: e.z });
			if (e.mesh) e.mesh.position.set(e.x, e.y, e.z);
		}
		this.world.timestep = dt;
		this.world.step(this.queue);
		const contacts = [];
		this.queue.drainCollisionEvents((a, b, started) => {
			if (started) contacts.push([this.handles.get(a), this.handles.get(b)]);
		});
		for (const [a, b] of contacts) this.collide(a, b);
		for (const e of [...this.entities]) if (e.dead) this.remove(e);
		this.g.player.position.set(this.x, this.y, 3);
		this.g.player.rotation.z = THREE.MathUtils.damp(
			this.g.player.rotation.z,
			-this.vx * 0.027,
			7,
			dt,
		);
		this.g.player.rotation.x = THREE.MathUtils.damp(
			this.g.player.rotation.x,
			this.vy * 0.02,
			7,
			dt,
		);
		this.g.player.visible =
			this.invincible <= 0 || Math.floor(this.time * 15) % 2 === 0 || this.god;
	}
	spawnCadet(i) {
		this.add({
			type: "cadet",
			cadet: i,
			mesh: this.g.pickup("cadet"),
			x: [-6, 4, -3, 7][i],
			y: -2.2,
			z: -85,
			radius: 2.25,
			speed: 13,
		});
	}
	snapshot() {
		return {
			mode: this.mode,
			sector: this.sector,
			sectorType: SECTORS[this.sector].type,
			score: Math.round(this.score),
			fuel: this.fuel,
			health: this.health,
			lives: this.lives,
			x: this.x,
			y: this.y,
			elapsed: this.elapsed,
			cleared: [...this.cleared],
			unlocked: this.unlocked,
			rescued: [...this.rescued],
			key: this.key,
			rings: this.rings,
			redZone: this.redZone,
			planet: this.planet,
			pulseCD: this.pulseCD,
			rollCD: this.rollCD,
			entities: this.entities.map((e) => ({
				id: e.id,
				type: e.type,
				kind: e.kind,
				x: e.x,
				y: e.y,
				z: e.z,
				hp: e.hp,
				team: e.team,
			})),
			boss: this.boss
				? { hp: this.boss.hp, maxHp: this.boss.maxHp, phase: this.boss.phase }
				: null,
			metrics: { ...this.metrics },
			completed: this.completed,
			attract: this.attract,
			autopilot: this.autopilot,
			tuning: { ...this.tuning },
		};
	}
}
