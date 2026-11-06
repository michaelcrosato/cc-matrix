import { Simulation } from "../sim/simulation.js";
const round = (n) => Math.round(n * 100) / 100;
export class Session {
	constructor(getSim, setSim, ended) {
		this.getSim = getSim;
		this.setSim = setSim;
		this.ended = ended;
		this.info = null;
		this.active = false;
		this.done = false;
		this.finished = false;
		this.inputTime = 0;
		this.fastTime = 0;
		this.slowTime = 0;
		this.action = 0;
		this.inputSeq = 0;
		this.lastFast = -1;
		this.lastSlow = -1;
		this.remoteSeq = {};
		this.pending = [];
		this.stats = { sent: 0, received: 0, maxFast: 0, finishCalls: 0 };
		this.present = [];
	}
	async connect() {
		const H = globalThis.AIHub;
		this.info = await H.connect({ mode: "shared-world", seats: [1, 2] });
		if (!this.info) return null;
		this.active = true;
		this.present = H.players.map((p) => p.id);
		this.setSim(
			new Simulation({
				seed: H.seed,
				players: this.present,
				loadout: 1,
				difficulty: 1,
			}),
		);
		const s = this.getSim();
		s.aircraft.throttle = 0.87;
		H.on("message", (data, from) => this.receive(data, from));
		H.on("leave", ({ id }) => {
			this.present = this.present.filter((p) => p !== id);
			if (H.isHost) {
				this.getSim().removePlayer(id);
				this.slowTime = 2;
			}
		});
		H.on("time-up", () => {
			if (H.isHost && !this.done) {
				if (!this.getSim().ended) this.getSim().finish("deadline");
				this.finish();
			}
		});
		H.on("end", () => {
			this.done = true;
			this.pending = [];
			for (const p of this.getSim().players) p.input = {};
			this.ended();
		});
		return this.info;
	}
	get host() {
		return !this.active || AIHub.isHost;
	}
	get me() {
		return this.active ? AIHub.me : 0;
	}
	send(data, reliable = false, to) {
		if (this.done) return;
		const o = { reliable };
		if (to != null) o.to = to;
		AIHub.send(data, o);
		this.stats.sent++;
	}
	command(id, type, data = {}) {
		if (this.done || this.finished) return false;
		if (!this.active) return this.getSim().command(id, type, data);
		if (id !== AIHub.me || AIHub.server) return false;
		if (type === "input") {
			this.localInput = data;
			if (this.host) return this.getSim().command(id, type, data);
			return true;
		}
		const action = ++this.action;
		if (this.host) return this.getSim().command(id, type, data, action);
		this.send({ k: "a", n: action, t: type, d: data }, true, AIHub.host);
		return true;
	}
	receive(d, from) {
		if (this.done || !d || typeof d !== "object") return;
		this.stats.received++;
		if (this.host) {
			if (!this.present.includes(from)) return;
			if (
				d.k === "i" &&
				Number.isSafeInteger(d.n) &&
				d.n > (this.remoteSeq[from] ?? -1)
			) {
				this.remoteSeq[from] = d.n;
				this.getSim().command(from, "input", d.d);
			}
			if (
				d.k === "a" &&
				typeof d.t === "string" &&
				[
					"station",
					"accept",
					"route",
					"hold",
					"doors",
					"salvo",
					"release",
					"extinguish",
					"cancelStation",
				].includes(d.t)
			) {
				this.getSim().command(from, d.t, d.d, d.n);
				this.slowTime = 1;
			}
			return;
		}
		if (from !== AIHub.host) return;
		const s = this.getSim();
		if (d.k === "s" && d.n > this.lastFast) {
			this.lastFast = d.n;
			const a = s.aircraft,
				keys = [
					"x",
					"y",
					"z",
					"heading",
					"bank",
					"pitch",
					"speed",
					"throttle",
					"fuel",
					"hull",
					"vx",
					"vy",
					"vz",
					"doors",
					"gear",
					"hurt",
				];
			d.a.forEach((v, i) => {
				if (Number.isFinite(v)) a[keys[i]] = v;
			});
			s.time = d.t;
			s.phase = d.p;
			s.enemies = d.e.map((e) => ({
				id: e[0],
				x: e[1],
				y: e[2],
				z: e[3],
				heading: e[4],
				bank: e[5],
				hp: e[6],
				bearing: e[7],
				age: e[8],
				state: e[9],
				alive: true,
				vx: e[10] || 0,
				vy: e[11] || 0,
				vz: e[12] || 0,
			}));
			for (const e of d.g || []) {
				const p = s.player(e[0]);
				if (p) {
					p.aimYaw = e[1];
					p.aimPitch = e[2];
				}
			}
		}
		if (d.k === "w" && d.n > this.lastSlow) {
			this.lastSlow = d.n;
			const { aircraft, ...state } = d.s;
			Object.assign(s, state);
			Object.assign(s.aircraft, aircraft);
			s.events = d.v || [];
		}
		if (d.k === "final") {
			Object.assign(s, d.s);
			s.events = [];
		}
	}
	step(dt) {
		if (!this.active || this.done || this.finished) return;
		const H = AIHub;
		if (H.time() < 0) return;
		this.inputTime += dt;
		this.fastTime += dt;
		this.slowTime += dt;
		const now = performance.now();
		if (!this.host && now - (this.inputAt || 0) >= 125) {
			this.inputAt = now;
			this.send(
				{ k: "i", n: ++this.inputSeq, d: this.localInput || {} },
				false,
				H.host,
			);
		}
		if (this.host) {
			const s = this.getSim();
			if (now - (this.fastAt || 0) >= 125) {
				this.fastAt = now;
				const a = s.aircraft,
					keys = [
						"x",
						"y",
						"z",
						"heading",
						"bank",
						"pitch",
						"speed",
						"throttle",
						"fuel",
						"hull",
						"vx",
						"vy",
						"vz",
						"doors",
						"gear",
						"hurt",
					];
				const data = {
					k: "s",
					n: s.tick,
					t: round(s.time),
					p: s.phase,
					a: keys.map((k) => round(a[k])),
					e: s.enemies
						.filter((e) => e.alive)
						.map((e) => [
							e.id,
							round(e.x),
							round(e.y),
							round(e.z),
							round(e.heading),
							round(e.bank),
							e.hp,
							e.bearing,
							round(e.age),
							e.state,
							round(e.vx),
							round(e.vy),
							round(e.vz),
						]),
					g: s.players.map((p) => [p.id, round(p.aimYaw), round(p.aimPitch)]),
				};
				this.stats.maxFast = Math.max(
					this.stats.maxFast,
					JSON.stringify(data).length,
				);
				this.send(data, false);
			}
			if (now - (this.slowAt || 0) >= (this.slowTime >= 1 ? 250 : 500)) {
				this.slowAt = now;
				this.slowTime = 0;
				const state = s.snapshot();
				for (const k of ["enemies", "shots", "time", "tick"]) delete state[k];
				state.players = state.players.map(({ input, ...p }) => p);
				this.send(
					{
						k: "w",
						n: s.tick,
						s: state,
						v: s.events
							.filter((e) => !["gun", "enemy-shot"].includes(e.type))
							.slice(-12),
					},
					true,
				);
			}
			if (s.ended) this.finish();
		}
	}
	finish() {
		if (!this.active || !this.host || this.finished || this.done) return;
		this.finished = true;
		this.stats.finishCalls++;
		const s = this.getSim(),
			r = s.result || {},
			ids = this.present;
		this.send(
			{
				k: "final",
				s: {
					aircraft: s.aircraft,
					owners: s.owners,
					stats: s.stats,
					result: s.result,
					ended: true,
					phase: "debrief",
					time: s.time,
				},
			},
			true,
		);
		const report = {
			standings: [ids],
			scores: Object.fromEntries(ids.map((id) => [id, r.score || 0])),
			won: !!r.won,
			stats: Object.fromEntries(
				ids.map((id) => [
					id,
					{
						"Targets disabled": s.stats.targets,
						"Fighters down": s.stats.kills,
						"Crew home": s.stats.returned ? "Yes" : "No",
					},
				]),
			),
		};
		this.finishTimer = setTimeout(() => {
			if (!this.done) AIHub.finish(report);
		}, 60);
	}
}
