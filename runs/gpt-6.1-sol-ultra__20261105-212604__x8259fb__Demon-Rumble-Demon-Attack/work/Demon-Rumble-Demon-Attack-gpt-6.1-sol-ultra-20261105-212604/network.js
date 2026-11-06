/* Demon Rumble networking. AI Hub Session Protocol v1; standalone direct WebRTC. */
const NETWORK_RATE = 1 / 12;
const PACKET_LIMIT = 16000;
const empty = () => {};
const byteLength = (text) => new TextEncoder().encode(text).length;

export class NetworkDirector {
	constructor(callbacks = {}) {
		this.callbacks = {
			onStart: empty,
			onSnapshot: empty,
			onRemoteInput: empty,
			onEnd: empty,
			onTimeUp: empty,
			onLeave: empty,
			...callbacks,
		};
		this._transport = "none";
		this._status = "offline";
		this._info = null;
		this._ended = false;
		this._started = false;
		this._pendingStart = false;
		this._reported = false;
		this._ready = false;
		this._accumulator = 0;
		this._sendSequence = 0;
		this._receiveSequences = new Map();
		this._removed = new Set();
		this._unsubscribers = [];
		this._startTimer = null;
		this._peer = null;
		this._channel = null;
		this._lastSnapshot = null;
		this._sent = 0;
		this._received = 0;
		this._rejected = 0;
		this._lastError = "";
	}

	get active() {
		return (
			this._transport === "hub" || (this._transport === "peer" && this._started)
		);
	}
	get hub() {
		return this._transport === "hub";
	}
	get isHost() {
		return this._info ? this._info.isHost === true : true;
	}
	get localSeat() {
		return this.server ? -1 : (this._info?.me ?? 0);
	}
	get playerCount() {
		return (
			this._info?.players?.filter((p) => !this._removed.has(p.id)).length ?? 1
		);
	}
	get players() {
		return (
			this._info?.players?.filter((p) => !this._removed.has(p.id)) ?? [
				{ id: 0, name: "Pilot 1", color: "#5de0e7" },
			]
		);
	}
	get server() {
		return this._info?.server === true;
	}
	get info() {
		return this._info;
	}
	get status() {
		return this._status;
	}
	get mode() {
		return this.active ? "shared-world" : "offline";
	}
	get ended() {
		return this._ended;
	}

	async initHub() {
		const hub = globalThis.AIHub;
		if (!hub?.active) return null;
		this._transport = "hub";
		this._status = "joining";
		const info = await hub.connect({ mode: "shared-world", seats: [1, 4] });
		if (!info) {
			this._transport = "none";
			this._status = "offline";
			return null;
		}
		this._info = { ...info, source: "hub" };
		this._status = "waiting";
		this._unsubscribers.push(
			hub.on("start", () => {
				if (this._ended) return;
				this._pendingStart = true;
				this._status = "countdown";
				this._tryHubStart();
			}),
			hub.on("message", (data, from) => this._receive(data, from)),
			hub.on("leave", ({ id, reason }) => {
				this._removed.add(id);
				this.callbacks.onLeave(id, reason);
			}),
			hub.on("time-up", () => {
				if (!this._ended && !this._reported) this.callbacks.onTimeUp();
			}),
			hub.on("end", ({ reason, standings }) => this.end(reason, { standings })),
		);
		return this._info;
	}

	hubReady() {
		if (!this.hub || this._ready || this._ended) return;
		this._ready = true;
		globalThis.AIHub.ready();
	}

	_tryHubStart() {
		if (!this.hub || !this._pendingStart || this._ended || this._started)
			return;
		const left = globalThis.AIHub.time();
		if (left >= 0) {
			this._pendingStart = false;
			this._started = true;
			this._status = "playing";
			if (this._startTimer !== null) clearTimeout(this._startTimer);
			this._startTimer = null;
			this.callbacks.onStart(this._info);
			return;
		}
		if (this._startTimer !== null) clearTimeout(this._startTimer);
		this._startTimer = setTimeout(
			() => {
				this._startTimer = null;
				this._tryHubStart();
			},
			Number.isFinite(left) ? Math.min(100, Math.max(1, -left + 1)) : 100,
		);
	}

	update(dt, snapshot, localInput) {
		if (this.hub && this._pendingStart) this._tryHubStart();
		if (!this.active || this._ended || this._reported || !this._started) return;
		this._accumulator += Math.min(Math.max(Number(dt) || 0, 0), 1);
		if (this._accumulator < NETWORK_RATE) return;
		this._accumulator %= NETWORK_RATE;
		if (this.isHost) {
			if (snapshot == null) return;
			this._lastSnapshot = snapshot;
			this._send({ kind: "world", value: snapshot });
		} else {
			this._send(
				{ kind: "input", value: localInput ?? {} },
				this.hub ? this._info.host : undefined,
			);
		}
	}

