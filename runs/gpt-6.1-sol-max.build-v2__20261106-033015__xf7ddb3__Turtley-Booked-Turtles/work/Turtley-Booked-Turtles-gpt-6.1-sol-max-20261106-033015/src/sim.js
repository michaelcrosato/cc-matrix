((T) => {
	const E = My3D2dge;
	function hash(s) {
		let h = 2166136261;
		for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
		return h >>> 0;
	}
	class Stream {
		constructor(seed, label) {
			this.state = hash(seed + ":" + label) || 1;
		}
		next() {
			this.state = (this.state + 0x6d2b79f5) >>> 0;
			const a = this.state;
			let t = Math.imul(a ^ (a >>> 15), a | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		}
	}
	T.Stream = Stream;
	T.swept = (a, b) => {
		const x = a.prev[0] - b.prev[0],
			y = a.prev[1] - b.prev[1];
		const dx = a.m.x - b.m.x - x,
			dy = a.m.y - b.m.y - y;
		const u = Math.max(
			0,
			Math.min(1, -(x * dx + y * dy) / (dx * dx + dy * dy || 1)),
		);
		return Math.hypot(x + dx * u, y + dy * u);
	};
	T.move = (a, dt, grid, want, speed) => {
		const m = a.m;
		a.prev = [m.x, m.y];
		m.speed = speed;
		// Extend the native mover with an immediate mid-edge reversal; the graph stays authoritative.
		if (want && m.moving && want[0] === -m.dir[0] && want[1] === -m.dir[1]) {
			const old = [m.cx, m.cy];
			[m.cx, m.cy] = m._to;
			m._to = old;
			m._u = 1 - m._u;
			m.dir = want.slice();
			m._want = want.slice();
		}
		if (want) {
			a.buffer = want.slice();
			a.bufferTime = 0.24;
		} else a.bufferTime = Math.max(0, (a.bufferTime || 0) - dt);
		if (!want && a.bufferTime <= 0) m._want = null;
		const request = want || (a.bufferTime > 0 && a.buffer) || null;
		m.update(dt, grid, request, { keep: !!want });
		a.walk =
			Math.hypot(m.x - a.prev[0], m.y - a.prev[1]) / Math.max(dt, 0.0001);
		if (a.walk > 0.01) a.facing = Math.atan2(m.dir[1], m.dir[0]);
	};
	const body = (id, cell, speed) => ({
		id,
		m: new E.GridMover({ cx: cell[0], cy: cell[1], speed }),
		prev: cell.slice(),
		facing: -Math.PI / 2,
		walk: 0,
		bufferTime: 0,
	});
	class Run {
		constructor(o = {}) {
			this.seed = o.seed ?? 2701;
			this.runId = o.runId || String(this.seed);
			this.mode = o.mode || "solo";
			this.seats = (o.seats || [0]).slice().sort((a, b) => a - b);
			this.balance = { ...T.DEFAULTS };
			this.demo = !!o.demo;
			this.practice = false;
			this.assisted = !!o.assisted;
			this.god = false;
			this.score = 0;
			this.lives = 3;
			this.rescued = 0;
			this.elapsed = 0;
			this.tick = 0;
			this.eventId = 0;
			this.events = [];
			this.history = [];
			this.stock = 3;
			this.damageGrace = 0;
			this.stats = {
				discoveries: 0,
				deliveries: 0,
				plants: 0,
				triggers: 0,
				stuns: 0,
				refills: 0,
				hits: 0,
				decoys: 0,
				escalations: 0,
			};
			this.floor = 0;
			this.startFloor(o.floor || 0);
		}
		emit(type, data = {}) {
			const ev = {
				id: ++this.eventId,
				tick: this.tick,
				floor: this.floor,
				type,
				...data,
			};
			this.events.push(ev);
			this.history.push(ev);
			if (this.history.length > 80) this.history.shift();
			return ev;
		}
		startFloor(n) {
			this.floor = n;
			this.content = T.FLOORS[n];
			this.map = T.makeMap(this.content);
			this.grid = E.Grid.from(this.map);
			this.phase = "intro";
			this.phaseTime = 2;
			this.floorTime = 0;
			this.delivered = 0;
			this.bomb = null;
			this.supply = { ready: true, timer: 0 };
			this.damageGrace = 1;
			this.players = this.seats.map((seat, i) => ({
				...body("p" + seat, this.content.spawns[i % 2], 3.5),
				seat,
				carried: null,
				home: null,
				invuln: 2,
				hurt: 0,
				emote: 0,
				supplyInside: false,
				bombSeq: -1,
				route: null,
				active: true,
			}));
			const rng = new Stream(this.seed, "rooms-" + n),
				deck = Array.from({ length: this.content.rooms.length }, (_, i) =>
					i < this.content.quota ? "baby" : "beetle",
				);
			// The teaching room is fixed; other outcomes are seeded once and never rerolled.
			for (let i = deck.length - 1; i > 1; i--) {
				const j = 1 + Math.floor(rng.next() * i);
				[deck[i], deck[j]] = [deck[j], deck[i]];
			}
			this.rooms = this.content.rooms.map((cell, i) => ({
				id: "f" + n + "r" + i,
				cell: cell.slice(),
				kind: deck[i],
				status: "hidden",
				discovered: false,
				symbol: i % 4,
			}));
			this.homes = this.content.homes.map((cell, i) => ({
				id: i,
				cell: cell.slice(),
				reserved: null,
				seat: null,
				glow: 0,
			}));
			this.enemies = this.content.enemies.map((e, i) =>
				this.makeEnemy(e.cell, e.age, "f" + n + "b" + i),
			);
			this.emit("floor", { name: this.content.name });
		}
		makeEnemy(
			cell,
			age = 0,
			id = "f" + this.floor + "b" + this.enemies.length,
		) {
			return {
				...body(id, cell, 2.2),
				age,
				state:
					age >= this.balance.redAt
						? "red"
						: age >= this.balance.yellowAt
							? "yellow"
							: "blue",
				stun: 0,
				emerge: 1.1,
				target: null,
				lastSeen: null,
				sighted: false,
				warned: 0,
				scored: false,
				rng: new Stream(this.seed, id),
			};
		}
		setBalance(key, value) {
			const sp = T.SLIDERS.find((s) => s[0] === key);
			if (!sp || !Number.isFinite(value)) return;
			this.balance[key] = Math.min(sp[3], Math.max(sp[2], value));
			if (this.balance.redAt < this.balance.yellowAt + 3) {
				if (key === "redAt") this.balance.yellowAt = this.balance.redAt - 3;
				else this.balance.redAt = this.balance.yellowAt + 3;
			}
			this.practice = true;
			this.emit("practice");
		}
		resetBalance() {
			this.balance = { ...T.DEFAULTS };
		}
		leave(seat) {
			const p = this.players.find((p) => p.seat === seat);
			if (!p || !p.active) return;
			this.drop(p);
			p.active = false;
			p.route = null;
			this.seats = this.seats.filter((s) => s !== seat);
			this.emit("leave", { seat });
		}
		drop(p) {
			if (p.carried) {
				const room = this.rooms.find((r) => r.id === p.carried);
				if (room) room.status = "revealed";
			}
			for (const h of this.homes)
				if (h.seat === p.seat) {
					h.reserved = null;
					h.seat = null;
				}
			p.carried = null;
			p.home = null;
		}
		reveal(p) {
			if (p.carried || p.hurt > 0) return;
			const room = this.rooms.find(
				(r) =>
					(r.status === "hidden" || r.status === "revealed") &&
					Math.hypot(p.m.x - r.cell[0], p.m.y - r.cell[1]) < 0.18,
			);
			if (!room) return;
			if (room.kind === "beetle") {
				room.status = "empty";
				const b = this.makeEnemy(
					room.cell,
					0,
					"f" + this.floor + "d" + room.id,
				);
				b.emerge = 1.4;
				this.enemies.push(b);
				this.stats.decoys++;
				this.emit("decoy", { room: room.id, x: room.cell[0], y: room.cell[1] });
				return;
			}
			const open = this.homes.filter(
				(h) => h.reserved === null && this.grid.path(room.cell, h.cell).length,
			);
			open.sort(
				(a, b) =>
					this.grid.path(room.cell, b.cell).length -
						this.grid.path(room.cell, a.cell).length || a.id - b.id,
			);
			const home = open[0];
			if (!home) {
				this.emit("reservation-error", { seat: p.seat });
				return;
			}
			home.reserved = room.id;
			home.seat = p.seat;
			p.carried = room.id;
			p.home = home.id;
			p.emote = 0.7;
			room.status = "carried";
			const newly = !room.discovered;
			if (newly) {
				room.discovered = true;
				this.score += 100;
				this.stats.discoveries++;
			}
			this.emit("pickup", {
				seat: p.seat,
				room: room.id,
				home: home.id,
				symbol: room.symbol,
				points: newly ? 100 : 0,
				x: p.m.x,
				y: p.m.y,
			});
		}
		deliver(p) {
			if (!p.carried || p.hurt > 0) return;
			const home = this.homes.find((h) => h.id === p.home);
			if (!home || home.reserved !== p.carried) return;
			if (Math.hypot(p.m.x - home.cell[0], p.m.y - home.cell[1]) > 0.24) return;
			const room = this.rooms.find((r) => r.id === p.carried);
			room.status = "delivered";
			home.reserved = null;
			home.seat = null;
			home.glow = 1.5;
			const rid = p.carried;
			p.carried = null;
			p.home = null;
			p.emote = 0.6;
			this.score += 400;
			this.delivered++;
			this.rescued++;
			this.stats.deliveries++;
			this.emit("delivery", {
				seat: p.seat,
				room: rid,
				home: home.id,
				x: p.m.x,
				y: p.m.y,
				points: 400,
			});
		}
		plant(p, intent) {
			if (!intent?.bomb || p.hurt > 0 || !p.active) return false;
			const seq = intent.bombSeq ?? this.tick;
			if (seq <= p.bombSeq) return false;
			p.bombSeq = seq;
			if (this.bomb) {
				this.emit("busy", { seat: p.seat });
				return false;
			}
			if (this.stock <= 0) {
				this.emit("empty", {
					seat: p.seat,
					x: this.content.supply[0],
					y: this.content.supply[1],
				});
				return false;
			}
			this.stock--;
			this.bomb = {
				id: "bomb" + this.tick,
				x: p.m.x,
				y: p.m.y,
				timer: this.balance.bombLife,
				seat: p.seat,
			};
			p.emote = 0.24;
			this.stats.plants++;
			this.emit("plant", { seat: p.seat, x: p.m.x, y: p.m.y });
			return true;
		}
		los(a, b) {
			const ac = [Math.round(a.m.x), Math.round(a.m.y)],
				bc = [Math.round(b.m.x), Math.round(b.m.y)];
			if (ac[0] !== bc[0] && ac[1] !== bc[1]) return false;
			const dx = Math.sign(bc[0] - ac[0]),
				dy = Math.sign(bc[1] - ac[1]);
			let [x, y] = ac;
			for (let i = 0; i < 30; i++) {
				if (!this.map.walkable(x, y)) return false;
				if (x === bc[0] && y === bc[1]) return true;
				x += dx;
				y += dy;
			}
			return false;
		}
		target(b) {
			const valid = this.players.filter((p) => p.active && p.hurt <= 0);
			const costs = valid
				.map((p) => ({
					p,
					d: this.grid.path(T.cell(b), T.cell(p)).length || 999,
				}))
				.sort((a, b) => a.d - b.d || a.p.seat - b.p.seat);
			if (!costs.length) return null;
			const current = costs.find((c) => c.p.seat === b.target),
				best = current && current.d <= costs[0].d + 2 ? current : costs[0];
			b.target = best.p.seat;
			return best.p;
		}
		choose(b) {
			const m = b.m,
				cell = [m.cx, m.cy];
			let goal = null;
			if (b.state === "red") {
				const p = this.target(b);
				if (p) goal = T.cell(p);
			}
			if (b.state === "yellow") {
				const seen = this.players
					.filter((p) => p.active && p.hurt <= 0 && this.los(b, p))
					.sort(
						(a, c) =>
							T.dist(cell, T.cell(a)) - T.dist(cell, T.cell(c)) ||
							a.seat - c.seat,
					)[0];
				if (seen) {
					b.lastSeen = T.cell(seen);
					if (!b.sighted)
						this.emit("sight", {
							enemy: b.id,
							seat: seen.seat,
							x: m.x,
							y: m.y,
						});
					b.sighted = true;
				} else b.sighted = false;
				goal = b.lastSeen;
				if (goal && T.same(goal, cell)) {
					b.lastSeen = null;
					goal = null;
				}
			}
			if (goal) {
				const path = this.grid.path(cell, goal);
				if (path.length > 1) return [path[1][0] - m.cx, path[1][1] - m.cy];
			}
			let ways = T.DIRS.filter((d) =>
				this.grid.walk([m.cx + d[0], m.cy + d[1]]),
			);
			const forward = ways.filter(
				(d) => d[0] !== -m.dir[0] || d[1] !== -m.dir[1],
			);
			if (forward.length) ways = forward;
			return ways[Math.floor(b.rng.next() * ways.length)] || null;
		}
		updateEnemy(b, dt) {
			b.prev = [b.m.x, b.m.y];
			if (b.emerge > 0) {
				b.emerge -= dt;
				return;
			}
			if (b.stun > 0) {
				b.stun -= dt;
				b.walk = 0;
				if (b.stun <= 0) {
					b.age = 0;
					b.state = "blue";
					b.warned = 0;
					b.lastSeen = null;
					b.target = null;
					this.emit("recovery", { enemy: b.id, x: b.m.x, y: b.m.y });
				}
				return;
			}
			b.age += dt;
			const state =
				b.age >= this.balance.redAt
					? "red"
					: b.age >= this.balance.yellowAt
						? "yellow"
						: "blue";
			if (state !== b.state) {
				b.state = state;
				this.stats.escalations++;
				this.emit("escalate", { enemy: b.id, state, x: b.m.x, y: b.m.y });
			}
			const warning =
				b.age >= this.balance.redAt - 1
					? 2
					: b.age >= this.balance.yellowAt - 1
						? 1
						: 0;
			if (warning > b.warned) {
				b.warned = warning;
				this.emit("warning", { enemy: b.id });
			}
			const want = b.m.moving ? null : this.choose(b);
			b.m.speed = T.ENEMY_SPEEDS[b.state] * this.balance.enemySpeed;
			b.m.update(dt, this.grid, want, { keep: false });
			b.walk = Math.hypot(b.m.x - b.prev[0], b.m.y - b.prev[1]) / dt;
			if (b.walk > 0.01) b.facing = Math.atan2(b.m.dir[1], b.m.dir[0]);
		}
		hit(p) {
			if (
				this.god ||
				this.demo ||
				p.invuln > 0 ||
				p.hurt > 0 ||
				this.damageGrace > 0
			)
				return;
			this.lives--;
			this.stats.hits++;
			this.damageGrace = 1.1;
			p.hurt = 0.85;
			p.invuln = 3.5;
			p.route = null;
			this.drop(p);
			this.bomb = null;
			this.emit("hit", { seat: p.seat, x: p.m.x, y: p.m.y, lives: this.lives });
			if (this.lives <= 0) {
				this.phase = "lost";
				this.phaseTime = 0;
				this.emit("loss");
			}
		}
		safeRespawn(p) {
			const danger = (c) =>
				Math.min(
					...this.enemies
						.filter((b) => b.stun <= 0 && b.emerge <= 0)
						.map((b) => Math.hypot(b.m.x - c[0], b.m.y - c[1])),
					99,
				);
			const places = this.content.spawns
				.concat(this.content.homes)
				.filter((c) => this.map.walkable(...c));
			places.sort((a, b) => danger(b) - danger(a));
			const c = places[0];
			if (danger(c) < 1.5) {
				p.hurt = 0.2;
				return;
			}
			p.m.place(...c);
			p.prev = c.slice();
			p.bufferTime = 0;
			p.route = null;
			p.invuln = 2.5;
			this.emit("respawn", { seat: p.seat, x: c[0], y: c[1] });
		}
		routeDir(p, target) {
			const dest = Array.isArray(target) ? target : p.route;
			if (!dest) return null;
			if (!this.grid.walk(dest)) return null;
			const from = p.m.moving ? p.m._to : [p.m.cx, p.m.cy];
			const path = this.grid.path(from, dest);
			if (path.length > 1) return [path[1][0] - from[0], path[1][1] - from[1]];
			if (p.m.moving) return p.m.dir.slice();
			p.route = null;
			return null;
		}
		step(dt, intents = {}) {
			this.events = [];
			this.tick++;
			if (["lost", "won", "ended"].includes(this.phase)) return;
			if (this.phase !== "playing") {
				this.phaseTime -= dt;
				if (Object.values(intents).some((i) => i?.confirm))
					this.phaseTime = Math.min(this.phaseTime, 0);
				if (this.phaseTime <= 0) {
					if (this.phase === "intro") {
						this.phase = "playing";
						this.emit("begin");
					} else if (this.phase === "clear") {
						if (this.floor < 4) this.startFloor(this.floor + 1);
						else {
							this.phase = "celebration";
							this.phaseTime = 5;
							this.emit("celebration");
						}
					} else if (this.phase === "celebration") {
						this.phase = "won";
						this.emit("victory");
					}
				}
				return;
			}
			this.elapsed += dt;
			this.floorTime += dt;
			this.damageGrace = Math.max(0, this.damageGrace - dt);
			for (const h of this.homes) h.glow = Math.max(0, h.glow - dt);
			// Stable order: recharge/timers, seat movement, bomb accepts, enemy movement, bomb triggers,
			// damaging contacts, seat reveals/deliveries, then commit one clear/terminal phase.
			if (!this.supply.ready) {
				this.supply.timer -= dt;
				if (this.supply.timer <= 0) {
					this.supply.ready = true;
					this.emit("supply-ready");
				}
			}
			if (this.bomb) this.bomb.timer -= dt;
			if (this.bomb && this.bomb.timer <= 0) {
				this.emit("expire", { x: this.bomb.x, y: this.bomb.y });
				this.bomb = null;
			}
			for (const p of this.players) {
				if (!p.active) continue;
				p.invuln = Math.max(0, p.invuln - dt);
				p.emote = Math.max(0, p.emote - dt);
				if (p.hurt > 0) {
					p.hurt -= dt;
					p.prev = [p.m.x, p.m.y];
					if (p.hurt <= 0) this.safeRespawn(p);
					continue;
				}
				const intent = intents[p.seat] || {};
				if (intent.stop === true) {
					p.route = null;
					p.bufferTime = 0;
					p.m._want = null;
					p.prev = [p.m.x, p.m.y];
					p.walk = 0;
					continue;
				}
				if (
					intent.route &&
					Array.isArray(intent.route) &&
					intent.route.every(Number.isInteger) &&
					this.grid.walk(intent.route)
				)
					p.route = intent.route.slice();
				let dir = intent.dir;
				if (
					!Array.isArray(dir) ||
					dir.length !== 2 ||
					!dir.every(Number.isInteger) ||
					Math.abs(dir[0]) + Math.abs(dir[1]) !== 1
				)
					dir = null;
				if (dir) p.route = null;
				else if (p.route) dir = this.routeDir(p);
				T.move(
					p,
					dt,
					this.grid,
					dir,
					this.balance.playerSpeed * (p.carried ? this.balance.carrySpeed : 1),
				);
				this.plant(p, intent);
				const inside =
					Math.hypot(
						p.m.x - this.content.supply[0],
						p.m.y - this.content.supply[1],
					) < 0.4;
				if (inside && !p.supplyInside && this.supply.ready && this.stock < 5) {
					this.stock = Math.min(5, this.stock + 2);
					this.supply.ready = false;
					this.supply.timer = this.balance.recharge;
					this.stats.refills++;
					this.emit("refill", { seat: p.seat, x: p.m.x, y: p.m.y });
				}
				p.supplyInside = inside;
			}
			for (const b of this.enemies) this.updateEnemy(b, dt);
			if (this.bomb) {
				const bomb = this.bomb,
					stationary = { prev: [bomb.x, bomb.y], m: { x: bomb.x, y: bomb.y } };
				const trigger = this.enemies.some(
					(b) => b.emerge <= 0 && b.stun <= 0 && T.swept(b, stationary) < 0.48,
				);
				if (trigger) {
					let points = 0;
					for (const b of this.enemies)
						if (
							b.emerge <= 0 &&
							Math.hypot(b.m.x - bomb.x, b.m.y - bomb.y) <= 1.65
						) {
							b.stun = this.balance.stun;
							b.state = "stunned";
							b.walk = 0;
							if (!b.scored) {
								b.scored = true;
								this.score += 50;
								points += 50;
							}
							this.stats.stuns++;
						}
					this.stats.triggers++;
					this.emit("trigger", { x: bomb.x, y: bomb.y, radius: 1.65, points });
					this.bomb = null;
				}
			}
			for (const p of this.players) {
				if (!p.active || p.hurt > 0) continue;
				for (const b of this.enemies)
					if (b.emerge <= 0 && b.stun <= 0 && T.swept(p, b) < 0.53) {
						this.hit(p);
						break;
					}
				if (this.phase === "lost") return;
			}
			for (const p of this.players)
				if (p.active) {
					this.reveal(p);
					this.deliver(p);
				}
			if (
				this.delivered === this.content.quota &&
				!this.players.some((p) => p.carried)
			) {
				this.score += 250;
				this.phase = "clear";
				this.phaseTime = 2.6;
				this.bomb = null;
				this.emit("clear", { points: 250 });
			}
		}
		snapshot() {
			const actor = (a) => ({
				id: a.id,
				x: +a.m.x.toFixed(4),
				y: +a.m.y.toFixed(4),
				cx: a.m.cx,
				cy: a.m.cy,
				to: a.m._to,
				u: a.m._u,
				moving: a.m.moving,
				dir: a.m.dir,
				facing: a.facing,
				walk: a.walk,
			});
			return {
				v: 1,
				run: this.runId,
				seed: this.seed,
				tick: this.tick,
				eventId: this.eventId,
				floor: this.floor,
				phase: this.phase,
				phaseTime: this.phaseTime,
				score: this.score,
				lives: this.lives,
				stock: this.stock,
				rescued: this.rescued,
				delivered: this.delivered,
				elapsed: this.elapsed,
				floorTime: this.floorTime,
				demo: this.demo,
				practice: this.practice,
				assisted: this.assisted,
				balance: { ...this.balance },
				stats: { ...this.stats },
				bomb: this.bomb && { ...this.bomb },
				supply: { ...this.supply },
				players: this.players.map((p) => ({
					...actor(p),
					seat: p.seat,
					carried: p.carried,
					home: p.home,
					invuln: p.invuln,
					hurt: p.hurt,
					emote: p.emote,
					active: p.active,
					supplyInside: p.supplyInside,
					route: p.route,
				})),
				enemies: this.enemies.map((b) => ({
					...actor(b),
					state: b.state,
					age: b.age,
					stun: b.stun,
					emerge: b.emerge,
					target: b.target,
					lastSeen: b.lastSeen,
					sighted: b.sighted,
					scored: b.scored,
				})),
				rooms: this.rooms.map((r) => ({ ...r, cell: r.cell.slice() })),
				homes: this.homes.map((h) => ({ ...h, cell: h.cell.slice() })),
				events: this.history.slice(-12),
			};
		}
	}
	T.Run = Run;
	// Bots use the same cardinal intentions and edge-triggered bomb action as a real player.
	class Bot {
		constructor(o = {}) {
			this.goals = {};
			this.seq = 0;
			this.defence = o.defence || 2.1;
			this.routes = !!o.routes;
			this.centred = !!o.centred;
		}
		intent(run, p) {
			if (run.phase !== "playing") return { confirm: true };
			if (!p.active || p.hurt > 0) return {};
			const cell = T.cell(p),
				live = run.enemies.filter((b) => b.stun <= 0.25 && b.emerge <= 0.3);
			const near = live.reduce(
				(d, b) => Math.min(d, Math.hypot(p.m.x - b.m.x, p.m.y - b.m.y)),
				99,
			);
			let goal = p.carried ? run.homes[p.home].cell : null;
			if (!goal) {
				const rooms = run.rooms.filter(
					(r) =>
						r.kind === "baby" &&
						(r.status === "hidden" || r.status === "revealed"),
				);
				const other = run.players.find((q) => q !== p && q.active);
				const scored = rooms
					.map((r) => ({
						r,
						d:
							run.grid.path(cell, r.cell).length +
							(other &&
							!other.carried &&
							T.dist(T.cell(other), r.cell) < T.dist(cell, r.cell)
								? 15
								: 0),
					}))
					.sort((a, b) => a.d - b.d || a.r.id.localeCompare(b.r.id));
				goal = scored[0]?.r.cell;
				if (run.floor === 1 && run.stats.decoys === 0 && run.stock >= 2) {
					const decoy = run.rooms.find(
						(r) => r.kind === "beetle" && r.status === "hidden",
					);
					if (decoy) goal = decoy.cell;
				}
			}
			// A partner may already carry every remaining guest. Keep scouting safely
			// instead of becoming a stationary target while the delivery resolves.
			if (!goal) {
				const options = run.homes
					.filter((h) => T.dist(cell, h.cell) > 2)
					.map((h) => ({
						h,
						safety:
							Math.min(
								99,
								...live.map(
									(b) => run.grid.path(T.cell(b), h.cell).length || 99,
								),
							) -
							run.grid.path(cell, h.cell).length * 0.25,
					}))
					.sort((a, b) => b.safety - a.safety || a.h.id - b.h.id);
				goal = options[0]?.h.cell;
			}
			// Restock before attempting another long route, or on an attractive detour.
			if (run.stock < 2 && run.supply.ready && !p.supplyInside)
				goal = run.content.supply;
			if (!goal) return {};
			let path = run.grid.path(p.m.moving ? p.m._to : [p.m.cx, p.m.cy], goal),
				dir = null;
			if (path.length > 1)
				dir = [path[1][0] - path[0][0], path[1][1] - path[0][1]];
			else if (p.m.moving) dir = p.m.dir.slice();
			const bomb = near < this.defence && !run.bomb && run.stock > 0;
			if (bomb) {
				const threat = live
					.slice()
					.sort(
						(a, b) =>
							Math.hypot(a.m.x - p.m.x, a.m.y - p.m.y) -
							Math.hypot(b.m.x - p.m.x, b.m.y - p.m.y),
					)[0];
				if (threat) {
					if (
						p.m.moving &&
						(threat.m.x - p.m.x) * p.m.dir[0] +
							(threat.m.y - p.m.y) * p.m.dir[1] >
							0.25
					)
						dir = [-p.m.dir[0], -p.m.dir[1]];
					else if (this.centred && !p.m.moving) {
						const ways = T.DIRS.filter((d) =>
							run.grid.walk([p.m.cx + d[0], p.m.cy + d[1]]),
						).sort(
							(a, b) =>
								Math.hypot(
									p.m.x + b[0] - threat.m.x,
									p.m.y + b[1] - threat.m.y,
								) -
								Math.hypot(
									p.m.x + a[0] - threat.m.x,
									p.m.y + a[1] - threat.m.y,
								),
						);
						dir = ways[0] || dir;
					}
				}
			}
			// With no defensive slot, route around approaching threats using weighted A* over the same graph.
			if (!bomb && near < Math.max(3.1, this.defence + 0.5)) {
				const from = p.m.moving ? p.m._to : [p.m.cx, p.m.cy];
				const ranked = T.DIRS.filter((d) =>
					run.grid.walk([from[0] + d[0], from[1] + d[1]]),
				)
					.map((d) => {
						const c = [from[0] + d[0], from[1] + d[1]],
							danger = Math.min(
								...live.map((b) => Math.hypot(c[0] - b.m.x, c[1] - b.m.y)),
								99,
							);
						return {
							d,
							score:
								(run.grid.path(c, goal).length || 100) +
								Math.max(0, 3 - danger) * 8,
						};
					})
					.sort((a, b) => a.score - b.score);
				if (ranked[0]) dir = ranked[0].d;
			}
			return {
				dir: this.routes && near > 3.1 ? null : dir,
				route: this.routes && near > 3.1 ? goal : undefined,
				bomb,
				bombSeq: bomb ? ++this.seq : undefined,
			};
		}
		inputs(run) {
			const out = {};
			for (const p of run.players) out[p.seat] = this.intent(run, p);
			return out;
		}
	}
	T.Bot = Bot;
})(globalThis.TB);
