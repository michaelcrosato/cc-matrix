export class Network {
	constructor(game, sound, onStatus) {
		this.game = game;
		this.sound = sound;
		this.onStatus = onStatus;
		this.peers = new Map();
		this.active = false;
		this.host = false;
		this.started = false;
		this.ended = false;
		this.reported = false;
		this.sent = 0;
		this.received = 0;
		this.clock = 0;
		this.progressClock = 0;
		this.id = crypto.randomUUID?.() ?? String(Date.now() + Math.random());
		this.seed = 860511;
	}
	async init() {
		const hub = window.AIHub;
		this.hub = hub;
		if (!hub.active) return;
		hub.on("start", () => {
			this.started = true;
			this.reported = false;
		});
		hub.on("time-up", () => this.result());
		hub.on("end", () => {
			this.ended = true;
			this.game.mode = "ended";
			this.game.cb.overlay(null);
			this.game.cb.banner(
				"ROUND COMPLETE",
				"FLIGHT LOG FILED",
				"Awaiting the next AI Hub round.",
				999,
			);
			this.sound.stop();
		});
		hub.on("message", (data, from) => this.receive(data, String(from)));
		hub.on("leave", ({ id }) => {
			this.peers.delete(String(id));
			this.game.g.ghosts.get(String(id))?.removeFromParent();
		});
		const info = await hub.connect({ mode: "ghost", seats: [1, 4] });
		if (!info) return;
		this.active = true;
		this.hubMode = true;
		this.info = info;
		this.seed = info.seed;
		this.game.mode = "waiting";
		this.game.cb.screen("waiting");
	}
	ready() {
		if (this.hubMode) this.hub.ready();
	}
	packet() {
		const g = this.game;
		return {
			kind: "pilot",
			v: 1,
			sector: g.sector,
			x: +g.x.toFixed(3),
			y: +g.y.toFixed(3),
			z: 0,
			bank: +g.g.player.rotation.z.toFixed(3),
			score: Math.round(g.score),
			mode: g.mode,
		};
	}
	send(data) {
		if (!this.active || this.ended) return;
		this.sent++;
		if (this.hubMode) {
			this.hub.send(data, { reliable: false });
			return;
		}
		if (this.channel) this.channel.postMessage({ ...data, sender: this.id });
		if (this.dc?.readyState === "open")
			this.dc.send(JSON.stringify({ ...data, sender: this.id }));
	}
	receive(data, from) {
		if (!data || data.sender === this.id || this.ended) return;
		this.received++;
		if (
			data.kind === "pilot" &&
			Number.isFinite(data.x) &&
			Number.isFinite(data.y)
		) {
			const previous = this.peers.get(from);
			const name = this.hubMode
				? (this.info.players.find((p) => String(p.id) === from)?.name ??
					"Wing pilot")
				: (previous?.name ?? `Wing pilot ${this.peers.size + 1}`);
			this.peers.set(from, {
				...previous,
				...data,
				name,
				at: performance.now(),
			});
		}
		if (data.kind === "hello" && !this.hubMode) {
			this.peers.set(from, {
				name: "Wing pilot",
				at: performance.now(),
				mode: "lobby",
			});
			if (this.host) this.send({ kind: "welcome", seed: this.seed });
			this.onStatus("Wing pilot connected. Host can launch the race.");
		}
		if (data.kind === "welcome" && !this.hubMode) {
			this.seed = data.seed;
			this.onStatus("Connected to host. Waiting for launch.");
		}
		if (data.kind === "launch" && !this.hubMode) {
			this.seed = data.seed;
			this.launchAt = data.at;
			this.onStatus("Flight begins in a moment…");
		}
		if (data.kind === "result" && !this.hubMode) {
			const p = this.peers.get(from) ?? { name: "Wing pilot" };
			this.peers.set(from, {
				...p,
				score: data.score,
				finished: true,
				at: performance.now(),
			});
			this.onStatus(`Wing pilot finished: ${data.score} points.`);
		}
	}
	update(dt) {
		if (this.ended) return;
		if (
			this.hubMode &&
			this.started &&
			!this.launched &&
			this.hub.time() >= 0
		) {
			this.launched = true;
			this.game.start({ seed: this.seed });
		}
		if (this.launchAt && Date.now() >= this.launchAt) {
			this.launchAt = 0;
			this.launched = true;
			this.started = true;
			this.reported = false;
			this.game.start({ seed: this.seed });
		}
		if (!this.active || !this.launched) return;
		this.clock += dt;
		this.progressClock += dt;
		if (this.clock >= 0.1) {
			this.clock = 0;
			this.send(this.packet());
		}
		if (this.progressClock >= 1) {
			this.progressClock = 0;
			if (this.hubMode && !this.reported)
				this.hub.progress({
					score: Math.round(this.game.score),
					label:
						this.game.sector +
						1 +
						"/6 sectors · " +
						this.game.rescued.length +
						" cadets",
				});
		}
		for (const [id, p] of this.peers) {
			const visible =
				p.sector === this.game.sector &&
				p.mode === "playing" &&
				this.game.mode === "playing" &&
				performance.now() - p.at < 5000;
			this.game.g.ghost(id, {
				...p,
				visible,
				x: Math.max(-12, Math.min(12, p.x ?? 0)),
				y: Math.max(-3, Math.min(7, p.y ?? 0)),
			});
		}
	}
	result() {
		if (this.reported || this.ended) return;
		this.reported = true;
		const result = {
			score: Math.round(this.game.score),
			stats: {
				Cadets: this.game.metrics.rescues,
				"Sectors cleared": this.game.cleared.length,
				"Raiders down": this.game.metrics.kills,
			},
		};
		if (this.hubMode) this.hub.result(result);
		else this.send({ kind: "result", score: result.score });
	}
	local(room, host) {
		this.disconnect();
		this.host = host;
		this.active = true;
		this.room =
			room
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, "")
				.slice(0, 16) || "KESTREL";
		this.channel = new BroadcastChannel(`solar-mayhem-wing-${this.room}`);
		this.channel.onmessage = (e) => this.receive(e.data, e.data.sender);
		this.send({ kind: "hello" });
		if (host) this.channel.postMessage({ kind: "hello", sender: this.id });
		this.onStatus(
			"Wing channel " +
				this.room +
				" open. " +
				(host
					? "Invite a tab on this browser, then launch."
					: "Waiting for host."),
		);
	}
	launch() {
		if (!this.host || this.hubMode) return;
		const at = Date.now() + 1200;
		this.launchAt = at;
		this.send({ kind: "launch", seed: this.seed, at });
		this.onStatus("Launching the wing in 1 second…");
	}
	async rtc(host, offer = null) {
		this.disconnect();
		this.host = host;
		this.active = true;
		this.pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.pc.onconnectionstatechange = () => {
			if (this.pc?.connectionState === "failed")
				this.onStatus(
					"Connection failed. Try a local wing channel, or exchange new codes.",
				);
		};
		if (host) {
			this.bindData(
				this.pc.createDataChannel("solar-mayhem", {
					ordered: false,
					maxRetransmits: 0,
				}),
			);
			await this.pc.setLocalDescription(await this.pc.createOffer());
		} else {
			this.pc.ondatachannel = (e) => this.bindData(e.channel);
			await this.pc.setRemoteDescription(this.decode(offer));
			await this.pc.setLocalDescription(await this.pc.createAnswer());
		}
		await this.gather();
		return btoa(JSON.stringify(this.pc.localDescription));
	}
	async answer(code) {
		if (!this.pc) throw Error("Create an invitation first.");
		await this.pc.setRemoteDescription(this.decode(code));
		this.onStatus("Answer accepted. Connecting directly…");
	}
	decode(code) {
		let data;
		try {
			data = JSON.parse(atob(code.trim()));
		} catch {
			throw Error("That flight code could not be read. Paste the entire code.");
		}
		if (
			!["offer", "answer"].includes(data.type) ||
			typeof data.sdp !== "string"
		)
			throw Error("This is not a flight invitation.");
		return data;
	}
	gather() {
		return new Promise((resolve) => {
			if (this.pc.iceGatheringState === "complete") return resolve();
			const timer = setTimeout(resolve, 5000);
			this.pc.addEventListener("icegatheringstatechange", () => {
				if (this.pc?.iceGatheringState === "complete") {
					clearTimeout(timer);
					resolve();
				}
			});
		});
	}
	bindData(dc) {
		this.dc = dc;
		dc.onopen = () => {
			this.send({ kind: "hello" });
			this.onStatus(
				"Direct wing link connected. " +
					(this.host
						? "Launch when you are ready."
						: "Waiting for host to launch."),
			);
		};
		dc.onmessage = (e) => {
			try {
				const d = JSON.parse(e.data);
				this.receive(d, d.sender ?? "remote");
			} catch {}
		};
		dc.onclose = () => {
			this.onStatus("Wing link closed. Your solo flight can continue.");
		};
	}
	disconnect() {
		if (this.hubMode) return;
		this.active = false;
		this.started = false;
		this.launched = false;
		this.launchAt = 0;
		this.reported = false;
		this.ended = false;
		this.channel?.close();
		this.channel = null;
		this.dc?.close();
		this.dc = null;
		this.pc?.close();
		this.pc = null;
		this.peers.clear();
		this.game.g.clearGhosts();
	}
}
