export class WingLink {
	constructor() {
		this.hub = window.AIHub;
		this.active = false;
		this.info = null;
		this.peers = new Map();
		this.id = crypto.randomUUID().slice(0, 8);
		this.room = "frostline-07";
		this.bc = null;
		this.pc = null;
		this.dc = null;
		this.timer = 0;
		this.reportTimer = 0;
		this.sent = 0;
		this.received = 0;
		this.resultSent = false;
		this.started = false;
		this.ended = false;
		this.status = "Solo flight";
		this.handlers = {};
	}
	async init() {
		if (this.hub.active) {
			this.info = await this.hub.connect({ mode: "ghost", seats: [1, 4] });
			this.active = !!this.info;
			if (this.active) {
				this.id = this.info.me;
				this.status = "AI HUB · " + this.info.players.length + " PILOTS";
				this.hub.on("start", () => {
					this.started = true;
					this.handlers.start?.();
				});
				this.hub.on("message", (data, from) => {
					if (this.ended) return;
					if (data?.type === "wing" && typeof data.x === "number") {
						const p = this.info.players.find((p) => p.id === from);
						this.receive({
							...data,
							id: from,
							name: p?.name || "Wing",
							color: p?.color || "#86e6e3",
						});
					}
				});
				this.hub.on("leave", ({ id }) => {
					this.peers.delete(id);
					this.handlers.leave?.(id);
				});
				this.hub.on("time-up", () => this.handlers.timeup?.());
				this.hub.on("end", () => {
					this.ended = true;
					this.handlers.end?.();
				});
				return;
			}
		}
		this.joinLocal(this.room);
	}
	ready() {
		if (this.active) this.hub.ready();
	}
	joinLocal(room) {
		if (this.active) return;
		this.bc?.close();
		this.peers.clear();
		this.room =
			String(room || "frostline-07")
				.replace(/[^a-zA-Z0-9_-]/g, "")
				.slice(0, 30) || "frostline-07";
		try {
			this.bc = new BroadcastChannel("pose-wing-" + this.room);
			this.bc.onmessage = (e) => {
				if (e.data?.type === "wing" && e.data.id !== this.id)
					this.receive(e.data);
			};
			this.status = "LOCAL WING · " + this.room;
		} catch {
			this.status = "Direct link available";
		}
	}
	receive(data) {
		if (!Number.isFinite(data.x) || !Number.isFinite(data.z)) return;
		data.seen = performance.now();
		this.peers.set(data.id, data);
		this.received++;
	}
	tick(state, dt) {
		if (this.ended) return;
		this.timer += dt;
		this.reportTimer += dt;
		if (this.active && !this.started) return;
		if (this.timer >= 0.1) {
			this.timer = 0;
			const d = {
				type: "wing",
				id: this.id,
				name: "Wing " + this.id.slice?.(0, 3),
				color: "#86e6e3",
				x: +state.x.toFixed(2),
				y: +state.y.toFixed(2),
				z: +state.z.toFixed(2),
				yaw: +state.yaw.toFixed(3),
				stage: state.stage,
				score: state.score,
				fire: state.fire,
				live: state.live,
			};
			if (this.active) this.hub.send(d, { reliable: false });
			else {
				this.bc?.postMessage(d);
				if (this.dc?.readyState === "open") this.dc.send(JSON.stringify(d));
			}
			this.sent++;
		}
		if (this.active && this.reportTimer >= 1) {
			this.reportTimer = 0;
			this.hub.progress({
				score: state.score,
				label: ["Scouts", "Walkers", "Evacuation"][state.stage] || "Sortie",
			});
		}
		for (const [id, p] of this.peers) {
			if (performance.now() - p.seen > 8000) this.peers.delete(id);
		}
	}
	finish(score, stats) {
		if (this.active && !this.resultSent && !this.ended) {
			this.resultSent = true;
			this.hub.result({ score, stats });
		}
	}
	newRun() {
		if (!this.active) this.resultSent = false;
	}
	bindChannel(dc) {
		this.dc = dc;
		dc.onopen = () => {
			this.status = "DIRECT WING · CONNECTED";
			this.handlers.status?.(this.status);
		};
		dc.onclose = () => {
			this.status = "DIRECT WING · DISCONNECTED";
			this.handlers.status?.(this.status);
		};
		dc.onmessage = (e) => {
			try {
				const d = JSON.parse(e.data);
				if (d.type === "wing")
					this.receive({
						...d,
						id: "direct",
						name: "Direct wing",
						color: "#ef9b60",
					});
			} catch {}
		};
	}
	createPC() {
		this.pc?.close();
		const pc = new RTCPeerConnection({ iceServers: [] });
		this.pc = pc;
		pc.ondatachannel = (e) => this.bindChannel(e.channel);
		pc.onconnectionstatechange = () => {
			if (pc.connectionState === "failed") {
				this.status =
					"Link failed. Create a new invite; this network may block direct connections.";
				this.handlers.status?.(this.status);
			}
		};
		return pc;
	}
	async gather(pc) {
		if (pc.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			let done = false;
			const timer = setTimeout(() => {
				if (!done) {
					done = true;
					resolve();
				}
			}, 4000);
			pc.addEventListener("icegatheringstatechange", () => {
				if (pc.iceGatheringState === "complete" && !done) {
					done = true;
					clearTimeout(timer);
					resolve();
				}
			});
		});
	}
	encode(d) {
		return btoa(JSON.stringify({ v: 1, type: d.type, sdp: d.sdp }));
	}
	decode(code) {
		try {
			const d = JSON.parse(atob(code.trim()));
			if (
				d.v !== 1 ||
				!["offer", "answer"].includes(d.type) ||
				typeof d.sdp !== "string"
			)
				throw Error();
			return { type: d.type, sdp: d.sdp };
		} catch {
			throw Error("That connection code is incomplete. Paste the full code.");
		}
	}
	async invite() {
		if (this.active) throw Error("AI Hub manages this wing.");
		const pc = this.createPC();
		this.bindChannel(
			pc.createDataChannel("frostline-wing", {
				ordered: false,
				maxRetransmits: 0,
			}),
		);
		await pc.setLocalDescription(await pc.createOffer());
		await this.gather(pc);
		return this.encode(pc.localDescription);
	}
	async accept(code) {
		if (this.active) throw Error("AI Hub manages this wing.");
		const desc = this.decode(code);
		if (desc.type === "answer") {
			if (!this.pc || this.pc.signalingState !== "have-local-offer")
				throw Error("Create an invite before accepting an answer.");
			await this.pc.setRemoteDescription(desc);
			return null;
		}
		const pc = this.createPC();
		await pc.setRemoteDescription(desc);
		await pc.setLocalDescription(await pc.createAnswer());
		await this.gather(pc);
		return this.encode(pc.localDescription);
	}
	close() {
		this.bc?.close();
		this.dc?.close();
		this.pc?.close();
	}
}
