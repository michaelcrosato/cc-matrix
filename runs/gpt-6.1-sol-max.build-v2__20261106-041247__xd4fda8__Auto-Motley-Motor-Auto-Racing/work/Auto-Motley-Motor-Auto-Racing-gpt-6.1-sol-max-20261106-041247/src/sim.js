((M, E) => {
	const { clamp } = E,
		DT = M.DT;
	class Progress {
		constructor(course, s = 20) {
			this.course = course;
			this.laps = 0;
			this.next = 1;
			this.lastGate = 0;
			this.s = s;
			this.distance = s;
			this.legal = true;
			this.wrong = false;
			this.splits = [];
			this.lapStart = 0;
			this.gatesPassed = 0;
			this.offT = 0;
			this.previous = null;
		}
		place(s, lap = this.laps, gate = this.lastGate) {
			this.s = s;
			this.laps = lap;
			this.distance = lap * this.course.length + s;
			this.lastGate = gate;
			this.next = (gate + 1) % this.course.gates.length;
			this.legal = true;
			this.offT = 0;
			this.previous = null;
		}
		update(car, old, dt, time) {
			const before = this.previous || old;
			this.previous = { x: car.x, y: car.y };
			const C = this.course,
				L = C.length,
				p = C.project(car.x, car.y, this.s, 12);
			let dd = p.s - this.s;
			if (dd > L / 2) dd -= L;
			if (dd < -L / 2) dd += L;
			const max =
				Math.hypot(car.x - before.x, car.y - before.y) * 1.8 +
				Math.max(2, C.width / 2 + (car.r || 7));
			this.legal = p.d < C.width / 2 + 18 && Math.abs(dd) < max;
			this.wrong =
				Math.cos(car.angle - p.angle) < -0.35 && Math.abs(car.speed) > 15;
			this.offT = this.legal ? 0 : this.offT + dt;
			if (Math.abs(dd) < max) {
				this.s = p.s;
				if (this.legal) this.distance += dd;
			}
			// A gate is a directed finite segment, crossed by the actual motion of this tick.
			const g = C.gates[this.next],
				nx = Math.cos(g.angle),
				ny = Math.sin(g.angle);
			const a = (before.x - g.x) * nx + (before.y - g.y) * ny,
				b = (car.x - g.x) * nx + (car.y - g.y) * ny;
			let lap = false,
				gate = false;
			if (
				this.legal &&
				a <= 0 &&
				b > 0 &&
				b - a > 1e-7 &&
				Math.hypot(car.x - before.x, car.y - before.y) < 10
			) {
				const t = -a / (b - a),
					x = before.x + (car.x - before.x) * t - g.x,
					y = before.y + (car.y - before.y) * t - g.y;
				if (
					Math.abs(-x * ny + y * nx) < g.half &&
					Math.abs(dd) < max &&
					dd >= -0.05
				) {
					this.lastGate = this.next;
					this.next = (this.next + 1) % C.gates.length;
					this.gatesPassed++;
					gate = true;
					if (this.lastGate === 0) {
						this.laps++;
						const split = time - this.lapStart;
						this.splits.push(split);
						this.lapStart = time;
						lap = true;
					}
				}
			}
			return { gate, lap };
		}
	}
	M.intent = (raw = {}) => {
		const number = (v, lo, hi, fallback = 0) =>
			typeof v === "number" && Number.isFinite(v) ? clamp(v, lo, hi) : fallback;
		return {
			steer: number(raw.steer, -1, 1),
			gas: number(raw.gas, 0, 1),
			brake: number(raw.brake, 0, 1),
			recover: raw.recover === true,
			drift: 0,
		};
	};
	class Simulation {
		constructor(world, config = {}) {
			this.world = world;
			this.config = {
				mode: "trial",
				course: 0,
				cars: [2, 4],
				laps: 2,
				target: 10,
				difficulty: "normal",
				seed: 1980,
				countdown: 3,
				cap: 180,
				...config,
			};
			this.course = world.courses[this.config.course];
			this.tuning = { ...M.DEFAULTS, ...config.tuning };
			this.rng = M.namedRng(this.config.seed, "rules");
			this.tick = 0;
			this.time = 0;
			this.clock = 0;
			this.phase = "countdown";
			this.lock = this.config.countdown;
			this.exchange = 0;
			this.score = [0, 0];
			this.events = [];
			this.eventId = 0;
			this.leadT = 0;
			this.winner = null;
			this.resultReason = "";
			this.unranked = false;
			this.record = [];
			this.recordTick = 0;
			this.discoveries = new Set();
			this.drag = null;
			this.dragBest = null;
			const dual =
				this.config.mode === "duel" ||
				["lead", "crash"].includes(this.config.goal);
			this.drivers = Array.from({ length: dual ? 2 : 1 }, (_, i) =>
				this.makeDriver(i),
			);
			this.stage(0, false);
			this.emit("grid", { text: "Engines ready. Eyes on the bend!" });
		}
		makeDriver(i) {
			const spec = M.CARS[this.config.cars[i] ?? 2],
				p = this.course.at(20),
				car = new E.Car({
					...spec.physics,
					r: 7,
					h: 7,
					reverse: 0,
					drag: 0.6,
					kart: false,
					ground: (x, y) => this.world.surface(x, y),
					surfaces: {
						road: { top: 1, grip: 1 },
						grass: { top: 0.42, grip: 0.66 },
						gravel: { top: 0.7, grip: 0.43 },
						water: { top: 0.05, grip: 0.2 },
					},
				});
			car.x = p.x;
			car.y = p.y;
			car.angle = p.angle;
			return {
				i,
				spec,
				car,
				progress: new Progress(this.course),
				score: 0,
				penalty: 0,
				crashT: 0,
				immune: 0,
				recoverHold: 0,
				stuck: 0,
				crashes: 0,
				recoveries: 0,
				braked: false,
				stopped: false,
				splashed: false,
				touchedGrass: false,
				touchedGravel: false,
				slid: false,
				bumped: false,
				aiS: 20,
				aiStuck: 0,
				aiNavIndex: 0,
				lastIntent: M.intent(),
				lastSurface: "road",
				ghost: [],
				maxSpeed: 0,
			};
		}
		emit(type, data = {}) {
			const e = {
				id: ++this.eventId,
				tick: this.tick,
				time: this.time,
				type,
				...data,
			};
			this.events.push(e);
			if (this.events.length > 100) this.events.shift();
			return e;
		}
		stage(gate, exchange = true) {
			const anchor = this.course.anchors[gate],
				n = this.drivers.length;
			this.drivers.forEach((D, i) => {
				const side = n === 2 ? (i === 0 ? -12 : 12) : 0,
					c = D.car;
				c.x = anchor.x - Math.sin(anchor.angle) * side;
				c.y = anchor.y + Math.cos(anchor.angle) * side;
				c.angle = anchor.angle;
				c.vx = c.vy = c.speed = c.slide = 0;
				c.z = c.vz = 0;
				c.onGround = true;
				c.spinT = 0;
				D.progress.place(anchor.s, 0, gate);
				D.aiS = anchor.s;
				D.crashT = 0;
				D.immune = 1.8;
				D.recoverHold = 0;
				D.stuck = 0;
				D.aiStuck = 0;
			});
			if (exchange) {
				this.exchange++;
				this.lock = 2;
				this.phase = "exchange";
				this.leadT = 0;
			}
		}
		recover(D, reason = "Manual recovery") {
			if (D.immune > 0 || D.crashT > 0) return false;
			return this.incident(D, reason);
		}
		incident(D, reason) {
			if (D.immune > 0 || D.crashT > 0 || this.phase !== "running")
				return false;
			D.crashT = 1.5;
			D.crashes++;
			D.recoveries++;
			D.immune = 2.8;
			D.car.vx = D.car.vy = D.car.speed = D.car.slide = 0;
			if (reason === "Deep water") D.splashed = true;
			this.emit("crash", { driver: D.i, reason, x: D.car.x, y: D.car.y });
			return true;
		}
		restore(D) {
			const p = D.progress,
				a =
					this.config.mode === "free" || this.config.mode === "explore"
						? this.world.nearest(D.car.x, D.car.y)
						: this.course.anchors[p.lastGate];
			const q = a.road ? a.road.at(a.s) : a;
			D.car.x = q.x;
			D.car.y = q.y;
			D.car.angle = q.angle;
			D.car.vx = D.car.vy = D.car.speed = D.car.slide = 0;
			D.car.z = 0;
			D.car.onGround = true;
			D.crashT = 0;
			D.stuck = 0;
			D.recoverHold = 0;
			if (!a.road) {
				p.place(a.s, p.laps, p.lastGate);
				D.aiS = a.s;
			}
			D.immune = 1.5;
			this.emit("recover", { driver: D.i });
		}
		ai(D, dt = DT) {
			let road = this.course;
			if (this.config.mode === "explore" && this.navRoad) road = this.navRoad;
			const car = D.car,
				projected = road.project(car.x, car.y, D.aiS, 16);
			D.aiS = projected.s;
			const speed = Math.max(0, car.speed),
				look = 24 + speed * 0.34,
				p = road.at(projected.s + look),
				lane = this.drivers.length > 1 ? (D.i === 0 ? -9 : 9) : 0,
				target = Math.atan2(
					p.y + Math.cos(p.angle) * lane - car.y,
					p.x - Math.sin(p.angle) * lane - car.x,
				);
			let diff = E.angDiff(car.angle, target),
				curve = 0;
			for (let j = 0; j < 5; j++) {
				const a = road.at(projected.s + 18 + j * 28),
					b = road.at(projected.s + 46 + j * 28);
				curve = Math.max(curve, Math.abs(E.angDiff(a.angle, b.angle)) / 28);
			}
			const difficulty = this.config.difficulty,
				pace =
					difficulty === "easy" ? 0.69 : difficulty === "hard" ? 0.91 : 0.81;
			let desired = Math.min(
				car.o.top * pace * this.tuning.ai,
				(car.o.turn * 0.72) / Math.max(curve, 0.0001),
				Math.sqrt((car.o.grip * 103) / Math.max(curve, 0.0001)),
			);
			if (projected.d > road.width * 0.3) desired = Math.min(desired, 70);
			if (Math.abs(diff) > 0.75) desired = Math.min(desired, 65);
			if (this.config.goal === "lead" && D.i === 1)
				desired = Math.min(desired, 43);
			// Difficulty alters planning and input only. The car's physical profile is untouched.
			if (difficulty === "easy")
				diff += Math.sin(this.time * 0.7 + D.i * 2) * 0.025;
			const steer = clamp(diff * 3.2, -1, 1),
				brake = speed > desired + 3 ? clamp((speed - desired) / 28, 0, 1) : 0;
			D.aiStuck = speed < 6 ? D.aiStuck + dt : 0;
			return M.intent({
				steer,
				gas: brake > 0.05 ? 0 : 1,
				brake,
				recover: D.aiStuck > 5,
			});
		}
		setNavigation(target) {
			const c = this.drivers[0].car,
				points = this.world.graphPath(c, target);
			this.navRoad = new M.Road({ id: "navigation", width: 48, points }, false);
			this.drivers[0].aiS = 0;
		}
		tickDriver(D, raw, dt) {
			const car = D.car,
				old = { x: car.x, y: car.y, vx: car.vx, vy: car.vy },
				it = M.intent(raw);
			D.lastIntent = it;
			D.immune = Math.max(0, D.immune - dt);
			if (D.crashT > 0) {
				D.crashT -= dt;
				if (D.crashT <= 0) this.restore(D);
				return { crash: false };
			}
			D.recoverHold = it.recover ? D.recoverHold + dt : 0;
			let reason = D.recoverHold >= 0.65 ? "Manual recovery" : "";
			const spec = D.spec.physics,
				T = this.tuning;
			car.o.top = spec.top * T.speed;
			car.o.accel = spec.accel * T.accel;
			car.o.brake = spec.brake * T.brake;
			car.o.turn = spec.turn * T.steer;
			car.o.surfaces.road.grip = T.roadGrip;
			car.o.surfaces.grass.grip = T.grassGrip;
			car.o.surfaces.gravel.grip = T.gravelGrip;
			// reverse:0 fixes the stock brake-from-rest behavior. Grid/recovery never call update.
			car.update(dt, null, it);
			if (it.brake > 0.1 && Math.abs(car.speed) < 0.8) {
				car.vx = car.vy = car.speed = car.slide = 0;
			}
			const hit = this.world.collisions(car, old);
			if (car.surface === "water") reason = "Deep water";
			if (hit.impact >= T.crash) reason = hit.reason;
			if (hit.impact > 8) {
				D.bumped = true;
				if (this.tick % 18 === 0)
					this.emit("bump", { driver: D.i, force: hit.impact });
			}
			D.stuck = it.gas > 0.5 && car.speed < 3 ? D.stuck + dt : 0;
			if (D.stuck > 8) reason = "Immobilized";
			D.maxSpeed = Math.max(D.maxSpeed, car.speed);
			if (car.speed > 20 && it.brake > 0.1) D.braked = true;
			if (D.braked && Math.abs(car.speed) < 1) D.stopped = true;
			if (car.surface === "grass") D.touchedGrass = true;
			if (car.surface === "gravel") D.touchedGravel = true;
			if (Math.abs(car.slide) > 12) D.slid = true;
			const crash =
				reason && !this.config.invincible ? this.incident(D, reason) : false;
			if (crash && this.drivers.length === 1) {
				if (!["free", "explore", "lesson"].includes(this.config.mode)) {
					D.penalty += 5;
					this.emit("penalty", { seconds: 5 });
				}
			}
			if (!crash && !["free", "explore"].includes(this.config.mode)) {
				const crossed = D.progress.update(car, old, dt, this.time);
				if (crossed.gate)
					this.emit("gate", { driver: D.i, gate: D.progress.lastGate });
				if (crossed.lap) {
					this.emit("lap", {
						driver: D.i,
						lap: D.progress.laps,
						split: D.progress.splits.at(-1),
					});
					if (
						this.config.mode === "trial" &&
						D.progress.laps >= this.config.laps
					)
						this.finish("Chequered flag", D.i);
				}
			}
			return { crash: !!crash, reason };
		}
		resolve(incidents, dt) {
			if (this.drivers.length < 2 || this.phase !== "running") return;
			const both = incidents[0].crash && incidents[1].crash,
				any = incidents.some((i) => i.crash);
			let who = -1,
				points = 0,
				why = "";
			if (any) {
				if (!both) {
					who = incidents[0].crash ? 1 : 0;
					points = 2;
					why = "Opponent crash";
				} else why = "Both crashed · no points";
			} else {
				const a = this.drivers[0].progress,
					b = this.drivers[1].progress,
					gap = a.distance - b.distance;
				if (a.legal && b.legal && Math.abs(gap) > this.tuning.lead) {
					this.leadT += dt;
					if (this.leadT >= 0.28) {
						who = gap > 0 ? 0 : 1;
						points = 1;
						why = "Twelve lengths clear";
					}
				} else this.leadT = 0;
			}
			if (!any && !points) return;
			if (who >= 0) this.score[who] += points;
			this.emit("point", {
				driver: who,
				points,
				reason: why,
				score: this.score.slice(),
			});
			if (this.config.goal === "lead" && points === 1)
				return this.finish("A commanding lead!", who);
			if (this.config.goal === "crash" && any)
				return this.finish("Crash rule learned", who);
			if (who >= 0 && this.score[who] >= this.config.target)
				return this.finish("First to " + this.config.target, who);
			const leader = this.drivers.reduce((a, b) =>
				a.progress.distance >= b.progress.distance ? a : b,
			);
			this.stage(leader.progress.lastGate);
		}
		finish(reason, winner = null) {
			if (this.phase === "finished") return;
			this.phase = "finished";
			this.winner = winner;
			this.resultReason = reason;
			this.drivers.forEach((D) => {
				D.car.vx = D.car.vy = D.car.speed = 0;
			});
			this.emit("finish", { winner, reason, score: this.score.slice() });
		}
		step(inputs = [], dt = DT, clock) {
			if (this.phase === "finished") return;
			this.tick++;
			this.clock = clock === undefined ? this.clock + dt : clock;
			if (this.phase === "countdown" || this.phase === "exchange") {
				this.lock -= dt;
				if (this.lock <= 0) {
					this.phase = "running";
					this.emit("go");
				}
				return;
			}
			this.time += dt;
			const incidents = this.drivers.map((D, i) =>
				this.tickDriver(D, inputs[i] || this.ai(D, dt), dt),
			);
			if (this.drivers.length === 2) {
				const a = this.drivers[0].car,
					b = this.drivers[1].car;
				if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-6) {
					a.x -= a.r;
					b.x += b.r;
				}
				E.Car.collide([a, b]);
			}
			this.resolve(incidents, dt);
			if (this.config.mode === "lesson") {
				const D = this.drivers[0];
				if (this.config.goal === "stop" && D.stopped)
					this.finish("A proper stop!", 0);
				if (this.config.goal === "water" && D.splashed && D.crashT <= 0)
					this.finish("Back on dry land!", 0);
			}
			if (["free", "explore"].includes(this.config.mode)) {
				const c = this.drivers[0].car;
				for (const C of this.world.courses)
					if (
						Math.hypot(c.x - C.gates[0].x, c.y - C.gates[0].y) < 150 &&
						!this.discoveries.has(C.id)
					) {
						this.discoveries.add(C.id);
						this.emit("discovery", { course: C.id });
					}
				if (
					Math.hypot(c.x - 4960, c.y - 4480) < 160 &&
					!this.discoveries.has("airfield")
				) {
					this.discoveries.add("airfield");
					this.emit("discovery", { course: "airfield" });
				}
				if (
					!this.drag &&
					Math.abs(c.x - 4800) < 12 &&
					Math.abs(c.y - 4480) < 28 &&
					c.vx < -10
				) {
					this.drag = { start: this.time, peak: 0 };
					this.emit("drag-start");
				}
				if (this.drag) {
					this.drag.peak = Math.max(this.drag.peak, c.speed);
					if (c.x <= 2500 && Math.abs(c.y - 4480) < 28) {
						const result = {
							time: this.time - this.drag.start,
							peak: this.drag.peak,
						};
						this.dragBest = result;
						this.drag = null;
						this.emit("drag-finish", result);
					} else if (Math.abs(c.y - 4480) > 70) {
						this.drag = null;
						this.emit("drag-cancel");
					}
				}
				if (
					this.config.mode === "explore" &&
					Math.hypot(
						c.x - this.world.courses[3].gates[0].x,
						c.y - this.world.courses[3].gates[0].y,
					) < 140
				)
					this.finish("Pine Lodge found!", 0);
			}
			if (
				this.config.cap &&
				this.config.mode === "duel" &&
				this.clock >= this.config.cap
			) {
				this.finish(
					"Time!",
					this.score[0] === this.score[1]
						? null
						: this.score[0] > this.score[1]
							? 0
							: 1,
				);
			}
			if (this.tick % 12 === 0 && this.config.mode === "trial") {
				const c = this.drivers[0].car;
				this.record.push([
					Math.round(this.time * 1000),
					+c.x.toFixed(2),
					+c.y.toFixed(2),
					+c.angle.toFixed(3),
				]);
			}
		}
		snapshot() {
			return {
				v: M.PROTOCOL,
				t: "snap",
				tick: this.tick,
				at: +this.time.toFixed(3),
				clock: +this.clock.toFixed(3),
				phase: this.phase,
				lock: +this.lock.toFixed(3),
				exchange: this.exchange,
				score: this.score.slice(),
				winner: this.winner,
				reason: this.resultReason,
				course: this.config.course,
				u: this.drivers.map((D) => [
					D.lastIntent.steer,
					D.lastIntent.gas,
					D.lastIntent.brake,
				]),
				cr: this.drivers.map((D) => D.crashes),
				cars: this.drivers.map((D) => {
					const c = D.car,
						p = D.progress;
					return [
						D.spec.id,
						+c.x.toFixed(2),
						+c.y.toFixed(2),
						+c.angle.toFixed(4),
						+c.vx.toFixed(2),
						+c.vy.toFixed(2),
						+c.speed.toFixed(2),
						+c.slide.toFixed(2),
						p.laps,
						p.next,
						p.lastGate,
						+p.s.toFixed(2),
						+p.distance.toFixed(2),
						D.crashT,
						D.penalty,
						p.legal ? 1 : 0,
					];
				}),
				event: this.events.at(-1) || null,
			};
		}
		apply(s) {
			if (
				!s ||
				s.v !== M.PROTOCOL ||
				s.t !== "snap" ||
				!Number.isInteger(s.tick) ||
				s.tick < this.tick ||
				(s.tick === this.tick && (!s.event || s.event.id <= this.eventId)) ||
				!Array.isArray(s.cars) ||
				s.cars.length !== this.drivers.length ||
				!["countdown", "exchange", "running", "finished"].includes(s.phase) ||
				!Array.isArray(s.score) ||
				s.score.some((v) => !Number.isInteger(v) || v < 0 || v > 100)
			)
				return false;
			if (
				!["at", "clock", "lock", "exchange"].every(
					(k) => typeof s[k] === "number" && Number.isFinite(s[k]),
				) ||
				s.at < 0 ||
				s.at > 100000 ||
				s.clock < 0 ||
				s.clock > 100000 ||
				s.course !== this.config.course ||
				(s.event &&
					(!Number.isInteger(s.event.id) || typeof s.event.type !== "string"))
			)
				return false;
			if (
				s.cars.some(
					(a) =>
						a.length !== 16 ||
						!M.CARS.some((c) => c.id === a[0]) ||
						!a.slice(1).every(Number.isFinite) ||
						Math.abs(a[1]) > 10000 ||
						Math.abs(a[2]) > 10000,
				)
			)
				return false;
			this.tick = s.tick;
			this.time = s.at;
			this.clock = s.clock;
			this.phase = s.phase;
			this.lock = s.lock;
			this.exchange = s.exchange;
			this.score = s.score.slice();
			this.winner = s.winner;
			this.resultReason = s.reason;
			s.cars.forEach((a, i) => {
				const D = this.drivers[i],
					c = D.car,
					p = D.progress;
				[
					c.x,
					c.y,
					c.angle,
					c.vx,
					c.vy,
					c.speed,
					c.slide,
					p.laps,
					p.next,
					p.lastGate,
					p.s,
					p.distance,
					D.crashT,
					D.penalty,
				] = a.slice(1, 15);
				p.legal = !!a[15];
				c.surface = this.world.surface(c.x, c.y);
				c.offroad = c.surface !== "road";
				if (s.u?.[i]?.length === 3 && s.u[i].every(Number.isFinite))
					D.lastIntent = M.intent({
						steer: s.u[i][0],
						gas: s.u[i][1],
						brake: s.u[i][2],
					});
				if (Number.isInteger(s.cr?.[i]) && s.cr[i] >= 0) D.crashes = s.cr[i];
			});
			if (s.event && s.event.id > this.eventId) {
				this.eventId = s.event.id;
				this.events.push(s.event);
			}
			return true;
		}
	}
	M.Progress = Progress;
	M.Simulation = Simulation;
})(MM, My3D2dge);
