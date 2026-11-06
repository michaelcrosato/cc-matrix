/** Deterministic, fixed-step bomb-catching rules. Rendering and input stay outside. */
export const DEFAULT_CONFIG = Object.freeze({
	fallSpeed: 1,
	spawnRate: 1,
	bucketWidth: 1.6,
	moveSpeed: 24,
	chargeRate: 1,
	invincible: false,
	autoplay: false,
	timeScale: 1,
});
export const WAVE_DATA = Object.freeze([
	{
		name: "FIRST SPLASH",
		subtitle: "Catch every bomb. Keep the rooftop dry.",
		total: 12,
		interval: 0.95,
		speed: 2.2,
	},
	{
		name: "DOUBLE CROSS",
		subtitle: "That rascal has found his dancing shoes.",
		total: 14,
		interval: 0.85,
		speed: 2.8,
	},
	{
		name: "A LITTLE BREEZY",
		subtitle: "Watch the striped bombs drift with the wind.",
		total: 16,
		interval: 0.76,
		speed: 3.2,
	},
	{
		name: "GOLDEN OPPORTUNITY",
		subtitle: "Gold bombs fill your splash. Make a splash!",
		total: 18,
		interval: 0.7,
		speed: 3.6,
	},
	{
		name: "TWO FOR TROUBLE",
		subtitle: "Quick pairs. One bucket. No excuses.",
		total: 20,
		interval: 0.65,
		speed: 3.9,
	},
	{
		name: "THE OLD SWITCHEROO",
		subtitle: "He feints. You catch. Nobody gets the last laugh.",
		total: 22,
		interval: 0.59,
		speed: 4.2,
	},
	{
		name: "BUCKETS OF NERVE",
		subtitle: "Faster bombs. Steady hands. You have got this.",
		total: 24,
		interval: 0.53,
		speed: 4.6,
	},
	{
		name: "THE BIG KA-SPLAT",
		subtitle: "Every trick in the book. Soak the show!",
		total: 28,
		interval: 0.47,
		speed: 5,
	},
]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = (value, fallback) =>
	Number.isFinite(Number(value)) ? Number(value) : fallback;

export class GameModel {
	constructor(RAPIER, { onEvent = () => {} } = {}) {
		this.RAPIER = RAPIER;
		this.onEvent = onEvent;
		this.config = { ...DEFAULT_CONFIG };
		this.world = new RAPIER.World({ x: 0, y: -7.2, z: 0 });
		this.world.timestep = 1 / 120;
		this._nextId = 1;
		this._accumulator = 0;
		this.bombs = [];
		this.players = [{ id: 0, x: 0, splashTime: 0 }];
		this.phase = "title";
		this.wave = 1;
		this.score = 0;
		this.combo = 0;
		this.maxCombo = 0;
		this.lives = 3;
		this.charge = 1;
		this.time = 0;
		this.waveTime = 0;
		this.bomberX = 0;
		this.transition = 0;
		this.waveProgress = 0;
		this.waveSpawned = 0;
		this.stats = this._emptyStats();
	}
	_emptyStats() {
		return {
			caught: 0,
			missed: 0,
			golden: 0,
			splashes: 0,
			perfectWaves: 0,
			waves: 0,
			repairs: 0,
		};
	}
	_emit(type, details = {}) {
		this.onEvent({ type, time: this.time, wave: this.wave, ...details });
	}
	get data() {
		return WAVE_DATA[this.wave - 1];
	}
	get waveTotal() {
		return this.data.total;
	}
	get rimY() {
		return 0.6 + (this.lives - 1) * 0.9;
	}
	start({ coop = false, attract = false, endless = false } = {}) {
		this._clearBombs();
		this.coop = coop;
		this.attract = attract;
		this.endless = endless;
		this.players = coop
			? [
					{ id: 0, x: -2.5, splashTime: 0 },
					{ id: 1, x: 2.5, splashTime: 0 },
				]
			: [{ id: 0, x: 0, splashTime: 0 }];
		Object.assign(this, {
			phase: "intermission",
			wave: 1,
			score: 0,
			combo: 0,
			maxCombo: 0,
			lives: 3,
			charge: 1,
			time: 0,
			waveTime: 0,
			bomberX: 0,
			transition: 2.2,
			waveProgress: 0,
			waveSpawned: 0,
		});
		this.stats = this._emptyStats();
		this._accumulator = 0;
		this._spawnTimer = 0.15;
		this._recovery = 0;
		this._waveMisses = 0;
		this._repairAt = 1000;
		this._pair = false;
		this._pausedPhase = null;
		this._pendingSplashes = [];
		this._emit("wave", {
			name: this.data.name,
			subtitle: this.data.subtitle,
			total: this.waveTotal,
		});
		return this.snapshot();
	}
	setConfig(partial = {}) {
		const limits = {
			fallSpeed: [0.25, 3],
			spawnRate: [0.25, 3],
			bucketWidth: [0.65, 3.5],
			moveSpeed: [5, 60],
			chargeRate: [0.1, 4],
			timeScale: [0.1, 4],
		};
		for (const key of Object.keys(DEFAULT_CONFIG)) {
			if (!(key in partial)) continue;
			const previous = this.config[key];
			this.config[key] =
				key in limits
					? clamp(finite(partial[key], previous), ...limits[key])
					: !!partial[key];
			if (key === "fallSpeed" && this.config[key] !== previous) {
				const ratio = this.config[key] / previous;
				for (const b of this.bombs) {
					const v = b.body.linvel();
					b.body.setLinvel({ x: v.x, y: v.y * ratio, z: 0 }, true);
					b.body.setGravityScale(this.config[key] ** 2, true);
				}
			}
		}
		return { ...this.config };
	}
	resetConfig() {
		this.config = { ...DEFAULT_CONFIG };
		return { ...this.config };
	}
	pause(value = true) {
		if (
			value &&
			this.phase !== "paused" &&
			["playing", "intermission"].includes(this.phase)
		) {
			this._pausedPhase = this.phase;
			this.phase = "paused";
		} else if (!value && this.phase === "paused") {
			this.phase = this._pausedPhase || "playing";
			this._pausedPhase = null;
		}
	}
	_clearBombs() {
		for (const b of this.bombs)
			if (this.world.bodies.contains(b.body.handle))
				this.world.removeRigidBody(b.body);
		this.bombs.length = 0;
	}
	_remove(b) {
		const index = this.bombs.indexOf(b);
		if (index < 0) return;
		this.bombs.splice(index, 1);
		if (this.world.bodies.contains(b.body.handle))
			this.world.removeRigidBody(b.body);
	}
	spawnBomb(kind = "normal", x = this.bomberX) {
		const R = this.RAPIER;
		const body = this.world.createRigidBody(
			R.RigidBodyDesc.dynamic()
				.setTranslation(clamp(x, -7.25, 7.25), 11, 0)
				.setCcdEnabled(true)
				.setCanSleep(false),
		);
		const vx = kind === "gust" ? (this.waveSpawned % 2 ? -0.68 : 0.68) : 0;
		body.setLinvel(
			{ x: vx, y: -this.data.speed * this.config.fallSpeed, z: 0 },
			true,
		);
		body.setGravityScale(this.config.fallSpeed * this.config.fallSpeed, true);
		body.setAngvel({ x: 0, y: 0, z: (this._nextId % 2 ? 1 : -1) * 1.9 }, true);
		const collider = this.world.createCollider(
			R.ColliderDesc.ball(kind === "gold" ? 0.24 : 0.23)
				.setCollisionGroups(0)
				.setActiveEvents(0),
			body,
		);
		const b = {
			id: this._nextId++,
			body,
			collider,
			kind,
			previousY: 11,
			previousX: clamp(x, -7.25, 7.25),
			age: 0,
		};
		this.bombs.push(b);
		this._emit("spawn", { id: b.id, x: body.translation().x, y: 11, kind });
		return b;
	}
	splash(index = 0) {
		const p = this.players[index];
		if (
			!p ||
			this.phase !== "playing" ||
			this.charge < 0.999 ||
			p.splashTime > 0
		)
			return false;
		this.charge = 0;
		p.splashTime = 1.1;
		this.stats.splashes++;
		this._emit("splash", { x: p.x, y: 3.5, player: index });
		return true;
	}
	restore() {
		this.lives = 3;
		this.charge = 1;
		this._recovery = 0;
		this.stats.repairs++;
		this._emit("repair", { x: this.players[0].x, y: this.rimY });
	}
	miss() {
		if (this.phase !== "playing" || this._recovery > 0) return false;
		const last = this.bombs.length
			? this.bombs[this.bombs.length - 1].body.translation()
			: { x: 0, y: 0 };
		this.waveProgress = Math.min(
			this.waveTotal,
			this.waveProgress + this.bombs.length,
		);
		this._clearBombs();
		this.stats.missed++;
		this._waveMisses++;
		this.combo = 0;
		const immortal = this.config.invincible || this.attract;
		if (!immortal) this.lives--;
		this._recovery = 1.2;
		this._spawnTimer = 0.25;
		this._emit("miss", { x: last.x, y: 0.1, lives: this.lives });
		if (this.lives <= 0) {
			this.phase = "lost";
			this._emit("lose", { score: this.score });
		}
		return true;
	}
	_catch(b, player, splash = false, catchY = this.rimY) {
		if (!this.bombs.includes(b)) return;
		const pos = b.body.translation();
		this.combo++;
		this.maxCombo = Math.max(this.maxCombo, this.combo);
		const points =
			this.wave * 10 +
			Math.min(30, Math.floor(this.combo / 5) * 5) +
			(b.kind === "gold" ? 100 : 0);
		this.score += points;
		this.stats.caught++;
		this.waveProgress++;
		this.charge = clamp(
			this.charge + (b.kind === "gold" ? 0.38 : 0.055) * this.config.chargeRate,
			0,
			1,
		);
		if (b.kind === "gold") this.stats.golden++;
		this._emit("catch", {
			x: pos.x,
			y: splash ? 3.5 : catchY,
			kind: b.kind,
			player,
			points,
			combo: this.combo,
			splash,
		});
		this._remove(b);
		while (this.score >= this._repairAt) {
			this._repairAt += 1000;
			if (this.lives < 3) {
				this.lives++;
				this.stats.repairs++;
				this._emit("repair", {
					x: this.players[player]?.x || 0,
					y: this.rimY,
					lives: this.lives,
				});
			}
		}
	}
	nextWave() {
		if (this.phase === "title") return;
		this._clearBombs();
		if (this._waveMisses === 0) this.stats.perfectWaves++;
		this.stats.waves = Math.max(this.stats.waves, this.wave);
		if (this.wave >= 8 && !this.endless) {
			this.phase = "won";
			this.transition = 0;
			this._emit("win", { score: this.score });
			return;
		}
		this.wave = this.wave >= 8 ? 1 : this.wave + 1;
		this.waveTime = 0;
		this.waveProgress = 0;
		this.waveSpawned = 0;
		this._spawnTimer = 0.15;
		this._recovery = 0;
		this._waveMisses = 0;
		this._pair = false;
		this.transition = 2.4;
		this.phase = "intermission";
		this.charge = Math.min(1, this.charge + 0.2);
		this._emit("wave", {
			name: this.data.name,
			subtitle: this.data.subtitle,
			total: this.waveTotal,
		});
	}
	_bomber() {
		const t = this.waveTime;
		switch (this.wave) {
			case 1:
				return Math.sin(t * 0.66) * 5.9;
			case 2:
				return Math.sin(t * 1.03) * 6.25;
			case 3:
				return Math.sin(t * 0.91) * 5.9;
			case 4:
				return Math.sin(t * 1.1) * 6.1;
			case 5:
				return Math.sin(t * 0.87) * 6.3;
			case 6:
				return Math.sin(t * 0.9) * 4.7 + Math.sin(t * 2.25) * 1.35;
			case 7:
				return Math.sin(t * 1.22) * 6.3;
			default:
				return Math.sin(t * 1.19) * 4.9 + Math.sin(t * 2.64) * 1.3;
		}
	}
	_spawn() {
		let kind = "normal";
		if (this.wave >= 3 && this.waveSpawned % 4 === 2) kind = "gust";
		if (this.wave >= 4 && this.waveSpawned % 6 === 3) kind = "gold";
		this.spawnBomb(kind);
		this.waveSpawned++;
		let interval = this.data.interval;
		if (this.wave === 5 || this.wave === 8) {
			this._pair = !this._pair;
			interval *= this._pair ? 0.56 : 1.44;
		}
		this._spawnTimer += interval / this.config.spawnRate;
	}
	update(dt, inputs = []) {
		if (!["playing", "intermission"].includes(this.phase)) return;
		dt = clamp(finite(dt, 0), 0, 0.25) * this.config.timeScale;
		// Fixed stepping makes scripted play and browser play share the same rules.
		this._accumulator += dt;
		this._pendingSplashes = this._pendingSplashes || [];
		inputs.forEach((input, index) => {
			this._pendingSplashes[index] =
				this._pendingSplashes[index] || !!input?.splash;
		});
		let splashInputs = this._pendingSplashes;
		while (this._accumulator >= 1 / 120) {
			this._accumulator -= 1 / 120;
			this._step(1 / 120, inputs, splashInputs);
			splashInputs = [];
			this._pendingSplashes = [];
			if (!["playing", "intermission"].includes(this.phase)) {
				this._accumulator = 0;
				break;
			}
		}
	}
	_step(dt, inputs, splashInputs) {
		this.time += dt;
		for (let i = 0; i < this.players.length; i++) {
			const p = this.players[i];
			p.splashTime = Math.max(0, p.splashTime - dt);
			let target = finite(inputs[i]?.x, p.x);
			if (this.config.autoplay || this.attract) {
				const candidates = this.bombs
					.filter(
						(_b, index) =>
							this.players.length === 1 || index % this.players.length === i,
					)
					.sort((a, b) => a.body.translation().y - b.body.translation().y);
				const first = candidates[0];
				target = first
					? first.body.translation().x + first.body.linvel().x * 0.09
					: this.bomberX;
				if (
					first &&
					first.body.translation().y < 4 &&
					Math.abs(target - p.x) > 1.3 &&
					this.charge >= 1
				)
					this.splash(i);
			}
			target = clamp(target, -7.6, 7.6);
			const delta = clamp(
				target - p.x,
				-this.config.moveSpeed * dt,
				this.config.moveSpeed * dt,
			);
			p.x += delta;
			if (splashInputs[i]) this.splash(i);
		}
		if (this.phase === "intermission") {
			this.transition = Math.max(0, this.transition - dt);
			if (this.transition <= 0) {
				this.phase = "playing";
				this._spawnTimer = 0.2;
			}
			return;
		}
		this.waveTime += dt;
		this.bomberX = this._bomber();
		if (this._recovery > 0) {
			this._recovery -= dt;
			return;
		}
		if (this.waveSpawned < this.waveTotal) {
			this._spawnTimer -= dt;
			if (this._spawnTimer <= 0) this._spawn();
		}
		for (const b of this.bombs) {
			const p = b.body.translation();
			b.previousY = p.y;
			b.previousX = p.x;
			b.age += dt;
		}
		this.world.step();
		for (const b of [...this.bombs]) {
			if (!this.bombs.includes(b)) continue;
			const pos = b.body.translation();
			if (Math.abs(pos.x) > 7.4) {
				b.body.setTranslation(
					{ x: clamp(pos.x, -7.4, 7.4), y: pos.y, z: 0 },
					true,
				);
				b.body.setLinvel(
					{ x: -b.body.linvel().x, y: b.body.linvel().y, z: 0 },
					true,
				);
			}
			let caught = false;
			for (let i = 0; i < this.players.length; i++) {
				const p = this.players[i];
				const splash = p.splashTime > 0;
				const rims = Array.from(
					{ length: this.lives },
					(_, level) => this.rimY - level * 0.9,
				);
				if (splash) rims.unshift(3.5);
				for (const rim of rims) {
					if (b.previousY >= rim && pos.y <= rim) {
						const fraction = (b.previousY - rim) / (b.previousY - pos.y || 1);
						const atX = b.previousX + (pos.x - b.previousX) * fraction;
						const curtain = splash && rim === 3.5;
						const halfWidth = curtain ? 3.05 : this.config.bucketWidth * 0.5;
						if (Math.abs(atX - p.x) <= halfWidth + 0.19) {
							this._catch(b, i, curtain, rim);
							caught = true;
							break;
						}
					}
				}
				if (caught) break;
				// A splash can also rescue a bomb that is already inside its curtain.
				if (
					splash &&
					pos.y < 3.5 &&
					pos.y > this.rimY &&
					Math.abs(pos.x - p.x) < 3.05
				) {
					this._catch(b, i, true);
					caught = true;
					break;
				}
			}
			if (!caught && pos.y < 0.12) {
				this.miss();
				break;
			}
		}
		if (
			this.phase === "playing" &&
			this.waveSpawned >= this.waveTotal &&
			this.bombs.length === 0 &&
			this._recovery <= 0
		)
			this.nextWave();
	}
	snapshot() {
		return {
			phase: this.phase,
			wave: this.wave,
			waveName: this.data.name,
			waveSubtitle: this.data.subtitle,
			waveProgress: this.waveProgress,
			waveTotal: this.waveTotal,
			score: this.score,
			combo: this.combo,
			maxCombo: this.maxCombo,
			lives: this.lives,
			charge: this.charge,
			bombs: this.bombs.map((b) => {
				const p = b.body.translation();
				const q = b.body.rotation();
				return {
					id: b.id,
					x: p.x,
					y: p.y,
					kind: b.kind,
					angle: 2 * Math.atan2(q.z, q.w),
				};
			}),
			players: this.players.map((p) => ({ ...p })),
			bomberX: this.bomberX,
			time: this.time,
			transition: this.transition,
			recovery: Math.max(0, this._recovery || 0),
			stats: { ...this.stats },
			coop: !!this.coop,
			attract: !!this.attract,
			endless: !!this.endless,
			config: { ...this.config },
			rimY: this.rimY,
		};
	}
	dispose() {
		this._clearBombs();
		this.world.free();
	}
}
