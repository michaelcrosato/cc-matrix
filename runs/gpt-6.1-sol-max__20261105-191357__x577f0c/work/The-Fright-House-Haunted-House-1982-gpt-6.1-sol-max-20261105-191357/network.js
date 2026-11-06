const colors = ["#e6a16e", "#91c6c3", "#c9b1da", "#d2c78b"];
export class GhostRace {
	constructor(emit) {
		this.emit = emit;
		this.hub = window.AIHub;
		this.active = false;
		this.ended = false;
		this.roster = [];
		this.latest = new Map();
		this.results = new Map();
		this.recent = new Set();
		this.serial = 0;
		this.connections = new Map();
		this.host = false;
		this.uid = Array.from(crypto.getRandomValues(new Uint32Array(2))).join("-");
		this.me = 0;
		this.reported = false;
		this.internet = false;
	}
	async init() {
		if (!this.hub?.active) return;
		const info = await this.hub.connect({ mode: "ghost", seats: [1, 4] });
		if (!info) return;
		this.active = true;
		this.viaHub = true;
		this.me = info.me;
		this.roster = info.players;
		this.emit("lobby", {});
		this.hub.on("start", () => {
			this.reported = false;
			this.emit("start", { hub: true });
		});
		this.hub.on("message", (data, from) => {
			if (data?.kind === "ghost") this.ghost(from, data.state);
		});
		this.hub.on("leave", ({ id }) => {
			this.latest.delete(id);
			this.roster = this.roster.filter((p) => p.id !== id);
			this.emit("leave", { id });
		});
		this.hub.on("time-up", () => {
			this.emit("timeup", {});
		});
		this.hub.on("end", (data) => {
			this.ended = true;
			this.emit("end", data);
		});
	}
	ready() {
		if (this.viaHub) this.hub.ready();
	}
	ghost(id, state) {
		if (
			id === this.me ||
			!state ||
			!Number.isFinite(state.x) ||
			!Number.isFinite(state.z) ||
			!Number.isInteger(state.room) ||
			state.room < 0 ||
			state.room >= 24
		)
			return;
		this.latest.set(id, { ...state, received: performance.now() });
		this.emit("ghost", {
			id,
			state: this.latest.get(id),
			color: this.roster.find((p) => p.id === id)?.color,
		});
	}
	update(state) {
		if (!this.active || this.ended) return;
		const pack = {
			room: state.room,
			x: +state.x.toFixed(3),
			z: +state.z.toFixed(3),
			facing: state.facing,
			match: state.match > 0,
			parts: state.carried?.parts || 0,
			score: state.score(),
		};
		if (this.viaHub) {
			this.hub.send({ kind: "ghost", state: pack }, { reliable: false });
			if (!this.reported)
				this.hub.progress({
					score: pack.score,
					label: `${state.carried?.parts === 7 ? "Urn restored" : `${state.visited.size} rooms`} · ${state.lives} nerve`,
				});
		} else this.send("ghost", { id: this.me, state: pack });
	}
	result(model) {
		if (!this.active || this.reported || this.ended) return;
		this.reported = true;
		const r = {
			score: model.score(),
			time:
				model.result === "win"
					? this.viaHub
						? Math.max(0, this.hub.time())
						: Math.max(0, Date.now() - this.startAt)
					: null,
			stats: {
				Rooms: model.visited.size,
				Matches: model.matches,
				Nerve: model.lives,
			},
		};
		this.results.set(this.me, r);
		if (this.viaHub) {
			const result =
				r.time !== null
					? { time: r.time, stats: r.stats }
					: { score: r.score, stats: r.stats };
			this.hub.result(result);
		} else this.send("result", { id: this.me, result: r });
		this.emit("results", {});
	}
	hostRoom(code = null) {
		this.close();
		this.host = true;
		this.me = 0;
		this.active = true;
		this.code =
			code ||
			String(1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000));
		this.roster = [
			{ id: 0, name: "Explorer 1", color: colors[0], uid: this.uid },
		];
		this.channel();
		this.setupPeer(true);
		this.emit("lobby", {});
		return this.code;
	}
	joinRoom(code) {
		this.close();
		this.host = false;
		this.active = true;
		this.me = -1;
		this.code = String(code).replace(/\D/g, "").slice(0, 4);
		this.roster = [];
		this.channel();
		this.setupPeer(false);
		this.helloTimer = setInterval(() => {
			if (this.me < 0) this.send("hello", {});
		}, 700);
		this.joinTimeout = setTimeout(() => {
			if (this.me < 0)
				this.emit("status", {
					message:
						"Nobody answered. Check the code, or leave and try another network.",
				});
		}, 12000);
		this.send("hello", {});
		this.emit("lobby", {});
	}
	channel() {
		try {
			this.bc = new BroadcastChannel(`the-fright-house-v1-${this.code}`);
			this.bc.onmessage = (e) => {
				if (this.host)
					for (const c of this.connections.values()) if (c.open) c.send(e.data);
				this.receive(e.data);
			};
		} catch {
			this.bc = null;
		}
	}
	async setupPeer(host) {
		if (new URLSearchParams(location.search).has("localonly")) return;
		try {
			const { Peer } = await import("peerjs");
			if (!this.active) return;
			this.peer = host
				? new Peer(`fright-house-v1-${this.code}`, { debug: 0 })
				: new Peer(undefined, { debug: 0 });
			this.peer.on("error", (e) => {
				this.internet = false;
				this.emit("status", {
					message:
						e.type === "unavailable-id"
							? "That room number is taken online. Create another room."
							: "Internet link unavailable. Same-browser players can still join.",
				});
			});
			this.peer.on("open", () => {
				this.internet = true;
				this.emit("status", {
					message: host
						? "Room open. Share the four digits."
						: "Finding the house…",
				});
				if (!host) {
					const c = this.peer.connect(`fright-house-v1-${this.code}`, {
						reliable: true,
						serialization: "json",
					});
					this.attach(c);
				}
			});
			this.peer.on("connection", (c) => {
				if (host && this.connections.size < 3) this.attach(c);
				else c.close();
			});
		} catch {
			this.emit("status", { message: "Same-browser connection ready." });
		}
	}
	attach(c) {
		c.on("open", () => {
			this.connections.set(c.peer, c);
			if (!this.host) this.send("hello", {});
		});
		c.on("data", (msg) => {
			if (this.host) {
				this.bc?.postMessage(msg);
				for (const other of this.connections.values())
					if (other !== c && other.open) other.send(msg);
			}
			this.receive(msg);
		});
		c.on("close", () => this.connections.delete(c.peer));
		c.on("error", () => this.connections.delete(c.peer));
	}
	send(kind, data, to = null) {
		if (this.viaHub || this.ended) return;
		const msg = {
			v: 1,
			uid: this.uid,
			mid: `${this.uid}:${this.serial++}`,
			kind,
			data,
			to,
		};
		this.recent.add(msg.mid);
		this.bc?.postMessage(msg);
		for (const c of this.connections.values()) if (c.open) c.send(msg);
	}
	receive(msg) {
		if (msg?.v !== 1 || msg.uid === this.uid || this.recent.has(msg.mid))
			return;
		this.recent.add(msg.mid);
		if (this.recent.size > 1000)
			this.recent.delete(this.recent.values().next().value);
		if (msg.to && msg.to !== this.uid) return;
		const d = msg.data || {};
		if (msg.kind === "hello" && this.host) {
			let p = this.roster.find((p) => p.uid === msg.uid);
			if (!p) {
				if (this.roster.length >= 4) {
					this.send("full", {}, msg.uid);
					return;
				}
				const id = [0, 1, 2, 3].find(
					(id) => !this.roster.some((p) => p.id === id),
				);
				p = {
					id,
					name: `Explorer ${id + 1}`,
					color: colors[id],
					uid: msg.uid,
				};
				this.roster.push(p);
			}
			this.send("welcome", { id: p.id, roster: this.roster }, msg.uid);
			this.send("roster", { roster: this.roster });
			this.emit("lobby", {});
		} else if (msg.kind === "welcome" && !this.host) {
			this.me = d.id;
			this.roster = d.roster;
			clearInterval(this.helloTimer);
			clearTimeout(this.joinTimeout);
			this.emit("lobby", {});
		} else if (msg.kind === "roster") {
			this.roster = d.roster;
			this.emit("lobby", {});
		} else if (msg.kind === "start") {
			this.startAt = d.at;
			this.reported = false;
			this.results.clear();
			this.emit("start", { at: d.at });
		} else if (msg.kind === "ghost") this.ghost(d.id, d.state);
		else if (msg.kind === "result") {
			this.results.set(d.id, d.result);
			this.emit("results", {});
		} else if (msg.kind === "leave") {
			const id = this.roster.find((p) => p.uid === msg.uid)?.id;
			this.roster = this.roster.filter((p) => p.uid !== msg.uid);
			this.latest.delete(id);
			this.emit("leave", { id });
		} else if (msg.kind === "full")
			this.emit("status", { message: "The house is full. Try another room." });
	}
	start() {
		if (!this.host || this.viaHub) return;
		this.startAt = Date.now() + 3200;
		this.reported = false;
		this.results.clear();
		this.send("start", { at: this.startAt });
		this.emit("start", { at: this.startAt });
	}
	close() {
		if (this.viaHub) return;
		if (this.active) this.send("leave", {});
		clearInterval(this.helloTimer);
		clearTimeout(this.joinTimeout);
		this.bc?.close();
		this.peer?.destroy();
		this.connections.clear();
		this.latest.clear();
		this.results.clear();
		this.active = false;
		this.ended = false;
		this.internet = false;
		this.reported = false;
		this.roster = [];
		this.me = 0;
	}
}
