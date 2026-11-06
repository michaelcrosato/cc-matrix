/* Turtle Shell Service — authoritative AI Hub application protocol, version 1. */
(() => {
	"use strict";
	const T = (globalThis.TSS ||= {});
	const clone = (value) => JSON.parse(JSON.stringify(value));
	const NONE = Object.freeze({ dir: -1, bomb: false, confirm: false });
	const int = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
	const intentOf = (value) => ({
		dir: int(value?.dir, -1, 3) ? value.dir : -1,
		bomb: value?.bomb === true,
		confirm: value?.confirm === true,
	});

	/**
	 * One authority owns every game rule. Other copies send cardinal intentions,
	 * and predict only their turtle's presentation through Simulation.predictPlayer.
	 * No client position, pickup, inventory, enemy or score is ever accepted.
	 */
	class Network {
		constructor({ hub, info, createSimulation, onEvent, onStatus, onEnd }) {
			if (!hub || !info || info.mode !== "shared-world")
				throw new Error("A shared-world Hub welcome is required");
			this.hub = hub;
			this.info = info;
			this.isHost = info.isHost === true;
			this.server = info.server === true;
			this.onEvent = onEvent || (() => {});
			this.onStatus = onStatus || (() => {});
			this.onEnd = onEnd || (() => {});
			this.playerSeats = new Map(info.players.map((p, i) => [p.id, i + 1]));
			this.remaining = new Set(info.players.map((p) => p.id));
			this.localSeat = this.server
				? null
				: (this.playerSeats.get(info.me) ?? null);
			const rng = hub.rng("turtle-shell-service/world/v1");
			const seed = (rng() * 4294967296) >>> 0;
			this.runId = `tss-${info.round}-${seed.toString(36)}`;
			this.sim = createSimulation({
				seed,
				seats: [...this.playerSeats.values()],
				runId: this.runId,
				demo: false,
			});
			this.readyCalled = false;
			this.started = false;
			this.playing = false;
			this.ended = false;
			this.finished = false;
			this.timedOut = false;
			this.disposed = false;
			this.elapsed = 0;
			this.inputSeq = 0;
			this.snapshotSeq = 0;
			this.lastSnapshotSeq = -1;
			this.lastSnapshotTick = -1;
			this.lastSnapshotFloor = -1;
			this.lastSnapshotAt = -Infinity;
			this.lastSentAt = -Infinity;
			this.lastBroadcastAt = -Infinity;
			this.lastSignature = "";
			this.lastPhase = this.sim.state.phase;
			this.lastFloor = this.sim.state.floor;
			this.localIntent = { ...NONE };
			this.localButtons = { bomb: false, confirm: false };
			this.actionCounters = { bomb: 0, confirm: 0 };
			this.localPending = { bomb: 0, confirm: 0, pulse: false };
			this.controls = new Map();
			this.seenEvents = new Set();
			this.eventOrder = [];
			this.inputHistory = [];
			this.predicted = null;
			this.remotePresentation = new Map();
			this.metrics = {
				sent: 0,
				received: 0,
				acceptedInputs: 0,
				rejectedInputs: 0,
				snapshots: 0,
				ready: 0,
				finish: 0,
				largestBytes: 0,
			};
			for (const [id] of this.playerSeats)
				this.controls.set(id, {
					seq: -1,
					dir: -1,
					bomb: 0,
					confirm: 0,
					pendingBomb: 0,
					pendingConfirm: 0,
					pulse: false,
					at: -Infinity,
					rateStart: 0,
					rateCount: 0,
				});
			this.unsubscribers = [
				hub.on("start", () => {
					if (this.ended) return;
					this.started = true;
					this.onStatus("Ready for the bell!");
				}),
				hub.on("message", (data, from) => this.receive(data, from)),
				hub.on("leave", (detail) => this.leave(detail)),
				hub.on("time-up", () => {
					if (this.ended || this.disposed) return;
					this.timedOut = true;
					this.playing = false;
					this.localIntent = { ...NONE };
					if (this.isHost) this.finish(false);
				}),
				hub.on("end", (detail) => this.end(detail)),
			];
		}

		ready() {
			if (this.readyCalled || this.ended || this.disposed) return;
			this.readyCalled = true;
			this.metrics.ready++;
			this.hub.ready();
			if (this.isHost) this.broadcast(true);
		}

		emitEvents(events) {
			for (const event of events || []) {
				if (!event?.id || this.seenEvents.has(event.id)) continue;
				this.seenEvents.add(event.id);
				this.eventOrder.push(event.id);
				// Recovery snapshots may still include the previous floor's event ring.
				// Remember their IDs without reviving obsolete effects or guidance.
				if (event.floor === undefined || event.floor === this.sim.state.floor)
					this.onEvent(event);
			}
			while (this.eventOrder.length > 1024)
				this.seenEvents.delete(this.eventOrder.shift());
		}

		send(data, options) {
			if (this.ended || this.disposed) return false;
			const bytes = JSON.stringify(data).length;
			this.metrics.largestBytes = Math.max(this.metrics.largestBytes, bytes);
			if (bytes > 16384)
				throw new Error(`TSS packet exceeds Hub's 16 KB JSON limit (${bytes})`);
			const accepted = this.hub.send(data, options);
			if (accepted !== false) this.metrics.sent++;
			return accepted !== false;
		}

		envelope(type) {
			return { t: type, v: 1, r: this.runId };
		}

		broadcast(reliable = false) {
			if (!this.isHost || this.ended || this.disposed) return;
			const state = this.sim.snapshot();
			const at = this.hub.time();
			this.send(
				{
					...this.envelope("s"),
					q: ++this.snapshotSeq,
					f: state.floor,
					k: state.tick,
					a: Number.isFinite(at) ? Math.round(at) : -1,
					s: state,
				},
				{ reliable },
			);
			this.lastBroadcastAt = this.elapsed;
		}

		receive(data, from) {
			if (
				this.ended ||
				this.disposed ||
				!data ||
				data.v !== 1 ||
				data.r !== this.runId
			)
				return;
			this.metrics.received++;
			if (this.isHost) {
				if (data.t === "i") this.receiveInput(data, from);
			} else if (data.t === "s" && from === this.info.host) {
				this.receiveSnapshot(data);
			}
		}

		receiveInput(data, from) {
			const control = this.controls.get(from);
			const reject = () => {
				this.metrics.rejectedInputs++;
			};
			if (
				!control ||
				!this.remaining.has(from) ||
				from === this.info.me ||
				this.finished
			)
				return reject();
			// Only authenticated transport sender decides the seat. Packets have no seat field.
			if (
				!int(data.q, 0, 2147483647) ||
				data.q <= control.seq ||
				!int(data.d, -1, 3) ||
				!int(data.b, 0, 1000000000) ||
				!int(data.c, 0, 1000000000) ||
				data.b < control.bomb ||
				data.c < control.confirm ||
				data.f !== this.sim.state.floor ||
				!this.started ||
				!Number.isFinite(this.hub.time()) ||
				this.hub.time() < 0
			)
				return reject();
			if (this.elapsed - control.rateStart >= 1) {
				control.rateStart = this.elapsed;
				control.rateCount = 0;
			}
			if (++control.rateCount > 24) return reject();
			control.seq = data.q;
			control.dir = data.d;
			// Cumulative counters recover a lost edge, while duplicates cannot spend twice.
			if (data.b > control.bomb) control.pendingBomb = 1;
			if (data.c > control.confirm) control.pendingConfirm = 1;
			control.bomb = data.b;
			control.confirm = data.c;
			control.at = this.elapsed;
			this.metrics.acceptedInputs++;
		}

		receiveSnapshot(data) {
			if (
				!int(data.q, 1, 2147483647) ||
				data.q <= this.lastSnapshotSeq ||
				!int(data.k, 0, Number.MAX_SAFE_INTEGER) ||
				data.k < this.lastSnapshotTick ||
				!int(data.f, 0, 4) ||
				data.f < this.lastSnapshotFloor ||
				!data.s ||
				data.s.runId !== this.runId ||
				data.s.floor !== data.f ||
				data.s.tick !== data.k
			)
				return;
			const changedFloor = data.f !== this.lastSnapshotFloor;
			this.lastSnapshotSeq = data.q;
			this.lastSnapshotTick = data.k;
			this.lastSnapshotFloor = data.f;
			this.lastSnapshotAt = this.elapsed;
			this.metrics.snapshots++;
			if (changedFloor) {
				this.remotePresentation.clear();
				this.predicted = null;
				this.inputHistory = [];
				this.lastSignature = "";
			}
			this.sim.loadSnapshot(data.s);
			this.emitEvents(data.s.recentEvents || []);
			const mine = data.s.players?.find(
				(p) => p.seat === this.localSeat && p.active,
			);
			if (mine) {
				this.predicted = clone(mine);
				const hubNow = this.hub.time();
				const age =
					Number.isFinite(hubNow) && data.a >= 0
						? Math.min(0.25, Math.max(0, (hubNow - data.a) / 1000))
						: 0;
				if (
					this.playing &&
					data.s.phase === "play" &&
					!mine.hurt &&
					typeof this.sim.predictPlayer === "function"
				) {
					let left = age;
					// Reconciliation replays recent intentions using the authoritative collision graph.
					for (const sample of this.inputHistory) {
						if (sample.at + sample.dt < this.elapsed - age) continue;
						const amount = Math.min(left, sample.dt);
						if (amount > 0)
							this.sim.predictPlayer(this.predicted, sample.intent, amount);
						left -= amount;
						if (left <= 0) break;
					}
				}
			}
		}

		captureLocal(intent) {
			this.localIntent = intentOf(intent);
			for (const key of ["bomb", "confirm"]) {
				if (this.localIntent[key] && !this.localButtons[key]) {
					this.actionCounters[key]++;
					this.localPending[key] = 1;
				}
				this.localButtons[key] = this.localIntent[key];
			}
		}

		hostIntents() {
			const intents = {};
			for (const [id, seat] of this.playerSeats) {
				if (!this.remaining.has(id)) continue;
				if (id === this.info.me && !this.server) {
					intents[seat] = { ...this.localIntent };
					continue;
				}
				const c = this.controls.get(id);
				if (!c) continue;
				const pulse = !c.pulse;
				intents[seat] = {
					dir: this.elapsed - c.at > 0.65 ? -1 : c.dir,
					bomb: pulse && c.pendingBomb > 0,
					confirm: pulse && c.pendingConfirm > 0,
				};
				if (pulse) {
					c.pendingBomb = 0;
					c.pendingConfirm = 0;
				}
				c.pulse = intents[seat].bomb || intents[seat].confirm;
			}
			return intents;
		}

		update(dt, rawIntent = NONE) {
			if (this.ended || this.disposed) return;
			dt = Number.isFinite(dt) ? Math.min(0.1, Math.max(0, dt)) : 0;
			this.elapsed += dt;
			const clock = this.hub.time();
			this.playing =
				this.started &&
				Number.isFinite(clock) &&
				clock >= 0 &&
				!this.finished &&
				!this.timedOut;
			this.captureLocal(
				this.playing && this.localSeat !== null ? rawIntent : NONE,
			);
			if (!this.playing) {
				if (
					this.isHost &&
					this.readyCalled &&
					this.elapsed - this.lastBroadcastAt >= 0.5
				)
					this.broadcast(false);
				return;
			}
			if (this.isHost) {
				this.sim.step(dt, this.hostIntents());
				this.emitEvents(this.sim.events);
				const state = this.sim.state;
				const important =
					state.phase !== this.lastPhase || state.floor !== this.lastFloor;
				this.lastPhase = state.phase;
				this.lastFloor = state.floor;
				if (important || this.elapsed - this.lastBroadcastAt >= 0.1)
					this.broadcast(important);
				if (state.terminal || state.phase === "won" || state.phase === "lost")
					this.finish(state.terminal === "won" || state.phase === "won");
			} else {
				const at = this.hub.time();
				this.inputHistory.push({
					at: this.elapsed,
					dt,
					intent: { ...this.localIntent },
				});
				while (
					this.inputHistory.length &&
					this.inputHistory[0].at < this.elapsed - 0.4
				)
					this.inputHistory.shift();
				const state = this.sim.state;
				if (
					this.predicted &&
					state.phase === "play" &&
					!this.predicted.hurt &&
					typeof this.sim.predictPlayer === "function"
				) {
					this.sim.predictPlayer(this.predicted, this.localIntent, dt);
					const authoritative = state.players.find(
						(p) => p.seat === this.localSeat,
					);
					// No response may drift farther than a quarter second of legal movement.
					const limit = Math.max(
						8,
						(state.balance?.playerSpeed || 3.5) * 16 * 0.25,
					);
					if (
						authoritative &&
						Math.hypot(
							this.predicted.x - authoritative.x,
							this.predicted.y - authoritative.y,
						) > limit
					)
						this.predicted = clone(authoritative);
				}
				const signature = `${this.localIntent.dir}/${this.actionCounters.bomb}/${this.actionCounters.confirm}/${state.floor}`;
				const elapsedSinceSend = this.elapsed - this.lastSentAt;
				if (
					(signature !== this.lastSignature && elapsedSinceSend >= 1 / 15) ||
					elapsedSinceSend >= 0.2
				) {
					this.send(
						{
							...this.envelope("i"),
							q: ++this.inputSeq,
							f: state.floor,
							d: this.localIntent.dir,
							b: this.actionCounters.bomb,
							c: this.actionCounters.confirm,
							a: Number.isFinite(at) ? Math.round(at) : 0,
						},
						{ to: this.info.host, reliable: false },
					);
					this.lastSignature = signature;
					this.lastSentAt = this.elapsed;
				}
			}
		}

		leave({ id }) {
			if (this.ended || this.disposed || !this.remaining.has(id)) return;
			this.remaining.delete(id);
			const seat = this.playerSeats.get(id);
			if (this.isHost && seat != null) {
				this.sim.removeSeat(seat);
				this.emitEvents(this.sim.events);
				this.broadcast(true);
			}
			this.onStatus(
				"A rescuer left. The remaining turtle can bring everyone home.",
			);
			// Host loss is voided by the Hub. There is deliberately no host migration.
		}

		finish(won) {
			if (!this.isHost || this.finished || this.ended || this.disposed) return;
			this.finished = true;
			this.playing = false;
			this.localIntent = { ...NONE };
			this.broadcast(true);
			const state = this.sim.state;
			const ids = [...this.remaining].sort((a, b) => a - b);
			this.metrics.finish++;
			this.hub.finish({
				standings: [ids],
				scores: Object.fromEntries(ids.map((id) => [id, state.score || 0])),
				won: won === true,
				stats: Object.fromEntries(
					ids.map((id) => [
						id,
						{
							"Family reunited": state.totalRescued || 0,
							"Team score": state.score || 0,
							Seconds: Math.round(state.time || 0),
						},
					]),
				),
			});
		}

		end(detail) {
			if (this.ended || this.disposed) return;
			this.ended = true;
			this.playing = false;
			this.localIntent = { ...NONE };
			this.predicted = null;
			this.inputHistory = [];
			this.remotePresentation.clear();
			this.onEnd(detail);
		}

		authoritativeSnapshot() {
			return this.sim.snapshot();
		}

		snapshot() {
			const state = this.sim.snapshot();
			if (this.isHost || this.ended) return state;
			for (const p of state.players || []) {
				if (!p.active) continue;
				if (
					p.seat === this.localSeat &&
					this.predicted &&
					state.phase === "play"
				) {
					for (const key of ["x", "y", "dir", "vx", "vy"])
						if (this.predicted[key] !== undefined) p[key] = this.predicted[key];
				} else {
					const previous = this.remotePresentation.get(p.id);
					if (
						previous &&
						previous.floor === state.floor &&
						Math.hypot(p.x - previous.x, p.y - previous.y) < 32 &&
						!p.hurt
					) {
						const k = Math.min(
							1,
							Math.max(0.16, (this.elapsed - previous.at) * 18),
						);
						p.x = previous.x + (p.x - previous.x) * k;
						p.y = previous.y + (p.y - previous.y) * k;
					}
					this.remotePresentation.set(p.id, {
						x: p.x,
						y: p.y,
						floor: state.floor,
						at: this.elapsed,
					});
				}
			}
			return state;
		}

		inspect() {
			return {
				protocol: 1,
				client: this.hub.version || "unknown",
				runId: this.runId,
				localSeat: this.localSeat,
				host: this.isHost,
				server: this.server,
				started: this.started,
				playing: this.playing,
				ended: this.ended,
				finished: this.finished,
				countdownMs: this.hub.time(),
				...this.metrics,
			};
		}

		dispose() {
			if (this.disposed) return;
			this.disposed = true;
			this.playing = false;
			this.localIntent = { ...NONE };
			this.unsubscribers.forEach((off) => off());
			this.unsubscribers = [];
		}
	}
	T.Network = Network;
})();
