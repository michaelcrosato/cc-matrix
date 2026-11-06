/** AI Hub v1 shared-aircraft adapter. No transport other than the released Hub API. */
const STATIONS = new Set([
	"pilot",
	"nose",
	"starboard",
	"tail",
	"port",
	"bombs",
]);
const ROUTES = new Set(["home", "harbor", "refinery", "battery", "dogleg"]);
const ACTIONS = new Set([
	"station",
	"release",
	"route",
	"extinguish",
	"jettison",
	"hold",
	"doors",
	"salvo",
]);
const limit = (v, lo = -1, hi = 1) =>
	Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : 0;
const rounded = (v) => (Number.isFinite(v) ? Math.round(v * 1000) / 1000 : 0);
const copy = (v) => JSON.parse(JSON.stringify(v));
const EMPTY = () => ({
	type: "controls",
	bank: 0,
	pitch: 0,
	throttleDelta: 0,
	aimX: 0,
	aimY: 0,
	fire: false,
	zoom: false,
});

export function cleanHubCommand(command) {
	if (!command || typeof command !== "object") return null;
	const type = command.type;
	if (type === "controls")
		return {
			type,
			bank: limit(command.bank),
			pitch: limit(command.pitch),
			throttleDelta: limit(command.throttleDelta),
			aimX: limit(command.aimX),
			aimY: limit(command.aimY),
			fire: command.fire === true,
			zoom: command.zoom === true,
		};
	if (type === "station" && STATIONS.has(command.station))
		return {
			type,
			station: command.station,
			handover: command.handover === true,
		};
	if (
		type === "route" &&
		(ROUTES.has(command.target) || command.target === "custom")
	) {
		const point =
			command.point &&
			Number.isFinite(command.point.x) &&
			Number.isFinite(command.point.y)
				? {
						x: limit(command.point.x, -40000, 440000),
						y: limit(command.point.y, -140000, 160000),
					}
				: undefined;
		if (command.target === "custom" && !point) return null;
		return { type, target: command.target, point };
	}
	if (type === "release")
		return command.salvo === undefined
			? { type }
			: { type, salvo: Math.round(limit(command.salvo, 1, 4)) };
	if (type === "aim")
		return {
			type,
			yaw: limit(command.yaw, -0.83, 0.83),
			pitch: limit(command.pitch, -0.48, 0.65),
		};
	if (type === "jettison") return { type, held: limit(command.held, 0, 10) };
	if (type === "extinguish" || type === "hold" || type === "doors")
		return { type };
	if (type === "salvo")
		return {
			type,
			salvo: [1, 2, 4].includes(command.salvo) ? command.salvo : 2,
		};
	return null;
}

// Checkpoints retain the complete renderable state; transient histories never travel.
// Explicit field names are kept here so a designer can inspect network captures.
export function hubCheckpoint(snapshot) {
	const s = copy(snapshot);
	for (const key of [
		"history",
		"eventHistory",
		"actionHistory",
		"commands",
		"inputs",
	])
		delete s[key];
	for (const key of Object.keys(s)) {
		if (typeof s[key] === "function" || key.startsWith("_")) delete s[key];
	}
	s.events = (s.events || [])
		.filter((e) => !["gun", "ai-gun"].includes(e.type))
		.slice(-8);
	if (Array.isArray(s.effects)) s.effects = s.effects.slice(-12);
	if (Array.isArray(s.shots)) s.shots = s.shots.slice(-12);
	const text = JSON.stringify(s, (_k, v) =>
		typeof v === "number" ? rounded(v) : v,
	);
	if (text.length <= 14500) return JSON.parse(text);
	s.effects = [];
	s.shots = [];
	s.events = s.events.slice(-4);
	if (Array.isArray(s.flak)) s.flak = s.flak.slice(-12);
	return JSON.parse(
		JSON.stringify(s, (_k, v) => (typeof v === "number" ? rounded(v) : v)),
	);
}

const AK = [
	"x",
	"y",
	"z",
	"yaw",
	"pitch",
	"bank",
	"speed",
	"throttle",
	"fuel",
	"maxFuel",
	"hull",
	"engines",
	"fire",
	"doors",
	"gear",
	"hold",
	"shake",
	"bombs",
	"ammo",
	"sight",
	"extinguishers",
	"stall",
	"verticalSpeed",
	"vz",
	"vx",
	"vy",
	"jammed",
	"jettisoned",
];
const PK = [
	"id",
	"station",
	"aim",
	"look",
	"connected",
	"owner",
	"transition",
	"request",
];
const EK = [
	"id",
	"x",
	"y",
	"z",
	"yaw",
	"pitch",
	"bank",
	"hp",
	"alive",
	"bearing",
	"phase",
	"t",
	"kind",
];
const BK = ["id", "x", "y", "z", "vx", "vy", "vz", "age"];
const VK = [
	"bombsLeft",
	"bombsDropped",
	"salvo",
	"doorsOpen",
	"primary",
	"kills",
	"hits",
	"wasted",
	"fired",
	"missionHits",
	"returned",
	"aborted",
	"sightDamaged",
	"commandOwner",
	"reserve",
	"warning",
	"captionUntil",
	"landingT",
];
const MK = ["ammo", "jammed", "cool", "recoil", "shots"];
const FK = ["id", "x", "y", "z", "r", "timer", "age", "burst"];
const vec = (o, keys) =>
	keys.map((k) =>
		typeof o?.[k] === "number" ? rounded(o[k]) : (o?.[k] ?? null),
	);
