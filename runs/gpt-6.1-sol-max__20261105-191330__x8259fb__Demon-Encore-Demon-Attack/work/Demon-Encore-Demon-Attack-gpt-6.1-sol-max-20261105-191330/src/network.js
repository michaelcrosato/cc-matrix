export class Network {
	constructor(app) {
		this.app = app;
		this.hub = window.AIHub;
		this.active = false;
		this.host = true;
		this.me = 0;
		this.players = [{ id: 0, name: "PILOT 1" }];
		this.inputs = {};
		this.sent = 0;
		this.received = 0;
		this.inputTimer = 0;
		this.stateTimer = 0;
		this.finished = false;
		this.ended = false;
		this.kind = "solo";
		this.pendingStart = false;
		if (this.hub.active) {
			this.kind = "hub";
			this.active = true;
			this.hub.on("start", () => {
				this.pendingStart = true;
			});
			this.hub.on("message", (d, from) => this.message(d, from));
			this.hub.on("time-up", () => {
				if (this.host) this.finish(false);
			});
			this.hub.on("leave", ({ id }) => {
				delete this.inputs[id];
				this.players = this.players.filter((p) => p.id !== id);
				if (this.host && this.app.game?.players) {
					const p = this.app.game.players.find((p) => p.seat === id);
					if (p) {
						p.alive = false;
						p.left = true;
						p.hp = 0;
						this.app.game.move(p, p.x, -20);
					}
				}
				this.app.toast("A pilot left the formation.");
			});
			this.hub.on("end", ({ reason }) => {
				this.ended = true;
				this.app.hubEnd(reason);
			});
		}
	}
	async init() {
		if (!this.hub.active) return null;
		const info = await this.hub.connect({
			mode: "shared-world",
			seats: [1, 4],
		});
		if (!info) {
			this.active = false;
			this.kind = "solo";
			return null;
		}
		this.info = info;
		this.host = info.isHost;
		this.me = info.me;
		this.players = info.players;
		this.app.seed = Math.floor(this.hub.rng("demon-encore")() * 2147483647);
		return info;
	}
	ready() {
		if (this.active && this.kind === "hub") this.hub.ready();
	}
	message(data, from = 1) {
		if (this.ended || !data || typeof data !== "object") return;
		this.received++;
		if (
			data.k === "i" &&
			this.host &&
			this.players.some((p) => p.id === from)
		) {
			this.inputs[from] = {
				move: Math.max(-1, Math.min(1, Number(data.m) || 0)),
				fire: !!data.f,
				dash: !!data.d,
				nova: !!data.n,
				width: Math.max(2.2, Math.min(9, Number(data.w) || 9)),
				at: performance.now(),
			};
			if (Number.isFinite(data.x))
				this.inputs[from].target = Math.max(
					-this.app.view.width,
					Math.min(this.app.view.width, data.x),
				);
		} else if (
			data.k === "s" &&
			!this.host &&
			data.s &&
			data.s.time >= (this.app.game?.time || 0)
		) {
			this.app.receive(data.s);
		} else if (data.k === "hello" && !this.host && this.kind === "peer") {
			this.app.seed = data.seed;
			this.app.difficulty = data.difficulty;
			this.app.beginRemote();
			this.app.toast("LINK ESTABLISHED · GOOD HUNTING");
		} else if (data.k === "done" && !this.host && this.kind === "peer") {
			this.app.showResult(data.result);
		}
	}
	send(data, toHost = false) {
		if (this.ended) return false;
		if (this.kind === "hub") {
			const ok = this.hub.send(
				data,
				toHost ? { to: this.info.host, reliable: false } : { reliable: false },
			);
			if (ok) this.sent++;
			return ok;
		}
		if (this.dc?.readyState === "open" && this.dc.bufferedAmount < 100000) {
			this.dc.send(JSON.stringify(data));
			this.sent++;
			return true;
		}
		return false;
	}
	tick(dt, input) {
		if (!this.active || this.ended) return;
		if (
			this.kind === "hub" &&
			this.pendingStart &&
			this.hub.time() >= 0 &&
			!this.app.started
		) {
			if (this.host) this.app.beginHub();
			else this.app.beginRemote();
		}
		if (!this.app.started) return;
		if (this.host) {
			if (this.app.game?.world)
				this.app.game.width = Math.min(
					this.app.view.width,
					...Object.values(this.inputs).map((v) => v.width || 9),
				);
			this.stateTimer += dt;
			if (this.stateTimer >= 0.125 && this.app.game?.snapshot) {
				this.stateTimer = 0;
				this.send({ k: "s", s: this.app.game.snapshot() });
			}
			for (const [id, v] of Object.entries(this.inputs))
				if (performance.now() - v.at > 1300) delete this.inputs[id];
		} else {
			this.inputTimer += dt;
			if (this.inputTimer >= 0.085) {
				this.inputTimer = 0;
				this.send(
					{
						k: "i",
						m: input.move || 0,
						f: input.fire,
						d: input.dash,
						n: input.nova,
						x: input.target,
						w: this.app.view.width,
					},
					true,
				);
				this.app.input.consume(0);
			}
		}
	}
	finish(won) {
		if (this.finished || !this.host || this.ended) return;
		this.finished = true;
		const g = this.app.game;
		if (this.kind === "hub") {
			const seats = this.players
				.filter((p) => g?.players.some((q) => q.seat === p.id))
				.map((p) => p.id);
			this.hub.finish({
				standings: [seats],
				scores: Object.fromEntries(
					seats.map((id) => [
						id,
						g?.players.find((p) => p.seat === id)?.score || 0,
					]),
				),
				won,
				stats: Object.fromEntries(
					seats.map((id) => [
						id,
						{
							"Team score": g?.score || 0,
							Encounters: Math.max(0, (g?.wave || 0) + 1),
						},
					]),
				),
			});
		} else if (this.kind === "peer")
			this.send({
				k: "done",
				result: g?.result || { won, score: g?.score || 0 },
			});
	}
	async ice() {
		if (this.pc.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			const timer = setTimeout(resolve, 4000);
			this.pc.addEventListener("icegatheringstatechange", () => {
				if (this.pc.iceGatheringState === "complete") {
					clearTimeout(timer);
					resolve();
				}
			});
		});
	}
	createPC(host) {
		if (this.hub.active)
			throw new Error("Direct links are unavailable in Hub sessions.");
		this.closePeer();
		this.kind = "peer";
		this.host = host;
		this.me = host ? 0 : 1;
		this.players = [
			{ id: 0, name: "PILOT 1" },
			{ id: 1, name: "PILOT 2" },
		];
		this.pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.pc.ondatachannel = (e) => this.bindChannel(e.channel);
		this.pc.onconnectionstatechange = () => {
			if (
				["failed", "disconnected", "closed"].includes(this.pc?.connectionState)
			) {
				this.app.toast("Link lost. You can return to the hangar from Pause.");
				if (this.host && this.app.game?.players[1]) {
					const p = this.app.game.players[1];
					p.alive = false;
					p.left = true;
					p.hp = 0;
					this.app.game.move(p, p.x, -20);
				}
			}
		};
		if (host)
			this.bindChannel(
				this.pc.createDataChannel("demon-encore", { ordered: true }),
			);
	}
	bindChannel(dc) {
		this.dc = dc;
		dc.onclose = () => {
			if (this.kind !== "peer" || !this.active || this.ended) return;
			this.app.toast("LINK CLOSED · RETURN TO HANGAR FROM PAUSE");
			if (this.host && this.app.game?.players[1]) {
				const p = this.app.game.players[1];
				p.alive = false;
				p.left = true;
				p.hp = 0;
				delete this.inputs[1];
				this.app.game.move(p, p.x, -20);
			}
		};
		dc.onmessage = (e) => {
			try {
				this.message(JSON.parse(e.data), this.host ? 1 : 0);
			} catch {
				this.app.toast("The link sent unreadable data.");
			}
		};
		dc.onopen = () => {
			this.active = true;
			this.ended = false;
			this.finished = false;
			if (this.host) {
				this.send({
					k: "hello",
					seed: this.app.seed,
					difficulty: this.app.difficulty,
				});
				this.app.begin(2, "peer");
			}
		};
	}
	encode(d) {
		return btoa(JSON.stringify(d));
	}
	decode(text) {
		let d;
		try {
			d = JSON.parse(atob(text.trim()));
		} catch {
			throw new Error("That capsule could not be read. Paste the whole code.");
		}
		if (!["offer", "answer"].includes(d.type) || typeof d.sdp !== "string")
			throw new Error("That is not a link capsule.");
		return d;
	}
	async offer() {
		this.createPC(true);
		await this.pc.setLocalDescription(await this.pc.createOffer());
		await this.ice();
		return this.encode(this.pc.localDescription);
	}
	async answer(code) {
		this.createPC(false);
		await this.pc.setRemoteDescription(this.decode(code));
		await this.pc.setLocalDescription(await this.pc.createAnswer());
		await this.ice();
		return this.encode(this.pc.localDescription);
	}
	async accept(code) {
		if (!this.pc || !this.host) throw new Error("Create an invitation first.");
		await this.pc.setRemoteDescription(this.decode(code));
	}
	closePeer() {
		if (this.dc) this.dc.onclose = null;
		this.dc?.close();
		if (this.pc) {
			this.pc.onconnectionstatechange = null;
			this.pc.close();
		}
		this.dc = null;
		this.pc = null;
		if (this.kind === "peer") {
			this.active = false;
			this.kind = "solo";
			this.host = true;
			this.me = 0;
			this.players = [{ id: 0, name: "PILOT 1" }];
		}
		this.finished = false;
		this.ended = false;
		this.inputs = {};
	}
}
