import Peer from "peerjs";

function peerOptions() {
	const endpoint = new URLSearchParams(location.search).get("peer-server");
	if (!endpoint) return { debug: 0 };
	try {
		const u = new URL(endpoint);
		return {
			debug: 0,
			host: u.hostname,
			port: Number(u.port) || (u.protocol === "https:" ? 443 : 80),
			path: u.pathname,
			secure: u.protocol === "https:",
		};
	} catch {
		return { debug: 0 };
	}
}
export class BrigadeLink {
	constructor(onMessage, onStatus) {
		this.onMessage = onMessage;
		this.onStatus = onStatus;
		this.kind = "none";
		this.me = 0;
		this.members = [0];
		this.peer = null;
		this.channel = null;
		this.connections = new Map();
		this.token = crypto.randomUUID();
		this.received = 0;
		this.sent = 0;
		this.generation = 0;
	}
	get active() {
		return this.kind !== "none";
	}
	get authority() {
		return (
			this.kind === "none" || this.kind === "host" || this.kind === "hubhost"
		);
	}
	async hub() {
		const info = await AIHub.connect({ mode: "shared-world", seats: [1, 4] });
		if (!info) return null;
		this.kind = info.isHost ? "hubhost" : "hubguest";
		this.me = info.me;
		this.members = info.players.map((p) => p.id);
		AIHub.on("message", (data, from) => {
			this.received++;
			this.onMessage(data, from);
		});
		AIHub.on("leave", ({ id }) => {
			this.members = this.members.filter((x) => x !== id);
			this.onStatus("A buddy left the brigade. The shift continues.");
		});
		return info;
	}
	send(data, to) {
		if (this.kind.startsWith("hub")) {
			this.sent++;
			AIHub.send(data, to === undefined ? {} : { to });
			return;
		}
		if (this.kind === "host") {
			this.sent++;
			if (this.channel) this.channel.postMessage({ data, from: 0, to });
			for (const [id, c] of this.connections)
				if (to === undefined || to === id) if (c.open) c.send(data);
		} else if (this.kind === "guest") {
			this.sent++;
			if (this.local && this.channel)
				this.channel.postMessage({
					data,
					from: this.me,
					to: 0,
					token: this.token,
				});
			else if (this.connection?.open) this.connection.send(data);
		}
	}
	close() {
		this.generation++;
		clearTimeout(this.joinTimer);
		if (this.channel) {
			if (this.kind === "host") this.channel.postMessage({ hostClosed: true });
			else if (this.kind === "guest" && this.local)
				this.channel.postMessage({
					leave: true,
					token: this.token,
					from: this.me,
				});
			this.channel.close();
		}
		this.channel = null;
		this.peer?.destroy();
		this.peer = null;
		this.connection = null;
		this.connections.clear();
		this.members = [0];
		this.kind = "none";
		this.me = 0;
		this.local = false;
	}
	host() {
		this.close();
		this.kind = "host";
		this.code = Array.from(
			crypto.getRandomValues(new Uint8Array(6)),
			(v) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[v % 32],
		).join("");
		const generation = this.generation;
		this.channel = new BroadcastChannel(`kaboomerang-${this.code}`);
		this.localSeats = new Map();
		this.channel.onmessage = ({ data: m }) => {
			if (m.join) {
				let id = this.localSeats.get(m.token);
				if (id === undefined) {
					id = this.allocate();
					if (id === null) return;
					this.localSeats.set(m.token, id);
					this.members.push(id);
				}
				this.channel.postMessage({
					welcome: true,
					toToken: m.token,
					id,
					members: this.members,
				});
				this.onStatus(
					`${this.members.length} buddies in the room. Ready when you are.`,
				);
				this.send({ type: "roster", members: this.members });
			} else if (m.leave && this.localSeats.get(m.token) === m.from) {
				this.members = this.members.filter((id) => id !== m.from);
				this.localSeats.delete(m.token);
				this.onStatus("A buddy left. The shift continues.");
				this.send({ type: "roster", members: this.members });
			} else if (m.to === 0 && this.localSeats.get(m.token) === m.from) {
				this.received++;
				this.onMessage(m.data, m.from);
			}
		};
		this.onStatus("Room ready on this browser. Connecting internet relay…");
		this.peer = new Peer(`kaboomerang-${this.code}`, peerOptions());
		this.peer.on("open", () => {
			if (generation !== this.generation) return;
			this.onStatus(
				"Online room open. Share the six-letter code with a buddy.",
			);
		});
		this.peer.on("connection", (c) => {
			const id = this.allocate();
			if (id === null) {
				c.on("open", () => {
					c.send({ type: "full" });
					c.close();
				});
				return;
			}
			this.members.push(id);
			this.connections.set(id, c);
			c.on("open", () => {
				c.send({ type: "welcome", id, members: this.members });
				this.send({ type: "roster", members: this.members });
				this.onStatus(
					`${this.members.length} buddies in the room. Ready when you are.`,
				);
			});
			c.on("data", (data) => {
				this.received++;
				this.onMessage(data, id);
			});
			c.on("close", () => {
				this.members = this.members.filter((v) => v !== id);
				this.connections.delete(id);
				this.onStatus("A buddy disconnected. You can keep playing.");
				this.send({ type: "roster", members: this.members });
			});
		});
		this.peer.on("error", (e) => {
			if (generation !== this.generation) return;
			this.onStatus(
				this.members.length > 1
					? "Local buddy connected. Internet relay unavailable."
					: `Internet relay unavailable (${e.type}). This room still works between tabs on this browser. Retry to connect across devices.`,
			);
		});
		return this.code;
	}
	allocate() {
		for (let i = 1; i < 4; i++) if (!this.members.includes(i)) return i;
		return null;
	}
	join(code) {
		this.close();
		this.kind = "guest";
		this.code = code.trim().toUpperCase();
		const generation = this.generation;
		this.onStatus("Finding your buddy’s room…");
		this.channel = new BroadcastChannel(`kaboomerang-${this.code}`);
		this.channel.onmessage = ({ data: m }) => {
			if (m.hostClosed && this.local) {
				this.onStatus("The host closed the room.");
				this.onMessage({ type: "disconnected" }, 0);
			} else if (m.welcome && m.toToken === this.token) {
				this.local = true;
				clearTimeout(this.joinTimer);
				this.me = m.id;
				this.members = m.members;
				this.onMessage({ type: "welcome", id: m.id, members: m.members }, 0);
				this.onStatus("Connected! Your buddy starts the shift.");
			} else if (
				m.data &&
				m.from === 0 &&
				(m.to === undefined || m.to === this.me) &&
				this.local
			) {
				this.received++;
				this.handle(m.data);
			}
		};
		this.channel.postMessage({ join: true, token: this.token });
		this.joinTimer = setTimeout(() => {
			if (this.local || generation !== this.generation) return;
			this.peer = new Peer(peerOptions());
			this.peer.on("open", () => {
				const c = this.peer.connect(`kaboomerang-${this.code}`, {
					reliable: true,
				});
				this.connection = c;
				c.on("open", () =>
					this.onStatus("Connected! Your buddy starts the shift."),
				);
				c.on("data", (data) => {
					this.received++;
					this.handle(data);
				});
				c.on("close", () => {
					this.onStatus("Connection lost. Return to the menu to reconnect.");
					this.onMessage({ type: "disconnected" }, 0);
				});
			});
			this.peer.on("error", (e) => {
				if (generation === this.generation)
					this.onStatus(
						`Could not join (${e.type}). Check the code and internet connection, then try again.`,
					);
			});
		}, 700);
	}
	handle(data) {
		if (data.type === "welcome") {
			this.me = data.id;
			this.members = data.members;
		}
		if (data.type === "roster") this.members = data.members;
		this.onMessage(data, 0);
	}
}
