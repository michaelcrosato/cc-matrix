export const DEFAULTS = Object.freeze({
	shipSpeed: 8.2,
	meteorSpeed: 1,
	spawnRate: 1,
	beamRate: 1,
	damage: 1,
	fuelDrain: 1,
	rescueTime: 48,
	pulseCooldown: 7,
});
export const PLANETS = [
	{
		name: "Mossglass",
		species: "Pom-poms",
		subtitle: "A tiny world. Two very big ears.",
		color: "#9ddd9c",
		call: "The sun is fading. Bring the little ones home!",
	},
	{
		name: "Emberloom",
		species: "Cinderpips",
		subtitle: "Warm hearts. Extremely cold feet.",
		color: "#ffb572",
		call: "Ancient sentries are waking. Mind their warning lights!",
	},
	{
		name: "Tidebell",
		species: "Moonjellies",
		subtitle: "The last pair beneath a falling star.",
		color: "#bba8f7",
		call: "One last world. No beastie left behind!",
	},
];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const norm = (x, y) => {
	const d = Math.hypot(x, y) || 1;
	return { x: x / d, y: y / d };
};
const groups = (a, b) => ((a << 16) | b) >>> 0;

export class GameSimulation {
	constructor(R, { onEvent = () => {}, rng = Math.random } = {}) {
		this.R = R;
		this.onEvent = onEvent;
		this.rng = rng;
		this.params = { ...DEFAULTS };
		this.god = false;
		this.auto = false;
		this.reset();
	}
	reset(attract = false) {
		if (this.world) this.world.free();
		if (this.queue) this.queue.free();
		const R = this.R;
		this.world = new R.World({ x: 0, y: 0, z: 0 });
		this.world.timestep = 1 / 60;
		this.queue = new R.EventQueue(true);
		this.lookup = new Map();
		this.nextId = 1;
		this.state = {
			phase: "defense",
			time: 0,
			phaseTime: 0,
			planet: 0,
			fuel: 100,
			score: 0,
			saved: 0,
			cargo: 0,
			combo: 0,
			bestCombo: 0,
			shots: 0,
			hits: 0,
			damageTaken: 0,
			ark: { x: 0, y: 0 },
			ship: { x: 0, y: 3, vx: 0, vy: 0 },
			aim: { x: 0, y: 1 },
			beam: false,
			shield: 0,
			pulse: 0,
			invulnerable: 0,
			meteors: [],
			bolts: [],
			hazards: [],
			creatures: [],
			docked: [],
			message: "",
			warning: false,
			attract,
			wave: 0,
			ending: false,
		};
		this.fireTimer = 0;
		this.spawnTimer = 1;
		this.hazardTimer = 4;
		this.recall = false;
		this.transition = 0;
		this.arkBody = this.actor("ark", 0, 0, 2.1, 1, 1, 2);
		this.shipBody = this.actor("ship", 0, 3, 0.8, 0.4, 8, 16);
		this.createPair();
		this.event("phase", { phase: "defense" });
	}
	event(type, data = {}) {
		this.onEvent({ type, ...data });
	}
	actor(kind, x, y, hx, hy, member, filter) {
		const R = this.R,
			body = this.world.createRigidBody(
				R.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, 0),
			);
		const col = this.world.createCollider(
			R.ColliderDesc.cuboid(hx, hy, 0.6)
				.setSensor(true)
				.setCollisionGroups(groups(member, filter))
				.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
			body,
		);
		this.lookup.set(col.handle, { kind, body });
		return body;
	}
	moving(kind, data, vx, vy, member, filter) {
		const R = this.R;
		const body = this.world.createRigidBody(
			R.RigidBodyDesc.dynamic()
				.setTranslation(data.x, data.y, 0)
				.setLinvel(vx, vy, 0)
				.setGravityScale(0)
				.lockRotations()
				.enabledTranslations(true, true, false)
				.setCcdEnabled(true),
		);
		const col = this.world.createCollider(
			R.ColliderDesc.ball(data.r || 0.24)
				.setSensor(true)
				.setCollisionGroups(groups(member, filter))
				.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
			body,
		);
		data.id = this.nextId++;
		data._body = body;
		data._collider = col.handle;
		data.kind = kind;
		this.lookup.set(col.handle, data);
		return data;
	}
	remove(list, entity) {
		const i = list.indexOf(entity);
		if (i < 0) return;
		list.splice(i, 1);
		this.lookup.delete(entity._collider);
		if (entity._body) this.world.removeRigidBody(entity._body);
		entity.dead = true;
	}
	clearEntities() {
		for (const name of ["meteors", "bolts", "hazards"])
			for (const e of [...this.state[name]]) this.remove(this.state[name], e);
	}
	createPair() {
		this.state.creatures = [-7.7, 7.7].map((x, i) => ({
			id: 100 + this.state.planet * 2 + i,
			x,
			y: -7.3,
			home: x,
			progress: 0,
			captured: false,
			saved: false,
			seed: this.rng() * 6,
		}));
	}
	setPhase(phase) {
		const s = this.state;
		this.clearEntities();
		s.phase = phase;
		s.phaseTime = 0;
		s.warning = false;
		s.beam = false;
		s.shield = 0;
		s.wave++;
		this.spawnTimer = 1;
		this.hazardTimer = 3.5;
		this.fireTimer = 0;
		s.ark.y = phase === "rescue" || phase === "transit" ? 5 : 0;
		if (phase === "rescue") {
			s.ship.x = 0;
			s.ship.y = 3.3;
			s.ship.vx = 0;
			s.ship.vy = 0;
		}
		this.event("phase", { phase, planet: s.planet });
	}
	spawnMeteor(sideOverride) {
		const s = this.state,
			side = sideOverride ?? Math.floor(this.rng() * 4),
			edge = this.rng() * 1.2 - 0.6;
		let x = 0,
			y = 0;
		if (side === 0) {
			x = -19;
			y = edge * 6;
		}
		if (side === 1) {
			x = 19;
			y = edge * 6;
		}
		if (side === 2) {
			x = edge * 10;
			y = 12;
		}
		if (side === 3) {
			x = edge * 10;
			y = -12;
		}
		const d = norm(-x, -y);
		const waver = s.planet > 0 && this.rng() < 0.32;
		const armored = s.planet === 2 && this.rng() < 0.28;
		const speed =
			(2.6 + s.planet * 0.48 + (s.phase === "escape" ? 1.2 : 0)) *
			this.params.meteorSpeed;
		const e = this.moving(
			"meteor",
			{
				x,
				y,
				r: armored ? 0.77 : 0.55,
				waver,
				armored,
				hp: armored ? 2 : 1,
				side,
				age: 0,
				vx: d.x * speed,
				vy: d.y * speed,
			},
			d.x * speed,
			d.y * speed,
			2,
			1 | 4,
		);
		s.meteors.push(e);
		this.event("meteor", { x, y });
		return e;
	}
	fire(aim) {
		const s = this.state,
			d = norm(aim.x, aim.y);
		if (s.fuel < 0.25) return;
		s.aim = d;
		s.shots++;
		if (!this.god && !s.attract) s.fuel -= 0.18;
		const e = this.moving(
			"bolt",
			{ x: s.ark.x + d.x * 2, y: s.ark.y + d.y * 1.1, r: 0.24, age: 0 },
			d.x * 39,
			d.y * 39,
			4,
			2,
		);
		s.bolts.push(e);
		this.event("shoot", { x: e.x, y: e.y });
	}
	damage(amount, target = "ark") {
		const s = this.state;
		if (this.god || s.attract || s.invulnerable > 0 || s.shield > 0)
			return false;
		const loss = amount * this.params.damage;
		s.fuel -= loss;
		s.damageTaken += loss;
		s.combo = 0;
		s.invulnerable = 1.7;
		if (target === "ship") {
			const c = s.creatures.find((c) => c.captured && !c.saved);
			if (c) {
				c.captured = false;
				c.progress = 0;
				c.x = s.ship.x;
				c.home = s.ship.x;
				s.cargo--;
				this.event("drop", { x: c.x, y: c.y });
			}
		}
		this.event("hit", {
			target,
			x: target === "ship" ? s.ship.x : s.ark.x,
			y: target === "ship" ? s.ship.y : s.ark.y,
		});
		return true;
	}
	pulse() {
		const s = this.state;
		if (s.pulse > 0 || s.fuel < 3) return false;
		s.pulse = this.params.pulseCooldown;
		s.shield = 1.25;
		if (!this.god && !s.attract) s.fuel -= 3;
		const center = s.phase === "rescue" ? s.ship : s.ark;
		for (const e of [...s.meteors])
			if (Math.hypot(e.x - center.x, e.y - center.y) < 7) {
				this.destroyMeteor(e, false);
			}
		for (const e of [...s.hazards])
			if (Math.hypot(e.x - center.x, e.y - center.y) < 8)
				this.remove(s.hazards, e);
		this.event("shield", { x: center.x, y: center.y });
		return true;
	}
	destroyMeteor(e, scored = true) {
		if (e.dead) return;
		const s = this.state;
		if (scored) {
			s.combo++;
			s.bestCombo = Math.max(s.bestCombo, s.combo);
			s.hits++;
			s.score +=
				(e.waver ? 60 : e.armored ? 90 : 30) *
				Math.min(4, 1 + Math.floor(s.combo / 6));
			s.fuel = clamp(s.fuel + 0.35, 0, 100);
		}
		this.event("explode", { x: e.x, y: e.y, armored: e.armored });
		this.remove(s.meteors, e);
	}
	collision(a, b) {
		if (!a || !b || a.dead || b.dead) return;
		if (a.kind === "meteor" && b.kind === "bolt") {
			this.remove(this.state.bolts, b);
			if (--a.hp <= 0) this.destroyMeteor(a);
			else this.event("spark", { x: a.x, y: a.y });
		} else if (a.kind === "meteor" && b.kind === "ark") {
			this.damage(15);
			this.destroyMeteor(a, false);
		} else if (a.kind === "hazard" && b.kind === "ship") {
			this.damage(12, "ship");
			this.event("explode", { x: a.x, y: a.y });
			this.remove(this.state.hazards, a);
		}
	}
	spawnHazard() {
		const s = this.state,
			side = this.rng() < 0.5 ? -1 : 1,
			y = clamp(s.ship.y, -6.5, 1.6);
		s.hazards.push({
			id: this.nextId++,
			kind: "warning",
			x: side * 15.7,
			y,
			age: 0,
			side,
			dead: false,
		});
	}
	capture(c) {
		const s = this.state;
		c.captured = true;
		c.progress = 1;
		s.cargo++;
		s.fuel = clamp(s.fuel + 12, 0, 100);
		s.score += 250;
		this.event("rescue", {
			x: c.x,
			y: s.ship.y,
			species: PLANETS[s.planet].species,
		});
	}
	dock() {
		const s = this.state;
		if (!s.cargo) return false;
		for (const c of s.creatures)
			if (c.captured && !c.saved) {
				c.saved = true;
				s.saved++;
			}
		const all = s.creatures.every((c) => c.saved);
		s.score += s.cargo * 350 + (all ? 500 : 0);
		s.cargo = 0;
		s.fuel = clamp(s.fuel + 20, 0, 100);
		s.docked[s.planet] = s.creatures.filter((c) => c.saved).length;
		this.event("dock", { all, saved: s.saved });
		if (all) {
			this.setPhase("transit");
			this.recall = false;
		}
		return true;
	}
	finish(won) {
		if (this.state.ending) return;
		this.state.ending = true;
		this.state.phase = won ? "win" : "lose";
		this.state.beam = false;
		this.event(won ? "win" : "lose", { score: this.state.score });
	}
	autopilot() {
		const s = this.state;
		if (s.phase === "defense" || s.phase === "escape") {
			const m = [...s.meteors].sort(
				(a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y),
			)[0];
			return {
				aimX: m ? m.x : 0,
				aimY: m ? m.y : 1,
				fire: !!m,
				pulse: s.meteors.some((m) => Math.hypot(m.x, m.y) < 3.4),
			};
		}
		if (s.phase === "rescue") {
			const target = s.creatures.find((c) => !c.captured && !c.saved);
			const tx = target ? target.x : 0,
				ty = target ? -3.8 : 4.8;
			return {
				x: clamp((tx - s.ship.x) * 1.6, -1, 1),
				y: clamp((ty - s.ship.y) * 1.6, -1, 1),
				beam: !!target,
				pulse: s.hazards.some(
					(h) =>
						h.kind === "hazard" &&
						Math.hypot(h.x - s.ship.x, h.y - s.ship.y) < 4,
				),
			};
		}
		return {};
	}
	step(dt, input = {}) {
		const s = this.state;
		if (s.ending) return;
		if (this.auto || s.attract) input = this.autopilot();
		s.time += dt;
		s.phaseTime += dt;
		s.pulse = Math.max(0, s.pulse - dt);
		s.shield = Math.max(0, s.shield - dt);
		s.invulnerable = Math.max(0, s.invulnerable - dt);
		if (!this.god && !s.attract) s.fuel -= dt * 0.12 * this.params.fuelDrain;
		if (s.fuel <= 0) {
			s.fuel = 0;
			this.finish(false);
			return;
		}
		if (input.pulse) this.pulse();
		if (s.phase === "defense" || s.phase === "escape") {
			this.fireTimer -= dt;
			this.spawnTimer -= dt;
			if (
				input.fire &&
				Math.hypot(input.aimX || 0, input.aimY || 0) > 0.1 &&
				this.fireTimer <= 0
			) {
				this.fire({ x: input.aimX, y: input.aimY });
				this.fireTimer = 0.19;
			}
			const duration =
				s.phase === "escape" ? 21 : this.recall ? 9 : 17 + s.planet * 2;
			if (this.spawnTimer <= 0 && s.phaseTime < duration - 3) {
				this.spawnMeteor();
				this.spawnTimer =
					(1.6 - s.planet * 0.21 - (s.phase === "escape" ? 0.3 : 0)) /
					this.params.spawnRate;
			}
			if (s.phaseTime >= duration && s.meteors.length === 0) {
				if (s.phase === "escape") {
					this.finish(true);
					return;
				}
				this.setPhase("rescue");
			}
		} else if (s.phase === "transit") {
			if (s.phaseTime > 3.2) {
				s.planet++;
				if (s.planet >= 3) {
					s.planet = 2;
					this.setPhase("escape");
				} else {
					this.createPair();
					this.setPhase("defense");
				}
			}
		} else if (s.phase === "rescue") {
			const speed = this.params.shipSpeed;
			let ix = input.x || 0,
				iy = input.y || 0;
			const mag = Math.hypot(ix, iy);
			if (mag > 1) {
				ix /= mag;
				iy /= mag;
			}
			s.ship.vx += (ix * speed - s.ship.vx) * Math.min(1, dt * 10);
			s.ship.vy += (iy * speed - s.ship.vy) * Math.min(1, dt * 10);
			s.ship.x = clamp(s.ship.x + s.ship.vx * dt, -14.4, 14.4);
			s.ship.y = clamp(s.ship.y + s.ship.vy * dt, -5.6, 5.2);
			s.beam = !!input.beam;
			for (const c of s.creatures) {
				if (c.captured || c.saved) continue;
				const aligned =
					s.beam && Math.abs(c.x - s.ship.x) < 1.5 && s.ship.y < -1.1;
				if (aligned) {
					c.progress = Math.min(
						1,
						c.progress + dt * 0.55 * this.params.beamRate,
					);
					if (c.progress >= 1) this.capture(c);
				} else {
					c.progress = Math.max(0, c.progress - dt * 0.8);
					c.x = c.home + Math.sin(s.time * 0.85 + c.seed) * 1.1;
				}
			}
			if (Math.hypot(s.ship.x, s.ship.y - 4.5) < 1.5 && s.cargo > 0)
				this.dock();
			this.hazardTimer -= dt;
			if (this.hazardTimer <= 0) {
				this.spawnHazard();
				this.hazardTimer = 5.3 - s.planet * 0.8;
			}
			if (
				s.planet === 2 &&
				s.phaseTime > 8 &&
				Math.sin(s.phaseTime * 0.9) > 0.998
			) {
				this.event("storm", { x: s.ship.x, y: s.ship.y });
			}
			const remain = this.params.rescueTime - s.phaseTime;
			if (remain < 12 && !s.warning) {
				s.warning = true;
				this.event("warning");
			}
			if (remain <= 0) {
				for (const c of s.creatures)
					if (c.captured && !c.saved) {
						c.captured = false;
						c.progress = 0;
					}
				s.cargo = 0;
				this.damage(8);
				this.recall = true;
				this.setPhase("defense");
				this.event("recall");
			}
		}
		this.arkBody.setNextKinematicTranslation({ x: s.ark.x, y: s.ark.y, z: 0 });
		this.shipBody.setNextKinematicTranslation({
			x: s.ship.x,
			y: s.ship.y,
			z: 0,
		});
		for (const e of s.meteors) {
			e.age += dt;
			if (e.waver) {
				const wob = Math.sin(e.age * 4) * 1.6;
				const d = norm(e.vx, e.vy);
				e._body.setLinvel(
					{ x: e.vx - d.y * wob, y: e.vy + d.x * wob, z: 0 },
					true,
				);
			}
		}
		for (const h of [...s.hazards]) {
			h.age += dt;
			if (h.kind === "warning" && h.age > 1.25) {
				s.hazards.splice(s.hazards.indexOf(h), 1);
				const speed = 7 + s.planet;
				const bolt = this.moving(
					"hazard",
					{ x: h.x, y: h.y, r: 0.32, age: 0, side: h.side },
					-h.side * speed,
					0,
					16,
					8,
				);
				s.hazards.push(bolt);
				this.event("sentry", { x: h.x, y: h.y });
			}
		}
		this.world.step(this.queue);
		this.queue.drainCollisionEvents((h1, h2, started) => {
			if (!started) return;
			const a = this.lookup.get(h1),
				b = this.lookup.get(h2);
			this.collision(a, b);
			this.collision(b, a);
		});
		for (const list of [s.meteors, s.bolts, s.hazards])
			for (const e of [...list]) {
				if (!e._body) continue;
				const p = e._body.translation();
				e.x = p.x;
				e.y = p.y;
				if (Math.abs(e.x) > 24 || Math.abs(e.y) > 17) this.remove(list, e);
			}
		s.fuel = clamp(s.fuel, 0, 100);
	}
	snapshot() {
		return JSON.parse(
			JSON.stringify(this.state, (k, v) => (k.startsWith("_") ? undefined : v)),
		);
	}
	dispose() {
		this.world.free();
		this.queue.free();
	}
}
