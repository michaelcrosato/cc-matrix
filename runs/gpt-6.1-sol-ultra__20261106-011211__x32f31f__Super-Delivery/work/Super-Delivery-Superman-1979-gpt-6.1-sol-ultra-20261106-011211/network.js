/** Super Delivery network adapter. AI Hub Session Protocol v1 / manual WebRTC. */
export class NetworkLink {
	constructor(callbacks = {}) {
		this.callbacks = callbacks;
		this.onMessage = callbacks.onMessage || (() => {});
		this.onStatus = callbacks.onStatus || (() => {});
		this.onRole = callbacks.onRole || (() => {});
		this.connected = false;
		this.isHost = true;
		this.role = "solo";
		this.status = "Solo edition";
		this.hubActive = false;
		this.server = false;
		this.me = 0;
		this.players = [{ id: 0, name: "You", color: "#ef5944" }];
		this.info = null;
		this.pc = null;
		this.channel = null;
		this.ended = false;
		this.unsubscribers = [];
		this.sent = 0;
		this.received = 0;
		this._tokens = 30;
		this._refilled = performance.now();
	}

	_status(text, detail = "") {
		this.status = text;
		this.onStatus(text, detail);
	}

	_role(role) {
		this.role = role;
		this.isHost = role !== "guest";
		this.onRole(role, this);
	}

