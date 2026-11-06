/* AI Hub v1 shared-world adapter. Sender identities come only from the client. */
(function (root) {
	"use strict";
	const F = root.Moonriders;
	const number = (n) => Number.isFinite(n),
		round = (n) => Math.round(n * 100) / 100;
	class Network {
		constructor(app, hub, info) {
			this.app = app;
			this.hub = hub;
			this.info = info;
			this.roster = info.players.map((p) => p.id);
			this.initial = [...this.roster];
			this.authority = !!info.isHost;
			this.started = false;
			this.ended = false;
			this.finished = false;
			this.sequence = 0;
			this.received = new Map();
			this.intents = {};
			this.inputDue = 0;
			this.stateDue = 0;
			this.snapshotTick = -1;
			this.rejected = 0;
			this.dropped = 0;
			this.maxBytes = 0;
			this.sentTimes = [];
			this.maxRate = 0;
			this.runId = `hub-${info.seed}-${info.round}`;
			this.lastSnapshot = null;
			this.renderState = null;
			this.readyCount = 0;
			hub.on("start", () => {
				this.started = true;
				app.clearInput();
			});
			hub.on("message", (data, from) => this.receive(data, from));
			hub.on("leave", ({ id }) => {
				this.roster = this.roster.filter((x) => x !== id);
				delete this.intents[id];
				this.received.delete(id);
				if (this.authority) app.sim.setRoster(this.roster);
				app.clearInput();
			});
			hub.on("time-up", () => {
				if (this.authority && !this.ended) {
					app.sim.finish(false, "The evacuation window has closed.");
					this.finish();
				}
			});
			hub.on("end", (event) => {
				this.ended = true;
				app.ended = true;
				app.clearInput();
				app.sound.stop();
				app.onHubEnd(event.reason);
			});
		}
		ready() {
			if (this.readyCount) return;
			this.readyCount++;
			this.hub.ready();
		}
		validInput(d) {
			return (
				d &&
				d.v === 1 &&
				d.k === "i" &&
				d.run === this.runId &&
				Number.isInteger(d.seq) &&
				d.seq >= 0 &&
				d.seq < 1e10 &&
				Number.isInteger(d.tick) &&
				Math.abs(d.tick - this.app.sim.s.tick) < 720 &&
				d.a &&
				["mx", "my", "ax", "ay"].every(
					(k) => number(d.a[k]) && Math.abs(d.a[k]) <= 1.001,
				) &&
				typeof d.a.fire === "boolean" &&
				typeof d.a.warp === "boolean"
			);
		}
		receive(d, from) {
			if (this.ended || !d || d.run !== this.runId || d.v !== 1) {
				this.rejected++;
				return;
			}
			if (this.authority) {
				if (
					!this.roster.includes(from) ||
					from === this.info.me ||
					!this.validInput(d) ||
					d.seq <= (this.received.get(from) ?? -1)
				) {
					this.rejected++;
					return;
				}
				this.received.set(from, d.seq);
				this.intents[from] = { a: F.intent(d.a), t: this.app.game.real };
				return;
			}
			if (
				from !== this.info.host ||
				d.k !== "s" ||
				!Number.isInteger(d.tick) ||
				d.tick <= this.snapshotTick ||
				!d.s ||
				!this.validState(d.s)
			) {
				this.rejected++;
				return;
			}
			this.snapshotTick = d.tick;
			this.lastSnapshot = d.s;
			this.renderState = F.clone(d.s);
			this.app.sim.s = F.clone(d.s);
			this.app.sim.s.runId = this.runId;
			if (
				Array.isArray(d.roster) &&
				d.roster.every((id) => this.initial.includes(id))
			)
				this.roster = d.roster;
			this.app.sim.roster = [...this.roster];
		}
		validState(s) {
			return (
				s.runId === this.runId &&
				s.ship &&
				["x", "y", "energy", "hull", "vx", "vy"].every((k) =>
					number(s.ship[k]),
				) &&
				Array.isArray(s.entities) &&
				s.entities.length <= 220 &&
				s.entities.every(
					(q) => typeof q.id === "string" && number(q.x) && number(q.y),
				) &&
				Array.isArray(s.rescued) &&
				Array.isArray(s.lost) &&
				number(s.score) &&
				Number.isInteger(s.sector) &&
				s.sector >= 0 &&
				s.sector <= 3 &&
				["victory", "failure", null].includes(s.outcome)
			);
		}
		send(data, options) {
			if (this.ended) return false;
			const bytes = new TextEncoder().encode(JSON.stringify(data)).length;
			this.maxBytes = Math.max(this.maxBytes, bytes);
			if (bytes > 16384) {
				this.app.game.fail("Hub snapshot", Error(`Snapshot is ${bytes} bytes`));
				return false;
			}
			const t = this.app.game.real;
			this.sentTimes = this.sentTimes.filter((x) => t - x < 1 - 1e-6);
			this.sentTimes.push(t);
			this.maxRate = Math.max(this.maxRate, this.sentTimes.length);
			const ok = this.hub.send(data, options);
			if (!ok) this.dropped++;
			return ok;
		}
		compact() {
			const s = this.app.sim.snapshot();
			delete s.balance;
			delete s.target;
			delete s.objective;
			delete s.lastError;
			// The complete logical world is repeated reliably. Compact entity and event fields keep it under 16 KB.
			s.entities = s.entities.map((q) => {
				const out = {};
				for (const key of [
					"id",
					"kind",
					"x",
					"y",
					"ox",
					"oy",
					"hp",
					"maxHp",
					"r",
					"age",
					"warning",
					"flash",
					"pattern",
					"owner",
					"state",
					"timer",
					"wave",
					"optional",
					"safe",
					"slot",
					"replacement",
					"open",
				])
					if (q[key] !== undefined && q[key] !== false && q[key] !== null)
						out[key] = typeof q[key] === "number" ? round(q[key]) : q[key];
				return out;
			});
			s.bullets = s.bullets.map((q) => ({
				x: round(q.x),
				y: round(q.y),
				vx: round(q.vx),
				vy: round(q.vy),
				team: q.team,
			}));
			s.events = s.events
				.filter((e) => !["shot", "hit", "deploy", "enemyFire"].includes(e.type))
				.slice(-8);
			s.scheduled = [];
			return {
				v: 1,
				k: "s",
				run: this.runId,
				tick: s.tick,
				roster: this.roster,
				s,
			};
		}
		update(dt, local) {
			if (this.ended || !this.started || this.hub.time() < 0) return;
			const now = this.app.game.real;
			if (this.authority) {
				const inputs = {};
				for (const id of this.roster) {
					if (!this.info.server && id === this.info.me) inputs[id] = local;
					else {
						const q = this.intents[id];
						inputs[id] = q && now - q.t < 0.5 ? q.a : F.NEUTRAL;
					}
				}
				this.app.sim.step(dt, inputs);
				if (now >= this.stateDue) {
					this.stateDue = now + 0.1;
					this.send(this.compact(), { reliable: true });
				}
				if (this.app.sim.s.outcome) this.finish();
			} else if (this.roster.includes(this.info.me) && now >= this.inputDue) {
				this.inputDue = now + 1 / 12;
				this.send(
					{
						v: 1,
						k: "i",
						run: this.runId,
						seq: ++this.sequence,
						tick: this.snapshotTick < 0 ? 0 : this.snapshotTick,
						a: local,
					},
					{ to: this.info.host, reliable: false },
				);
			}
		}
		state(dt) {
			if (this.authority || !this.renderState) return this.app.sim.snapshot();
			const s = this.renderState,
				target = this.lastSnapshot; // presentation interpolation/pilot prediction, never gameplay credit
			s.elapsed += dt;
			const mePilot = target.roles.pilot === this.info.me,
				a = this.app.localIntent || F.NEUTRAL;
			s.ship.x += (target.ship.x - s.ship.x) * Math.min(1, dt * 18);
			s.ship.y += (target.ship.y - s.ship.y) * Math.min(1, dt * 18);
			if (mePilot && !this.app.ui.screen) {
				s.ship.x += a.mx * this.app.sim.balance.speed * dt * 0.45;
				s.ship.y += a.my * this.app.sim.balance.speed * dt * 0.45;
			}
			s.objective = this.app.sim.objective();
			s.target = this.app.sim.target();
			return s;
		}
		finish() {
			if (!this.authority || this.finished || this.ended) return;
			this.finished = true;
			this.send(this.compact(), { reliable: true });
			const s = this.app.sim.s;
			// The final latched state is sent within the regular authority send budget.
			const scores = {},
				stats = {};
			for (const id of this.roster) {
				scores[id] = s.score;
				stats[id] = {
					Rescued: s.rescued.length,
					Lost: s.lost.length,
					"Replacement groups": s.replacementPenalty,
				};
			}
			this.hub.finish({
				standings: [this.roster.slice()],
				scores,
				won: s.outcome === "victory",
				stats,
			});
			this.app.clearInput();
			this.app.sound.stop();
		}
	}
	F.Network = Network;
})(typeof globalThis === "object" ? globalThis : window);
