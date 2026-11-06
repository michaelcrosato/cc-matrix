import Peer from "peerjs";

export class KitchenNetwork {
	constructor(app) {
		this.app = app;
		this.kind = "none";
		this.host = true;
		this.me = 0;
		this.players = [{ id: 0, name: "Chef 1" }];
		this.remoteInputs = {};
		this.peers = new Map();
		this.seq = 0;
		this.lastSnapshot = -1;
		this.sent = 0;
		this.received = 0;
		this.finished = false;
		this.started = false;
		this.pendingEvents = [];
		this.clientId = crypto.randomUUID();
		this.room = "";
		this.timer = 0;
		this.pendingInput = {};
		this.lastSend = 0;
	}
	get active() {
		return this.kind !== "none";
	}
	async hub() {
		if (!window.AIHub?.active) return false;
		const info = await AIHub.connect({ mode: "shared-world", seats: [1, 4] });
		if (!info) return false;
		this.kind = "hub";
		this.host = info.isHost;
		this.me = info.server ? -1 : info.me;
		this.players = info.players;
		this.info = info;
		this.app.configureNetwork(info.seed, this.players, this.me);
		this.app.open("hubWaiting");
		AIHub.on("message", (data, from) => this.receive(data, from));
		AIHub.on("start", () => {
			this.started = true;
			this.app.hubCountdown = true;
			this.app.open(null);
		});
		AIHub.on("time-up", () => {
			if (this.host)
				this.finish(
					this.app.state.totalServed >= 15 && this.app.state.rating > 0,
				);
		});
		AIHub.on("leave", ({ id }) => {
			this.players = this.players.filter((p) => p.id !== id);
			this.app.sim.removePlayer(id);
			delete this.remoteInputs[id];
		});
		AIHub.on("end", ({ reason }) => {
			this.finished = true;
			this.app.hubEnded = true;
			this.app.audio.muted = true;
			this.app.audio.updateGains();
			this.app.open("hubEnd");
			this.app.hubEndReason = reason;
		});
		AIHub.ready();
		return true;
	}
	broadcast(data, to) {
		if (this.finished) return;
		this.sent++;
		if (this.kind === "hub") {
			AIHub.send(data, {
				...(to !== undefined ? { to } : {}),
				reliable: data.t !== "s",
			});
			return;
		}
		this.channel?.postMessage({ from: this.clientId, to, ...data });
		if (this.host) {
			for (const [id, p] of this.peers)
				if (p.open && (to === undefined || to === id)) p.send(data);
		} else if (this.connection?.open) this.connection.send(data);
	}
	input(input) {
		this.pendingInput = {
			...input,
			action: input.action || this.pendingInput.action,
			actionPress: input.actionPress || this.pendingInput.actionPress,
			dash: input.dash || this.pendingInput.dash,
			brake: input.brake || this.pendingInput.brake,
		};
	}
	tick(dt) {
		if (!this.active || this.finished) return;
		this.timer += dt;
		if (this.timer < 0.1) return;
		this.timer = 0;
		if (this.host) {
			const events = this.pendingEvents.splice(0);
			this.broadcast({
				t: "s",
				seq: ++this.seq,
				state: this.app.sim.snapshot(),
				events,
			});
		} else {
			this.broadcast(
				{ t: "i", input: this.pendingInput, seq: ++this.seq },
				this.kind === "hub" ? this.info.host : undefined,
			);
			this.pendingInput = {
				...this.pendingInput,
				action: false,
				actionPress: false,
				dash: false,
				brake: false,
			};
		}
	}
	receive(data, from) {
		if (!data || typeof data !== "object" || this.finished) return;
		this.received++;
		if (data.t === "depart" && this.host) this.dropGuest(from);
		if (data.t === "i" && this.host) {
			if (!this.players.some((p) => p.id === from) || from === this.me) return;
			const i = data.input || {};
			this.remoteInputs[from] = {
				x: Math.max(-1, Math.min(1, Number(i.x) || 0)),
				z: Math.max(-1, Math.min(1, Number(i.z) || 0)),
				action: !!i.action,
				actionPress: !!i.actionPress,
				reject: !!i.reject,
				dash: !!i.dash,
				brake: !!i.brake,
				at: performance.now(),
			};
		}
		if (data.t === "s" && !this.host && data.seq > this.lastSnapshot) {
			this.lastSnapshot = data.seq;
			this.app.remoteState = data.state;
			for (const e of data.events || []) this.app.effect(e);
			if (
				this.kind === "standalone" &&
				this.started &&
				this.app.screen === "room" &&
				data.state.mode === "playing"
			)
				this.app.open(null);
		}
		if (data.t === "welcome" && !this.host) {
			this.me = data.id;
			this.players = data.players;
			this.started = !!data.started;
			this.app.configureNetwork(data.seed, this.players, this.me);
			this.app.roomStatus = "Connected. Aprons on — waiting for the host.";
			this.app.open("room");
		}
		if (data.t === "roster") {
			this.players = data.players;
			if (this.app.screen === "room") this.app.open("room");
		}
		if (data.t === "go" && !this.host) {
			this.started = true;
			this.app.open(null);
		}
		if (data.t === "bye") {
			this.app.roomStatus = "The host closed the kitchen.";
			this.disconnect();
			this.app.open("online");
		}
		if (data.t === "full") {
			this.app.roomStatus = "This kitchen already has four chefs.";
			this.disconnect();
			this.app.open("online");
		}
	}
	addGuest(key, send) {
		const record = this.guests?.get(key);
		if (record) {
			send({
				t: "welcome",
				id: record,
				players: this.players,
				seed: this.seed,
				started: this.started,
			});
			return record;
		}
		if (this.players.length >= 4) {
			send({ t: "full" });
			return null;
		}
		const id = [1, 2, 3].find((i) => !this.players.some((p) => p.id === i));
		this.guests ??= new Map();
		this.guests.set(key, id);
		this.players.push({ id, name: `Chef ${id + 1}` });
		this.app.sim.addPlayer(id);
		send({
			t: "welcome",
			id,
			players: this.players,
			seed: this.seed,
			started: this.started,
		});
		this.broadcast({ t: "roster", players: this.players });
		if (this.app.screen === "room") this.app.open("room");
		return id;
	}
	setupChannel(code) {
		this.channel = new BroadcastChannel(`press-for-burgers-${code}`);
		this.channel.onmessage = ({ data }) => {
			if (
				data.from === this.clientId ||
				(data.to !== undefined &&
					data.to !== this.clientId &&
					data.to !== this.me)
			)
				return;
			if (this.host && data.t === "hello") {
				this.addGuest(data.from, (d) =>
					this.channel.postMessage({
						...d,
						from: this.clientId,
						to: data.from,
					}),
				);
			} else if (this.host) this.receive(data, this.guests?.get(data.from));
			else this.receive(data, 0);
		};
	}
	async hostRoom() {
		this.disconnect();
		this.kind = "standalone";
		this.host = true;
		this.me = 0;
		this.seed = crypto.getRandomValues(new Uint32Array(1))[0];
		this.room = Array.from(
			crypto.getRandomValues(new Uint8Array(6)),
			(x) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[x % 32],
		).join("");
		this.players = [{ id: 0, name: "Chef 1" }];
		this.guests = new Map();
		this.setupChannel(this.room);
		this.app.configureNetwork(this.seed, this.players, 0);
		this.app.roomStatus =
			"Room is ready on this device. Opening internet connection…";
		this.app.open("room");
		try {
			this.peer = new Peer(`press-for-burgers-${this.room}`, { debug: 0 });
			this.peer.on("open", () => {
				this.app.roomStatus =
					"Internet room open. Share the six-letter code with your crew.";
				if (this.app.screen === "room") this.app.open("room");
			});
			this.peer.on("connection", (c) => {
				let id = null;
				c.on("open", () => {
					id = this.addGuest(c.peer, (d) => c.send(d));
					if (id !== null) this.peers.set(id, c);
				});
				c.on("data", (d) => this.receive(d, id));
				c.on("close", () => this.dropGuest(id));
			});
			this.peer.on("error", () => {
				this.app.roomStatus =
					"Internet signaling unavailable. Same-device tabs can still use this code. Try again for internet play.";
				if (this.app.screen === "room") this.app.open("room");
			});
		} catch {
			this.app.roomStatus = "Internet unavailable. Same-device room is ready.";
			this.app.open("room");
		}
	}
	async joinRoom(code) {
		code = code
			.toUpperCase()
			.replace(/[^A-Z2-9]/g, "")
			.slice(0, 6);
		if (code.length !== 6) {
			this.app.roomStatus = "Enter the six letters shown by your host.";
			this.app.open("online");
			return;
		}
		this.disconnect();
		this.kind = "standalone";
		this.host = false;
		this.me = 1;
		this.room = code;
		this.setupChannel(code);
		this.app.roomStatus = "Looking for your kitchen…";
		this.app.open("room");
		this.channel.postMessage({ t: "hello", from: this.clientId });
		// BroadcastChannel handles same-device play; WebRTC connects other devices.
		this.joinTimer = setTimeout(() => {
			if (this.lastSnapshot >= 0 || this.players.length > 1) return;
			try {
				this.peer = new Peer({ debug: 0 });
				this.peer.on("open", () => {
					this.connection = this.peer.connect(`press-for-burgers-${code}`, {
						reliable: true,
					});
					this.connection.on("data", (d) => this.receive(d, 0));
					this.connection.on("close", () => {
						this.app.roomStatus = "The host left the kitchen.";
						this.disconnect();
						this.app.open("online");
					});
				});
				this.peer.on("error", () => {
					this.app.roomStatus =
						"Kitchen not found. Check the code and internet connection, then try again.";
					this.disconnect();
					this.app.open("online");
				});
			} catch {
				this.app.roomStatus =
					"Could not open that kitchen. Try the room code again.";
				this.disconnect();
				this.app.open("online");
			}
		}, 450);
		this.joinTimeout = setTimeout(() => {
			if (
				this.kind === "standalone" &&
				!this.host &&
				this.players.length <= 1
			) {
				this.app.roomStatus =
					"That kitchen did not answer. Check the code and try again.";
				this.disconnect();
				this.app.open("online");
			}
		}, 15000);
	}
	dropGuest(id) {
		if (id === null || id === undefined) return;
		this.peers.delete(id);
		for (const [key, value] of this.guests || [])
			if (value === id) this.guests.delete(key);
		this.players = this.players.filter((p) => p.id !== id);
		this.app.sim.removePlayer(id);
		this.broadcast({ t: "roster", players: this.players });
	}
	start() {
		if (!this.host) return;
		this.started = true;
		this.broadcast({ t: "go" });
		this.app.sim.beginShift();
		this.app.open(null);
	}
	finish(won) {
		if (this.finished || !this.host) return;
		if (this.kind === "hub") {
			const ids = this.players.map((p) => p.id);
			const score = this.app.sim.state.score;
			AIHub.finish({
				standings: [ids],
				scores: Object.fromEntries(ids.map((id) => [id, score])),
				won,
				stats: Object.fromEntries(
					ids.map((id) => [
						id,
						{
							"Burgers served": this.app.sim.state.totalServed,
							"Kitchen rating": Math.round(this.app.sim.state.rating),
						},
					]),
				),
			});
		}
		this.finished = true;
	}
	disconnect() {
		if (this.kind === "hub") return;
		if (this.kind === "standalone" && this.host) this.broadcast({ t: "bye" });
		if (this.kind === "standalone" && !this.host)
			this.broadcast({ t: "depart" });
		clearTimeout(this.joinTimer);
		clearTimeout(this.joinTimeout);
		this.channel?.close();
		this.channel = null;
		this.connection?.close();
		this.connection = null;
		this.peer?.destroy();
		this.peer = null;
		this.peers.clear();
		this.remoteInputs = {};
		this.players = [{ id: 0, name: "Chef 1" }];
		this.kind = "none";
		this.host = true;
		this.me = 0;
		this.lastSnapshot = -1;
		this.started = false;
		this.finished = false;
		this.seq = 0;
		this.app.remoteState = null;
	}
}