	/** Call early. The game must call ready() only after its world has loaded. */
	async connectHub() {
		if (!globalThis.AIHub) return null;
		const info = await AIHub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) return null;
		this.info = info;
		this.hubActive = true;
		this.connected = true;
		this.server = !!info.server;
		this.me = info.me;
		this.players = info.players.slice();
		this.ended = false;
		this._role(info.isHost ? "host" : "guest");
		this._status(
			"AI Hub co-op",
			info.server ? "Hosting the city" : "Waiting for the hub countdown",
		);
		const on = (event, fn) => this.unsubscribers.push(AIHub.on(event, fn));
		on("start", (data) => {
			this.callbacks.onStart?.(data);
		});
		on("message", (data, from) => {
			this._receive(data, from);
		});
		on("leave", (data) => {
			this.players = this.players.filter((p) => p.id !== data.id);
			this.callbacks.onLeave?.(data);
		});
		on("time-up", (data) => {
			this.callbacks.onTimeUp?.(data);
		});
		on("end", (data) => {
			this.ended = true;
			this.connected = false;
			this._status("Round complete", data.reason);
			this.callbacks.onEnd?.(data);
		});
		return info;
	}

	ready() {
		if (this.hubActive && !this.ended) AIHub.ready();
	}
	time() {
		return this.hubActive ? AIHub.time() : performance.now();
	}

	/** Shared city outcome: the cooperative players tie. Only the host reports. */
	finish(won = false, scores = {}, stats = {}) {
		if (!this.hubActive || !this.isHost || this.ended) return;
		const live = this.players.map((p) => p.id);
		AIHub.finish({ standings: [live], scores, won: !!won, stats });
	}

	_receive(data, from) {
		if (
			this.ended ||
			!data ||
			data.game !== "super-delivery" ||
			typeof data.type !== "string"
		)
			return;
		this.received++;
		this.onMessage(data.type, data.payload, from);
	}

	/** Send <=15 Hz. Hub and standalone share the same plain JSON messages. */
	send(type, payload, options = {}) {
		if (!this.connected || this.ended || typeof type !== "string") return false;
		const now = performance.now();
		this._tokens = Math.min(30, this._tokens + (now - this._refilled) * 0.019);
		this._refilled = now;
		if (this._tokens < 1) return false;
		const data = { game: "super-delivery", type, payload };
		let text;
		try {
			text = JSON.stringify(data);
		} catch {
			return false;
		}
		if (text.length > 15000) return false;
		let sent = false;
		if (this.hubActive) {
			const opts = { reliable: options.reliable !== false };
			if (options.to !== undefined) opts.to = options.to;
			else if (!this.isHost) opts.to = this.info.host;
			sent = AIHub.send(data, opts);
		} else if (
			this.channel?.readyState === "open" &&
			this.channel.bufferedAmount < 262144
		) {
			this.channel.send(text);
			sent = true;
		}
		if (sent) {
			this._tokens--;
			this.sent++;
		}
		return sent;
	}

	_assertStandalone() {
		if (this.hubActive || globalThis.AIHub?.active)
			throw new Error("AI Hub manages this round’s connection.");
		if (!globalThis.RTCPeerConnection)
			throw new Error("This browser does not support direct co-op.");
	}

	_newPeer(role) {
		this._assertStandalone();
		this.close();
		this.ended = false;
		this.me = role === "host" ? 0 : 1;
		this.players = [
			{ id: 0, name: "Hero one", color: "#ef5944" },
			{ id: 1, name: "Hero two", color: "#50c6c1" },
		];
		this._role(role);
		const pc = (this.pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
		}));
		pc.oniceconnectionstatechange = () => {
			if (pc !== this.pc) return;
			if (["disconnected", "failed"].includes(pc.iceConnectionState)) {
				this.connected = false;
				this._status(
					"Partner disconnected",
					"The host can continue the rescue solo.",
				);
				this.callbacks.onLeave?.({
					id: this.me === 0 ? 1 : 0,
					reason: "disconnected",
				});
			}
		};
		pc.ondatachannel = (event) => this._attachChannel(event.channel);
		return pc;
	}

	_attachChannel(channel) {
		this.channel = channel;
		channel.onopen = () => {
			if (channel !== this.channel) return;
			this.connected = true;
			this._status(
				"Partner connected",
				this.isHost ? "You are hosting the city." : "You joined the city.",
			);
			this.callbacks.onConnected?.();
		};
		channel.onmessage = (event) => {
			if (typeof event.data !== "string" || event.data.length > 16000) return;
			try {
				this._receive(JSON.parse(event.data), this.me === 0 ? 1 : 0);
			} catch {
				/* Invalid peer data is ignored. */
			}
		};
		channel.onclose = () => {
			if (channel !== this.channel) return;
			this.connected = false;
			this._status("Partner disconnected");
			this.callbacks.onLeave?.({
				id: this.me === 0 ? 1 : 0,
				reason: "disconnected",
			});
		};
		channel.onerror = () =>
			this._status(
				"Connection interrupted",
				"Exchange a new invitation to reconnect.",
			);
	}

	async _gather(pc) {
		if (pc.iceGatheringState === "complete") return;
		await new Promise((resolve, reject) => {
			const limit = setTimeout(done, 6500);
			function done() {
				clearTimeout(limit);
				pc.removeEventListener("icegatheringstatechange", changed);
				resolve();
			}
			function changed() {
				if (pc.iceGatheringState === "complete") done();
			}
			pc.addEventListener("icegatheringstatechange", changed);
			if (pc.signalingState === "closed") {
				clearTimeout(limit);
				reject(new Error("The invitation was cancelled."));
			}
		});
	}

	_encode(description) {
		return btoa(
			JSON.stringify({
				v: 1,
				game: "super-delivery",
				type: description.type,
				sdp: description.sdp,
			}),
		);
	}

	_decode(text, expected) {
		let data;
		try {
			data = JSON.parse(atob(String(text).trim()));
		} catch {
			throw new Error("Paste the complete Super Delivery connection code.");
		}
		if (
			data.v !== 1 ||
			data.game !== "super-delivery" ||
			data.type !== expected ||
			typeof data.sdp !== "string"
		)
			throw new Error(`That is not a Super Delivery ${expected} code.`);
		return { type: data.type, sdp: data.sdp };
	}

	/** Host step 1: copy this invitation to the second player. */
	async host() {
		const pc = this._newPeer("host");
		this._status("Making invitation…");
		this._attachChannel(pc.createDataChannel("city", { ordered: true }));
		await pc.setLocalDescription(await pc.createOffer());
		await this._gather(pc);
		this._status(
			"Invitation ready",
			"Send the invitation. Then paste the reply.",
		);
		return this._encode(pc.localDescription);
	}

	/** Guest step 2: paste invitation, copy the returned reply to the host. */
	async join(offer) {
		const description = this._decode(offer, "offer");
		const pc = this._newPeer("guest");
		this._status("Making reply…");
		await pc.setRemoteDescription(description);
		await pc.setLocalDescription(await pc.createAnswer());
		await this._gather(pc);
		this._status("Reply ready", "Send this reply back to the host.");
		return this._encode(pc.localDescription);
	}

	/** Host step 3: paste the guest’s reply. The data channel now connects. */
	async accept(answer) {
		this._assertStandalone();
		if (!this.pc || this.role !== "host")
			throw new Error("Create an invitation before accepting a reply.");
		await this.pc.setRemoteDescription(this._decode(answer, "answer"));
		this._status(
			"Connecting…",
			"Direct connections work on a LAN and many home networks.",
		);
	}

	close() {
		if (this.hubActive) return;
		const channel = this.channel;
		this.channel = null;
		if (channel) {
			channel.onclose = null;
			channel.close();
		}
		if (this.pc) {
			this.pc.oniceconnectionstatechange = null;
			this.pc.close();
			this.pc = null;
		}
		this.connected = false;
		this.me = 0;
		this.server = false;
		this.players = [{ id: 0, name: "You", color: "#ef5944" }];
		this._role("solo");
		this._status("Solo edition");
	}

	stats() {
		return {
			transport: this.hubActive ? "AI Hub" : this.pc ? "WebRTC" : "none",
			role: this.role,
			connected: this.connected,
			sent: this.sent,
			received: this.received,
			server: this.server,
		};
	}
}
