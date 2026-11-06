const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export class Network {
	constructor(hooks) {
		this.hooks = hooks;
		this.kind = "none";
		this.peers = new Map();
		this.ended = false;
		this.active = false;
		this.reported = false;
		this.nextSend = 0;
		this.nextProgress = 0;
		this.hub = window.AIHub;
		this.pc = null;
		this.channel = null;
		this.host = false;
		this.connected = false;
		this.roundActive = false;
		this.connectionStatus = "Connect a friend. Same shift. Highest score wins.";
		if (this.hub?.active) this.connectPromise = this.connectHub();
	}
	async connectHub() {
		this.kind = "hub";
		this.active = true;
		const info = await this.hub.connect({ mode: "ghost", seats: [1, 4] });
		if (!info) {
			this.kind = "none";
			this.active = false;
			return;
		}
		this.info = info;
		this.hub.on("start", () => {
			this.waitingStart = true;
			this.hooks.waiting?.();
		});
		this.hub.on("message", (data, from) => this.receiveGhost(data, from));
		this.hub.on("leave", ({ id }) => {
			this.peers.delete(id);
			this.hooks.removeGhost?.(id);
		});
		this.hub.on("time-up", () => this.hooks.timeUp?.());
		this.hub.on("end", () => {
			this.ended = true;
			this.active = false;
			this.roundActive = false;
			this.hooks.end?.();
		});
		this.hooks.waiting?.();
	}
	async ready() {
		if (this.connectPromise) await this.connectPromise;
		if (this.kind === "hub" && !this.ended) this.hub.ready();
	}
	update(now, state) {
		if (this.ended) return;
		if (this.kind === "hub" && this.waitingStart) {
			const t = this.hub.time();
			this.hooks.countdown?.(t);
			if (t >= 0) {
				this.waitingStart = false;
				this.roundActive = true;
				this.hooks.start?.(this.hub.seed);
			}
		}
		if (this.kind === "rtc" && this.startAt && Date.now() >= this.startAt) {
			const seed = this.startSeed;
			this.startAt = 0;
			this.roundActive = true;
			this.reported = false;
			this.hooks.start?.(seed);
		}
		if (!this.roundActive || !state) return;
		if (now >= this.nextSend) {
			this.nextSend = now + 100;
			const p = state.players[0];
			if (p) {
				const data = {
					type: "ghost",
					stage: state.wave,
					x: +p.x.toFixed(3),
					buckets: p.buckets,
					score: state.score,
					charge: Math.round(state.charge),
					phase: state.phase,
				};
				if (this.kind === "hub") this.hub.send(data, { reliable: false });
				else this.send(data);
			}
		}
		if (this.kind === "hub" && now >= this.nextProgress) {
			this.nextProgress = now + 1000;
			this.hub.progress({
				score: state.score,
				label: `Shift ${state.wave + 1}/6 · ${state.stats.caught} caught`,
			});
		}
	}
	receiveGhost(d, id) {
		if (
			this.ended ||
			!d ||
			d.type !== "ghost" ||
			!Number.isFinite(d.x) ||
			!Number.isFinite(d.score)
		)
			return;
		if (this.kind === "hub" && !this.info.players.some((p) => p.id === id))
			return;
		const p = {
			x: clamp(d.x, -9.2, 9.2),
			buckets: clamp(d.buckets | 0, 0, 3),
			stage: clamp(d.stage | 0, 0, 5),
			score: clamp(d.score, 0, 1e9),
			phase: String(d.phase),
			name:
				this.kind === "hub"
					? this.info.players.find((p) => p.id === id)?.name || "Rival"
					: "Rival",
			color:
				this.kind === "hub"
					? this.info.players.find((p) => p.id === id)?.color || "#f07745"
					: "#f07745",
		};
		this.peers.set(id, p);
		this.hooks.ghost?.(id, p);
	}
	result(score, stats) {
		if (this.reported || this.ended) return;
		this.reported = true;
		if (this.kind === "hub")
			this.hub.result({
				score,
				stats: {
					Caught: stats.caught,
					"Perfect catches": stats.perfect,
					"Best combo": stats.bestCombo,
				},
			});
		else if (this.kind === "rtc") this.send({ type: "result", score, stats });
	}
	send(data) {
		if (this.channel?.readyState === "open") {
			this.channel.send(JSON.stringify(data));
			return true;
		}
		return false;
	}
	setStatus(t) {
		this.connectionStatus = t;
		this.hooks.status?.(t);
	}
	makePeer() {
		this.disconnect(false);
		this.ended = false;
		this.pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.pc.onconnectionstatechange = () => {
			const s = this.pc?.connectionState;
			if (s === "connected") {
				this.connected = true;
				this.kind = "rtc";
				this.active = true;
				this.setStatus(
					this.host
						? "Friend connected. Start when you are both ready."
						: "Connected! Your friend can start the race.",
				);
				this.hooks.connected?.(this.host);
			}
			if (s === "disconnected" || s === "failed") {
				this.connected = false;
				this.setStatus("Connection lost. You can finish the shift.");
				this.hooks.disconnect?.();
			}
		};
		this.pc.ondatachannel = (e) => this.bindChannel(e.channel);
		return this.pc;
	}
	bindChannel(ch) {
		this.channel = ch;
		ch.onopen = () => {
			this.connected = true;
			this.kind = "rtc";
			this.active = true;
			this.setStatus(
				this.host
					? "Friend connected. Start the race!"
					: "Connected! Waiting for your friend to start.",
			);
			this.hooks.connected?.(this.host);
		};
		ch.onmessage = (e) => {
			let d;
			try {
				d = JSON.parse(e.data);
			} catch {
				return;
			}
			if (d.type === "ghost") this.receiveGhost(d, "rtc");
			if (d.type === "start" && !this.host && Number.isFinite(d.seed)) {
				this.startSeed = d.seed >>> 0;
				this.startAt = Math.max(
					Date.now() + 300,
					Math.min(d.at, Date.now() + 6000),
				);
				this.roundActive = false;
				this.reported = false;
				this.peers.clear();
				this.hooks.waiting?.();
			}
			if (d.type === "result" && Number.isFinite(d.score)) {
				this.rivalResult = d;
				this.hooks.rivalResult?.(d);
			}
		};
	}
	async gather() {
		if (this.pc.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			const timer = setTimeout(done, 7000);
			const pc = this.pc;
			function done() {
				clearTimeout(timer);
				pc.removeEventListener("icegatheringstatechange", check);
				resolve();
			}
			function check() {
				if (pc.iceGatheringState === "complete") done();
			}
			pc.addEventListener("icegatheringstatechange", check);
		});
	}
	encode(desc) {
		return (
			"WHOOSH1." +
			btoa(
				unescape(
					encodeURIComponent(
						JSON.stringify({ type: desc.type, sdp: desc.sdp }),
					),
				),
			)
		);
	}
	decode(code) {
		if (!code.trim().startsWith("WHOOSH1."))
			throw new Error("That is not a Ka-Whoosh connection code.");
		const d = JSON.parse(
			decodeURIComponent(escape(atob(code.trim().slice(8)))),
		);
		if (
			!["offer", "answer"].includes(d.type) ||
			typeof d.sdp !== "string" ||
			d.sdp.length > 60000
		)
			throw new Error("Invalid connection code.");
		return d;
	}
	async createOffer() {
		const pc = this.makePeer();
		this.host = true;
		this.setStatus("Making your invite…");
		this.bindChannel(pc.createDataChannel("ka-whoosh"));
		await pc.setLocalDescription(await pc.createOffer());
		await this.gather();
		this.setStatus("Send your invite to a friend. Paste their reply below.");
		return this.encode(pc.localDescription);
	}
	async accept(code) {
		const desc = this.decode(code);
		if (desc.type === "offer") {
			const pc = this.makePeer();
			this.host = false;
			this.setStatus("Making a reply…");
			await pc.setRemoteDescription(desc);
			await pc.setLocalDescription(await pc.createAnswer());
			await this.gather();
			this.setStatus("Send this reply back to your friend.");
			return this.encode(pc.localDescription);
		}
		if (!this.pc || !this.host)
			throw new Error("Create an invite first, then paste the reply.");
		await this.pc.setRemoteDescription(desc);
		this.setStatus("Connecting…");
		return null;
	}
	beginRace() {
		if (!this.host || !this.connected) return;
		const a = new Uint32Array(1);
		crypto.getRandomValues(a);
		const seed = a[0],
			at = Date.now() + 3300;
		this.startSeed = seed;
		this.startAt = at;
		this.rivalResult = null;
		this.reported = false;
		this.roundActive = false;
		this.send({ type: "start", seed, at });
		this.hooks.waiting?.();
	}
	disconnect(notify = true) {
		if (this.pc) {
			this.pc.onconnectionstatechange = null;
			this.pc.close();
		}
		this.pc = null;
		if (this.channel) this.channel.close();
		this.channel = null;
		this.connected = false;
		this.roundActive = false;
		if (this.kind !== "hub") {
			this.kind = "none";
			this.active = false;
			this.peers.clear();
		}
		if (notify)
			this.setStatus("Disconnected. Create an invite or paste one to join.");
	}
}
