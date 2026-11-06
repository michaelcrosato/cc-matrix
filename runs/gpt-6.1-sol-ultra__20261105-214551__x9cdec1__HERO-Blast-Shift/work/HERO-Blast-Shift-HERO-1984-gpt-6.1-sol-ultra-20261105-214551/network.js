const COLORS = ["#48ddcf", "#ffbb61", "#a795ff", "#ff789d"];
const CHANNEL = "hero-blast-shift-standalone-v1";
const noop = () => {};
const finite = (v, fallback = 0) =>
	Number.isFinite(Number(v)) ? Number(v) : fallback;
const pack = (value) => {
	const bytes = new TextEncoder().encode(JSON.stringify(value));
	let str = "";
	for (const byte of bytes) str += String.fromCharCode(byte);
	return btoa(str);
};
const unpack = (code) => {
	try {
		const bytes = Uint8Array.from(atob(String(code).replace(/\s/g, "")), (c) =>
			c.charCodeAt(0),
		);
		const value = JSON.parse(new TextDecoder().decode(bytes));
		if (
			!value ||
			value.game !== "blast-shift" ||
			typeof value.sdp !== "string" ||
			!["offer", "answer"].includes(value.type)
		)
			throw new Error();
		return { type: value.type, sdp: value.sdp };
	} catch {
		throw new Error(
			"That is not a Blast Shift connection code. Paste the complete code.",
		);
	}
};
function safeState(s = {}) {
	return {
		x: finite(s.x),
		y: finite(s.y),
		sector: Math.max(0, Math.min(2, Math.floor(finite(s.sector)))),
		facing: finite(s.facing, 1) < 0 ? -1 : 1,
		flying: !!s.flying,
		score: Math.max(0, finite(s.score)),
		rescued: Math.max(0, finite(s.rescued)),
		time: Math.max(0, finite(s.time)),
	};
}

