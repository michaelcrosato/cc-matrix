const SEAT_COLORS = ["#e8443a", "#3b82f6", "#22c55e", "#f5b700"];
const utfEncode = (value) =>
	btoa(unescape(encodeURIComponent(JSON.stringify(value))));
const utfDecode = (value) =>
	JSON.parse(decodeURIComponent(escape(atob(String(value).trim()))));
const uniqueId = () =>
	globalThis.crypto?.randomUUID?.() || `${Date.now()}-${performance.now()}`;

/** Independent, noncolliding explorers. The hub owns all transport in a hub round. */
export class ExpeditionNetwork {
	constructor(callbacks = {}) {
		this.callbacks = callbacks;
		this.hubActive = false;
		this.started = false;
		this.ended = false;
		this.players = [];
		this.me = null;
		this.host = null;
		this.mode = "solo";
		this.sent = 0;
		this.received = 0;
		this._sendClock = 0;
		this._progressClock = 1;
		this._reported = false;
		this._peers = new Map();
		this._roster = new Map();
		this._off = [];
		this._lastScore = 0;
		this._lastStats = {};
	}
	get active() {
		return this.hubActive || this.mode !== "solo";
	}
	_call(name, ...args) {
		this.callbacks[name]?.(...args);
	}
	_status(text) {
		this.status = text;
		this._call("onStatus", text);
	}
	async init() {
		const hub = globalThis.AIHub;
		if (!hub?.active) return null;
		this.hubActive = true;
		this.mode = "hub";
		this._off.push(
			hub.on("start", (data) => {
				this.started = true;
				this.ended = false;
				this._reported = false;
				this._call("onStart", { ...this.info, ...data, hub: true });
			}),
		);
		this._off.push(
			hub.on("message", (data, from) => {
				if (this.ended || data?.kind !== "ghost") return;
				const player = this.players.find((p) => p.id === from);
				this.received++;
				this._call(
					"onGhost",
					{
						...this._cleanGhost(data),
						name: player?.name || `Explorer ${from + 1}`,
						color: player?.color || SEAT_COLORS[from % 4],
					},
					from,
				);
			}),
		);
		this._off.push(
			hub.on("leave", (data) => {
				this.players = this.players.filter((p) => p.id !== data.id);
				this._call("onLeave", data.id);
			}),
		);
		this._off.push(
			hub.on("time-up", (data) => {
				if (this.ended) return;
				this._call("onTimeUp", data);
				if (!this._reported) this.result(this._lastScore, this._lastStats);
			}),
		);
		this._off.push(
			hub.on("end", (data) => {
				this.ended = true;
				this.started = false;
				this._call("onEnd", data);
			}),
		);
		const info = await (globalThis.__pitfallinHubConnect ||
			hub.connect({ mode: "ghost", seats: [1, 4] }));
		if (!info) {
			this.hubActive = false;
			this.mode = "solo";
			this._off.splice(0).forEach((off) => off());
			return null;
		}
		this.info = info;
		this.me = info.me;
		this.host = info.host;
		this.players = info.players;
		this._status("AI Hub expedition connected");
		return info;
	}
	ready() {
		if (this.hubActive && !this.ended) globalThis.AIHub.ready();
	}
	_cleanGhost(data) {
		const num = (v, fallback = 0) =>
			Number.isFinite(Number(v)) ? Number(v) : fallback;
		return {
			x: Math.max(-20, Math.min(310, num(data.x))),
			y: Math.max(-20, Math.min(20, num(data.y))),
			vx: num(data.vx),
			vy: num(data.vy),
			facing: data.facing < 0 ? -1 : 1,
			grounded: !!data.grounded,
			climbing: !!data.climbing,
			swinging: !!data.swinging,
			score: Math.max(0, num(data.score)),
			relics: Math.max(0, Math.min(6, num(data.relics))),
			finished: !!data.finished,
		};
	}
	tick(state, dt) {
		this._lastScore = Number(state.score) || 0;
		this._lastStats = { Relics: state.collected?.size ?? state.relics ?? 0 };
		if (!this.active || !this.started || this.ended) return;
		if (this.hubActive && globalThis.AIHub.time() < 0) return;
		this._sendClock += dt;
		this._progressClock += dt;
		if (this._sendClock >= 0.1) {
			this._sendClock %= 0.1;
			const p = state.player || state;
			const packet = {
				kind: "ghost",
				...this._cleanGhost({
					...p,
					score: this._lastScore,
					relics: this._lastStats.Relics,
					finished: this._reported,
				}),
			};
			this._send(packet);
		}
		if (this._progressClock >= 1) {
			this._progressClock %= 1;
			if (this.hubActive)
				globalThis.AIHub.progress({
					score: this._lastScore,
					label: `${this._lastStats.Relics}/6 relics`,
				});
		}
	}
	result(score, stats = {}) {
		if (this.ended || this._reported) return;
		this._reported = true;
		this._lastScore = Number(score) || 0;
		if (this.hubActive)
			globalThis.AIHub.result({ score: this._lastScore, stats });
		else if (this.active)
			this._send({ kind: "result", score: this._lastScore, stats });
	}
	_send(data) {
		if (this.ended) return;
		if (this.hubActive) {
			if (globalThis.AIHub.send(data, { reliable: false })) this.sent++;
			return;
		}
		const envelope = { v: 1, from: this.me, data };
		if (this._channel) this._channel.postMessage(envelope);
		else {
			const text = JSON.stringify(envelope);
			for (const peer of this._peers.values())
				if (peer.channel?.readyState === "open") peer.channel.send(text);
		}
		this.sent++;
	}
	_receive(envelope, sourcePeer = null) {
		if (
			this.hubActive ||
			!envelope ||
			envelope.v !== 1 ||
			envelope.from === this.me
		)
			return;
		const { from, data } = envelope;
		if (!data || typeof data.kind !== "string") return;
		this.received++;
		if (this.mode === "rtc" && this.me === this.host && sourcePeer) {
			const text = JSON.stringify(envelope);
			for (const peer of this._peers.values())
				if (peer !== sourcePeer && peer.channel?.readyState === "open")
					peer.channel.send(text);
		}
		if (data.kind === "hello") {
			if (this.mode !== "local") return;
			this._roster.set(from, {
				id: from,
				joined: Number(data.joined) || Date.now(),
				seen: Date.now(),
			});
			this._refreshLocalRoster();
			if (!data.reply)
				this._send({ kind: "hello", joined: this._joined, reply: true });
		} else if (data.kind === "roster" && this.mode === "rtc") {
			this.players = Array.isArray(data.players)
				? data.players.slice(0, 4)
				: [];
			this._status(`${this.players.length}/4 explorers connected`);
		} else if (data.kind === "ghost" && !this.ended) {
			const p = this.players.find((p) => p.id === from);
			this._call(
				"onGhost",
				{
					...this._cleanGhost(data),
					name: p?.name || "Explorer",
					color: p?.color || SEAT_COLORS[1],
				},
				from,
			);
		} else if (data.kind === "start") {
			if (from !== this.host) return;
			this._beginStandalone(data.startAt);
		} else if (data.kind === "leave") {
			this._roster.delete(from);
			this.players = this.players.filter((p) => p.id !== from);
			if (this.mode === "local") this._refreshLocalRoster();
			this._call("onLeave", from);
			this._status(`${this.players.length}/4 explorers connected`);
		} else if (data.kind === "result") {
			this._call(
				"onGhost",
				{ finished: true, score: Number(data.score) || 0, result: true },
				from,
			);
		}
	}
	_guardStandalone() {
		if (this.hubActive || globalThis.AIHub?.active)
			throw new Error("AI Hub owns the network during a session.");
	}
	_refreshLocalRoster() {
		const entries = [...this._roster.values()]
			.sort(
				(a, b) =>
					a.joined - b.joined || String(a.id).localeCompare(String(b.id)),
			)
			.slice(0, 4);
		this.players = entries.map((p, i) => ({
			id: p.id,
			name: `Explorer ${i + 1}`,
			color: SEAT_COLORS[i],
		}));
		this.host = this.players[0]?.id ?? this.me;
		if (!this.players.some((p) => p.id === this.me)) {
			this._status("This camp is full. Choose another room.");
			this.leave();
			return;
		}
		this._status(
			`${this.players.length}/4 explorers · room ${this.room}${this.host === this.me ? " · you lead" : ""}`,
		);
	}
	joinLocal(room = "jungle") {
		this._guardStandalone();
		this.leave();
		if (!globalThis.BroadcastChannel)
			throw new Error("This browser does not support nearby tabs.");
		this.mode = "local";
		this.ended = false;
		this.me = uniqueId();
		this._joined = Date.now();
		this.room =
			String(room)
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9-]/g, "")
				.slice(0, 32) || "jungle";
		this._channel = new BroadcastChannel(
			`pitfallin-expedition-v1-${this.room}`,
		);
		this._channel.onmessage = (event) => this._receive(event.data);
		this._roster.set(this.me, {
			id: this.me,
			joined: this._joined,
			seen: Date.now(),
		});
		this._refreshLocalRoster();
		this._send({ kind: "hello", joined: this._joined });
		this._heartbeat = setInterval(() => {
			this._send({ kind: "hello", joined: this._joined, reply: false });
			const cutoff = Date.now() - 10000;
			for (const [id, p] of this._roster)
				if (id !== this.me && p.seen < cutoff) {
					this._roster.delete(id);
					this._call("onLeave", id);
				}
			this._refreshLocalRoster();
		}, 3000);
		return this.room;
	}
	startRace() {
		this._guardStandalone();
		if (!this.active) throw new Error("Connect to an expedition first.");
		if (this.me !== this.host)
			throw new Error("The expedition leader starts the race.");
		const startAt = Date.now() + 3000;
		this.ended = false;
		this._send({ kind: "start", startAt });
		this._beginStandalone(startAt);
	}
	_beginStandalone(startAt) {
		this.started = true;
		this.ended = false;
		this._reported = false;
		this.startAt = Math.max(Date.now(), Number(startAt) || Date.now());
		this._call("onStart", {
			hub: false,
			me: this.me,
			players: this.players,
			host: this.host,
			in: Math.max(0, this.startAt - Date.now()),
			startAt: this.startAt,
		});
	}
	async _description(peer, type) {
		await peer.pc.setLocalDescription(
			await (type === "offer" ? peer.pc.createOffer() : peer.pc.createAnswer()),
		);
		if (peer.pc.iceGatheringState !== "complete")
			await new Promise((resolve) => {
				const timer = setTimeout(done, 7000);
				function done() {
					clearTimeout(timer);
					peer.pc.removeEventListener("icegatheringstatechange", check);
					resolve();
				}
				function check() {
					if (peer.pc.iceGatheringState === "complete") done();
				}
				peer.pc.addEventListener("icegatheringstatechange", check);
			});
		return {
			type: peer.pc.localDescription.type,
			sdp: peer.pc.localDescription.sdp,
		};
	}
	_rtcPeer(id, isHost) {
		const pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		const peer = { id, pc, channel: null };
		const bind = (channel) => {
			peer.channel = channel;
			channel.onmessage = (event) => {
				try {
					this._receive(JSON.parse(event.data), peer);
				} catch {
					/* Ignore malformed packets. */
				}
			};
			channel.onopen = () => {
				if (this.me === this.host) this._publishRtcRoster();
				this._status(
					`${[...this._peers.values()].filter((p) => p.channel?.readyState === "open").length + 1}/4 explorers connected`,
				);
			};
			channel.onclose = () => {
				this._call("onLeave", id);
				if (this.me === this.host) this._publishRtcRoster();
				this._status("An explorer disconnected");
			};
		};
		if (isHost)
			bind(pc.createDataChannel("pitfallin-ghosts", { ordered: true }));
		else pc.ondatachannel = (event) => bind(event.channel);
		pc.onconnectionstatechange = () => {
			if (pc.connectionState === "failed")
				this._status(
					"Connection failed. Create fresh codes; some networks require AI Hub.",
				);
		};
		this._peers.set(id, peer);
		return peer;
	}
	_publishRtcRoster() {
		const ids = [
			this.me,
			...[...this._peers.values()]
				.filter((p) => p.channel?.readyState === "open")
				.map((p) => p.id),
		];
		this.players = ids.map((id, i) => ({
			id,
			name: `Explorer ${i + 1}`,
			color: SEAT_COLORS[i],
		}));
		this._send({ kind: "roster", players: this.players });
	}
	async createOffer() {
		this._guardStandalone();
		if (!globalThis.RTCPeerConnection)
			throw new Error("WebRTC is unavailable. Use nearby tabs or AI Hub.");
		if (this.mode !== "rtc" || this.me !== this.host) {
			this.leave();
			this.mode = "rtc";
			this.ended = false;
			this.me = "host";
			this.host = this.me;
			this.players = [
				{ id: this.me, name: "Explorer 1", color: SEAT_COLORS[0] },
			];
		}
		if (this._peers.size >= 3)
			throw new Error(
				"All four expedition seats are reserved. Leave to start a new camp.",
			);
		const id = uniqueId();
		const peer = this._rtcPeer(id, true);
		this._status("Gathering an invitation…");
		const description = await this._description(peer, "offer");
		this._status("Invitation ready. Send it to a friend; paste their reply.");
		return utfEncode({ game: "pitfallin-v1", id, description });
	}
	async acceptOffer(code) {
		this._guardStandalone();
		let offer;
		try {
			offer = utfDecode(code);
		} catch {
			throw new Error("That invitation code is incomplete.");
		}
		if (
			offer.game !== "pitfallin-v1" ||
			offer.description?.type !== "offer" ||
			!offer.id
		)
			throw new Error("That is not a Pitfallin’ invitation.");
		this.leave();
		this.mode = "rtc";
		this.ended = false;
		this.me = offer.id;
		this.host = "host";
		this.players = [
			{ id: "host", name: "Explorer 1", color: SEAT_COLORS[0] },
			{ id: this.me, name: "Explorer 2", color: SEAT_COLORS[1] },
		];
		const peer = this._rtcPeer("host", false);
		await peer.pc.setRemoteDescription(offer.description);
		this._status("Gathering your reply…");
		const description = await this._description(peer, "answer");
		this._status("Reply ready. Send it back to the leader.");
		return utfEncode({ game: "pitfallin-v1", id: offer.id, description });
	}
	async acceptAnswer(code) {
		this._guardStandalone();
		let answer;
		try {
			answer = utfDecode(code);
		} catch {
			throw new Error("That reply code is incomplete.");
		}
		const peer = this._peers.get(answer.id);
		if (
			answer.game !== "pitfallin-v1" ||
			answer.description?.type !== "answer" ||
			!peer
		)
			throw new Error(
				"That reply does not match an invitation from this camp.",
			);
		await peer.pc.setRemoteDescription(answer.description);
		this._status("Connecting explorers…");
	}
	end() {
		this.ended = true;
		this.started = false;
	}
	leave() {
		if (this.hubActive) return;
		if (this.active && !this.ended) this._send({ kind: "leave" });
		this._channel?.close();
		this._channel = null;
		clearInterval(this._heartbeat);
		for (const peer of this._peers.values()) {
			peer.channel && (peer.channel.onclose = null);
			peer.channel?.close();
			peer.pc.close();
		}
		this._peers.clear();
		this._roster.clear();
		for (const p of this.players)
			if (p.id !== this.me) this._call("onLeave", p.id);
		this.players = [];
		this.me = null;
		this.host = null;
		this.mode = "solo";
		this.started = false;
		this.ended = false;
		this._reported = false;
	}
	inspect() {
		return {
			mode: this.mode,
			active: this.active,
			hubActive: this.hubActive,
			started: this.started,
			ended: this.ended,
			players: this.players.map((p) => ({ ...p })),
			me: this.me,
			host: this.host,
			sent: this.sent,
			received: this.received,
			reported: this._reported,
			status: this.status || "",
		};
	}
}
