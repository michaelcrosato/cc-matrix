/** Grit Bros multiplayer. AI Hub Session Protocol v1; same-origin room transport outside the hub. */
const STILL = Object.freeze({ x: 0, jump: false, action: false, drop: false });
const safeInput = (input = {}) => ({
	x: Math.max(-1, Math.min(1, Number(input.x) || 0)),
	jump: !!input.jump,
	action: !!input.action,
	drop: !!input.drop,
});
const roomCode = () =>
	Array.from(
		crypto.getRandomValues(new Uint8Array(6)),
		(n) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 32],
	).join("");

export class GritNet {
	constructor(callbacks = {}) {
		this.callbacks = callbacks;
		this.hub = null;
		this.isHost = true;
		this.server = false;
		this.me = 0;
		this.players = [{ id: 0, name: "Pip", color: "#ffb23f" }];
		this.started = false;
		this.ended = false;
		this.reported = false;
		this.channel = null;
		this.code = "";
		this.peer = "";
		this.token = roomCode() + roomCode();
		this.remoteInput = { ...STILL };
		this.remoteAt = 0;
		this.inputById = new Map();
		this.inputPacketById = new Map();
		this.inputAtById = new Map();
		this.packet = 0;
		this.lastPacket = -1;
		this.elapsed = 0;
		this.pending = { ...STILL };
		this.lastReceive = 0;
		this.unsub = [];
	}

	get active() {
		return !!this.hub || !!this.channel;
	}
	get connected() {
		return !!this.hub || !!this.peer;
	}
	get count() {
		return this.hub ? this.players.length : this.peer ? 2 : 1;
	}
	get canPlay() {
		return !this.ended && (!this.hub || (this.started && this.hub.time() >= 0));
	}
	get countdown() {
		return this.hub ? Math.max(0, Math.ceil(-this.hub.time() / 1000)) : 0;
	}