	_send(payload, to) {
		if (!this.active || this._ended) return false;
		const packet = { dr: 1, seq: ++this._sendSequence, ...payload };
		let text;
		try {
			text = JSON.stringify(packet);
		} catch {
			this._rejected++;
			return false;
		}
		if (byteLength(text) > PACKET_LIMIT) {
			this._rejected++;
			this._lastError =
				"Network snapshot exceeds 16 KB. Reduce the number of serialized objects.";
			return false;
		}
		if (this.hub) {
			const sent = globalThis.AIHub.send(packet, {
				reliable: true,
				...(to == null ? {} : { to }),
			});
			if (sent) this._sent++;
			return sent;
		}
		if (this._channel?.readyState !== "open") return false;
		// Let WebRTC drain its reliable queue before adding another obsolete world.
		if (payload.kind === "world" && this._channel.bufferedAmount > 256000)
			return false;
		try {
			this._channel.send(text);
			this._sent++;
			return true;
		} catch (error) {
			this._lastError = error.message;
			return false;
		}
	}

	_receive(data, from) {
		if (this._ended || !data || data.dr !== 1 || !Number.isFinite(data.seq))
			return;
		if (
			this.hub &&
			!this.players.some((p) => p.id === from) &&
			from !== this._info.host
		)
			return;
		const previous = this._receiveSequences.get(from) ?? -1;
		if (data.seq <= previous) return;
		this._receiveSequences.set(from, data.seq);
		this._received++;
		if (data.kind === "world" && !this.isHost && from === this._info.host) {
			this.callbacks.onSnapshot(data.value);
		} else if (
			data.kind === "input" &&
			this.isHost &&
			from !== this._info.host &&
			data.value &&
			typeof data.value === "object"
		) {
			this.callbacks.onRemoteInput(data.value, from);
		} else if (
			data.kind === "finish" &&
			!this.isHost &&
			from === this._info.host &&
			!this.hub
		) {
			this.end("finished", { score: data.score, won: data.won });
		}
	}

	finish(score, won = false) {
		if (!this.active || !this.isHost || this._reported || this._ended) return;
		const safeScore = Number.isFinite(Number(score)) ? Number(score) : 0;
		if (this.hub) {
			const ids = this.players.map((p) => p.id);
			globalThis.AIHub.finish({
				standings: [ids],
				scores: Object.fromEntries(ids.map((id) => [id, safeScore])),
				won: Boolean(won),
				stats: Object.fromEntries(
					ids.map((id) => [id, { "Team score": safeScore }]),
				),
			});
		} else {
			if (this._lastSnapshot != null)
				this._send({ kind: "world", value: this._lastSnapshot });
			this._send({ kind: "finish", score: safeScore, won: Boolean(won) });
		}
		this._reported = true;
		this._status = "finished";
	}

	end(reason = "ended", details) {
		if (this._ended) return;
		this._ended = true;
		this._pendingStart = false;
		this._status = "ended";
		if (this._startTimer !== null) clearTimeout(this._startTimer);
		this._startTimer = null;
		this.callbacks.onEnd(reason, details);
	}

	_assertStandalone() {
		if (globalThis.AIHub?.active || this.hub)
			throw new Error("AI Hub manages all connections during a session.");
		if (!globalThis.RTCPeerConnection)
			throw new Error(
				"Direct online play needs WebRTC in a secure browser page.",
			);
	}

	_newPeer(isHost) {
		this._assertStandalone();
		this.disconnect();
		this._transport = "peer";
		this._status = isHost ? "creating-offer" : "creating-answer";
		this._ended = false;
		this._reported = false;
		this._started = false;
		this._accumulator = 0;
		this._sendSequence = 0;
		this._receiveSequences.clear();
		this._removed.clear();
		this._info = {
			source: "peer",
			mode: "shared-world",
			me: isHost ? 0 : 1,
			host: 0,
			isHost,
			server: false,
			players: [
				{ id: 0, name: "Pilot 1", color: "#5de0e7" },
				{ id: 1, name: "Pilot 2", color: "#ffb64f" },
			],
		};
		const peer = new RTCPeerConnection({
			iceServers: [
				{ urls: "stun:stun.l.google.com:19302" },
				{ urls: "stun:stun.cloudflare.com:3478" },
			],
			iceCandidatePoolSize: 0,
		});
		this._peer = peer;
		peer.ondatachannel = ({ channel }) => this._attachChannel(channel);
		peer.onconnectionstatechange = () => {
			if (peer !== this._peer) return;
			if (peer.connectionState === "failed") {
				this._lastError =
					"Connection failed. Check that both codes were exchanged completely; strict NAT may require AI Hub instead.";
				this._status = "failed";
				this.end("connection-failed");
			} else if (peer.connectionState === "disconnected") {
				this._status = "reconnecting";
			} else if (
				peer.connectionState === "connected" &&
				this._channel?.readyState === "open"
			) {
				this._status = "connected";
			}
		};
		return peer;
	}

