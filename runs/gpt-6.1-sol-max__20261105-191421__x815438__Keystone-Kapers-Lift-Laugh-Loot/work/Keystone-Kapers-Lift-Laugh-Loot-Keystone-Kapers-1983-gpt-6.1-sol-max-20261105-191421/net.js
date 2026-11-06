import Peer from "peerjs";

export class Network {
	constructor(callbacks) {
		Object.assign(this, callbacks);
		this.hub = window.AIHub;
		this.hubActive = !!this.hub?.active;
		this.role = "solo";
		this.localId = 0;
		this.roster = [{ id: 0, name: "Officer Pip", color: "#4586a3" }];
		this.connections = new Map();
		this.tokens = new Map();
		this.gone = new Set();
		this.finished = false;
		this.lastSend = 0;
		this.pendingJump = 0;
		this.pendingWhistle = 0;
		this.remoteCounters = new Map();
		this.token = crypto.randomUUID();
		this.code = "";
		this.sent = 0;
		this.received = 0;
	}
	get isHost() {
		return this.role !== "client";
	}
	get active() {
		return this.hubActive || this.role !== "solo";
	}
	async connectHub() {
		if (!this.hubActive) return null;
		const h = this.hub;
		h.on("message", (data, from) => {
			if (this.finished) return;
			this.received++;
			if (h.isHost) {
				if (
					data?.t === "i" &&
					this.roster.some((p) => p.id === from) &&
					!this.gone.has(from)
				)
					this.receiveInput(from, data);
			} else if (from === h.host && data?.t === "s") this.onSnapshot(data.s);
		});
		h.on("start", () => {
			this.hubStarted = true;
			this.onStart({
				hub: true,
				seed: h.seed,
				roster: this.roster,
				server: h.server,
			});
		});
		h.on("leave", ({ id }) => {
			this.gone.add(id);
			this.roster = this.roster.filter((p) => p.id !== id);
			this.onRoster(this.roster);
		});
		h.on("time-up", () => {
			if (h.isHost) this.finish(false);
		});
		h.on("end", ({ reason }) => {
			this.finished = true;
			this.onEnd(reason);
		});
		const info = await h.connect({ mode: "shared-world", seats: [1, 4] });
		if (!info) {
			this.hubActive = false;
			return null;
		}
		this.role = info.isHost ? "host" : "client";
		this.localId = info.me;
		this.roster = info.players;
		this.server = info.server;
		this.seed = info.seed;
		this.onRoster(this.roster);
		return info;
	}
	ready() {
		if (this.hubActive) this.hub.ready();
	}
	receiveInput(id, data) {
		const old = this.remoteCounters.get(id) || { j: 0, w: 0 };
		const i = {
			axis: Math.max(-1, Math.min(1, Number(data.a) || 0)),
			duck: !!data.d,
			down: !!data.d,
			up: !!data.u,
			jump: data.j > old.j,
			whistle: data.w > old.w,
		};
		this.remoteCounters.set(id, { j: data.j, w: data.w });
		this.onInput(id, i);
	}
	update(input, snapshot, dt) {
		if (!this.active || this.finished) return;
		if (this.isHost && snapshot) this.latestSnapshot = snapshot;
		if (input.jump) this.pendingJump++;
		if (input.whistle) this.pendingWhistle++;
		this.sendTimer = (this.sendTimer || 0) + dt;
		if (this.sendTimer < 0.085) return;
		this.sendTimer = 0;
		if (this.isHost) {
			if (snapshot) this.send({ t: "s", s: snapshot });
		} else
			this.send({
				t: "i",
				a: input.axis,
				d: input.duck,
				u: input.up,
				j: this.pendingJump,
				w: this.pendingWhistle,
			});
	}
	send(data) {
		if (this.finished) return;
		this.sent++;
		if (this.hubActive)
			this.hub.send(data, {
				...(this.isHost ? {} : { to: this.hub.host }),
				reliable: false,
			});
		else if (this.role === "host") {
			for (const [token, conn] of this.connections) {
				if (conn === "bc")
					this.channel?.postMessage({
						...data,
						target: token,
						origin: this.token,
					});
				else if (conn.open) conn.send(data);
			}
		} else if (this.transport === "bc")
			this.channel?.postMessage({ ...data, origin: this.token });
		else if (this.connection?.open) this.connection.send(data);
	}
	finish(won, snapshot = this.latestSnapshot) {
		if (this.finished || !this.isHost) return;
		if (this.hubActive) {
			const ids = this.roster
				.map((p) => p.id)
				.filter((id) => !this.gone.has(id));
			const score = snapshot?.score ?? this.latestScore ?? 0;
			this.hub.finish({
				standings: [ids],
				scores: Object.fromEntries(ids.map((id) => [id, score])),
				won,
				stats: Object.fromEntries(
					ids.map((id) => [
						id,
						{
							"Recovered loot": snapshot?.recovered || 0,
							"Crooks caught": snapshot?.captures || 0,
						},
					]),
				),
			});
			this.finished = true;
		}
	}
	error(error, message) {
		this.lastError = {
			type: error.type || "unknown",
			message: error.message || String(error),
		};
		this.onStatus(message);
	}
	async host() {
		this.close(false);
		this.role = "host";
		this.localId = 0;
		this.finished = false;
		const values = new Uint32Array(1);
		crypto.getRandomValues(values);
		this.code = String(10000 + (values[0] % 90000));
		this.roster = [{ id: 0, name: "Officer Pip", color: "#4586a3" }];
		this.openChannel();
		this.peer = new Peer(`lll-room-${this.code}`, { debug: 0 });
		this.peer.on("open", () =>
			this.onStatus(
				`ROOM ${this.code} IS OPEN · Share the code with your partner.`,
			),
		);
		this.peer.on("connection", (conn) => {
			conn.on("open", () => {
				const token = conn.metadata?.token || conn.peer;
				this.addPartner(token, conn);
			});
			conn.on("data", (d) => {
				if (d?.t === "i")
					this.receiveInput(
						this.tokens.get(conn.metadata?.token || conn.peer),
						d,
					);
			});
			conn.on("close", () =>
				this.removePartner(conn.metadata?.token || conn.peer),
			);
		});
		this.peer.on("error", (e) =>
			this.error(
				e,
				e.type === "unavailable-id"
					? "That room is busy. Open a fresh room."
					: `Room ${this.code} works between tabs. Internet signalling is unavailable; try again shortly.`,
			),
		);
		this.onRoster(this.roster);
		this.onStatus(`ROOM ${this.code} · Waiting for a partner…`);
		this.heartbeat = setInterval(
			() => this.channel?.postMessage({ t: "ping", origin: this.token }),
			1000,
		);
		return this.code;
	}
	openChannel() {
		try {
			this.channel = new BroadcastChannel(`lll-${this.code}`);
			this.channel.onmessage = ({ data }) => {
				if (
					!data ||
					data.origin === this.token ||
					(data.target && data.target !== this.token)
				)
					return;
				this.received++;
				if (this.role === "host") {
					if (data.t === "join") this.addPartner(data.origin, "bc");
					else if (data.t === "i" && this.tokens.has(data.origin))
						this.receiveInput(this.tokens.get(data.origin), data);
					else if (data.t === "bye") this.removePartner(data.origin);
				} else if (this.role === "client") {
					if (data.t === "welcome") {
						this.transport = "bc";
						this.acceptWelcome(data);
					} else if (this.transport === "bc") this.clientData(data);
				}
			};
		} catch {
			this.channel = null;
		}
	}
	async join(code) {
		this.close(false);
		this.code = String(code).replace(/\D/g, "").slice(0, 5);
		if (this.code.length !== 5) {
			this.onStatus("Enter all five digits of the room code.");
			return;
		}
		this.role = "client";
		this.finished = false;
		this.transport = "";
		this.onStatus(`CALLING ROOM ${this.code}…`);
		this.openChannel();
		this.channel?.postMessage({ t: "join", origin: this.token });
		this.joinTimer = setTimeout(() => {
			if (this.transport === "bc" || this.role !== "client") return;
			this.peer = new Peer(`lll-officer-${crypto.randomUUID()}`, { debug: 0 });
			this.peer.on("open", () => {
				const conn = this.peer.connect(`lll-room-${this.code}`, {
					reliable: true,
					metadata: { token: this.token },
				});
				this.connection = conn;
				conn.on("open", () => {
					this.transport = "peer";
				});
				conn.on("data", (data) => this.clientData(data));
				conn.on("close", () => {
					if (this.role === "client") this.onEnd("host-left");
				});
				conn.on("error", (error) =>
					this.error(
						error,
						"Could not reach that room. Check the code and try again.",
					),
				);
			});
			this.peer.on("error", (error) =>
				this.error(
					error,
					"Could not reach that room. Check the code and internet connection.",
				),
			);
		}, 500);
		this.joinTimeout = setTimeout(() => {
			if (!this.welcomed)
				this.onStatus("No answer yet. Check the room code, then try again.");
		}, 12000);
	}
	addPartner(token, conn) {
		if (this.tokens.has(token)) return;
		if (this.roster.length >= 4) {
			if (conn !== "bc" && conn.open) conn.send({ t: "full" });
			return;
		}
		let id = 1;
		while (this.roster.some((p) => p.id === id)) id++;
		this.tokens.set(token, id);
		this.connections.set(token, conn);
		const names = [
			"Officer Pip",
			"Officer Moxie",
			"Officer Dots",
			"Officer Brass",
		];
		this.roster.push({
			id,
			name: names[id],
			color: ["#4586a3", "#76aea4", "#e76e40", "#705b70"][id],
		});
		const data = {
			t: "welcome",
			id,
			roster: this.roster,
			playing: !!this.playing,
			seed: this.seed || 1983,
		};
		if (conn === "bc")
			this.channel?.postMessage({ ...data, target: token, origin: this.token });
		else conn.send(data);
		this.send({ t: "roster", roster: this.roster });
		this.onRoster(this.roster);
		this.onStatus(
			`${this.roster.length} OFFICERS IN ROOM ${this.code} · Ready when you are!`,
		);
	}
	removePartner(token) {
		const id = this.tokens.get(token);
		if (id === undefined) return;
		this.tokens.delete(token);
		this.connections.delete(token);
		this.roster = this.roster.filter((p) => p.id !== id);
		this.send({ t: "roster", roster: this.roster });
		this.onRoster(this.roster);
		this.onStatus("An officer left the room. The shift goes on.");
	}
	acceptWelcome(data) {
		if (this.welcomed) return;
		this.welcomed = true;
		clearTimeout(this.joinTimeout);
		this.localId = data.id;
		this.roster = data.roster;
		this.seed = data.seed;
		this.onRoster(this.roster);
		this.onStatus(`JOINED ROOM ${this.code} · Waiting for the host to start.`);
		if (data.playing) this.onStart({ roster: this.roster, seed: this.seed });
	}
	clientData(data) {
		if (!data || this.finished) return;
		this.received++;
		if (data.t === "welcome") this.acceptWelcome(data);
		else if (data.t === "s") {
			this.onSnapshot(data.s);
		} else if (data.t === "start") {
			this.onStart({ roster: this.roster, seed: data.seed });
		} else if (data.t === "roster") {
			this.roster = data.roster;
			this.onRoster(this.roster);
		} else if (data.t === "closed") this.onEnd("host-left");
		else if (data.t === "full")
			this.onStatus("That squad is full. Up to four officers fit in a room.");
	}
	begin() {
		if (!this.isHost) return;
		this.playing = true;
		this.seed = Date.now() % 1000000;
		this.send({ t: "start", seed: this.seed });
		this.onStart({ roster: this.roster, seed: this.seed });
	}
	close(notify = true) {
		if (this.hubActive) return;
		if (notify && this.role === "host") this.send({ t: "closed" });
		if (notify && this.role === "client")
			this.channel?.postMessage({ t: "bye", origin: this.token });
		clearTimeout(this.joinTimer);
		clearTimeout(this.joinTimeout);
		clearInterval(this.heartbeat);
		this.channel?.close();
		this.channel = null;
		this.peer?.destroy();
		this.peer = null;
		this.connection?.close();
		this.connection = null;
		this.connections.clear();
		this.tokens.clear();
		this.remoteCounters.clear();
		this.role = "solo";
		this.localId = 0;
		this.code = "";
		this.playing = false;
		this.welcomed = false;
		this.finished = false;
		this.transport = "";
		this.pendingJump = 0;
		this.pendingWhistle = 0;
	}
}
