import RAPIER from "@dimforge/rapier3d-compat";
export const DEFAULTS = {
	fallSpeed: 1,
	dropRate: 1,
	moveSpeed: 15,
	catchWidth: 1.18,
	chargeRate: 1,
	invincible: false,
	autoCatch: false,
};
export const WAVES = [
	{
		name: "OPENING ACT",
		subtitle: "Catch the bombs. Keep your cool.",
		count: 18,
		interval: 0.78,
		speed: 3.4,
	},
	{
		name: "GOLD RUSH",
		subtitle: "Golden bombs fill your splash meter.",
		count: 24,
		interval: 0.62,
		speed: 3.9,
	},
	{
		name: "SPLIT DECISION",
		subtitle: "Pink bombs split. Stay between them!",
		count: 28,
		interval: 0.56,
		speed: 4.2,
	},
	{
		name: "CROSSWIND CAPER",
		subtitle: "A little breeze. A lot of trouble.",
		count: 32,
		interval: 0.49,
		speed: 4.6,
	},
	{
		name: "THE LAST LAUGH",
		subtitle: "One last shower. Make it a clean sweep.",
		count: 40,
		interval: 0.42,
		speed: 5.0,
	},
];
export async function initPhysics() {
	await RAPIER.init();
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export class GameSim {
	constructor(onEvent = () => {}) {
		this.onEvent = onEvent;
		this.settings = { ...DEFAULTS };
		this.phase = "title";
		this.time = 0;
		this.bombs = [];
		this.players = [];
		this.world = null;
		this.nextId = 1;
		this.seed = 1981;
		this.stats = {};
		this.shake = 0;
		this.throwPulse = 0;
	}
	rand() {
		this.seed += 0x6d2b79f5;
		let t = this.seed;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}
	emit(type, data = {}) {
		this.onEvent({ type, ...data });
	}
	start(count = 1, attract = false, ids = null) {
		this.world?.free();
		this.world = new RAPIER.World({ x: 0, y: -2.2, z: 0 });
		this.world.timestep = 1 / 60;
		this.phase = "playing";
		this.time = 0;
		this.wave = 1;
		this.score = 0;
		this.combo = 0;
		this.bestCombo = 0;
		this.lives = 3;
		this.charge = 1;
		this.bombs = [];
		this.nextId = 1;
		this.attract = attract;
		this.seed = 1981;
		this.shake = 0;
		this.throwPulse = 0;
		this.bomberX = 0;
		this.bomberDir = 1;
		this.missGrace = 0;
		this.stats = {
			caught: 0,
			missed: 0,
			gold: 0,
			split: 0,
			pops: 0,
			perfect: 0,
		};
		this.players = Array.from({ length: count }, (_, i) => {
			const body = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
					(i - (count - 1) / 2) * 3,
					1.4,
					0,
				),
			);
			return {
				id: ids?.[i] ?? i,
				x: (i - (count - 1) / 2) * 3,
				target: (i - (count - 1) / 2) * 3,
				lives: 3,
				pop: 0,
				catchPulse: 0,
				color: ["#93d3bd", "#f68b74", "#e6c44d", "#afadd7"][i],
				body,
			};
		});
		this.beginWave();
	}
	beginWave() {
		this.spawned = 0;
		this.waveCatches = 0;
		this.waveMisses = 0;
		this.spawnTimer = 0.7;
		this.intro = 2.5;
		this.bomberX = 0;
		this.emit("wave", { wave: this.wave, name: WAVES[this.wave - 1].name });
	}
	setTarget(i, x) {
		if (this.players[i]) this.players[i].target = clamp(x, -7.15, 7.15);
	}
	pop(i = 0) {
		if (this.phase !== "playing" || this.intro > 0 || this.charge < 0.999)
			return false;
		const p = this.players[i];
		if (!p) return false;
		this.charge = 0;
		this.stats.pops++;
		p.pop = 1;
		this.emit("pop", { x: p.x, y: 1.4 });
		for (const b of [...this.bombs])
			if (b.y < 5.2 && Math.abs(b.x - p.x) < 3.8) this.catch(b, i, false);
		return true;
	}
	spawn(kind = null, x = this.bomberX, y = 10.5, vx = 0) {
		kind ??=
			this.spawned % 9 === 6
				? "gold"
				: this.wave >= 3 && this.spawned % 7 === 4
					? "split"
					: "normal";
		const body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(x, y, 0)
				.setLinvel(vx, -WAVES[this.wave - 1].speed * this.settings.fallSpeed, 0)
				.setGravityScale(this.settings.fallSpeed)
				.lockRotations()
				.setCcdEnabled(true),
		);
		const collider = this.world.createCollider(
			RAPIER.ColliderDesc.ball(kind === "mini" ? 0.2 : 0.29).setSensor(true),
			body,
		);
		const b = {
			id: this.nextId++,
			x,
			y,
			prevY: y,
			kind,
			rotation: 0,
			age: 0,
			body,
			collider,
			vx,
		};
		this.bombs.push(b);
		this.throwPulse++;
		this.emit("throw", { x });
		return b;
	}
	remove(b) {
		const i = this.bombs.indexOf(b);
		if (i < 0) return;
		this.bombs.splice(i, 1);
		this.world.removeRigidBody(b.body);
	}
	clearBombs() {
		for (const b of [...this.bombs]) this.remove(b);
	}
	catch(b, index, precision = true) {
		if (!this.bombs.includes(b)) return;
		const p = this.players[index];
		this.remove(b);
		this.combo++;
		this.bestCombo = Math.max(this.combo, this.bestCombo);
		this.stats.caught++;
		this.waveCatches++;
		const perfect = precision && Math.abs(b.x - p.x) < 0.4;
		if (perfect) this.stats.perfect++;
		const mult = 1 + Math.floor(this.combo / 10);
		const points =
			(b.kind === "gold" ? 250 : b.kind === "mini" ? 75 : 100) * mult +
			(perfect ? 25 : 0);
		this.score += points;
		this.charge = clamp(
			this.charge +
				(b.kind === "gold" ? 0.45 : 0.115) * this.settings.chargeRate,
			0,
			1,
		);
		if (b.kind === "gold") this.stats.gold++;
		p.catchPulse++;
		this.emit(b.kind === "gold" ? "gold" : "catch", {
			x: b.x,
			y: this.catchY(),
			points,
			combo: this.combo,
			perfect,
		});
	}
	catchY() {
		return 0.3 + (this.lives - 1) * 0.55;
	}
	miss(b) {
		if (this.missGrace > 0) {
			this.remove(b);
			return;
		}
		this.stats.missed++;
		this.waveMisses++;
		this.combo = 0;
		this.shake = 1;
		this.emit("miss", { x: b.x, y: 0.1 });
		this.clearBombs();
		this.missGrace = 1.5;
		if (!(this.settings.invincible || this.attract)) this.lives--;
		this.players.forEach((p) => {
			p.lives = this.lives;
		});
		if (this.lives <= 0) {
			this.phase = "gameover";
			this.emit("gameover");
		}
	}
	ai() {
		const n = this.players.length;
		for (let i = 0; i < n; i++) {
			const p = this.players[i];
			const candidates = this.bombs.filter(
				(b) =>
					b.y > this.catchY() &&
					(n === 1 || Math.floor(((b.x + 8) / 16) * n) === i),
			);
			const b = candidates.sort((a, b) => a.y - b.y)[0];
			if (b) {
				const pack = candidates.filter(
					(c) =>
						Math.abs(c.y - b.y) < 0.25 &&
						Math.abs(c.x - b.x) < 2 * (this.settings.catchWidth + 0.12),
				);
				p.target = clamp(
					pack.reduce((sum, c) => sum + c.x, 0) / pack.length,
					-7.15,
					7.15,
				);
			} else p.target = this.bomberX;
		}
	}
	step(dt = 1 / 60) {
		if (this.phase !== "playing") return;
		dt = Math.min(dt, 0.05);
		this.time += dt;
		this.shake = Math.max(0, this.shake - dt * 3);
		this.missGrace = Math.max(0, this.missGrace - dt);
		if (this.attract || this.settings.autoCatch) this.ai();
		for (const p of this.players) {
			const k =
				this.attract || this.settings.autoCatch ? 80 : this.settings.moveSpeed;
			p.x += clamp(p.target - p.x, -k * dt, k * dt);
			p.body.setNextKinematicTranslation({ x: p.x, y: this.catchY(), z: 0 });
			p.pop = Math.max(0, p.pop - dt * 2);
		}
		if (
			this.attract &&
			this.time > (this.stats.pops + 1) * 9 &&
			this.charge >= 0.999 &&
			this.bombs.some((b) => b.y < 4.7)
		)
			this.pop();
		if (this.intro > 0) {
			this.intro -= dt;
			return;
		}
		const w = WAVES[this.wave - 1];
		const speed = 3.6 + this.wave * 0.72;
		this.bomberX += this.bomberDir * speed * dt;
		if (Math.abs(this.bomberX) > 6.6) {
			this.bomberX = clamp(this.bomberX, -6.6, 6.6);
			this.bomberDir *= -1;
		}
		this.spawnTimer -= dt;
		if (this.spawned < w.count && this.spawnTimer <= 0 && this.missGrace <= 0) {
			this.spawn(kindFor(this));
			this.spawned++;
			this.spawnTimer =
				(w.interval / this.settings.dropRate) *
				(this.wave === 5 && this.spawned % 5 === 0 ? 0.65 : 1);
		}
		this.world.timestep = dt;
		this.world.step();
		for (const b of [...this.bombs]) {
			b.age += dt;
			b.prevY = b.y;
			const v = b.body.translation();
			b.x = v.x;
			b.y = v.y;
			b.rotation += dt * (b.id % 2 ? 2 : -2);
			if (this.wave >= 4 && b.kind !== "mini") {
				const wx = Math.sin(this.time * 2 + b.id * 0.5) * 0.8;
				b.body.setLinvel({ x: wx, y: b.body.linvel().y, z: 0 }, true);
			}
			if (b.kind === "split" && b.y < 6.0) {
				const x = b.x,
					y = b.y;
				this.remove(b);
				this.spawn("mini", x - 0.28, y, -0.45);
				this.spawn("mini", x + 0.28, y, 0.45);
				this.stats.split++;
				this.emit("split", { x, y });
				continue;
			}
			const cy = this.catchY() + 0.16;
			if (b.prevY >= cy && b.y <= cy) {
				const index = this.players.findIndex(
					(p) =>
						Math.abs(p.x - b.x) <
						this.settings.catchWidth + (b.kind === "mini" ? 0.12 : 0.2),
				);
				if (index >= 0) {
					this.catch(b, index);
					continue;
				}
			}
			if (b.y < -0.38) {
				this.miss(b);
				break;
			}
		}
		if (
			this.phase === "playing" &&
			this.spawned >= w.count &&
			this.bombs.length === 0 &&
			this.missGrace <= 0
		) {
			this.score += this.waveMisses === 0 ? 1000 : 400;
			this.emit("clear", { perfect: this.waveMisses === 0 });
			if (this.wave >= WAVES.length) {
				this.phase = "victory";
				this.emit("victory");
			} else {
				this.wave++;
				this.lives = Math.min(3, this.lives + 1);
				this.players.forEach((p) => {
					p.lives = this.lives;
				});
				this.charge = 1;
				this.beginWave();
			}
		}
	}
	snapshot() {
		return {
			phase: this.phase,
			time: this.time,
			wave: this.wave || 1,
			score: this.score || 0,
			combo: this.combo || 0,
			bestCombo: this.bestCombo || 0,
			lives: this.lives || 0,
			charge: this.charge ?? 1,
			bomberX: this.bomberX || 0,
			bombs: this.bombs.map(({ id, x, y, kind, rotation }) => ({
				id,
				x,
				y,
				kind,
				rotation,
			})),
			players: this.players.map(({ id, x, lives, pop, color, catchPulse }) => ({
				id,
				x,
				lives,
				pop,
				color,
				catchPulse,
			})),
			attract: !!this.attract,
			shake: this.shake,
			throwPulse: this.throwPulse,
			intro: this.intro || 0,
			spawned: this.spawned || 0,
			quota: WAVES[(this.wave || 1) - 1].count,
			stats: { ...this.stats },
		};
	}
	skip() {
		if (this.phase !== "playing") return;
		this.clearBombs();
		this.spawned = WAVES[this.wave - 1].count;
		this.missGrace = 0;
		this.intro = 0;
		this.step(1 / 60);
	}
}
function kindFor(g) {
	return g.spawned % 9 === 6
		? "gold"
		: g.wave >= 3 && g.spawned % 7 === 4
			? "split"
			: "normal";
}
