// Game transport. AI Hub's unmodified session.js must precede this module.
export class OnlineLink {
	constructor(callbacks = {}) {
		this.callbacks = callbacks;
		this.role = "solo";
		this.connected = false;
		this.status = "Solo patrol";
		this.me = 0;
		this.server = false;
		this.players = [{ id: 0, name: "Sun", color: "#e8443a" }];
		this.playing = false;
		this.ended = false;
		this.finished = false;
		this.info = null;
		this.mode = "solo";
		this.room = "";
		this.pc = null;
		this.channel = null;
		this.broadcast = null;
		this.timers = new Set();
		this.unsubscribers = [];
		this.clientId =
			globalThis.crypto?.randomUUID?.() || `sun-${Date.now()}-${Math.random()}`;
		this.clients = new Map();
		this.lastStateAt = -Infinity;
		this.lastInputAt = -Infinity;
		this.stateSequence = 0;
		this.receivedSequence = -1;
		this.lastHostAt = 0;
		this.hostId = null;
	}

	get active() {
		return !!globalThis.AIHub?.active;
	}

	statusTo(text) {
		this.status = text;
		this.callbacks.onStatus?.(text);
	}

	roleTo(role) {
		this.role = role;
		this.callbacks.onRole?.(role, {
			me: this.me,
			server: this.server,
			players: this.players,
			mode: this.mode,
			connected: this.connected,
			room: this.room,
		});
	}

	async init() {
		if (!this.active) return null;
		this.mode = "hub";
		const hub = globalThis.AIHub;
		const info = await hub.connect({ mode: "shared-world", seats: [1, 4] });
		if (!info) {
			this.mode = "solo";
			return null;
		}
		this.info = info;
		this.me = info.me;
		this.server = !!info.server;
		this.hostId = info.host;
		this.players = info.players.slice();
		this.connected = true;
		this.roleTo(info.isHost ? "host" : "guest");
		this.statusTo("AI Hub · waiting for the round");
		this.unsubscribers.push(
			hub.on("start", () => {
				const begin = () => {
					if (this.ended) return;
					const remaining = -hub.time();
					if (remaining > 0) {
						this.later(begin, Math.min(remaining + 1, 100));
						return;
					}
					this.playing = true;
					this.statusTo("AI Hub · city patrol");
					this.callbacks.onStart?.(info);
				};
				begin();
			}),
			hub.on("message", (data, from) => this.receive(data, from)),
			hub.on("leave", ({ id, reason }) => {
				this.players = hub.players.slice();
				this.callbacks.onLeave?.(id, reason);
				this.roleTo(this.role);
			}),
			hub.on("time-up", () => {
				if (this.ended) return;
				this.callbacks.onTimeUp?.();
				// A host must report inside the grace period even if no gameplay
				// callback was installed. A game's callback can supply its real score.
				if (this.role === "host" && !this.finished)
					this.finish({ score: 0, won: false });
			}),
			hub.on("end", ({ reason }) => {
				this.ended = true;
				this.playing = false;
				this.connected = false;
				this.clearTimers();
				this.statusTo(
					`AI Hub · ${reason === "finished" ? "round complete" : reason}`,
				);
				this.callbacks.onEnd?.(reason);
			}),
		);
		return info;
	}

	ready() {
		if (this.active && !this.ended) globalThis.AIHub.ready();
	}

	later(fn, delay) {
		const id = setTimeout(() => {
			this.timers.delete(id);
			fn();
		}, delay);
		this.timers.add(id);
		return id;
	}

	clearTimers() {
		for (const id of this.timers) clearTimeout(id);
		this.timers.clear();
	}

