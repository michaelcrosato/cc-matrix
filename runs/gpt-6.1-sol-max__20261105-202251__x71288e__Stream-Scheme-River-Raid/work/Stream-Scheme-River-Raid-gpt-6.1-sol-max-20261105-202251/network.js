const neutral = () => ({
	x: 0,
	y: 0,
	aim: 0,
	fire: false,
	roll: false,
	burst: false,
});
function cleanInput(value) {
	const clamp = (v) => Math.max(-1, Math.min(1, Number(v) || 0));
	return {
		x: clamp(value?.x),
		y: clamp(value?.y),
		aim: clamp(value?.aim),
		fire: !!value?.fire,
		roll: !!value?.roll,
		burst: !!value?.burst,
	};
}
export class RadioLink {
	constructor(callbacks) {
		Object.assign(this, callbacks);
		this.hub = !!window.AIHub?.active;
		this.authority = true;
		this.localId = 0;
		this.seats = [{ id: 0, name: "PILOT 01" }];
		this.peers = new Map();
		this.remoteInputs = new Map();
		this.info = null;
		this.started = false;
		this.ended = false;
		this.finished = false;
		this.sent = 0;
		this.received = 0;
		this.lastSend = 0;
		this.lastInput = 0;
		this.seq = 0;
		this.lastSeq = -1;
		this.pendingActions = { roll: false, burst: false };
	}
	async connectHub() {
		if (!this.hub) return false;
		const hub = window.AIHub;
		hub.on("start", () => {
			this.started = true;
			this.ended = false;
			this.finished = false;
			this.onStart(this.seats, true);
		});
		hub.on("message", (data, from) => this.receive(data, from));
		hub.on("time-up", () => {
			if (this.authority) this.finish(false);
		});
		hub.on("leave", ({ id }) => {
			this.remoteInputs.delete(id);
			this.onLeave?.(id);
		});
		hub.on("end", ({ reason }) => {
			this.ended = true;
			this.remoteInputs.clear();
			this.onEnd?.(reason);
		});
		this.info = await hub.connect({ mode: "shared-world", seats: [1, 4] });
		if (!this.info) {
			this.hub = false;
			return false;
		}
		this.authority = this.info.isHost;
		this.localId = this.info.me;
		this.seats = this.info.players.map((p) => ({ id: p.id, name: p.name }));
		return true;
	}
	ready() {
		if (this.hub) window.AIHub.ready();
	}
	send(data, to) {
		if (this.ended) return;
		this.sent++;
		if (this.hub) {
			window.AIHub.send(data, to === undefined ? {} : { to });
			return;
		}
		const json = JSON.stringify(data);
		for (const [id, peer] of this.peers)
			if (
				(to === undefined || id === to) &&
				peer.channel?.readyState === "open" &&
				peer.channel.bufferedAmount < 500000
			)
				peer.channel.send(json);
	}
	receive(data, from) {
		if (this.ended || !data || typeof data !== "object") return;
		this.received++;
		if (
			data.kind === "input" &&
			this.authority &&
			this.seats.some((p) => p.id === from)
		)
			this.remoteInputs.set(from, {
				...cleanInput(data.input),
				stamp: performance.now(),
			});
		if (
			data.kind === "state" &&
			!this.authority &&
			(!this.hub || from === this.info.host) &&
			data.seq > this.lastSeq
		) {
			this.lastSeq = data.seq;
			this.onSnapshot?.(data);
		}
		if (data.kind === "welcome" && !this.authority && !this.hub) {
			this.seats = data.seats;
			this.onStatus?.("Radio linked. Waiting for the flight leader.");
			if (data.playing) {
				this.started = true;
				this.onStart(this.seats, false);
			}
		}
		if (data.kind === "roster" && !this.authority && !this.hub)
			this.seats = data.seats;
		if (data.kind === "start" && !this.authority && !this.hub) {
			this.started = true;
			this.seats = data.seats;
			this.lastSeq = -1;
			this.onStart(this.seats, false);
		}
		if (
			data.kind === "pause" &&
			!this.authority &&
			(!this.hub || from === this.info.host)
		)
			this.onPause?.(data.paused);
		if (data.kind === "leave" && !this.hub) this.onLeave?.(from);
	}
	update(now, game, localInput) {
		if (this.ended || !this.started) return;
		if (this.authority) {
			for (const [id, input] of this.remoteInputs)
				game.inputs.set(
					id,
					performance.now() - input.stamp < 1000 ? input : neutral(),
				);
			if ((this.hub || this.peers.size) && now - this.lastSend > 0.105) {
				this.lastSend = now;
				this.send({ ...game.snapshot(), seq: this.seq++ });
			}
		} else {
			this.pendingActions.roll ||= localInput.roll;
			this.pendingActions.burst ||= localInput.burst;
			if (now - this.lastInput > 0.075) {
				this.lastInput = now;
				this.send(
					{ kind: "input", input: { ...localInput, ...this.pendingActions } },
					this.hub ? this.info.host : undefined,
				);
				this.pendingActions = { roll: false, burst: false };
			}
		}
	}
	launch() {
		this.started = true;
		this.finished = false;
		this.send({ kind: "start", seats: this.seats });
		this.onStart(this.seats, false);
	}
	finish(won) {
		if (!this.hub || !this.authority || this.finished || this.ended) return;
		this.finished = true;
		const active = this.getGame()
				.players.filter((p) => !p.left)
				.map((p) => p.id),
			game = this.getGame();
		window.AIHub.finish({
			standings: [active],
			scores: Object.fromEntries(active.map((id) => [id, game.score])),
			won,
			stats: Object.fromEntries(
				active.map((id) => [
					id,
					{
						"Targets cleared": game.stats.kills,
						"Bridges breached": game.stats.bridges,
						"Fuel stops": game.stats.fuelStops,
					},
				]),
			),
		});
	}
	async ice(peer) {
		if (peer.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			const timeout = setTimeout(done, 5500);
			function done() {
				clearTimeout(timeout);
				peer.removeEventListener("icegatheringstatechange", check);
				resolve();
			}
			function check() {
				if (peer.iceGatheringState === "complete") done();
			}
			peer.addEventListener("icegatheringstatechange", check);
		});
	}
	attach(id, pc, channel) {
		const peer = { pc, channel };
		this.peers.set(id, peer);
		channel.onmessage = (e) => {
			try {
				this.receive(JSON.parse(e.data), id);
			} catch {
				this.onStatus?.("Unreadable radio packet.");
			}
		};
		channel.onopen = () => {
			if (this.authority) {
				if (!this.seats.some((p) => p.id === id))
					this.seats.push({ id, name: `PILOT 0${id + 1}` });
				if (this.started) this.onRoster?.(this.seats);
				this.send(
					{ kind: "welcome", seats: this.seats, playing: this.started },
					id,
				);
				this.send({ kind: "roster", seats: this.seats });
			}
			this.onStatus?.(`RADIO LINK LIVE · ${this.seats.length} PILOTS`);
		};
		channel.onclose = () => {
			pc.close();
			this.remoteInputs.delete(id);
			this.peers.delete(id);
			this.onLeave?.(id);
			this.onStatus?.("Radio link closed.");
		};
		pc.onconnectionstatechange = () => {
			if (pc.connectionState === "failed")
				this.onStatus?.(
					"Connection failed. Create a fresh invitation; a restrictive network may need a different connection.",
				);
		};
	}
	async offer() {
		if (this.hub) throw new Error("AI Hub manages the radio.");
		if (!this.authority)
			throw new Error("The flight leader creates invitations.");
		const id = [1, 2, 3].find((v) => !this.peers.has(v));
		if (!id) throw new Error("This wing already has four pilots.");
		const pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		const channel = pc.createDataChannel("stream-scheme");
		this.attach(id, pc, channel);
		this.pendingId = id;
		await pc.setLocalDescription(await pc.createOffer());
		await this.ice(pc);
		return btoa(
			JSON.stringify({ v: 1, seat: id, description: pc.localDescription }),
		);
	}
	decode(code, expected) {
		let value;
		try {
			value = JSON.parse(atob(code.trim()));
		} catch {
			throw new Error("That radio code is not readable. Paste the whole code.");
		}
		if (
			value.v !== 1 ||
			value.description?.type !== expected ||
			![1, 2, 3].includes(value.seat)
		)
			throw new Error(`Use an ${expected} code from Stream Scheme.`);
		return value;
	}
	async answer(code) {
		if (this.hub) throw new Error("AI Hub manages the radio.");
		const value = this.decode(code, "offer");
		this.disconnect();
		this.authority = false;
		this.localId = value.seat;
		const pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		pc.ondatachannel = (e) => this.attach(0, pc, e.channel);
		this.pendingPc = pc;
		await pc.setRemoteDescription(value.description);
		await pc.setLocalDescription(await pc.createAnswer());
		await this.ice(pc);
		return btoa(
			JSON.stringify({
				v: 1,
				seat: value.seat,
				description: pc.localDescription,
			}),
		);
	}
	async accept(code) {
		const value = this.decode(code, "answer"),
			peer = this.peers.get(value.seat);
		if (!peer) throw new Error("Make an invitation first.");
		await peer.pc.setRemoteDescription(value.description);
		this.onStatus?.("Tuning the radio…");
	}
	disconnect() {
		for (const peer of this.peers.values()) {
			peer.channel.onclose = null;
			peer.channel.close();
			peer.pc.close();
		}
		this.pendingPc?.close();
		this.pendingPc = null;
		this.peers.clear();
		this.remoteInputs.clear();
		this.authority = true;
		this.localId = 0;
		this.seats = [{ id: 0, name: "PILOT 01" }];
		this.started = false;
		this.ended = false;
		this.lastSeq = -1;
	}
}
