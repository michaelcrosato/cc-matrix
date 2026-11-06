import { clone, courseGarden, GARDENS } from "../content/gardens.js";
import { World } from "../sim/world.js";

const q = (n) => Math.round(n * 100) / 100;
const MODES = ["forage", "warning", "pursue", "bait"];
export function packView(v, n, ack = [], events = []) {
	return {
		t: "s",
		n,
		g: v.level,
		W: v.wave || 0,
		r: v.phase,
		T: q(v.t),
		time: q(v.totalTime),
		s: v.score,
		l: v.lives,
		b: v.seeds,
		f: q(v.fright),
		c: v.combo,
		cl: q(v.comboLeft),
		st: v.stats,
		gs: v.gardenStats,
		no: v.notice,
		nl: q(v.noticeLeft),
		a: ack,
		e: events,
		p: v.players.map((p) => [
			p.id,
			q(p.x),
			q(p.y),
			...p.dir,
			q(p.invuln),
			q(p.respawn),
			q(p.bite),
			q(p.plant),
		]),
		h: v.crawlers.map((c) => [
			c.id,
			q(c.x),
			q(c.y),
			...c.dir,
			c.segments,
			MODES.indexOf(c.mode),
			q(c.chew),
			q(c.warning),
			c.body.map((b) => [q(b.x), q(b.y)]),
		]),
		w: v.sentries.map((w) => [w.id, q(w.x), q(w.y), ...w.dir, q(w.spin)]),
		tr: v.trees.map((c) => (c[1] * v.garden.w + c[0]).toString(36)).join("."),
		ba: v.bait.map((b) => [b.owner, b.x, b.y]),
	};
}
export function unpackView(p) {
	const garden = courseGarden(GARDENS[p.g], p.W || 0);
	return {
		level: p.g,
		wave: p.W || 0,
		garden,
		t: p.T,
		totalTime: p.time,
		phase: p.r,
		score: p.s,
		lives: p.l,
		seeds: p.b,
		fright: p.f,
		combo: p.c,
		comboLeft: p.cl,
		stats: p.st,
		gardenStats: p.gs,
		notice: p.no,
		noticeLeft: p.nl,
		modified: false,
		demo: false,
		remaining: p.h.reduce((n, c) => n + c[5], 0),
		players: p.p.map((a) => ({
			id: a[0],
			x: a[1],
			y: a[2],
			dir: a.slice(3, 5),
			invuln: a[5],
			respawn: a[6],
			bite: a[7],
			plant: a[8],
			moving: true,
		})),
		crawlers: p.h.map((a) => ({
			id: a[0],
			x: a[1],
			y: a[2],
			dir: a.slice(3, 5),
			segments: a[5],
			mode: MODES[a[6]],
			chew: a[7],
			warning: a[8],
			body: a[9].map((c, i) => ({
				x: c[0],
				y: c[1],
				index: i + 1,
				tail: i === a[9].length - 1,
			})),
		})),
		sentries: p.w.map((a) => ({
			id: a[0],
			x: a[1],
			y: a[2],
			dir: a.slice(3, 5),
			spin: a[5],
			fright: p.f,
		})),
		trees: p.tr
			? p.tr.split(".").map((s) => {
					const n = parseInt(s, 36);
					return [n % garden.w, Math.floor(n / garden.w)];
				})
			: [],
		bait: p.ba.map((b) => ({ owner: b[0], x: b[1], y: b[2] })),
	};
}
export class HubCoop {
	constructor(hub, callbacks = {}) {
		this.hub = hub;
		this.cb = callbacks;
		this.active = hub.active;
		this.started = false;
		this.ended = false;
		this.finished = false;
		this.info = null;
		this.world = null;
		this.remote = null;
		this.display = null;
		this.sendClock = 0;
		this.inputClock = 0;
		this.snapSeq = 0;
		this.lastSnap = -1;
		this.seq = 0;
		this.action = 0;
		this.pending = new Map();
		this.heard = new Map();
		this.ack = [];
		this.seenPlants = new Map();
		this.eventLog = [];
		this.lastEvent = 0;
		this.stageClock = 0;
		this.elapsed = 0;
		this.plantClock = 0.25;
		this.maxPayload = 0;
		this.received = 0;
		this.sent = 0;
		this.off = [
			hub.on("start", () => {
				this.started = true;
			}),
			hub.on("message", (d, from) => this.message(d, from)),
			hub.on("leave", (e) => this.leave(e.id)),
			hub.on("time-up", () => this.finish(false)),
			hub.on("end", (e) => {
				this.ended = true;
				this.started = false;
				this.pending.clear();
				this.heard.clear();
				this.cb.end?.(e);
			}),
		];
	}
	async connect() {
		const info = await this.hub.connect({
			mode: "shared-world",
			seats: [1, 2],
		});
		this.active = !!info;
		if (!info) return null;
		this.info = info;
		this.world = new World({
			ids: info.players.map((p) => p.id),
			players: info.players.length,
			seed: info.seed,
		});
		this.remote = this.world.view();
		this.display = clone(this.remote);
		this.cb.ready?.(this);
		this.hub.ready();
		return info;
	}
	send(data, options) {
		if (this.ended || !this.active) return false;
		this.maxPayload = Math.max(this.maxPayload, JSON.stringify(data).length);
		this.sent++;
		return this.hub.send(data, options);
	}
	message(d, from) {
		if (this.ended || !this.info || !d || typeof d !== "object") return;
		this.received++;
		if (this.info.isHost) {
			if (!this.world.s.ids.includes(from)) return;
			const current = this.world.s.level * 8 + (this.world.s.wave || 0);
			if (
				d.t === "p" &&
				typeof d.id === "string" &&
				d.id.length < 40 &&
				(d.g !== current ||
					!this.started ||
					this.hub.time() < 0 ||
					this.finished)
			) {
				this.send(
					{ t: "a", k: `${from}/${d.g}/${d.id}`, ok: false },
					{ to: from, reliable: true },
				);
				return;
			}
			if (
				d.g !== current ||
				!this.started ||
				this.hub.time() < 0 ||
				this.finished
			)
				return;
			if (d.t === "i" && Number.isSafeInteger(d.seq) && d.seq >= 0) {
				const old = this.heard.get(from) || { seq: -1 };
				if (d.seq <= old.seq) return;
				const dir =
					Array.isArray(d.d) &&
					d.d.length === 2 &&
					Math.abs(d.d[0]) + Math.abs(d.d[1]) === 1
						? d.d
						: null;
				this.heard.set(from, {
					seq: d.seq,
					dir,
					stop: !!d.stop,
					at: this.world.s.totalTime,
				});
			}
			if (d.t === "p" && typeof d.id === "string" && d.id.length < 40) {
				const k = `${from}/${d.g}/${d.id}`,
					prior = this.seenPlants.get(k);
				if (prior !== undefined) {
					this.send({ t: "a", k, ok: prior }, { to: from, reliable: true });
					return;
				}
				const p = this.world.players.find((p) => p.id === from);
				const result = this.world.plant(p, k);
				this.seenPlants.set(k, result.accepted);
				const event = this.world.events.at(-1);
				if (event) {
					this.eventLog.push(event);
					this.eventLog = this.eventLog.slice(-8);
					this.cb.event?.(event);
				}
				this.ack.push([k, result.accepted]);
				if (this.ack.length > 24) this.ack.shift();
				this.send(
					{ t: "a", k, ok: result.accepted },
					{ to: from, reliable: true },
				);
			}
		} else if (from === this.info.host) {
			if (
				d.t === "s" &&
				Number.isSafeInteger(d.n) &&
				d.n > this.lastSnap &&
				Number.isInteger(d.g) &&
				GARDENS[d.g]
			) {
				this.lastSnap = d.n;
				const old = (this.remote?.level || 0) * 8 + (this.remote?.wave || 0);
				this.remote = unpackView(d);
				if (!this.display || old !== d.g * 8 + (d.W || 0)) {
					this.display = clone(this.remote);
					for (const [k, p] of this.pending)
						if (p.packet.g !== d.g * 8 + (d.W || 0)) {
							this.pending.delete(k);
							this.cb.event?.({ type: "invalid" });
						}
				}
				for (const a of d.a || []) this.pending.delete(a[0]);
				for (const e of d.e || [])
					if (e.id > this.lastEvent) {
						this.lastEvent = e.id;
						this.cb.event?.(e);
					}
				if (old !== d.g * 8 + (d.W || 0)) this.cb.stage?.(d.g);
			}
			if (d.t === "a") this.pending.delete(d.k);
		}
	}
	leave(id) {
		if (!this.info) return;
		this.info.players = this.info.players.filter((p) => p.id !== id);
		this.heard.delete(id);
		if (this.info.isHost) {
			this.world.removePlayer(id);
			this.broadcast(true);
		}
		this.cb.leave?.(id);
	}
	broadcast(reliable = false) {
		if (!this.info?.isHost || this.ended) return;
		this.send(
			packView(
				this.world.view(),
				++this.snapSeq,
				this.ack.slice(-8),
				this.eventLog,
			),
			{ reliable },
		);
	}
	finish(won) {
		if (!this.info?.isHost || this.finished || this.ended) return;
		this.finished = true;
		this.broadcast(true);
		const ids = this.info.players.map((p) => p.id);
		this.hub.finish({
			standings: [ids],
			scores: Object.fromEntries(ids.map((id) => [id, this.world.s.score])),
			won: !!won,
			stats: Object.fromEntries(
				ids.map((id) => [
					id,
					{
						Gardens:
							this.world.s.level + (this.world.s.phase === "victory" ? 1 : 0),
						Bites: this.world.s.stats.bites,
						Catches: this.world.s.stats.catches,
					},
				]),
			),
		});
		this.cb.finish?.(won);
	}
	tick(dt, command = {}) {
		if (
			!this.active ||
			!this.info ||
			this.ended ||
			this.finished ||
			!this.started ||
			this.hub.time() < 0
		)
			return;
		this.elapsed += dt;
		this.plantClock += dt;
		const local = this.info.players.some((p) => p.id === this.info.me);
		if (this.info.isHost) {
			const commands = {};
			for (const id of this.world.s.ids) {
				const heard = this.heard.get(id);
				commands[id] =
					id === this.info.me && local
						? command
						: heard && this.world.s.totalTime - heard.at < 0.65
							? { dir: heard.dir, stop: heard.stop }
							: { stop: true };
			}
			this.world.step(dt, commands);
			for (const e of this.world.events) {
				this.cb.event?.(e);
				this.eventLog.push(e);
			}
			this.eventLog = this.eventLog.slice(-8);
			this.world.events = [];
			if (this.world.s.phase === "clear") {
				this.stageClock += dt;
				if (this.stageClock > 3) {
					this.stageClock = 0;
					this.world.nextGarden();
					this.heard.clear();
					this.broadcast(true);
					this.cb.stage?.(this.world.s.level);
				}
			}
			if (this.world.s.phase === "victory" || this.world.s.phase === "defeat")
				this.finish(this.world.s.phase === "victory");
			this.sendClock += dt;
			if (this.sendClock >= 0.1) {
				this.sendClock %= 0.1;
				this.broadcast();
			}
		} else if (local) {
			if (command.plant) {
				const id = String(++this.action),
					k =
						this.info.me +
						"/" +
						(this.remote.level * 8 + (this.remote.wave || 0)) +
						"/" +
						id;
				this.pending.set(k, {
					packet: {
						t: "p",
						g: this.remote.level * 8 + (this.remote.wave || 0),
						id,
					},
					lastSent: -999,
				});
			}
			if (this.plantClock >= 0.25) {
				const retry = [...this.pending.values()].find(
					(p) => this.elapsed - p.lastSent >= 0.5,
				);
				if (retry) {
					this.plantClock = 0;
					retry.lastSent = this.elapsed;
					this.send(retry.packet, { to: this.info.host, reliable: true });
				}
			}
			this.inputClock += dt;
			if (this.inputClock >= 0.125) {
				this.inputClock %= 0.125;
				this.send(
					{
						t: "i",
						g: this.remote.level * 8 + (this.remote.wave || 0),
						seq: ++this.seq,
						d: command.dir || null,
						stop: !!command.stop,
					},
					{ to: this.info.host, reliable: false },
				);
			}
		}
		if (!this.info.isHost && this.remote) {
			const old = this.display;
			this.display = clone(this.remote);
			for (const list of ["players", "crawlers", "sentries"])
				for (const p of this.display[list]) {
					const before = old[list].find((a) => a.id === p.id);
					if (before && Math.hypot(p.x - before.x, p.y - before.y) < 1.2) {
						const k = 1 - Math.exp(-dt * 20);
						p.x = before.x + (p.x - before.x) * k;
						p.y = before.y + (p.y - before.y) * k;
					}
				}
		}
	}
	current() {
		return this.info?.isHost ? this.world.view() : this.display || this.remote;
	}
	diagnostics() {
		return {
			active: this.active,
			started: this.started,
			ended: this.ended,
			finished: this.finished,
			host: this.info?.isHost,
			server: !!this.info?.server,
			local: !!this.info?.players.some((p) => p.id === this.info.me),
			seq: this.lastSnap,
			sent: this.sent,
			received: this.received,
			maxPayload: this.maxPayload,
			pending: this.pending.size,
			authoritative: this.info?.isHost ? this.world.view() : this.remote,
		};
	}
	dispose() {
		this.off.forEach((f) => {
			f?.();
		});
		this.pending.clear();
		this.heard.clear();
	}
}
