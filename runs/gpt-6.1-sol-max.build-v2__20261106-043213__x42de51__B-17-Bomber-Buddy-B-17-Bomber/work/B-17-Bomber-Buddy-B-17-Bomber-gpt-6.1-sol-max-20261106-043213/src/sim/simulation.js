import {
	U,
	HOME,
	OPERATION,
	LOADOUTS,
	DIFFICULTIES,
	STATIONS,
	DEFAULT_BALANCE,
} from "../../content/operation.js";
import {
	clamp,
	mix,
	wrap,
	dist,
	approach,
	random,
	local,
	segmentHit,
} from "../core/math.js";

export class Simulation {
	constructor(options = {}) {
		this.operation = structuredClone(options.operation || OPERATION);
		this.seed = options.seed ?? 1701;
		this.rng = random(this.seed);
		this.balance = { ...DEFAULT_BALANCE, ...options.balance };
		this.difficulty = clamp(options.difficulty ?? 1, 0, 2);
		this.loadout = clamp(options.loadout ?? 1, 0, 2);
		this.profile = DIFFICULTIES[this.difficulty];
		this.time = 0;
		this.tick = 0;
		this.phase = "launch";
		this.phaseTime = 0;
		this.practice = options.practice || null;
		this.attract = !!options.attract;
		this.cheats = {
			invulnerable: this.attract,
			infinite: this.attract,
			freeCamera: false,
			debug: false,
		};
		this.cheated = !!this.practice || this.attract;
		this.ended = false;
		this.result = null;
		this.id = 0;
		this.eventId = 0;
		this.events = [];
		this.history = [];
		this.commandIds = {};
		this.aircraft = {
			...HOME,
			z: HOME.z + 3 * U,
			heading: 0,
			bank: 0,
			pitch: 0,
			speed: 0,
			vx: 0,
			vy: 0,
			vz: 0,
			throttle: 0.36,
			fuel: LOADOUTS[this.loadout].fuel,
			hull: 100,
			engines: [1, 1, 1, 1],
			fire: -1,
			fireTime: 0,
			extinguisher: 1,
			bombs: LOADOUTS[this.loadout].bombs,
			initialBombs: LOADOUTS[this.loadout].bombs,
			doors: 0,
			doorsOpen: false,
			sight: 1,
			hold: true,
			nav: true,
			holdHeading: 0,
			holdAltitude: this.operation.cruiseAltitude,
			airborne: false,
			gear: 1,
			stall: false,
			hurt: 0,
			salvo: 3,
			bombCooldown: 0,
			jettisonHold: 0,
		};
		this.guns = Object.fromEntries(
			STATIONS.filter((s) => s.arc).map((s) => [
				s.id,
				{ ammo: 480, jammed: false, cool: 0, recoil: 0 },
			]),
		);
		this.players = (options.players || [0]).map((id, i) => ({
			id,
			station: i ? "tail" : "pilot",
			aimYaw: 0,
			aimPitch: 0,
			aims: {},
			input: {},
			transition: 0,
			pending: null,
			lastInput: 0,
		}));
		this.owners = Object.fromEntries(STATIONS.map((s) => [s.id, null]));
		for (const p of this.players) this.owners[p.station] = p.id;
		this.commander = this.players[0]?.id ?? null;
		this.requests = [];
		this.routeName = options.route || "direct";
		this.route = [];
		this.waypoint = 0;
		this.returning = false;
		this.selectRoute(this.routeName, false);
		this.targets = this.operation.targets.map((t) => ({
			...t,
			parts: t.parts.map((p) => ({
				...p,
				x: t.x + p.dx,
				y: t.y + p.dy,
				z: 8 * U,
				maxHp: p.hp,
				dead: false,
			})),
		}));
		this.enemies = [];
		this.shots = [];
		this.bombs = [];
		this.flak = [];
		this.effects = [];
		this.releaseQueue = [];
		this.waves = [];
		this.flakClock = 8;
		this.recoveryTime = 0;
		this.warningTimes = {};
		this.stats = {
			kills: 0,
			hits: 0,
			fired: 0,
			released: 0,
			accurate: 0,
			targets: 0,
			flakEvaded: 0,
			returned: false,
			damage: 0,
			jettisoned: 0,
			defense: 0,
		};
		this.score = 0;
		this.radio = {
			role: "PILOT",
			text: "Larkspur cleared us. Bring the power up; we’ll help with the climb.",
			until: 9,
			priority: 0,
			id: 0,
		};
		if (this.practice) this.setupPractice(this.practice);
	}
	emit(type, data = {}) {
		const e = { id: ++this.eventId, type, time: this.time, ...data };
		this.events.push(e);
		this.history.push(e);
		if (this.events.length > 100) this.events.shift();
		if (this.history.length > 1200) this.history.shift();
		return e;
	}
	say(role, text, priority = 0, key = text, gap = 12) {
		if ((this.warningTimes[key] ?? -100) + gap > this.time) return;
		if (this.radio.until > this.time && this.radio.priority > priority) return;
		this.warningTimes[key] = this.time;
		this.radio = {
			role,
			text,
			priority,
			until: this.time + (priority > 1 ? 6 : 5),
			id: this.eventId + 1,
		};
		this.emit("radio", this.radio);
	}
	player(id) {
		return this.players.find((p) => p.id === id);
	}
	command(id, type, data = {}, actionId) {
		if (this.ended) return false;
		const p = this.player(id);
		if (!p) return false;
		if (actionId != null) {
			const last = this.commandIds[id] ?? -1;
			if (!Number.isSafeInteger(actionId) || actionId <= last) return false;
			this.commandIds[id] = actionId;
		}
		p.lastInput = this.time;
		if (type === "input") {
			const finite = (x, lo, hi) => (Number.isFinite(x) ? clamp(x, lo, hi) : 0);
			p.input = {
				bank: finite(data.bank, -1, 1),
				pitch: finite(data.pitch, -1, 1),
				throttle: finite(data.throttle, -1, 1),
				fire: !!data.fire,
				fine: !!data.fine,
				jettison: !!data.jettison,
			};
			if (Number.isFinite(data.aimYaw)) p.aimYaw = data.aimYaw;
			if (Number.isFinite(data.aimPitch)) p.aimPitch = data.aimPitch;
			this.clampAim(p);
			return true;
		}
		if (type === "station") return this.claim(p, data.station);
		if (type === "cancelStation") {
			p.pending = null;
			p.transition = 0;
			return true;
		}
		if (type === "accept") {
			const r = this.requests.find((r) => r.to === id);
			if (!r) return false;
			const other = this.player(r.from);
			if (!other) return false;
			const previousSeat = other.station;
			this.owners[r.station] = null;
			this.owners[p.station] = null;
			this.owners[previousSeat] = null;
			p.station = this.freeStation(previousSeat);
			this.owners[p.station] = p.id;
			other.station = r.station;
			other.transition = 0;
			this.owners[r.station] = other.id;
			if (r.station === "pilot") this.commander = other.id;
			this.requests = this.requests.filter((q) => q !== r);
			this.emit("ownership");
			return true;
		}
		if (type === "route" && id === this.commander) {
			this.selectRoute(data.route, true, data.point);
			return true;
		}
		if (type === "hold" && id === this.commander) {
			const a = this.aircraft;
			a.hold = !a.hold;
			a.nav = false;
			a.holdHeading = a.heading;
			a.holdAltitude = Math.max(120 * U, a.z);
			this.say(
				"PILOT",
				a.hold
					? "Course and height held. Your aircraft when you move the stick."
					: "You have the aircraft.",
				1,
				"hold" + a.hold,
				0,
			);
			return true;
		}
		if (type === "doors" && this.owners.bombs === id) {
			this.aircraft.doorsOpen = !this.aircraft.doorsOpen;
			this.emit("doors");
			return true;
		}
		if (type === "salvo" && this.owners.bombs === id) {
			const a = this.aircraft;
			a.salvo = [1, 3, 5][([1, 3, 5].indexOf(a.salvo) + 1) % 3];
			return true;
		}
		if (type === "release" && this.owners.bombs === id && p.transition === 0)
			return this.release(p);
		if (type === "extinguish" && id === this.commander) {
			const a = this.aircraft;
			if (a.fire < 0) {
				this.say(
					"ENGINEER",
					"All four fires are out. Save the bottle.",
					1,
					"no-fire",
				);
				return false;
			}
			if (!a.extinguisher) {
				this.say(
					"ENGINEER",
					"Bottle empty. Jettison and head for Larkspur.",
					3,
					"empty",
				);
				return false;
			}
			a.extinguisher--;
			const i = a.fire;
			a.fire = -1;
			a.fireTime = 0;
			a.engines[i] = Math.max(0.35, a.engines[i]);
			this.emit("extinguish", { engine: i });
			this.say(
				"ENGINEER",
				"Fire out. That engine owes us a quiet flight home.",
				2,
				"out",
				0,
			);
			return true;
		}
		return false;
	}
	freeStation(prefer = "nose") {
		return this.owners[prefer] == null
			? prefer
			: STATIONS.find((s) => this.owners[s.id] == null)?.id || "pilot";
	}
	clampAim(p) {
		const s = STATIONS.find((s) => s.id === p.station);
		p.aimYaw = clamp(wrap(p.aimYaw || 0), -(s.arc || 0.6), s.arc || 0.6);
		p.aimPitch = clamp(
			p.aimPitch || 0,
			p.station === "bombs" ? -0.28 : -0.65,
			p.station === "bombs" ? 0.28 : 0.75,
		);
	}
	claim(p, station) {
		if (!STATIONS.some((s) => s.id === station)) return false;
		if (station === p.station) return true;
		if (station === p.pending) return true;
		const owner = this.owners[station];
		if (owner != null && owner !== p.id) {
			if (!this.requests.some((r) => r.from === p.id && r.station === station))
				this.requests.push({ from: p.id, to: owner, station });
			this.say(
				"CREW",
				`Station occupied. Handover requested from crew ${owner + 1}.`,
				1,
				"occupied",
				2,
			);
			return false;
		}
		p.pending = station;
		p.transition = 0.3;
		p.input.fire = false;
		if (p.station === "pilot") {
			const a = this.aircraft;
			a.hold = true;
			if (!a.nav) {
				a.holdHeading = a.heading;
				a.holdAltitude = Math.max(120 * U, a.z);
			}
			if (a.speed < 40 * U && a.airborne)
				this.say(
					"PILOT",
					"Handover slow! Add power before leaving the controls.",
					3,
					"unsafe",
				);
		}
		return true;
	}
	removePlayer(id) {
		const p = this.player(id);
		if (!p) return;
		for (const k in this.owners)
			if (this.owners[k] === id) this.owners[k] = null;
		this.players = this.players.filter((p) => p.id !== id);
		this.requests = this.requests.filter((r) => r.from !== id && r.to !== id);
		if (this.commander === id) this.commander = this.players[0]?.id ?? null;
		this.aircraft.hold = true;
		this.aircraft.holdHeading = this.aircraft.heading;
		this.emit("departure", { player: id });
	}
	selectRoute(name, announce = true, point) {
		const a = this.aircraft;
		if (name === "home") {
			this.route = [
				{ x: HOME.x + 1200 * U, y: HOME.y },
				{ x: HOME.x, y: HOME.y },
			];
			this.returning = true;
			this.routeName = "home";
		} else if (
			name === "point" &&
			Array.isArray(point) &&
			point.length === 2 &&
			point.every(Number.isFinite)
		) {
			this.route = [
				{ x: clamp(point[0], 0, 28000 * U), y: clamp(point[1], 0, 24000 * U) },
			];
			this.routeName = "point";
		} else if (name === "refinery" || name === "battery" || name === "harbor") {
			const t = this.operation.targets.find((t) => t.id === name);
			this.route = [{ x: t.x, y: t.y }];
			this.routeName = name;
			this.returning = false;
		} else {
			name = name in this.operation.routes ? name : "direct";
			this.route = this.operation.routes[name].points.map(([x, y]) => ({
				x,
				y,
			}));
			this.routeName = name;
			this.returning = false;
		}
		this.waypoint = 0;
		a.hold = true;
		a.nav = true;
		a.holdAltitude = this.operation.cruiseAltitude;
		if (announce) {
			this.emit("route", { route: name });
			this.say(
				"NAVIGATOR",
				name === "home"
					? "Homeward course committed. Tea is still a possibility."
					: "New course committed. We’re turning for the waypoint.",
				1,
				"route",
				0,
			);
		}
	}
	routeTarget() {
		return this.route[Math.min(this.waypoint, this.route.length - 1)] || HOME;
	}
	reserve(route = "home") {
		const a = this.aircraft,
			t =
				route === "home"
					? HOME
					: this.operation.targets.find((t) => t.id === route) || HOME;
		const length = dist(a, t) + (route === "home" ? 0 : dist(t, HOME));
		const secs = length / Math.max(42 * U, a.speed || 68 * U) + 65;
		return a.fuel - secs * this.burnRate();
	}
	burnRate() {
		const a = this.aircraft,
			health = a.engines.reduce((s, v) => s + v, 0) / 4;
		return (
			(0.033 + a.throttle * 0.048 + (1 - health) * 0.025) *
			this.profile.fuel *
			this.balance.fuelBurn
		);
	}
	primaryComplete() {
		return this.targets[0].parts.filter((p) => p.dead).length >= 2;
	}
	primaryProgress() {
		return this.targets[0].parts.filter((p) => p.dead).length;
	}
	objective() {
		if (this.ended) return this.result.title;
		if (this.phase === "launch")
			return "Increase power · lift off from Larkspur";
		if (this.phase === "recovery") return "Larkspur approach · crew landing";
		if (this.returning)
			return this.primaryComplete()
				? "Primary complete · bring the crew home"
				: "Returning early · crew comes first";
		if (this.primaryComplete())
			return "Shipyard disabled · select home on the map";
		return "Disable two components at Kestrel Shipyard";
	}
	phaseTo(phase) {
		if (this.phase === phase) return;
		this.phase = phase;
		this.phaseTime = 0;
		this.emit("phase", { phase });
	}
	step(dt) {
		if (this.ended) return;
		dt = clamp(dt, 0, 0.05);
		this.time += dt;
		this.phaseTime += dt;
		this.tick++;
		const a = this.aircraft;
		for (const p of this.players) {
			if (p.transition > 0) {
				p.transition = Math.max(0, p.transition - dt);
				if (p.transition === 0 && p.pending) {
					if (
						this.owners[p.pending] == null ||
						this.owners[p.pending] === p.id
					) {
						p.aims[p.station] = [p.aimYaw, p.aimPitch];
						this.owners[p.station] = null;
						p.station = p.pending;
						this.owners[p.station] = p.id;
						[p.aimYaw, p.aimPitch] = p.aims[p.station] || [0, 0];
						if (p.station === "pilot") this.commander = p.id;
						this.emit("ownership", { station: p.station, player: p.id });
					}
					p.pending = null;
					p.input.fire = false;
				}
			}
			// Continuous controls expire if packets stop; the aircraft passes to course hold.
			if (this.time - p.lastInput > 0.65) {
				p.input = {};
				if (p.station === "pilot") a.hold = true;
			}
			this.clampAim(p);
		}
		this.flight(dt);
		a.hurt = Math.max(0, a.hurt - dt);
		a.bombCooldown = Math.max(0, a.bombCooldown - dt);
		a.doors = approach(a.doors, a.doorsOpen ? 1 : 0, dt * 0.7);
		a.gear = approach(
			a.gear,
			a.airborne && this.phase !== "recovery" ? 0 : 1,
			dt * 0.25,
		);
		const cp = this.player(this.commander);
		a.jettisonHold = cp?.input.jettison
			? Math.min(1.6, a.jettisonHold + dt)
			: 0;
		if (a.jettisonHold >= 1.6 && a.bombs) {
			this.stats.jettisoned += a.bombs;
			a.bombs = 0;
			this.releaseQueue = [];
			a.jettisonHold = 0;
			this.say(
				"ENGINEER",
				"Payload gone. Lighter aircraft; let’s make it count.",
				2,
				"jettison",
				0,
			);
			this.emit("jettison");
		}
		this.encounters(dt);
		this.fighters(dt);
		this.gunnery(dt);
		this.bombing(dt);
		this.barrage(dt);
		this.damageStep(dt);
		for (const fx of this.effects) fx.life -= dt;
		this.effects = this.effects.filter((fx) => fx.life > 0);
		this.mission(dt);
	}
	flight(dt) {
		const a = this.aircraft,
			pilot = this.player(this.owners.pilot),
			input = pilot?.transition ? {} : pilot?.input || {};
		a.throttle = clamp(a.throttle + (input.throttle || 0) * dt * 0.35, 0, 1);
		if (
			this.attract ||
			this.practice === "gunnery" ||
			this.practice === "bombing"
		)
			a.throttle = Math.max(a.throttle, 0.83);
		if (Math.abs(input.bank || 0) + Math.abs(input.pitch || 0) > 0.06) {
			a.hold = false;
			a.nav = false;
		}
		let bank = (input.bank || 0) * 0.57,
			pitch = (input.pitch || 0) * 0.21;
		const health = a.engines.reduce((v, x) => v + x, 0) / 4;
		if (a.hold || !pilot) {
			let desired = a.holdHeading;
			if (a.nav) {
				let q = this.routeTarget();
				if (dist(a, q) < 500 * U && this.waypoint < this.route.length - 1) {
					this.waypoint++;
					q = this.routeTarget();
				}
				desired = Math.atan2(q.y - a.y, q.x - a.x);
			}
			bank = clamp(wrap(desired - a.heading) * 1.7, -0.5, 0.5);
			const achievable = Math.min(
				a.holdAltitude,
				this.operation.cruiseAltitude * Math.max(0.3, health),
			);
			pitch = clamp((achievable - a.z) / (2800 * U), -0.1, health * 0.12);
			if (a.speed < 45 * U) pitch = -0.045;
		}
		if (!a.airborne) {
			bank *= 0.12;
			pitch = 0;
		}
		a.bank = mix(
			a.bank,
			bank,
			Math.min(
				1,
				dt *
					1.5 *
					this.balance.flightResponse *
					(a.hold ? this.balance.holdStrength : 1),
			),
		);
		a.pitch = mix(
			a.pitch,
			pitch,
			Math.min(1, dt * 1.2 * this.balance.flightResponse),
		);
		const weight = a.bombs / 14;
		const targetSpeed =
			(27 +
				a.throttle * 61 * health -
				weight * 4 -
				a.doors * 3 -
				Math.max(0, a.pitch) * 60) *
			U;
		a.speed = approach(
			a.speed,
			a.fuel > 0 ? targetSpeed : 26 * U,
			dt * (a.airborne ? 1.7 : 3.6) * U,
		);
		a.heading = wrap(
			a.heading + ((Math.tan(a.bank) * 9.81) / Math.max(35, a.speed / U)) * dt,
		);
		if (!a.airborne && a.speed > 43 * U && a.throttle > 0.65) {
			a.airborne = true;
			a.pitch = 0.1;
			this.emit("takeoff");
			this.say(
				"PILOT",
				"Wheels clear. Course hold is flying the climb. You have the whole aircraft.",
				1,
				"takeoff",
			);
		}
		a.stall = a.airborne && a.speed < 36 * U;
		let vz = a.airborne ? Math.sin(a.pitch) * a.speed : 0;
		if (a.stall) {
			vz -= (36 * U - a.speed) * 0.6 + 2.5 * U;
			this.say(
				"PILOT",
				"Stall warning! Lower the nose and add power.",
				3,
				"stall",
				7,
			);
		}
		if (a.fuel <= 0) vz = Math.min(vz, -5 * U);
		a.vx = Math.cos(a.heading) * a.speed * Math.cos(a.pitch);
		a.vy = Math.sin(a.heading) * a.speed * Math.cos(a.pitch);
		a.vz = vz;
		if (this.phase !== "recovery") {
			a.x += a.vx * dt;
			a.y += a.vy * dt;
			a.z += a.vz * dt;
		}
		if (!a.airborne) a.z = HOME.z + 3 * U;
		if (!this.cheats.infinite)
			a.fuel = Math.max(0, a.fuel - this.burnRate() * dt);
		if (a.fuel < 24)
			this.say(
				"ENGINEER",
				"Fuel reserve low. Plot Larkspur and keep the power steady.",
				2,
				"fuel",
				35,
			);
		if (a.airborne && a.z < 95 * U && this.phase !== "recovery")
			this.say("PILOT", "Ground close! Raise the nose.", 3, "ground", 5);
		const ground = a.x < 6000 * U || a.x > 15000 * U ? 8 * U : 0;
		if (a.airborne && a.z <= ground + 1 * U && this.phase !== "recovery")
			this.finish(a.fuel <= 0 ? "fuel" : "crash");
		if (a.z > 2000 * U) a.z = 2000 * U;
	}
	spawnWave(bearing = 0, pattern = "head-on", count = 2) {
		if (this.enemies.filter((e) => e.alive).length >= 5) return false;
		for (let i = 0; i < count; i++) {
			const angle = (bearing * Math.PI) / 2,
				range = (1150 + i * 170) * U;
			const p = local(
				this.aircraft,
				Math.cos(angle) * range,
				Math.sin(angle) * range + (i - 0.5) * 70 * U,
				(80 + i * 24) * U,
			);
			this.enemies.push({
				...p,
				id: ++this.id,
				bearing,
				pattern,
				angle,
				age: -i * 1.4,
				state: "approach",
				hp: 3,
				alive: true,
				suppressed: 0,
				heading: this.aircraft.heading + angle + Math.PI,
				bank: 0,
				cool: 0.5,
				r: 18 * U,
			});
		}
		const clock = [12, 3, 6, 9][bearing];
		this.say(
			"GUNNER",
			`Fighters, ${clock} o’clock! Take the ${["nose", "starboard", "tail", "port"][bearing]} gun.`,
			2,
			"wave" + this.id,
			0,
		);
		this.emit("wave", { bearing, pattern });
		return true;
	}
	encounters(dt) {
		if (!this.aircraft.airborne || this.practice) return;
		for (const w of this.operation.waves) {
			if (this.waves.includes(w.id)) continue;
			const ready = w.returning
				? this.returning && this.time > 180
				: !this.returning &&
					(this.aircraft.x >= w.minX || this.time > w.maxTime);
			if (
				ready &&
				this.enemies.filter((e) => e.alive).length < 2 &&
				this.spawnWave(w.bearing, w.pattern, w.count)
			)
				this.waves.push(w.id);
		}
		const harbor = this.targets[0];
		if (!this.primaryComplete() && dist(this.aircraft, harbor) < 2900 * U) {
			this.phaseTo("bomb-run");
			this.say(
				"BOMBARDIER",
				"Shipyard in sight. Station 3; open the doors. Release when the diamond crosses a target.",
				2,
				"sight",
				40,
			);
		}
		if (!this.returning && this.primaryComplete())
			this.say(
				"NAVIGATOR",
				"Primary complete. Map to Larkspur, or spend the reserve on Cinder Works.",
				1,
				"primary-home",
				45,
			);
	}
	fighters(dt) {
		const a = this.aircraft;
		for (const e of this.enemies) {
			if (!e.alive) continue;
			e.age += dt;
			if (e.age < 0) continue;
			const before = { x: e.x, y: e.y, z: e.z };
			let range,
				lateral = Math.sin(e.age * 0.4 + e.id) * 55 * U;
			if (e.age < 7) {
				e.state = "approach";
				range = mix(1200, 560, e.age / 7) * U;
			} else if (e.age < 12) {
				e.state = "commit";
				range = mix(560, 300, (e.age - 7) / 5) * U;
			} else if (e.age < 20 && e.suppressed < 2.5) {
				e.state = "firing";
				range = (280 + Math.sin(e.age) * 30) * U;
			} else {
				e.state = "disengage";
				range = (300 + Math.max(0, e.age - 20) * 140) * U;
				lateral += Math.max(0, e.age - 20) * 55 * U;
			}
			if (e.suppressed > 2.5) {
				e.state = "disengage";
				range += e.suppressed * 80 * U;
				e.age = Math.max(20, e.age);
			}
			if (e.pattern === "crossing") lateral += Math.sin(e.age * 0.12) * 180 * U;
			const p = local(
				a,
				Math.cos(e.angle) * range - Math.sin(e.angle) * lateral,
				Math.sin(e.angle) * range + Math.cos(e.angle) * lateral,
				(65 + Math.sin(e.age * 0.65 + e.id) * 24) * U,
			);
			Object.assign(e, p);
			e.vx = (e.x - before.x) / dt;
			e.vy = (e.y - before.y) / dt;
			e.vz = (e.z - before.z) / dt;
			const toward = Math.atan2(a.y - e.y, a.x - e.x);
			e.heading = toward + (e.state === "disengage" ? Math.PI * 0.72 : 0);
			e.bank = Math.sin(e.age * 0.6) * 0.4;
			e.cool -= dt;
			if (e.state === "firing" && e.cool <= 0) {
				e.cool = 0.7;
				const evade = Math.abs(a.bank) * 1.6 + Math.abs(a.pitch) * 3;
				const chance =
					(0.48 *
						this.profile.accuracy *
						this.balance.enemyAccuracy *
						Math.max(0.12, 1 - evade)) /
					(1 + e.suppressed);
				this.emit("enemy-shot", { enemy: e.id, x: e.x, y: e.y, z: e.z });
				if (this.rng() < chance) this.hurt(2.8, "fighter");
			}
			if (e.age > 30) {
				e.alive = false;
				e.escaped = true;
				this.emit("disengage", { enemy: e.id });
			}
		}
		this.enemies = this.enemies.filter(
			(e) => e.alive || (e.age > -1 && e.age < 31 && !e.escaped),
		);
	}
	gunDirection(p) {
		const station = STATIONS.find((s) => s.id === p.station),
			a = this.aircraft;
		const f = Math.cos(station.angle + p.aimYaw) * Math.cos(p.aimPitch),
			r = Math.sin(station.angle + p.aimYaw) * Math.cos(p.aimPitch),
			u = Math.sin(p.aimPitch);
		const origin = local(a, ...station.offset.map((v) => v * U));
		const end = local({ ...a, x: 0, y: 0, z: 0 }, f, r, u);
		return { origin, direction: end };
	}
	gunnery(dt) {
		const a = this.aircraft;
		for (const [id, gun] of Object.entries(this.guns)) {
			gun.cool -= dt;
			gun.recoil = Math.max(0, gun.recoil - dt * 10);
			const p = this.player(this.owners[id]);
			if (
				p?.input.fire &&
				!p.transition &&
				gun.cool <= 0 &&
				gun.ammo > 0 &&
				!gun.jammed
			) {
				gun.cool = 0.105;
				gun.recoil = 1;
				if (!this.cheats.infinite) gun.ammo--;
				this.stats.fired++;
				const { origin, direction } = this.gunDirection(p);
				const shot = {
					...origin,
					vx: direction.x * 860 * U + a.vx,
					vy: direction.y * 860 * U + a.vy,
					vz: direction.z * 860 * U + a.vz,
					life: 1.8,
					player: p.id,
					hit: false,
				};
				this.shots.push(shot);
				this.emit("gun", { station: id, player: p.id });
				for (const e of this.enemies)
					if (e.alive) {
						const to = {
								x: e.x - origin.x,
								y: e.y - origin.y,
								z: e.z - origin.z,
							},
							d = Math.hypot(to.x, to.y, to.z);
						const dot =
							(to.x * direction.x + to.y * direction.y + to.z * direction.z) /
							d;
						if (dot > 0.986) e.suppressed += 0.065;
					}
			}
			if (p?.input.fire && gun.ammo <= 0)
				this.say(
					"GUNNER",
					"That mount is empty. Another gun, or evade from the pilot seat.",
					2,
					"empty-" + id,
					12,
				);
			if (p?.input.fire && gun.jammed)
				this.say(
					"GUNNER",
					"Mount jammed. Use another bearing or bank away.",
					2,
					"jam-" + id,
					12,
				);
			// Unclaimed crew suppress, but cannot finish fighters for the player.
			if (!p && gun.ammo > 0 && !gun.jammed && gun.cool <= 0) {
				const bearing = ["nose", "starboard", "tail", "port"].indexOf(id);
				const e = this.enemies.find(
					(e) => e.alive && e.bearing === bearing && e.age > 7 && e.age < 20,
				);
				if (e) {
					gun.cool = 1.3;
					if (!this.cheats.infinite) gun.ammo--;
					e.suppressed += 0.035;
				}
			}
		}
		for (const s of this.shots) {
			const prev = { ...s };
			s.x += s.vx * dt;
			s.y += s.vy * dt;
			s.z += s.vz * dt;
			s.life -= dt;
			for (const e of this.enemies) {
				if (!e.alive || e.age < 0) continue;
				const distance = Math.hypot(e.x - a.x, e.y - a.y, e.z - a.z);
				const aid = this.profile.aim * this.balance.aimHelp * distance;
				if (segmentHit(prev, s, e, e.r + aid)) {
					s.hit = true;
					s.life = 0;
					e.hp--;
					e.suppressed += 0.18;
					this.stats.hits++;
					this.stats.defense++;
					this.emit("hit", { x: e.x, y: e.y, z: e.z });
					if (e.hp <= 0) {
						e.alive = false;
						e.escaped = true;
						this.stats.kills++;
						this.score += 250;
						this.effect("explosion", e, 4, 24 * U);
						this.emit("kill", { enemy: e.id });
						this.say("GUNNER", "One less appointment with us.", 0, "kill", 10);
					}
					break;
				}
			}
		}
		this.shots = this.shots.filter((s) => s.life > 0);
	}
	release(p) {
		const a = this.aircraft;
		if (a.doors < 0.9) {
			this.say(
				"BOMBARDIER",
				"Doors first. B to open; wait for the green lamp.",
				2,
				"doors",
				3,
			);
			return false;
		}
		if (!a.bombs) {
			this.say(
				"BOMBARDIER",
				"Racks empty. Another day for the rest.",
				1,
				"no-bombs",
				10,
			);
			return false;
		}
		if (a.bombCooldown > 0) return false;
		const count = Math.min(a.bombs, a.salvo);
		if (!this.cheats.infinite) a.bombs -= count;
		for (let i = 0; i < count; i++)
			this.releaseQueue.push({ at: this.time + i * 0.2, player: p.id });
		a.bombCooldown = count * 0.2 + 0.6;
		this.stats.released += count;
		this.emit("release", { count, player: p.id });
		this.say(
			"BOMBARDIER",
			`${count === 1 ? "Parcel" : "Parcels"} away. Keep her steady.`,
			1,
			"release",
			0,
		);
		return true;
	}
	createBomb() {
		const a = this.aircraft;
		return {
			...local(a, 0, 0, -2 * U),
			vx: a.vx,
			vy: a.vy,
			vz: a.vz,
			id: ++this.id,
			age: 0,
			alive: true,
		};
	}
	integrateBomb(b, dt) {
		const wind = this.operation.wind,
			drift = this.balance.bombDrift;
		b.vx += wind[0] * drift * dt * 0.08;
		b.vy += wind[1] * drift * dt * 0.08;
		b.vz -= 9.81 * U * dt;
		b.x += b.vx * dt;
		b.y += b.vy * dt;
		b.z += b.vz * dt;
		b.age += dt;
	}
	predict() {
		const a = this.aircraft,
			b = { ...local(a, 0, 0, -2 * U), vx: a.vx, vy: a.vy, vz: a.vz, age: 0 };
		while (b.z > 0 && b.age < 60) this.integrateBomb(b, 1 / 120);
		return b;
	}
	bombing(dt) {
		for (const q of this.releaseQueue)
			if (q.at <= this.time) {
				q.done = true;
				this.bombs.push(this.createBomb());
			}
		this.releaseQueue = this.releaseQueue.filter((q) => !q.done);
		for (const b of this.bombs) {
			if (!b.alive) continue;
			this.integrateBomb(b, dt);
			if (b.z <= 0) {
				b.alive = false;
				let hit = false;
				for (const t of this.targets)
					for (const p of t.parts) {
						if (p.dead) continue;
						const d = dist(b, p),
							blast = 200 * U + p.r;
						if (d < blast) {
							const damage = 3 * (1 - d / blast);
							if (damage < 0.25) continue;
							p.hp = Math.max(0, p.hp - damage);
							hit = true;
							if (p.hp <= 0) {
								p.dead = true;
								this.stats.targets++;
								this.score += p.points;
								this.emit("target", { target: t.id, part: p.id });
								this.effect("fire", p, 1000, 55 * U);
							}
						}
					}
				if (hit) this.stats.accurate++;
				this.effect("impact", { ...b, z: 3 * U }, 8, 100 * U);
				this.emit("impact", { x: b.x, y: b.y, z: 0, hit });
				this.say(
					"BOMBARDIER",
					hit
						? this.primaryComplete()
							? "Primary disabled. Good work. Now bring us home."
							: "Confirmed damage. Check the map for the remaining works."
						: "Wide of the works. There is room for another pass, or a safe return.",
					hit ? 2 : 1,
					"impact",
					5,
				);
				if (this.practice === "bombing")
					this.finish(hit ? "practice-success" : "practice-miss");
			}
		}
		this.bombs = this.bombs.filter((b) => b.alive);
	}
	batteryActive() {
		return !this.targets.find((t) => t.id === "battery").parts[0].dead;
	}
	barrage(dt) {
		const a = this.aircraft,
			coast = this.targets.find((t) => t.id === "battery"),
			harbor = this.targets[0];
		const coastDanger = this.batteryActive() && dist(a, coast) < 3100 * U;
		const harborDanger = !this.primaryComplete() && dist(a, harbor) < 3300 * U;
		this.flakClock -= dt;
		if (
			a.airborne &&
			(coastDanger || harborDanger) &&
			this.flakClock <= 0 &&
			this.flak.length < 3
		) {
			this.flakClock = 10 + this.rng() * 3;
			this.spawnFlak();
		}
		for (const f of this.flak) {
			f.time -= dt;
			if (f.time <= 0 && !f.burst) {
				f.burst = true;
				f.time = 4;
				const d = Math.hypot(a.x - f.x, a.y - f.y, a.z - f.z);
				if (d < f.r) this.hurt(13 * (1 - d / (f.r * 1.6)), "flak");
				else {
					this.stats.flakEvaded++;
					this.emit("evade");
				}
				this.effect("flak", f, 15, f.r * 0.3);
				this.emit("flak-burst", { x: f.x, y: f.y, z: f.z });
			}
		}
		this.flak = this.flak.filter((f) => !(f.burst && f.time <= 0));
	}
	spawnFlak() {
		const a = this.aircraft,
			t = this.balance.flakWindow;
		this.flak.push({
			x: a.x + a.vx * t,
			y: a.y + a.vy * t,
			z: Math.max(80 * U, a.z + a.vz * t),
			r: 42 * U,
			time: t,
			total: t,
			burst: false,
			id: ++this.id,
		});
		this.say(
			"NAVIGATOR",
			"Barrage plotted ahead! Bank or change height before it bursts.",
			3,
			"flak",
			8,
		);
		this.emit("flak-warning");
	}
	effect(kind, p, life, size) {
		this.effects.push({
			kind,
			x: p.x,
			y: p.y,
			z: p.z,
			life,
			total: life,
			size,
			id: ++this.id,
		});
	}
	hurt(amount, cause, subsystem) {
		if (this.cheats.invulnerable || this.ended) return;
		const a = this.aircraft,
			damage = Math.max(0, amount * this.profile.damage * this.balance.damage);
		a.hull = Math.max(0, a.hull - damage);
		this.stats.damage += damage;
		a.hurt = 0.5;
		this.emit("damage", { amount: damage, cause });
		if (subsystem || this.rng() < 0.18)
			this.applyDamage(
				subsystem || ["engine", "gun", "sight"][Math.floor(this.rng() * 3)],
			);
		if (a.hull <= 0) this.finish("destroyed");
	}
	applyDamage(kind) {
		const a = this.aircraft;
		if (kind === "engine" || kind === "fire") {
			const i = a.engines.indexOf(Math.max(...a.engines));
			a.engines[i] = Math.max(0.15, a.engines[i] - 0.45);
			if (kind === "fire") {
				a.fire = i;
				a.fireTime = 0;
				this.say(
					"ENGINEER",
					`Engine ${i + 1} burning! F to use our one extinguisher.`,
					3,
					"fire",
					0,
				);
			} else
				this.say(
					"ENGINEER",
					`Engine ${i + 1} losing power. Reduce the climb; watch return reserve.`,
					3,
					"engine",
					0,
				);
			this.emit("subsystem", { kind, engine: i });
		} else if (kind === "gun") {
			const p = this.players.find((p) => this.guns[p.station]);
			const id = p?.station || "starboard";
			this.guns[id].jammed = true;
			this.say(
				"GUNNER",
				`${id} mount jammed. Another mount or evasive flying.`,
				3,
				"gun-damage",
				0,
			);
			this.emit("subsystem", { kind });
		} else if (kind === "sight") {
			a.sight = 0.35;
			this.say(
				"BOMBARDIER",
				"Fine sight damaged. The coarse cross is still true.",
				3,
				"sight-damage",
				0,
			);
			this.emit("subsystem", { kind });
		}
	}
	damageStep(dt) {
		const a = this.aircraft;
		if (a.fire >= 0) {
			a.fireTime += dt;
			if (!this.cheats.invulnerable)
				a.hull = Math.max(0, a.hull - dt * 0.3 * this.balance.damage);
			if (a.fireTime > 15)
				this.say(
					"ENGINEER",
					"Fire spreading. Bottle empty? Jettison and turn home now.",
					3,
					"spreading",
					20,
				);
			if (a.fireTime > 40) {
				a.engines[a.fire] = 0;
				a.fire = -1;
				a.hull = Math.max(0, a.hull - 12 * this.balance.damage);
				this.say(
					"ENGINEER",
					"Burned engine feathered. Three engines can still get us back.",
					3,
					"feather",
					0,
				);
			}
			if (a.hull <= 0) this.finish("destroyed");
		}
	}
	mission(dt) {
		if (this.ended) return;
		const a = this.aircraft;
		if (this.phase === "launch" && a.z > 100 * U) this.phaseTo("crossing");
		if (this.returning && this.phase !== "recovery") this.phaseTo("return");
		const homeDistance = dist(a, HOME);
		if (
			a.airborne &&
			this.time > 55 &&
			this.returning &&
			this.phase !== "recovery" &&
			homeDistance < 1700 * U &&
			a.z < 1400 * U &&
			a.speed < 100 * U
		) {
			this.phaseTo("recovery");
		}
		if (this.phase === "recovery") {
			this.recoveryTime += dt;
			const k = Math.min(1, dt * 0.16);
			a.x = mix(a.x, HOME.x + 400 * U, k);
			a.y = mix(a.y, HOME.y, k);
			a.z = mix(a.z, HOME.z + 3 * U, dt * 0.3);
			a.heading = wrap(a.heading + wrap(Math.PI - a.heading) * dt);
			a.bank *= Math.max(0, 1 - dt * 3);
			a.pitch = -0.03;
			a.speed = approach(a.speed, 10 * U, dt * 6 * U);
			this.say(
				"PILOT",
				"Larkspur has us. Gear down; I’ll take the landing.",
				2,
				"landing",
				30,
			);
			if (this.recoveryTime > 14) {
				this.stats.returned = true;
				this.finish(this.primaryComplete() ? "success" : "abort");
			}
		}
		if (this.time > this.operation.deadline) this.finish("deadline");
		if (a.fuel <= 0) {
			this.say(
				"ENGINEER",
				"Fuel exhausted. Keep the nose down; home if you can reach it.",
				3,
				"dry",
				20,
			);
			if (a.z < 20 * U) this.finish("fuel");
		}
		if (this.practice === "gunnery" && this.stats.kills >= 2)
			this.finish("practice-success");
	}
	finish(reason) {
		if (this.ended) return;
		this.ended = true;
		this.phaseTo("debrief");
		const a = this.aircraft,
			primary = this.primaryComplete(),
			returned = this.stats.returned;
		const accuracy = this.stats.released
			? Math.round((100 * this.stats.accurate) / this.stats.released)
			: 0;
		const survival = returned ? 1500 : 0,
			precision = this.stats.accurate * 100,
			wasted =
				Math.max(0, this.stats.released - this.stats.accurate) * 35 +
				this.stats.jettisoned * 20,
			damage = Math.round((100 - a.hull) * 8);
		const total = Math.max(
			0,
			this.score + survival + precision - wasted - damage,
		);
		const title = reason.startsWith("practice")
			? reason === "practice-success"
				? "PRACTICE COMPLETE"
				: "CALIBRATION: WIDE"
			: reason === "success"
				? "PARCEL DELIVERED. CREW HOME."
				: reason === "abort"
					? returned
						? "CREW HOME. TARGET STILL STANDING."
						: "SORTIE ABORTED"
					: reason === "deadline"
						? "SORTIE WINDOW CLOSED"
						: "AIRCRAFT LOST";
		this.result = {
			reason,
			title,
			primary,
			returned,
			won: primary && returned,
			score: total,
			base: this.score,
			survival,
			precision,
			wasted,
			damage,
			accuracy,
			time: this.time,
			cheated: this.cheated,
			stats: { ...this.stats },
		};
		for (const p of this.players) p.input = {};
		this.emit("finish", { reason, score: total });
	}
	repair() {
		const a = this.aircraft;
		a.hull = 100;
		a.engines = [1, 1, 1, 1];
		a.sight = 1;
		a.fire = -1;
		a.fireTime = 0;
		a.extinguisher = 1;
		for (const g of Object.values(this.guns)) {
			g.jammed = false;
			g.ammo = 480;
		}
	}
	setupPractice(kind) {
		const a = this.aircraft;
		a.airborne = true;
		a.speed = 70 * U;
		a.throttle = 0.85;
		a.z = this.operation.cruiseAltitude;
		a.gear = 0;
		this.phaseTo("crossing");
		if (kind === "gunnery") {
			a.x = 9000 * U;
			this.spawnWave(0, "head-on", 2);
		}
		if (kind === "bombing") {
			a.x = this.operation.targets[0].x - 1700 * U;
			a.y = this.operation.targets[0].y;
			a.doorsOpen = true;
			a.doors = 1;
			this.owners.pilot = null;
			this.owners.bombs = this.players[0].id;
			this.players[0].station = "bombs";
			this.phaseTo("bomb-run");
		}
		if (kind === "return") {
			a.x = HOME.x + 4700 * U;
			a.heading = Math.PI;
			a.holdHeading = Math.PI;
			a.hull = 54;
			this.selectRoute("home", false);
			this.applyDamage("fire");
		}
		this.say(
			"INSTRUCTOR",
			kind === "gunnery"
				? "Take the nose gun. Lead the approach and use short bursts."
				: kind === "bombing"
					? "Doors open. Hold course; release as the diamond crosses the shipyard."
					: "One engine burning. Extinguish, jettison if needed, and reach the home ring.",
			3,
			"practice",
			0,
		);
	}
	snapshot() {
		return {
			version: 1,
			seed: this.seed,
			time: this.time,
			tick: this.tick,
			phase: this.phase,
			phaseTime: this.phaseTime,
			aircraft: structuredClone(this.aircraft),
			players: structuredClone(this.players),
			owners: { ...this.owners },
			commander: this.commander,
			requests: structuredClone(this.requests),
			route: structuredClone(this.route),
			routeName: this.routeName,
			waypoint: this.waypoint,
			returning: this.returning,
			targets: structuredClone(this.targets),
			enemies: structuredClone(this.enemies),
			bombs: structuredClone(this.bombs),
			flak: structuredClone(this.flak),
			shots: structuredClone(this.shots),
			effects: structuredClone(this.effects),
			stats: { ...this.stats },
			score: this.score,
			radio: { ...this.radio },
			eventId: this.eventId,
			ended: this.ended,
			result: this.result,
			cheated: this.cheated,
			cheats: { ...this.cheats },
			balance: { ...this.balance },
		};
	}
}
