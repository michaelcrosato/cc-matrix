import RAPIER from "@dimforge/rapier3d-compat";
import ARENAS from "../content/arenas.json";
export const DEFAULTS = Object.freeze({
	speed: 5.2,
	shellSpeed: 22,
	reload: 0.58,
	aiSkill: 0.72,
	roundTime: 75,
	target: 5,
});
export const COLORS = ["#f4c34d", "#ef7059", "#66bca6", "#93b6e5"];
export const LEVELS = ARENAS;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)),
	angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const ZERO = () => ({
	x: 0,
	z: 0,
	ax: 0,
	az: 0,
	aim: false,
	fire: false,
	boost: false,
});
export class Game {
	constructor() {
		this.tuning = { ...DEFAULTS };
		this.cheats = {
			invincible: false,
			aiPaused: false,
			colliders: false,
			slowmo: 1,
		};
		this.world = null;
		this.obstacles = [];
		this.tanks = [];
		this.bullets = [];
		this.pickups = [];
		this.destroyed = [];
		this.events = [];
		this.eventSeq = 0;
		this.bulletId = 0;
		this.pickupId = 0;
		this.t = 0;
		this.heat = 0;
		this.mode = "title";
		this.phase = "title";
		this.paused = false;
		this.countdown = 0;
		this.timer = 75;
		this.total = [0, 0, 0, 0];
		this.heatWins = 0;
		this.results = [];
		this.onStage = () => {};
		this.onEvent = () => {};
		this.rng = Math.random;
		this.inputs = new Map();
		this.remote = false;
		this.remoteState = null;
		this.stats = {
			shots: 0,
			hits: 0,
			banks: 0,
			knockouts: 0,
			boosts: 0,
			pickups: 0,
		};
		this.serial = 0;
	}
	async init() {
		await RAPIER.init();
	}
	resetTuning() {
		const elapsed = this.tuning.roundTime - this.timer;
		Object.assign(this.tuning, DEFAULTS);
		this.timer = Math.max(0, DEFAULTS.roundTime - elapsed);
	}
	start(mode = "solo", heat = 0, players = null) {
		this.remote = false;
		this.remoteState = null;
		this.mode = mode;
		this.heat = heat;
		this.total = [0, 0, 0, 0];
		this.heatWins = 0;
		this.results = [];
		this.players = players;
		this.finished = false;
		this.stats = {
			shots: 0,
			hits: 0,
			banks: 0,
			knockouts: 0,
			boosts: 0,
			pickups: 0,
		};
		this.serial++;
		this.buildHeat(heat);
	}
	buildHeat(index) {
		this.heat = ((index % 4) + 4) % 4;
		this.level = LEVELS[this.heat];
		this.phase = this.mode === "title" ? "title" : "playing";
		this.paused = false;
		this.countdown = ["attract", "title"].includes(this.mode) ? 0 : 2.6;
		this.timer = this.tuning.roundTime;
		this.t = 0;
		this.pickupTimer = 7;
		this.bullets = [];
		this.pickups = [];
		this.destroyed = [];
		this.obstacles = [];
		this.events = [];
		this.inputs.clear();
		if (this.world) this.world.free();
		this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		this.world.timestep = 1 / 60;
		this.colliderData = new Map();
		const wall = (x, z, w, d, opt = {}) => {
			const o = {
				id: this.obstacles.length,
				x,
				z,
				w,
				d,
				...opt,
				h: opt.crate ? 1.3 : 1.45,
				hp: opt.crate ? 2 : 999,
			};
			this.obstacles.push(o);
			if (this.level.vehicle !== "plane") {
				const co = this.world.createCollider(
					RAPIER.ColliderDesc.cuboid(w / 2, o.h / 2, d / 2).setTranslation(
						x,
						o.h / 2,
						z,
					),
				);
				o.collider = co;
				this.colliderData.set(co.handle, {
					type: opt.crate ? "crate" : "wall",
					o,
				});
			}
			return o;
		};
		wall(0, -12.25, 36.9, 0.5, { border: true });
		wall(0, 12.25, 36.9, 0.5, { border: true });
		wall(-18.25, 0, 0.5, 24, { border: true });
		wall(18.25, 0, 0.5, 24, { border: true });
		for (const o of this.level.obstacles) {
			wall(o.x, o.z, o.w, o.d, { crate: o.crate });
		}
		const count =
			this.mode === "local" || this.mode === "link"
				? 2
				: this.players
					? Math.max(2, this.players.length)
					: this.heat === 0
						? 2
						: 3;
		this.tanks = [];
		const names = ["YOU", "MAJOR MAYBE", "CAPT. CRANK", "LT. LOOPY"];
		for (let i = 0; i < count; i++) {
			const player = this.players?.[i];
			const human =
				this.mode === "local" || this.mode === "link"
					? i < 2
					: this.mode === "hub"
						? !!player
						: i === 0 && !["attract", "title"].includes(this.mode);
			const tank = {
				id: i,
				seat: player?.id ?? i,
				name:
					player?.name ??
					(this.mode === "local"
						? i === 0
							? "PLAYER 1"
							: "PLAYER 2"
						: this.mode === "link"
							? i === 0
								? "HOST"
								: "RIVAL"
							: names[i]),
				color: player?.color || COLORS[i],
				human,
				local: this.mode === "local" ? human : i === 0,
				alive: true,
				hp: 3,
				score: 0,
				angle: 0,
				aim: 0,
				x: 0,
				z: 0,
				vx: 0,
				vz: 0,
				shield: false,
				rapid: 0,
				dash: 0,
				boostCd: 0,
				reload: 0,
				respawn: 0,
				reveal: 1.5,
				invuln: 1.7,
				fireSeq: 0,
				aiTime: 0,
				pathTime: 0,
				path: [],
				aiAim: 0,
				dust: 0,
				kills: 0,
				bankKills: 0,
				shots: 0,
				deaths: 0,
			};
			const body = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.dynamic()
					.setTranslation(0, 0.7, 0)
					.enabledTranslations(true, false, true)
					.enabledRotations(false, false, false)
					.setLinearDamping(8)
					.setAdditionalMass(2),
			);
			tank.body = body;
			const co = this.world.createCollider(
				RAPIER.ColliderDesc.ball(0.67).setFriction(0.1).setRestitution(0.1),
				body,
			);
			tank.collider = co;
			this.colliderData.set(co.handle, { type: "tank", tank });
			this.tanks.push(tank);
			this.spawn(tank, true);
		}
		this.world.step();
		this.onStage(this.level, this.obstacles);
		this.emit("stage", 0, 0, null, { heat: this.heat });
	}
	spawn(t, first = false) {
		const spots = [
			[-13, -8],
			[13, 8],
			[13, -8],
			[-13, 8],
			[0, -9],
			[0, 9],
		];
		let spot = spots[t.id % 4];
		if (!first) {
			let best = -1;
			for (const p of spots) {
				const d = Math.min(
					...this.tanks
						.filter((v) => v.id !== t.id && v.alive)
						.map((v) => Math.hypot(v.x - p[0], v.z - p[1])),
					99,
				);
				if (d > best) {
					best = d;
					spot = p;
				}
			}
		}
		t.x = spot[0];
		t.z = spot[1];
		t.body.setTranslation({ x: t.x, y: 0.7, z: t.z }, true);
		t.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		t.body.setEnabled(true);
		t.alive = true;
		t.hp = 3;
		t.invuln = first ? 1.7 : 2;
		t.reveal = 2;
		t.shield = false;
		t.rapid = 0;
		t.aim = t.id % 2 === 0 ? Math.PI * 1.2 : Math.PI * 0.2;
		t.angle = t.aim;
		t.reload = 0.45;
	}
	emit(type, x = 0, z = 0, color = null, extra = {}) {
		const e = {
			seq: ++this.eventSeq,
			type,
			x,
			z,
			color,
			extra: { ...extra, air: this.level?.vehicle === "plane" },
		};
		this.events.push(e);
		if (this.events.length > 14) this.events.shift();
		this.onEvent(e);
	}
	input(id, data) {
		this.inputs.set(id, data);
	}
	canSee(a, b) {
		const dx = b.x - a.x,
			dz = b.z - a.z,
			d = Math.hypot(dx, dz);
		if (d < 0.1) return true;
		const h = this.world.castRay(
			new RAPIER.Ray(
				{ x: a.x, y: 0.8, z: a.z },
				{ x: dx / d, y: 0, z: dz / d },
			),
			d,
			true,
			undefined,
			undefined,
			undefined,
			a.body,
			(c) => this.colliderData.get(c.handle)?.type !== "tank",
		);
		return !h;
	}
	pathTo(a, b) {
		const cols = 17,
			rows = 11,
			idx = (x, z) => z * cols + x;
		const sx = clamp(Math.round((a.x + 16) / 2), 0, 16),
			sz = clamp(Math.round((a.z + 10) / 2), 0, 10),
			tx = clamp(Math.round((b.x + 16) / 2), 0, 16),
			tz = clamp(Math.round((b.z + 10) / 2), 0, 10);
		const open = (x, z) =>
			!this.obstacles.some(
				(o) =>
					!o.border &&
					!this.destroyed.includes(o.id) &&
					Math.abs(-16 + x * 2 - o.x) < o.w / 2 + 0.8 &&
					Math.abs(-10 + z * 2 - o.z) < o.d / 2 + 0.8,
			);
		const queue = [[sx, sz]],
			prev = new Map([[idx(sx, sz), null]]);
		let end = null;
		for (let i = 0; i < queue.length; i++) {
			const [x, z] = queue[i];
			if (x === tx && z === tz) {
				end = [x, z];
				break;
			}
			for (const [dx, dz] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			]) {
				const nx = x + dx,
					nz = z + dz,
					k = idx(nx, nz);
				if (
					nx < 0 ||
					nx >= cols ||
					nz < 0 ||
					nz >= rows ||
					prev.has(k) ||
					!open(nx, nz)
				)
					continue;
				prev.set(k, [x, z]);
				queue.push([nx, nz]);
			}
		}
		if (!end) return [];
		const path = [];
		for (let n = end; n; n = prev.get(idx(n[0], n[1])))
			path.push({ x: -16 + n[0] * 2, z: -10 + n[1] * 2 });
		path.reverse();
		return path.slice(1);
	}
	ai(t, dt) {
		if (this.cheats.aiPaused) return ZERO();
		const targets = this.tanks.filter((v) => v.id !== t.id && v.alive);
		if (!targets.length) return ZERO();
		const target = targets.reduce((a, b) =>
			Math.hypot(a.x - t.x, a.z - t.z) < Math.hypot(b.x - t.x, b.z - t.z)
				? a
				: b,
		);
		const dx = target.x - t.x,
			dz = target.z - t.z,
			d = Math.hypot(dx, dz),
			air = this.level.vehicle === "plane";
		let x = 0,
			z = 0,
			visible = air || this.canSee(t, target);
		if (air || visible) {
			const dir = t.id % 2 ? 1 : -1,
				radius = air ? 6 : 7;
			x = (dx / d) * (d - radius) * 0.28 + (-dz / d) * 0.65 * dir;
			z = (dz / d) * (d - radius) * 0.28 + (dx / d) * 0.65 * dir;
		} else {
			t.pathTime -= dt;
			if (t.pathTime <= 0 || !t.path.length) {
				t.pathTime = 0.8 + this.rng() * 0.4;
				t.path = this.pathTo(t, target);
			}
			if (t.path.length) {
				const p = t.path[0],
					pd = Math.hypot(p.x - t.x, p.z - t.z);
				if (pd < 0.7) t.path.shift();
				else {
					x = (p.x - t.x) / pd;
					z = (p.z - t.z) / pd;
				}
			} else {
				x = dx / d;
				z = dz / d;
			}
		}
		// Keep pilots inside the field long enough to show the edge wrap deliberately.
		if (air) {
			x += -t.x * 0.015;
			z += -t.z * 0.02;
		} else {
			const _near = null;
			for (const o of this.obstacles) {
				if (this.destroyed.includes(o.id)) continue;
				const px = clamp(t.x, o.x - o.w / 2 - 0.8, o.x + o.w / 2 + 0.8),
					pz = clamp(t.z, o.z - o.d / 2 - 0.8, o.z + o.d / 2 + 0.8);
				const ax = t.x - px,
					az = t.z - pz,
					ad = Math.hypot(ax, az);
				if (ad < 0.8 && ad > 0.001) {
					x += (ax / ad) * (0.8 - ad) * 1.7;
					z += (az / ad) * (0.8 - ad) * 1.7;
				}
			}
		}
		const l = Math.hypot(x, z);
		if (l > 1) {
			x /= l;
			z /= l;
		}
		t.aiTime -= dt;
		if (t.aiTime <= 0) {
			t.aiTime = 0.25 + (1 - this.tuning.aiSkill) * 0.6;
			t.aiAim =
				Math.atan2(
					-(dx + ((target.vx * d) / this.tuning.shellSpeed) * 0.65),
					-(dz + ((target.vz * d) / this.tuning.shellSpeed) * 0.65),
				) +
				(this.rng() - 0.5) * (1.25 - this.tuning.aiSkill) * 0.42;
			if (!visible && !air && this.rng() < 0.45) {
				const mirrors = [
					{ x: 36 - target.x, z: target.z },
					{ x: -36 - target.x, z: target.z },
					{ x: target.x, z: 24 - target.z },
					{ x: target.x, z: -24 - target.z },
				];
				const m = mirrors[(this.rng() * 4) | 0];
				t.aiAim = Math.atan2(-(m.x - t.x), -(m.z - t.z));
			}
		}
		const error = Math.abs(angleDiff(t.aiAim, t.aim));
		return {
			x,
			z,
			ax: -Math.sin(t.aiAim),
			az: -Math.cos(t.aiAim),
			aim: true,
			fire: error < 0.2 && t.reload <= 0 && (visible || this.rng() < 0.35),
			boost: d < 4 && t.boostCd <= 0 && this.rng() < dt * 0.6,
		};
	}
	step(dt) {
		if (
			this.remote ||
			this.paused ||
			this.phase === "results" ||
			this.phase === "ended"
		)
			return;
		dt *= this.cheats.slowmo;
		dt = Math.min(dt, 0.05);
		this.t += dt;
		const air = this.level.vehicle === "plane";
		if (this.countdown > 0) {
			const before = Math.ceil(this.countdown);
			this.countdown = Math.max(0, this.countdown - dt);
			if (Math.ceil(this.countdown) < before)
				this.emit(this.countdown === 0 ? "go" : "tick");
			return;
		}
		if (this.mode !== "title") this.timer -= dt;
		for (const t of this.tanks) {
			t.reveal = Math.max(0, t.reveal - dt);
			t.invuln = Math.max(0, t.invuln - dt);
			t.reload = Math.max(0, t.reload - dt);
			t.boostCd = Math.max(0, t.boostCd - dt);
			t.rapid = Math.max(0, t.rapid - dt);
			t.dash = Math.max(0, t.dash - dt);
			if (!t.alive) {
				t.respawn -= dt;
				if (t.respawn <= 0) this.spawn(t);
				continue;
			}
			const input = t.human ? this.inputs.get(t.id) || ZERO() : this.ai(t, dt);
			let mx = clamp(input.x || 0, -1, 1),
				mz = clamp(input.z || 0, -1, 1);
			let moveLen = Math.hypot(mx, mz);
			if (moveLen > 1) {
				mx /= moveLen;
				mz /= moveLen;
				moveLen = 1;
			}
			if (input.aim && Math.hypot(input.ax, input.az) > 0.15) {
				const a = Math.atan2(-input.ax, -input.az);
				t.aim += angleDiff(a, t.aim) * Math.min(1, dt * (air ? 6 : 12));
			} else if (moveLen > 0.2) {
				const a = Math.atan2(-mx, -mz);
				t.aim += angleDiff(a, t.aim) * Math.min(1, dt * (air ? 5 : 8));
			}
			if (input.assist || input.autoAim) {
				const target = this.tanks
					.filter((v) => v.id !== t.id && v.alive && this.canSee(t, v))
					.sort(
						(a, b) =>
							Math.hypot(a.x - t.x, a.z - t.z) -
							Math.hypot(b.x - t.x, b.z - t.z),
					)[0];
				if (target) {
					const a = Math.atan2(-(target.x - t.x), -(target.z - t.z));
					t.aim += angleDiff(a, t.aim) * Math.min(1, dt * 8);
					input.fire = true;
				}
			}
			if (input.boost && t.boostCd <= 0) {
				t.dash = air ? 0.5 : 0.3;
				t.boostCd = 3.8;
				t.invuln = Math.max(t.invuln, air ? 0.52 : 0.16);
				this.emit("boost", t.x, t.z, t.color);
				if (t.id === 0) this.stats.boosts++;
			}
			if (air && moveLen < 0.2) {
				mx = -Math.sin(t.aim) * 0.62;
				mz = -Math.cos(t.aim) * 0.62;
				moveLen = 0.62;
			}
			const speed =
				this.tuning.speed * (air ? 1.35 : 1) * (t.dash > 0 ? 2.6 : 1);
			if (t.dash > 0 && moveLen < 0.15) {
				mx = -Math.sin(t.aim);
				mz = -Math.cos(t.aim);
			}
			const old = t.body.linvel(),
				f = Math.min(1, dt * (air ? 5 : 15));
			t.vx = old.x + (mx * speed - old.x) * f;
			t.vz = old.z + (mz * speed - old.z) * f;
			t.body.setLinvel({ x: t.vx, y: 0, z: t.vz }, true);
			if (moveLen > 0.12)
				t.angle +=
					angleDiff(Math.atan2(-mx, -mz), t.angle) * Math.min(1, dt * 8);
			if (input.fire && t.reload <= 0) this.fire(t);
			t.dust -= dt;
			if ((moveLen > 0.25 || air) && t.dust <= 0) {
				t.dust = air ? 0.16 : 0.13;
				if (!air) this.emit("dust", t.x, t.z, t.color);
			}
		}
		this.world.timestep = dt;
		this.world.step();
		for (const t of this.tanks) {
			if (!t.alive) continue;
			const p = t.body.translation();
			t.x = p.x;
			t.z = p.z;
			if (air && (Math.abs(t.x) > 18 || Math.abs(t.z) > 12)) {
				t.x = t.x > 18 ? -17.8 : t.x < -18 ? 17.8 : t.x;
				t.z = t.z > 12 ? -11.8 : t.z < -12 ? 11.8 : t.z;
				t.body.setTranslation({ x: t.x, y: 0.7, z: t.z }, true);
				this.emit("wrap", t.x, t.z, t.color);
			}
			if (!air && (Math.abs(t.x) > 18 || Math.abs(t.z) > 12)) {
				t.x = clamp(t.x, -17.2, 17.2);
				t.z = clamp(t.z, -11.2, 11.2);
				t.body.setTranslation({ x: t.x, y: 0.7, z: t.z }, true);
			}
		}
		this.stepBullets(dt);
		for (let i = this.pickups.length - 1; i >= 0; i--) {
			const p = this.pickups[i];
			p.life -= dt;
			let got = false;
			for (const t of this.tanks)
				if (t.alive && Math.hypot(t.x - p.x, t.z - p.z) < 1.25) {
					this.takePickup(t, p);
					got = true;
					break;
				}
			if (got || p.life <= 0) this.pickups.splice(i, 1);
		}
		this.pickupTimer -= dt;
		if (this.pickupTimer <= 0) {
			this.pickupTimer = 10;
			this.addPickup();
		}
		if (["attract", "title"].includes(this.mode)) {
			if (this.mode === "attract" && this.t > 20)
				this.buildHeat((this.heat + 1) % 4);
			return;
		}
		if (
			this.timer <= 0 ||
			this.tanks.some((t) => t.score >= this.tuning.target)
		) {
			this.endHeat();
		}
	}
	fire(t) {
		const dx = -Math.sin(t.aim),
			dz = -Math.cos(t.aim);
		const b = {
			id: ++this.bulletId,
			owner: t.id,
			x: t.x + dx * 1.48,
			z: t.z + dz * 1.48,
			vx: dx * this.tuning.shellSpeed,
			vz: dz * this.tuning.shellSpeed,
			color: t.color,
			life: 4.4,
			age: 0,
			banks: 0,
			wraps: 0,
		};
		this.bullets.push(b);
		t.reload =
			this.tuning.reload *
			(t.rapid > 0 ? 0.38 : 1) *
			(this.level.vehicle === "plane" ? 0.7 : 1);
		t.reveal = 1.35;
		t.fireSeq++;
		t.shots++;
		if (t.id === 0) this.stats.shots++;
		this.emit("shot", b.x, b.z, t.color);
	}
	stepBullets(dt) {
		const air = this.level.vehicle === "plane";
		for (let i = this.bullets.length - 1; i >= 0; i--) {
			const b = this.bullets[i];
			b.life -= dt;
			b.age += dt;
			if (b.life <= 0) {
				this.bullets.splice(i, 1);
				continue;
			}
			let remaining = dt,
				dead = false;
			for (let pass = 0; pass < 5 && remaining > 1e-5; pass++) {
				const speed = Math.hypot(b.vx, b.vz),
					dx = b.vx / speed,
					dz = b.vz / speed,
					dist = speed * remaining;
				const hit = this.world.castRayAndGetNormal(
					new RAPIER.Ray({ x: b.x, y: 0.8, z: b.z }, { x: dx, y: 0, z: dz }),
					dist + 0.1,
					true,
					undefined,
					undefined,
					undefined,
					undefined,
					(c) => {
						const data = this.colliderData.get(c.handle);
						if (!data) return false;
						if (data.type === "tank") {
							if (!data.tank.alive || data.tank.invuln > 0) return false;
							if (data.tank.id === b.owner && b.banks === 0) return false;
						}
						return true;
					},
				);
				if (hit) {
					const travel = Math.max(0, hit.timeOfImpact - 0.015);
					b.x += dx * travel;
					b.z += dz * travel;
					remaining = Math.max(0, remaining - travel / speed);
					const data = this.colliderData.get(hit.collider.handle);
					if (data?.type === "tank") {
						this.damage(data.tank, b);
						dead = true;
						break;
					}
					if (data?.type === "crate") {
						data.o.hp--;
						if (data.o.hp <= 0) {
							this.destroyed.push(data.o.id);
							this.colliderData.delete(hit.collider.handle);
							this.world.removeCollider(hit.collider, true);
							this.emit("crate", data.o.x, data.o.z, 0xe4ad64);
						} else this.emit("hit", b.x, b.z, 0xe4ad64);
						dead = true;
						break;
					}
					if (b.banks >= this.level.bounces) {
						this.emit("hit", b.x, b.z, b.color);
						dead = true;
						break;
					}
					const dot = dx * hit.normal.x + dz * hit.normal.z;
					b.vx = (dx - 2 * dot * hit.normal.x) * speed;
					b.vz = (dz - 2 * dot * hit.normal.z) * speed;
					b.x += hit.normal.x * 0.11;
					b.z += hit.normal.z * 0.11;
					b.banks++;
					if (b.owner === 0) this.stats.banks++;
					this.emit("bounce", b.x, b.z, b.color);
				} else {
					b.x += b.vx * remaining;
					b.z += b.vz * remaining;
					remaining = 0;
				}
			}
			if (air && (Math.abs(b.x) > 18.2 || Math.abs(b.z) > 12.2)) {
				if (b.wraps++ > 0) dead = true;
				else {
					b.x = b.x > 18.2 ? -18 : b.x < -18.2 ? 18 : b.x;
					b.z = b.z > 12.2 ? -12 : b.z < -12.2 ? 12 : b.z;
				}
			}
			if (dead) this.bullets.splice(i, 1);
		}
	}
	damage(t, b) {
		if (
			t.invuln > 0 ||
			(this.cheats.invincible && t.human) ||
			this.mode === "title"
		)
			return false;
		if (t.shield) {
			t.shield = false;
			t.invuln = 0.3;
			this.emit("pickup", t.x, t.z, 0x80c4e1);
			return false;
		}
		t.hp--;
		t.reveal = 1.5;
		t.invuln = 0.22;
		t.body.applyImpulse({ x: b.vx * 0.09, y: 0, z: b.vz * 0.09 }, true);
		if (b.owner === 0) this.stats.hits++;
		this.emit("hit", t.x, t.z, t.color);
		if (t.hp <= 0) {
			t.hp = 0;
			t.alive = false;
			t.body.setEnabled(false);
			t.respawn = 1.9;
			t.deaths++;
			const shooter = this.tanks[b.owner];
			const bank = b.banks > 0,
				points = this.level.bankBonus && bank ? 2 : 1;
			if (shooter && shooter.id !== t.id) {
				shooter.score += points;
				shooter.kills++;
				if (bank) shooter.bankKills++;
				if (shooter.id === 0) this.stats.knockouts++;
			} else t.score = Math.max(0, t.score - 1);
			this.emit("boom", t.x, t.z, t.color, { bank, owner: b.owner, points });
		}
		return true;
	}
	addPickup(type = null, x = null, z = null) {
		if (this.pickups.length >= 3) return;
		const spots = [
			[0, 7],
			[0, -7],
			[-12, 0],
			[12, 0],
			[0, 0],
			[-7, 7],
			[7, -7],
		];
		let pos = spots[(this.rng() * spots.length) | 0];
		if (x !== null) pos = [x, z];
		if (
			this.obstacles.some(
				(o) =>
					!this.destroyed.includes(o.id) &&
					Math.abs(pos[0] - o.x) < o.w / 2 + 0.7 &&
					Math.abs(pos[1] - o.z) < o.d / 2 + 0.7,
			)
		)
			pos = [-13, 3];
		this.pickups.push({
			id: ++this.pickupId,
			type: type || ["repair", "shield", "rapid"][(this.rng() * 3) | 0],
			x: pos[0],
			z: pos[1],
			life: 15,
		});
	}
	takePickup(t, p) {
		if (p.type === "repair") t.hp = Math.min(3, t.hp + 1);
		if (p.type === "shield") t.shield = true;
		if (p.type === "rapid") t.rapid = 8;
		if (t.id === 0) this.stats.pickups++;
		this.emit("pickup", t.x, t.z, t.color, { type: p.type, id: t.id });
	}
	endHeat() {
		if (this.phase === "results" || this.phase === "ended") return;
		this.phase = "results";
		const scores = this.tanks.map((t) => t.score),
			best = Math.max(...scores),
			win = scores[0] === best && best > 0;
		this.total = this.total.map((v, i) => v + (scores[i] || 0));
		if (win) this.heatWins++;
		this.results.push({ heat: this.heat, scores, win });
		this.emit(win ? "win" : "lose");
		if (this.mode === "hub") {
			this.finished = true;
		} else if (this.mode !== "solo" || this.heat === 3) this.finished = true;
	}
	nextHeat() {
		if (this.mode === "solo" && this.heat < 3) this.buildHeat(this.heat + 1);
	}
	snapshot() {
		if (this.remote && this.remoteState) return this.remoteState;
		return {
			serial: this.serial,
			mode: this.mode,
			phase: this.phase,
			heat: this.heat,
			vehicle: this.level?.vehicle || "tank",
			ghost: this.level?.ghost || false,
			bounces: this.level?.bounces || 0,
			bankBonus: this.level?.bankBonus || false,
			timer: this.timer,
			countdown: this.countdown,
			target: this.tuning.target,
			total: [...this.total],
			heatWins: this.heatWins,
			finished: !!this.finished,
			results: this.results,
			stats: { ...this.stats },
			tanks: this.tanks.map((t) => ({
				id: t.id,
				seat: t.seat,
				name: t.name,
				color: t.color,
				human: t.human,
				local: t.local,
				x: t.x,
				z: t.z,
				vx: t.vx,
				vz: t.vz,
				angle: t.angle,
				aim: t.aim,
				hp: t.hp,
				score: t.score,
				alive: t.alive,
				reveal: t.reveal,
				invuln: t.invuln,
				shield: t.shield,
				rapid: t.rapid,
				dash: t.dash,
				boostCd: t.boostCd,
				reload: t.reload,
				respawn: t.respawn,
				fireSeq: t.fireSeq,
				kills: t.kills,
				bankKills: t.bankKills,
				shots: t.shots,
				deaths: t.deaths,
			})),
			bullets: this.bullets.map((b) => ({ ...b })),
			pickups: this.pickups.map((p) => ({ ...p })),
			destroyed: [...this.destroyed],
			events: this.events,
		};
	}
	applyRemote(s, localSeat = 1) {
		const changed =
			!this.remoteState ||
			s.serial !== this.remoteState.serial ||
			s.heat !== this.remoteState.heat;
		this.remote = true;
		this.remoteState = s;
		s.tanks.forEach((t) => {
			t.local = t.seat === localSeat;
		});
		if (changed) {
			this.buildHeat(s.heat);
			this.remote = true;
			this.mode = s.mode;
			this.remoteState = s;
			this.lastRemoteEvent = 0;
		}
		for (const e of s.events || [])
			if (e.seq > (this.lastRemoteEvent || 0)) {
				this.onEvent(e);
				this.lastRemoteEvent = e.seq;
			}
		this.phase = s.phase;
		this.heat = s.heat;
		this.finished = s.finished;
	}
	aimPath(t, max = 26) {
		if (!t?.alive || !this.world || this.remote) return [];
		let x = t.x,
			z = t.z,
			dx = -Math.sin(t.aim),
			dz = -Math.cos(t.aim),
			banks = 0;
		const points = [];
		for (let i = 0; i < max; i++) {
			const d = 0.65;
			const hit = this.world.castRayAndGetNormal(
				new RAPIER.Ray({ x, y: 0.8, z }, { x: dx, y: 0, z: dz }),
				d,
				true,
				undefined,
				undefined,
				undefined,
				t.body,
				(c) => this.colliderData.get(c.handle)?.type !== "tank",
			);
			if (hit) {
				if (banks >= this.level.bounces) break;
				const dot = dx * hit.normal.x + dz * hit.normal.z;
				dx -= 2 * dot * hit.normal.x;
				dz -= 2 * dot * hit.normal.z;
				x += hit.normal.x * 0.12;
				z += hit.normal.z * 0.12;
				banks++;
			} else {
				x += dx * d;
				z += dz * d;
			}
			if (i > 1) points.push({ x, z });
		}
		return points;
	}
	dev(action) {
		if (action === "repair")
			for (const t of this.tanks)
				if (t.human) {
					if (!t.alive) this.spawn(t);
					t.hp = 3;
					t.shield = true;
				}
		if (action === "pickups") {
			this.pickups = [];
			this.addPickup("repair", -12, 3);
			this.addPickup("shield", 0, 7);
			this.addPickup("rapid", 12, -3);
		}
		if (action === "next") {
			this.finished = false;
			this.buildHeat((this.heat + 1) % 4);
		}
		if (action === "restart") {
			this.finished = false;
			this.buildHeat(this.heat);
		}
		if (action === "win") {
			const t = this.tanks[0];
			t.score = this.tuning.target;
			this.endHeat();
		}
	}
}
export { RAPIER, ZERO };
