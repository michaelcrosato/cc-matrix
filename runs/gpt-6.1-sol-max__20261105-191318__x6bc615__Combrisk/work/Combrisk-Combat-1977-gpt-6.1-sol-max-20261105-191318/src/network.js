const pack = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const unpack = (s) =>
	JSON.parse(
		decodeURIComponent(escape(atob(s.trim().replace(/^COMBRISK:/, "")))),
	);
export class Network {
	constructor() {
		this.kind = "none";
		this.active = false;
		this.ended = false;
		this.hub = !!window.AIHub?.active;
		this.info = null;
		this.channel = null;
		this.peer = null;
		this.tick = 0;
		this.frame = 0;
		this.lastFrame = -1;
		this.lastInput = new Map();
		this.sent = 0;
		this.received = 0;
		this.onInput = () => {};
		this.onSnapshot = () => {};
		this.onConnected = () => {};
		this.onDisconnect = () => {};
		this.onStart = () => {};
		this.onEnd = () => {};
		this.onTimeUp = () => {};
		this.onLeave = () => {};
		this.error = "";
	}
	async initHub() {
		if (!this.hub) return null;
		const h = window.AIHub;
		h.on("start", () => {
			this.active = true;
			this.onStart();
		});
		h.on("message", (data, from) => this.receive(data, from));
		h.on("time-up", () => this.onTimeUp());
		h.on("leave", (e) => this.onLeave(e.id));
		h.on("end", (e) => {
			this.ended = true;
			this.active = false;
			this.onEnd(e);
		});
		this.info = await h.connect({ mode: "shared-world", seats: [1, 4] });
		if (!this.info) {
			this.hub = false;
			return null;
		}
		this.kind = this.info.isHost ? "host" : "guest";
		this.players = this.info.players;
		return this.info;
	}
	ready() {
		if (this.hub) window.AIHub.ready();
	}
	receive(data, from = 1) {
		if (this.ended || !data || typeof data !== "object") return;
		this.received++;
		this.lastHeard = performance.now();
		if (data.t === "i" && this.kind === "host") {
			const i = data.i;
			if (!i || typeof i !== "object") return;
			const clean = {};
			for (const key of ["x", "z", "ax", "az"])
				clean[key] = Number.isFinite(i[key])
					? Math.max(-1, Math.min(1, i[key]))
					: 0;
			for (const key of ["aim", "fire", "boost", "assist"])
				clean[key] = !!i[key];
			this.lastInput.set(from, { data: clean, time: performance.now() });
			this.onInput(from, clean);
		} else if (
			data.t === "s" &&
			this.kind === "guest" &&
			data.f > this.lastFrame
		) {
			if (this.hub && from !== this.info.host) return;
			this.lastFrame = data.f;
			this.onSnapshot(data.s);
		}
	}
	send(data) {
		if (this.ended) return false;
		if (this.hub) {
			const ok = window.AIHub.send(data, {
				to: this.kind === "guest" ? this.info.host : undefined,
				reliable: false,
			});
			if (ok) this.sent++;
			return ok;
		}
		if (this.channel?.readyState === "open") {
			this.channel.send(JSON.stringify(data));
			this.sent++;
			return true;
		}
		return false;
	}
	update(dt, input, snapshot) {
		if (!this.active || this.ended) return;
		if (
			!this.hub &&
			this.lastHeard &&
			performance.now() - this.lastHeard > 6500
		) {
			this.close(true);
			this.onDisconnect("The other pilot has left the field.");
			return;
		}
		this.tick += dt;
		if (this.tick < 1 / 15) return;
		this.tick = 0;
		if (this.kind === "host") {
			this.send({ t: "s", f: ++this.frame, s: snapshot() });
			for (const [id, v] of this.lastInput)
				if (performance.now() - v.time > 700) {
					this.onInput(id, {
						x: 0,
						z: 0,
						ax: 0,
						az: 0,
						fire: false,
						boost: false,
						aim: false,
					});
					this.lastInput.delete(id);
				}
		} else this.send({ t: "i", i: input });
	}
	finish(state) {
		if (!this.hub || this.kind !== "host" || this.ended || this.finished)
			return;
		this.finished = true;
		const players = this.players.filter((p) => !this.left?.has(p.id));
		const score = (id) => state.tanks.find((t) => t.seat === id)?.score || 0;
		players.sort((a, b) => score(b.id) - score(a.id));
		const standings = [];
		for (const p of players) {
			const prev = standings[standings.length - 1];
			if (prev && score(prev[0]) === score(p.id)) prev.push(p.id);
			else standings.push([p.id]);
		}
		const scores = {},
			stats = {};
		for (const p of players) {
			const t = state.tanks.find((t) => t.seat === p.id);
			scores[p.id] = score(p.id);
			stats[p.id] = {
				Knockouts: t?.kills || 0,
				"Bank shots": t?.bankKills || 0,
				"Shots fired": t?.shots || 0,
			};
		}
		window.AIHub.finish({ standings, scores, stats });
	}
	leftPlayer(id) {
		if (!this.left) this.left = new Set();
		this.left.add(id);
	}
	createPeer(role) {
		this.close(true);
		this.ended = false;
		this.finished = false;
		this.kind = role;
		this.lastFrame = -1;
		this.frame = 0;
		this.peer = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.peer.ondatachannel = (e) => this.bindChannel(e.channel);
		this.peer.onconnectionstatechange = () => {
			if (
				["disconnected", "failed", "closed"].includes(
					this.peer?.connectionState,
				) &&
				this.active
			) {
				this.active = false;
				this.onDisconnect("The other pilot has left the field.");
			}
		};
		return this.peer;
	}
	bindChannel(ch) {
		this.channel = ch;
		ch.onopen = () => {
			this.active = true;
			this.lastHeard = performance.now();
			this.onConnected(this.kind);
		};
		ch.onmessage = (e) => {
			try {
				this.receive(JSON.parse(e.data), this.kind === "host" ? 1 : 0);
			} catch {}
		};
		ch.onclose = () => {
			if (this.active) {
				this.active = false;
				this.onDisconnect("The link has closed.");
			}
		};
	}
	async gather() {
		if (this.peer.iceGatheringState === "complete") return;
		const peer = this.peer;
		await new Promise((resolve) => {
			const done = () => {
				if (peer.iceGatheringState === "complete") {
					clearTimeout(timer);
					peer.removeEventListener("icegatheringstatechange", done);
					resolve();
				}
			};
			const timer = setTimeout(() => {
				peer.removeEventListener("icegatheringstatechange", done);
				resolve();
			}, 6500);
			peer.addEventListener("icegatheringstatechange", done);
		});
	}
	async hostOffer() {
		if (!window.RTCPeerConnection)
			throw Error(
				"This browser does not support direct links. Try a current browser.",
			);
		const p = this.createPeer("host");
		this.bindChannel(
			p.createDataChannel("combrisk", { ordered: false, maxRetransmits: 0 }),
		);
		await p.setLocalDescription(await p.createOffer());
		await this.gather();
		return `COMBRISK:${pack({ v: 1, type: "offer", sdp: p.localDescription.sdp })}`;
	}
	async joinOffer(code) {
		let offer;
		try {
			offer = unpack(code);
		} catch {
			throw Error(
				"That invitation is not a Combrisk code. Paste the complete code.",
			);
		}
		if (offer.v !== 1 || offer.type !== "offer")
			throw Error("Paste the host’s invitation here.");
		const p = this.createPeer("guest");
		await p.setRemoteDescription({ type: "offer", sdp: offer.sdp });
		await p.setLocalDescription(await p.createAnswer());
		await this.gather();
		return `COMBRISK:${pack({ v: 1, type: "answer", sdp: p.localDescription.sdp })}`;
	}
	async acceptAnswer(code) {
		let a;
		try {
			a = unpack(code);
		} catch {
			throw Error(
				"That reply is not a Combrisk code. Paste the complete code.",
			);
		}
		if (a.type !== "answer" || !this.peer)
			throw Error(
				"Create an invitation first, then paste your friend’s reply.",
			);
		await this.peer.setRemoteDescription({ type: "answer", sdp: a.sdp });
	}
	close(silent = false) {
		this.active = false;
		if (this.channel) {
			this.channel.onclose = null;
			this.channel.close();
		}
		if (this.peer) {
			this.peer.onconnectionstatechange = null;
			this.peer.close();
		}
		this.peer = null;
		this.channel = null;
		this.kind = "none";
		this.lastInput.clear();
		if (!silent) this.onDisconnect("Link closed.");
	}
}
