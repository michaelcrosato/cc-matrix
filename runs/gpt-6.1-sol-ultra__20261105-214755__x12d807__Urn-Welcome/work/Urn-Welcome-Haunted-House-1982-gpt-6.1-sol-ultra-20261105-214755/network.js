/* Urn Welcome — shared-world co-op transport. AI Hub sessions own their lifecycle. */
export class Network {
	constructor({
		onStatus = () => {},
		onSnapshot = () => {},
		onInput = () => {},
		onStart = () => {},
		onEnd = () => {},
		onTimeUp = null,
	} = {}) {
		Object.assign(this, {
			onStatus,
			onSnapshot,
			onInput,
			onStart,
			onEnd,
			onTimeUp,
		});
		this.role = "solo";
		this.connected = false;
		this.active = false;
		this.ended = false;
		this.room = "";
		this.localIndex = 0;
		this.playerCount = 1;
		this.server = false;
		this.peer = "";
		this.info = null;
		this.channel = null;
		this.rtc = null;
		this.dataChannel = null;
		this.transport = "local";
		this.lastBroadcast = -Infinity;
		this.lastInput = -Infinity;
		this.latestInput = {};
		this.lastSeen = 0;
		this.lastPing = 0;
		this.joinTimer = null;
		this.startTimer = null;
		this.tickTimer = null;
		this.unsub = [];
		this.token =
			globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
	}
	async init() {
		if (!globalThis.AIHub?.active) return null;
		this.active = true;
		this.onStatus("Connecting to AI Hub…");
		const h = globalThis.AIHub;
		this.unsub.push(h.on("message", (data, from) => this.receive(data, from)));
		this.unsub.push(
			h.on("start", (event) => {
				clearTimeout(this.startTimer);
				this.startTimer = setTimeout(
					() => {
						if (this.ended) return;
						this.connected = true;
						// Establish this seat's controls before its first rendered frame.
						if (this.role === "guest")
							this.sendInput({
								x: 0,
								y: 0,
								z: 0,
								interact: false,
								pulse: false,
								drop: false,
							});
						this.onStart(this.startInfo());
						this.onStatus(
							this.server
								? "AI Hub · world server"
								: `AI Hub · ${this.playerCount} explorers`,
						);
					},
					Math.max(0, Number(event.in) || 0),
				);
			}),
		);
		this.unsub.push(
			h.on("leave", ({ id }) => {
				const index = this.info?.players.findIndex((p) => p.id === id) ?? -1;
				if (index >= 0 && this.role === "host")
					this.onInput(
						{ x: 0, y: 0, action: false, light: false, disconnected: true },
						index,
					);
				this.onStatus("An explorer left the house");
			}),
		);
		this.unsub.push(
			h.on("time-up", () => {
				if (this.role !== "host" || this.ended) return;
				if (this.onTimeUp) this.onTimeUp();
				if (!this.reported) this.finish(false, 0);
			}),
		);
		this.unsub.push(
			h.on("end", (event) => {
				this.ended = true;
				this.connected = false;
				clearTimeout(this.startTimer);
				this.onEnd(event);
				this.onStatus("AI Hub round ended");
			}),
		);
		try {
			const info = await h.connect({ mode: "shared-world", seats: [1, 2] });
			if (!info) {
				this.active = false;
				return null;
			}
			this.info = info;
			this.server = !!info.server;
			this.localIndex = info.players.findIndex((p) => p.id === info.me);
			this.playerCount = info.players.length;
			this.role = info.isHost ? "host" : "guest";
			this.peer = info.host;
			h.ready();
			this.onStatus("AI Hub · ready for the round");
			return info;
		} catch (error) {
			h.fail(`Urn Welcome could not join: ${error.message}`);
			this.onStatus("AI Hub connection failed");
			throw error;
		}
	}
	startInfo() {
		return {
			hub: this.active,
			info: this.info,
			localIndex: this.localIndex,
			playerCount: this.playerCount,
			server: this.server,
			role: this.role,
		};
	}
	host() {
		if (this.active) return "";
		this.disconnect();
		const bytes = new Uint8Array(4);
		globalThis.crypto.getRandomValues(bytes);
		this.room = Array.from(
			bytes,
			(b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32],
		).join("");
		this.role = "host";
		this.localIndex = 0;
		this.playerCount = 1;
		this.ended = false;
		if (!this.openChannel(this.room)) {
			this.role = "solo";
			return "";
		}
		this.onStatus(`Room ${this.room} · waiting for an explorer`);
		return this.room;
	}
	join(code) {
		if (this.active) return false;
		this.disconnect();
		code = String(code).trim().toUpperCase();
		if (!/^[A-Z2-9]{4}$/.test(code)) {
			this.onStatus("Enter the four-letter room code");
			return false;
		}
		this.room = code;
		this.role = "guest";
		this.localIndex = 1;
		this.playerCount = 2;
		this.ended = false;
		if (!this.openChannel(code)) {
			this.role = "solo";
			return false;
		}
		this.channel.postMessage({ t: "hello", sender: this.token });
		this.joinTimer = setTimeout(() => {
			if (this.connected) return;
			this.onStatus("No room found. Open the same game in another tab.");
			this.disconnect(false);
		}, 6000);
		this.onStatus(`Looking for room ${code}…`);
		return true;
	}
	openChannel(code) {
		if (!globalThis.BroadcastChannel) {
			this.onStatus("This browser does not support local tab co-op");
			return false;
		}
		try {
			this.channel = new BroadcastChannel(`urn-welcome-v1-${code}`);
			this.channel.onmessage = ({ data }) => this.receive(data, data?.sender);
			this.lastSeen = performance.now();
			this.tickTimer = setInterval(() => {
				if (!this.channel) return;
				const now = performance.now();
				if (this.peer && now - this.lastSeen > 8000) {
					if (this.role === "host") {
						this.peer = "";
						this.connected = false;
						this.playerCount = 1;
						this.onInput(
							{ x: 0, y: 0, action: false, light: false, disconnected: true },
							1,
						);
						this.onStatus(`Room ${this.room} · explorer disconnected`);
					} else {
						this.onStatus("The host disconnected");
						this.onEnd({ reason: "host-left" });
						this.disconnect(false);
					}
					return;
				}
				this.channel.postMessage({
					t: "ping",
					sender: this.token,
					to: this.peer,
				});
				if (this.role === "guest" && !this.connected)
					this.channel.postMessage({ t: "hello", sender: this.token });
			}, 1000);
			return true;
		} catch (error) {
			this.onStatus(`Co-op unavailable: ${error.message}`);
			return false;
		}
	}
	receive(data, from) {
		if (!data || typeof data !== "object" || this.ended) return;
		if (this.active) {
			if (data.t === "input" && this.role === "host") {
				const index = this.info.players.findIndex((p) => p.id === from);
				if (index >= 0 && data.input && typeof data.input === "object")
					this.onInput(data.input, index);
			} else if (
				data.t === "snapshot" &&
				this.role === "guest" &&
				from === this.info.host
			) {
				this.connected = true;
				this.onSnapshot(data.state);
			}
			return;
		}
		if (
			from === this.token ||
			(this.transport !== "rtc" && data.to && data.to !== this.token)
		)
			return;
		if (data.t === "hello" && this.role === "host") {
			if (this.peer && this.peer !== from) {
				this.channel?.postMessage({ t: "full", sender: this.token, to: from });
				return;
			}
			const wasConnected = this.connected;
			this.peer = from;
			this.connected = true;
			this.playerCount = 2;
			this.lastSeen = performance.now();
			this.channel?.postMessage({ t: "welcome", sender: this.token, to: from });
			if (!wasConnected) {
				this.onStatus(`Room ${this.room} · two explorers`);
				this.onStart(this.startInfo());
			}
			return;
		}
		if (data.t === "full" && this.role === "guest" && !this.connected) {
			this.onStatus("That room already has two explorers");
			this.disconnect(false);
			return;
		}
		if (data.t === "welcome" && this.role === "guest") {
			const wasConnected = this.connected;
			this.peer = from;
			this.connected = true;
			clearTimeout(this.joinTimer);
			this.lastSeen = performance.now();
			this.onStatus(`Room ${this.room} · connected`);
			if (!wasConnected) this.onStart(this.startInfo());
			return;
		}
		if (from !== this.peer) return;
		this.lastSeen = performance.now();
		if (data.t === "bye") {
			this.connected = false;
			this.peer = "";
			if (this.role === "host") {
				this.playerCount = 1;
				this.onInput(
					{ x: 0, y: 0, action: false, light: false, disconnected: true },
					1,
				);
				this.onStatus(`Room ${this.room} · explorer left`);
			} else {
				this.onStatus("The host closed the room");
				this.onEnd({ reason: "host-left" });
				this.disconnect(false);
			}
		} else if (data.t === "input" && this.role === "host")
			this.onInput(data.input, 1);
		else if (data.t === "snapshot" && this.role === "guest")
			this.onSnapshot(data.state);
		else if (data.t === "finish" && this.role === "guest") {
			this.onEnd(data.result);
		}
	}
	sendInput(input) {
		if (this.role !== "guest" || !this.connected || this.ended) return false;
		const now = performance.now();
		if (now - this.lastInput < 1000 / 15) return false;
		this.lastInput = now;
		if (this.active)
			return AIHub.send(
				{ t: "input", input },
				{ to: this.info.host, reliable: true },
			);
		this.sendData({ t: "input", input, sender: this.token, to: this.peer });
		return true;
	}
	broadcast(state) {
		if (this.role !== "host" || this.ended) return false;
		const now = performance.now();
		if (now - this.lastBroadcast < 1000 / 12) return false;
		this.lastBroadcast = now;
		if (this.active)
			return AIHub.send({ t: "snapshot", state }, { reliable: true });
		if (this.connected)
			this.sendData({
				t: "snapshot",
				state,
				sender: this.token,
				to: this.peer,
			});
		return this.connected;
	}
	beginRound() {
		if (this.active && this.reported) return false;
		this.reported = false;
		this.ended = false;
		this.lastInput = -Infinity;
		this.lastBroadcast = -Infinity;
		return true;
	}
	finish(won, score = 0, stats = {}) {
		if (this.role !== "host" || this.reported || this.ended) return;
		this.reported = true;
		const result = { reason: "finished", won: !!won, score };
		if (this.active) {
			const ids = this.info.players.map((p) => p.id);
			const scores = Object.fromEntries(ids.map((id) => [id, score]));
			const perPlayer = Object.fromEntries(ids.map((id) => [id, stats]));
			AIHub.finish({ standings: [ids], scores, won: !!won, stats: perPlayer });
		} else
			this.sendData({ t: "finish", result, sender: this.token, to: this.peer });
	}
	sendData(data) {
		if (this.transport === "rtc") {
			if (this.dataChannel?.readyState === "open") {
				if (this.dataChannel.bufferedAmount > 262144) return false;
				this.dataChannel.send(JSON.stringify(data));
				return true;
			}
			return false;
		}
		this.channel?.postMessage(data);
		return !!this.channel;
	}
	createPeer(role) {
		if (this.active) throw new Error("AI Hub owns networking during a session");
		if (!globalThis.RTCPeerConnection)
			throw new Error("WebRTC is unavailable in this browser");
		this.disconnect();
		this.role = role;
		this.localIndex = role === "host" ? 0 : 1;
		this.playerCount = 2;
		this.ended = false;
		this.transport = "rtc";
		this.peer = "rtc-peer";
		this.rtc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.rtc.onconnectionstatechange = () => {
			if (this.rtc?.connectionState === "failed")
				this.onStatus(
					"Remote connection failed. Try local tab co-op or another network.",
				);
		};
		if (role === "host")
			this.attachDataChannel(
				this.rtc.createDataChannel("urn-world", { ordered: true }),
			);
		else
			this.rtc.ondatachannel = ({ channel }) => this.attachDataChannel(channel);
		return this.rtc;
	}
	attachDataChannel(channel) {
		this.dataChannel = channel;
		channel.onopen = () => {
			this.connected = true;
			this.peer = "rtc-peer";
			this.playerCount = 2;
			this.onStatus("Remote co-op · two explorers");
			this.onStart(this.startInfo());
		};
		channel.onmessage = ({ data }) => {
			try {
				this.receive(JSON.parse(data), "rtc-peer");
			} catch {
				/* Ignore malformed packets. */
			}
		};
		channel.onerror = () =>
			this.onStatus("The remote connection encountered a network error");
		channel.onclose = () => {
			this.connected = false;
			if (this.role === "host") {
				this.playerCount = 1;
				this.onInput(
					{ x: 0, y: 0, action: false, light: false, disconnected: true },
					1,
				);
			} else this.onEnd({ reason: "host-left" });
			this.onStatus("Remote explorer disconnected");
		};
	}
	async gatherIce(peer) {
		if (peer.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			const timeout = setTimeout(done, 9000);
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
	async encodeSignal(description) {
		let bytes = new TextEncoder().encode(
			JSON.stringify({ v: 1, type: description.type, sdp: description.sdp }),
		);
		let prefix = "URN1.";
		if (globalThis.CompressionStream) {
			bytes = new Uint8Array(
				await new Response(
					new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip")),
				).arrayBuffer(),
			);
			prefix = "URNZ.";
		}
		return (
			prefix + btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
		);
	}
	async decodeSignal(code, type) {
		code = String(code).replace(/\s/g, "");
		const [prefix, body] = code.split(".");
		if (!["URN1", "URNZ"].includes(prefix) || !body || code.length > 100000)
			throw new Error("Paste a complete Urn Welcome connection code");
		let bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
		if (prefix === "URNZ") {
			if (!globalThis.DecompressionStream)
				throw new Error("This browser cannot read compressed connection codes");
			bytes = new Uint8Array(
				await new Response(
					new Blob([bytes])
						.stream()
						.pipeThrough(new DecompressionStream("gzip")),
				).arrayBuffer(),
			);
		}
		const data = JSON.parse(new TextDecoder().decode(bytes));
		if (data.v !== 1 || data.type !== type || typeof data.sdp !== "string")
			throw new Error(`Expected an Urn Welcome ${type} code`);
		return { type: data.type, sdp: data.sdp };
	}
	async createOffer() {
		const peer = this.createPeer("host");
		this.onStatus("Making an invitation…");
		await peer.setLocalDescription(await peer.createOffer());
		await this.gatherIce(peer);
		this.onStatus("Send your invitation; paste your friend’s reply to connect");
		return this.encodeSignal(peer.localDescription);
	}
	async acceptOffer(code) {
		const offer = await this.decodeSignal(code, "offer");
		const peer = this.createPeer("guest");
		this.onStatus("Making your reply…");
		await peer.setRemoteDescription(offer);
		await peer.setLocalDescription(await peer.createAnswer());
		await this.gatherIce(peer);
		this.onStatus("Send this reply to the host; keep this screen open");
		return this.encodeSignal(peer.localDescription);
	}
	async acceptAnswer(code) {
		if (this.role !== "host" || !this.rtc)
			throw new Error("Make an invitation first");
		const answer = await this.decodeSignal(code, "answer");
		await this.rtc.setRemoteDescription(answer);
		this.onStatus("Connecting to your friend…");
		return true;
	}
	get time() {
		return this.active ? AIHub.time() : 0;
	}
	disconnect(announce = true) {
		if (this.active) return;
		if (announce && this.peer)
			this.sendData({ t: "bye", sender: this.token, to: this.peer });
		this.channel?.close();
		this.channel = null;
		if (this.dataChannel) {
			this.dataChannel.onclose = null;
			this.dataChannel.close();
			this.dataChannel = null;
		}
		if (this.rtc) {
			this.rtc.onconnectionstatechange = null;
			this.rtc.close();
			this.rtc = null;
		}
		this.transport = "local";
		clearTimeout(this.joinTimer);
		clearTimeout(this.startTimer);
		clearInterval(this.tickTimer);
		this.peer = "";
		this.connected = false;
		this.role = "solo";
		this.localIndex = 0;
		this.playerCount = 1;
		this.room = "";
		this.reported = false;
		if (announce) this.onStatus("Playing solo");
	}
}
