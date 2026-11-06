// Game transport. The AI Hub client in hub/session.js is embedded unmodified
// before the game. Outside a Hub round, a direct WebRTC link can be negotiated
// by exchanging invitation and reply codes, without a game server.
export class GameNetwork {
	constructor(callbacks = {}) {
		this.callbacks = callbacks;
		this.active = Boolean(globalThis.AIHub?.active);
		this.isHost = true;
		this.server = false;
		this.me = 0;
		this.host = 0;
		this.players = [{ id: 0, name: "You", color: "#ee795c" }];
		this.started = false;
		this.ended = false;
		this.connected = false;
		this.kind = "solo";
		this.lastState = -Infinity;
		this.lastReliableState = -Infinity;
		this.lastInput = -Infinity;
		this.sequence = 0;
		this.receivedState = -1;
		this.pendingInput = {};
		this.remoteSeen = new Map();
		this.left = new Set();
		this.reported = false;
		this.off = [];
		this.pc = null;
		this.channel = null;
		this.localRoom = null;
		this.roomNonce = null;
		this.signalTimeout = null;
	}

	async init() {
		if (!this.active) {
			this.callbacks.onRole?.(this.info());
			return null;
		}
		const hub = globalThis.AIHub;
		this.off.push(
			hub.on("message", (data, from) => this.receive(data, from)),
			hub.on("start", () => {
				this.started = true;
				this.ended = false;
				this.callbacks.onStart?.();
			}),
			hub.on("leave", ({ id, reason }) => {
				this.left.add(id);
				this.remoteSeen.delete(id);
				this.callbacks.onLeave?.(id, reason);
			}),
			hub.on("time-up", () => {
				this.callbacks.onTimeUp?.();
				// Guarantee a valid team result even if the UI has already transitioned.
				// The game can provide its more informative score in onTimeUp first.
				if (this.isHost && !this.reported) this.finish(false, 0);
			}),
			hub.on("end", ({ reason }) => {
				this.ended = true;
				this.started = false;
				this.pendingInput = {};
				this.callbacks.onEnd?.(reason);
			}),
		);
		const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) {
			this.active = false;
			this.callbacks.onRole?.(this.info());
			return null;
		}
		this.isHost = info.isHost;
		this.server = info.server;
		this.me = info.me;
		this.host = info.host;
		this.players = info.players;
		this.kind = "hub";
		this.connected = true;
		this.callbacks.onRole?.(this.info());
		return info;
	}

	info() {
		return {
			active: this.active,
			isHost: this.isHost,
			server: this.server,
			me: this.me,
			host: this.host,
			players: this.players.map((p) => ({ ...p })),
			kind: this.kind,
			connected: this.connected,
			playerIndex: this.players.findIndex((p) => p.id === this.me),
		};
	}

	ready() {
		if (this.active) globalThis.AIHub.ready();
	}

	canPlay() {
		return (
			!this.ended &&
			(!this.active || (this.started && globalThis.AIHub.time() >= 0))
		);
	}

	countdown() {
		return this.active
			? Math.max(0, Math.ceil(-globalThis.AIHub.time() / 1000))
			: 0;
	}

	status() {
		if (this.active)
			return this.server
				? "AI Hub · world host"
				: `AI Hub · ${this.players.length} friends`;
		if (this.connected)
			return this.kind === "local-room"
				? "Two friends · same browser"
				: "Two friends · direct link";
		if (this.pc) return "Waiting for a friend…";
		return "One player · a little help from the stars";
	}

	sendState(snapshot, force = false) {
		if (!this.isHost || this.ended || (this.active && !this.started))
			return false;
		const now = performance.now();
		if (!force && now - this.lastState < 1000 / 12) return false;
		if (!(this.active || this.connected)) return false;
		this.lastState = now;
		// Establish the complete world reliably, then refresh that reliable
		// checkpoint once per second. Intermediate motion may use datagrams;
		// fragment loss cannot leave a newly joined friend without a world.
		const reliable = force || now - this.lastReliableState >= 1000;
		const sent = this.transmit(
			{ t: "world", n: this.sequence++, d: snapshot },
			reliable,
		);
		if (sent && reliable) this.lastReliableState = now;
		return sent;
	}

	sendInput(input) {
		if (
			this.isHost ||
			this.server ||
			this.ended ||
			(this.active && !this.started)
		)
			return false;
		const next = normalizeInput(input);
		// Edge actions survive the 12 Hz network cadence. Repeated transport frames
		// are never interpreted as new presses by the authoritative simulation.
		for (const key of ["interact", "pulse", "candy", "bike"]) {
			next[key] = next[key] || Boolean(this.pendingInput[key]);
		}
		if (next.note === null && Number.isInteger(this.pendingInput.note)) {
			next.note = this.pendingInput.note;
		}
		this.pendingInput = next;
		const now = performance.now();
		if (now - this.lastInput < 1000 / 12) return false;
		this.lastInput = now;
		const packet = { t: "input", n: this.sequence++, d: this.pendingInput };
		// An ordered input stream preserves action presses even if a later movement
		// sample arrives while an action packet is being retransmitted by the Hub.
		const sent = this.transmit(packet, true, this.host);
		if (sent) this.pendingInput = {};
		return sent;
	}

	transmit(packet, reliable = true, to) {
		if (this.ended) return false;
		if (this.active) return globalThis.AIHub.send(packet, { reliable, to });
		if (this.channel?.readyState === "open") {
			if (this.channel.bufferedAmount > 256000) return false;
			this.channel.send(JSON.stringify(packet));
			return true;
		}
		if (this.localRoom && this.connected) {
			this.localRoom.postMessage({
				...packet,
				source: this.me,
				room: this.roomNonce,
			});
			return true;
		}
		return false;
	}

	receive(packet, from) {
		if (!packet || typeof packet !== "object" || this.ended) return;
		if (packet.t === "world" && !this.isHost && from === this.host) {
			if (!Number.isFinite(packet.n) || packet.n <= this.receivedState) return;
			this.receivedState = packet.n;
			this.callbacks.onState?.(packet.d);
		} else if (packet.t === "input" && this.isHost) {
			if (this.left.has(from) || !this.players.some((p) => p.id === from))
				return;
			if (
				!Number.isFinite(packet.n) ||
				packet.n <= (this.remoteSeen.get(from) ?? -1)
			)
				return;
			this.remoteSeen.set(from, packet.n);
			this.callbacks.onInput?.(normalizeInput(packet.d), from);
		} else if (
			packet.t === "start" &&
			!this.active &&
			!this.isHost &&
			from === this.host
		) {
			this.started = true;
			this.callbacks.onStart?.();
		} else if (
			packet.t === "finish" &&
			!this.active &&
			!this.isHost &&
			from === this.host
		) {
			this.callbacks.onRemoteFinish?.(packet.d);
		}
	}

	startStandalone() {
		if (this.active || !this.isHost) return;
		this.ended = false;
		this.started = true;
		this.reported = false;
		this.transmit({ t: "start" }, true);
	}

	finish(won, score = 0, stats = {}) {
		if (!this.isHost || this.reported || this.ended) return;
		this.reported = true;
		const ids = this.players
			.filter((p) => !this.left.has(p.id))
			.map((p) => p.id);
		if (this.active) {
			globalThis.AIHub.finish({
				standings: [ids],
				scores: Object.fromEntries(ids.map((id) => [id, Number(score) || 0])),
				won: Boolean(won),
				stats: Object.fromEntries(ids.map((id) => [id, stats])),
			});
		} else {
			this.transmit(
				{ t: "finish", d: { won: Boolean(won), score, stats } },
				true,
			);
		}
	}

	fail(message) {
		if (this.active) globalThis.AIHub.fail(message);
	}

	// Direct internet co-op: host creates an invitation, guest returns a reply,
	// host opens that reply. Codes include all gathered ICE candidates; no broker
	// or third-party JavaScript runs, and no WebRTC object exists during Hub play.
	async createOffer() {
		this.assertStandalone();
		this.closePeer();
		this.isHost = true;
		this.me = 0;
		this.host = 0;
		this.kind = "direct";
		this.pc = this.createPeer();
		this.attachChannel(
			this.pc.createDataChannel("extra-small-friendship", { ordered: true }),
		);
		await this.pc.setLocalDescription(await this.pc.createOffer());
		await gatherIce(this.pc);
		return encodeSignal(this.pc.localDescription);
	}

	async acceptOffer(code) {
		this.assertStandalone();
		const description = decodeSignal(code, "offer");
		this.closePeer();
		this.isHost = false;
		this.me = 1;
		this.host = 0;
		this.kind = "direct";
		this.pc = this.createPeer();
		this.pc.ondatachannel = (event) => this.attachChannel(event.channel);
		await this.pc.setRemoteDescription(description);
		await this.pc.setLocalDescription(await this.pc.createAnswer());
		await gatherIce(this.pc);
		this.callbacks.onRole?.(this.info());
		return encodeSignal(this.pc.localDescription);
	}

	async acceptAnswer(code) {
		this.assertStandalone();
		if (
			!this.pc ||
			!this.isHost ||
			this.pc.signalingState !== "have-local-offer"
		) {
			throw new Error("Make a new invitation before opening a reply.");
		}
		await this.pc.setRemoteDescription(decodeSignal(code, "answer"));
		this.callbacks.onMessage?.("Reply opened. Finding your friend…");
	}

	createPeer() {
		if (!globalThis.RTCPeerConnection)
			throw new Error(
				"Direct links need a browser with WebRTC. Local co-op is available.",
			);
		const pc = new RTCPeerConnection({
			iceServers: [
				{ urls: "stun:stun.l.google.com:19302" },
				{ urls: "stun:stun.cloudflare.com:3478" },
			],
		});
		pc.onconnectionstatechange = () => {
			if (pc !== this.pc) return;
			if (pc.connectionState === "failed")
				this.callbacks.onMessage?.(
					"The direct link could not connect on this network. Try a fresh invitation, or play through AI Hub.",
				);
			if (pc.connectionState === "disconnected")
				this.callbacks.onMessage?.(
					"The link went quiet. Waiting for your friend…",
				);
			if (pc.connectionState === "closed" || pc.connectionState === "failed")
				this.disconnected();
		};
		return pc;
	}

	attachChannel(channel) {
		this.channel = channel;
		channel.onopen = () => this.linked();
		channel.onmessage = (event) => {
			try {
				this.receive(JSON.parse(event.data), this.isHost ? 1 : 0);
			} catch {
				// Malformed or unrelated packets cannot affect the world.
			}
		};
		channel.onclose = () => this.disconnected();
		channel.onerror = () =>
			this.callbacks.onMessage?.(
				"The link was interrupted. You can continue on your own.",
			);
	}

	linked() {
		this.connected = true;
		this.receivedState = -1;
		this.remoteSeen.clear();
		this.players = [
			{ id: 0, name: "Red hoodie", color: "#ee795c" },
			{ id: 1, name: "Blue hoodie", color: "#6ed9df" },
		];
		this.callbacks.onRole?.(this.info());
		this.callbacks.onMessage?.(
			"Your friend is here. The host can start your adventure.",
		);
		if (this.isHost && this.started) this.transmit({ t: "start" }, true);
	}

	disconnected() {
		if (!this.connected) return;
		this.connected = false;
		this.callbacks.onLeave?.(this.isHost ? 1 : 0, "disconnected");
		this.callbacks.onMessage?.(
			"Your friend disconnected. The host can keep going.",
		);
		if (this.isHost) this.players = this.players.filter((p) => p.id === 0);
	}

	// Useful when two game windows share a browser/origin. This transport is
	// explicitly local; internet play uses the direct invitation above or AI Hub.
	createLocalRoom() {
		this.assertStandalone();
		this.closePeer();
		const bytes = new Uint8Array(4);
		crypto.getRandomValues(bytes);
		const code = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
			.join("")
			.toUpperCase();
		this.isHost = true;
		this.me = 0;
		this.host = 0;
		this.openLocalChannel(code);
		return code;
	}

	joinLocalRoom(code) {
		this.assertStandalone();
		const clean = String(code).replace(/\s+/g, "").toUpperCase();
		if (!/^[A-F0-9]{8}$/.test(clean))
			throw new Error("A same-browser room has eight letters or numbers.");
		this.closePeer();
		this.isHost = false;
		this.me = 1;
		this.host = 0;
		this.openLocalChannel(clean);
		this.localRoom.postMessage({ t: "join", source: 1, room: clean });
		this.signalTimeout = setTimeout(() => {
			if (!this.connected)
				this.callbacks.onMessage?.(
					"No room answered. Both windows need this same browser and address.",
				);
		}, 5000);
	}

	openLocalChannel(code) {
		if (!globalThis.BroadcastChannel)
			throw new Error("This browser does not support local rooms.");
		this.kind = "local-room";
		this.roomNonce = code;
		this.localRoom = new BroadcastChannel(`extra-small-visitor-${code}`);
		this.localRoom.onmessage = ({ data }) => {
			if (data.room !== code || data.source === this.me) return;
			if (data.t === "join" && this.isHost) {
				this.linked();
				this.localRoom.postMessage({ t: "welcome", source: 0, room: code });
				if (this.started) this.transmit({ t: "start" }, true);
			} else if (data.t === "welcome" && !this.isHost) {
				clearTimeout(this.signalTimeout);
				this.linked();
			} else if (data.t === "bye") {
				this.disconnected();
			} else {
				this.receive(data, data.source);
			}
		};
		this.callbacks.onRole?.(this.info());
	}

	assertStandalone() {
		if (this.active) throw new Error("AI Hub manages this round’s connection.");
	}

	closePeer() {
		clearTimeout(this.signalTimeout);
		if (this.localRoom) {
			this.localRoom.postMessage({
				t: "bye",
				source: this.me,
				room: this.roomNonce,
			});
			this.localRoom.close();
		}
		this.localRoom = null;
		this.roomNonce = null;
		const pc = this.pc;
		this.pc = null;
		if (this.channel) {
			this.channel.onclose = null;
			this.channel.close();
		}
		this.channel = null;
		if (pc) {
			pc.onconnectionstatechange = null;
			pc.close();
		}
		this.connected = false;
		this.receivedState = -1;
		this.remoteSeen.clear();
		this.pendingInput = {};
		this.reported = false;
		this.sequence = 0;
		this.lastState = -Infinity;
		this.lastInput = -Infinity;
		this.lastReliableState = -Infinity;
	}

	disconnect() {
		if (this.active) return;
		this.closePeer();
		this.kind = "solo";
		this.isHost = true;
		this.server = false;
		this.me = 0;
		this.host = 0;
		this.players = [{ id: 0, name: "You", color: "#ee795c" }];
		this.callbacks.onRole?.(this.info());
	}

	destroy() {
		for (const off of this.off) off();
		this.off = [];
		this.closePeer();
	}
}

