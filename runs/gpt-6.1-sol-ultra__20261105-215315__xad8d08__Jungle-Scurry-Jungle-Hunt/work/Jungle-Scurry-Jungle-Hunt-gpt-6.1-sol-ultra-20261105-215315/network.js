/** Jungle Scurry transports. AI Hub uses only the official session client. */
const GAME = "jungle-scurry-20261105";
const COLORS = ["#f5b747", "#65d5ef"];
const noop = () => {};
const now = () => performance.now();
const uid = () =>
	globalThis.crypto?.randomUUID?.() ||
	`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clone = (value) => JSON.parse(JSON.stringify(value));
const normalizeRoom = (value) =>
	String(value || "")
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9-]/g, "")
		.slice(0, 24);
const pack = (value) =>
	btoa(
		Array.from(new TextEncoder().encode(JSON.stringify(value)), (c) =>
			String.fromCharCode(c),
		).join(""),
	);
const unpack = (text) => {
	const value = String(text || "").trim();
	try {
		return JSON.parse(
			value.startsWith("{")
				? value
				: new TextDecoder().decode(
						Uint8Array.from(atob(value), (c) => c.charCodeAt(0)),
					),
		);
	} catch {
		throw new Error(
			"That connection code is incomplete. Copy the whole code and try again.",
		);
	}
};

export class ExpeditionNet {
	constructor(callbacks = {}) {
		for (const event of [
			"Status",
			"State",
			"Input",
			"Start",
			"End",
			"TimeUp",
			"Leave",
			"Join",
			"Finish",
		])
			this[`on${event}`] = callbacks[`on${event}`] || noop;
		this.mode = "solo";
		this.isHost = true;
		this.connected = false;
		this.players = [{ id: 0, name: "Scout One", color: COLORS[0] }];
		this.me = 0;
		this.server = false;
		this.started = false;
		this.ended = false;
		this.status = "Solo expedition";
		this.room = "";
		this._identity = uid();
		this._hostIdentity = null;
		this._peerIdentity = null;
		this._channel = null;
		this._pc = null;
		this._dc = null;
		this._timers = [];
		this._off = [];
		this._lastInputAt = -Infinity;
		this._pendingInput = null;
		this._lastStateAt = -Infinity;
		this._lastState = null;
		this._startPayload = null;
		this._startedAt = Infinity;
		this._lastPeerAt = now();
		this._finished = false;
		this.stats = { sent: 0, received: 0, inputs: 0, states: 0 };
	}

	get active() {
		return this.mode === "hub" || this.connected;
	}
	get hubActive() {
		return this.mode === "hub";
	}
	get time() {
		return this.mode === "hub"
			? globalThis.AIHub.time()
			: now() - this._startedAt;
	}
	get canPlay() {
		return this.started && !this.ended && this.time >= 0;
	}

	_status(text) {
		this.status = text;
		this.onStatus(text, this);
	}

	async init() {
		const hub = globalThis.AIHub;
		if (!hub?.active) return null;
		const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) return null;
		this.mode = "hub";
		this.isHost = info.isHost;
		this.connected = true;
		this.players = info.players.map((p) => ({ ...p }));
		this.me = info.me;
		this.server = !!info.server;
		this._status(
			this.server
				? "AI Hub expedition server"
				: `AI Hub · ${this.players.length} scout${this.players.length === 1 ? "" : "s"}`,
		);
		this._off.push(
			hub.on("start", (event) => {
				this.started = true;
				this.ended = false;
				this._finished = false;
				this.onStart({
					...event,
					players: this.players,
					server: this.server,
					hub: true,
				});
			}),
		);
		this._off.push(
			hub.on("message", (data, from) => {
				if (this.ended || !data || data.game !== GAME) return;
				this.stats.received++;
				if (
					data.t === "input" &&
					this.isHost &&
					this.players.some((p) => p.id === from)
				) {
					this.stats.inputs++;
					this.onInput(data.input, from);
				} else if (data.t === "state" && !this.isHost && from === hub.host) {
					this.stats.states++;
					this.onState(data.state);
				}
			}),
		);
		this._off.push(
			hub.on("time-up", (event) => {
				if (!this.ended) this.onTimeUp(event);
			}),
		);
		this._off.push(
			hub.on("leave", (event) => {
				this.players = this.players.filter((p) => p.id !== event.id);
				this.onLeave(event);
			}),
		);
		this._off.push(
			hub.on("end", (event) => {
				this.ended = true;
				this.started = false;
				this.connected = false;
				this._status("AI Hub round complete");
				this.onEnd(event);
			}),
		);
		return info;
	}

	ready() {
		if (this.mode === "hub") globalThis.AIHub.ready();
	}

	fail(message) {
		if (this.mode === "hub" || globalThis.AIHub?.active)
			globalThis.AIHub.fail(String(message));
		this._status(String(message));
	}

	/** The caller owns starting the actual simulation. In Hub only the hub can start it. */
	begin(payload = {}) {
		if (this.mode === "hub" || !this.isHost) return false;
		this.started = true;
		this.ended = false;
		this._finished = false;
		this._startedAt = now();
		this._startPayload = clone(payload);
		this._send({
			t: "start",
			payload: this._startPayload,
			players: this.players,
		});
		this.onStart({
			payload: this._startPayload,
			players: this.players,
			hub: false,
			in: 0,
		});
		return true;
	}

	sendInput(input, force = false) {
		if (this.ended || this.server) return false;
		if (this.isHost) {
			this.onInput(input, this.me);
			return true;
		}
		const pending = this._pendingInput;
		this._pendingInput = {
			...pending,
			...input,
			jump: !!input.jump || !!pending?.jump,
			action: !!input.action || !!pending?.action,
			pauseRequest: !!input.pauseRequest || !!pending?.pauseRequest,
		};
		if (!this.connected || (!force && now() - this._lastInputAt < 65))
			return false;
		this._lastInputAt = now();
		this.stats.inputs++;
		const packet = this._pendingInput;
		const reliable = !!(packet.jump || packet.action || packet.pauseRequest);
		const sent =
			this.mode === "hub"
				? this._hubSend(
						{ game: GAME, t: "input", input: packet },
						globalThis.AIHub.host,
						reliable,
					)
				: this._send({ t: "input", input: packet });
		if (sent) this._pendingInput = null;
		return sent;
	}

	sendState(snapshot, force = false) {
		if (!this.isHost || this.ended) return false;
		this._lastState = snapshot;
		if (!this.connected || (!force && now() - this._lastStateAt < 68))
			return false;
		this._lastStateAt = now();
		this.stats.states++;
		if (this.mode === "hub")
			return this._hubSend({ game: GAME, t: "state", state: snapshot });
		return this._send({ t: "state", state: snapshot });
	}

	_hubSend(data, to, reliable = false) {
		if (this.ended) return false;
		const sent = globalThis.AIHub.send(
			data,
			to == null ? { reliable } : { to, reliable },
		);
		if (sent) this.stats.sent++;
		return sent;
	}

	/** Shared-world team finish: all remaining players tie and receive the team result. */
	finish({ scores = {}, won = true, stats, awards } = {}) {
		if (!this.isHost || this._finished || this.ended) return false;
		this._finished = true;
		const result = {
			standings: [this.players.map((p) => p.id)],
			scores: Object.fromEntries(
				this.players.map((p) => [p.id, Number(scores[p.id] || 0)]),
			),
			won: !!won,
		};
		if (stats && typeof stats === "object") {
			const perPlayer = this.players.some(
				(p) => stats[p.id] && typeof stats[p.id] === "object",
			);
			result.stats = Object.fromEntries(
				this.players.map((p) => [
					p.id,
					clone(perPlayer ? stats[p.id] || {} : stats),
				]),
			);
		}
		if (awards) result.awards = awards;
		if (this.mode === "hub") globalThis.AIHub.finish(result);
		else this._send({ t: "finish", result });
		return true;
	}

	/** Nearby tabs on the same origin. No backend, accounts, chat, or public room directory. */
	hostRoom(code = "") {
		this._assertStandalone();
		this.leave();
		if (typeof BroadcastChannel !== "function")
			throw new Error(
				"Nearby play is unavailable in this browser. Use a direct connection code.",
			);
		this.mode = "room";
		this.isHost = true;
		this.me = 0;
		this.room =
			normalizeRoom(code) ||
			Math.random().toString(36).slice(2, 8).toUpperCase();
		this._hostIdentity = this._identity;
		this._channel = new BroadcastChannel(`${GAME}:${this.room}`);
		this._channel.onmessage = (event) => this._receive(event.data);
		this._status(`Camp ${this.room} · waiting for Scout Two`);
		this._timers.push(
			setInterval(() => {
				this._send({ t: "ping" });
				if (this.connected && now() - this._lastPeerAt > 7000)
					this._peerLeft("Connection lost");
			}, 1500),
		);
		return this.room;
	}

	joinRoom(code) {
		this._assertStandalone();
		const room = normalizeRoom(code);
		if (!room) throw new Error("Enter the host’s camp code first.");
		this.leave();
		if (typeof BroadcastChannel !== "function")
			throw new Error(
				"Nearby play is unavailable in this browser. Use a direct connection code.",
			);
		this.mode = "room";
		this.isHost = false;
		this.me = 1;
		this.room = room;
		this.players = [{ id: 1, name: "Scout Two", color: COLORS[1] }];
		this._channel = new BroadcastChannel(`${GAME}:${room}`);
		this._channel.onmessage = (event) => this._receive(event.data);
		this._status(`Finding camp ${room}…`);
		this._send({ t: "hello" });
		this._timers.push(
			setInterval(() => {
				if (!this.connected) this._send({ t: "hello" });
				else if (now() - this._lastPeerAt > 7000)
					this._peerLeft("Host connection lost");
			}, 1000),
		);
		return room;
	}

	_assertStandalone() {
		if (this.mode === "hub" || globalThis.AIHub?.active)
			throw new Error("AI Hub manages the expedition connection.");
	}

	_send(data, to = null) {
		if (this.ended) return false;
		const packet = { ...data, game: GAME, from: this._identity, to };
		if (this._channel) {
			this._channel.postMessage(packet);
			this.stats.sent++;
			return true;
		}
		if (
			this._dc?.readyState === "open" &&
			this._dc.bufferedAmount < 512 * 1024
		) {
			this._dc.send(JSON.stringify(packet));
			this.stats.sent++;
			return true;
		}
		return false;
	}

	_receive(packet) {
		if (
			!packet ||
			packet.game !== GAME ||
			packet.from === this._identity ||
			(packet.to && packet.to !== this._identity) ||
			this.ended
		)
			return;
		const { t, from } = packet;
		this.stats.received++;
		if (t === "hello" && this.isHost) {
			if (this._peerIdentity && from !== this._peerIdentity) {
				this._send({ t: "full" }, from);
				return;
			}
			const fresh = !this.connected;
			this._peerIdentity = from;
			this.connected = true;
			this._lastPeerAt = now();
			this.players = [
				{ id: 0, name: "Scout One", color: COLORS[0] },
				{ id: 1, name: "Scout Two", color: COLORS[1] },
			];
			this._send(
				{
					t: "welcome",
					players: this.players,
					started: this.started,
					payload: this._startPayload,
					state: this._lastState,
				},
				from,
			);
			this._status(
				this.mode === "room"
					? `Camp ${this.room} · two scouts connected`
					: "Direct connection · two scouts ready",
			);
			if (fresh) this.onJoin({ id: 1, players: this.players });
			return;
		}
		if (t === "welcome" && !this.isHost) {
			if (this._hostIdentity && this._hostIdentity !== from) return;
			const fresh = !this.connected;
			this._hostIdentity = from;
			this._peerIdentity = from;
			this.connected = true;
			this._lastPeerAt = now();
			this.players = packet.players;
			this._status(
				this.mode === "room"
					? `Camp ${this.room} · following Scout One`
					: "Direct connection · following Scout One",
			);
			if (fresh) this.onJoin({ id: 0, players: this.players });
			if (packet.started && !this.started) this._remoteStart(packet.payload);
			if (packet.state) this.onState(packet.state);
			return;
		}
		if (t === "full" && !this.isHost && !this.connected) {
			this._status("This camp already has two scouts. Choose another code.");
			return;
		}
		if (!this._peerIdentity || from !== this._peerIdentity) return;
		this._lastPeerAt = now();
		if (t === "ping") {
			this._send({ t: "pong" });
			return;
		}
		if (t === "pong") return;
		if (t === "bye") {
			this._peerLeft(
				this.isHost
					? "Scout Two left the expedition"
					: "Host left the expedition",
			);
			return;
		}
		if (t === "start" && !this.isHost) {
			this.players = packet.players || this.players;
			this._remoteStart(packet.payload);
		} else if (t === "input" && this.isHost) {
			this.stats.inputs++;
			this.onInput(packet.input, 1);
		} else if (t === "state" && !this.isHost) {
			this.stats.states++;
			this.onState(packet.state);
		} else if (t === "finish" && !this.isHost) this.onFinish(packet.result);
	}

	_remoteStart(payload) {
		this.started = true;
		this.ended = false;
		this._finished = false;
		this._startedAt = now();
		this.onStart({
			payload: payload || {},
			players: this.players,
			hub: false,
			in: 0,
		});
	}

	_peerLeft(reason) {
		if (!this.connected) return;
		this.connected = false;
		this._peerIdentity = null;
		this.players = this.players.filter((p) => p.id === this.me);
		this._status(reason);
		this.onLeave({ id: this.isHost ? 1 : 0, reason });
	}

	/** Manual WebRTC signaling. Codes contain only the connection description. */
	async createOffer({ iceServers } = {}) {
		this._assertStandalone();
		this.leave();
		this.mode = "webrtc";
		this.isHost = true;
		this.me = 0;
		this._makePeer(iceServers);
		this._attachDataChannel(
			this._pc.createDataChannel("expedition", { ordered: true }),
		);
		this._status("Preparing host code…");
		await this._pc.setLocalDescription(await this._pc.createOffer());
		await this._iceComplete();
		this._status("Host code ready · send it to Scout Two");
		return pack({ game: GAME, v: 1, ...this._pc.localDescription.toJSON() });
	}

	async acceptOffer(code, { iceServers } = {}) {
		this._assertStandalone();
		const offer = this._validateDescription(code, "offer");
		this.leave();
		this.mode = "webrtc";
		this.isHost = false;
		this.me = 1;
		this.players = [{ id: 1, name: "Scout Two", color: COLORS[1] }];
		this._makePeer(iceServers);
		this._status("Preparing reply code…");
		await this._pc.setRemoteDescription({ type: offer.type, sdp: offer.sdp });
		await this._pc.setLocalDescription(await this._pc.createAnswer());
		await this._iceComplete();
		this._status("Reply code ready · send it back to Scout One");
		return pack({ game: GAME, v: 1, ...this._pc.localDescription.toJSON() });
	}

	async acceptAnswer(code) {
		this._assertStandalone();
		const answer = this._validateDescription(code, "answer");
		if (!this._pc || !this.isHost)
			throw new Error("Create a host code before accepting a reply.");
		await this._pc.setRemoteDescription({ type: answer.type, sdp: answer.sdp });
		this._status("Connecting to Scout Two…");
	}

	_validateDescription(code, type) {
		const data = unpack(code);
		if (
			data.game !== GAME ||
			data.v !== 1 ||
			data.type !== type ||
			typeof data.sdp !== "string"
		)
			throw new Error(
				`Use a Jungle Scurry ${type === "offer" ? "host" : "reply"} code.`,
			);
		return data;
	}

	_makePeer(iceServers) {
		if (!globalThis.RTCPeerConnection)
			throw new Error(
				"Direct play needs a browser with WebRTC. Nearby play may still work.",
			);
		const pc = new RTCPeerConnection({
			iceServers: iceServers || [
				{ urls: "stun:stun.l.google.com:19302" },
				{ urls: "stun:stun.cloudflare.com:3478" },
			],
		});
		this._pc = pc;
		pc.ondatachannel = (event) => this._attachDataChannel(event.channel);
		pc.onconnectionstatechange = () => {
			if (pc !== this._pc) return;
			if (pc.connectionState === "failed") {
				this._peerLeft("Direct connection failed");
				this._status(
					"Direct connection failed. Try nearby play on one device, or a different network.",
				);
			} else if (
				pc.connectionState === "disconnected" ||
				pc.connectionState === "closed"
			)
				this._peerLeft("Direct connection lost");
		};
	}

	_attachDataChannel(channel) {
		this._dc = channel;
		channel.onmessage = (event) => {
			try {
				this._receive(JSON.parse(event.data));
			} catch {
				this._status("A connection packet could not be read.");
			}
		};
		channel.onopen = () => {
			if (!this.isHost) this._send({ t: "hello" });
			this._timers.push(
				setInterval(() => {
					if (!this.connected && !this.isHost) this._send({ t: "hello" });
					else if (this.connected) {
						this._send({ t: "ping" });
						if (now() - this._lastPeerAt > 10000)
							this._peerLeft("Direct connection timed out");
					}
				}, 2000),
			);
		};
		channel.onclose = () => this._peerLeft("Direct connection closed");
		channel.onerror = () => this._status("Direct connection interrupted");
	}

	_iceComplete() {
		const pc = this._pc;
		if (pc.iceGatheringState === "complete") return Promise.resolve();
		return new Promise((resolve) => {
			const timer = setTimeout(finish, 8000);
			const changed = () => {
				if (pc.iceGatheringState === "complete") finish();
			};
			function finish() {
				clearTimeout(timer);
				pc.removeEventListener("icegatheringstatechange", changed);
				resolve();
			}
			pc.addEventListener("icegatheringstatechange", changed);
		});
	}

	/** Hub rounds cannot be left/restarted by a game's menu. */
	leave() {
		if (this.mode === "hub") return false;
		this._send({ t: "bye" });
		for (const timer of this._timers) clearInterval(timer);
		this._timers = [];
		this._channel?.close();
		this._channel = null;
		if (this._dc) {
			this._dc.onclose = null;
			this._dc.close();
		}
		if (this._pc) {
			this._pc.onconnectionstatechange = null;
			this._pc.close();
		}
		this._dc = this._pc = null;
		this.mode = "solo";
		this.isHost = true;
		this.connected = false;
		this.me = 0;
		this.server = false;
		this.players = [{ id: 0, name: "Scout One", color: COLORS[0] }];
		this._hostIdentity = this._peerIdentity = null;
		this.room = "";
		this.started = this.ended = false;
		this._startedAt = Infinity;
		this._finished = false;
		this._lastInputAt = this._lastStateAt = -Infinity;
		this._pendingInput = null;
		this._lastState = this._startPayload = null;
		this._status("Solo expedition");
		return true;
	}

	destroy() {
		if (this.mode !== "hub") this.leave();
		for (const off of this._off) off();
		this._off = [];
	}
}
