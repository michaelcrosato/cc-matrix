/* Auto Lap Happy: one host-authoritative transport for AI Hub and direct peers. */
((root) => {
	const BUILD = "auto-lap-happy-1";
	const PROTOCOL = 1;
	const SAFE = Object.freeze({
		steer: 0,
		brake: 1,
		throttle: 0,
		recover: false,
	});
	const now = () => (root.performance ? root.performance.now() : Date.now());
	const clamp = (x, a, b) => Math.max(a, Math.min(b, Number(x) || 0));
	const validNumber = (n) => typeof n === "number" && Number.isFinite(n);
	const rounded = (n) => (validNumber(n) ? Math.round(n * 1000) / 1000 : n);
	function packSnapshot(s) {
		if (
			s?.v !== 1 ||
			!Array.isArray(s.cars) ||
			!s.cars.every((c) => c && !Array.isArray(c) && c.r)
		)
			return s;
		return {
			w: 1,
			d: [
				s.mode,
				s.state,
				s.ci,
				s.t,
				s.tick,
				s.score,
				s.ex,
				s.cd,
				s.target,
				s.laps,
				s.penalty,
				s.message,
				rounded(s.messageT),
				s.finished,
				s.cars.map((c) => {
					const r = c.r;
					return [
						c.x,
						c.y,
						c.a,
						c.vx,
						c.vy,
						c.s,
						c.p,
						rounded(c.cr),
						rounded(c.im),
						[
							r.index,
							rounded(r.d),
							rounded(r.total),
							r.gate,
							r.lap,
							r.lastGate,
							rounded(r.lapT),
							r.splits.map(rounded),
							r.valid ? 1 : 0,
							r.wrong ? 1 : 0,
						],
					];
				}),
			],
		};
	}
	function unpackSnapshot(s) {
		if (s?.w !== 1) return s;
		const d = s.d;
		if (
			!Array.isArray(d) ||
			d.length !== 15 ||
			!Array.isArray(d[14]) ||
			d[14].length > 2
		)
			return null;
		const cars = [];
		for (const c of d[14]) {
			if (
				!Array.isArray(c) ||
				c.length !== 10 ||
				!Array.isArray(c[9]) ||
				c[9].length !== 10
			)
				return null;
			const r = c[9];
			cars.push({
				x: c[0],
				y: c[1],
				a: c[2],
				vx: c[3],
				vy: c[4],
				s: c[5],
				p: c[6],
				cr: c[7],
				im: c[8],
				r: {
					index: r[0],
					d: r[1],
					total: r[2],
					gate: r[3],
					lap: r[4],
					lastGate: r[5],
					lapT: r[6],
					splits: r[7],
					valid: !!r[8],
					wrong: !!r[9],
				},
			});
		}
		return {
			v: 1,
			mode: d[0],
			state: d[1],
			ci: d[2],
			t: d[3],
			tick: d[4],
			score: d[5],
			ex: d[6],
			cd: d[7],
			target: d[8],
			laps: d[9],
			penalty: d[10],
			message: d[11],
			messageT: d[12],
			finished: d[13],
			cars,
		};
	}
	const control = (obj) => {
		if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
		if (
			!validNumber(obj.steer) ||
			!validNumber(obj.brake) ||
			!validNumber(obj.throttle)
		)
			return null;
		return {
			steer: clamp(obj.steer, -1, 1),
			brake: clamp(obj.brake, 0, 1),
			throttle: clamp(obj.throttle, 0, 1),
			recover: obj.recover === true,
		};
	};
	function invite(text, type) {
		if (typeof text !== "string" || text.length > 200000 || text.length < 20)
			throw Error("Paste the complete invitation or reply.");
		let data;
		try {
			data = JSON.parse(text);
		} catch {
			throw Error(
				"This is incomplete or invalid connection text. Copy the whole text and try again.",
			);
		}
		if (!data || data.build !== BUILD || data.v !== PROTOCOL)
			throw Error(
				"This connection was made by a different game version. Both drivers need the same build.",
			);
		if (
			data.type !== type ||
			!data.sdp ||
			data.sdp.type !== type ||
			typeof data.sdp.sdp !== "string" ||
			!data.sdp.sdp.startsWith("v=0")
		)
			throw Error(
				type === "offer"
					? "Use the host’s invitation, not a reply."
					: "Use the joiner’s reply, not an invitation.",
			);
		if (
			typeof data.token !== "string" ||
			data.token.length < 8 ||
			data.token.length > 80
		)
			throw Error("The connection token is invalid. Create a new invitation.");
		return data;
	}
	function cleanConfig(config, courseCount = 5) {
		config = config || {};
		const difficulty = ["easy", "normal", "hard"].includes(config.difficulty)
			? config.difficulty
			: ["easy", "normal", "hard"][
					Math.floor(clamp(config.difficulty ?? 1, 0, 2))
				];
		return {
			mode: "duel",
			course: Math.floor(clamp(config.course, 0, courseCount - 1)),
			cars: Array.isArray(config.cars)
				? config.cars.slice(0, 2).map((c) => Math.floor(clamp(c, 0, 4)))
				: [3, 4],
			target: config.target === 50 ? 50 : 10,
			difficulty,
			online: true,
			seed: (Number(config.seed) || 1980) >>> 0,
		};
	}
	class HappyNetwork {
		constructor(callbacks = {}) {
			this.callbacks = callbacks;
			this.courseCount = Math.max(
				1,
				Math.floor(
					Number(callbacks.courseCount) ||
						root.HappyWorld?.COURSE_DATA?.length ||
						5,
				),
			);
			this.kind = "none";
			this.authoritative = true;
			this.localSeat = 0;
			this.connected = false;
			this.active = false;
			this.started = false;
			this.info = null;
			this.pc = null;
			this.channels = {};
			this.unsubs = [];
			this.players = [];
			this.gone = new Set();
			this.round = 0;
			this.seq = 0;
			this.inputSeq = new Map();
			this.inputAt = new Map();
			this.snapshotSeq = -1;
			this.lastSent = -Infinity;
			this.lastProgress = -Infinity;
			this.latest = null;
			this.startAt = Infinity;
			this.finished = false;
			this.closed = false;
			this.status = "";
			this.token = "";
			this.answerUsed = false;
			this.directConfig = null;
			this.pendingStart = false;
			this.peerReady = false;
			this.configSeq = 0;
			this.receivedConfigSeq = -1;
			this.lastReadySeq = -1;
			this.lastGoSeq = -1;
			this.testDelay = 0;
			this.testLoss = 0;
			this.timers = new Set();
			this.stun = ""; // Optional user-provided STUN URL; no external service is a boot requirement.
		}
		emit(name, ...args) {
			if (typeof this.callbacks[name] === "function")
				this.callbacks[name](...args);
		}
		say(text) {
			this.status = text;
			this.emit("onStatus", text);
		}
		later(fn, ms) {
			const id = setTimeout(() => {
				this.timers.delete(id);
				if (!this.closed) fn();
			}, ms);
			this.timers.add(id);
			return id;
		}
		clock() {
			if (this.kind === "hub") return root.AIHub.time() / 1000;
			if (this.kind === "direct") return (now() - this.startAt) / 1000;
			return 0;
		}
		async connectHub() {
			if (!root.AIHub) return null;
			const info = await root.AIHub.connect({
				mode: "shared-world",
				seats: [1, 2],
			});
			if (!info) return null;
			if (this.pc) this.closePeer();
			this.kind = "hub";
			this.active = true;
			this.connected = true;
			this.closed = false;
			this.authoritative = !!info.isHost;
			this.info = info;
			this.players = info.players.slice();
			this.localSeat = info.server
				? null
				: this.players.findIndex((p) => p.id === info.me);
			if (this.localSeat < 0) this.localSeat = null;
			this.round = info.round;
			this.finished = false;
			const rng = root.AIHub.rng("auto-lap-happy-config");
			this.config = cleanConfig(
				{
					course: Math.floor(rng() * this.courseCount),
					cars: [3, 4],
					seed: info.seed,
					target: 10,
				},
				this.courseCount,
			);
			this.emit("onStart", {
				...this.config,
				hub: true,
				humans: this.players.length,
				startClock: true,
			});
			const on = (name, fn) => this.unsubs.push(root.AIHub.on(name, fn));
			on("start", () => {
				this.started = true;
				this.say("Green flag on the Hub clock.");
			});
			on("message", (data, from) => this.receive(data, from));
			on("time-up", () => {
				if (this.authoritative && !this.finished) {
					this.emit("onTimeUp");
					this.finish(this.latest?.score || this.latest?.scores || [0, 0]);
				}
			});
			on("leave", ({ id, reason }) => {
				this.gone.add(id);
				const seat = this.players.findIndex((p) => p.id === id);
				if (seat >= 0) this.emit("onInput", seat, { ...SAFE });
				this.emit("onLeave", seat, reason);
				if (
					this.authoritative &&
					!this.finished &&
					this.players.filter((p) => !this.gone.has(p.id)).length <= 1 &&
					this.players.length > 1
				)
					this.finish(this.latest?.score || this.latest?.scores || [0, 0]);
			});
			on("end", ({ reason }) => {
				this.active = false;
				this.connected = false;
				this.started = false;
				this.finished = true;
				this.emit("onEnd", reason);
				this.say(
					reason === "host-left"
						? "The host left. This Hub round is void."
						: "Hub round complete.",
				);
			});
			root.AIHub.ready();
			return info;
		}
		packet(t, fields = {}) {
			return { v: PROTOCOL, b: BUILD, r: this.round, t, ...fields };
		}
		transmit(packet, reliable = false, to) {
			if (!this.active || this.closed) return false;
			let text;
			try {
				text = JSON.stringify(packet);
			} catch {
				return false;
			}
			if (text.length > (reliable ? 16000 : 1200)) return false;
			const send = () => {
				if (!this.active || this.closed) return false;
				if (this.kind === "hub")
					return root.AIHub.send(packet, { to, reliable });
				const channel = reliable
					? this.channels.reliable
					: this.channels.fast?.readyState === "open"
						? this.channels.fast
						: this.channels.reliable;
				if (
					channel?.readyState !== "open" ||
					channel.bufferedAmount > (reliable ? 65536 : 8192)
				)
					return false;
				try {
					channel.send(text);
					return true;
				} catch {
					return false;
				}
			};
			if (
				!reliable &&
				this.kind === "direct" &&
				this.testLoss > 0 &&
				Math.random() < this.testLoss
			)
				return false;
			if (this.kind === "direct" && this.testDelay > 0) {
				this.later(send, this.testDelay);
				return true;
			}
			return send();
		}
		receive(message, from) {
			if (
				!this.active ||
				this.closed ||
				!message ||
				typeof message !== "object" ||
				Array.isArray(message)
			)
				return;
			if (
				message.v !== PROTOCOL ||
				message.b !== BUILD ||
				typeof message.t !== "string"
			)
				return;
			if (
				message.r !== this.round &&
				!(
					this.kind === "direct" &&
					!this.authoritative &&
					message.t === "config" &&
					message.r === this.round + 1
				)
			)
				return;
			const hubHost = this.kind === "hub" ? this.info.host : 0;
			const senderSeat =
				this.kind === "hub"
					? this.players.findIndex((p) => p.id === from)
					: this.authoritative
						? 1
						: 0;
			if (this.kind === "hub" && this.gone.has(from)) return;
			if (message.t === "i") {
				if (
					!this.authoritative ||
					senderSeat < 0 ||
					(this.kind === "hub" &&
						from === hubHost &&
						senderSeat === this.localSeat)
				)
					return;
				const input = control(message.i);
				if (
					!input ||
					!Number.isSafeInteger(message.n) ||
					message.n <= (this.inputSeq.get(senderSeat) ?? -1)
				)
					return;
				this.inputSeq.set(senderSeat, message.n);
				this.inputAt.set(senderSeat, now());
				this.emit("onInput", senderSeat, input);
			} else if (message.t === "s") {
				if (
					this.authoritative ||
					(this.kind === "hub" && from !== hubHost) ||
					!Number.isSafeInteger(message.n) ||
					message.n <= this.snapshotSeq ||
					!message.s ||
					typeof message.s !== "object"
				)
					return;
				const snapshot = unpackSnapshot(message.s);
				if (!snapshot) return;
				this.snapshotSeq = message.n;
				this.latest = snapshot;
				this.emit("onSnapshot", snapshot);
			} else if (message.t === "hello" && this.kind === "direct") {
				if (
					message.token !== this.token ||
					message.role === (this.authoritative ? "host" : "guest")
				)
					return this.endDirect(
						"The peer’s connection identity does not match.",
					);
				this.peerReady = true;
				if (this.authoritative && this.pendingStart)
					this.startDirect(this.directConfig);
			} else if (
				message.t === "config" &&
				this.kind === "direct" &&
				!this.authoritative
			) {
				if (
					!Number.isSafeInteger(message.n) ||
					message.n <= this.receivedConfigSeq
				)
					return;
				this.receivedConfigSeq = message.n;
				this.round = message.r;
				this.snapshotSeq = -1;
				this.config = cleanConfig(message.c, this.courseCount);
				this.finished = false;
				this.started = false;
				this.transmit(this.packet("ready", { n: message.n }), true);
			} else if (
				message.t === "ready" &&
				this.kind === "direct" &&
				this.authoritative
			) {
				if (
					message.n !== this.configSeq ||
					message.n <= this.lastReadySeq ||
					(this.started && !this.finished)
				)
					return;
				this.lastReadySeq = message.n;
				this.startAt = now() + 3000;
				this.started = true;
				this.finished = false;
				this.transmit(
					this.packet("go", { n: this.configSeq, c: this.config, ms: 3000 }),
					true,
				);
				this.emit("onStart", { ...this.config, humans: 2, startClock: true });
				this.say("Both drivers ready. Three seconds to green.");
			} else if (
				message.t === "go" &&
				this.kind === "direct" &&
				!this.authoritative
			) {
				if (
					message.n !== this.receivedConfigSeq ||
					message.n <= this.lastGoSeq ||
					(this.started && !this.finished)
				)
					return;
				this.lastGoSeq = message.n;
				this.config = cleanConfig(message.c, this.courseCount);
				this.startAt = now() + clamp(message.ms, 0, 5000);
				this.started = true;
				this.finished = false;
				this.emit("onStart", { ...this.config, humans: 2, startClock: true });
				this.say("Both drivers ready. Three seconds to green.");
			} else if (message.t === "done") {
				if (
					this.authoritative ||
					(this.kind === "hub" && from !== hubHost) ||
					this.finished
				)
					return;
				this.finished = true;
				if (message.s) {
					const snapshot = unpackSnapshot(message.s);
					if (snapshot) {
						this.latest = snapshot;
						this.emit("onSnapshot", snapshot);
					}
				}
				this.emit(
					"onFinish",
					Array.isArray(message.scores) ? message.scores : [0, 0],
				);
			} else if (message.t === "bye" && this.kind === "direct")
				this.endDirect("The other driver left the connection.");
		}
		update(_dt, snapshot, localInput) {
			if (!this.active || this.closed) return;
			if (this.kind === "direct" && !this.started) return;
			if (snapshot && this.authoritative) this.latest = snapshot;
			if (this.authoritative) {
				for (const [seat, at] of this.inputAt)
					if (now() - at > 600) {
						this.inputAt.delete(seat);
						this.emit("onInput", seat, { ...SAFE });
					}
			}
			if (now() - this.lastSent < 125 || this.finished) return;
			this.lastSent = now();
			if (this.authoritative && snapshot)
				this.transmit(
					this.packet("s", { n: ++this.seq, s: packSnapshot(snapshot) }),
					false,
				);
			else if (this.localSeat !== null)
				this.transmit(
					this.packet("i", {
						n: ++this.seq,
						i: control(localInput) || { ...SAFE },
					}),
					false,
					this.kind === "hub" ? this.info.host : undefined,
				);
			if (
				this.kind === "hub" &&
				this.localSeat !== null &&
				now() - this.lastProgress > 1000
			) {
				this.lastProgress = now();
				const score =
					this.latest?.score?.[this.localSeat] ||
					this.latest?.scores?.[this.localSeat] ||
					0;
				root.AIHub.progress({ score, label: `${score} pursuit points` });
			}
		}
		finish(scores = [0, 0]) {
			if (!this.active || !this.authoritative || this.finished) return false;
			this.finished = true;
			scores = [0, 1].map((i) =>
				Number.isFinite(Number(scores[i])) ? Number(scores[i]) : 0,
			);
			this.transmit(
				this.packet("done", { scores, s: packSnapshot(this.latest) }),
				true,
			);
			if (this.kind === "hub") {
				const live = this.players
					.map((p, seat) => ({ id: p.id, score: scores[seat] || 0 }))
					.filter((p) => !this.gone.has(p.id))
					.sort((a, b) => b.score - a.score);
				const groups = [];
				for (const p of live) {
					const last = groups[groups.length - 1];
					if (last && last.score === p.score) last.ids.push(p.id);
					else groups.push({ score: p.score, ids: [p.id] });
				}
				root.AIHub.finish({
					standings: groups.map((g) => g.ids),
					scores: Object.fromEntries(live.map((p) => [p.id, p.score])),
				});
			}
			this.emit("onFinish", scores);
			return true;
		}
		assertStandalone() {
			if (root.AIHub?.active || this.kind === "hub")
				throw Error(
					"Direct connections are unavailable during a Hub round. The Hub already connects your drivers.",
				);
			if (!root.RTCPeerConnection)
				throw Error(
					"This browser has no WebRTC data channels. Try a current Chromium browser or couch play.",
				);
		}
		newPeer(host) {
			this.assertStandalone();
			this.closePeer();
			this.closed = false;
			this.finished = false;
			this.kind = "direct";
			this.authoritative = host;
			this.localSeat = host ? 0 : 1;
			this.active = true;
			this.connected = false;
			this.started = false;
			this.peerReady = false;
			this.answerUsed = false;
			this.round = 0;
			this.seq = 0;
			this.snapshotSeq = -1;
			this.configSeq = 0;
			this.receivedConfigSeq = -1;
			this.lastReadySeq = -1;
			this.lastGoSeq = -1;
			this.pendingStart = false;
			this.latest = null;
			this.startAt = Infinity;
			this.inputSeq.clear();
			this.inputAt.clear();
			this.players = [
				{ id: 0, name: "Host" },
				{ id: 1, name: "Guest" },
			];
			const iceServers =
				this.stun && /^stuns?:[^\s]{3,200}$/.test(this.stun)
					? [{ urls: this.stun }]
					: [];
			const pc = new root.RTCPeerConnection({ iceServers });
			this.pc = pc;
			pc.ondatachannel = (event) => this.attachChannel(event.channel);
			pc.onconnectionstatechange = () => {
				if (pc !== this.pc || this.closed) return;
				if (pc.connectionState === "failed" || pc.connectionState === "closed")
					this.endDirect(
						"The direct connection ended. Return to multiplayer and make a new invitation.",
					);
				else if (pc.connectionState === "disconnected") {
					this.say("Connection interrupted. Braking while we wait…");
					this.later(() => {
						if (pc === this.pc && pc.connectionState === "disconnected")
							this.endDirect(
								"The connection did not return within ten seconds.",
							);
					}, 10000);
				}
			};
			this.later(() => {
				if (pc === this.pc && !this.connected)
					this.endDirect(
						"No peer connected within 90 seconds. Check the full reply, try STUN, or use couch / Hub play.",
					);
			}, 90000);
			if (host) {
				this.attachChannel(
					pc.createDataChannel("happy-rules", { ordered: true }),
				);
				try {
					this.attachChannel(
						pc.createDataChannel("happy-state", {
							ordered: false,
							maxRetransmits: 0,
						}),
					);
				} catch {
					/* Bounded reliable channel remains available. */
				}
			}
			return pc;
		}
		attachChannel(channel) {
			const key =
				channel.label === "happy-rules"
					? "reliable"
					: channel.label === "happy-state"
						? "fast"
						: null;
			if (!key) {
				channel.close();
				return;
			}
			this.channels[key] = channel;
			channel.onopen = () => {
				if (key !== "reliable") return;
				this.connected = true;
				this.say(
					this.authoritative
						? "Guest connected. Choose a course and start the duel."
						: "Host connected. Waiting for the host to start.",
				);
				this.transmit(
					this.packet("hello", {
						token: this.token,
						role: this.authoritative ? "host" : "guest",
					}),
					true,
				);
				this.emit("onConnected");
			};
			channel.onmessage = (event) => {
				if (typeof event.data !== "string" || event.data.length > 16384) return;
				let message;
				try {
					message = JSON.parse(event.data);
				} catch {
					return;
				}
				this.receive(message, this.authoritative ? 1 : 0);
			};
			channel.onclose = () => {
				if (key === "reliable" && !this.closed)
					this.endDirect("The other driver closed the connection.");
			};
		}
		gather(pc) {
			if (pc.iceGatheringState === "complete") return Promise.resolve();
			return new Promise((resolve, reject) => {
				const deadline = this.later(() => {
					cleanup();
					reject(
						Error(
							"ICE gathering timed out. Try again, optionally with a STUN URL.",
						),
					);
				}, 12000);
				const poll = () => {
					if (pc !== this.pc || this.closed) {
						cleanup();
						reject(Error("Connection cancelled."));
					} else if (pc.iceGatheringState === "complete") {
						cleanup();
						resolve();
					}
				};
				const interval = setInterval(poll, 100);
				const cleanup = () => {
					clearTimeout(deadline);
					this.timers.delete(deadline);
					clearInterval(interval);
					pc.removeEventListener("icegatheringstatechange", poll);
				};
				pc.addEventListener("icegatheringstatechange", poll);
				poll();
			});
		}
		async createOffer() {
			const pc = this.newPeer(true);
			const random = new Uint32Array(3);
			root.crypto.getRandomValues(random);
			this.token = Array.from(random, (n) => n.toString(36)).join("-");
			this.say("Gathering the complete invitation…");
			try {
				await pc.setLocalDescription(await pc.createOffer());
				await this.gather(pc);
				if (pc !== this.pc) throw Error("Connection cancelled.");
				this.say(
					"Invitation ready. Send all of it to your friend, then paste their reply.",
				);
				return JSON.stringify({
					game: "Auto Lap Happy",
					build: BUILD,
					v: PROTOCOL,
					type: "offer",
					token: this.token,
					sdp: pc.localDescription.toJSON(),
				});
			} catch (error) {
				if (pc === this.pc) this.endDirect(error.message);
				throw error;
			}
		}
		async acceptOffer(text) {
			this.assertStandalone();
			const data = invite(text, "offer");
			const pc = this.newPeer(false);
			this.token = data.token;
			this.say("Reading invitation and gathering your reply…");
			try {
				await pc.setRemoteDescription(data.sdp);
				await pc.setLocalDescription(await pc.createAnswer());
				await this.gather(pc);
				if (pc !== this.pc) throw Error("Connection cancelled.");
				this.say("Reply ready. Send all of it back to the host.");
				return JSON.stringify({
					game: "Auto Lap Happy",
					build: BUILD,
					v: PROTOCOL,
					type: "answer",
					token: this.token,
					sdp: pc.localDescription.toJSON(),
				});
			} catch (error) {
				if (pc === this.pc) this.endDirect(error.message);
				throw error;
			}
		}
		async acceptAnswer(text) {
			this.assertStandalone();
			const data = invite(text, "answer");
			if (!this.pc || !this.authoritative)
				throw Error("Create an invitation before accepting a reply.");
			if (this.answerUsed || this.pc.signalingState !== "have-local-offer")
				throw Error(
					"A reply was already accepted. Create a new invitation for a new connection.",
				);
			if (data.token !== this.token)
				throw Error(
					"This reply belongs to another invitation. Ask for a reply to your current invitation.",
				);
			await this.pc.setRemoteDescription(data.sdp);
			this.answerUsed = true;
			this.say("Reply accepted. Connecting the two drivers…");
		}
		startDirect(config = {}) {
			if (this.kind !== "direct" || !this.authoritative || !this.connected)
				throw Error("Connect both drivers before starting.");
			this.directConfig = cleanConfig(config, this.courseCount);
			this.pendingStart = true;
			if (!this.peerReady) {
				this.say("Waiting for the guest’s ready handshake…");
				return false;
			}
			this.config = this.directConfig;
			this.configSeq++;
			this.round++;
			this.seq = 0;
			this.inputSeq.clear();
			this.inputAt.clear();
			this.finished = false;
			this.started = false;
			this.pendingStart = false;
			this.transmit(
				this.packet("config", { n: this.configSeq, c: this.config }),
				true,
			);
			return true;
		}
		async copy(text) {
			try {
				await root.navigator.clipboard.writeText(text);
				this.say("Copied. Send the complete text to your friend.");
				return true;
			} catch {
				this.say(
					"Clipboard permission was refused. Select the connection text and copy it manually, or save a text file.",
				);
				return false;
			}
		}
		exportText(text, filename = "auto-lap-happy-connection.txt") {
			const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
			const anchor = root.document.createElement("a");
			anchor.href = url;
			anchor.download = filename;
			anchor.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}
		async importText(file) {
			if (!file || file.size > 200000)
				throw Error("Choose a connection text file smaller than 200 KB.");
			return file.text();
		}
		endDirect(reason) {
			const wasActive = this.active;
			this.closePeer();
			this.active = false;
			this.connected = false;
			this.started = false;
			this.finished = true;
			this.say(reason);
			if (wasActive) this.emit("onEnd", reason);
		}
		closePeer() {
			const pc = this.pc;
			this.pc = null;
			for (const id of this.timers) clearTimeout(id);
			this.timers.clear();
			for (const channel of Object.values(this.channels)) {
				channel.onclose = null;
				try {
					channel.close();
				} catch {}
			}
			this.channels = {};
			if (pc) {
				pc.onconnectionstatechange = null;
				pc.ondatachannel = null;
				try {
					pc.close();
				} catch {}
			}
		}
		destroy() {
			if (this.kind === "direct" && this.active)
				this.transmit(this.packet("bye"), true);
			this.closed = true;
			this.active = false;
			this.connected = false;
			this.started = false;
			this.closePeer();
			for (const remove of this.unsubs) remove();
			this.unsubs = [];
			for (const id of this.timers) clearTimeout(id);
			this.timers.clear();
			this.kind = "none";
			this.localSeat = 0;
			this.authoritative = true;
		}
	}
	HappyNetwork.BUILD = BUILD;
	HappyNetwork.PROTOCOL = PROTOCOL;
	HappyNetwork.validateInvite = invite;
	HappyNetwork.cleanConfig = cleanConfig;
	root.HappyNetwork = HappyNetwork;
})(typeof window !== "undefined" ? window : globalThis);