const obj = (a, keys) =>
	Object.fromEntries(
		keys
			.filter((_k, i) => a[i] !== null && a[i] !== undefined)
			.map((k) => [k, a[keys.indexOf(k)]]),
	);
export function hubLive(snapshot) {
	const s = snapshot;
	const packet = {
		t: s.t,
		k: s.tick,
		p: s.phase,
		v: vec(s, VK),
		m: Object.fromEntries(
			Object.entries(s.mounts || {}).map(([k, v]) => [k, vec(v, MK)]),
		),
		a: vec(s.aircraft || {}, AK),
		u: (s.players || []).map((p) => vec(p, PK)),
		e: (s.enemies || [])
			.filter((e) => e.alive !== false)
			.slice(0, 6)
			.map((e) => vec(e, EK)),
		b: (s.bombs || []).slice(-8).map((b) => vec(b, BK)),
		f: (s.flak || []).slice(-5).map((f) => vec(f, FK)),
		s: s.score,
		r: s.route,
		c: s.caption,
		o: s.owners,
		d: s.prediction,
	};
	// A normal unreliable datagram stays below the transport's fragmentation threshold.
	// The complete state, including every entity, follows over the reliable channel.
	const size = () => JSON.stringify(packet).length;
	if (size() > 1150) {
		delete packet.c;
		delete packet.d;
	}
	if (size() > 1150) packet.f = [];
	if (size() > 1150) packet.b = packet.b.slice(-2);
	if (size() > 1150) packet.e = packet.e.slice(0, 3);
	if (size() > 1150) {
		delete packet.r;
		delete packet.o;
	}
	if (size() > 1150) packet.e = packet.e.slice(0, 1);
	if (size() > 1150) packet.b = [];
	if (size() > 1150) packet.e = [];
	return packet;
}
export function applyHubLive(previous, p) {
	const s = copy(previous);
	s.t = p.t;
	s.tick = p.k;
	s.phase = p.p;
	Object.assign(s, obj(p.v || [], VK));
	if (p.m)
		s.mounts = Object.fromEntries(
			Object.entries(p.m).map(([k, v]) => [
				k,
				{ ...s.mounts?.[k], ...obj(v, MK) },
			]),
		);
	s.aircraft = { ...s.aircraft, ...obj(p.a || [], AK) };
	s.players = (p.u || []).map((a) => ({
		...s.players?.find((x) => x.id === a[0]),
		...obj(a, PK),
	}));
	s.enemies = (p.e || []).map((a) => ({
		...s.enemies?.find((x) => x.id === a[0]),
		...obj(a, EK),
	}));
	s.bombs = (p.b || []).map((a) => obj(a, BK));
	s.flak = (p.f || []).map((a) => obj(a, FK));
	if (p.s !== undefined) s.score = p.s;
	if (p.r !== undefined) s.route = p.r;
	if (p.c !== undefined) s.caption = p.c;
	if (p.o !== undefined) s.owners = p.o;
	if (p.d !== undefined) s.prediction = p.d;
	return s;
}

