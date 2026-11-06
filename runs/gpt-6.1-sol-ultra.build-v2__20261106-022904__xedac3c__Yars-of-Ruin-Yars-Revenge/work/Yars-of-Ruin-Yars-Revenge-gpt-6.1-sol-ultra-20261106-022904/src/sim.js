/* A single authoritative, deterministic overhead simulation. No browser, audio or drawing state. */
(() => {
	"use strict";
	const C = globalThis.RuinContent;
	const W = 960,
		H = 540,
		TAU = Math.PI * 2,
		DT = 1 / 120;
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const wrap = (v, n = H) => ((v % n) + n) % n;
	const dy = (a, b) => wrap(a - b + H / 2) - H / 2;
	const copy = (value) => JSON.parse(JSON.stringify(value));
	const finite = (value, fallback = 0) =>
		Number.isFinite(Number(value)) ? Number(value) : fallback;
	const approach = (v, to, d) =>
		v < to ? Math.min(to, v + d) : Math.max(to, v - d);
	const dist = (a, b) => Math.hypot(a.x - b.x, dy(a.y, b.y));
	const turn = (a, b, step) =>
		a + clamp(Math.atan2(Math.sin(b - a), Math.cos(b - a)), -step, step);
	function rng(w) {
		let v = w.rngCombat | 0;
		v ^= v << 13;
		v ^= v >>> 17;
		v ^= v << 5;
		w.rngCombat = v >>> 0;
		return w.rngCombat / 4294967296;
	}
	function event(w, type, x = 480, y = 270, extra = {}) {
		const ev = { id: ++w.eventId, type, x, y, tick: w.tick, ...extra };
		w.events.push(ev);
		w.eventLog.push(ev);
		if (w.eventLog.length > 64) w.eventLog.shift();
		return ev;
	}
	function say(w, text, seconds = 4) {
		w.message = text;
		w.messageTime = seconds;
	}
	function mark(w, key) {
		w.learned[key] = true;
	}
	function addScore(w, amount, kind, player) {
		const points = Math.round(amount * w.chain);
		w.score += points;
		w.stats[kind] = (w.stats[kind] || 0) + points;
		w.chain = Math.min(3, w.chain + 0.08);
		w.chainTime = 4;
		if (player != null && w.players[player]) w.players[player].score += points;
		return points;
	}
	function isStatic(w, p) {
		return (
			w.refuge.active && p.x >= w.refuge.x && p.x <= w.refuge.x + w.refuge.w
		);
	}
	function contentFor(w) {
		return w.customContent || C.sectors[w.sector];
	}
	function ready(w, p) {
		return p.charge >= w.tuning.chargeThreshold - 1e-6;
	}
	function charge(w, p, amount, refill = false) {
		const was = ready(w, p);
		p.charge = Math.min(w.tuning.chargeThreshold, p.charge + amount);
		p.ready = ready(w, p);
		if (!was && p.ready) {
			event(w, "charge", p.x, p.y, { player: p.index });
			mark(w, "charge");
			say(
				w,
				"SIEGE READY — align with the heart. Fire, then leave the lane.",
				3,
			);
		}
		if (refill) event(w, "refill", p.x, p.y, { player: p.index });
	}
	function removeCell(w, cell, kind, p) {
		if (!cell.alive) return false;
		cell.alive = false;
		const player = p ? p.index : -1;
		const score = addScore(
			w,
			kind === "bite" ? 45 : kind === "cannon" ? 4 : 12,
			kind === "bite" ? "bites" : "breaches",
			player,
		);
		event(w, kind === "bite" ? "bite" : "chip", cell.x, cell.y, {
			player,
			material: cell.material,
			score,
			cell: cell.id,
		});
		if (kind === "bite" && p) {
			charge(w, p, 1);
			p.biteFlash = 0.15;
			w.stats.biteCount++;
			mark(w, "bite");
		}
		if (kind === "primary") {
			w.stats.shotCells++;
			mark(w, "shoot");
		}
		return true;
	}
	function normalizeAction(a, p) {
		a = a || {};
		let mx = clamp(finite(a.mx), -1, 1),
			my = clamp(finite(a.my), -1, 1),
			ax = clamp(finite(a.ax, p.ax), -1, 1),
			ay = clamp(finite(a.ay, p.ay), -1, 1);
		const m = Math.hypot(mx, my),
			aim = Math.hypot(ax, ay);
		if (m > 1) {
			mx /= m;
			my /= m;
		}
		if (aim > 0.05) {
			ax /= aim;
			ay /= aim;
		} else {
			ax = p.ax;
			ay = p.ay;
		}
		return { mx, my, ax, ay, fire: a.fire === true, cannon: a.cannon === true };
	}
	function makePlayer(index, id) {
		return {
			id: id == null ? index + 1 : id,
			index,
			x: 130,
			y: index ? 340 : 210,
			vx: 0,
			vy: 0,
			ax: 1,
			ay: 0,
			r: 9,
			alive: true,
			departed: false,
			respawn: 0,
			invuln: 2.2,
			charge: 0,
			ready: false,
			biteTimer: 0,
			biteFlash: 0,
			fireTimer: 0,
			refillTimer: 0,
			blockedTimer: 0,
			wrapFlash: 0,
			score: 0,
			deadReason: "",
		};
	}
	function initSector(w, sector, custom = null) {
		w.sector = clamp(Math.round(sector), 0, 2);
		w.customContent = custom;
		const data = contentFor(w);
		w.sectorTime = 0;
		w.phase = 0;
		w.phaseTime = 0;
		w.mode = "play";
		w.transitionTime = 0;
		w.cells = data.cells.map((c, i) => ({
			id: i,
			baseX: c.x,
			baseY: c.y,
			x: c.x,
			y: c.y,
			plate: c.plate || 0,
			material: c.material || "normal",
			alive: true,
			size: 20,
		}));
		w.plates = data.plates.map((p) => ({ ...copy(p), dx: 0, dy: 0 }));
		const dc = data.core || { x: 810, y: 270, hp: data.hp || w.sector + 1 };
		w.core = {
			x: dc.x,
			y: dc.y,
			dockX: dc.x,
			dockY: dc.y,
			hp: dc.hp,
			maxHp: dc.hp,
			state: "dock",
			timer: data.swirlDelay || 14,
			phase: 0,
			angle: 0,
			r: 28,
			vx: 0,
			vy: 0,
			hitGrace: 0,
			flightTime: 0,
			targetX: 0,
			targetY: 0,
			launches: 0,
			needleTimer: 2.8,
		};
		w.shots = [];
		w.hazards = [];
		w.cannons = [];
		w.refuge = {
			x: data.refuge.x,
			w: data.refuge.w,
			active: true,
			warning: false,
			cycle: 0,
			outageTimer: 0,
		};
		w.tutorial = 0;
		w.learned = {};
		for (const p of w.players) {
			if (p.departed) continue;
			Object.assign(p, {
				alive: true,
				respawn: 0,
				x: 130,
				y: p.index ? 340 : 210,
				vx: 0,
				vy: 0,
				charge: 0,
				ready: false,
				invuln: 2.4,
				biteTimer: 0,
				fireTimer: 0,
				refillTimer: 0,
				blockedTimer: 0,
				biteFlash: 0,
				wrapFlash: 0,
			});
		}
		for (let i = 0; i < (data.pursuers || 1); i++) spawnPursuer(w, i);
		say(
			w,
			data.introduction || "A shell of stolen light. A heart behind it.",
			4.5,
		);
		event(w, "sector-start", w.core.x, w.core.y, { sector: w.sector });
	}
	function create(options = {}) {
		const tuning = { ...C.defaults };
		if (options.assist) {
			tuning.swirlTelegraph = 1.9;
			tuning.pursuerSpeed = 38;
			tuning.reserveCount = 6;
			tuning.cannonWindup = 0.4;
		}
		if (options.tuning)
			for (const k of Object.keys(C.ranges))
				if (k in options.tuning)
					tuning[k] = clamp(
						finite(options.tuning[k], tuning[k]),
						C.ranges[k].min,
						C.ranges[k].max,
					);
		const seed = finite(options.seed, 1982) >>> 0 || 1982;
		let custom = null;
		if (options.content) {
			const valid = validateContent(options.content);
			if (valid.ok) custom = valid.content;
		}
		const count = Array.isArray(options.players)
			? options.players.length
			: clamp(Math.round(finite(options.players, 1)), 1, 2);
		const w = {
			version: 1,
			W,
			H,
			tick: 0,
			time: 0,
			seed,
			rngCombat: seed,
			eventId: 0,
			nextId: 1,
			sector: 0,
			mode: "play",
			phase: 0,
			phaseTime: 0,
			assist: !!options.assist,
			practice: !!options.practice || !!custom,
			attract: !!options.attract,
			tuning,
			players: Array.from({ length: count }, (_, i) =>
				makePlayer(
					i,
					Array.isArray(options.players) ? options.players[i] : undefined,
				),
			),
			reserves: Math.min(8, tuning.reserveCount + (count - 1)),
			reserveCap: 8,
			score: 0,
			chain: 1,
			chainTime: 0,
			events: [],
			eventLog: [],
			message: "",
			messageTime: 0,
			tutorial: 0,
			learned: {},
			stats: {
				bites: 0,
				breaches: 0,
				hearts: 0,
				ending: 0,
				biteCount: 0,
				shotCells: 0,
				shots: 0,
				cannonFired: 0,
				cannonMissed: 0,
				coreHits: 0,
				airborne: 0,
				deaths: 0,
				cleared: 0,
				refills: 0,
			},
			dev: { invulnerable: false, infiniteCharge: false, collisions: false },
			outcomeAwarded: false,
			pendingTuning: {},
			errors: [],
			customContent: null,
		};
		initSector(w, finite(options.sector), custom);
		return w;
	}
	function spawnPursuer(w, variant = 0) {
		const id = w.nextId++;
		const h = {
			id,
			kind: "pursuer",
			x: 860 - variant * 55,
			y: wrap(85 + variant * 345 + (rng(w) - 0.5) * 24),
			vx: -w.tuning.pursuerSpeed,
			vy: 0,
			r: variant ? 8 : 9,
			angle: Math.PI + (rng(w) - 0.5) * 0.2,
			target: variant % Math.max(1, w.players.length),
			life: 1e6,
			variant,
			age: 0,
		};
		w.hazards.push(h);
		return h;
	}
	function safeSpawn(w, p) {
		const candidates = [90, 450, 180, 360, 270, 15, 525];
		let best = candidates[0],
			bestD = -1;
		for (const y of candidates) {
			let nearest = 1e6;
			for (const h of w.hazards)
				nearest = Math.min(nearest, Math.hypot(h.x - 130, dy(h.y, y)));
			for (const c of w.cannons)
				if (Math.abs(dy(c.y, y)) < 35)
					nearest = Math.min(nearest, Math.abs(c.x - 130));
			if (w.core.state === "flight" || w.core.state === "return")
				nearest = Math.min(
					nearest,
					Math.hypot(w.core.x - 130, dy(w.core.y, y)),
				);
			if (nearest > bestD) {
				bestD = nearest;
				best = y;
			}
		}
		p.x = 130;
		p.y = best;
		p.vx = p.vy = 0;
		p.alive = true;
		p.respawn = 0;
		p.invuln = 2.4;
		p.charge = 0;
		p.ready = false;
		p.refillTimer = 0;
		p.fireTimer = 0;
		p.biteTimer = 0;
		event(w, "respawn", p.x, p.y, { player: p.index });
	}
	function kill(w, p, reason) {
		if (
			!p.alive ||
			p.invuln > 0 ||
			p.departed ||
			w.mode !== "play" ||
			w.dev.invulnerable ||
			w.attract
		)
			return false;
		p.alive = false;
		p.charge = 0;
		p.ready = false;
		p.vx = p.vy = 0;
		p.deadReason = reason;
		w.stats.deaths++;
		w.chain = 1;
		w.chainTime = 0;
		if (w.reserves > 0) {
			w.reserves--;
			p.respawn = 1.3;
		} else p.respawn = 0;
		event(w, "death", p.x, p.y, { player: p.index, reason });
		return true;
	}
	function updatePlates(w) {
		for (const plate of w.plates) {
			const shift = w.sector === 1 && w.phase > 0 ? Math.PI / 2 : 0;
			plate.dy =
				Math.sin((w.sectorTime * TAU) / plate.period + plate.phase + shift) *
				plate.amplitude;
			plate.dx = 0;
		}
		for (const c of w.cells) {
			const p = w.plates.find((p) => p.id === c.plate);
			c.x = c.baseX + (p ? p.dx : 0);
			c.y = wrap(c.baseY + (p ? p.dy : 0));
		}
	}
	function cellOverlap(x, y, radius, c) {
		const half = c.size / 2;
		const xx = Math.max(Math.abs(x - c.x) - half, 0),
			yy = Math.max(Math.abs(dy(y, c.y)) - half, 0);
		return xx * xx + yy * yy <= radius * radius;
	}
	function resolveCells(w, p) {
		for (const c of w.cells) {
			if (!c.alive || !cellOverlap(p.x, p.y, p.r, c)) continue;
			const dx = p.x - c.x,
				ddy = dy(p.y, c.y),
				limit = c.size / 2 + p.r;
			const pushX = limit - Math.abs(dx),
				pushY = limit - Math.abs(ddy);
			if (pushX < pushY) {
				p.x += (dx < 0 ? -1 : 1) * Math.max(0, pushX);
				p.vx = 0;
			} else {
				p.y = wrap(p.y + (ddy < 0 ? -1 : 1) * Math.max(0, pushY));
				p.vy = 0;
			}
		}
	}
	function playerStep(w, p, action, dt) {
		if (p.departed) return;
		if (!p.alive) {
			if (p.respawn > 0) {
				p.respawn -= dt;
				if (p.respawn <= 0) safeSpawn(w, p);
			}
			return;
		}
		const a = normalizeAction(action, p),
			speed = w.tuning.scoutSpeed;
		p.ax = a.ax;
		p.ay = a.ay;
		for (const k of [
			"invuln",
			"biteTimer",
			"biteFlash",
			"fireTimer",
			"refillTimer",
			"blockedTimer",
			"wrapFlash",
		])
			p[k] = Math.max(0, p[k] - dt);
		if (w.dev.infiniteCharge) p.charge = w.tuning.chargeThreshold;
		p.ready = ready(w, p);
		p.vx = approach(
			p.vx,
			a.mx * speed,
			dt * (Math.abs(a.mx) > 0.02 ? 2300 : 3200),
		);
		p.vy = approach(
			p.vy,
			a.my * speed,
			dt * (Math.abs(a.my) > 0.02 ? 2300 : 3200),
		);
		const oldY = p.y;
		p.x = clamp(p.x + p.vx * dt, 35, 930);
		p.y = wrap(p.y + p.vy * dt);
		if (Math.abs(oldY - p.y) > H / 2) {
			p.wrapFlash = 0.3;
			event(w, "wrap", p.x, p.y, { player: p.index });
		}
		if (Math.abs(a.mx) + Math.abs(a.my) > 0.1) mark(w, "move");
		if (p.biteTimer <= 0) {
			let nearest = null,
				best = Infinity;
			for (const c of w.cells)
				if (c.alive && cellOverlap(p.x, p.y, p.r + 3, c)) {
					const d = dist(p, c);
					if (d < best) {
						best = d;
						nearest = c;
					}
				}
			if (nearest) {
				removeCell(w, nearest, "bite", p);
				p.biteTimer = w.tuning.biteInterval;
			}
		}
		resolveCells(w, p);
		if (
			w.core.state === "dock" &&
			p.refillTimer <= 0 &&
			dist(p, w.core) < p.r + w.core.r + 5
		) {
			if (!ready(w, p)) {
				charge(w, p, w.tuning.chargeThreshold, true);
				w.stats.refills++;
			}
			p.refillTimer = 2.5;
			mark(w, "refill");
		}
		const blocked = isStatic(w, p);
		p.inStatic = blocked;
		if (blocked) mark(w, "static");
		if (blocked && (a.fire || a.cannon)) {
			if (p.blockedTimer <= 0) {
				event(w, "static-block", p.x, p.y, { player: p.index });
				p.blockedTimer = 1.5;
				say(
					w,
					"STATIC REFUGE — pursuers cannot hurt you. Your weapons are silent.",
					2,
				);
			}
		} else {
			if (a.fire && p.fireTimer <= 0) {
				p.fireTimer = w.tuning.primaryInterval;
				w.shots.push({
					id: w.nextId++,
					kind: "primary",
					owner: p.index,
					x: p.x + p.ax * 17,
					y: wrap(p.y + p.ay * 17),
					px: p.x,
					py: p.y,
					vx: p.ax * 620,
					vy: p.ay * 620,
					r: 3,
					life: 1.8,
				});
				w.stats.shots++;
				event(w, "primary", p.x, p.y, { player: p.index });
			}
			if (a.cannon && ready(w, p)) {
				p.charge = 0;
				p.ready = false;
				w.cannons.push({
					id: w.nextId++,
					kind: "cannon",
					owner: p.index,
					x: 30,
					px: 30,
					y: p.y,
					vx: w.tuning.cannonSpeed,
					r: 7,
					warn: w.tuning.cannonWindup,
					reflected: false,
					returnWarn: 0,
					life: 4,
				});
				w.stats.cannonFired++;
				mark(w, "cannon");
				event(w, "cannon-warn", 30, p.y, { player: p.index });
				say(w, "SIEGE LOCKED — LEAVE THE LINE", 1.4);
			}
		}
	}
	function sweepCircle(x0, y0, x1, y1, target, r) {
		const vx = x1 - x0,
			vy = dy(y1, y0),
			tx = target.x - x0,
			ty = dy(target.y, y0);
		const len = vx * vx + vy * vy;
		const t = len > 0 ? clamp((tx * vx + ty * vy) / len, 0, 1) : 0;
		return Math.hypot(tx - vx * t, ty - vy * t) <= r;
	}
	function shotsStep(w, dt) {
		for (const s of w.shots) {
			if (s.life <= 0) continue;
			s.px = s.x;
			s.py = s.y;
			s.x += s.vx * dt;
			s.y = wrap(s.y + s.vy * dt);
			s.life -= dt;
			if (s.x < 0 || s.x > W) {
				s.life = 0;
				continue;
			}
			for (const c of w.cells)
				if (c.alive && cellOverlap(s.x, s.y, s.r, c)) {
					removeCell(w, c, "primary", w.players[s.owner]);
					s.life = 0;
					break;
				}
			if (
				s.life > 0 &&
				w.core.hp > 0 &&
				sweepCircle(s.px, s.py, s.x, s.y, w.core, w.core.r + s.r)
			) {
				s.life = 0;
				if (w.tick % 5 === 0) event(w, "immune", s.x, s.y, { player: s.owner });
			}
		}
		w.shots = w.shots.filter((s) => s.life > 0);
	}
	function coreHit(w, cannon) {
		const core = w.core;
		if (
			core.hp <= 0 ||
			core.hitGrace > 0 ||
			w.mode !== "play" ||
			core.state === "phase-break"
		)
			return false;
		const airborne = core.state === "flight" || core.state === "return";
		if (w.sector === 2 && core.hp === 1 && !airborne) {
			event(w, "immune", core.x, core.y, {
				player: cannon.owner,
				finalDock: true,
			});
			say(
				w,
				"THE LAST HEART MUST BE STRUCK IN FLIGHT. Touch it here to refill.",
				3.5,
			);
			return false;
		}
		core.hp--;
		w.phase++;
		core.phase = w.phase;
		w.phaseTime = 0;
		core.hitGrace = 1.6;
		w.stats.coreHits++;
		const points = addScore(w, airborne ? 3000 : 1500, "hearts", cannon.owner);
		if (airborne) {
			w.stats.airborne++;
			w.reserves = Math.min(w.reserveCap, w.reserves + 1);
			mark(w, "airborne");
			say(w, "AIRBORNE INTERCEPT — +1 REPLACEMENT SCOUT", 3.2);
		}
		event(w, "core-hit", core.x, core.y, {
			player: cannon.owner,
			airborne,
			score: points,
			hp: core.hp,
		});
		if (core.hp <= 0) {
			core.state = "defeated";
			w.stats.cleared++;
			w.reserves = Math.min(w.reserveCap, w.reserves + 1);
			w.transitionTime = 0;
			for (const p of w.players)
				if (!p.departed && !p.alive) {
					p.alive = true;
					p.respawn = 0;
					p.invuln = 2.4;
					p.x = 130;
					p.y = p.index ? 340 : 210;
					p.charge = 0;
				}
			for (const c of w.cells) c.alive = false;
			w.shots = [];
			w.hazards = [];
			addScore(w, 800, "hearts", cannon.owner);
			event(w, "sector-clear", core.x, core.y, { sector: w.sector });
			if (w.sector === 2) {
				w.mode = "victory";
				if (!w.outcomeAwarded) {
					w.outcomeAwarded = true;
					w.score += 5000;
					w.stats.ending = 5000;
					event(w, "victory", core.x, core.y);
				}
				say(w, "THE SIGNAL BREAKS. The swarm answers. We are still here.", 99);
			} else {
				w.mode = "transition";
				say(w, C.sectors[w.sector].clearLine, 99);
			}
		} else {
			core.state = "phase-break";
			core.timer = 1.5;
			core.vx = core.vy = 0;
			const n = w.sector === 2 && core.hp === 1 ? 1 : 0.33;
			for (const c of w.cells)
				if (c.alive && (n === 1 || (c.id + w.phase) % 3 === 0)) {
					c.alive = false;
					event(w, "chip", c.x, c.y, {
						material: c.material,
						phaseBreak: true,
					});
				}
			if (w.sector === 2 && core.hp === 1)
				say(
					w,
					"THE LAST HEART TAKES FLIGHT. Docked blue: touch to refill. Amber: intercept.",
					5,
				);
			else if (w.sector === 1)
				say(w, "THE MIRRORS CHANGE. Your breach is still there.", 3);
			else say(w, "THE SHELL IS GONE. Now the heart moves.", 3);
		}
		return true;
	}
	function cannonsStep(w, dt) {
		for (const c of w.cannons) {
			if (c.life <= 0) continue;
			if (c.warn > 0) {
				c.warn -= dt;
				if (c.warn <= 0) event(w, "cannon-fire", c.x, c.y, { player: c.owner });
				continue;
			}
			if (c.returnWarn > 0) {
				c.returnWarn -= dt;
				continue;
			}
			c.px = c.x;
			c.x += c.vx * dt;
			c.life -= dt;
			let hitCell = null;
			for (const cell of w.cells)
				if (cell.alive && cellOverlap(c.x, c.y, c.r, cell)) {
					if (!hitCell || (c.vx > 0 ? cell.x < hitCell.x : cell.x > hitCell.x))
						hitCell = cell;
				}
			if (hitCell) {
				removeCell(w, hitCell, "cannon", w.players[c.owner]);
				if (hitCell.material === "reflective" && !c.reflected) {
					c.reflected = true;
					c.vx = -Math.abs(c.vx);
					c.returnWarn = 0.45;
					event(w, "reflection", c.x, c.y, { player: c.owner });
					say(w, "MIRROR RETURN — THE AMBER LINE IS COMING BACK", 2.4);
					mark(w, "reflection");
				} else {
					c.life = 0;
					w.stats.cannonMissed++;
				}
			}
			if (c.life <= 0 || c.returnWarn > 0) continue;
			if (
				w.core.hp > 0 &&
				sweepCircle(c.px, c.y, c.x, c.y, w.core, c.r + w.core.r)
			) {
				coreHit(w, c);
				c.life = 0;
			}
			if (c.life > 0 && w.mode === "play") {
				for (const p of w.players)
					if (
						p.alive &&
						!p.departed &&
						sweepCircle(c.px, c.y, c.x, c.y, p, p.r + c.r)
					)
						kill(w, p, "siege");
			}
			if (c.x < -35 || c.x > W + 35) {
				c.life = 0;
				w.stats.cannonMissed++;
			}
		}
		w.cannons = w.cannons.filter((c) => c.life > 0);
	}
	function chooseTarget(w, target = 0) {
		const living = w.players.filter((p) => p.alive && !p.departed);
		return living.find((p) => p.index === target) || living[0] || null;
	}
	function beginWindup(w) {
		const core = w.core,
			target = chooseTarget(w, core.launches % w.players.length);
		core.state = "windup";
		core.timer = w.tuning.swirlTelegraph;
		core.targetX = target ? target.x : 250;
		core.targetY = target ? target.y : 270;
		const angle = Math.atan2(dy(core.targetY, core.y), core.targetX - core.x);
		core.vx = Math.cos(angle) * w.tuning.swirlSpeed;
		core.vy = Math.sin(angle) * w.tuning.swirlSpeed;
		if (core.vx > -70) {
			core.vx = -w.tuning.swirlSpeed * 0.9;
			core.vy = Math.sin(angle) * w.tuning.swirlSpeed * 0.4;
		}
		event(w, "swirl-warn", core.x, core.y, {
			targetX: core.targetX,
			targetY: core.targetY,
		});
		mark(w, "swirl");
		say(
			w,
			w.sector === 2 && core.hp === 1
				? "LAST HEART — INTERCEPT IN FLIGHT. AIRBORNE HIT: +1 SCOUT."
				: "SWIRL INBOUND — STATIC WILL NOT SAVE YOU. INTERCEPT: +1 SCOUT.",
			3.2,
		);
	}
	function coreStep(w, dt) {
		const core = w.core,
			data = contentFor(w);
		if (core.hp <= 0) return;
		core.hitGrace = Math.max(0, core.hitGrace - dt);
		core.angle +=
			dt * (core.state === "flight" ? 18 : core.state === "windup" ? 10 : 1.8);
		core.timer -= dt;
		if (core.state === "phase-break") {
			if (core.timer <= 0) {
				core.state = "dock";
				core.x = core.dockX;
				core.y = core.dockY;
				core.timer = w.sector === 2 && core.hp === 1 ? 7 : 9;
				event(w, "dock", core.x, core.y);
			}
		} else if (core.state === "dock") {
			core.x = core.dockX;
			core.y = wrap(
				core.dockY +
					(w.sector === 2 && core.hp === 2
						? Math.sin(w.sectorTime * 0.65) * 55
						: 0),
			);
			if (core.timer <= 0) beginWindup(w);
			if (w.sector === 2 && core.hp === 2) {
				core.needleTimer -= dt;
				if (core.needleTimer <= 0) {
					core.needleTimer = 3.1;
					const target = chooseTarget(w),
						angle = target
							? Math.atan2(dy(target.y, core.y), target.x - core.x)
							: Math.PI;
					for (let i = -1; i <= 1; i++) {
						const a = angle + i * 0.24;
						w.hazards.push({
							id: w.nextId++,
							kind: "needle",
							x: core.x,
							y: core.y,
							vx: Math.cos(a) * 135,
							vy: Math.sin(a) * 135,
							angle: a,
							r: 5,
							life: 7,
							target: -1,
							age: 0,
						});
					}
					event(w, "needles", core.x, core.y);
				}
			}
		} else if (core.state === "windup") {
			if (core.timer <= 0) {
				core.state = "flight";
				core.timer = 3.0;
				core.flightTime = 0;
				core.launches++;
				event(w, "swirl-launch", core.x, core.y);
			}
		} else if (core.state === "flight") {
			core.x += core.vx * dt;
			core.y = wrap(core.y + core.vy * dt);
			core.flightTime += dt;
			if (core.timer <= 0 || core.x < 75) {
				core.state = "return";
				core.timer = 4;
				event(w, "swirl-return", core.x, core.y);
			}
		} else if (core.state === "return") {
			const dx = core.dockX - core.x,
				ddy = dy(core.dockY, core.y),
				len = Math.hypot(dx, ddy),
				speed = Math.max(260, w.tuning.swirlSpeed * 1.15);
			if (len <= speed * dt + 3 || core.timer <= 0) {
				core.x = core.dockX;
				core.y = core.dockY;
				core.state = "dock";
				core.timer =
					w.sector === 2 && core.hp === 1 ? 7 : data.swirlPeriod || 16;
				event(w, "dock", core.x, core.y);
				if (w.sector === 2 && core.hp === 1)
					say(w, "HEART DOCKED — touch the blue core for a fresh charge.", 4);
			} else {
				core.x += (dx / len) * speed * dt;
				core.y = wrap(core.y + (ddy / len) * speed * dt);
			}
		}
		if (core.state === "flight" || core.state === "return") {
			for (const p of w.players)
				if (p.alive && !p.departed && dist(p, core) < p.r + core.r - 5)
					kill(w, p, "swirl");
		}
	}
	function hazardsStep(w, dt) {
		for (const h of w.hazards) {
			h.age += dt;
			h.life -= dt;
			const ox = h.x,
				oy = h.y;
			if (h.kind === "pursuer") {
				const target = chooseTarget(w, h.target);
				let desired = h.angle;
				if (target) {
					h.target = target.index;
					if (isStatic(w, target)) {
						const side = h.variant ? 1 : -1,
							orbitX =
								w.refuge.x +
								w.refuge.w / 2 +
								Math.cos(h.age * 0.85 + h.id) * (w.refuge.w / 2 + 30);
						const orbitY = wrap(
							target.y + Math.sin(h.age * 0.85 + h.id) * 100 * side,
						);
						desired = Math.atan2(dy(orbitY, h.y), orbitX - h.x);
					} else desired = Math.atan2(dy(target.y, h.y), target.x - h.x);
				}
				h.angle = turn(h.angle, desired, w.tuning.pursuerTurn * dt);
				const speed =
					w.tuning.pursuerSpeed *
					(h.variant ? 1.12 : 1) *
					(w.sector === 2 ? 1.08 : 1);
				h.vx = Math.cos(h.angle) * speed;
				h.vy = Math.sin(h.angle) * speed;
			}
			h.x += h.vx * dt;
			h.y = wrap(h.y + h.vy * dt);
			if (h.kind === "pursuer") {
				if (h.x < 20 || h.x > 940) {
					h.x = clamp(h.x, 20, 940);
					h.angle = Math.PI - h.angle;
				}
			} else if (h.x < -25 || h.x > 985) h.life = 0;
			for (const p of w.players) {
				if (!p.alive || p.departed || isStatic(w, p)) continue;
				if (sweepCircle(ox, oy, h.x, h.y, p, p.r + h.r)) kill(w, p, h.kind);
			}
		}
		w.hazards = w.hazards.filter((h) => h.life > 0);
	}
	function refugeStep(w, dt) {
		const r = w.refuge;
		if (w.sector !== 2) return;
		r.cycle += dt;
		const period = 23,
			warning = 3.2,
			start = period - warning;
		if (r.active && !r.warning && r.cycle >= start) {
			r.warning = true;
			event(w, "refuge-warning", r.x + r.w / 2, 270);
			say(
				w,
				"THE REFUGE IS FRACTURING — MOVE BEFORE THE BORDERS TURN RED",
				3.2,
			);
		}
		if (r.active && r.cycle >= period) {
			r.active = false;
			r.warning = false;
			r.outageTimer = w.tuning.refugeOutage;
			event(w, "refuge-outage", r.x + r.w / 2, 270);
		}
		if (!r.active) {
			r.outageTimer -= dt;
			if (r.outageTimer <= 0) {
				r.active = true;
				r.cycle = 0;
				event(w, "refuge-return", r.x + r.w / 2, 270);
			}
		}
	}
	function tutorialStep(w) {
		if (w.sector !== 0) return;
		const learned = w.learned;
		const target =
			learned.cannon || learned.airborne
				? 4
				: learned.charge
					? 3
					: learned.bite
						? 2
						: learned.move && learned.shoot
							? 1
							: 0;
		w.tutorial = Math.max(w.tutorial, target);
	}
	function applyTuning(w) {
		for (const [k, value] of Object.entries(w.pendingTuning)) {
			w.tuning[k] = value;
			if (k === "reserveCount") w.reserves = value;
			if (k === "chargeThreshold")
				for (const p of w.players) {
					p.charge = Math.min(p.charge, value);
					p.ready = ready(w, p);
				}
			if (k === "biteInterval")
				for (const p of w.players) p.biteTimer = Math.min(p.biteTimer, value);
			if (k === "primaryInterval")
				for (const p of w.players) p.fireTimer = Math.min(p.fireTimer, value);
		}
		w.pendingTuning = {};
	}
	function step(w, actions = [], dt = DT) {
		if (!w || w.mode === "defeat") return w;
		dt = clamp(finite(dt, DT), 0, 0.05);
		if (!dt) return w;
		w.events = [];
		applyTuning(w);
		w.tick++;
		w.time += dt;
		w.messageTime = Math.max(0, w.messageTime - dt);
		if (w.mode !== "play") {
			w.transitionTime += dt;
			return w;
		}
		w.sectorTime += dt;
		w.phaseTime += dt;
		w.chainTime = Math.max(0, w.chainTime - dt);
		if (w.chainTime <= 0) w.chain = approach(w.chain, 1, dt * 0.5);
		updatePlates(w);
		refugeStep(w, dt);
		for (let i = 0; i < w.players.length; i++)
			playerStep(w, w.players[i], actions[i], dt);
		shotsStep(w, dt);
		coreStep(w, dt);
		hazardsStep(w, dt);
		cannonsStep(w, dt);
		tutorialStep(w);
		if (
			w.mode === "play" &&
			!w.players.some((p) => !p.departed && (p.alive || p.respawn > 0))
		) {
			w.mode = "defeat";
			event(w, "defeat", 480, 270);
			say(w, "The signal has taken this flight. Another swarm will rise.", 99);
		}
		return w;
	}
	function nextSector(w) {
		if (w.mode !== "transition" || w.sector >= 2) return false;
		initSector(w, w.sector + 1);
		return true;
	}
	function tune(w, key, value) {
		const r = C.ranges[key];
		if (!r || !Number.isFinite(Number(value))) return false;
		let v = clamp(Number(value), r.min, r.max);
		if (r.step >= 1) v = Math.round(v);
		w.pendingTuning[key] = v;
		w.practice = true;
		return true;
	}
	function command(w, name, value) {
		if (name === "join") {
			if (w.players.length >= 2 || w.mode !== "play") return false;
			const p = makePlayer(1, 2);
			w.players.push(p);
			w.reserves = Math.min(w.reserveCap, w.reserves + 1);
			safeSpawn(w, p);
			event(w, "join", p.x, p.y, { player: p.index });
			return true;
		}
		if (name === "leave") {
			const p = w.players[Number(value)];
			if (!p || p.departed) return false;
			p.departed = true;
			p.alive = false;
			p.respawn = 0;
			p.charge = 0;
			p.vx = p.vy = 0;
			return true;
		}
		w.practice = true;
		if (
			name === "invulnerable" ||
			name === "infiniteCharge" ||
			name === "collisions"
		) {
			w.dev[name] = !!value;
			return true;
		}
		if (name === "spawnThreat") {
			spawnPursuer(w, w.hazards.filter((h) => h.kind === "pursuer").length % 2);
			return true;
		}
		if (name === "sector") {
			initSector(w, finite(value));
			return true;
		}
		if (name === "phase") {
			const phase = clamp(Math.round(finite(value)), 0, w.core.maxHp - 1);
			w.core.hp = w.core.maxHp - phase;
			w.core.phase = w.phase = phase;
			w.core.state = "dock";
			w.core.timer = 7;
			w.core.x = w.core.dockX;
			w.core.y = w.core.dockY;
			w.core.hitGrace = 0;
			if (w.sector === 2 && w.core.hp === 1)
				for (const c of w.cells) c.alive = false;
			w.shots = [];
			w.cannons = [];
			return true;
		}
		if (name === "restart") {
			initSector(w, w.sector, w.customContent);
			return true;
		}
		if (name === "seed") {
			w.seed = finite(value, 1982) >>> 0 || 1982;
			w.rngCombat = w.seed;
			initSector(w, w.sector, w.customContent);
			return true;
		}
		if (name === "reserve") {
			w.reserves = clamp(Math.round(finite(value)), 0, 8);
			return true;
		}
		if (name === "resetTuning") {
			w.tuning = {
				...C.defaults,
				...(w.assist
					? {
							swirlTelegraph: 1.9,
							pursuerSpeed: 38,
							reserveCount: 6,
							cannonWindup: 0.4,
						}
					: {}),
			};
			w.pendingTuning = {};
			return true;
		}
		if (name === "content") {
			const v = validateContent(value);
			if (!v.ok) return false;
			initSector(w, w.sector, v.content);
			return true;
		}
		return false;
	}
	function snapshot(w) {
		return {
			title: "Yars of Ruin",
			tick: w.tick,
			time: +w.time.toFixed(3),
			seed: w.seed,
			mode: w.mode,
			sector: w.sector,
			sectorName: C.sectors[w.sector].name,
			phase: w.phase,
			core: copy(w.core),
			players: copy(w.players),
			reserves: w.reserves,
			score: w.score,
			chain: w.chain,
			cellsAlive: w.cells.filter((c) => c.alive).length,
			cellCount: w.cells.length,
			shieldMask: w.cells.map((c) => (c.alive ? "1" : "0")).join(""),
			plates: copy(w.plates),
			refuge: copy(w.refuge),
			cannons: copy(w.cannons),
			shots: copy(w.shots),
			hazards: copy(w.hazards),
			stats: copy(w.stats),
			tuning: copy(w.tuning),
			practice: w.practice,
			assist: w.assist,
			attract: w.attract,
			tutorial: w.tutorial,
			learned: copy(w.learned),
			message: w.message,
			errors: copy(w.errors),
		};
	}
	function validateContent(data) {
		const errors = [];
		if (!data || typeof data !== "object" || Array.isArray(data))
			return {
				ok: false,
				errors: ["Encounter must be a JSON object."],
				content: null,
			};
		if (data.version !== 1) errors.push("Encounter version must be 1.");
		const name = typeof data.name === "string" ? data.name.slice(0, 60) : "";
		if (!name.trim()) errors.push("A name is required.");
		const refuge = data.refuge || {};
		if (
			!Number.isFinite(refuge.x) ||
			!Number.isFinite(refuge.w) ||
			refuge.x < 70 ||
			refuge.w < 45 ||
			refuge.w > 220 ||
			refuge.x + refuge.w > 610
		)
			errors.push("Refuge x/w must fit between 70 and 610; width 45–220.");
		const core = data.core || {};
		if (
			!Number.isFinite(core.x) ||
			!Number.isFinite(core.y) ||
			core.x < 630 ||
			core.x > 910 ||
			core.y < 40 ||
			core.y > 500 ||
			!Number.isInteger(core.hp) ||
			core.hp < 1 ||
			core.hp > 3
		)
			errors.push("Core needs x 630–910, y 40–500 and integer hp 1–3.");
		if (
			!Array.isArray(data.plates) ||
			data.plates.length < 1 ||
			data.plates.length > 4
		)
			errors.push("One to four shield plates are required.");
		const plates = [];
		if (Array.isArray(data.plates))
			data.plates.slice(0, 4).forEach((p, i) => {
				if (
					!p ||
					!Number.isInteger(p.id) ||
					plates.some((q) => q.id === p.id) ||
					!Number.isFinite(p.amplitude) ||
					p.amplitude < 0 ||
					p.amplitude > 90 ||
					!Number.isFinite(p.period) ||
					p.period < 3 ||
					p.period > 40 ||
					!Number.isFinite(p.phase || 0)
				)
					errors.push(
						"Plate " + (i + 1) + " has invalid id, motion amplitude or period.",
					);
				else
					plates.push({
						id: p.id,
						x: finite(p.x),
						y: finite(p.y),
						amplitude: p.amplitude,
						period: p.period,
						phase: p.phase || 0,
					});
			});
		if (!Array.isArray(data.cells) || data.cells.length > 600)
			errors.push("Cells must be an array with at most 600 entries.");
		const cells = [],
			seen = new Set();
		if (Array.isArray(data.cells))
			data.cells.slice(0, 600).forEach((c, i) => {
				if (
					!c ||
					!Number.isFinite(c.x) ||
					!Number.isFinite(c.y) ||
					c.x < 500 ||
					c.x > 930 ||
					c.y < 20 ||
					c.y > 520 ||
					!plates.some((p) => p.id === c.plate) ||
					!["normal", "reflective"].includes(c.material)
				)
					errors.push(
						"Cell " + (i + 1) + " has invalid coordinates, plate or material.",
					);
				else {
					const key = c.x + "," + c.y + "," + c.plate;
					if (seen.has(key))
						errors.push("Duplicate cell at " + c.x + ", " + c.y + ".");
					else {
						seen.add(key);
						cells.push({
							x: c.x,
							y: c.y,
							plate: c.plate,
							material: c.material,
						});
					}
				}
			});
		const result = {
			version: 1,
			name,
			refuge: { x: refuge.x, w: refuge.w },
			core: { x: core.x, y: core.y, hp: core.hp },
			plates,
			cells,
			introduction:
				typeof data.introduction === "string"
					? data.introduction.slice(0, 160)
					: "A new shell. The same stubborn wings.",
			hp: core.hp,
			pursuers: clamp(Math.round(finite(data.pursuers, 1)), 1, 3),
			swirlDelay: clamp(finite(data.swirlDelay, 14), 5, 30),
			swirlPeriod: clamp(finite(data.swirlPeriod, 16), 7, 35),
		};
		return {
			ok: errors.length === 0,
			errors,
			content: errors.length ? null : result,
		};
	}
	function exportContent(w) {
		const data = contentFor(w);
		return {
			version: 1,
			name: data.name || "CUSTOM ENCOUNTER",
			refuge: { x: w.refuge.x, w: w.refuge.w },
			core: { x: w.core.dockX, y: w.core.dockY, hp: w.core.maxHp },
			plates: w.plates.map(({ id, x, y, amplitude, period, phase }) => ({
				id,
				x,
				y,
				amplitude,
				period,
				phase,
			})),
			cells: w.cells.map((c) => ({
				x: c.baseX,
				y: c.baseY,
				plate: c.plate,
				material: c.material,
			})),
			pursuers: data.pursuers || 1,
			swirlDelay: data.swirlDelay || 14,
			swirlPeriod: data.swirlPeriod || 16,
		};
	}
	function pilot(w, index = 0, options = {}) {
		/* This controller emits the exact same ordinary actions as a player. No simulation writes. */
		const p = w.players[index];
		if (!p || !p.alive || p.departed || w.mode !== "play")
			return { mx: 0, my: 0, ax: 1, ay: 0, fire: false, cannon: false };
		const core = w.core,
			speed = w.tuning.scoutSpeed;
		let tx = p.x,
			ty = p.y,
			ax = 1,
			ay = 0,
			fire = true,
			cannon = false;
		const final = w.sector === 2 && core.hp === 1;
		const cannonOwn = w.cannons.find(
			(c) => c.owner === index && !c.reflected && c.life > 0,
		);
		const go = (x, y) => {
			tx = x;
			ty = wrap(y);
		};
		const aimAt = (x, y) => {
			const dx = x - p.x,
				ddy = dy(y, p.y),
				len = Math.hypot(dx, ddy) || 1;
			ax = dx / len;
			ay = ddy / len;
		};
		if (cannonOwn) {
			// A real scout must leave its locked lane. Stay well clear until the projectile is spent.
			go(
				p.x > 760 ? 875 : 585,
				cannonOwn.y + (dy(p.y, cannonOwn.y) < -1 ? -68 : 68),
			);
			aimAt(core.x, core.y);
		} else if (core.state === "phase-break") {
			go(570, 390);
			aimAt(core.dockX, core.dockY);
		} else if (!ready(w, p)) {
			// Start by biting a center corridor. Once the shell there is open, brush the docked heart.
			if (core.state === "dock") {
				go(core.x - 9, core.y);
				const nearCell = w.cells
					.filter(
						(c) => c.alive && Math.abs(dy(c.y, core.y)) < 28 && c.x > p.x - 25,
					)
					.sort((a, b) => a.x - b.x)[0];
				if (nearCell && p.x < core.x - 40) {
					go(nearCell.x, nearCell.y);
					fire = false;
				}
				aimAt(core.x, core.y);
			} else {
				go(570, 420);
				aimAt(core.x, core.y);
			}
		} else if (final) {
			if (core.state === "dock") {
				// The final heart is immune while docked. Wait outside the committed route and preserve charge.
				go(570, core.dockY + 95);
				aimAt(core.x, core.y);
			} else if (core.state === "windup") {
				const futureTime =
					Math.max(0, core.timer) +
					(core.x - 30) / (w.tuning.cannonSpeed - core.vx) +
					w.tuning.cannonWindup;
				const futureY = wrap(
					core.y + core.vy * Math.max(0, futureTime - core.timer),
				);
				go(570, futureY);
				aimAt(core.x, core.y);
				if (Math.abs(dy(p.y, futureY)) < 4 && core.timer < 0.12) cannon = true;
			} else if (core.state === "flight") {
				const hitTime =
					(core.x - 30 - core.vx * w.tuning.cannonWindup) /
						(w.tuning.cannonSpeed - core.vx) +
					w.tuning.cannonWindup;
				const targetY = wrap(core.y + core.vy * Math.max(0, hitTime));
				go(570, targetY);
				aimAt(core.x, core.y);
				if (Math.abs(dy(p.y, targetY)) < 5 && core.x > 210) cannon = true;
			} else {
				go(570, 410);
				aimAt(core.x, core.y);
			}
		} else if (core.state === "dock") {
			// Carve a horizontal lane with ordinary fire. Bite nearby cells first, then fire from the right flank.
			const travel =
				w.tuning.cannonWindup + (core.x - 30) / w.tuning.cannonSpeed;
			const targetY =
				w.sector === 2 && core.hp === 2
					? wrap(core.dockY + Math.sin((w.sectorTime + travel) * 0.65) * 55)
					: core.y;
			const obstruction = w.cells
				.filter(
					(c) =>
						c.alive && Math.abs(dy(c.y, targetY)) < 19 && c.x < core.x - 30,
				)
				.sort((a, b) => a.x - b.x)[0];
			if (obstruction) {
				go(obstruction.x - 16, obstruction.y);
				aimAt(obstruction.x, obstruction.y);
				fire = true;
			} else {
				go(585, targetY);
				aimAt(core.x, core.y);
				if (
					Math.abs(dy(p.y, targetY)) < 4 &&
					Math.abs(p.vy) < 65 &&
					core.timer > travel + 0.1
				)
					cannon = true;
			}
		} else if (core.state === "windup" || core.state === "flight") {
			const time =
				w.tuning.cannonWindup +
				Math.max(
					0,
					(core.x - 30 - core.vx * w.tuning.cannonWindup) /
						(w.tuning.cannonSpeed - core.vx),
				);
			const targetY = wrap(
				core.y +
					core.vy *
						Math.max(0, time - (core.state === "windup" ? core.timer : 0)),
			);
			go(570, targetY);
			aimAt(core.x, core.y);
			const clear = !w.cells.some(
				(c) => c.alive && c.x < core.x && Math.abs(dy(c.y, targetY)) < 18,
			);
			if (
				clear &&
				Math.abs(dy(p.y, targetY)) < 4 &&
				core.state === "flight" &&
				core.x > 210
			)
				cannon = true;
		} else {
			go(570, 410);
			aimAt(core.x, core.y);
		}
		// Physical danger avoidance: dodge pursuit and the transformed heart, never merely stand in fire.
		const danger = w.hazards
			.filter((h) => h.life > 0 && !isStatic(w, p))
			.map((h) => ({ h, d: dist(p, h) }))
			.sort((a, b) => a.d - b.d)[0];
		if (danger && danger.d < 90 && !cannon) {
			const awayY = dy(p.y, danger.h.y),
				awayX = p.x - danger.h.x;
			if (Math.abs(awayY) > 8) ty = wrap(p.y + Math.sign(awayY) * 100);
			else ty = wrap(p.y + (danger.h.vy >= 0 ? -110 : 110));
			if (Math.abs(awayX) > 15)
				tx = clamp(p.x + Math.sign(awayX) * 100, 80, 900);
		}
		if (
			(core.state === "flight" || core.state === "return") &&
			dist(p, core) < 120 &&
			!cannon
		) {
			ty = wrap(p.y + (dy(p.y, core.y) >= 0 ? 120 : -120));
			tx = clamp(p.x + (p.x >= core.x ? 60 : -60), 80, 900);
		}
		// In the showcase the pilot tries its primary while crossing static so the silent refuge is demonstrated.
		if (options.attract && isStatic(w, p)) fire = true;
		let mx = clamp((tx - p.x) / Math.max(8, speed * 0.1), -1, 1),
			my = clamp(dy(ty, p.y) / Math.max(8, speed * 0.1), -1, 1);
		if (Math.abs(tx - p.x) < 1) mx = 0;
		if (Math.abs(dy(ty, p.y)) < 1) my = 0;
		return { mx, my, ax, ay, fire, cannon };
	}
	globalThis.RuinSim = {
		W,
		H,
		DT,
		create,
		step,
		snapshot,
		nextSector,
		tune,
		command,
		pilot,
		validateContent,
		exportContent,
		cellPosition: (_w, c) => ({ x: c.x, y: c.y }),
		isStatic,
		wrappedDy: dy,
		wrap,
		distance: dist,
	};
})();
