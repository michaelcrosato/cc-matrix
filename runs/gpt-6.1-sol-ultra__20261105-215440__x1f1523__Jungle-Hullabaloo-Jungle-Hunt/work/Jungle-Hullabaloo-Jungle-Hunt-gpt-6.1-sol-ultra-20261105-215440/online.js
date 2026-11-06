/** Shared-world co-op. AI Hub transports session traffic; standalone rooms use WebRTC. */
export class JungleOnline {
	constructor(callbacks = {}) {
		this.callbacks = callbacks;
		this.hubActive = false;
		this.server = false;
		this.isHost = true;
		this.connected = false;
		this.playerIndex = 0;
		this.playerCount = 1;
		this.roomCode = "";
		this.running = false;
		this.ended = false;
		this.transport = "solo";
		this.status = "Solo expedition";
		this.available =
			typeof RTCPeerConnection !== "undefined" ||
			typeof BroadcastChannel !== "undefined";
		this.peer = null;
		this.connection = null;
		this.channel = null;
		this.unsubscribers = [];
		this.lastInputAt = -Infinity;
		this.lastSnapshotAt = -Infinity;
		this.sequence = 0;
		this.lastReceivedSequence = -1;
		this.lastState = null;
		this.generation = 0;
		this.roomTimer = null;
		this.heartbeatTimer = null;
		this.lastPartnerAt = 0;
		this.startTimer = null;
		this.finishSent = false;
		this.pendingInput = null;
		this.localId = this.makeCode(12);
		this.remoteId = null;
	}

	makeCode(length = 6) {
		const bytes = new Uint8Array(length);
		crypto.getRandomValues(bytes);
		const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
	}

	setStatus(message) {
		this.status = message;
		this.callbacks.onStatus?.(message, this);
	}

