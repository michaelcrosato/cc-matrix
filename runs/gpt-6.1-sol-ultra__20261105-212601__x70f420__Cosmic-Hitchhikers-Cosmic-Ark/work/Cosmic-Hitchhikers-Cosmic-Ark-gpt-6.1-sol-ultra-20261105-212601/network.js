/* Cosmic Hitchhikers networking: host-authoritative AI Hub and local-link co-op. */
export class NetworkSession {
	constructor(options = {}) {
		this.options = options;
		this.maxPlayers = Math.max(2, Math.min(4, options.maxPlayers || 4));
		this.hub = false;
		this.role = "solo";
		this.room = "";
		this.players = [{ id: 0, name: "Pilot 1", color: "#e8443a" }];
		this.localId = 0;
		this.server = false;
		this.ended = false;
		this.reported = false;
		this.started = false;
		this.channel = null;
		this.peerKey =
			globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
		this.peers = new Map();
		this.hostKey = null;
		this.sequence = 0;
		this.remoteSequence = -1;
		this.sendClock = 0;
		this.heartbeatClock = 0;
		this.lastSnapshot = null;
		this.lastScore = 0;
		this.lastWon = false;
		this.unsubscribers = [];
		this.initializing = null;
		this.leaving = false;
		this.onUnload = () => this.leave();
		globalThis.addEventListener?.("pagehide", this.onUnload);
	}

	get info() {
		return {
			role: this.role,
			room: this.room,
			players: this.players.map((p) => ({ ...p })),
			count: this.players.length,
			hub: this.hub,
			me: this.localId,
			server: this.server,
			authority: this.role !== "client",
			started: this.started,
			ended: this.ended,
			connected: this.role !== "client" || this.localId !== null,
		};
	}

	get canPlay() {
		if (this.ended) return false;
		if (this.hub) return globalThis.AIHub.time() >= 0;
		return this.role !== "client" || this.localId !== null;
	}

	status(message = "") {
		this.options.onStatus?.({ ...this.info, message });
	}

	async initialize() {
		if (this.initializing) return this.initializing;
		this.initializing = (async () => {
			const hub = globalThis.AIHub;
			if (!hub?.active) return this.info;
			this.hub = true;
			this.role = "client";
			this.localId = null;
			this.unsubscribers.push(
				hub.on("message", (data, from) => this.hubMessage(data, from)),
				hub.on("start", (detail) => {
					this.started = true;
					this.options.onStart?.(detail);
					this.status("Mission synchronized");
				}),
				hub.on("leave", ({ id, reason }) => {
					this.players = this.players.filter((p) => p.id !== id);
					this.options.onInput?.(id, this.neutralInput());
					this.options.onLeave?.(id, reason);
					this.status("Crew member disconnected");
				}),
				hub.on("time-up", (detail) => {
					this.options.onTimeUp?.(detail);
					// Finish synchronously, safely inside even the shortest grace window.
					if (this.role === "host") this.finish(this.lastScore, this.lastWon);
				}),
				hub.on("end", (detail) => {
					this.ended = true;
					this.options.onEnd?.(detail);
					this.status(`Round ended: ${detail.reason}`);
				}),
			);
			const info = await hub.connect({
				mode: "shared-world",
				seats: [1, this.maxPlayers],
			});
			if (!info) {
				this.hub = false;
				this.role = "solo";
				this.localId = 0;
				this.status("Solo flight");
				return this.info;
			}
			this.role = info.isHost ? "host" : "client";
			this.server = !!info.server;
			this.localId = info.me;
			this.players = info.players.map((p) => ({ ...p }));
			this.room = `AI HUB ${info.round}`;
			this.status(
				this.server ? "Dedicated mission host" : "AI Hub crew connected",
			);
			return this.info;
		})();
		return this.initializing;
	}

	ready() {
		if (this.hub && !this.ended) globalThis.AIHub.ready();
	}

	neutralInput() {
		return {
			x: 0,
			y: 0,
			aimX: 0,
			aimY: 0,
			fire: false,
			beam: false,
			pulse: false,
		};
	}

	cleanInput(value) {
		// Keep gameplay input tiny and finite; the host never trusts a remote position.
		if (!value || typeof value !== "object") return this.neutralInput();
		const out = {};
		for (const [key, v] of Object.entries(value).slice(0, 24)) {
			if (typeof v === "boolean") out[key] = v;
			else if (typeof v === "number" && Number.isFinite(v))
				out[key] = Math.max(-100, Math.min(100, v));
		}
		return out;
	}