	_attachChannel(channel) {
		this._channel = channel;
		channel.onopen = () => {
			if (channel !== this._channel || this._ended) return;
			this._status = "connected";
			this._started = true;
			this.callbacks.onStart(this._info);
		};
		channel.onmessage = ({ data }) => {
			if (typeof data !== "string" || data.length > PACKET_LIMIT) return;
			try {
				this._receive(JSON.parse(data), this.isHost ? 1 : 0);
			} catch {
				this._rejected++;
			}
		};
		channel.onclose = () => {
			if (channel !== this._channel || this._ended) return;
			this.callbacks.onLeave(this.isHost ? 1 : 0, "disconnected");
			this.end("disconnected");
		};
		channel.onerror = () => {
			this._lastError =
				"The direct connection encountered a data-channel error.";
		};
	}

	async _gather(peer) {
		if (peer.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			let timeout;
			const finished = () => {
				if (peer.iceGatheringState !== "complete") return;
				cleanup();
				resolve();
			};
			const cleanup = () => {
				clearTimeout(timeout);
				peer.removeEventListener("icegatheringstatechange", finished);
			};
			peer.addEventListener("icegatheringstatechange", finished);
			// LAN candidates are generally available immediately; allow slow STUN a few seconds.
			timeout = setTimeout(() => {
				cleanup();
				resolve();
			}, 8000);
			finished();
		});
	}

	_encodeDescription(description) {
		const object = {
			game: "demon-rumble",
			version: 1,
			type: description.type,
			sdp: description.sdp,
		};
		const bytes = new TextEncoder().encode(JSON.stringify(object));
		let binary = "";
		for (const byte of bytes) binary += String.fromCharCode(byte);
		return "DR1:" + btoa(binary);
	}

	_decodeDescription(code, type) {
		try {
			const cleaned = String(code).trim().replace(/\s+/g, "");
			if (!cleaned.startsWith("DR1:") || cleaned.length > 100000)
				throw new Error("prefix");
			const raw = atob(cleaned.slice(4));
			const object = JSON.parse(
				new TextDecoder().decode(Uint8Array.from(raw, (c) => c.charCodeAt(0))),
			);
			if (
				object.game !== "demon-rumble" ||
				object.version !== 1 ||
				object.type !== type ||
				typeof object.sdp !== "string"
			)
				throw new Error("type");
			return { type: object.type, sdp: object.sdp };
		} catch {
			throw new Error(
				`Paste the complete Demon Rumble ${type === "offer" ? "invite" : "reply"} code, beginning DR1:.`,
			);
		}
	}

	async createOffer() {
		const peer = this._newPeer(true);
		this._attachChannel(
			peer.createDataChannel("demon-rumble", { ordered: true }),
		);
		await peer.setLocalDescription(await peer.createOffer());
		await this._gather(peer);
		if (peer !== this._peer) throw new Error("The connection was cancelled.");
		this._status = "waiting-for-reply";
		return this._encodeDescription(peer.localDescription);
	}

	async acceptOffer(code) {
		this._assertStandalone();
		const description = this._decodeDescription(code, "offer");
		const peer = this._newPeer(false);
		await peer.setRemoteDescription(description);
		await peer.setLocalDescription(await peer.createAnswer());
		await this._gather(peer);
		if (peer !== this._peer) throw new Error("The connection was cancelled.");
		this._status = "waiting-for-host";
		return this._encodeDescription(peer.localDescription);
	}

	async acceptAnswer(code) {
		this._assertStandalone();
		if (!this._peer || !this.isHost)
			throw new Error("Create an invite on this device first.");
		const description = this._decodeDescription(code, "answer");
		this._status = "connecting";
		await this._peer.setRemoteDescription(description);
	}

	disconnect() {
		if (this.hub) return;
		const channel = this._channel;
		const peer = this._peer;
		this._channel = null;
		this._peer = null;
		if (channel) {
			channel.onclose = null;
			channel.close();
		}
		if (peer) {
			peer.onconnectionstatechange = null;
			peer.close();
		}
		this._transport = "none";
		this._status = "offline";
		this._info = null;
		this._started = false;
		this._ended = false;
		this._reported = false;
		this._receiveSequences.clear();
		this._removed.clear();
	}

	diagnostics() {
		return {
			transport: this._transport,
			status: this._status,
			active: this.active,
			isHost: this.isHost,
			localSeat: this.localSeat,
			players: this.playerCount,
			server: this.server,
			started: this._started,
			ended: this._ended,
			sent: this._sent,
			received: this._received,
			rejected: this._rejected,
			lastError: this._lastError,
			peerState: this._peer?.connectionState ?? null,
			iceState: this._peer?.iceConnectionState ?? null,
			channelState: this._channel?.readyState ?? null,
		};
	}
}
