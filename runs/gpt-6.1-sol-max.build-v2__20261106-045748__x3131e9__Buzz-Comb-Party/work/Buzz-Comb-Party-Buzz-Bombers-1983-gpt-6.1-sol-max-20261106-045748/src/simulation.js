(function (B) {
	"use strict";
	const A = B.ARENA,
		clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
		copy = (o) => JSON.parse(JSON.stringify(o));
	B.seeded = function (seed) {
		let a = seed >>> 0;
		return () => {
			a = (a + 0x6d2b79f5) >>> 0;
			let t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	};
	const entity = (w, o) => Object.assign({ id: w.nextId++ }, o);
	function event(w, kind, x = 320, y = 180, data = {}) {
		w.events.push({ id: ++w.eventId, tick: w.tick, kind, x, y, ...data });
		if (w.events.length > 36) w.events.shift();
	}
	B.emit = event;
	function claim(w, key, points, x, y, seat = 0) {
		if (w.claimed[key]) return false;
		w.claimed[key] = true;
		w.score += points;
		if (seat && w.stats.seats[seat]) w.stats.seats[seat].points += points;
		if (points) event(w, "score", x, y, { points });
		return true;
	}
	function stockAwards(w) {
		for (let n = w.bonusIndex; n < 256; n++) {
			const threshold =
				(n === 0 ? 20000 : n === 1 ? 40000 : (n - 1) * 80000) *
				w.tuning.bonusScale;
			if (w.score < threshold) break;
			w.bonusIndex = n + 1;
			w.reserves++;
			w.stats.earned++;
			event(w, "stock", 320, 310, { threshold });
		}
	}
	B.addScore = claim;
	B.createRun = function ({
		seed = 94721,
		seats = [1],
		rng = null,
		content = B.CONTENT,
		tuning = B.defaults(),
		demo = false,
	} = {}) {
		const w = {
			version: 1,
			seed: seed >>> 0,
			rng: rng || B.seeded(seed),
			content: B.validateContent(content),
			tuning: B.validateTuning(tuning),
			tick: 0,
			time: 0,
			nextId: 10,
			eventId: 0,
			events: [],
			status: "intro",
			stage: 0,
			stageTime: 0,
			phaseTime: 0,
			players: seats.map((seat, i) => ({
				id: seat,
				seat,
				x: seats.length === 1 ? 320 : 260 + i * 120,
				y: A.rail,
				vx: 0,
				ammo: tuning.capacity || 56,
				cool: 0,
				swap: 0,
				grace: 0,
				hop: 0,
				recoil: 0,
				callSeen: 0,
			})),
			actions: {},
			score: 0,
			reserves: seats.length === 1 ? 2 : 3,
			bonusIndex: 0,
			claimed: {},
			demo,
			assisted: false,
			dev: {
				god: false,
				unlimited: false,
				freeze: false,
				slow: 1,
				overlay: false,
			},
			stats: {
				shots: 0,
				hits: 0,
				feeds: 0,
				redFeeds: 0,
				hives: 0,
				banked: 0,
				cleared: 0,
				escapes: 0,
				retries: 0,
				swaps: 0,
				spent: 0,
				earned: 0,
				shieldBreaks: 0,
				seats: Object.fromEntries(
					seats.map((s) => [s, { hits: 0, feeds: 0, points: 0 }]),
				),
			},
			coverage: {},
			result: null,
		};
		B.enterEncounter(w, 0);
		return w;
	};
	B.enterEncounter = function (w, index) {
		w.stage = clamp(index, 0, w.content.length - 1);
		const e = w.content[w.stage];
		w.stageTime = 0;
		w.phaseTime = 2.8;
		w.status = "intro";
		w.bees = [];
		w.pulses = [];
		w.obstacles = [];
		w.flowers = copy(e.flowers);
		w.growth = [];
		w.pending = e.entries.map((a) => ({
			...a,
			at: a.at * w.tuning.spawnInterval,
			reward: e.id + ":" + a.id,
		}));
		if (w.players.length > 1)
			for (let i = 0; i < 6; i++)
				w.pending.push({
					id: "duet" + i,
					at: (12 + i * 13) * w.tuning.spawnInterval,
					kind: i % 2 ? "fast" : "worker",
					x: i % 2 ? 600 : 40,
					dir: i % 2 ? -1 : 1,
					tier: 1,
					reward: e.id + ":duet" + i,
				});
		w.pending.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
		w.scheduledGrowth = (e.growth || []).map((g) => ({ ...g }));
		w.bird = {
			id: 3,
			x: 565,
			y: 138,
			state: "idle",
			target: 0,
			timer: 2.2,
			irritation: 0,
			call: 0,
			mark: 0,
			caller: 0,
		};
		w.boss = e.boss
			? {
					id: 4,
					x: 320,
					y: 93,
					phase: 0,
					phases: e.boss.phases,
					hp: e.boss.hp,
					maxHp: e.boss.hp,
					open: 0,
					supply: 5,
					serial: 0,
					done: false,
					hit: 0,
				}
			: null;
		for (const p of w.players) {
			p.x = w.players.length === 1 ? 320 : 250 + (p.seat - 1) * 140;
			p.vx = 0;
			p.ammo = w.tuning.capacity;
			p.cool = 0.3;
			p.swap = 0;
			p.grace = 0;
			p.hop = 0;
			p.recoil = 0;
		}
		for (const c of e.combs)
			B.placeComb(w, c.x, c.tier, c.red, e.id + ":" + c.id);
		w.actions = {};
		w.coverage["encounter" + (index + 1)] = true;
		event(w, "encounter", 320, 175, { stage: w.stage, name: e.name });
		relocate(w, B.groundIntervals(w));
	};
	B.applyAction = function (w, seat, a) {
		if (!w.players.some((p) => p.seat === seat) || !a || typeof a !== "object")
			return false;
		const call =
			Number.isSafeInteger(a.call) && a.call >= 0
				? Math.min(a.call, 100000000)
				: 0;
		w.actions[seat] = {
			move: Number.isFinite(a.move) ? clamp(a.move, -1, 1) : 0,
			aim: Number.isFinite(a.aim) ? clamp(a.aim, A.left, A.right) : null,
			fire: a.fire === true,
			call,
		};
		return true;
	};
	B.clearActions = (w) => {
		w.actions = {};
	};
	B.finish = function (w, won, reason) {
		if (w.result) return;
		w.status = won ? "win" : "loss";
		w.phaseTime = 0;
		w.pulses = [];
		w.actions = {};
		w.result = {
			won,
			reason,
			score: w.score,
			time: w.time,
			stage: w.stage + 1,
			assisted: w.assisted || w.demo,
			...copy(w.stats),
		};
		event(w, won ? "win" : "loss", 320, 180, { reason });
	};
	B.groundIntervals = function (w) {
		const intervals = w.flowers
			.map(([a, b]) => [
				Math.max(A.left, a - A.canR - 2),
				Math.min(A.right, b + A.canR + 2),
			])
			.filter((f) => f[1] > f[0])
			.sort((a, b) => a[0] - b[0]);
		const out = [];
		let x = A.left;
		for (const [a, b] of intervals) {
			if (a > x) out.push([x, a]);
			x = Math.max(x, b);
		}
		if (x < A.right) out.push([x, A.right]);
		return out.filter(([a, b]) => b - a >= 1);
	};
	function relocate(w, old) {
		const legal = B.groundIntervals(w);
		if (!legal.length) return false;
		for (const p of w.players) {
			if (legal.some(([a, b]) => p.x >= a && p.x <= b)) continue;
			const previous = old.find(([a, b]) => p.x >= a && p.x <= b);
			const ranked = legal
				.map(([a, b]) => ({
					x: clamp(p.x, a, b),
					same: previous && a <= previous[1] && b >= previous[0],
				}))
				.sort(
					(a, b) =>
						(b.same ? 1 : 0) - (a.same ? 1 : 0) ||
						Math.abs(a.x - p.x) - Math.abs(b.x - p.x) ||
						a.x - b.x,
				);
			p.hopFrom = p.x;
			p.x = ranked[0].x;
			p.hop = 0.75;
			p.vx = 0;
			event(w, "hop", p.x, p.y, { seat: p.seat, from: p.hopFrom });
			w.coverage.relocation = true;
		}
		return true;
	}
	B.queueGrowth = function (w, x0, x1, delay = w.tuning.flowerGrowth) {
		w.growth.push(
			entity(w, {
				x0: clamp(x0, 0, 640),
				x1: clamp(x1, 0, 640),
				timer: delay,
				total: delay,
			}),
		);
		event(w, "warning", (x0 + x1) / 2, 296);
		w.coverage.pollination = true;
	};
	function enclosure(w) {
		if (w.dev.god || w.demo) {
			w.flowers = copy(w.content[w.stage].flowers);
			w.growth = [];
			relocate(w, []);
			return;
		}
		if (w.reserves > 0) {
			w.reserves--;
			w.stats.spent++;
			w.stats.retries++;
			B.enterEncounter(w, w.stage);
			event(w, "retry", 320, 180);
		} else B.finish(w, false, "The flowers took the last parking space.");
	}
	B.placeComb = function (w, x, tier, red, reward, kind = "comb") {
		const step = 24;
		let cell = clamp(Math.round((x - 32) / step), 0, 24),
			chosen = null;
		search: for (let k = 0; k <= 24; k++)
			for (const sign of k ? [1, -1] : [1]) {
				const c = cell + k * sign;
				if (c < 0 || c > 24) continue;
				const cx = 32 + c * step;
				if (
					!w.obstacles.some((o) => o.tier === tier && Math.abs(o.x - cx) < 22)
				) {
					chosen = cx;
					break search;
				}
				if (chosen !== null) break;
			}
		if (chosen === null) {
			claim(w, reward + ":merge", 50, x, A.tiers[tier]);
			event(w, "merge", x, A.tiers[tier]);
			return null;
		}
		const o = entity(w, {
			kind,
			x: chosen,
			y: A.tiers[tier],
			tier,
			red: !!red,
			reward,
			marked: 0,
		});
		w.obstacles.push(o);
		return o;
	};
	B.spawnBee = function (w, data) {
		const e = w.content[w.stage],
			b = entity(w, {
				kind: data.kind || "worker",
				x: data.x ?? 40,
				tier: data.tier ?? 0,
				dir: data.dir ?? 1,
				y: A.tiers[data.tier ?? 0],
				reward: data.reward || e.id + ":dev" + w.nextId,
				state: "sweep",
				bank: 0,
				trap: 0,
				trapReason: "",
				age: 0,
				travel: 0,
			});
		w.bees.push(b);
		event(w, "entry", b.x, b.y, { fast: b.kind === "fast" });
		return b;
	};
	function pocket(w, b) {
		let left = A.left,
			right = A.right;
		const nearby = w.obstacles.filter((o) => o.tier === b.tier);
		for (const o of nearby) {
			if (o.x < b.x) left = Math.max(left, o.x + 19);
			else right = Math.min(right, o.x - 19);
		}
		return { left, right, width: right - left };
	}
	function bees(w, dt) {
		const e = w.content[w.stage];
		for (const b of w.bees) {
			if (b.dead) continue;
			b.age += dt;
			b.bank = Math.max(0, b.bank - dt);
			if (b.state === "landing") {
				b.timer -= dt;
				b.y += 45 * dt;
				if (b.timer <= 0) {
					b.dead = true;
					w.stats.escapes++;
					let x0, x1;
					if (w.stage >= 3 && w.stats.escapes % 4 === 0) {
						x0 = clamp(b.x - 24, 80, 510);
						x1 = x0 + 48;
					} else if (w.stats.escapes % 2) {
						x0 = Math.max(
							0,
							...w.flowers.filter((f) => f[0] < 160).map((f) => f[1]),
						);
						x1 = Math.min(x0 + 42, 640);
					} else {
						x1 = Math.min(
							640,
							...w.flowers.filter((f) => f[1] > 480).map((f) => f[0]),
						);
						x0 = Math.max(0, x1 - 42);
					}
					B.queueGrowth(w, x0, x1);
				}
				continue;
			}
			if (b.kind === "worker") {
				const q = pocket(w, b);
				if (q.width < 35 && q.width >= 0 && b.age > 0.15) {
					b.trap += dt;
					b.trapReason = "pocket " + Math.round(q.width) + "px; needs 35px";
					b.state = "build";
					b.x = clamp(b.x, q.left + 1, q.right - 1);
					b.y = A.tiers[b.tier];
					if (b.trap >= w.tuning.trapDelay) {
						b.dead = true;
						const o = B.placeComb(w, b.x, b.tier, false, b.reward, "hive");
						if (o) {
							w.stats.hives++;
							w.coverage.hive = true;
							event(w, "hive", o.x, o.y);
						}
					}
					continue;
				}
				b.trap = 0;
				b.trapReason = "open corridor " + Math.round(q.width) + "px";
				b.state = "sweep";
			}
			const speed =
					w.tuning.beeSpeed *
					e.speed *
					(b.kind === "fast" ? w.tuning.fastMultiplier : 1),
				nx = b.x + b.dir * speed * dt;
			let hit = nx < A.left || nx > A.right,
				edge = clamp(nx, A.left, A.right);
			if (b.kind === "worker" && b.bank <= 0)
				for (const o of w.obstacles)
					if (
						o.tier === b.tier &&
						Math.abs(o.x - nx) < 20 &&
						((b.dir > 0 && b.x <= o.x) || (b.dir < 0 && b.x >= o.x))
					) {
						hit = true;
						edge = o.x - b.dir * 20.2;
						break;
					}
			b.travel += Math.abs(nx - b.x);
			if (hit) {
				b.x = clamp(edge, A.left, A.right);
				b.dir *= -1;
				b.tier++;
				b.bank = 0.3;
				if (b.kind === "worker") w.coverage.workerRoute = true;
				if (b.tier >= A.tiers.length) {
					b.tier = A.tiers.length - 1;
					b.state = "landing";
					b.timer = 0.65;
					event(w, "landing", b.x, 294);
				} else b.y = A.tiers[b.tier];
			} else b.x = nx;
		}
		w.bees = w.bees.filter((b) => !b.dead);
	}
	function feedValue(o) {
		return (o.tier < 2 ? 1000 : o.tier < 5 ? 800 : 500) + (o.red ? 1000 : 0);
	}
	B.feedValue = feedValue;
	B.callBird = function (w, p) {
		const bird = w.bird;
		if (bird.call > 0 || bird.state === "retreat") return false;
		const a = w.actions[p.seat] || {},
			x = a.aim ?? p.x;
		const eligible = w.obstacles
			.filter((o) => o.kind === "comb")
			.sort(
				(a, b) =>
					Math.abs(a.x - x) - Math.abs(b.x - x) ||
					feedValue(b) - feedValue(a) ||
					Math.hypot(a.x - bird.x, a.y - bird.y) -
						Math.hypot(b.x - bird.x, b.y - bird.y) ||
					a.id - b.id,
			);
		if (!eligible.length) {
			event(w, "invalidCall", p.x, 290);
			return false;
		}
		bird.target = eligible[0].id;
		bird.caller = p.seat;
		bird.state = "flight";
		bird.timer = 0;
		bird.call = w.tuning.callCooldown;
		bird.mark = 2.5;
		w.coverage.call = true;
		event(w, "call", eligible[0].x, eligible[0].y, { seat: p.seat });
		return true;
	};
	function birdStep(w, dt) {
		const b = w.bird;
		b.call = Math.max(0, b.call - dt);
		b.mark = Math.max(0, b.mark - dt);
		b.irritation = Math.max(0, b.irritation - dt * 0.075);
		if (b.state === "retreat") {
			b.timer -= dt;
			b.x += (650 - b.x) * Math.min(1, dt * 2);
			b.y += (75 - b.y) * Math.min(1, dt * 2);
			if (b.timer <= 0) {
				b.state = "idle";
				b.irritation = 0;
				b.x = 594;
				b.y = 137;
				b.timer = 1;
				event(w, "birdReturn", b.x, b.y);
			}
			return;
		}
		let o = w.obstacles.find((o) => o.id === b.target && o.kind === "comb");
		if (b.target && !o) {
			b.target = 0;
			b.state = "recover";
			b.timer = 0.45;
		}
		if (b.state === "idle" || b.state === "recover") {
			b.timer -= dt;
			if (b.timer <= 0) {
				const choices = w.obstacles.filter((o) => o.kind === "comb");
				choices.sort(
					(a, c) =>
						Math.hypot(a.x - b.x, a.y - b.y) -
							feedValue(a) * 0.05 -
							(Math.hypot(c.x - b.x, c.y - b.y) - feedValue(c) * 0.05) ||
						a.id - c.id,
				);
				o = choices[0];
				if (o) {
					b.target = o.id;
					b.caller = 0;
					b.state = "flight";
				} else {
					b.state = "idle";
					b.timer = 0.6;
				}
			}
		}
		if (!o) return;
		if (b.state === "flight") {
			const tx = o.x + 19,
				ty = o.y - 4,
				dx = tx - b.x,
				dy = ty - b.y,
				d = Math.hypot(dx, dy),
				s = w.tuning.birdSpeed * dt;
			if (d <= s + 1) {
				b.x = tx;
				b.y = ty;
				b.state = "feed";
				b.timer = w.tuning.birdFeed;
				event(w, "feedStart", o.x, o.y);
			} else {
				b.x += (dx / d) * s;
				b.y += (dy / d) * s;
			}
		} else if (b.state === "feed") {
			b.timer -= dt;
			if (b.timer <= 0) {
				const points = feedValue(o);
				const paid = claim(w, o.reward + ":feed", points, o.x, o.y, b.caller);
				w.obstacles = w.obstacles.filter((q) => q.id !== o.id);
				w.stats.feeds++;
				if (b.caller && w.stats.seats[b.caller])
					w.stats.seats[b.caller].feeds++;
				w.coverage.harvest = true;
				if (o.red) {
					w.stats.redFeeds++;
					w.coverage.redHarvest = true;
					if (w.boss && !w.boss.done) {
						w.boss.open = w.content[w.stage].boss.exposure;
						event(w, "shieldOpen", w.boss.x, w.boss.y);
					}
				}
				b.target = 0;
				b.state = "recover";
				b.timer = 1.2;
				event(w, "feed", o.x, o.y, {
					red: o.red,
					paid,
					points: paid ? points : 0,
				});
			}
		}
	}
	function birdHit(w) {
		const b = w.bird;
		b.irritation += 1;
		b.target = 0;
		b.state = "recover";
		b.timer = 1.1;
		event(w, "birdHit", b.x, b.y);
		if (b.irritation >= 2.8) {
			b.state = "retreat";
			b.timer = w.tuning.irritationRecovery;
			event(w, "retreat", b.x, b.y);
			w.coverage.retreat = true;
		}
	}
	function playerStep(w, dt) {
		const legal = B.groundIntervals(w);
		for (const p of w.players) {
			p.cool = Math.max(0, p.cool - dt);
			p.hop = Math.max(0, p.hop - dt);
			p.recoil = Math.max(0, p.recoil - dt * 7);
			const a = w.actions[p.seat] || {
				move: 0,
				aim: null,
				fire: false,
				call: p.callSeen,
			};
			let mv = a.move;
			if (a.aim !== null && a.aim !== undefined)
				mv = clamp((a.aim - p.x) / 12, -1, 1);
			const desired = mv * w.tuning.moveSpeed,
				acc = dt * (Math.abs(mv) > 0.01 ? 1900 : 2500);
			p.vx += clamp(desired - p.vx, -acc, acc);
			const interval = legal.find(
				([x0, x1]) => p.x >= x0 - 0.1 && p.x <= x1 + 0.1,
			);
			if (interval) p.x = clamp(p.x + p.vx * dt, interval[0], interval[1]);
			if (Math.abs(mv) > 0.1) w.coverage.move = true;
			if (a.call > p.callSeen) {
				p.callSeen = a.call;
				B.callBird(w, p);
			}
			if (p.swap > 0) {
				p.swap -= dt;
				if (p.swap <= 0) {
					p.ammo = w.tuning.capacity;
					p.grace = 0;
					event(w, "swapEnd", p.x, 306);
				}
				continue;
			}
			if (a.fire && p.cool <= 0 && p.ammo > 0) {
				p.cool = w.tuning.fireCadence;
				p.recoil = 1;
				if (!w.dev.unlimited && !w.demo) p.ammo--;
				const pulse = entity(w, {
					x: p.x,
					y: 282,
					seat: p.seat,
					left: w.tuning.penetration,
					hitIds: [],
					born: [],
				});
				w.pulses.push(pulse);
				w.stats.shots++;
				event(w, "spray", p.x, 282, { seat: p.seat });
				if (Math.abs(mv) > 0.1) w.coverage.moveFire = true;
			}
		}
	}
	function pulseStep(w, dt) {
		for (const p of w.pulses) {
			const y0 = p.y,
				y1 = y0 - w.tuning.pulseSpeed * dt,
				contacts = [];
			const add = (o, kind, r, h) => {
				if (
					p.hitIds.includes(o.id) ||
					p.born.includes(o.id) ||
					Math.abs(p.x - o.x) > r
				)
					return;
				const top = o.y + h,
					bot = o.y - h;
				if (y0 >= bot && y1 <= top)
					contacts.push({ o, kind, d: Math.max(0, y0 - top) });
			};
			for (const b of w.bees)
				if (!b.dead && b.state !== "landing") add(b, "bee", 12, 9);
			for (const o of w.obstacles)
				add(
					o,
					"obstacle",
					o.kind === "hive" ? 14 : 11,
					o.kind === "hive" ? 13 : 10,
				);
			if (w.bird.state !== "retreat") add(w.bird, "bird", 11, 7);
			if (w.boss && !w.boss.done) add(w.boss, "boss", 23, 16);
			contacts.sort((a, b) => a.d - b.d || a.o.id - b.o.id);
			for (const c of contacts) {
				const o = c.o;
				if (p.dead) break;
				if (c.kind === "bee") {
					if (o.dead) continue;
					o.dead = true;
					p.hitIds.push(o.id);
					p.left--;
					w.stats.hits++;
					if (w.stats.seats[p.seat]) w.stats.seats[p.seat].hits++;
					const paid = claim(
						w,
						o.reward + ":hit",
						o.kind === "fast" ? 1000 : 100,
						o.x,
						o.y,
						p.seat,
					);
					const comb = B.placeComb(w, o.x, o.tier, o.kind === "fast", o.reward);
					if (comb) p.born.push(comb.id);
					event(w, "convert", o.x, o.y, { red: o.kind === "fast", paid });
					w.coverage.convert = true;
					if (o.kind === "fast") w.coverage.fast = true;
					if (p.left <= 0) p.dead = true;
				} else if (c.kind === "obstacle") {
					if (!w.obstacles.some((q) => q.id === o.id)) continue;
					w.obstacles = w.obstacles.filter((q) => q.id !== o.id);
					p.dead = true;
					event(w, "shatter", o.x, o.y, { hive: o.kind === "hive" });
					w.coverage.clearComb = true;
				} else if (c.kind === "bird") {
					birdHit(w);
					p.dead = true;
				} else if (c.kind === "boss") {
					p.dead = true;
					w.boss.hit = 0.18;
					if (w.boss.open > 0) {
						w.boss.hp--;
						event(w, "bossHit", o.x, o.y);
						if (w.boss.hp <= 0) {
							w.stats.shieldBreaks++;
							w.coverage.shield = true;
							claim(
								w,
								w.content[w.stage].id + ":bud" + w.boss.phase,
								1800,
								o.x,
								o.y,
								p.seat,
							);
							event(w, "shieldBreak", o.x, o.y);
							w.boss.phase++;
							w.boss.open = 0;
							w.boss.hp = w.boss.maxHp;
							w.boss.supply = 2;
							w.boss.serial = 0;
							if (w.boss.phase >= w.boss.phases) {
								w.boss.done = true;
								if (w.stage === w.content.length - 1) {
									for (let i = 0; i < 4; i++)
										w.pending.push({
											id: "curtain" + i,
											at: w.stageTime + 2 + i * 1.5,
											kind: i % 2 ? "fast" : "worker",
											x: i % 2 ? 600 : 40,
											dir: i % 2 ? -1 : 1,
											tier: 2,
											reward: "curtain" + i,
										});
									w.pending.sort((a, b) => a.at - b.at);
								}
							}
						}
					} else event(w, "shieldBlock", o.x, o.y);
				}
			}
			p.y = y1;
			if (y1 < 48) p.dead = true;
		}
		w.pulses = w.pulses.filter((p) => !p.dead);
		w.bees = w.bees.filter((b) => !b.dead);
	}
	function bossStep(w, dt) {
		const b = w.boss;
		if (!b || b.done) return;
		const cfg = w.content[w.stage].boss;
		b.x = 320 + Math.sin(w.stageTime * 0.36 + b.phase) * 145;
		b.y = 93 + Math.sin(w.stageTime * 0.6) * 4;
		b.open = Math.max(0, b.open - dt);
		b.hit = Math.max(0, b.hit - dt);
		b.supply -= dt;
		if (b.supply <= 0) {
			b.supply = cfg.supply;
			const slot = Math.min(b.serial++, 7),
				rw = w.content[w.stage].id + ":escort:" + b.phase + ":" + slot;
			// Finite scoring identities, renewable rescue supply. Repeated slot 7 has no new reward claims.
			B.spawnBee(w, {
				kind: "fast",
				x: 100 + ((b.serial * 137) % 430),
				tier: 1,
				dir: b.serial % 2 ? 1 : -1,
				reward: rw,
			});
			if (w.bees.length < 14)
				B.spawnBee(w, {
					kind: "worker",
					x: b.serial % 2 ? 600 : 40,
					tier: 2,
					dir: b.serial % 2 ? -1 : 1,
					reward: rw + ":worker",
				});
		}
	}
	function clearEncounter(w) {
		for (const o of w.obstacles)
			if (
				o.kind === "hive" &&
				claim(
					w,
					o.reward + ":hive",
					o.tier < 2 ? 2000 : o.tier < 5 ? 1600 : 1000,
					o.x,
					o.y,
				)
			) {
				w.stats.banked++;
				event(w, "bankHive", o.x, o.y);
			}
		const e = w.content[w.stage];
		claim(w, e.id + ":clear", e.clearBonus, 320, 178);
		w.stats.cleared++;
		for (const p of w.players) {
			p.ammo = w.tuning.capacity;
			p.grace = 0;
			p.swap = 0;
		}
		stockAwards(w);
		if (w.stage >= w.content.length - 1) {
			w.flowers = [];
			w.growth = [];
			B.finish(
				w,
				true,
				"The garden is open. The security system was delicious.",
			);
		} else {
			w.status = "intermission";
			w.phaseTime = 5;
			event(w, "clear", 320, 180, { gag: e.gag });
		}
	}
	B.step = function (w, dt = 1 / 120) {
		if (w.result || w.dev.freeze) return;
		if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1)
			throw Error("Simulation step must be finite and <= 0.1 seconds.");
		w.tick++;
		w.time += dt;
		if (w.status === "intro") {
			w.phaseTime -= dt;
			if (w.phaseTime <= 0) {
				w.status = "live";
				event(w, "go", 320, 180);
			}
			return;
		}
		if (w.status === "intermission") {
			w.phaseTime -= dt;
			if (w.phaseTime <= 0) B.enterEncounter(w, w.stage + 1);
			return;
		}
		if (w.status !== "live" && w.status !== "harvest") return;
		w.stageTime += dt;
		if (w.status === "live") {
			while (w.pending.length && w.pending[0].at <= w.stageTime)
				B.spawnBee(w, w.pending.shift());
			while (
				w.scheduledGrowth.length &&
				w.scheduledGrowth[0].at <= w.stageTime
			) {
				const g = w.scheduledGrowth.shift();
				B.queueGrowth(w, g.x0, g.x1);
			}
		}
		playerStep(w, dt);
		bees(w, dt);
		bossStep(w, dt);
		pulseStep(w, dt);
		birdStep(w, dt);
		stockAwards(w);
		// Resolve all contacts and the clear predicate before any stock/enclosure terminal checks.
		if (
			w.status === "live" &&
			!w.pending.length &&
			!w.bees.length &&
			(!w.boss || w.boss.done)
		) {
			w.status = "harvest";
			w.phaseTime = 3.6;
			event(w, "harvestTime", 320, 180);
			for (const p of w.players) {
				p.ammo = w.tuning.capacity;
				p.swap = 0;
				p.grace = 0;
			}
		}
		if (w.status === "harvest") {
			w.phaseTime -= dt;
			if (w.phaseTime <= 0) {
				clearEncounter(w);
				return;
			}
		}
		const old = B.groundIntervals(w);
		let grew = false;
		for (const g of w.growth) {
			g.timer -= dt;
			if (g.timer <= 0) {
				w.flowers.push([g.x0, g.x1]);
				g.dead = true;
				grew = true;
				event(w, "grow", (g.x0 + g.x1) / 2, 304);
			}
		}
		w.growth = w.growth.filter((g) => !g.dead);
		if (grew && !relocate(w, old)) {
			if (w.status === "harvest") {
				clearEncounter(w);
				return;
			}
			enclosure(w);
			return;
		}
		for (const p of w.players) {
			if (p.ammo > 0 || p.swap > 0) continue;
			if (w.reserves > 0) {
				w.reserves--;
				w.stats.spent++;
				w.stats.swaps++;
				p.swap = 0.6;
				p.grace = 0;
				event(w, "swap", p.x, 306);
			} else if (w.dev.god || w.demo) {
				p.ammo = w.tuning.capacity;
				p.grace = 0;
			} else {
				p.grace += dt;
				if (p.grace >= 1.5) {
					B.finish(
						w,
						false,
						"Out of spritz. Pip recommends fewer warning shots.",
					);
					return;
				}
			}
		}
	};
	B.setTuning = function (w, obj) {
		w.tuning = B.validateTuning(obj);
		w.assisted = true;
		for (const p of w.players) p.ammo = Math.min(p.ammo, w.tuning.capacity);
	};
	B.removeSeat = function (w, seat) {
		w.players = w.players.filter((p) => p.seat !== seat);
		delete w.actions[seat];
		if (!w.players.length) B.finish(w, false, "The garden crew has left.");
	};
	B.snapshot = function (w) {
		const { rng, content, actions, ...s } = w;
		return copy(s);
	};
	B.debugMutate = function (w, kind, opts = {}) {
		w.assisted = true;
		const e = w.content[w.stage],
			x = opts.x ?? 320,
			tier = opts.tier ?? 3;
		if (["worker", "fast"].includes(kind))
			return B.spawnBee(w, { kind, x, tier, dir: 1 });
		if (["amber", "red", "hive"].includes(kind))
			return B.placeComb(
				w,
				x,
				tier,
				kind === "red",
				e.id + ":dev" + w.nextId,
				kind === "hive" ? "hive" : "comb",
			);
		if (kind === "flower") return B.queueGrowth(w, x - 28, x + 28);
		if (kind === "bird") {
			Object.assign(w.bird, {
				state: "idle",
				timer: 0,
				target: 0,
				irritation: 0,
				x,
				y: A.tiers[tier],
			});
			return;
		}
		if (kind === "clear") {
			w.pending = [];
			w.bees = [];
			w.obstacles = [];
			w.growth = [];
			w.flowers = copy(e.flowers);
			w.pulses = [];
		}
	};
})((globalThis.BCP = globalThis.BCP || {}));