/** Ghost racing: AI Hub owns session transport; direct WebRTC and local tabs are standalone only. */
export class Network {
	constructor(callbacks = {}) {
		this.cb = {
			onStart: noop,
			onEnd: noop,
			onGhost: noop,
			onLeave: noop,
			onTimeUp: noop,
			onStatus: noop,
			onRivalFinish: noop,
			...callbacks,
		};
		this.hub = globalThis.AIHub || null;
		this._active = !!this.hub?.active;
		this._started = false;
		this._ended = false;
		this._resultDone = false;
		this._ready = false;
		this.info = null;
		this.status = this._active ? "Joining AI Hub…" : "Solo rescue";
		this.lastState = safeState();
		this.remote = new Map();
		this.sequence = 0;
		this.sendClock = 0;
		this.progressClock = 1;
		this.localChannel = null;
		this.peer = null;
		this.dataChannel = null;
		this.standaloneStart = 0;
		this._unsubs = [];
		this.id = this._active
			? null
			: globalThis.crypto?.randomUUID?.() ||
				`pilot-${Date.now()}-${performance.now()}`;
	}
	get active() {
		return this._active;
	}
	get started() {
		return this._started;
	}
	get ended() {
		return this._ended;
	}
	get remoteCount() {
		return this.remote.size;
	}
	get canPlay() {
		if (this._ended) return false;
		if (this.active) return this._started && this.hub.time() >= 0;
		return !this._started || performance.now() >= this.standaloneStart;
	}
	get countdown() {
		if (this.active)
			return this._started ? Math.max(0, -this.hub.time()) : Infinity;
		return Math.max(0, this.standaloneStart - performance.now());
	}
	_status(message) {
		this.status = message;
		this.cb.onStatus(message);
	}
	async init() {
		if (!this.hub) return null;
		this._unsubs.push(
			this.hub.on("start", () => {
				this._active = true;
				this._started = true;
				this._ended = false;
				this._resultDone = false;
				this.sendClock = 0;
				this.progressClock = 1;
				this._status("AI Hub rescue race");
				this.cb.onStart({
					hub: true,
					countdownMs: Math.max(0, -this.hub.time()),
				});
			}),
		);
		this._unsubs.push(
			this.hub.on("message", (data, from) => {
				if (this._ended || !data || data.kind !== "pilot") return;
				const player = this.info?.players?.find((p) => p.id === from);
				if (!player || from === this.info?.me) return;
				this._receiveGhost(data, from, {
					name: player.name,
					color: player.color,
				});
			}),
		);
		this._unsubs.push(this.hub.on("leave", ({ id }) => this._remove(id)));
		this._unsubs.push(
			this.hub.on("time-up", () => {
				if (this._ended) return;
				this.cb.onTimeUp();
				if (!this._resultDone)
					this.finish({ ...this.lastState, success: false });
			}),
		);
		this._unsubs.push(
			this.hub.on("end", (event) => {
				this._ended = true;
				this._started = false;
				for (const id of [...this.remote.keys()]) this._remove(id);
				this._status("Round complete");
				this.cb.onEnd(event?.reason || "finished");
			}),
		);
		this.info = await this.hub.connect({ mode: "ghost", seats: [1, 4] });
		this._active = !!this.info;
		if (this.info) {
			this.id = this.info.me;
			this._status("Waiting for the rescue race");
		} else this._status("Solo rescue");
		return this.info;
	}
	ready() {
		if (this.active && !this._ready) {
			this._ready = true;
			this.hub.ready();
		}
	}
	_receiveGhost(data, id, meta = {}) {
		if (
			!data.state ||
			!Number.isFinite(data.state.x) ||
			!Number.isFinite(data.state.y)
		)
			return;
		const previous = this.remote.get(id);
		if (previous && finite(data.seq) < previous.seq) return;
		const state = safeState(data.state);
		this.remote.set(id, {
			...previous,
			...meta,
			state,
			seq: finite(data.seq),
			seen: performance.now(),
		});
		this.cb.onGhost(state, id, {
			name: meta.name || previous?.name || "Rescue rival",
			color: meta.color || previous?.color || COLORS[1],
		});
	}
	_remove(id) {
		if (this.remote.delete(id)) this.cb.onLeave(id);
	}
	update(dt, state) {
		this.lastState = safeState(state);
		if (this._ended || !this._started || !this.canPlay) return;
		this.sendClock += Math.max(0, finite(dt));
		this.progressClock += Math.max(0, finite(dt));
		if (this.active && this.progressClock >= 1) {
			this.progressClock = 0;
			this.hub.progress({
				score: this.lastState.score,
				label: `${this.lastState.rescued}/6 rescued · sector ${this.lastState.sector + 1}`,
			});
		}
		if (this.sendClock >= 0.12) {
			this.sendClock = 0;
			const data = {
				kind: "pilot",
				seq: ++this.sequence,
				state: this.lastState,
			};
			if (this.active) this.hub.send(data, { reliable: false });
			else this._send(data);
		}
	}
	finish(state = {}) {
		if (this._ended || this._resultDone) return;
		this._resultDone = true;
		const clean = safeState({ ...this.lastState, ...state });
		if (this.active) {
			const stats = {
				Rescued: `${clean.rescued}/6`,
				Score: Math.round(clean.score),
			};
			if (state.success)
				this.hub.result({ time: Math.max(0, this.hub.time()), stats });
			else this.hub.result({ score: clean.score, stats });
		} else
			this._send({ kind: "finish", state: clean, success: !!state.success });
	}
	_standaloneOnly() {
		if (this.active)
			throw new Error(
				"AI Hub manages this race. Direct pairing is available outside a session.",
			);
	}
	enableLocal() {
		this._standaloneOnly();
		if (!globalThis.BroadcastChannel)
			throw new Error(
				"Local tab racing is unavailable in this browser. Use a peer code.",
			);
		if (this.localChannel) return;
		this.localChannel = new BroadcastChannel(CHANNEL);
		this.localChannel.onmessage = (event) => this._localMessage(event.data);
		this._heartbeat = setInterval(() => {
			if (!this.localChannel) return;
			this.localChannel.postMessage({ kind: "hello", id: this.id });
			const now = performance.now();
			for (const [id, remote] of this.remote)
				if (String(id).startsWith("local:") && now - remote.seen > 10000)
					this._remove(id);
		}, 1500);
		this.localChannel.postMessage({ kind: "hello", id: this.id });
		this._status("Local race open · open Race in another copy");
	}
	_localMessage(data) {
		if (this.active || !data || data.id === this.id) return;
		const id = `local:${data.id}`;
		if (data.kind === "hello") {
			if (!this.remote.has(id) && this.remote.size >= 3) return;
			const first = !this.remote.has(id);
			this.remote.set(id, {
				...this.remote.get(id),
				seen: performance.now(),
				seq: this.remote.get(id)?.seq || 0,
				name: "Local pilot",
				color: COLORS[1],
			});
			if (first) {
				this.localChannel?.postMessage({ kind: "hello", id: this.id });
				this._status(`${this.remote.size + 1} pilots linked · start the race`);
			}
			return;
		}
		if (!this.remote.has(id)) return;
		this.remote.get(id).seen = performance.now();
		if (data.kind === "leave") {
			this._remove(id);
			return;
		}
		if (data.kind === "start") {
			this._beginStandalone(data.startAt);
			return;
		}
		if (data.kind === "pilot")
			this._receiveGhost(data, id, { name: "Local pilot", color: COLORS[1] });
		if (data.kind === "finish") this._rivalFinish(data, id);
	}
	_rivalFinish(data, id) {
		const rival = this.remote.get(id);
		if (!rival || rival.finished) return;
		const state = safeState(data.state);
		Object.assign(rival, {
			state,
			finished: true,
			success: !!data.success,
			seen: performance.now(),
		});
		this.cb.onRivalFinish(state, id, rival.success);
		this._status(`Rival finished · ${state.rescued}/6 rescued`);
	}
	_send(data) {
		if (this.active || this._ended) return;
		if (this.localChannel)
			this.localChannel.postMessage({ ...data, id: this.id });
		if (this.dataChannel?.readyState === "open")
			this.dataChannel.send(JSON.stringify(data));
	}
	_beginStandalone(startAt) {
		this._started = true;
		this._ended = false;
		this._resultDone = false;
		this.sequence = 0;
		this.sendClock = 0;
		const delay = Math.max(
			0,
			Math.min(5000, finite(startAt, Date.now() + 3000) - Date.now()),
		);
		this.standaloneStart = performance.now() + delay;
		for (const remote of this.remote.values()) {
			remote.seq = 0;
			remote.finished = false;
			remote.success = false;
		}
		this._status("Rescue race · first six miners home wins");
		this.cb.onStart({ hub: false, countdownMs: delay });
	}
	startRace() {
		this._standaloneOnly();
		if (!this.remote.size)
			throw new Error("Link another pilot before starting a race.");
		const startAt = Date.now() + 3000;
		this._send({ kind: "start", startAt });
		this._beginStandalone(startAt);
	}
	async _createPeer() {
		this._standaloneOnly();
		if (!globalThis.RTCPeerConnection)
			throw new Error(
				"Peer racing is unavailable in this browser. Try local tabs.",
			);
		this._closePeer();
		this.peer = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.peer.ondatachannel = (event) => this._attachChannel(event.channel);
		this.peer.onconnectionstatechange = () => {
			const state = this.peer?.connectionState;
			if (state === "failed")
				this._status(
					"Direct connection failed · try the same network or AI Hub",
				);
			if (state === "disconnected" || state === "closed") {
				this._remove("peer");
				this._status("Peer disconnected");
			}
		};
		return this.peer;
	}
	_attachChannel(channel) {
		this.dataChannel = channel;
		channel.onopen = () => {
			this.remote.set("peer", {
				seen: performance.now(),
				seq: 0,
				name: "Peer pilot",
				color: COLORS[2],
			});
			this._status("Peer linked · either pilot can start the race");
			channel.send(JSON.stringify({ kind: "hello" }));
		};
		channel.onclose = () => {
			this._remove("peer");
			this._status("Peer disconnected");
		};
		channel.onmessage = (event) => {
			if (
				this.active ||
				this._ended ||
				typeof event.data !== "string" ||
				event.data.length > 16000
			)
				return;
			let data;
			try {
				data = JSON.parse(event.data);
			} catch {
				return;
			}
			if (data.kind === "pilot")
				this._receiveGhost(data, "peer", {
					name: "Peer pilot",
					color: COLORS[2],
				});
			if (data.kind === "start") this._beginStandalone(data.startAt);
			if (data.kind === "finish") this._rivalFinish(data, "peer");
			if (data.kind === "leave") this._remove("peer");
		};
	}
	async _gather(peer) {
		if (peer.iceGatheringState !== "complete")
			await new Promise((resolve) => {
				const timer = setTimeout(done, 7000);
				function done() {
					clearTimeout(timer);
					peer.removeEventListener("icegatheringstatechange", change);
					resolve();
				}
				function change() {
					if (peer.iceGatheringState === "complete") done();
				}
				peer.addEventListener("icegatheringstatechange", change);
			});
		if (!peer.localDescription)
			throw new Error("Could not create a connection code.");
		return pack({
			game: "blast-shift",
			type: peer.localDescription.type,
			sdp: peer.localDescription.sdp,
		});
	}
	async createOffer() {
		const peer = await this._createPeer();
		this._attachChannel(peer.createDataChannel("blast-shift-race"));
		this._status("Preparing host code…");
		await peer.setLocalDescription(await peer.createOffer());
		const code = await this._gather(peer);
		this._status("Host code ready · send it to the other pilot");
		return code;
	}
	async acceptOffer(code) {
		const description = unpack(code);
		if (description.type !== "offer")
			throw new Error("Paste the host code in Join.");
		const peer = await this._createPeer();
		this._status("Preparing reply code…");
		await peer.setRemoteDescription(description);
		await peer.setLocalDescription(await peer.createAnswer());
		const reply = await this._gather(peer);
		this._status("Reply ready · send it back to the host");
		return reply;
	}
	async acceptAnswer(code) {
		this._standaloneOnly();
		if (!this.peer || this.peer.signalingState !== "have-local-offer")
			throw new Error("Create a host code first.");
		const description = unpack(code);
		if (description.type !== "answer")
			throw new Error("The host needs the other pilot’s reply code.");
		await this.peer.setRemoteDescription(description);
		this._status("Connecting to peer…");
	}
	_closePeer() {
		if (this.dataChannel) {
			this.dataChannel.onclose = null;
			this.dataChannel.close();
			this.dataChannel = null;
		}
		if (this.peer) {
			this.peer.onconnectionstatechange = null;
			this.peer.close();
			this.peer = null;
		}
		this._remove("peer");
	}
	disconnect() {
		if (this.active) return;
		this._send({ kind: "leave" });
		clearInterval(this._heartbeat);
		this.localChannel?.close();
		this.localChannel = null;
		this._closePeer();
		for (const id of [...this.remote.keys()]) this._remove(id);
		this._started = false;
		this._ended = false;
		this._resultDone = false;
		this._status("Solo rescue");
	}
	diagnostics() {
		return {
			active: this.active,
			started: this.started,
			canPlay: this.canPlay,
			ended: this.ended,
			remoteCount: this.remoteCount,
			resultSent: this._resultDone,
			status: this.status,
			transport: this.active
				? "AI Hub"
				: this.peer
					? "WebRTC"
					: this.localChannel
						? "BroadcastChannel"
						: "none",
		};
	}
}