	async connect() {
		const client = globalThis.AIHub;
		if (!client?.active) return null;
		const info = await client.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) return null;
		this.hub = client;
		this.isHost = !!info.isHost;
		this.server = !!info.server;
		this.me = info.me;
		this.players = info.players.slice();
		this.unsub.push(
			client.on("start", () => {
				this.started = true;
				this.callbacks.onStart?.(this.info());
			}),
		);
		this.unsub.push(
			client.on("message", (data, from) => this.receive(data, from)),
		);
		this.unsub.push(
			client.on("leave", ({ id, reason }) => {
				this.players = this.players.filter((player) => player.id !== id);
				this.remoteInput = { ...STILL };
				this.inputById.delete(id);
				this.callbacks.onLeave?.(id, reason);
			}),
		);
		this.unsub.push(
			client.on("time-up", () => {
				if (this.isHost)
					this.finish(this.callbacks.getResult?.() || { score: 0, won: false });
			}),
		);
		this.unsub.push(
			client.on("end", ({ reason }) => {
				this.ended = true;
				this.remoteInput = { ...STILL };
				this.callbacks.onEnd?.(reason);
			}),
		);
		return info;
	}

	info() {
		return {
			isHost: this.isHost,
			server: this.server,
			me: this.me,
			players: this.players.slice(),
			count: this.count,
			hub: !!this.hub,
			code: this.code,
		};
	}

	ready() {
		this.hub?.ready();
	}
	fail(message) {
		this.hub?.fail(message);
	}

	/** Call every rendered frame. Host receives true only after the synchronized start. */
	tick(dt, localInput = STILL, snapshotProvider) {
		if (this.ended) return false;
		if (!this.active) return true;
		this.elapsed += Math.min(0.25, Math.max(0, dt));
		const input = safeInput(localInput);
		this.pending.x = input.x;
		this.pending.jump ||= input.jump;
		this.pending.action ||= input.action;
		this.pending.drop ||= input.drop;
		if (this.elapsed >= 1 / 15 && (!this.hub || this.started)) {
			this.elapsed = 0;
			if (this.isHost) {
				const state =
					typeof snapshotProvider === "function"
						? snapshotProvider()
						: snapshotProvider;
				if (state !== undefined) this.send({ t: "s", n: this.packet++, state });
			} else {
				this.send({ t: "i", n: this.packet++, input: this.pending });
			}
			this.pending = { ...STILL, x: input.x };
		}
		if (this.remoteAt && performance.now() - this.remoteAt > 1200)
			this.remoteInput = { ...STILL };
		for (const [id, at] of this.inputAtById)
			if (performance.now() - at > 1200) this.inputById.delete(id);
		return this.isHost && this.canPlay;
	}

	/** Host's seat-ordered controls. localSecond is used for native same-screen co-op outside a network room. */
	inputs(localInput = STILL, localSecond = STILL) {
		if (this.hub) {
			const result = [{ ...STILL }, { ...STILL }];
			for (const player of this.players) {
				if (player.id < 0 || player.id > 1) continue;
				result[player.id] =
					player.id === this.me && !this.server
						? safeInput(localInput)
						: { ...(this.inputById.get(player.id) || STILL) };
			}
			return result;
		}
		return this.channel
			? [safeInput(localInput), { ...this.remoteInput }]
			: [safeInput(localInput), safeInput(localSecond)];
	}

	send(data) {
		if (this.ended) return false;
		if (this.hub)
			return this.hub.send(
				data,
				this.isHost
					? { reliable: false }
					: { to: this.hub.host, reliable: false },
			);
		if (this.channel && this.peer) {
			this.channel.postMessage({ ...data, sender: this.token, to: this.peer });
			return true;
		}
		return false;
	}

	receive(data, from) {
		if (this.ended || !data || typeof data !== "object") return;
		if (this.isHost && data.t === "i") {
			if (
				this.hub &&
				!this.players.some(
					(player) => player.id === from && player.id !== this.me,
				)
			)
				return;
			const previous = this.inputPacketById.get(from) ?? -1;
			if (!(Number.isFinite(data.n) && data.n > previous)) return;
			this.inputPacketById.set(from, data.n);
			this.remoteAt = performance.now();
			this.remoteInput = safeInput(data.input);
			this.inputById.set(from, this.remoteInput);
			this.inputAtById.set(from, this.remoteAt);
		} else if (!this.isHost && data.t === "s") {
			if (this.hub && from !== this.hub.host) return;
			if (!(Number.isFinite(data.n) && data.n > this.lastPacket)) return;
			this.lastPacket = data.n;
			this.lastReceive = performance.now();
			this.callbacks.onSnapshot?.(data.state);
		}
	}

	/** Team result: every player ties. The host alone reports to AI Hub. */
	finish({ score = 0, won = false, stats = {} } = {}) {
		if (this.reported || this.ended || !this.isHost) return;
		this.reported = true;
		if (this.hub) {
			const ids = this.players.map((player) => player.id);
			this.hub.finish({
				standings: [ids],
				scores: Object.fromEntries(ids.map((id) => [id, Number(score) || 0])),
				won: !!won,
				stats: Object.fromEntries(ids.map((id) => [id, stats])),
			});
		}
	}

	/** Same-origin tab rooms work without a signaling service, account, or game server. */
	hostRoom(code = roomCode()) {
		if (this.hub) return null;
		this.leaveRoom();
		this.isHost = true;
		this.me = 0;
		this.code =
			String(code)
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, "")
				.slice(0, 12) || roomCode();
		this.openChannel();
		this.callbacks.onStatus?.(
			`Room ${this.code} · waiting for partner in another tab`,
		);
		return this.code;
	}

	joinRoom(code) {
		if (this.hub) return false;
		this.leaveRoom();
		this.isHost = false;
		this.me = 1;
		this.code = String(code)
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, "")
			.slice(0, 12);
		if (!this.code) {
			this.isHost = true;
			this.me = 0;
			return false;
		}
		this.openChannel();
		this.callbacks.onStatus?.(`Looking for room ${this.code}…`);
		const hello = () =>
			this.channel?.postMessage({ t: "hello", sender: this.token });
		hello();
		this.helloTimer = setInterval(hello, 700);
		this.connectTimer = setTimeout(() => {
			if (!this.peer)
				this.callbacks.onStatus?.(
					"Room not found. Use the same browser and page address.",
				);
		}, 6000);
		return true;
	}

	openChannel() {
		this.ended = false;
		this.reported = false;
		this.lastPacket = -1;
		this.packet = 0;
		this.inputPacketById.clear();
		this.channel = new BroadcastChannel("grit-bros-v1-" + this.code);
		this.channel.onmessage = ({ data }) => {
			if (
				!data ||
				data.sender === this.token ||
				(data.to && data.to !== this.token)
			)
				return;
			if (data.t === "hello" && this.isHost) {
				if (this.peer && this.peer !== data.sender) {
					this.channel.postMessage({
						t: "full",
						sender: this.token,
						to: data.sender,
					});
					return;
				}
				const fresh = !this.peer;
				if (fresh) {
					this.inputPacketById.clear();
					this.inputById.clear();
				}
				this.peer = data.sender;
				this.channel.postMessage({
					t: "welcome",
					sender: this.token,
					to: this.peer,
				});
				if (fresh) this.roomStarted();
			} else if (data.t === "welcome" && !this.isHost && !this.peer) {
				this.peer = data.sender;
				clearInterval(this.helloTimer);
				clearTimeout(this.connectTimer);
				this.roomStarted();
			} else if (data.t === "full" && !this.isHost && !this.peer) {
				clearInterval(this.helloTimer);
				this.callbacks.onStatus?.("That room already has two players.");
			} else if (data.sender === this.peer && data.t === "bye") {
				this.peer = "";
				this.inputPacketById.clear();
				this.inputById.clear();
				this.remoteInput = { ...STILL };
				this.callbacks.onLeave?.(this.isHost ? 1 : 0, "left");
				this.callbacks.onStatus?.("Partner left the room.");
				if (!this.isHost) this.callbacks.onEnd?.("partner-left");
			} else if (data.sender === this.peer)
				this.receive(data, this.isHost ? 1 : 0);
		};
	}

	roomStarted() {
		this.started = true;
		this.players = [
			{ id: 0, name: "Pip", color: "#ffb23f" },
			{ id: 1, name: "Roo", color: "#61d2c8" },
		];
		this.callbacks.onStatus?.(`Room ${this.code} · partner connected`);
		this.callbacks.onStart?.(this.info());
	}

	leaveRoom() {
		if (this.channel) {
			this.channel.postMessage({ t: "bye", sender: this.token, to: this.peer });
			this.channel.close();
		}
		clearInterval(this.helloTimer);
		clearTimeout(this.connectTimer);
		this.channel = null;
		this.code = "";
		this.peer = "";
		this.remoteInput = { ...STILL };
		if (!this.hub) {
			this.isHost = true;
			this.server = false;
			this.me = 0;
			this.started = false;
			this.ended = false;
			this.reported = false;
			this.players = [{ id: 0, name: "Pip", color: "#ffb23f" }];
		}
	}

	dispose() {
		this.leaveRoom();
		for (const off of this.unsub) off();
		this.unsub.length = 0;
	}
}
