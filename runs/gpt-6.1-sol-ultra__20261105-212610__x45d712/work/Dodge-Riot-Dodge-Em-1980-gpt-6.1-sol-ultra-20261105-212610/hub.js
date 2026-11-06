/** Dodge Riot networking: AI Hub Protocol v1 plus standalone direct peer co-op.
 * The official, unmodified session client is embedded separately in <head>.
 * All game networking uses the Hub while a Hub session is active.
 */
export class HubLink {
	constructor(callbacks = {}) {
		this.callbacks = callbacks;
		this.hubActive = !!globalThis.AIHub?.active;
		this.mode = this.hubActive ? "hub" : "offline";
		this.connected = false;
		this.isHost = true;
		this.server = false;
		this.me = 0;
		this.host = 0;
		this.players = [{ id: 0, name: "Driver 1", color: "#ffcf50" }];
		this.ended = false;
		this.started = false;
		this.peer = null;
		this.channel = null;
		this._off = [];
		this._lastInput = -Infinity;
		this._lastSnapshot = -Infinity;
		this._inputSequence = 0;
		this._snapshotSequence = 0;
		this._seenInput = new Map();
		this._seenSnapshot = -1;
		this._goAt = null;
		this.stats = {
			inputsSent: 0,
			inputsReceived: 0,
			snapshotsSent: 0,
			snapshotsReceived: 0,
		};
	}
	get active() {
		return this.mode !== "offline";
	}
	_emit(name, ...args) {
		this.callbacks[name]?.(...args);
	}
	_status(message) {
		this._emit("onStatus", message);
	}
	async connect() {
		const hub = globalThis.AIHub;
		if (!hub || !hub.active) return null;
		this._off.push(
			hub.on("start", (event) => {
				this.started = true;
				this._emit("onStart", { ...this.info(), in: event.in });
			}),
			hub.on("message", (data, from) => this._receive(data, from)),
			hub.on("leave", ({ id }) => {
				this.players = hub.players.slice();
				this._seenInput.delete(id);
				this._emit("onLeave", id);
			}),
			hub.on("time-up", (event) => this._emit("onTimeUp", event)),
			hub.on("end", (event) => {
				this.ended = true;
				this.started = false;
				this._emit("onEnd", event.reason, event);
			}),
		);
		const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) {
			this.hubActive = false;
			this.mode = "offline";
			this._status("Solo / couch play");
			return null;
		}
		this.mode = "hub";
		this.connected = true;
		this.me = info.me;
		this.host = info.host;
		this.isHost = info.isHost;
		this.server = !!info.server;
		this.players = info.players.slice();
		this._status(
			this.server ? "AI Hub simulation host" : `AI Hub · driver ${this.me + 1}`,
		);
		return info;
	}
	info() {
		return {
			mode: this.mode,
			me: this.me,
			host: this.host,
			isHost: this.isHost,
			server: this.server,
			players: this.players.slice(),
			in: 3000,
		};
	}
	ready() {
		if (this.hubActive && this.connected && !this.ended)
			globalThis.AIHub.ready();
	}
	time() {
		if (this.hubActive) return globalThis.AIHub.time();
		return this._goAt === null ? -Infinity : performance.now() - this._goAt;
	}
	_send(packet, to) {
		if (!this.connected || this.ended) return false;
		try {
			const text = JSON.stringify(packet);
			if (text.length > 16000) return false;
			if (this.hubActive)
				return globalThis.AIHub.send(packet, { to, reliable: true });
			if (
				this.channel?.readyState !== "open" ||
				this.channel.bufferedAmount > 128000
			)
				return false;
			this.channel.send(text);
			return true;
		} catch (_) {
			return false;
		}
	}
	sendInput(input) {
		if (!this.active || this.isHost || !this.started || this.ended)
			return false;
		const now = performance.now();
		if (now - this._lastInput < 1000 / 15) return false;
		if (
			!this._send(
				{ riot: 1, type: "input", seq: ++this._inputSequence, input },
				this.host,
			)
		)
			return false;
		this._lastInput = now;
		this.stats.inputsSent++;
		return true;
	}
	sendSnapshot(snapshot) {
		if (!this.active || !this.isHost || !this.started || this.ended)
			return false;
		const now = performance.now();
		if (now - this._lastSnapshot < 1000 / 15) return false;
		if (
			!this._send({
				riot: 1,
				type: "snapshot",
				seq: ++this._snapshotSequence,
				snapshot,
			})
		)
			return false;
		this._lastSnapshot = now;
		this.stats.snapshotsSent++;
		return true;
	}
	_receive(packet, from) {
		if (!packet || packet.riot !== 1 || this.ended) return;
		if (packet.type === "input" && this.isHost) {
			if (
				!this.players.some((player) => player.id === from) ||
				from === this.me
			)
				return;
			if (
				!Number.isSafeInteger(packet.seq) ||
				packet.seq <= (this._seenInput.get(from) ?? -1)
			)
				return;
			const raw = packet.input;
			if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
			const input = {
				lane: Number.isFinite(raw.lane) ? Math.sign(raw.lane) : 0,
				laneSeq:
					Number.isSafeInteger(raw.laneSeq) && raw.laneSeq >= 0
						? raw.laneSeq
						: 0,
				boost: raw.boost === true,
				brake: raw.brake === true,
				assist: raw.assist === true,
			};
			this._seenInput.set(from, packet.seq);
			this.stats.inputsReceived++;
			this._emit("onInput", input, from);
		} else if (
			packet.type === "snapshot" &&
			!this.isHost &&
			from === this.host
		) {
			if (!Number.isSafeInteger(packet.seq) || packet.seq <= this._seenSnapshot)
				return;
			if (!packet.snapshot || typeof packet.snapshot !== "object") return;
			this._seenSnapshot = packet.seq;
			this.stats.snapshotsReceived++;
			this._emit("onSnapshot", packet.snapshot);
		} else if (
			!this.hubActive &&
			packet.type === "start" &&
			!this.isHost &&
			!this.started
		) {
			this.started = true;
			this._goAt = performance.now() + 3000;
			this._emit("onStart", { ...this.info(), in: 3000 });
		} else if (
			!this.hubActive &&
			packet.type === "end" &&
			!this.isHost &&
			from === this.host
		) {
			this.ended = true;
			this.started = false;
			this._emit("onEnd", "finished", packet.outcome);
		}
	}
	finish(outcome = {}) {
		if (
			!this.active ||
			!this.isHost ||
			!this.connected ||
			this.ended ||
			this._finished
		)
			return false;
		this._finished = true;
		// Deliver the terminal world before the result closes routing. This one
		// reliable packet bypasses the regular snapshot cadence.
		if (
			outcome.snapshot &&
			this._send({
				riot: 1,
				type: "snapshot",
				seq: ++this._snapshotSequence,
				snapshot: outcome.snapshot,
			})
		) {
			this._lastSnapshot = performance.now();
			this.stats.snapshotsSent++;
		}
		const ids = this.players.map((player) => player.id);
		const score = Number.isFinite(outcome.score) ? outcome.score : 0;
		const result = {
			standings: [ids],
			scores: Object.fromEntries(ids.map((id) => [id, score])),
			won: !!outcome.won,
			stats: Object.fromEntries(ids.map((id) => [id, outcome.stats || {}])),
		};
		if (this.hubActive) globalThis.AIHub.finish(result);
		else {
			this._send({ riot: 1, type: "end", outcome: { ...result, ...outcome } });
			this.ended = true;
			this.started = false;
			this._emit("onEnd", "finished", { ...result, ...outcome });
		}
		return true;
	}
	fail(message) {
		if (this.hubActive) globalThis.AIHub.fail(message);
		else this._status(String(message));
	}
	async _newPeer(host) {
		if (this.hubActive || globalThis.AIHub?.active)
			throw new Error("AI Hub manages this connection.");
		if (!globalThis.RTCPeerConnection)
			throw new Error("Direct co-op needs a browser with WebRTC.");
		this.disconnect();
		this.mode = "direct";
		this.isHost = host;
		this.me = host ? 0 : 1;
		this.host = 0;
		this.players = [
			{ id: 0, name: "Driver 1", color: "#ffcf50" },
			{ id: 1, name: "Driver 2", color: "#4ce3cc" },
		];
		this.peer = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.peer.onconnectionstatechange = () => {
			const state = this.peer?.connectionState;
			if (state === "failed")
				this._status(
					"Connection failed. Make fresh connection codes and try again.",
				);
			if (state === "disconnected" || state === "failed") {
				this.connected = false;
				if (this.started && !this.ended) {
					this.ended = true;
					this._emit("onLeave", host ? 1 : 0);
					this._emit("onEnd", "peer-disconnected");
				}
			}
		};
		this.peer.ondatachannel = (event) => this._attachChannel(event.channel);
		if (host)
			this._attachChannel(
				this.peer.createDataChannel("dodge-riot", { ordered: true }),
			);
		return this.peer;
	}
	_attachChannel(channel) {
		this.channel = channel;
		channel.onmessage = (event) => {
			try {
				this._receive(JSON.parse(event.data), this.isHost ? 1 : 0);
			} catch (_) {
				/* Ignore malformed peer packets. */
			}
		};
		channel.onopen = () => {
			this.connected = true;
			this._status("Direct co-op connected");
			if (this.isHost) {
				this.started = true;
				this._goAt = performance.now() + 3000;
				this._send({ riot: 1, type: "start" });
				this._emit("onStart", { ...this.info(), in: 3000 });
			}
		};
		channel.onclose = () => {
			if (!this.connected || this.ended) return;
			this.connected = false;
			this.ended = true;
			this.started = false;
			this._status("Partner disconnected");
			this._emit("onLeave", this.isHost ? 1 : 0);
			this._emit("onEnd", "peer-disconnected");
		};
	}
	async _gather() {
		const peer = this.peer;
		if (peer.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			const done = () => {
				clearTimeout(timer);
				peer.removeEventListener("icegatheringstatechange", check);
				resolve();
			};
			const check = () => {
				if (peer.iceGatheringState === "complete") done();
			};
			const timer = setTimeout(done, 12000);
			peer.addEventListener("icegatheringstatechange", check);
			check();
		});
	}
	_encode(description) {
		return (
			"RIOT1." +
			btoa(JSON.stringify({ type: description.type, sdp: description.sdp }))
		);
	}
	_decode(code, expected) {
		try {
			const raw = String(code).trim();
			if (!raw.startsWith("RIOT1.") || raw.length > 60000) throw new Error();
			const value = JSON.parse(atob(raw.slice(6)));
			if (
				value.type !== expected ||
				typeof value.sdp !== "string" ||
				!value.sdp.startsWith("v=0")
			)
				throw new Error();
			return value;
		} catch (_) {
			throw new Error(`Paste a complete Dodge Riot ${expected} code.`);
		}
	}
	async createOffer() {
		this._status("Making host code…");
		const peer = await this._newPeer(true);
		await peer.setLocalDescription(await peer.createOffer());
		await this._gather();
		if (this.peer !== peer) throw new Error("Connection cancelled.");
		this._status("Send the host code to your partner, then paste their reply.");
		return this._encode(peer.localDescription);
	}
	async joinOffer(code) {
		const offer = this._decode(code, "offer");
		this._status("Making reply code…");
		const peer = await this._newPeer(false);
		await peer.setRemoteDescription(offer);
		await peer.setLocalDescription(await peer.createAnswer());
		await this._gather();
		if (this.peer !== peer) throw new Error("Connection cancelled.");
		this._status(
			"Send your reply code to the host. The run starts when connected.",
		);
		return this._encode(peer.localDescription);
	}
	async acceptAnswer(code) {
		const answer = this._decode(code, "answer");
		if (!this.peer || !this.isHost) throw new Error("Make a host code first.");
		await this.peer.setRemoteDescription(answer);
		this._status("Connecting to partner…");
	}
	disconnect() {
		if (this.hubActive) return;
		const channel = this.channel;
		const peer = this.peer;
		this.channel = null;
		this.peer = null;
		this.connected = false;
		this.started = false;
		this.ended = false;
		this._finished = false;
		this.mode = "offline";
		this.isHost = true;
		this.me = this.host = 0;
		this.server = false;
		this.players = [{ id: 0, name: "Driver 1", color: "#ffcf50" }];
		this._goAt = null;
		this._seenInput.clear();
		this._seenSnapshot = -1;
		this._lastInput = this._lastSnapshot = -Infinity;
		this._inputSequence = this._snapshotSequence = 0;
		if (channel) {
			channel.onclose = null;
			channel.onmessage = null;
			channel.close();
		}
		if (peer) {
			peer.onconnectionstatechange = null;
			peer.ondatachannel = null;
			peer.close();
		}
	}
}