	receive(packet, from) {
		if (!packet || packet.game !== "son-of-a-sun" || this.ended) return;
		if (packet.type === "state" && this.role === "guest") {
			if (this.mode === "hub" && from !== this.hostId) return;
			if (Number.isFinite(packet.seq) && packet.seq <= this.receivedSequence)
				return;
			this.receivedSequence = packet.seq;
			this.lastHostAt = performance.now();
			this.callbacks.onState?.(packet.state, from);
		} else if (packet.type === "input" && this.role === "host") {
			if (this.mode === "hub" && !this.players.some((p) => p.id === from))
				return;
			this.callbacks.onInput?.(packet.input, from);
		} else if (
			packet.type === "end" &&
			this.role === "guest" &&
			this.mode !== "hub"
		) {
			this.callbacks.onRoundEnd?.(packet.result);
		}
	}

	send(packet) {
		if (this.ended || !this.connected) return false;
		packet.game = "son-of-a-sun";
		if (this.mode === "hub") {
			return globalThis.AIHub.send(packet, {
				...(this.role === "guest" ? { to: this.hostId } : {}),
				reliable: true,
			});
		}
		if (this.mode === "webrtc" && this.channel?.readyState === "open") {
			if (this.channel.bufferedAmount > 262144) return false;
			try {
				this.channel.send(JSON.stringify(packet));
				return true;
			} catch {
				return false;
			}
		}
		if (this.mode === "broadcast" && this.broadcast) {
			this.broadcast.postMessage({
				...packet,
				from: this.clientId,
				player: this.me,
			});
			return true;
		}
		return false;
	}

	sendState(state) {
		if (this.role !== "host" || this.ended) return false;
		const now = performance.now();
		if (now - this.lastStateAt < 70) return false;
		this.lastStateAt = now;
		return this.send({ type: "state", seq: ++this.stateSequence, state });
	}

	sendInput(input) {
		if (this.role !== "guest" || this.ended) return false;
		const now = performance.now();
		if (now - this.lastInputAt < 70) return false;
		this.lastInputAt = now;
		return this.send({ type: "input", input });
	}

	finish({ score = 0, won = true, stats = {} } = {}) {
		if (this.role !== "host" || this.finished || this.ended) return;
		this.finished = true;
		const ids = this.players.map((p) => p.id);
		const result = {
			standings: [ids],
			scores: Object.fromEntries(
				ids.map((id) => [id, Number.isFinite(score) ? score : 0]),
			),
			won: !!won,
			stats: Object.fromEntries(ids.map((id) => [id, stats])),
		};
		if (this.mode === "hub") globalThis.AIHub.finish(result);
		else this.send({ type: "end", result });
	}

	// Same-browser tab rooms are useful for quick co-op and deterministic tests.
	host(room = "sun") {
		if (this.active) throw new Error("The AI Hub manages this round.");
		this.close();
		this.mode = "broadcast";
		this.room =
			String(room)
				.trim()
				.toUpperCase()
				.replace(/[^A-Z0-9-]/g, "")
				.slice(0, 20) || "SUN";
		this.me = 0;
		this.players = [{ id: 0, name: "Sun", color: "#e8443a" }];
		this.connected = true;
		this.playing = true;
		this.openBroadcast();
		this.roleTo("host");
		this.statusTo(`Room ${this.room} · waiting for a partner tab`);
		const heartbeat = () => {
			if (!this.broadcast || this.role !== "host") return;
			this.broadcast.postMessage({
				t: "beacon",
				from: this.clientId,
				players: this.players,
			});
			this.later(heartbeat, 1000);
		};
		heartbeat();
		return this.room;
	}

	join(room = "sun") {
		if (this.active) throw new Error("The AI Hub manages this round.");
		this.close();
		this.mode = "broadcast";
		this.room =
			String(room)
				.trim()
				.toUpperCase()
				.replace(/[^A-Z0-9-]/g, "")
				.slice(0, 20) || "SUN";
		this.me = 1;
		this.openBroadcast();
		this.roleTo("guest");
		this.statusTo(`Room ${this.room} · looking for the host tab`);
		const hello = () => {
			if (!this.broadcast || this.role !== "guest") return;
			this.broadcast.postMessage({ t: "join", from: this.clientId });
			this.later(hello, 1000);
		};
		hello();
		return this.room;
	}

