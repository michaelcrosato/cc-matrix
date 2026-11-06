export class GhostNetwork {
	constructor(game) {
		this.game = game;
		this.peers = new Map();
		this.role = "";
		this.status = "Not connected";
		this.connected = false;
		this.hub = false;
		this.ended = false;
		this.sent = 0;
		this.received = 0;
		this.info = null;
		this.resultSent = false;
		this.countdown = false;
	}
	async initHub() {
		const h = window.AIHub;
		if (!h?.active) return false;
		this.hub = true;
		this.status = "Joining AI Hub";
		h.on("start", () => {
			this.countdown = true;
			this.game.start(false, true);
		});
		h.on("message", (d, from) => this.receive(d, from));
		h.on("leave", ({ id }) => {
			this.peers.delete(id);
			const g = this.game.scene.ghosts.get(id);
			if (g) g.root.visible = false;
		});
		h.on("time-up", () => {
			this.report();
			this.game.finish(false, "The expedition clock has spoken.");
		});
		h.on("end", () => {
			this.ended = true;
			this.game.mode = "ended";
			this.game.audio.stop();
			this.game.ui.hide();
		});
		this.info = await h.connect({ mode: "ghost", seats: [1, 4] });
		if (!this.info) {
			this.hub = false;
			return false;
		}
		this.connected = true;
		this.status = "AI Hub · ghost expedition";
		this.game.mode = "hub-wait";
		this.game.ui.hide();
		h.ready();
		return true;
	}
	pose() {
		const s = this.game.snapshot();
		return {
			type: "pose",
			stage: s.stage,
			x: s.x,
			y: s.y,
			face: this.game.face,
			anim: this.game.scene.player.animation,
			score: s.score,
			done: s.mode === "win",
		};
	}
	tick(dt) {
		if (this.ended) return;
		if (this.hub && this.countdown && AIHub.time() < 0) {
			this.game.ui.toast(
				String(Math.max(1, Math.ceil(-AIHub.time() / 1000))),
				0.15,
			);
			return;
		}
		if (!this.connected) return;
		this.sendClock = (this.sendClock || 0) + dt;
		this.progressClock = (this.progressClock || 0) + dt;
		if (this.sendClock >= 0.1) {
			this.sendClock = 0;
			this.send(this.pose());
		}
		if (this.hub && this.progressClock >= 1) {
			this.progressClock = 0;
			AIHub.progress({
				score:
					this.game.score +
					this.game.stage * 2500 +
					Math.max(0, this.game.position().x) * 10,
				label: `Act ${this.game.stage + 1}/4 · ${this.game.score} pts`,
			});
		}
		const now = performance.now();
		for (const [id, p] of this.peers) {
			const g = this.game.scene.ghost(
				id,
				p.color || [0xe8443a, 0x3b82f6, 0x22c55e, 0xf5b700][id % 4],
			);
			g.root.visible = p.stage === this.game.stage && now - p.when < 5000;
			if (g.root.visible) {
				g.root.position.x += (p.x - g.root.position.x) * Math.min(1, dt * 12);
				g.root.position.y +=
					(p.y - 0.88 - g.root.position.y) * Math.min(1, dt * 12);
				g.root.position.z = -0.8;
				g.root.rotation.y = p.face < 0 ? Math.PI : 0;
				g.play(p.anim || "run");
				g.mixer.update(dt);
			}
		}
		this.game.ui.network(
			this.status,
			[...this.peers.entries()].map(([id, p]) => ({
				id,
				score: p.score,
				stage: p.stage,
				done: p.done,
			})),
		);
	}
	send(data) {
		if (this.ended) return;
		if (this.hub) {
			AIHub.send(data, { reliable: false });
			this.sent++;
		} else if (this.channel?.readyState === "open") {
			this.channel.send(JSON.stringify(data));
			this.sent++;
		}
	}
	receive(data, from = 1) {
		if (this.ended || !data || typeof data !== "object") return;
		this.received++;
		if (
			data.type === "pose" &&
			Number.isFinite(data.x) &&
			Number.isFinite(data.y)
		) {
			const c = this.info?.players?.find((p) => p.id === from)?.color;
			this.peers.set(from, { ...data, color: c, when: performance.now() });
		}
		if (!this.hub && data.type === "start") {
			this.game.start(false, true);
		}
		if (!this.hub && data.type === "finish") {
			this.remoteResult = data;
			this.game.ui.network(
				this.status,
				[...this.peers.entries()].map(([id, p]) => ({
					id,
					score: p.score,
					stage: p.stage,
					done: true,
				})),
			);
		}
	}
	report() {
		if (this.resultSent) return;
		this.resultSent = true;
		if (this.hub) {
			const rescue = this.game.mode === "win";
			AIHub.result({
				...(rescue
					? { time: Math.max(0, AIHub.time()) }
					: {
							score:
								this.game.score +
								this.game.stage * 2500 +
								Math.max(0, this.game.position().x) * 10,
						}),
				stats: {
					Fireflies: this.game.collected,
					"Lives left": this.game.health,
					"Acts cleared": this.game.stage + (rescue ? 1 : 0),
				},
			});
		} else if (this.connected)
			this.send({
				type: "finish",
				score: this.game.score,
				time: this.game.elapsed,
			});
	}
	makePeer(role) {
		this.close();
		this.role = role;
		this.resultSent = false;
		this.pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.pc.onconnectionstatechange = () => {
			this.status =
				this.pc?.connectionState === "connected"
					? "Direct ghost race · connected"
					: `Connection: ${this.pc?.connectionState || "closed"}`;
			if (
				this.pc?.connectionState === "failed" ||
				this.pc?.connectionState === "disconnected"
			) {
				this.connected = false;
				this.game.ui.toast("Ghost disconnected. Your expedition continues.", 4);
			}
			this.game.ui.updateConnection();
		};
		if (role === "host")
			this.attachChannel(this.pc.createDataChannel("jungle-zip"));
		else this.pc.ondatachannel = (e) => this.attachChannel(e.channel);
	}
	attachChannel(c) {
		this.channel = c;
		c.onopen = () => {
			this.connected = true;
			this.status = "Direct ghost race · connected";
			this.game.ui.updateConnection();
		};
		c.onmessage = (e) => {
			try {
				this.receive(JSON.parse(e.data), this.role === "host" ? 1 : 0);
			} catch {}
		};
		c.onclose = () => {
			this.connected = false;
			this.status = "Race connection closed";
			this.game.ui.updateConnection();
		};
	}
	gather() {
		return new Promise((resolve) => {
			if (this.pc.iceGatheringState === "complete") return resolve();
			const end = () => {
				clearTimeout(timer);
				this.pc?.removeEventListener("icegatheringstatechange", check);
				resolve();
			};
			const check = () => {
				if (this.pc?.iceGatheringState === "complete") end();
			};
			const timer = setTimeout(end, 4500);
			this.pc.addEventListener("icegatheringstatechange", check);
		});
	}
	encode(desc) {
		return btoa(JSON.stringify({ v: 1, type: desc.type, sdp: desc.sdp }));
	}
	decode(text) {
		const d = JSON.parse(atob(text.trim()));
		if (
			d.v !== 1 ||
			!["offer", "answer"].includes(d.type) ||
			typeof d.sdp !== "string"
		)
			throw Error("That invitation is not a Jungle Zip race.");
		return { type: d.type, sdp: d.sdp };
	}
	async offer() {
		this.makePeer("host");
		await this.pc.setLocalDescription(await this.pc.createOffer());
		await this.gather();
		return this.encode(this.pc.localDescription);
	}
	async answer(text) {
		this.makePeer("join");
		const d = this.decode(text);
		if (d.type !== "offer") throw Error("Paste the host’s invitation here.");
		await this.pc.setRemoteDescription(d);
		await this.pc.setLocalDescription(await this.pc.createAnswer());
		await this.gather();
		return this.encode(this.pc.localDescription);
	}
	async accept(text) {
		if (!this.pc) throw Error("Create an invitation first.");
		const d = this.decode(text);
		if (d.type !== "answer") throw Error("Paste your friend’s answer here.");
		await this.pc.setRemoteDescription(d);
	}
	startRace() {
		if (this.channel?.readyState !== "open") return;
		this.send({ type: "start" });
		this.game.start(false, true);
	}
	close() {
		this.channel?.close();
		this.pc?.close();
		this.channel = null;
		this.pc = null;
		this.connected = false;
		this.peers.clear();
		this.remoteResult = null;
		this.role = "";
		this.status = "Not connected";
		this.resultSent = false;
	}
}