/** Root owns the fixed-step simulation clock; update() services transport independently of drawing. */
export class HubAdapter {
	constructor({
		sim,
		onSession = () => {},
		onStart = () => {},
		onEnd = () => {},
		onStatus = () => {},
		stopSound = () => {},
		hub = globalThis.AIHub,
	} = {}) {
		this.sim = sim;
		this.hub = hub;
		this.onSession = onSession;
		this.onStart = onStart;
		this.onEnd = onEnd;
		this.onStatus = onStatus;
		this.stopSound = stopSound;
		this.active = false;
		this.isHost = false;
		this.server = false;
		this.localId = 1;
		this.ended = false;
		this.reported = false;
		this.readySent = false;
		this.elapsed = 0;
		this.sendAt = 0;
		this.checkpointAt = 0;
		this.seq = 0;
		this.actionSeq = 0;
		this.applied = -1;
		this.queue = [];
		this.controls = EMPTY();
		this.absoluteAim = null;
		this.seats = new Map();
		this.present = new Set();
		this.lastInput = new Map();
		this.seenActions = new Map();
		this.remoteAt = new Map();
		this.removers = [];
		this.dirty = true;
		this.started = false;
		this.stats = {
			sent: 0,
			received: 0,
			maxPacket: 0,
			finishes: 0,
			accepted: 0,
			rejected: 0,
		};
	}
	get playing() {
		return this.active && !this.ended && this.readySent && this.hub.time() >= 0;
	}
	async connect() {
		if (!this.hub) return null;
		const info = await this.hub.connect({
			mode: "shared-world",
			seats: [1, 2],
		});
		if (!info) return null;
		this.info = info;
		this.active = true;
		this.isHost = !!info.isHost;
		this.server = !!info.server;
		(info.players || []).forEach((p, i) => {
			this.seats.set(p.id, i + 1);
			this.present.add(p.id);
		});
		this.localId = this.server ? null : (this.seats.get(info.me) ?? null);
		// Keep named streams rather than asking for a new random generator each frame.
		this.random = this.hub.rng("bomber-operation");
		const seed = Math.floor(this.random() * 0x100000000) >>> 0;
		this.sim.reset({
			seed,
			loadout: "balanced",
			difficulty: "normal",
			players: [...this.seats.values()],
		});
		for (const p of this.sim.state.players || []) {
			const hp = info.players.find((q) => this.seats.get(q.id) === p.id);
			if (hp) p.name = String(hp.name);
		}
		this.removers.push(
			this.hub.on("message", (data, from) => this._message(data, from)),
		);
		this.removers.push(this.hub.on("leave", (e) => this._leave(e)));
		this.removers.push(
			this.hub.on("time-up", () => {
				if (this.isHost && !this.ended) this.finish("deadline");
			}),
		);
		this.removers.push(this.hub.on("end", (e) => this._end(e)));
		this.removers.push(
			this.hub.on("start", () => this.onStatus("CREW READY · AWAITING LAUNCH")),
		);
		this.onSession(info);
		this.onStatus(
			this.server ? "AUTHORITATIVE CREW SERVER" : "CONNECTED · CREW ASSEMBLING",
		);
		return info;
	}
	ready() {
		if (this.active && !this.readySent && !this.ended) {
			this.readySent = true;
			this.hub.ready();
		}
	}
	command(command) {
		if (!this.active) {
			const c = cleanHubCommand(command);
			return c ? this.sim.command(1, c) : false;
		}
		if (!this.playing || this.localId === null) return false;
		const c = cleanHubCommand(command);
		if (!c) {
			this.stats.rejected++;
			return false;
		}
		if (c.type === "controls") this.controls = c;
		if (c.type === "aim") this.absoluteAim = c;
		if (this.isHost) {
			const accepted = this.sim.command(this.localId, {
				...c,
				actionId:
					c.type === "controls"
						? undefined
						: `hub-${this.localId}-${++this.actionSeq}`,
			});
			if (c.type !== "controls") this.dirty = true;
			return accepted;
		}
		if (c.type !== "controls" && c.type !== "aim") {
			if (this.queue.length >= 24) return false;
			this.queue.push({
				...c,
				actionId: `hub-${this.localId}-${++this.actionSeq}`,
			});
		}
		return true;
	}
	clearControls() {
		this.controls = EMPTY();
		if (this.active && this.isHost && this.localId !== null)
			this.sim.command(this.localId, this.controls);
	}
	_send(packet, reliable, to) {
		if (!this.playing || this.ended) return false;
		const size = JSON.stringify(packet).length;
		if (size > 16000) {
			this.onStatus("NETWORK STATE TOO LARGE");
			this.stats.rejected++;
			return false;
		}
		const okay = this.hub.send(packet, { reliable, to });
		if (okay !== false) {
			this.stats.sent++;
			this.stats.maxPacket = Math.max(this.stats.maxPacket, size);
			return true;
		}
		return false;
	}
	_message(packet, from) {
		if (!this.active || this.ended || !packet || typeof packet !== "object")
			return;
		this.stats.received++;
		if (this.isHost) {
			const seat = this.seats.get(from);
			if (
				!this.present.has(from) ||
				seat === undefined ||
				packet.t !== "i" ||
				!Number.isInteger(packet.n)
			) {
				this.stats.rejected++;
				return;
			}
			if (packet.n > (this.lastInput.get(from) ?? -1)) {
				this.lastInput.set(from, packet.n);
				const c = cleanHubCommand(packet.c);
				if (c?.type === "controls") {
					this.sim.command(seat, c);
					this.remoteAt.set(from, this.elapsed);
				}
				const aim = cleanHubCommand(packet.v);
				if (aim?.type === "aim") this.sim.command(seat, aim);
			}
			const seen = this.seenActions.get(from) || new Set();
			this.seenActions.set(from, seen);
			for (const raw of (Array.isArray(packet.a) ? packet.a : []).slice(0, 8)) {
				if (
					!raw ||
					typeof raw.actionId !== "string" ||
					raw.actionId.length > 64 ||
					!raw.actionId.startsWith(`hub-${seat}-`) ||
					seen.has(raw.actionId)
				)
					continue;
				const c = cleanHubCommand(raw);
				if (!c || !ACTIONS.has(c.type)) {
					this.stats.rejected++;
					continue;
				}
				seen.add(raw.actionId);
				if (seen.size > 512) seen.delete(seen.values().next().value);
				const accepted = this.sim.command(seat, {
					...c,
					actionId: raw.actionId,
				});
				if (accepted !== false) this.stats.accepted++;
				this.dirty = true;
			}
		} else {
			if (
				from !== this.info.host ||
				!Number.isInteger(packet.n) ||
				packet.n <= this.applied
			) {
				this.stats.rejected++;
				return;
			}
			if (packet.t === "s" && packet.s && typeof packet.s === "object")
				this.sim.loadSnapshot(packet.s);
			else if (packet.t === "l" && packet.s && typeof packet.s === "object")
				this.sim.loadSnapshot(applyHubLive(this.sim.snapshot(), packet.s));
			else return;
			this.applied = packet.n;
		}
	}
	_leave(event) {
		this.present.delete(event.id);
		const seat = this.seats.get(event.id);
		if (this.isHost && seat !== undefined) {
			this.sim.depart(seat);
			this.dirty = true;
		}
		this.onStatus("A CREWMATE LEFT · AI HAS THE VACANT DUTIES");
	}
	update(dt) {
		if (!this.active || this.ended) return;
		this.elapsed += Math.max(0, Math.min(1, dt || 0));
		if (!this.playing) return;
		if (!this.started) {
			this.started = true;
			this.onStart();
			this.onStatus("OPERATION UNDERWAY");
		}
		if (this.isHost) {
			for (const [from, at] of this.remoteAt) {
				if (this.elapsed - at > 0.65) {
					const seat = this.seats.get(from);
					if (seat !== undefined) this.sim.command(seat, EMPTY());
					this.remoteAt.delete(from);
				}
			}
			if (this.sim.state.phase === "debrief" || this.sim.state.result) {
				this.finish("complete");
				return;
			}
		}
		if (this.elapsed < this.sendAt) return;
		this.sendAt = this.elapsed + 0.125;
		if (this.isHost) {
			const reliable = this.dirty || this.elapsed >= this.checkpointAt;
			const snapshot = this.sim.snapshot();
			const payload = reliable ? hubCheckpoint(snapshot) : hubLive(snapshot);
			if (
				this._send(
					{ t: reliable ? "s" : "l", n: ++this.seq, s: payload },
					reliable,
				)
			) {
				if (reliable) {
					this.dirty = false;
					this.checkpointAt = this.elapsed + 1;
				}
			}
		} else if (this.localId !== null) {
			const actions = this.queue.slice(0, 8);
			if (
				this._send(
					{
						t: "i",
						n: ++this.seq,
						c: this.controls,
						v: this.absoluteAim,
						a: actions,
					},
					actions.length > 0,
					this.info.host,
				)
			)
				this.queue.splice(0, actions.length);
		}
	}
	finish(reason = "deadline") {
		if (!this.active || !this.isHost || this.reported || this.ended)
			return false;
		if (!this.sim.state.result) this.sim.result(reason);
		const result = this.sim.state.result || {};
		const ids = [...this.present].filter((id) => this.seats.has(id));
		const score = Number.isFinite(result.score)
			? result.score
			: Number(this.sim.state.score) || 0;
		const stats = {};
		const detail = result.stats || {};
		for (const id of ids)
			stats[id] = {
				Sortie: String(result.outcome || reason),
				Fighters: Number(detail.kills || 0),
				"Bomb hits": Number(detail.hits || 0),
				Accuracy: `${Number(detail.accuracy || 0)}%`,
				"Crew home": detail.returned ? "YES" : "NO",
				Fuel: `${Number(detail.fuel || 0)}%`,
			};
		this.reported = true;
		this.stats.finishes++;
		this.hub.finish({
			standings: ids.length ? [ids] : [],
			scores: Object.fromEntries(ids.map((id) => [id, score])),
			won:
				result.win === true ||
				result.outcome === "success" ||
				result.won === true,
			stats,
		});
		this.stopSound();
		this.clearControls();
		return true;
	}
	_end(event) {
		if (this.ended) return;
		this.ended = true;
		this.controls = EMPTY();
		this.queue = [];
		this.stopSound();
		this.onStatus("SESSION ENDED");
		this.onEnd(event);
	}
	dispose() {
		this.ended = true;
		this.controls = EMPTY();
		this.queue = [];
		for (const off of this.removers) off();
		this.removers = [];
		this.stopSound();
	}
}
