/** Hockey Ruckus networking. AI Hub Session Protocol v1, BroadcastChannel, and manual WebRTC. */
export class HockeyNet {
	constructor(callbacks = {}) {
		Object.assign(this, callbacks);
		this.role = "none";
		this.mode = "offline";
		this.connected = false;
		this.signal = "";
		this.roomCode = "";
		this.team = 0;
		this.players = [];
		this.server = false;
		this.hub = false;
		this.isHub = false;
		this.ended = false;
		this.sequence = 0;
		this._lastInputAt = -Infinity;
		this._lastSnapshotAt = -Infinity;
		this._lastInputSequence = new Map();
		this._lastSnapshotSequence = -1;
		this._token = this._id(12);
		this._peerToken = null;
		this._timers = new Set();
		this._unsubscribers = [];
		this._lastScores = [0, 0];
		this._pendingEdges = {
			pass: false,
			check: false,
			switch: false,
			shoot: false,
		};
		this._didFinish = false;
	}

	_id(length = 6) {
		const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		const bytes = new Uint8Array(length);
		if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
		else
			for (let i = 0; i < bytes.length; i++)
				bytes[i] = Math.floor(Math.random() * 256);
		return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join(
			"",
		);
	}

	_emit(name, ...args) {
		if (typeof this[name] === "function") this[name](...args);
	}

	_status(text) {
		this.status = text;
		this._emit("onStatus", text, this);
	}

	_timer(fn, ms, interval = false) {
		const id = interval
			? setInterval(fn, ms)
			: setTimeout(() => {
					this._timers.delete(id);
					fn();
				}, ms);
		this._timers.add(id);
		return id;
	}