	openBroadcast() {
		if (!globalThis.BroadcastChannel)
			throw new Error(
				"Tab rooms are unavailable in this browser. Use a direct link.",
			);
		this.broadcast = new BroadcastChannel(`son-of-a-sun:${this.room}`);
		this.broadcast.onmessage = ({ data }) => {
			if (!data || data.from === this.clientId || this.ended) return;
			if (data.t === "join" && this.role === "host") {
				if (!this.clients.has(data.from)) {
					const used = new Set(this.clients.values());
					const slot = [1, 2, 3].find((id) => !used.has(id));
					if (slot === undefined) {
						this.broadcast.postMessage({ t: "full", to: data.from });
						return;
					}
					this.clients.set(data.from, slot);
					this.players.push({
						id: slot,
						name: ["Sun", "Moon", "Comet", "Nova"][slot],
						color: ["#e8443a", "#3b82f6", "#22c55e", "#f5b700"][slot],
					});
					this.roleTo("host");
				}
				this.broadcast.postMessage({
					t: "welcome",
					from: this.clientId,
					to: data.from,
					me: this.clients.get(data.from),
					players: this.players,
				});
				this.statusTo(
					`Room ${this.room} · ${this.players.length} heroes connected`,
				);
			} else if (
				data.t === "welcome" &&
				this.role === "guest" &&
				data.to === this.clientId
			) {
				const first = !this.connected;
				this.me = data.me;
				this.hostId = data.from;
				this.players = data.players;
				this.connected = true;
				this.playing = true;
				this.lastHostAt = performance.now();
				if (first) {
					this.roleTo("guest");
					this.callbacks.onStart?.({ standalone: true });
				}
				this.statusTo(`Room ${this.room} · partner connected`);
			} else if (data.t === "bye") {
				if (this.role === "host" && this.clients.has(data.from)) {
					const id = this.clients.get(data.from);
					this.clients.delete(data.from);
					this.players = this.players.filter((p) => p.id !== id);
					this.callbacks.onLeave?.(id, "left");
					this.roleTo("host");
				} else if (this.role === "guest" && data.from === this.hostId) {
					this.connected = false;
					this.statusTo("The host left the room");
					this.callbacks.onEnd?.("host-left");
				}
			} else if (data.t === "full" && data.to === this.clientId)
				this.statusTo("That room already has four heroes");
			else if (data.game === "son-of-a-sun") {
				if (this.role === "host" && this.clients.has(data.from))
					this.receive(data, this.clients.get(data.from));
				else if (this.role === "guest" && data.from === this.hostId)
					this.receive(data, 0);
			}
		};
	}

	newPeer(role) {
		if (this.active) throw new Error("The AI Hub manages this round.");
		this.close();
		if (!globalThis.RTCPeerConnection)
			throw new Error("Direct co-op is unavailable in this browser.");
		this.mode = "webrtc";
		this.me = role === "host" ? 0 : 1;
		this.players = [
			{ id: 0, name: "Sun", color: "#e8443a" },
			{ id: 1, name: "Moon", color: "#3b82f6" },
		];
		this.roleTo(role);
		this.pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.pc.onconnectionstatechange = () => {
			const state = this.pc?.connectionState;
			if (state === "failed")
				this.statusTo(
					"Direct connection failed. Some networks require AI Hub.",
				);
			if (state === "disconnected" || state === "closed") {
				this.connected = false;
				this.statusTo("Partner disconnected");
				this.callbacks.onLeave?.(this.me === 0 ? 1 : 0, "disconnected");
			}
		};
		this.pc.ondatachannel = ({ channel }) => this.attachDataChannel(channel);
		return this.pc;
	}

