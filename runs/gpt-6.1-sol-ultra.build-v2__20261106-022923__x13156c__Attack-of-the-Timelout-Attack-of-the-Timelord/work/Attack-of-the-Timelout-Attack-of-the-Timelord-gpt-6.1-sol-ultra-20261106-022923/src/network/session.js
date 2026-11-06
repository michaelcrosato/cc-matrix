import {
	decodeAction,
	decodeWorld,
	encodeAction,
	encodeWorld,
	INPUT_TTL,
	makeRoomCode,
	PEER_VERSION,
	PROTOCOL,
	packetBytes,
	roomCode,
	splitWorld,
	validInput,
	validRoomCode,
} from "./protocol.js";

const noop = () => {};
const copyRoster = (roster) => roster.map((p) => ({ ...p }));
let peerLibrary;
function loadPeer() {
	if (globalThis.AIHub?.active)
		return Promise.reject(
			new Error("Standalone networking is unavailable during a Hub round."),
		);
	if (globalThis.Peer) return Promise.resolve(globalThis.Peer);
	if (peerLibrary) return peerLibrary;
	peerLibrary = new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = `https://cdn.jsdelivr.net/npm/peerjs@${PEER_VERSION}/dist/peerjs.min.js`;
		script.onload = () =>
			globalThis.Peer
				? resolve(globalThis.Peer)
				: reject(new Error("The online client did not load."));
		script.onerror = () => {
			peerLibrary = null;
			script.remove();
			reject(
				new Error(
					"Cannot download the online client. Check your connection, retry, or play solo.",
				),
			);
		};
		document.head.append(script);
	});
	return peerLibrary;
}

