/* Solar Flair: authoritative shared-world co-op. AI Hub Session Protocol v1. */
class SolarNetwork {
	constructor(callbacks = {}) {
		this.cb = callbacks;
		this.role = "solo";
		this.transport = "none";
		this.connected = false;
		this.hub = Boolean(globalThis.AIHub?.active);
		this.info = null;
		this.started = false;
		this.ended = false;
		this.finished = false;
		this.readyRequested = false;
		this.tick = 0;
		this.seq = 0;
		this.lastSeq = -1;
		this.sent = 0;
		this.received = 0;
		this.maxPacketBytes = 0;
		this.oversizeDropped = 0;
		this.peerInput = { x: 0, y: 0, fire: false, boost: false, pulse: false };
		this.peerIds = new Set();
		this.latestSnapshot = null;
		this.pc = null;
		this.channel = null;
		this.listeners = [];
	}
	async init() {
		if (!this.hub) return null;
		const h = globalThis.AIHub;
		this.transport = "hub";
		this.cb.onStatus?.("AI Hub · linking flight computers");
		this.listeners.push(
			h.on("start", () => {
				this.startPending = true;
			}),
		);
		this.listeners.push(
			h.on("message", (data, from) => this.receive(data, from)),
		);
		this.listeners.push(
			h.on("leave", ({ id, reason }) => {
				this.peerIds.delete(id);
				this.cb.onInput?.(
					{ x: 0, y: 0, fire: false, boost: false, pulse: false },
					id,
				);
				this.cb.onPeer?.(this.peerIds.size > 0);
				this.cb.onStatus?.(`Wingmate left: ${reason}`);
			}),
		);
		this.listeners.push(
			h.on("time-up", () => {
				this.cb.onTimeUp?.();
				if (this.role === "host" && !this.finished)
					this.finish(
						false,
						this.latestSnapshot?.score || this.latestSnapshot?.s?.score || 0,
					);
			}),
		);
		this.listeners.push(
			h.on("end", ({ reason }) => {
				this.ended = true;
				this.started = false;
				this.cb.onEnd?.(reason);
				this.cb.onStatus?.("AI Hub · round ended");
			}),
		);
		this.info = await h.connect({ mode: "shared-world", seats: [1, 2] });
		if (!this.info) {
			this.hub = false;
			this.transport = "none";
			for (const off of this.listeners) off();
			this.listeners = [];
			return null;
		}
		this.role = this.info.isHost ? "host" : "guest";
		this.connected = true;
		for (const p of this.info.players)
			if (p.id !== this.info.me) this.peerIds.add(p.id);
		this.cb.onRole?.(this.role, this.info);
		this.cb.onPeer?.(this.info.players.length > 1 || this.info.server);
		this.cb.onStatus?.(
			this.info.server
				? "AI Hub · flight server"
				: `AI Hub · ${this.role === "host" ? "flight lead" : "wingmate"}`,
		);
		if (this.readyRequested) h.ready();
		return this.info;
	}
	ready() {
		if (this.readyRequested) return;
		this.readyRequested = true;
		if (this.hub && this.info) globalThis.AIHub.ready();
	}
	update(dt, snapshot, input) {
		if (this.ended) return;
		if (
			this.hub &&
			this.startPending &&
			!this.started &&
			globalThis.AIHub.time() >= 0
		) {
			this.started = true;
			this.cb.onStart?.();
		}
		if (snapshot) this.latestSnapshot = snapshot;
		if (!this.connected || !this.started) return;
		this.tick += dt;
		if (this.tick < 1 / 12) return;
		this.tick %= 1 / 12;
		if (this.role === "host" && snapshot)
			this.send({
				kind: "state",
				seq: this.seq++,
				packed: 1,
				state: this.packState(snapshot),
			});
		else if (this.role === "guest")
			this.send({ kind: "input", input: this.sanitizeInput(input) });
	}
	sanitizeInput(input = {}) {
		return {
			x: Math.max(-1, Math.min(1, Number(input.x) || 0)),
			y: Math.max(-1, Math.min(1, Number(input.y) || 0)),
			fire: Boolean(input.fire),
			boost: Boolean(input.boost),
			pulse: Boolean(input.pulse),
			aimX: Math.max(-55, Math.min(55, Number(input.aimX) || 0)),
			aimY: Math.max(-35, Math.min(35, Number(input.aimY) || 0)),
		};
	}
	packState(snapshot) {
		// Millimetre precision preserves flight while keeping Hub packets beneath 16 KB.
		const state = JSON.parse(
			JSON.stringify(snapshot, (_key, value) =>
				typeof value === "number" && Number.isFinite(value)
					? Math.round(value * 1000) / 1000
					: value,
			),
		);
		for (const key of ["entities", "bullets"]) {
			if (!Array.isArray(state[key]) || !state[key].length) continue;
			const keys = [
				...new Set(state[key].flatMap((item) => Object.keys(item))),
			];
			state[key] = {
				solarTable: 1,
				keys,
				rows: state[key].map((item) => keys.map((k) => item[k] ?? null)),
			};
		}
		return state;
	}
	unpackState(state) {
		for (const key of ["entities", "bullets"]) {
			const table = state[key];
			if (
				table?.solarTable !== 1 ||
				!Array.isArray(table.keys) ||
				!Array.isArray(table.rows)
			)
				continue;
			state[key] = table.rows.map((row) =>
				Object.fromEntries(
					table.keys.flatMap((k, i) => (row[i] === null ? [] : [[k, row[i]]])),
				),
			);
		}
		return state;
	}
	send(payload) {
		if (this.ended || !this.connected) return false;
		const data = { solarFlair: 1, ...payload };
		const text = JSON.stringify(data);
		const bytes = new TextEncoder().encode(text).byteLength;
		this.maxPacketBytes = Math.max(this.maxPacketBytes, bytes);
		if (this.transport === "hub") {
			if (bytes > 16000) {
				this.oversizeDropped++;
				return false;
			}
			const options =
				this.role === "guest"
					? { to: this.info.host, reliable: false }
					: { reliable: false };
			const ok = globalThis.AIHub.send(data, options);
			if (ok !== false) this.sent++;
			return ok;
		}
		if (this.channel?.readyState === "open") {
			if (this.channel.bufferedAmount > 262144) return false;
			this.channel.send(text);
			this.sent++;
			return true;
		}
		return false;
	}
	receive(data, from = "wingmate") {
		if (!data || data.solarFlair !== 1 || this.ended) return;
		this.received++;
		if (data.kind === "input" && this.role === "host") {
			this.peerInput = this.sanitizeInput(data.input);
			this.cb.onInput?.(this.peerInput, from);
		} else if (data.kind === "state" && this.role === "guest") {
			if (this.transport === "hub" && from !== this.info.host) return;
			if (Number(data.seq) <= this.lastSeq) return;
			this.lastSeq = Number(data.seq);
			this.cb.onState?.(
				data.packed ? this.unpackState(data.state) : data.state,
			);
		} else if (data.kind === "start" && this.role === "guest") {
			this.started = true;
			this.cb.onStart?.();
		} else if (data.kind === "finish") {
			this.cb.onFinish?.(Boolean(data.won), Number(data.score) || 0);
		}
	}
	finish(won, score = 0) {
		if (this.finished || this.role !== "host" || this.ended) return;
		this.finished = true;
		if (this.hub) {
			const ids = this.info.players
				.filter((p) => p.id === this.info.me || this.peerIds.has(p.id))
				.map((p) => p.id);
			const scores = Object.fromEntries(
				ids.map((id) => [id, Number(score) || 0]),
			);
			globalThis.AIHub.finish({ standings: [ids], scores, won: Boolean(won) });
		} else
			this.send({
				kind: "finish",
				won: Boolean(won),
				score: Number(score) || 0,
			});
	}
	async createPeer(role) {
		if (this.hub) throw new Error("AI Hub manages the squadron connection.");
		this.closePeer();
		if (!globalThis.RTCPeerConnection)
			throw new Error(
				"This browser does not support direct co-op connections.",
			);
		this.role = role;
		this.transport = "webrtc";
		this.ended = false;
		this.finished = false;
		this.started = false;
		this.seq = 0;
		this.lastSeq = -1;
		this.tick = 0;
		this.pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.pc.ondatachannel = (event) => this.attachChannel(event.channel);
		this.pc.onconnectionstatechange = () => {
			const state = this.pc?.connectionState;
			if (
				state === "failed" ||
				state === "disconnected" ||
				state === "closed"
			) {
				this.connected = false;
				this.peerInput = this.sanitizeInput();
				this.cb.onInput?.(this.peerInput, "wingmate");
				this.cb.onPeer?.(false);
				this.cb.onStatus?.(
					state === "disconnected"
						? "Wingmate signal lost · reconnecting"
						: "Wingmate disconnected",
				);
			}
		};
		this.cb.onRole?.(role, { server: false });
	}
	attachChannel(channel) {
		this.channel = channel;
		channel.onmessage = (event) => {
			try {
				this.receive(JSON.parse(event.data));
			} catch (_) {
				/* Ignore malformed remote packets. */
			}
		};
		channel.onopen = () => {
			this.connected = true;
			this.cb.onPeer?.(true);
			this.cb.onStatus?.("Squadron linked · two pilots, one mission");
			if (this.role === "host") {
				this.started = true;
				this.send({ kind: "start" });
				this.cb.onStart?.();
			}
		};
		channel.onclose = () => {
			this.connected = false;
			this.cb.onPeer?.(false);
		};
	}
	waitForIce() {
		const pc = this.pc;
		if (pc.iceGatheringState === "complete") return Promise.resolve();
		return new Promise((resolve) => {
			const timer = setTimeout(done, 7000);
			function check() {
				if (pc.iceGatheringState === "complete") done();
			}
			function done() {
				clearTimeout(timer);
				pc.removeEventListener("icegatheringstatechange", check);
				resolve();
			}
			pc.addEventListener("icegatheringstatechange", check);
		});
	}
	encodeDescription(description) {
		return (
			"SF1." +
			btoa(JSON.stringify({ type: description.type, sdp: description.sdp }))
		);
	}
	decodeDescription(code, expected) {
		try {
			const clean = String(code).trim();
			if (!clean.startsWith("SF1.")) throw new Error("Invalid code");
			const description = JSON.parse(atob(clean.slice(4)));
			if (description.type !== expected || typeof description.sdp !== "string")
				throw new Error("Wrong code type");
			return description;
		} catch (_) {
			throw new Error(`Paste a complete Solar Flair ${expected} code.`);
		}
	}
	async host() {
		await this.createPeer("host");
		this.cb.onStatus?.("Preparing invitation · gathering connection routes");
		this.attachChannel(
			this.pc.createDataChannel("solar-flair", { ordered: true }),
		);
		await this.pc.setLocalDescription(await this.pc.createOffer());
		await this.waitForIce();
		this.cb.onStatus?.("Invitation ready · send it to your wingmate");
		return this.encodeDescription(this.pc.localDescription);
	}
	async join(code) {
		const offer = this.decodeDescription(code, "offer");
		await this.createPeer("guest");
		this.cb.onStatus?.("Preparing reply · gathering connection routes");
		await this.pc.setRemoteDescription(offer);
		await this.pc.setLocalDescription(await this.pc.createAnswer());
		await this.waitForIce();
		this.cb.onStatus?.("Reply ready · send it back to the flight lead");
		return this.encodeDescription(this.pc.localDescription);
	}
	async accept(code) {
		if (this.role !== "host" || !this.pc)
			throw new Error("Create an invitation first.");
		await this.pc.setRemoteDescription(this.decodeDescription(code, "answer"));
		this.cb.onStatus?.("Reply accepted · linking flight computers");
	}
	closePeer() {
		if (this.channel) {
			this.channel.onclose = null;
			this.channel.close();
			this.channel = null;
		}
		if (this.pc) {
			this.pc.onconnectionstatechange = null;
			this.pc.close();
			this.pc = null;
		}
		this.connected = false;
	}
	leave() {
		if (this.hub) return false;
		this.closePeer();
		this.role = "solo";
		this.transport = "none";
		this.started = false;
		this.cb.onPeer?.(false);
		this.cb.onRole?.("solo", null);
		this.cb.onStatus?.("Solo flight");
		return true;
	}
	inspect() {
		return {
			role: this.role,
			transport: this.transport,
			hub: this.hub,
			connected: this.connected,
			started: this.started,
			ended: this.ended,
			finished: this.finished,
			sent: this.sent,
			received: this.received,
			maxPacketBytes: this.maxPacketBytes,
			oversizeDropped: this.oversizeDropped,
			server: Boolean(this.info?.server),
			peerInput: this.peerInput,
		};
	}
}
