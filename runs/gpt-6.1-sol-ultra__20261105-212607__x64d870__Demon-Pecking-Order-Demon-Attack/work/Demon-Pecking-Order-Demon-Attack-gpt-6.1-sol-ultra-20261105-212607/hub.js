/* Demon Pecking Order networking. AI Hub Session Protocol v1 plus standalone WebRTC. */
class HubLink {
	constructor(callbacks = {}) {
		this.cb = callbacks;
		this.hubActive = !!globalThis.AIHub?.active;
		this.role = "solo";
		this.localId = 0;
		this.id = 0;
		this.hostId = 0;
		this.isHost = true;
		this.server = false;
		this.connected = false;
		this.started = false;
		this.ended = false;
		this.finished = false;
		this.score = 0;
		this.players = [{ id: 0, name: "Cannon One", color: "#70ece0" }];
		this.status = "";
		this._lastInput = -Infinity;
		this._lastState = -Infinity;
		this._inputSeq = 0;
		this._stateSeq = 0;
		this._receivedState = -1;
		this._inputSequences = new Map();
		this._offs = [];
	}

	_emit(name, ...args) {
		this.cb[name]?.(...args);
	}
	get panel() {
		return this._panel;
	}
	_status(message) {
		this.status = message;
		if (this._panelStatus) this._panelStatus.textContent = message;
		this._emit("onStatus", message);
	}
	_info() {
		return {
			players: this.players.map((p) => ({ ...p })),
			me: this.localId,
			localId: this.localId,
			isHost: this.isHost,
			host: this.hostId,
			server: this.server,
			hub: this.hubActive,
			role: this.role,
		};
	}

