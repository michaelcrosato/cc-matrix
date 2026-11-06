/* AI Hub shared-world transport plus serverless direct play. No transport is
 * opened outside AI Hub until the player chooses one in the Link menu. */
const NET_COLORS = ["#e8443a", "#3b82f6", "#22c55e", "#f5b700"];
const makeSeat = (id) => ({
	id,
	name: `Cadet ${id + 1}`,
	color: NET_COLORS[id],
});
const netToken = () => {
	const bytes = new Uint32Array(4);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (n) => n.toString(36)).join("");
};
const netEncode = (value) => btoa(JSON.stringify(value));
const netDecode = (value) => {
	if (typeof value !== "string" || value.length > 100000)
		throw new Error("This link code is not valid.");
	try {
		return JSON.parse(atob(value.trim()));
	} catch {
		throw new Error("This link code is not valid. Copy the entire code.");
	}
};
function cleanInput(value) {
	const result = Object.create(null);
	if (!value || typeof value !== "object" || Array.isArray(value))
		return result;
	for (const key of Object.keys(value).slice(0, 24)) {
		if (key === "__proto__" || key === "constructor" || key === "prototype")
			continue;
		const v = value[key];
		if (typeof v === "number" && Number.isFinite(v))
			result[key] = Math.max(-10000, Math.min(10000, v));
		else if (typeof v === "boolean") result[key] = v;
		else if (Array.isArray(v))
			result[key] = v
				.slice(0, 8)
				.map((n) =>
					Number.isFinite(n) ? Math.max(-10000, Math.min(10000, n)) : 0,
				);
	}
	return result;
}

export class GameNetwork {
	constructor(callbacks = {}) {
		this.callbacks = callbacks;
		this.active = false;
		this.online = false;
		this.isHost = true;
		this.me = 0;
		this.host = 0;
		this.server = false;
		this.players = [makeSeat(0)];
		this.started = false;
		this.ended = false;
		this.info = null;
		this.sent = 0;
		this.received = 0;
		this.sequence = 0;
		this.lastSnapshotSequence = -1;
		this.lastInputSequence = new Map();
		this.lastScores = {};
		this.timer = 0;
		this.finished = false;
		this.readied = false;
		this.peers = new Map();
		this.pending = new Map();
		this.unsubscribers = [];
		this.channel = null;
		this.roomClients = new Map();
		this.transport = "none";
	}

	async init() {
		if (!globalThis.AIHub?.active) return null;
		const hub = globalThis.AIHub;
		this.active = true;
		this.online = true;
		this.transport = "hub";
		this.info = await hub.connect({ mode: "shared-world", seats: [1, 4] });
		if (!this.info) {
			this.active = false;
			this.online = false;
			this.transport = "none";
			return null;
		}
		Object.assign(this, {
			me: this.info.me,
			host: this.info.host,
			isHost: this.info.isHost,
			server: this.info.server,
			players: this.info.players.map((p) => ({ ...p })),
		});
		this.unsubscribers.push(
			hub.on("start", () => {
				this.startPending = true;
			}),
		);
		this.unsubscribers.push(
			hub.on("message", (data, from) => this.receive(data, from)),
		);
		this.unsubscribers.push(
			hub.on("time-up", () => this.finish(this.lastScores)),
		);
		this.unsubscribers.push(
			hub.on("leave", ({ id, reason }) => this.playerLeft(id, reason)),
		);
		this.unsubscribers.push(
			hub.on("end", ({ reason }) => this.end(reason, false)),
		);
		return this.info;
	}

	ready() {
		if (this.active && !this.readied && !this.ended) {
			this.readied = true;
			globalThis.AIHub.ready();
		}
	}

	start() {
		if (this.started || this.ended) return;
		this.started = true;
		this.timer = 0;
		this.info = {
			...(this.info || {}),
			me: this.me,
			host: this.host,
			isHost: this.isHost,
			server: this.server,
			players: this.players.map((p) => ({ ...p })),
			mode: "shared-world",
			standalone: !this.active,
		};
		this.callbacks.onStart?.(this.info);
		this.status("Connected. Battle stations!");
	}