	attachDataChannel(channel) {
		this.channel = channel;
		channel.onopen = () => {
			this.connected = true;
			this.playing = true;
			this.statusTo("Direct co-op · partner connected");
			this.roleTo(this.role);
			this.callbacks.onStart?.({ standalone: true });
		};
		channel.onclose = () => {
			if (this.ended) return;
			this.connected = false;
			this.statusTo("Direct co-op · partner disconnected");
			this.callbacks.onLeave?.(this.me === 0 ? 1 : 0, "disconnected");
		};
		channel.onerror = () => this.statusTo("Direct co-op · connection error");
		channel.onmessage = ({ data }) => {
			if (typeof data !== "string" || data.length > 65536) return;
			try {
				this.receive(JSON.parse(data), this.me === 0 ? 1 : 0);
			} catch {
				/* Ignore malformed peer packets. */
			}
		};
	}

	async gather() {
		if (!this.pc || this.pc.iceGatheringState === "complete") return;
		const pc = this.pc;
		await new Promise((resolve) => {
			let timeout;
			const done = () => {
				clearTimeout(timeout);
				pc.removeEventListener("icegatheringstatechange", check);
				resolve();
			};
			const check = () => {
				if (pc.iceGatheringState === "complete") done();
			};
			pc.addEventListener("icegatheringstatechange", check);
			timeout = setTimeout(done, 6500);
		});
	}

	encodeDescription() {
		const description = this.pc.localDescription;
		return `SUN1.${btoa(JSON.stringify({ type: description.type, sdp: description.sdp }))}`;
	}

	decodeDescription(code, expected) {
		const text = String(code).trim();
		if (!text.startsWith("SUN1.") || text.length > 128000)
			throw new Error("Paste the complete SUN1 connection code.");
		let parsed;
		try {
			parsed = JSON.parse(atob(text.slice(5)));
		} catch {
			throw new Error("That connection code is damaged.");
		}
		if (parsed.type !== expected || typeof parsed.sdp !== "string")
			throw new Error(`This step needs an ${expected} code.`);
		return { type: parsed.type, sdp: parsed.sdp };
	}

	async createOffer() {
		const pc = this.newPeer("host");
		this.statusTo("Direct co-op · creating your invitation…");
		this.attachDataChannel(
			pc.createDataChannel("city-patrol", { ordered: true }),
		);
		await pc.setLocalDescription(await pc.createOffer());
		await this.gather();
		this.statusTo("Send the invitation code to your partner");
		return this.encodeDescription();
	}

	async acceptOffer(code) {
		const description = this.decodeDescription(code, "offer");
		const pc = this.newPeer("guest");
		this.statusTo("Direct co-op · creating your reply…");
		await pc.setRemoteDescription(description);
		await pc.setLocalDescription(await pc.createAnswer());
		await this.gather();
		this.statusTo("Send this reply code back to the host");
		return this.encodeDescription();
	}

	async acceptAnswer(code) {
		if (!this.pc || this.role !== "host" || this.mode !== "webrtc")
			throw new Error("Create an invitation first.");
		await this.pc.setRemoteDescription(this.decodeDescription(code, "answer"));
		this.statusTo("Direct co-op · connecting to your partner…");
	}

	close() {
		if (this.active) return; // Session lifecycle belongs to the hub.
		this.ended = true;
		this.clearTimers();
		if (this.broadcast) {
			this.broadcast.postMessage({ t: "bye", from: this.clientId });
			this.broadcast.close();
			this.broadcast = null;
		}
		if (this.channel) {
			this.channel.onclose = null;
			this.channel.close();
			this.channel = null;
		}
		if (this.pc) {
			this.pc.onconnectionstatechange = null;
			this.pc.close();
			this.pc = null;
		}
		for (const unsubscribe of this.unsubscribers) unsubscribe();
		this.unsubscribers = [];
		this.clients.clear();
		this.connected = false;
		this.playing = false;
		this.finished = false;
		this.ended = false;
		this.server = false;
		this.me = 0;
		this.mode = "solo";
		this.receivedSequence = -1;
		this.stateSequence = 0;
		this.lastStateAt = -Infinity;
		this.lastInputAt = -Infinity;
		this.players = [{ id: 0, name: "Sun", color: "#e8443a" }];
		this.roleTo("solo");
	}
}
