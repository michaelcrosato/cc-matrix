// AI Hub Session Protocol v1 + standalone, two-seat cooperative transport.
// The official session.js is embedded unmodified before this module is evaluated.
const NET_VERSION = 1;
const CHANNEL_PREFIX = "empire-detour-coop-v1-";
const RATE_MS = 100;
const MAX_STATE_BYTES = 15500;
const now = () => performance.now();
// Every early heartbeat uses exactly the same finite controls as live input.
// Undefined axes would otherwise poison the authoritative Rapier body with NaN.
const normalizeInput = (input = {}) => {
	const axis = (key, fallback = 0) =>
		Number.isFinite(input[key])
			? Math.max(-1, Math.min(1, input[key]))
			: fallback;
	const sequence = (key) =>
		Number.isFinite(input[key])
			? Math.max(0, Math.min(2147483647, Math.floor(input[key])))
			: 0;
	return {
		mx: axis("mx"),
		mz: axis("mz"),
		ax: axis("ax"),
		az: axis("az", -1),
		fire: input.fire === true,
		boost: input.boost === true,
		actionSeq: sequence("actionSeq"),
		rollSeq: sequence("rollSeq"),
	};
};
const roomCode = () =>
	[...crypto.getRandomValues(new Uint8Array(6))]
		.map((n) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 32])
		.join("");
const cleanRoom = (s) =>
	String(s || "")
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "")
		.slice(0, 12);

export class CoopLink {
	constructor() {
		this.mode = "solo";
		this.me = 0;
		this.hostId = 0;
		this.isHost = true;
		this.server = false;
		this.players = [{ id: 0, name: "Rogue One", color: "#ffb04a" }];
		this.active = false;
		this.ended = false;
		this.started = false;
		this.room = "";
		this.status = "Solo flight";
		this.stats = { sent: 0, received: 0, dropped: 0, transport: "none" };
		this.handlers = new Map();
		this._generation = 0;
		this._uid = crypto.randomUUID ? crypto.randomUUID() : String(Math.random());
		this._input = normalizeInput();
		this._snapshot = null;
		this._seq = 0;
		this._lastInputSeq = new Map();
		this._lastSnapshotSeq = -1;
		this._lastSend = -Infinity;
		this._lastReceive = now();
		this._reported = false;
		this._connections = new Map();
		this._hubOff = [];
		this._timer = setInterval(() => this._tick(), RATE_MS);
	}

	get canPlay() {
		if (this.ended) return false;
		if (this.mode === "hub")
			return this.started && globalThis.AIHub.time() >= 0;
		return this.mode === "solo" || this.started;
	}

	on(event, callback) {
		const set = this.handlers.get(event) || new Set();
		set.add(callback);
		this.handlers.set(event, set);
		return () => set.delete(callback);
	}

	_emit(event, detail) {
		for (const fn of this.handlers.get(event) || []) fn(detail);
	}

	_status(text, extra = {}) {
		this.status = text;
		this._emit("status", { text, room: this.room, mode: this.mode, ...extra });
	}

