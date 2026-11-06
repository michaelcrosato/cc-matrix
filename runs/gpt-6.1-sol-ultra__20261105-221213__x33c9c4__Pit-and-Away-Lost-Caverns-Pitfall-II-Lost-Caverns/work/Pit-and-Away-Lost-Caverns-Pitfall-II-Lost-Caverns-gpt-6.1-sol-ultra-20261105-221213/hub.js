// AI Hub Session Protocol v1 plus standalone, host-authoritative two-player transport.
const encodeSignal = (data) => btoa(JSON.stringify(data));
const decodeSignal = (text) => JSON.parse(atob(text.trim()));
const safeInput = (value) => ({
	x: Math.max(-1, Math.min(1, Number(value?.x) || 0)),
	y: Math.max(-1, Math.min(1, Number(value?.y) || 0)),
	jump: !!value?.jump,
	action: !!value?.action,
});

export class ExpeditionNetwork {
	constructor(onInput = () => {}, onSnapshot = () => {}, onStatus = () => {}) {
		this.onInput = onInput;
		this.onSnapshot = onSnapshot;
		this.onStatus = onStatus;
		this.role = "solo";
		this.playerId = 0;
		this.players = [{ id: 0, name: "Pip", color: "#ffc35b" }];
		this.status = "Solo expedition";
		this.isServer = false;
		this.ended = false;
		this.started = false;
		this.hub = false;
		this.connected = false;
		this.stats = { sent: 0, received: 0, snapshots: 0, inputs: 0 };
		this._nextInput = 0;
		this._nextSnapshot = 0;
		this._lastMessage = 0;
		this._sequence = 0;
		this._receivedSequence = -1;
		this._unsub = [];
		this._score = 0;
		this._won = false;
		this._peerToken =
			typeof crypto?.randomUUID === "function"
				? crypto.randomUUID()
				: String(Math.random());
		this._timer = setInterval(() => this._heartbeat(), 1000);
	}

