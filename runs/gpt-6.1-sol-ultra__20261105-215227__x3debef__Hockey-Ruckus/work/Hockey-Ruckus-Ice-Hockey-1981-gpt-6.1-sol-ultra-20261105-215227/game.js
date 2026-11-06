import RAPIER from "@dimforge/rapier3d-compat";

export const DEFAULTS = Object.freeze({
	skateSpeed: 8.6,
	shotPower: 26,
	puckDrag: 0.18,
	checkPower: 1,
	aiSkill: 0.66,
	clockSpeed: 1,
});
export const ARENAS = [
	{
		name: "THE DOCKYARD",
		team: "DOCK RATS",
		tag: "Find your sea legs.",
		time: 60,
		skill: 0.43,
		turbo: false,
	},
	{
		name: "THE FOUNDRY",
		team: "HOT SHOTS",
		tag: "The boards bite back.",
		time: 75,
		skill: 0.65,
		turbo: false,
	},
	{
		name: "MIDNIGHT ICE",
		team: "NIGHT OWLS",
		tag: "Fast ice. Last chance.",
		time: 90,
		skill: 0.83,
		turbo: true,
	},
];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function shotVector(player, input = {}, elapsed = 0) {
	const sign = player.team ? -1 : 1;
	let x = input.aimX || 0,
		z = input.aimZ || 0;
	if (!x && !z) {
		x = sign * 10;
		z = clamp(-player.z * 0.64, -4, 4) + Math.sin(elapsed * 5) * 0.6;
	}
	let angle = clamp(Math.atan2(z, Math.abs(x || 1)), -1.14, 1.14);
	angle = Math.round((angle + 1.14) / (2.28 / 31)) * (2.28 / 31) - 1.14;
	return { x: Math.cos(angle) * sign, z: Math.sin(angle) };
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const emptyInput = () => ({
	x: 0,
	z: 0,
	aimX: 0,
	aimZ: 0,
	shoot: false,
	pass: false,
	check: false,
	switch: false,
});
export class HockeyGame {
	static async init() {
		await RAPIER.init();
	}
	constructor(event = () => {}) {
		this.event = event;
		this.params = { ...DEFAULTS };
		this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		this.world.timestep = 1 / 60;
		const wall = (x, z, hx, hz) =>
			this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(hx, 1, hz)
					.setTranslation(x, 0.25, z)
					.setRestitution(0.9)
					.setFriction(0),
			);
		wall(0, -10.25, 18.5, 0.25);
		wall(0, 10.25, 18.5, 0.25);
		for (const s of [-1, 1]) {
			wall(s * 18.25, -6.5, 0.25, 3.5);
			wall(s * 18.25, 6.5, 0.25, 3.5);
			wall(s * 20.25, 0, 0.25, 3);
			wall(s * 19, 3.15, 1.25, 0.15);
			wall(s * 19, -3.15, 1.25, 0.15);
		}
		this.body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(0, 0.25, 0)
				.setGravityScale(0)
				.setLinearDamping(0.18)
				.setCcdEnabled(true)
				.enabledTranslations(true, false, true)
				.lockRotations(),
		);
		this.world.createCollider(
			RAPIER.ColliderDesc.cylinder(0.16, 0.32)
				.setRestitution(0.92)
				.setFriction(0)
				.setDensity(0.2),
			this.body,
		);
		this.players = [];
		for (let t = 0; t < 2; t++)
			for (let j = 0; j < 2; j++) {
				const rb = this.world.createRigidBody(
					RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
						0,
						0.55,
						0,
					),
				);
				this.world.createCollider(
					RAPIER.ColliderDesc.cylinder(0.5, 0.58)
						.setRestitution(0.3)
						.setFriction(0),
					rb,
				);
				this.players.push({
					x: 0,
					z: 0,
					vx: 0,
					vz: 0,
					team: t,
					index: t * 2 + j,
					slot: j,
					angle: t ? Math.PI : 0,
					speed: 0,
					stun: 0,
					active: false,
					hasPuck: false,
					action: "",
					actionId: 0,
					cooldown: 0,
					charge: 0,
					held: 0,
					rb,
				});
			}
		this.reset({ mode: "attract", ai: [true, true], time: 180 });
	}
	reset(options = {}) {
		this.mode = options.mode || "exhibition";
		this.round = options.round || 0;
		this.theme = options.theme ?? this.round;
		this.turbo = !!options.turbo;
		this.ai = options.ai || [false, true];
		this.training = this.mode === "practice";
		this.trainingStep = 0;
		this.trainingMoved = 0;
		this.seconds = options.time ?? 180;
		this.elapsed = 0;
		this.scores = [0, 0];
		this.selected = [1, 3];
		this.phase = "faceoff";
		this.phaseTime = 2.4;
		this.winner = -1;
		this.suddenDeath = false;
		this.params.aiSkill = options.skill ?? DEFAULTS.aiSkill;
		this.stats = [0, 1].map(() => ({
			shots: 0,
			passes: 0,
			checks: 0,
			saves: 0,
			boards: 0,
			possession: 0,
		}));
		this.lastTeam = -1;
		this.owner = -1;
		this.noPickup = 0;
		this.lastShooter = -1;
		this.banks = 0;
		this.lastBoard = 0;
		this.switchLock = [0, 0];
		this.pressed = [emptyInput(), emptyInput()];
		this.faceoff();
		if (this.training) {
			this.phase = "play";
			this.setupTraining();
		}
		return this;
	}
	faceoff() {
		this.owner = -1;
		this.noPickup = 0.2;
		this.body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
		this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		for (const p of this.players) {
			const s = p.team ? -1 : 1;
			p.x = p.slot ? -s * 2.1 : -s * 13.5;
			p.z = p.slot ? (p.team ? 1.1 : -1.1) : 0;
			p.vx = p.vz = p.speed = p.stun = p.charge = p.held = p.cooldown = 0;
			p.hasPuck = false;
			p.angle = p.team ? Math.PI : 0;
			p.rb.setTranslation({ x: p.x, y: 0.55, z: p.z }, true);
			p.rb.setNextKinematicTranslation({ x: p.x, y: 0.55, z: p.z });
		}
		this.selected = [1, 3];
		this.puck = { x: 0, z: 0, vx: 0, vz: 0 };
	}
	setupTraining() {
		this.faceoff();
		const step = this.trainingStep,
			p = this.players[1];
		p.x =
			step === 0 ? -4 : step === 1 ? -8 : step === 2 ? 8 : step === 3 ? 3 : 11;
		p.z = step === 3 ? 1 : 0;
		this.players[0].x = step === 1 ? 1 : -14;
		this.players[0].z = -4;
		this.players[2].x = step === 4 ? 15 : 15;
		this.players[2].z = step === 4 ? 7 : 4.5;
		this.players[3].x = step === 3 ? 5 : 11;
		this.players[3].z = step === 3 ? 1 : -7;
		for (const k of this.players) {
			k.rb.setTranslation({ x: k.x, y: 0.55, z: k.z }, true);
			k.rb.setNextKinematicTranslation({ x: k.x, y: 0.55, z: k.z });
		}
		this.takePuck(step === 3 ? 3 : 1);
		this.noPickup = 0;
		this.event("training", { step });
	}
	advanceTraining() {
		this.trainingStep++;
		this.event("lesson", { step: this.trainingStep });
		if (this.trainingStep >= 5) {
			this.phase = "final";
			this.winner = 0;
			this.event("final", { winner: 0, practice: true });
		} else {
			this.setupTraining();
		}
	}
	takePuck(i) {
		this.owner = i;
		const p = this.players[i];
		p.held = 0;
		this.selected[p.team] = i;
		this.lastTeam = p.team;
		this.banks = 0;
		this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		this.event("pickup", { x: p.x, z: p.z, team: p.team });
	}
	action(p, name) {
		p.action = name;
		p.actionId++;
	}
	release(p, ax, az, power, type) {
		const l = Math.hypot(ax, az) || 1;
		ax /= l;
		az /= l;
		this.owner = -1;
		p.hasPuck = false;
		p.charge = 0;
		p.held = 0;
		this.noPickup = 0.2;
		this.lastShooter = p.index;
		this.lastTeam = p.team;
		this.banks = 0;
		this.body.setTranslation(
			{ x: p.x + ax * 1.2, y: 0.25, z: p.z + az * 1.2 },
			true,
		);
		this.body.setLinvel({ x: ax * power, y: 0, z: az * power }, true);
		this.action(p, type);
		this.event(type, { x: p.x, z: p.z, team: p.team, power });
	}
	shoot(p, input = {}) {
		const direction = shotVector(p, input, this.elapsed);
		const power =
			this.params.shotPower *
			(0.66 + 0.65 * clamp(p.charge, 0, 1)) *
			(this.turbo ? 1.25 : 1);
		this.stats[p.team].shots++;
		this.release(p, direction.x, direction.z, power, "shot");
		if (this.training && this.trainingStep === 2 && p.team === 0)
			this.advanceTraining();
	}
	pass(p) {
		const target = this.players[p.team * 2 + (p.slot ? 0 : 1)];
		this.stats[p.team].passes++;
		this.release(
			p,
			target.x - p.x,
			target.z - p.z,
			Math.min(23, Math.max(13, dist(p, target) * 1.9)),
			"pass",
		);
		this.selected[p.team] = target.index;
		this.switchLock[p.team] = 0.8;
		if (this.training && this.trainingStep === 1 && p.team === 0)
			this.advanceTraining();
	}
	check(p) {
		if (p.cooldown > 0 || p.stun > 0) return;
		p.cooldown = 1.1;
		this.action(p, "check");
		this.event("checkSwing", { x: p.x, z: p.z, team: p.team });
		let hit = false;
		for (const q of this.players) {
			if (q.team === p.team || dist(p, q) > 2.8) continue;
			if (q.slot === 0 && Math.abs(q.x) > 13 && Math.abs(q.z) < 3) continue;
			q.stun = 0.9 * this.params.checkPower;
			const dx = q.x - p.x,
				dz = q.z - p.z,
				l = Math.hypot(dx, dz) || 1;
			q.vx = (dx / l) * 10;
			q.vz = (dz / l) * 10;
			if (this.owner === q.index) {
				this.owner = -1;
				this.noPickup = 0.15;
				this.lastTeam = p.team;
				this.body.setLinvel({ x: (dx / l) * 11, y: 0, z: (dz / l) * 11 }, true);
			}
			hit = true;
			this.stats[p.team].checks++;
			this.event("check", { x: q.x, z: q.z, team: p.team });
		}
		if (hit && this.training && this.trainingStep === 3 && p.team === 0)
			this.advanceTraining();
	}
	aiInput(team) {
		const p = this.players[this.selected[team]],
			s = team ? -1 : 1,
			owner = this.players[this.owner],
			skill = this.params.aiSkill;
		let tx = this.puck.x,
			tz = this.puck.z,
			input = emptyInput();
		if (this.owner === p.index) {
			tx = s * 14;
			tz = Math.sin(this.elapsed * 0.8 + team * 2) * 3;
			const goalie = this.players[(1 - team) * 2];
			const targetZ = goalie.z > 0 ? -1.7 : 1.7;
			input.aimX = s * 18 - p.x;
			input.aimZ = targetZ - p.z;
			if ((s * p.x > 5 || p.held > 3) && Math.abs(p.z) < 7) {
				input.shoot = p.held < 0.45 + 0.45 * skill;
				if (!input.shoot && p.charge < 0.01) input.shoot = true;
			}
			if (p.held > 2 && s * p.x < -4 && this.elapsed % 3 < 0.08)
				input.pass = true;
		} else if (owner && owner.team !== team) {
			tx = owner.x + s * 0.2;
			tz = owner.z;
			input.check = dist(p, owner) < 2.5 && Math.sin(this.elapsed * 4) > 0;
		}
		const dx = tx - p.x,
			dz = tz - p.z,
			l = Math.hypot(dx, dz);
		if (l > 0.3) {
			input.x = (dx / l) * (0.72 + skill * 0.28);
			input.z = (dz / l) * (0.72 + skill * 0.28);
		}
		return input;
	}
	score(team) {
		if (this.phase !== "play") return;
		this.scores[team]++;
		this.phase = "goal";
		this.phaseTime = 2.8;
		this.goalTeam = team;
		this.event("goal", {
			team,
			x: team ? -18 : 18,
			z: this.puck.z,
			bank: this.banks > 0,
		});
		this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		if (this.training && this.trainingStep === 4 && team === 0) {
			this.advanceTraining();
			return;
		}
		if (this.suddenDeath) {
			this.winner = team;
			this.phaseTime = 2;
		}
	}
	finish() {
		if (this.scores[0] === this.scores[1]) {
			this.suddenDeath = true;
			this.seconds = 30;
			this.phase = "faceoff";
			this.phaseTime = 2.4;
			this.faceoff();
			this.event("overtime", {});
			return;
		}
		this.winner = this.scores[0] > this.scores[1] ? 0 : 1;
		this.phase = "final";
		this.event("final", { winner: this.winner });
	}
	step(dt, inputs = [emptyInput(), emptyInput()]) {
		dt = Math.min(dt, 0.05);
		this.elapsed += dt;
		this.lastBoard = Math.max(0, this.lastBoard - dt);
		this.noPickup = Math.max(0, this.noPickup - dt);
		for (let t = 0; t < 2; t++)
			this.switchLock[t] = Math.max(0, this.switchLock[t] - dt);
		if (this.phase === "final") return;
		if (this.phase === "faceoff") {
			this.phaseTime -= dt;
			if (this.phaseTime <= 0) {
				this.phase = "play";
				this.event("whistle", {});
			}
			return;
		}
		if (this.phase === "goal") {
			this.phaseTime -= dt;
			if (this.phaseTime <= 0) {
				if (this.suddenDeath) {
					this.finish();
					return;
				}
				this.phase = "faceoff";
				this.phaseTime = 1.5;
				this.faceoff();
			}
			return;
		}
		if (!this.training) {
			this.seconds = Math.max(0, this.seconds - dt * this.params.clockSpeed);
			if (this.seconds <= 0) {
				this.finish();
				return;
			}
		}
		if (this.owner >= 0)
			this.stats[this.players[this.owner].team].possession += dt;
		const currentP = this.body.translation();
		this.puck = {
			x: currentP.x,
			z: currentP.z,
			vx: this.body.linvel().x,
			vz: this.body.linvel().z,
		};
		for (let t = 0; t < 2; t++) {
			const own = this.players[this.owner];
			if (this.switchLock[t] <= 0) {
				if (own?.team === t) this.selected[t] = own.index;
				else {
					const a = this.players[t * 2],
						b = this.players[t * 2 + 1],
						selected = this.players[this.selected[t]];
					const closest = dist(a, this.puck) < dist(b, this.puck) ? a : b;
					if (dist(closest, this.puck) + 1.3 < dist(selected, this.puck))
						this.selected[t] = closest.index;
				}
			}
		}
		const effective = inputs.map((x, t) =>
			this.ai[t] ? this.aiInput(t) : x || emptyInput(),
		);
		for (let t = 0; t < 2; t++) {
			const inp = effective[t],
				prev = this.pressed[t],
				p = this.players[this.selected[t]];
			if (inp.switch && !prev.switch && this.owner < 0) {
				this.selected[t] = t * 2 + (p.slot ? 0 : 1);
				this.switchLock[t] = 1.4;
			}
			if (p.stun <= 0) {
				if (inp.check && !prev.check) this.check(p);
				if (this.owner === p.index) {
					if (inp.pass && !prev.pass) this.pass(p);
					else if (inp.shoot) {
						p.charge = clamp(p.charge + dt * 1.25, 0, 1);
					} else if (prev.shoot || p.charge > 0) this.shoot(p, inp);
				}
			}
			this.pressed[t] = { ...inp };
		}
		for (const p of this.players) {
			const team = p.team,
				s = team ? -1 : 1;
			p.active = this.selected[team] === p.index;
			p.hasPuck = this.owner === p.index;
			p.cooldown = Math.max(0, p.cooldown - dt);
			p.held = p.hasPuck ? p.held + dt : 0;
			let mx = 0,
				mz = 0;
			if (p.stun > 0) {
				p.stun = Math.max(0, p.stun - dt);
				p.vx *= 0.94;
				p.vz *= 0.94;
			} else {
				if (p.active) {
					mx = effective[team].x || 0;
					mz = effective[team].z || 0;
				} else {
					let tx, tz;
					if (p.slot === 0) {
						tx = -s * 14.4;
						tz = clamp(this.puck.z * 0.64, -3.8, 3.8);
					} else {
						tx = clamp(this.puck.x + s * 5, -12, 12);
						tz = -Math.sign(this.puck.z || 1) * 4.3;
					}
					const dx = tx - p.x,
						dz = tz - p.z,
						l = Math.hypot(dx, dz);
					if (l > 0.3) {
						mx = (dx / l) * 0.78;
						mz = (dz / l) * 0.78;
					}
				}
				if (this.training && p.team === 1) {
					mx = mz = 0;
				}
				const l = Math.hypot(mx, mz);
				if (l > 1) {
					mx /= l;
					mz /= l;
				}
				const speed =
					this.params.skateSpeed *
					(this.turbo ? 1.15 : 1) *
					(p.hasPuck ? 0.91 : 1);
				const blend = 1 - Math.exp(-dt * 11);
				p.vx += (mx * speed - p.vx) * blend;
				p.vz += (mz * speed - p.vz) * blend;
			}
			const before = { x: p.x, z: p.z };
			p.x = clamp(p.x + p.vx * dt, -16.9, 16.9);
			p.z = clamp(p.z + p.vz * dt, -8.85, 8.85);
			if (p.slot === 0) {
				p.x = team ? clamp(p.x, -2, 16.9) : clamp(p.x, -16.9, 2);
			} else {
				p.x = team ? clamp(p.x, -16.9, 13) : clamp(p.x, -13, 16.9);
			}
			p.speed = Math.hypot(p.vx, p.vz);
			if (p.speed > 0.5) p.angle = Math.atan2(p.vz, p.vx);
			if (p.hasPuck && p.charge > 0.01) p.angle = team ? Math.PI : 0;
			p.rb.setNextKinematicTranslation({ x: p.x, y: 0.55, z: p.z });
			if (
				this.training &&
				this.trainingStep === 0 &&
				p.team === 0 &&
				p.active
			) {
				this.trainingMoved += dist(before, p);
				if (this.trainingMoved > 5) this.advanceTraining();
			}
		}
		this.body.setLinearDamping(this.params.puckDrag);
		if (this.owner >= 0) {
			const p = this.players[this.owner],
				s = p.team ? -1 : 1;
			const side = Math.sin(this.elapsed * 6) * 0.53;
			this.body.setTranslation(
				{ x: p.x + s * 0.95, y: 0.25, z: p.z + side },
				true,
			);
			this.body.setLinvel({ x: p.vx, y: 0, z: p.vz }, true);
		}
		this.world.timestep = dt;
		this.world.step();
		const pos = this.body.translation(),
			vel = this.body.linvel();
		this.puck = { x: pos.x, z: pos.z, vx: vel.x, vz: vel.z };
		if (this.owner < 0) {
			if (Math.abs(pos.x) > 18.35 && Math.abs(pos.z) < 2.8) {
				this.score(pos.x > 0 ? 0 : 1);
				return;
			}
			if (
				(Math.abs(pos.z) > 9.55 ||
					(Math.abs(pos.x) > 17.55 && Math.abs(pos.z) > 3.1)) &&
				this.lastBoard <= 0 &&
				Math.hypot(vel.x, vel.z) > 3
			) {
				this.banks++;
				this.lastBoard = 0.3;
				if (this.lastTeam >= 0) this.stats[this.lastTeam].boards++;
				this.event("board", { x: pos.x, z: pos.z });
			}
			if (this.noPickup <= 0) {
				const near = this.players
					.filter((p) => p.stun <= 0 && dist(p, this.puck) < 1.35)
					.sort((a, b) => dist(a, this.puck) - dist(b, this.puck));
				if (near.length) {
					const p = near[0];
					if (
						p.slot === 0 &&
						this.lastShooter >= 0 &&
						this.players[this.lastShooter].team !== p.team
					)
						this.stats[p.team].saves++;
					this.takePuck(p.index);
				}
			}
			if (
				Math.abs(pos.x) > 21 ||
				Math.abs(pos.z) > 11 ||
				!Number.isFinite(pos.x)
			) {
				this.faceoff();
				this.phase = "faceoff";
				this.phaseTime = 1;
			}
		}
	}
	snapshot() {
		return {
			mode: this.mode,
			round: this.round,
			theme: this.theme,
			turbo: this.turbo,
			phase: this.phase,
			phaseTime: this.phaseTime,
			seconds: this.seconds,
			scores: [...this.scores],
			selected: [...this.selected],
			puck: { ...this.puck },
			owner: this.owner,
			elapsed: this.elapsed,
			goalTeam: this.goalTeam,
			winner: this.winner,
			suddenDeath: this.suddenDeath,
			training: this.training,
			trainingStep: this.trainingStep,
			stats: this.stats.map((x) => ({ ...x })),
			players: this.players.map(({ rb, ...p }) => ({ ...p })),
		};
	}
	applySnapshot(s) {
		for (const [k, v] of Object.entries(s)) if (k !== "players") this[k] = v;
		s.players.forEach((p, i) => {
			const local = this.players[i];
			Object.assign(local, p);
			local.rb.setTranslation({ x: p.x, y: 0.55, z: p.z }, true);
			local.rb.setNextKinematicTranslation({ x: p.x, y: 0.55, z: p.z });
		});
		if (s.puck) {
			this.body.setTranslation({ x: s.puck.x, y: 0.25, z: s.puck.z }, true);
			this.body.setLinvel({ x: s.puck.vx || 0, y: 0, z: s.puck.vz || 0 }, true);
		}
	}
	dispose() {
		this.world.free();
	}
}