	tick(dt, input, snapshot) {
		if (this.ended) return;
		if (snapshot?.scores) this.setScores(snapshot.scores);
		if (
			this.active &&
			!this.started &&
			this.startPending &&
			globalThis.AIHub.time() >= 0
		)
			this.start();
		if (!this.online || !this.started) return;
		this.timer += Math.max(0, Math.min(0.25, dt || 0));
		if (this.timer < 1 / 15) return;
		this.timer %= 1 / 15;
		if (this.isHost) {
			if (snapshot)
				this.send({ t: "world", q: ++this.sequence, s: snapshot }, false);
		} else {
			this.send(
				{ t: "input", q: ++this.sequence, i: cleanInput(input) },
				false,
				this.host,
			);
		}
	}

	setScores(scores) {
		if (!scores || typeof scores !== "object") return;
		for (const player of this.players) {
			const value = Array.isArray(scores)
				? typeof scores[player.id] === "object"
					? scores[player.id]?.score
					: scores[player.id]
				: scores[player.id];
			if (Number.isFinite(value)) this.lastScores[player.id] = value;
		}
	}

	receive(data, from) {
		if (this.ended || !data || typeof data !== "object") return;
		this.received++;
		if (
			data.t === "input" &&
			this.isHost &&
			this.players.some((p) => p.id === from) &&
			from !== this.me
		) {
			const q = data.q;
			if (!Number.isInteger(q) || q <= (this.lastInputSequence.get(from) ?? -1))
				return;
			this.lastInputSequence.set(from, q);
			this.callbacks.onInput?.(from, cleanInput(data.i));
		} else if (data.t === "world" && !this.isHost && from === this.host) {
			if (!Number.isInteger(data.q) || data.q <= this.lastSnapshotSequence)
				return;
			this.lastSnapshotSequence = data.q;
			this.callbacks.onSnapshot?.(data.s);
		} else if (
			!this.active &&
			data.t === "start" &&
			!this.isHost &&
			from === this.host
		) {
			if (Array.isArray(data.players))
				this.players = data.players
					.filter((p) => Number.isInteger(p.id) && p.id >= 0 && p.id < 4)
					.map((p) => makeSeat(p.id));
			this.start();
		} else if (
			!this.active &&
			data.t === "end" &&
			!this.isHost &&
			from === this.host
		) {
			this.lastScores = data.scores || {};
			this.end(data.reason || "finished", false);
		}
	}

	send(data, reliable = true, to) {
		if (this.ended) return false;
		if (this.active) {
			const options = { reliable };
			if (to !== undefined) options.to = to;
			const sent = globalThis.AIHub.send(data, options);
			if (sent !== false) this.sent++;
			return sent;
		}
		let sent = false;
		if (this.transport === "rtc") {
			const text = JSON.stringify(data);
			if (text.length > 16000) return false;
			for (const [id, peer] of this.peers) {
				if (
					(to === undefined || to === id) &&
					peer.channel?.readyState === "open" &&
					peer.channel.bufferedAmount < 128000
				) {
					peer.channel.send(text);
					this.sent++;
					sent = true;
				}
			}
		} else if (this.transport === "room" && this.channel) {
			this.channel.postMessage({
				kind: "data",
				sender: this.roomToken,
				seat: this.me,
				to,
				data,
			});
			this.sent++;
			sent = true;
		}
		return sent;
	}

	finish(scores = this.lastScores) {
		if (!this.isHost || this.ended || this.finished || !this.online) return;
		this.setScores(scores);
		const sorted = [...this.players].sort(
			(a, b) => (this.lastScores[b.id] || 0) - (this.lastScores[a.id] || 0),
		);
		const standings = [];
		for (const player of sorted) {
			const previous = standings.at(-1);
			if (
				previous &&
				(this.lastScores[previous[0]] || 0) ===
					(this.lastScores[player.id] || 0)
			)
				previous.push(player.id);
			else standings.push([player.id]);
		}
		const allScores = Object.fromEntries(
			this.players.map((p) => [p.id, this.lastScores[p.id] || 0]),
		);
		this.finished = true;
		if (this.active) globalThis.AIHub.finish({ standings, scores: allScores });
		else {
			this.send({ t: "end", reason: "finished", standings, scores: allScores });
			this.end("finished", false);
		}
	}

