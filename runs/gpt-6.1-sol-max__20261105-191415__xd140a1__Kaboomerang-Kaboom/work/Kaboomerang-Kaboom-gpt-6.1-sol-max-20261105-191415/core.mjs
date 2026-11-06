export const DEFAULTS = Object.freeze({
	fallSpeed: 1,
	dropRate: 1,
	bucketWidth: 1.85,
	moveSpeed: 23,
	assist: 0.18,
	invincible: false,
	autoPlay: false,
});
export const WAVES = [
	{
		name: "A DROP IN THE BUCKET",
		count: 12,
		interval: 0.85,
		speed: 2.6,
		pattern: "sweep",
		tip: "Slide under the bombs. Catching is automatic.",
	},
	{
		name: "DOUBLE TROUBLE",
		count: 16,
		interval: 0.65,
		speed: 3,
		pattern: "zigzag",
		tip: "Three buckets. Three chances to catch each bomb.",
	},
	{
		name: "WHAT GOES AROUND…",
		count: 18,
		interval: 0.64,
		speed: 3.3,
		pattern: "return",
		tip: "Orange bombs curve back. Watch their trail!",
	},
	{
		name: "A LITTLE SPLASHBACK",
		count: 20,
		interval: 0.55,
		speed: 3.6,
		pattern: "rain",
		tip: "Splashback clears nearby bombs. Catches recharge it.",
	},
	{
		name: "GUST A MINUTE",
		count: 22,
		interval: 0.49,
		speed: 3.8,
		pattern: "wind",
		tip: "The wind leans the falling bombs. Follow the drift.",
	},
	{
		name: "GOLDEN OPPORTUNITY",
		count: 24,
		interval: 0.45,
		speed: 4,
		pattern: "gold",
		tip: "Gold bombs refill splashback. Every 1,000 points restores a bucket.",
	},
	{
		name: "BUCKETS OF NERVE",
		count: 28,
		interval: 0.38,
		speed: 4.3,
		pattern: "mix",
		tip: "Stay loose. Read the pattern, then move.",
	},
	{
		name: "THE LAST LAUGH",
		count: 32,
		interval: 0.33,
		speed: 4.6,
		pattern: "finale",
		tip: "One final frenzy. Wipe that grin off his face!",
	},
];
export const RIMS = [-2.65, -3.45, -4.25];
export function rngFrom(seed) {
	let a = seed >>> 0;
	return () => {
		a += 0x6d2b79f5;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export class Shift {
	constructor(R, { seed = 1981, emit = () => {}, config = {} } = {}) {
		this.R = R;
		this.emit = emit;
		this.config = { ...DEFAULTS, ...config };
		this.random = rngFrom(seed);
		this.world = new R.World({ x: 0, y: -2.4, z: 0 });
		this.players = [];
		this.bombs = [];
		this.nextId = 1;
		this.state = "idle";
		this.events = [];
		this.reset(1);
	}
	event(type, data = {}) {
		const e = { type, ...data };
		this.events.push(e);
		if (this.events.length > 48) this.events.shift();
		this.emit(e);
	}
	reset(count = 1) {
		this.clear();
		this.players = Array.from({ length: count }, (_, i) => ({
			id: i,
			x: count === 1 ? 0 : (i - (count - 1) / 2) * 4,
			charge: 1,
			caught: 0,
			score: 0,
			burst: 0,
		}));
		this.score = 0;
		this.lives = 3;
		this.combo = 0;
		this.bestCombo = 0;
		this.caught = 0;
		this.misses = 0;
		this.splashes = 0;
		this.time = 0;
		this.wave = 0;
		this.spawned = 0;
		this.resolved = 0;
		this.waveGoal = WAVES[0].count;
		this.spawnTimer = 0.2;
		this.countdown = 3;
		this.breakTimer = 0;
		this.damageTimer = 0;
		this.slowTimer = 0;
		this.bomberX = 0;
		this.overtime = false;
		this.state = "playing";
		this.event("start");
		this.event("wave", { wave: 0, ...WAVES[0] });
	}
	clear() {
		for (const b of this.bombs ?? []) this.world.removeRigidBody(b.body);
		this.bombs = [];
	}
	dispose() {
		this.clear();
		this.world.free();
	}
	get multiplier() {
		return Math.min(5, 1 + Math.floor(this.combo / 12));
	}
	get wind() {
		return this.wave === 4 || this.wave >= 6
			? Math.sin(this.time * 0.65) * 0.85
			: 0;
	}
	setWave(wave) {
		this.clear();
		this.wave = clamp(wave, 0, 7);
		this.spawned = 0;
		this.resolved = 0;
		this.waveGoal = WAVES[this.wave].count;
		this.spawnTimer = 0.2;
		this.countdown = 0;
		this.breakTimer = 2.2;
		this.event("wave", { wave: this.wave, ...WAVES[this.wave] });
	}
	spawn(force = {}) {
		const w = WAVES[this.wave];
		const n = this.spawned;
		const phase = n / Math.max(1, this.waveGoal - 1);
		let x = Math.sin(phase * Math.PI * (this.wave < 2 ? 3 : 5) - 1.1) * 6.7;
		if (w.pattern === "zigzag")
			x = (n % 8 < 4 ? n % 4 : 7 - (n % 8)) * 3.5 - 5.25;
		if (w.pattern === "rain" || w.pattern === "mix") x = Math.sin(n * 1.5) * 6;
		if (w.pattern === "finale") x = Math.sin(n * 0.86) * (n > 18 ? 7.3 : 6);
		let kind = "normal";
		if (this.wave >= 2 && n % (this.wave >= 6 ? 3 : 4) === 2) kind = "return";
		if (this.wave >= 5 && n % 7 === 3) kind = "gold";
		x = force.x ?? x;
		kind = force.kind ?? kind;
		const y = force.y ?? 5.1;
		const speed = force.speed ?? w.speed;
		const desc = this.R.RigidBodyDesc.dynamic()
			.setTranslation(x, y, 0)
			.setLinvel(0, -speed, 0)
			.lockRotations()
			.setCcdEnabled(true)
			.enabledTranslations(true, true, false);
		const body = this.world.createRigidBody(desc);
		this.world.createCollider(
			this.R.ColliderDesc.ball(0.27).setSensor(true),
			body,
		);
		const b = {
			id: this.nextId++,
			body,
			x,
			y,
			px: x,
			py: y,
			baseX: x,
			kind,
			age: 0,
			direction: x > 0 ? -1 : 1,
			trail: [],
		};
		this.bombs.push(b);
		this.spawned++;
		this.bomberX = x;
		this.event("drop", { id: b.id, x, kind });
		return b;
	}
	remove(b) {
		const i = this.bombs.indexOf(b);
		if (i < 0) return;
		this.world.removeRigidBody(b.body);
		this.bombs.splice(i, 1);
		this.resolved++;
	}
	catch(b, p, splash = false, rim = RIMS[0]) {
		const x = b.x;
		const y = splash ? b.y : rim;
		const kind = b.kind;
		this.remove(b);
		this.combo++;
		this.bestCombo = Math.max(this.combo, this.bestCombo);
		this.caught++;
		p.caught++;
		const before = this.score;
		const points =
			(this.wave + 1) * 10 * this.multiplier * (kind === "gold" ? 3 : 1);
		this.score += points;
		p.score += points;
		p.charge = Math.min(1, p.charge + (kind === "gold" ? 0.5 : 0.075));
		if (
			Math.floor(before / 1000) < Math.floor(this.score / 1000) &&
			this.lives < 3
		) {
			this.lives++;
			this.event("restore", { lives: this.lives });
		}
		this.event("catch", {
			x,
			y,
			kind,
			points,
			player: p.id,
			combo: this.combo,
			splash,
		});
	}
	miss(b) {
		if (this.damageTimer > 0) {
			this.remove(b);
			return;
		}
		this.misses++;
		this.combo = 0;
		if (!this.config.invincible) this.lives--;
		this.event("miss", {
			x: b.x,
			y: -4.7,
			lives: this.lives,
			chain: this.bombs.map((v) => ({ x: v.x, y: v.y })),
		});
		const remaining = Math.max(4, this.waveGoal - this.resolved);
		this.clear();
		this.damageTimer = 2;
		this.breakTimer = 1.8;
		this.spawned = this.waveGoal - remaining;
		this.resolved = this.spawned;
		this.spawnTimer = 0.4;
		if (this.lives <= 0) this.finish(false);
	}
	splash(id = 0) {
		const p = this.players.find((p) => p.id === id);
		if (
			!p ||
			p.charge < 0.999 ||
			p.burst > 0 ||
			this.state !== "playing" ||
			this.countdown > 0
		)
			return false;
		p.charge = 0;
		p.burst = 0.8;
		this.slowTimer = 1.3;
		this.splashes++;
		this.event("splash", { x: p.x, player: id });
		for (const b of [...this.bombs])
			if (Math.abs(b.x - p.x) < 4.3 && b.y < 1.5) this.catch(b, p, true);
		return true;
	}
	botInput(p) {
		const sorted = [...this.bombs].sort((a, b) => a.y - b.y);
		const target =
			sorted.find(
				(b) => this.players.length === 1 || b.x < 0 === (p.id % 2 === 0),
			) ?? sorted[0];
		if (!target) return { target: this.bomberX };
		const vy = Math.abs(target.body.linvel().y);
		const eta = Math.max(0, (target.y - RIMS[0]) / vy);
		let x = target.x + this.wind * eta;
		if (target.kind === "return")
			x =
				target.baseX +
				target.direction *
					(Math.sin((target.age + eta) * 2.2) - Math.sin(0)) *
					2.5;
		return {
			target: clamp(x, -7.9, 7.9),
			burst: target.y < -1.5 && Math.abs(target.x - p.x) > 2.8,
		};
	}
	update(dt, inputs = []) {
		if (this.state !== "playing") return;
		this.time += dt;
		this.damageTimer = Math.max(0, this.damageTimer - dt);
		this.slowTimer = Math.max(0, this.slowTimer - dt);
		for (const p of this.players) {
			const input = this.config.autoPlay
				? this.botInput(p)
				: (inputs[p.id] ?? {});
			const speed = this.config.moveSpeed * (this.config.autoPlay ? 2 : 1);
			if (Number.isFinite(input.target))
				p.x += clamp(input.target - p.x, -speed * dt, speed * dt);
			else p.x += clamp(input.axis ?? 0, -1, 1) * speed * dt;
			p.x = clamp(
				p.x,
				-8 + this.config.bucketWidth * 0.2,
				8 - this.config.bucketWidth * 0.2,
			);
			p.burst = Math.max(0, p.burst - dt);
			if (input.burst) this.splash(p.id);
		}
		if (this.countdown > 0) {
			this.countdown -= dt;
			return;
		}
		if (this.breakTimer > 0) {
			this.breakTimer -= dt;
			return;
		}
		const simDt = dt * (this.slowTimer > 0 ? 0.48 : 1);
		this.world.timestep = simDt;
		this.world.gravity.y = -2.4 * this.config.fallSpeed;
		for (const b of this.bombs) {
			b.px = b.x;
			b.py = b.y;
			b.age += simDt;
			const vy = b.body.linvel().y;
			const vx =
				b.kind === "return"
					? b.direction * 5.5 * Math.cos(b.age * 2.2)
					: this.wind;
			b.body.setLinvel({ x: vx, y: vy, z: 0 }, true);
		}
		this.world.step();
		for (const b of [...this.bombs]) {
			const v = b.body.translation();
			b.x = v.x;
			b.y = v.y;
			if (b.x < -8 || b.x > 8) {
				b.baseX = clamp(b.baseX, -5, 5);
				b.direction *= -1;
				b.body.setTranslation(
					{ x: clamp(b.x, -7.95, 7.95), y: b.y, z: 0 },
					true,
				);
			}
			let caught = false;
			for (let i = 0; i < this.lives; i++) {
				const rim = RIMS[i];
				if (b.py < rim || b.y > rim) continue;
				const f = (b.py - rim) / (b.py - b.y);
				const crossX = b.px + (b.x - b.px) * f;
				const p = this.players.find(
					(p) =>
						Math.abs(crossX - p.x) <=
						this.config.bucketWidth * 0.5 + 0.15 + this.config.assist,
				);
				if (p) {
					this.catch(b, p, false, rim);
					caught = true;
					break;
				}
			}
			if (!caught && b.y < -4.9) {
				this.miss(b);
				break;
			}
		}
		if (this.state !== "playing") return;
		this.spawnTimer -= simDt * this.config.dropRate;
		if (this.spawnTimer <= 0 && this.spawned < this.waveGoal) {
			this.spawn();
			this.spawnTimer += WAVES[this.wave].interval;
		}
		if (
			this.spawned >= this.waveGoal &&
			this.bombs.length === 0 &&
			this.damageTimer <= 0
		) {
			if (this.wave === 7 && !this.overtime) this.finish(true);
			else this.setWave(this.wave === 7 ? 7 : this.wave + 1);
		}
	}
	finish(won) {
		if (this.state === "won" || this.state === "lost") return;
		this.state = won ? "won" : "lost";
		this.event("finish", { won, score: this.score });
	}
	snapshot() {
		return {
			state: this.state,
			score: this.score,
			lives: this.lives,
			combo: this.combo,
			bestCombo: this.bestCombo,
			caught: this.caught,
			misses: this.misses,
			splashes: this.splashes,
			time: this.time,
			wave: this.wave,
			spawned: this.spawned,
			resolved: this.resolved,
			waveGoal: this.waveGoal,
			countdown: this.countdown,
			breakTimer: this.breakTimer,
			slowTimer: this.slowTimer,
			bomberX: this.bomberX,
			overtime: this.overtime,
			players: this.players.map((p) => ({ ...p })),
			bombs: this.bombs.map((b) => ({
				id: b.id,
				x: b.x,
				y: b.y,
				kind: b.kind,
				age: b.age,
			})),
			config: { ...this.config },
		};
	}
}