	async init() {
		if (!window.AIHub?.active) return null;
		const info = await AIHub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) return null;
		this.hub = true;
		this.info = info;
		this.playerId = info.me;
		this.players = [...info.players];
		this.role = info.isHost ? "host" : "guest";
		this.isServer = !!info.server;
		this.connected = true;
		this._setStatus("AI Hub · preparing expedition");
		this._unsub.push(
			AIHub.on("message", (data, from) => this._receive(data, from)),
		);
		this._unsub.push(
			AIHub.on("start", () => {
				this.started = true;
				this._setStatus("AI Hub · expedition underway");
			}),
		);
		this._unsub.push(
			AIHub.on("time-up", () => this.finish(this._score, this._won)),
		);
		this._unsub.push(
			AIHub.on("leave", ({ id }) => {
				this.players = this.players.filter((p) => p.id !== id);
				this.onInput(
					{ x: 0, y: 0, jump: false, action: false, left: true },
					id,
				);
				this._setStatus("AI Hub · expedition continues");
			}),
		);
		this._unsub.push(
			AIHub.on("end", ({ reason }) => {
				this.ended = true;
				this.connected = false;
				this._setStatus(
					`AI Hub · ${reason === "finished" ? "expedition complete" : "round ended"}`,
				);
			}),
		);
		return info;
	}

	get running() {
		return !this.ended && (!this.hub || (this.started && AIHub.time() >= 0));
	}
	ready() {
		if (this.hub && !this._ready) {
			this._ready = true;
			AIHub.ready();
		}
	}
	setScore(score, won = false) {
		this._score = Number(score) || 0;
		this._won = !!won;
	}

	finish(score = this._score, won = this._won) {
		this.setScore(score, won);
		if (!this.hub || this.role !== "host" || this._finished || this.ended)
			return;
		this._finished = true;
		const ids = this.players.map((p) => p.id);
		AIHub.finish({
			standings: [ids],
			scores: Object.fromEntries(ids.map((id) => [id, this._score])),
			won: this._won,
			stats: Object.fromEntries(
				ids.map((id) => [id, { "Team score": this._score }]),
			),
		});
	}

	_setStatus(status) {
		this.status = status;
		this.onStatus(status, this);
	}
	_send(data, reliable = false) {
		if (this.ended || !this.connected) return false;
		if (this.hub) {
			const options = { reliable };
			if (this.role === "guest") options.to = this.info.host;
			if (!AIHub.send(data, options)) return false;
		} else if (this.channel?.readyState === "open") {
			this.channel.send(JSON.stringify(data));
		} else if (this.broadcast) {
			this.broadcast.postMessage({
				...data,
				token: this._peerToken,
				from: this.playerId,
			});
		} else return false;
		this.stats.sent++;
		return true;
	}

	sendInput(input) {
		if (this.role !== "guest" || !this.running) return;
		const now = performance.now();
		// An edge is transmitted immediately; held directions are refreshed at 12.5 Hz.
		const clean = safeInput(input);
		const edge =
			(clean.jump && !this._oldInput?.jump) ||
			(clean.action && !this._oldInput?.action);
		if (now < this._nextInput && !edge) return;
		this._nextInput = now + 80;
		this._oldInput = clean;
		this._send({ type: "input", input: clean, seq: ++this._sequence });
	}

	sendSnapshot(world, force = false) {
		if (this.role !== "host" || !this.running || this.ended) return;
		const now = performance.now();
		if (!force && now < this._nextSnapshot) return;
		this._nextSnapshot = now + 80;
		// JSON snapshots travel reliably; the game's compact world stays below 16 KB.
		this._send({ type: "world", world, seq: ++this._sequence }, true);
	}

	_receive(data, from) {
		if (this.ended || !data || typeof data !== "object") return;
		this._lastMessage = performance.now();
		this.stats.received++;
		if (
			data.type === "input" &&
			this.role === "host" &&
			this.players.some((p) => p.id === from)
		) {
			this.stats.inputs++;
			this.onInput(safeInput(data.input), from);
		}
		if (
			data.type === "world" &&
			this.role === "guest" &&
			(!this.hub || from === this.info.host)
		) {
			if (!Number.isFinite(data.seq) || data.seq <= this._receivedSequence)
				return;
			this._receivedSequence = data.seq;
			this.stats.snapshots++;
			this.onSnapshot(data.world);
		}
		if (data.type === "ping") this._send({ type: "pong" });
	}

	_heartbeat() {
		if (this.ended || this.hub || !this.connected) return;
		if (this.broadcast && this.role === "guest" && !this._paired)
			this._send({ type: "join" });
		else if (this._paired) this._send({ type: "ping" });
		if (
			this._paired &&
			this._lastMessage &&
			performance.now() - this._lastMessage > 8000
		) {
			this._setStatus("Companion connection interrupted");
		}
	}

	_closeTransport() {
		this.broadcast?.close();
		this.broadcast = null;
		this.channel?.close();
		this.channel = null;
		this.peer?.close();
		this.peer = null;
		this._paired = false;
		this._remoteToken = null;
		this.connected = false;
		this._receivedSequence = -1;
	}

	hostLocal(room = "CAVERN") {
		if (this.hub) return false;
		this._openLocal(room, "host");
		return this.room;
	}
	joinLocal(room = "CAVERN") {
		if (this.hub) return false;
		this._openLocal(room, "guest");
		this._send({ type: "join" });
		return this.room;
	}
	_openLocal(room, role) {
		this._closeTransport();
		this.room =
			String(room)
				.toUpperCase()
				.replace(/[^A-Z0-9-]/g, "")
				.slice(0, 24) || "CAVERN";
		this.role = role;
		this.playerId = role === "host" ? 0 : 1;
		this.players = [
			{ id: 0, name: "Pip", color: "#ffc35b" },
			{ id: 1, name: "Rue", color: "#73e7d2" },
		];
		this.broadcast = new BroadcastChannel(`pit-away-v1-${this.room}`);
		this.connected = true;
		this.broadcast.onmessage = ({ data }) => {
			if (
				!data ||
				data.token === this._peerToken ||
				data.from === this.playerId
			)
				return;
			if (this._remoteToken && data.token !== this._remoteToken) return;
			if (data.type === "join" && this.role === "host") {
				this._remoteToken = data.token;
				this._paired = true;
				this._setStatus(`Two explorers · room ${this.room}`);
				this._send({ type: "welcome" });
			}
			if (data.type === "welcome" && this.role === "guest") {
				this._remoteToken = data.token;
				this._paired = true;
				this._setStatus(`Two explorers · room ${this.room}`);
			}
			this._receive(data, data.from);
		};
		this._setStatus(
			`${role === "host" ? "Hosting" : "Joining"} room ${this.room} · same browser`,
		);
	}

	async _makePeer(role) {
		if (this.hub) throw new Error("AI Hub supplies the session network.");
		if (!window.RTCPeerConnection)
			throw new Error("This browser does not support peer connections.");
		this._closeTransport();
		this.role = role;
		this.playerId = role === "host" ? 0 : 1;
		this.players = [
			{ id: 0, name: "Pip", color: "#ffc35b" },
			{ id: 1, name: "Rue", color: "#73e7d2" },
		];
		const peer = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.peer = peer;
		peer.onconnectionstatechange = () => {
			if (this.peer !== peer) return;
			if (["disconnected", "failed", "closed"].includes(peer.connectionState)) {
				this.connected = false;
				this._setStatus("Companion disconnected · reconnect from the menu");
			}
		};
		const wire = (channel) => {
			this.channel = channel;
			channel.onopen = () => {
				if (this.channel !== channel) return;
				this.connected = true;
				this._paired = true;
				this._lastMessage = performance.now();
				this._setStatus("Two explorers · direct peer connection");
			};
			channel.onmessage = (event) => {
				if (this.channel !== channel) return;
				try {
					this._receive(JSON.parse(event.data), this.role === "host" ? 1 : 0);
				} catch {
					/* Invalid remote packets are ignored. */
				}
			};
			channel.onclose = () => {
				if (this.channel !== channel) return;
				this.connected = false;
				this._setStatus("Companion disconnected");
			};
		};
		if (role === "host")
			wire(this.peer.createDataChannel("expedition", { ordered: true }));
		else this.peer.ondatachannel = (event) => wire(event.channel);
		return this.peer;
	}

	async _gather() {
		if (this.peer.iceGatheringState !== "complete")
			await new Promise((resolve) => {
				const peer = this.peer;
				const done = () => {
					if (peer.iceGatheringState === "complete") {
						peer.removeEventListener("icegatheringstatechange", done);
						clearTimeout(timer);
						resolve();
					}
				};
				const timer = setTimeout(() => {
					peer.removeEventListener("icegatheringstatechange", done);
					resolve();
				}, 5000);
				peer.addEventListener("icegatheringstatechange", done);
				done();
			});
		return encodeSignal(this.peer.localDescription.toJSON());
	}
	async createOffer() {
		const peer = await this._makePeer("host");
		await peer.setLocalDescription(await peer.createOffer());
		this._setStatus("Send your invitation to your companion");
		return this._gather();
	}
	async answerOffer(code) {
		const signal = decodeSignal(code);
		if (signal.type !== "offer")
			throw new Error("Paste the host invitation first.");
		const peer = await this._makePeer("guest");
		await peer.setRemoteDescription(signal);
		await peer.setLocalDescription(await peer.createAnswer());
		this._setStatus("Send this reply back to the host");
		return this._gather();
	}
	async acceptAnswer(code) {
		const signal = decodeSignal(code);
		if (signal.type !== "answer" || !this.peer)
			throw new Error(
				"Create an invitation, then paste your companion’s reply.",
			);
		await this.peer.setRemoteDescription(signal);
		this._setStatus("Connecting to your companion…");
	}
	solo() {
		if (this.hub) return;
		this._closeTransport();
		this.role = "solo";
		this.playerId = 0;
		this.players = [{ id: 0, name: "Pip", color: "#ffc35b" }];
		this._remoteToken = null;
		this._setStatus("Solo expedition");
	}
	dispose() {
		clearInterval(this._timer);
		this._closeTransport();
		for (const off of this._unsub) off();
		this.ended = true;
	}
}
