export class WingLink {
	constructor(game) {
		this.game = game;
		this.channel = null;
		this.pc = null;
		this.dc = null;
		this.remote = null;
		this.id = crypto.randomUUID();
		this.connected = false;
		this.status =
			"Fly together, compare patrol scores. Every pilot commands their own ship and operation.";
		this.last = 0;
		this.mode = "none";
	}
	changed(text) {
		this.status = text;
		this.game.ui?.refreshNetwork();
	}
	receive(data) {
		if (!data || typeof data !== "object" || data.id === this.id) return;
		if (data.kind === "hello") {
			this.connected = true;
			this.remote = data.id;
			this.changed("Wingmate linked. Launch the patrol on either screen.");
			this.send({ kind: "ack" });
			return;
		}
		if (data.kind === "ack") {
			this.connected = true;
			this.remote = data.id;
			this.changed("Wingmate linked. Launch the patrol on either screen.");
			return;
		}
		if (data.kind === "start") {
			this.game.start(false, true);
			return;
		}
		if (data.kind === "bye") {
			this.connected = false;
			this.game.ghosts.clear();
			this.changed("Wingmate disconnected. Your patrol can continue.");
			return;
		}
		if (data.kind === "ghost" && this.valid(data.state))
			this.game.receiveGhost(data.state, "standalone", "WINGMATE", "#8bdaca");
	}
	valid(s) {
		return (
			s &&
			Number.isInteger(s.sector) &&
			s.sector >= 0 &&
			s.sector < 6 &&
			Array.isArray(s.p) &&
			s.p.length === 3 &&
			s.p.every(Number.isFinite) &&
			Array.isArray(s.q) &&
			s.q.length === 4 &&
			s.q.every(Number.isFinite) &&
			Number.isFinite(s.score)
		);
	}
	send(data) {
		const packet = { ...data, id: this.id };
		if (this.mode === "local") this.channel?.postMessage(packet);
		else if (this.dc?.readyState === "open")
			this.dc.send(JSON.stringify(packet));
	}
	local() {
		this.close();
		this.mode = "local";
		this.channel = new BroadcastChannel("star-reclaimers-wingmate-v1");
		this.channel.onmessage = (e) => this.receive(e.data);
		this.send({ kind: "hello" });
		this.changed(
			"Local link open. Open this game in a second tab and select Local link there, too.",
		);
	}
	setup() {
		this.close();
		this.mode = "rtc";
		this.pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.pc.ondatachannel = (e) => this.wire(e.channel);
		this.pc.onconnectionstatechange = () => {
			if (
				["disconnected", "failed", "closed"].includes(this.pc?.connectionState)
			) {
				this.connected = false;
				this.changed("Link interrupted. The patrol can continue solo.");
			}
		};
		return this.pc;
	}
	wire(dc) {
		this.dc = dc;
		dc.onopen = () => {
			this.connected = true;
			this.changed("Wingmate linked. Launch the patrol on either screen.");
			this.send({ kind: "hello" });
		};
		dc.onmessage = (e) => {
			try {
				this.receive(JSON.parse(e.data));
			} catch {}
		};
		dc.onclose = () => {
			this.connected = false;
		};
	}
	async gathered() {
		const pc = this.pc;
		if (pc.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			const timer = setTimeout(done, 5500);
			function done() {
				clearTimeout(timer);
				pc.removeEventListener("icegatheringstatechange", changed);
				resolve();
			}
			function changed() {
				if (pc.iceGatheringState === "complete") done();
			}
			pc.addEventListener("icegatheringstatechange", changed);
		});
	}
	encode() {
		return (
			"SR1-" +
			btoa(JSON.stringify(this.pc.localDescription))
				.replaceAll("+", "-")
				.replaceAll("/", "_")
				.replaceAll("=", "")
		);
	}
	decode(code) {
		const c = code.trim();
		if (!c.startsWith("SR1-") || c.length > 50000)
			throw Error("That is not a Star Reclaimers link code.");
		try {
			const d = JSON.parse(
				atob(c.slice(4).replaceAll("-", "+").replaceAll("_", "/")),
			);
			if (!["offer", "answer"].includes(d.type) || typeof d.sdp !== "string")
				throw Error();
			return d;
		} catch {
			throw Error("The link code is incomplete. Copy the whole code.");
		}
	}
	async offer() {
		this.changed("Gathering a direct route…");
		const pc = this.setup();
		this.wire(
			pc.createDataChannel("patrol", { ordered: false, maxRetransmits: 0 }),
		);
		await pc.setLocalDescription(await pc.createOffer());
		await this.gathered();
		this.changed(
			"Send this offer code to your wingmate. Paste their reply, then connect.",
		);
		return this.encode();
	}
	async answer(code) {
		const desc = this.decode(code);
		if (desc.type !== "offer")
			throw Error("The join screen needs an offer code.");
		const pc = this.setup();
		await pc.setRemoteDescription(desc);
		await pc.setLocalDescription(await pc.createAnswer());
		await this.gathered();
		this.changed(
			"Send this reply code to the first pilot. Waiting for them to connect…",
		);
		return this.encode();
	}
	async finish(code) {
		const desc = this.decode(code);
		if (desc.type !== "answer" || !this.pc)
			throw Error("Create an offer first, then paste the reply code.");
		await this.pc.setRemoteDescription(desc);
		this.changed("Connecting to your wingmate…");
	}
	launch() {
		if (this.connected) this.send({ kind: "start" });
		this.game.start(false, true);
	}
	update(dt) {
		if (!this.connected || this.game.hubActive) return;
		this.last += dt;
		if (this.last > 0.12) {
			this.last = 0;
			this.send({ kind: "ghost", state: this.game.ghostState() });
		}
	}
	close() {
		this.send({ kind: "bye" });
		this.channel?.close();
		this.dc?.close();
		this.pc?.close();
		this.channel = null;
		this.dc = null;
		this.pc = null;
		this.connected = false;
		this.mode = "none";
		this.game.ghosts?.clear();
	}
}
