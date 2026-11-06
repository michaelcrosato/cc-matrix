((T) => {
	class Network {
		constructor(info, api) {
			this.info = info;
			this.api = api;
			this.id = "r" + info.round + "s" + info.seed;
			this.started = false;
			this.ended = false;
			this.finished = false;
			this.time = 0;
			this.snapSeq = 0;
			this.lastSeq = -1;
			this.inputSeq = 0;
			this.lastSend = -10;
			this.lastSnap = -10;
			this.lastPhase = "";
			this.inputs = {};
			this.accepted = {};
			this.lastBomb = {};
			this.state = null;
			this.intentHistory = [];
			this.predict = null;
			this.rendered = null;
			this.lastKey = "";
			this.lastEvent = 0;
			this.run = info.isHost
				? new T.Run({
						seed: info.seed,
						runId: this.id,
						mode: "hub",
						seats: info.players.map((p) => p.id),
					})
				: null;
			if (this.run) this.state = this.run.snapshot();
			else
				this.state = new T.Run({
					seed: info.seed,
					runId: this.id,
					mode: "hub",
					seats: info.players.map((p) => p.id),
				}).snapshot();
			api.on("start", () => {
				this.started = true;
			});
			api.on("message", (m, from) => this.receive(m, from));
			api.on("leave", ({ id }) => {
				if (this.ended) return;
				if (this.onLeave) this.onLeave(id);
				if (this.run) {
					this.run.leave(id);
					this.broadcast(true);
				}
			});
			api.on("time-up", () => {
				if (this.run && !this.ended) this.finish(this.run.phase === "won");
			});
			api.on("end", ({ reason }) => {
				this.ended = true;
				this.reason = reason;
				this.inputs = {};
				if (this.run) this.run.phase = "ended";
				if (this.onEnd) this.onEnd(reason);
			});
			api.ready();
		}
		valid(m) {
			return (
				m &&
				m.v === 1 &&
				m.run === this.id &&
				Number.isSafeInteger(m.seq) &&
				m.seq >= 0
			);
		}
		receive(m, from) {
			if (this.ended || !this.valid(m)) return;
			if (this.run) {
				if (
					m.type !== "input" ||
					!this.started ||
					m.floor !== this.run.floor ||
					this.run.phase === "ended"
				)
					return;
				const p = this.run.players.find((p) => p.seat === from && p.active);
				if (!p) return;
				const prev = this.accepted[from];
				if (prev && m.seq <= prev.seq) return;
				if (prev && this.time - prev.window < 1 && prev.count >= 20) return;
				const dir = m.dir;
				if (
					dir !== null &&
					(!Array.isArray(dir) ||
						dir.length !== 2 ||
						!dir.every(Number.isInteger) ||
						Math.abs(dir[0]) + Math.abs(dir[1]) !== 1)
				)
					return;
				if (
					!Number.isSafeInteger(m.bombSeq) ||
					m.bombSeq < 0 ||
					m.bombSeq > (this.lastBomb[from] || 0) + 100
				)
					return;
				let route = null;
				if (m.route !== null && m.route !== undefined) {
					if (
						!Array.isArray(m.route) ||
						m.route.length !== 2 ||
						!m.route.every(Number.isInteger) ||
						!this.run.grid.walk(m.route)
					)
						return;
					route = m.route;
				}
				const window =
						prev && this.time - prev.window < 1 ? prev.window : this.time,
					count = prev && this.time - prev.window < 1 ? prev.count + 1 : 1;
				const bomb = m.bombSeq > (this.lastBomb[from] || 0);
				this.lastBomb[from] = m.bombSeq;
				this.accepted[from] = { seq: m.seq, at: this.time, window, count };
				this.inputs[from] = {
					dir,
					bomb,
					bombSeq: m.bombSeq,
					route,
					confirm: m.confirm === true,
					stop: m.stop === true,
				};
			} else {
				if (
					from !== this.info.host ||
					m.type !== "state" ||
					m.seq <= this.lastSeq
				)
					return;
				const s = m.state;
				if (
					!s ||
					s.run !== this.id ||
					s.v !== 1 ||
					s.tick < this.state.tick ||
					s.floor < this.state.floor ||
					!Array.isArray(s.players)
				)
					return;
				const changed = s.floor !== this.state.floor;
				this.lastSeq = m.seq;
				this.state = s;
				this.lastReceived = this.time;
				if (changed) {
					this.predict = null;
					this.rendered = null;
				}
				const p = s.players.find((p) => p.seat === this.info.me);
				if (p) {
					const mvr = new My3D2dge.GridMover({ cx: p.cx, cy: p.cy });
					Object.assign(mvr, {
						x: p.x,
						y: p.y,
						_to: p.to,
						_u: p.u,
						moving: p.moving,
						dir: p.dir.slice(),
					});
					this.predict = { ...p, m: mvr, prev: [p.x, p.y], bufferTime: 0 };
					if (s.phase === "playing" && p.hurt <= 0 && Number.isFinite(s.at)) {
						const map = T.makeMap(T.FLOORS[s.floor]),
							grid = My3D2dge.Grid.from(map),
							now = this.api.time();
						let last = { dir: null };
						for (const h of this.intentHistory) if (h.at <= s.at) last = h;
						for (
							let at = Math.max(s.at, now - 200);
							at < now;
							at += 1000 / 120
						) {
							for (const h of this.intentHistory) if (h.at <= at) last = h;
							if (last.stop) continue;
							T.move(
								this.predict,
								1 / 120,
								grid,
								last.dir,
								s.balance.playerSpeed * (p.carried ? s.balance.carrySpeed : 1),
							);
						}
					}
				}
			}
		}
		broadcast(reliable = false) {
			if (!this.run || this.ended) return;
			this.state = this.run.snapshot();
			this.state.at = this.api.time();
			this.state.ack = Object.fromEntries(
				Object.entries(this.accepted).map(([k, v]) => [k, v.seq]),
			);
			this.api.send(
				{
					v: 1,
					run: this.id,
					type: "state",
					seq: ++this.snapSeq,
					state: this.state,
				},
				{ reliable },
			);
			this.lastSnap = this.time;
		}
		finish(won) {
			if (this.finished || this.ended || !this.run) return;
			this.finished = true;
			this.broadcast(true);
			const ids = this.run.players.filter((p) => p.active).map((p) => p.seat),
				scores = Object.fromEntries(ids.map((id) => [id, this.run.score]));
			this.api.finish({
				standings: [ids],
				scores,
				won: !!won,
				stats: Object.fromEntries(
					ids.map((id) => [
						id,
						{
							Rescues: this.run.rescued,
							Score: this.run.score,
							Seconds: Math.round(this.run.elapsed),
						},
					]),
				),
			});
		}
		update(dt, intent = {}) {
			if (this.ended) return;
			this.time += dt;
			this.intentHistory.push({
				at: this.api.time(),
				dir: intent.dir || null,
				stop: intent.stop === true,
			});
			if (this.intentHistory.length > 80) this.intentHistory.shift();
			const clock = this.api.time(),
				playing = this.started && Number.isFinite(clock) && clock >= 0;
			const local = this.info.server ? null : this.info.me;
			if (this.run) {
				if (local !== null) this.inputs[local] = intent;
				for (const p of this.run.players)
					if (
						p.seat !== local &&
						this.accepted[p.seat] &&
						this.time - this.accepted[p.seat].at > 0.4
					)
						this.inputs[p.seat] = {};
				if (playing && !this.finished) {
					this.run.step(dt * (this.timeScale ?? 1), this.inputs);
					for (const v of Object.values(this.inputs)) {
						v.bomb = false;
						v.route = null;
						v.confirm = false;
					}
				}
				const phase = this.run.floor + ":" + this.run.phase;
				if (this.time - this.lastSnap >= 0.1 || phase !== this.lastPhase) {
					this.lastPhase = phase;
					this.broadcast(
						phase.includes("won") ||
							phase.includes("lost") ||
							phase.includes("clear"),
					);
				}
				if (["won", "lost"].includes(this.run.phase))
					this.finish(this.run.phase === "won");
			} else {
				if (intent.bomb) this.pendingBomb = intent.bombSeq;
				if (intent.route) this.pendingRoute = intent.route;
				if (intent.confirm) this.pendingConfirm = true;
				const key = JSON.stringify([
					intent.dir || null,
					this.pendingBomb || 0,
					this.pendingRoute || null,
					!!this.pendingConfirm,
					intent.stop === true,
				]);
				if (
					(playing || this.started) &&
					this.time - this.lastSend >= 0.075 &&
					(key !== this.lastKey || this.time - this.lastSend >= 0.16)
				) {
					this.api.send(
						{
							v: 1,
							run: this.id,
							type: "input",
							seq: ++this.inputSeq,
							floor: this.state.floor,
							dir: intent.dir || null,
							bombSeq: this.pendingBomb || 0,
							route: this.pendingRoute || null,
							confirm: !!this.pendingConfirm,
							stop: intent.stop === true,
						},
						{ to: this.info.host, reliable: !!this.pendingRoute },
					);
					this.lastSend = this.time;
					this.lastKey = key;
					this.pendingRoute = null;
					this.pendingConfirm = false;
				}
				if (
					playing &&
					this.predict &&
					this.time - (this.lastReceived || 0) < 0.25 &&
					this.state.phase === "playing" &&
					this.predict.hurt <= 0 &&
					!intent.stop
				) {
					const map =
						this.predMap && this.predFloor === this.state.floor
							? this.predMap
							: T.makeMap(T.FLOORS[this.state.floor]);
					this.predMap = map;
					this.predFloor = this.state.floor;
					T.move(
						this.predict,
						dt,
						My3D2dge.Grid.from(map),
						intent.dir || null,
						this.state.balance.playerSpeed *
							(this.predict.carried ? this.state.balance.carrySpeed : 1),
					);
					const authority = this.state.players.find((p) => p.seat === local),
						d = Math.hypot(
							this.predict.m.x - authority.x,
							this.predict.m.y - authority.y,
						);
					if (d > 0.85) {
						const m = new My3D2dge.GridMover({
							cx: authority.cx,
							cy: authority.cy,
						});
						Object.assign(m, {
							x: authority.x,
							y: authority.y,
							_to: authority.to,
							_u: authority.u,
							moving: authority.moving,
							dir: authority.dir.slice(),
						});
						this.predict = {
							...authority,
							m,
							prev: [authority.x, authority.y],
							bufferTime: 0,
						};
					}
				}
			}
		}
		planner() {
			if (this.run) return this.run;
			const s = this.state;
			if (!this.plan || this.plan.floor !== s.floor)
				this.plan = new T.Run({
					seed: s.seed,
					floor: s.floor,
					seats: s.players.map((p) => p.seat),
				});
			const r = this.plan;
			for (const k of [
				"phase",
				"floorTime",
				"elapsed",
				"stats",
				"delivered",
				"stock",
				"bomb",
				"supply",
				"rooms",
				"homes",
				"balance",
			])
				r[k] = s[k];
			const actor = (a) => {
				const m = new My3D2dge.GridMover({ cx: a.cx, cy: a.cy });
				Object.assign(m, {
					x: a.x,
					y: a.y,
					_to: a.to,
					_u: a.u,
					moving: a.moving,
					dir: a.dir,
				});
				return { ...a, m };
			};
			r.players = s.players.map(actor);
			r.enemies = s.enemies.map(actor);
			if (this.predict) {
				const p = r.players.find((p) => p.seat === this.info.me);
				if (p) {
					p.m = this.predict.m;
					p.facing = this.predict.facing;
				}
			}
			return r;
		}
		presentation(dt) {
			const s = this.state;
			if (!s) return null;
			if (this.run) return s;
			const out = { ...s, players: s.players.map((p) => ({ ...p })) };
			for (const p of out.players) {
				if (p.seat === this.info.me && this.predict) {
					p.x = this.predict.m.x;
					p.y = this.predict.m.y;
					p.walk = this.predict.walk;
					p.facing = this.predict.facing;
				}
			}
			if (this.rendered && this.rendered.floor === s.floor) {
				for (const p of out.players) {
					if (p.seat === this.info.me) continue;
					const before = this.rendered.players.find((q) => q.id === p.id);
					if (before) {
						p.x = before.x + (p.x - before.x) * Math.min(1, dt * 13);
						p.y = before.y + (p.y - before.y) * Math.min(1, dt * 13);
					}
				}
			}
			this.rendered = out;
			return out;
		}
	}
	T.Network = Network;
})(globalThis.TB);