	async init() {
		const hub = globalThis.AIHub;
		if (!hub?.active) return null;
		const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) return null;
		this.hub = true;
		this.isHub = true;
		this.mode = "hub";
		this.info = info;
		this.role = info.isHost ? "host" : "guest";
		this.server = info.server === true;
		this.team = this.server
			? -1
			: Math.max(
					0,
					info.players.findIndex((player) => player.id === info.me),
				) % 2;
		this.players = info.players.slice();
		this.connected = true;
		this.ended = false;
		this._unsubscribers.push(
			hub.on("message", (message, from) => {
				if (this.ended || !message || message.hockey !== 1) return;
				if (message.type === "input" && this.role === "host") {
					if (
						!this.players.some((player) => player.id === from) ||
						from === info.me
					)
						return;
					this._receiveInput(message, from, this._teamFor(from));
				} else if (
					message.type === "snapshot" &&
					this.role === "guest" &&
					from === info.host
				) {
					this._receiveSnapshot(message);
				}
			}),
		);
		this._unsubscribers.push(
			hub.on("start", (event) => {
				this._didFinish = false;
				this._lastInputSequence.clear();
				this._lastSnapshotSequence = -1;
				this._status("AI Hub match");
				this._emit("onStart", {
					hub: true,
					mode: "online",
					time: 180,
					duration: 180,
					turbo: false,
					theme: 0,
					countdownMs: Math.max(0, event.in || 3000),
					info,
				});
			}),
		);
		this._unsubscribers.push(
			hub.on("time-up", (event) => {
				if (this.ended) return;
				this._emit("onTimeUp", event);
				if (this.role === "host" && !this._didFinish)
					this.finish(this._lastScores);
			}),
		);
		this._unsubscribers.push(
			hub.on("leave", (event) => {
				const team = this._teamFor(event.id);
				this.players = this.players.filter((player) => player.id !== event.id);
				this._emit("onDisconnect", {
					hub: true,
					id: event.id,
					team,
					reason: event.reason,
				});
			}),
		);
		this._unsubscribers.push(
			hub.on("end", (event) => {
				this.ended = true;
				this.connected = false;
				this._status("AI Hub round ended");
				this._emit("onEnd", event);
			}),
		);
		this._status("AI Hub · waiting for the puck drop");
		this._emit("onHub", info);
		return info;
	}

	_teamFor(id) {
		const roster = this.info?.players || this.players;
		return (
			Math.max(
				0,
				roster.findIndex((player) => player.id === id),
			) % 2
		);
	}

	/** Call once after renderer and physics are ready; the hub owns the pre-round card. */
	ready() {
		if (this.hub && !this.ended) globalThis.AIHub.ready();
	}

	/** Create a WebRTC offer, or pass {local:true} for a same-browser-origin room code. */
	async createRoom(options = {}) {
		if (this.hub) return "";
		if (options.local || options === "local") return this.createLocalRoom();
		this.leave();
		this.role = "host";
		this.team = 0;
		this.mode = "rtc";
		this.roomCode = this._id();
		this._status("Making a direct connection invitation…");
		const pc = this._makePeerConnection();
		this._attachChannel(
			pc.createDataChannel("hockey-ruckus", { ordered: true }),
		);
		await pc.setLocalDescription(await pc.createOffer());
		await this._gatherIce(pc);
		if (this.pc !== pc) return "";
		this.signal = this._encodeSignal(pc.localDescription);
		this._status("Invitation ready · send it to your opponent");
		this._emit("onSignal", this.signal);
		return this.signal;
	}

	createLocalRoom() {
		if (this.hub) return "";
		this.leave();
		if (typeof BroadcastChannel !== "function")
			throw new Error(
				"Quick rooms are unavailable in this browser. Use a direct connection.",
			);
		this.role = "host";
		this.team = 0;
		this.mode = "broadcast";
		this.roomCode = this._id();
		this._openBroadcast(this.roomCode);
		this._status("Quick room " + this.roomCode + " · waiting for player 2");
		return this.roomCode;
	}

	/** A six-character quick-room code, or the full direct-connection invitation. */
	async joinRoom(code) {
		if (this.hub) return "";
		const text = String(code || "").trim();
		if (/^[A-Z2-9]{6}$/i.test(text)) {
			this.leave();
			if (typeof BroadcastChannel !== "function")
				throw new Error("Quick rooms are unavailable in this browser.");
			this.role = "guest";
			this.team = 1;
			this.mode = "broadcast";
			this.roomCode = text.toUpperCase();
			this._openBroadcast(this.roomCode);
			this._status("Looking for quick room " + this.roomCode + "…");
			this._broadcast({ type: "join" });
			let tries = 0;
			this._joinTimer = this._timer(
				() => {
					if (this.connected) {
						clearInterval(this._joinTimer);
						this._timers.delete(this._joinTimer);
					} else if (++tries > 20) {
						clearInterval(this._joinTimer);
						this._timers.delete(this._joinTimer);
						this._status(
							"Room not found. Both copies must use the same website or file.",
						);
					} else this._broadcast({ type: "join" });
				},
				500,
				true,
			);
			return "";
		}
		const signal = this._decodeSignal(text);
		if (signal.description.type !== "offer")
			throw new Error(
				"Join needs the host’s invitation. Hosts use Accept answer.",
			);
		this.leave();
		this.mode = "rtc";
		this.role = "guest";
		this.team = 1;
		this.roomCode = signal.room;
		this._status("Preparing your direct connection answer…");
		const pc = this._makePeerConnection();
		await pc.setRemoteDescription(signal.description);
		await pc.setLocalDescription(await pc.createAnswer());
		await this._gatherIce(pc);
		if (this.pc !== pc) return "";
		this.signal = this._encodeSignal(pc.localDescription);
		this._status("Answer ready · send it back to the host");
		this._emit("onSignal", this.signal);
		return this.signal;
	}

	async receiveSignal(text) {
		if (this.hub) return false;
		const signal = this._decodeSignal(String(text || "").trim());
		if (signal.description.type === "offer") return this.joinRoom(text);
		if (!this.pc || this.role !== "host")
			throw new Error("Make an invitation before accepting an answer.");
		if (signal.room !== this.roomCode)
			throw new Error("That answer belongs to a different invitation.");
		await this.pc.setRemoteDescription(signal.description);
		this._status("Answer accepted · connecting…");
		return true;
	}

	getSignal() {
		return this.signal;
	}

	_makePeerConnection() {
		if (typeof RTCPeerConnection !== "function")
			throw new Error("Direct connections need WebRTC in this browser.");
		const pc = (this.pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		}));
		pc.ondatachannel = (event) => this._attachChannel(event.channel);
		pc.onconnectionstatechange = () => {
			if (this.pc !== pc) return;
			if (pc.connectionState === "failed") {
				this.connected = false;
				this._status(
					"Direct connection failed. Try the same network or use AI Hub.",
				);
				this._emit("onDisconnect", { reason: "connection-failed" });
			} else if (pc.connectionState === "disconnected")
				this._status("Connection interrupted · trying to reconnect…");
			else if (
				pc.connectionState === "connected" &&
				this.channel?.readyState === "open"
			)
				this._markConnected();
		};
		return pc;
	}

	_gatherIce(pc) {
		if (pc.iceGatheringState === "complete") return Promise.resolve();
		return new Promise((resolve) => {
			let timeout;
			const done = () => {
				clearTimeout(timeout);
				pc.removeEventListener("icegatheringstatechange", change);
				resolve();
			};
			const change = () => {
				if (pc.iceGatheringState === "complete") done();
			};
			pc.addEventListener("icegatheringstatechange", change);
			timeout = setTimeout(done, 5000);
		});
	}

	_attachChannel(channel) {
		this.channel = channel;
		channel.onopen = () => {
			this._markConnected();
			this._send({ type: "hello" }, true);
		};
		channel.onmessage = (event) => {
			let data;
			try {
				data = JSON.parse(event.data);
			} catch {
				return;
			}
			if (data?.hockey === 1) this._receive(data);
		};
		channel.onclose = () => {
			if (this.channel !== channel) return;
			const wasConnected = this.connected;
			this.connected = false;
			this._status("Opponent disconnected");
			if (wasConnected)
				this._emit("onDisconnect", {
					reason: "channel-closed",
					team: this.role === "host" ? 1 : 0,
				});
		};
		channel.onerror = () =>
			this._status("Connection error · check the invitation and try again");
	}

	_encodeSignal(description) {
		const data = JSON.stringify({
			hockey: 1,
			version: 1,
			room: this.roomCode,
			description: { type: description.type, sdp: description.sdp },
		});
		return "HR1." + btoa(unescape(encodeURIComponent(data)));
	}

	_decodeSignal(text) {
		let data;
		try {
			const json = text.startsWith("HR1.")
				? decodeURIComponent(escape(atob(text.slice(4))))
				: text;
			data = JSON.parse(json);
		} catch {
			throw new Error(
				"Paste the complete invitation or answer, beginning HR1.",
			);
		}
		if (
			data?.hockey !== 1 ||
			data.version !== 1 ||
			!data.room ||
			!["offer", "answer"].includes(data.description?.type) ||
			typeof data.description.sdp !== "string"
		) {
			throw new Error("This is not a Hockey Ruckus connection code.");
		}
		return data;
	}

	_openBroadcast(code) {
		const channel = (this.broadcast = new BroadcastChannel(
			"hockey-ruckus-v1-" + code,
		));
		channel.onmessage = (event) => {
			const data = event.data;
			if (!data || data.hockey !== 1 || data.token === this._token) return;
			if (data.to && data.to !== this._token) return;
			if (data.type === "join" && this.role === "host") {
				if (this._peerToken && this._peerToken !== data.token) return;
				this._peerToken = data.token;
				this._broadcast({ type: "welcome" });
				this._lastPeerAt = performance.now();
				this._markConnected();
				return;
			}
			if (data.type === "welcome" && this.role === "guest") {
				if (this._peerToken && this._peerToken !== data.token) return;
				this._peerToken = data.token;
				this._lastPeerAt = performance.now();
				this._markConnected();
				return;
			}
			if (!this._peerToken || data.token !== this._peerToken) return;
			this._lastPeerAt = performance.now();
			if (data.type === "bye") {
				this.connected = false;
				this._peerToken = null;
				this._status("Opponent left the room");
				this._emit("onDisconnect", {
					reason: "left",
					team: this.role === "host" ? 1 : 0,
				});
			} else if (data.type !== "heartbeat") this._receive(data);
		};
		this._timer(
			() => {
				if (!this.connected) return;
				this._broadcast({ type: "heartbeat" });
				if (performance.now() - this._lastPeerAt > 6500) {
					this.connected = false;
					this._peerToken = null;
					this._status("Opponent disconnected");
					this._emit("onDisconnect", {
						reason: "timeout",
						team: this.role === "host" ? 1 : 0,
					});
				}
			},
			1500,
			true,
		);
	}

	_broadcast(message) {
		if (!this.broadcast || this.ended) return false;
		this.broadcast.postMessage({
			hockey: 1,
			...message,
			token: this._token,
			to: this._peerToken,
		});
		return true;
	}

	_markConnected() {
		const changed = !this.connected;
		this.connected = true;
		this.ended = false;
		this._status(
			this.role === "host"
				? "Player 2 connected · ready to face off"
				: "Connected · waiting for the host to face off",
		);
		if (changed)
			this._emit("onConnected", {
				role: this.role,
				team: this.team,
				mode: this.mode,
			});
	}

	_send(message, reliable = false) {
		if (this.ended || !this.connected) return false;
		const data = { hockey: 1, ...message };
		if (this.hub)
			return globalThis.AIHub.send(data, {
				to: this.role === "guest" ? this.info.host : undefined,
				reliable,
			});
		if (this.mode === "broadcast") return this._broadcast(message);
		if (
			this.channel?.readyState === "open" &&
			this.channel.bufferedAmount < 262144
		) {
			this.channel.send(JSON.stringify(data));
			return true;
		}
		return false;
	}

	_receive(message) {
		if (this.ended) return;
		if (message.type === "hello") return;
		if (message.type === "input" && this.role === "host")
			this._receiveInput(message, 1, 1);
		else if (message.type === "snapshot" && this.role === "guest")
			this._receiveSnapshot(message);
		else if (message.type === "start" && this.role === "guest") {
			this._didFinish = false;
			this._lastSnapshotSequence = -1;
			this._emit("onStart", {
				...message.config,
				hub: false,
				countdownMs: message.config?.countdownMs ?? 1800,
			});
		} else if (message.type === "finish" && this.role === "guest")
			this._emit("onFinish", message.result);
	}

	_receiveInput(message, id, team) {
		if (
			!message.input ||
			typeof message.input !== "object" ||
			!Number.isFinite(message.sequence)
		)
			return;
		if (message.sequence <= (this._lastInputSequence.get(id) ?? -1)) return;
		this._lastInputSequence.set(id, message.sequence);
		this._emit("onRemoteInput", message.input, team, id);
	}

	_receiveSnapshot(message) {
		if (
			!message.snapshot ||
			!Number.isFinite(message.sequence) ||
			message.sequence <= this._lastSnapshotSequence
		)
			return;
		this._lastSnapshotSequence = message.sequence;
		this._emit("onSnapshot", message.snapshot);
	}

	/** Call every frame; actual transport is capped at 15 Hz, including unchanged input. */
	sendInput(input) {
		if (this.role !== "guest" || !this.connected || this.ended || this.server)
			return false;
		for (const key of ["pass", "check", "switch", "shoot"])
			this._pendingEdges[key] ||= input[key] === true;
		const now = performance.now();
		if (now - this._lastInputAt < 66) return false;
		this._lastInputAt = now;
		const sent = this._send({
			type: "input",
			input: { ...input, ...this._pendingEdges },
			sequence: ++this.sequence,
		});
		if (sent)
			for (const key of ["pass", "check", "switch", "shoot"])
				this._pendingEdges[key] = false;
		return sent;
	}

	/** Call every frame on the authority. Snapshots include enough state to render the full rink. */
	sendSnapshot(snapshot) {
		if (this.role !== "host" || !this.connected || this.ended) return false;
		const now = performance.now();
		if (now - this._lastSnapshotAt < 66) return false;
		this._lastSnapshotAt = now;
		if (Array.isArray(snapshot?.scores))
			this._lastScores = snapshot.scores.slice(0, 2);
		return this._send({
			type: "snapshot",
			snapshot,
			sequence: ++this.sequence,
		});
	}

	startMatch(config = {}) {
		if (this.hub || this.role !== "host" || !this.connected || this.ended)
			return false;
		this._didFinish = false;
		this._lastInputSequence.clear();
		const setup = { ...config, countdownMs: config.countdownMs ?? 1800 };
		this._send({ type: "start", config: setup }, true);
		this._emit("onStart", { ...setup, hub: false });
		return true;
	}

	/** Team scores, blue then gold. Hub standings always include every player still present. */
	finish(scores = [0, 0], stats = {}) {
		if (this.role !== "host" || this._didFinish || this.ended) return false;
		this._didFinish = true;
		this._lastScores = scores.map((value) =>
			Number.isFinite(value) ? value : 0,
		);
		if (this.hub) {
			const scored = this.players.map((player) => ({
				id: player.id,
				score: this._lastScores[this._teamFor(player.id)] ?? 0,
			}));
			scored.sort((a, b) => b.score - a.score || a.id - b.id);
			const standings = [];
			let lastScore;
			for (const player of scored) {
				if (player.score === lastScore)
					standings[standings.length - 1].push(player.id);
				else standings.push([player.id]);
				lastScore = player.score;
			}
			globalThis.AIHub.finish({
				standings,
				scores: Object.fromEntries(
					scored.map((player) => [player.id, player.score]),
				),
				stats,
			});
		} else {
			this._send(
				{ type: "finish", result: { scores: this._lastScores, stats } },
				true,
			);
		}
		return true;
	}

	/** Leaving/restarting is disabled in an AI Hub round; the hub owns the lifecycle. */
	leave() {
		if (this.hub) return false;
		if (this.broadcast && this.connected) this._broadcast({ type: "bye" });
		for (const timer of this._timers) {
			clearTimeout(timer);
			clearInterval(timer);
		}
		this._timers.clear();
		if (this.broadcast) {
			this.broadcast.close();
			this.broadcast = null;
		}
		const channel = this.channel;
		this.channel = null;
		if (channel) {
			channel.onclose = null;
			channel.close();
		}
		const pc = this.pc;
		this.pc = null;
		if (pc) {
			pc.onconnectionstatechange = null;
			pc.close();
		}
		this.connected = false;
		this.role = "none";
		this.team = 0;
		this.server = false;
		this.mode = "offline";
		this.signal = "";
		this.roomCode = "";
		this._peerToken = null;
		this._lastPeerAt = 0;
		this._lastInputAt = -Infinity;
		this._lastSnapshotAt = -Infinity;
		this._lastInputSequence.clear();
		this._lastSnapshotSequence = -1;
		for (const key of ["pass", "check", "switch", "shoot"])
			this._pendingEdges[key] = false;
		this.ended = false;
		this._didFinish = false;
		return true;
	}
}