	async init() {
		if (!this.hubActive) return null;
		const hub = globalThis.AIHub;
		this._offs.push(
			hub.on("message", (data, from) => this._receive(data, from)),
		);
		this._offs.push(
			hub.on("start", () => {
				const begin = () => {
					if (this.ended) return;
					if (hub.time() < 0) {
						this._startTimer = setTimeout(begin, Math.min(50, -hub.time()));
						return;
					}
					this.started = true;
					this._status("AI Hub co-op round");
					this._emit("onStart", this._info());
				};
				begin();
			}),
		);
		this._offs.push(
			hub.on("leave", (detail) => {
				this.players = this.players.filter((p) => p.id !== detail.id);
				if (this._pendingFinish) {
					this._pendingFinish.ids.delete(detail.id);
					if (!this._pendingFinish.ids.size) this._finishNow();
				}
				this._emit("onLeave", detail);
			}),
		);
		this._offs.push(
			hub.on("time-up", (detail) => {
				this._emit("onTimeUp", detail);
				if (this.isHost && !this.finished) this.finish(this.score, false);
			}),
		);
		this._offs.push(
			hub.on("end", (detail) => {
				this.ended = true;
				this.started = false;
				clearTimeout(this._startTimer);
				clearTimeout(this._finishTimer);
				this._emit("onEnd", detail);
			}),
		);
		const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) {
			this.hubActive = false;
			return null;
		}
		this.localId = this.id = info.me;
		this.hostId = info.host;
		this.isHost = !!info.isHost;
		this.server = !!info.server;
		this.players = info.players.map((p) => ({ ...p }));
		this.connected = true;
		this.role = this.isHost ? "host" : "client";
		this._status("Waiting for the AI Hub round");
		this._emit("onJoin", this._info());
		hub.ready();
		return info;
	}

	sendInput(input) {
		if (this.ended || !this.connected || this.isHost || !this.started)
			return false;
		const now = performance.now();
		if (now - this._lastInput < 70) return false;
		this._lastInput = now;
		return this._send(
			{ kind: "input", seq: ++this._inputSeq, input },
			this.hostId,
			false,
		);
	}

	sendState(state) {
		if (this.ended || !this.connected || !this.isHost || !this.started)
			return false;
		const now = performance.now();
		if (now - this._lastState < 100) return false;
		this._lastState = now;
		return this._send(
			{ kind: "state", seq: ++this._stateSeq, state },
			undefined,
			true,
		);
	}

	updateScore(score) {
		if (Number.isFinite(score)) this.score = score;
	}

	finish(score = this.score, won = true, terminalState = null) {
		if (this.finished || this.ended || !this.isHost) return false;
		this.finished = true;
		this.updateScore(score);
		const ids = new Set(
			this.players.filter((p) => p.id !== this.localId).map((p) => p.id),
		);
		this._pendingFinish = {
			score: this.score,
			won: !!won,
			ids,
			seq: ++this._stateSeq,
		};
		if (terminalState && this.connected && ids.size) {
			// A session's end can outrun its final world snapshot. Make clients apply
			// the terminal world before finishing the round on the hub's clock.
			this._finishTimer = setTimeout(() => this._finishNow(), 1200);
			this._send(
				{
					kind: "terminal",
					seq: this._pendingFinish.seq,
					state: terminalState,
				},
				undefined,
				true,
			);
		} else this._finishNow();
		return true;
	}

	_finishNow() {
		const pending = this._pendingFinish;
		if (!pending || this.ended) return;
		this._pendingFinish = null;
		clearTimeout(this._finishTimer);
		const ids = this.players.map((p) => p.id);
		const scores = Object.fromEntries(ids.map((id) => [id, pending.score]));
		if (this.hubActive) {
			globalThis.AIHub.finish({ standings: [ids], scores, won: pending.won });
		} else if (this.connected) {
			this._send(
				{ kind: "finished", score: pending.score, won: pending.won },
				undefined,
				true,
			);
		}
	}

	_send(data, to, reliable = true) {
		if (this.ended) return false;
		// Leave room for protocol fields inside AI Hub's 16 KB per-message limit.
		if (JSON.stringify(data).length > 15500) {
			this._status("World snapshot exceeds the network limit");
			return false;
		}
		if (this.hubActive) return globalThis.AIHub.send(data, { to, reliable });
		if (this._channel) {
			this._channel.postMessage({ sender: this.localId, data });
			return true;
		}
		if (this._connection?.open) {
			this._connection.send(data);
			return true;
		}
		return false;
	}

	_receive(data, from) {
		if (this.ended || !data || typeof data !== "object") return;
		if (
			data.kind === "input" &&
			this.isHost &&
			this.players.some((p) => p.id === from)
		) {
			if (
				!Number.isFinite(data.seq) ||
				data.seq <= (this._inputSequences.get(from) ?? -1)
			)
				return;
			this._inputSequences.set(from, data.seq);
			this._emit("onInput", data.input, from);
		} else if (
			(data.kind === "state" || data.kind === "terminal") &&
			!this.isHost &&
			from === this.hostId
		) {
			if (!Number.isFinite(data.seq) || data.seq <= this._receivedState) return;
			this._receivedState = data.seq;
			this._emit("onState", data.state);
			if (data.kind === "terminal")
				this._send({ kind: "terminalAck", seq: data.seq }, this.hostId, true);
		} else if (
			data.kind === "terminalAck" &&
			this.isHost &&
			this._pendingFinish &&
			data.seq === this._pendingFinish.seq
		) {
			this._pendingFinish.ids.delete(from);
			if (!this._pendingFinish.ids.size) this._finishNow();
		} else if (
			data.kind === "start" &&
			!this.hubActive &&
			!this.isHost &&
			from === 0
		) {
			this.players = data.players;
			this.started = true;
			this.connected = true;
			this._emit("onJoin", this._info());
			this.hidePanel();
			this._emit("onStart", this._info());
		} else if (
			data.kind === "finished" &&
			!this.hubActive &&
			!this.isHost &&
			from === 0
		) {
			this._emit("onFinish", { score: data.score, won: data.won });
		} else if (data.kind === "bye" && !this.hubActive) {
			this._disconnected();
		}
	}

	static _code() {
		const bytes = new Uint8Array(6);
		crypto.getRandomValues(bytes);
		const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
	}

	async _loadPeer() {
		if (this.hubActive) throw new Error("AI Hub supplies the session network.");
		if (globalThis.Peer) return globalThis.Peer;
		HubLink._peerPromise ||= new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src =
				"https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
			script.onload = () =>
				globalThis.Peer
					? resolve(globalThis.Peer)
					: reject(new Error("Online library did not load."));
			script.onerror = () =>
				reject(
					new Error(
						"Cannot load online co-op. Check your internet connection.",
					),
				);
			document.head.appendChild(script);
		}).catch((error) => {
			HubLink._peerPromise = null;
			throw error;
		});
		return HubLink._peerPromise;
	}

	_resetStandalone() {
		if (this.hubActive) throw new Error("The AI Hub controls this round.");
		this.close();
		this.ended = false;
		this.finished = false;
		this.started = false;
		this._inputSeq = this._stateSeq = 0;
		this._receivedState = -1;
		this._lastInput = this._lastState = -Infinity;
		this._inputSequences.clear();
	}

	async hostRoom(options = {}) {
		this._resetStandalone();
		this.role = "host";
		this.localId = this.id = this.hostId = 0;
		this.isHost = true;
		this.server = false;
		this.room = options.code || HubLink._code();
		this.players = [{ id: 0, name: "Cannon One", color: "#70ece0" }];
		this._status("Opening a co-op room…");
		if (options.local) {
			this.room = "LOCAL-" + this.room.replace(/^LOCAL-/, "");
			this._channel = new BroadcastChannel("dpo-" + this.room);
			this._channel.onmessage = (event) => {
				const message = event.data;
				if (message.sender === 0) return;
				if (message.data?.kind === "hello") this._startStandalone();
				else this._receive(message.data, 1);
			};
			this._status("Room " + this.room + " · waiting for Cannon Two");
			return this.room;
		}
		const Peer = await this._loadPeer();
		await this._openPeer(Peer, "dpo-" + this.room);
		this._peer.on("connection", (connection) => {
			if (this.connected || this._connection) {
				connection.on("open", () => {
					connection.send({ kind: "full" });
					setTimeout(() => connection.close(), 100);
				});
				return;
			}
			this._attachConnection(connection, true);
		});
		this._status("Room " + this.room + " · waiting for Cannon Two");
		return this.room;
	}

	async joinRoom(code) {
		code = String(code || "")
			.trim()
			.toUpperCase();
		if (!/^(LOCAL-)?[A-Z2-9]{6}$/.test(code))
			throw new Error("Enter the six-character room code.");
		this._resetStandalone();
		this.role = "client";
		this.isHost = false;
		this.localId = this.id = 1;
		this.hostId = 0;
		this.server = false;
		this.room = code;
		this._status("Joining room " + code + "…");
		if (code.startsWith("LOCAL-")) {
			this._channel = new BroadcastChannel("dpo-" + code);
			this._channel.onmessage = (event) => {
				if (event.data.sender === 0) this._receive(event.data.data, 0);
			};
			this._send({ kind: "hello" });
			this._joinTimer = setInterval(() => {
				if (this.started) {
					clearInterval(this._joinTimer);
					return;
				}
				this._send({ kind: "hello" });
			}, 500);
			return code;
		}
		const Peer = await this._loadPeer();
		await this._openPeer(Peer);
		const connection = this._peer.connect("dpo-" + code, {
			reliable: true,
			serialization: "json",
			metadata: { game: "dpo", version: 1 },
		});
		this._attachConnection(connection, false);
		return code;
	}

	_openPeer(Peer, id) {
		return new Promise((resolve, reject) => {
			const peer = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 });
			this._peer = peer;
			const timeout = setTimeout(() => {
				peer.destroy();
				reject(new Error("The room service did not answer. Try again."));
			}, 18000);
			peer.on("open", () => {
				clearTimeout(timeout);
				resolve(peer);
			});
			peer.on("error", (error) => {
				clearTimeout(timeout);
				const friendly =
					error.type === "peer-unavailable"
						? "That room is unavailable. Check the code and try again."
						: error.type === "unavailable-id"
							? "That room already exists. Create a new room."
							: "The co-op connection could not be made. Try another network.";
				this._status(friendly);
				reject(new Error(friendly));
			});
			peer.on("disconnected", () => {
				if (!this.connected)
					this._status(
						"Room service disconnected. Create or join a room again.",
					);
			});
		});
	}

	_attachConnection(connection, host) {
		this._connection = connection;
		const timeout = setTimeout(() => {
			if (!this.connected) {
				connection.close();
				this._connection = null;
				this._status(
					"Cannon Two could not connect. Check the room code or try another network.",
				);
			}
		}, 20000);
		connection.on("open", () => {
			clearTimeout(timeout);
			this.connected = true;
			if (host) this._startStandalone();
		});
		connection.on("data", (data) => {
			if (data?.kind === "full") {
				this._status("That room already has two cannons.");
				connection.close();
				return;
			}
			this._receive(data, host ? 1 : 0);
		});
		connection.on("close", () => {
			clearTimeout(timeout);
			this._disconnected();
		});
		connection.on("error", () => {
			clearTimeout(timeout);
			this._disconnected();
		});
	}

	_startStandalone() {
		if (this.started) return;
		this.players = [
			{ id: 0, name: "Cannon One", color: "#70ece0" },
			{ id: 1, name: "Cannon Two", color: "#ffb965" },
		];
		this.connected = this.started = true;
		this._send({ kind: "start", players: this.players }, undefined, true);
		this._status("Two cannons. One sky. Co-op connected.");
		this._emit("onJoin", this._info());
		this.hidePanel();
		this._emit("onStart", this._info());
	}

	_disconnected() {
		if (this._closing || this.ended || !this.connected) return;
		this.connected = false;
		this._status(
			this.isHost
				? "Cannon Two disconnected. Your patrol continues solo."
				: "Cannon One disconnected. Return to the title to reconnect.",
		);
		this._emit("onLeave", { id: this.isHost ? 1 : 0, reason: "disconnected" });
		if (!this.isHost) {
			this.started = false;
			this._emit("onEnd", { reason: "host-left" });
		} else this.players = this.players.filter((p) => p.id === 0);
	}

	close() {
		if (this.hubActive) return;
		this._closing = true;
		if (this.connected) this._send({ kind: "bye" });
		clearTimeout(this._startTimer);
		clearTimeout(this._finishTimer);
		this._pendingFinish = null;
		clearInterval(this._joinTimer);
		this._channel?.close();
		this._channel = null;
		this._connection?.close();
		this._connection = null;
		this._peer?.destroy();
		this._peer = null;
		this.connected = this.started = false;
		this.isHost = true;
		this.server = false;
		this.localId = this.id = this.hostId = 0;
		this.role = "solo";
		this.players = [{ id: 0, name: "Cannon One", color: "#70ece0" }];
		this._closing = false;
	}

	openPanel() {
		if (this.hubActive) return;
		if (this._panel) {
			this._panel.querySelector("button")?.focus();
			return;
		}
		const overlay = document.createElement("div");
		overlay.id = "dpo-online-panel";
		overlay.setAttribute("role", "dialog");
		overlay.setAttribute("aria-modal", "true");
		overlay.setAttribute("aria-labelledby", "dpo-online-title");
		overlay.innerHTML = `<style>
      #dpo-online-panel{position:fixed;inset:0;z-index:10000;background:#091326f2;color:#f3ead9;display:grid;place-items:center;font-family:inherit;padding:4vw;box-sizing:border-box}
      #dpo-online-panel .online-card{width:min(820px,90vw);padding:clamp(22px,3vw,50px);background:#15263a;border:2px solid #617b8d;box-shadow:12px 12px 0 #030913;box-sizing:border-box}
      #dpo-online-panel h2{font-size:clamp(30px,4vw,58px);margin:0 0 12px;text-transform:uppercase;letter-spacing:-.04em}
      #dpo-online-panel p{font-size:clamp(18px,1.8vw,26px);line-height:1.5;margin:12px 0 22px}
      #dpo-online-panel .online-row{display:flex;gap:14px;margin:16px 0;flex-wrap:wrap}
      #dpo-online-panel button,#dpo-online-panel input{font:inherit;font-size:clamp(18px,1.7vw,25px);padding:15px 22px;border:2px solid #75989f;border-radius:0;color:#f3ead9;background:#203c50;box-sizing:border-box;min-height:60px}
      #dpo-online-panel button{cursor:pointer;font-weight:800;text-transform:uppercase}
      #dpo-online-panel button:focus,#dpo-online-panel button:hover,#dpo-online-panel input:focus{outline:3px solid #f9b861;outline-offset:3px;background:#34566a}
      #dpo-online-panel input{width:230px;flex:1;text-transform:uppercase;letter-spacing:.16em;min-width:180px}
      #dpo-online-panel .room-code{font-size:clamp(32px,4vw,58px);font-weight:900;color:#74eadb;letter-spacing:.15em;min-height:1.2em;margin:16px 0}
      #dpo-online-panel .online-status{min-height:3em;color:#b7d0d8}
      #dpo-online-panel .online-small{font-size:clamp(14px,1.2vw,19px);color:#a2b9c2}
    </style><section class="online-card"><h2 id="dpo-online-title">Two cannons. One sky.</h2>
      <p>Create a room and share its code, or join your wingmate. Both players defend the same outpost.</p>
      <div class="online-row"><button type="button" data-online="host">Create room</button><button type="button" data-online="back">Back</button></div>
      <div class="room-code" aria-live="polite"></div>
      <div class="online-row"><input aria-label="Room code" placeholder="Room code" maxlength="12" autocomplete="off" spellcheck="false"><button type="button" data-online="join">Join room</button></div>
      <p class="online-status" role="status">Internet co-op uses a direct WebRTC connection.</p>
      <p class="online-small">The host runs the patrol. Play starts when Cannon Two joins.</p>
    </section>`;
		this._panel = overlay;
		this._panelStatus = overlay.querySelector(".online-status");
		this._previousFocus = document.activeElement;
		const codeElement = overlay.querySelector(".room-code");
		const input = overlay.querySelector("input");
		const hostButton = overlay.querySelector('[data-online="host"]');
		const joinButton = overlay.querySelector('[data-online="join"]');
		hostButton.onclick = async () => {
			hostButton.disabled = true;
			try {
				codeElement.textContent = await this.hostRoom();
			} catch (error) {
				this._status(error.message);
			} finally {
				hostButton.disabled = false;
			}
		};
		const join = async () => {
			joinButton.disabled = true;
			try {
				await this.joinRoom(input.value);
			} catch (error) {
				this._status(error.message);
			} finally {
				joinButton.disabled = false;
			}
		};
		joinButton.onclick = join;
		input.onkeydown = (event) => {
			if (event.key === "Enter") {
				event.stopPropagation();
				join();
			}
		};
		overlay.querySelector('[data-online="back"]').onclick = () => {
			this.close();
			this.hidePanel();
		};
		overlay.addEventListener("keydown", (event) => {
			event.stopPropagation();
			if (event.key === "Escape") {
				this.close();
				this.hidePanel();
			}
			if (event.key === "Tab") {
				const items = [
					...overlay.querySelectorAll("button:not(:disabled),input"),
				];
				const at = items.indexOf(document.activeElement);
				event.preventDefault();
				items[
					(at + (event.shiftKey ? -1 : 1) + items.length) % items.length
				].focus();
			}
		});
		overlay
			.querySelectorAll("button")
			.forEach((button) =>
				button.addEventListener("pointerenter", () => button.focus()),
			);
		document.body.appendChild(overlay);
		hostButton.focus();
	}

	hidePanel() {
		this._panel?.remove();
		this._panel = this._panelStatus = null;
		if (!this.started) this._previousFocus?.focus?.();
		this._emit("onPanelClose", this.started);
	}
}

globalThis.HubLink = HubLink;
