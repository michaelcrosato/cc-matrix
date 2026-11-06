export class ExpeditionNetwork {
	constructor(game) {
		this.g = game;
		this.hub = false;
		this.host = true;
		this.me = 0;
		this.server = false;
		this.connected = false;
		this.ended = false;
		this.roster = [{ id: 0, name: "Pip", color: "#e9bd78" }];
		this.inputs = new Map();
		this.commands = new Map();
		this.seq = 0;
		this.clock = 0;
		this.interact = false;
		this.sent = 0;
		this.received = 0;
		this.finished = false;
		this.lastHeard = 0;
		addEventListener("pagehide", () => {
			if (!this.hub && this.channel?.readyState === "open")
				this.channel.send(JSON.stringify({ k: "bye" }));
		});
	}
	async init() {
		if (!window.AIHub?.active) return;
		const info = await AIHub.connect({ mode: "shared-world", seats: [1, 4] });
		if (!info) return;
		this.hub = true;
		this.connected = true;
		this.host = info.isHost;
		this.me = info.me;
		this.server = info.server;
		this.roster = info.players;
		this.hostId = info.host;
		AIHub.on("start", () => {
			this.g.hubStarted = true;
		});
		AIHub.on("message", (data, from) => this.receive(data, from));
		AIHub.on("leave", ({ id }) => {
			this.roster = this.roster.filter((p) => p.id !== id);
			this.g.removeExplorer(id);
		});
		AIHub.on("time-up", () => this.finish(this.g.state?.won || false));
		AIHub.on("end", () => {
			this.ended = true;
			this.g.mode = "ended";
			this.g.audio.mute(true);
			this.g.ui.show("ended");
		});
	}
	ready() {
		if (this.hub) AIHub.ready();
	}
	label() {
		return this.hub
			? `AI HUB · ${this.roster.length} EXPLORERS`
			: this.channel
				? `DIRECT CO-OP · ${this.host ? "HOST" : "EXPLORER 2"}`
				: "COUCH CO-OP · 2 EXPLORERS";
	}
	receive(data, from) {
		if (this.ended || !data || typeof data !== "object") return;
		this.received++;
		this.lastHeard = performance.now();
		if (!this.hub && data.k === "bye") {
			this.continueSolo();
			return;
		}
		if (
			this.host &&
			data.k === "input" &&
			this.roster.some((p) => p.id === from)
		) {
			const prev = this.inputs.get(from);
			if (prev && data.seq <= prev.seq) return;
			const command = this.commands.get(from) || {};
			if (data.interact) command.interact = true;
			if (data.jump && !prev?.jump) command.jump = true;
			if (command.interact || command.jump) this.commands.set(from, command);
			this.inputs.set(from, {
				x: Math.max(-1, Math.min(1, Number(data.x) || 0)),
				y: Math.max(-1, Math.min(1, Number(data.y) || 0)),
				jump: !!data.jump,
				interact: false,
				seq: Number(data.seq) || 0,
				at: performance.now(),
			});
		} else if (
			!this.host &&
			data.k === "world" &&
			(!this.hub || from === this.hostId)
		)
			this.g.applySnapshot(data.s);
	}
	send(data) {
		if (this.ended) return;
		if (this.hub) {
			AIHub.send(data, {
				to: this.host ? undefined : this.hostId,
				reliable: true,
			});
			this.sent++;
		} else if (this.channel?.readyState === "open") {
			this.channel.send(JSON.stringify(data));
			this.sent++;
		}
	}
	tick(dt) {
		if (!this.connected || this.ended || this.g.mode !== "playing") return;
		if (
			!this.hub &&
			this.channel &&
			performance.now() - this.lastHeard > 7000
		) {
			this.continueSolo();
			return;
		}
		this.clock += dt;
		if (this.clock < (this.host ? 0.1 : 1 / 15)) return;
		this.clock = 0;
		if (this.host) this.send({ k: "world", s: this.g.snapshot() });
		else {
			const input = this.g.ui.current
				? { x: 0, y: 0, jump: false }
				: this.g.controls.read(0);
			this.send({
				k: "input",
				...input,
				interact: this.interact,
				seq: ++this.seq,
			});
			this.interact = false;
		}
	}
	finish(won) {
		if (!this.hub || !this.host || this.finished || this.ended) return;
		this.finished = true;
		const ids = this.roster.map((p) => p.id),
			scores = {},
			stats = {};
		for (const id of ids) {
			scores[id] = this.g.state.score;
			stats[id] = {
				"Golden crumbs": this.g.state.crumbs.filter(Boolean).length,
				"Friends found": this.g.state.found.filter(Boolean).length,
				Seconds: Math.floor(this.g.state.time),
			};
		}
		AIHub.finish({ standings: [ids], scores, won, stats });
	}
	async makePeer(host) {
		if (this.peer) this.peer.close();
		this.channel = null;
		this.host = host;
		this.me = host ? 0 : 1;
		this.hostId = 0;
		this.peer = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.peer.onconnectionstatechange = () => {
			const s = this.peer.connectionState;
			this.status(`Connection: ${s}`);
			if (["failed", "disconnected", "closed"].includes(s)) {
				if (s === "failed")
					this.status(
						"Peer not reachable. Create a fresh invitation or use AI Hub.",
					);
				this.continueSolo();
			}
		};
		this.peer.ondatachannel = (e) => this.bindChannel(e.channel);
		if (host)
			this.bindChannel(
				this.peer.createDataChannel("lost-lunch", { ordered: true }),
			);
		return this.peer;
	}
	bindChannel(channel) {
		this.channel = channel;
		channel.onopen = () => {
			this.connected = true;
			this.ended = false;
			this.finished = false;
			this.inputs.clear();
			this.commands.clear();
			this.seq = 0;
			this.lastHeard = performance.now();
			this.roster = [
				{ id: 0, name: "Pip", color: "#e9bd78" },
				{ id: 1, name: "Pal", color: "#8fcbd0" },
			];
			this.status("Connected. Packing two lunches!");
			this.g.start(2);
			this.g.ui.toast(
				"Two explorers. One expedition.",
				"Your discoveries are shared.",
			);
		};
		channel.onmessage = (e) => {
			try {
				this.receive(JSON.parse(e.data), this.host ? 1 : 0);
			} catch {
				this.status("A connection packet could not be read.");
			}
		};
		channel.onclose = () => this.continueSolo();
	}
	continueSolo() {
		if (!this.connected || this.hub) return;
		this.connected = false;
		this.host = true;
		this.roster = this.roster.filter((p) => p.id === this.me);
		this.g.players
			.filter((p) => p.id !== this.me)
			.forEach((p) => {
				this.g.removeExplorer(p.id);
			});
		this.inputs.clear();
		this.commands.clear();
		if (this.channel?.readyState === "open") this.channel.close();
		this.channel = null;
		this.g.ui.toast(
			"Your friend left the trail.",
			"Your discoveries are safe. Carry on from here.",
		);
	}
	async gather() {
		if (this.peer.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			const timeout = setTimeout(done, 7000);
			const peer = this.peer;
			function done() {
				clearTimeout(timeout);
				peer.removeEventListener("icegatheringstatechange", change);
				resolve();
			}
			function change() {
				if (peer.iceGatheringState === "complete") done();
			}
			peer.addEventListener("icegatheringstatechange", change);
		});
	}
	encode(desc) {
		return btoa(
			JSON.stringify({ game: "lost-lunch-v1", type: desc.type, sdp: desc.sdp }),
		);
	}
	decode(s) {
		const d = JSON.parse(atob(s.trim()));
		if (
			d.game !== "lost-lunch-v1" ||
			!["offer", "answer"].includes(d.type) ||
			typeof d.sdp !== "string"
		)
			throw new Error("Use an invitation or reply from The Lost Lunch.");
		return { type: d.type, sdp: d.sdp };
	}
	async offer() {
		try {
			this.status("Finding a route between devices…");
			await this.makePeer(true);
			await this.peer.setLocalDescription(await this.peer.createOffer());
			await this.gather();
			this.output(this.encode(this.peer.localDescription));
			this.status("Send this invitation. Paste your friend’s reply above.");
		} catch (e) {
			this.status(e.message);
		}
	}
	async accept(text) {
		try {
			const d = this.decode(text);
			if (d.type === "offer") {
				this.status("Joining the trail…");
				await this.makePeer(false);
				await this.peer.setRemoteDescription(d);
				await this.peer.setLocalDescription(await this.peer.createAnswer());
				await this.gather();
				this.output(this.encode(this.peer.localDescription));
				this.status("Send this reply to the host. Keep this page open.");
			} else {
				if (!this.peer || !this.host)
					throw new Error("Create an invitation on this device first.");
				await this.peer.setRemoteDescription(d);
				this.status("Reply accepted. Connecting…");
			}
		} catch (e) {
			this.status(e.message || "Connection code is not valid.");
		}
	}
	status(text) {
		const el = document.querySelector("#link-status");
		if (el) el.textContent = text;
	}
	output(text) {
		const el = document.querySelector("#signal-out");
		if (el) el.value = text;
	}
	close() {
		this.connected = false;
		if (this.channel) this.channel.close();
		if (this.peer) this.peer.close();
		this.peer = null;
		this.channel = null;
		this.host = true;
		this.me = 0;
		this.roster = [{ id: 0, name: "Pip", color: "#e9bd78" }];
		this.inputs.clear();
		this.commands.clear();
	}
}
