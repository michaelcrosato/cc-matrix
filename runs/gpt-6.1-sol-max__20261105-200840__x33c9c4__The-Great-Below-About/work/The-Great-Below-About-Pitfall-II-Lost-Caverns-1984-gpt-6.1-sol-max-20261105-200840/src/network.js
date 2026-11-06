import { Peer } from "peerjs";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomId = () =>
	Array.from(
		crypto.getRandomValues(new Uint8Array(6)),
		(n) => alphabet[n % alphabet.length],
	).join("");
const COLORS = ["#e7a65a", "#72c3d1", "#b5cb7b", "#e68c8a"];
export class TrailNetwork {
	constructor(onChange = () => {}, onStart = () => {}) {
		this.onChange = onChange;
		this.onStart = onStart;
		this.active = false;
		this.hub = false;
		this.ghosts = new Map();
		this.roster = new Map();
		this.seq = 0;
		this.connections = new Map();
		this.seen = new Map();
		this.error = "";
		this.status = "";
		this.sent = 0;
		this.received = 0;
	}
	attachHub(info) {
		this.hub = true;
		this.active = true;
		this.info = info;
		this.me = String(info.me);
		this.host = info.isHost;
		for (const p of info.players) this.roster.set(String(p.id), p);
		AIHub.on("message", (data, from) => {
			if (data?.kind === "trail" && data.state)
				this.acceptState(String(from), data.state);
		});
		AIHub.on("leave", ({ id }) => {
			this.ghosts.delete(String(id));
			this.roster.delete(String(id));
			this.onChange();
		});
	}
	create() {
		this.open(randomId(), true);
		return this.code;
	}
	join(code) {
		code = code
			.toUpperCase()
			.replace(/[^A-Z2-9]/g, "")
			.slice(0, 6);
		if (code.length !== 6) {
			this.error = "Enter the six-letter expedition code.";
			this.onChange();
			return;
		}
		this.open(code, false);
	}
	open(code, host) {
		this.close();
		this.code = code;
		this.me = randomId();
		this.host = host;
		this.active = true;
		this.seq = 0;
		this.error = "";
		this.status = host
			? "Room open · waiting for explorers"
			: "Finding the expedition…";
		this.roster.set(this.me, {
			id: this.me,
			name: host ? "Explorer 1" : "Explorer",
			color: COLORS[0],
		});
		this.channel = new BroadcastChannel("below-about-room-" + code);
		this.channel.onmessage = (e) => this.receive(e.data);
		if (!host) {
			this.helloTimer = setInterval(() => this.send("hello", {}), 750);
			this.send("hello", {});
		}
		this.setupPeer();
		this.onChange();
	}
	setupPeer() {
		if (this.hub) return;
		try {
			this.peer = new Peer(
				this.host ? "great-below-about-" + this.code : undefined,
				{ debug: 0, ...(this.peerOptions || {}) },
			);
			this.peer.on("open", () => {
				if (!this.host) {
					const conn = this.peer.connect("great-below-about-" + this.code, {
						reliable: true,
					});
					this.bindConnection(conn);
				}
				this.onChange();
			});
			this.peer.on("connection", (conn) => {
				if (!this.host || this.connections.size >= 3) {
					conn.close();
					return;
				}
				this.bindConnection(conn);
			});
			this.peer.on("error", (error) => {
				if (error.type === "unavailable-id" && this.host)
					this.error = "That code is in use online. Create another room.";
				else if (this.roster.size < 2)
					this.status = this.host
						? "Room open locally · internet relay unavailable"
						: "Searching locally · internet relay unavailable";
				this.onChange();
			});
			this.peer.on("disconnected", () => {
				if (this.active) {
					this.status = "Internet relay disconnected · local room remains open";
					this.onChange();
				}
			});
		} catch (e) {
			this.status = "Local room open";
			this.onChange();
		}
	}
	bindConnection(conn) {
		conn.on("open", () => {
			this.connections.set(conn.peer, conn);
			if (!this.host) this.send("hello", {});
			this.onChange();
		});
		conn.on("data", (data) => this.receive(data));
		conn.on("close", () => {
			this.connections.delete(conn.peer);
			this.onChange();
		});
		conn.on("error", () => {
			this.status = "A trail connection was interrupted";
			this.onChange();
		});
	}
	send(kind, data = {}) {
		if (!this.active || this.hub) return;
		const msg = {
			game: "below-about",
			from: this.me,
			seq: ++this.seq,
			kind,
			...data,
		};
		this.seen.set(msg.from + ":" + msg.seq, performance.now());
		this.channel?.postMessage(msg);
		for (const conn of this.connections.values()) if (conn.open) conn.send(msg);
		this.sent++;
	}
	receive(msg) {
		if (
			!this.active ||
			this.hub ||
			msg?.game !== "below-about" ||
			!msg.from ||
			msg.from === this.me
		)
			return;
		const key = msg.from + ":" + msg.seq;
		if (this.seen.has(key)) return;
		this.seen.set(key, performance.now());
		this.received++;
		if (this.seen.size > 500) {
			const keys = [...this.seen.keys()].slice(0, 200);
			for (const k of keys) this.seen.delete(k);
		}
		if (this.host) {
			this.channel?.postMessage(msg);
			for (const c of this.connections.values()) if (c.open) c.send(msg);
		}
		if (msg.kind === "hello" && this.host) {
			if (this.roster.size >= 4 && !this.roster.has(msg.from)) {
				this.send("full", { to: msg.from });
				return;
			}
			if (!this.roster.has(msg.from))
				this.roster.set(msg.from, {
					id: msg.from,
					name: "Explorer " + (this.roster.size + 1),
					color: COLORS[this.roster.size],
				});
			this.status = this.roster.size + " explorers on the trail";
			this.send("welcome", { roster: [...this.roster.values()] });
		}
		if (msg.kind === "welcome") {
			for (const p of msg.roster || []) this.roster.set(String(p.id), p);
			if (this.roster.has(this.me)) {
				clearInterval(this.helloTimer);
				this.status =
					this.roster.size + " explorers · waiting for the trail leader";
			}
		}
		if (msg.kind === "full" && msg.to === this.me) {
			this.error = "This expedition already has four explorers.";
			clearInterval(this.helloTimer);
		}
		if (msg.kind === "state" && this.roster.has(msg.from))
			this.acceptState(msg.from, msg.state);
		if (msg.kind === "start") {
			this.racing = true;
			this.ghosts.clear();
			this.onStart();
		}
		if (msg.kind === "leave") {
			this.roster.delete(msg.from);
			this.ghosts.delete(msg.from);
			if (this.host)
				this.send("welcome", { roster: [...this.roster.values()] });
			this.status = "An explorer left the trail";
		}
		this.onChange();
	}
	acceptState(id, state) {
		if (!state || !Number.isFinite(state.x) || !Number.isFinite(state.y))
			return;
		const p = this.roster.get(id) || { name: "Explorer", color: COLORS[1] };
		this.ghosts.set(id, {
			...state,
			id,
			name: p.name,
			color: p.color,
			last: performance.now(),
		});
	}
	begin() {
		if (this.hub || !this.host) return;
		this.racing = true;
		this.ghosts.clear();
		this.send("start");
		this.onStart();
	}
	broadcast(state) {
		if (!this.active) return;
		const s = {
			x: state.x,
			y: state.y,
			face: state.face,
			mode: state.mode,
			score: state.score,
			found: Object.values(state.rescued).filter(Boolean).length,
			finished: state.finished,
			time: state.time,
		};
		if (this.hub) {
			AIHub.send({ kind: "trail", state: s }, { reliable: false });
			this.sent++;
		} else this.send("state", { state: s });
	}
	getGhosts() {
		const now = performance.now();
		return [...this.ghosts.values()].filter((g) => now - g.last < 12000);
	}
	close() {
		if (this.active && !this.hub) this.send("leave");
		clearInterval(this.helloTimer);
		this.active = false;
		this.racing = false;
		this.channel?.close();
		this.channel = null;
		for (const c of this.connections.values()) c.close();
		this.connections.clear();
		this.peer?.destroy();
		this.peer = null;
		this.ghosts.clear();
		this.roster.clear();
		this.seen.clear();
		this.code = "";
		this.error = "";
		this.status = "";
	}
}