	playerLeft(id, reason = "disconnected") {
		if (this.ended) return;
		this.players = this.players.filter((p) => p.id !== id);
		this.callbacks.onLeave?.(id, reason);
		if (!this.active && id === this.host) this.end("host-left", false);
	}

	end(reason = "session-ended", notify = true) {
		if (this.ended) return;
		if (notify && !this.active && this.online)
			this.send({ t: "end", reason, scores: this.lastScores });
		this.ended = true;
		this.callbacks.onEnd?.(reason);
		this.status(reason === "finished" ? "Round complete." : "Link closed.");
	}

	status(message) {
		this.callbacks.onStatus?.(message, this.inspect());
	}

	ensureStandalone() {
		if (this.active || globalThis.AIHub?.active)
			throw new Error("AI Hub manages the link during a session.");
		if (this.started)
			throw new Error("Return to the title before creating a new link.");
	}

	async iceComplete(pc) {
		if (pc.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			const done = () => {
				pc.removeEventListener("icegatheringstatechange", changed);
				clearTimeout(timer);
				resolve();
			};
			const changed = () => {
				if (pc.iceGatheringState === "complete") done();
			};
			const timer = setTimeout(done, 6000);
			pc.addEventListener("icegatheringstatechange", changed);
		});
	}

	makePeer(id, token) {
		if (!globalThis.RTCPeerConnection)
			throw new Error("Direct play is unavailable in this browser.");
		const pc = new RTCPeerConnection({ iceServers: [] });
		const peer = { pc, token, channel: null };
		this.peers.set(id, peer);
		const attach = (channel) => {
			peer.channel = channel;
			channel.onmessage = (event) => {
				if (typeof event.data !== "string" || event.data.length > 16000) return;
				try {
					this.receive(JSON.parse(event.data), id);
				} catch {
					/* Malformed packet is ignored. */
				}
			};
			channel.onopen = () => {
				this.online = true;
				if (this.isHost) {
					if (!this.players.some((p) => p.id === id))
						this.players.push(makeSeat(id));
					this.send({ t: "start", players: this.players }, true);
					this.start();
				}
				this.status("Direct link connected.");
			};
			channel.onclose = () => {
				if (!this.ended && this.started) this.playerLeft(id);
			};
		};
		peer.attach = attach;
		pc.ondatachannel = (event) => attach(event.channel);
		pc.onconnectionstatechange = () => {
			if (pc.connectionState === "failed")
				this.status(
					"Direct connection failed. Both devices must have a direct network route.",
				);
			if (pc.connectionState === "closed" && !this.ended && this.started)
				this.playerLeft(id);
		};
		return peer;
	}

	/** Host: copy this invite to the guest. Direct/LAN route; no relay service. */
	async createOffer() {
		this.ensureStandalone();
		this.transport = "rtc";
		this.isHost = true;
		this.me = 0;
		this.host = 0;
		const id = [1, 2, 3].find((n) => !this.peers.has(n));
		if (!id) throw new Error("All four seats are occupied.");
		const token = netToken();
		const peer = this.makePeer(id, token);
		peer.attach(peer.pc.createDataChannel("com-ricochet", { ordered: true }));
		await peer.pc.setLocalDescription(await peer.pc.createOffer());
		await this.iceComplete(peer.pc);
		this.pending.set(token, id);
		this.status("Invite ready. Ask the guest for their answer code.");
		return netEncode({
			v: 1,
			game: "com-ricochet",
			type: "offer",
			seat: id,
			token,
			sdp: peer.pc.localDescription,
		});
	}

	/** Guest: paste the host's invite; copy the returned answer back to the host. */
	async joinOffer(invite) {
		this.ensureStandalone();
		const offer = netDecode(invite);
		if (
			offer.v !== 1 ||
			offer.game !== "com-ricochet" ||
			offer.type !== "offer" ||
			![1, 2, 3].includes(offer.seat) ||
			offer.sdp?.type !== "offer"
		)
			throw new Error("This is not a Com-Ricochet invite.");
		this.transport = "rtc";
		this.isHost = false;
		this.me = offer.seat;
		this.host = 0;
		this.players = [makeSeat(0), makeSeat(this.me)];
		const peer = this.makePeer(0, offer.token);
		await peer.pc.setRemoteDescription(offer.sdp);
		await peer.pc.setLocalDescription(await peer.pc.createAnswer());
		await this.iceComplete(peer.pc);
		this.status("Answer ready. Send it back to the host.");
		return netEncode({
			v: 1,
			game: "com-ricochet",
			type: "answer",
			token: offer.token,
			sdp: peer.pc.localDescription,
		});
	}

	/** Host: paste the guest's answer. Connection begins automatically. */
	async acceptAnswer(answer) {
		this.ensureStandalone();
		const data = netDecode(answer);
		const id = this.pending.get(data.token);
		if (
			data.v !== 1 ||
			data.game !== "com-ricochet" ||
			data.type !== "answer" ||
			!id ||
			data.sdp?.type !== "answer"
		)
			throw new Error("This answer does not match the current invite.");
		await this.peers.get(id).pc.setRemoteDescription(data.sdp);
		this.pending.delete(data.token);
		this.status("Connecting direct link…");
		return true;
	}

	/** Same-origin browser room, useful for two windows on one computer. */
	hostRoom(room = "") {
		this.ensureStandalone();
		const code =
			room
				.trim()
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, "")
				.slice(0, 16) || netToken().slice(0, 6).toUpperCase();
		this.openRoom(code, true);
		this.status(`Room ${code} open. Join it from another window.`);
		return code;
	}

	joinRoom(room) {
		this.ensureStandalone();
		const code = String(room)
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, "")
			.slice(0, 16);
		if (!code) throw new Error("Enter a room code.");
		this.openRoom(code, false);
		this.channel.postMessage({ kind: "join", sender: this.roomToken });
		this.status(`Looking for room ${code}…`);
		return code;
	}

	openRoom(code, host) {
		if (!globalThis.BroadcastChannel)
			throw new Error("Browser rooms are unavailable here. Use Direct Link.");
		this.channel?.close();
		this.transport = "room";
		this.roomToken = netToken();
		this.roomCode = code;
		this.isHost = host;
		this.host = 0;
		this.me = host ? 0 : -1;
		this.roomHostToken = host ? this.roomToken : null;
		this.players = host ? [makeSeat(0)] : [];
		this.channel = new BroadcastChannel(`com-ricochet-v1-${code}`);
		this.channel.onmessage = ({ data }) => {
			if (!data || data.sender === this.roomToken || this.ended) return;
			if (data.kind === "join" && this.isHost && !this.started) {
				let id = this.roomClients.get(data.sender);
				if (!id)
					id = [1, 2, 3].find(
						(n) => !Array.from(this.roomClients.values()).includes(n),
					);
				if (!id) return;
				this.roomClients.set(data.sender, id);
				if (!this.players.some((p) => p.id === id))
					this.players.push(makeSeat(id));
				this.online = true;
				this.channel.postMessage({
					kind: "welcome",
					sender: this.roomToken,
					target: data.sender,
					seat: id,
					players: this.players,
				});
				// A short handshake delay lets the guest install its seat before start.
				setTimeout(() => {
					if (this.ended) return;
					this.send({ t: "start", players: this.players });
					this.start();
				}, 100);
			} else if (
				data.kind === "welcome" &&
				!this.isHost &&
				data.target === this.roomToken &&
				!this.online
			) {
				this.roomHostToken = data.sender;
				this.me = data.seat;
				this.players = data.players.map((p) => makeSeat(p.id));
				this.online = true;
			} else if (
				data.kind === "data" &&
				this.online &&
				(data.to === undefined || data.to === this.me)
			) {
				if (this.isHost) {
					const seat = this.roomClients.get(data.sender);
					if (seat !== undefined) this.receive(data.data, seat);
				} else if (data.sender === this.roomHostToken)
					this.receive(data.data, 0);
			}
		};
	}

	inspect() {
		return {
			active: this.active,
			online: this.online,
			transport: this.transport,
			isHost: this.isHost,
			me: this.me,
			server: this.server,
			players: this.players.map((p) => ({ ...p })),
			started: this.started,
			ended: this.ended,
			sent: this.sent,
			received: this.received,
		};
	}

	close() {
		if (!this.active) {
			if (this.online && !this.ended) this.end("session-ended");
			this.channel?.close();
			this.channel = null;
			for (const peer of this.peers.values()) peer.pc.close();
			this.peers.clear();
			this.pending.clear();
			this.online = false;
		}
	}
}
