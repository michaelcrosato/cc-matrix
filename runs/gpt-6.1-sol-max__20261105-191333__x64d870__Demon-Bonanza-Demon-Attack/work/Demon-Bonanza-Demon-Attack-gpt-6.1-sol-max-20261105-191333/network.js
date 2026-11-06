export class Network {
	constructor(callbacks) {
		this.cb = callbacks;
		this.hub = window.AIHub;
		this.active = false;
		this.authority = true;
		this.me = 0;
		this.ids = [0];
		this.sent = 0;
		this.received = 0;
		this.lastSend = 0;
		this.sequence = 0;
		this.lastSequence = -1;
		this.ended = false;
		this.finished = false;
		this.kind = "solo";
		this.peer = null;
		this.channel = null;
		this.status = "";
	}
	async init() {
		if (!this.hub?.active) return null;
		const info = await (window.__bonanzaHubLink ||
			this.hub.connect({ mode: "shared-world", seats: [1, 4] }));
		if (!info) return null;
		this.info = info;
		this.active = true;
		this.kind = "hub";
		this.authority = info.isHost;
		this.me = info.me;
		this.ids = info.players.map((p) => p.id);
		this.server = info.server;
		this.hub.on("start", () => {
			this.hubStarting = true;
		});
		this.hub.on("message", (data, from) => {
			if (!this.ended) this.receive(data, from);
		});
		this.hub.on("leave", ({ id }) => {
			this.ids = this.ids.filter((n) => n !== id);
			this.cb.leave?.(id);
		});
		this.hub.on("time-up", () => {
			if (this.authority && !this.finished) this.cb.timeup?.();
		});
		this.hub.on("end", (data) => {
			this.ended = true;
			this.cb.end?.(data);
		});
		return info;
	}
	tick(now, snapshot, input, events = []) {
		if (this.ended || !this.active) return;
		if (this.hubStarting && !this.started && this.hub.time() >= 0) {
			this.started = true;
			this.cb.start?.(this.info.players.length);
		}
		if (!this.started || now - this.lastSend < 100) return;
		this.lastSend = now;
		if (this.authority && snapshot)
			this.send({
				t: "s",
				n: ++this.sequence,
				s: snapshot,
				e: events.slice(-12),
			});
		else if (!this.authority) this.send({ t: "i", i: input || {} });
	}
	send(data) {
		if (this.ended) return false;
		this.sent++;
		if (this.kind === "hub") return this.hub.send(data, { reliable: true });
		if (this.channel?.readyState === "open") {
			this.channel.send(JSON.stringify(data));
			return true;
		}
		return false;
	}
	receive(data, from) {
		if (!data || typeof data !== "object") return;
		this.received++;
		if (data.t === "i" && this.authority && this.ids.includes(from))
			this.cb.input?.(from, data.i);
		if (
			data.t === "s" &&
			!this.authority &&
			(this.kind !== "hub" || from === this.info.host) &&
			Number.isInteger(data.n) &&
			data.n > this.lastSequence
		) {
			this.lastSequence = data.n;
			this.cb.snapshot?.(data.s, data.e || []);
		}
		if (
			data.t === "upgrade" &&
			this.authority &&
			this.ids.includes(from) &&
			["twin", "cool", "repair"].includes(data.key)
		)
			this.cb.upgrade?.(data.key);
		if (
			data.t === "restart" &&
			this.kind === "peer" &&
			this.authority &&
			this.ids.includes(from) &&
			["retry", "encore"].includes(data.mode)
		)
			this.cb.restart?.(data.mode);
	}
	chooseUpgrade(key) {
		if (this.authority) this.cb.upgrade?.(key);
		else this.send({ t: "upgrade", key });
	}
	finish(game, won) {
		if (this.finished || this.ended) return;
		this.finished = true;
		if (this.kind === "hub" && this.authority) {
			const scores = {},
				stats = {};
			for (const id of this.ids) {
				const p = game.players.find((p) => p.seat === id);
				scores[id] = p?.score || 0;
				stats[id] = {
					"Demons banished": game.stats.kills,
					"Waves cleared": game.wave + (won ? 1 : 0),
					"Pulse returns": game.stats.reflected,
				};
			}
			this.hub.finish({ standings: [this.ids], scores, won, stats });
		}
	}
	async createPeer(host) {
		if (this.hub?.active)
			throw new Error("Use the Hub lobby for this expedition.");
		this.closePeer();
		this.authority = host;
		this.me = host ? 0 : 1;
		this.ids = [0, 1];
		this.kind = "peer";
		this.lastSequence = -1;
		this.peer = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.peer.onconnectionstatechange = () => {
			this.status = this.peer?.connectionState || "closed";
			this.cb.status?.(this.status);
			if (["failed", "disconnected"].includes(this.status)) {
				this.cb.disconnect?.();
			}
		};
		this.peer.ondatachannel = (e) => this.bindChannel(e.channel);
		if (host)
			this.bindChannel(
				this.peer.createDataChannel("demon-bonanza", { ordered: true }),
			);
	}
	bindChannel(channel) {
		this.channel = channel;
		channel.onmessage = (e) => {
			try {
				this.receive(JSON.parse(e.data), this.authority ? 1 : 0);
			} catch {}
		};
		channel.onopen = () => {
			this.active = true;
			this.started = true;
			this.finished = false;
			this.status = "connected";
			this.cb.status?.(this.status);
			this.cb.start?.(2);
		};
		channel.onclose = () => {
			if (this.active) {
				this.active = false;
				this.cb.disconnect?.();
			}
		};
	}
	async gather() {
		if (this.peer.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			let done = false;
			const timer = setTimeout(() => {
				done = true;
				resolve();
			}, 4500);
			const listener = () => {
				if (this.peer?.iceGatheringState === "complete" && !done) {
					done = true;
					clearTimeout(timer);
					resolve();
				}
			};
			this.peer.addEventListener("icegatheringstatechange", listener);
		});
	}
	async pack(description) {
		const text = JSON.stringify(description);
		if (typeof CompressionStream === "undefined")
			return "DB0." + btoa(unescape(encodeURIComponent(text)));
		const bytes = await new Response(
			new Blob([text]).stream().pipeThrough(new CompressionStream("deflate")),
		).arrayBuffer();
		return "DB1." + btoa(String.fromCharCode(...new Uint8Array(bytes)));
	}
	async unpack(code) {
		if (code.length > 40000) throw new Error("That code is too long.");
		const [prefix, payload] = code.trim().split(".");
		if (!["DB0", "DB1"].includes(prefix) || !payload)
			throw new Error("Paste a complete Demon Bonanza connection code.");
		const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
		const text =
			prefix === "DB1"
				? await new Response(
						new Blob([bytes])
							.stream()
							.pipeThrough(new DecompressionStream("deflate")),
					).text()
				: new TextDecoder().decode(bytes);
		const desc = JSON.parse(text);
		if (
			!["offer", "answer"].includes(desc.type) ||
			typeof desc.sdp !== "string"
		)
			throw new Error("This connection code is invalid.");
		return desc;
	}
	async offer() {
		await this.createPeer(true);
		await this.peer.setLocalDescription(await this.peer.createOffer());
		await this.gather();
		return this.pack(this.peer.localDescription);
	}
	async answer(code) {
		const desc = await this.unpack(code);
		if (desc.type !== "offer")
			throw new Error("Join with the host’s invitation code.");
		await this.createPeer(false);
		await this.peer.setRemoteDescription(desc);
		await this.peer.setLocalDescription(await this.peer.createAnswer());
		await this.gather();
		return this.pack(this.peer.localDescription);
	}
	async accept(code) {
		const desc = await this.unpack(code);
		if (desc.type !== "answer" || !this.peer)
			throw new Error("Paste your partner’s reply code.");
		await this.peer.setRemoteDescription(desc);
		return true;
	}
	closePeer() {
		this.active = false;
		if (this.channel) {
			this.channel.onclose = null;
			this.channel.close();
		}
		if (this.peer) this.peer.onconnectionstatechange = null;
		this.peer?.close();
		this.channel = null;
		this.peer = null;
		if (this.kind !== "hub") {
			this.kind = "solo";
			this.authority = true;
			this.me = 0;
			this.ids = [0];
			this.server = false;
			this.started = false;
			this.finished = false;
			this.ended = false;
			this.lastSequence = -1;
		}
	}
}
