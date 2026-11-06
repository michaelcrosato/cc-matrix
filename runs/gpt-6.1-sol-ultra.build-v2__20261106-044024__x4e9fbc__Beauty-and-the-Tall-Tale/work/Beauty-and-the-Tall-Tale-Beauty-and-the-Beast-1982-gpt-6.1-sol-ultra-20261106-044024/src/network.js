/* Beauty and the Tall Tale — host-authoritative AI Hub adapter.
 * The only transport used here is the released AIHub session client.
 * Intention edges are retained until the host acknowledges their application.
 */
((root) => {
	root.TallTale = root.TallTale || root.TT || {};
	root.TT = root.TallTale;
	const TT = root.TallTale;
	const STEP = 1 / 120;
	const SEND_MS = 1000 / 12;
	const neutral = () => ({
		x: 0,
		up: false,
		down: false,
		jump: false,
		jumpPressed: false,
	});
	const integer = (n) => Number.isSafeInteger(n) && n >= 0;
	const finite = (n) => typeof n === "number" && Number.isFinite(n);
	const copyIntent = (a) => ({
		x: finite(a?.x) ? Math.max(-1, Math.min(1, a.x)) : 0,
		up: a?.up === true,
		down: a?.down === true,
		jump: a?.jump === true,
		jumpPressed: a?.jumpPressed === true,
		assist: a?.assist === true,
	});

	class Network {
		constructor(options = {}) {
			this.options = options;
			this.hub = options.hub || root.AIHub;
			this.active = this.hub?.active === true;
			this.info = null;
			this.sim = null;
			this.server = false;
			this.started = false;
			this.ended = false;
			this.finished = false;
			this.readySent = false;
			this.accumulator = 0;
			this.lastSend = -Infinity;
			this.lastSnapshot = -1;
			this.sequence = 0;
			this.eventSequence = 0;
			this.pending = [];
			this.history = [];
			this.members = new Set();
			this.remote = new Map();
			this.removers = [];
			this.local = neutral();
			this.previous = neutral();
			this.received = null;
			this.renderPlayers = [];
			this.lastCritical = "";
			this.metrics = {
				sent: 0,
				received: 0,
				stale: 0,
				rejected: 0,
				bytes: 0,
				maxBytes: 0,
				maxRoutineBytes: 0,
				appliedEdges: 0,
				postEndSends: 0,
			};
		}

		get localSeat() {
			if (this.server || !this.info) return null;
			const actor = (this.sim?.actors || this.sim?.players || []).find(
				(p) => p.id === this.info.me,
			);
			return (
				actor?.seat ??
				this.info.players.findIndex((p) => p.id === this.info.me) + 1
			);
		}

		get canPlay() {
			return (
				this.active &&
				this.started &&
				!this.ended &&
				!this.finished &&
				this.hub.time() >= 0
			);
		}

		async connect() {
			if (!this.hub) return null;
			const info = await this.hub.connect({
				mode: "shared-world",
				seats: [1, 2],
			});
			if (!info) {
				this.active = false;
				return null;
			}
			this.info = info;
			this.active = true;
			this.server = info.server === true;
			this.members = new Set(info.players.map((p) => p.id));
			// Retain these streams. Reconstructing a labelled RNG restarts it.
			this.rng = this.hub.rng("tower");
			this.cosmeticRng = this.hub.rng("presentation");
			this.sim = this.options.create(info, this.rng);
			if (!this.sim || typeof this.sim.step !== "function")
				throw new Error("Hub requires the shared tower simulation");
			for (const p of info.players) {
				this.remote.set(p.id, {
					sequence: -1,
					edge: 0,
					ack: 0,
					at: -Infinity,
					intent: neutral(),
					edges: [],
					pulse: 0,
				});
			}
			this.options.onState?.(this.sim, info);
			const on = (type, fn) => this.removers.push(this.hub.on(type, fn));
			on("start", () => {
				if (this.ended) return;
				this.started = true;
				this.accumulator = 0;
				this.options.onStart?.();
			});
			on("message", (data, from) => this.receive(data, from));
			on("leave", ({ id }) => {
				this.members.delete(id);
				this.remote.delete(id);
				if (this.info.isHost) this.sim.removePlayer(id);
				this.options.onLeave?.(id);
			});
			on("time-up", () => {
				if (this.info.isHost && !this.ended) this.finish("time-up");
			});
			on("end", (event) => {
				if (this.ended) return;
				this.ended = true;
				this.accumulator = 0;
				this.local = neutral();
				this.pending.length = 0;
				this.history.length = 0;
				for (const r of this.remote.values()) {
					r.intent = neutral();
					r.edges.length = 0;
				}
				this.options.onEnd?.(event);
			});
			this.hub.probe?.(() => ({
				scene: this.ended ? "ended" : this.canPlay ? this.sim.phase : "waiting",
				menu: false,
				world: {
					tick: this.sim.tick,
					section: this.sim.section,
					score: this.sim.score,
					rescued: this.sim.rescued,
				},
				input: {
					assignedSeat: this.server ? null : info.me,
					server: this.server,
				},
			}));
			// The Hub supplies its default instruction/ready card. No player gesture.
			this.hub.ready();
			this.readySent = true;
			return info;
		}

		setIntent(value) {
			if (this.ended || this.server) return;
			const next = copyIntent(value);
			if (
				(next.jumpPressed && !this.previous.jumpPressed) ||
				(next.jump && !this.previous.jump)
			)
				this.pushEdge(1);
			if (next.up && !this.previous.up) this.pushEdge(2);
			if (next.down && !this.previous.down) this.pushEdge(3);
			this.local = next;
			this.previous = next;
		}

		pushEdge(type) {
			// Preserve all ordinary taps while bounding a pathological input source.
			if (this.pending.length >= 32) return;
			this.pending.push([++this.eventSequence, type]);
		}

		receive(message, from) {
			if (this.ended || !message || typeof message !== "object") return;
			if (this.info.isHost && message.t === "i")
				return this.receiveIntent(message, from);
			if (!this.info.isHost && from === this.info.host && message.t === "s")
				return this.receiveSnapshot(message);
			this.metrics.rejected++;
		}

		receiveIntent(m, from) {
			const seat = this.remote.get(from);
			if (
				!seat ||
				!this.members.has(from) ||
				!integer(m.n) ||
				m.n > seat.sequence + 4096 ||
				!integer(m.k) ||
				m.k < this.sim.tick - 600 ||
				m.k > this.sim.tick + 240 ||
				!finite(m.x) ||
				m.x < -1 ||
				m.x > 1 ||
				!integer(m.b) ||
				m.b > 15 ||
				!Array.isArray(m.e) ||
				m.e.length > 32
			) {
				this.metrics.rejected++;
				return;
			}
			// Edge IDs are independent of ordinary packet IDs, so a reordered state
			// packet cannot erase a jump sent in a newer/older reliable packet.
			for (const edge of m.e) {
				if (
					!Array.isArray(edge) ||
					!integer(edge[0]) ||
					edge[0] <= seat.edge ||
					edge[0] > seat.edge + 128 ||
					![1, 2, 3].includes(edge[1])
				)
					continue;
				if (!seat.edges.some((x) => x[0] === edge[0])) seat.edges.push(edge);
			}
			seat.edges.sort((a, b) => a[0] - b[0]);
			if (m.n <= seat.sequence) {
				this.metrics.stale++;
				return;
			}
			seat.sequence = m.n;
			seat.at = this.hub.time();
			seat.intent = {
				x: m.x,
				up: !!(m.b & 1),
				down: !!(m.b & 2),
				jump: !!(m.b & 4),
				assist: !!(m.b & 8),
				jumpPressed: false,
			};
			this.metrics.received++;
		}

		receiveSnapshot(m) {
			if (
				!integer(m.n) ||
				!integer(m.k) ||
				!Array.isArray(m.a) ||
				!m.w ||
				typeof m.w !== "object"
			) {
				this.metrics.rejected++;
				return;
			}
			if (m.n <= this.lastSnapshot || m.k < (this.received?.k ?? 0)) {
				this.metrics.stale++;
				return;
			}
			this.lastSnapshot = m.n;
			this.received = m;
			this.metrics.received++;
			const ack = m.a.find((a) => a[0] === this.info.me);
			if (ack) {
				this.pending = this.pending.filter((e) => e[0] > ack[2]);
				this.history = this.history.filter((i) => i.n > ack[1]);
			}
			this.sim.applyCompact(m.w);
			// Presentation interpolation never changes authoritative simulation.
			const previous = new Map(this.renderPlayers.map((p) => [p.id, p]));
			this.renderPlayers = (this.sim.actors || this.sim.players).map((p) => ({
				id: p.id,
				x: previous.get(p.id)?.x ?? p.body.x,
				z: previous.get(p.id)?.z ?? p.body.z,
				tx: p.body.x,
				tz: p.body.z,
			}));
			// Optional actor-only prediction is reset from authority, then only
			// unacknowledged locomotion is replayed; it cannot award or hit anything.
			this.options.reconcile?.(
				this.sim,
				this.history.slice(),
				this.pending.slice(),
			);
			this.options.onSnapshot?.(m.w);
		}

		update(dt, now = performance.now()) {
			if (!this.active || !this.sim || this.ended) return;
			if (!this.started || this.hub.time() < 0) {
				this.local = neutral();
				this.previous = neutral();
				this.pending.length = 0;
				this.options.onCountdown?.(this.hub.time());
				return;
			}
			if (this.finished) return;
			if (!this.server) this.setIntent(this.options.getIntent?.() || neutral());
			dt = Math.max(0, Math.min(0.25, Number(dt) || 0));
			if (this.info.isHost) {
				this.accumulator += dt;
				while (this.accumulator >= STEP && !this.ended && !this.finished) {
					this.accumulator -= STEP;
					this.stepHost(STEP);
				}
			} else {
				const f = 1 - Math.exp(-dt * 16);
				for (const p of this.renderPlayers) {
					p.x += (p.tx - p.x) * f;
					p.z += (p.tz - p.z) * f;
				}
				this.options.predict?.(dt, this.local);
			}
			// One shared outgoing scheduler for snapshots/inputs/critical changes.
			// At 12Hz it stays below the Hub's 20 messages/s allowance.
			if (now - this.lastSend >= SEND_MS) {
				this.lastSend = now;
				if (this.info.isHost) this.sendSnapshot();
				else this.sendIntent();
			}
			if (this.info.isHost && ["results", "failed"].includes(this.sim.phase))
				this.finish(this.sim.phase);
		}

		stepHost(dt) {
			const intents = {};
			for (const id of this.members) {
				const seat = this.remote.get(id);
				const input =
					id === this.info.me && !this.server
						? { ...this.local }
						: {
								...(this.hub.time() - seat.at <= 800 ? seat.intent : neutral()),
							};
				const edges =
					id === this.info.me && !this.server ? this.pending : seat.edges;
				input.jumpPressed = false;
				for (const [number, type] of edges) {
					if (number <= seat.edge) continue;
					if (type === 1) {
						input.jumpPressed = true;
						input.jump = true;
					}
					if (type === 2) {
						input.up = true;
						seat.pulse = Math.max(seat.pulse, 0.13);
					}
					if (type === 3) input.down = true;
					seat.edge = number;
					this.metrics.appliedEdges++;
				}
				edges.length = 0;
				if (seat.pulse > 0) {
					input.up = true;
					seat.pulse -= dt;
				}
				intents[id] = input;
				seat.ack = seat.sequence;
			}
			this.sim.step(dt, intents);
		}

		sendIntent() {
			const n = ++this.sequence;
			const m = {
				t: "i",
				n,
				k: this.received?.k ?? this.sim.tick ?? 0,
				x: Math.round(this.local.x * 100) / 100,
				b:
					(this.local.up ? 1 : 0) |
					(this.local.down ? 2 : 0) |
					(this.local.jump ? 4 : 0) |
					(this.local.assist ? 8 : 0),
				e: this.pending.slice(),
			};
			this.history.push({
				n,
				k: m.k,
				intent: { ...this.local },
				dt: SEND_MS / 1000,
			});
			if (this.history.length > 180) this.history.shift();
			this.send(m, { to: this.info.host, reliable: this.pending.length > 0 });
		}

		sendSnapshot(forceReliable = false) {
			const critical = [
				this.sim.section,
				this.sim.phase,
				this.sim.score,
				this.sim.chances,
				this.sim.rescued,
			].join("|");
			const reliable = forceReliable || critical !== this.lastCritical;
			this.lastCritical = critical;
			const m = {
				t: "s",
				n: ++this.sequence,
				k: this.sim.tick,
				a: [...this.remote]
					.filter(([id]) => this.members.has(id))
					.map(([id, r]) => [id, r.ack, r.edge]),
				w: this.sim.compactSnapshot(),
			};
			this.send(m, { reliable });
		}

		send(data, options) {
			if (this.ended) {
				this.metrics.postEndSends++;
				return false;
			}
			const bytes = new TextEncoder().encode(JSON.stringify(data)).byteLength;
			if (bytes > 16384) {
				this.metrics.rejected++;
				return false;
			}
			// Larger world snapshots use a reliable packet rather than fragile
			// unreliable fragmentation; compact routine traffic is measured.
			if (bytes > 1200) options.reliable = true;
			const sent = this.hub.send(data, options);
			if (sent !== false) {
				this.metrics.sent++;
				this.metrics.bytes += bytes;
				this.metrics.maxBytes = Math.max(this.metrics.maxBytes, bytes);
				if (!options.reliable)
					this.metrics.maxRoutineBytes = Math.max(
						this.metrics.maxRoutineBytes,
						bytes,
					);
			}
			return sent;
		}

		finish(reason) {
			if (!this.info?.isHost || this.ended || this.finished) return;
			this.finished = true;
			this.local = neutral();
			// Rescue is committed before departure. A time-up honours that commit,
			// while ordinary completion waits until the nine-second departure ends.
			const won = this.sim.rescued === true;
			this.sendSnapshot(true);
			const ids = [...this.members];
			const scores = Object.fromEntries(
				ids.map((id) => [id, Number(this.sim.score) || 0]),
			);
			const stats = Object.fromEntries(
				ids.map((id) => [
					id,
					{
						"Tower floors":
							this.sim.section * 4 + Math.min(4, this.sim.roofBeat || 0),
						"Team score": this.sim.score,
						Rescued: won ? "Mabel is safe" : "Still climbing",
						Finish: reason,
					},
				]),
			);
			this.hub.finish({ standings: [ids], scores, won, stats });
			this.options.onFinish?.({ won, reason });
		}

		diagnostics() {
			return {
				active: this.active,
				started: this.started,
				ended: this.ended,
				finished: this.finished,
				server: this.server,
				assignedId: this.server ? null : this.info?.me,
				members: [...this.members],
				pendingEdges: this.pending.length,
				history: this.history.length,
				...this.metrics,
			};
		}

		dispose() {
			this.ended = true;
			this.pending.length = 0;
			this.history.length = 0;
			this.local = neutral();
			for (const remove of this.removers.splice(0)) remove();
		}
	}
	TT.Network = Network;
	if (typeof module !== "undefined") module.exports = Network;
})(typeof window === "undefined" ? globalThis : window);
