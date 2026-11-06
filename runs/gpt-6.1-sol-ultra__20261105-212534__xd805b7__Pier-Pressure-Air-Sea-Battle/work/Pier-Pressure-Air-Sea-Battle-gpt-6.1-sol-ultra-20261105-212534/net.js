// Pier Pressure networking: AI Hub Session Protocol v1, plus standalone peer co-op.
// The unmodified hub-session.js must be the first script in the delivered HTML.
const NET_VERSION = "pier-pressure-1";
const noop = () => {};
const emptyInput = () => ({ aim: 0, fire: false, burst: false });

export class Network {
	constructor(callbacks = {}) {
		this.callbacks = callbacks;
		this.active = !!globalThis.AIHub?.active;
		this.connected = false;
		this.ended = false;
		this.started = false;
		this.reported = false;
		this.role = "host";
		this.me = 0;
		this.server = false;
		this.players = [{ id: 0, name: "Port gunner", color: "#f4b34e" }];
		this._seatIds = [0];
		this._elapsed = 0;
		this._sendAt = 0;
		this._sequence = 0;
		this._lastState = -1;
		this._lastInput = new Map();
		this._unsub = [];
		this._nonce = globalThis.crypto?.randomUUID?.() || String(Math.random());
		this.stats = { sent: 0, received: 0, rejected: 0, bytes: 0 };
		this.lastScore = 0;
	}

	get isHost() {
		return this.role === "host";
	}
	get isGuest() {
		return this.role === "guest";
	}
	get online() {
		return this.active || this.connected;
	}
	get localSeat() {
		return this.server ? -1 : Math.max(0, this._seatIds.indexOf(this.me));
	}
	get running() {
		if (this.ended) return false;
		return this.active ? this.started && AIHub.time() >= 0 : true;
	}
	get countdown() {
		return this.active ? Math.max(0, -AIHub.time() / 1000) : 0;
	}

	_call(name, ...args) {
		(this.callbacks[name] || noop)(...args);
	}
	_status(text) {
		this._call("onStatus", text);
	}

