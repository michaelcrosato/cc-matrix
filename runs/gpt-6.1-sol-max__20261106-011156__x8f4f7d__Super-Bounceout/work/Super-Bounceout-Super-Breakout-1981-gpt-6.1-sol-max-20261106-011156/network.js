class RaceLink {
	constructor(onMessage, onStatus) {
		this.onMessage = onMessage;
		this.onStatus = onStatus;
		this.connections = new Map();
		this.active = false;
		this.host = false;
		this.roster = [];
		this.me = 0;
		this.started = false;
	}
	async library() {
		if (window.Peer) return window.Peer;
		await new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src =
				"https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
			script.onload = resolve;
			script.onerror = () =>
				reject(
					new Error("Could not load the link radio. Check your connection."),
				);
			document.head.append(script);
		});
		return window.Peer;
	}
	async open(host, code = "") {
		if (AIHub.active) throw new Error("The Hub manages this race.");
		this.close();
		const Peer = await this.library();
		this.host = host;
		this.active = true;
		this.started = false;
		const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		if (host) {
			const bytes = crypto.getRandomValues(new Uint8Array(6));
			this.code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join(
				"",
			);
		} else this.code = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
		this.peer = new Peer(host ? "super-bounceout-" + this.code : undefined, {
			debug: 0,
		});
		return new Promise((resolve, reject) => {
			let settled = false;
			const timer = setTimeout(() => {
				if (!settled) {
					settled = true;
					this.close();
					reject(new Error("The link timed out. Try another room or network."));
				}
			}, 18000);
			this.peer.on("open", () => {
				if (host) {
					this.roster = [{ id: 0, name: "Pilot 1", color: "#ef7863" }];
					this.me = 0;
					settled = true;
					clearTimeout(timer);
					this.onStatus("Room open");
					resolve(this.code);
				} else {
					const c = this.peer.connect("super-bounceout-" + this.code, {
						reliable: true,
					});
					this.bind(c);
					c.on("open", () => {
						settled = true;
						clearTimeout(timer);
						resolve(this.code);
					});
				}
			});
			this.peer.on("connection", (c) => {
				if (!this.host || this.connections.size >= 3 || this.started) {
					c.on("open", () => {
						c.send({ type: "closed" });
						c.close();
					});
					return;
				}
				this.bind(c);
			});
			this.peer.on("error", (e) => {
				this.onStatus(
					e.type === "peer-unavailable"
						? "Room not found. Check the six-letter code."
						: "Link interrupted: " + e.type,
				);
				if (!settled) {
					settled = true;
					clearTimeout(timer);
					this.close();
					reject(
						new Error(
							e.type === "peer-unavailable"
								? "Room not found. Check the room code."
								: "The link radio could not connect.",
						),
					);
				}
			});
		});
	}
	bind(c) {
		c.on("open", () => {
			this.connections.set(c.peer, c);
			if (this.host) {
				let id = 1;
				while (this.roster.some((p) => p.id === id)) id++;
				c._seat = id;
				this.roster.push({
					id,
					name: "Pilot " + (id + 1),
					color: ["#ef7863", "#80b5ed", "#a4cfba", "#f2bc4f"][id],
				});
				c.send({ type: "welcome", me: id, roster: this.roster });
				this.send({ type: "roster", roster: this.roster });
			}
			this.onStatus("Link established");
		});
		c.on("data", (data) => {
			if (!data || typeof data !== "object") return;
			if (data.type === "welcome") {
				this.me = data.me;
				this.roster = data.roster;
				this.onStatus("Joined room");
				return;
			}
			if (data.type === "roster") {
				this.roster = data.roster;
				this.onStatus("Crew updated");
				return;
			}
			if (data.type === "closed") {
				this.onStatus("This room is full or already flying.");
				this.close();
				return;
			}
			if (this.host) {
				data = { ...data, from: c._seat };
				for (const [id, other] of this.connections)
					if (id !== c.peer && other.open) other.send(data);
			}
			this.onMessage(data, data.from ?? 0);
		});
		c.on("close", () => {
			this.connections.delete(c.peer);
			if (this.host) {
				this.roster = this.roster.filter((p) => p.id !== c._seat);
				this.send({ type: "roster", roster: this.roster });
				this.onMessage({ type: "leave" }, c._seat);
				this.onStatus("A pilot left the room");
			} else {
				this.onStatus("Host disconnected. Your solo flight can continue.");
				this.active = false;
			}
		});
		c.on("error", () => this.onStatus("A link was interrupted."));
	}
	send(data) {
		for (const c of this.connections.values())
			if (c.open) c.send({ ...data, from: this.me });
	}
	start() {
		if (!this.host) return;
		this.started = true;
		const data = { type: "start", at: Date.now() + 3000 };
		this.send(data);
		this.onMessage(data, 0);
	}
	close() {
		if (this.peer) {
			this.peer.destroy();
			this.peer = null;
		}
		this.connections.clear();
		this.active = false;
		this.started = false;
		this.roster = [];
	}
}
