class ExpeditionNet {
	constructor(app) {
		this.app = app;
		this.mode = "none";
		this.info = null;
		this.isHost = true;
		this.me = 0;
		this.inputs = new Map();
		this.sendClock = 0;
		this.active = false;
		this.ended = false;
		this.finished = false;
		this.remoteSeen = 0;
		this.lastEvent = 0;
		this.departed = new Set();
		this.seq = 0;
		this.connection = null;
		this.channel = null;
		window.addEventListener("beforeunload", () => {
			if (this.bc)
				this.bc.postMessage({ data: { type: "leave" }, from: this.me });
		});
	}
	async hub(info) {
		this.info = info;
		this.active = true;
		this.mode = "hub";
		this.isHost = info.isHost;
		this.me = info.me;
		this.server = info.server;
		AIHub.on("message", (data, from) => this.receive(data, from));
		AIHub.on("start", () => {
			this.app.hubStarted = true;
		});
		AIHub.on("leave", ({ id }) => {
			this.departed.add(id);
			this.app.removePlayer(id);
			this.inputs.delete(id);
			if (this.isHost)
				this.app.notify("EXPEDITION UPDATE", "A scout has left the trail.");
		});
		AIHub.on("time-up", () => {
			if (this.isHost) this.finish(false);
		});
		AIHub.on("end", () => {
			this.ended = true;
			this.app.state = "ended";
			this.app.audio.muted = true;
			this.app.audio.levels();
			this.app.ui.close();
			$("hubCountdown").hidden = true;
		});
		this.app.start(info.players);
		this.app.state = "hubwaiting";
		AIHub.ready();
	}
	send(data, to) {
		if (this.ended) return;
		if (this.mode === "hub") AIHub.send(data, { to, reliable: true });
		else if (this.channel?.readyState === "open")
			this.channel.send(JSON.stringify(data));
		else if (this.bc) this.bc.postMessage({ data, from: this.me });
	}
	receive(data, from) {
		if (!data || this.ended) return;
		if (
			data.type === "input" &&
			this.isHost &&
			from !== this.me &&
			this.app.players.some((p) => p.id === from)
		) {
			if (typeof data.x !== "number" || typeof data.y !== "number") return;
			this.inputs.set(from, {
				x: clamp(data.x, -1, 1),
				y: clamp(data.y, -1, 1),
				jump: !!data.jump,
				action: !!data.action,
				jumpSerial: Number.isSafeInteger(data.jumpSerial) ? data.jumpSerial : 0,
				stamp: performance.now(),
			});
		}
		if (data.type === "snapshot" && !this.isHost) {
			this.remoteSeen++;
			this.app.applySnapshot(data);
			for (const e of data.events || []) {
				if (e.id > this.lastEvent) {
					this.lastEvent = e.id;
					this.app.eventEffect(e);
				}
			}
		}
		if (data.type === "leave" && this.bc) {
			if (this.isHost) {
				this.app.removePlayer(from);
				this.app.notify("BACK TO SOLO", "Your friend left the trail.");
			} else {
				this.disconnect();
				this.app.title();
			}
			return;
		}
		if (data.type === "hello" && this.bc) {
			if (this.isHost) {
				this.app.start([
					{ id: 0, name: "Scout", color: "#ed9e50" },
					{ id: 1, name: "Pal", color: "#70bad0" },
				]);
				this.send({ type: "welcome" });
			}
		}
		if (data.type === "welcome" && !this.isHost) {
			this.app.start([
				{ id: 0, name: "Scout", color: "#ed9e50" },
				{ id: 1, name: "Pal", color: "#70bad0" },
			]);
		}
	}
	tick(dt) {
		if (!this.active || this.ended) return;
		this.sendClock += dt;
		if (this.sendClock < 1 / 15) return;
		this.sendClock = 0;
		if (this.isHost) {
			this.send(this.app.snapshot());
		} else {
			const f =
				this.app.state === "playing" && !this.app.ui.current
					? this.app.controls.frame(0)
					: { x: 0, y: 0, jump: false, action: false };
			this.send(
				{ type: "input", ...f, jumpSerial: this.app.controls.jumpSerial },
				this.mode === "hub" ? this.info.host : undefined,
			);
		}
	}
	input(id) {
		const f = this.inputs.get(id);
		return f && performance.now() - f.stamp < 650
			? f
			: { x: 0, y: 0, jump: false, action: false };
	}
	finish(won) {
		if (this.ended || !this.isHost || this.finished) return;
		this.finished = true;
		const ids = (
			this.mode === "hub"
				? this.info.players.filter((p) => !this.departed.has(p.id))
				: this.app.players
		).map((p) => p.id);
		if (this.mode === "hub") {
			const scores = {},
				stats = {};
			for (const p of this.app.players) {
				scores[p.id] = this.app.score;
				stats[p.id] = {
					Treasures: this.app.found.filter(Boolean).length,
					Rescues: this.app.stats.rescues,
					"Time left": Math.floor(this.app.timeLeft),
				};
			}
			AIHub.finish({ standings: [ids], scores, won, stats });
		}
	}
	async createPeer(host, code = "") {
		this.disconnect();
		this.mode = "link";
		this.isHost = host;
		this.me = host ? 0 : 1;
		const pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.connection = pc;
		const setup = (ch) => {
			this.channel = ch;
			ch.onmessage = (e) => {
				try {
					this.receive(JSON.parse(e.data), host ? 1 : 0);
				} catch {}
			};
			ch.onopen = () => {
				this.active = true;
				this.ended = false;
				this.finished = false;
				this.app.start([
					{ id: 0, name: "Scout", color: "#ed9e50" },
					{ id: 1, name: "Pal", color: "#70bad0" },
				]);
			};
			ch.onclose = () => {
				if (this.active) {
					this.active = false;
					this.app.notify(
						"LINK CLOSED",
						"Your friend left. The trail is yours.",
					);
					if (!host) this.app.title();
					else this.app.removePlayer(1);
				}
			};
		};
		pc.onconnectionstatechange = () => {
			if (pc.connectionState === "failed")
				this.app.ui.netStatus(
					"The direct link could not connect. Try an AI Hub session or a different network.",
				);
		};
		if (host) {
			setup(pc.createDataChannel("pit-and-run", { ordered: true }));
			await pc.setLocalDescription(await pc.createOffer());
		} else {
			pc.ondatachannel = (e) => setup(e.channel);
			await pc.setRemoteDescription(this.decode(code));
			await pc.setLocalDescription(await pc.createAnswer());
		}
		await this.gather(pc);
		return btoa(JSON.stringify(pc.localDescription));
	}
	async answer(code) {
		if (!this.connection) throw Error("Create an invite first.");
		await this.connection.setRemoteDescription(this.decode(code));
	}
	decode(code) {
		try {
			const v = JSON.parse(atob(code.trim()));
			if (!v.sdp || !["offer", "answer"].includes(v.type)) throw Error();
			return v;
		} catch {
			throw Error("That code is incomplete. Copy the entire invite or reply.");
		}
	}
	async gather(pc) {
		if (pc.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			const timer = setTimeout(resolve, 5500);
			pc.addEventListener("icegatheringstatechange", () => {
				if (pc.iceGatheringState === "complete") {
					clearTimeout(timer);
					resolve();
				}
			});
		});
	}
	localRelay(room, host) {
		this.disconnect();
		this.mode = "relay";
		this.active = true;
		this.isHost = host;
		this.me = host ? 0 : 1;
		this.bc = new BroadcastChannel("pit-run-" + room);
		this.bc.onmessage = (e) => this.receive(e.data.data, e.data.from);
		if (host) {
			this.app.start([{ id: 0, name: "Scout", color: "#ed9e50" }]);
		} else {
			this.app.ui.close();
			this.app.state = "linkwaiting";
			this.send({ type: "hello" });
		}
	}
	disconnect() {
		if (this.bc)
			this.bc.postMessage({ data: { type: "leave" }, from: this.me });
		this.active = false;
		this.ended = false;
		this.finished = false;
		if (this.channel) {
			this.channel.onclose = null;
			this.channel.close();
		}
		this.connection?.close();
		this.bc?.close();
		this.channel = null;
		this.connection = null;
		this.bc = null;
		this.mode = "none";
		this.isHost = true;
		this.me = 0;
		this.server = false;
		this.inputs.clear();
		this.lastEvent = 0;
		this.departed.clear();
	}
}
