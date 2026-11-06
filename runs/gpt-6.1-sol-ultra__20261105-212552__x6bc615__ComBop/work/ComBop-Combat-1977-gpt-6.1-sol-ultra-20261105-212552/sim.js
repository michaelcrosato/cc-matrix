import RAPIER from "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/+esm";
export const MAPS = [
	{
		name: "Bankshot boogie",
		short: "THE RICOCHET RANGE",
		rule: "Two bounces. Endless possibilities.",
		floor: 0xe3d8b6,
		accent: 0x148b83,
		walls: [
			[-6, -1, 1, 6],
			[6, 1, 1, 6],
			[0, 0, 5, 1],
			[-9, -5, 4, 1],
			[9, 5, 4, 1],
		],
		crates: [
			[-3, 4],
			[3, -4],
			[-10, 1],
			[10, -1],
		],
		barrels: [
			[-6, 5],
			[6, -5],
		],
		pickup: [0, 4.8],
	},
	{
		name: "Ghost shift",
		short: "THE VANISHING GARDEN",
		rule: "Keep an eye on the dust. Firing reveals a tank.",
		floor: 0xcddac0,
		accent: 0x3b7f74,
		walls: [
			[-7, 0, 1, 7],
			[7, 0, 1, 7],
			[0, -4, 7, 1],
			[0, 4, 7, 1],
			[-2, 0, 1.4, 1.4],
			[2, 0, 1.4, 1.4],
		],
		crates: [
			[-10, -4],
			[10, 4],
			[-3, -6],
			[3, 6],
		],
		barrels: [
			[-10, 0],
			[10, 0],
		],
		pickup: [0, 0],
	},
	{
		name: "Double time",
		short: "THE HOT LITTLE FINALE",
		rule: "Grab the lightning. Make a little noise.",
		floor: 0xe4cda9,
		accent: 0xbe7350,
		walls: [
			[-6, -3, 5, 1],
			[6, 3, 5, 1],
			[-4, 4, 1, 4],
			[4, -4, 1, 4],
			[0, 0, 2, 2],
		],
		crates: [
			[-8, 2],
			[8, -2],
			[-1, -5],
			[1, 5],
			[-9, -3],
			[9, 3],
		],
		barrels: [
			[-6, 0],
			[6, 0],
			[0, -6],
			[0, 6],
		],
		pickup: [0, 3],
	},
];
export const DEFAULTS = {
	speed: 5.2,
	shellSpeed: 16,
	reload: 0.9,
	ai: 0.78,
	ricochets: 2,
	damage: 1,
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export class Simulation {
	static async init() {
		await RAPIER.init();
	}
	constructor(emit) {
		this.emit = emit;
		this.balance = { ...DEFAULTS };
		this.god = false;
		this.metrics = {
			shots: 0,
			bounces: 0,
			hits: 0,
			kills: 0,
			dashes: 0,
			pickups: 0,
			frames: 0,
			bankshots: 0,
		};
		this.round = 0;
		this.mode = "solo";
		this.inputs = [null, null];
		this.reset(0, "solo");
	}
	reset(round = 0, mode = "solo", keepMetrics = false) {
		if (this.world) this.world.free();
		if (this.queue) this.queue.free();
		this.round = round;
		this.mode = mode;
		this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		this.world.timestep = 1 / 60;
		this.queue = new RAPIER.EventQueue(true);
		this.colliderMap = new Map();
		this.bullets = [];
		this.obstacles = [];
		this.pickups = [];
		this.time = 90;
		this.elapsed = 0;
		this.scores = [0, 0];
		this.ended = false;
		this.winner = -1;
		this.sudden = false;
		this.zone = 17;
		this.pickTimer = 7;
		this.repairTimer = 11;
		this.aiClock = [0, 0];
		this.paths = [[], []];
		this.aiGoals = [null, null];
		this.inputs = [null, null];
		this.hazard = [0, 0];
		if (!keepMetrics)
			this.metrics = {
				shots: 0,
				bounces: 0,
				hits: 0,
				kills: 0,
				dashes: 0,
				pickups: 0,
				frames: 0,
				bankshots: 0,
			};
		const box = (x, z, w, d, type = "wall", id = 0) => {
			const body = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.fixed().setTranslation(x, 0.62, z),
			);
			const col = this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(w / 2, 0.85, d / 2)
					.setFriction(0)
					.setRestitution(1)
					.setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max)
					.setCollisionGroups(0x00010006)
					.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
				body,
			);
			const o = {
				x,
				z,
				w,
				d,
				type,
				id,
				hp: type === "crate" ? 3 : type === "barrel" ? 1 : 999,
				body,
				col,
			};
			this.colliderMap.set(col.handle, o);
			this.obstacles.push(o);
			return o;
		};
		box(-14.3, 0, 0.6, 19.2, "boundary");
		box(14.3, 0, 0.6, 19.2, "boundary");
		box(0, -9.3, 28, 0.6, "boundary");
		box(0, 9.3, 28, 0.6, "boundary");
		let id = 0;
		for (const [x, z, w, d] of MAPS[round].walls) box(x, z, w, d, "wall", id++);
		for (const [x, z] of MAPS[round].crates) box(x, z, 1.3, 1.3, "crate", id++);
		for (const [x, z] of MAPS[round].barrels)
			box(x, z, 0.7, 0.7, "barrel", id++);
		this.tanks = [0, 1].map((i) => {
			const body = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.dynamic()
					.setTranslation(i ? 10 : -10, 0.55, i ? -5 : 5)
					.enabledTranslations(true, false, true)
					.lockRotations()
					.setLinearDamping(0)
					.setCanSleep(false),
			);
			const col = this.world.createCollider(
				RAPIER.ColliderDesc.cylinder(0.43, 0.61)
					.setDensity(10)
					.setFriction(0)
					.setRestitution(0)
					.setCollisionGroups(0x00020007)
					.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
				body,
			);
			const t = {
				id: i,
				type: "tank",
				body,
				col,
				x: i ? 10 : -10,
				z: i ? -5 : 5,
				hp: 3,
				angle: i ? -Math.PI / 2 : Math.PI / 2,
				aim: i ? -Math.PI / 2 : Math.PI / 2,
				ammo: 3,
				reload: 0,
				cooldown: 0,
				dash: 0,
				dashing: 0,
				dx: 0,
				dz: 0,
				shield: 1.8,
				dead: 0,
				cloak: 0,
				reveal: 2,
				overdrive: 0,
				moving: 0,
			};
			this.colliderMap.set(col.handle, t);
			return t;
		});
	}
	input(i, v) {
		this.inputs[i] = v;
	}
	lineBlocked(ax, az, bx, bz, pad = 0.25) {
		for (const o of this.obstacles) {
			if (o.hp <= 0) continue;
			if (o.type === "boundary") continue;
			const dx = bx - ax,
				dz = bz - az;
			let lo = 0,
				hi = 1;
			for (const [a, d, mn, mx] of [
				[ax, dx, o.x - o.w / 2 - pad, o.x + o.w / 2 + pad],
				[az, dz, o.z - o.d / 2 - pad, o.z + o.d / 2 + pad],
			]) {
				if (Math.abs(d) < 1e-5) {
					if (a < mn || a > mx) {
						lo = 2;
						break;
					}
				} else {
					const u = (mn - a) / d,
						v = (mx - a) / d;
					lo = Math.max(lo, Math.min(u, v));
					hi = Math.min(hi, Math.max(u, v));
				}
			}
			if (lo <= hi && lo < 1 && hi > 0) return true;
		}
		return false;
	}
	pathTo(t, tx, tz) {
		const step = 1.35;
		const nx = 20,
			nz = 12;
		const pos = (x, z) => [
			clamp(Math.round((x + 12.8) / step), 0, nx - 1),
			clamp(Math.round((z + 7.6) / step), 0, nz - 1),
		];
		const [sx, sz] = pos(t.x, t.z),
			[ex, ez] = pos(tx, tz);
		const key = (x, z) => z * nx + x;
		const start = key(sx, sz),
			end = key(ex, ez),
			q = [start],
			prev = new Map([[start, -1]]);
		let dest = start,
			best = 1e9;
		for (let h = 0; h < q.length; h++) {
			const v = q[h],
				x = v % nx,
				z = Math.floor(v / nx),
				d = (x - ex) ** 2 + (z - ez) ** 2;
			if (d < best) {
				best = d;
				dest = v;
			}
			if (v === end) break;
			for (const [dx, dz] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			]) {
				const xx = x + dx,
					zz = z + dz,
					k = key(xx, zz);
				if (xx < 0 || xx >= nx || zz < 0 || zz >= nz || prev.has(k)) continue;
				const wx = xx * step - 12.8,
					wz = zz * step - 7.6;
				if (
					this.obstacles.some(
						(o) =>
							o.hp > 0 &&
							Math.abs(wx - o.x) < o.w / 2 + 0.72 &&
							Math.abs(wz - o.z) < o.d / 2 + 0.72,
					)
				)
					continue;
				prev.set(k, v);
				q.push(k);
			}
		}
		const path = [];
		for (let v = dest; v !== start && v !== -1; v = prev.get(v) ?? -1)
			path.push({
				x: (v % nx) * step - 12.8,
				z: Math.floor(v / nx) * step - 7.6,
			});
		return path.reverse();
	}
	ai(i, dt) {
		const t = this.tanks[i],
			p = this.tanks[1 - i];
		this.aiClock[i] -= dt;
		const dx = p.x - t.x,
			dz = p.z - t.z,
			dist = Math.hypot(dx, dz);
		let mx = 0,
			mz = 0;
		const blocked = this.lineBlocked(t.x, t.z, p.x, p.z, 0.65);
		if (this.aiClock[i] <= 0) {
			this.aiClock[i] = 0.6;
			this.paths[i] = blocked ? this.pathTo(t, p.x, p.z) : [];
		}
		if (blocked && this.paths[i].length) {
			let g = this.paths[i][0];
			if (Math.hypot(g.x - t.x, g.z - t.z) < 0.7) {
				this.paths[i].shift();
				g = this.paths[i][0] || g;
			}
			mx = g.x - t.x;
			mz = g.z - t.z;
		} else {
			const side = Math.sin(this.elapsed * 0.65 + i * 3) > 0 ? 1 : -1;
			mx = dx * (dist > 7 ? 1 : dist < 4 ? -1 : 0.04) + dz * 0.45 * side;
			mz = dz * (dist > 7 ? 1 : dist < 4 ? -1 : 0.04) - dx * 0.45 * side;
		}
		const len = Math.hypot(mx, mz) || 1;
		mx /= len;
		mz /= len;
		const margin = 1.2;
		if (Math.abs(t.x) > 12.4) mx -= Math.sign(t.x) * margin;
		if (Math.abs(t.z) > 7.6) mz -= Math.sign(t.z) * margin;
		let aim = Math.atan2(dx, dz),
			fire = !blocked && dist < 21; // Try a deliberate bank off the outer rim when the direct lane is blocked.
		if (blocked) {
			const candidates = [
				Math.atan2(28 - p.x - t.x, dz),
				Math.atan2(-28 - p.x - t.x, dz),
				Math.atan2(dx, 18 - p.z - t.z),
				Math.atan2(dx, -18 - p.z - t.z),
			];
			for (const a of candidates) {
				const path = this.trace(t.x, t.z, Math.sin(a), Math.cos(a), 2, 48);
				if (
					path.some(
						(s) => pointSegment(p.x, p.z, s.x1, s.z1, s.x2, s.z2) < 0.65,
					)
				) {
					aim = a;
					fire = true;
					break;
				}
			}
		}
		aim += Math.sin(this.elapsed * 1.8 + i) * (0.11 * (1 - this.balance.ai));
		const dangerous = this.bullets.some(
			(b) => b.owner !== i && Math.hypot(b.x - t.x, b.z - t.z) < 3,
		);
		return {
			mx: mx * this.balance.ai,
			mz: mz * this.balance.ai,
			ax: Math.sin(aim),
			az: Math.cos(aim),
			fire: fire && p.dead <= 0 && t.shield < 1,
			dash: dangerous && t.dash <= 0,
		};
	}
	trace(x, z, dx, dz, bounces = this.balance.ricochets, length = 32) {
		const lines = [];
		let px = x,
			pz = z,
			remain = length;
		for (let b = 0; b <= bounces; b++) {
			let near = remain,
				nx = 0,
				nz = 0,
				hit = null;
			for (const o of this.obstacles) {
				if (o.hp <= 0) continue;
				let lo = -Infinity,
					hi = Infinity,
					hx = 0,
					hz = 0;
				for (const [a, d, mn, mx, xx, zz] of [
					[px, dx, o.x - o.w / 2, o.x + o.w / 2, 1, 0],
					[pz, dz, o.z - o.d / 2, o.z + o.d / 2, 0, 1],
				]) {
					if (Math.abs(d) < 1e-7) {
						if (a < mn || a > mx) {
							lo = Infinity;
							break;
						}
					} else {
						const a1 = (mn - a) / d,
							a2 = (mx - a) / d;
						if (Math.min(a1, a2) > lo) {
							lo = Math.min(a1, a2);
							hx = xx;
							hz = zz;
						}
						hi = Math.min(hi, Math.max(a1, a2));
					}
				}
				if (lo <= hi && lo > 0.03 && lo < near) {
					near = lo;
					nx = hx;
					nz = hz;
					hit = o;
				}
			}
			lines.push({
				x1: px,
				z1: pz,
				x2: px + dx * near,
				z2: pz + dz * near,
				hit: !!hit,
				object: hit,
			});
			if (!hit || hit.type === "crate" || hit.type === "barrel") break;
			remain -= near;
			if (nx) dx = -dx;
			if (nz) dz = -dz;
			px += lines.at(-1).x2 - px + dx * 0.03;
			pz += lines.at(-1).z2 - pz + dz * 0.03;
		}
		return lines;
	}
	fire(t) {
		if (t.dead > 0 || t.cooldown > 0 || t.ammo < 1) return false;
		const dx = Math.sin(t.aim),
			dz = Math.cos(t.aim);
		t.ammo--;
		t.cooldown = t.overdrive > 0 ? 0.16 : 0.3;
		t.reveal = 1.7;
		this.metrics.shots++;
		this.emit("shoot", { tank: t.id, x: t.x, z: t.z });
		const muzzle = this.trace(t.x, t.z, dx, dz, 0, 1.35)[0];
		if (muzzle.hit) {
			const o = muzzle.object;
			if (o.type === "barrel") this.explodeBarrel(o);
			else if (o.type === "crate") {
				o.hp--;
				this.emit("chip", { x: o.x, z: o.z });
				if (o.hp <= 0) {
					this.world.removeRigidBody(o.body);
					this.colliderMap.delete(o.col.handle);
					this.emit("cover", { x: o.x, z: o.z });
				}
			} else {
				this.metrics.bounces++;
				this.emit("bounce", { x: muzzle.x2, z: muzzle.z2 });
			}
			return true;
		}
		this.spawnShot(t.id, { x: t.x + dx * 1.2, z: t.z + dz * 1.2, dx, dz });
		return true;
	}
	spawnShot(owner, { x, z, dx, dz }) {
		const mag = Math.hypot(dx, dz) || 1,
			speed = this.balance.shellSpeed;
		const body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(x, 0.59, z)
				.enabledTranslations(true, false, true)
				.setLinvel((dx / mag) * speed, 0, (dz / mag) * speed)
				.setCcdEnabled(true)
				.setGravityScale(0)
				.setCanSleep(false),
		);
		const col = this.world.createCollider(
			RAPIER.ColliderDesc.ball(0.13)
				.setDensity(0.02)
				.setFriction(0)
				.setRestitution(1)
				.setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max)
				.setCollisionGroups(0x00040003)
				.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
			body,
		);
		const b = {
			type: "bullet",
			body,
			col,
			id: col.handle,
			owner,
			x,
			z,
			dx: dx / mag,
			dz: dz / mag,
			age: 0,
			bounces: 0,
			remove: false,
			lastBounce: -1,
		};
		this.colliderMap.set(col.handle, b);
		this.bullets.push(b);
		return b;
	}
	damage(i, n = 1, source = {}) {
		const t = this.tanks[i];
		if (t.dead > 0 || t.shield > 0 || (this.god && i === 0)) return false;
		t.hp -= n;
		t.reveal = 2;
		this.metrics.hits++;
		this.emit("hit", { tank: i, x: t.x, z: t.z, bank: source.bounces > 0 });
		if (t.hp <= 0) {
			this.award(1 - i, source);
		}
		return true;
	}
	award(i, source = {}) {
		if (this.ended) return;
		const dead = this.tanks[1 - i];
		dead.hp = 0;
		dead.dead = 1.65;
		dead.body.setEnabled(false);
		this.scores[i]++;
		this.metrics.kills++;
		if (source.bounces > 0) this.metrics.bankshots++;
		this.emit("explode", {
			tank: 1 - i,
			x: dead.x,
			z: dead.z,
			bank: source.bounces > 0,
		});
		if (this.scores[i] >= 3 && this.mode !== "attract") {
			this.ended = true;
			this.winner = i;
			this.emit("roundover", { winner: i, scores: [...this.scores] });
		}
	}
	respawn(t) {
		t.dead = 0;
		t.hp = 3;
		t.ammo = 3;
		t.dash = 0;
		t.cloak = 0;
		t.reveal = 1.8;
		t.shield = 1.8;
		t.overdrive = 0;
		t.x = t.id ? 10 : -10;
		t.z = t.id ? -5 : 5;
		t.body.setTranslation({ x: t.x, y: 0.55, z: t.z }, true);
		t.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		t.body.setEnabled(true);
		this.emit("respawn", { tank: t.id, x: t.x, z: t.z });
	}
	spawnPickup(type, x, z) {
		const p = { id: Math.random().toString(36).slice(2), type, x, z, age: 0 };
		this.pickups.push(p);
		return p;
	}
	explodeBarrel(o) {
		o.hp = 0;
		this.world.removeRigidBody(o.body);
		this.colliderMap.delete(o.col.handle);
		this.emit("barrel", { x: o.x, z: o.z });
		for (const t of this.tanks) {
			if (Math.hypot(t.x - o.x, t.z - o.z) < 3) this.damage(t.id, 2);
		}
		for (const c of this.obstacles)
			if (
				c.type === "crate" &&
				c.hp > 0 &&
				Math.hypot(c.x - o.x, c.z - o.z) < 2.8
			) {
				c.hp = 0;
				this.world.removeRigidBody(c.body);
				this.emit("cover", { x: c.x, z: c.z });
			}
	}
	step(dt = 1 / 60) {
		if (this.ended) return;
		dt = 1 / 60;
		this.elapsed += dt;
		this.time = Math.max(0, this.time - dt);
		this.metrics.frames++;
		if (this.time <= 0 && !this.sudden) {
			this.sudden = true;
			for (const t of this.tanks) {
				t.hp = Math.min(t.hp, 1);
				t.shield = 0;
			}
			this.emit("sudden", {});
		}
		if (this.sudden) this.zone = Math.max(2, this.zone - dt * 0.32);
		for (let i = 0; i < 2; i++) {
			const t = this.tanks[i];
			if (t.dead > 0) {
				t.dead -= dt;
				if (t.dead <= 0) this.respawn(t);
				continue;
			}
			t.shield = Math.max(0, t.shield - dt);
			t.reveal = Math.max(0, t.reveal - dt);
			t.overdrive = Math.max(0, t.overdrive - dt);
			t.cloak = this.round === 1 && t.reveal <= 0 ? 1 : 0;
			t.dash = Math.max(0, t.dash - dt);
			t.cooldown = Math.max(0, t.cooldown - dt);
			if (t.ammo < 3) {
				t.reload += dt;
				if (t.reload > this.balance.reload * (t.overdrive > 0 ? 0.45 : 1)) {
					t.ammo++;
					t.reload = 0;
				}
			} else t.reload = 0;
			const v =
				this.inputs[i] ||
				((this.mode === "solo" && i === 1) || this.mode === "attract"
					? this.ai(i, dt)
					: {});
			let mx = v.mx || 0,
				mz = v.mz || 0;
			const len = Math.hypot(mx, mz);
			if (len > 1) {
				mx /= len;
				mz /= len;
			}
			if (Math.hypot(v.ax || 0, v.az || 0) > 0.1)
				t.aim = Math.atan2(v.ax, v.az);
			if (len > 0.08) {
				const dest = Math.atan2(mx, mz);
				const diff = ((dest - t.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
				t.angle += diff * Math.min(1, dt * 12);
			}
			t.moving = len;
			if (v.dash && t.dash <= 0) {
				t.dash = 3;
				t.dashing = 0.18;
				t.dx = len > 0.1 ? mx : Math.sin(t.angle);
				t.dz = len > 0.1 ? mz : Math.cos(t.angle);
				this.metrics.dashes++;
				this.emit("dash", { tank: i, x: t.x, z: t.z });
			}
			let vx = mx * this.balance.speed,
				vz = mz * this.balance.speed;
			if (t.dashing > 0) {
				t.dashing -= dt;
				vx = t.dx * 15;
				vz = t.dz * 15;
			}
			t.body.setLinvel({ x: vx, y: 0, z: vz }, true);
			if (v.fire) this.fire(t);
			if (
				this.sudden &&
				(Math.abs(t.x) > this.zone || Math.abs(t.z) > this.zone * 0.64)
			) {
				this.hazard[i] += dt;
				if (this.hazard[i] > 1) {
					this.hazard[i] = 0;
					this.damage(i, 1);
				}
			} else this.hazard[i] = 0;
		}
		this.world.step(this.queue);
		for (const t of this.tanks) {
			const p = t.body.translation();
			t.x = p.x;
			t.z = p.z;
		}
		const contacts = [];
		this.queue.drainCollisionEvents((a, b, started) => {
			if (started) contacts.push([a, b]);
		});
		for (const [a, b] of contacts) {
			const aa = this.colliderMap.get(a),
				bb = this.colliderMap.get(b);
			if (!aa || !bb) continue;
			const shot = aa.type === "bullet" ? aa : bb.type === "bullet" ? bb : null,
				other = shot === aa ? bb : aa;
			if (!shot || shot.remove) continue;
			if (other.type === "tank") {
				if (other.id === shot.owner && shot.age < 0.15) continue;
				if (other.dead > 0) continue;
				this.damage(other.id, this.balance.damage, shot);
				shot.remove = true;
			} else if (other.hp > 0) {
				if (other.type === "barrel") {
					this.explodeBarrel(other);
					shot.remove = true;
				} else if (other.type === "crate") {
					other.hp--;
					shot.remove = true;
					this.emit("chip", { x: other.x, z: other.z });
					if (other.hp <= 0) {
						this.world.removeRigidBody(other.body);
						this.colliderMap.delete(other.col.handle);
						this.emit("cover", { x: other.x, z: other.z });
					}
				} else if (this.elapsed - shot.lastBounce > 0.045) {
					shot.lastBounce = this.elapsed;
					shot.bounces++;
					this.metrics.bounces++;
					this.emit("bounce", { x: shot.x, z: shot.z });
					if (shot.bounces > this.balance.ricochets) shot.remove = true;
				}
			}
		}
		for (const b of this.bullets) {
			b.age += dt;
			const p = b.body.translation(),
				v = b.body.linvel();
			b.x = p.x;
			b.z = p.z;
			const len = Math.hypot(v.x, v.z);
			if (len > 0 && !b.remove) {
				b.dx = v.x / len;
				b.dz = v.z / len;
				b.body.setLinvel(
					{
						x: b.dx * this.balance.shellSpeed,
						y: 0,
						z: b.dz * this.balance.shellSpeed,
					},
					true,
				);
			}
			if (b.age > 5 || Math.abs(b.x) > 16 || Math.abs(b.z) > 11)
				b.remove = true;
		}
		for (let j = this.bullets.length - 1; j >= 0; j--)
			if (this.bullets[j].remove) {
				const b = this.bullets[j];
				this.colliderMap.delete(b.col.handle);
				this.world.removeRigidBody(b.body);
				this.bullets.splice(j, 1);
			}
		this.pickTimer -= dt;
		this.repairTimer -= dt;
		if (this.pickTimer < 0) {
			this.pickTimer = 12;
			if (!this.pickups.some((p) => p.type === "overdrive"))
				this.spawnPickup("overdrive", ...MAPS[this.round].pickup);
		}
		if (this.repairTimer < 0) {
			this.repairTimer = 16;
			if (!this.pickups.some((p) => p.type === "repair"))
				this.spawnPickup("repair", this.elapsed % 32 < 16 ? -11 : 11, 0);
		}
		for (let j = this.pickups.length - 1; j >= 0; j--) {
			const p = this.pickups[j];
			p.age += dt;
			let taken = false;
			for (const t of this.tanks) {
				if (t.dead > 0) continue;
				if (Math.hypot(t.x - p.x, t.z - p.z) < 1) {
					if (p.type === "repair") {
						t.hp = Math.min(3, t.hp + 1);
					} else {
						t.overdrive = 7;
						t.ammo = 3;
					}
					this.metrics.pickups++;
					this.emit("pickup", { tank: t.id, type: p.type, x: p.x, z: p.z });
					taken = true;
					break;
				}
			}
			if (taken || p.age > 18) this.pickups.splice(j, 1);
		}
	}
	snapshot() {
		return {
			round: this.round,
			mode: this.mode,
			time: this.time,
			elapsed: this.elapsed,
			scores: [...this.scores],
			ended: this.ended,
			winner: this.winner,
			sudden: this.sudden,
			zone: this.zone,
			tanks: this.tanks.map((t) => ({
				id: t.id,
				x: t.x,
				z: t.z,
				hp: t.hp,
				angle: t.angle,
				aim: t.aim,
				ammo: t.ammo,
				reload: t.reload,
				cooldown: t.cooldown,
				dash: t.dash,
				dashing: t.dashing,
				shield: t.shield,
				dead: t.dead,
				cloak: t.cloak,
				reveal: t.reveal,
				overdrive: t.overdrive,
				moving: t.moving,
			})),
			bullets: this.bullets.map((b) => ({
				id: b.id,
				x: b.x,
				z: b.z,
				dx: b.dx,
				dz: b.dz,
				owner: b.owner,
				bounces: b.bounces,
			})),
			obstacles: this.obstacles.map((o) => ({
				id: o.id,
				type: o.type,
				hp: o.hp,
			})),
			pickups: this.pickups.map((p) => ({ ...p })),
			metrics: { ...this.metrics },
		};
	}
	setTank(i, v) {
		const t = this.tanks[i];
		Object.assign(t, v);
		if (v.x !== undefined || v.z !== undefined)
			t.body.setTranslation({ x: t.x, y: 0.55, z: t.z }, true);
		if (v.hp > 0 && t.dead > 0) {
			t.dead = 0;
			t.body.setEnabled(true);
		}
	}
}
function pointSegment(x, z, ax, az, bx, bz) {
	const dx = bx - ax,
		dz = bz - az,
		k = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
	return Math.hypot(x - ax - dx * k, z - az - dz * k);
}
