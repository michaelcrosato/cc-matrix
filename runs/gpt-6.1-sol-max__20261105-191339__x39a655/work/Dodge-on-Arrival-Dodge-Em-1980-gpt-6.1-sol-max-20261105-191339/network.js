class LinkRace {
	constructor(callbacks) {
		this.callbacks = callbacks;
		this.id = [...crypto.getRandomValues(new Uint8Array(8))]
			.map((v) => v.toString(16).padStart(2, "0"))
			.join("");
		this.active = false;
		this.host = false;
		this.code = "";
		this.seat = 0;
		this.members = [];
		this.connections = new Map();
		this.seen = new Set();
		this.seq = 0;
		this.transport = "LOCAL LINK";
		this.lastHeart = 0;
		this.lastSeen = new Map();
		this.racing = false;
		addEventListener("beforeunload", () => this.close());
	}
	async open(host, code = "") {
		this.close();
		this.host = host;
		const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		this.code = host
			? [...crypto.getRandomValues(new Uint8Array(5))]
					.map((v) => alphabet[v % alphabet.length])
					.join("")
			: code
					.toUpperCase()
					.replace(/[^A-Z2-9]/g, "")
					.slice(0, 5);
		if (this.code.length !== 5)
			throw new Error("Enter the five-letter room code.");
		this.active = true;
		this.racing = false;
		this.members = host
			? [{ id: this.id, seat: 0, score: 0, done: false }]
			: [];
		this.seat = host ? 0 : -1;
		this.transport = "CONNECTING";
		this.seen.clear();
		this.connections.clear();
		this.channel = new BroadcastChannel("dodge-on-arrival-" + this.code);
		this.channel.onmessage = (e) => this.receive(e.data);
		this.packet("hello", {});
		this.callbacks.change();
		if (new URLSearchParams(location.search).has("localnet")) {
			this.transport = "SAME-BROWSER LINK";
			this.callbacks.change();
			return;
		}
		try {
			if (!window.Peer)
				await new Promise((resolve, reject) => {
					const s = document.createElement("script");
					s.src =
						"https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
					s.onload = resolve;
					s.onerror = () =>
						reject(new Error("Signaling service could not load."));
					document.head.appendChild(s);
				});
			if (!this.active) return;
			const peer = (this.peer = host
				? new window.Peer("doa26-" + this.code, { debug: 0 })
				: new window.Peer({ debug: 0 }));
			peer.on("open", () => {
				if (!this.active) return;
				this.transport = "WEBRTC READY";
				if (!host)
					this.bind(
						peer.connect("doa26-" + this.code, {
							reliable: true,
							serialization: "json",
						}),
					);
				this.callbacks.change();
			});
			peer.on("connection", (c) => this.bind(c));
			peer.on("error", (e) => {
				if (!this.active) return;
				this.transport =
					this.members.length > 1
						? "SAME-BROWSER LINK"
						: e.type === "peer-unavailable"
							? "ROOM NOT FOUND · CHECK CODE"
							: "RELAY UNAVAILABLE · SAME-BROWSER LINK ONLY";
				this.callbacks.change();
			});
			peer.on("disconnected", () => {
				if (this.active) {
					this.transport = "SIGNALING OFFLINE · EXISTING LINKS CONTINUE";
					this.callbacks.change();
				}
			});
		} catch (e) {
			this.transport = "RELAY UNAVAILABLE · SAME-BROWSER LINK ONLY";
			this.callbacks.change();
		}
	}
	bind(connection) {
		this.connections.set(connection.peer, connection);
		connection.on("open", () => {
			this.transport = "WEBRTC CONNECTED";
			this.packet("hello", {});
			this.callbacks.change();
		});
		connection.on("data", (data) => {
			this.receive(data);
			if (this.host)
				for (const c of this.connections.values())
					if (c !== connection && c.open) c.send(data);
		});
		connection.on("close", () => {
			this.connections.delete(connection.peer);
			this.callbacks.change();
		});
		connection.on("error", () => {});
	}
	packet(type, data) {
		if (!this.active) return;
		const p = {
			game: "doa1",
			uid: this.id + ":" + ++this.seq,
			from: this.id,
			type,
			data,
		};
		this.seen.add(p.uid);
		this.channel?.postMessage(p);
		for (const c of this.connections.values()) if (c.open) c.send(p);
		return p;
	}
	receive(p) {
		if (
			!this.active ||
			!p ||
			p.game !== "doa1" ||
			p.from === this.id ||
			this.seen.has(p.uid)
		)
			return;
		this.seen.add(p.uid);
		if (this.seen.size > 2500) this.seen = new Set([...this.seen].slice(-1200));
		this.lastSeen.set(p.from, performance.now());
		if (p.type === "hello" && this.host && !this.racing) {
			if (
				!this.members.some((m) => m.id === p.from) &&
				this.members.length < 4
			) {
				const seat = [0, 1, 2, 3].find(
					(s) => !this.members.some((m) => m.seat === s),
				);
				this.members.push({ id: p.from, seat, score: 0, done: false });
			}
			this.packet("lobby", { members: this.members, host: this.id });
			this.callbacks.change();
		} else if (
			p.type === "lobby" &&
			!this.host &&
			Array.isArray(p.data?.members)
		) {
			this.members = p.data.members.slice(0, 4);
			this.hostId = p.from;
			this.seat = this.members.find((m) => m.id === this.id)?.seat ?? -1;
			this.callbacks.change();
		} else if (p.type === "start" && !this.host && p.from === this.hostId) {
			this.racing = true;
			this.callbacks.start(p.data);
		} else if (
			p.type === "ghost" &&
			this.members.some((m) => m.id === p.from)
		) {
			const member = this.members.find((m) => m.id === p.from);
			member.score = Number(p.data?.score) || 0;
			member.done = !!p.data?.done;
			this.callbacks.ghost(p.data, member.seat);
		} else if (p.type === "bye") {
			this.members = this.members.filter((m) => m.id !== p.from);
			if (p.from === this.hostId)
				this.transport = "HOST LEFT · FINISH YOUR RUN";
			this.callbacks.leave(p.from);
			this.callbacks.change();
		}
	}
	start() {
		if (!this.host || this.members.length < 2) return;
		const data = { at: Date.now() + 3500 };
		this.racing = true;
		this.packet("start", data);
		this.callbacks.start(data);
	}
	update(now) {
		if (!this.active || now - this.lastHeart < 1500) return;
		this.lastHeart = now;
		this.packet("hello", {});
		if (this.host) {
			const before = this.members.length;
			this.members = this.members.filter(
				(m) =>
					m.id === this.id || now - (this.lastSeen.get(m.id) || now) < 10000,
			);
			if (before !== this.members.length) {
				this.packet("lobby", { members: this.members, host: this.id });
				this.callbacks.change();
			}
		}
	}
	push(data) {
		if (!this.active || !this.racing) return;
		const m = this.members.find((m) => m.id === this.id);
		if (m) {
			m.score = data.score;
			m.done = !!data.done;
		}
		this.packet("ghost", data);
	}
	close() {
		if (this.active) this.packet("bye", {});
		this.active = false;
		this.channel?.close();
		this.channel = null;
		for (const c of this.connections.values()) c.close();
		this.connections.clear();
		this.peer?.destroy();
		this.peer = null;
		this.members = [];
	}
}