function normalizeInput(input = {}) {
	const number = (n) =>
		Number.isFinite(Number(n)) ? Math.max(-1, Math.min(1, Number(n))) : 0;
	return {
		x: number(input.x),
		z: number(input.z),
		interact: Boolean(input.interact),
		hide: Boolean(input.hide),
		pulse: Boolean(input.pulse),
		boost: Boolean(input.boost),
		candy: Boolean(input.candy),
		bike: Boolean(input.bike),
		note:
			Number.isInteger(input.note) && input.note >= 0 && input.note <= 2
				? input.note
				: null,
	};
}

function encodeSignal(description) {
	return `ESV1.${btoa(JSON.stringify({ type: description.type, sdp: description.sdp }))}`;
}

function decodeSignal(code, expected) {
	try {
		const text = String(code).trim().replace(/\s+/g, "");
		if (!text.startsWith("ESV1.")) throw new Error("prefix");
		const parsed = JSON.parse(atob(text.slice(5)));
		if (
			parsed.type !== expected ||
			typeof parsed.sdp !== "string" ||
			parsed.sdp.length > 100000
		)
			throw new Error("shape");
		return parsed;
	} catch {
		throw new Error(
			expected === "offer"
				? "That is not an invitation code. Copy the complete invitation from your friend."
				: "That is not a reply code. Copy your friend’s complete reply.",
		);
	}
}

function gatherIce(pc) {
	if (pc.iceGatheringState === "complete") return Promise.resolve();
	return new Promise((resolve) => {
		const timeout = setTimeout(done, 6000);
		function done() {
			clearTimeout(timeout);
			pc.removeEventListener("icegatheringstatechange", changed);
			resolve();
		}
		function changed() {
			if (pc.iceGatheringState === "complete") done();
		}
		pc.addEventListener("icegatheringstatechange", changed);
	});
}
