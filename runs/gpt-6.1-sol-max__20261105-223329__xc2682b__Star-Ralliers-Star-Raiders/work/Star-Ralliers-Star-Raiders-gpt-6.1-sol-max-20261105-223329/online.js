class WingLink {
	constructor(onMessage, onStatus) {
		this.onMessage = onMessage;
		this.onStatus = onStatus;
		this.uid = crypto.randomUUID().slice(0, 8);
		this.room = "";
		this.host = false;
		this.channel = null;
		this.peer = null;
		this.connections = new Map();
		this.members = new Map();
		this.seen = new Set();
		this.seq = 0;
		this.transport = "";
		this.connected = false;
		this.received = 0;
		this.sent = 0;
		this.hub = false;
	}
	async open(room, host = false) {
		this.close();
		this.hub = false;
		this.room = room
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, "")
			.slice(0, 6);
		this.host = host;
		this.members.set(this.uid, {
			id: this.uid,
			name: host
				? "Rallier 01"
				: "Rallier " + this.uid.slice(0, 2).toUpperCase(),
		});
		this.channel = new BroadcastChannel("star-ralliers-v1-" + this.room);
		this.channel.onmessage = (e) => this.receive(e.data, "local");
		this.connected = host;
		this.transport = "local";
		this.emit({ type: "hello", host });
		this.onStatus();
		try {
			if (!window.Peer) {
				await new Promise((resolve, reject) => {
					const script = document.createElement("script");
					script.src =
						"https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
					script.onload = resolve;
					script.onerror = reject;
					document.head.appendChild(script);
				});
			}
			if (!this.room) return;
			const ownID = host
				? "star-ralliers-" + this.room
				: "star-ralliers-" + this.room + "-" + this.uid;
			this.peer = new window.Peer(ownID, { debug: 0 });
			this.peer.on("open", () => {
				if (!this.room) return;
				this.transport = "internet";
				if (!host)
					this.attach(
						this.peer.connect("star-ralliers-" + this.room, {
							reliable: true,
							serialization: "json",
						}),
					);
				this.onStatus();
			});
			this.peer.on("connection", (c) => {
				if (this.connections.size >= 3) {
					c.close();
					return;
				}
				this.attach(c);
			});
			this.peer.on("error", (e) => {
				this.transport =
					this.members.size > 1 ? "local" : "local / internet unavailable";
				this.onStatus();
			});
		} catch (e) {
			this.transport = "local / internet unavailable";
			this.onStatus();
		}
	}
	attach(conn) {
		this.connections.set(conn.peer, conn);
		conn.on("open", () => {
			this.transport = "internet";
			this.connected = true;
			conn.send(this.packet({ type: "hello", host: this.host }));
			this.onStatus();
		});
		conn.on("data", (p) => {
			this.receive(p, "remote");
			if (this.host)
				for (const c of this.connections.values())
					if (c !== conn && c.open) c.send(p);
		});
		conn.on("close", () => {
			this.connections.delete(conn.peer);
			this.onStatus();
		});
		conn.on("error", () => {
			this.connections.delete(conn.peer);
			this.onStatus();
		});
	}
	packet(data) {
		return {
			game: "ralliers1",
			room: this.room,
			from: this.uid,
			seq: ++this.seq,
			data,
		};
	}
	emit(data) {
		if (this.hub) {
			AIHub.send(data, { reliable: false });
			this.sent++;
			return;
		}
		if (!this.room) return;
		const p = this.packet(data);
		this.channel?.postMessage(p);
		for (const c of this.connections.values()) if (c.open) c.send(p);
		this.sent++;
	}
	receive(p, transport) {
		if (
			!p ||
			p.game !== "ralliers1" ||
			p.room !== this.room ||
			p.from === this.uid
		)
			return;
		const k = p.from + ":" + p.seq;
		if (this.seen.has(k)) return;
		this.seen.add(k);
		if (this.seen.size > 3000) this.seen = new Set([...this.seen].slice(-1500));
		this.received++;
		const d = p.data;
		if (!d || typeof d.type !== "string") return;
		if (!this.members.has(p.from) && this.members.size < 4)
			this.members.set(p.from, {
				id: p.from,
				name: p.data.host
					? "Rallier 01"
					: "Rallier " + p.from.slice(0, 2).toUpperCase(),
			});
		this.connected = true;
		if (d.type === "hello") {
			this.emit({ type: "welcome", host: this.host });
			this.onStatus();
		}
		if (d.type === "welcome") this.onStatus();
		this.onMessage(d, p.from);
	}
	close() {
		if (this.room) this.emit({ type: "leave" });
		this.channel?.close();
		this.channel = null;
		this.peer?.destroy();
		this.peer = null;
		this.connections.clear();
		this.members.clear();
		this.room = "";
		this.connected = false;
		this.hub = false;
		this.seen.clear();
	}
}
