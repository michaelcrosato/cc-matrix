/* Solaris Detour transport. AI Hub Session Protocol v1, client 1.4.0.
 * Standalone: PeerJS 1.5.5 WebRTC, with a same-origin BroadcastChannel path.
 * Gameplay stays host-authoritative: hosts send snapshots, guests send input.
 */
export class NetworkLink {
	constructor(callbacks = {}) {
		this.callbacks = callbacks;
		this.state = {
			mode: "solo",
			role: "solo",
			isHost: true,
			server: false,
			me: 0,
			players: [{ id: 0, name: "Pilot 1", color: "#f5b700" }],
			code: "",
			connected: false,
			message: "Solo flight",
			started: true,
			ended: false,
		};
		this.peer = null;
		this.connection = null;
		this.channel = null;
		this.transport = null;
		this.token = this._random(16);
		this.remoteToken = null;
		this.unsubscribers = [];
		this.readyRequested = false;
		this.reported = false;
		this.generation = 0;
		this.lastSeen = 0;
		this.timer = null;
		this.hubConnect = this.connectHub();
	}

	status() {
		return {
			...this.state,
			players: this.state.players.map((p) => ({ ...p })),
		};
	}
	_emit(role = false) {
		const status = this.status();
		this.callbacks.onStatus?.(status);
		if (role) this.callbacks.onRole?.(status);
	}
	_random(length) {
		const bytes = new Uint8Array(length);
		crypto.getRandomValues(bytes);
		const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
	}
	_receive(packet, from) {
		if (!packet || typeof packet !== "object" || this.state.ended) return;
		try {
			if (JSON.stringify(packet).length > 16384) return;
			this.callbacks.onPacket?.(packet, from);
		} catch (e) {
			this._error("A network packet could not be read.");
		}
	}
	_error(message) {
		this.state.message = message;
		this._emit();
		this.callbacks.onError?.(message);
	}

