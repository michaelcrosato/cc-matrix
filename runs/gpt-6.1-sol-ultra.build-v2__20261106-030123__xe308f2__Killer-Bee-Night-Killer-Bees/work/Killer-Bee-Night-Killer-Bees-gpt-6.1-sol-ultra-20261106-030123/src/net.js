/* Killer Bee Night transport. Hub SDK is separately vendored and never modified. */
((root) => {
	const VERSION = 1;
	const ZERO = () => ({ x: 0, y: 0, focus: false, ray: 0 });
	const round = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);
	const clone = (v) => JSON.parse(JSON.stringify(v));
	const bytes = (v) => new TextEncoder().encode(JSON.stringify(v)).length;
	const TYPES = ["left", "right", "bell"];
	const STAGES = ["scout", "guard", "hunter"];
	const PKEYS = [
		"id",
		"x",
		"y",
		"vx",
		"vy",
		"bees",
		"charge",
		"focus",
		"r",
		"hitUntil",
		"contact",
		"raySeen",
		"emptySince",
	];
	const TKEYS = [
		"id",
		"type",
		"x",
		"y",
		"r",
		"health",
		"maxHealth",
		"dir",
		"warning",
		"contact",
		"recovering",
		"bossPhase",
		"bossTimer",
		"bossNext",
	];
	const RKEYS = ["id", "x", "y", "r", "stage", "warning", "age", "angle"];
	const HKEYS = ["id", "x", "y", "r", "born", "type"];
	const OBSKEYS = ["x", "y", "w", "h"];
	const row = (object, keys) =>
		keys.map((k) =>
			typeof object[k] === "number" ? round(object[k]) : (object[k] ?? null),
		);
	const object = (values, keys) =>
		Object.fromEntries(keys.map((k, i) => [k, values[i]]));
	function pack(world, events) {
		// These are presentation snapshots: authority-only recovery/damage contributions never travel.
		return {
			a: [
				world.seed,
				world.tick,
				round(world.time),
				world.stage,
				round(world.stageTime),
				world.phase,
				world.score,
				world.streak,
				world.kills,
				world.totalTargets,
				world.assisted,
				world.resultTimer ?? 0,
				world.spawnCursor ?? 0,
				world.stageLost ?? false,
			],
			p: world.players.map((p) => row(p, PKEYS)),
			t: world.targets.map((t) => {
				const a = row(t, TKEYS);
				a[1] = TYPES.indexOf(t.type);
				return a;
			}),
			r: world.rivals.map((r) => {
				const a = row(r, RKEYS);
				a[4] = STAGES.indexOf(r.stage);
				return a;
			}),
			h: world.husks.map((h) => row(h, HKEYS)),
			o: world.obstacles.map((o) => row(o, OBSKEYS)),
			e: events || world.events || [],
			u: world.tuning,
			s: world.stats,
			b: world.lastResult ?? null,
		};
	}
	function unpack(data) {
		if (
			!data ||
			!Array.isArray(data.a) ||
			!Array.isArray(data.p) ||
			data.p.length > 2 ||
			!Array.isArray(data.t) ||
			data.t.length > 32 ||
			!Array.isArray(data.r) ||
			data.r.length > 24 ||
			!Array.isArray(data.h) ||
			data.h.length > 40
		)
			return null;
		const [
			seed,
			tick,
			time,
			stage,
			stageTime,
			phase,
			score,
			streak,
			kills,
			totalTargets,
			assisted,
			resultTimer,
			spawnCursor,
			stageLost,
		] = data.a;
		if (
			!Number.isInteger(tick) ||
			tick < 0 ||
			!Number.isInteger(stage) ||
			stage < 0 ||
			stage > 5 ||
			!["playing", "result", "failed", "won"].includes(phase)
		)
			return null;
		const world = {
			seed,
			tick,
			time,
			stage,
			stageTime,
			phase,
			score,
			streak,
			kills,
			totalTargets,
			assisted,
			resultTimer,
			spawnCursor,
			stageLost,
			lastResult: data.b,
			players: data.p.map((a) => object(a, PKEYS)),
			targets: data.t.map((a) => {
				const o = object(a, TKEYS);
				o.type = TYPES[a[1]];
				return o;
			}),
			rivals: data.r.map((a) => {
				const o = object(a, RKEYS);
				o.stage = STAGES[a[4]];
				return o;
			}),
			husks: data.h.map((a) => object(a, HKEYS)),
			obstacles: (data.o || []).map((a) => object(a, OBSKEYS)),
			events: data.e || [],
			tuning: data.u || {},
			stats: data.s || {},
		};
		return world;
	}
	function action(value, previous = ZERO()) {
		if (
			!value ||
			!Number.isFinite(value.x) ||
			!Number.isFinite(value.y) ||
			Math.abs(value.x) > 1.01 ||
			Math.abs(value.y) > 1.01 ||
			!Number.isSafeInteger(value.ray) ||
			value.ray < 0 ||
			value.ray > 2147483647
		)
			return null;
		let x = Math.max(-1, Math.min(1, value.x)),
			y = Math.max(-1, Math.min(1, value.y));
		const n = Math.hypot(x, y);
		if (n > 1) {
			x /= n;
			y /= n;
		}
		return {
			x,
			y,
			focus: !!value.focus,
			ray: Math.max(previous.ray, value.ray),
		};
	}
	class Session {
		constructor(options) {
			Object.assign(this, options);
			this.active = true;
			this.ended = false;
			this.finished = false;
			this.started = this.kind === "direct";
			this.elapsed = 0;
			this.inputs = this.players.map(ZERO);
			this.lastInput = this.players.map(() => -Infinity);
			this.inputSeq = this.players.map(() => -1);
			this.seq = 0;
			this.rxSeq = -1;
			this.inputAccumulator = 0;
			this.snapshotAccumulator = 0;
			this.recent = [];
			this.eventSeen = new Set();
			this.visual = null;
			this.diagnostics = {
				sent: 0,
				received: 0,
				maxBytes: 0,
				reliableSnapshots: 0,
				maxPerSecond: 0,
				rejected: 0,
				stale: 0,
			};
			this.sendWindow = [];
			this.resultTimer = null;
			this.cleanups = [];
		}
		canStep() {
			return (
				this.active &&
				!this.ended &&
				!this.finished &&
				this.started &&
				(this.kind !== "hub" || root.AIHub.time() >= 0)
			);
		}
		emit(name, ...args) {
			if (typeof this.callbacks[name] === "function")
				this.callbacks[name](...args);
		}
		send(data, reliable = false, to) {
			if (this.ended || !this.active) return false;
			const length = bytes(data);
			this.diagnostics.maxBytes = Math.max(this.diagnostics.maxBytes, length);
			if (length > 16384) {
				this.diagnostics.rejected++;
				return false;
			}
			const now = this.elapsed;
			this.sendWindow = this.sendWindow.filter((t) => t > now - 1);
			// Gameplay sends never exceed the SDK's sustained allowance, even if a caller advances a large dt.
			if (this.sendWindow.length >= 19) return false;
			const sent = this.transport(data, reliable, to);
			if (sent !== false) {
				this.sendWindow.push(now);
				this.diagnostics.sent++;
				this.diagnostics.maxPerSecond = Math.max(
					this.diagnostics.maxPerSecond,
					this.sendWindow.length,
				);
			}
			return sent;
		}
		receive(data, from) {
			if (
				this.ended ||
				!this.active ||
				!data ||
				data.v !== VERSION ||
				bytes(data) > 16384
			)
				return;
			this.diagnostics.received++;
			if (data.k === "i" && this.host) {
				const index = this.players.findIndex((p) => p.id === from);
				if (
					index < 0 ||
					index === this.localIndex ||
					!Number.isSafeInteger(data.q) ||
					data.q <= this.inputSeq[index] ||
					!this.canStep()
				)
					return;
				const a = action(
					{
						x: data.a?.[0],
						y: data.a?.[1],
						focus: data.a?.[2],
						ray: data.a?.[3],
					},
					this.inputs[index],
				);
				if (!a) {
					this.diagnostics.rejected++;
					return;
				}
				this.inputSeq[index] = data.q;
				this.lastInput[index] = this.elapsed;
				this.inputs[index] = a;
				this.emit("onInput", index, a);
			} else if (
				data.k === "s" &&
				!this.host &&
				from === this.hostId &&
				Number.isSafeInteger(data.q) &&
				data.q > this.rxSeq
			) {
				const w = unpack(data.w);
				if (!w) {
					this.diagnostics.rejected++;
					return;
				}
				this.rxSeq = data.q;
				w.events = w.events.filter((e) => !this.eventSeen.has(e.id));
				for (const e of w.events) this.eventSeen.add(e.id);
				if (this.eventSeen.size > 2048)
					this.eventSeen = new Set(w.events.map((e) => e.id));
				this.latest = w;
				this.emit("onSnapshot", w);
			} else if (data.k === "f" && !this.host && from === this.hostId) {
				const w = unpack(data.w);
				if (!w) return;
				this.finished = true;
				if (Number.isSafeInteger(data.q))
					this.rxSeq = Math.max(this.rxSeq, data.q);
				this.latest = w;
				this.emit("onSnapshot", w);
				this.emit("onResult", w);
				this.send({ v: VERSION, k: "ack" }, true);
				if (this.kind === "direct")
					this.resultTimer = setTimeout(
						() => this.close({ reason: "finished" }),
						800,
					);
			} else if (
				data.k === "ack" &&
				this.host &&
				this.finished &&
				this.players.some((p) => p.id === from && !p.left)
			) {
				if (this.kind === "direct") this.close({ reason: "finished" });
				else if (this.finalPending) {
					this.finalPending.waiting.delete(from);
					if (this.finalPending && !this.finalPending.waiting.size)
						this.finalizeHub();
				}
			}
		}
		tick(dt, localAction, world) {
			if (this.ended) return;
			this.elapsed += Math.max(0, Math.min(dt, 0.25));
			if (!this.canStep()) return;
			if (this.localIndex >= 0) {
				const a = action(localAction || ZERO(), this.inputs[this.localIndex]);
				if (a) {
					this.inputs[this.localIndex] = a;
					this.lastInput[this.localIndex] = this.elapsed;
				}
			}
			if (this.host) {
				for (let i = 0; i < this.inputs.length; i++)
					if (
						i !== this.localIndex &&
						this.elapsed - this.lastInput[i] > 0.45
					) {
						const a = this.inputs[i];
						if (a.x || a.y || a.focus) this.diagnostics.stale++;
						this.inputs[i] = { ...a, x: 0, y: 0, focus: false };
					}
				if (!world) return;
				for (const e of world.events || [])
					if (!this.recent.some((old) => old.id === e.id)) this.recent.push(e);
				this.recent = this.recent.slice(-20);
				this.snapshotAccumulator += dt;
				if (this.snapshotAccumulator >= 1 / 12) {
					this.snapshotAccumulator %= 1 / 12;
					const packet = {
						v: VERSION,
						k: "s",
						q: ++this.seq,
						w: pack(world, this.recent),
					};
					const reliable = bytes(packet) > 1200;
					if (reliable) this.diagnostics.reliableSnapshots++;
					this.send(packet, reliable);
				}
			} else {
				this.inputAccumulator += dt;
				if (this.inputAccumulator >= 1 / 15) {
					this.inputAccumulator %= 1 / 15;
					const a = this.inputs[this.localIndex] || ZERO();
					this.send(
						{
							v: VERSION,
							k: "i",
							q: ++this.seq,
							a: [round(a.x), round(a.y), a.focus ? 1 : 0, a.ray],
						},
						false,
						this.hostId,
					);
				}
			}
		}
		view(world, dt, localAction) {
			if (this.host || !world) return world;
			if (
				!this.visual ||
				this.visual.stage !== world.stage ||
				this.visual.phase !== world.phase
			) {
				this.visual = clone(world);
				return this.visual;
			}
			const out = { ...world };
			const blend = 1 - Math.exp(-Math.max(0, dt) * 22);
			for (const name of ["players", "targets", "rivals"]) {
				out[name] = world[name].map((entity) => {
					const old = this.visual[name]?.find((e) => e.id === entity.id);
					if (!old) return { ...entity };
					let x = entity.x,
						y = entity.y;
					if (
						name === "players" &&
						entity.id === this.localIndex &&
						entity.bees > 0 &&
						localAction
					) {
						const speed =
							world.tuning?.movementSpeed || world.tuning?.speed || 86;
						const factor = localAction.focus
							? world.tuning?.focusSpeed || 0.75
							: 1;
						x += localAction.x * speed * factor * Math.min(0.025, dt);
						y += localAction.y * speed * factor * Math.min(0.025, dt);
					}
					// Small correction only; host snapshots always retain contact and collision authority.
					if (Math.hypot(old.x - x, old.y - y) > 24) return { ...entity, x, y };
					return {
						...entity,
						x: old.x + (x - old.x) * blend,
						y: old.y + (y - old.y) * blend,
					};
				});
			}
			this.visual = out;
			return out;
		}
		leave(id) {
			const index = this.players.findIndex((p) => p.id === id);
			if (index < 0) return;
			this.players[index].left = true;
			this.inputs[index] = { ...this.inputs[index], x: 0, y: 0, focus: false };
			this.emit("onLeave", index);
			if (this.finalPending) {
				this.finalPending.waiting.delete(id);
				if (this.finalPending && !this.finalPending.waiting.size)
					this.finalizeHub();
			}
		}
		finish(world, won = world?.phase === "won") {
			if (!this.host || this.finished || this.ended) return false;
			this.finished = true;
			const packet = {
				v: VERSION,
				k: "f",
				q: ++this.seq,
				w: pack(world, world.events || []),
			};
			if (this.kind === "hub") {
				this.finalPending = {
					score: Math.max(0, Math.round(world?.score || 0)),
					won: !!won,
					waiting: new Set(
						this.players
							.filter((p) => !p.left && p.id !== this.hostId)
							.map((p) => p.id),
					),
				};
				// A final reliable state arrives before the Hub result. Never hold time-up
				// beyond 450ms if a departing or unreachable peer cannot acknowledge it.
				this.resultTimer = setTimeout(() => this.finalizeHub(), 450);
				this.send(packet, true);
				if (this.finalPending && !this.finalPending.waiting.size)
					this.finalizeHub();
			} else {
				this.send(packet, true);
				this.emit("onResult", world);
				this.resultTimer = setTimeout(
					() => this.close({ reason: "finished" }),
					2000,
				);
			}
			return true;
		}
		finalizeHub() {
			const result = this.finalPending;
			if (!result || this.ended) return;
			this.finalPending = null;
			if (this.resultTimer) clearTimeout(this.resultTimer);
			this.resultTimer = null;
			const ids = this.players.filter((p) => !p.left).map((p) => p.id),
				scores = Object.fromEntries(ids.map((id) => [id, result.score]));
			root.AIHub.finish({ standings: [ids], scores, won: result.won });
		}
		close(reason = { reason: "disconnected" }) {
			if (this.ended) return;
			this.ended = true;
			this.active = false;
			this.inputs = this.inputs.map((a) => ({
				...a,
				x: 0,
				y: 0,
				focus: false,
			}));
			if (this.resultTimer) clearTimeout(this.resultTimer);
			for (const fn of this.cleanups) fn();
			this.cleanups = [];
			this.emit("onEnd", typeof reason === "string" ? { reason } : reason);
		}
	}
	async function connectHub(callbacks = {}) {
		if (!root.AIHub) return null;
		const info = await root.AIHub.connect({
			mode: "shared-world",
			seats: [1, 2],
		});
		if (!info) return null;
		const players = info.players.map((p) => ({ ...p }));
		const session = new Session({
			kind: "hub",
			host: !!info.isHost,
			server: !!info.server,
			localIndex: info.server ? -1 : players.findIndex((p) => p.id === info.me),
			players,
			hostId: info.host,
			callbacks,
			transport: (data, reliable, to) =>
				root.AIHub.send(data, {
					reliable,
					...(to === undefined ? {} : { to }),
				}),
		});
		if (callbacks.onConnect) callbacks.onConnect(info, session);
		session.cleanups.push(
			root.AIHub.on("start", () => {
				session.started = true;
				session.emit("onStart");
			}),
		);
		session.cleanups.push(
			root.AIHub.on("message", (data, from) => session.receive(data, from)),
		);
		session.cleanups.push(
			root.AIHub.on("leave", (data) => session.leave(data.id)),
		);
		session.cleanups.push(
			root.AIHub.on("time-up", () => {
				if (!session.ended) session.emit("onTimeUp");
			}),
		);
		session.cleanups.push(root.AIHub.on("end", (data) => session.close(data)));
		root.AIHub.ready();
		return session;
	}
	function encodeDescription(description) {
		return `KBN1.${btoa(JSON.stringify({ v: 1, type: description.type, sdp: description.sdp }))}`;
	}
	function decodeDescription(code, type) {
		if (
			typeof code !== "string" ||
			code.length > 65536 ||
			!code.trim().startsWith("KBN1.")
		)
			throw new Error(
				"That garden code is not valid. Copy the whole code and try again.",
			);
		let data;
		try {
			data = JSON.parse(atob(code.trim().slice(5)));
		} catch {
			throw new Error("That garden code is damaged. Copy it again.");
		}
		if (
			data.v !== 1 ||
			data.type !== type ||
			typeof data.sdp !== "string" ||
			data.sdp.length > 48000 ||
			!data.sdp.startsWith("v=0")
		)
			throw new Error(`That code is the wrong step. Use the ${type} code.`);
		return { type: data.type, sdp: data.sdp };
	}
	class DirectPeer {
		constructor(callbacks = {}) {
			this.callbacks = callbacks;
			this.pc = null;
			this.channel = null;
			this.session = null;
			this.generation = 0;
			this.host = false;
			this.closed = false;
		}
		status(text) {
			if (this.callbacks.onStatus) this.callbacks.onStatus(text);
		}
		begin(host) {
			if (root.AIHub?.active)
				throw new Error("Direct play is unavailable during a Hub round.");
			this.cancel(false);
			this.closed = false;
			this.host = host;
			this.generation++;
			const generation = this.generation;
			if (!root.RTCPeerConnection)
				throw new Error("This browser does not offer direct peer play.");
			this.pc = new root.RTCPeerConnection({ iceServers: [] });
			this.pc.onconnectionstatechange = () => {
				if (generation !== this.generation) return;
				const state = this.pc?.connectionState;
				if (state === "failed" || state === "closed") this.disconnected();
				else if (state === "disconnected") {
					this.disconnectTimer = setTimeout(() => {
						if (this.pc?.connectionState === "disconnected")
							this.disconnected();
					}, 2000);
				} else if (state === "connected" && this.disconnectTimer) {
					clearTimeout(this.disconnectTimer);
					this.disconnectTimer = null;
				}
			};
			if (!host)
				this.pc.ondatachannel = (e) => this.attach(e.channel, generation);
			return generation;
		}
		attach(channel, generation = this.generation) {
			if (channel.label !== "killer-bee-night" || !channel.ordered) {
				channel.close();
				return;
			}
			this.channel = channel;
			channel.onopen = () => {
				if (generation !== this.generation) return;
				const host = this.host;
				const players = [
					{ id: 0, name: "Moon swarm", color: "#ffe9a6" },
					{ id: 1, name: "Dew swarm", color: "#a9eff3" },
				];
				const session = new Session({
					kind: "direct",
					host,
					server: false,
					localIndex: host ? 0 : 1,
					players,
					hostId: 0,
					callbacks: this.callbacks,
					transport: (data) => {
						if (channel.readyState !== "open" || channel.bufferedAmount > 65536)
							return false;
						channel.send(JSON.stringify(data));
						return true;
					},
				});
				this.session = session;
				session.cleanups.push(() => {
					setTimeout(() => {
						if (this.channel === channel) {
							channel.close();
							this.pc?.close();
						}
					}, 50);
				});
				this.status("Connected. The garden is yours.");
				if (this.callbacks.onConnect)
					this.callbacks.onConnect(
						{
							seed: 67261106,
							players,
							isHost: host,
							server: false,
							me: host ? 0 : 1,
							host: 0,
						},
						session,
					);
				session.emit("onStart");
			};
			channel.onmessage = (e) => {
				if (
					generation !== this.generation ||
					typeof e.data !== "string" ||
					e.data.length > 65536
				)
					return;
				let data;
				try {
					data = JSON.parse(e.data);
				} catch {
					return;
				}
				this.session?.receive(data, this.host ? 1 : 0);
			};
			channel.onclose = () => {
				if (generation === this.generation && !this.closed) this.disconnected();
			};
			channel.onerror = () =>
				this.status("The direct link had trouble. Cancel and try again.");
		}
		async gather(generation) {
			const pc = this.pc;
			if (pc.iceGatheringState === "complete") return;
			await new Promise((resolve, reject) => {
				let done = false;
				const finish = () => {
					if (done) return;
					done = true;
					clearTimeout(timer);
					pc.removeEventListener("icegatheringstatechange", change);
					if (generation !== this.generation)
						reject(new Error("Connection cancelled."));
					else resolve();
				};
				const change = () => {
					if (pc.iceGatheringState === "complete") finish();
				};
				const timer = setTimeout(finish, 5000);
				pc.addEventListener("icegatheringstatechange", change);
			});
		}
		async createOffer() {
			const generation = this.begin(true);
			this.status("Preparing your garden code…");
			this.attach(
				this.pc.createDataChannel("killer-bee-night", { ordered: true }),
				generation,
			);
			await this.pc.setLocalDescription(await this.pc.createOffer());
			await this.gather(generation);
			if (!this.pc) throw new Error("Connection cancelled.");
			this.status("Send this offer to your friend. Then apply their answer.");
			return encodeDescription(this.pc.localDescription);
		}
		async acceptOffer(code) {
			const offer = decodeDescription(code, "offer");
			const generation = this.begin(false);
			this.status("Preparing your answer…");
			await this.pc.setRemoteDescription(offer);
			await this.pc.setLocalDescription(await this.pc.createAnswer());
			await this.gather(generation);
			if (!this.pc) throw new Error("Connection cancelled.");
			this.status("Send this answer back. Keep this screen open.");
			return encodeDescription(this.pc.localDescription);
		}
		async applyAnswer(code) {
			if (!this.pc || !this.host) throw new Error("Create an offer first.");
			const answer = decodeDescription(code, "answer");
			await this.pc.setRemoteDescription(answer);
			this.status("Linking the two gardens…");
		}
		disconnected() {
			if (this.closed || this.session?.ended) return;
			if (this.session?.finished) {
				this.session.close({ reason: "finished" });
				return;
			}
			this.status(
				"The other garden disconnected. Return to Title to reconnect.",
			);
			this.session?.close({ reason: "disconnected" });
			if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
		}
		cancel(notify = true) {
			this.closed = true;
			this.generation++;
			if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
			this.disconnectTimer = null;
			this.session?.close({ reason: "cancelled" });
			this.session = null;
			if (this.channel) {
				this.channel.onclose = null;
				this.channel.close();
			}
			this.channel = null;
			if (this.pc) {
				this.pc.onconnectionstatechange = null;
				this.pc.close();
			}
			this.pc = null;
			if (notify) this.status("Connection cancelled.");
		}
	}
	root.NightNet = {
		connectHub,
		DirectPeer,
		Session,
		pack,
		unpack,
		validateAction: action,
		encodeDescription,
		decodeDescription,
		bytes,
	};
})(globalThis);
