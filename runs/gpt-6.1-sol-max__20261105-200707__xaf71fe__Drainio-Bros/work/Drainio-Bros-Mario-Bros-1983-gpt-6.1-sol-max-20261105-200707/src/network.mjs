export const neutralInput = () => ({
	x: 0,
	jump: false,
	action: false,
	down: false,
});
export class CrewNetwork {
	constructor(notify) {
		this.notify = notify;
		this.role = "solo";
		this.seat = 0;
		this.players = [{ id: 0, name: "Pip", color: "#ef8e52" }];
		this.inputs = new Map();
		this.connections = new Map();
		this.tokens = new Map();
		this.snapshot = null;
		this.events = [];
		this.timer = 0;
		this.sent = 0;
		this.received = 0;
		this.sequence = 0;
		this.ended = false;
		this.hubStarted = false;
		this.token = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
	}
	get host() {
		return this.role === "solo" || this.role.endsWith("host");
	}
	get online() {
		return this.role !== "solo";
	}
	async connectHub() {
		const info = await AIHub.connect({ mode: "shared-world", seats: [1, 4] });
		if (!info) return false;
		this.role = info.isHost ? "hub-host" : "hub-guest";
		this.seat = info.me;
		this.players = info.players;
		this.info = info;
		AIHub.on("start", () => {
			this.hubStarted = true;
			this.notify({ type: "start", hub: true });
		});
		AIHub.on("message", (data, from) => this.receive(data, from));
		AIHub.on("leave", ({ id }) => {
			this.players = this.players.filter((p) => p.id !== id);
			this.inputs.delete(id);
			this.notify({ type: "leave", id });
		});
		AIHub.on("time-up", () => this.notify({ type: "timeup" }));
		AIHub.on("end", (detail) => {
			this.ended = true;
			this.notify({ type: "end", ...detail });
		});
		return true;
	}
	ready() {
		if (AIHub.active) AIHub.ready();
	}
	finish(state, won = false) {
		if (!AIHub.active || !this.host || this.reported || this.ended) return;
		this.reported = true;
		const ids = this.players.map((p) => p.id),
			scores = {},
			stats = {};
		for (const id of ids) {
			const p = state?.players.find((p) => p.id === id);
			scores[id] = p?.score || 0;
			stats[id] = {
				"Crew score": state?.score || 0,
				"Shifts cleared": state
					? state.phase + (state.status === "won" ? 1 : 0)
					: 0,
			};
		}
		AIHub.finish({ standings: [ids], scores, won, stats });
	}
	async loadPeer() {
		if (window.Peer) return window.Peer;
		if (!this.peerLoad)
			this.peerLoad = new Promise((resolve, reject) => {
				const s = document.createElement("script");
				s.src = "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
				s.onload = () => resolve(window.Peer);
				s.onerror = () =>
					reject(new Error("Could not load the internet connection service."));
				document.head.append(s);
			});
		return this.peerLoad;
	}
	setupChannel(code) {
		if (typeof BroadcastChannel === "undefined") return;
		this.channel = new BroadcastChannel(`drainio-v1-${code}`);
		this.channel.onmessage = (event) => {
			const packet = event.data;
			if (
				packet.token === this.token ||
				(packet.to && packet.to !== this.token)
			)
				return;
			if (packet.type === "join" && this.host) {
				const seat = this.assign(packet.token);
				if (seat === null) {
					this.channel.postMessage({
						type: "error",
						to: packet.token,
						message: "This room has a full crew.",
						token: this.token,
					});
					return;
				}
				this.channel.postMessage({
					type: "welcome",
					token: this.token,
					to: packet.token,
					seat,
					players: this.players,
				});
				this.sendLobby();
			} else if (packet.type === "welcome" && this.role === "guest") {
				this.seat = packet.seat;
				this.players = packet.players;
				this.joined = true;
				this.notify({ type: "lobby", code, players: this.players });
			} else if (packet.type === "leave" && this.host) this.drop(packet.seat);
			else if (packet.type === "error")
				this.notify({ type: "error", message: packet.message });
			else this.receive(packet.data, packet.seat);
		};
	}
	assign(token) {
		if (this.tokens.has(token)) return this.tokens.get(token);
		const used = new Set(this.players.map((p) => p.id));
		const seat = [1, 2, 3].find((i) => !used.has(i));
		if (seat === undefined || this.inRound) return null;
		this.tokens.set(token, seat);
		this.players.push({
			id: seat,
			name: ["Pip", "Pop", "Pep", "Puck"][seat],
			color: ["#ef8e52", "#6ed2c0", "#bda1e9", "#f0d365"][seat],
		});
		this.notify({ type: "lobby", code: this.code, players: this.players });
		return seat;
	}
	async hostRoom() {
		this.close();
		this.ended = false;
		this.role = "host";
		this.seat = 0;
		this.players = [{ id: 0, name: "Pip", color: "#ef8e52" }];
		this.code = String(
			(crypto.getRandomValues(new Uint32Array(1))[0] % 900000) + 100000,
		);
		this.setupChannel(this.code);
		this.notify({
			type: "lobby",
			code: this.code,
			players: this.players,
			connecting: true,
		});
		try {
			const Peer = await this.loadPeer();
			if (this.ended) return;
			this.peer = new Peer(`drainio-v1-${this.code}`, { debug: 0 });
			this.peer.on("open", () =>
				this.notify({
					type: "lobby",
					code: this.code,
					players: this.players,
					internet: true,
				}),
			);
			this.peer.on("connection", (conn) => {
				const token = conn.metadata?.token || conn.peer;
				conn.on("open", () => {
					const seat = this.assign(token);
					if (seat === null) {
						conn.send({
							t: "error",
							message: "The shift is full or already started.",
						});
						setTimeout(() => conn.close(), 300);
						return;
					}
					this.connections.set(seat, conn);
					conn.send({
						t: "welcome",
						seat,
						players: this.players,
						code: this.code,
					});
					this.sendLobby();
				});
				conn.on("data", (data) => {
					const seat = this.tokens.get(token);
					if (seat !== undefined) this.receive(data, seat);
				});
				conn.on("close", () => {
					const seat = this.tokens.get(token);
					if (seat !== undefined) this.drop(seat);
				});
				conn.on("error", () => {
					const seat = this.tokens.get(token);
					if (seat !== undefined) this.drop(seat);
				});
			});
			this.peer.on("error", (err) =>
				this.notify({
					type: "error",
					message: `Internet signaling: ${err.type || err.message}. Same-browser tabs can still join.`,
				}),
			);
		} catch (err) {
			this.notify({ type: "error", message: err.message });
		}
	}
	async joinRoom(code) {
		this.close();
		this.ended = false;
		this.role = "guest";
		this.code = String(code);
		this.joined = false;
		this.setupChannel(this.code);
		this.notify({ type: "joining", code: this.code });
		this.channel?.postMessage({ type: "join", token: this.token });
		this.joinTimeout = setTimeout(() => {
			if (!this.joined && !this.ended)
				this.notify({
					type: "error",
					message:
						"No crew answered. Check the code and the host’s connection, then try again.",
				});
		}, 14000);
		try {
			const Peer = await this.loadPeer();
			if (this.ended) return;
			this.peer = new Peer({ debug: 0 });
			this.peer.on("open", () => {
				const conn = this.peer.connect(`drainio-v1-${this.code}`, {
					reliable: true,
					metadata: { token: this.token },
				});
				this.hostConnection = conn;
				conn.on("data", (data) => {
					if (data.t === "welcome") {
						this.seat = data.seat;
						this.players = data.players;
						this.joined = true;
						clearTimeout(this.joinTimeout);
						this.notify({
							type: "lobby",
							code: this.code,
							players: this.players,
							internet: true,
						});
					} else this.receive(data, 0);
				});
				conn.on("close", () => {
					if (!this.ended && this.inRound)
						this.notify({
							type: "disconnect",
							message: "The host clocked out.",
						});
				});
				conn.on("error", () => {
					if (!this.joined)
						this.notify({
							type: "error",
							message: "The room could not be reached.",
						});
				});
			});
			this.peer.on("error", (err) => {
				if (!this.joined)
					this.notify({
						type: "error",
						message: `Room connection failed (${err.type || "network"}). Check the code or create a room.`,
					});
			});
		} catch (err) {
			if (!this.joined) this.notify({ type: "error", message: err.message });
		}
	}
	sendLobby() {
		this.send({ t: "lobby", players: this.players });
	}
	start() {
		if (!this.host || this.inRound) return;
		this.inRound = true;
		this.send({ t: "start", players: this.players });
		this.notify({ type: "start" });
	}
	send(data) {
		if (this.ended || this.role === "solo") return;
		this.sent++;
		if (AIHub.active) {
			AIHub.send(
				data,
				this.host ? { reliable: true } : { to: AIHub.host, reliable: false },
			);
			return;
		}
		this.channel?.postMessage({
			type: "packet",
			token: this.token,
			seat: this.seat,
			data,
		});
		if (this.host)
			for (const conn of this.connections.values()) {
				if (conn.open) conn.send(data);
			}
		else if (this.hostConnection?.open) this.hostConnection.send(data);
	}
	receive(data, from) {
		if (this.ended || !data || typeof data.t !== "string") return;
		this.received++;
		if (
			data.t === "input" &&
			this.host &&
			this.players.some((p) => p.id === from)
		) {
			this.inputs.set(from, {
				x: Math.max(-1, Math.min(1, Number(data.x) || 0)),
				jump: !!data.jump,
				action: !!data.action,
				down: !!data.down,
				at: performance.now(),
			});
		}
		if (
			data.t === "state" &&
			!this.host &&
			(!AIHub.active || from === AIHub.host)
		) {
			if (this.snapshot && data.state.tick < this.snapshot.tick) return;
			this.snapshot = data.state;
			this.snapshot.remote = true;
			this.events.push(
				...(data.events || []).filter(
					(e) => e.tick > (this.lastEventTick ?? -1),
				),
			);
			if (data.events?.length)
				this.lastEventTick = Math.max(
					this.lastEventTick ?? -1,
					...data.events.map((e) => e.tick),
				);
			this.notify({ type: "state", paused: !!data.paused });
		}
		if (data.t === "start" && !this.host && !this.inRound) {
			this.inRound = true;
			this.players = data.players;
			this.notify({ type: "start" });
		}
		if (data.t === "lobby" && !this.host) {
			this.players = data.players;
			this.notify({ type: "lobby", code: this.code, players: this.players });
		}
		if (data.t === "error")
			this.notify({ type: "error", message: data.message });
		if (data.t === "closed" && !this.host)
			this.notify({ type: "disconnect", message: "The host clocked out." });
	}
	remoteInputs() {
		const out = {};
		for (const [id, input] of this.inputs)
			out[id] = performance.now() - input.at < 600 ? input : neutralInput();
		return out;
	}
	poll(dt, state, input, events, paused) {
		if (!this.online || this.ended || (!this.inRound && !this.hubStarted))
			return;
		this.eventsToSend ||= [];
		if (this.host) this.eventsToSend.push(...events);
		this.timer += dt;
		if (this.timer < 0.1) return;
		this.timer %= 0.1;
		if (this.host) {
			if (state)
				this.send({
					t: "state",
					state,
					events: this.eventsToSend.splice(0).slice(-28),
					paused,
				});
		} else this.send({ t: "input", ...input, seq: this.sequence++ });
		return true;
	}
	drop(id) {
		if (id === undefined || id === 0) return;
		this.connections.delete(id);
		this.players = this.players.filter((p) => p.id !== id);
		this.inputs.delete(id);
		this.notify({ type: "leave", id });
		this.sendLobby();
	}
	close() {
		if (!AIHub.active && this.role !== "solo" && !this.ended) {
			if (this.host) this.send({ t: "closed" });
			else
				this.channel?.postMessage({
					type: "leave",
					token: this.token,
					seat: this.seat,
				});
		}
		this.ended = true;
		this.peer?.destroy();
		this.peer = null;
		this.channel?.close();
		this.channel = null;
		this.connections.clear();
		this.tokens.clear();
		this.inputs.clear();
		clearTimeout(this.joinTimeout);
		this.role = "solo";
		this.inRound = false;
		this.joined = false;
		this.snapshot = null;
		this.events = [];
		this.lastEventTick = -1;
		this.reported = false;
	}
}