	async connectHub() {
		if (!globalThis.AIHub?.active) return null;
		this.state.mode = "hub";
		this.state.started = false;
		this.state.message = "Connecting to AI Hub";
		this._emit();
		const hub = globalThis.AIHub;
		const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) {
			this.state.mode = "solo";
			this.state.started = true;
			this.state.message = "Solo flight";
			this._emit(true);
			return null;
		}
		Object.assign(this.state, {
			mode: "hub",
			role: info.isHost ? "host" : "guest",
			isHost: info.isHost,
			server: !!info.server,
			me: info.me,
			players: info.players,
			connected: true,
			message: "AI Hub • standing by",
		});
		this.unsubscribers.push(
			hub.on("start", (event) => {
				this.state.started = true;
				this.state.message = "AI Hub • linked";
				this._emit();
				this.callbacks.onStart?.(event);
			}),
			hub.on("message", (data, from) => {
				// Guests trust world data only from the coordinator's host.
				if (!this.state.isHost && from !== hub.host) return;
				// A server host is absent from players; every other sender must be a seat.
				if (this.state.isHost && !this.state.players.some((p) => p.id === from))
					return;
				this._receive(data, from);
			}),
			hub.on("leave", (event) => {
				this.state.players = hub.players.map((p) => ({ ...p }));
				this._emit();
				this.callbacks.onLeave?.(event);
			}),
			hub.on("time-up", (event) => this.callbacks.onTimeUp?.(event)),
			hub.on("end", (event) => {
				this.state.ended = true;
				this.state.started = false;
				this.state.message = "AI Hub • round ended";
				this._emit();
				this.callbacks.onEnd?.(event);
			}),
		);
		this._emit(true);
		if (this.readyRequested) hub.ready();
		return info;
	}

	ready() {
		this.readyRequested = true;
		if (this.state.mode === "hub" && this.state.connected)
			globalThis.AIHub.ready();
	}
	time() {
		return this.state.mode === "hub"
			? globalThis.AIHub.time()
			: performance.now();
	}
	canPlay() {
		return (
			!this.state.ended &&
			(this.state.mode !== "hub" || (this.state.started && this.time() >= 0))
		);
	}
	finish(score = 0, won = false, stats = {}) {
		if (
			this.state.mode !== "hub" ||
			!this.state.isHost ||
			this.reported ||
			this.state.ended
		)
			return;
		this.reported = true;
		const ids = this.state.players.map((p) => p.id);
		const scores = {},
			allStats = {};
		for (const id of ids) {
			scores[id] = Number(score) || 0;
			allStats[id] = stats;
		}
		globalThis.AIHub.finish({
			standings: [ids],
			scores,
			won: !!won,
			stats: allStats,
		});
	}

	async _peerLibrary() {
		if (globalThis.Peer) return globalThis.Peer;
		if (!globalThis.__solarisPeerLoader) {
			globalThis.__solarisPeerLoader = new Promise((resolve, reject) => {
				const script = document.createElement("script");
				script.src =
					"https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
				script.onload = () =>
					globalThis.Peer
						? resolve(globalThis.Peer)
						: reject(new Error("PeerJS failed to load"));
				script.onerror = () => {
					script.remove();
					delete globalThis.__solarisPeerLoader;
					reject(new Error("The online service is unavailable"));
				};
				document.head.appendChild(script);
			});
		}
		return globalThis.__solarisPeerLoader;
	}

	_openChannel(code) {
		try {
			this.channel = new BroadcastChannel("solaris-detour-v1-" + code);
			this.channel.onmessage = (event) => {
				const m = event.data;
				if (!m || m.protocol !== "solaris-detour-v1" || m.token === this.token)
					return;
				if (m.to && m.to !== this.token) return;
				if (m.type === "hello" && this.state.isHost) {
					if (this.state.connected && this.remoteToken !== m.token) {
						this.channel.postMessage({
							protocol: "solaris-detour-v1",
							type: "full",
							token: this.token,
							to: m.token,
						});
						return;
					}
					this.remoteToken = m.token;
					this.transport = "local";
					this._linked();
					this.channel.postMessage({
						protocol: "solaris-detour-v1",
						type: "welcome",
						token: this.token,
						to: m.token,
					});
				} else if (
					m.type === "welcome" &&
					!this.state.isHost &&
					!this.state.connected
				) {
					this.remoteToken = m.token;
					this.transport = "local";
					this._linked();
				} else if (m.type === "full" && !this.state.connected) {
					this._error("That wing is full. Create another room.");
				} else if (m.token === this.remoteToken) {
					this.lastSeen = performance.now();
					if (m.type === "data")
						this._receive(m.data, this.state.isHost ? 1 : 0);
					if (m.type === "bye") this._remoteLeft();
				}
			};
		} catch (e) {
			this.channel = null;
		}
	}
	_localMessage(type, data) {
		if (!this.channel) return;
		this.channel.postMessage({
			protocol: "solaris-detour-v1",
			type,
			data,
			token: this.token,
			to: this.remoteToken,
		});
	}
	_linked() {
		const first = !this.state.connected;
		this.lastSeen = performance.now();
		this.state.connected = true;
		this.state.players = [
			{ id: 0, name: "Pilot 1", color: "#f5b700" },
			{ id: 1, name: "Pilot 2", color: "#50e6df" },
		];
		this.state.message = "Wing linked • " + this.state.code;
		this._emit(true);
		if (first) this.callbacks.onConnect?.(this.status());
	}
	_remoteLeft() {
		if (!this.state.connected) return;
		this.state.connected = false;
		this.remoteToken = null;
		this.transport = null;
		this.state.players = [
			{
				id: this.state.me,
				name: this.state.isHost ? "Pilot 1" : "Pilot 2",
				color: this.state.isHost ? "#f5b700" : "#50e6df",
			},
		];
		this.state.message = this.state.isHost
			? "Wingmate left • room " + this.state.code
			: "Host disconnected • reconnect or fly solo";
		this._emit(true);
		this.callbacks.onLeave?.({
			id: this.state.isHost ? 1 : 0,
			reason: "disconnected",
		});
	}
	_heartbeat() {
		clearInterval(this.timer);
		this.timer = setInterval(() => {
			if (this.state.connected && this.transport === "local") {
				this._localMessage("ping");
				if (performance.now() - this.lastSeen > 14000) this._remoteLeft();
			}
		}, 2000);
	}
	_attachConnection(connection) {
		connection.on("data", (m) => {
			if (!m || m.protocol !== "solaris-detour-v1") return;
			if (m.type === "full") {
				this._error("That wing is full. Create another room.");
				connection.close();
				return;
			}
			if (m.type === "welcome" && !this.state.isHost && !this.state.connected) {
				this.transport = "peer";
				this.connection = connection;
				this._linked();
			}
			if (
				this.transport === "peer" &&
				connection === this.connection &&
				m.type === "data"
			) {
				this.lastSeen = performance.now();
				this._receive(m.data, this.state.isHost ? 1 : 0);
			}
		});
		connection.on("close", () => {
			if (connection === this.connection && this.transport === "peer")
				this._remoteLeft();
		});
		connection.on("error", () => {
			if (!this.state.connected)
				this._error("Wing connection failed. Check the code and retry.");
		});
	}

	async host() {
		if (this.state.mode === "hub") return this.status();
		this.disconnect();
		const generation = this.generation;
		const code = this._random(6);
		Object.assign(this.state, {
			mode: "online",
			role: "host",
			isHost: true,
			server: false,
			me: 0,
			code,
			connected: false,
			started: true,
			ended: false,
			message: "Opening room " + code,
		});
		this._openChannel(code);
		this._heartbeat();
		this._emit(true);
		try {
			const Peer = await this._peerLibrary();
			if (generation !== this.generation) return this.status();
			this.peer = new Peer("solaris-detour-v1-" + code, { debug: 0 });
			this.peer.on("open", () => {
				if (!this.state.connected) {
					this.state.message = "Room " + code + " • waiting for wingmate";
					this._emit();
				}
			});
			this.peer.on("connection", (connection) => {
				this._attachConnection(connection);
				connection.on("open", () => {
					if (this.state.connected) {
						connection.send({ protocol: "solaris-detour-v1", type: "full" });
						setTimeout(() => connection.close(), 200);
						return;
					}
					this.connection = connection;
					this.transport = "peer";
					this._linked();
					connection.send({ protocol: "solaris-detour-v1", type: "welcome" });
				});
			});
			this.peer.on("error", (event) => {
				if (this.state.connected) return;
				this._error(
					event.type === "unavailable-id"
						? "Room name collision. Create another room."
						: "Internet service unavailable. Room " +
								code +
								" still works in another tab on this device.",
				);
			});
		} catch (e) {
			if (generation === this.generation && !this.state.connected)
				this._error(
					"Internet service unavailable. Room " +
						code +
						" still works in another tab on this device.",
				);
		}
		return this.status();
	}

	async join(roomCode) {
		if (this.state.mode === "hub") return this.status();
		const code = String(roomCode || "")
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, "");
		if (code.length !== 6) {
			this._error("Enter the six-character room code.");
			return this.status();
		}
		this.disconnect();
		const generation = this.generation;
		Object.assign(this.state, {
			mode: "online",
			role: "guest",
			isHost: false,
			server: false,
			me: 1,
			code,
			connected: false,
			started: true,
			ended: false,
			message: "Finding room " + code,
		});
		this._openChannel(code);
		this._heartbeat();
		this._emit(true);
		this._localMessage("hello");
		await new Promise((resolve) => setTimeout(resolve, 350));
		if (generation !== this.generation || this.state.connected)
			return this.status();
		this._localMessage("hello");
		try {
			const Peer = await this._peerLibrary();
			if (generation !== this.generation || this.state.connected)
				return this.status();
			this.peer = new Peer({ debug: 0 });
			this.peer.on("open", () => {
				if (generation !== this.generation || this.state.connected) return;
				const connection = this.peer.connect("solaris-detour-v1-" + code, {
					reliable: true,
					serialization: "json",
				});
				this.connection = connection;
				this._attachConnection(connection);
			});
			this.peer.on("error", () => {
				if (!this.state.connected)
					this._error("Room not found. Check the code, then try again.");
			});
			setTimeout(() => {
				if (generation === this.generation && !this.state.connected)
					this._error(
						"Room did not answer. Check the code or ask the host to create a new room.",
					);
			}, 14000);
		} catch (e) {
			if (generation === this.generation && !this.state.connected)
				this._error(
					"Online service unavailable. Try again when connected to the internet.",
				);
		}
		return this.status();
	}

	send(packet, options = {}) {
		if (!this.state.connected || this.state.ended) return false;
		let json;
		try {
			json = JSON.stringify(packet);
		} catch (e) {
			return false;
		}
		if (!json || json.length > 16000) return false;
		if (this.state.mode === "hub") {
			const opts = { reliable: options.reliable === true };
			if (options.to !== undefined) opts.to = options.to;
			else if (!this.state.isHost) opts.to = globalThis.AIHub.host;
			return globalThis.AIHub.send(packet, opts);
		}
		if (this.transport === "local") {
			this._localMessage("data", packet);
			return true;
		}
		if (this.connection?.open) {
			try {
				this.connection.send({
					protocol: "solaris-detour-v1",
					type: "data",
					data: packet,
				});
				return true;
			} catch (e) {
				return false;
			}
		}
		return false;
	}
	disconnect() {
		if (this.state.mode === "hub") return;
		this.generation++;
		if (this.transport === "local") this._localMessage("bye");
		clearInterval(this.timer);
		this.timer = null;
		this.channel?.close();
		this.channel = null;
		this.connection?.close();
		this.connection = null;
		this.peer?.destroy();
		this.peer = null;
		this.transport = null;
		this.remoteToken = null;
		Object.assign(this.state, {
			mode: "solo",
			role: "solo",
			isHost: true,
			server: false,
			me: 0,
			players: [{ id: 0, name: "Pilot 1", color: "#f5b700" }],
			code: "",
			connected: false,
			message: "Solo flight",
			started: true,
			ended: false,
		});
		this._emit(true);
	}
	destroy() {
		if (this.state.mode !== "hub") this.disconnect();
		this.unsubscribers.forEach((off) => {
			off();
		});
		this.unsubscribers.length = 0;
	}
}
