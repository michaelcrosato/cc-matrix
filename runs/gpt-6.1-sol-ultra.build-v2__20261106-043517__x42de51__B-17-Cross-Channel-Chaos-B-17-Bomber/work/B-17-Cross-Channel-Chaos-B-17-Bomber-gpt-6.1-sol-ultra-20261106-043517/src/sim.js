import {
	BEARINGS,
	DEFAULT_BALANCE,
	DIFFICULTIES,
	LOADOUTS,
	MISSION,
	STATIONS,
	U,
	validateMission,
} from "../content/mission.js";
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const angle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const copy = (x) => JSON.parse(JSON.stringify(x));
export function rng(seed) {
	let a = seed >>> 0;
	return () => {
		a += 0x6d2b79f5;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
export function localVector(yaw, forward, right, up = 0) {
	return {
		x: Math.cos(yaw) * forward - Math.sin(yaw) * right,
		y: Math.sin(yaw) * forward + Math.cos(yaw) * right,
		z: up,
	};
}
export function segmentHit(a, b, c, r) {
	const dx = b.x - a.x,
		dy = b.y - a.y,
		dz = b.z - a.z,
		d = dx * dx + dy * dy + dz * dz || 1,
		t = clamp(
			((c.x - a.x) * dx + (c.y - a.y) * dy + (c.z - a.z) * dz) / d,
			0,
			1,
		);
	return (
		Math.hypot(a.x + dx * t - c.x, a.y + dy * t - c.y, a.z + dz * t - c.z) <= r
	);
}
export function bombIntegrate(b, dt, wind) {
	b.x += b.vx * dt;
	b.y += b.vy * dt;
	b.z += b.vz * dt;
	b.vx += wind.x * dt;
	b.vy += wind.y * dt;
	b.vz -= 9.81 * U * dt;
	b.age = (b.age || 0) + dt;
	return b;
}
export function predictBomb(aircraft, wind = { x: 0, y: 0 }) {
	const b = {
		x: aircraft.x,
		y: aircraft.y,
		z: aircraft.z - 24,
		vx: Math.cos(aircraft.yaw) * aircraft.speed,
		vy: Math.sin(aircraft.yaw) * aircraft.speed,
		vz: Math.sin(aircraft.pitch) * aircraft.speed,
		age: 0,
	};
	for (let i = 0; i < 120 * 40 && b.z > 0; i++) bombIntegrate(b, 1 / 120, wind);
	return { x: b.x, y: b.y, z: 0, time: b.age };
}
export class BomberSim {
	constructor(options = {}) {
		this.balance = { ...DEFAULT_BALANCE };
		this.definition = copy(MISSION);
		this.reset(options);
	}
	reset({
		seed = 1942,
		loadout = "balanced",
		difficulty = "normal",
		players = [1],
		route = "direct",
		practice = null,
		attract = false,
	} = {}) {
		if (!LOADOUTS[loadout]) loadout = "balanced";
		if (!DIFFICULTIES[difficulty]) difficulty = "normal";
		this.random = rng(seed);
		this.once = {};
		this.controls = {};
		this.seen = new Set();
		this.lastSeq = {};
		this.aiCool = {};
		this.flakCool = 6;
		this.encounterSet = new Set();
		this.actionCounter = 0;
		const l = LOADOUTS[loadout],
			d = DIFFICULTIES[difficulty],
			fuel = l.fuel * d.fuel;
		const pp = players.map((p, i) => ({
			id: typeof p === "object" ? p.id : p,
			name: typeof p === "object" ? p.name : "CREW " + (i + 1),
			station: i ? "nose" : "pilot",
			aim: { yaw: 0, pitch: 0 },
			look: [0, 0],
			input: "keyboard",
			connected: true,
		}));
		this.state = {
			version: 1,
			seed,
			t: 0,
			tick: 0,
			phase: "launch",
			loadout,
			difficulty,
			practice,
			attract,
			cheated: false,
			paused: false,
			deadline: this.definition.deadline,
			aircraft: {
				x: 0,
				y: 0,
				z: 80,
				yaw: 0,
				pitch: 0,
				bank: 0,
				speed: 0,
				throttle: 0.72,
				autoPower: true,
				fuel,
				maxFuel: fuel,
				hull: 100,
				engines: [1, 1, 1, 1],
				fire: 0,
				extinguishers: 1,
				doors: 0,
				gear: 1,
				hold: true,
				holdMode: "route",
				holdYaw: 0,
				holdAlt: this.definition.cruise,
				airborne: false,
				stall: false,
				shake: 0,
			},
			players: pp,
			commandOwner: pp[0]?.id ?? 1,
			owners: {
				pilot: pp[0]?.id ?? "AI",
				nose: pp[1]?.id ?? "AI",
				starboard: "AI",
				tail: "AI",
				port: "AI",
				bombs: "AI",
			},
			mounts: Object.fromEntries(
				Object.keys(BEARINGS).map((k) => [
					k,
					{ ammo: 480, jammed: false, cool: 0, recoil: 0, shots: 0 },
				]),
			),
			bombsLeft: l.bombs,
			bombsDropped: 0,
			salvo: 2,
			doorsOpen: false,
			enemies: [],
			bombs: [],
			flak: [],
			shots: [],
			effects: [],
			targets: this.definition.targets.map((t) => ({ ...t, alive: true })),
			route: {
				...this.definition.waypoints[route === "dogleg" ? "dogleg" : "harbor"],
				target: route === "dogleg" ? "dogleg" : "harbor",
			},
			routeChoice: route,
			primary: false,
			score: 0,
			kills: 0,
			hits: 0,
			wasted: 0,
			fired: 0,
			missionHits: 0,
			returned: false,
			aborted: false,
			encounters: [],
			events: [],
			history: [],
			caption: null,
			captionUntil: 0,
			warning: null,
			wind: { x: 1.3, y: 3.6 },
			prediction: null,
			result: null,
		};
		this.say(
			"pilot",
			"Copper Tide. Greyhaven transport is the primary. Bring the crew home.",
		);
		if (practice) this.startPractice(practice);
		this.updatePrediction();
		return this.state;
	}
	emit(type, data = {}) {
		const s = this.state,
			e = { id: ++this.actionCounter, tick: s.tick, t: s.t, type, ...data };
		s.events.push(e);
		if (s.events.length > 60) s.events.shift();
		s.history.push(e);
		if (s.history.length > 800) s.history.shift();
		return e;
	}
	say(role, text, urgent = false) {
		const s = this.state;
		if (s.caption && s.captionUntil > s.t && s.caption.urgent && !urgent)
			return;
		s.caption = { role, text, urgent, id: this.actionCounter + 1 };
		s.captionUntil = s.t + (urgent ? 6 : 7);
		this.emit("radio", { role, text, urgent });
	}
	owner(id) {
		return this.state.players.find((p) => p.id === id && p.connected);
	}
	join(id, name) {
		if (this.owner(id) || this.state.players.length >= 2) return false;
		this.state.players.push({
			id,
			name: name || "CREW " + id,
			station: "nose",
			aim: { yaw: 0, pitch: 0 },
			look: [0, 0],
			connected: true,
			input: "pad",
		});
		this.state.owners.nose = id;
		this.emit("joined", { player: id });
		return true;
	}
	depart(id) {
		const s = this.state,
			p = this.owner(id);
		if (!p) return;
		delete this.controls[id];
		p.connected = false;
		for (const k in s.owners) if (s.owners[k] === id) s.owners[k] = "AI";
		if (s.commandOwner === id)
			s.commandOwner = s.players.find((x) => x.connected)?.id ?? null;
		s.aircraft.hold = true;
		s.aircraft.holdYaw = s.aircraft.yaw;
		s.aircraft.holdAlt = s.aircraft.z;
		this.emit("departed", { player: id });
		this.say("pilot", "Crew position vacant. Automatic hold engaged.");
	}
	command(id, c = {}) {
		const s = this.state,
			p = this.owner(id);
		if (!p || s.result) return false;
		if (c.type === "controls") {
			if (c.seq !== undefined) {
				if (
					!Number.isInteger(c.seq) ||
					c.seq < 0 ||
					c.seq <= (this.lastSeq[id] ?? -1)
				)
					return false;
				this.lastSeq[id] = c.seq;
			}
			const n = (k) => (Number.isFinite(c[k]) ? clamp(c[k], -1, 1) : 0);
			this.controls[id] = {
				bank: n("bank"),
				pitch: n("pitch"),
				throttleDelta: n("throttleDelta"),
				aimX: n("aimX"),
				aimY: n("aimY"),
				fire: !!c.fire,
				zoom: !!c.zoom,
				at: s.t,
			};
			return true;
		}
		if (c.actionId !== undefined) {
			const key = id + ":" + c.actionId;
			if (this.seen.has(key)) return false;
			this.seen.add(key);
			if (this.seen.size > 2000)
				this.seen.delete(this.seen.values().next().value);
		}
		if (c.type === "station") return this.claim(id, c.station, !!c.handover);
		if (c.type === "aim") {
			if (!Number.isFinite(c.yaw) || !Number.isFinite(c.pitch)) return false;
			p.aim.yaw = clamp(c.yaw, -0.83, 0.83);
			p.aim.pitch = clamp(c.pitch, -0.48, 0.65);
			return true;
		}
		if (c.type === "release") return this.release(id, c.salvo ?? s.salvo);
		if (c.type === "doors") {
			if (s.owners.bombs !== id) return false;
			s.doorsOpen = !s.doorsOpen;
			this.emit("doors", { open: s.doorsOpen });
			return true;
		}
		if (c.type === "salvo") {
			if (s.owners.bombs !== id) return false;
			s.salvo = [1, 2, 4].includes(c.salvo) ? c.salvo : 2;
			return true;
		}
		if (c.type === "route") return this.route(id, c.target, c.point);
		if (c.type === "hold") {
			if (s.commandOwner !== id) return false;
			s.aircraft.hold = !s.aircraft.hold;
			s.aircraft.holdMode = "route";
			s.aircraft.holdYaw = s.aircraft.yaw;
			s.aircraft.holdAlt = Math.max(s.aircraft.z, 400 * U);
			this.say(
				"pilot",
				s.aircraft.hold
					? "Navigator has the course. Stick input takes control."
					: "Your aircraft.",
			);
			return true;
		}
		if (c.type === "extinguish") {
			if (
				s.commandOwner !== id ||
				!s.aircraft.fire ||
				s.aircraft.extinguishers < 1
			)
				return false;
			s.aircraft.extinguishers--;
			s.aircraft.fire = 0;
			s.aircraft.engines = s.aircraft.engines.map((e) => Math.max(0.3, e));
			this.emit("extinguish");
			this.say("engineer", "Fire is out. That bottle is spent.");
			return true;
		}
		if (c.type === "jettison") {
			if (s.commandOwner !== id || c.held < 1.5 || !s.bombsLeft) return false;
			const count = s.bombsLeft;
			s.bombsLeft = 0;
			this.emit("jettison", { count });
			this.say(
				"engineer",
				"Payload gone. Lighter aircraft. Set course for home.",
			);
			return true;
		}
		return false;
	}
	claim(id, station, handover = false) {
		const s = this.state,
			p = this.owner(id);
		if (!p || !STATIONS.includes(station)) return false;
		if (p.station === station) return true;
		const other = s.owners[station];
		if (other !== "AI" && other !== id) {
			const q = this.owner(other);
			if (!handover) {
				this.emit("handover-request", { player: id, station, owner: other });
				this.say("pilot", "Station occupied. Select again to exchange duties.");
				return false;
			}
			if (q) {
				q.station = p.station;
				s.owners[p.station] = other;
				if (q.station === "pilot") s.commandOwner = other;
			}
		} else s.owners[p.station] = "AI";
		p.station = station;
		s.owners[station] = id;
		p.aim = { yaw: 0, pitch: 0 };
		if (station === "pilot") s.commandOwner = id;
		else if (s.owners.pilot === "AI") {
			s.aircraft.hold = true;
			if (s.aircraft.holdMode !== "route") {
				s.aircraft.holdYaw = s.aircraft.yaw;
				s.aircraft.holdAlt = Math.max(160 * U, s.aircraft.z);
			}
			if (s.aircraft.stall)
				this.say(
					"pilot",
					"Unsafe handover. More power before you leave!",
					true,
				);
		}
		if (station === "bombs") {
			s.doorsOpen = true;
			this.say(
				"bombardier",
				"Doors opening. Put the impact ring over the transport. Release is yours.",
			);
		}
		delete this.controls[id];
		this.emit("station", { player: id, station });
		return true;
	}
	route(id, target, point) {
		const s = this.state;
		if (s.commandOwner !== id) return false;
		const r =
			point && Number.isFinite(point.x) && Number.isFinite(point.y)
				? {
						x: clamp(point.x, -40000, 440000),
						y: clamp(point.y, -140000, 160000),
						label: "CUSTOM WAYPOINT",
					}
				: this.definition.waypoints[target];
		if (!r) return false;
		s.route = { ...r, target: target || "custom" };
		s.aircraft.hold = true;
		s.aircraft.holdMode = "route";
		if (target === "home") {
			s.phase = "return";
			s.aborted = !s.primary;
			this.say(
				"pilot",
				s.primary
					? "Strike confirmed. Bringing everyone home."
					: "Abort acknowledged. A live crew can fly again.",
			);
		} else this.say("pilot", "Course set: " + r.label + ".");
		this.emit("route", { target: s.route.target, x: r.x, y: r.y });
		return true;
	}
	wind() {
		return {
			x: this.state.wind.x * this.balance.bombDrift,
			y: this.state.wind.y * this.balance.bombDrift,
		};
	}
	updatePrediction() {
		this.state.prediction = predictBomb(this.state.aircraft, this.wind());
	}
	release(id, count) {
		const s = this.state,
			a = s.aircraft;
		if (
			s.owners.bombs !== id ||
			s.bombsLeft <= 0 ||
			a.doors < 0.85 ||
			!a.airborne
		) {
			this.emit("release-denied", {
				player: id,
				reason: s.bombsLeft ? "Doors not ready" : "No ordnance",
			});
			return false;
		}
		count = clamp(Math.floor(Number(count) || 1), 1, Math.min(4, s.bombsLeft));
		for (let i = 0; i < count; i++) {
			const b = {
				id: ++this.actionCounter,
				x: a.x,
				y: a.y,
				z: a.z - 24,
				vx: Math.cos(a.yaw) * a.speed,
				vy: Math.sin(a.yaw) * a.speed,
				vz: Math.sin(a.pitch) * a.speed,
				age: 0,
				delay: i * 0.16,
				hit: false,
			};
			s.bombs.push(b);
		}
		s.bombsLeft -= count;
		s.bombsDropped += count;
		this.emit("release", {
			player: id,
			count,
			prediction: { ...s.prediction },
		});
		this.say(
			"bombardier",
			s.bombsLeft
				? "Bombs away. Hold her steady."
				: "Last bombs away. Home is still an option.",
		);
		return true;
	}
	spawnFighter(bearing = "nose", pattern = "headon") {
		const s = this.state;
		if (s.enemies.filter((e) => e.alive).length >= 3) return null;
		const a = s.aircraft,
			by = BEARINGS[bearing] ?? 0,
			base = a.yaw + by,
			d = pattern === "pursuit" ? 12000 : 20000;
		const e = {
			id: ++this.actionCounter,
			x: a.x + Math.cos(base) * d,
			y: a.y + Math.sin(base) * d,
			z: a.z + 1000,
			yaw: base + Math.PI,
			pitch: 0,
			bank: 0,
			hp: 4,
			alive: true,
			bearing,
			pattern,
			phase: "approach",
			t: 0,
			cool: 3,
			suppression: 0,
			r: 230,
		};
		s.enemies.push(e);
		s.encounters.push(bearing);
		this.emit("fighter-spawn", { bearing, pattern, id: e.id });
		this.say(
			"gunner",
			`${{ nose: "Twelve", starboard: "Three", tail: "Six", port: "Nine" }[bearing]} o’clock! ${pattern === "pursuit" ? "Fighter on our tail." : "Fighters closing."}`,
			true,
		);
		return e;
	}
	spawnFlak() {
		const s = this.state,
			a = s.aircraft;
		if (s.flak.filter((f) => !f.burst).length >= 2) return null;
		const delay = this.balance.flakWindow,
			v = localVector(a.yaw, a.speed * delay, 0),
			f = {
				id: ++this.actionCounter,
				x: a.x + v.x,
				y: a.y + v.y,
				z: a.z,
				r: 700,
				timer: delay,
				age: 0,
				burst: false,
			};
		s.flak.push(f);
		this.emit("flak-warning", { x: f.x, y: f.y, z: f.z });
		this.say("pilot", "Flak on our track! Bank or change altitude.", true);
		return f;
	}
	damage(n, system = null) {
		const s = this.state,
			a = s.aircraft;
		if (s.invulnerable) return false;
		n *= this.balance.damageMultiplier * DIFFICULTIES[s.difficulty].damage;
		a.hull = clamp(a.hull - n, 0, 100);
		a.shake = 1;
		this.emit("damage", { amount: n, system });
		if (system) this.applySystem(system);
		else if (n >= 4 && this.random() < 0.18)
			this.applySystem(
				["engine", "gun", "sight"][Math.floor(this.random() * 3)],
			);
		if (a.hull <= 0) this.result("destroyed");
		return true;
	}
	applySystem(system) {
		const s = this.state,
			a = s.aircraft;
		if (system === "engine" || system === "fire") {
			const i = a.engines.indexOf(Math.max(...a.engines));
			a.engines[i] = Math.max(0.15, a.engines[i] - 0.5);
			if (system === "fire") a.fire = 1;
			this.say(
				"engineer",
				a.fire
					? "Engine fire! One extinguisher. Use it now."
					: "An engine is losing power. Mind the fuel.",
				true,
			);
		} else if (system === "gun") {
			const k =
				Object.keys(s.mounts).find((k) => !s.mounts[k].jammed) || "nose";
			s.mounts[k].jammed = true;
			this.say(
				"gunner",
				k.toUpperCase() + " mount jammed. Use another bearing or evade.",
				true,
			);
		} else if (system === "sight") {
			s.sightDamaged = true;
			this.say("bombardier", "Sight damaged. Coarse ring still works.", true);
		}
	}
	clearDamage() {
		const s = this.state,
			a = s.aircraft;
		a.hull = 100;
		a.fire = 0;
		a.engines = [1, 1, 1, 1];
		a.extinguishers = 1;
		s.sightDamaged = false;
		for (const m of Object.values(s.mounts)) m.jammed = false;
	}
	fireGun(station, p, _dt) {
		const s = this.state,
			m = s.mounts[station];
		if (!m || m.jammed || m.ammo <= 0 || m.cool > 0) return false;
		m.cool = 0.115;
		m.ammo--;
		m.recoil = 1;
		m.shots++;
		s.fired++;
		const a = s.aircraft;
		let yaw = a.yaw + BEARINGS[station] + p.aim.yaw,
			pitch = p.aim.pitch;
		const assist = Math.max(
			0.02,
			this.balance.aimHelp + DIFFICULTIES[s.difficulty].aim,
		);
		let lock = null,
			best = assist;
		for (const e of s.enemies)
			if (e.alive) {
				const dx = e.x - a.x,
					dy = e.y - a.y,
					dz = e.z - a.z,
					dyaw = angle(Math.atan2(dy, dx) - yaw),
					dpitch = Math.atan2(dz, Math.hypot(dx, dy)) - pitch,
					err = Math.hypot(dyaw, dpitch);
				if (err < best) {
					best = err;
					lock = e;
				}
			}
		if (lock) {
			const dist = Math.hypot(lock.x - a.x, lock.y - a.y, lock.z - a.z),
				lead = dist / (850 * U);
			yaw = Math.atan2(
				lock.y + (lock.vy || 0) * lead - a.y,
				lock.x + (lock.vx || 0) * lead - a.x,
			);
			pitch = Math.atan2(
				lock.z + (lock.vz || 0) * lead - a.z,
				Math.hypot(lock.x - a.x, lock.y - a.y),
			);
		}
		const mountAngle = angle(yaw - a.yaw - BEARINGS[station]);
		if (Math.abs(mountAngle) > 0.9) return false;
		const cp = Math.cos(pitch),
			v = 850 * U,
			forward = localVector(a.yaw + BEARINGS[station], 180, 0);
		s.shots.push({
			x: a.x + forward.x,
			y: a.y + forward.y,
			z: a.z,
			px: a.x,
			py: a.y,
			pz: a.z,
			vx: Math.cos(yaw) * cp * v,
			vy: Math.sin(yaw) * cp * v,
			vz: Math.sin(pitch) * v,
			life: 1.7,
			team: "crew",
			station,
		});
		this.emit("gun", { station });
		return true;
	}
	hitFighter(e, damage = 1) {
		if (!e.alive) return false;
		e.hp -= damage;
		e.suppression = Math.min(1, e.suppression + 0.18);
		this.emit("hit", { enemy: e.id, x: e.x, y: e.y, z: e.z });
		if (e.hp <= 0) {
			e.alive = false;
			this.state.kills++;
			this.state.score += 200;
			this.state.effects.push({
				kind: "explosion",
				x: e.x,
				y: e.y,
				z: e.z,
				age: 0,
				size: 600,
			});
			this.emit("kill", { enemy: e.id });
			this.say("gunner", "Fighter going down. Keep your eyes open.");
		}
		return true;
	}
	step(dt) {
		const s = this.state;
		if (s.result || s.paused) return;
		dt = clamp(dt, 0, 0.1);
		s.t += dt;
		s.tick++;
		s.aircraft.shake = Math.max(0, s.aircraft.shake - dt * 2);
		if (s.captionUntil < s.t) s.caption = null;
		this.fly(dt);
		if (s.result) return;
		this.updatePrediction();
		this.updatePlayers(dt);
		this.updateFighters(dt);
		this.updateShots(dt);
		this.updateBombs(dt);
		this.updateFlak(dt);
		this.updateMission(dt);
		for (const fx of s.effects) fx.age += dt;
		s.effects = s.effects.filter((f) => f.age < 8);
		s.enemies = s.enemies.filter((e) => e.alive || e.t < 40);
		s.flak = s.flak.filter((f) => f.age < 10);
		if (s.infinite) {
			s.aircraft.fuel = s.aircraft.maxFuel;
			for (const m of Object.values(s.mounts)) m.ammo = 480;
			s.bombsLeft = Math.max(s.bombsLeft, 4);
		}
		if (s.t >= s.deadline && !s.result) this.result("deadline");
	}
	fly(dt) {
		const s = this.state,
			a = s.aircraft;
		let c = this.controls[s.owners.pilot];
		if (c && s.t - c.at > 1) c = null;
		let bank = c?.bank || 0,
			pitch = c?.pitch || 0;
		const mean = a.engines.reduce((x, y) => x + y, 0) / 4;
		if (c?.throttleDelta) {
			a.throttle = clamp(a.throttle + c.throttleDelta * dt * 0.24, 0.05, 1);
			a.autoPower = false;
		}
		if (Math.abs(bank) + Math.abs(pitch) > 0.12) {
			a.hold = false;
			a.holdMode = "course";
		}
		if (a.hold || s.owners.pilot === "AI") {
			if (a.holdMode === "route") {
				const r = s.route,
					desired = Math.atan2(r.y - a.y, r.x - a.x),
					diff = angle(desired - a.yaw);
				bank = clamp(diff * 2.8, -1, 1);
				if (r.target === "home" && Math.hypot(a.x, a.y) < 30000)
					a.holdAlt = 250 * U;
				else a.holdAlt = this.definition.cruise;
				if (a.autoPower !== false) a.throttle = Math.max(a.throttle, 0.8);
			} else bank = clamp(angle(a.holdYaw - a.yaw) * 3, -1, 1);
			pitch = clamp((a.holdAlt - a.z) / (U * 180), -0.65, 0.7) * mean;
			bank *= this.balance.courseHold;
		}
		a.bank +=
			(bank * 0.55 - a.bank) *
			Math.min(1, dt * 1.3 * this.balance.flightResponse);
		a.pitch +=
			(pitch * 0.18 - a.pitch) *
			Math.min(1, dt * 1.2 * this.balance.flightResponse);
		const factor = clamp(0.99 - s.bombsLeft * 0.0055, 0.85, 1),
			target =
				(34 + 54 * Math.min(a.throttle, 0.3 + 0.7 * mean)) *
				U *
				factor *
				(0.5 + 0.5 * mean);
		a.speed +=
			(target - a.speed) * Math.min(1, dt * (a.airborne ? 0.18 : 0.09));
		if (!a.airborne) {
			a.z = 80;
			a.bank = 0;
			a.pitch = 0.025;
			if (a.speed > 48 * U && s.t > 8) {
				a.airborne = true;
				a.holdAlt = this.definition.cruise;
				this.emit("takeoff");
				this.say(
					"pilot",
					"Positive climb. Gear up. H holds the route; your stick takes over.",
				);
			}
		}
		if (a.airborne) {
			a.gear = Math.max(0, a.gear - dt * 0.3);
			a.yaw = angle(
				a.yaw + ((Math.tan(a.bank) * 9.81) / Math.max(a.speed / U, 35)) * dt,
			);
			a.stall = a.speed < 43 * U;
			let climb = Math.sin(a.pitch) * a.speed;
			if (a.stall) {
				climb -= 7 * U;
				this.sayOnce(
					"stall",
					"pilot",
					"Stall warning. Lower the nose and add power!",
					true,
				);
			}
			a.z += climb * dt;
			if (a.z < 48) {
				this.result("ground-impact");
				return;
			}
			a.z = Math.min(a.z, 1800 * U);
		}
		a.x += Math.cos(a.yaw) * a.speed * dt;
		a.y += Math.sin(a.yaw) * a.speed * dt;
		const burn =
			(0.6 + a.throttle * 0.55) *
			(1 + (1 - mean) * 0.6) *
			this.balance.fuelConsumption;
		a.fuel = Math.max(0, a.fuel - burn * dt);
		a.doors += (Number(s.doorsOpen) - a.doors) * Math.min(1, dt * 2.8);
		if (a.fire) {
			a.fire += dt;
			a.fuel = Math.max(0, a.fuel - dt * 0.6);
			a.hull = Math.max(
				0,
				a.hull -
					dt * (a.fire > 30 ? 1.2 : 0.25) * this.balance.damageMultiplier,
			);
			if (a.fire > 20)
				this.sayOnce(
					"fire-late",
					"engineer",
					"Fire spreading. Use the bottle or turn home now!",
					true,
				);
			if (a.fire > 50 || a.hull <= 0) this.result("fire");
		}
		if (a.fuel <= 0) this.result("fuel-exhausted");
		if (a.fuel / a.maxFuel < 0.25)
			this.sayOnce(
				"fuel-low",
				"engineer",
				"Fuel reserve low. Recommend home.",
				true,
			);
		if (Math.abs(a.x) > 560000 || Math.abs(a.y) > 280000)
			this.sayOnce(
				"boundary",
				"pilot",
				"Leaving the operational area. Set a return course.",
				true,
			);
	}
	sayOnce(key, role, text, urgent = false) {
		this.once ??= {};
		if (this.once[key]) return;
		this.once[key] = true;
		this.say(role, text, urgent);
	}
	updatePlayers(dt) {
		const s = this.state;
		for (const p of s.players) {
			if (!p.connected) continue;
			const c = this.controls[p.id];
			if (!c || s.t - c.at > 1) continue;
			p.aim.yaw = clamp(p.aim.yaw + c.aimX * dt * 1.15, -0.83, 0.83);
			p.aim.pitch = clamp(p.aim.pitch - c.aimY * dt * 0.85, -0.48, 0.65);
			p.zoom = !!c.zoom;
			if (p.station === "pilot") p.look = [p.aim.yaw, p.aim.pitch];
			if (BEARINGS[p.station] !== undefined && c.fire)
				this.fireGun(p.station, p, dt);
		}
		for (const [k, m] of Object.entries(s.mounts)) {
			m.cool = Math.max(0, m.cool - dt);
			m.recoil = Math.max(0, m.recoil - dt * 8);
			if (s.owners[k] === "AI" && !m.jammed && m.ammo > 0) {
				this.aiCool[k] = (this.aiCool[k] || 0) - dt;
				const e = s.enemies.find((e) => e.alive && e.bearing === k && e.t > 10);
				if (e && this.aiCool[k] <= 0) {
					this.aiCool[k] = 1.5;
					m.ammo--;
					e.suppression = Math.min(0.8, e.suppression + 0.1);
					if (this.random() < 0.09) this.hitFighter(e);
					this.emit("ai-gun", { station: k });
				}
			}
		}
	}
	updateFighters(dt) {
		const s = this.state,
			a = s.aircraft;
		for (const e of s.enemies) {
			e.t += dt;
			if (!e.alive) continue;
			e.cool -= dt;
			e.suppression = Math.max(0, e.suppression - dt * 0.025);
			let range;
			if (e.t < 6) {
				e.phase = "approach";
				range = 20000 - e.t * 900;
			} else if (e.t < 25) {
				e.phase = "attack";
				range =
					e.pattern === "pursuit"
						? 6500
						: Math.max(4500, 14600 - (e.t - 6) * 550);
			} else {
				e.phase = "disengage";
				range = 4500 + (e.t - 25) * 1900;
			}
			const by = BEARINGS[e.bearing] + Math.sin(e.t * 0.45) * 0.2,
				vec = localVector(a.yaw + by, range, Math.sin(e.t * 0.8) * 700),
				nx = a.x + vec.x,
				ny = a.y + vec.y,
				nz = a.z + Math.sin(e.t * 0.7) * 700 + 400;
			e.vx = (nx - e.x) / dt;
			e.vy = (ny - e.y) / dt;
			e.vz = (nz - e.z) / dt;
			e.x = nx;
			e.y = ny;
			e.z = nz;
			e.yaw = Math.atan2(a.y - e.y, a.x - e.x);
			e.bank = Math.sin(e.t * 0.9) * 0.45;
			if (e.phase === "attack" && e.cool <= 0) {
				e.cool = 3.3 + this.random() * 2;
				const lead = 0.45,
					dx = a.x + Math.cos(a.yaw) * a.speed * lead - e.x,
					dy = a.y + Math.sin(a.yaw) * a.speed * lead - e.y,
					dz = a.z - e.z,
					d = Math.hypot(dx, dy, dz),
					v = 650 * U,
					spread =
						(1 -
							this.balance.enemyAccuracy *
								DIFFICULTIES[s.difficulty].accuracy) *
						1800;
				const ox = (this.random() - 0.5) * spread,
					oy = (this.random() - 0.5) * spread;
				s.shots.push({
					x: e.x,
					y: e.y,
					z: e.z,
					px: e.x,
					py: e.y,
					pz: e.z,
					vx: ((dx + ox) / d) * v,
					vy: ((dy + oy) / d) * v,
					vz: (dz / d) * v,
					life: 3,
					team: "enemy",
					suppressed: e.suppression > 0.4,
				});
			}
			if (e.t > 34) {
				e.alive = false;
				this.emit("disengage", { enemy: e.id });
			}
		}
	}
	updateShots(dt) {
		const s = this.state,
			a = s.aircraft;
		for (const b of s.shots) {
			const prev = { x: b.x, y: b.y, z: b.z };
			b.px = b.x;
			b.py = b.y;
			b.pz = b.z;
			b.x += b.vx * dt;
			b.y += b.vy * dt;
			b.z += b.vz * dt;
			b.life -= dt;
			if (b.team === "crew") {
				for (const e of s.enemies)
					if (e.alive && segmentHit(prev, b, e, e.r + 40)) {
						this.hitFighter(e);
						s.hits++;
						b.life = 0;
						break;
					}
			} else if (segmentHit(prev, b, a, 230)) {
				if (!b.suppressed) this.damage(3.5);
				else this.emit("near-miss");
				b.life = 0;
			}
		}
		s.shots = s.shots.filter((b) => b.life > 0 && b.z > 0);
	}
	updateBombs(dt) {
		const s = this.state;
		for (const b of s.bombs) {
			if (b.delay > 0) {
				b.delay -= dt;
				continue;
			}
			bombIntegrate(b, dt, this.wind());
			if (b.z <= 0 && !b.hit) {
				b.hit = true;
				b.z = 0;
				let hit = false;
				for (const t of s.targets)
					if (t.alive) {
						const dist = Math.hypot(t.x - b.x, t.y - b.y);
						if (dist < t.r + 420) {
							const dmg = dist < t.r * 0.6 ? 2 : 1;
							t.hp = Math.max(0, t.hp - dmg);
							hit = true;
							s.missionHits++;
							this.emit("target-hit", { target: t.id, damage: dmg });
							if (!t.hp) {
								t.alive = false;
								s.score += t.value;
								this.emit("target-destroyed", { target: t.id });
								if (t.primary) {
									s.primary = true;
									this.say(
										"bombardier",
										"Transport destroyed! Primary complete. Choose home or the refinery.",
										true,
									);
								} else this.say("bombardier", t.label + " destroyed.");
							}
						}
					}
				if (!hit) s.wasted++;
				s.effects.push({
					kind: "explosion",
					x: b.x,
					y: b.y,
					z: 0,
					age: 0,
					size: hit ? 2400 : 1200,
				});
				s.lastImpact = { x: b.x, y: b.y, hit, at: s.t };
				this.emit("impact", { x: b.x, y: b.y, hit });
				if (!hit)
					this.say(
						"bombardier",
						s.bombsLeft
							? "Splash wide. Circle for another pass or go home."
							: "No ordnance remaining. Recommend home.",
					);
			}
		}
		s.bombs = s.bombs.filter((b) => !b.hit);
	}
	updateFlak(dt) {
		const s = this.state,
			a = s.aircraft;
		const battery = s.targets.find((t) => t.id === "battery"),
			near = a.x > 240000 && a.x < 390000 && s.phase !== "landing";
		this.flakCool -= dt;
		if (
			near &&
			battery?.alive &&
			this.flakCool <= 0 &&
			s.flak.filter((f) => !f.burst).length < 2
		) {
			this.spawnFlak();
			this.flakCool =
				(12 + this.random() * 4) *
				(s.routeChoice === "dogleg" && a.x < 310000 ? 1.8 : 1);
		}
		for (const f of s.flak) {
			f.age += dt;
			if (!f.burst) {
				f.timer -= dt;
				if (f.timer <= 0) {
					f.burst = true;
					f.age = 0;
					const d = Math.hypot(a.x - f.x, a.y - f.y, (a.z - f.z) * 1.3);
					if (d < f.r) this.damage(8 * (1 - d / f.r) + 3);
					else this.emit("flak-evaded");
					this.emit("flak-burst", { x: f.x, y: f.y, z: f.z });
				}
			}
		}
	}
	updateMission(dt) {
		const s = this.state,
			a = s.aircraft;
		if (s.phase === "launch" && a.airborne && s.t > 22) {
			s.phase = "outbound";
			this.emit("phase", { phase: s.phase });
		}
		for (const wave of this.definition.encounters)
			if (
				a.x > wave.x &&
				!this.encounterSet.has(wave.id) &&
				s.phase !== "return" &&
				s.enemies.filter((e) => e.alive).length < 2
			) {
				this.encounterSet.add(wave.id);
				this.spawnFighter(wave.bearing, wave.pattern);
				break;
			}
		if (s.phase === "outbound" && a.x > 240000) {
			s.phase = "coast";
			this.say(
				"bombardier",
				"Enemy coast. Greyhaven is ahead. Open the sight when ready.",
				true,
			);
			this.emit("phase", { phase: s.phase });
		}
		if (["coast", "outbound"].includes(s.phase) && a.x > 300000) {
			s.phase = "strike";
			this.say(
				"bombardier",
				"Bomb run. Keep the impact ring on the transport. Fire releases the selected salvo.",
				true,
			);
			this.emit("phase", { phase: s.phase });
		}
		if (
			s.route.target === "dogleg" &&
			Math.hypot(a.x - s.route.x, a.y - s.route.y) < 6500
		) {
			s.route = { ...this.definition.waypoints.harbor, target: "harbor" };
			this.say("pilot", "Dogleg complete. Turning toward Greyhaven.");
		}
		if (
			s.route.target === "harbor" &&
			a.x > 355000 &&
			!s.primary &&
			!s.autoPass
		) {
			s.autoPass = true;
			s.aircraft.holdMode = "course";
			s.aircraft.holdYaw = a.yaw;
			this.say(
				"bombardier",
				"Target astern. Map: another pass, refinery, or home.",
				true,
			);
		}
		if (
			s.route.target === "home" &&
			s.phase !== "landing" &&
			Math.hypot(a.x, a.y) < 15000 &&
			s.t > 25
		) {
			s.phase = "landing";
			s.landingT = 0;
			s.landingStart = { x: a.x, y: a.y, z: a.z, yaw: a.yaw, speed: a.speed };
			s.aircraft.hold = true;
			for (const e of s.enemies) e.alive = false;
			s.shots = [];
			this.emit("recovery");
			this.say(
				"pilot",
				"Rookfield in sight. Ground crew has us. Welcome home.",
			);
		}
		if (
			s.phase === "return" &&
			!this.encounterSet.has("return-tail") &&
			a.x < 245000 &&
			a.x > 180000
		) {
			this.encounterSet.add("return-tail");
			this.spawnFighter("tail", "pursuit");
		}
		if (s.phase === "landing") {
			s.landingT += dt;
			const q = s.landingStart,
				u = clamp(s.landingT / 12, 0, 1),
				k = u * u * (3 - 2 * u);
			a.gear = Math.min(1, a.gear + dt * 0.4);
			a.x = q.x + (-1800 - q.x) * k;
			a.y = q.y * (1 - k);
			a.z = q.z + (80 - q.z) * k;
			a.yaw = angle(q.yaw + angle(Math.PI - q.yaw) * k);
			a.bank *= Math.max(0, 1 - dt * 3);
			a.pitch = -0.07 * Math.sin(u * Math.PI);
			a.speed = q.speed * (1 - u * u);
			if (s.landingT >= 12) {
				a.x = -1800;
				a.y = 0;
				a.z = 80;
				a.speed = 0;
				a.pitch = 0;
				a.bank = 0;
				a.airborne = false;
				a.gear = 1;
				s.returned = true;
				this.result(s.primary ? "success" : "abort");
			}
		}
		const remaining =
				a.fuel /
				Math.max(0.1, (0.6 + a.throttle * 0.55) * this.balance.fuelConsumption),
			homeTime = Math.hypot(a.x, a.y) / Math.max(a.speed, 700) + 45;
		s.reserve = Math.max(0, remaining - homeTime);
		s.warning = a.fire
			? "ENGINE FIRE · EXTINGUISH"
			: a.stall
				? "STALL · ADD POWER"
				: a.fuel / a.maxFuel < 0.25
					? "LOW FUEL · RETURN"
					: s.flak.some((f) => !f.burst)
						? "FLAK · CHANGE COURSE"
						: s.enemies.some((e) => e.alive && e.phase === "attack")
							? "FIGHTERS ATTACKING"
							: null;
	}
	result(reason = "timeup") {
		const s = this.state;
		if (s.result) return s.result;
		const a = s.aircraft,
			success = s.primary && s.returned,
			outcome = success
				? "MISSION COMPLETE"
				: s.returned
					? "CREW RECOVERED"
					: s.primary
						? "PRIMARY DESTROYED"
						: "SORTIE ENDED";
		const damage = Math.round((100 - a.hull) * 4),
			accuracy = s.bombsDropped
				? Math.round((s.missionHits / s.bombsDropped) * 100)
				: 0,
			returnBonus = s.returned ? 1500 : 0,
			penalty = s.wasted * 75,
			total = Math.max(
				0,
				s.score + returnBonus + Math.round(accuracy * 3) - damage - penalty,
			);
		s.result = {
			reason,
			outcome,
			win: success,
			score: total,
			stats: {
				primary: s.primary,
				returned: s.returned,
				kills: s.kills,
				bombs: s.bombsDropped,
				hits: s.missionHits,
				accuracy,
				damagePenalty: damage,
				wastedPenalty: penalty,
				returnBonus,
				fuel: Math.round((a.fuel / a.maxFuel) * 100),
				duration: Math.round(s.t),
			},
			cheated: s.cheated,
			practice: s.practice,
		};
		s.phase = "debrief";
		s.shots = [];
		s.enemies = [];
		this.emit("result", { reason, score: total });
		return s.result;
	}
	snapshot() {
		return copy(this.state);
	}
	loadSnapshot(s) {
		if (s && s.version === 1 && Number.isFinite(s.tick) && s.aircraft)
			this.state = copy(s);
	}
	startPractice(kind) {
		const s = this.state,
			a = s.aircraft;
		a.airborne = true;
		a.speed = 1120;
		a.throttle = 0.84;
		a.z = 900 * U;
		a.gear = 0;
		s.t = 50;
		s.phase = "outbound";
		if (kind === "gunnery") {
			a.x = 80000;
			this.spawnFighter("nose", "headon");
			this.say(
				"gunner",
				"Practice: take a mount, aim at the lead ring, fire short bursts. All four bearings will call.",
			);
		} else if (kind === "bombing") {
			a.x = 312000;
			a.y = 18000;
			a.yaw = 0;
			s.phase = "strike";
			this.claim(s.players[0].id, "bombs");
			s.doorsOpen = true;
			a.doors = 1;
			this.say(
				"bombardier",
				"Calibration: ring is predicted impact. Release over the ship.",
			);
		} else if (kind === "return") {
			a.x = 75000;
			a.y = 5000;
			a.yaw = Math.PI;
			a.hull = 48;
			a.fuel = 240;
			this.applySystem("fire");
			this.applySystem("sight");
			s.phase = "return";
			s.route = { ...this.definition.waypoints.home, target: "home" };
			this.say(
				"engineer",
				"Damaged return. Extinguish the fire, jettison if needed, bring her home.",
				true,
			);
		}
	}
	dev(action, value) {
		const s = this.state;
		s.cheated = true;
		if (action === "invulnerable") s.invulnerable = !!value;
		else if (action === "infinite") s.infinite = !!value;
		else if (action === "damage") this.applySystem(value);
		else if (action === "repair") this.clearDamage();
		else if (action === "fighter")
			this.spawnFighter(
				value || "nose",
				value === "tail" ? "pursuit" : "cross",
			);
		else if (action === "flak") this.spawnFlak();
		else if (action === "jump") {
			const a = s.aircraft;
			a.airborne = true;
			a.gear = 0;
			a.z = 900 * U;
			a.speed = 1120;
			a.throttle = 0.84;
			a.yaw = 0;
			a.bank = 0;
			a.pitch = 0;
			a.hold = true;
			a.holdMode = "route";
			if (value === "home") {
				a.x = 10000;
				a.y = 0;
				a.yaw = Math.PI;
				s.route = { ...this.definition.waypoints.home, target: "home" };
				s.phase = "return";
			} else if (value === "bomb") {
				a.x = 312000;
				a.y = 18000;
				s.phase = "strike";
				s.route = { ...this.definition.waypoints.harbor, target: "harbor" };
				s.doorsOpen = true;
				a.doors = 1;
			} else if (value === "coast") {
				a.x = 252000;
				a.y = 0;
				s.phase = "coast";
			} else {
				a.x = 80000;
				a.y = 0;
				s.phase = "outbound";
			}
		} else if (action === "fuel")
			s.aircraft.fuel = clamp(value, 0, s.aircraft.maxFuel);
		return s;
	}
	exportMission() {
		return JSON.stringify(this.definition, null, 2);
	}
	importMission(text) {
		const m = typeof text === "string" ? JSON.parse(text) : text,
			errors = validateMission(m);
		if (errors.length) throw Error(errors.join("; "));
		this.definition = copy(m);
		return true;
	}
}
