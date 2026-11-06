export class Network {
	constructor(handlers) {
		this.handlers = handlers;
		this.role = "solo";
		this.me = 0;
		this.seats = [0];
		this.inputs = {};
		this.timer = 0;
		this.inputTimer = 0;
		this.fx = [];
		this.hub = false;
		this.ended = false;
		this.sent = 0;
		this.received = 0;
		this.peers = new Map();
	}
	get authority() {
		return this.role !== "client";
	}
	async connectHub(connection) {
		if (!window.AIHub?.active) return false;
		const info = await (connection ||
			AIHub.connect({ mode: "shared-world", seats: [1, 4] }));
		if (!info) return false;
		this.hub = true;
		this.info = info;
		this.role = info.isHost ? "host" : "client";
		this.me = info.server ? null : info.me;
		this.seats = info.players.map((p) => p.id);
		AIHub.on("message", (data, from) => this.receive(data, from));
		AIHub.on("start", () => {
			this.startPending = true;
		});
		AIHub.on("time-up", () => {
			if (this.authority) this.finish(this.handlers.state(), false);
		});
		AIHub.on("leave", ({ id }) => {
			this.seats = this.seats.filter((s) => s !== id);
			delete this.inputs[id];
			this.handlers.leave?.(id);
		});
		AIHub.on("end", () => {
			this.ended = true;
			this.handlers.end?.();
		});
		const initial = this.handlers.prepare?.(this.seats);
		if (this.authority && initial) this.send(initial);
		else if (!this.authority)
			this.send({ type: "input", i: {} }, this.info.host);
		AIHub.ready();
		return true;
	}
	readyToStart() {
		if (this.startPending && AIHub.time() >= 0) {
			this.startPending = false;
			this.handlers.start(this.seats);
		}
	}
	send(data, to) {
		if (this.ended) return;
		this.sent++;
		if (this.hub) {
			AIHub.send(data, { to, reliable: true });
			return;
		}
		if (this.channel) this.channel.postMessage({ from: this.me, to, data });
		else if (this.dc?.readyState === "open") this.dc.send(JSON.stringify(data));
	}
	receive(data, from) {
		if (this.ended || !data || typeof data !== "object") return;
		this.received++;
		if (data.type === "input" && this.authority && this.seats.includes(from)) {
			const i = data.i || {};
			this.inputs[from] = {
				x: Math.max(-1, Math.min(1, +i.x || 0)),
				y: Math.max(-1, Math.min(1, +i.y || 0)),
				angle: Number.isFinite(i.angle) ? i.angle : undefined,
				fire: !!i.fire,
				boost: !!i.boost,
				flare: !!i.flare,
			};
			this.inputs[from].at = performance.now();
		} else if (
			data.type === "world" &&
			!this.authority &&
			(from === this.info?.host || !this.hub)
		)
			this.handlers.world(data);
		else if (data.type === "launch" && !this.hub && !this.authority) {
			this.seats = data.seats;
			this.handlers.start(this.seats);
		} else if (data.type === "hangar" && !this.hub && !this.authority) {
			this.handlers.disconnect?.();
		} else if (data.type === "event" && !this.authority)
			this.handlers.event?.(data.name, data.data);
	}
	tick(dt, input, game) {
		if (this.ended) return;
		if (this.hub) this.readyToStart();
		if (this.me !== null && this.authority) this.inputs[this.me] = input;
		this.inputTimer += dt;
		this.timer += dt;
		if (!this.authority && this.inputTimer >= 1 / 15) {
			this.inputTimer = 0;
			this.send({ type: "input", i: input }, this.info?.host);
		}
		if (this.role === "host" && this.timer >= 0.11 && game.phase !== "idle") {
			this.timer = 0;
			const state = game.snapshot();
			state.fx = this.fx.splice(0, 8);
			while (JSON.stringify(state).length > 15500) {
				const idx = state.e.findIndex(
					(e) => e[1] === "bullet" || e[1] === "missile",
				);
				if (idx < 0) break;
				state.e.splice(idx, 1);
			}
			this.send(state);
		}
		for (const [seat, i] of Object.entries(this.inputs))
			if (+seat !== this.me && i.at && performance.now() - i.at > 800)
				this.inputs[seat] = {};
	}
	event(name, data) {
		if (
			this.role === "host" &&
			!this.ended &&
			[
				"explosion",
				"flare",
				"dispatch",
				"waveclear",
				"pickup",
				"finish",
				"hurt",
				"repair",
			].includes(name)
		) {
			this.fx.push([name, data]);
			if (this.fx.length > 18) this.fx.shift();
		}
	}
	finish(state, won) {
		if (this.hub && this.authority && !this.reported && !this.ended) {
			this.reported = true;
			const ids = this.seats;
			const scores = {},
				stats = {};
			for (const id of ids) {
				scores[id] = state.score || 0;
				stats[id] = {
					Trucks: state.trucks ?? 0,
					Dispatches: state.stats?.waves ?? 0,
					Raiders: state.stats?.kills ?? 0,
				};
			}
			AIHub.finish({ standings: [ids], scores, won, stats });
		}
	}
	launch() {
		this.reported = false;
		if (this.role === "host") this.send({ type: "launch", seats: this.seats });
		this.handlers.start(this.seats);
	}
	async hostRoom(code) {
		this.close();
		this.role = "host";
		this.me = 0;
		this.seats = [0];
		this.roomCode =
			code ||
			Array.from(
				crypto.getRandomValues(new Uint8Array(4)),
				(v) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[v % 32],
			).join("");
		this.channel = new BroadcastChannel("comman-dough-" + this.roomCode);
		this.channel.onmessage = ({ data: m }) => {
			if (m.data?.type === "hello") {
				let seat = this.peers.get(m.from);
				if (seat === undefined) {
					if (this.seats.length >= 4) return;
					seat = [1, 2, 3].find((s) => !this.seats.includes(s));
					this.peers.set(m.from, seat);
					this.seats.push(seat);
					this.handlers.status?.(`${this.seats.length} pilots on the radio.`);
				}
				this.channel.postMessage({
					from: 0,
					to: m.from,
					data: { type: "welcome", seat, seats: this.seats },
				});
			} else if (m.data?.type === "bye") {
				const seat = this.peers.get(m.from);
				if (seat !== undefined) {
					this.seats = this.seats.filter((s) => s !== seat);
					this.handlers.leave?.(seat);
				}
			} else this.receive(m.data, this.peers.get(m.from) ?? m.from);
		};
		return this.roomCode;
	}
	async joinRoom(code) {
		this.close();
		this.role = "client";
		this.me = -1;
		this.uuid = crypto.randomUUID();
		this.channel = new BroadcastChannel(
			"comman-dough-" + code.toUpperCase().trim(),
		);
		this.channel.onmessage = ({ data: m }) => {
			if (m.to !== undefined && m.to !== this.uuid && m.to !== this.me) return;
			if (m.data?.type === "welcome") {
				this.me = m.data.seat;
				this.seats = m.data.seats;
				clearInterval(this.helloTimer);
				this.handlers.status?.("Radio linked. Waiting for the flight leader.");
				this.handlers.linked?.();
			} else this.receive(m.data, m.from);
		};
		const hello = () =>
			this.channel?.postMessage({ from: this.uuid, data: { type: "hello" } });
		hello();
		this.helloTimer = setInterval(hello, 700);
	}
	async makePeer(host) {
		this.close();
		this.role = host ? "host" : "client";
		this.me = host ? 0 : 1;
		this.seats = [0, 1];
		this.pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		const setChannel = (dc) => {
			this.dc = dc;
			dc.onmessage = (e) => {
				try {
					this.receive(JSON.parse(e.data), host ? 1 : 0);
				} catch {}
			};
			dc.onopen = () => {
				this.handlers.status?.(
					host
						? "Wingman linked. Ready for takeoff."
						: "Radio linked. Waiting for the flight leader.",
				);
				this.handlers.linked?.();
			};
			dc.onclose = () => {
				if (this.dc !== dc) return;
				this.handlers.status?.("Radio connection closed.");
				if (host) {
					this.seats = [0];
					delete this.inputs[1];
					this.handlers.leave?.(1);
				} else this.handlers.disconnect?.();
			};
		};
		if (host)
			setChannel(this.pc.createDataChannel("convoy", { ordered: true }));
		else this.pc.ondatachannel = (e) => setChannel(e.channel);
		const pc = this.pc;
		this.pc.onconnectionstatechange = () => {
			if (["failed", "disconnected"].includes(pc.connectionState))
				this.handlers.status?.("Signal lost. Reconnect from the radio menu.");
		};
	}
	async gather() {
		if (this.pc.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			const done = () => {
				if (this.pc?.iceGatheringState === "complete") {
					clearTimeout(timeout);
					this.pc.removeEventListener("icegatheringstatechange", done);
					resolve();
				}
			};
			const timeout = setTimeout(resolve, 5500);
			this.pc.addEventListener("icegatheringstatechange", done);
		});
	}
	encode() {
		return "CCD1." + btoa(JSON.stringify(this.pc.localDescription.toJSON()));
	}
	decode(code) {
		if (!code.startsWith("CCD1.") || code.length > 100000)
			throw Error("That is not a Comman-Dough radio code.");
		const data = JSON.parse(atob(code.slice(5).trim()));
		if (
			!["offer", "answer"].includes(data.type) ||
			typeof data.sdp !== "string"
		)
			throw Error("Invalid radio code.");
		return data;
	}
	async offer() {
		await this.makePeer(true);
		await this.pc.setLocalDescription(await this.pc.createOffer());
		await this.gather();
		return this.encode();
	}
	async answer(code) {
		const data = this.decode(code.trim());
		if (data.type !== "offer")
			throw Error("Paste the flight leader’s offer code.");
		await this.makePeer(false);
		await this.pc.setRemoteDescription(data);
		await this.pc.setLocalDescription(await this.pc.createAnswer());
		await this.gather();
		return this.encode();
	}
	async accept(code) {
		const data = this.decode(code.trim());
		if (data.type !== "answer") throw Error("Paste your wingman’s reply code.");
		if (!this.pc) throw Error("Create an offer first.");
		await this.pc.setRemoteDescription(data);
	}
	close() {
		if (this.channel) {
			this.channel.postMessage({
				from: this.uuid || this.me,
				data: { type: this.authority ? "hangar" : "bye" },
			});
		}
		clearInterval(this.helloTimer);
		this.channel?.close();
		this.channel = null;
		this.dc?.close();
		this.dc = null;
		this.pc?.close();
		this.pc = null;
		this.peers.clear();
		this.uuid = null;
		this.role = "solo";
		this.me = 0;
		this.seats = [0];
		this.inputs = {};
		this.ended = false;
		this.reported = false;
		this.fx = [];
		this.sent = 0;
		this.received = 0;
	}
}
