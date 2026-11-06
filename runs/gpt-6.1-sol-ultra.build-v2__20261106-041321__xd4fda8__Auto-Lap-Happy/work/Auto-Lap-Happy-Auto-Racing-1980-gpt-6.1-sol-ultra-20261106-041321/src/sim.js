/* Auto Lap Happy — authoritative rules. Original game code, MIT. */
(function (root) {
	"use strict";
	const E = root.My3D2dge,
		clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
		diff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
	const DEFAULTS = Object.freeze({
		speed: 1,
		acceleration: 1,
		braking: 1,
		steering: 1,
		roadGrip: 1,
		grassGrip: 0.72,
		gravelGrip: 0.45,
		crash: 95,
		aiPace: 0.9,
		lead: 288,
		target: 10,
	});
	const PROFILES = [
		{
			name: "WHITE · WREN",
			color: "#f4f0db",
			top: 114,
			accel: 56,
			grip: 14,
			turn: 2.65,
			about: "Easy corners. Take the scenic line.",
			bars: [3, 2, 5],
		},
		{
			name: "GREEN · SPRIG",
			color: "#73bd57",
			top: 135,
			accel: 104,
			grip: 11.5,
			turn: 2.5,
			about: "Quick off the line. Quick to forgive.",
			bars: [3, 5, 4],
		},
		{
			name: "RED · ROBIN",
			color: "#ec634f",
			top: 155,
			accel: 82,
			grip: 11.5,
			turn: 2.45,
			about: "A little speed. A little finesse.",
			bars: [4, 4, 4],
		},
		{
			name: "TAN · SWIFT",
			color: "#d4ae73",
			top: 186,
			accel: 60,
			grip: 8.5,
			turn: 2.2,
			about: "Fast on the straight. Brake early.",
			bars: [5, 2, 3],
		},
		{
			name: "BLUE · SWALLOW",
			color: "#56a3db",
			top: 186,
			accel: 60,
			grip: 8.5,
			turn: 2.2,
			about: "Swift’s matched twin. A fair duel.",
			bars: [5, 2, 3],
		},
	];
	const TOUR = [
		{
			course: 0,
			mode: "trial",
			laps: 1,
			title: "01 · GET THE FEEL",
			text: "Brake before the bend. Release to go. Follow every numbered gate.",
			tip: "Try the grass shoulder, then hold Recover to learn a safe return.",
		},
		{
			course: 1,
			mode: "trial",
			laps: 2,
			title: "02 · LINK THE LANES",
			text: "Two laps through the orchard. A clean line beats a heavy foot.",
			tip: "Grass costs speed. Gravel lets the tail slide. Brake before you turn.",
		},
		{
			course: 1,
			mode: "free",
			destination: 2,
			title: "03 · THE SCENIC ROUTE",
			text: "Follow the dotted connection to the lakeside paddock.",
			tip: "Every circuit shares this countryside. Road signs lead the way.",
		},
		{
			course: 2,
			mode: "trial",
			laps: 1,
			title: "04 · MIND THE WATER",
			text: "One lap over the causeway. Keep the lake beside you!",
			tip: "Water and hard impacts cause a crash. Hold Recover; a timed run adds 3 seconds.",
		},
		{
			course: 3,
			mode: "trial",
			laps: 1,
			title: "05 · FIND YOUR GRIP",
			text: "Woodland sweeps and a tight bend. Listen for the tyres.",
			tip: "Keep your steering light; brake to settle a slide. Gates must be crossed in order.",
		},
		{
			course: 4,
			mode: "duel",
			target: 10,
			opponent: 1,
			title: "06 · A FRIENDLY PURSUIT",
			text: "First to ten! Pull twelve car lengths ahead for 1. A rival crash scores 2.",
			tip: "Both crash? No points. Each exchange restarts at the leader’s last gate.",
		},
	];
	function project(course, x, y, near) {
		const s = course.samples,
			n = s.length - 1;
		let best = {
			dist: Infinity,
			index: near || 0,
			d: 0,
			x: s[0].x,
			y: s[0].y,
			angle: s[0].angle,
		};
		const count = near === undefined ? n : Math.min(n, 25),
			start = near === undefined ? 0 : near - 12;
		for (let j = 0; j < count; j++) {
			const i = (((start + j) % n) + n) % n,
				a = s[i],
				b = s[i + 1],
				dx = b.x - a.x,
				dy = b.y - a.y,
				q = clamp(
					((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1),
					0,
					1,
				),
				px = a.x + q * dx,
				py = a.y + q * dy,
				dist = Math.hypot(x - px, y - py);
			if (dist < best.dist)
				best = {
					dist,
					index: i,
					d: a.d + (b.d - a.d) * q,
					x: px,
					y: py,
					angle: Math.atan2(dy, dx),
				};
		}
		return best;
	}
	function crossGate(g, ax, ay, bx, by, width) {
		const fx = Math.cos(g.angle),
			fy = Math.sin(g.angle),
			a = (ax - g.x) * fx + (ay - g.y) * fy,
			b = (bx - g.x) * fx + (by - g.y) * fy;
		if (a >= 0 || b < 0 || b - a < 1e-8) return false;
		const t = -a / (b - a),
			x = ax + (bx - ax) * t - g.x,
			y = ay + (by - ay) * t - g.y;
		return Math.abs(-x * fy + y * fx) <= width;
	}
	class HappySim {
		constructor(world, options = {}) {
			this.world = world;
			this.settings = { auto: true, ...options };
			this.tuning = { ...DEFAULTS };
			this.events = [];
			this.seed = 1980;
			this.tick = 0;
			this.mode = "trial";
			this.state = "idle";
			this.cars = [];
			this.courseIndex = 0;
			this.t = 0;
			this.score = [0, 0];
			this.attract = false;
			this.dev = false;
			this.aiAll = false;
			this.invulnerable = false;
			this.tourStep = -1;
			this.target = 10;
			this.bestGhost = [];
			this.ghost = [];
			this.discovered = new Set();
			this.dragBest = null;
			this.dragRun = null;
			this.message = "";
			this.messageT = 0;
		}
		get course() {
			return this.world.courses[this.courseIndex];
		}
		event(type, data = {}) {
			const e = { type, tick: this.tick, t: this.t, ...data };
			this.events.push(e);
			if (this.events.length > 200) this.events.shift();
			this.onEvent?.(e);
		}
		start(config = {}) {
			this.config = {
				mode: "trial",
				course: 0,
				profile: 2,
				opponent: 4,
				laps: 2,
				humans: 1,
				difficulty: "normal",
				...config,
			};
			this.tourStep = this.config.mode === "tour" ? 0 : -1;
			this.tourTimes = [];
			this.tourDemonstrated = {
				brake: false,
				grass: false,
				gravel: false,
				recover: false,
				crash: false,
				lead: false,
			};
			if (this.tourStep >= 0) this.startTourStage();
			else this.startRound(this.config);
		}
		startTourStage() {
			const s = TOUR[this.tourStep];
			this.startRound({
				...this.config,
				...s,
				course: s.course,
				humans: 1,
				tour: true,
			});
			this.event("tour", { step: this.tourStep, title: s.title, text: s.text });
		}
		continueTour() {
			if (this.tourStep < 0) return;
			this.tourTimes.push(this.t);
			if (++this.tourStep >= TOUR.length) {
				this.state = "finished";
				this.tourComplete = true;
				this.event("tourComplete");
			} else this.startTourStage();
		}
		startRound(c) {
			this.mode = c.mode;
			this.courseIndex = clamp(c.course | 0, 0, this.world.courses.length - 1);
			this.laps = c.laps || 2;
			this.humans = c.humans || 1;
			this.difficulty = c.difficulty || "normal";
			this.target = c.target || this.tuning.target;
			this.classic = c.classic || false;
			this.limit =
				this.mode === "duel" ? (this.classic ? Infinity : 240) : Infinity;
			this.t = 0;
			this.tick = 0;
			this.score = [0, 0];
			this.exchange = 0;
			this.leadT = 0;
			this.countdown = c.online ? 0 : 3;
			this.state = this.countdown ? "countdown" : "running";
			this.penalty = 0;
			this.message = "";
			this.messageT = 0;
			this.ghost = [];
			this.ghostClock = 0;
			this.finishedResult = null;
			this.tourComplete = false;
			this.tourStageDone = false;
			this.stage = c;
			this.events = [];
			this.dragRun = null;
			this.navigation = null;
			this.cars = [this.makeCar(c.profile ?? 2, 0)];
			if (this.mode === "duel")
				this.cars.push(this.makeCar(c.opponent ?? 4, 1));
			this.placeCars(6, false);
			if (c.tour && c.destination !== undefined)
				this.navigation = this.world.routeBetween(
					this.cars[0],
					this.world.courses[c.destination].gates[0],
				);
			this.event("grid");
		}
		makeCar(profile, seat) {
			const car = new E.Car({
				r: 8,
				h: 10,
				reverse: 0,
				auto: false,
				ground: (x, y) => this.world.surface(x, y),
			});
			car.profile = profile;
			car.seat = seat;
			car.crashed = 0;
			car.immunity = 0;
			car.recoverHold = 0;
			car.recoverUsed = false;
			car.stuck = 0;
			car.route = {
				index: 0,
				d: 6,
				total: 0,
				gate: 1,
				lap: 0,
				lastGate: 0,
				lapT: 0,
				splits: [],
				valid: true,
				wrong: false,
			};
			this.applyProfile(car);
			return car;
		}
		applyProfile(car) {
			const p = PROFILES[car.profile],
				t = this.tuning;
			Object.assign(car.o, {
				top: p.top * t.speed,
				accel: p.accel * t.acceleration,
				brake: 280 * t.braking,
				turn: p.turn * t.steering,
				grip: p.grip * t.roadGrip,
				reverse: 0,
				surfaces: {
					road: { top: 1, grip: 1 },
					grass: { top: 0.44, grip: t.grassGrip / t.roadGrip },
					gravel: { top: 0.67, grip: t.gravelGrip / t.roadGrip },
					water: { top: 0.1, grip: 0.2 },
				},
			});
		}
		placeCars(d = 6, keep = true) {
			const p = this.course.path.at(d),
				N = this.course.gates.length;
			for (let i = 0; i < this.cars.length; i++) {
				const c = this.cars[i],
					side = this.cars.length > 1 ? (i ? 14 : -14) : 0;
				c.x = p.x - Math.sin(p.angle) * side;
				c.y = p.y + Math.cos(p.angle) * side;
				c.angle = p.angle;
				c.vx = c.vy = c.vz = c.speed = c.slide = 0;
				c.z = 0;
				c.onGround = true;
				c.crashed = 0;
				c.immunity = 1.8;
				c.recoverHold = 0;
				c.stuck = 0;
				const proj = project(this.course, c.x, c.y);
				c.route.index = proj.index;
				c.route.d = proj.d;
				c.route.wrong = false;
				c.route.valid = true;
				if (!keep) {
					c.route.total = 0;
					c.route.gate = 1;
					c.route.lastGate = 0;
					c.route.lap = 0;
				} else {
					const gi = (((this.restartGate || 0) % N) + N) % N;
					c.route.gate = (gi + 1) % N;
					c.route.lastGate = gi;
					c.route.total = this.restartTotal || 0;
				}
			}
		}
		announce(text) {
			this.message = text;
			this.messageT = 3.2;
		}
		recover(i, reason = "recovery") {
			const c = this.cars[i];
			if (!c || c.crashed || this.state !== "running") return;
			c.crashed = 0.85;
			c.crashReason = reason;
			c.vx = c.vy = c.speed = c.slide = 0;
			this.tourDemonstrated.recover = true;
			if (reason !== "recovery") this.tourDemonstrated.crash = true;
			this.event(reason === "water" ? "water" : "crash", { seat: i, reason });
		}
		safeRestart(c) {
			if (this.mode === "free" && c.lastSafe) {
				Object.assign(c, c.lastSafe);
				c.speed = c.vx = c.vy = c.slide = 0;
				c.crashed = 0;
				c.immunity = 2;
				c.recoverHold = 0;
				c.stuck = 0;
				this.event("recover", { seat: c.seat });
				return;
			}
			const g = this.course.gates[c.route.lastGate],
				p = this.course.path.at(g.d + 8);
			c.x = p.x;
			c.y = p.y;
			c.angle = p.angle;
			c.speed = c.vx = c.vy = c.slide = 0;
			c.crashed = 0;
			c.immunity = 2;
			c.recoverHold = 0;
			c.stuck = 0;
			const q = project(this.course, c.x, c.y);
			c.route.index = q.index;
			c.route.d = q.d;
			c.route.valid = true;
			c.route.gate = (c.route.lastGate + 1) % this.course.gates.length;
			c.route.wrong = false;
			this.event("recover", { seat: c.seat });
		}
		aiIntent(c, pace = 1) {
			const nav = this.mode === "free" && this.navigation,
				route = nav ? { ...nav, width: 34 } : this.course,
				q = project(route, c.x, c.y, nav ? undefined : c.route.index),
				v = Math.max(35, c.speed),
				look = 30 + v * 0.32,
				p = route.path.at(nav ? Math.min(q.d + look, nav.length) : q.d + look),
				lane = this.mode === "duel" ? (c.seat === 0 ? -15 : 17) : 0,
				tx = p.x - Math.sin(p.angle) * lane,
				ty = p.y + Math.cos(p.angle) * lane,
				a = Math.atan2(ty - c.y, tx - c.x),
				da = diff(c.angle, a);
			let curvature = 0;
			for (let k = 0; k < 5; k++) {
				const p0 = route.path.at(
						nav ? Math.min(nav.length, q.d + 18 + k * 25) : q.d + 18 + k * 25,
					),
					p1 = route.path.at(
						nav ? Math.min(nav.length, q.d + 43 + k * 25) : q.d + 43 + k * 25,
					);
				curvature = Math.max(
					curvature,
					Math.abs(diff(p0.angle, p1.angle)) / 25,
				);
			}
			const level =
					this.difficulty === "easy"
						? 0.78
						: this.difficulty === "hard"
							? 1
							: 0.9,
				top = Math.min(
					c.o.top * pace * this.tuning.aiPace * (this.aiAll ? 1 : level),
					Math.sqrt(210 / Math.max(0.0001, curvature)),
				),
				brake = c.speed > top ? clamp((c.speed - top) / 28, 0, 1) : 0;
			return {
				steer: clamp(da * 2.7, -1, 1),
				gas: c.speed < top ? 1 : 0,
				brake,
				recover: !c.route.valid || c.stuck > 4,
			};
		}
		controls(c, input) {
			const it = {
				steer: clamp(Number(input?.steer) || 0, -1, 1),
				gas: clamp(Number(input?.gas) || 0, 0, 1),
				brake: clamp(Number(input?.brake) || 0, 0, 1),
				recover: !!input?.recover,
			};
			if (input?.safe) {
				it.gas = 0;
				it.brake = 1;
			} else if (this.settings.auto && it.brake < 0.025 && !input?.ai)
				it.gas = 1;
			if (it.brake > 0.025) it.gas = 0;
			return it;
		}
		updateRoute(c, old, dt) {
			const r = c.route,
				q = project(this.course, c.x, c.y, r.index),
				L = this.course.length;
			let dd = q.d - r.d;
			if (dd > L / 2) dd -= L;
			if (dd < -L / 2) dd += L;
			const moved = Math.hypot(c.x - old.x, c.y - old.y),
				stepLimit = Math.max(8, c.o.top * dt * 2.5),
				continuous = Math.abs(dd) < stepLimit && moved < stepLimit,
				withinRoute = q.dist < this.course.width + 8,
				legal = withinRoute && continuous;
			r.wrong = Math.abs(diff(c.angle, q.angle)) > 2.1 && c.speed > 12;
			// Keep local projection current through a brief shoulder excursion, but
			// award competitive distance only inside this circuit's legal corridor.
			if (continuous) {
				r.index = q.index;
				r.d = q.d;
				if (legal) r.total += dd;
			}
			if (
				!continuous ||
				(!withinRoute && this.world.surface(c.x, c.y) === "road")
			)
				r.valid = false;
			const g = this.course.gates[r.gate];
			// A missed gate needs an explicit return cue, even if the driver later
			// reaches a nearby road without a teleport or a visibly hard impact.
			if (
				crossGate(g, old.x, old.y, c.x, c.y, Infinity) &&
				(!legal || !crossGate(g, old.x, old.y, c.x, c.y, this.course.width + 4))
			)
				r.valid = false;
			if (
				legal &&
				r.valid &&
				crossGate(g, old.x, old.y, c.x, c.y, this.course.width + 4)
			) {
				r.lastGate = r.gate;
				r.gate = (r.gate + 1) % this.course.gates.length;
				this.event("gate", { seat: c.seat, gate: r.lastGate });
				if (r.lastGate === 0) {
					r.lap++;
					r.splits.push(r.lapT);
					r.lapT = 0;
					this.event("lap", {
						seat: c.seat,
						lap: r.lap,
						split: r.splits.at(-1),
					});
					if (c.seat === 0 && this.mode === "trial" && r.lap >= this.laps)
						this.finish("Five roads. One fine driver!");
				}
			}
		}
		resolveDuel(crashes) {
			if (this.state !== "running") return;
			let winner = -1,
				points = 0,
				reason = "";
			if (crashes.length) {
				if (crashes.length === 1) {
					winner = 1 - crashes[0];
					points = 2;
					reason = "Rival crash";
				} else reason = "Both cars crash · no points";
			} else {
				const gap = this.cars[0].route.total - this.cars[1].route.total;
				if (
					Math.abs(gap) >= this.tuning.lead &&
					this.cars.every((c) => c.route.valid && !c.route.wrong)
				) {
					this.leadT += 1 / 120;
					if (this.leadT >= 0.35) {
						winner = gap > 0 ? 0 : 1;
						points = 1;
						reason = "Clear lead";
						this.tourDemonstrated.lead = true;
					}
				} else this.leadT = 0;
			}
			if (!crashes.length && !points) return;
			if (winner >= 0) {
				this.score[winner] += points;
				this.event("point", {
					seat: winner,
					points,
					reason,
					score: [...this.score],
				});
				this.announce(
					`${winner === 0 ? "DRIVER 1" : "DRIVER 2"} +${points} · ${reason}`,
				);
			} else {
				this.event("exchange", { reason });
				this.announce(reason);
			}
			if (Math.max(...this.score) >= this.target) {
				this.finish(
					this.score[0] === this.score[1]
						? "A sporting draw!"
						: `Driver ${this.score[0] > this.score[1] ? 1 : 2} takes the flag!`,
				);
				return;
			}
			const leader =
				this.cars[this.cars[0].route.total >= this.cars[1].route.total ? 0 : 1];
			this.restartGate = leader.route.lastGate;
			this.restartTotal = leader.route.total;
			this.state = "exchange";
			this.countdown = 2.4;
			this.exchange++;
			this.leadT = 0;
			this.placeCars(this.course.gates[this.restartGate].d + 8, true);
		}
		finish(reason) {
			if (this.state === "finished") return;
			this.state = "finished";
			this.finishedResult = {
				reason,
				time: this.t,
				penalty: this.penalty,
				score: [...this.score],
				splits: [...this.cars[0].route.splits],
				ranked: !this.dev && !this.attract,
				tour: this.tourStep >= 0,
			};
			if (this.tourStep >= 0) this.tourStageDone = true;
			this.event("finish", this.finishedResult);
		}
		step(dt, inputs = []) {
			if (this.state === "idle" || this.state === "finished") return;
			this.tick++;
			this.messageT = Math.max(0, this.messageT - dt);
			if (this.state === "countdown" || this.state === "exchange") {
				const prev = Math.ceil(this.countdown);
				this.countdown -= dt;
				if (Math.ceil(this.countdown) !== prev)
					this.event("countdown", { number: Math.ceil(this.countdown) });
				if (this.countdown <= 0) {
					this.state = "running";
					this.event("go");
				}
				return;
			}
			this.t += dt;
			const crashes = [];
			for (let i = 0; i < this.cars.length; i++) {
				const c = this.cars[i];
				this.applyProfile(c);
				c.immunity = Math.max(0, c.immunity - dt);
				c.route.lapT += dt;
				if (c.crashed > 0) {
					c.crashed -= dt;
					if (c.crashed <= 0 && this.mode !== "duel") this.safeRestart(c);
					continue;
				}
				const ai = this.aiAll || i >= this.humans,
					raw = ai ? { ...this.aiIntent(c), ai: true } : inputs[i],
					it = this.controls(c, raw);
				if (it.brake > 0.15) this.tourDemonstrated.brake = true;
				if (!it.recover) c.recoverUsed = false;
				c.recoverHold = it.recover && !c.recoverUsed ? c.recoverHold + dt : 0;
				const old = { x: c.x, y: c.y },
					speed = c.speed;
				c.update(dt, null, it);
				// E.Car's reversible brake is disabled through reverse:0 and forward projection clamping.
				if (c.speed < 0) {
					c.speed = 0;
					c.vx = -Math.sin(c.angle) * c.slide;
					c.vy = Math.cos(c.angle) * c.slide;
				}
				if (c.surface === "grass") this.tourDemonstrated.grass = true;
				if (c.surface === "gravel") this.tourDemonstrated.gravel = true;
				if (!this.invulnerable && !this.attract && c.immunity <= 0) {
					if (c.surface === "water") {
						this.recover(i, "water");
						crashes.push(i);
					} else
						for (const s of this.world.solids) {
							const d = Math.hypot(c.x - s.x, c.y - s.y);
							if (d < c.r + s.r) {
								const nx = (c.x - s.x) / (d || 1),
									ny = (c.y - s.y) / (d || 1);
								c.x = s.x + nx * (c.r + s.r + 0.2);
								c.y = s.y + ny * (c.r + s.r + 0.2);
								if (speed > this.tuning.crash) {
									this.recover(i, "hard impact");
									crashes.push(i);
								} else {
									const v = c.vx * nx + c.vy * ny;
									if (v < 0) {
										c.vx -= v * 1.2 * nx;
										c.vy -= v * 1.2 * ny;
									}
									c.speed = Math.max(
										0,
										c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle),
									);
								}
								break;
							}
						}
				}
				if (c.recoverHold >= 0.65 && !c.crashed) {
					c.recoverUsed = true;
					this.recover(i, "recovery");
					crashes.push(i);
					if (this.mode === "trial") {
						this.penalty += 3;
						this.t += 3;
						this.announce("RECOVERY · +3 seconds");
					}
				}
				if (
					c.crashed &&
					this.mode === "trial" &&
					c.crashReason !== "recovery"
				) {
					this.penalty += 3;
					this.t += 3;
					this.announce("CRASH · +3 seconds. Returning to the last gate.");
				}
				if (!c.crashed) {
					if (this.mode !== "free") this.updateRoute(c, old, dt);
					else if (c.surface === "road") {
						const n = this.world.nearestRoad(c.x, c.y);
						if (n.road) c.lastSafe = { x: n.x, y: n.y, angle: n.angle };
					}
					if (c.speed < 4 && it.gas > 0.1) c.stuck += dt;
					else c.stuck = 0;
				}
			}
			if (this.cars.length > 1) {
				const a = this.cars[0],
					b = this.cars[1];
				if (Math.hypot(a.x - b.x, a.y - b.y) < 0.001) {
					b.x += 0.01;
				}
				E.Car.collide(this.cars);
			}
			if (this.mode === "duel") {
				this.resolveDuel(crashes);
				if (this.t >= this.limit)
					this.finish(
						this.score[0] === this.score[1]
							? "Time! A sporting draw."
							: `Time! Driver ${this.score[0] > this.score[1] ? 1 : 2} wins.`,
					);
			}
			if (this.mode === "free") this.freeRules(dt);
			this.ghostClock += dt;
			if (this.mode === "trial" && this.ghostClock >= 0.1) {
				const c = this.cars[0];
				this.ghost.push([
					+this.t.toFixed(3),
					+c.x.toFixed(2),
					+c.y.toFixed(2),
					+c.angle.toFixed(4),
				]);
				this.ghostClock = 0;
			}
		}
		freeRules(dt) {
			const c = this.cars[0];
			for (const d of this.world.discoveries) {
				if (
					Math.hypot(c.x - d.x, c.y - d.y) < (d.radius || d.r || 130) &&
					!this.discovered.has(d.id)
				) {
					this.discovered.add(d.id);
					this.event("discovery", { id: d.id, name: d.name });
					this.announce(`PASSPORT STAMP · ${d.name}`);
				}
			}
			if (this.tourStep >= 0 && TOUR[this.tourStep].destination !== undefined) {
				const target =
					this.world.courses[TOUR[this.tourStep].destination].path.at(6);
				if (Math.hypot(c.x - target.x, c.y - target.y) < 160)
					this.finish("Connection found! Welcome to the lake.");
			}
			const d = this.world.drag;
			if (d) {
				const near = Math.hypot(c.x - d.start.x, c.y - d.start.y);
				if (!this.dragRun && near < 35 && c.speed < 20) {
					this.dragRun = { t: this.t, started: false };
					this.announce("HIDDEN STRAIGHT · Release the brake and go!");
					this.event("discovery", {
						id: "airfield",
						name: "The hidden straight",
					});
				}
				if (this.dragRun) {
					if (c.speed > 22) this.dragRun.started = true;
					if (
						this.dragRun.started &&
						Math.hypot(c.x - d.finish.x, c.y - d.finish.y) < 50
					) {
						const time = this.t - this.dragRun.t;
						this.dragBest = Math.min(this.dragBest || Infinity, time);
						this.event("dragFinish", { time });
						this.announce(`STRAIGHT RUN · ${time.toFixed(2)} seconds`);
						this.dragRun = null;
					} else if (this.t - this.dragRun.t > 80) this.dragRun = null;
				}
			}
		}
		snapshot() {
			return {
				v: 1,
				mode: this.mode,
				state: this.state,
				ci: this.courseIndex,
				t: +this.t.toFixed(3),
				tick: this.tick,
				score: this.score,
				ex: this.exchange,
				cd: +this.countdown.toFixed(3),
				target: this.target,
				laps: this.laps,
				penalty: this.penalty,
				message: this.message,
				messageT: this.messageT,
				finished: this.finishedResult,
				cars: this.cars.map((c) => ({
					x: +c.x.toFixed(2),
					y: +c.y.toFixed(2),
					a: +c.angle.toFixed(4),
					vx: +c.vx.toFixed(2),
					vy: +c.vy.toFixed(2),
					s: +c.speed.toFixed(2),
					p: c.profile,
					cr: c.crashed,
					im: c.immunity,
					r: { ...c.route, splits: c.route.splits.slice(-5) },
				})),
			};
		}
		applySnapshot(s) {
			if (
				!s ||
				s.v !== 1 ||
				!Array.isArray(s.cars) ||
				s.cars.length > 2 ||
				!this.world.courses[s.ci]
			)
				return false;
			for (const c of s.cars)
				if (
					![c.x, c.y, c.a, c.vx, c.vy, c.s, c.p].every(Number.isFinite) ||
					Math.abs(c.x) > 20000 ||
					Math.abs(c.y) > 20000 ||
					c.p < 0 ||
					c.p > 4
				)
					return false;
			this.mode = s.mode;
			this.state = s.state;
			this.courseIndex = s.ci;
			this.t = s.t;
			this.tick = s.tick;
			this.score = [...s.score];
			this.exchange = s.ex;
			this.countdown = s.cd;
			this.target = s.target;
			this.laps = s.laps;
			this.penalty = s.penalty;
			this.message = s.message;
			this.messageT = s.messageT;
			this.finishedResult = s.finished;
			while (this.cars.length < s.cars.length)
				this.cars.push(this.makeCar(0, this.cars.length));
			this.cars.length = s.cars.length;
			for (let i = 0; i < s.cars.length; i++) {
				const d = s.cars[i],
					c = this.cars[i];
				Object.assign(c, {
					x: d.x,
					y: d.y,
					angle: d.a,
					vx: d.vx,
					vy: d.vy,
					speed: d.s,
					profile: d.p,
					crashed: d.cr,
					immunity: d.im,
					route: d.r,
				});
			}
			return true;
		}
	}
	root.HappySim = HappySim;
	root.HappyRules = { DEFAULTS, PROFILES, TOUR, project, crossGate };
})(globalThis);
