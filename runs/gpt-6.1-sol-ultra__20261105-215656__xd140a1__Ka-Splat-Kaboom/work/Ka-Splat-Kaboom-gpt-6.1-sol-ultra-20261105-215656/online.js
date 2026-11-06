/** Ka-Splat! networking. AI Hub Session Protocol v1 + standalone WebRTC. */
export class Online {
	constructor(callbacks = {}) {
		this.cb = callbacks;
		this.connected = false;
		this.isHost = true;
		this.localId = 0;
		this.players = [{ id: 0, name: "Player 1", color: "#55d9d0" }];
		this.hubActive = !!globalThis.AIHub?.active;
		this.server = false;
		this.ended = false;
		this.started = false;
		this.lastInput = -Infinity;
		this.lastSnapshot = -Infinity;
		this.inputSeq = 0;
		this.snapshotSeq = 0;
		this.lastReceivedSnapshot = -1;
		this.status = "One rooftop. Two buckets. Invite a friend.";
		this._unsub = [];
		this._generation = 0;
		this._pendingSplash = false;
		this._splashHeld = false;
	}

	async init() {
		if (!this.hubActive) return null;
		const hub = globalThis.AIHub;
		this._unsub.push(hub.on("start", () => this._hubCountdown()));
		this._unsub.push(
			hub.on("message", (data, from) => this._receive(data, from)),
		);
		this._unsub.push(
			hub.on("leave", ({ id, reason }) => {
				this.players = this.players.filter((p) => p.id !== id);
				this.cb.onLeave?.(id, reason);
			}),
		);
		this._unsub.push(
			hub.on("time-up", () => {
				if (this.isHost && !this.ended) {
					this.cb.onTimeUp?.();
					// A valid result is still required if the game has no special time-up handler.
					if (!this.ended) this.finish(this.lastScore || 0, false);
				}
			}),
		);
		this._unsub.push(
			hub.on("end", ({ reason }) => {
				this.ended = true;
				this.started = false;
				clearTimeout(this._countdownTimer);
				this.cb.onEnd?.(reason);
				this._status("Round complete. The Hub has the results.");
			}),
		);
		const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) {
			for (const off of this._unsub) off();
			this._unsub = [];
			this.hubActive = false;
			return null;
		}
		this.connected = true;
		this.isHost = info.isHost;
		this.localId = info.server ? null : info.me;
		this.server = !!info.server;
		this.players = info.players.map((p) => ({ ...p }));
		this.hostId = info.host;
		this._status(
			this.isHost
				? "Bucket brigade assembled."
				: "Connected to the bucket brigade.",
		);
		this.cb.onConnected?.(info);
		return info;
	}

	ready() {
		if (this.hubActive && !this._readied) {
			this._readied = true;
			globalThis.AIHub.ready();
		}
	}

	_hubCountdown() {
		const tick = () => {
			if (this.ended) return;
			const left = -globalThis.AIHub.time();
			this.cb.onCountdown?.(Math.max(0, left));
			if (left <= 0) {
				this.started = true;
				this.cb.onStart?.();
			} else {
				this._countdownTimer = setTimeout(tick, Math.min(100, left));
			}
		};
		tick();
	}

	start() {
		if (this.hubActive || !this.connected || !this.isHost) return false;
		this.ended = false;
		this.started = true;
		this._send({ k: "start" });
		this.cb.onStart?.();
		return true;
	}

	sendInput(input) {
		if (!this.connected || this.ended || this.server) return;
		const x = Number(input.x);
		if (!Number.isFinite(x)) return;
		const splash = !!input.splash;
		if (splash && !this._splashHeld) this._pendingSplash = true;
		this._splashHeld = splash;
		const now = performance.now();
		if (now - this.lastInput < 85) return;
		this.lastInput = now;
		const data = {
			k: "input",
			seq: ++this.inputSeq,
			x: Math.max(-100, Math.min(100, x)),
			splash: this._pendingSplash,
		};
		this._pendingSplash = false;
		if (this.isHost) this.cb.onInput?.(this.localId, data);
		else this._send(data);
	}

	broadcast(snapshot, force = false) {
		if (!this.connected || !this.isHost || this.ended) return;
		const now = performance.now();
		this.lastScore = Number(snapshot.score) || this.lastScore || 0;
		if (!force && now - this.lastSnapshot < 85) return;
		this.lastSnapshot = now;
		this._send({ k: "world", seq: ++this.snapshotSeq, state: snapshot });
	}

	finish(score, won) {
		if (!this.connected || !this.isHost || this.ended) return;
		this.lastScore = Number(score) || 0;
		if (this.hubActive) {
			const ids = this.players.map((p) => p.id);
			globalThis.AIHub.finish({
				standings: [ids],
				scores: Object.fromEntries(ids.map((id) => [id, this.lastScore])),
				won: !!won,
			});
			this.ended = true;
		}
	}

	_send(data) {
		if (this.ended) return;
		if (this.hubActive) {
			globalThis.AIHub.send(
				data,
				this.isHost ? { reliable: true } : { to: this.hostId, reliable: true },
			);
		} else if (
			this._channel?.readyState === "open" &&
			this._channel.bufferedAmount < 524288
		) {
			this._channel.send(JSON.stringify(data));
		}
	}

	_receive(data, from) {
		if (!data || typeof data !== "object" || this.ended) return;
		if (
			data.k === "input" &&
			this.isHost &&
			this.players.some((p) => p.id === from)
		) {
			if (Number.isFinite(data.x))
				this.cb.onInput?.(from, {
					x: Math.max(-100, Math.min(100, data.x)),
					splash: !!data.splash,
					seq: data.seq,
				});
		} else if (
			data.k === "world" &&
			!this.isHost &&
			(!this.hubActive || from === this.hostId)
		) {
			if (
				data.seq > this.lastReceivedSnapshot &&
				data.state &&
				typeof data.state === "object"
			) {
				this.lastReceivedSnapshot = data.seq;
				this.cb.onSnapshot?.(data.state);
			}
		} else if (data.k === "start" && !this.hubActive && !this.isHost) {
			this.started = true;
			this.ended = false;
			this.cb.onStart?.();
		}
	}

	_status(message) {
		this.status = message;
		if (this._statusElement) this._statusElement.textContent = message;
		if (this._startButton)
			this._startButton.hidden = !(this.connected && this.isHost);
		this.cb.onStatus?.(message);
	}

	_setChannel(channel) {
		this._channel = channel;
		channel.onopen = () => {
			this.connected = true;
			this.ended = false;
			this.players = [
				{ id: 0, name: "Player 1", color: "#55d9d0" },
				{ id: 1, name: "Player 2", color: "#ffae68" },
			];
			this._status(
				this.isHost
					? "Friend connected! Start the brigade."
					: "Connected! Your friend starts the brigade.",
			);
			this.cb.onConnected?.({
				isHost: this.isHost,
				me: this.localId,
				players: this.players,
				server: false,
			});
		};
		channel.onmessage = ({ data }) => {
			try {
				this._receive(JSON.parse(data), this.isHost ? 1 : 0);
			} catch {
				/* Ignore malformed remote packets. */
			}
		};
		channel.onclose = () => {
			if (!this.connected) return;
			this.connected = false;
			this.started = false;
			this.cb.onLeave?.(this.isHost ? 1 : 0, "disconnected");
			this._status(
				"The brigade connection closed. Reconnect to play together.",
			);
		};
		channel.onerror = () =>
			this._status("The brigade connection failed. Try a fresh invitation.");
	}

	_newPeer(host) {
		this.disconnect();
		this.isHost = host;
		this.localId = host ? 0 : 1;
		this.hostId = 0;
		this.lastReceivedSnapshot = -1;
		this.snapshotSeq = 0;
		this.inputSeq = 0;
		this._pendingSplash = false;
		this._splashHeld = false;
		if (!globalThis.RTCPeerConnection)
			throw new Error(
				"This browser does not support WebRTC. Use a current Chrome, Edge, Safari or Firefox.",
			);
		const pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this._pc = pc;
		this._generation += 1;
		pc.onconnectionstatechange = () => {
			if (pc !== this._pc) return;
			if (pc.connectionState === "failed")
				this._status(
					"Direct connection failed. Both players should try the same network, or use AI Hub.",
				);
			if (pc.connectionState === "connecting")
				this._status("Connecting the bucket brigade…");
		};
		pc.ondatachannel = ({ channel }) => this._setChannel(channel);
		if (host)
			this._setChannel(
				pc.createDataChannel("ka-splat-brigade", { ordered: true }),
			);
		return pc;
	}

	async _gather(pc) {
		if (pc.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			const done = () => {
				clearTimeout(timeout);
				pc.removeEventListener("icegatheringstatechange", changed);
				resolve();
			};
			const changed = () => {
				if (pc.iceGatheringState === "complete") done();
			};
			const timeout = setTimeout(done, 8000);
			pc.addEventListener("icegatheringstatechange", changed);
		});
	}

	async createOffer() {
		if (this.hubActive) throw new Error("AI Hub manages this session.");
		const pc = this._newPeer(true);
		this._status("Preparing your invitation…");
		await pc.setLocalDescription(await pc.createOffer());
		await this._gather(pc);
		if (pc !== this._pc) throw new Error("Invitation was cancelled.");
		this._status(
			"Send the invitation to your friend, then paste their reply below.",
		);
		return this._encode(pc.localDescription);
	}

	async acceptOffer(code) {
		if (this.hubActive) throw new Error("AI Hub manages this session.");
		const description = this._decode(code, "offer");
		const pc = this._newPeer(false);
		this._status("Preparing your reply…");
		await pc.setRemoteDescription(description);
		await pc.setLocalDescription(await pc.createAnswer());
		await this._gather(pc);
		if (pc !== this._pc) throw new Error("Invitation was cancelled.");
		this._status("Send this reply to your friend. Keep this screen open.");
		return this._encode(pc.localDescription);
	}

	async acceptAnswer(code) {
		if (!this._pc || !this.isHost)
			throw new Error("Create an invitation first.");
		await this._pc.setRemoteDescription(this._decode(code, "answer"));
		this._status("Connecting the bucket brigade…");
	}

	_encode(description) {
		return (
			"KS1." +
			btoa(JSON.stringify({ type: description.type, sdp: description.sdp }))
		);
	}

	_decode(code, type) {
		try {
			const value = code.trim().replace(/\s/g, "");
			if (!value.startsWith("KS1.")) throw new Error();
			const description = JSON.parse(atob(value.slice(4)));
			if (
				description.type !== type ||
				typeof description.sdp !== "string" ||
				description.sdp.length > 30000
			)
				throw new Error();
			return description;
		} catch {
			throw new Error(
				type === "offer"
					? "Paste the complete invitation code, starting with KS1."
					: "Paste your friend’s complete reply code, starting with KS1.",
			);
		}
	}

	disconnect() {
		if (this.hubActive) return;
		this.connected = false;
		this.started = false;
		this.ended = false;
		if (this._channel) {
			this._channel.onclose = null;
			this._channel.close();
		}
		if (this._pc) {
			this._pc.onconnectionstatechange = null;
			this._pc.close();
		}
		this._channel = null;
		this._pc = null;
		this._generation += 1;
		this.isHost = true;
		this.localId = 0;
		this.players = [{ id: 0, name: "Player 1", color: "#55d9d0" }];
		this._status("One rooftop. Two buckets. Invite a friend.");
	}

	mount(element) {
		if (this.hubActive) return;
		element.innerHTML = `<div class="ks-online"><p class="ks-network-status" role="status"></p><div class="ks-network-choices"><button type="button" data-net="host">Host brigade</button><button type="button" data-net="join">Join brigade</button></div><div class="ks-network-flow" hidden><p class="ks-network-help"></p><label class="ks-network-input-label">Friend’s code<textarea class="ks-network-input" rows="2" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Friend’s connection code"></textarea></label><button type="button" class="ks-network-action"></button><div class="ks-network-output-wrap" hidden><label>Your code<textarea class="ks-network-output" rows="2" readonly aria-label="Your connection code"></textarea></label><button type="button" class="ks-network-copy">Copy code</button></div></div><p class="ks-network-note">Direct peer-to-peer co-op. Exchange codes with a friend. Some restricted networks need AI Hub.</p><button type="button" class="ks-network-start" hidden>Start brigade</button><button type="button" class="ks-network-disconnect">Disconnect</button></div>`;
		this._statusElement = element.querySelector(".ks-network-status");
		this._startButton = element.querySelector(".ks-network-start");
		const flow = element.querySelector(".ks-network-flow");
		const help = element.querySelector(".ks-network-help");
		const input = element.querySelector(".ks-network-input");
		const output = element.querySelector(".ks-network-output");
		const outputWrap = element.querySelector(".ks-network-output-wrap");
		const action = element.querySelector(".ks-network-action");
		const inputLabel = element.querySelector(".ks-network-input-label");
		let mode = "";
		const perform = async (button, work) => {
			button.disabled = true;
			try {
				await work();
			} catch (error) {
				this._status(
					error.message || "Could not connect. Try a fresh invitation.",
				);
			} finally {
				button.disabled = false;
			}
		};
		element.querySelector('[data-net="host"]').onclick = (event) =>
			perform(event.currentTarget, async () => {
				mode = "host";
				flow.hidden = false;
				outputWrap.hidden = true;
				input.value = "";
				output.value = "";
				inputLabel.hidden = false;
				help.textContent =
					"1. Send your invitation. 2. Paste your friend’s reply. 3. Connect.";
				action.textContent = "Connect friend";
				output.value = await this.createOffer();
				outputWrap.hidden = false;
			});
		element.querySelector('[data-net="join"]').onclick = () => {
			this.disconnect();
			mode = "join";
			flow.hidden = false;
			outputWrap.hidden = true;
			inputLabel.hidden = false;
			input.value = "";
			output.value = "";
			help.textContent =
				"Paste your friend’s invitation. Send the reply back to them.";
			action.textContent = "Make reply";
			input.focus();
		};
		action.onclick = () =>
			perform(action, async () => {
				if (mode === "host") await this.acceptAnswer(input.value);
				else {
					output.value = await this.acceptOffer(input.value);
					outputWrap.hidden = false;
				}
			});
		element.querySelector(".ks-network-copy").onclick = async () => {
			output.focus();
			output.select();
			try {
				if (navigator.clipboard?.writeText)
					await navigator.clipboard.writeText(output.value);
				else if (!document.execCommand("copy")) throw new Error();
				this._status("Code copied. Send it to your friend.");
			} catch {
				this._status(
					"Code selected. Press Ctrl+C or use your device’s Copy action.",
				);
			}
		};
		this._startButton.onclick = () => this.start();
		element.querySelector(".ks-network-disconnect").onclick = () => {
			this.disconnect();
			flow.hidden = true;
		};
		this._status(this.status);
		if (!document.getElementById("ks-online-style")) {
			const style = document.createElement("style");
			style.id = "ks-online-style";
			style.textContent =
				".ks-online{display:grid;gap:14px}.ks-online p{margin:0}.ks-network-choices{display:flex;gap:12px}.ks-network-flow{display:grid;gap:12px}.ks-network-flow[hidden],.ks-network-output-wrap[hidden]{display:none}.ks-online label{display:grid;gap:7px}.ks-online textarea{box-sizing:border-box;width:100%;border:2px solid currentColor;border-radius:10px;background:#101f2a;color:#fff;padding:12px;font:16px monospace;resize:vertical}.ks-network-output-wrap{display:grid;gap:10px}.ks-network-note{font-size:16px;opacity:.72}.ks-network-status{font-size:20px;color:#5ce0d2}.ks-online button[hidden]{display:none}.ks-online button:disabled{opacity:.5}";
			document.head.append(style);
		}
	}
}
