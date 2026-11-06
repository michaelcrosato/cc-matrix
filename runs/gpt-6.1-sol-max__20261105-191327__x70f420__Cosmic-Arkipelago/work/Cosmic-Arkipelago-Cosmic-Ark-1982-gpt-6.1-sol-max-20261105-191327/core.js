export const WORLDS = [
	{
		name: "Mossbell",
		subtitle: "THE GARDEN MOON",
		color: "#8fe3bb",
		land: "#407e73",
		rock: "#29474e",
		sky: "#101c35",
		species: "Pom-poms",
		note: "Two tiny hearts. One very big universe.",
		wind: 0,
		laser: 4.8,
		time: 70,
	},
	{
		name: "Glasswake",
		subtitle: "THE SINGING REEF",
		color: "#90c9ee",
		land: "#6b87b7",
		rock: "#343d68",
		sky: "#171a38",
		species: "Lunafins",
		note: "The wind is up. Keep your beam steady!",
		wind: 1.5,
		laser: 4.0,
		time: 65,
	},
	{
		name: "Embermere",
		subtitle: "THE LAST LITTLE WORLD",
		color: "#ffb57e",
		land: "#b66566",
		rock: "#654157",
		sky: "#281b36",
		species: "Cinderkits",
		note: "The old defenses still remember their orders.",
		wind: 0.7,
		laser: 3.4,
		time: 60,
	},
];
export const DEFAULTS = Object.freeze({
	shipSpeed: 7.5,
	meteorSpeed: 3.3,
	spawnSeconds: 1.02,
	beamSeconds: 1.35,
	damage: 15,
	drain: 0.35,
	timeScale: 1,
	stormSeconds: 23,
});
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const blankInput = () => ({
	x: 0,
	y: 0,
	aimX: 0,
	aimY: 0,
	fire: false,
	beam: false,
	dash: false,
	pulse: false,
});
export class Expedition {
	constructor(R, onEvent = () => {}) {
		this.R = R;
		this.onEvent = onEvent;
		this.cfg = { ...DEFAULTS };
		this.cheats = { invulnerable: false, autopilot: false, colliders: false };
		this.events = [];
		this.serial = 0;
		this.eventSerial = 0;
		this.started = false;
		this.reset();
	}
	reset() {
		this.disposeWorld();
		this.world = new this.R.World({ x: 0, y: 0, z: 0 });
		this.queue = new this.R.EventQueue(true);
		this.entities = [];
		this.handles = new Map();
		this.time = 0;
		this.worldIndex = 0;
		this.score = 0;
		this.energy = 100;
		this.totalRescued = 0;
		this.destroyed = 0;
		this.damageTaken = 0;
		this.pulses = 0;
		this.retries = 0;
		this.combo = 0;
		this.maxCombo = 0;
		this.comboTime = 0;
		this.phase = "orbit";
		this.phaseTime = 0;
		this.timer = 23;
		this.bank = [false, false];
		this.creatures = [];
		this.lasers = [];
		this.shuttle = {
			x: 0,
			y: 5.6,
			vx: 0,
			vy: 0,
			cargo: [],
			inv: 0,
			dash: 0,
			dashCd: 0,
			beam: false,
			dock: 0,
		};
		this.pulseCd = 0;
		this.fireCd = 0;
		this.spawnClock = 0;
		this.laserClock = 0;
		this.transit = 0;
		this.finished = false;
		this.bossSpawned = false;
		this.bossDefeated = false;
		this.events = [];
		this.makeActors();
	}
	disposeWorld() {
		if (this.queue) this.queue.free();
		if (this.world) this.world.free();
	}
	makeActors() {
		this.ark = this.add("ark", 0, 0, 1.25, { fixed: true, group: 4, mask: 1 });
		this.pilot = this.add("pilot", 0, 5.6, 0.45, {
			kinematic: true,
			group: 8,
			mask: 16,
		});
	}
	emit(type, data = {}) {
		const e = { ...data, type, t: this.time, eventId: ++this.eventSerial };
		this.events.push(e);
		if (this.events.length > 80) this.events.shift();
		this.onEvent(e);
	}
	add(kind, x, y, r, options = {}) {
		const R = this.R;
		let desc = options.fixed
			? R.RigidBodyDesc.fixed()
			: options.kinematic
				? R.RigidBodyDesc.kinematicPositionBased()
				: R.RigidBodyDesc.dynamic();
		desc.setTranslation(x, y, 0);
		if (!options.fixed && !options.kinematic)
			desc
				.setGravityScale(0)
				.lockRotations()
				.enabledTranslations(true, true, false)
				.setCcdEnabled(true);
		const body = this.world.createRigidBody(desc);
		const shape = options.box
			? R.ColliderDesc.cuboid(...options.box)
			: R.ColliderDesc.ball(r);
		shape
			.setSensor(true)
			.setCollisionGroups(((options.group || 1) << 16) | (options.mask || 0))
			.setActiveCollisionTypes(R.ActiveCollisionTypes.ALL)
			.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
		const col = this.world.createCollider(shape, body);
		const e = {
			id: ++this.serial,
			kind,
			x,
			y,
			r,
			body,
			col,
			age: 0,
			alive: true,
			hp: options.hp || 1,
			...options,
		};
		this.entities.push(e);
		this.handles.set(col.handle, e);
		return e;
	}
	remove(e) {
		if (!e || !e.alive) return;
		e.alive = false;
		this.handles.delete(e.col.handle);
		this.world.removeRigidBody(e.body);
	}
	move(e, x, y) {
		e.x = x;
		e.y = y;
		e.body.setTranslation({ x, y, z: 0 }, true);
	}
	clearHazards() {
		for (const e of this.entities)
			if (!["ark", "pilot"].includes(e.kind)) this.remove(e);
		this.entities = this.entities.filter((e) => e.alive);
		this.lasers = [];
	}
	start({ attract = false } = {}) {
		this.reset();
		this.started = true;
		this.attract = attract;
		this.beginOrbit(false);
		this.emit("start");
	}
	beginOrbit(retry = false) {
		this.clearHazards();
		this.phase = "orbit";
		this.phaseTime = 0;
		this.timer = retry ? 12 : this.cfg.stormSeconds + this.worldIndex * 5;
		this.spawnClock = 0.7;
		this.fireCd = 0;
		this.pulseCd = Math.min(this.pulseCd, 3);
		this.bossSpawned = false;
		this.bossDefeated = false;
		this.shuttle.beam = false;
		this.move(this.ark, 0, 0);
		this.emit("phase", { phase: "orbit", world: this.worldIndex, retry });
	}
	beginRescue() {
		this.clearHazards();
		this.phase = "rescue";
		this.phaseTime = 0;
		this.timer = WORLDS[this.worldIndex].time;
		this.laserClock = 2.8;
		this.creatures = [0, 1].map((i) => ({
			id: i,
			x: i === 0 ? -8 : 8,
			y: -5.3,
			baseX: i === 0 ? -8 : 8,
			progress: 0,
			state: this.bank[i] ? "banked" : "ground",
			lift: 0,
			walk: 0,
		}));
		this.shuttle = {
			x: 0,
			y: 5.5,
			vx: 0,
			vy: 0,
			cargo: [],
			inv: 1.5,
			dash: 0,
			dashCd: 0,
			beam: false,
			dock: 0,
		};
		this.move(this.ark, 0, 7.1);
		this.move(this.pilot, 0, 5.5);
		this.emit("phase", { phase: "rescue", world: this.worldIndex });
	}
	beginFinale() {
		this.clearHazards();
		this.phase = "finale";
		this.phaseTime = 0;
		this.timer = 35;
		this.spawnClock = 0.5;
		this.bossSpawned = false;
		this.bossDefeated = false;
		this.move(this.ark, 0, 0);
		this.pulseCd = 0;
		this.emit("phase", { phase: "finale", world: this.worldIndex });
	}
	spawnRock(dir = null, type = null) {
		dir = dir ?? Math.floor(Math.random() * 4);
		type =
			type ||
			(this.worldIndex > 0 && Math.random() < 0.28
				? "waver"
				: Math.random() < 0.12 + this.worldIndex * 0.1
					? "heavy"
					: "rock");
		const dirs = [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			],
			v = dirs[dir],
			distance = dir < 2 ? 19 : 12;
		const boss = type === "sunheart";
		const speed =
			this.cfg.meteorSpeed *
			(1 + this.worldIndex * 0.12) *
			(type === "waver" ? 1.17 : boss ? 0.19 : 1);
		const e = this.add(
			"rock",
			v[0] * distance,
			v[1] * distance,
			boss ? 1.5 : type === "heavy" ? 0.75 : 0.57,
			{
				group: 1,
				mask: 2 | 4,
				type,
				hp: boss ? 14 : type === "heavy" ? 2 : 1,
				dir,
				baseX: v[0],
				baseY: v[1],
				speed,
			},
		);
		e.body.setLinvel({ x: -v[0] * speed, y: -v[1] * speed, z: 0 }, true);
		this.emit("meteor", { id: e.id, meteorType: type });
		return e;
	}
	shoot(x, y) {
		if (this.fireCd > 0 || Math.hypot(x, y) < 0.3 || this.energy < 0.2)
			return false;
		const dir =
			Math.abs(x) > Math.abs(y) ? [Math.sign(x), 0] : [0, Math.sign(y)];
		const e = this.add("shot", dir[0] * 1.8, dir[1] * 1.3, 0.24, {
			group: 2,
			mask: 1,
			vx: dir[0] * 30,
			vy: dir[1] * 30,
		});
		e.body.setLinvel({ x: e.vx, y: e.vy, z: 0 }, true);
		this.fireCd = 0.17;
		this.energy -= 0.13;
		this.emit("shot", { x: dir[0], y: dir[1] });
		return true;
	}
	killRock(e, points = true) {
		if (!e.alive) return;
		this.remove(e);
		this.destroyed++;
		if (e.type === "sunheart") {
			this.bossDefeated = true;
			this.score += 1500;
			this.emit("boss-down");
		}
		if (points) {
			this.combo++;
			this.comboTime = 2.8;
			this.maxCombo = Math.max(this.maxCombo, this.combo);
			this.score +=
				(e.type === "waver" ? 75 : e.type === "heavy" ? 60 : 25) *
				Math.min(5, 1 + Math.floor(this.combo / 5));
			this.energy = clamp(this.energy + 0.8, 0, 100);
		}
		this.emit("burst", {
			x: e.x,
			y: e.y,
			color: e.type === "waver" ? "mint" : "coral",
			size: e.r,
		});
	}
	pulse() {
		if (this.pulseCd > 0) return false;
		this.pulseCd = 10;
		this.pulses++;
		this.shuttle.inv = 1.2;
		for (const e of [...this.entities])
			if (e.kind === "rock" && e.alive && Math.hypot(e.x, e.y) < 14) {
				e.hp -= 5;
				if (e.hp <= 0) this.killRock(e);
			}
		if (this.phase === "rescue")
			for (const e of [...this.entities])
				if (e.kind === "laser") this.remove(e);
		this.emit("pulse", { x: 0, y: this.phase === "rescue" ? 7.1 : 0 });
		return true;
	}
	hurt(amount, target = "ark") {
		if (this.attract || this.cheats.invulnerable || this.shuttle.inv > 0)
			return;
		this.energy -= amount;
		this.damageTaken += amount;
		this.combo = 0;
		this.shuttle.inv = target === "pilot" ? 1.6 : 0.65;
		if (target === "pilot") {
			if (this.shuttle.cargo.length) {
				const id = this.shuttle.cargo.pop(),
					c = this.creatures[id];
				c.state = "ground";
				c.progress = 0;
				c.lift = 0;
				c.x = c.baseX;
				this.emit("lost", { id });
			}
			this.shuttle.x = 0;
			this.shuttle.y = 4.8;
			this.move(this.pilot, 0, 4.8);
		}
		this.emit("hit", { target, amount });
	}
	spawnLaser(side = 0) {
		const y = -3.7 + Math.sin(this.time * 0.7 + side * 2.4) * 2.3;
		this.lasers.push({
			id: ++this.serial,
			y,
			age: 0,
			side,
			active: false,
			bodyId: null,
		});
		this.emit("warning", { y });
	}
	dock() {
		const s = this.shuttle;
		if (!s.cargo.length) return;
		for (const id of s.cargo) {
			this.bank[id] = true;
			this.creatures[id].state = "banked";
			this.totalRescued++;
			this.score += 700;
			this.energy = clamp(this.energy + 18, 0, 100);
			this.emit("delivered", { id, world: this.worldIndex });
		}
		s.cargo = [];
		if (this.bank.every(Boolean)) {
			this.energy = clamp(this.energy + 18, 0, 100);
			this.score += 1000 + Math.round(this.timer) * 8;
			this.phase = "transit";
			this.transit = 0;
			this.emit("world-clear", { world: this.worldIndex });
		} else this.emit("partial-dock");
	}
	tick(dt, input = blankInput()) {
		if (!this.started || this.finished) return;
		dt *= this.cfg.timeScale;
		dt = Math.min(dt, 0.12);
		this.time += dt;
		this.phaseTime += dt;
		this.fireCd = Math.max(0, this.fireCd - dt);
		this.pulseCd = Math.max(0, this.pulseCd - dt);
		this.shuttle.inv = Math.max(0, this.shuttle.inv - dt);
		this.shuttle.dashCd = Math.max(0, this.shuttle.dashCd - dt);
		this.shuttle.dash = Math.max(0, this.shuttle.dash - dt);
		this.comboTime -= dt;
		if (this.comboTime < 0) this.combo = 0;
		if (this.attract || this.cheats.autopilot) input = this.botInput();
		if (this.attract) this.energy = 100;
		if (this.phase === "transit") {
			this.transit += dt;
			if (this.transit > (this.attract ? 2 : 4)) {
				if (this.worldIndex === 2) this.beginFinale();
				else {
					this.worldIndex++;
					this.bank = [false, false];
					this.beginOrbit();
				}
			}
			return;
		}
		this.timer -= dt;
		this.energy -= dt * this.cfg.drain;
		if (input.pulse) this.pulse();
		if (this.phase === "orbit" || this.phase === "finale") {
			this.shoot(input.aimX || input.x, input.aimY || input.y);
			this.spawnClock -= dt;
			if (this.spawnClock <= 0) {
				this.spawnClock =
					this.cfg.spawnSeconds /
					(this.phase === "finale" ? 1.55 : 1 + this.worldIndex * 0.2);
				this.spawnRock();
			}
			if (this.phase === "finale" && this.phaseTime > 6 && !this.bossSpawned) {
				this.bossSpawned = true;
				this.spawnRock(2, "sunheart");
				this.emit("boss");
			}
			if (this.timer <= 0) {
				if (this.phase === "orbit") this.beginRescue();
				else if (
					this.bossDefeated ||
					!this.entities.some((e) => e.alive && e.type === "sunheart")
				)
					this.finish(true);
				else this.timer = 0;
			}
		} else if (this.phase === "rescue") this.tickRescue(dt, input);
		const snapshot = [...this.entities];
		for (const e of snapshot) {
			if (!e.alive) continue;
			e.age += dt;
			if (e.kind === "rock" && e.type === "waver") {
				const bend = Math.cos(e.age * 4.5) * 2.6;
				e.body.setLinvel(
					{
						x: -e.baseX * e.speed + (e.baseY ? bend : 0),
						y: -e.baseY * e.speed + (e.baseX ? bend : 0),
						z: 0,
					},
					true,
				);
			}
			if (e.kind === "shot" && e.age > 1.6) this.remove(e);
		}
		this.world.timestep = dt;
		this.world.step(this.queue);
		for (const e of this.entities) {
			if (!e.alive) continue;
			const p = e.body.translation();
			e.x = p.x;
			e.y = p.y;
		}
		const collisions = [];
		this.queue.drainCollisionEvents((a, b, start) => {
			if (start) collisions.push([this.handles.get(a), this.handles.get(b)]);
		});
		for (let [a, b] of collisions) {
			if (!a?.alive || !b?.alive) continue;
			if (a.kind === "rock" && b.kind === "shot") [a, b] = [b, a];
			if (a.kind === "shot" && b.kind === "rock") {
				this.remove(a);
				b.hp--;
				if (b.hp <= 0) this.killRock(b);
				else this.emit("spark", { x: b.x, y: b.y });
			} else {
				if (b.kind === "rock") [a, b] = [b, a];
				if (a.kind === "rock" && b.kind === "ark") {
					if (a.type === "sunheart") {
						const hp = a.hp;
						this.hurt(this.cfg.damage * 2);
						this.remove(a);
						this.emit("burst", { x: 0, y: 0, color: "coral", size: 1.5 });
						const returning = this.spawnRock(2, "sunheart");
						returning.hp = hp;
						this.emit("boss-impact");
					} else {
						this.hurt(this.cfg.damage);
						this.killRock(a, false);
					}
				} else {
					if (b.kind === "laser") [a, b] = [b, a];
					if (
						a.kind === "laser" &&
						b.kind === "pilot" &&
						this.phase === "rescue" &&
						this.shuttle.dash <= 0
					)
						this.hurt(this.cfg.damage * 0.8, "pilot");
				}
			}
		}
		this.entities = this.entities.filter((e) => e.alive);
		if (this.energy <= 0) this.finish(false);
		this.energy = clamp(this.energy, 0, 100);
	}
	tickRescue(dt, input) {
		const s = this.shuttle,
			w = WORLDS[this.worldIndex];
		if (
			input.dash &&
			s.dashCd <= 0 &&
			Math.abs(input.x) + Math.abs(input.y) > 0.1
		) {
			s.dash = 0.28;
			s.dashCd = 2.8;
			s.inv = 0.35;
			this.emit("dash");
		}
		let speed =
			this.cfg.shipSpeed * (s.dash > 0 ? 2.6 : 1) * (s.beam ? 0.63 : 1);
		const n = Math.max(1, Math.hypot(input.x, input.y));
		s.vx =
			(input.x / n) * speed +
			(this.worldIndex === 1 ? Math.sin(this.time * 0.65) * w.wind : 0);
		s.vy = (input.y / n) * speed;
		s.x = clamp(s.x + s.vx * dt, -14.8, 14.8);
		s.y = clamp(s.y + s.vy * dt, -4.2, 5.9);
		this.pilot.body.setNextKinematicTranslation({ x: s.x, y: s.y, z: 0 });
		s.beam = !!input.beam && s.y < 0.5;
		for (const c of this.creatures) {
			if (c.state === "ground") {
				c.walk += dt;
				c.x = c.baseX + Math.sin(this.time * 0.9 + c.id * 3) * 1.15;
				const aligned = Math.abs(s.x - c.x) < 1.45 && s.y > -4.3 && s.y < 0.5;
				const active = s.beam && aligned && s.cargo.length < 2;
				if (active) c.progress += dt / this.cfg.beamSeconds;
				else c.progress = Math.max(0, c.progress - dt * 0.55);
				c.lift = c.progress;
				if (c.progress >= 1) {
					c.state = "cargo";
					s.cargo.push(c.id);
					this.score += 100;
					this.emit("captured", { id: c.id, world: this.worldIndex });
				}
			}
		}
		if (s.cargo.length && Math.abs(s.x) < 2.2 && s.y > 5.1) {
			s.dock += dt;
			if (s.dock > 0.35) this.dock();
		} else s.dock = 0;
		this.laserClock -= dt;
		if (this.laserClock <= 0) {
			this.laserClock = w.laser;
			this.spawnLaser(0);
			if (this.worldIndex === 2) this.spawnLaser(1);
		}
		for (const l of this.lasers) {
			l.age += dt;
			if (l.age >= 1.2 && !l.active) {
				l.active = true;
				const e = this.add("laser", 0, l.y, 0, {
					fixed: true,
					group: 16,
					mask: 8,
					box: [16, 0.1, 0.4],
				});
				l.bodyId = e.id;
				this.emit("laser");
			}
			if (l.age > 1.68) {
				this.remove(this.entities.find((e) => e.id === l.bodyId));
			}
		}
		this.lasers = this.lasers.filter((l) => l.age < 1.75);
		if (this.timer <= 0 && this.phase === "rescue") {
			for (const id of s.cargo) {
				this.creatures[id].state = "ground";
			}
			s.cargo = [];
			this.energy -= 14;
			this.retries++;
			this.emit("recall");
			this.beginOrbit(true);
		}
	}
	finish(won) {
		if (this.finished) return;
		this.finished = true;
		this.phase = won ? "victory" : "defeat";
		this.emit(this.phase, { score: Math.round(this.score) });
	}
	botInput() {
		const i = blankInput();
		if (this.phase === "orbit" || this.phase === "finale") {
			const rocks = this.entities
				.filter((e) => e.kind === "rock" && e.alive)
				.sort(
					(a, b) =>
						Math.hypot(a.x, a.y) / a.speed - Math.hypot(b.x, b.y) / b.speed,
				);
			if (rocks[0]) {
				i.aimX = rocks[0].x;
				i.aimY = rocks[0].y;
			}
			i.pulse = rocks.filter((e) => Math.hypot(e.x, e.y) < 6).length > 1;
		}
		if (this.phase === "rescue") {
			const s = this.shuttle,
				c = this.creatures.find((c) => c.state === "ground");
			let tx, ty;
			if (s.cargo.length === 2 || !c) {
				tx = 0;
				ty = 5.7;
			} else {
				tx = c.x;
				ty = -2.5;
				i.beam = Math.abs(s.x - tx) < 1.4 && s.y < 0.4;
			}
			i.x = clamp((tx - s.x) * 2, -1, 1);
			i.y = clamp((ty - s.y) * 2, -1, 1);
			const danger = this.lasers.find(
				(l) => l.age > 0.8 && l.age < 1.7 && Math.abs(l.y - s.y) < 0.7,
			);
			if (danger) i.dash = true;
		}
		return i;
	}
	snapshot() {
		return {
			phase: this.phase,
			phaseTime: this.phaseTime,
			worldIndex: this.worldIndex,
			time: this.time,
			timer: this.timer,
			score: this.score,
			energy: this.energy,
			totalRescued: this.totalRescued,
			destroyed: this.destroyed,
			damageTaken: this.damageTaken,
			pulseCd: this.pulseCd,
			combo: this.combo,
			maxCombo: this.maxCombo,
			finished: this.finished,
			bank: this.bank,
			creatures: this.creatures,
			lasers: this.lasers.map(({ id, y, age, active }) => ({
				id,
				y,
				age,
				active,
			})),
			shuttle: { ...this.shuttle },
			entities: this.entities
				.filter((e) => e.kind === "rock" || e.kind === "shot")
				.map(({ id, kind, x, y, r, type, hp, age, dir }) => ({
					id,
					kind,
					x,
					y,
					r,
					type,
					hp,
					age,
					dir,
				})),
			bossDefeated: this.bossDefeated,
			bossSpawned: this.bossSpawned,
		};
	}
}
