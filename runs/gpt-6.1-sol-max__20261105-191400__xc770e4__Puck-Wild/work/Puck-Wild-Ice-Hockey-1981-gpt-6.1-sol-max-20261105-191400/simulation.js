import RAPIER from "@dimforge/rapier3d-compat";

export const DEFAULTS = Object.freeze({
	speed: 8.8,
	shotPower: 29,
	aiSkill: 0.72,
	puckDrag: 0.28,
	checkPower: 12,
	periodLength: 45,
	goalieSkill: 0.72,
});
export const TEAM_NAMES = ["NORTH STARS", "HOT SHOTS"];
export const DRILLS = [
	["FIND YOUR EDGES", "Skate through the center circle."],
	["A LITTLE EXTRA", "Hold burst while skating. Watch your energy."],
	["SHARE THE GLORY", "Pass to your teammate."],
	["LET IT RIP", "Hold shoot, aim, then release."],
	["SAY HELLO", "Get close to a rival and body check."],
	["LIGHT THE LAMP", "Put the puck in the rival net."],
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const len = (x, z) => Math.hypot(x, z);
export async function initPhysics() {
	await RAPIER.init();
}

export class Hockey {
	constructor(options = {}) {
		this.tune = { ...DEFAULTS };
		this.events = [];
		this.rngState = options.seed || 1981;
		this.tick = 0;
		this.attract = false;
		this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		this.world.timestep = 1 / 60;
		this.players = [];
		this.seats = [];
		this.stats = {
			shots: [0, 0],
			passes: [0, 0],
			checks: [0, 0],
			saves: [0, 0],
			steals: [0, 0],
		};
		const wall = (x, z, hx, hz, angle = 0) => {
			const b = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.fixed()
					.setTranslation(x, 0.6, z)
					.setRotation({
						x: 0,
						y: Math.sin(angle / 2),
						z: 0,
						w: Math.cos(angle / 2),
					}),
			);
			this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(hx, 1, hz)
					.setRestitution(0.82)
					.setFriction(0.01),
				b,
			);
		};
		wall(0, -13.8, 26, 0.3);
		wall(0, 13.8, 26, 0.3);
		for (const s of [-1, 1]) {
			wall(s * 26.2, -8.4, 0.3, 5.5);
			wall(s * 26.2, 8.4, 0.3, 5.5);
			wall(s * 26.1, 0, 0.22, 2.9);
			wall(s * 24.7, -3, 0.95, 0.12);
			wall(s * 24.7, 3, 0.95, 0.12);
		}
		for (const sx of [-1, 1])
			for (const sz of [-1, 1])
				for (let j = 0; j < 8; j++) {
					const a = (j * Math.PI) / 16,
						b = ((j + 1) * Math.PI) / 16;
					const x1 = sx * (21.5 + 4.4 * Math.cos(a)),
						z1 = sz * (9.5 + 4.4 * Math.sin(a));
					const x2 = sx * (21.5 + 4.4 * Math.cos(b)),
						z2 = sz * (9.5 + 4.4 * Math.sin(b));
					wall(
						(x1 + x2) / 2,
						(z1 + z2) / 2,
						Math.hypot(x2 - x1, z2 - z1) / 2 + 0.03,
						0.14,
						-Math.atan2(z2 - z1, x2 - x1),
					);
				}
		for (let i = 0; i < 6; i++) {
			const team = i < 4 ? Math.floor(i / 2) : i - 4,
				goalie = i >= 4;
			const b = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.dynamic()
					.setTranslation(0, 0.65, 0)
					.enabledTranslations(true, false, true)
					.enabledRotations(false, false, false)
					.setLinearDamping(2)
					.setCcdEnabled(true),
			);
			this.world.createCollider(
				RAPIER.ColliderDesc.ball(goalie ? 0.8 : 0.56)
					.setRestitution(0.14)
					.setFriction(0.05)
					.setDensity(4),
				b,
			);
			this.players.push({
				i,
				team,
				goalie,
				body: b,
				x: 0,
				z: 0,
				vx: 0,
				vz: 0,
				angle: team === 0 ? Math.PI / 2 : -Math.PI / 2,
				energy: 1,
				stun: 0,
				cooldown: 0,
				shotCD: 0,
				charge: 0,
				action: "skate",
				flash: 0,
				aiTime: 0,
			});
		}
		this.puckBody = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(0, 0.18, 0)
				.enabledTranslations(true, false, true)
				.enabledRotations(false, false, false)
				.setLinearDamping(this.tune.puckDrag)
				.setCcdEnabled(true),
		);
		this.puckCollider = this.world.createCollider(
			RAPIER.ColliderDesc.cylinder(0.15, 0.28)
				.setRestitution(0.85)
				.setFriction(0.02)
				.setDensity(0.3),
			this.puckBody,
		);
		this.puck = {
			x: 0,
			z: 0,
			vx: 0,
			vz: 0,
			owner: -1,
			lastTeam: -1,
			lock: 0,
			passTo: -1,
		};
		this.reset({ players: 1 });
	}
	rand() {
		let x = this.rngState;
		x ^= x << 13;
		x ^= x >>> 17;
		x ^= x << 5;
		this.rngState = x;
		return (x >>> 0) / 4294967296;
	}
	emit(type, data = {}) {
		this.events.push({ type, ...data });
	}
	reset({ players = 1, training = false, attract = false, seats = null } = {}) {
		this.score = [0, 0];
		this.period = 1;
		this.remaining = this.tune.periodLength;
		this.phase = "faceoff";
		this.phaseTime = 1.8;
		this.overtime = false;
		this.elapsed = 0;
		this.training = training;
		this.drill = 0;
		this.drillProgress = 0;
		this.attract = attract;
		this.freezeClock = false;
		this.winner = -1;
		this.events = [];
		this.humanCount = attract ? 0 : players;
		this.stats = {
			shots: [0, 0],
			passes: [0, 0],
			checks: [0, 0],
			saves: [0, 0],
			steals: [0, 0],
		};
		this.seats = (
			seats ||
			Array.from({ length: attract ? 0 : players }, (_, id) => ({
				id,
				team: id % 2,
				index: id < 2 ? id * 2 : id === 2 ? 1 : 3,
			}))
		).map((x) => ({ ...x }));
		this.faceoff();
	}
	faceoff() {
		const positions = [
			[-4, -2],
			[-10, 5],
			[4, 2],
			[10, -5],
			[-22.4, 0],
			[22.4, 0],
		];
		this.players.forEach((p, i) => {
			const [x, z] = positions[i];
			p.body.setTranslation({ x, y: 0.65, z }, true);
			p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
			Object.assign(p, {
				x,
				z,
				vx: 0,
				vz: 0,
				stun: 0,
				cooldown: 0,
				charge: 0,
				energy: 1,
				angle: p.team === 0 ? Math.PI / 2 : -Math.PI / 2,
				aiTime: 0,
				shotCD: 0,
			});
		});
		this.puck.owner = -1;
		this.puck.lock = 0.35;
		this.puck.passTo = -1;
		this.placePuck(0, 0, 0, 0);
		this.emit("faceoff");
	}
	placePuck(x, z, vx = 0, vz = 0) {
		Object.assign(this.puck, { x, z, vx, vz });
		this.puckBody.setTranslation({ x, y: 0.18, z }, true);
		this.puckBody.setLinvel({ x: vx, y: 0, z: vz }, true);
	}
	givePuck(index = 0) {
		const p = this.players[index];
		this.puck.owner = index;
		this.puck.lastTeam = p.team;
		this.puck.lock = 0.1;
		this.placePuck(
			p.x + Math.sin(p.angle) * 0.9,
			p.z + Math.cos(p.angle) * 0.9,
		);
	}
	switchSeat(seat) {
		const occupied = this.seats
			.filter((s) => s.id !== seat.id)
			.map((s) => s.index);
		const other = this.players.find(
			(p) =>
				!p.goalie &&
				p.team === seat.team &&
				p.i !== seat.index &&
				!occupied.includes(p.i),
		);
		if (other) {
			seat.index = other.i;
			this.emit("switch", { seat: seat.id, index: other.i });
		}
	}
	pass(p) {
		if (this.puck.owner !== p.i) return;
		const mate = this.players.find(
			(q) => q.team === p.team && !q.goalie && q.i !== p.i,
		);
		const dx = mate.x + mate.vx * 0.2 - p.x,
			dz = mate.z + mate.vz * 0.2 - p.z,
			d = len(dx, dz) || 1;
		this.release(p, (dx / d) * 20, (dz / d) * 20);
		this.puck.passTo = mate.i;
		this.puck.lock = 0.18;
		this.stats.passes[p.team]++;
		p.action = "pass";
		p.flash = 0.4;
		this.emit("pass", { team: p.team, x: p.x, z: p.z });
		const seat = this.seats.find((s) => s.index === p.i);
		if (seat && !this.seats.some((s) => s.index === mate.i))
			seat.index = mate.i;
		if (this.training && this.drill === 2) this.nextDrill();
	}
	release(p, vx, vz) {
		this.puck.owner = -1;
		this.puck.lastTeam = p.team;
		this.puck.lock = 0.16;
		this.puckCollider.setSensor(false);
		this.placePuck(
			p.x + Math.sin(p.angle) * 1.05,
			p.z + Math.cos(p.angle) * 1.05,
			vx,
			vz,
		);
	}
	shoot(p, input = {}) {
		if (this.puck.owner !== p.i || p.shotCD > 0) return;
		const direction = p.team === 0 ? 1 : -1;
		let dx = direction,
			dz = 0;
		if (input.aimX !== undefined) {
			dx = input.aimX - p.x;
			dz = input.aimZ - p.z;
		} else if (len(input.x || 0, input.z || 0) > 0.25) {
			dx = input.x;
			dz = input.z;
			const gx = direction * 24 - p.x,
				gz = clamp(p.z * 0.18, -2.3, 2.3) - p.z;
			const gd = len(gx, gz);
			if (dx * direction > 0.2) {
				dx = dx * 0.25 + (gx / gd) * 0.75;
				dz = dz * 0.25 + (gz / gd) * 0.75;
			}
		} else {
			dx = direction * 24 - p.x;
			dz = (this.rand() - 0.5) * 3.5 - p.z;
		}
		const d = len(dx, dz) || 1,
			power = this.tune.shotPower * (0.72 + Math.min(p.charge, 1) * 0.5);
		p.angle = Math.atan2(dx, dz);
		this.release(p, (dx / d) * power, (dz / d) * power);
		this.puck.passTo = -1;
		p.shotCD = 0.5;
		p.action = "shoot";
		p.flash = 0.45;
		this.stats.shots[p.team]++;
		this.emit("shot", { x: p.x, z: p.z, team: p.team, power });
		p.charge = 0;
		if (this.training && this.drill === 3) this.nextDrill();
	}
	check(p) {
		if (p.cooldown > 0 || p.stun > 0) return;
		p.cooldown = 1.1;
		p.action = "check";
		p.flash = 0.4;
		this.emit("swing", { x: p.x, z: p.z });
		let hit = false;
		for (const q of this.players) {
			if (q.team === p.team || q.goalie || len(q.x - p.x, q.z - p.z) > 2.5)
				continue;
			hit = true;
			const dx = q.x - p.x,
				dz = q.z - p.z,
				d = len(dx, dz) || 1;
			q.stun = 0.85;
			this.stats.checks[p.team]++;
			q.body.applyImpulse(
				{
					x: (dx / d) * this.tune.checkPower,
					y: 0,
					z: (dz / d) * this.tune.checkPower,
				},
				true,
			);
			q.action = "fall";
			q.flash = 0.85;
			if (this.puck.owner === q.i) {
				this.release(q, (dx / d) * 8, (dz / d) * 8);
				this.puck.lock = 0.3;
			}
			this.emit("check", { x: q.x, z: q.z, team: p.team });
		}
		if (this.training && this.drill === 4 && hit) this.nextDrill();
	}
	nextDrill() {
		this.drill++;
		this.drillProgress = 0;
		this.emit("drill", { drill: this.drill });
		if (this.drill === 2) this.givePuck(this.seats[0]?.index || 0);
		if (this.drill === 3) this.givePuck(this.seats[0]?.index || 0);
		if (this.drill === 4) {
			const p = this.players[this.seats[0]?.index || 0],
				q = this.players[2];
			q.body.setTranslation({ x: p.x + 1.6, y: 0.65, z: p.z }, true);
			q.x = p.x + 1.6;
			q.z = p.z;
			this.givePuck(2);
		}
		if (this.drill === 5) this.givePuck(this.seats[0]?.index || 0);
		if (this.drill >= 6) {
			this.phase = "training-complete";
			this.emit("training-complete");
		}
	}
	ai(p, dt) {
		const dir = p.team === 0 ? 1 : -1,
			owner = this.players[this.puck.owner];
		let tx = this.puck.x,
			tz = this.puck.z;
		if (this.training && p.team === 1 && !p.goalie) {
			return { x: 0, z: 0 };
		}
		if (p.goalie) {
			const skill = this.training ? 0.25 : this.tune.goalieSkill;
			tx = -dir * 22.7;
			const pv = this.puckBody.linvel(),
				travel = Math.abs((tx - this.puck.x) / (pv.x || 100));
			tz = clamp(
				this.puck.z + (travel < 0.65 ? pv.z * travel * skill : 0),
				-2.2,
				2.2,
			);
			const dz = tz - p.z;
			return {
				x: clamp((tx - p.x) * 3, -1, 1),
				z: clamp(dz * (1.8 + skill * 2), -1, 1),
			};
		}
		if (owner?.i === p.i) {
			tx = dir * 19;
			tz = Math.sin(this.elapsed * 1.5 + p.i) * 4.4;
			p.aiTime += dt;
			if (
				Math.abs(p.x) > 11 &&
				p.x * dir > 0 &&
				p.aiTime > 1.1 - this.tune.aiSkill * 0.5
			) {
				const keeper = this.players[p.team === 0 ? 5 : 4];
				p.charge = 0.5;
				this.shoot(p, {
					aimX: dir * 24.2,
					aimZ: (keeper.z >= 0 ? -2.35 : 2.35) + (this.rand() - 0.5) * 0.35,
				});
				p.aiTime = 0;
			} else if (
				p.aiTime > 2.1 &&
				this.rand() < 0.015 + this.tune.aiSkill * 0.02
			) {
				this.pass(p);
				p.aiTime = 0;
			}
		} else if (owner?.team === p.team) {
			tx = owner.x + dir * 5;
			tz = owner.z > 0 ? -5.5 : 5.5;
		} else {
			const mate = this.players.find(
				(q) => q.team === p.team && !q.goalie && q.i !== p.i,
			);
			if (len(mate.x - tx, mate.z - tz) + 2 < len(p.x - tx, p.z - tz)) {
				tx = -dir * 8 + this.puck.x * 0.3;
				tz = this.puck.z * 0.6 + (p.i % 2 ? 4 : -4);
			}
			if (
				owner &&
				owner.team !== p.team &&
				len(p.x - owner.x, p.z - owner.z) < 2.1 &&
				this.rand() < this.tune.aiSkill * 0.09
			)
				this.check(p);
		}
		const dx = tx - p.x,
			dz = tz - p.z,
			d = len(dx, dz);
		const f = p.goalie ? 1 : 0.66 + this.tune.aiSkill * 0.29;
		return {
			x: d > 0.4 ? (dx / d) * f : 0,
			z: d > 0.4 ? (dz / d) * f : 0,
			boost: d > 9 && p.energy > 0.5,
		};
	}
	step(inputs = {}, dt = 1 / 60) {
		this.tick++;
		this.elapsed += dt;
		this.phaseTime -= dt;
		if (this.phase === "gameover" || this.phase === "training-complete") return;
		if (this.phase === "goal" || this.phase === "intermission") {
			if (this.phaseTime <= 0) {
				if (this.phase === "intermission") {
					this.period++;
					this.remaining = this.tune.periodLength;
				}
				this.phase = "faceoff";
				this.phaseTime = 1.7;
				this.faceoff();
			}
			return;
		}
		if (this.phase === "faceoff") {
			if (this.phaseTime <= 0) {
				this.phase = "play";
				this.emit("drop");
			}
			return;
		}
		if (!this.training && !this.freezeClock && !this.overtime) {
			this.remaining = Math.max(0, this.remaining - dt);
			if (this.remaining <= 0) {
				this.endPeriod();
				return;
			}
		}
		this.puck.lock = Math.max(0, this.puck.lock - dt);
		this.puckBody.setLinearDamping(this.tune.puckDrag);
		this.puckCollider.setSensor(this.puck.owner >= 0);
		for (const seat of this.seats) {
			if (inputs[seat.id]?.switch) this.switchSeat(seat);
		}
		for (const p of this.players) {
			if (this.puck.owner !== p.i) p.charge = 0;
			p.cooldown = Math.max(0, p.cooldown - dt);
			p.shotCD = Math.max(0, p.shotCD - dt);
			p.stun = Math.max(0, p.stun - dt);
			p.flash = Math.max(0, p.flash - dt);
			const seat = this.seats.find((s) => s.index === p.i),
				human = seat && inputs[seat.id];
			const input = human || this.ai(p, dt);
			let x = Number(input.x) || 0,
				z = Number(input.z) || 0;
			const mag = len(x, z);
			if (mag > 1) {
				x /= mag;
				z /= mag;
			}
			if (p.stun > 0) {
				x = 0;
				z = 0;
			} else {
				if (input.pass) this.pass(p);
				if (input.check) this.check(p);
				if (input.shootHeld && this.puck.owner === p.i)
					p.charge = clamp(p.charge + dt * 1.25, 0, 1);
				if (input.shoot) this.shoot(p, input);
			}
			const boost =
				input.boost && p.energy > 0.04 && len(x, z) > 0.1 && !p.goalie;
			p.energy = clamp(p.energy + (boost ? -0.4 : 0.22) * dt, 0, 1);
			const speed =
				(p.goalie ? 2.8 + this.tune.goalieSkill * 3 : this.tune.speed) *
				(boost ? 1.5 : 1) *
				(this.puck.owner === p.i ? 0.94 : 1) *
				(p.charge > 0 ? 0.8 : 1);
			const v = p.body.linvel(),
				acc = p.stun > 0 ? 0.045 : 0.16;
			p.body.setLinvel(
				{
					x: v.x + (x * speed - v.x) * acc,
					y: 0,
					z: v.z + (z * speed - v.z) * acc,
				},
				true,
			);
			if (len(x, z) > 0.14 && p.charge === 0) p.angle = Math.atan2(x, z);
			if (input.aimX !== undefined && this.puck.owner === p.i)
				p.angle = Math.atan2(input.aimX - p.x, input.aimZ - p.z);
			if (this.training && seat && this.drill === 0) {
				this.drillProgress += len(x, z) * dt * speed;
				if (this.drillProgress > 7) this.nextDrill();
			}
			if (this.training && seat && this.drill === 1 && boost) {
				this.drillProgress += dt;
				if (this.drillProgress > 0.5) this.nextDrill();
			}
			if (boost && this.tick % 6 === 0)
				this.emit("skate", { x: p.x, z: p.z, team: p.team });
		}
		if (this.puck.owner >= 0) {
			const p = this.players[this.puck.owner];
			this.placePuck(
				p.x + Math.sin(p.angle) * 1.05,
				p.z + Math.cos(p.angle) * 1.05,
				p.vx,
				p.vz,
			);
		}
		this.world.step();
		for (const p of this.players) {
			const pos = p.body.translation(),
				v = p.body.linvel();
			p.x = pos.x;
			p.z = pos.z;
			p.vx = v.x;
			p.vz = v.z;
			if (!p.goalie && (Math.abs(p.x) > 25 || Math.abs(p.z) > 12.8)) {
				p.x = clamp(p.x, -25, 25);
				p.z = clamp(p.z, -12.8, 12.8);
				p.body.setTranslation({ x: p.x, y: 0.65, z: p.z }, true);
			}
		}
		const pos = this.puckBody.translation(),
			v = this.puckBody.linvel();
		Object.assign(this.puck, { x: pos.x, z: pos.z, vx: v.x, vz: v.z });
		if (this.puck.owner < 0 && this.puck.lock <= 0) {
			for (const p of this.players) {
				if (p.stun > 0) continue;
				const d = len(p.x - this.puck.x, p.z - this.puck.z);
				if (p.goalie) {
					if (d < 1.22 && len(v.x, v.z) > 4 && this.puck.lastTeam !== p.team) {
						this.stats.saves[p.team]++;
						const dir = p.team === 0 ? 1 : -1;
						this.placePuck(
							p.x + dir * 1.3,
							this.puck.z,
							dir * (10 + this.rand() * 5),
							(this.rand() - 0.5) * 16,
						);
						this.puck.lock = 0.3;
						this.emit("save", { x: p.x, z: p.z, team: p.team });
					}
					continue;
				}
				if (
					d < 1.25 &&
					(this.puck.passTo === p.i ||
						len(v.x, v.z) < 24 ||
						this.puck.lastTeam !== p.team)
				) {
					if (this.puck.lastTeam !== p.team && this.puck.lastTeam >= 0)
						this.stats.steals[p.team]++;
					this.givePuck(p.i);
					this.puck.passTo = -1;
					this.emit("pickup", { team: p.team });
					break;
				}
			}
		}
		if (Math.abs(this.puck.x) > 23.7 && Math.abs(this.puck.z) < 2.75) {
			const team = this.puck.x > 0 ? 0 : 1;
			if (this.puck.owner < 0 || this.players[this.puck.owner].team === team)
				this.goal(team);
		}
		if (Math.abs(this.puck.x) > 28 || Math.abs(this.puck.z) > 15)
			this.placePuck(
				clamp(this.puck.x, -23, 23),
				clamp(this.puck.z, -12, 12),
				-v.x * 0.5,
				-v.z * 0.5,
			);
	}
	goal(team) {
		if (this.phase !== "play") return;
		this.score[team]++;
		this.emit("goal", { team, x: team === 0 ? 24 : -24, z: 0 });
		if (this.training) {
			if (team === 0 && this.drill === 5) {
				this.nextDrill();
				return;
			}
		}
		if (this.overtime) {
			this.finish();
			return;
		}
		this.phase = "goal";
		this.phaseTime = 3.1;
		this.puck.owner = -1;
	}
	endPeriod() {
		if (this.period < 3) {
			this.phase = "intermission";
			this.phaseTime = 3;
			this.emit("period", { period: this.period });
		} else if (this.score[0] === this.score[1]) {
			this.overtime = true;
			this.period = 4;
			this.phase = "faceoff";
			this.phaseTime = 2.5;
			this.faceoff();
			this.emit("overtime");
		} else this.finish();
	}
	finish() {
		this.phase = "gameover";
		this.winner =
			this.score[0] === this.score[1]
				? -1
				: this.score[0] > this.score[1]
					? 0
					: 1;
		this.emit("end", { winner: this.winner });
	}
	snapshot() {
		return {
			tick: this.tick,
			score: this.score,
			period: this.period,
			remaining: this.remaining,
			phase: this.phase,
			phaseTime: this.phaseTime,
			overtime: this.overtime,
			winner: this.winner,
			elapsed: this.elapsed,
			stats: this.stats,
			seats: this.seats,
			puck: { ...this.puck },
			players: this.players.map(
				({
					i,
					team,
					x,
					z,
					vx,
					vz,
					angle,
					energy,
					stun,
					cooldown,
					charge,
					action,
					flash,
				}) => ({
					i,
					team,
					x,
					z,
					vx,
					vz,
					angle,
					energy,
					stun,
					cooldown,
					charge,
					action,
					flash,
				}),
			),
			events: this.events.splice(0),
		};
	}
	applySnapshot(s) {
		for (const key of [
			"tick",
			"score",
			"period",
			"remaining",
			"phase",
			"phaseTime",
			"overtime",
			"winner",
			"elapsed",
			"stats",
			"seats",
			"puck",
		])
			if (s[key] !== undefined) this[key] = s[key];
		s.players?.forEach((v, i) => Object.assign(this.players[i], v));
		this.events.push(...(s.events || []));
	}
	dispose() {
		this.world.free();
	}
}
