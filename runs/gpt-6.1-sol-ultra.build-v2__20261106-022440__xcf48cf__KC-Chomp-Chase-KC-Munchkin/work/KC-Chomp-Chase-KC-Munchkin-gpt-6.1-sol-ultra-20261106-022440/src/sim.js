/* K.C. Chomp Chase — authoritative fixed-step maze rules. */
(function (G) {
	"use strict";
	const DIRS = [
			[0, -1],
			[1, 0],
			[0, 1],
			[-1, 0],
		],
		FIXED = 1 / 120;
	const DEFAULTS = Object.freeze({
		playerSpeed: 6,
		foodBase: 0.62,
		foodFinal: 1,
		enemySpeed: 3.05,
		reaction: 0.36,
		powerDuration: 6,
		gatePeriod: 2.6,
		revealCooldown: 4,
		damageGrace: 1.2,
		lives: 5,
		invulnerable: false,
	});
	const clone = (value) => JSON.parse(JSON.stringify(value));
	const key = (x, y) => x + "," + y;
	const opposite = (d) => (d + 2) % 4;
	function hash(seed) {
		let h = 2166136261;
		for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
		return h >>> 0 || 1;
	}
	function random(a) {
		a.rng = (Math.imul(a.rng, 1664525) + 1013904223) >>> 0;
		return a.rng / 4294967296;
	}
	class ChompSim {
		constructor(options = {}) {
			this.mode = options.mode || "campaign";
			this.seed = String(options.seed || "CHOMP");
			this.config = { ...DEFAULTS, ...options.config };
			this.seats = (options.seats || [1]).slice(0, 2);
			this.stageIndex = 0;
			this.revision = 0;
			this.tick = 0;
			this.elapsed = 0;
			this.score = 0;
			this.lives = this.config.lives;
			this.events = [];
			this.eventSeq = 0;
			this.phase = "playing";
			this.clearTimer = 0;
			this.grace = 0;
			this.accumulator = 0;
			this.stats = {
				food: 0,
				powered: 0,
				enemies: 0,
				hits: 0,
				chirps: 0,
				tunnels: 0,
				stages: 0,
				finalCatches: [],
				perSeat: {},
			};
			for (const seat of this.seats)
				this.stats.perSeat[seat] = { food: 0, enemies: 0, hits: 0 };
			this.customBoard = options.board ? clone(options.board) : null;
			this.loadBoard(this.selectBoard());
		}
		selectBoard() {
			const C = G.ChompContent;
			if (this.customBoard) return this.customBoard;
			if (this.mode === "remix") return C.generate(this.seed);
			return C.stages[this.stageIndex];
		}
		configure(config) {
			for (const [k, v] of Object.entries(config || {})) {
				if (!(k in DEFAULTS)) continue;
				if (k === "invulnerable") this.config[k] = !!v;
				else if (Number.isFinite(v)) this.config[k] = Math.max(0.01, v);
			}
			return { ...this.config };
		}
		emit(type, data = {}) {
			const e = {
				id: this.revision + ":" + ++this.eventSeq,
				type,
				tick: this.tick,
				...data,
			};
			this.events.push(e);
			if (this.events.length > 64) this.events.shift();
			return e;
		}
		actor(id, kind, pos, dir = 1) {
			return {
				id,
				kind,
				x: pos.x,
				y: pos.y,
				cx: pos.x,
				cy: pos.y,
				tx: pos.x,
				ty: pos.y,
				p: 0,
				moving: false,
				dir,
				desired: null,
				buffer: 0,
				invulnerable: 0,
				anim: 0,
				turn: 0,
				delay: 0,
				rng: hash(this.seed + ":" + this.revision + ":" + id),
				prevX: pos.x,
				prevY: pos.y,
			};
		}
		loadBoard(board) {
			this.board = clone(board);
			this.width = this.board.rows[0].length;
			this.height = this.board.rows.length;
			this.revision++;
			this.gate = {
				active: !!board.gate,
				orientation: 0,
				remaining: this.config.gatePeriod,
				warning: false,
				turn: 0,
			};
			this.power = 0;
			this.chain = 0;
			this.grace = 1.5;
			this.stageElapsed = 0;
			this.reveal = 3;
			this.chirpCooldown = 0;
			this.echo = 0;
			this.lastEcho = null;
			this.phase = "playing";
			this.clearTimer = 0;
			this.players = this.seats.map((seat, i) => ({
				...this.actor(
					"p" + seat,
					"hero",
					board.spawn[i % board.spawn.length],
					i ? 2 : 1,
				),
				seat,
				invulnerable: 1.5,
				actionLatch: false,
			}));
			this.foods = board.foods.map((f, i) => ({
				...this.actor(
					f.id || "f" + i,
					"food",
					f,
					f.dir === undefined ? i % 4 : f.dir,
				),
				power: !!f.power,
				alive: true,
				route: 0,
				commit: 0,
			}));
			this.enemies = board.enemySpawns.map((p, i) => ({
				...this.actor("e" + i, "predator", p, i % 4),
				role: ["follower", "interceptor", "keeper"][i],
				state: "penned",
				release: (board.releaseTimes || [8, 11, 14])[i],
				home: { ...p },
				think: 0,
				target: null,
				charge: 0,
			}));
			this.events = [];
			this.emit("stage", { index: this.stageIndex, name: board.name });
		}
		get actors() {
			return this.players;
		}
		get remaining() {
			return this.foods.reduce((n, f) => n + (f.alive ? 1 : 0), 0);
		}
		foodSpeed(count = this.remaining) {
			return (
				this.config.playerSpeed *
				(this.config.foodBase +
					(this.config.foodFinal - this.config.foodBase) *
						Math.pow((12 - count) / 11, 1.1))
			);
		}
		isOpen(x, y) {
			return (
				x >= 0 &&
				y >= 0 &&
				x < this.width &&
				y < this.height &&
				this.board.rows[y][x] !== "#"
			);
		}
		neighbor(x, y, d, returning = false) {
			const [dx, dy] = DIRS[d];
			let nx = x + dx,
				ny = y + dy;
			let tunnel = false;
			const row = this.board.tunnelRow ?? 7;
			if (
				this.board.tunnels &&
				y === row &&
				ny === row &&
				(nx < 0 || nx >= this.width)
			) {
				nx = (nx + this.width) % this.width;
				tunnel = true;
			}
			if (!this.isOpen(nx, ny)) return null;
			if (this.gate.active && !returning) {
				const c = this.board.gateCenter || {
					x: Math.floor(this.width / 2),
					y: Math.floor(this.height / 2),
				};
				if (x === c.x && y === c.y && d !== this.gate.orientation) return null;
				if (nx === c.x && ny === c.y && opposite(d) !== this.gate.orientation)
					return null;
			}
			return { x: nx, y: ny, dir: d, tunnel };
		}
		neighbors(x, y, returning = false) {
			return DIRS.map((_, d) => this.neighbor(x, y, d, returning)).filter(
				Boolean,
			);
		}
		cell(a) {
			return a.moving && a.p > 0.5
				? { x: a.tx, y: a.ty }
				: { x: a.cx, y: a.cy };
		}
		distances(start, returning = false) {
			const q = [start],
				dist = new Map([[key(start.x, start.y), 0]]);
			for (let i = 0; i < q.length; i++) {
				const p = q[i],
					nd = dist.get(key(p.x, p.y)) + 1;
				for (const n of this.neighbors(p.x, p.y, returning)) {
					const k = key(n.x, n.y);
					if (!dist.has(k)) {
						dist.set(k, nd);
						q.push(n);
					}
				}
			}
			return dist;
		}
		path(a, b, options = {}) {
			const start = { x: Math.round(a.x), y: Math.round(a.y) },
				end = { x: Math.round(b.x), y: Math.round(b.y) };
			if (!this.isOpen(start.x, start.y) || !this.isOpen(end.x, end.y))
				return [];
			const q = [start],
				seen = new Map([[key(start.x, start.y), null]]);
			let found = null;
			for (let i = 0; i < q.length; i++) {
				const p = q[i];
				if (p.x === end.x && p.y === end.y) {
					found = p;
					break;
				}
				for (const n of this.neighbors(p.x, p.y, options.returning)) {
					const k = key(n.x, n.y);
					if (!seen.has(k)) {
						seen.set(k, p);
						q.push(n);
					}
				}
			}
			if (!found) return [];
			const result = [];
			for (let p = found; p; p = seen.get(key(p.x, p.y)))
				result.push({ x: p.x, y: p.y, dir: p.dir });
			return result.reverse();
		}
		directionTo(a, b) {
			for (let d = 0; d < 4; d++) {
				const n = this.neighbor(a.x, a.y, d, true);
				if (n && n.x === b.x && n.y === b.y) return d;
			}
			return null;
		}
		setIntent(a, intent, dt) {
			const d =
				intent &&
				Number.isInteger(intent.dir) &&
				intent.dir >= 0 &&
				intent.dir < 4
					? intent.dir
					: null;
			if (d !== null) {
				a.desired = d;
				a.buffer = 0.15;
				if (!a.moving && !this.neighbor(a.cx, a.cy, d)) {
					this.echo = 0.65;
					this.lastEcho = { x: a.cx, y: a.cy };
				}
			} else a.buffer = Math.max(0, a.buffer - dt);
			if (a.moving && d === opposite(a.dir)) {
				const cx = a.cx,
					cy = a.cy;
				a.cx = a.tx;
				a.cy = a.ty;
				a.tx = cx;
				a.ty = cy;
				a.p = 1 - a.p;
				a.dir = d;
				a.turn = 0.16;
				this.updatePosition(a);
			}
			if (intent?.action && !a.actionLatch && this.chirpCooldown <= 0) {
				this.reveal = Math.max(this.reveal, 2);
				this.chirpCooldown = this.config.revealCooldown;
				this.stats.chirps++;
				a.anim = 0.4;
				this.emit("chirp", { seat: a.seat, x: a.x, y: a.y });
			}
			a.actionLatch = !!intent?.action;
		}
		chooseFood(a) {
			let choices = this.neighbors(a.cx, a.cy);
			if (!choices.length) return null;
			if (choices.length > 1) {
				const nonReverse = choices.filter((n) => n.dir !== opposite(a.dir));
				if (nonReverse.length) choices = nonReverse;
			}
			const playerDistances = this.players.map((p) =>
				this.distances(this.cell(p)),
			);
			let best = choices[0],
				max = -Infinity;
			for (const n of choices) {
				const near = playerDistances.length
					? Math.min(...playerDistances.map((m) => m.get(key(n.x, n.y)) ?? 0))
					: 8;
				const score =
					near * 1.4 + (n.dir === a.dir ? 0.65 : 0) + random(a) * 0.8;
				if (score > max) {
					max = score;
					best = n;
				}
			}
			a.nextDir = best.dir;
			if (best.dir !== a.dir) {
				a.turn = 0.18;
				a.delay = 0.075;
			}
			return best.dir;
		}
		closestPlayer(a) {
			let best = null,
				min = Infinity;
			for (const p of this.players) {
				const dist = this.path(this.cell(a), this.cell(p)).length || 999;
				if (dist < min) {
					min = dist;
					best = p;
				}
			}
			return best;
		}
		chooseEnemy(a) {
			let choices = this.neighbors(a.cx, a.cy, a.state === "returning");
			if (!choices.length) return null;
			if (a.state === "returning") {
				const c = this.board.gateCenter || a.home;
				const path = this.path({ x: a.cx, y: a.cy }, c, { returning: true });
				return path[1] ? this.directionTo(path[0], path[1]) : null;
			}
			const p = this.closestPlayer(a);
			if (!p) return choices[0].dir;
			if (a.state === "frightened" || a.state === "warning") {
				if (choices.length > 1)
					choices = choices.filter((n) => n.dir !== opposite(a.dir));
				let best = choices[0],
					max = -1;
				for (const n of choices) {
					const dist =
						Math.abs(n.x - p.x) + Math.abs(n.y - p.y) + random(a) * 2;
					if (dist > max) {
						max = dist;
						best = n;
					}
				}
				return best.dir;
			}
			if (a.think <= 0 || !a.target) {
				a.think = this.config.reaction;
				let target = this.cell(p);
				if (a.role === "interceptor") {
					for (let i = 0; i < 3; i++) {
						const n = this.neighbor(target.x, target.y, p.dir);
						if (!n) break;
						target = n;
					}
				}
				if (
					a.role === "keeper" &&
					Math.abs(a.x - p.x) + Math.abs(a.y - p.y) > 6
				) {
					const c = this.board.gateCenter || { x: 9, y: 7 };
					const way = [
						{ x: c.x - 2, y: c.y - 2 },
						{ x: c.x + 2, y: c.y - 2 },
						{ x: c.x + 2, y: c.y + 2 },
						{ x: c.x - 2, y: c.y + 2 },
					];
					a.patrol = a.patrol || 0;
					if (
						Math.abs(a.x - way[a.patrol].x) + Math.abs(a.y - way[a.patrol].y) <
						2
					)
						a.patrol = (a.patrol + 1) % 4;
					target = way[a.patrol];
					if (!this.isOpen(target.x, target.y)) target = this.cell(p);
				}
				a.target = target;
			}
			const path = this.path({ x: a.cx, y: a.cy }, a.target);
			if (path[1]) return this.directionTo(path[0], path[1]);
			return choices.find((n) => n.dir === a.dir)?.dir ?? choices[0].dir;
		}
		updatePosition(a) {
			if (!a.moving) {
				a.x = a.cx;
				a.y = a.cy;
				return;
			}
			let dx = a.tx - a.cx,
				dy = a.ty - a.cy;
			if (Math.abs(dx) > 1) dx = a.dir === 1 ? 1 : -1;
			a.x = a.cx + dx * a.p;
			a.y = a.cy + dy * a.p;
			if (a.x < 0) a.x += this.width;
			if (a.x >= this.width) a.x -= this.width;
		}
		move(a, dt, speed, choose) {
			a.prevX = a.x;
			a.prevY = a.y;
			a.invulnerable = Math.max(0, a.invulnerable - dt);
			a.anim = Math.max(0, a.anim - dt);
			a.turn = Math.max(0, a.turn - dt);
			if (a.delay > 0) {
				a.delay = Math.max(0, a.delay - dt);
				return;
			}
			let travel = dt * speed;
			let guard = 0;
			while (travel > 1e-10 && guard++ < 8) {
				if (!a.moving) {
					let d = choose();
					if (d === null || d === undefined) break;
					let n = this.neighbor(a.cx, a.cy, d, a.state === "returning");
					if (!n && a.kind === "hero" && a.desired !== null && a.buffer > 0) {
						this.echo = 0.65;
						this.lastEcho = { x: a.cx, y: a.cy };
					}
					if (!n && a.kind === "hero") {
						d = a.dir;
						n = this.neighbor(a.cx, a.cy, d);
					}
					if (!n) break;
					if (d !== a.dir) a.turn = 0.16;
					a.dir = d;
					a.tx = n.x;
					a.ty = n.y;
					a.p = 0;
					a.moving = true;
					if (n.tunnel) {
						a.transit = 0.3;
						if (a.kind === "hero") {
							this.stats.tunnels++;
							this.emit("tunnel", { seat: a.seat, x: a.x, y: a.y });
						}
					}
					if (a.delay > 0) break;
				}
				const amount = Math.min(1 - a.p, travel);
				a.p += amount;
				travel -= amount;
				this.updatePosition(a);
				if (a.p >= 1 - 1e-9) {
					a.cx = a.tx;
					a.cy = a.ty;
					a.p = 0;
					a.moving = false;
					a.x = a.cx;
					a.y = a.cy;
					if (a.kind === "food") a.commit++;
				}
			}
			a.transit = Math.max(0, (a.transit || 0) - dt);
		}
		swept(a, b, radius = 0.56) {
			const width = this.width;
			let ax = a.prevX,
				ay = a.prevY,
				bx = b.prevX,
				by = b.prevY;
			let adx = a.x - ax,
				ady = a.y - ay,
				bdx = b.x - bx,
				bdy = b.y - by;
			if (this.board.tunnels) {
				if (adx > width / 2) adx -= width;
				if (adx < -width / 2) adx += width;
				if (bdx > width / 2) bdx -= width;
				if (bdx < -width / 2) bdx += width;
			}
			let min = Infinity;
			for (const offset of this.board.tunnels ? [-width, 0, width] : [0]) {
				const rx = ax - (bx + offset),
					ry = ay - by,
					vx = adx - bdx,
					vy = ady - bdy;
				const d = vx * vx + vy * vy;
				const t = d ? Math.max(0, Math.min(1, -(rx * vx + ry * vy) / d)) : 0;
				min = Math.min(min, Math.hypot(rx + vx * t, ry + vy * t));
			}
			return min < radius;
		}
		gateOccupied() {
			const c = this.board.gateCenter || { x: 9, y: 7 };
			return [
				...this.players,
				...this.foods.filter((f) => f.alive),
				...this.enemies,
			].some(
				(a) =>
					a.moving &&
					((a.cx === c.x && a.cy === c.y) || (a.tx === c.x && a.ty === c.y)),
			);
		}
		respawn(p) {
			const original =
				this.board.spawn[this.seats.indexOf(p.seat) % this.board.spawn.length];
			let spawn = original;
			if (
				this.enemies.some(
					(e) =>
						e.state === "hunting" &&
						Math.hypot(e.x - spawn.x, e.y - spawn.y) < 3,
				)
			) {
				const candidates = [];
				for (let y = 1; y < this.height - 1; y++)
					for (let x = 1; x < this.width - 1; x++)
						if (this.isOpen(x, y)) candidates.push({ x, y });
				candidates.sort(
					(a, b) =>
						Math.min(
							...this.enemies.map((e) => Math.hypot(e.x - b.x, e.y - b.y)),
						) -
						Math.min(
							...this.enemies.map((e) => Math.hypot(e.x - a.x, e.y - a.y)),
						),
				);
				spawn = candidates[0] || original;
			}
			Object.assign(p, {
				x: spawn.x,
				y: spawn.y,
				cx: spawn.x,
				cy: spawn.y,
				tx: spawn.x,
				ty: spawn.y,
				prevX: spawn.x,
				prevY: spawn.y,
				p: 0,
				moving: false,
				desired: null,
				buffer: 0,
				invulnerable: 1.5,
				anim: 0.5,
			});
			this.emit("respawn", { seat: p.seat, x: p.x, y: p.y });
		}
		tickStep(intents) {
			if (this.phase === "won" || this.phase === "lost") return;
			const dt = FIXED;
			this.tick++;
			this.elapsed += dt;
			if (this.phase === "clear") {
				this.clearTimer -= dt;
				if (this.clearTimer <= 0) this.nextStage();
				return;
			}
			if (this.phase !== "playing") return;
			this.stageElapsed += dt;
			this.grace = Math.max(0, this.grace - dt);
			this.chirpCooldown = Math.max(0, this.chirpCooldown - dt);
			this.reveal = Math.max(0, this.reveal - dt);
			this.echo = Math.max(0, this.echo - dt);
			if (
				this.board.invisible &&
				Math.floor(this.stageElapsed / (this.board.revealPeriod || 8)) !==
					Math.floor((this.stageElapsed - dt) / (this.board.revealPeriod || 8))
			)
				this.reveal = 1.6;
			const oldPower = this.power;
			this.power = Math.max(0, this.power - dt);
			if (oldPower > 1.5 && this.power <= 1.5) this.emit("power-warning");
			if (oldPower > 0 && !this.power) {
				this.chain = 0;
				this.emit("power-end");
			}
			if (this.gate.active) {
				this.gate.remaining -= dt;
				this.gate.turn = Math.max(0, this.gate.turn - dt);
				if (!this.gate.warning && this.gate.remaining <= 0.5) {
					this.gate.warning = true;
					this.emit("gate-warning");
				}
				if (this.gate.remaining <= 0 && !this.gateOccupied()) {
					this.gate.orientation = (this.gate.orientation + 1) % 4;
					this.gate.remaining = this.config.gatePeriod;
					this.gate.warning = false;
					this.gate.turn = 0.3;
					this.emit("gate", { orientation: this.gate.orientation });
				}
			}
			for (const p of this.players) {
				this.setIntent(p, intents[p.seat] || {}, dt);
				this.move(p, dt, this.config.playerSpeed, () =>
					p.buffer > 0 &&
					p.desired !== null &&
					this.neighbor(p.cx, p.cy, p.desired)
						? p.desired
						: p.dir,
				);
			}
			const foodSpeed = this.foodSpeed();
			for (const f of this.foods)
				if (f.alive) this.move(f, dt, foodSpeed, () => this.chooseFood(f));
			for (const e of this.enemies) {
				e.think -= dt;
				if (e.state === "penned" && this.stageElapsed >= e.release) {
					e.state = "releasing";
					e.charge = 0.6;
					this.emit("enemy-release", { enemy: e.id });
				}
				if (e.state === "releasing") {
					e.charge -= dt;
					if (e.charge <= 0)
						e.state =
							this.power > 1.5
								? "frightened"
								: this.power > 0
									? "warning"
									: "hunting";
				}
				if (e.state === "recharging") {
					e.charge -= dt;
					if (e.charge <= 0) {
						e.state = "releasing";
						e.charge = 0.6;
					}
					continue;
				}
				if (["hunting", "frightened", "warning"].includes(e.state))
					e.state =
						this.power > 1.5
							? "frightened"
							: this.power > 0
								? "warning"
								: "hunting";
				if (["penned", "releasing"].includes(e.state)) {
					e.prevX = e.x;
					e.prevY = e.y;
					continue;
				}
				const speed =
					e.state === "returning"
						? this.config.playerSpeed * 1.4
						: this.config.enemySpeed *
							(this.board.enemySpeedScale || 1) *
							(e.state === "hunting" ? 1 : 0.68);
				this.move(e, dt, speed, () => this.chooseEnemy(e));
				const c = this.board.gateCenter || e.home;
				if (
					e.state === "returning" &&
					!e.moving &&
					e.cx === c.x &&
					e.cy === c.y
				) {
					e.state = "recharging";
					e.charge = 2;
					this.emit("enemy-recharge", { enemy: e.id });
				}
			}
			// Power pickups resolve before all predator encounters in the same tick.
			for (const f of this.foods) {
				if (!f.alive) continue;
				for (const p of this.players) {
					if (this.swept(p, f, 0.57)) {
						f.alive = false;
						p.anim = 0.24;
						this.score += f.power ? 3 : 1;
						this.stats.food++;
						this.stats.perSeat[p.seat].food++;
						if (f.power) {
							this.power = this.config.powerDuration;
							this.chain = 0;
							this.stats.powered++;
							for (const e of this.enemies)
								if (["hunting", "frightened", "warning"].includes(e.state))
									e.state = "frightened";
						}
						this.emit(f.power ? "power" : "bite", {
							seat: p.seat,
							food: f.id,
							x: f.x,
							y: f.y,
						});
						if (this.remaining <= 3)
							this.emit("last-food", { remaining: this.remaining });
						break;
					}
				}
			}
			if (this.remaining === 0) {
				this.stats.stages++;
				this.stats.finalCatches.push({
					stage: this.stageIndex,
					tick: this.tick,
					elapsed: this.stageElapsed,
					seat: this.events.findLast(
						(e) => e.type === "bite" || e.type === "power",
					)?.seat,
				});
				this.lives = Math.min(this.config.lives, this.lives + 1);
				this.phase = "clear";
				this.clearTimer = 2.4;
				this.emit("clear", { stage: this.stageIndex, score: this.score });
				return;
			}
			for (const e of this.enemies) {
				if (!["hunting", "frightened", "warning"].includes(e.state)) continue;
				for (const p of this.players) {
					if (!this.swept(p, e, 0.56)) continue;
					if (this.power > 0) {
						const reward = [5, 10, 20][Math.min(this.chain, 2)];
						this.chain++;
						this.score += reward;
						this.stats.enemies++;
						this.stats.perSeat[p.seat].enemies++;
						e.state = "returning";
						e.target = null;
						e.anim = 0.4;
						this.emit("enemy-eaten", {
							seat: p.seat,
							enemy: e.id,
							reward,
							x: e.x,
							y: e.y,
						});
						break;
					}
					if (
						p.invulnerable <= 0 &&
						this.grace <= 0 &&
						!this.config.invulnerable
					) {
						this.lives--;
						this.grace = this.config.damageGrace;
						this.stats.hits++;
						this.stats.perSeat[p.seat].hits++;
						this.emit("hit", {
							seat: p.seat,
							x: p.x,
							y: p.y,
							lives: this.lives,
						});
						if (this.lives <= 0) {
							this.phase = "lost";
							this.emit("lost", { score: this.score });
							return;
						}
						this.respawn(p);
						break;
					}
				}
			}
		}
		step(dt, intents = {}) {
			if (!Number.isFinite(dt) || dt <= 0) return;
			this.accumulator += Math.min(dt, 1);
			let count = 0;
			while (this.accumulator >= FIXED - 1e-10 && count++ < 121) {
				this.accumulator -= FIXED;
				this.tickStep(intents);
			}
			return this.phase;
		}
		nextStage() {
			if (this.phase === "won" || this.phase === "lost") return;
			if (
				this.mode === "campaign" &&
				this.stageIndex < G.ChompContent.stages.length - 1
			) {
				this.stageIndex++;
				this.loadBoard(this.selectBoard());
			} else {
				this.phase = "won";
				this.emit("victory", { score: this.score });
			}
		}
		removeSeat(seat) {
			this.seats = this.seats.filter((s) => s !== seat);
			this.players = this.players.filter((p) => p.seat !== seat);
			this.emit("leave", { seat });
		}
		botIntent(seat) {
			const p = this.players.find((a) => a.seat === seat);
			if (!p || this.phase !== "playing") return { dir: null, action: false };
			if (p.moving && p.p < 0.72)
				return {
					dir: p.dir,
					action: this.board.invisible && this.chirpCooldown <= 0,
				};
			const cell = p.moving ? { x: p.tx, y: p.ty } : { x: p.cx, y: p.cy };
			const dist = this.distances(cell);
			let best = null,
				value = Infinity;
			const dangerous = this.enemies.filter(
				(e) => e.state === "hunting" && this.power < 1,
			);
			const dangerDist = dangerous.map((e) => this.distances(this.cell(e)));
			for (const f of this.foods) {
				if (!f.alive) continue;
				const fc = this.cell(f);
				let n = dist.get(key(fc.x, fc.y));
				if (n === undefined) continue;
				const danger = dangerDist.length
					? Math.min(...dangerDist.map((m) => m.get(key(fc.x, fc.y)) ?? 99))
					: 99;
				const sameTarget = p.botTarget === f.id ? -1.1 : 0;
				const powerBias = f.power && this.power < 2 ? -5 : 0;
				const coOp = this.players.some((o) => o !== p && o.botTarget === f.id)
					? 3
					: 0;
				const score =
					n +
					sameTarget +
					powerBias +
					coOp +
					(danger < 3 && this.power < 1 ? 8 : 0);
				if (score < value) {
					value = score;
					best = f;
				}
			}
			if (!best) return { dir: p.dir, action: false };
			p.botTarget = best.id;
			// Chase likely junctions rather than tail an equal-speed final snack.
			let target = this.cell(best);
			if (this.remaining <= 3) {
				const preview = { ...best };
				let bestGap = Infinity;
				for (let i = 1; i <= 75; i++) {
					this.move(preview, 1 / 30, this.foodSpeed(), () =>
						this.chooseFood(preview),
					);
					if (i % 5) continue;
					const future = this.cell(preview),
						travel =
							(dist.get(key(future.x, future.y)) ?? 999) /
							this.config.playerSpeed,
						gap = Math.abs(travel - i / 30);
					if (travel <= i / 30 + 0.12) {
						target = future;
						break;
					}
					if (gap < bestGap) {
						bestGap = gap;
						target = future;
					}
				}
			}
			const costs = new Map([[key(cell.x, cell.y), 0]]),
				queue = [{ ...cell, cost: 0 }],
				prev = new Map();
			let end = null;
			while (queue.length) {
				queue.sort((a, b) => a.cost - b.cost);
				const cur = queue.shift();
				if (cur.cost !== costs.get(key(cur.x, cur.y))) continue;
				if (cur.x === target.x && cur.y === target.y) {
					end = cur;
					break;
				}
				for (const n of this.neighbors(cur.x, cur.y)) {
					let risk = 0;
					if (p.invulnerable < 0.3 && this.power < 0.5) {
						for (const m of dangerDist) {
							const d = m.get(key(n.x, n.y)) ?? 99;
							if (d < 2) risk += 22;
							if (d === 2) risk += 6;
							if (d === 3) risk += 1.5;
						}
					}
					const nc = cur.cost + 1 + risk,
						k = key(n.x, n.y);
					if (nc < (costs.get(k) ?? Infinity)) {
						costs.set(k, nc);
						prev.set(k, cur);
						queue.push({ ...n, cost: nc });
					}
				}
			}
			let first = end;
			while (first) {
				const parent = prev.get(key(first.x, first.y));
				if (!parent || (parent.x === cell.x && parent.y === cell.y)) break;
				first = parent;
			}
			let dir =
				first && !(first.x === cell.x && first.y === cell.y)
					? this.directionTo(cell, first)
					: p.dir;
			if (!this.neighbor(cell.x, cell.y, dir)) {
				const choices = this.neighbors(cell.x, cell.y);
				dir = choices[0]?.dir ?? null;
			}
			return { dir, action: this.board.invisible && this.chirpCooldown <= 0 };
		}
		snapshot() {
			const clean = (a) => {
				const { rng, home, target, botTarget, actionLatch, ...rest } = a;
				return { ...rest };
			};
			const actors = this.players.map(clean);
			return {
				board: this.board,
				mode: this.mode,
				seed: this.seed,
				tick: this.tick,
				revision: this.revision,
				phase: this.phase,
				stageIndex: this.stageIndex,
				elapsed: this.elapsed,
				stageElapsed: this.stageElapsed,
				score: this.score,
				lives: this.lives,
				power: this.power,
				chain: this.chain,
				remaining: this.remaining,
				foodMask: this.foods.reduce(
					(mask, f, i) => mask | (f.alive ? 1 << i : 0),
					0,
				),
				gate: { ...this.gate },
				reveal: this.reveal,
				echo: this.echo,
				lastEcho: this.lastEcho,
				chirpCooldown: this.chirpCooldown,
				actors,
				players: actors,
				foods: this.foods.map(clean),
				enemies: this.enemies.map(clean),
				stats: clone(this.stats),
				events: this.events.map((e) => ({ ...e })),
				config: { ...this.config },
				clearTimer: this.clearTimer,
			};
		}
	}
	ChompSim.DEFAULTS = DEFAULTS;
	ChompSim.DIRS = DIRS;
	ChompSim.FIXED = FIXED;
	G.ChompSim = ChompSim;
})(globalThis);
