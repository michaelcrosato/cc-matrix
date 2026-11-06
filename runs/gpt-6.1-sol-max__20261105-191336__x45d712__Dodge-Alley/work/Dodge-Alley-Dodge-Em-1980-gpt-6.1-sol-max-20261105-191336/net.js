import { Peer } from "peerjs";
const COLORS = ["#92f1c7", "#ffce70", "#b2a0ed", "#ff796c"];
export class RoomNet {
	constructor(onEvent) {
		this.onEvent = onEvent;
		this.uid = crypto.randomUUID();
		this.seq = 0;
		this.seen = new Set();
		this.links = new Map();
		this.players = [];
		this.lastSeen = new Map();
		this.connected = false;
		this.isHost = false;
		this.online = false;
		this.closed = false;
		this.clock = 0;
		this.joinTimer = 0;
	}
	emit(type, data = {}) {
		this.onEvent({ type, ...data });
	}
	async open(code = null) {
		this.isHost = code === null;
		this.code =
			code ||
			String((crypto.getRandomValues(new Uint32Array(1))[0] % 9000) + 1000);
		this.closed = false;
		if (this.isHost) {
			this.players = [
				{ id: this.uid, seat: 0, name: "DRIVER 1", color: COLORS[0] },
			];
			this.connected = true;
			this.emit("roster", { players: this.players, me: this.uid });
		}
		if ("BroadcastChannel" in window) {
			this.bc = new BroadcastChannel("dodge-alley-" + this.code);
			this.bc.onmessage = (e) => this.receive(e.data, null);
		}
		this.peer = new Peer(
			this.isHost ? "dodge-alley-v1-" + this.code : undefined,
			{ debug: 0 },
		);
		this.peer.on("open", () => {
			if (this.closed) return;
			this.online = true;
			this.emit("status", {
				text: this.isHost
					? "Internet room is open. Share the code."
					: "Finding your room…",
			});
			if (!this.isHost) {
				const conn = this.peer.connect("dodge-alley-v1-" + this.code, {
					reliable: true,
					serialization: "json",
				});
				this.attach(conn);
			}
		});
		this.peer.on("connection", (conn) => this.attach(conn));
		this.peer.on("error", (err) => {
			if (this.closed) return;
			this.online = false;
			const text =
				err.type === "unavailable-id"
					? "That code is busy. Back out and create another room."
					: this.connected
						? "Local room active. Internet signalling is unavailable."
						: "Room not found yet. Check the code and try again.";
			this.emit("status", { text });
		});
		if (!this.isHost) this.send({ t: "join" });
		return this.code;
	}
	attach(conn) {
		conn.on("open", () => {
			if (this.closed) {
				conn.close();
				return;
			}
			this.links.set(conn.peer, conn);
			if (!this.isHost) this.send({ t: "join" });
		});
		conn.on("data", (data) => this.receive(data, conn));
		conn.on("error", () => {});
		conn.on("close", () => {
			this.links.delete(conn.peer);
		});
	}
	send(payload) {
		if (this.closed) return;
		const e = {
			channel: "dodge-alley-v1",
			room: this.code,
			from: this.uid,
			id: this.uid + "." + ++this.seq,
			payload,
		};
		this.seen.add(e.id);
		this.broadcast(e);
	}
	broadcast(e, except = null) {
		try {
			this.bc?.postMessage(e);
		} catch {}
		for (const conn of this.links.values()) {
			if (conn !== except && conn.open)
				try {
					conn.send(e);
				} catch {}
		}
	}
	receive(e, conn) {
		if (
			this.closed ||
			!e ||
			e.channel !== "dodge-alley-v1" ||
			e.room !== this.code ||
			e.from === this.uid ||
			this.seen.has(e.id)
		)
			return;
		this.seen.add(e.id);
		if (this.seen.size > 1000)
			this.seen.delete(this.seen.values().next().value);
		const p = e.payload;
		if (!p || typeof p.t !== "string") return;
		this.lastSeen.set(e.from, performance.now());
		if (this.isHost && conn) this.broadcast(e, conn);
		if (p.t === "join" && this.isHost) {
			if (
				!this.players.some((x) => x.id === e.from) &&
				this.players.length < 4 &&
				!this.racing
			) {
				const seat = [0, 1, 2, 3].find(
					(s) => !this.players.some((x) => x.seat === s),
				);
				this.players.push({
					id: e.from,
					seat,
					name: "DRIVER " + (seat + 1),
					color: COLORS[seat],
				});
			}
			this.send({ t: "roster", players: this.players });
			this.emit("roster", { players: this.players, me: this.uid });
		}
		if (p.t === "roster" && !this.isHost && Array.isArray(p.players)) {
			this.players = p.players.slice(0, 4);
			this.connected = this.players.some((x) => x.id === this.uid);
			this.emit("roster", { players: this.players, me: this.uid });
			this.emit("status", {
				text: "Connected. Waiting for the host to start.",
			});
		}
		if (p.t === "start") {
			this.racing = true;
			this.emit("start", { seed: p.seed, startAt: p.startAt });
		}
		if (p.t === "ghost" && this.players.some((x) => x.id === e.from))
			this.emit("ghost", { id: e.from, ...p.data });
		if (p.t === "result" && this.players.some((x) => x.id === e.from))
			this.emit("result", { id: e.from, score: p.score });
		if (p.t === "leave" && this.isHost) {
			this.players = this.players.filter((x) => x.id !== e.from);
			this.send({ t: "roster", players: this.players });
			this.emit("roster", { players: this.players, me: this.uid });
		}
		if (p.t === "host-left" && !this.isHost) {
			this.emit("host-left");
			this.close(false);
		}
		if (p.t === "lobby") {
			this.racing = false;
			this.emit("lobby");
		}
	}
	start() {
		if (!this.isHost || this.players.length < 2) return false;
		const seed = crypto.getRandomValues(new Uint32Array(1))[0],
			startAt = Date.now() + 3200;
		this.racing = true;
		this.send({ t: "start", seed, startAt });
		this.emit("start", { seed, startAt });
		return true;
	}
	lobby() {
		if (!this.isHost) return;
		this.racing = false;
		this.send({ t: "lobby" });
		this.emit("lobby");
	}
	tick(dt) {
		if (this.closed) return;
		this.clock += dt;
		this.joinTimer += dt;
		if (this.clock > 2) {
			this.clock = 0;
			this.send({ t: "ping" });
		}
		if (!this.connected && !this.isHost && this.joinTimer > 1) {
			this.joinTimer = 0;
			this.send({ t: "join" });
		}
		if (this.isHost) {
			const now = performance.now();
			const gone = this.players.filter(
				(p) =>
					p.id !== this.uid && now - (this.lastSeen.get(p.id) || now) > 12000,
			);
			if (gone.length) {
				this.players = this.players.filter((p) => !gone.includes(p));
				this.send({ t: "roster", players: this.players });
				this.emit("roster", { players: this.players, me: this.uid });
			}
		}
	}
	close(notify = true) {
		if (this.closed) return;
		if (notify) this.send({ t: this.isHost ? "host-left" : "leave" });
		this.closed = true;
		this.bc?.close();
		for (const c of this.links.values()) c.close();
		this.links.clear();
		this.peer?.destroy();
	}
}
