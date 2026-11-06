/* Fixed-step, authoritative rescue simulation. Presentation never mutates this state. */
(function (root) {
	"use strict";
	const F = root.Moonriders,
		E = root.My3D2dge,
		C = F.clamp;
	const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
	const segment = (a, b, p) => {
		const dx = b.x - a.x,
			dy = b.y - a.y,
			l = dx * dx + dy * dy;
		const t = l ? C(((p.x - a.x) * dx + (p.y - a.y) * dy) / l, 0, 1) : 0;
		return Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y);
	};
	F.segmentDistance = segment;
	const boxHit = (a, b, q, pad = 0) => {
		let lo = 0,
			hi = 1;
		for (const [key, half] of [
			["x", q.w / 2 + pad],
			["y", q.h / 2 + pad],
		]) {
			const d = b[key] - a[key],
				m = q[key] - half,
				n = q[key] + half;
			if (Math.abs(d) < 1e-8) {
				if (a[key] < m || a[key] > n) return false;
			} else {
				let t = (m - a[key]) / d,
					u = (n - a[key]) / d;
				if (t > u) [t, u] = [u, t];
				lo = Math.max(lo, t);
				hi = Math.min(hi, u);
				if (lo > hi) return false;
			}
		}
		return true;
	};
	class Simulation {
		constructor(game, options = {}) {
			this.game = game;
			this.balance = F.validateBalance(options.balance);
			this.mode = options.mode || "operation";
			this.seed = options.seed >>> 0 || 61421;
			this.rng = F.rng(this.seed);
			this.runId = options.runId || "local-" + this.seed;
			this.demo = !!options.demo;
			this.debug = false;
			this.invulnerable = false;
			this.swap = false;
			this.roster = options.roster || [0];
			this.shots = new E.Bullets(game, {
				plane: "ground",
				max: 200,
				sparks: false,
			});
			this.s = {
				runId: this.runId,
				tick: 0,
				seed: this.seed,
				rng: this.rng.state,
				mode: this.mode,
				sector: 0,
				phase: "rescue",
				t: 0,
				elapsed: 0,
				score: 0,
				chain: 0,
				chainLeft: 0,
				rescued: [],
				lost: [],
				credited: [],
				replacementPenalty: 0,
				retries: 0,
				outcome: null,
				ending: "",
				eventSeq: 0,
				events: [],
				entities: [],
				bullets: [],
				scheduled: [],
				spawned: [],
				completedSectors: [],
				sectorRescued: 0,
				layerKills: 0,
				didFire: false,
				warpCount: 0,
				shroudCrossed: false,
				weaponsOff: this.mode === "evasion",
				checkpointNo: 0,
				extractionWarp: false,
				boss: null,
				evasionNext: 0,
				evasionWave: 0,
				banner: "",
				bannerUntil: 0,
				roles: {
					pilot: this.roster[0],
					navigator: this.roster[1] ?? this.roster[0],
					shared: this.roster.length > 1,
				},
				ship: this.ship(),
			};
			this._warpHeld = false;
			this._nextId = 1;
			this._replacementAt = {};
			this._checkpointPending = true;
			this.enter(0);
			if (options.checkpoint) this.restore(options.checkpoint);
			this.checkpoint = this.checkpointData();
		}
		ship() {
			return {
				x: 110,
				y: 135,
				vx: 0,
				vy: 0,
				aimX: 1,
				aimY: 0,
				previewX: 1,
				previewY: 0,
				burstX: 1,
				burstY: 0,
				hull: this.balance.hull,
				energy: 100,
				grace: 0,
				drive: "ready",
				driveT: 0,
				regenDelay: 0,
				cannon: 0,
				recoil: 0,
				bank: 0,
			};
		}
		emit(type, data = {}) {
			const s = this.s;
			const ev = { n: ++s.eventSeq, tick: s.tick, type, ...data };
			s.events.push(ev);
			if (s.events.length > 24) s.events.shift();
			return ev;
		}
		say(text, seconds = 6) {
			this.s.banner = text;
			this.s.bannerUntil = this.s.elapsed + seconds;
			this.emit("radio", { text });
		}
		add(kind, x, y, options = {}) {
			const s = this.s,
				id = options.id || `s${s.sector}-${kind}-${this._nextId++}`;
			if (s.entities.some((x) => x.id === id)) return null;
			const b = this.balance;
			const hp =
				kind === "crystal"
					? b.integrity
					: kind === "layer"
						? Math.round(5 * b.enemyHealth)
						: kind === "guard"
							? Math.round(7 * b.enemyHealth)
							: kind === "organ"
								? Math.round(14 * b.bossHealth)
								: kind === "core"
									? Math.round(32 * b.bossHealth)
									: kind === "mine"
										? 1
										: kind === "drone"
											? 3
											: Math.round(3 * b.enemyHealth);
			const q = {
				id,
				kind,
				x,
				y,
				ox: x,
				oy: y,
				px: x,
				py: y,
				hp,
				maxHp: hp,
				r:
					kind === "layer"
						? 18
						: kind === "guard"
							? 17
							: kind === "organ"
								? 18
								: kind === "core"
									? 22
									: kind === "mine"
										? 6
										: kind === "crystal"
											? 12
											: 13,
				age: 0,
				warning: kind === "crystal" || kind === "mine" ? 0 : b.warning,
				dead: false,
				flash: 0,
				pattern: "arc",
				owner: null,
				state: kind === "mine" ? "deploying" : "alive",
				timer: 2.1,
				wave: 0,
				optional: false,
				safe: false,
				...options,
			};
			if (
				!["crystal", "mine", "core", "organ", "drone"].includes(kind) &&
				dist(q, s.ship) < 90
			) {
				q.x += 160;
				q.ox = q.x;
			}
			s.entities.push(q);
			this.emit(
				kind === "crystal" ? "signal" : kind === "mine" ? "deploy" : "warning",
				{ id, kind, x: q.x, y: q.y },
			);
			return q;
		}
		enter(index, baseline) {
			const s = this.s;
			s.sector = C(index, 0, 3);
			const m = F.MISSIONS[s.sector];
			s.t = 0;
			s.phase = this.mode === "evasion" ? "evasion" : "rescue";
			s.entities = [];
			s.scheduled = [];
			s.spawned = [];
			s.boss = null;
			s.sectorRescued = 0;
			s.layerKills = 0;
			s.didFire = false;
			s.shroudCrossed = false;
			s.weaponsOff = this.mode === "evasion";
			s.warpCount = 0;
			s.extractionWarp = false;
			s.chain = 0;
			s.chainLeft = 0;
			s.evasionNext = 0;
			s.evasionWave = 0;
			s.ship = this.ship();
			this.shots.clear();
			// Preserve the release latch across sector energy resets.
			this._replacementAt = {};
			s.checkpointNo = s.sector;
			if (baseline) Object.assign(s, F.clone(baseline));
			this.say(
				this.mode === "evasion"
					? "EVASION: cannon offline. Rescue and survive for three minutes. Hyperspace is live."
					: m.briefing,
				8,
			);
			this.checkpoint = this.checkpointData();
			this._checkpointPending = true;
			if (this.mode === "operation" && s.sector === 0)
				this.spawnEntry(m.entries[0]);
			this.emit("sector", { sector: s.sector });
		}
		spawnEntry(def) {
			if (this.s.spawned.includes(def.id)) return;
			this.s.spawned.push(def.id);
			this.add(def.kind, def.x, def.y, {
				...def,
				slot: def.kind === "crystal" ? def.id : null,
			});
		}
		checkpointData() {
			const s = this.s;
			return {
				version: 1,
				seed: this.seed,
				mode: this.mode,
				sector: s.sector,
				score: s.score,
				rescued: [...s.rescued],
				lost: [...s.lost],
				credited: [...s.credited],
				replacementPenalty: s.replacementPenalty,
				mineCredit: F.clone(s.mineCredit || {}),
				elapsed: s.elapsed,
				retries: s.retries,
				completedSectors: [...s.completedSectors],
			};
		}
		static validCheckpoint(cp) {
			return (
				!!cp &&
				cp.version === 1 &&
				Number.isInteger(cp.seed) &&
				cp.mode === "operation" &&
				Number.isInteger(cp.sector) &&
				cp.sector >= 0 &&
				cp.sector <= 3 &&
				Number.isFinite(cp.score) &&
				cp.score >= 0 &&
				cp.score < 1e7 &&
				Number.isFinite(cp.elapsed) &&
				cp.elapsed >= 0 &&
				["rescued", "lost", "credited", "completedSectors"].every(
					(k) =>
						Array.isArray(cp[k]) &&
						cp[k].length < 500 &&
						cp[k].every((v) => typeof v === "string"),
				) &&
				Number.isInteger(cp.replacementPenalty) &&
				cp.replacementPenalty >= 0 &&
				Number.isInteger(cp.retries) &&
				cp.retries >= 0 &&
				(cp.mineCredit === undefined ||
					(cp.mineCredit !== null &&
						typeof cp.mineCredit === "object" &&
						!Array.isArray(cp.mineCredit) &&
						Object.keys(cp.mineCredit).length < 500 &&
						Object.values(cp.mineCredit).every(
							(n) => Number.isInteger(n) && n >= 0 && n <= 8,
						)))
			);
		}
		restore(cp) {
			if (!Simulation.validCheckpoint(cp)) return false;
			this.seed = cp.seed;
			this.rng = F.rng(cp.seed ^ (cp.sector * 971));
			const base = F.clone(cp);
			delete base.version;
			delete base.seed;
			delete base.mode;
			delete base.sector;
			this.enter(cp.sector, base);
			this.s.seed = cp.seed;
			this.checkpoint = this.checkpointData();
			return true;
		}
		retry() {
			const cp = F.clone(this.checkpoint);
			cp.retries++;
			this.restore(cp);
			this.s.outcome = null;
			this.emit("retry");
		}
		setRoster(ids) {
			this.roster = [...ids];
			if (ids.length < 2) this.swap = false;
			this._warpHeld = true; // A changed drive owner releases before committing again.
			const p = this.s.ship;
			if (p.drive === "windup") {
				p.drive = "ready";
				p.driveT = 0;
			}
			this.emit("roles", { roster: this.roster });
		}
		tune(raw) {
			const before = this.balance.hull;
			this.balance = F.validateBalance(raw);
			this.s.ship.hull = C(
				this.s.ship.hull + this.balance.hull - before,
				1,
				this.balance.hull,
			);
			this.debug = true;
		}
		damage(source) {
			const s = this.s,
				p = s.ship;
			if (s.outcome || p.grace > 0 || this.invulnerable || this.demo)
				return false;
			p.hull--;
			p.grace = this.balance.grace;
			s.chain = 0;
			s.chainLeft = 0;
			this.emit("damage", { x: p.x, y: p.y, source });
			return true;
		}
		rescue(q) {
			const s = this.s;
			if (q.dead || q.kind !== "crystal" || s.rescued.includes(q.id))
				return false;
			q.dead = true;
			q.state = "rescued";
			s.rescued.push(q.id);
			let points = 0;
			if (!s.credited.includes(q.slot)) {
				s.credited.push(q.slot);
				if (!q.optional) s.sectorRescued++;
				s.chain = C(s.chain + 1, 1, 4);
				s.chainLeft = 34;
				points = 20 * (1 + 0.25 * (s.chain - 1));
				s.score += points;
			}
			this.emit("rescue", { id: q.id, x: q.x, y: q.y, points, chain: s.chain });
			if (s.sector === 0 && this.mode === "operation")
				this.say(
					"Survivor secured. Fire at the amber practice drone. Keep shots away from crystals.",
				);
			return true;
		}
		lose(q) {
			const s = this.s;
			if (q.dead || s.lost.includes(q.id) || s.rescued.includes(q.id))
				return false;
			q.dead = true;
			q.state = "lost";
			s.lost.push(q.id);
			s.chain = 0;
			s.chainLeft = 0;
			if (!q.optional && !s.credited.includes(q.slot))
				this._replacementAt[q.slot] = s.t + 7;
			this.emit("loss", { id: q.id, x: q.x, y: q.y });
			this.say(
				q.optional
					? "Optional signal lost. Continue the rescue."
					: "Signal lost. A replacement rescue group is inbound. Rank penalty recorded.",
			);
			return true;
		}
		kill(q) {
			if (q.dead) return;
			if (q.kind === "crystal") {
				this.lose(q);
				return;
			}
			const s = this.s;
			q.dead = true;
			if (q.kind === "mine") {
				const owner = q.owner || "unlinked";
				s.mineCredit = s.mineCredit || {};
				const credited = s.mineCredit[owner] || 0;
				if (credited < 8) {
					s.score += 1;
					s.mineCredit[owner] = credited + 1;
				}
			} else if (
				["layer", "guard", "interceptor", "drone", "organ"].includes(q.kind)
			)
				s.score += 5;
			this.emit("destroy", { id: q.id, kind: q.kind, x: q.x, y: q.y });
			if (q.kind === "layer" || q.kind === "organ") {
				s.layerKills++;
				let count = 0;
				for (const mine of s.entities)
					if (mine.owner === q.id && !mine.dead) {
						mine.state = "disarmed";
						mine.timer = 0.3 + count++ * 0.055;
						mine.hp = 0;
					}
				this.emit("collapse", { id: q.id, x: q.x, y: q.y, count });
				if (q.kind === "layer" && s.layerKills === 1)
					this.say(
						"Mine-layer down. Its linked field is collapsing. The lane is clear.",
					);
			}
			if (q.kind === "drone")
				this.say(
					"Cannon confirmed. Point the drive, press hyperspace once, then enter the green beacon.",
				);
		}
		formation(owner, pattern, x, y, wave = 0) {
			const s = this.s;
			const mines = [];
			if (pattern === "curtain") {
				const gap = [78, 140, 205][wave % 3];
				for (let yy = 34; yy < 242; yy += 24)
					if (Math.abs(yy - gap) > 27) mines.push([x, yy]);
			}
			if (pattern === "ring") {
				for (let i = 0; i < 10; i++) {
					const a = (i / 10) * Math.PI * 2;
					if (Math.abs(a - Math.PI) < 0.5) continue;
					mines.push([
						x + Math.cos(a) * 42,
						y + Math.sin(a) * 42,
						Math.cos(a) * 3,
						Math.sin(a) * 3,
					]);
				}
			}
			if (pattern === "arc")
				for (let i = 0; i < 7; i++) {
					const a = -0.9 + i * 0.3;
					mines.push([
						x - 45 - i * 18,
						C(y + Math.sin(a) * 55, 32, 238),
						-1.5,
						0,
					]);
				}
			for (const [mx, my, vx = 0, vy = 0] of mines) {
				if (
					Math.hypot(mx - s.ship.x, my - s.ship.y) < 62 ||
					s.entities.some(
						(q) =>
							q.kind === "crystal" &&
							!q.dead &&
							Math.hypot(mx - q.x, my - q.y) < 43,
					)
				)
					continue;
				this.add("mine", mx, C(my, 30, 240), {
					owner,
					pattern,
					vx: vx - (this.mode === "evasion" ? 24 : 0),
					vy,
					life: this.mode === "evasion" ? 19 : 42,
				});
			}
		}
		pressure() {
			return this.balance.pressure * (1 + Math.min(0.3, this.s.score / 2000));
		}
		fireEnemy(q, count = 1) {
			if (q.warning > 0 || Math.abs(q.x - this.s.ship.x) > 420) return;
			const a = Math.atan2(this.s.ship.y - q.y, this.s.ship.x - q.x);
			this.shots.burst(
				{
					x: q.x - 8,
					y: q.y,
					r: 3,
					life: 5,
					team: "hostile",
					color: "#ff795c",
				},
				E.pattern.spread(a, count, 0.23, 68 * this.pressure()),
			);
			this.emit("enemyFire", { id: q.id, x: q.x, y: q.y });
		}
		hitCrystal(q) {
			if (q.dead) return;
			q.hp -= this.balance.damage;
			q.flash = 0.22;
			this.emit("crystalHit", { id: q.id, x: q.x, y: q.y });
			if (q.hp <= 0) this.lose(q);
		}
		finish(won, reason) {
			const s = this.s;
			if (s.outcome) return false;
			if (won)
				for (const q of s.entities)
					if (q.kind === "crystal" && !q.dead) this.lose(q);
			s.outcome = won ? "victory" : "failure";
			s.ending = reason;
			s.ship.vx = s.ship.vy = 0;
			this.shots.clear();
			s.bullets = [];
			this._warpHeld = false;
			if (won && this.mode === "operation") s.score += 100;
			this.emit("terminal", { won, reason });
			return true;
		}
		step(dt, inputs = {}) {
			const s = this.s,
				p = s.ship,
				b = this.balance;
			if (s.outcome) return;
			s.tick++;
			s.t += dt;
			s.elapsed += dt;
			const a = F.resolve(this.roster, inputs, this.swap);
			s.roles = { pilot: a.pilot, navigator: a.navigator, shared: a.shared };
			p.grace = Math.max(0, p.grace - dt);
			p.cannon = Math.max(0, p.cannon - dt);
			p.recoil = Math.max(0, p.recoil - dt * 9);
			p.regenDelay = Math.max(0, p.regenDelay - dt);
			s.chainLeft = Math.max(0, s.chainLeft - dt);
			if (!s.chainLeft) s.chain = 0;
			if (Math.hypot(a.ax, a.ay) > 0.1)
				[p.aimX, p.aimY] = F.direction(a.ax, a.ay);
			[p.previewX, p.previewY] = F.direction(a.wx, a.wy, [p.aimX, p.aimY]);
			const press = a.warp && !this._warpHeld;
			this._warpHeld = a.warp;
			if (press) {
				if (p.drive === "ready" && p.energy >= b.burstCost) {
					p.energy -= b.burstCost;
					p.regenDelay = 1;
					p.drive = "windup";
					p.driveT = 0.15;
					p.burstX = p.previewX;
					p.burstY = p.previewY;
					this.emit("warpPreview", { x: p.x, y: p.y });
				} else
					this.emit("denied", {
						x: p.x,
						y: p.y,
						reason: p.energy < b.burstCost ? "energy" : "busy",
					});
			}
			const prev = { x: p.x, y: p.y };
			if (p.drive !== "ready") {
				p.driveT -= dt;
				if (p.driveT <= 0) {
					if (p.drive === "windup") {
						p.drive = "burst";
						p.driveT = b.burstDuration;
						s.warpCount++;
						if (s.phase === "extraction") s.extractionWarp = true;
						this.emit("warp", { x: p.x, y: p.y, dx: p.burstX, dy: p.burstY });
					} else if (p.drive === "burst") {
						p.drive = "recovery";
						p.driveT = 0.22;
					} else {
						p.drive = "ready";
						p.driveT = 0;
					}
				}
			}
			if (p.drive === "burst") {
				p.vx = p.burstX * b.burstSpeed;
				p.vy = p.burstY * b.burstSpeed;
			} else {
				const k = Math.min(
					1,
					(Math.hypot(a.mx, a.my) > 0.05 ? b.acceleration / b.speed : b.brake) *
						dt,
				);
				p.vx += (a.mx * b.speed - p.vx) * k;
				p.vy += (a.my * b.speed - p.vy) * k;
			}
			const m = F.MISSIONS[s.sector];
			const xmax = this.mode === "evasion" ? 100000 : m.length + 500;
			p.x = C(p.x + p.vx * dt, 28, xmax);
			p.y = C(p.y + p.vy * dt, 32, 238);
			p.bank += (p.vy / b.speed - p.bank) * Math.min(1, dt * 7);
			if (p.drive === "ready" && p.regenDelay === 0)
				p.energy = Math.min(100, p.energy + b.regeneration * dt);
			// Ship contacts secure rescue first, before laser damage and hostile contacts on this tick.
			for (const q of s.entities)
				if (
					!q.dead &&
					q.kind === "crystal" &&
					segment(prev, p, q) <= b.collar + 7
				)
					this.rescue(q);
			if (a.fire && !s.weaponsOff && p.cannon <= 0 && p.drive !== "windup") {
				this.shots.fire({
					id: "b" + s.tick,
					x: p.x + p.aimX * 18,
					y: p.y + p.aimY * 18,
					vx: p.aimX * 350,
					vy: p.aimY * 350,
					team: "player",
					life: 1.6,
					r: 2,
					dmg: b.damage,
					color: "#b9fff0",
				});
				p.cannon = 1 / b.cannonRate;
				p.recoil = 1;
				s.didFire = true;
				this.emit("shot", { x: p.x, y: p.y });
			}
			for (const q of s.entities) {
				if (q.dead) continue;
				q.px = q.x;
				q.py = q.y;
				q.age += dt;
				q.flash = Math.max(0, q.flash - dt);
				q.warning = Math.max(0, q.warning - dt);
				if (q.kind === "crystal") {
					q.y = q.oy + Math.sin(q.age * 0.45) * (q.safe ? 3 : 9);
					q.x = q.ox + Math.sin(q.age * 0.17) * (q.safe ? 0 : 22);
					if (!q.safe && q.age > 140) this.lose(q);
					continue;
				}
				if (q.kind === "mine") {
					if (q.state === "disarmed") {
						q.timer -= dt;
						if (q.timer <= 0) {
							q.dead = true;
							this.emit("disarm", { x: q.x, y: q.y });
						}
						continue;
					}
					q.state =
						q.age < 0.3
							? "deploying"
							: q.age < 0.3 + b.arming
								? "arming"
								: "active";
					q.x += (q.vx || 0) * dt;
					q.y = C(q.y + (q.vy || 0) * dt, 28, 242);
					if (q.age > (q.life || 42)) q.dead = true;
					if (q.state === "active" && segment(prev, p, q) < q.r + 7) {
						this.damage(q.id);
						q.dead = true;
						this.emit("destroy", { kind: "mine", x: q.x, y: q.y });
					}
					continue;
				}
				if (q.warning > 0) continue;
				q.timer -= dt;
				if (q.kind === "layer") {
					if (this.mode === "evasion") q.x = q.ox - q.age * 18;
					q.y = q.oy + Math.sin(q.age * 0.75) * 18;
					if (q.timer <= 0 && Math.abs(q.x - p.x) < 570) {
						this.formation(q.id, q.pattern, q.x - 95, q.y, q.wave++);
						q.timer = (s.sector === 1 ? 10 : 8) / this.pressure();
						this.emit("lay", { id: q.id, x: q.x, y: q.y });
					}
				}
				if (q.kind === "interceptor") {
					q.y = C(q.oy + Math.sin(q.age * 0.9) * 42, 38, 232);
					q.x = q.ox + Math.sin(q.age * 0.48) * 60;
					if (q.timer <= 0) {
						this.fireEnemy(q, 2);
						q.timer = 4 / this.pressure();
					}
				}
				if (q.kind === "guard") {
					q.open = q.age % 4.8 > 2.5;
					q.y = q.oy + Math.sin(q.age * 0.6) * 8;
					if (q.timer <= 0) {
						this.fireEnemy(q, 3);
						q.timer = 4.8 / this.pressure();
					}
				}
				if (q.kind === "organ" && s.boss?.phase === "fields" && q.timer <= 0) {
					this.formation(q.id, q.pattern, q.x - 130, q.y, q.wave++);
					q.timer = 7 / this.pressure();
					this.emit("lay", { id: q.id, x: q.x, y: q.y });
				}
				if (q.kind === "core" && s.boss?.phase === "core" && q.timer <= 0) {
					this.fireEnemy(q, 3);
					q.timer = 2.9 / this.pressure();
				}
				if (
					!["core", "drone"].includes(q.kind) &&
					segment(prev, p, q) < q.r + 7
				)
					this.damage(q.id);
			}
			// Swept projectile collision in nearest-first order. Crystals always stop shots.
			for (const shot of this.shots.list) {
				shot.px = shot.x;
				shot.py = shot.y;
			}
			this.shots.update(dt);
			for (const shot of this.shots.list) {
				const from = { x: shot.px, y: shot.py };
				if (shot.team === "hostile") {
					if (segment(from, shot, p) < shot.r + 6) {
						this.damage("laser");
						shot.dead = true;
					}
					continue;
				}
				const targets = s.entities
					.filter(
						(q) =>
							!q.dead &&
							q.state !== "disarmed" &&
							q.warning <= 0 &&
							segment(from, shot, q) < q.r + shot.r,
					)
					.sort((q, r) => dist(from, q) - dist(from, r));
				const q = targets[0];
				if (q) {
					shot.dead = true;
					if (q.kind === "crystal") this.hitCrystal(q);
					else if (q.kind === "guard" && !q.open)
						this.emit("shield", { x: q.x, y: q.y });
					else {
						q.hp -= shot.dmg;
						q.flash = 0.1;
						this.emit("hit", { id: q.id, x: q.x, y: q.y });
						if (q.hp <= 0) this.kill(q);
					}
				} else if (
					s.boss &&
					s.boss.phase !== "destroyed" &&
					boxHit(from, shot, s.boss.hull)
				)
					shot.dead = true;
			}
			this.shots.list = this.shots.list.filter((q) => !q.dead);
			if (
				s.boss &&
				s.boss.phase !== "destroyed" &&
				boxHit(prev, p, s.boss.hull, 7)
			) {
				this.damage("carrier hull");
				p.x = prev.x;
				p.y = prev.y;
				p.vx = p.vy = 0;
			}
			// A lethal hull hit wins the race against carrier destruction; terminal victory is latched thereafter.
			if (p.hull <= 0) {
				this.finish(
					false,
					"The rescue ship was lost. The last checkpoint is ready.",
				);
				return;
			}
			this.direct(dt);
			s.entities = s.entities.filter(
				(q) => !q.dead && (q.kind === "crystal" || Math.abs(q.x - p.x) < 1600),
			);
			s.rng = this.rng.state;
			s.bullets = this.shots.list.map((q) => ({
				x: q.x,
				y: q.y,
				vx: q.vx,
				vy: q.vy,
				r: q.r,
				team: q.team,
			}));
		}
		direct(dt) {
			const s = this.s,
				p = s.ship,
				m = F.MISSIONS[s.sector];
			if (this.mode === "evasion") {
				if (Math.floor(s.t / 5) > (s.survivalCredit || 0)) {
					s.survivalCredit = Math.floor(s.t / 5);
					s.score += 1;
				}
				if (s.t >= 180) {
					this.finish(
						true,
						"Three minutes clear. The evacuation fleet has your signal.",
					);
					return;
				}
				if (s.t >= s.evasionNext) {
					const w = s.evasionWave++,
						x = p.x + 255,
						y = [90, 180, 135][w % 3],
						layer = this.add("layer", x + 120, y, {
							pattern: ["curtain", "ring", "arc"][w % 3],
						});
					if (layer) layer.timer = 1.8;
					this.add("crystal", x + 20, [178, 70, 135][w % 3], {
						slot: "ev-" + w,
						optional: true,
					});
					if (w > 3 && w % 3 === 0)
						this.add("interceptor", x + 130, y > 135 ? 70 : 200);
					s.evasionNext += Math.max(7, 16 - s.t / 25);
				}
				return;
			}
			for (const def of m.entries)
				if (!s.spawned.includes(def.id) && def.x - p.x < 620)
					this.spawnEntry(def);
			for (const [slot, at] of Object.entries(this._replacementAt))
				if (s.t >= at && !s.credited.includes(slot)) {
					delete this._replacementAt[slot];
					s.replacementPenalty++;
					this.add(
						"crystal",
						C(p.x + 175, 80, m.length - 70),
						C(p.y, 70, 205),
						{ slot, replacement: true },
					);
					this.say(
						"Replacement signal ahead. Contact rescue remains the priority.",
					);
				}
			if (m.shroud) {
				const off = p.x >= m.shroud[0] && p.x < m.shroud[1];
				if (off !== s.weaponsOff) {
					s.weaponsOff = off;
					if (!off && p.x >= m.shroud[1]) s.shroudCrossed = true;
					this.say(
						off
							? "ION SHROUD. Cannon suppressed. Use the open mine gaps and hyperspace."
							: "Clear of the shroud. Cannon restored.",
					);
					this.emit("shroud", { active: off });
				}
				if (
					p.x > m.shroud[0] - 300 &&
					p.x < m.shroud[0] &&
					!s.spawned.includes("shroud-warning")
				) {
					s.spawned.push("shroud-warning");
					this.say(
						"Ion shroud ahead. Lasers will drop out inside the blue band.",
					);
				}
			}
			if (s.sector === 3) {
				this.bossDirector();
				return;
			}
			let goal = s.sectorRescued >= m.quota;
			if (s.sector === 0)
				goal =
					goal &&
					s.didFire &&
					!s.entities.some((q) => q.id === "drill" && !q.dead) &&
					s.warpCount > 0;
			if (s.sector === 1) goal = goal && s.layerKills > 0;
			if (s.sector === 2) goal = goal && s.shroudCrossed;
			if (
				s.sector === 1 &&
				s.sectorRescued >= m.quota &&
				!s.layerKills &&
				!s.entities.some((q) => q.kind === "layer" && !q.dead)
			) {
				this.add("layer", C(p.x + 200, 200, m.length - 160), 85, {
					id: "reach-beacon-lock",
					pattern: "curtain",
				});
				this.say(
					"One mine-layer still holds the beacon lock. Its signal is ahead.",
				);
			}
			s.phase = goal ? "beacon" : "rescue";
			if (
				s.phase === "beacon" &&
				Math.hypot(p.x - (m.length - 80), p.y - 135) < 42
			) {
				for (const q of s.entities)
					if (q.kind === "crystal" && !q.dead) this.lose(q);
				s.completedSectors.push(m.id);
				this.emit("checkpoint");
				this.enter(s.sector + 1);
			}
		}
		bossDirector() {
			const s = this.s,
				p = s.ship,
				m = F.MISSIONS[3];
			if (!s.boss && p.x > m.bossX - 580) {
				s.boss = {
					phase: "fields",
					x: m.bossX,
					y: 135,
					hull: { x: m.bossX + 100, y: 135, w: 160, h: 126 },
					phaseT: 0,
				};
				this.add("organ", m.bossX + 7, 58, {
					id: "organ-north",
					pattern: "curtain",
					timer: 2.8,
				});
				this.add("organ", m.bossX + 7, 212, {
					id: "organ-south",
					pattern: "arc",
					timer: 5,
				});
				this.say(
					"PRISON CARRIER. Two field organs control the mine screen. Silence both.",
				);
				this.emit("bossPhase", { phase: "fields" });
			}
			const boss = s.boss;
			if (!boss) return;
			boss.phaseT += 1 / 120;
			if (
				boss.phase === "fields" &&
				!s.entities.some((q) => q.kind === "organ" && !q.dead)
			) {
				boss.phase = "prisoners";
				boss.phaseT = 0;
				s.phase = "prisoners";
				this.shots.clear("hostile");
				for (let i = 0; i < m.quota; i++)
					this.add(
						"crystal",
						m.bossX + m.release.x + i * m.release.dx,
						m.quota === 1
							? 135
							: m.release.minY +
									(i / (m.quota - 1)) * (m.release.maxY - m.release.minY),
						{
							id: "carrier-pod-" + i,
							slot: "carrier-pod-" + i,
						},
					);
				this.say(
					"Prison cells opening. Cease fire. Rescue every prisoner before attacking the core.",
				);
				this.emit("bossPhase", { phase: "prisoners" });
			}
			if (boss.phase === "prisoners") {
				if (boss.phaseT > 6 && !s.spawned.includes("carrier-guard")) {
					s.spawned.push("carrier-guard");
					this.add("guard", m.bossX - 80, 135, { id: "carrier-guard" });
				}
				if (s.sectorRescued >= m.quota) {
					boss.phase = "core";
					boss.phaseT = 0;
					s.phase = "core";
					this.add("core", m.bossX + 5, 135, { id: "carrier-core" });
					this.say(
						"All prisoners secured. The core is exposed. Finish the carrier.",
					);
					this.emit("bossPhase", { phase: "core" });
				}
			}
			if (
				boss.phase === "core" &&
				!s.entities.some((q) => q.kind === "core" && !q.dead)
			) {
				boss.phase = "destroyed";
				s.phase = "extraction";
				s.entities = [];
				this.shots.clear();
				// Extraction also requires a new release/press; keep the existing drive latch.
				s.extractionWarp = false;
				this.say(
					"Carrier disabled. One final hyperspace burst. Reach the evacuation ring.",
				);
				this.emit("bossPhase", { phase: "destroyed" });
			}
			if (
				boss.phase === "destroyed" &&
				s.extractionWarp &&
				Math.hypot(p.x - (m.length - 80), p.y - 135) < 50
			)
				this.finish(
					true,
					s.lost.length
						? "The crew is aboard. We carry the names of those we could not reach."
						: "Every signal answered. Every survivor home. Freedom has a flight path.",
				);
		}
		objective() {
			const s = this.s,
				m = F.MISSIONS[s.sector];
			if (s.outcome)
				return s.outcome === "victory"
					? "The crew is home"
					: "Rescue ship lost";
			if (this.mode === "evasion")
				return `Survive · ${Math.max(0, Math.ceil(180 - s.t))}s · CANNON OFFLINE`;
			if (s.phase === "extraction")
				return s.extractionWarp
					? "Reach the evacuation ring"
					: "Commit hyperspace · then reach the ring";
			if (s.boss?.phase === "fields") return "Disable both field organs";
			if (s.boss?.phase === "core") return "Destroy the exposed core";
			if (s.phase === "beacon") return "All clear · reach the green beacon";
			if (s.sector === 0 && s.sectorRescued) {
				if (s.entities.some((q) => q.id === "drill"))
					return "Aim and fire at the amber practice drone";
				return s.warpCount
					? "Reach the green beacon"
					: "Point the drive · commit hyperspace";
			}
			const extra =
				s.sector === 1 && s.sectorRescued >= m.quota && !s.layerKills
					? " · destroy a mine-layer"
					: "";
			return `Rescue ${Math.min(s.sectorRescued, m.quota)} / ${m.quota}${extra}`;
		}
		target() {
			const s = this.s,
				p = s.ship,
				m = F.MISSIONS[s.sector];
			if (this.mode === "evasion") {
				const ahead = s.entities
					.filter((q) => q.kind === "crystal" && !q.dead && q.x > p.x - 60)
					.sort((a, b) => dist(a, p) - dist(b, p));
				return ahead[0] || { x: p.x + 320, y: 135, kind: "beacon" };
			}
			if (s.phase === "beacon" || s.phase === "extraction")
				return { x: m.length - 80, y: 135, kind: "beacon" };
			if (s.boss?.phase === "fields")
				return s.entities
					.filter((q) => q.kind === "organ")
					.sort((a, b) => dist(a, p) - dist(b, p))[0];
			if (s.boss?.phase === "core")
				return s.entities.find((q) => q.kind === "core");
			const live = s.entities.filter(
				(q) => q.kind === "crystal" && !q.dead && !s.credited.includes(q.slot),
			);
			if (live.length) return live.sort((a, b) => dist(a, p) - dist(b, p))[0];
			if (
				s.sector === 0 &&
				s.sectorRescued &&
				s.entities.some((q) => q.id === "drill")
			)
				return s.entities.find((q) => q.id === "drill");
			if (s.sector === 1 && s.sectorRescued >= m.quota && !s.layerKills)
				return (
					s.entities.find((q) => q.kind === "layer") || {
						x: 850,
						y: 85,
						kind: "layer",
					}
				);
			const next = m.entries.find(
				(q) => q.kind === "crystal" && !s.spawned.includes(q.id),
			);
			return (
				next || {
					x: s.sector === 3 && !s.boss ? m.bossX - 330 : m.length - 80,
					y: 135,
					kind: "beacon",
				}
			);
		}
		snapshot() {
			return F.clone({
				...this.s,
				objective: this.objective(),
				target: this.target(),
				debug: this.debug,
				demo: this.demo,
				balance: this.balance,
				lastError: this.game.errors?.at(-1)?.message || null,
			});
		}
	}
	F.Simulation = Simulation;
})(typeof globalThis === "object" ? globalThis : window);
