/* Solaris-inspired deterministic flight rules. Rapier owns sensor contacts. */
class SolarSim {
	constructor(RAPIER, emit = () => {}) {
		this.R = RAPIER;
		this.emit = emit;
		this.defaults = {
			damage: 1,
			enemySpeed: 1,
			spawnRate: 1,
			shipSpeed: 1,
			assist: 1,
			god: false,
		};
		this.tuning = { ...this.defaults };
		this.sectorDefinitions = [
			{
				id: "anchor",
				name: "ANCHOR STATION",
				x: 11,
				y: 67,
				type: "base",
				cost: 0,
				desc: "A light in the dark. Repair, refuel, and rearm.",
			},
			{
				id: "shard",
				name: "SHARD BELT",
				x: 29,
				y: 32,
				type: "rescue",
				cost: 10,
				desc: "Three lifeboats among the wrecks. Fly into their green tractor rings.",
			},
			{
				id: "echo",
				name: "RED ECHO",
				x: 36,
				y: 77,
				type: "combat",
				cost: 12,
				desc: "Seven Zylon raiders. Break their patrol and recover a route signal.",
			},
			{
				id: "haven",
				name: "FAR HAVEN",
				x: 54,
				y: 53,
				type: "base",
				cost: 8,
				desc: "The last service beacon. Your hull, fuel, and pulse cells restored.",
			},
			{
				id: "chorus",
				name: "LOST CHORUS",
				x: 67,
				y: 21,
				type: "rescue",
				cost: 14,
				desc: "Four survivor pods are broadcasting. Zylons are listening too.",
			},
			{
				id: "rift",
				name: "RIFT GATE",
				x: 76,
				y: 73,
				type: "combat",
				cost: 15,
				desc: "Ten defenders and a signal jammer. Clear the gate for your final jump.",
			},
			{
				id: "solaris",
				name: "SOLARIS",
				x: 91,
				y: 40,
				type: "boss",
				cost: 18,
				desc: "The lost world. Destroy the siege carrier and bring the survivors home.",
			},
		];
		this.dev = {
			refill: () => this.refill(),
			complete: () => this.completeSector(true),
			spawn: (kind = "fighter") => this.spawnEnemy(kind),
			warp: (id) => {
				if (this.state === "flight") this.finishSector(true);
				this.selectSector(id, true);
			},
			victory: () => this.win(),
			tow: () => this.emergencyTow(),
		};
		this.start();
	}
	start() {
		if (this.queue) this.queue.free();
		if (this.world) this.world.free();
		this.world = new this.R.World({ x: 0, y: 0, z: 0 });
		this.queue = new this.R.EventQueue(true);
		this.entities = new Map();
		this.bullets = new Map();
		this.colliderIndex = new Map();
		this.remove = new Set();
		this.nextId = 1;
		this.seed = 86261986;
		this.state = "map";
		this.sector = "anchor";
		this.pendingSector = null;
		this.time = 0;
		this.stageTime = 0;
		this.warpTime = 0;
		this.returnTimer = 0;
		this.player = {
			x: 0,
			y: 0,
			z: 0,
			hp: 100,
			shield: 100,
			fuel: 100,
			pulses: 3,
			pulse: 3,
			score: 0,
			heat: 0,
			overheated: false,
			invincible: 0,
			boost: false,
		};
		this.wingman = {
			x: 5,
			y: 1,
			z: -2,
			active: false,
			hp: 100,
			shield: 100,
			heat: 0,
			boost: false,
		};
		this.peerInput = {};
		this.peerActive = false;
		this.completed = new Set();
		this.rescued = 0;
		this.kills = 0;
		this.deaths = 0;
		this.objective = {
			label: "RESCUE 5 SURVIVORS · RECOVER 2 ROUTE SIGNALS",
			current: 0,
			target: 5,
		};
		this.sectorProgress = 0;
		this.sectorDone = false;
		this.lastMessage = "The frontier is going dark. Bring them home.";
		this.fireTimer = 0;
		this.wingFireTimer = 0;
		this.spawnTimer = 0;
		this.podTimer = 0;
		this.rockTimer = 0;
		this.pulseTimer = 0;
		this.pulseRefill = 0;
		this.previousPulse = false;
		this.previousInteract = false;
		this.stats = {
			shots: 0,
			hits: 0,
			damageTaken: 0,
			pulsesUsed: 0,
			collisions: 0,
			sectorsVisited: [],
			elapsed: 0,
		};
		this.playerBody = this._body("player", 0, 0, 0, 1.45, "player");
		this.wingBody = this._body("wing", 5, 1, -2, 1.3, "wing");
		this.emit({ type: "reset" });
	}
	random() {
		let a = this.seed | 0;
		a ^= a << 13;
		a ^= a >>> 17;
		a ^= a << 5;
		this.seed = a >>> 0;
		return this.seed / 4294967296;
	}
	range(a, b) {
		return a + this.random() * (b - a);
	}
	_body(id, x, y, z, radius, cat, dynamic = false) {
		const d = dynamic
			? this.R.RigidBodyDesc.dynamic().setCcdEnabled(true)
			: this.R.RigidBodyDesc.kinematicPositionBased();
		d.setTranslation(x, y, z);
		const b = this.world.createRigidBody(d);
		const c = this.world.createCollider(
			this.R.ColliderDesc.ball(radius)
				.setSensor(true)
				.setActiveEvents(this.R.ActiveEvents.COLLISION_EVENTS)
				.setActiveCollisionTypes(this.R.ActiveCollisionTypes.ALL),
			b,
		);
		this.colliderIndex.set(c.handle, { id, cat });
		b.userData = { collider: c.handle };
		return b;
	}
	_dropBody(body) {
		if (!body) return;
		try {
			this.colliderIndex.delete(body.userData.collider);
			this.world.removeRigidBody(body);
		} catch (_) {
			/* Reset may already have released its world. */
		}
	}
	_clearSpace() {
		for (const e of this.entities.values()) this._dropBody(e.body);
		for (const b of this.bullets.values()) this._dropBody(b.body);
		this.entities.clear();
		this.bullets.clear();
		this.remove.clear();
	}
	get sectors() {
		return this.sectorDefinitions.map((s) => ({
			...s,
			complete: this.completed.has(s.id),
			locked: s.id === "solaris" && !this.bossUnlocked(),
			current: s.id === this.sector,
		}));
	}
	bossUnlocked() {
		return (
			this.rescued >= 5 &&
			this.completed.has("echo") &&
			this.completed.has("rift")
		);
	}
	message(text, kind = "radio") {
		this.lastMessage = text;
		this.emit({ type: "message", text, kind });
	}
	selectSector(id, force = false) {
		if (this.state !== "map" && !force) return false;
		const s = this.sectorDefinitions.find((s) => s.id === id);
		if (!s || (s.id === "solaris" && !this.bossUnlocked() && !force)) {
			this.message(
				"Solaris is hidden. Rescue five survivors and recover both route signals.",
			);
			return false;
		}
		if (this.player.fuel < s.cost && !force) {
			this.message("Not enough fuel. Anchor Station can tow you home.");
			return false;
		}
		this._clearSpace();
		this.player.fuel = Math.max(0, this.player.fuel - s.cost);
		this.pendingSector = id;
		this.state = "warp";
		this.warpTime = 0;
		this.stageTime = 0;
		this.player.x = 0;
		this.player.y = 0;
		this.emit({ type: "warp", sector: id });
		return true;
	}
	_enterSector(id) {
		this.sector = id;
		this.pendingSector = null;
		this.state = "flight";
		this.stageTime = 0;
		this.sectorProgress = 0;
		this.sectorDone = false;
		this.returnTimer = 0;
		this.spawnTimer = 1.2;
		this.podTimer = 2;
		this.rockTimer = 0.4;
		this.fireTimer = 0;
		this.player.invincible = 2;
		this.stats.sectorsVisited.push(id);
		const s = this.sectorDefinitions.find((s) => s.id === id);
		if (s.type === "base") {
			this.objective = {
				label: "HOLD COURSE · AUTOMATIC DOCKING",
				current: 0,
				target: 6,
			};
			this._spawn("base", {
				x: 0,
				y: 0,
				z: -42,
				hp: 100,
				radius: 8,
				scale: 1,
				kind: "station",
			});
			this.message("Service beacon acquired. Hold course for docking.");
		} else if (s.type === "rescue") {
			this.objective = {
				label: "TRACTOR THE SURVIVOR PODS",
				current: 0,
				target: id === "shard" ? 3 : 4,
			};
			this.message(
				id === "shard"
					? "Life signs in the belt. Fly through the green tractor rings."
					: "Their voices are faint. Follow the green beacons.",
			);
			this.spawnPod();
			if (id === "chorus") this.spawnEnemy();
		} else if (s.type === "combat") {
			this.objective = {
				label:
					id === "rift" ? "BREAK THE GATE DEFENSE" : "CLEAR THE ZYLON PATROL",
				current: 0,
				target: id === "rift" ? 10 : 7,
			};
			this.message(
				id === "rift"
					? "Jammer online. Take out the gate defenders."
					: "Zylon patrol ahead. Give them a reason to turn back.",
			);
			this.spawnEnemy();
			this.spawnEnemy();
			if (id === "rift") this.spawnEnemy("jammer");
		} else {
			this.objective = {
				label: "DESTROY THE SIEGE CARRIER",
				current: 0,
				target: 1800,
			};
			this._spawn("boss", {
				x: 0,
				y: 1,
				z: -88,
				hp: 1800,
				maxHp: 1800,
				radius: 8.3,
				scale: 1,
				kind: "carrier",
				phase: 1,
				fireTimer: 3,
			});
			this.message("Solaris. Still burning. One carrier between us and home.");
		}
		this.emit({ type: "sector", sector: id, kind: s.type });
	}
	_spawn(type, values = {}) {
		const id = this.nextId++;
		const e = {
			id,
			type,
			kind: type,
			x: 0,
			y: 0,
			z: -80,
			hp: 32,
			maxHp: 32,
			rot: this.range(0, 6.28),
			scale: 1,
			age: 0,
			radius: 1.5,
			seed: this.range(0, 6.28),
			...values,
		};
		e.homeX = e.x;
		e.homeY = e.y;
		e.body = this._body(id, e.x, e.y, e.z, e.radius, type);
		this.entities.set(id, e);
		return e;
	}
	spawnEnemy(kind = "fighter") {
		if (this.entities.size > 40) return null;
		const hp = kind === "jammer" ? 125 : kind === "interceptor" ? 30 : 44;
		return this._spawn("enemy", {
			kind,
			x: this.range(-17, 17),
			y: this.range(-7, 8),
			z: this.range(-100, -82),
			hp,
			maxHp: hp,
			radius: kind === "jammer" ? 3.1 : 2.1,
			scale: kind === "jammer" ? 1.7 : 1,
			fireTimer: this.range(2, 4),
			speed: kind === "interceptor" ? 17 : this.range(9, 13),
		});
	}
	spawnPod() {
		return this._spawn("pod", {
			x: this.range(-11, 11),
			y: this.range(-5.5, 5.5),
			z: -80,
			hp: 1,
			maxHp: 1,
			radius: 1.8,
			scale: 1,
			kind: "survivor",
		});
	}
	spawnRock() {
		const radius = this.range(1.4, 3.8);
		return this._spawn("asteroid", {
			x: this.range(-24, 24),
			y: this.range(-14, 14),
			z: -110,
			hp: 25 + radius * 10,
			maxHp: 25 + radius * 10,
			radius,
			scale: radius,
			kind: "rock",
			speed: this.range(11, 23),
		});
	}
	_fire(owner, actor, input) {
		let ax = Number.isFinite(input.aimX) ? input.aimX : actor.x;
		let ay = Number.isFinite(input.aimY) ? input.aimY : actor.y;
		const assist = Math.max(0, Number(this.tuning.assist) || 0);
		let target = null,
			best = 7.5 * assist;
		for (const e of this.entities.values())
			if ((e.type === "enemy" || e.type === "boss") && e.z < -8) {
				// Aim is expressed on a plane 65 units ahead; project target onto it.
				const factor = 65 / Math.max(15, -e.z);
				const tx = actor.x + (e.x - actor.x) * factor,
					ty = actor.y + (e.y - actor.y) * factor;
				const d = Math.hypot(tx - ax, ty - ay);
				if (d < best + (e.type === "boss" ? 5 : 0)) {
					best = d;
					target = e;
				}
			}
		let tx = ax,
			ty = ay,
			tz = -65;
		if (target) {
			tx = target.x;
			ty = target.y;
			tz = target.z;
		}
		const dx = tx - actor.x,
			dy = ty - actor.y,
			dz = tz - (actor.z || 0),
			norm = Math.hypot(dx, dy, dz);
		const speed = 145;
		for (const side of [-1, 1]) {
			const id = this.nextId++,
				x = actor.x + side * 0.7,
				y = actor.y - 0.1,
				z = (actor.z || 0) - 2;
			const b = {
				id,
				owner,
				x,
				y,
				z,
				vx: (dx / norm) * speed,
				vy: (dy / norm) * speed,
				vz: (dz / norm) * speed,
				age: 0,
				damage: 12 * this.tuning.damage,
			};
			b.body = this._body(id, x, y, z, 0.55, "bullet", true);
			b.body.setLinvel({ x: b.vx, y: b.vy, z: b.vz }, true);
			this.bullets.set(id, b);
		}
		this.stats.shots += 2;
		this.emit({ type: "fire", owner, x: actor.x, y: actor.y, z: actor.z || 0 });
	}
	_enemyFire(e, count = 1, spread = 0.7) {
		const dx = this.player.x - e.x,
			dy = this.player.y - e.y,
			dz = -e.z,
			norm = Math.hypot(dx, dy, dz),
			speed = e.type === "boss" ? 36 : 29;
		for (let i = 0; i < count; i++) {
			const id = this.nextId++;
			const b = {
				id,
				owner: "enemy",
				x: e.x,
				y: e.y,
				z: e.z + 2,
				vx: (dx / norm) * speed + (i - (count - 1) / 2) * spread,
				vy: (dy / norm) * speed,
				vz: (dz / norm) * speed,
				age: 0,
				damage: e.type === "boss" ? 15 : 10,
			};
			b.body = this._body(id, b.x, b.y, b.z, 0.65, "bullet", true);
			b.body.setLinvel({ x: b.vx, y: b.vy, z: b.vz }, true);
			this.bullets.set(id, b);
		}
	}
	_hitPlayer(damage, source = "enemy") {
		if (
			this.tuning.god ||
			this.player.invincible > 0 ||
			this.state !== "flight" ||
			this.sectorDone
		)
			return;
		const blocked = Math.min(this.player.shield, damage);
		this.player.shield -= blocked;
		this.player.hp = Math.max(0, this.player.hp - damage + blocked);
		this.player.invincible = 0.65;
		this.stats.damageTaken += damage;
		this.emit({
			type: "hit",
			owner: "player",
			damage,
			source,
			x: this.player.x,
			y: this.player.y,
			z: 0,
		});
		if (this.player.hp <= 0) {
			this.state = "defeat";
			this.deaths++;
			this.emit({ type: "defeat", score: this.player.score });
			this.message("Signal lost. The frontier still needs you.");
		}
	}
	_damageEntity(e, damage) {
		if (!e || this.remove.has(e.id) || e.type === "pod" || e.type === "base")
			return;
		e.hp -= damage;
		this.stats.hits++;
		this.emit({
			type: "hit",
			owner: e.type,
			id: e.id,
			x: e.x,
			y: e.y,
			z: e.z,
			damage,
		});
		if (e.type === "boss")
			this.objective.current = Math.min(
				this.objective.target,
				this.objective.target - Math.max(0, e.hp),
			);
		if (e.hp > 0) return;
		this.remove.add(e.id);
		const points =
			e.type === "boss"
				? 10000
				: e.kind === "jammer"
					? 1200
					: e.type === "asteroid"
						? 60
						: 350;
		this.player.score += points;
		this.emit({
			type: "explode",
			id: e.id,
			kind: e.type,
			x: e.x,
			y: e.y,
			z: e.z,
			scale: e.type === "boss" ? 9 : e.scale,
			points,
		});
		if (e.type === "enemy") {
			this.kills++;
			if (this.sector === "echo" || this.sector === "rift") {
				this.sectorProgress++;
				this.objective.current = this.sectorProgress;
			}
			if (e.kind === "jammer")
				this.message("Jammer destroyed. The gate is clear on sensors.");
		}
		if (e.type === "boss") this.win();
	}
	pulse() {
		if (
			this.state !== "flight" ||
			this.player.pulses <= 0 ||
			this.pulseTimer > 0 ||
			this.sectorDone
		)
			return false;
		this.player.pulses--;
		this.player.pulse = this.player.pulses;
		this.pulseTimer = 1.1;
		this.stats.pulsesUsed++;
		this.player.shield = Math.min(100, this.player.shield + 15);
		for (const b of this.bullets.values())
			if (b.owner === "enemy") this.remove.add(b.id);
		for (const e of this.entities.values())
			if (e.type === "enemy" || e.type === "asteroid" || e.type === "boss")
				this._damageEntity(e, e.type === "boss" ? 135 : 100);
		this.emit({ type: "pulse", x: this.player.x, y: this.player.y, z: 0 });
		return true;
	}
	refill() {
		Object.assign(this.player, {
			hp: 100,
			shield: 100,
			fuel: 100,
			pulses: 3,
			pulse: 3,
			heat: 0,
			overheated: false,
		});
		this.message(
			"Hull sealed. Tanks full. Three pulse cells. Bring them home.",
		);
		this.emit({ type: "shield" });
	}
	setPeerInput(input = {}, active = true) {
		this.peerInput = input;
		this.peerActive = active;
		this.wingman.active = active;
	}
	completeSector(force = false) {
		if (this.state !== "flight" || this.sectorDone) return false;
		if (force && this.sector === "solaris") {
			this.win();
			return true;
		}
		if (!force && this.objective.current < this.objective.target) return false;
		if (force && (this.sector === "shard" || this.sector === "chorus")) {
			const missing = Math.max(0, this.objective.target - this.sectorProgress);
			this.rescued += missing;
		}
		this.sectorProgress = this.objective.target;
		this.objective.current = this.objective.target;
		this.sectorDone = true;
		this.returnTimer = 5;
		this.completed.add(this.sector);
		if (this.sector === "anchor" || this.sector === "haven") this.refill();
		else {
			this.player.score += 1000;
			this.player.shield = Math.min(100, this.player.shield + 25);
			this.player.pulses = Math.min(3, this.player.pulses + 1);
			this.player.pulse = this.player.pulses;
		}
		for (const e of this.entities.values())
			if (e.type !== "base") this.remove.add(e.id);
		for (const b of this.bullets.values()) this.remove.add(b.id);
		this.message(
			this.sector === "echo" || this.sector === "rift"
				? "Route signal recovered. Sector secure. Returning to chart."
				: this.sector === "anchor" || this.sector === "haven"
					? "Service complete. Clear skies, pilot."
					: "Survivors aboard. You brought them back. Returning to chart.",
			"success",
		);
		this.emit({ type: "complete", sector: this.sector, rescued: this.rescued });
		return true;
	}
	finishSector(force = false) {
		if (!this.sectorDone && !force) return false;
		this._clearSpace();
		this.state = "map";
		this.returnTimer = 0;
		this.objective = {
			label: "RESCUE 5 SURVIVORS · RECOVER 2 ROUTE SIGNALS",
			current: Math.min(5, this.rescued),
			target: 5,
		};
		this.emit({ type: "map" });
		return true;
	}
	emergencyTow() {
		this._clearSpace();
		this.state = "map";
		this.sector = "anchor";
		this.player.hp = Math.max(55, this.player.hp);
		this.player.shield = Math.max(45, this.player.shield);
		this.player.fuel = 70;
		this.player.pulses = Math.max(1, this.player.pulses);
		this.player.pulse = this.player.pulses;
		this.player.score = Math.max(0, this.player.score - 1000);
		this.objective = {
			label: "RESCUE 5 SURVIVORS · RECOVER 2 ROUTE SIGNALS",
			current: Math.min(5, this.rescued),
			target: 5,
		};
		this.message("Anchor tow complete. Your score covered the bill.");
		this.emit({ type: "map" });
	}
	win() {
		if (this.state === "victory") return;
		this.state = "victory";
		this.completed.add("solaris");
		this.player.score += this.rescued * 500;
		this.message(
			"Solaris answers. Seven small voices, and a whole world of light. Welcome home.",
		);
		this.emit({
			type: "victory",
			score: this.player.score,
			rescued: this.rescued,
			time: this.stats.elapsed,
		});
	}
	_contact(a, b) {
		if (!a || !b) return;
		if (a.cat !== "bullet" && b.cat === "bullet") [a, b] = [b, a];
		if (a.cat === "bullet") {
			const shot = this.bullets.get(a.id);
			if (!shot || this.remove.has(a.id)) return;
			if (shot.owner === "enemy") {
				if (b.cat === "player" || (b.cat === "wing" && this.peerActive)) {
					this._hitPlayer(shot.damage);
					this.remove.add(a.id);
					this.stats.collisions++;
				}
			} else if (
				b.cat === "enemy" ||
				b.cat === "boss" ||
				b.cat === "asteroid"
			) {
				this._damageEntity(this.entities.get(b.id), shot.damage);
				this.remove.add(a.id);
				this.stats.collisions++;
			}
			return;
		}
		const isPilot = (item) =>
			item.cat === "player" || (item.cat === "wing" && this.peerActive);
		if (!isPilot(a) && isPilot(b)) [a, b] = [b, a];
		if (isPilot(a)) {
			const e = this.entities.get(b.id);
			if (!e) return;
			if (e.type === "asteroid" || e.type === "enemy") {
				this._hitPlayer(e.type === "asteroid" ? 22 : 18, e.type);
				this._damageEntity(e, 100);
				this.stats.collisions++;
			} else if (e.type === "pod") this._rescue(e);
		}
	}
	_rescue(e) {
		if (this.remove.has(e.id) || this.sectorDone) return;
		this.remove.add(e.id);
		this.rescued++;
		this.sectorProgress++;
		this.objective.current = this.sectorProgress;
		this.player.score += 800;
		this.player.shield = Math.min(100, this.player.shield + 12);
		this.emit({
			type: "rescue",
			x: e.x,
			y: e.y,
			z: e.z,
			rescued: this.rescued,
		});
		this.message(
			this.sectorProgress === this.objective.target
				? "All voices accounted for. Bring them home."
				: "One more voice aboard. Keep flying.",
			"rescue",
		);
	}
	update(dt, input = {}) {
		dt = Math.min(0.05, Math.max(0, Number(dt) || 0));
		if (!dt) return;
		this.time += dt;
		this.player.pulse = this.player.pulses;
		if (this.state === "warp") {
			this.warpTime += dt;
			if (this.warpTime >= 2.4) this._enterSector(this.pendingSector);
			return;
		}
		if (this.state !== "flight") return;
		this.stageTime += dt;
		this.stats.elapsed += dt;
		if (this.sectorDone) {
			this.returnTimer -= dt;
			if ((input.interact && !this.previousInteract) || this.returnTimer <= 0)
				this.finishSector();
			this.previousInteract = !!input.interact;
			this._flushRemoved();
			return;
		}
		this.player.invincible = Math.max(0, this.player.invincible - dt);
		this.pulseTimer = Math.max(0, this.pulseTimer - dt);
		this.fireTimer -= dt;
		this.wingFireTimer -= dt;
		this.player.heat = Math.max(
			0,
			this.player.heat - dt * (input.fire ? 10 : 31),
		);
		if (this.player.overheated && this.player.heat < 30)
			this.player.overheated = false;
		const boost = !!input.boost && this.player.fuel > 0.5;
		this.player.boost = boost;
		const speed = 16 * this.tuning.shipSpeed * (boost ? 1.65 : 1);
		let ix = Math.max(-1, Math.min(1, Number(input.x) || 0)),
			iy = Math.max(-1, Math.min(1, Number(input.y) || 0));
		const mag = Math.hypot(ix, iy);
		if (mag > 1) {
			ix /= mag;
			iy /= mag;
		}
		this.player.x = Math.max(
			-17,
			Math.min(17, this.player.x + ix * speed * dt),
		);
		this.player.y = Math.max(-9, Math.min(9, this.player.y + iy * speed * dt));
		this.player.fuel = Math.max(
			0,
			this.player.fuel - dt * (boost ? 0.72 : 0.025),
		);
		this.player.shield = Math.min(
			100,
			this.player.shield + (this.player.invincible <= 0 ? dt * 1.25 : 0),
		);
		this.playerBody.setNextKinematicTranslation({
			x: this.player.x,
			y: this.player.y,
			z: 0,
		});
		if (input.fire && this.fireTimer <= 0 && !this.player.overheated) {
			this._fire("player", this.player, input);
			this.fireTimer = 0.17;
			this.player.heat += 7.2;
			if (this.player.heat >= 100) {
				this.player.heat = 100;
				this.player.overheated = true;
				this.message("Cannons hot. Release the trigger to cool.");
			}
		}
		if (input.pulse && !this.previousPulse) this.pulse();
		this.previousPulse = !!input.pulse;
		this.pulseRefill += dt;
		if (this.pulseRefill > 50 && this.player.pulses < 3) {
			this.player.pulses++;
			this.player.pulse = this.player.pulses;
			this.pulseRefill = 0;
			this.message("Pulse cell recharged.");
		}
		if (this.peerActive) {
			const p = this.peerInput,
				targetX = this.player.x + 5,
				targetY = this.player.y + 1;
			this.wingman.boost = !!p.boost && this.player.fuel > 0.5;
			const wingSpeed =
				16 * this.tuning.shipSpeed * (this.wingman.boost ? 1.65 : 1);
			if (this.wingman.boost)
				this.player.fuel = Math.max(0, this.player.fuel - dt * 0.5);
			this.wingman.x = Math.max(
				-19,
				Math.min(
					19,
					this.wingman.x +
						((Number(p.x) || 0) * wingSpeed +
							(targetX - this.wingman.x) * 0.35) *
							dt,
				),
			);
			this.wingman.y = Math.max(
				-10,
				Math.min(
					10,
					this.wingman.y +
						((Number(p.y) || 0) * wingSpeed +
							(targetY - this.wingman.y) * 0.35) *
							dt,
				),
			);
			if (p.fire && this.wingFireTimer <= 0) {
				this._fire("wing", this.wingman, p);
				this.wingFireTimer = 0.2;
			}
			if (p.pulse && !this.previousPeerPulse) this.pulse();
			this.previousPeerPulse = !!p.pulse;
		} else {
			this.wingman.x = this.player.x + 5;
			this.wingman.y = this.player.y + 1;
			this.wingman.boost = false;
		}
		this.wingBody.setNextKinematicTranslation({
			x: this.wingman.x,
			y: this.wingman.y,
			z: -2,
		});
		this._updateSector(dt, input);
		for (const e of this.entities.values()) {
			e.age += dt;
			if (e.type === "enemy") {
				e.z +=
					(e.z < -34 ? e.speed : e.kind === "interceptor" ? 14 : 0) *
					this.tuning.enemySpeed *
					dt;
				e.x =
					e.homeX +
					Math.sin(e.age * 0.83 + e.seed) * (e.kind === "jammer" ? 2 : 4.2);
				e.y = e.homeY + Math.cos(e.age * 0.67 + e.seed) * 2.0;
				e.fireTimer -= dt * this.tuning.enemySpeed;
				if (e.fireTimer <= 0 && e.z > -90 && e.z < -10) {
					this._enemyFire(e, e.kind === "jammer" ? 3 : 1, 2.4);
					e.fireTimer = e.kind === "jammer" ? 2.4 : this.range(2.9, 4.1);
				}
				if (e.z > 12) this.remove.add(e.id);
			} else if (e.type === "asteroid") {
				e.z += e.speed * (boost ? 1.8 : 1) * dt;
				e.rot += dt * 0.35;
				if (e.z > 20) this.remove.add(e.id);
			} else if (e.type === "pod") {
				e.z += dt * 10.5;
				e.rot += dt * 0.65;
				// Tractor beam opens well before the pod reaches the ship.
				const leadInRange =
					Math.hypot(e.x - this.player.x, e.y - this.player.y) <
					(input.interact ? 11 : 6.2);
				const wingInRange =
					this.peerActive &&
					Math.hypot(e.x - this.wingman.x, e.y - this.wingman.y) <
						(this.peerInput.interact ? 11 : 6.2);
				if (e.z > -15 && e.z < 6 && (leadInRange || wingInRange))
					this._rescue(e);
				if (e.z > 14) {
					this.remove.add(e.id);
					this.podTimer = Math.min(this.podTimer, 1);
					this.message("Missed beacon circling back. Follow its green light.");
				}
			} else if (e.type === "base") {
				e.z = -42 + Math.min(1, this.stageTime / 6) * 12;
				e.rot += dt * 0.04;
			} else if (e.type === "boss") {
				const phase = e.hp > 1200 ? 1 : e.hp > 600 ? 2 : 3;
				if (phase !== e.phase) {
					e.phase = phase;
					this.message(
						phase === 2
							? "Carrier armor breaking. Watch the crossfire."
							: "Its core is exposed. Finish this.",
					);
					this.emit({ type: "bossPhase", phase });
				}
				e.z = Math.min(-61, e.z + dt * 6);
				e.x = Math.sin(e.age * 0.34) * (phase === 3 ? 12 : 8);
				e.y = 2 + Math.sin(e.age * 0.57) * 3;
				e.fireTimer -= dt * this.tuning.enemySpeed;
				if (e.fireTimer <= 0) {
					this._enemyFire(e, phase === 1 ? 3 : phase === 2 ? 5 : 7, 3.3);
					e.fireTimer = 2.5 - phase * 0.35;
				}
			}
			e.body.setNextKinematicTranslation({ x: e.x, y: e.y, z: e.z });
		}
		this.world.timestep = dt;
		this.world.step(this.queue);
		this.queue.drainCollisionEvents((ha, hb, started) => {
			if (started)
				this._contact(this.colliderIndex.get(ha), this.colliderIndex.get(hb));
		});
		for (const b of this.bullets.values()) {
			b.age += dt;
			const p = b.body.translation();
			b.x = p.x;
			b.y = p.y;
			b.z = p.z;
			if (
				b.age > 5 ||
				b.z < -220 ||
				b.z > 30 ||
				Math.abs(b.x) > 120 ||
				Math.abs(b.y) > 80
			)
				this.remove.add(b.id);
		}
		this._flushRemoved();
		if (
			this.state === "flight" &&
			!this.sectorDone &&
			this.objective.current >= this.objective.target &&
			this.sector !== "solaris"
		)
			this.completeSector();
		this.wingman.hp = this.player.hp;
		this.wingman.shield = this.player.shield;
		this.previousInteract = !!input.interact;
	}
	_updateSector(dt) {
		const base = this.sector === "anchor" || this.sector === "haven";
		if (base) {
			this.objective.current = Math.min(6, this.stageTime);
			return;
		}
		this.spawnTimer -= dt * this.tuning.spawnRate;
		this.rockTimer -= dt * this.tuning.spawnRate;
		this.podTimer -= dt;
		const enemies = [...this.entities.values()].filter(
			(e) => e.type === "enemy",
		).length;
		if (this.sector === "shard" || this.sector === "chorus") {
			const pods = [...this.entities.values()].filter(
				(e) => e.type === "pod",
			).length;
			if (
				this.podTimer <= 0 &&
				pods < 2 &&
				this.sectorProgress + pods < this.objective.target
			) {
				this.spawnPod();
				this.podTimer = 7.8;
			}
			if (this.rockTimer <= 0) {
				this.spawnRock();
				this.rockTimer = this.sector === "shard" ? 1.25 : 2.7;
			}
			if (this.sector === "chorus" && this.spawnTimer <= 0 && enemies < 3) {
				this.spawnEnemy();
				this.spawnTimer = 8;
			}
		} else if (this.sector === "echo" || this.sector === "rift") {
			if (
				this.spawnTimer <= 0 &&
				enemies < (this.sector === "rift" ? 5 : 4) &&
				this.sectorProgress + enemies < this.objective.target
			) {
				this.spawnEnemy(this.random() < 0.2 ? "interceptor" : "fighter");
				this.spawnTimer = this.sector === "rift" ? 3.3 : 4.0;
			}
			if (this.rockTimer <= 0) {
				if (this.sector === "rift") this.spawnRock();
				this.rockTimer = 5;
			}
		} else if (this.sector === "solaris") {
			if (this.spawnTimer <= 0 && enemies < 2) {
				this.spawnEnemy("interceptor");
				this.spawnTimer = 13;
			}
			if (this.rockTimer <= 0) {
				this.spawnRock();
				this.rockTimer = 5;
			}
		}
	}
	_flushRemoved() {
		for (const id of this.remove) {
			const e = this.entities.get(id) || this.bullets.get(id);
			if (e) this._dropBody(e.body);
			this.entities.delete(id);
			this.bullets.delete(id);
		}
		this.remove.clear();
	}
	botInput() {
		const out = {
			x: 0,
			y: 0,
			aimX: 0,
			aimY: 0,
			fire: true,
			boost: false,
			pulse: false,
			interact: true,
		};
		const pods = [...this.entities.values()]
			.filter((e) => e.type === "pod")
			.sort((a, b) => b.z - a.z);
		const targets = [...this.entities.values()]
			.filter((e) => e.type === "enemy" || e.type === "boss")
			.sort((a, b) =>
				a.type === "boss" ? -1 : b.type === "boss" ? 1 : b.z - a.z,
			);
		const target = targets[0];
		if (pods.length) {
			out.x = Math.max(-1, Math.min(1, (pods[0].x - this.player.x) * 0.5));
			out.y = Math.max(-1, Math.min(1, (pods[0].y - this.player.y) * 0.5));
		} else {
			out.x = Math.cos(this.stageTime * 0.65) * 0.35;
			out.y = Math.sin(this.stageTime * 0.7) * 0.3;
		}
		if (target) {
			const f = 65 / Math.max(12, -target.z);
			out.aimX = this.player.x + (target.x - this.player.x) * f;
			out.aimY = this.player.y + (target.y - this.player.y) * f;
		}
		if (this.player.overheated || this.player.heat > 82) out.fire = false;
		out.pulse = targets.length >= 4 && this.pulseTimer <= 0;
		return out;
	}
	snapshot() {
		const clean = (e) => ({
			id: e.id,
			type: e.type,
			kind: e.kind,
			x: e.x,
			y: e.y,
			z: e.z,
			hp: e.hp,
			maxHp: e.maxHp,
			rot: e.rot,
			scale: e.scale,
			age: e.age,
			phase: e.phase || 0,
		});
		return {
			state: this.state,
			sector: this.sector,
			pendingSector: this.pendingSector,
			time: this.time,
			stageTime: this.stageTime,
			warpTime: this.warpTime,
			warpProgress: Math.min(1, this.warpTime / 2.4),
			returnTimer: this.returnTimer,
			player: { ...this.player },
			wingman: {
				...this.wingman,
				hp: this.player.hp,
				shield: this.player.shield,
			},
			entities: [...this.entities.values()].map(clean),
			bullets: [...this.bullets.values()].map((b) => ({
				id: b.id,
				owner: b.owner,
				x: b.x,
				y: b.y,
				z: b.z,
				vx: b.vx,
				vy: b.vy,
				vz: b.vz,
			})),
			sectors: this.sectors,
			completed: [...this.completed],
			rescued: this.rescued,
			kills: this.kills,
			objective: { ...this.objective },
			sectorDone: this.sectorDone,
			bossUnlocked: this.bossUnlocked(),
			lastMessage: this.lastMessage,
			stats: { ...this.stats, sectorsVisited: [...this.stats.sectorsVisited] },
		};
	}
	dispose() {
		this._clearSpace();
		this.queue.free();
		this.world.free();
		this.world = null;
	}
}
