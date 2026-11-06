/* Turtle Shell Service — deterministic fixed-step shared-world rules. Original code, MIT. */
(() => {
	"use strict";
	const T = (globalThis.TSS = globalThis.TSS || {}),
		E = globalThis.My3D2dge;
	const {
		TILE,
		DIRS,
		FLOORS,
		DEFAULT_BALANCE,
		BALANCE_LIMITS,
		HOME_COLORS,
		SYMBOLS,
	} = T;
	const clone = (v) => JSON.parse(JSON.stringify(v));
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const cell = (e) => [Math.floor(e.x / TILE), Math.floor(e.y / TILE)];
	const key = (c) => c.join(",");
	const center = (c) => ({ x: (c[0] + 0.5) * TILE, y: (c[1] + 0.5) * TILE });
	const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
	function hash(s) {
		let n = 2166136261;
		for (const c of String(s)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
		return n >>> 0;
	}
	function nextStream(streams, name) {
		let a = streams[name] >>> 0;
		a += 0x6d2b79f5;
		streams[name] = a >>> 0;
		a = Math.imul(a ^ (a >>> 15), a | 1);
		a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
		return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
	}
	function mapFor(f) {
		return new E.TileMap({
			rows: f.rows,
			legend: { "#": 1 },
			types: {
				1: {
					h: 6,
					top: f.palette.top,
					side: f.palette.wall,
					face: "plaster",
					roof: "plain",
				},
			},
			outside: false,
			ao: 2,
			floorTex: (x, y) =>
				E.hex(
					(Math.floor(x / 8) + Math.floor(y / 8)) & 1
						? f.palette.floor
						: f.palette.floor2,
				),
		});
	}
	function validateFloor(f, index = 0) {
		const errors = [],
			w = f.rows[0]?.length,
			h = f.rows.length;
		if (
			!w ||
			h !== 13 ||
			w !== 21 ||
			f.rows.some((r) => r.length !== w || /[^#.]/.test(r))
		)
			errors.push("rows must be rectangular 21x13 #/.");
		const map = mapFor(f),
			grid = E.Grid.from(map),
			walk = [];
		for (let y = 0; y < h; y++)
			for (let x = 0; x < w; x++) if (grid.walk([x, y])) walk.push([x, y]);
		const reach = walk.length ? grid.reach(walk[0], 10000) : null;
		if (!walk.length || walk.some((c) => !reach.has(c)))
			errors.push("disconnected corridors");
		const all = [
			...f.rooms,
			...f.homes,
			...f.spawns,
			f.supply,
			...f.beetles.map((b) => b.cell),
		];
		if (all.some((c) => !grid.walk(c)))
			errors.push("invalid or blocked content cell");
		if (!Number.isInteger(f.quota) || f.quota < 1 || f.quota > f.rooms.length)
			errors.push("impossible rescue quota");
		if (new Set(f.rooms.map(key)).size !== f.rooms.length)
			errors.push("duplicate mystery room");
		if (f.homes.length < 2 || new Set(f.homes.map(key)).size !== f.homes.length)
			errors.push("need distinct home slots");
		if (
			f.homes.some(
				(c) => c[0] !== 1 && c[0] !== w - 2 && c[1] !== 1 && c[1] !== h - 2,
			)
		)
			errors.push("home must be at outer edge");
		for (const c of f.rooms)
			if (f.homes.filter((hc) => grid.path(c, hc).length).length < 2)
				errors.push("rescue room lacks two reachable homes");
		if (f.spawns.length < 2 || key(f.spawns[0]) === key(f.spawns[1]))
			errors.push("need two distinct safe spawns");
		if (f.spawns.some((c) => f.beetles.some((b) => grid.dist(c, b.cell) < 4)))
			errors.push("spawn too close to initial beetle");
		const beetleCells = f.beetles.map((b) => key(b.cell));
		if (
			new Set(beetleCells).size !== beetleCells.length ||
			f.beetles.some((b) =>
				f.rooms.concat(f.homes, [f.supply]).some((c) => key(c) === key(b.cell)),
			)
		)
			errors.push("initial beetle spawn conflicts with objective/supply");
		if (
			f.rooms.some(
				(c) =>
					key(c) === key(f.supply) || f.homes.some((hc) => key(hc) === key(c)),
			)
		)
			errors.push("room conflicts with supply/home");
		if (errors.length)
			throw Error(
				`Floor ${index + 1} ${f.name}: ${[...new Set(errors)].join("; ")}`,
			);
		return true;
	}
	function sweptDistance(a0, a1, b0, b1) {
		const x = a0.x - b0.x,
			y = a0.y - b0.y,
			dx = a1.x - a0.x - (b1.x - b0.x),
			dy = a1.y - a0.y - (b1.y - b0.y),
			d = dx * dx + dy * dy;
		const u = d ? clamp(-(x * dx + y * dy) / d, 0, 1) : 0;
		return Math.hypot(x + dx * u, y + dy * u);
	}
	function createMover(c) {
		return new E.GridMover({ cx: c[0], cy: c[1], speed: 3.5 });
	}
	class Simulation {
		constructor(o = {}) {
			const seed = Number.isInteger(o.seed) ? o.seed : 47,
				seats = (o.seats || [1]).filter((s) => s === 1 || s === 2).sort();
			this.events = [];
			this.map = null;
			this.grid = null;
			this.content = null;
			this.state = {
				version: 1,
				runId: String(o.runId || `shell-${seed}`),
				seed,
				streams: {
					rooms: hash(seed + ":rooms"),
					enemies: hash(seed + ":enemies"),
				},
				tick: 0,
				eventSeq: 0,
				time: 0,
				floorTime: 0,
				floor: clamp(o.floor || 0, 0, FLOORS.length - 1),
				phase: "intro",
				phaseTimer: 2.4,
				terminal: null,
				seats,
				players: [],
				rooms: [],
				homes: [],
				enemies: [],
				supply: null,
				bomb: null,
				stock: 3,
				lives: 3,
				score: 0,
				rescued: 0,
				totalRescued: 0,
				teamGrace: 0,
				practice: !!o.practice,
				assisted: !!o.assisted,
				demo: !!o.demo,
				balance: { ...DEFAULT_BALANCE },
				dev: {
					invulnerable: false,
					reveal: false,
					overlays: false,
					timeScale: 1,
				},
				recentEvents: [],
				metrics: {
					bombs: 0,
					stuns: 0,
					supplies: 0,
					hits: 0,
					discoveries: 0,
					deliveries: 0,
					detects: 0,
					escalations: 0,
					decoys: 0,
					blueTicks: 0,
					yellowTicks: 0,
					redTicks: 0,
				},
			};
			if (this.state.floor) this.state.practice = true;
			this._build(this.state.floor, false);
		}
		emit(kind, extra = {}) {
			const s = this.state,
				ev = {
					id: `${s.runId}:${++s.eventSeq}`,
					kind,
					floor: s.floor,
					tick: s.tick,
					...extra,
				};
			this.events.push(ev);
			s.recentEvents.push(ev);
			if (s.recentEvents.length > 48) s.recentEvents.shift();
			return ev;
		}
		_build(index, emit = true) {
			const s = this.state,
				f = FLOORS[index];
			this.content = f;
			this.map = mapFor(f);
			this.grid = E.Grid.from(this.map);
			s.floor = index;
			s.floorTime = 0;
			s.phase = "intro";
			s.phaseTimer = 2.4;
			s.rescued = 0;
			s.bomb = null;
			s.teamGrace = 0;
			s.spawnSeq = 0;
			s.homes = f.homes.map((c, i) => ({
				id: `f${index}h${i}`,
				cell: c.slice(),
				...center(c),
				symbol: SYMBOLS[i],
				color: HOME_COLORS[i],
				reservedBy: null,
				welcoming: 0,
			}));
			const outcomes = Array.from({ length: f.rooms.length - 1 }, (_, i) =>
				i < f.quota - 1 ? "baby" : "beetle",
			);
			for (let i = outcomes.length - 1; i > 0; i--) {
				const j = Math.floor(nextStream(s.streams, "rooms") * (i + 1));
				[outcomes[i], outcomes[j]] = [outcomes[j], outcomes[i]];
			}
			outcomes.unshift("baby");
			s.rooms = f.rooms.map((c, i) => ({
				id: `f${index}r${i}`,
				cell: c.slice(),
				...center(c),
				outcome: outcomes[i],
				revealed: false,
				discovered: false,
				delivered: false,
				carrier: null,
				symbol: SYMBOLS[i % 4],
				color: HOME_COLORS[i % 4],
				home: null,
			}));
			s.players = s.seats.map((seat, i) =>
				this._player(seat, f.spawns[i % f.spawns.length]),
			);
			s.enemies = f.beetles.map((b, i) =>
				this._enemy(`f${index}e${i}`, b.cell, b.age || 0),
			);
			s.supply = {
				cell: f.supply.slice(),
				...center(f.supply),
				ready: true,
				cooldown: 0,
			};
			if (emit) this.emit("floor", { index, name: f.name });
		}
		_player(seat, c) {
			return {
				id: `p${seat}`,
				seat,
				...center(c),
				z: 0,
				dir: 3,
				vx: 0,
				vy: 0,
				mover: createMover(c),
				buffer: -1,
				bufferTimer: 0,
				carry: null,
				home: null,
				invulnerable: 2,
				hurt: 0,
				active: true,
				bombHeld: false,
				insideSupply: false,
				action: "idle",
				actionTimer: 0,
			};
		}
		_enemy(id, c, age = 0, emerge = 0) {
			return {
				id,
				...center(c),
				z: 0,
				dir: 1,
				vx: 0,
				vy: 0,
				mover: createMover(c),
				age,
				state:
					age >= this.state.balance.redAge
						? "red"
						: age >= this.state.balance.yellowAge
							? "yellow"
							: "blue",
				stun: 0,
				emerge,
				warn: 0,
				alert: 0,
				target: null,
				lastSeen: null,
				stunScored: false,
			};
		}
		snapshot() {
			return clone(this.state);
		}
		loadSnapshot(s) {
			if (!s || s.version !== 1 || !FLOORS[s.floor])
				throw Error("Invalid simulation snapshot");
			const rebuild = !this.content || this.state?.floor !== s.floor;
			this.state = clone(s);
			this.events = [];
			if (rebuild) {
				this.content = FLOORS[s.floor];
				this.map = mapFor(this.content);
				this.grid = E.Grid.from(this.map);
			}
			for (const e of [...this.state.players, ...this.state.enemies])
				Object.setPrototypeOf(e.mover, E.GridMover.prototype);
			return this;
		}
		path(from, to) {
			const a = Array.isArray(from) ? from : cell(from),
				b = Array.isArray(to) ? to : cell(to);
			return this.grid.path(a, b);
		}
		directionTo(entity, nextCell) {
			const m = entity.mover,
				a = m.moving ? m._to : [m.cx, m.cy],
				dx = nextCell[0] - a[0],
				dy = nextCell[1] - a[1];
			return DIRS.findIndex(
				(d) => d[0] === Math.sign(dx) && d[1] === Math.sign(dy),
			);
		}
		_move(e, dir, dt, speed, keep = true) {
			const m = e.mover;
			if (!(m instanceof E.GridMover))
				Object.setPrototypeOf(m, E.GridMover.prototype);
			const x = e.x,
				y = e.y;
			m.speed = speed;
			// GridMover's centre-to-centre travel is retained. Reverse its current edge in place for immediate reversal.
			if (dir >= 0 && m.moving) {
				const d = DIRS[dir];
				if (d[0] === -m.dir[0] && d[1] === -m.dir[1]) {
					const old = [m.cx, m.cy];
					[m.cx, m.cy] = m._to;
					m._to = old;
					m._u = 1 - m._u;
					m.dir = d.slice();
					m._want = null;
				}
			}
			if (dir < 0) m._want = null;
			m.update(dt, this.grid, dir >= 0 ? DIRS[dir] : null, {
				keep: keep && dir >= 0,
			});
			e.x = (m.x + 0.5) * TILE;
			e.y = (m.y + 0.5) * TILE;
			e.vx = (e.x - x) / Math.max(dt, 1e-8);
			e.vy = (e.y - y) / Math.max(dt, 1e-8);
			if (Math.hypot(e.vx, e.vy) > 0.01)
				e.dir = DIRS.findIndex((d) => d[0] === m.dir[0] && d[1] === m.dir[1]);
		}
		predictPlayer(p, intent = {}, dt) {
			if (!p.active || p.hurt > 0) return p;
			const dir =
				Number.isInteger(intent.dir) && intent.dir >= 0 && intent.dir <= 3
					? intent.dir
					: -1;
			if (dir >= 0) {
				p.buffer = dir;
				p.bufferTimer = 0.22;
			} else p.bufferTimer = Math.max(0, (p.bufferTimer || 0) - dt);
			const pendingTurn =
				p.bufferTimer > 0 && p.buffer >= 0 && p.buffer !== p.dir;
			const want = dir >= 0 ? dir : pendingTurn ? p.buffer : -1;
			this._move(
				p,
				want,
				dt,
				this.state.balance.playerSpeed *
					(p.carry ? this.state.balance.carryingMultiplier : 1),
				dir >= 0,
			);
			return p;
		}
		_chooseEnemy(e) {
			const s = this.state,
				m = e.mover,
				c = [m.cx, m.cy],
				valid = s.players.filter((p) => p.active && p.hurt <= 0),
				ways = DIRS.map((d, i) => ({
					i,
					c: [c[0] + d[0], c[1] + d[1]],
				})).filter((a) => this.grid.walk(a.c));
			if (!ways.length) return -1;
			const candidates = valid
				.map((p) => ({ p, path: this.grid.path(c, cell(p)) }))
				.filter((o) => o.path.length)
				.sort((a, b) => a.path.length - b.path.length || a.p.seat - b.p.seat);
			let best = candidates[0];
			const old = candidates.find((o) => o.p.seat === e.target);
			if (old && best && old.path.length <= best.path.length + 3) best = old;
			if (e.state === "yellow") {
				const seen = candidates.filter((o) => {
					const pc = cell(o.p);
					return (pc[0] === c[0] || pc[1] === c[1]) && this.grid.sees(c, pc);
				});
				if (seen.length) {
					best = seen[0];
					if (e.target !== best.p.seat || !e.lastSeen) {
						e.alert = 0.55;
						s.metrics.detects++;
						this.emit("detect", {
							enemy: e.id,
							seat: best.p.seat,
							x: e.x,
							y: e.y,
						});
					}
					e.target = best.p.seat;
					e.lastSeen = cell(best.p);
				}
				if (e.lastSeen) {
					const path = this.grid.path(c, e.lastSeen);
					if (path.length > 1) return this._dirCells(c, path[1]);
					e.lastSeen = null;
					e.target = null;
				}
			} else if (e.state === "red" && best) {
				e.target = best.p.seat;
				return best.path.length > 1 ? this._dirCells(c, best.path[1]) : -1;
			}
			const forward = ways.filter((w) => w.i !== (e.dir + 2) % 4),
				pick = forward.length ? forward : ways;
			return pick[Math.floor(nextStream(s.streams, "enemies") * pick.length)].i;
		}
		_dirCells(a, b) {
			return DIRS.findIndex(
				(d) => d[0] === b[0] - a[0] && d[1] === b[1] - a[1],
			);
		}
		_bomb(p) {
			const s = this.state;
			if (s.phase !== "play" || p.hurt > 0 || !p.active) return false;
			if (s.bomb) {
				this.emit("active", { seat: p.seat, x: p.x, y: p.y });
				return false;
			}
			if (s.stock <= 0) {
				this.emit("empty", { seat: p.seat, x: p.x, y: p.y });
				return false;
			}
			if (!this.grid.walk(cell(p))) return false;
			s.stock--;
			s.metrics.bombs++;
			s.bomb = {
				id: `f${s.floor}b${s.metrics.bombs}`,
				x: p.x,
				y: p.y,
				seat: p.seat,
				life: s.balance.bombLifetime,
				radius: 25,
			};
			p.action = "plant";
			p.actionTimer = 0.35;
			this.emit("bomb", { ...s.bomb });
			return true;
		}
		_stun(e) {
			const s = this.state;
			e.stun = s.balance.stunDuration;
			e.state = "stunned";
			e.age = 0;
			e.warn = 0;
			e.target = null;
			e.lastSeen = null;
			e.vx = e.vy = 0;
			if (!e.stunScored) {
				e.stunScored = true;
				s.score += 50;
				this.emit("points", { x: e.x, y: e.y, points: 50 });
			}
			s.metrics.stuns++;
			this.emit("stun", { enemy: e.id, x: e.x, y: e.y });
		}
		_drop(p) {
			const s = this.state;
			if (p.carry) {
				const r = s.rooms.find((r) => r.id === p.carry);
				if (r) {
					r.carrier = null;
					r.home = null;
					r.revealed = true;
				}
				const h = s.homes.find((h) => h.id === p.home);
				if (h) h.reservedBy = null;
				p.carry = null;
				p.home = null;
			}
		}
		_hit(p, e) {
			const s = this.state;
			if (
				s.teamGrace > 0 ||
				p.invulnerable > 0 ||
				p.hurt > 0 ||
				s.demo ||
				s.dev.invulnerable ||
				!p.active
			)
				return false;
			this._drop(p);
			s.lives--;
			s.metrics.hits++;
			s.teamGrace = 1.25;
			s.bomb = null;
			p.hurt = 0.7;
			p.action = "hurt";
			p.actionTimer = 0.7;
			p.vx = p.vy = 0;
			this.emit("hit", {
				seat: p.seat,
				enemy: e.id,
				x: p.x,
				y: p.y,
				lives: s.lives,
			});
			if (s.lives <= 0) {
				s.lives = 0;
				s.phase = "lost";
				s.terminal = "lost";
				s.phaseTimer = 0;
				this.emit("loss", { score: s.score, rescues: s.totalRescued });
			}
			return true;
		}
		_respawn(p) {
			const s = this.state,
				auth = this.content.spawns.concat(this.content.homes),
				live = s.enemies.filter((e) => e.stun <= 0 && e.emerge <= 0);
			const safety = (c) =>
				live.length
					? Math.min(
							...live.map((e) =>
								Math.hypot(center(c).x - e.x, center(c).y - e.y),
							),
						)
					: 1000;
			let choices = auth.filter((c) => safety(c) > 32);
			if (!choices.length) {
				choices = [];
				for (let y = 0; y < this.grid.h; y++)
					for (let x = 0; x < this.grid.w; x++)
						if (this.grid.walk([x, y])) choices.push([x, y]);
			}
			choices.sort(
				(a, b) => safety(b) - safety(a) || a[1] - b[1] || a[0] - b[0],
			);
			const c = choices[0];
			Object.assign(p, center(c));
			p.mover.place(...c);
			p.buffer = -1;
			p.bufferTimer = 0;
			p.invulnerable = 2.5;
			p.hurt = 0;
			p.insideSupply = false;
			p.action = "recover";
			p.actionTimer = 0.6;
			this.emit("respawn", { seat: p.seat, x: p.x, y: p.y });
		}
		_room(p) {
			if (p.carry || p.hurt > 0 || !p.active) return;
			const s = this.state,
				r = s.rooms.find(
					(r) =>
						!r.delivered &&
						!r.carrier &&
						dist(p, r) < 5.5 &&
						(!r.revealed || r.outcome === "baby"),
				);
			if (!r) return;
			if (r.outcome === "beetle") {
				r.revealed = true;
				s.metrics.decoys++;
				const enemy = this._enemy(`f${s.floor}room${r.id}`, r.cell, 0, 1.15);
				s.enemies.push(enemy);
				this.emit("reveal", {
					room: r.id,
					outcome: "beetle",
					x: r.x,
					y: r.y,
					seat: p.seat,
				});
				return;
			}
			const homes = s.homes.filter(
				(h) => h.reservedBy === null && this.path(r, h).length,
			);
			homes.sort(
				(a, b) =>
					this.path(r, b).length - this.path(r, a).length ||
					a.id.localeCompare(b.id),
			);
			if (!homes.length) {
				this.emit("reservation-failed", {
					room: r.id,
					seat: p.seat,
					x: p.x,
					y: p.y,
				});
				return;
			}
			const h = homes[0];
			r.revealed = true;
			r.carrier = p.seat;
			r.home = h.id;
			r.symbol = h.symbol;
			r.color = h.color;
			h.reservedBy = p.seat;
			p.carry = r.id;
			p.home = h.id;
			p.action = "pickup";
			p.actionTimer = 0.65;
			if (!r.discovered) {
				r.discovered = true;
				s.score += 100;
				s.metrics.discoveries++;
				this.emit("reveal", {
					room: r.id,
					outcome: "baby",
					x: r.x,
					y: r.y,
					seat: p.seat,
					points: 100,
				});
			}
			this.emit("pickup", {
				room: r.id,
				home: h.id,
				seat: p.seat,
				x: p.x,
				y: p.y,
				symbol: h.symbol,
				color: h.color,
			});
		}
		_delivery(p) {
			if (!p.carry || p.hurt > 0 || !p.active) return;
			const s = this.state,
				h = s.homes.find((h) => h.id === p.home),
				r = s.rooms.find((r) => r.id === p.carry);
			if (
				!h ||
				!r ||
				h.reservedBy !== p.seat ||
				r.carrier !== p.seat ||
				dist(p, h) > 5.5
			)
				return;
			r.delivered = true;
			r.carrier = null;
			r.home = null;
			h.reservedBy = null;
			h.welcoming = 1.2;
			p.carry = null;
			p.home = null;
			p.action = "deliver";
			p.actionTimer = 0.8;
			s.rescued++;
			s.totalRescued++;
			s.metrics.deliveries++;
			s.score += 400;
			this.emit("deliver", {
				seat: p.seat,
				room: r.id,
				home: h.id,
				x: h.x,
				y: h.y,
				points: 400,
				rescued: s.rescued,
				total: s.totalRescued,
			});
		}
		_clear() {
			const s = this.state;
			s.score += 250 + s.floor * 50;
			s.bomb = null;
			s.phase = s.floor === FLOORS.length - 1 ? "celebrate" : "transition";
			s.phaseTimer = s.phase === "celebrate" ? 5 : 2.6;
			this.emit("clear", {
				x: s.supply.x,
				y: s.supply.y,
				points: 250 + s.floor * 50,
			});
			if (s.phase === "celebrate")
				this.emit("evacuate", { rescues: s.totalRescued });
		}
		step(dt, intents = {}) {
			if (!Number.isFinite(dt) || dt <= 0) return;
			dt = Math.min(dt, 0.1);
			const s = this.state;
			this.events = [];
			s.tick++;
			if (s.terminal) return;
			if (s.phase !== "play") {
				s.phaseTimer -= dt;
				const confirm = s.players.some((p) => intents[p.seat]?.confirm);
				if (s.phase === "intro" && (s.phaseTimer <= 0 || confirm)) {
					s.phase = "play";
					s.phaseTimer = 0;
					this.emit("go", { floor: s.floor });
				} else if (s.phase === "transition" && (s.phaseTimer <= 0 || confirm)) {
					this._build(s.floor + 1);
				} else if (
					s.phase === "celebrate" &&
					(s.phaseTimer <= 0 || (confirm && s.phaseTimer < 3))
				) {
					s.phase = "won";
					s.terminal = "won";
					s.phaseTimer = 0;
					this.emit("win", {
						score: s.score,
						rescues: s.totalRescued,
						time: s.time,
					});
				}
				return;
			}
			s.time += dt;
			s.floorTime += dt;
			s.teamGrace = Math.max(0, s.teamGrace - dt);
			for (const h of s.homes) h.welcoming = Math.max(0, h.welcoming - dt);
			const before = new Map(
				[...s.players, ...s.enemies].map((e) => [e.id, { x: e.x, y: e.y }]),
			);
			// Deterministic resolution: seat-order bomb edges; all movement; supply; bomb/stuns; hits; pickups; deliveries; clear.
			for (const p of s.players) {
				const i = intents[p.seat] || {},
					bomb = !!i.bomb;
				if (bomb && !p.bombHeld) this._bomb(p);
				p.bombHeld = bomb;
				p.invulnerable = Math.max(0, p.invulnerable - dt);
				p.actionTimer = Math.max(0, p.actionTimer - dt);
				if (p.hurt > 0) {
					p.hurt -= dt;
					if (p.hurt <= 0) this._respawn(p);
					continue;
				}
				if (!p.active) continue;
				this.predictPlayer(p, i, dt);
				if (!p.actionTimer)
					p.action = Math.hypot(p.vx, p.vy) > 0.1 ? "walk" : "idle";
			}
			for (const e of s.enemies) {
				e.alert = Math.max(0, e.alert - dt);
				e.warn = Math.max(0, e.warn - dt);
				if (e.emerge > 0) {
					e.emerge = Math.max(0, e.emerge - dt);
					continue;
				}
				if (e.stun > 0) {
					e.stun = Math.max(0, e.stun - dt);
					if (e.stun <= 0) {
						e.age = 0;
						e.state = "blue";
						e.target = null;
						e.lastSeen = null;
						this.emit("recover", { enemy: e.id, x: e.x, y: e.y });
					}
					continue;
				}
				e.age += dt;
				const state =
					e.age >= s.balance.redAge
						? "red"
						: e.age >= s.balance.yellowAge
							? "yellow"
							: "blue";
				if (e.state !== state) {
					e.state = state;
					e.warn = 0.8;
					s.metrics.escalations++;
					this.emit("escalate", { enemy: e.id, state, x: e.x, y: e.y });
				}
				if (
					(e.age < s.balance.yellowAge && e.age >= s.balance.yellowAge - 0.7) ||
					(e.age < s.balance.redAge && e.age >= s.balance.redAge - 0.7)
				)
					e.warn = 0.7;
				s.metrics[e.state + "Ticks"]++;
				const dir = e.mover.moving ? -1 : this._chooseEnemy(e),
					speed =
						({ blue: 2.2, yellow: 2.6, red: 2.9 }[e.state] || 2.2) *
						s.balance.beetleSpeed;
				this._move(e, dir, dt, speed, false);
			}
			if (!s.supply.ready) {
				s.supply.cooldown = Math.max(0, s.supply.cooldown - dt);
				if (s.supply.cooldown <= 0) {
					s.supply.ready = true;
					this.emit("supply-ready", { x: s.supply.x, y: s.supply.y });
				}
			}
			for (const p of s.players) {
				const inside = p.active && p.hurt <= 0 && dist(p, s.supply) < 7;
				if (inside && !p.insideSupply && s.supply.ready && s.stock < 5) {
					const amount = Math.min(2, 5 - s.stock);
					s.stock += amount;
					s.supply.ready = false;
					s.supply.cooldown = s.balance.supplyRecharge;
					s.metrics.supplies++;
					this.emit("supply", {
						seat: p.seat,
						x: s.supply.x,
						y: s.supply.y,
						amount,
					});
				}
				p.insideSupply = inside;
			}
			if (s.bomb) {
				const b = s.bomb;
				b.life -= dt;
				const trigger = s.enemies.some(
					(e) =>
						e.stun <= 0 &&
						e.emerge <= 0 &&
						sweptDistance(before.get(e.id) || e, e, b, b) < 8,
				);
				if (trigger) {
					for (const e of s.enemies)
						if (
							e.emerge <= 0 &&
							dist(e, b) <= b.radius &&
							this.map.los(e.x, e.y, b.x, b.y)
						)
							this._stun(e);
					this.emit("trigger", { x: b.x, y: b.y, radius: b.radius });
					s.bomb = null;
				} else if (b.life <= 0) {
					this.emit("expire", { x: b.x, y: b.y });
					s.bomb = null;
				}
			}
			for (const p of s.players) {
				if (p.hurt > 0 || !p.active) continue;
				for (const e of s.enemies) {
					if (e.stun > 0 || e.emerge > 0) continue;
					if (
						sweptDistance(before.get(p.id) || p, p, before.get(e.id) || e, e) <
						7.5
					)
						this._hit(p, e);
					if (s.terminal) return;
				}
			}
			for (const p of s.players) this._room(p);
			for (const p of s.players) this._delivery(p);
			if (s.rescued === this.content.quota && !s.players.some((p) => p.carry))
				this._clear();
		}
		removeSeat(seat) {
			const s = this.state,
				p = s.players.find((p) => p.seat === seat);
			if (!p || !p.active) return;
			this._drop(p);
			p.active = false;
			p.vx = p.vy = 0;
			p.bombHeld = false;
			s.seats = s.seats.filter((v) => v !== seat);
			this.emit("leave", { seat });
		}
		setBalance(k, v) {
			const bounds = BALANCE_LIMITS[k];
			if (!bounds || !Number.isFinite(+v)) return;
			const bounded = clamp(+v, bounds[0], bounds[1]);
			this.state.balance[k] = bounded;
			if (k === "yellowAge")
				this.state.balance.redAge = Math.max(
					this.state.balance.redAge,
					bounded + 2,
				);
			if (k === "redAge")
				this.state.balance.yellowAge = Math.min(
					this.state.balance.yellowAge,
					bounded - 2,
				);
			this.state.practice = true;
			return this.state.balance[k];
		}
		resetBalance() {
			this.state.balance = { ...DEFAULT_BALANCE };
			return this.state.balance;
		}
		dev(action, value) {
			const s = this.state;
			s.practice = true;
			switch (action) {
				case "invulnerable":
					s.dev.invulnerable =
						value === undefined ? !s.dev.invulnerable : !!value;
					break;
				case "refill":
					s.stock = 5;
					break;
				case "reveal":
					s.dev.reveal = !s.dev.reveal;
					break;
				case "overlays":
					s.dev.overlays = !s.dev.overlays;
					break;
				case "spawn": {
					const c = this.content.beetles[0].cell;
					s.enemies.push(
						this._enemy(`f${s.floor}dev${++s.spawnSeq}`, c, 0, 1.2),
					);
					break;
				}
				case "clear":
					s.enemies = [];
					break;
				case "floor":
					this._build(clamp(Math.round(+value || 0), 0, FLOORS.length - 1));
					break;
				case "restart":
					this._build(s.floor);
					break;
				case "timeScale":
					s.dev.timeScale = clamp(+value || 1, 0.1, 3);
					break;
				default:
					return false;
			}
			return true;
		}
	}
	Object.assign(T, {
		Simulation,
		validateFloor,
		validateContent: () => FLOORS.forEach(validateFloor),
		mapFor,
		cell,
		center,
		sweptDistance,
	});
})();
