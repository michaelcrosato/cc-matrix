/* Advanced Dungeons & Near Misses: game-owned transport adapters.
 * Hub session.js remains unmodified; this module owns only game packets. */
(() => {
	globalThis.NM = globalThis.NM || {};
	const NM = globalThis.NM;
	const VERSION = 1;
	const CONTENT = "near-misses-1";
	const TAG = "near-misses";
	const MAX_PACKET = 15000;
	const MAX_STATE = 600000;
	const PART_SIZE = 11000;
	const ACTIONS = ["fireId", "interactId", "dodgeId", "quiverId", "travelId"];
	const finite = (x, lo, hi) =>
		typeof x === "number" && Number.isFinite(x) && x >= lo && x <= hi;
	const integer = (x, lo = 0, hi = 2147483647) =>
		Number.isSafeInteger(x) && x >= lo && x <= hi;
	const bytes = (value) =>
		new TextEncoder().encode(
			typeof value === "string" ? value : JSON.stringify(value),
		).length;
	const nonce = () => {
		const a = new Uint32Array(4);
		if (globalThis.crypto?.getRandomValues)
			globalThis.crypto.getRandomValues(a);
		else
			for (let i = 0; i < a.length; i++)
				a[i] = Math.floor(Math.random() * 0xffffffff);
		return Array.from(a, (n) => n.toString(16).padStart(8, "0")).join("");
	};
	const to64 = (data) => {
		let s = "";
		for (let i = 0; i < data.length; i += 8192)
			s += String.fromCharCode(...data.subarray(i, i + 8192));
		return btoa(s);
	};
	const from64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
	async function packState(state) {
		const text = JSON.stringify(state);
		if (bytes(text) > MAX_STATE)
			throw new Error("Expedition state exceeds the transport bound.");
		if (globalThis.CompressionStream) {
			const stream = new Blob([text])
				.stream()
				.pipeThrough(new CompressionStream("deflate"));
			const result = new Uint8Array(await new Response(stream).arrayBuffer());
			return { codec: "deflate", data: to64(result) };
		}
		return { codec: "json", data: text };
	}
	async function unpackState(packet) {
		if (
			!packet ||
			typeof packet.data !== "string" ||
			packet.data.length > MAX_STATE
		)
			throw new Error("Invalid state payload.");
		let text;
		if (packet.codec === "deflate" && globalThis.DecompressionStream) {
			const stream = new Blob([from64(packet.data)])
				.stream()
				.pipeThrough(new DecompressionStream("deflate"));
			const reader = stream.getReader();
			const chunks = [];
			let size = 0;
			for (;;) {
				const { value, done } = await reader.read();
				if (done) break;
				size += value.length;
				if (size > MAX_STATE) {
					await reader.cancel();
					throw new Error("State expands beyond the transport bound.");
				}
				chunks.push(value);
			}
			const out = new Uint8Array(size);
			let at = 0;
			for (const part of chunks) {
				out.set(part, at);
				at += part.length;
			}
			text = new TextDecoder().decode(out);
		} else if (packet.codec === "json") text = packet.data;
		else throw new Error("This browser cannot decode the expedition state.");
		const state = JSON.parse(text);
		if (
			!state ||
			typeof state !== "object" ||
			!Array.isArray(state.players) ||
			!Array.isArray(state.enemies) ||
			!state.party ||
			!integer(state.tick)
		)
			throw new Error("Invalid expedition state.");
		if (
			state.players.length > 2 ||
			state.enemies.length > 200 ||
			(state.arrows || []).length > 100
		)
			throw new Error("Invalid expedition entity count.");
		return state;
	}
	function commandOf(raw) {
		if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
		for (const key of ["mx", "my", "ax", "ay"])
			if (!finite(raw[key] ?? 0, -1.001, 1.001)) return null;
		for (const key of ACTIONS.slice(0, -1))
			if (!integer(raw[key] ?? 0)) return null;
		if (
			raw.travel != null &&
			(typeof raw.travel !== "string" || raw.travel.length > 64)
		)
			return null;
		return {
			mx: Math.max(-1, Math.min(1, raw.mx || 0)),
			my: Math.max(-1, Math.min(1, raw.my || 0)),
			ax: Math.max(-1, Math.min(1, raw.ax || 0)),
			ay: Math.max(-1, Math.min(1, raw.ay || 0)),
			focus: raw.focus === true,
			sprint: raw.sprint === true,
			interactHeld: raw.interactHeld === true,
			fireId: raw.fireId || 0,
			interactId: raw.interactId || 0,
			dodgeId: raw.dodgeId || 0,
			quiverId: raw.quiverId || 0,
			...(raw.travel ? { travel: raw.travel } : {}),
		};
	}
	const empty = () => ({
		mx: 0,
		my: 0,
		ax: 1,
		ay: 0,
		fireId: 0,
		interactId: 0,
		dodgeId: 0,
		quiverId: 0,
		focus: false,
		sprint: false,
		interactHeld: false,
	});
	function encodeSignal(value) {
		return `NM1.${to64(new TextEncoder().encode(JSON.stringify(value)))}`;
	}
	function decodeSignal(text, role) {
		if (
			typeof text !== "string" ||
			text.length > 100000 ||
			!text.trim().startsWith("NM1.")
		)
			throw new Error("Paste the complete Near Misses invitation or reply.");
		let s;
		try {
			s = JSON.parse(new TextDecoder().decode(from64(text.trim().slice(4))));
		} catch {
			throw new Error("That pairing text is damaged. Copy it again.");
		}
		if (s.app !== TAG || s.v !== VERSION || s.content !== CONTENT)
			throw new Error(
				"These game versions do not match. Both players must load the same release.",
			);
		if (
			s.role !== role ||
			!/^[a-f0-9]{32}$/.test(s.nonce || "") ||
			!finite(s.expires, Date.now() - 1000, Date.now() + 3600000)
		)
			throw new Error(
				"That pairing text is expired or belongs to the wrong step.",
			);
		if (
			!s.description ||
			s.description.type !== (role === "host" ? "offer" : "answer") ||
			typeof s.description.sdp !== "string" ||
			s.description.sdp.length > 80000
		)
			throw new Error("The connection description is invalid.");
		return s;
	}
	class Network {
		constructor(callbacks = {}) {
			this.cb = callbacks;
			this.role = "offline";
			this.authority = true;
			this.localSeat = 1;
			this.isHub = false;
			this.running = false;
			this.connected = false;
			this.diagnostics = {
				sent: 0,
				received: 0,
				rejected: 0,
				bytesSent: 0,
				maxBytes: 0,
				maxPerSecond: 0,
				lastInputSeq: {},
				role: "offline",
				peer: "none",
				codec: "deflate when supported",
			};
			this._clock = 0;
			this._sentAt = [];
			this._queue = [];
			this._unsubs = [];
			this._latest = empty();
			this._pending = [];
			this._actionSeen = {};
			this._remote = {};
			this._seq = 0;
			this._snapshotSeq = 0;
			this._appliedSnapshot = -1;
			this._inputAt = -1;
			this._stateAt = -1;
			this._parts = new Map();
			this._epoch = Math.floor(Date.now() % 1000000000) + 1;
			this._travelId = 0;
			this._localIds = {};
			this._acked = {};
			this._ended = false;
			this._finished = false;
			this._started = false;
			this.sessionNonce = null;
		}
		_status(message) {
			this.statusText = message;
			this.cb.status?.(message);
		}
		_envelope(message) {
			return { nm: VERSION, c: CONTENT, e: this.sessionNonce, ...message };
		}
		_enqueue(message, to = null, group = "") {
			if (this._ended) return false;
			const packet = this._envelope(message);
			const size = bytes(packet);
			if (size > MAX_PACKET) {
				this.diagnostics.rejected++;
				return false;
			}
			if (this._queue.length > 80)
				this._queue = this._queue.filter((item) => item.group !== "snapshot");
			this._queue.push({ packet, to, group });
			return true;
		}
		_flush() {
			this._sentAt = this._sentAt.filter((at) => at > this._clock - 1);
			while (this._queue.length && this._sentAt.length < 18 && !this._ended) {
				const item = this._queue[0];
				let sent = false;
				if (this.isHub)
					sent = AIHub.send(item.packet, {
						...(item.to == null ? {} : { to: item.to }),
						reliable: true,
					});
				else if (
					this.channel?.readyState === "open" &&
					this.channel.bufferedAmount < 256000
				) {
					this.channel.send(JSON.stringify(item.packet));
					sent = true;
				}
				if (!sent) break;
				this._queue.shift();
				this._sentAt.push(this._clock);
				const size = bytes(item.packet);
				this.diagnostics.sent++;
				this.diagnostics.bytesSent += size;
				this.diagnostics.maxBytes = Math.max(this.diagnostics.maxBytes, size);
				this.diagnostics.maxPerSecond = Math.max(
					this.diagnostics.maxPerSecond,
					this._sentAt.length,
				);
			}
		}
		_prepare(role, seats, localSeat, hub = false) {
			if (this._started) return;
			this.role = role;
			this.authority = role === "host" || role === "server";
			this.localSeat = localSeat;
			this.connected = true;
			this._started = true;
			this.diagnostics.role = role;
			this.diagnostics.peer = "connected";
			this.cb.start?.({
				role,
				seats: [...seats],
				localSeat,
				hub,
				seed: hub ? AIHub.seed : undefined,
			});
		}
		async connectHub() {
			if (!globalThis.AIHub) return false;
			const info = await AIHub.connect({ mode: "shared-world", seats: [1, 2] });
			if (!info) return false;
			this.isHub = true;
			this.info = info;
			this.sessionNonce = `hub-${info.round}-${info.seed}`;
			this._active = new Set(info.players.map((player) => player.id));
			this._idToSeat = new Map(
				info.players.map((player, index) => [player.id, index + 1]),
			);
			this._epoch = (info.seed % 1000000000) + 1 + (info.me + 1) * 31;
			this._unsubs.push(
				AIHub.on("message", (data, from) => this._receive(data, from)),
			);
			this._unsubs.push(
				AIHub.on("start", () => {
					this._hubStarted = true;
					this._status("The expedition begins together.");
				}),
			);
			this._unsubs.push(
				AIHub.on("leave", ({ id }) => {
					this._active.delete(id);
					const seat = this._idToSeat.get(id);
					if (seat != null && this.authority) this.cb.removePlayer?.(seat);
					delete this._remote[seat];
					this._status("A ranger has left. The expedition continues.");
				}),
			);
			this._unsubs.push(
				AIHub.on("time-up", () => {
					if (this.authority)
						this.finish(false, {
							...this.cb.getState?.()?.stats,
							outcome: "withdrawal",
						});
				}),
			);
			this._unsubs.push(
				AIHub.on("end", ({ reason }) =>
					this._end(
						reason === "finished"
							? "Expedition complete."
							: reason === "host-left"
								? "The expedition ended because its authority left."
								: "The Hub ended this expedition.",
					),
				),
			);
			this._prepare(
				info.server ? "server" : info.isHost ? "host" : "guest",
				[...this._idToSeat.values()],
				info.server ? null : this._idToSeat.get(info.me),
				true,
			);
			this._status("Ready. Waiting for the Hub’s expedition clock.");
			AIHub.ready();
			return true;
		}
		_peerConfig(lan) {
			return {
				iceServers: lan ? [] : [{ urls: "stun:stun.l.google.com:19302" }],
			};
		}
		_newPeer(lan) {
			if (globalThis.AIHub?.active || this.isHub)
				throw new Error("Direct pairing is unavailable in a Hub round.");
			if (!globalThis.RTCPeerConnection)
				throw new Error(
					"This browser does not support direct WebRTC pairing. Local co-op remains available.",
				);
			this.pc = new RTCPeerConnection(this._peerConfig(lan));
			this.pc.onconnectionstatechange = () => {
				const state = this.pc?.connectionState;
				this.diagnostics.peer = state || "closed";
				if (state === "failed")
					this._end(
						"Direct connection failed. Some networks require a TURN relay; try the same local network.",
					);
				if (state === "closed" && !this._ended)
					this._end("The direct connection ended.");
				if (state === "disconnected") {
					this._status("Connection interrupted. Waiting briefly for the peer…");
					this._disconnectAt = this._clock;
				} else this._disconnectAt = null;
			};
			return this.pc;
		}
		_attachChannel(channel) {
			if (channel.label !== "near-misses-v1") {
				channel.close();
				return;
			}
			this.channel = channel;
			channel.onopen = () => {
				this._status("Checking the expedition version…");
				this._enqueue({ t: "hello", role: this._pairRole, epoch: this._epoch });
				this._flush();
			};
			channel.onmessage = (event) => {
				if (typeof event.data !== "string" || bytes(event.data) > MAX_PACKET) {
					this.diagnostics.rejected++;
					return;
				}
				try {
					this._receive(
						JSON.parse(event.data),
						this._pairRole === "host" ? 2 : 1,
					);
				} catch {
					this.diagnostics.rejected++;
				}
			};
			channel.onclose = () => {
				if (!this._ended)
					this._end(
						"The other ranger disconnected. Shared inventory is kept by the host.",
					);
			};
			channel.onerror = () =>
				this._status("The direct channel reported a connection error.");
		}
		async _gather(pc) {
			if (pc.iceGatheringState === "complete") return;
			await new Promise((resolve, reject) => {
				const timer = setTimeout(() => {
					pc.removeEventListener("icegatheringstatechange", check);
					reject(
						new Error(
							"Candidate discovery timed out. Retry local-network pairing, or check your connection.",
						),
					);
				}, 18000);
				const check = () => {
					if (pc.iceGatheringState === "complete") {
						clearTimeout(timer);
						pc.removeEventListener("icegatheringstatechange", check);
						resolve();
					} else if (pc.signalingState === "closed") {
						clearTimeout(timer);
						pc.removeEventListener("icegatheringstatechange", check);
						reject(new Error("Pairing was cancelled."));
					}
				};
				pc.addEventListener("icegatheringstatechange", check);
				check();
			});
		}
		async host(options = {}) {
			this.close(true);
			this._resetPair();
			this._pairRole = "host";
			this.role = "pairing-host";
			this.authority = true;
			this.localSeat = 1;
			this.sessionNonce = nonce();
			this._lan = options.lan === true;
			const pc = this._newPeer(this._lan);
			this._attachChannel(
				pc.createDataChannel("near-misses-v1", { ordered: true }),
			);
			this._status("Gathering the host invitation…");
			try {
				await pc.setLocalDescription(await pc.createOffer());
				await this._gather(pc);
				this._status(
					"Invitation ready. Send it to your partner, then paste their reply.",
				);
				return encodeSignal({
					app: TAG,
					v: VERSION,
					content: CONTENT,
					role: "host",
					nonce: this.sessionNonce,
					expires: Date.now() + 1800000,
					lan: this._lan,
					description: pc.localDescription.toJSON(),
				});
			} catch (error) {
				this.close(true);
				throw error;
			}
		}
		async join(invitation) {
			const offer = decodeSignal(invitation, "host");
			this.close(true);
			this._resetPair();
			this._pairRole = "guest";
			this.role = "pairing-guest";
			this.authority = false;
			this.localSeat = 2;
			this.sessionNonce = offer.nonce;
			this._lan = offer.lan === true;
			const pc = this._newPeer(this._lan);
			pc.ondatachannel = (event) => this._attachChannel(event.channel);
			this._status("Gathering your reply…");
			try {
				await pc.setRemoteDescription(offer.description);
				await pc.setLocalDescription(await pc.createAnswer());
				await this._gather(pc);
				this._status("Reply ready. Send it back to the host.");
				return encodeSignal({
					app: TAG,
					v: VERSION,
					content: CONTENT,
					role: "guest",
					nonce: this.sessionNonce,
					expires: offer.expires,
					description: pc.localDescription.toJSON(),
				});
			} catch (error) {
				this.close(true);
				throw error;
			}
		}
		async accept(reply) {
			if (this._pairRole !== "host" || !this.pc)
				throw new Error("Create an invitation before pasting a reply.");
			const answer = decodeSignal(reply, "guest");
			if (answer.nonce !== this.sessionNonce)
				throw new Error("This reply belongs to a different invitation.");
			await this.pc.setRemoteDescription(answer.description);
			this._status("Connecting the two rangers…");
		}
		_resetPair() {
			this._ended = false;
			this._finished = false;
			this._started = false;
			this.connected = false;
			this.running = false;
			this._queue = [];
			this._pending = [];
			this._remote = {};
			this._parts.clear();
			this._actionSeen = {};
			this._localIds = {};
			this._acked = {};
			this._seq = 0;
			this._snapshotSeq = 0;
			this._appliedSnapshot = -1;
			this._inputAt = -1;
			this._stateAt = -1;
			this._latest = empty();
			this._epoch = Math.floor(Date.now() % 1000000000) + 1;
		}
		_receive(packet, from) {
			if (
				this._ended ||
				!packet ||
				typeof packet !== "object" ||
				packet.nm !== VERSION ||
				packet.c !== CONTENT ||
				packet.e !== this.sessionNonce ||
				bytes(packet) > MAX_PACKET
			) {
				this.diagnostics.rejected++;
				return;
			}
			this.diagnostics.received++;
			const fromAuthority = this.isHub ? from === this.info.host : from === 1;
			const seat = this.isHub ? this._idToSeat.get(from) : from;
			if (this.isHub && !fromAuthority && !this._active.has(from)) {
				this.diagnostics.rejected++;
				return;
			}
			if (packet.t === "hello" && !this.isHub) {
				if (
					!integer(packet.epoch, 1) ||
					packet.role !== (this._pairRole === "host" ? "guest" : "host")
				) {
					this.diagnostics.rejected++;
					return;
				}
				if (this._pairRole === "host") {
					this._prepare("host", [1, 2], 1, false);
					this.running = true;
					this._enqueue({ t: "welcome", epoch: this._epoch });
					this._flush();
					this._status("Two rangers, one expedition.");
				}
				return;
			}
			if (
				packet.t === "welcome" &&
				!this.isHub &&
				this._pairRole === "guest" &&
				fromAuthority
			) {
				this._prepare("guest", [1, 2], 2, false);
				this.running = true;
				this._status("Two rangers, one expedition.");
				return;
			}
			if (!this._started) {
				this.diagnostics.rejected++;
				return;
			}
			if (
				packet.t === "input" &&
				this.authority &&
				seat != null &&
				seat !== this.localSeat
			)
				this._input(packet, seat);
			else if (packet.t === "state" && !this.authority && fromAuthority)
				this._state(packet);
			else if (packet.t === "part" && !this.authority && fromAuthority)
				this._part(packet);
			else if (packet.t === "bye" && !this.isHub)
				this._end("The other ranger ended the connection.");
			else this.diagnostics.rejected++;
		}
		_input(packet, seat) {
			if (
				!integer(packet.seq) ||
				!integer(packet.epoch, 1) ||
				!Array.isArray(packet.actions) ||
				packet.actions.length > 32
			) {
				this.diagnostics.rejected++;
				return;
			}
			const cmd = commandOf(packet.cmd);
			if (!cmd) {
				this.diagnostics.rejected++;
				return;
			}
			let remote = this._remote[seat];
			if (!remote)
				remote = this._remote[seat] = {
					seq: -1,
					epoch: packet.epoch,
					at: this._clock,
					ids: {},
				};
			if (remote.epoch !== packet.epoch || packet.seq <= remote.seq) return;
			remote.seq = packet.seq;
			remote.at = this._clock;
			remote.timedOut = false;
			this.diagnostics.lastInputSeq[seat] = packet.seq;
			this.cb.command?.(seat, {
				...cmd,
				fireId: 0,
				interactId: 0,
				dodgeId: 0,
				quiverId: 0,
				seq: packet.seq,
				epoch: packet.epoch,
			});
			for (const action of packet.actions) {
				if (
					!action ||
					!ACTIONS.includes(action.key) ||
					!integer(action.id, 1)
				) {
					this.diagnostics.rejected++;
					continue;
				}
				if (action.id <= (remote.ids[action.key] || 0)) continue;
				if (
					action.key === "travelId" &&
					(typeof action.travel !== "string" || action.travel.length > 64)
				) {
					this.diagnostics.rejected++;
					continue;
				}
				if (
					action.ax != null &&
					(!finite(action.ax, -1.001, 1.001) ||
						!finite(action.ay, -1.001, 1.001))
				) {
					this.diagnostics.rejected++;
					continue;
				}
				remote.ids[action.key] = action.id;
				const one = {
					...cmd,
					fireId: 0,
					interactId: 0,
					dodgeId: 0,
					quiverId: 0,
					seq: packet.seq,
					epoch: packet.epoch,
				};
				if (action.key === "travelId") one.travel = action.travel;
				else one[action.key] = action.id;
				if (action.ax != null) {
					one.ax = action.ax;
					one.ay = action.ay;
				}
				this.cb.command?.(seat, one);
			}
		}
		sendInput(raw) {
			if (!this._started || this._ended || this.localSeat == null) return false;
			const cmd = commandOf(raw);
			if (!cmd) return false;
			if (this.authority) {
				if (this.running)
					this.cb.command?.(this.localSeat, {
						...cmd,
						epoch: this._epoch,
						seq: ++this._seq,
					});
				return true;
			}
			this._latest = { ...cmd };
			for (const key of ACTIONS.slice(0, -1)) {
				const id = cmd[key];
				if (id > (this._localIds[key] || 0)) {
					this._localIds[key] = id;
					this._pending.push({ key, id, ax: cmd.ax, ay: cmd.ay });
				}
				this._latest[key] = 0;
			}
			if (cmd.travel)
				this._pending.push({
					key: "travelId",
					id: ++this._travelId,
					travel: cmd.travel,
				});
			delete this._latest.travel;
			return true;
		}
		async _makeSnapshot() {
			if (
				this._packing ||
				this._ended ||
				!this.running ||
				!this.authority ||
				this._queue.some((item) => item.group === "snapshot")
			)
				return;
			this._packing = true;
			const seq = ++this._snapshotSeq;
			const connection = this.sessionNonce;
			try {
				const state = this.cb.getState?.();
				if (!state) return;
				const ack = Object.fromEntries(
					Object.entries(this._remote).map(([seat, remote]) => [
						seat,
						{ epoch: remote.epoch, seq: remote.seq, ids: { ...remote.ids } },
					]),
				);
				const packed = await packState(state);
				if (this._ended || !this.running || this.sessionNonce !== connection)
					return;
				const count = Math.ceil(packed.data.length / PART_SIZE);
				if (count === 1)
					this._enqueue({ t: "state", seq, ...packed, ack }, null, "snapshot");
				else {
					for (let i = 0; i < count; i++)
						this._enqueue(
							{
								t: "part",
								seq,
								index: i,
								count,
								codec: packed.codec,
								data: packed.data.slice(i * PART_SIZE, (i + 1) * PART_SIZE),
								...(i === count - 1 ? { ack } : {}),
							},
							null,
							"snapshot",
						);
				}
			} catch (error) {
				this._status(`State transfer failed: ${error.message}`);
			} finally {
				this._packing = false;
			}
		}
		_part(packet) {
			if (
				!integer(packet.seq) ||
				packet.seq <= this._appliedSnapshot ||
				!integer(packet.count, 1, 60) ||
				!integer(packet.index, 0, packet.count - 1) ||
				typeof packet.data !== "string" ||
				packet.data.length > PART_SIZE
			) {
				this.diagnostics.rejected++;
				return;
			}
			for (const [key, part] of this._parts)
				if (this._clock - part.at > 8 || key < packet.seq - 2)
					this._parts.delete(key);
			let parts = this._parts.get(packet.seq);
			if (!parts) {
				parts = {
					at: this._clock,
					count: packet.count,
					codec: packet.codec,
					data: new Array(packet.count),
					ack: null,
				};
				this._parts.set(packet.seq, parts);
			}
			if (parts.count !== packet.count || parts.codec !== packet.codec) {
				this.diagnostics.rejected++;
				return;
			}
			parts.data[packet.index] = packet.data;
			if (packet.ack) parts.ack = packet.ack;
			if (parts.data.filter((x) => x != null).length === parts.count) {
				this._parts.delete(packet.seq);
				this._state({
					seq: packet.seq,
					codec: parts.codec,
					data: parts.data.join(""),
					ack: parts.ack,
				});
			}
		}
		async _state(packet) {
			if (!integer(packet.seq) || packet.seq <= this._appliedSnapshot) return;
			const connection = this.sessionNonce;
			try {
				const state = await unpackState(packet);
				if (
					this._ended ||
					packet.seq <= this._appliedSnapshot ||
					this.sessionNonce !== connection
				)
					return;
				this._appliedSnapshot = packet.seq;
				this.cb.applyState?.(state);
				const ack = packet.ack?.[this.localSeat];
				if (
					ack?.epoch === this._epoch &&
					ack.ids &&
					typeof ack.ids === "object"
				) {
					this._pending = this._pending.filter(
						(action) => action.id > (ack.ids[action.key] || 0),
					);
					this._acked = ack.ids;
				}
			} catch {
				this.diagnostics.rejected++;
			}
		}
		update(dt) {
			if (this._ended) return;
			this._clock += Math.max(0, Math.min(0.1, Number(dt) || 0));
			if (this.isHub && this._hubStarted && !this.running && AIHub.time() >= 0)
				this.running = true;
			if (this._disconnectAt != null && this._clock - this._disconnectAt > 8) {
				this._end(
					"The other ranger could not reconnect. The host keeps the expedition save.",
				);
				return;
			}
			if (this.running && this.connected) {
				if (this.authority) {
					for (const [seat, remote] of Object.entries(this._remote))
						if (!remote.timedOut && this._clock - remote.at > 0.65) {
							remote.timedOut = true;
							this.cb.command?.(Number(seat), {
								...empty(),
								epoch: remote.epoch,
								seq: ++remote.seq,
							});
						}
					if (this._clock - this._stateAt >= 0.125) {
						this._stateAt = this._clock;
						void this._makeSnapshot();
					}
				} else if (this._clock - this._inputAt >= 1 / 15) {
					this._inputAt = this._clock;
					this._queue = this._queue.filter((item) => item.group !== "input");
					const cmd = this._latest || empty();
					this._enqueue(
						{
							t: "input",
							seq: ++this._seq,
							epoch: this._epoch,
							cmd,
							actions: this._pending.slice(0, 32),
						},
						this.isHub ? this.info.host : null,
						"input",
					);
				}
			}
			this._flush();
		}
		finish(win, stats = {}) {
			if (this._ended || this._finished || !this.authority || !this._started)
				return false;
			this._finished = true;
			if (this.isHub) {
				const live = this.info.players
					.filter((player) => this._active.has(player.id))
					.map((player) => player.id);
				const safeStats = {};
				for (const [key, value] of Object.entries(stats || {}))
					if (
						(typeof value === "string" && value.length < 100) ||
						(typeof value === "number" && Number.isFinite(value)) ||
						typeof value === "boolean"
					)
						safeStats[key.slice(0, 40)] = value;
				AIHub.finish({
					standings: [live],
					won: win === true,
					stats: Object.fromEntries(live.map((id) => [id, safeStats])),
				});
			}
			return true;
		}
		_end(reason) {
			if (this._ended) return;
			this._ended = true;
			this.running = false;
			this.connected = false;
			this._queue = [];
			this._pending = [];
			this._latest = empty();
			this.diagnostics.peer = "ended";
			this._status(reason);
			if (!this.isHub) {
				if (this.authority) this.cb.removePlayer?.(2);
				const channel = this.channel;
				this.channel = null;
				if (channel) {
					channel.onclose = null;
					channel.close();
				}
				const pc = this.pc;
				this.pc = null;
				if (pc) {
					pc.onconnectionstatechange = null;
					pc.close();
				}
			}
			this.cb.ended?.(reason);
		}
		close(silent = false) {
			if (this.isHub) return false;
			if (!silent && this.channel?.readyState === "open") {
				try {
					this.channel.send(JSON.stringify(this._envelope({ t: "bye" })));
				} catch {}
			}
			const channel = this.channel;
			this.channel = null;
			if (channel) {
				channel.onclose = null;
				channel.close();
			}
			const pc = this.pc;
			this.pc = null;
			if (pc) {
				pc.onconnectionstatechange = null;
				pc.close();
			}
			this._ended = true;
			this.running = false;
			this.connected = false;
			this._queue = [];
			this._pending = [];
			if (this._started && this.authority) this.cb.removePlayer?.(2);
			if (!silent) this.cb.ended?.("Direct pairing cancelled.");
			return true;
		}
	}
	Network.protocol = {
		version: VERSION,
		content: CONTENT,
		maxPacket: MAX_PACKET,
		commandOf,
		packState,
		unpackState,
		encodeSignal,
		decodeSignal,
		bytes,
	};
	NM.Network = Network;
})();
