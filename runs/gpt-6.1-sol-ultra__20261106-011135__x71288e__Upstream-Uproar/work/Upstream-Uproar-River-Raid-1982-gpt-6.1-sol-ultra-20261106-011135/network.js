// AI Hub Session Protocol v1 ghost racing + same-browser room transport.
// Session client is deliberately kept separate and unmodified in hub-session.js.
const finite = (value, lo, hi, fallback = 0) =>
	Number.isFinite(value) ? Math.max(lo, Math.min(hi, value)) : fallback;
const cleanPlayer = (player = {}) => ({
	x: finite(player.x, -1000, 1000),
	y: finite(player.y, -100000, 100000),
	progress: finite(player.progress, 0, 1000000),
	bank: finite(player.bank, -Math.PI, Math.PI),
	fire: !!player.fire,
	sector: Math.floor(finite(player.sector, 0, 100)),
});

export class NetworkSession {
	constructor() {
		this.active = !!globalThis.AIHub?.active;
		this.info = null;
		this.peers = new Map();
		this.room = "";
		this.started = false;
		this.ended = false;
		this.reported = false;
		this.sendClock = 0;
		this.progressClock = 0;
		this.score = 0;
		this.label = "";
		this.callbacks = {};
		this.channel = null;
		this.localId =
			globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
		this.localName = "Pilot";
		this.lastPlayer = cleanPlayer();
		this.handlers = [];
		this.sent = 0;
		this.received = 0;
	}

	async init(callbacks = {}) {
		this.callbacks = callbacks;
		if (!this.active) return null;
		const hub = globalThis.AIHub;
		this.handlers.push(
			hub.on("start", (event) => {
				this.started = true;
				this.reported = false;
				this.ended = false;
				this.sendClock = 0.1;
				this.progressClock = 1;
				this.callbacks.onStart?.(event);
			}),
		);
		this.handlers.push(
			hub.on("message", (data, from) => {
				if (
					this.ended ||
					data?.kind !== "upstream-ghost" ||
					!data.player ||
					from === this.info?.me
				)
					return;
				const identity = this.info?.players?.find((p) => p.id === from);
				if (!identity) return;
				this.acceptGhost(
					from,
					data.player,
					data.score,
					identity.name,
					identity.color,
				);
			}),
		);
		this.handlers.push(
			hub.on("leave", (event) => {
				this.peers.delete(event.id);
				this.callbacks.onLeave?.(event);
			}),
		);
		this.handlers.push(
			hub.on("time-up", (event) => {
				if (this.ended) return;
				this.callbacks.onTimeUp?.(event);
				// Always meet the result deadline, including if the caller only changes its UI.
				if (!this.reported) this.result(this.score);
			}),
		);
		this.handlers.push(
			hub.on("end", (event) => {
				this.ended = true;
				this.started = false;
				this.callbacks.onEnd?.(event);
			}),
		);
		this.info = await hub.connect({ mode: "ghost", seats: [1, 4] });
		if (!this.info) {
			this.active = false;
			for (const off of this.handlers) off?.();
			this.handlers.length = 0;
			return null;
		}
		return this.info;
	}

	ready() {
		if (this.active && this.info && !this.didReady) {
			this.didReady = true;
			globalThis.AIHub.ready();
		}
	}

	acceptGhost(id, player, score, name, color) {
		const ghost = {
			id,
			...cleanPlayer(player),
			score: Math.floor(finite(score, 0, 1000000000)),
			name: String(name || "Pilot").slice(0, 24),
			color: /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#b7a2ff",
			seenAt: performance.now(),
		};
		this.peers.set(id, ghost);
		this.received++;
		this.callbacks.onGhost?.(ghost, id);
	}

	update(dt, player, score = 0, label = "") {
		if (this.ended) return;
		this.score = Math.floor(finite(score, 0, 1000000000));
		this.label = String(label).slice(0, 80);
		this.lastPlayer = cleanPlayer(player);
		this.sendClock += finite(dt, 0, 1);
		this.progressClock += finite(dt, 0, 1);
		if (this.active) {
			const hub = globalThis.AIHub;
			if (!this.started || hub.time() < 0 || this.reported) return;
			if (this.sendClock >= 0.1) {
				this.sendClock %= 0.1;
				if (
					hub.send(
						{
							kind: "upstream-ghost",
							player: this.lastPlayer,
							score: this.score,
						},
						{ reliable: false },
					)
				)
					this.sent++;
			}
			if (this.progressClock >= 1) {
				this.progressClock %= 1;
				hub.progress({ score: this.score, label: this.label });
			}
			return;
		}
		if (this.channel && this.sendClock >= 0.1) {
			this.sendClock %= 0.1;
			this.broadcast("state");
			const now = performance.now();
			for (const [id, peer] of this.peers) {
				if (now - peer.seenAt > 6000) {
					this.peers.delete(id);
					this.callbacks.onLeave?.({ id, reason: "disconnected" });
				}
			}
		}
	}

	result(score = this.score, stats = {}) {
		if (this.reported || this.ended) return;
		this.reported = true;
		this.score = Math.floor(finite(score, 0, 1000000000));
		if (this.active) globalThis.AIHub.result({ score: this.score, stats });
		else if (this.channel) this.broadcast("result");
	}

	joinRoom(code, name = "Pilot") {
		if (this.active) return false;
		if (!globalThis.BroadcastChannel) return false;
		this.leaveRoom();
		this.room =
			String(code || "RIVER")
				.toUpperCase()
				.replace(/[^A-Z0-9-]/g, "")
				.slice(0, 16) || "RIVER";
		this.localName =
			String(name || "Pilot")
				.trim()
				.slice(0, 24) || "Pilot";
		this.reported = false;
		this.ended = false;
		this.channel = new BroadcastChannel(`upstream-uproar-room-${this.room}`);
		this.channel.onmessage = ({ data }) => {
			if (!data || data.id === this.localId || typeof data.id !== "string")
				return;
			if (data.kind === "leave") {
				this.peers.delete(data.id);
				this.callbacks.onLeave?.({ id: data.id, reason: "left" });
				return;
			}
			if (!["hello", "state", "result"].includes(data.kind) || !data.player)
				return;
			this.acceptGhost(data.id, data.player, data.score, data.name, "#b7a2ff");
			if (data.kind === "hello") this.broadcast("state");
		};
		this.broadcast("hello");
		return true;
	}

	broadcast(kind) {
		if (!this.channel || this.active) return;
		this.channel.postMessage({
			kind,
			id: this.localId,
			name: this.localName,
			player: this.lastPlayer,
			score: this.score,
		});
		this.sent++;
	}

	leaveRoom() {
		if (this.channel) {
			this.broadcast("leave");
			this.channel.close();
		}
		this.channel = null;
		this.room = "";
		this.peers.clear();
	}

	dispose() {
		this.leaveRoom();
		for (const off of this.handlers) off?.();
		this.handlers.length = 0;
		this.ended = true;
	}

	diagnostics() {
		return {
			active: this.active,
			room: this.room,
			started: this.started,
			ended: this.ended,
			reported: this.reported,
			sent: this.sent,
			received: this.received,
			peers: this.peers.size,
		};
	}
}
