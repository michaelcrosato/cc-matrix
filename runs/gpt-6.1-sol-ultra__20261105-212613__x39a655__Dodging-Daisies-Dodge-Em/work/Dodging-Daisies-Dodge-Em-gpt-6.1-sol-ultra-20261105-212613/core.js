export const TITLE = "Dodging Daisies";
export const DEFAULTS = Object.freeze({
	speed: 8.6,
	enemySpeed: 7.0,
	boost: 1.8,
	aggression: 0.62,
	invulnerability: 3,
	pulseDuration: 2.5,
	god: false,
});
export const STAGES = [
	{
		name: "FIRST BLOOM",
		subtitle: "Gather the garden. Mind the red car.",
		enemies: 1,
		speed: 1,
		locked: false,
		color: "#ffd166",
	},
	{
		name: "PETAL TO THE METAL",
		subtitle: "Hold the accelerator. Find your gap.",
		enemies: 1,
		speed: 1.12,
		locked: false,
		color: "#85d5c6",
	},
	{
		name: "DOUBLE TROUBLE",
		subtitle: "Two crash cars. Keep a lane in reserve.",
		enemies: 2,
		speed: 1.13,
		locked: false,
		color: "#ff9479",
	},
	{
		name: "THE LAST LAUGH",
		subtitle: "Amber gate closed? Take the next opening.",
		enemies: 2,
		speed: 1.2,
		locked: true,
		color: "#b8aff0",
	},
];
const mod = (a, n = 1) => ((a % n) + n) % n;
const clamp = (a, l, h) => Math.max(l, Math.min(h, a));
export function trackLength(lane) {
	const w = 13 - lane * 2.15,
		h = 8.6 - lane * 2.15,
		r = 1;
	return 4 * (w + h - 2 * r + (Math.PI * r) / 2);
}
function rawPoint(t, lane) {
	const w = 13 - lane * 2.15,
		h = 8.6 - lane * 2.15,
		r = 1;
	const qlen = w + h - 2 * r + (Math.PI * r) / 2;
	let d = mod(t) * qlen * 4;
	const segments = [
		["line", w, 0, w, -h + r, h - r],
		["arc", w - r, -h + r, 0, -Math.PI / 2, (Math.PI * r) / 2],
		["line", w - r, -h, 0, -h, w - r],
		["line", 0, -h, -w + r, -h, w - r],
		["arc", -w + r, -h + r, -Math.PI / 2, -Math.PI, (Math.PI * r) / 2],
		["line", -w, -h + r, -w, 0, h - r],
		["line", -w, 0, -w, h - r, h - r],
		["arc", -w + r, h - r, Math.PI, Math.PI / 2, (Math.PI * r) / 2],
		["line", -w + r, h, 0, h, w - r],
		["line", 0, h, w - r, h, w - r],
		["arc", w - r, h - r, Math.PI / 2, 0, (Math.PI * r) / 2],
		["line", w, h - r, w, 0, h - r],
	];
	for (const s of segments) {
		if (d <= s[5] + 1e-8) {
			const k = clamp(d / s[5], 0, 1);
			return s[0] === "line"
				? { x: s[1] + (s[3] - s[1]) * k, z: s[2] + (s[4] - s[2]) * k }
				: {
						x: s[1] + Math.cos(s[3] + (s[4] - s[3]) * k) * r,
						z: s[2] + Math.sin(s[3] + (s[4] - s[3]) * k) * r,
					};
		}
		d -= s[5];
	}
	return { x: w, z: 0 };
}
export function trackPoint(t, lane) {
	const p = rawPoint(t, lane),
		n = rawPoint(t + 0.00001, lane);
	return { ...p, angle: Math.atan2(n.x - p.x, n.z - p.z) };
}
export class Game {
	constructor(events = () => {}, collisions = null) {
		this.events = events;
		this.collisions = collisions;
		this.settings = { ...DEFAULTS };
		this.serial = 0;
		this.best = 0;
		this.reset("title");
	}
	reset(mode = "title", count = 1) {
		this.state = {
			mode,
			stage: 1,
			time: 0,
			stageTime: 0,
			score: 0,
			best: this.best,
			lives: count === 2 ? 4 : 3,
			players: [],
			enemies: [],
			dots: [],
			gateOpen: [true, true, true, true],
			pulse: 20,
			combo: 0,
			comboTimer: 0,
			nearMisses: 0,
			crashes: 0,
			flowers: 0,
			attract: false,
			shake: 0,
			countdown: 0,
			clearTimer: 0,
			runTime: 0,
			playerCount: count,
			theme: 0,
			won: false,
		};
		this.serial++;
		this.populate();
		return this.state;
	}
	start(count = 1, attract = false) {
		this.reset(attract ? "attract" : "playing", count);
		this.state.attract = attract;
		this.state.countdown = attract ? 0 : 2.7;
		this.emit("start");
		return this.state;
	}
	emit(type, data = {}) {
		this.events({ type, ...data });
	}
	populate() {
		const s = this.state;
		s.dots = Array.from({ length: 80 }, (_, id) => ({
			id,
			t: mod(((id % 20) + 0.5) / 20),
			lane: Math.floor(id / 20),
			collected: false,
		}));
		s.players = Array.from({ length: s.playerCount }, (_, i) => ({
			id: "p" + i,
			t: i ? 0.5 : 0.75,
			lane: i ? 2 : 0,
			renderLane: i ? 2 : 0,
			alive: true,
			invincible: 3,
			boost: false,
			color: i ? "#78dfdb" : "#ffd65c",
			role: "player",
			queue: 0,
			held: 0,
			pulse: 0,
			lastGate: -1,
			autoTarget: null,
		}));
		s.enemies = Array.from({ length: STAGES[s.stage - 1].enemies }, (_, i) => ({
			id: "e" + i,
			t: i ? 0.38 : 0.13,
			lane: i ? 2 : 0,
			renderLane: i ? 2 : 0,
			invincible: 0,
			boost: false,
			color: i ? "#af9be5" : "#f27061",
			role: "enemy",
			lastGate: -1,
			nearCooldown: 0,
		}));
		s.stageTime = 0;
		s.gateOpen = [true, true, true, true];
		s.theme = s.stage - 1;
		this.serial++;
	}
	request(index, direction) {
		const p = this.state.players[index];
		if (!p || !direction) return;
		p.queue = clamp(p.queue + clamp(Math.round(direction), -2, 2), -2, 2);
		this.emit("queue", { player: index, lane: clamp(p.lane + p.queue, 0, 3) });
	}
	input(index, input) {
		const p = this.state.players[index];
		if (!p) return;
		if (input.shift) this.request(index, input.shift);
		p.boost = !!input.boost;
		p.held = input.held || 0;
		if (input.pulse) this.pulse(index);
	}
	pulse(index) {
		const s = this.state,
			p = s.players[index];
		if (!p || s.pulse < 20 || p.pulse > 0) return false;
		s.pulse = 0;
		p.pulse = this.settings.pulseDuration;
		this.emit("pulse", { player: index, ...trackPoint(p.t, p.renderLane) });
		return true;
	}
	pause() {
		if (["playing", "attract"].includes(this.state.mode)) {
			this.resumeMode = this.state.mode;
			this.state.mode = "paused";
		} else if (this.state.mode === "paused")
			this.state.mode = this.resumeMode || "playing";
	}
	nextStage() {
		const s = this.state;
		if (s.stage >= 4) {
			s.mode = "victory";
			s.won = true;
			this.best = Math.max(this.best, s.score);
			s.best = this.best;
			this.emit("win");
			return;
		}
		s.stage++;
		s.mode = s.attract ? "attract" : "playing";
		s.countdown = s.attract ? 0 : 2.1;
		s.pulse = 20;
		this.populate();
		this.emit("stage");
	}
	crash(p) {
		const s = this.state;
		if (p.invincible > 0 || p.pulse > 0 || this.settings.god || s.attract)
			return;
		s.lives--;
		s.crashes++;
		s.combo = 0;
		p.invincible = this.settings.invulnerability;
		s.shake = 0.5;
		s.score = Math.max(0, s.score - 25);
		this.emit("crash", { ...trackPoint(p.t, p.renderLane) });
		if (s.lives <= 0) {
			s.mode = "gameover";
			this.best = Math.max(this.best, s.score);
			s.best = this.best;
			this.emit("over");
		}
	}
	auto(p, index = 0) {
		const s = this.state;
		if (!p.autoTarget || s.dots[p.autoTarget.id]?.collected) {
			const dots = s.dots.filter((d) => !d.collected);
			dots.sort(
				(a, b) =>
					Math.abs(a.lane - p.lane) * 0.11 +
					mod(a.t - p.t) -
					Math.abs(b.lane - p.lane) * 0.11 -
					mod(b.t - p.t),
			);
			p.autoTarget = dots[0] || null;
		}
		if (p.autoTarget) {
			p.queue = clamp(p.autoTarget.lane - p.lane, -2, 2);
			p.boost = true;
		}
		if (!p.bot && s.pulse >= 20 && s.stageTime > 3) this.pulse(index);
	}
	step(dt = 1 / 60) {
		const s = this.state;
		dt = Math.min(dt, 0.05);
		s.time += dt;
		s.shake = Math.max(0, s.shake - dt);
		if (!["playing", "attract"].includes(s.mode)) {
			if (s.mode === "clear") {
				s.clearTimer -= dt;
				if (s.clearTimer <= 0) {
					if (s.attract && s.stage === 4) {
						this.start(s.playerCount, true);
					} else this.nextStage();
				}
			}
			return;
		}
		if (s.countdown > 0) {
			s.countdown = Math.max(0, s.countdown - dt);
			return;
		}
		s.stageTime += dt;
		s.runTime += dt;
		s.comboTimer -= dt;
		if (s.comboTimer <= 0) s.combo = 0;
		const stage = STAGES[s.stage - 1];
		s.gateOpen = [true, true, true, true];
		if (stage.locked) {
			s.gateOpen[Math.floor(s.stageTime / 6) % 4] = false;
		}
		for (let i = 0; i < s.players.length; i++) {
			const p = s.players[i];
			p.invincible = Math.max(0, p.invincible - dt);
			p.pulse = Math.max(0, p.pulse - dt);
			if (s.attract || this.autopilot || p.bot) this.auto(p, i);
			const prev = p.t;
			const speed =
				this.settings.speed * stage.speed * (p.boost ? this.settings.boost : 1);
			p.t = mod(p.t + (speed / trackLength(p.lane)) * dt);
			this.crossGates(p, prev, 1, (gate) => {
				if (!s.gateOpen[gate]) return;
				if (!p.queue && p.held) p.queue = p.held;
				if (p.queue) {
					const max = p.boost ? 1 : 2;
					const target = clamp(p.lane + clamp(p.queue, -max, max), 0, 3);
					if (target !== p.lane) {
						p.lane = target;
						this.emit("gate", { player: i, gate });
					}
					p.queue = 0;
				}
			});
			p.renderLane += (p.lane - p.renderLane) * Math.min(1, dt * 18);
			for (const d of s.dots) {
				if (
					d.collected ||
					d.lane !== p.lane ||
					Math.abs(p.renderLane - p.lane) > 0.35
				)
					continue;
				const traveled = mod(p.t - prev),
					distance = mod(d.t - prev);
				if (distance <= traveled + 0.008 && distance >= 0) {
					d.collected = true;
					s.flowers++;
					s.combo = Math.min(10, s.combo + 1);
					s.comboTimer = 2.2;
					s.score += 10 + (s.combo >= 8 ? 5 : 0);
					s.pulse = Math.min(20, s.pulse + 1);
					this.emit("collect", { ...trackPoint(d.t, d.lane), combo: s.combo });
				}
			}
		}
		for (const e of s.enemies) {
			const prev = e.t;
			e.t = mod(
				e.t -
					((this.settings.enemySpeed * stage.speed) / trackLength(e.lane)) * dt,
			);
			e.nearCooldown = Math.max(0, e.nearCooldown - dt);
			this.crossGates(e, prev, -1, (gate) => {
				if (!s.gateOpen[gate]) return;
				const target = s.players.reduce(
					(a, p) =>
						Math.abs(p.lane - e.lane) < Math.abs(a.lane - e.lane) ? p : a,
					s.players[0],
				);
				const deterministic = mod(
					Math.sin((gate + 1) * 19.17 + s.stageTime * 7.33) * 113.5,
				);
				if (deterministic < this.settings.aggression) {
					e.lane = clamp(e.lane + Math.sign(target.lane - e.lane), 0, 3);
				}
			});
			e.renderLane += (e.lane - e.renderLane) * Math.min(1, dt * 14);
			for (const p of s.players) {
				const a = trackPoint(p.t, p.renderLane),
					b = trackPoint(e.t, e.renderLane);
				const dist = Math.hypot(a.x - b.x, a.z - b.z);
				if (dist > 1.35 && dist < 2.7 && e.nearCooldown <= 0) {
					s.score += 20;
					s.nearMisses++;
					e.nearCooldown = 2;
					this.emit("near", { ...a });
				}
			}
		}
		const hits = this.collisions
			? this.collisions(s, dt)
			: this.mathCollisions();
		for (const index of hits) {
			this.crash(s.players[index]);
			if (s.mode === "gameover") break;
		}
		if (s.mode === "gameover") return;
		if (s.dots.every((d) => d.collected)) {
			s.score += 250 + s.lives * 50;
			s.mode = "clear";
			s.clearTimer = s.attract ? 1.2 : 3.2;
			this.emit("clear");
		}
	}
	crossGates(car, previous, direction, callback) {
		const distance =
			direction > 0 ? mod(car.t - previous) : mod(previous - car.t);
		for (let g = 0; g < 4; g++) {
			const d = direction > 0 ? mod(g / 4 - previous) : mod(previous - g / 4);
			if (d > 0 && d <= distance + 0.0000001) {
				callback(g);
				car.lastGate = g;
			}
		}
	}
	mathCollisions() {
		const s = this.state;
		const hits = [];
		s.players.forEach((p, i) => {
			const a = trackPoint(p.t, p.renderLane);
			if (
				s.enemies.some((e) => {
					const b = trackPoint(e.t, e.renderLane);
					return Math.hypot(a.x - b.x, a.z - b.z) < 1.12;
				})
			)
				hits.push(i);
		});
		return hits;
	}
	snapshot() {
		return JSON.parse(JSON.stringify(this.state));
	}
}