export class NetworkSession {
	constructor(callbacks = {}) {
		this.callbacks = {
			onWorld: noop,
			onStart: noop,
			onRoster: noop,
			onEnd: noop,
			onLeave: noop,
			onError: noop,
			...callbacks,
		};
		this._now = callbacks.now || (() => performance.now() / 1000);
		this.hosted = false;
		this.isHost = false;
		this.server = false;
		this.me = null;
		this.host = null;
		this.started = false;
		this.finished = false;
		this.ended = false;
		this.roster = [];
		this.code = "";
		this.roomState = "offline";
		this.seed = 0;
		this._clock = 0;
		this._inputClock = 0;
		this._publishClock = 0;
		this._keyClock = 0;
		this._sendClock = 0;
		this._seq = 0;
		this._brakeSeq = 0;
		this._brakeHeld = false;
		this._inputs = new Map();
		this._consumedBrake = new Map();
		this._local = { move: 0, fire: false, brake: false };
		this._packets = [];
		this._critical = [];
		this._sent = [];
		this._revision = 0;
		this._lastTick = -1;
		this._lastPhase = "";
		this._chunks = null;
		this._connections = new Map();
		this._pending = new Set();
		this._off = [];
		this._timers = new Set();
		this._lastWorld = null;
		this._eventBuffer = [];
		this._seenEvent = 0;
		this._worldSeed = null;
		this.debug = {
			sent: 0,
			received: 0,
			rejected: 0,
			acceptedInputs: 0,
			staleInputs: 0,
			maxPacketBytes: 0,
			maxUnreliableBytes: 0,
			maxPerSecond: 0,
			oversizeDrops: 0,
			peerInitialized: false,
		};
	}
	async connectHub() {
		const hub = globalThis.AIHub;
		if (!hub) return null;
		const info = await hub.connect({ mode: "shared-world", seats: [1, 4] });
		if (!info) return null;
		this.hosted = true;
		this.isHost = hub.isHost;
		this.server = hub.server === true;
		this.me = this.server ? null : hub.me;
		this.host = hub.host;
		this.roster = info.players.map((p, i) => ({
			...p,
			colorIndex: i,
			ready: true,
			connected: true,
		}));
		this.seed = info.seed;
		this.roomState = "countdown";
		this._off.push(
			hub.on("message", (data, from) => this._receive(data, from)),
		);
		this._off.push(
			hub.on("leave", ({ id }) => {
				this.roster = this.roster.filter((p) => p.id !== id);
				this._inputs.delete(id);
				this.callbacks.onLeave(id);
				this._rosterChanged();
			}),
		);
		this._off.push(
			hub.on("time-up", () => {
				if (this.isHost)
					this.finish(
						this._lastWorld || { score: 0, outcome: "loss", stats: {} },
					);
			}),
		);
		this._off.push(
			hub.on("end", (event) => {
				this.ended = true;
				this.started = false;
				this._inputs.clear();
				this._packets = [];
				this._critical = [];
				this.callbacks.onEnd({ ...event, hosted: true });
			}),
		);
		this._rosterChanged();
		return info;
	}
	ready() {
		if (this.hosted && !this.ended) globalThis.AIHub.ready();
	}
	_later(fn, ms) {
		const timer = setTimeout(() => {
			this._timers.delete(timer);
			fn();
		}, ms);
		this._timers.add(timer);
		return timer;
	}
	_cancel(timer) {
		clearTimeout(timer);
		this._timers.delete(timer);
	}
	_error(message) {
		this.callbacks.onError(String(message));
	}
	_rosterChanged() {
		this.callbacks.onRoster(copyRoster(this.roster), this.roomState);
	}
	async createRoom() {
		this.leave(false);
		this.ended = false;
		this.finished = false;
		this.hosted = false;
		this.isHost = true;
		this.me = 0;
		this.host = 0;
		this.code = makeRoomCode();
		this.roomState = "connecting";
		this.roster = [];
		this._rosterChanged();
		const Peer = await loadPeer();
		this.debug.peerInitialized = true;
		const peer = new Peer(`timelout-${this.code.toLowerCase()}`);
		this.peer = peer;
		peer.on("connection", (connection) => this._hostConnection(connection));
		await this._waitPeer(peer);
		this.seed = globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
		this.roster = [
			{ id: 0, name: "Pilot 1", colorIndex: 0, ready: true, connected: true },
		];
		this.roomState = "lobby";
		this._rosterChanged();
		return this.code;
	}
	async joinRoom(value) {
		const code = roomCode(value);
		if (!validRoomCode(code))
			throw new Error("Enter the eight-letter room code or paste its invite.");
		this.leave(false);
		this.ended = false;
		this.finished = false;
		this.hosted = false;
		this.isHost = false;
		this.me = null;
		this.host = 0;
		this.code = code;
		this.roomState = "connecting";
		this._rosterChanged();
		const Peer = await loadPeer();
		this.debug.peerInitialized = true;
		const peer = new Peer();
		this.peer = peer;
		await this._waitPeer(peer);
		return new Promise((resolve, reject) => {
			const connection = peer.connect(`timelout-${code.toLowerCase()}`, {
				reliable: true,
				serialization: "json",
				metadata: { game: "timelout", v: PROTOCOL },
			});
			this._guestConnection = connection;
			let done = false;
			const fail = (message) => {
				if (done) return;
				done = true;
				this._cancel(timer);
				this.roomState = "error";
				this._rosterChanged();
				connection.close();
				reject(new Error(message));
			};
			const timer = this._later(
				() =>
					fail(
						"No room answered. Check the code and connection. Some networks need a TURN relay; try another network or play solo.",
					),
				18000,
			);
			connection.on("open", () => {
				this.roomState = "handshake";
				this._rosterChanged();
			});
			connection.on("data", (data) => {
				if (data?.t === "challenge" && data.v === PROTOCOL) {
					connection.send({ t: "hello", v: PROTOCOL });
					return;
				}
				if (data?.t === "error") {
					fail(data.message || "The host declined the connection.");
					return;
				}
				if (
					data?.t === "welcome" &&
					!done &&
					Number.isInteger(data.me) &&
					data.me >= 1 &&
					data.me <= 3 &&
					Array.isArray(data.roster)
				) {
					done = true;
					this._cancel(timer);
					this.me = data.me;
					this.roster = data.roster;
					this.seed = data.seed;
					this.roomState = "lobby";
					connection.send({ t: "ack", v: PROTOCOL });
					this._rosterChanged();
					resolve(this.code);
					return;
				}
				this._receive(data, 0);
			});
			connection.on("close", () => {
				if (!done)
					fail(
						"The connection closed before the room handshake. Retry or return to solo.",
					);
				else if (!this.ended)
					this._disconnected("The host left. This room has closed.");
			});
			connection.on("error", (error) =>
				fail(`The data link failed: ${error.message || error}`),
			);
		});
	}
	_waitPeer(peer) {
		return new Promise((resolve, reject) => {
			let done = false;
			const timer = this._later(() => {
				if (done) return;
				done = true;
				peer.destroy();
				this.roomState = "error";
				this._rosterChanged();
				reject(
					new Error(
						"The signaling service did not answer. Retry, or return to solo.",
					),
				);
			}, 15000);
			peer.on("open", () => {
				if (done) return;
				done = true;
				this._cancel(timer);
				resolve();
			});
			peer.on("error", (error) => {
				const message = `Online connection failed (${error.type || "network"}). Check your connection, retry, or play solo.`;
				if (!done) {
					done = true;
					this._cancel(timer);
					this.roomState = "error";
					this._rosterChanged();
					reject(new Error(message));
				} else this._error(message);
			});
			peer.on("disconnected", () => {
				if (this.roomState === "lobby" || this.roomState === "results")
					this._error(
						"Signaling disconnected. Existing data links may continue; leave and create a new room to accept players.",
					);
			});
		});
	}
	_hostConnection(connection) {
		if (this.ended) {
			connection.close();
			return;
		}
		this._pending.add(connection);
		let id = null,
			hello = false,
			ack = false;
		const reject = (message) => {
			try {
				if (connection.open) connection.send({ t: "error", message });
			} catch {}
			this._later(() => connection.close(), 150);
		};
		const timer = this._later(() => {
			if (!ack) connection.close();
		}, 12000);
		connection.on("open", () => {
			connection.send({ t: "challenge", v: PROTOCOL });
		});
		connection.on("data", (data) => {
			if (!data || typeof data !== "object" || packetBytes(data) > 16384)
				return;
			if (!hello) {
				if (data.t !== "hello" || data.v !== PROTOCOL)
					return reject("Incompatible game connection.");
				if (!["lobby", "results"].includes(this.roomState))
					return reject("This run is in progress. Join after its results.");
				id = [1, 2, 3].find((seat) => !this.roster.some((p) => p.id === seat));
				if (id === undefined)
					return reject("This room already has four pilots.");
				hello = true;
				this._connections.set(id, connection);
				this.roster.push({
					id,
					name: `Pilot ${id + 1}`,
					colorIndex: id,
					ready: false,
					connected: false,
				});
				connection.send({
					t: "welcome",
					v: PROTOCOL,
					me: id,
					roster: copyRoster(this.roster),
					seed: this.seed,
				});
				return;
			}
			if (!ack) {
				if (data.t === "ack" && data.v === PROTOCOL) {
					ack = true;
					this._cancel(timer);
					this._pending.delete(connection);
					this.roster.find((p) => p.id === id).connected = true;
					this._broadcastRoster();
				}
				return;
			}
			this._receive(data, id);
		});
		connection.on("close", () => {
			this._cancel(timer);
			this._pending.delete(connection);
			if (id !== null && this._connections.get(id) === connection) {
				this._connections.delete(id);
				this.roster = this.roster.filter((p) => p.id !== id);
				this._inputs.delete(id);
				this.callbacks.onLeave(id);
				if (!this.ended) this._broadcastRoster();
			}
		});
		connection.on("error", () => connection.close());
	}
	_broadcastRoster() {
		this._queue(
			{ t: "roster", roster: copyRoster(this.roster), state: this.roomState },
			true,
		);
		this._rosterChanged();
		this._drain();
	}
	setReady(value = true) {
		if (
			this.hosted ||
			!["lobby", "results"].includes(this.roomState) ||
			this.ended
		)
			return;
		if (this.isHost) {
			const me = this.roster.find((p) => p.id === this.me);
			if (me) me.ready = !!value;
			this._broadcastRoster();
		} else this._queue({ t: "ready", value: !!value }, true);
	}
	startRoom() {
		if (
			!this.isHost ||
			this.hosted ||
			!["lobby", "results"].includes(this.roomState) ||
			!this.roster.length ||
			this.roster.some((p) => !p.ready || !p.connected)
		)
			return false;
		this.seed = (this.seed + 0x9e3779b9) >>> 0;
		this.roomState = "playing";
		this.started = true;
		this.finished = false;
		this._lastTick = -1;
		this._lastPhase = "";
		this._inputs.clear();
		this._consumedBrake.clear();
		this._brakeSeq = 0;
		this._brakeHeld = false;
		this._packets = [];
		this._critical = [];
		this._queue(
			{ t: "start", seed: this.seed, players: copyRoster(this.roster) },
			true,
		);
		this._drain();
		this._rosterChanged();
		this.callbacks.onStart({
			seed: this.seed,
			players: copyRoster(this.roster),
		});
		return true;
	}
	_queue(packet, reliable = true, to = null) {
		if (this.ended) return;
		const queue = reliable ? this._critical : this._packets;
		if (queue.length < 40) queue.push({ packet, reliable, to });
	}
	_transmit(packet, reliable = true, to = null) {
		if (this.ended) return false;
		const size = packetBytes(packet);
		if (size > 16384) {
			this.debug.oversizeDrops++;
			return false;
		}
		this.debug.maxPacketBytes = Math.max(this.debug.maxPacketBytes, size);
		if (!reliable)
			this.debug.maxUnreliableBytes = Math.max(
				this.debug.maxUnreliableBytes,
				size,
			);
		let sent = false;
		if (this.hosted)
			sent = globalThis.AIHub.send(packet, {
				reliable,
				...(to !== null ? { to } : !this.isHost ? { to: this.host } : {}),
			});
		else if (this.isHost) {
			for (const [id, connection] of this._connections)
				if (connection.open && (to === null || id === to)) {
					try {
						connection.send(packet);
						sent = true;
					} catch {}
				}
		} else if (this._guestConnection?.open) {
			try {
				this._guestConnection.send(packet);
				sent = true;
			} catch {}
		}
		if (sent) {
			this.debug.sent++;
			this._sent.push(this._now());
			this._sent = this._sent.filter((at) => this._now() - at < 1);
			this.debug.maxPerSecond = Math.max(
				this.debug.maxPerSecond,
				this._sent.length,
			);
		}
		return sent;
	}
	_drain() {
		this._sent = this._sent.filter((at) => this._now() - at < 1);
		while (this._critical.length && this._sent.length < 18) {
			const next = this._critical.shift();
			this._transmit(next.packet, next.reliable, next.to);
		}
	}
	_receive(packet, from) {
		if (
			this.ended ||
			!packet ||
			typeof packet !== "object" ||
			Array.isArray(packet)
		)
			return;
		this.debug.received++;
		if (packetBytes(packet) > 16384) {
			this.debug.rejected++;
			return;
		}
		if (this.isHost) {
			if (!this.roster.some((p) => p.id === from && p.connected !== false)) {
				this.debug.rejected++;
				return;
			}
			if (packet.t === "a") {
				const old = this._inputs.get(from);
				if (
					!this.started ||
					this.finished ||
					packet.g !== this.seed ||
					!validInput(packet, old?.packet.q ?? -1)
				) {
					this.debug.rejected++;
					return;
				}
				this._inputs.set(from, { packet, at: this._now() });
				this.debug.acceptedInputs++;
				return;
			}
			if (
				!this.hosted &&
				packet.t === "ready" &&
				typeof packet.value === "boolean" &&
				["lobby", "results"].includes(this.roomState)
			) {
				const player = this.roster.find((p) => p.id === from);
				player.ready = packet.value;
				this._broadcastRoster();
				return;
			}
			this.debug.rejected++;
			return;
		}
		if (from !== this.host) {
			this.debug.rejected++;
			return;
		}
		if (packet.t === "k" && Array.isArray(packet.w)) {
			this._apply(packet.w);
			return;
		}
		if (packet.t === "s") {
			if (
				!Number.isSafeInteger(packet.r) ||
				!Number.isInteger(packet.n) ||
				packet.n < 1 ||
				packet.n > 30 ||
				!Number.isInteger(packet.i) ||
				packet.i < 0 ||
				packet.i >= packet.n ||
				typeof packet.d !== "string" ||
				packet.d.length > 1200
			) {
				this.debug.rejected++;
				return;
			}
			if (this._chunks && packet.r < this._chunks.r) return;
			if (!this._chunks || packet.r > this._chunks.r)
				this._chunks = {
					r: packet.r,
					n: packet.n,
					parts: new Array(packet.n),
					count: 0,
				};
			const buffer = this._chunks;
			if (buffer.n !== packet.n) return;
			if (buffer.parts[packet.i] === undefined) {
				buffer.parts[packet.i] = packet.d;
				buffer.count++;
			}
			if (buffer.count === buffer.n) {
				try {
					this._apply(JSON.parse(buffer.parts.join("")));
				} catch {
					this.debug.rejected++;
				}
			}
			return;
		}
		if (
			!this.hosted &&
			packet.t === "roster" &&
			Array.isArray(packet.roster) &&
			packet.roster.length <= 4
		) {
			this.roster = packet.roster;
			this.roomState = packet.state;
			this._rosterChanged();
			return;
		}
		if (
			!this.hosted &&
			packet.t === "start" &&
			Number.isInteger(packet.seed) &&
			Array.isArray(packet.players)
		) {
			this.seed = packet.seed;
			this.roster = packet.players;
			this.started = true;
			this.finished = false;
			this._lastTick = -1;
			this._chunks = null;
			this._brakeSeq = 0;
			this._brakeHeld = false;
			this._packets = [];
			this.roomState = "playing";
			this._rosterChanged();
			this.callbacks.onStart({
				seed: this.seed,
				players: copyRoster(this.roster),
			});
			return;
		}
		if (!this.hosted && packet.t === "result") {
			if (packet.w) this._apply(packet.w);
			this.started = false;
			this.finished = true;
			this.roomState = "results";
			this.roster.forEach((p) => {
				p.ready = p.id === 0;
			});
			this._rosterChanged();
			this.callbacks.onEnd({
				reason: "finished",
				room: true,
				world: this._lastWorld,
			});
			return;
		}
		this.debug.rejected++;
	}
	_apply(value) {
		try {
			const world = decodeWorld(value);
			if (!this.hosted && this.seed !== world.seed) return;
			if (world.tick <= this._lastTick) return;
			this._lastTick = world.tick;
			this._lastWorld = world;
			this.callbacks.onWorld(world);
		} catch {
			this.debug.rejected++;
		}
	}
	sendAction(action) {
		this._local = action || { move: 0, fire: false, brake: false };
	}
	update(dt, localAction) {
		if (this.ended) return;
		const elapsed = Math.max(0, Math.min(0.25, Number(dt) || 0));
		this._clock += elapsed;
		this._publishClock += elapsed;
		this._keyClock += elapsed;
		this._sendClock += elapsed;
		this._inputClock += elapsed;
		if (localAction) this.sendAction(localAction);
		if (
			this.hosted &&
			!this.started &&
			!this.finished &&
			globalThis.AIHub.time() >= 0
		) {
			this.started = true;
			this.roomState = "playing";
		}
		const brake = !!this._local.brake;
		if (brake && !this._brakeHeld) this._brakeSeq++;
		this._brakeHeld = brake;
		if (this.started && !this.finished && this.me !== null) {
			if (this.isHost)
				this._inputs.set(this.me, {
					packet: encodeAction(
						this._local,
						++this._seq,
						this._brakeSeq,
						this.seed,
					),
					at: this._now(),
				});
			else if (this._inputClock >= 1 / 12) {
				this._inputClock = 0;
				this._queue(
					encodeAction(this._local, ++this._seq, this._brakeSeq, this.seed),
					false,
					this.host,
				);
			}
		}
		this._drain();
		if (
			this._sendClock >= (this.isHost ? 0.1 : 1 / 12) &&
			this._packets.length &&
			this._sent.length < 18
		) {
			this._sendClock = 0;
			const next = this._packets.shift();
			this._transmit(next.packet, next.reliable, next.to);
		}
	}
	actions() {
		const out = {};
		for (const p of this.roster) {
			const input = this._inputs.get(p.id);
			if (!input || this._now() - input.at > INPUT_TTL) {
				out[p.id] = { move: 0, targetX: null, fire: false, brake: false };
				if (input && !input.expired) {
					input.expired = true;
					this.debug.staleInputs++;
				}
				continue;
			}
			const used = this._consumedBrake.get(p.id) || 0;
			const brake = input.packet.b > used;
			if (brake) this._consumedBrake.set(p.id, input.packet.b);
			out[p.id] = decodeAction(input.packet, brake);
		}
		return out;
	}
	_displayWorld(world) {
		return { ...world, events: this._eventBuffer.map((entry) => entry.event) };
	}
	publish(world) {
		if (!this.isHost || this.ended || this.finished || !world) return;
		this._lastWorld = world;
		if (world.seed !== this._worldSeed) {
			this._worldSeed = world.seed;
			this._seenEvent = 0;
			this._eventBuffer = [];
		}
		for (const event of world.events || []) {
			if (event.id > this._seenEvent) {
				this._seenEvent = event.id;
				this._eventBuffer.push({ event, at: world.time });
			}
		}
		this._eventBuffer = this._eventBuffer
			.filter((entry) => world.time - entry.at <= 1.25)
			.slice(-32);
		const display = this._displayWorld(world);
		const phase = `${world.phase}:${world.wave}:${world.bossPhase}`;
		if (this._keyClock >= 1 || phase !== this._lastPhase) {
			this._keyClock = 0;
			this._lastPhase = phase;
			this._queue({ t: "k", w: encodeWorld(display) }, true);
		}
		if (this._publishClock >= 0.1 && !this._packets.length) {
			this._publishClock = 0;
			const chunks = splitWorld(display, ++this._revision);
			for (const packet of chunks) this._queue(packet, false);
		}
		this._drain();
	}
	finish(world) {
		if (!this.isHost || this.finished || this.ended) return;
		world = world ||
			this._lastWorld || { score: 0, outcome: "loss", stats: {} };
		this._lastWorld = world;
		if (this.hosted) {
			if (world.players)
				this._transmit(
					{ t: "k", w: encodeWorld(this._displayWorld(world)) },
					true,
				);
			this.finished = true;
			this.started = false;
			this._packets = [];
			this._critical = [];
			const ids = this.roster.map((p) => p.id);
			globalThis.AIHub.finish({
				standings: [ids],
				scores: Object.fromEntries(
					ids.map((id) => [id, Number(world.score) || 0]),
				),
				won: world.outcome === "victory" || world.outcome === "won",
				stats: Object.fromEntries(
					ids.map((id) => [
						id,
						{
							Wave: Math.min(9, (world.wave || 0) + 1),
							"Team score": Number(world.score) || 0,
						},
					]),
				),
			});
		} else {
			this._packets = [];
			this._queue(
				{ t: "result", w: encodeWorld(this._displayWorld(world)) },
				true,
			);
			this._drain();
			this.finished = true;
			this.started = false;
			this.roomState = "results";
			this.roster.forEach((p) => {
				p.ready = p.id === 0;
			});
			this._broadcastRoster();
			this.callbacks.onEnd({ reason: "finished", room: true, world });
		}
	}
	_disconnected(message) {
		this.ended = true;
		this.started = false;
		this.roomState = "disconnected";
		this._inputs.clear();
		this._rosterChanged();
		this.callbacks.onEnd({ reason: "host-left", room: true, message });
	}
	invite() {
		try {
			const url = new URL(globalThis.location.href);
			url.search = "";
			url.searchParams.set("room", this.code);
			return url.href;
		} catch {
			return this.code;
		}
	}
	leave(notify = true) {
		const wasConnected = this.peer || this.hosted;
		this.ended = true;
		this.started = false;
		for (const off of this._off) off();
		this._off = [];
		for (const timer of this._timers) clearTimeout(timer);
		this._timers.clear();
		for (const connection of this._connections.values()) connection.close();
		this._connections.clear();
		for (const connection of this._pending) connection.close();
		this._pending.clear();
		this._guestConnection?.close();
		this._guestConnection = null;
		this.peer?.destroy();
		this.peer = null;
		this._packets = [];
		this._critical = [];
		this._inputs.clear();
		this.roster = [];
		this.roomState = "offline";
		this._chunks = null;
		if (notify && wasConnected) this._rosterChanged();
	}
}