	async init() {
		if (!this.active) return null;
		const info = await AIHub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) {
			this.active = false;
			return null;
		}
		this.role = info.isHost ? "host" : "guest";
		this.me = info.me;
		this.server = !!info.server;
		this.players = info.players.slice();
		this._seatIds = info.players.map((p) => p.id);
		this.connected = true;
		this._unsub.push(
			AIHub.on("start", (info) => {
				this.started = true;
				this._sendAt = 0;
				this._call("onStart", info);
			}),
			AIHub.on("message", (data, from) => this._receive(data, from)),
			AIHub.on("leave", ({ id, reason }) => {
				const seat = this._seatIds.indexOf(id);
				this.players = this.players.filter((p) => p.id !== id);
				if (seat >= 0 && this.isHost) this._call("onInput", emptyInput(), seat);
				this._call("onLeave", id, reason);
				this._status("A gunner left. The coastal watch continues.");
			}),
			AIHub.on("time-up", (info) => {
				if (this.ended) return;
				this._call("onTimeUp", info);
				// The game normally reports immediately. This fallback also honors short rounds.
				if (this.isHost && !this.reported) this.finish(this.lastScore, false);
			}),
			AIHub.on("end", (info) => {
				this.ended = true;
				this.connected = false;
				this._call("onEnd", info.reason, info);
			}),
		);
		this._status(
			this.server
				? "AI Hub · coastal command"
				: `AI Hub · gunner ${this.localSeat + 1}`,
		);
		return info;
	}

	ready() {
		if (this.active && !this.ended) AIHub.ready();
	}

	// dt is seconds. The host supplies its compact JSON snapshot, guests their current input.
	// Ten packets/sec in each direction stays within the Hub's 20/sec allowance.
	tick(dt, input, snapshot) {
		this._elapsed += Math.max(0, Number(dt) || 0);
		if (
			this.ended ||
			!this.online ||
			!this.running ||
			this._elapsed < this._sendAt
		)
			return;
		this._sendAt = this._elapsed + 0.1;
		if (this.isHost && snapshot != null) {
			this._send({
				protocol: NET_VERSION,
				kind: "state",
				seq: ++this._sequence,
				state: snapshot,
			});
		} else if (this.isGuest) {
			this._send({
				protocol: NET_VERSION,
				kind: "input",
				seq: ++this._sequence,
				input: input || emptyInput(),
			});
		}
	}

	_send(data) {
		if (this.ended) return false;
		let encoded;
		try {
			encoded = JSON.stringify(data);
		} catch {
			return false;
		}
		if (encoded.length > 16000) {
			this.stats.rejected++;
			return false;
		}
		let sent = false;
		if (this.active)
			sent = AIHub.send(
				data,
				this.isHost ? { reliable: true } : { to: AIHub.host, reliable: false },
			);
		else if (this._data?.readyState === "open") {
			if (this._data.bufferedAmount > 65536) return false;
			this._data.send(encoded);
			sent = true;
		} else if (this._broadcast && this.connected && this._remote) {
			this._broadcast.postMessage({
				protocol: NET_VERSION,
				from: this._nonce,
				to: this._remote,
				kind: "packet",
				data,
			});
			sent = true;
		}
		if (sent) {
			this.stats.sent++;
			this.stats.bytes += encoded.length;
		}
		return sent;
	}

	_receive(data, from) {
		if (this.ended || !data || data.protocol !== NET_VERSION) return;
		this.stats.received++;
		if (data.kind === "input" && this.isHost) {
			const seat = this.active ? this._seatIds.indexOf(from) : 1;
			if (seat < 0 || seat > 1 || !Number.isFinite(data.seq)) return;
			if (data.seq <= (this._lastInput.get(from) ?? -1)) return;
			this._lastInput.set(from, data.seq);
			const source = data.input || {};
			// Only ordinary input crosses the boundary: no guest world state or score.
			const clean = { ...source };
			for (const k of ["aim", "angle", "x", "y", "power"]) {
				if (k in clean)
					clean[k] = Math.max(-10000, Math.min(10000, Number(clean[k]) || 0));
			}
			this._call("onInput", clean, seat);
		} else if (data.kind === "state" && this.isGuest) {
			if (this.active && from !== AIHub.host) return;
			if (!Number.isFinite(data.seq) || data.seq <= this._lastState) return;
			this._lastState = data.seq;
			this._call("onState", data.state);
		} else if (data.kind === "end" && this.isGuest) {
			this._call("onResult", data.score, !!data.won, data.stats || {});
		}
	}

	finish(score = 0, won = false, stats = {}) {
		if (!this.isHost || this.reported || this.ended) return;
		this.reported = true;
		this.lastScore = Number.isFinite(Number(score)) ? Number(score) : 0;
		if (this.active) {
			const ids = this.players.map((p) => p.id);
			const scores = Object.fromEntries(ids.map((id) => [id, this.lastScore]));
			const playerStats = Object.fromEntries(ids.map((id) => [id, stats]));
			AIHub.finish({
				standings: [ids],
				scores,
				won: !!won,
				stats: playerStats,
			});
		} else if (this.connected) {
			this._send({
				protocol: NET_VERSION,
				kind: "end",
				score: this.lastScore,
				won: !!won,
				stats,
			});
		}
	}

	fail(message) {
		if (this.active && !this.ended) AIHub.fail(String(message));
		this._status(String(message));
	}

	_standalone(role) {
		if (this.active) throw new Error("AI Hub manages this session.");
		this.leave();
		this.role = role;
		this.me = role === "host" ? 0 : 1;
		this.ended = false;
		this.reported = false;
		this.started = true;
		this._seatIds = [0, 1];
		this.players = [
			{ id: 0, name: "Port gunner", color: "#f4b34e" },
			{ id: 1, name: "Starboard gunner", color: "#67dac6" },
		];
	}

	_connected() {
		this.connected = true;
		this._status("Two gunners connected. All hands on deck!");
		this._call("onConnect", this.role);
	}

	// A six-letter same-browser room; handy for two windows on one computer.
	// For different devices use the offer/answer functions below.
	hostLocal(code) {
		this._standalone("host");
		this._room = String(
			code ||
				Array.from(
					crypto.getRandomValues(new Uint8Array(6)),
					(x) => "ABCDEFGHJKLMNPQRSTUVWXYZ"[x % 24],
				).join(""),
		).toUpperCase();
		this._openBroadcast();
		this._status(
			`Local window room ${this._room} · waiting for a second window`,
		);
		return this._room;
	}

	joinLocal(code) {
		code = String(code || "")
			.trim()
			.toUpperCase();
		if (!/^[A-Z0-9-]{3,24}$/.test(code))
			throw new Error("Enter the room code shown by the host.");
		this._standalone("guest");
		this._room = code;
		this._openBroadcast();
		const hello = () =>
			this._broadcast?.postMessage({
				protocol: NET_VERSION,
				from: this._nonce,
				kind: "hello",
			});
		hello();
		this._helloTimer = setInterval(() => {
			if (!this.connected) hello();
		}, 500);
		this._status(`Calling local room ${code}…`);
	}

	_openBroadcast() {
		if (!globalThis.BroadcastChannel)
			throw new Error(
				"This browser does not support local window rooms. Use direct connection.",
			);
		this._broadcast = new BroadcastChannel(`${NET_VERSION}:${this._room}`);
		this._broadcast.onmessage = ({ data }) => {
			if (
				!data ||
				data.protocol !== NET_VERSION ||
				data.from === this._nonce ||
				(data.to && data.to !== this._nonce)
			)
				return;
			if (
				data.kind === "hello" &&
				this.isHost &&
				(!this._remote || this._remote === data.from)
			) {
				this._remote = data.from;
				this._broadcast.postMessage({
					protocol: NET_VERSION,
					from: this._nonce,
					to: data.from,
					kind: "welcome",
				});
				if (!this.connected) this._connected();
			} else if (data.kind === "welcome" && this.isGuest && !this.connected) {
				this._remote = data.from;
				clearInterval(this._helloTimer);
				this._connected();
			} else if (data.kind === "packet" && data.from === this._remote) {
				this._receive(data.data, this.isHost ? 1 : 0);
			} else if (data.kind === "bye" && data.from === this._remote)
				this._disconnected();
		};
	}

	// Manual WebRTC signaling avoids accounts and a signaling server. STUN discovers
	// addresses; some restrictive networks require a relay unavailable to this file.
	_makePeer() {
		if (!globalThis.RTCPeerConnection)
			throw new Error("Direct connections require a browser with WebRTC.");
		this._peer = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this._peer.ondatachannel = (e) => this._wireData(e.channel);
		this._peer.onconnectionstatechange = () => {
			if (
				["failed", "disconnected", "closed"].includes(
					this._peer?.connectionState,
				)
			)
				this._disconnected();
		};
	}

	_wireData(channel) {
		this._data = channel;
		channel.onopen = () => this._connected();
		channel.onclose = () => this._disconnected();
		channel.onmessage = ({ data }) => {
			if (typeof data !== "string" || data.length > 16000) return;
			try {
				this._receive(JSON.parse(data), this.isHost ? 1 : 0);
			} catch {
				this.stats.rejected++;
			}
		};
	}

	async _gather() {
		if (this._peer.iceGatheringState !== "complete")
			await new Promise((resolve) => {
				const peer = this._peer;
				const timer = setTimeout(done, 5000);
				function done() {
					clearTimeout(timer);
					peer.removeEventListener("icegatheringstatechange", changed);
					resolve();
				}
				function changed() {
					if (peer.iceGatheringState === "complete") done();
				}
				peer.addEventListener("icegatheringstatechange", changed);
			});
		return "PP1." + btoa(JSON.stringify(this._peer.localDescription));
	}

	_description(token, type) {
		try {
			if (!String(token).trim().startsWith("PP1.")) throw new Error();
			const data = JSON.parse(atob(String(token).trim().slice(4)));
			if (
				data.type !== type ||
				typeof data.sdp !== "string" ||
				data.sdp.length > 30000
			)
				throw new Error();
			return data;
		} catch {
			throw new Error(
				`Paste the complete ${type === "offer" ? "invitation" : "reply"} code from the other gunner.`,
			);
		}
	}

	async hostRoom() {
		this._standalone("host");
		this._makePeer();
		this._wireData(this._peer.createDataChannel(NET_VERSION));
		await this._peer.setLocalDescription(await this._peer.createOffer());
		const token = await this._gather();
		this._status(
			"Invitation ready. Send it to your gunner, then paste their reply.",
		);
		return token;
	}

	async joinRoom(token) {
		const description = this._description(token, "offer");
		this._standalone("guest");
		this._makePeer();
		await this._peer.setRemoteDescription(description);
		await this._peer.setLocalDescription(await this._peer.createAnswer());
		const answer = await this._gather();
		this._status("Reply ready. Send it to the host to connect.");
		return answer;
	}

	async acceptAnswer(token) {
		if (this.active || !this._peer || !this.isHost)
			throw new Error("Create an invitation first.");
		await this._peer.setRemoteDescription(this._description(token, "answer"));
		this._status("Reply accepted. Connecting the coastal batteries…");
	}

	_disconnected() {
		if (!this.connected) return;
		this.connected = false;
		this._remote = null;
		if (this.isHost) this._call("onInput", emptyInput(), 1);
		this._call("onDisconnect");
		this._status("The other gunner disconnected. Host may continue solo.");
	}

	leave() {
		if (this.active) return false;
		if (this._broadcast && this._remote)
			this._broadcast.postMessage({
				protocol: NET_VERSION,
				from: this._nonce,
				to: this._remote,
				kind: "bye",
			});
		clearInterval(this._helloTimer);
		this._broadcast?.close();
		this._broadcast = null;
		if (this._data) {
			this._data.onclose = null;
			this._data.close();
			this._data = null;
		}
		if (this._peer) {
			this._peer.onconnectionstatechange = null;
			this._peer.close();
			this._peer = null;
		}
		this.connected = false;
		this.role = "host";
		this.me = 0;
		this.server = false;
		this._remote = null;
		this._seatIds = [0];
		this.players = [{ id: 0, name: "Port gunner", color: "#f4b34e" }];
		this._lastInput.clear();
		this._lastState = -1;
		this._sequence = 0;
		this._sendAt = 0;
		return true;
	}

	dispose() {
		this.leave();
		for (const off of this._unsub) off();
		this._unsub.length = 0;
	}
}
