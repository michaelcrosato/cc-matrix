/* Bomb Union cooperative transports. Official Hub owns embedded networking;
   standalone rooms use a real PeerJS/WebRTC reliable data connection. */
((root) => {
	root.BU = root.BU || {};
	const BU = root.BU;
	const PROTOCOL = 1,
		CONTENT = 1;
	const COLORS = ["#ff9f76", "#66d5dd", "#c0df7a", "#c2a7ec"];
	const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	const stamp = () =>
		typeof performance !== "undefined"
			? performance.now() / 1000
			: Date.now() / 1000;
	const randomId = (n = 18) => {
		const bytes = new Uint8Array(n);
		if (root.crypto?.getRandomValues) root.crypto.getRandomValues(bytes);
		else for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
		return Array.from(bytes, (x) => ALPHABET[x % ALPHABET.length]).join("");
	};
	const clone = (x) => JSON.parse(JSON.stringify(x));
	const noop = () => {};
	class Network {
		constructor(options = {}) {
			this.callbacks = options;
			this.mode = "solo";
			this.online = false;
			this.authority = false;
			this.seat = 0;
			this.state = null;
			this.status = "Offline";
			this.code = "";
			this.roster = [];
			this.running = false;
			this.ended = false;
			this.peer = null;
			this.connection = null;
			this.connections = new Map();
			this.tokens = new Map();
			this.unsubscribers = [];
			this.timers = new Set();
			this.sequence = 0;
			this.snapshotSequence = 0;
			this.dispatchId = null;
			this.parts = new Map();
			this.pendingPatches = new Set();
			this.nextPatch = 0;
			this.lastWall = stamp();
			this.nextSnapshot = 0;
			this.nextPing = 0;
			this.hubStarted = false;
			this.hubPlayStarted = false;
			this.hubReady = false;
			this.hubFinished = false;
			this.hub = null;
			this.hubLast = 0;
			this.connected = false;
			this.disposed = false;
			this.options = options;
			this._generation = 0;
			this._joinSettler = null;
			this._visibility = () => {
				if (this.online && !this.ended) this.tick(0);
			};
			if (root.document)
				root.document.addEventListener("visibilitychange", this._visibility);
		}
		get canPlay() {
			return (
				this.online &&
				this.running &&
				!this.ended &&
				this.connected &&
				this.seat !== null &&
				this.state &&
				this.state.status === "active"
			);
		}
		_emit(name, value) {
			(this.callbacks[name] || noop)(value);
		}
		_status(text) {
			this.status = text;
			this._emit("onStatus", text);
		}
		_roster() {
			this._emit("onRoster", clone(this.roster));
		}
		_timer(fn, ms) {
			const id = setTimeout(() => {
				this.timers.delete(id);
				fn();
			}, ms);
			this.timers.add(id);
			return id;
		}
		_clearTimer(id) {
			if (id) {
				clearTimeout(id);
				this.timers.delete(id);
			}
		}
		_packet(data) {
			return { bu: PROTOCOL, content: CONTENT, ...data };
		}
		_valid(data) {
			return (
				!!data &&
				data.bu === PROTOCOL &&
				data.content === CONTENT &&
				typeof data.t === "string"
			);
		}
		_send(data, target) {
			if (this.ended) return false;
			const packet = this._packet(data);
			if (this.mode === "hub")
				return this.hub.send(
					packet,
					target === undefined
						? { reliable: true }
						: { to: target, reliable: true },
				);
			if (this.authority) {
				if (target !== undefined) {
					const conn = this.connections.get(target);
					if (conn?.open) {
						conn.send(packet);
						return true;
					}
					return false;
				}
				for (const conn of this.connections.values())
					if (conn.open) conn.send(packet);
				return true;
			}
			if (this.connection?.open) {
				this.connection.send(packet);
				return true;
			}
			return false;
		}
		async detectHub() {
			const hub = root.AIHub;
			if (!hub?.active) return false;
			this.hub = hub;
			this.mode = "hub";
			this.online = true;
			this.seat = null;
			this._status("Hub dispatch · awaiting the shared round");
			const info = await hub.connect({ mode: "shared-world", seats: [1, 4] });
			if (!info) {
				this.mode = "solo";
				this.online = false;
				this.seat = 0;
				return false;
			}
			this.authority = !!info.isHost;
			this.seat = info.server ? null : info.me;
			this.roster = info.players.map((p) => ({
				id: p.id,
				name: String(p.name),
				color: p.color,
				connected: true,
			}));
			this.connected = true;
			this._roster();
			this.unsubscribers.push(
				hub.on("start", () => {
					this.hubStarted = true;
					this.hubLast = 0;
					this.lastWall = stamp();
					this._status("Shared dispatch · starting");
				}),
			);
			this.unsubscribers.push(
				hub.on("message", (data, from) => this._receive(data, from)),
			);
			this.unsubscribers.push(
				hub.on("leave", ({ id }) => this._depart(id, true)),
			);
			this.unsubscribers.push(
				hub.on("time-up", ({ graceMs = 5000 }) => {
					if (this.authority && !this.ended) {
						if (this.state && this.state.status === "active")
							BU.Sim.advance(this.state, this.state.remaining + 0.01);
						this._publish();
						this.running = false;
						this._scheduleFinishHub(Math.min(700, graceMs / 2));
					}
				}),
			);
			this.unsubscribers.push(
				hub.on("end", ({ reason }) => {
					this.ended = true;
					this.running = false;
					this.connected = false;
					this._status(
						reason === "host-left"
							? "Host left · this dispatch has ended"
							: "Hub dispatch ended",
					);
					this._emit("onEnd", reason);
				}),
			);
			if (!this.hubReady) {
				this.hubReady = true;
				hub.ready();
			}
			return true;
		}
		_startHub() {
			if (
				this.hubPlayStarted ||
				this.running ||
				this.ended ||
				!this.hubStarted ||
				this.hub.time() < 0
			)
				return;
			this.hubPlayStarted = true;
			this.running = true;
			this.lastWall = stamp();
			this.hubLast = Math.max(0, this.hub.time() / 1000);
			if (this.authority) {
				const rng = this.hub.rng("bomb-union-case");
				this.state = BU.Sim.create(
					"relay",
					Math.floor(rng() * 4294967296),
					this.roster.filter((p) => p.connected).map((p) => p.id),
				);
				// A short authored dispatch uses the same relay rules, with a public,
				// locked four-minute clock that fits the Hub card's advertised duration.
				this.state.duration = this.state.remaining = Math.min(
					240,
					(this.hub.limitMs || 240000) / 1000,
				);
				this.state.hubDispatch = true;
				this.dispatchId = `hub:${this.hub.round}`;
				this._publish();
				this._emit("onStart", this.state);
			}
			this._status(
				this.seat === null
					? "Authority running · no local player"
					: "Shared dispatch · fuse continues in menus",
			);
			this.nextPing = 0;
		}
		_scheduleFinishHub(delay = 700) {
			if (this.hubFinishPending || this.hubFinished || this.ended) return;
			this.hubFinishPending = true;
			// Let the final authoritative snapshot arrive before Hub overlays/removes
			// the game. This remains well inside the official time-up grace period.
			this._timer(() => this._finishHub(), delay);
		}
		_finishHub() {
			if (
				this.mode !== "hub" ||
				!this.authority ||
				this.hubFinished ||
				this.ended
			)
				return;
			this.hubFinished = true;
			const ids = this.roster.filter((p) => p.connected).map((p) => p.id);
			const score = this.state?.result ? this.state.result.score || 0 : 0;
			const scores = {};
			for (const id of ids) scores[id] = score;
			this.hub.finish({
				standings: [ids],
				scores,
				won: !!this.state && this.state.status === "won",
			});
		}
		_publish(target) {
			if (!this.state || this.ended) return;
			const text = JSON.stringify({
				state: this.state,
				roster: this.roster,
				dispatch: this.dispatchId,
			});
			const id = ++this.snapshotSequence;
			// A maximum of 2600 UTF-16 units guarantees that even worst-case UTF-8
			// and JSON escaping stay below the official 16 KB packet limit.
			const size = 2600,
				total = Math.ceil(text.length / size);
			for (let index = 0; index < total; index++) {
				this._send(
					{
						t: "state",
						id,
						index,
						total,
						text: text.slice(index * size, (index + 1) * size),
					},
					target,
				);
			}
			this._emit("onState", this.state);
		}
		_patch(boardId) {
			this.pendingPatches.add(boardId || "*");
		}
		_flushPatch() {
			if (!this.state || this.ended || !this.pendingPatches.size) return;
			const boardId = this.pendingPatches.values().next().value;
			this.pendingPatches.delete(boardId);
			const fields = [
				"caseId",
				"seed",
				"seats",
				"revision",
				"remaining",
				"elapsed",
				"status",
				"cause",
				"result",
				"evidence",
				"metrics",
				"proposal",
				"events",
				"modified",
				"assisted",
				"tuning",
			];
			const head = {};
			for (const key of fields)
				if (this.state[key] !== undefined) head[key] = this.state[key];
			const board = boardId
				? this.state.boards.find((b) => b.id === boardId)
				: null;
			const payload = { t: "patch", head, board };
			// A patch is one reliable semantic update. Large custom/editor states
			// fall back to a bounded full snapshot instead of violating Hub limits.
			if (new TextEncoder().encode(JSON.stringify(payload)).length < 15500)
				this._send(payload);
			else this.nextSnapshot = 0;
		}
		_receive(data, from) {
			if (this.ended || !this._valid(data)) return;
			if (
				this.mode === "hub" &&
				!this.roster.some((p) => p.id === from && p.connected) &&
				from !== this.hub.host
			)
				return;
			if (data.t === "patch") {
				if (
					this.authority ||
					!this.state ||
					(this.mode === "hub" && from !== this.hub.host)
				)
					return;
				if (
					!data.head ||
					data.head.caseId !== this.state.caseId ||
					data.head.seed !== this.state.seed ||
					data.head.revision < this.state.revision
				)
					return;
				Object.assign(this.state, data.head);
				if (data.board) {
					const index = this.state.boards.findIndex(
						(b) => b.id === data.board.id,
					);
					if (index >= 0) this.state.boards[index] = data.board;
				}
				this._emit("onState", this.state);
				return;
			}
			if (data.t === "state") {
				if (this.authority) return;
				if (this.mode === "hub" && from !== this.hub.host) return;
				if (
					!Number.isInteger(data.id) ||
					!Number.isInteger(data.total) ||
					data.total < 1 ||
					data.total > 80 ||
					data.index < 0 ||
					data.index >= data.total ||
					typeof data.text !== "string"
				)
					return;
				let part = this.parts.get(data.id);
				if (!part) {
					part = { values: new Array(data.total), count: 0 };
					this.parts.set(data.id, part);
				}
				if (part.values[data.index] === undefined) {
					part.values[data.index] = data.text;
					part.count++;
				}
				if (part.count !== data.total) return;
				if (data.id <= (this.lastSnapshotId || 0)) {
					this.parts.delete(data.id);
					return;
				}
				try {
					const parsed = JSON.parse(part.values.join(""));
					const first =
						this.dispatchId !== parsed.dispatch ||
						!this.state ||
						this.state.caseId !== parsed.state.caseId ||
						this.state.seed !== parsed.state.seed;
					this.state = BU.Sim.restore
						? BU.Sim.restore(parsed.state)
						: parsed.state;
					this.roster = parsed.roster;
					this.dispatchId = parsed.dispatch;
					this.lastSnapshotId = data.id;
					this.parts.clear();
					this.connected = true;
					this.running = this.state.status === "active";
					this._roster();
					this._emit("onState", this.state);
					if (first) this._emit("onStart", this.state);
				} catch {
					this._status("State sync failed · reconnect to request a fresh copy");
				}
				return;
			}
			if (data.t === "intent" && this.authority && this.running) {
				if (!this.roster.some((p) => p.id === from && p.connected)) return;
				if (data.cmd && (data.cmd.type === "tune" || data.cmd.type === "dev"))
					return;
				const result = BU.Sim.command(this.state, from, data.cmd || {});
				if (!result.ok)
					this._send(
						{
							t: "reject",
							id: data.cmd?.id,
							reason: String(result.reason || "Action rejected"),
						},
						from,
					);
				if (result.ok) this._patch(data.cmd.board);
				this.dirty = true;
				return;
			}
			if (data.t === "ping" && this.authority) {
				this.dirty = true;
				return;
			}
			if (data.t === "sync" && this.authority) {
				this.dirty = true;
				return;
			}
			if (data.t === "reject" && !this.authority) {
				this._status(data.reason);
				this.requestSync();
				return;
			}
			if (data.t === "roster") {
				this.roster = data.roster;
				this._roster();
				return;
			}
			if (data.t === "ended") {
				this.ended = true;
				this.running = false;
				this.connected = false;
				this._status(data.reason || "Room closed");
				this._emit("onEnd", data.reason || "host-left");
			}
		}
		command(cmd) {
			if (!this.canPlay)
				return { ok: false, reason: "Wait for a connected, seated dispatch" };
			if (
				(cmd.type === "tune" || cmd.type === "dev") &&
				(this.mode === "hub" || !this.authority)
			)
				return {
					ok: false,
					reason: "Gameplay changes are disabled in this session",
				};
			const board =
				cmd.board && this.state.boards.find((b) => b.id === cmd.board);
			const packet = {
				...cmd,
				id: `${this.seat}:${++this.sequence}`,
				caseId: this.state.caseId,
				expectedRevision:
					cmd.expectedRevision === undefined
						? board
							? board.revision
							: this.state.revision
						: cmd.expectedRevision,
			};
			if (this.authority) {
				const result = BU.Sim.command(this.state, this.seat, packet);
				if (result.ok) this._patch(packet.board);
				this.dirty = true;
				this._emit("onState", this.state);
				return result;
			}
			this._send(
				{ t: "intent", cmd: packet },
				this.mode === "hub" ? this.hub.host : undefined,
			);
			return { ok: true, queued: true };
		}
		requestSync() {
			if (this.online && !this.authority && !this.ended)
				this._send(
					{ t: "sync" },
					this.mode === "hub" ? this.hub.host : undefined,
				);
		}
		tick() {
			if (!this.online || this.ended) return;
			if (this.mode === "hub") this._startHub();
			const now = stamp();
			if (!this.running) {
				this.lastWall = now;
				return;
			}
			let elapsed = Math.max(0, now - this.lastWall);
			this.lastWall = now;
			if (this.mode === "hub") {
				const timeline = Math.max(0, this.hub.time() / 1000);
				elapsed = Math.max(0, timeline - this.hubLast);
				this.hubLast = timeline;
			}
			if (this.authority && this.state) {
				BU.Sim.advance(this.state, elapsed);
				if (now >= this.nextPatch) {
					this.nextPatch = now + 0.125;
					this._flushPatch();
				}
				// Reliable chunked snapshots at most once/second. Operations themselves
				// remain reliable. Large three-digit states stay within Hub's 20/s cap.
				if (now >= this.nextSnapshot || this.state.status !== "active") {
					this.nextSnapshot = now + 1;
					this.pendingPatches.clear();
					this.dirty = false;
					this._publish();
				}
				if (this.state.status !== "active") {
					this.running = false;
					if (this.mode === "hub") this._scheduleFinishHub();
				}
			} else if (now >= this.nextPing) {
				this.nextPing = now + 1;
				this._send(
					{ t: "ping", revision: this.state ? this.state.revision : -1 },
					this.mode === "hub" ? this.hub.host : undefined,
				);
			}
		}
		_peerOptions() {
			return {
				secure: true,
				debug: 0,
				config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
				...(this.options.peerOptions || {}),
			};
		}
		async _makePeer(id) {
			if (root.AIHub?.active)
				throw new Error("Standalone rooms are unavailable inside Hub");
			if (!root.Peer && BU.loadPeer) await BU.loadPeer();
			if (!root.Peer)
				throw new Error(
					"PeerJS could not load. Retry with internet access, or play solo.",
				);
			const peer = id
				? new root.Peer(id, this._peerOptions())
				: new root.Peer(this._peerOptions());
			this.peer = peer;
			return new Promise((resolve, reject) => {
				const timeout = this._timer(
					() =>
						reject(
							new Error(
								"Signaling timed out. Check internet access and retry, or play solo.",
							),
						),
					16000,
				);
				let opened = false;
				peer.on("open", () => {
					opened = true;
					this._clearTimer(timeout);
					resolve(peer);
				});
				peer.on("error", (error) => {
					const messages = {
						"peer-unavailable":
							"Room unavailable. Check its six-character code and ask the host to retry.",
						"unavailable-id":
							"Room code was already taken. Create another room.",
						network: "Signaling disconnected. Check internet access and retry.",
						"server-error":
							"Signaling service is unavailable. Retry shortly, or play solo.",
						webrtc:
							"Direct connection failed. Retry on another network; some networks require TURN.",
					};
					const text =
						messages[error.type] ||
						`Connection failed (${error.type || "unknown"}). Retry or return to solo.`;
					this._status(text);
					if (!opened) {
						this._clearTimer(timeout);
						reject(new Error(text));
					}
					if (this._joinSettler) this._joinSettler.reject(new Error(text));
				});
				peer.on("disconnected", () => {
					if (!this.ended && !peer.destroyed)
						this._status(
							"Signaling interrupted · existing direct connections may continue",
						);
				});
			});
		}
		async host() {
			if (this.mode === "hub") throw new Error("Hub controls this dispatch");
			this.leave();
			this.disposed = false;
			this.mode = "host";
			this.online = true;
			this.authority = true;
			this.seat = 0;
			this.ended = false;
			this.code = randomId(6);
			this.token = randomId();
			this.connected = false;
			this.roster = [
				{ id: 0, name: "Dispatcher 1", color: COLORS[0], connected: true },
			];
			this._status("Opening secure signaling · please wait");
			try {
				const peer = await this._makePeer(
					`bombunion-v1-${this.code.toLowerCase()}`,
				);
				peer.on("connection", (conn) => this._acceptConnection(conn));
				this.connected = true;
				this._roster();
				this._status(`Room ${this.code} · waiting for crew`);
				return this.code;
			} catch (error) {
				this._status(error.message);
				throw error;
			}
		}
		_acceptConnection(conn) {
			const timeout = this._timer(() => {
				if (!conn._buSeat) conn.close();
			}, 10000);
			conn.on("data", (data) => {
				if (!conn._buAccepted) {
					if (data?.t !== "hello") return;
					if (data.bu !== PROTOCOL || data.content !== CONTENT) {
						conn.send(
							this._packet({
								t: "refuse",
								reason:
									"Version mismatch. Both players must open the same game build.",
							}),
						);
						this._timer(() => conn.close(), 150);
						return;
					}
					const old = this.tokens.get(data.token);
					let seat;
					if (old && old.until > stamp()) {
						seat = old.seat;
						const previous = this.connections.get(seat);
						if (previous && previous !== conn) {
							previous._buStale = true;
							previous.close();
						}
					} else {
						const reserved = new Set(
							[...this.tokens.values()]
								.filter((t) => t.until > stamp())
								.map((t) => t.seat),
						);
						seat = [1, 2, 3].find(
							(id) =>
								!this.roster.some((p) => p.id === id && p.connected) &&
								!reserved.has(id),
						);
					}
					if (seat === undefined) {
						conn.send(
							this._packet({
								t: "refuse",
								reason:
									"Room full. Four dispatchers are already seated or reconnecting.",
							}),
						);
						this._timer(() => conn.close(), 150);
						return;
					}
					this._clearTimer(timeout);
					conn._buAccepted = true;
					conn._buSeat = seat;
					conn._buToken =
						typeof data.token === "string" ? data.token : randomId();
					this.connections.set(seat, conn);
					this.tokens.set(conn._buToken, { seat, until: Infinity });
					const rosterSeat = this.roster.find((p) => p.id === seat);
					if (rosterSeat) rosterSeat.connected = true;
					else
						this.roster.push({
							id: seat,
							name: `Dispatcher ${seat + 1}`,
							color: COLORS[seat],
							connected: true,
						});
					if (this.state && this.state.status === "active" && BU.Sim.join)
						BU.Sim.join(this.state, seat);
					conn.send(
						this._packet({
							t: "welcome",
							seat,
							token: conn._buToken,
							code: this.code,
							roster: this.roster,
							running: this.running,
						}),
					);
					this._send({ t: "roster", roster: this.roster });
					this._roster();
					if (this.state) this._publish(seat);
					this._status(
						`Room ${this.code} · ${this.roster.filter((p) => p.connected).length}/4 dispatchers connected`,
					);
					return;
				}
				if (conn._buStale || this.connections.get(conn._buSeat) !== conn)
					return;
				if (data && data.t === "bye") {
					this._depart(conn._buSeat, false);
					conn.close();
					return;
				}
				this._receive(data, conn._buSeat);
			});
			conn.on("close", () => {
				this._clearTimer(timeout);
				if (
					conn._buAccepted &&
					!conn._buStale &&
					this.connections.get(conn._buSeat) === conn
				)
					this._depart(conn._buSeat, false);
			});
			conn.on("error", () => {
				if (conn._buAccepted) this._depart(conn._buSeat, false);
			});
		}
		async join(code) {
			if (this.mode === "hub") throw new Error("Hub controls this dispatch");
			const clean = String(code)
				.toUpperCase()
				.replace(/[^A-Z2-9]/g, "");
			if (!/^[A-HJ-NP-Z2-9]{6}$/.test(clean))
				throw new Error("Enter the host’s six-character room code.");
			const savedToken = this.code === clean ? this.token : null;
			this.leave();
			this.disposed = false;
			this.mode = "guest";
			this.online = true;
			this.authority = false;
			this.seat = null;
			this.code = clean;
			this.token = savedToken || randomId();
			this.ended = false;
			this.lastSnapshotId = 0;
			this.parts.clear();
			this.state = null;
			this._status(`Calling room ${clean} · please wait`);
			try {
				const peer = await this._makePeer();
				return await this._joinData(peer);
			} catch (error) {
				this._status(error.message);
				throw error;
			}
		}
		_joinData(peer) {
			return new Promise((resolve, reject) => {
				const conn = peer.connect(`bombunion-v1-${this.code.toLowerCase()}`, {
					reliable: true,
					serialization: "json",
					metadata: { game: "bomb-union", protocol: PROTOCOL },
				});
				this.connection = conn;
				const timeout = this._timer(() => {
					this._joinSettler = null;
					reject(
						new Error(
							"The room did not answer. Check the code, retry, or use another network.",
						),
					);
				}, 18000);
				this._joinSettler = { resolve, reject };
				conn.on("open", () => {
					conn.send(this._packet({ t: "hello", token: this.token }));
				});
				conn.on("data", (data) => {
					if (!this._valid(data)) return;
					if (data.t === "refuse") {
						this._clearTimer(timeout);
						this._joinSettler = null;
						reject(new Error(data.reason));
						conn.close();
						return;
					}
					if (data.t === "welcome") {
						this._clearTimer(timeout);
						this._joinSettler = null;
						this.seat = data.seat;
						this.token = data.token;
						this.roster = data.roster;
						this.connected = true;
						this.ended = false;
						this.running = false;
						this._roster();
						this._status(
							data.running
								? "Connected · synchronizing the live dispatch"
								: "Connected · waiting for host to dispatch",
						);
						resolve(this.seat);
						return;
					}
					this._receive(data, 0);
				});
				conn.on("close", () => {
					if (this.connection !== conn || this.ended || this.disposed) return;
					this.connected = false;
					this.running = false;
					this._status(
						"Connection lost · reconnect within 20 seconds to reclaim your seat",
					);
					this._emit("onEnd", "disconnected");
				});
				conn.on("error", () => {
					this._clearTimer(timeout);
					this._joinSettler = null;
					reject(
						new Error(
							"Direct connection failed. Retry on another network; some networks require TURN.",
						),
					);
				});
			});
		}
		reconnect() {
			if (!this.code || this.authority)
				return Promise.reject(new Error("No guest room to reconnect"));
			return this.join(this.code);
		}
		_depart(seat, final) {
			const person = this.roster.find((p) => p.id === seat);
			if (!person?.connected) return;
			person.connected = false;
			if (this.authority && this.state && this.state.status === "active")
				BU.Sim.command(this.state, seat, {
					type: "leave",
					id: `leave:${seat}:${++this.sequence}`,
				});
			const conn = this.connections.get(seat);
			if (conn) {
				this.connections.delete(seat);
				if (conn._buToken)
					this.tokens.set(conn._buToken, {
						seat,
						until: final ? 0 : stamp() + 20,
					});
			}
			this._roster();
			if (this.authority) {
				this._send({ t: "roster", roster: this.roster });
				this.dirty = true;
			}
		}
		start(caseId = "waterfront", seed = Date.now() >>> 0) {
			if (!this.authority || this.mode !== "host")
				return { ok: false, reason: "Only the room host can dispatch a case" };
			this.dispatchId = randomId(10);
			this.state = BU.Sim.create(
				caseId,
				seed,
				this.roster.filter((p) => p.connected).map((p) => p.id),
			);
			this.running = true;
			this.ended = false;
			this.lastWall = stamp();
			this.nextSnapshot = 0;
			this._status("Crew dispatched · fuse continues in menus");
			this._publish();
			this._emit("onStart", this.state);
			return { ok: true };
		}
		tune(values) {
			return this.command({ type: "tune", values });
		}
		leave() {
			if (this.mode === "hub" && this.hub && !this.ended) return false;
			this.disposed = true;
			if (this.online && !this.ended) {
				if (this.authority)
					this._send({
						t: "ended",
						reason: "Host closed the room · return to dispatch",
					});
				else if (this.connection?.open) this._send({ t: "bye" });
			}
			this.ended = true;
			this.running = false;
			this.connected = false;
			for (const id of this.timers) clearTimeout(id);
			this.timers.clear();
			if (this.connection) {
				this.connection.close();
				this.connection = null;
			}
			for (const conn of this.connections.values()) {
				conn._buStale = true;
				conn.close();
			}
			this.connections.clear();
			if (this.peer && !this.peer.destroyed) this.peer.destroy();
			this.peer = null;
			for (const unsubscribe of this.unsubscribers) unsubscribe();
			this.unsubscribers.length = 0;
			this.mode = "solo";
			this.online = false;
			this.authority = false;
			this.seat = 0;
			this.state = null;
			this.roster = [];
			this.parts.clear();
			this.pendingPatches.clear();
			this.tokens.clear();
			this._generation++;
			return true;
		}
		dispose() {
			if (this.mode === "hub") {
				this.ended = true;
				this.running = false;
			}
			this.leave();
			if (root.document)
				root.document.removeEventListener("visibilitychange", this._visibility);
		}
	}
	BU.Network = Network;
	BU.NETWORK_VERSION = {
		protocol: PROTOCOL,
		content: CONTENT,
		peerjs: "1.5.5",
		hub: "1.4.0",
	};
})(globalThis);
