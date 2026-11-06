// Manual, serverless, ordered WebRTC. Only constructed outside AI Hub.
export class DirectPeer {
	constructor({ onOpen, onMessage, onClose, onStatus }) {
		Object.assign(this, { onOpen, onMessage, onClose, onStatus });
		this.pc = null;
		this.channel = null;
		this.role = null;
		this.generation = 0;
		this.closed = false;
		this.timers = new Set();
		this.resultAck = null;
	}
	status(text) {
		this.onStatus?.(text);
	}
	delay(fn, ms) {
		const t = setTimeout(() => {
			this.timers.delete(t);
			fn();
		}, ms);
		this.timers.add(t);
		return t;
	}
	make() {
		if (globalThis.AIHub?.active)
			throw Error("Direct peer is unavailable during a Hub round.");
		this.close(false);
		this.closed = false;
		this.pc = new RTCPeerConnection({ iceServers: [] });
		const generation = this.generation;
		this.pc.onconnectionstatechange = () => {
			if (generation !== this.generation || !this.pc) return;
			const state = this.pc.connectionState;
			this.status(
				state === "connected"
					? "Connected — two swarms, one garden"
					: `Connection: ${state}`,
			);
			if (state === "failed" || state === "closed") this.disconnected();
			if (state === "disconnected")
				this.delay(() => {
					if (this.pc?.connectionState === "disconnected") this.disconnected();
				}, 1800);
		};
		this.pc.ondatachannel = (e) => this.wire(e.channel);
		return this.pc;
	}
	wire(channel) {
		this.channel = channel;
		channel.onopen = () => {
			this.status("Connected");
			this.onOpen?.(this.role);
		};
		channel.onclose = () => this.disconnected();
		channel.onmessage = (e) => {
			if (this.closed || typeof e.data !== "string" || e.data.length > 16384)
				return;
			try {
				const data = JSON.parse(e.data);
				if (data.t === "ack") {
					this.resultAck?.();
					return;
				}
				if (data.t === "end") {
					this.send({ t: "ack" });
				}
				this.onMessage?.(data);
			} catch {
				this.status("Ignored an invalid packet.");
			}
		};
	}
	disconnected() {
		if (this.closed) return;
		this.closed = true;
		this.onClose?.();
	}
	async gather(pc) {
		if (pc.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			let complete = false;
			const done = () => {
				if (complete) return;
				complete = true;
				pc.removeEventListener("icegatheringstatechange", check);
				resolve();
			};
			const check = () => {
				if (pc.iceGatheringState === "complete") done();
			};
			pc.addEventListener("icegatheringstatechange", check);
			this.delay(done, 4500);
			check();
		});
	}
	encode(desc) {
		return (
			"BEE1." + btoa(JSON.stringify({ v: 1, type: desc.type, sdp: desc.sdp }))
		);
	}
	decode(code, type) {
		const text = String(code).trim();
		if (text.length > 65000 || text.length < 30 || !text.startsWith("BEE1."))
			throw Error("That is not a garden code. Paste the complete BEE1 code.");
		let data;
		try {
			data = JSON.parse(atob(text.slice(5)));
		} catch {
			throw Error("The code is damaged. Copy it again.");
		}
		if (
			data.v !== 1 ||
			data.type !== type ||
			typeof data.sdp !== "string" ||
			data.sdp.length > 48000 ||
			!data.sdp.startsWith("v=0") ||
			!data.sdp.includes("m=application")
		)
			throw Error(`This step needs an ${type} code.`);
		return { type: data.type, sdp: data.sdp };
	}
	async offer() {
		const pc = this.make();
		this.role = "host";
		this.wire(pc.createDataChannel("midnight-garden", { ordered: true }));
		await pc.setLocalDescription(await pc.createOffer());
		await this.gather(pc);
		if (this.pc !== pc) throw Error("Connection cancelled.");
		this.status("Offer ready. Send it to player 2.");
		return this.encode(pc.localDescription);
	}
	async answer(code) {
		const desc = this.decode(code, "offer"),
			pc = this.make();
		this.role = "guest";
		await pc.setRemoteDescription(desc);
		await pc.setLocalDescription(await pc.createAnswer());
		await this.gather(pc);
		if (this.pc !== pc) throw Error("Connection cancelled.");
		this.status("Answer ready. Return it to player 1.");
		return this.encode(pc.localDescription);
	}
	async accept(code) {
		if (!this.pc || this.role !== "host") throw Error("Make an offer first.");
		const desc = this.decode(code, "answer");
		await this.pc.setRemoteDescription(desc);
		this.status("Answer accepted. Opening the garden…");
	}
	send(data) {
		if (
			this.channel?.readyState === "open" &&
			this.channel.bufferedAmount < 64000
		) {
			this.channel.send(JSON.stringify(data));
			return true;
		}
		return false;
	}
	finish(data) {
		if (!this.send(data)) return Promise.resolve();
		return new Promise((resolve) => {
			let done = false;
			const end = () => {
				if (done) return;
				done = true;
				this.resultAck = null;
				this.delay(() => {
					this.close(false);
					resolve();
				}, 200);
			};
			this.resultAck = end;
			this.delay(end, 1500);
		});
	}
	close(notify = true) {
		this.closed = true;
		this.generation++;
		for (const t of this.timers) clearTimeout(t);
		this.timers.clear();
		if (this.channel) {
			this.channel.onclose = null;
			this.channel.close();
		}
		if (this.pc) {
			this.pc.onconnectionstatechange = null;
			this.pc.close();
		}
		this.channel = null;
		this.pc = null;
		if (notify) this.onClose?.();
	}
}
