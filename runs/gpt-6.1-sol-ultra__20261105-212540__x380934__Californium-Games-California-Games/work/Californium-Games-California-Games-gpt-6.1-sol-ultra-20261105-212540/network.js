// Standalone room score attack. The AI Hub session client owns its own transport.
const ROOM_PREFIX = "californium-games-";
const COLORS = ["#ff6954", "#42bec1", "#b7db61", "#f2bb4c"];
const MAX_PLAYERS = 4;
const cleanScore = (value) =>
	Math.max(0, Math.min(1e9, Math.round(Number(value) || 0)));
const roomCode = () =>
	Array.from(
		crypto.getRandomValues(new Uint8Array(6)),
		(n) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 32],
	).join("");
let peerModule;
async function getPeer() {
	if (globalThis.Peer) return globalThis.Peer;
	peerModule ||= import("https://esm.sh/peerjs@1.5.5?bundle");
	return (await peerModule).default;
}
export class FestivalNetwork {
	constructor({
		onStart = () => {},
		onScores = () => {},
		onStatus = () => {},
	} = {}) {
		this.onStart = onStart;
		this.onScores = onScores;
		this.onStatus = onStatus;
		this.peer = null;
		this.connections = new Map();
		this.hostConnection = null;
		this.room = "";
		this.isHost = false;
		this.me = 0;
		this.players = [];
		this.connected = false;
		this.running = false;
		this.round = 0;
		this._epoch = 0;
		this._startTimer = null;
		this._clockOffset = 0;
		this.status = "Share a room. Shred together.";
	}
	get snapshot() {
		return {
			room: this.room,
			isHost: this.isHost,
			me: this.me,
			players: this.players.map((p) => ({ ...p })),
			connected: this.connected,
			running: this.running,
			round: this.round,
			status: this.status,
		};
	}
	_status(text) {
		this.status = text;
		this.onStatus(text, this.snapshot);
	}
	_scores() {
		this.onScores(this.players.map((p) => ({ ...p })));
	}
	_player(id) {
		return {
			id,
			name: `Rider ${id + 1}`,
			color: COLORS[id],
			event: "lobby",
			score: 0,
			total: 0,
			finished: false,
			connected: true,
		};
	}
	_send(connection, data) {
		if (connection?.open) {
			try {
				connection.send(data);
			} catch {
				/* The close handler removes disconnected riders. */
			}
		}
	}
	_broadcast(data) {
		for (const connection of this.connections.values())
			this._send(connection, data);
	}
	_publish() {
		this._broadcast({
			type: "roster",
			players: this.players,
			round: this.round,
			running: this.running,
		});
		this._scores();
	}
	async _openPeer(id, epoch) {
		const Peer = await getPeer();
		if (epoch !== this._epoch) throw new Error("Room cancelled.");
		const peer = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 });
		this.peer = peer;
		return new Promise((resolve, reject) => {
			let settled = false;
			const timeout = setTimeout(() => {
				if (settled) return;
				settled = true;
				peer.destroy();
				const error = new Error("Room service took too long. Try again.");
				this._status(error.message);
				reject(error);
			}, 14000);
			peer.on("open", () => {
				if (settled) return;
				settled = true;
				clearTimeout(timeout);
				resolve(peer);
			});
			peer.on("error", (error) => {
				const message =
					error.type === "unavailable-id"
						? "That room code is busy. Create a new room."
						: error.type === "peer-unavailable"
							? "Room not found. Check the code and try again."
							: "Connection interrupted. Check your network and try again.";
				this._status(message);
				if (!settled) {
					settled = true;
					clearTimeout(timeout);
					reject(new Error(message));
				}
			});
			peer.on("disconnected", () => {
				if (epoch === this._epoch)
					this._status(
						"Room service disconnected. Riders already connected can keep playing.",
					);
			});
		});
	}
	async createRoom() {
		if (globalThis.AIHub?.active)
			throw new Error("AI Hub manages this session.");
		this.disconnect(false);
		const epoch = this._epoch;
		this.isHost = true;
		this.room = roomCode();
		this._status("Opening your beach room…");
		try {
			const peer = await this._openPeer(ROOM_PREFIX + this.room, epoch);
			if (epoch !== this._epoch) throw new Error("Room cancelled.");
			this.me = 0;
			this.players = [this._player(0)];
			this.connected = true;
			peer.on("connection", (connection) => this._accept(connection, epoch));
			this._status(`Room ${this.room} · waiting for riders`);
			this._scores();
			return this.room;
		} catch (error) {
			if (epoch === this._epoch) {
				this.connected = false;
				this.peer?.destroy();
				this.peer = null;
			}
			throw error;
		}
	}
	_accept(connection, epoch) {
		connection.on("open", () => {
			if (epoch !== this._epoch) {
				connection.close();
				return;
			}
			if (this.running || this.players.length >= MAX_PLAYERS) {
				this._send(connection, {
					type: "rejected",
					reason: this.running
						? "Festival is already rolling. Join the next one."
						: "This beach room is full.",
				});
				setTimeout(() => connection.close(), 250);
				return;
			}
			let seat = 1;
			while (this.players.some((p) => p.id === seat)) seat++;
			this.connections.set(seat, connection);
			this.players.push(this._player(seat));
			this._send(connection, {
				type: "welcome",
				seat,
				room: this.room,
				players: this.players,
				round: this.round,
			});
			this._publish();
			this._status(`Room ${this.room} · ${this.players.length} riders ready`);
			connection.on("data", (data) => {
				if (!data || typeof data !== "object" || epoch !== this._epoch) return;
				if (data.type === "clock")
					this._send(connection, {
						type: "clock",
						sent: data.sent,
						hostTime: Date.now(),
					});
				if (data.type === "score") {
					const player = this.players.find((p) => p.id === seat);
					if (!player || !this.running) return;
					this._applyScore(player, data);
					this._publish();
				}
			});
			connection.on("close", () => {
				if (epoch !== this._epoch || this.connections.get(seat) !== connection)
					return;
				this.connections.delete(seat);
				if (this.running) {
					const p = this.players.find((p) => p.id === seat);
					if (p) p.connected = false;
				} else this.players = this.players.filter((p) => p.id !== seat);
				this._publish();
				this._status(`Rider ${seat + 1} left the room.`);
			});
		});
		connection.on("error", () => {
			if (epoch === this._epoch)
				this._status("A rider could not connect. They can try joining again.");
		});
	}
	async joinRoom(code) {
		if (globalThis.AIHub?.active)
			throw new Error("AI Hub manages this session.");
		code = String(code || "")
			.trim()
			.toUpperCase()
			.replace(/[^A-Z2-9]/g, "");
		if (code.length !== 6)
			throw new Error("Enter the six-character room code.");
		this.disconnect(false);
		const epoch = this._epoch;
		this.room = code;
		this._status(`Finding room ${code}…`);
		try {
			const peer = await this._openPeer(null, epoch);
			if (epoch !== this._epoch) throw new Error("Room cancelled.");
			const connection = peer.connect(ROOM_PREFIX + code, { reliable: true });
			this.hostConnection = connection;
			return await new Promise((resolve, reject) => {
				let joined = false;
				const fail = (message) => {
					if (joined) return;
					joined = true;
					clearTimeout(timeout);
					this._status(message);
					connection.close();
					reject(new Error(message));
				};
				const timeout = setTimeout(
					() => fail("Room not found. Check the code and try again."),
					14000,
				);
				connection.on("open", () =>
					this._send(connection, { type: "clock", sent: Date.now() }),
				);
				connection.on("error", () =>
					fail("Could not reach the room. Try again."),
				);
				connection.on("data", (data) => {
					if (!data || typeof data !== "object" || epoch !== this._epoch)
						return;
					if (data.type === "rejected") {
						fail(String(data.reason || "Room unavailable."));
						return;
					}
					if (data.type === "welcome") {
						if (joined) return;
						joined = true;
						clearTimeout(timeout);
						this.me = data.seat;
						this.players = data.players;
						this.round = data.round;
						this.connected = true;
						this._status(`Room ${this.room} · waiting for the host`);
						this._scores();
						resolve(true);
					}
					if (
						data.type === "clock" &&
						Number.isFinite(data.sent) &&
						Number.isFinite(data.hostTime)
					)
						this._clockOffset = data.hostTime - (data.sent + Date.now()) / 2;
					if (data.type === "roster") {
						this.players = data.players;
						this.round = data.round;
						this.running = !!data.running;
						this._scores();
					}
					if (data.type === "start") {
						this.round = data.round;
						this.running = true;
						this._status("Festival starts in 3… 2… 1…");
						this.onStart({
							startAt: data.startAt - this._clockOffset,
							seed: data.seed,
							round: data.round,
							network: true,
						});
					}
				});
				connection.on("close", () => {
					if (epoch !== this._epoch) return;
					if (!joined) fail("Room not found. Check the code and try again.");
					else {
						this.connected = false;
						this.running = false;
						this._status(
							"Host disconnected. Your current run can continue solo.",
						);
					}
				});
			});
		} catch (error) {
			if (epoch === this._epoch) {
				this.connected = false;
				this.peer?.destroy();
				this.peer = null;
			}
			throw error;
		}
	}
	startFestival() {
		if (!this.isHost || !this.connected) return false;
		this.players = this.players
			.filter((p) => p.connected)
			.map((p) => this._player(p.id));
		this.running = true;
		this.round++;
		const data = {
			type: "start",
			startAt: Date.now() + 3000,
			seed: crypto.getRandomValues(new Uint32Array(1))[0],
			round: this.round,
		};
		this._publish();
		this._broadcast(data);
		this._status("Festival starts in 3… 2… 1…");
		this.onStart({
			startAt: data.startAt,
			seed: data.seed,
			round: data.round,
			network: true,
		});
		return true;
	}
	_applyScore(player, data) {
		player.event = ["skate", "surf", "bmx", "finish"].includes(data.event)
			? data.event
			: "skate";
		player.score = cleanScore(data.score);
		player.total = cleanScore(data.total);
		player.finished = !!data.finished;
	}
	sendScore(data) {
		if (!this.connected || !this.running) return false;
		const player = this.players.find((p) => p.id === this.me);
		if (player) this._applyScore(player, data);
		if (this.isHost) this._publish();
		else {
			this._send(this.hostConnection, { ...data, type: "score" });
			this._scores();
		}
		return true;
	}
	disconnect(notify = true) {
		this._epoch++;
		clearTimeout(this._startTimer);
		for (const connection of this.connections.values()) connection.close();
		this.connections.clear();
		this.hostConnection?.close();
		this.peer?.destroy();
		this.peer = null;
		this.hostConnection = null;
		this.connected = false;
		this.running = false;
		this.room = "";
		this.isHost = false;
		this.players = [];
		this.me = 0;
		this.round = 0;
		this._clockOffset = 0;
		if (notify) {
			this._status("Room closed. Catch you on the coast.");
			this._scores();
		}
	}
}
