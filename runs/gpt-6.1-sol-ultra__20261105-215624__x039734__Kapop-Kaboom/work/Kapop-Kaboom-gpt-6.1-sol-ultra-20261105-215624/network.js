/* Kapop networking. AI Hub Session Protocol v1 + standalone PeerJS co-op.
 * Hub client is embedded unmodified in the document before this module.
 * PeerJS is loaded only after a standalone Host or Join action.
 */
const PEER_URL = "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
const COLORS = ["#f27955", "#62d7d2", "#b7dd68", "#d09def"];
let peerLibrary;
function loadPeer() {
	if (globalThis.Peer) return Promise.resolve(globalThis.Peer);
	if (peerLibrary) return peerLibrary;
	peerLibrary = new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = PEER_URL;
		script.crossOrigin = "anonymous";
		script.onload = () =>
			globalThis.Peer
				? resolve(globalThis.Peer)
				: reject(new Error("Room service did not load."));
		script.onerror = () => {
			peerLibrary = null;
			script.remove();
			reject(
				new Error("Room service unavailable. Check your connection and retry."),
			);
		};
		document.head.append(script);
	});
	return peerLibrary;
}
const noop = () => {};
const cleanInput = (v = {}) => ({
	x: Number.isFinite(v.x) ? Math.max(-7, Math.min(7, v.x)) : 0,
	pop: v.pop === true,
});
function randomRoom() {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	return Array.from(
		crypto.getRandomValues(new Uint8Array(6)),
		(n) => alphabet[n % alphabet.length],
	).join("");
}
export class Network {
	constructor(callbacks = {}) {
		this.callbacks = {
			onStatus: noop,
			onStart: noop,
			onInput: noop,
			onState: noop,
			onRoster: noop,
			onEnd: noop,
			onTimeUp: noop,
			...callbacks,
		};
		this.role = "offline";
		this.connected = false;
		this.roomCode = "";
		this.players = [];
		this.me = 0;
		this.server = false;
		this.started = false;
		this.ended = false;
		this.hubActive = globalThis.AIHub?.active === true;
		this.status = this.hubActive
			? "Joining AI Hub…"
			: "Play together. Catch together.";
		this._hub = globalThis.AIHub;
		this._peer = null;
		this._connection = null;
		this._input = { x: 0, pop: false };
		this._popQueued = false;
		this._sendClock = 0;
		this._sequence = 0;
		this._receivedSequence = -1;
		this._reported = false;
		this._lastScore = 0;
		this._startAt = Infinity;
		this._generation = 0;
		this._off = [];
		this.metrics = { sent: 0, received: 0, rejected: 0 };
	}
	get canPlay() {
		if (!this.started || this.ended) return false;
		return this.hubActive
			? this._hub.time() >= 0
			: performance.now() >= this._startAt;
	}
	_status(text) {
		this.status = text;
		this.callbacks.onStatus(text);
	}
	_roster(players) {
		this.players = players.map((p) => ({ ...p }));
		this.callbacks.onRoster(this.players);
	}
	async init() {
		if (!this.hubActive) return null;
		const hub = this._hub;
		const info = await hub.connect({ mode: "shared-world", seats: [1, 4] });
		if (!info) {
			this.hubActive = false;
			this._status("Play together. Catch together.");
			return null;
		}
		this.role = info.isHost ? "host" : "guest";
		this.me = info.me;
		this.server = info.server === true;
		this.connected = true;
		this._roster(info.players);
		this._off.push(
			hub.on("start", (event) => {
				if (this.ended) return;
				this.started = true;
				this._startAt = performance.now() + event.in;
				this._status("AI Hub · shared bucket brigade");
				this.callbacks.onStart({
					players: this.players,
					server: this.server,
					me: this.me,
					countdownMs: event.in || 0,
				});
			}),
		);
		this._off.push(
			hub.on("message", (data, from) => this._receive(data, from)),
		);
		this._off.push(
			hub.on("leave", ({ id }) => {
				this._roster(this.players.filter((p) => p.id !== id));
				// Release a departed player's held action immediately.
				if (this.role === "host")
					this.callbacks.onInput(id, { x: 0, pop: false, left: true });
			}),
		);
		this._off.push(
			hub.on("time-up", (event) => {
				if (this.ended) return;
				this.callbacks.onTimeUp(event);
				if (this.role === "host" && !this._reported)
					this.finish(false, this._lastScore);
			}),
		);
		this._off.push(
			hub.on("end", (event) => {
				this.ended = true;
				this.started = false;
				this._status("Round complete");
				this.callbacks.onEnd(event);
			}),
		);
		this._status("AI Hub · ready for the round");
		hub.ready();
		return info;
	}
	async host() {
		if (this.hubActive) return null;
		this.disconnect(false);
		const generation = this._generation;
		this._status("Opening a room…");
		try {
			const Peer = await loadPeer();
			if (generation !== this._generation) return null;
			this.roomCode = randomRoom();
			const peer = new Peer(`kapop-v1-${this.roomCode}`, { debug: 0 });
			this._peer = peer;
			this.role = "host";
			this.me = 0;
			this._roster([{ id: 0, name: "Player 1", color: COLORS[0] }]);
			peer.on("connection", (connection) => {
				if (this._connection?.open || this.started) {
					connection.on("open", () => {
						connection.send({ t: "busy" });
						setTimeout(() => connection.close(), 150);
					});
					return;
				}
				this._wire(connection, 1);
			});
			await this._opened(peer, generation);
			this._status(`Room ${this.roomCode} · waiting for a partner`);
			return this.roomCode;
		} catch (error) {
			if (generation === this._generation) {
				this.disconnect(false);
				this._status(error.message || "Could not open a room.");
			}
			throw error;
		}
	}
	async join(code) {
		if (this.hubActive) return false;
		const room = String(code || "")
			.trim()
			.toUpperCase()
			.replace(/^KAPOP[- ]?/, "");
		if (!/^[A-HJ-NP-Z2-9]{6}$/.test(room))
			throw new Error("Enter the six-character room code.");
		this.disconnect(false);
		const generation = this._generation;
		this._status(`Finding room ${room}…`);
		try {
			const Peer = await loadPeer();
			if (generation !== this._generation) return false;
			this.roomCode = room;
			const peer = new Peer({ debug: 0 });
			this._peer = peer;
			this.role = "guest";
			this.me = 1;
			await this._opened(peer, generation);
			if (generation !== this._generation) return false;
			const connection = peer.connect(`kapop-v1-${room}`, {
				reliable: true,
				serialization: "json",
			});
			this._wire(connection, 0);
			await new Promise((resolve, reject) => {
				const timeout = setTimeout(
					() =>
						reject(
							new Error("Room did not answer. Check the code and try again."),
						),
					18000,
				);
				connection.on("open", () => {
					clearTimeout(timeout);
					resolve();
				});
				connection.on("error", (error) => {
					clearTimeout(timeout);
					reject(error);
				});
			});
			return true;
		} catch (error) {
			if (generation === this._generation) {
				this.disconnect(false);
				this._status(error.message || "Could not join the room.");
			}
			throw error;
		}
	}
	_opened(peer, generation) {
		return new Promise((resolve, reject) => {
			let settled = false;
			const timeout = setTimeout(() => {
				if (!settled) {
					settled = true;
					reject(new Error("Room service timed out. Please try again."));
				}
			}, 18000);
			peer.on("open", () => {
				clearTimeout(timeout);
				settled = true;
				generation === this._generation
					? resolve()
					: reject(new Error("Room cancelled."));
			});
			peer.on("error", (error) => {
				clearTimeout(timeout);
				const detail =
					error.type === "unavailable-id"
						? "Room code in use. Try hosting again."
						: error.type === "peer-unavailable"
							? "Room not found. Check the code."
							: "Room connection failed. Please try again.";
				if (!settled) {
					settled = true;
					reject(new Error(detail));
				} else if (generation === this._generation) this._status(detail);
			});
		});
	}
	_wire(connection, otherId) {
		this._connection = connection;
		connection.on("open", () => {
			if (connection !== this._connection) {
				connection.close();
				return;
			}
			this.connected = true;
			this.ended = false;
			this._status(
				this.role === "host"
					? "Partner connected · start when ready"
					: "Connected · your host starts the run",
			);
			if (this.role === "host") {
				this._roster([
					{ id: 0, name: "Player 1", color: COLORS[0] },
					{ id: 1, name: "Player 2", color: COLORS[1] },
				]);
				this._send({ t: "roster", players: this.players });
			}
		});
		connection.on("data", (data) => this._receive(data, otherId));
		connection.on("close", () => {
			if (connection !== this._connection) return;
			this._connection = null;
			this.connected = false;
			this.started = false;
			this.ended = true;
			if (this.role === "host")
				this._roster(this.players.filter((p) => p.id === 0));
			this._status("Partner disconnected");
			this.callbacks.onEnd({ reason: "peer-left", standings: null });
		});
		connection.on("error", () =>
			this._status("Connection interrupted. Rejoin the room."),
		);
	}
	start() {
		if (this.hubActive || this.role !== "host" || !this.connected) return false;
		this.started = true;
		this.ended = false;
		this._reported = false;
		this._sequence = 0;
		this._receivedSequence = -1;
		const countdownMs = 3000;
		this._startAt = performance.now() + countdownMs;
		this._send({ t: "start", countdownMs, players: this.players });
		this.callbacks.onStart({
			players: this.players,
			server: false,
			me: this.me,
			countdownMs,
		});
		return true;
	}
	_receive(data, from) {
		if (
			!data ||
			typeof data !== "object" ||
			(this.ended && !(!this.hubActive && data.t === "start"))
		)
			return;
		this.metrics.received++;
		const hostId = this.hubActive ? this._hub.host : 0;
		if (
			data.t === "input" &&
			this.role === "host" &&
			this.players.some((p) => p.id === from)
		) {
			this.callbacks.onInput(from, cleanInput(data.input));
		} else if (data.t === "state" && this.role === "guest" && from === hostId) {
			if (!Number.isFinite(data.seq) || data.seq <= this._receivedSequence)
				return;
			this._receivedSequence = data.seq;
			this.callbacks.onState(data.state);
		} else if (!this.hubActive && this.role === "guest" && from === 0) {
			if (data.t === "roster" && Array.isArray(data.players))
				this._roster(data.players.slice(0, 2));
			else if (data.t === "start") {
				this.started = true;
				this.ended = false;
				this._reported = false;
				this._receivedSequence = -1;
				this._startAt =
					performance.now() + Math.max(0, Number(data.countdownMs) || 0);
				if (Array.isArray(data.players)) this._roster(data.players.slice(0, 2));
				this.callbacks.onStart({
					players: this.players,
					server: false,
					me: this.me,
					countdownMs: data.countdownMs || 0,
				});
			} else if (data.t === "finish") {
				this.ended = true;
				this.started = false;
				this.callbacks.onEnd({
					reason: "finished",
					won: data.won,
					score: data.score,
					stats: data.stats,
					state: data.state,
				});
			} else if (data.t === "busy")
				this._status("That room already has a partner or a run in progress.");
		}
	}
	_send(data, to) {
		if (this.ended) return false;
		let sent = false;
		if (this.hubActive) sent = this._hub.send(data, to == null ? {} : { to });
		else if (this._connection?.open) {
			try {
				this._connection.send(data);
				sent = true;
			} catch {
				this._status("Connection interrupted.");
			}
		}
		if (sent) this.metrics.sent++;
		return sent;
	}
	sendInput(input) {
		this._input = cleanInput(input);
		if (this._input.pop) this._popQueued = true;
	}
	update(dt, state) {
		if (!this.connected || !this.canPlay) return;
		this._sendClock += Math.min(Math.max(0, dt || 0), 0.25);
		const interval = this.role === "host" ? 0.1 : 1 / 15;
		if (this._sendClock < interval) return;
		this._sendClock %= interval;
		if (this.role === "guest") {
			const input = { ...this._input, pop: this._input.pop || this._popQueued };
			if (
				this._send(
					{ t: "input", input },
					this.hubActive ? this._hub.host : undefined,
				)
			)
				this._popQueued = false;
		} else if (state != null) {
			this._lastScore = Number.isFinite(state.score)
				? state.score
				: this._lastScore;
			const packet = { t: "state", seq: this._sequence++, state };
			// Client protocol limits each JSON message to 16 KiB.
			if (this.hubActive && JSON.stringify(packet).length > 16000) {
				this.metrics.rejected++;
				if (this.metrics.rejected === 1)
					this._status("World snapshot exceeds the AI Hub message limit.");
				return;
			}
			this._send(packet);
		}
	}
	finish(won, score = this._lastScore, stats, state) {
		if (this.role !== "host" || this.ended || this._reported) return false;
		this._reported = true;
		const value = Number.isFinite(score) ? score : 0;
		if (this.hubActive) {
			const ids = this.players.map((p) => p.id);
			this._hub.finish({
				standings: [ids],
				scores: Object.fromEntries(ids.map((id) => [id, value])),
				won: won === true,
				...(stats
					? { stats: Object.fromEntries(ids.map((id) => [id, stats])) }
					: {}),
			});
		} else
			this._send({
				t: "finish",
				won: won === true,
				score: value,
				...(stats ? { stats } : {}),
				...(state ? { state } : {}),
			});
		return true;
	}
	disconnect(notify = true) {
		// AI Hub owns session lifetime; game menus cannot leave, restart or quit it.
		if (this.hubActive) return false;
		this._generation++;
		const connection = this._connection;
		this._connection = null;
		connection?.close();
		this._peer?.destroy();
		this._peer = null;
		this.role = "offline";
		this.connected = false;
		this.started = false;
		this.ended = false;
		this.roomCode = "";
		this.me = 0;
		this.server = false;
		this._sendClock = 0;
		this._sequence = 0;
		this._receivedSequence = -1;
		this._reported = false;
		this._startAt = Infinity;
		this._popQueued = false;
		this._input = { x: 0, pop: false };
		this._roster([]);
		if (notify) this._status("Play together. Catch together.");
		return true;
	}
	inspect() {
		return {
			role: this.role,
			connected: this.connected,
			roomCode: this.roomCode,
			players: this.players,
			me: this.me,
			server: this.server,
			hubActive: this.hubActive,
			started: this.started,
			ended: this.ended,
			canPlay: this.canPlay,
			status: this.status,
			metrics: { ...this.metrics },
		};
	}
}