	async initHub() {
		const hub = globalThis.AIHub;
		if (!hub?.active) return null;
		this.mode = "hub";
		this.active = true;
		this.started = false;
		this._hubOff.push(
			hub.on("start", () => {
				const wait = () => {
					if (this.ended) return;
					if (hub.time() < 0)
						this._startTimer = setTimeout(
							wait,
							Math.min(100, Math.max(5, -hub.time())),
						);
					else {
						this.started = true;
						this._status("Squadron linked through AI Hub");
						this._emit("start", this.info());
					}
				};
				wait();
			}),
		);
		this._hubOff.push(
			hub.on("message", (data, from) => this._receive(data, from, "hub")),
		);
		this._hubOff.push(
			hub.on("leave", ({ id, reason }) => {
				this.players = hub.players.map((p) => ({ ...p }));
				this._emit("players", this.players);
				this._emit("leave", { id, reason });
			}),
		);
		this._hubOff.push(hub.on("time-up", (data) => this._emit("timeup", data)));
		this._hubOff.push(
			hub.on("end", (data) => {
				this.ended = true;
				this.started = false;
				clearTimeout(this._startTimer);
				this._status("AI Hub round ended");
				this._emit("end", data);
			}),
		);
		const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) {
			this.active = false;
			this.mode = "solo";
			return null;
		}
		this.me = info.me;
		this.hostId = info.host;
		this.isHost = info.isHost;
		this.server = info.server === true;
		this.players = info.players.map((p) => ({ ...p }));
		this.stats.transport = "hub";
		this._emit("players", this.players);
		this._status("AI Hub ready for launch");
		return info;
	}

	ready() {
		if (this.mode === "hub") globalThis.AIHub.ready();
	}

	info() {
		return {
			mode: this.mode,
			me: this.me,
			host: this.hostId,
			isHost: this.isHost,
			server: this.server,
			players: this.players.map((p) => ({ ...p })),
			room: this.room,
		};
	}

	async host(requestedRoom = "") {
		if (globalThis.AIHub?.active) return this.room;
		this.close(false);
		const generation = this._generation;
		this.mode = "host";
		this.active = true;
		this.isHost = true;
		this.me = this.hostId = 0;
		this.room = cleanRoom(requestedRoom) || roomCode();
		this.started = true;
		this._openChannel();
		this._status(`Flight open · code ${this.room}`);
		this._emit("players", this.players);
		this._emit("start", this.info());
		this._openPeer(true, generation).catch((e) => {
			if (generation === this._generation && !this._connections.size) {
				this._status(
					`Local flight open · ${this.room}. Internet relay unavailable: ${e.message}`,
					{ warning: true },
				);
			}
		});
		return this.room;
	}

	async join(requestedRoom) {
		if (globalThis.AIHub?.active) return false;
		const room = cleanRoom(requestedRoom);
		if (!room) {
			this._status("Enter the six-character flight code", { error: true });
			return false;
		}
		this.close(false);
		const generation = this._generation;
		this.mode = "guest";
		this.active = true;
		this.isHost = false;
		this.me = 1;
		this.room = room;
		this.started = false;
		this._openChannel();
		this._status(`Finding flight ${room}…`);
		this._broadcast({ v: NET_VERSION, type: "hello" });
		// Same-browser communication avoids an external broker altogether. A remote
		// browser uses the very same protocol over a PeerJS WebRTC data channel.
		this._peerDelay = setTimeout(() => {
			if (this.started || generation !== this._generation) return;
			this._openPeer(false, generation).catch((e) => {
				if (generation === this._generation && !this.started)
					this._status(`Cannot reach flight ${room}: ${e.message}`, {
						error: true,
					});
			});
		}, 800);
		this._joinTimer = setTimeout(() => {
			if (generation === this._generation && !this.started)
				this._status(
					`Flight ${room} did not answer. Check the code and try again.`,
					{ error: true },
				);
		}, 20000);
		return true;
	}

	_openChannel() {
		if (!globalThis.BroadcastChannel) return;
		try {
			this._channel = new BroadcastChannel(CHANNEL_PREFIX + this.room);
			this._channel.onmessage = ({ data }) => {
				if (data?.sender === this._uid || (data?.to && data.to !== this._uid))
					return;
				if (this.isHost) {
					if (data.type === "hello") return this._acceptLocal(data.sender);
					if (data.sender !== this._guestUid) return;
					this._receive(data, 1, "broadcast");
				} else {
					if (data.type === "welcome")
						return this._welcome(data, "broadcast", data.sender);
					if (data.type === "rejected")
						return this._status(data.reason, { error: true });
					if (this._hostUid && data.sender === this._hostUid)
						this._receive(data, 0, "broadcast");
				}
			};
		} catch (e) {
			this._channel = null;
		}
	}

	_broadcast(data, to) {
		this._channel?.postMessage({ ...data, sender: this._uid, to });
	}

	_acceptLocal(uid) {
		if (this._guestUid && uid !== this._guestUid) {
			this._broadcast(
				{
					v: NET_VERSION,
					type: "rejected",
					reason: "This flight already has two pilots.",
				},
				uid,
			);
			return;
		}
		this._guestUid = uid;
		this.stats.transport = "broadcast";
		this._connections.set(1, { kind: "broadcast", uid });
		this._addGuest();
		this._broadcast(
			{ v: NET_VERSION, type: "welcome", id: 1, players: this.players },
			uid,
		);
	}

	_addGuest() {
		if (!this.players.some((p) => p.id === 1)) {
			this.players.push({ id: 1, name: "Rogue Two", color: "#5ee7f1" });
			this._emit("players", this.players);
		}
		this._lastReceive = now();
		this._status(`Two pilots linked · ${this.room}`);
	}

	_welcome(data, kind, hostUid = "") {
		if (this.isHost || this.started || data.v !== NET_VERSION) return;
		clearTimeout(this._peerDelay);
		clearTimeout(this._joinTimer);
		this.me = data.id;
		this.players = data.players.map((p) => ({ ...p }));
		this._hostUid = hostUid;
		this.started = true;
		this.stats.transport = kind;
		this._lastReceive = now();
		this._emit("players", this.players);
		this._status(`Wingmate linked · ${this.room}`);
		this._emit("start", this.info());
	}

	async _openPeer(hosting, generation) {
		const { default: Peer } = await import(
			"https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm"
		);
		if (generation !== this._generation || globalThis.AIHub?.active) return;
		const id = hosting
			? "empire-detour-v1-" + this.room.toLowerCase()
			: undefined;
		const peer = new Peer(id, { debug: 0 });
		this._peer = peer;
		await new Promise((resolve, reject) => {
			const timer = setTimeout(
				() => reject(new Error("relay timed out")),
				14000,
			);
			peer.on("open", () => {
				clearTimeout(timer);
				resolve();
			});
			peer.on("error", (e) => {
				clearTimeout(timer);
				reject(new Error(e.type || e.message || "network error"));
			});
		});
		if (generation !== this._generation) return peer.destroy();
		const wire = (conn, incoming) => {
			conn.on("open", () => {
				if (generation !== this._generation) return conn.close();
				if (incoming) {
					if (this._connections.has(1)) {
						conn.send({
							v: NET_VERSION,
							type: "rejected",
							reason: "This flight already has two pilots.",
						});
						setTimeout(() => conn.close(), 100);
						return;
					}
					this._connections.set(1, { kind: "peer", conn });
					this.stats.transport = "webrtc";
					this._addGuest();
					conn.send({
						v: NET_VERSION,
						type: "welcome",
						id: 1,
						players: this.players,
					});
				} else this._guestConn = conn;
			});
			conn.on("data", (data) => {
				if (!incoming && data?.type === "welcome")
					return this._welcome(data, "webrtc");
				if (data?.type === "rejected")
					return this._status(data.reason, { error: true });
				this._receive(data, incoming ? 1 : 0, "peer");
			});
			conn.on("close", () => {
				if (generation !== this._generation) return;
				if (incoming) this._removeGuest("connection closed");
				else {
					this.started = false;
					this._status("Wing link lost. Rejoin with the flight code.", {
						error: true,
					});
					this._emit("disconnect", { id: 0 });
				}
			});
			conn.on("error", (e) =>
				this._status(
					`Wing link error: ${e.message || "connection interrupted"}`,
					{ error: true },
				),
			);
		};
		if (hosting) peer.on("connection", (conn) => wire(conn, true));
		else
			wire(
				peer.connect("empire-detour-v1-" + this.room.toLowerCase(), {
					reliable: true,
					serialization: "json",
				}),
				false,
			);
		peer.on("disconnected", () => {
			if (generation !== this._generation) return;
			this._status("Relay disconnected; restoring link…", { warning: true });
			if (!peer.destroyed) peer.reconnect();
		});
	}

	_removeGuest(reason) {
		this._connections.delete(1);
		this._lastInputSeq.delete(1);
		this._guestUid = null;
		this.players = this.players.filter((p) => p.id !== 1);
		this._emit("players", this.players);
		this._emit("leave", { id: 1, reason });
		this._status(`Wingmate left · flight ${this.room} remains open`);
	}

	_receive(data, from, transport) {
		if (this.ended || !data || data.v !== NET_VERSION) return;
		this._lastReceive = now();
		this.stats.received++;
		if (
			this.mode === "hub" &&
			!this.players.some((p) => p.id === from) &&
			from !== this.hostId
		)
			return;
		if (data.type === "input" && this.isHost && from !== this.hostId) {
			if (
				!data.input ||
				typeof data.input !== "object" ||
				!Number.isFinite(data.seq)
			)
				return;
			const old = this._lastInputSeq.get(from) ?? -1;
			if (data.seq <= old) return;
			this._lastInputSeq.set(from, data.seq);
			this._emit("input", { id: from, input: normalizeInput(data.input) });
		} else if (
			data.type === "snapshot" &&
			!this.isHost &&
			from === this.hostId
		) {
			if (!Number.isFinite(data.seq) || data.seq <= this._lastSnapshotSeq)
				return;
			this._lastSnapshotSeq = data.seq;
			this._emit("snapshot", data.state);
		} else if (data.type === "bye") {
			if (this.isHost) this._removeGuest("left");
			else {
				this.started = false;
				this._status("The host closed this flight", { error: true });
				this._emit("disconnect", { id: 0 });
			}
		} else if (data.type === "result" && !this.isHost && from === this.hostId) {
			this._emit("result", data.result);
		}
	}

	sendInput(input) {
		if (!input || this.ended) return;
		this._input = normalizeInput(input);
	}

	sendSnapshot(state) {
		if (this.isHost && !this.ended) this._snapshot = state;
	}

	_send(data, to) {
		if (this.ended || this.mode === "solo") return false;
		try {
			const text = JSON.stringify(data);
			if (text.length > MAX_STATE_BYTES) {
				this.stats.dropped++;
				if (!this._warnedSize) {
					this._warnedSize = true;
					console.warn(
						"Co-op snapshot exceeds 15.5 KB. Reduce replicated entities.",
					);
				}
				return false;
			}
			if (this.mode === "hub") {
				const ok = globalThis.AIHub.send(data, { to, reliable: false });
				if (ok) this.stats.sent++;
				return ok;
			}
			if (this.isHost) {
				for (const connection of this._connections.values()) {
					if (connection.kind === "broadcast")
						this._broadcast(data, connection.uid);
					else if (connection.conn.open) connection.conn.send(data);
				}
			} else if (this.stats.transport === "broadcast")
				this._broadcast(data, this._hostUid);
			else if (this._guestConn?.open) this._guestConn.send(data);
			else return false;
			this.stats.sent++;
			return true;
		} catch (e) {
			this.stats.dropped++;
			return false;
		}
	}

	_tick() {
		if (!this.active || !this.canPlay) return;
		if (this.isHost) {
			if (this._snapshot)
				this._send({
					v: NET_VERSION,
					type: "snapshot",
					seq: this._seq++,
					state: this._snapshot,
				});
		} else
			this._send(
				{ v: NET_VERSION, type: "input", seq: this._seq++, input: this._input },
				this.hostId,
			);
		if (
			this.mode !== "hub" &&
			this.started &&
			now() - this._lastReceive > 15000
		) {
			if (this.isHost && this._connections.size) this._removeGuest("timed out");
			else if (!this.isHost) {
				this.started = false;
				this._status("Wing link timed out. Rejoin with the flight code.", {
					error: true,
				});
				this._emit("disconnect", { id: this.hostId });
			}
		}
	}

	resetRound() {
		if (this.mode === "hub") return false;
		this._reported = false;
		this.ended = false;
		return true;
	}

	finish(won, score = 0, stats = {}) {
		if (!this.isHost || this._reported || this.ended) return;
		this._reported = true;
		const ids = this.players.map((p) => p.id);
		const result = {
			standings: [ids],
			won: !!won,
			scores: Object.fromEntries(ids.map((id) => [id, Number(score) || 0])),
			stats: Object.fromEntries(ids.map((id) => [id, stats])),
		};
		if (this.mode === "hub") globalThis.AIHub.finish(result);
		else this._send({ v: NET_VERSION, type: "result", result });
		return result;
	}

	// In a Hub round, the Hub alone owns leave, retry and return-to-title.
	close(emit = true) {
		if (this.mode === "hub" && globalThis.AIHub?.active) return;
		if (this.active && !this.ended) this._send({ v: NET_VERSION, type: "bye" });
		this._generation++;
		clearTimeout(this._peerDelay);
		clearTimeout(this._joinTimer);
		clearTimeout(this._startTimer);
		this._channel?.close();
		this._channel = null;
		this._peer?.destroy();
		this._peer = null;
		this._guestConn = null;
		this._connections.clear();
		this._guestUid = null;
		this._hostUid = null;
		this._lastInputSeq.clear();
		this._lastSnapshotSeq = -1;
		this._seq = 0;
		this._snapshot = null;
		this._reported = false;
		this._lastReceive = now();
		this.mode = "solo";
		this.me = this.hostId = 0;
		this.isHost = true;
		this.server = false;
		this.active = false;
		this.started = false;
		this.ended = false;
		this.players = [{ id: 0, name: "Rogue One", color: "#ffb04a" }];
		this.room = "";
		this.stats.transport = "none";
		if (emit) {
			this._status("Solo flight");
			this._emit("players", this.players);
		}
	}

	destroy() {
		this.close(false);
		clearInterval(this._timer);
		for (const off of this._hubOff) off();
		this.handlers.clear();
	}
}