	async init() {
		if (!window.AIHub?.active) return this;
		const hub = window.AIHub;
		const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) return this;
		this.hubActive = true;
		this.server = info.server === true;
		this.isHost = info.isHost;
		this.playerIndex = this.server ? -1 : info.me;
		this.playerCount = info.players.length;
		this.connected = true;
		this.transport = "ai-hub";
		this.info = info;
		this.setStatus("AI Hub co-op · waiting for the round");
		this.unsubscribers.push(
			hub.on("start", () => {
				const begin = () => {
					if (this.ended) return;
					if (hub.time() < 0) {
						this.startTimer = setTimeout(begin, Math.max(1, -hub.time()));
						return;
					}
					this.running = true;
					this.setStatus("AI Hub co-op");
					this.callbacks.onStart?.();
				};
				begin();
			}),
		);
		this.unsubscribers.push(
			hub.on("message", (data, from) => {
				if (
					this.ended ||
					!data ||
					data.game !== "jungle-hullabaloo" ||
					data.v !== 1
				)
					return;
				if (data.kind === "input" && this.isHost && from !== hub.host)
					this.callbacks.onInput?.(data.value, from);
				if (data.kind === "snapshot" && !this.isHost && from === hub.host) {
					if (data.seq <= this.lastReceivedSequence) return;
					this.lastReceivedSequence = data.seq;
					this.lastState = data.value;
					this.callbacks.onSnapshot?.(data.value);
				}
			}),
		);
		this.unsubscribers.push(
			hub.on("leave", ({ id }) => {
				this.playerCount = hub.players.length;
				this.callbacks.onInput?.(
					{ x: 0, y: 0, jump: false, attack: false, duck: false },
					id,
				);
				this.setStatus("AI Hub co-op · expedition continues");
			}),
		);
		this.unsubscribers.push(
			hub.on("time-up", () => {
				this.callbacks.onTimeUp?.();
				if (this.isHost && !this.finishSent)
					this.finish(this.lastState?.score ?? 0, false);
			}),
		);
		this.unsubscribers.push(
			hub.on("end", (event) => {
				this.running = false;
				this.ended = true;
				clearTimeout(this.startTimer);
				this.setStatus("AI Hub round complete");
				this.callbacks.onEnd?.(event);
			}),
		);
		return this;
	}

	ready() {
		if (this.hubActive) window.AIHub.ready();
	}

	finish(score = 0, won = true) {
		if (!this.hubActive || !this.isHost || this.finishSent || this.ended)
			return;
		this.finishSent = true;
		const ids = window.AIHub.players.map((player) => player.id);
		const numericScore = Number.isFinite(Number(score)) ? Number(score) : 0;
		window.AIHub.finish({
			standings: [ids],
			scores: Object.fromEntries(ids.map((id) => [id, numericScore])),
			won: !!won,
		});
	}

	async createRoom(options = {}) {
		if (this.hubActive) return "";
		this.leave();
		this.isHost = true;
		this.playerIndex = 0;
		this.roomCode = `${options.local ? "LOCAL-" : ""}${this.makeCode()}`;
		this.transport = options.local ? "local" : "webrtc";
		this.openChannel();
		this.setStatus(`Room ${this.roomCode} · waiting for a partner`);
		if (!options.local) this.openPeer(true, this.generation);
		return this.roomCode;
	}

	async joinRoom(code) {
		if (this.hubActive) return false;
		const room = String(code || "")
			.trim()
			.toUpperCase();
		if (!/^(LOCAL-)?[A-Z2-9]{6}$/.test(room)) {
			this.setStatus("Enter the six-character room code.");
			return false;
		}
		this.leave();
		this.isHost = false;
		this.playerIndex = 1;
		this.roomCode = room;
		this.transport = room.startsWith("LOCAL-") ? "local" : "webrtc";
		this.openChannel();
		this.setStatus(`Joining room ${room}…`);
		const generation = this.generation;
		const hello = () => {
			if (generation !== this.generation || this.connected) return;
			this.channel?.postMessage({ v: 1, kind: "hello", sender: this.localId });
		};
		hello();
		this.roomTimer = setInterval(hello, 400);
		if (!room.startsWith("LOCAL-")) this.openPeer(false, generation);
		return true;
	}

	openChannel() {
		if (typeof BroadcastChannel === "undefined") return;
		try {
			this.channel = new BroadcastChannel(
				`jungle-hullabaloo-v1-${this.roomCode}`,
			);
			this.channel.onmessage = ({ data }) => {
				if (!data || data.v !== 1 || data.sender === this.localId) return;
				if (data.target && data.target !== this.localId) return;
				if (data.kind === "hello" && this.isHost) {
					if (this.connected && this.remoteId !== data.sender) return;
					this.remoteId = data.sender;
					this.connected = true;
					this.lastPartnerAt = performance.now();
					this.playerCount = 2;
					this.transport = "local";
					this.channel.postMessage({
						v: 1,
						kind: "welcome",
						sender: this.localId,
						target: data.sender,
					});
					this.setStatus(`Partner joined · room ${this.roomCode}`);
					if (this.running)
						this.channel.postMessage({
							v: 1,
							kind: "start",
							sender: this.localId,
							target: data.sender,
						});
					return;
				}
				if (data.kind === "welcome" && !this.isHost) {
					this.remoteId = data.sender;
					this.connected = true;
					this.lastPartnerAt = performance.now();
					this.playerCount = 2;
					this.transport = "local";
					clearInterval(this.roomTimer);
					this.connection?.close();
					this.peer?.destroy();
					this.peer = null;
					this.setStatus(`Connected · room ${this.roomCode} · host starts`);
					return;
				}
				if (this.connected && data.sender === this.remoteId) {
					this.lastPartnerAt = performance.now();
					this.receive(data);
				}
			};
			this.heartbeatTimer = setInterval(() => {
				if (!this.connected || this.transport !== "local") return;
				if (performance.now() - this.lastPartnerAt > 6500) {
					this.partnerLeft();
					return;
				}
				this.send({ kind: "heartbeat" });
			}, 1000);
		} catch {
			this.channel = null;
		}
	}

	async openPeer(host, generation) {
		try {
			const { default: Peer } = await import(
				"https://esm.sh/peerjs@1.5.5?bundle"
			);
			if (
				generation !== this.generation ||
				this.hubActive ||
				this.transport === "local"
			)
				return;
			const peerId = `jungle-hullabaloo-v1-${this.roomCode}`;
			this.peer = host ? new Peer(peerId) : new Peer();
			const timeout = setTimeout(() => {
				if (generation !== this.generation || this.connected) return;
				this.setStatus(
					host
						? `Room ${this.roomCode} · broker unavailable; same-browser joining still works`
						: "Room unavailable. Check the code and your connection.",
				);
			}, 12000);
			this.peer.on("open", () => {
				clearTimeout(timeout);
				if (generation !== this.generation) return;
				if (host) this.setStatus(`Room ${this.roomCode} · ready for a partner`);
				else if (!this.connected)
					this.bindConnection(
						this.peer.connect(peerId, {
							reliable: true,
							serialization: "json",
						}),
						generation,
					);
			});
			this.peer.on("connection", (connection) => {
				if (!host || this.connected) {
					connection.close();
					return;
				}
				this.bindConnection(connection, generation);
			});
			this.peer.on("error", (error) => {
				clearTimeout(timeout);
				if (generation !== this.generation || this.connected) return;
				this.setStatus(
					error.type === "peer-unavailable"
						? "Room not found. Check the code."
						: `Network unavailable · ${this.roomCode} still works between browser tabs`,
				);
			});
		} catch {
			if (generation === this.generation && !this.connected)
				this.setStatus(
					`Online broker unavailable · ${this.roomCode} works between browser tabs`,
				);
		}
	}

	bindConnection(connection, generation) {
		this.connection = connection;
		connection.on("open", () => {
			if (generation !== this.generation || this.transport === "local") {
				connection.close();
				return;
			}
			this.connected = true;
			this.playerCount = 2;
			this.transport = "webrtc";
			clearInterval(this.roomTimer);
			this.setStatus(
				`Connected · room ${this.roomCode}${this.isHost ? " · ready to start" : " · host starts"}`,
			);
			if (this.running && this.isHost) this.send({ kind: "start" });
		});
		connection.on("data", (data) => {
			if (generation === this.generation && this.transport === "webrtc")
				this.receive(data);
		});
		connection.on("close", () => {
			if (generation !== this.generation || this.transport !== "webrtc") return;
			this.partnerLeft();
		});
		connection.on("error", () => {
			if (generation === this.generation && this.transport === "webrtc")
				this.partnerLeft();
		});
	}

	receive(data) {
		if (this.ended || !data || data.v !== 1) return;
		if (data.kind === "start" && !this.isHost) {
			this.running = true;
			this.finishSent = false;
			this.callbacks.onStart?.();
		} else if (data.kind === "input" && this.isHost)
			this.callbacks.onInput?.(data.value, 1);
		else if (data.kind === "snapshot" && !this.isHost) {
			if (data.seq <= this.lastReceivedSequence) return;
			this.lastReceivedSequence = data.seq;
			this.lastState = data.value;
			this.callbacks.onSnapshot?.(data.value);
		} else if (data.kind === "leave") this.partnerLeft();
	}

	partnerLeft() {
		this.connected = false;
		this.playerCount = 1;
		this.remoteId = null;
		this.callbacks.onInput?.(
			{ x: 0, y: 0, jump: false, attack: false, duck: false },
			1,
		);
		this.setStatus(
			this.isHost
				? "Partner left · continue solo or invite again"
				: "Host disconnected · leave the room to play solo",
		);
		this.callbacks.onDisconnect?.();
	}

	send(message) {
		if (!this.connected || this.ended) return false;
		const data = {
			...message,
			v: 1,
			game: "jungle-hullabaloo",
			sender: this.localId,
		};
		if (this.hubActive)
			return window.AIHub.send(
				data,
				this.isHost
					? { reliable: false }
					: { to: window.AIHub.host, reliable: false },
			);
		if (this.transport === "local" && this.channel) {
			this.channel.postMessage({ ...data, target: this.remoteId });
			return true;
		}
		if (this.connection?.open) {
			this.connection.send(data);
			return true;
		}
		return false;
	}

	sendInput(input) {
		if (this.isHost || !this.connected || !this.running || this.ended)
			return false;
		// Keep brief button presses until the next packet, while axes always use
		// the newest value. A one-frame jump must survive network throttling.
		const pending = { ...input };
		if (this.pendingInput)
			for (const key of Object.keys(this.pendingInput)) {
				if (typeof this.pendingInput[key] === "boolean")
					pending[key] = !!input[key] || this.pendingInput[key];
			}
		this.pendingInput = pending;
		const now = performance.now();
		if (now - this.lastInputAt < 70) return false;
		this.lastInputAt = now;
		this.pendingInput = null;
		return this.send({ kind: "input", value: pending });
	}

	sendSnapshot(state) {
		this.lastState = state;
		if (!this.isHost || !this.connected || !this.running || this.ended)
			return false;
		const now = performance.now();
		if (now - this.lastSnapshotAt < 70) return false;
		this.lastSnapshotAt = now;
		return this.send({ kind: "snapshot", seq: ++this.sequence, value: state });
	}

	startGame() {
		if (this.hubActive || !this.isHost || !this.connected) return false;
		this.running = true;
		this.finishSent = false;
		this.send({ kind: "start" });
		this.callbacks.onStart?.();
		return true;
	}

	leave() {
		if (this.hubActive) return false;
		this.send({ kind: "leave" });
		++this.generation;
		clearInterval(this.roomTimer);
		clearInterval(this.heartbeatTimer);
		clearTimeout(this.startTimer);
		this.channel?.close();
		this.connection?.close();
		this.peer?.destroy();
		this.channel = null;
		this.connection = null;
		this.peer = null;
		this.connected = false;
		this.playerIndex = 0;
		this.playerCount = 1;
		this.isHost = true;
		this.roomCode = "";
		this.transport = "solo";
		this.running = false;
		this.ended = false;
		this.sequence = 0;
		this.lastReceivedSequence = -1;
		this.lastSnapshotAt = -Infinity;
		this.lastInputAt = -Infinity;
		this.remoteId = null;
		this.pendingInput = null;
		this.setStatus("Solo expedition");
		return true;
	}
}