	hubMessage(data, from) {
		if (!this.hub || this.ended || !data || data.game !== "cosmic-hitchhikers")
			return;
		const hub = globalThis.AIHub;
		if (
			this.role === "host" &&
			data.type === "input" &&
			this.players.some((p) => p.id === from)
		) {
			this.options.onInput?.(from, this.cleanInput(data.input));
		} else if (
			this.role === "client" &&
			data.type === "world" &&
			from === hub.host
		) {
			if (!Number.isFinite(data.seq) || data.seq <= this.remoteSequence) return;
			this.remoteSequence = data.seq;
			this.lastSnapshot = data.snapshot;
			this.options.onSnapshot?.(data.snapshot);
		}
	}

	setRoom(code) {
		this.room = this.cleanRoom(code);
		return this.room;
	}
	cleanRoom(code) {
		return String(code || "")
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, "")
			.slice(0, 12);
	}
	makeRoom() {
		const data = new Uint8Array(6);
		globalThis.crypto.getRandomValues(data);
		return Array.from(
			data,
			(n) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 32],
		).join("");
	}

	openChannel(code) {
		if (this.hub) return false;
		if (!globalThis.BroadcastChannel) {
			this.status("Local link is unavailable in this browser");
			return false;
		}
		this.leave();
		this.room = this.cleanRoom(code);
		this.channel = new BroadcastChannel(`cosmic-hitchhikers-v1-${this.room}`);
		this.channel.onmessage = (event) => this.localMessage(event.data);
		this.ended = false;
		this.remoteSequence = -1;
		this.sendClock = 0;
		this.heartbeatClock = 0;
		return true;
	}

	hostRoom(code = "") {
		const selected = this.cleanRoom(code) || this.makeRoom();
		if (!this.openChannel(selected)) return false;
		this.role = "host";
		this.localId = 0;
		this.hostKey = this.peerKey;
		this.players = [{ id: 0, name: "Pilot 1", color: "#e8443a" }];
		this.started = true;
		this.localSend({ type: "host" });
		this.status(
			"Local link open. Join this code in another tab on this device.",
		);
		return this.room;
	}

	joinRoom(code) {
		const selected = this.cleanRoom(code);
		if (!selected) {
			this.status("Enter a local link code");
			return false;
		}
		if (!this.openChannel(selected)) return false;
		this.role = "client";
		this.localId = null;
		this.players = [];
		this.started = false;
		this.hostKey = null;
		this.localSend({ type: "join" });
		this.status("Looking for the local mission host…");
		return this.room;
	}

	localSend(data) {
		if (!this.channel || this.ended) return;
		try {
			this.channel.postMessage({ ...data, from: this.peerKey });
		} catch {
			this.status("Local link unavailable");
		}
	}

	broadcastRoster(target = null) {
		this.localSend({
			type: "welcome",
			to: target,
			players: this.players,
			slots: Array.from(this.peers, ([key, p]) => [key, p.id]),
			snapshot: this.lastSnapshot,
		});
	}

	localMessage(data) {
		if (!data || data.from === this.peerKey || this.ended) return;
		if (data.to && data.to !== this.peerKey) return;
		const now = performance.now();
		if (this.role === "host") {
			if (data.type === "join" || data.type === "ping") {
				let peer = this.peers.get(data.from);
				if (!peer) {
					if (this.players.length >= this.maxPlayers) {
						this.localSend({ type: "full", to: data.from });
						return;
					}
					const occupied = new Set(this.players.map((p) => p.id));
					let id = 1;
					while (occupied.has(id)) id++;
					peer = { id, lastSeen: now };
					this.peers.set(data.from, peer);
					this.players.push({
						id,
						name: `Pilot ${id + 1}`,
						color: ["#e8443a", "#3b82f6", "#22c55e", "#f5b700"][id],
					});
					this.players.sort((a, b) => a.id - b.id);
					this.broadcastRoster();
					this.status("Crew linked");
				}
				peer.lastSeen = now;
				if (data.type === "join") this.broadcastRoster(data.from);
			} else if (data.type === "input") {
				const peer = this.peers.get(data.from);
				if (!peer) return;
				peer.lastSeen = now;
				this.options.onInput?.(peer.id, this.cleanInput(data.input));
			} else if (data.type === "leave") {
				this.removePeer(data.from);
			}
			return;
		}
		if (this.role !== "client") return;
		if (data.type === "host" && !this.hostKey) this.localSend({ type: "join" });
		if (
			data.type === "welcome" &&
			(!this.hostKey || data.from === this.hostKey)
		) {
			const slot = data.slots?.find(([key]) => key === this.peerKey);
			if (!slot) return;
			this.hostKey = data.from;
			this.localId = slot[1];
			this.players = data.players;
			this.started = true;
			this.lastHostSeen = now;
			if (data.snapshot) this.options.onSnapshot?.(data.snapshot);
			this.status("Crew linked");
		} else if (data.from === this.hostKey && data.type === "world") {
			if (data.seq <= this.remoteSequence) return;
			this.remoteSequence = data.seq;
			this.lastHostSeen = now;
			this.lastSnapshot = data.snapshot;
			this.options.onSnapshot?.(data.snapshot);
		} else if (data.from === this.hostKey && data.type === "leave") {
			this.localId = null;
			this.started = false;
			this.options.onEnd?.({ reason: "host-left" });
			this.status("Host disconnected. Rejoin a new local mission.");
		} else if (data.type === "full" && this.localId === null) {
			this.status("This crew is full");
		}
	}

	removePeer(key) {
		const peer = this.peers.get(key);
		if (!peer) return;
		this.peers.delete(key);
		this.players = this.players.filter((p) => p.id !== peer.id);
		this.options.onInput?.(peer.id, this.neutralInput());
		this.options.onLeave?.(peer.id, "disconnected");
		this.broadcastRoster();
		this.status("Crew member disconnected");
	}

	update(input, snapshot, dt) {
		if (this.ended || !Number.isFinite(dt)) return;
		if (snapshot) {
			this.lastSnapshot = snapshot;
			const score = Number(snapshot.score);
			if (Number.isFinite(score)) this.lastScore = score;
			this.lastWon =
				snapshot.phase === "victory" ||
				snapshot.phase === "win" ||
				snapshot.won === true;
		}
		if (this.hub && !this.canPlay) return;
		this.sendClock += Math.max(0, dt);
		this.heartbeatClock += Math.max(0, dt);
		if (this.sendClock >= 0.1) {
			this.sendClock %= 0.1;
			if (this.hub) {
				const hub = globalThis.AIHub;
				if (this.role === "host" && snapshot) {
					hub.send({
						game: "cosmic-hitchhikers",
						type: "world",
						seq: ++this.sequence,
						snapshot,
					});
				} else if (this.role === "client" && !this.server) {
					hub.send(
						{
							game: "cosmic-hitchhikers",
							type: "input",
							input: this.cleanInput(input),
						},
						{ to: hub.host, reliable: false },
					);
				}
			} else if (this.channel) {
				if (this.role === "host" && snapshot)
					this.localSend({ type: "world", seq: ++this.sequence, snapshot });
				else if (this.role === "client" && this.localId !== null)
					this.localSend({ type: "input", input: this.cleanInput(input) });
			}
		}
		if (!this.hub && this.channel && this.heartbeatClock >= 1) {
			this.heartbeatClock %= 1;
			if (this.role === "host") {
				const now = performance.now();
				for (const [key, peer] of this.peers)
					if (now - peer.lastSeen > 5000) this.removePeer(key);
			} else {
				this.localSend({ type: this.localId === null ? "join" : "ping" });
				if (
					this.localId !== null &&
					performance.now() - this.lastHostSeen > 8000
				) {
					this.localId = null;
					this.started = false;
					this.hostKey = null;
					this.options.onEnd?.({ reason: "host-left" });
					this.status("Local host stopped responding");
				}
			}
		}
	}

	finish(score = 0, won = false) {
		if (!this.hub || this.role !== "host" || this.reported || this.ended)
			return;
		this.reported = true;
		const ids = this.players.map((p) => p.id);
		const points = Number.isFinite(Number(score)) ? Number(score) : 0;
		globalThis.AIHub.finish({
			standings: [ids],
			scores: Object.fromEntries(ids.map((id) => [id, points])),
			won: !!won,
		});
	}

	leave() {
		if (this.hub || this.leaving) return false;
		this.leaving = true;
		if (this.channel) {
			this.localSend({ type: "leave" });
			this.channel.close();
			this.channel = null;
		}
		for (const peer of this.peers.values())
			this.options.onInput?.(peer.id, this.neutralInput());
		this.peers.clear();
		this.role = "solo";
		this.room = "";
		this.localId = 0;
		this.server = false;
		this.players = [{ id: 0, name: "Pilot 1", color: "#e8443a" }];
		this.hostKey = null;
		this.started = false;
		this.ended = false;
		this.leaving = false;
		this.status("Solo flight");
		return true;
	}

	destroy() {
		this.leave();
		for (const unsubscribe of this.unsubscribers) unsubscribe();
		this.unsubscribers = [];
		globalThis.removeEventListener?.("pagehide", this.onUnload);
	}
}
