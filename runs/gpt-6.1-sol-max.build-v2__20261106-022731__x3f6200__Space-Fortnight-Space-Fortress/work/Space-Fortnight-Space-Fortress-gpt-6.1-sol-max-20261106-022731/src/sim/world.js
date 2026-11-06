(function (S) {
	"use strict";
	const { W, H, DT, BOUNDS: B, DEFAULTS, ENEMIES, WAVES, RANKS } = S;
	const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
	const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
	const norm = (x, y) => {
		const d = Math.hypot(x, y);
		return d > 1 ? [x / d, y / d] : [x, y];
	};
	const aimAt = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
	const groundAim = (a) =>
		a > 0
			? Math.cos(a) >= 0
				? -0.15
				: -Math.PI + 0.15
			: clamp(a, -Math.PI + 0.15, -0.15);
	function segmentCircle(x0, y0, x1, y1, c, r) {
		const dx = x1 - x0,
			dy = y1 - y0,
			den = dx * dx + dy * dy;
		const t = den ? clamp(((c.x - x0) * dx + (c.y - y0) * dy) / den, 0, 1) : 0;
		return (x0 + dx * t - c.x) ** 2 + (y0 + dy * t - c.y) ** 2 <= r * r
			? t
			: Infinity;
	}
	const neutral = (seq) => ({
		seq,
		mx: 0,
		my: 0,
		ax: 0,
		ay: -1,
		fire: false,
		boost: false,
		pulse: false,
	});
	class World {
		constructor(opts = {}) {
			const seed = Number(opts.seed ?? 198113) >>> 0;
			this.s = {
				version: 1,
				epoch: opts.epoch || 1,
				seed,
				rng: seed || 1,
				tick: 0,
				t: 0,
				activeTime: 0,
				phase: "briefing",
				phaseTime: 3.5,
				act: 0,
				wave: 0,
				waveTime: 0,
				group: 0,
				waveKills: 0,
				score: 0,
				chain: 0,
				multiplier: 1,
				lastKill: -20,
				nextId: 1,
				eventSeq: 0,
				heat: 0,
				base: 100,
				lastObjectiveHit: -10,
				locks: [false, false, false, false],
				outcomes: [],
				waveOutcomes: [],
				upgrades: 0,
				players: [],
				enemies: [],
				shots: [],
				drops: [],
				effects: [],
				boss: null,
				seen: [],
				bossPhases: [],
				result: null,
				modified: false,
				demo: !!opts.demo,
				balance: { ...DEFAULTS, ...opts.balance },
				options: { god: !!opts.demo, overlays: false },
				radio: "Viper wing, this is Fortress 13. Make them regret the journey.",
				radioUntil: 8,
				limit: Number.isFinite(opts.limit) ? opts.limit : 780,
				events: [],
			};
			this.intents = new Map();
			for (const [i, seat] of (
				opts.players || [{ id: 0, name: "VIPER 01", color: "#8ae5dc" }]
			).entries()) {
				this.s.players.push({
					id: seat.id,
					name: String(seat.name).slice(0, 32),
					color: seat.color || ["#8ae5dc", "#efbc6e", "#ec9fbd", "#b7d98c"][i],
					x: 360 + i * 72,
					y: 385,
					vx: 0,
					vy: 0,
					a: -Math.PI / 2,
					hp: 0,
					maxHp: 0,
					energy: 100,
					maxEnergy: 100,
					pulse: 0,
					boost: 0,
					boostCool: 0,
					cool: 0,
					inv: 3,
					dead: 0,
					gone: false,
					seq: -1,
					kills: 0,
					damage: 0,
					upgrades: { laser: 0, boost: 0, pulse: 0 },
					choice: null,
					thrust: 0,
					recoil: 0,
					pulseFx: 0,
					hit: 0,
				});
			}
			const n = this.s.players.length;
			for (const p of this.s.players) p.hp = p.maxHp = n === 1 ? 9 : 6;
			this.emit("briefing", 0, 480, 270);
		}
		random() {
			let a = (this.s.rng = (this.s.rng + 0x6d2b79f5) >>> 0);
			a = Math.imul(a ^ (a >>> 15), a | 1);
			a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
			return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
		}
		emit(type, owner = 0, x = 480, y = 270, value = 0) {
			const s = this.s,
				e = { id: ++s.eventSeq, type, owner, x, y, value, tick: s.tick };
			s.events.push(e);
			if (s.events.length > 96) s.events.shift();
			return e;
		}
		say(text, seconds = 6) {
			this.s.radio = text;
			this.s.radioUntil = this.s.t + seconds;
			this.emit("radio");
		}
		setIntent(id, input) {
			const s = this.s,
				p = s.players.find((p) => p.id === id && !p.gone);
			if (
				!p ||
				!input ||
				!Number.isSafeInteger(input.seq) ||
				input.seq <= p.seq
			)
				return false;
			for (const k of ["mx", "my", "ax", "ay"])
				if (!Number.isFinite(input[k]) || Math.abs(input[k]) > 1.001)
					return false;
			if (
				Math.hypot(input.mx, input.my) > 1.015 ||
				Math.hypot(input.ax, input.ay) > 1.015
			)
				return false;
			const [mx, my] = norm(input.mx, input.my),
				[ax, ay] = norm(input.ax, input.ay);
			p.seq = input.seq;
			this.intents.set(id, {
				seq: input.seq,
				mx,
				my,
				ax,
				ay,
				fire: input.fire === true,
				boost: input.boost === true,
				pulse: input.pulse === true,
				tick: s.tick,
			});
			return true;
		}
		clearInput() {
			this.intents.clear();
		}
		leave(id) {
			const p = this.s.players.find((p) => p.id === id);
			if (p) {
				p.gone = true;
				p.hp = 0;
			}
			this.intents.delete(id);
		}
		balance(key, value) {
			const spec = S.BALANCE_SPEC.find((v) => v[0] === key);
			if (!spec || !Number.isFinite(value)) return false;
			this.s.balance[key] = clamp(value, spec[3], spec[4]);
			this.s.modified = true;
			return true;
		}
		resetBalance() {
			this.s.balance = { ...DEFAULTS };
			this.s.modified = true;
		}
		upgrade(id, choice) {
			const s = this.s,
				p = s.players.find((p) => p.id === id && !p.gone);
			if (
				s.phase !== "upgrade" ||
				!p ||
				p.choice !== null ||
				![0, 1, 2].includes(choice)
			)
				return false;
			p.choice = choice;
			const key = S.UPGRADES[choice].id;
			p.upgrades[key]++;
			p.maxEnergy = 100 + 50 * p.upgrades.boost;
			p.energy = p.maxEnergy;
			this.emit("upgrade", id, p.x, p.y, choice);
			return true;
		}
		freshField() {
			const s = this.s;
			s.enemies = [];
			s.shots = [];
			s.drops = [];
			s.effects = [];
			s.locks = [false, false, false, false];
			this.clearInput();
		}
		waveStart(wave) {
			const s = this.s;
			s.wave = wave;
			s.waveTime = 0;
			s.group = 0;
			s.waveKills = 0;
			const w = WAVES[wave];
			if (!w) return this.startBoss();
			s.act = w.act;
			this.say(w.radio, 8);
			this.emit("wave", 0, 480, 270, wave);
		}
		retreat(success, reason) {
			const s = this.s;
			if (s.phase !== "play") return;
			s.outcomes[s.act] = {
				held: success,
				reason,
				score: success ? 1800 : 350,
			};
			this.addScore(success ? 1800 : 350);
			if (!success) {
				s.multiplier = 1;
				s.chain = 0;
				s.score = Math.max(0, s.score - 500);
			}
			this.freshField();
			s.phase = "retreat";
			s.phaseTime = 4.5;
			this.say(
				success
					? "Line secured. Vipers, fall back by order. The fortress still stands."
					: "Emergency extraction! Leave the line. We have one more place to stand.",
				5,
			);
			this.emit("retreat", 0, 480, 270, success ? 1 : 0);
		}
		enterAct(act) {
			const s = this.s;
			s.act = act;
			s.phase = "briefing";
			s.phaseTime = 3.2;
			s.heat = act === 1 ? (s.outcomes[0]?.held ? 4 : 20) : s.heat;
			if (act === 2) s.base = s.outcomes[1]?.held ? 100 : 76;
			this.freshField();
			for (const [i, p] of s.players.entries())
				if (!p.gone) {
					p.x = 360 + i * 72;
					p.y = act === 2 ? 457 : 395;
					p.vx = p.vy = 0;
					p.a = -Math.PI / 2;
					p.hp = p.maxHp;
					p.dead = 0;
					p.inv = 3;
					p.energy = p.maxEnergy;
					p.pulse = 0;
					p.boost = 0;
				}
			s.wave = WAVES.findIndex((w) => w.act === act);
			this.say(WAVES[s.wave].radio, 7);
			this.emit("dock", 0, 480, 440, act);
		}
		addScore(amount) {
			this.s.score = Math.max(0, Math.floor(this.s.score + amount));
		}
		kill(e, owner = 0) {
			const s = this.s;
			if (e.hp <= 0 || e.dead) return;
			e.hp = 0;
			e.dead = true;
			s.waveKills++;
			s.chain++;
			s.multiplier = Math.min(5, 1 + Math.floor(s.chain / 5));
			s.lastKill = s.t;
			this.addScore((ENEMIES[e.kind]?.score || 100) * s.multiplier);
			const p = s.players.find((p) => p.id === owner);
			if (p) p.kills++;
			s.effects.push({
				id: s.nextId++,
				kind: "blast",
				x: e.x,
				y: e.y,
				t: 0,
				life: 0.75,
				size: e.r * 1.8,
			});
			this.emit("kill", owner, e.x, e.y, e.kind === "anchor" ? 2 : 1);
			if (e.kind === "anchor" || s.chain % 4 === 0)
				s.drops.push({
					id: s.nextId++,
					x: e.x,
					y: e.y,
					t: 0,
					life: 12,
					charge: e.kind === "anchor",
					r: 10,
				});
		}
		damageEnemy(e, amount, owner) {
			if (e.dead || e.hp <= 0) return;
			e.hit = 0.1;
			this.emit("hit", owner, e.x, e.y);
			if (e.hp <= amount) this.kill(e, owner);
			else e.hp -= amount;
		}
		damagePlayer(p, amount = 1) {
			const s = this.s;
			if (p.hp <= 0 || p.inv > 0 || s.phase !== "play" || s.options.god)
				return false;
			p.hp = Math.max(0, p.hp - amount);
			p.damage += amount;
			p.inv = 1.15;
			p.hit = 0.24;
			s.chain = 0;
			s.multiplier = 1;
			this.addScore(-80);
			this.emit("hurt", p.id, p.x, p.y, p.hp);
			if (p.hp <= 0) {
				p.dead = 3;
				this.emit("death", p.id, p.x, p.y);
				s.effects.push({
					id: s.nextId++,
					kind: "blast",
					x: p.x,
					y: p.y,
					t: 0,
					life: 1,
					size: 35,
				});
			}
			return true;
		}
		objectiveHit(mult = 1, x = 480, y = 277) {
			const s = this.s;
			if (s.phase !== "play" || s.act === 0) return;
			if (s.act === 1)
				s.heat = clamp(s.heat + s.balance.heatHit * mult, 0, 100);
			else s.base = Math.max(0, s.base - s.balance.baseDamage * mult);
			s.lastObjectiveHit = s.t;
			this.emit("objective", 0, x, y, mult);
		}
		spawn(kind, x, y, opts = {}) {
			const s = this.s,
				d = ENEMIES[kind];
			if (!d) throw Error(`Unknown enemy: ${kind}`);
			if (
				kind === "anchor" &&
				s.act === 1 &&
				Math.hypot(x - 480, y - 277) < 112
			) {
				const angle = Math.atan2(y - 277, x - 480);
				x = 480 + Math.cos(angle) * 112;
				y = 277 + Math.sin(angle) * 112;
			}
			const scale =
				1 + Math.max(0, s.players.filter((p) => !p.gone).length - 1) * 0.3;
			const e = {
				id: s.nextId++,
				kind,
				x,
				y,
				homeX: x,
				homeY: y,
				vx: 0,
				vy: 0,
				hp: d.hp * scale,
				maxHp: d.hp * scale,
				r: d.r,
				age: 0,
				tele: opts.tele ?? 1.35,
				cycle: 0,
				wind: 0,
				cool: 1.8 + this.random(),
				a: Math.PI / 2,
				target: -1,
				lock: -1,
				hit: 0,
				dead: false,
				lane: x,
				launched: false,
				seed: this.random() * 6.28,
				...opts,
			};
			if (kind === "anchor") {
				e.charge = opts.charge ?? 2.7;
				e.cool = opts.cool ?? 3;
				e.tele = opts.tele ?? 0.55;
			}
			if (kind === "relay") {
				e.y = e.homeY = 140;
				e.tele = opts.tele ?? 2;
			}
			s.enemies.push(e);
			if (!s.seen.includes(kind)) s.seen.push(kind);
			this.emit("spawn", 0, x, y);
			return e;
		}
		spawnGroup(g) {
			const s = this.s,
				n = s.players.filter((p) => !p.gone).length;
			const count = Math.min(
				10,
				g.count + Math.floor((n - 1) * g.count * 0.22),
			);
			for (let i = 0; i < count; i++) {
				const frac = (i + 1) / (count + 1);
				let x = 110 + frac * 740 + (this.random() - 0.5) * 28,
					y = 105;
				if (g.kind === "anchor") y = 230;
				if (g.side === "left") {
					x = 48;
					y = 115 + frac * 300;
				}
				if (g.side === "right") {
					x = 912;
					y = 115 + frac * 300;
				}
				if (g.side === "bottom") {
					x = 120 + frac * 720;
					y = 448;
				}
				if (s.act === 2) {
					y =
						105 +
						(g.pattern === "vee" ? Math.abs(i - (count - 1) / 2) * 16 : 0);
				}
				const pilots = s.players.filter((p) => p.hp > 0 && !p.gone);
				const safe = (xx, yy) =>
					pilots.every((p) => Math.hypot(p.x - xx, p.y - yy) >= 110);
				if (!safe(x, y)) {
					const candidates = [];
					for (let j = 0; j <= 24; j++) {
						const q = j / 24;
						candidates.push(
							g.side === "left"
								? [48, 100 + q * 350]
								: g.side === "right"
									? [912, 100 + q * 350]
									: [48 + q * 864, y],
						);
					}
					candidates.push([48, 105], [912, 105], [48, 448], [912, 448]);
					const spot = candidates
						.filter((p) => safe(...p))
						.sort(
							(a, b) =>
								(a[0] - x) ** 2 +
								(a[1] - y) ** 2 -
								((b[0] - x) ** 2 + (b[1] - y) ** 2),
						)[0];
					if (spot) [x, y] = spot;
				}

				this.spawn(g.kind, x, y, {
					seed: i * 0.5 + this.random(),
					tele: 1.35 + i * 0.13,
				});
			}
		}
		shot(x, y, a, speed, foe, owner = 0, opts = {}) {
			const s = this.s;
			s.shots.push({
				id: s.nextId++,
				x,
				y,
				px: x,
				py: y,
				vx: Math.cos(a) * speed,
				vy: Math.sin(a) * speed,
				life: foe ? 5 : 1.5,
				r: foe ? 4 : 2,
				foe,
				owner,
				dmg: foe ? 1 : s.balance.laserDamage,
				...opts,
			});
		}
		firePlayer(p) {
			const s = this.s;
			this.shot(
				p.x + Math.cos(p.a) * 21,
				p.y + Math.sin(p.a) * 21,
				p.a,
				730,
				false,
				p.id,
				{ dmg: s.balance.laserDamage * (1 + 0.3 * p.upgrades.laser) },
			);
			p.cool = s.balance.laserCadence;
			p.recoil = 0.08;
			this.emit("shot", p.id, p.x, p.y);
		}
		pulsePlayer(p) {
			const s = this.s;
			p.pulse = s.balance.pulseCooldown * Math.pow(0.75, p.upgrades.pulse);
			p.pulseFx = 0.55;
			s.shots = s.shots.filter((b) => !b.foe || dist(b, p) > 130);
			for (const e of s.enemies)
				if (dist(e, p) < 145) {
					if (e.kind === "tractor") {
						e.wind = 0;
						e.cool = 3.5;
						e.target = -1;
						e.lock = -1;
					}
					const a = aimAt(p, e);
					e.x = clamp(e.x + Math.cos(a) * 28, 25, 935);
					e.y = clamp(e.y + Math.sin(a) * 28, 90, 466);
				}
			p.inv = Math.max(p.inv, 0.4);
			s.effects.push({
				id: s.nextId++,
				kind: "pulse",
				x: p.x,
				y: p.y,
				t: 0,
				life: 0.55,
				size: 130,
			});
			this.emit("pulse", p.id, p.x, p.y);
		}
		stepPlayers(dt) {
			const s = this.s,
				b = s.balance;
			for (const p of s.players) {
				if (p.gone) continue;
				p.inv = Math.max(0, p.inv - dt);
				p.cool -= dt;
				p.pulse = Math.max(0, p.pulse - dt);
				p.boostCool -= dt;
				p.recoil = Math.max(0, p.recoil - dt);
				p.pulseFx = Math.max(0, p.pulseFx - dt);
				p.hit = Math.max(0, p.hit - dt);
				if (p.hp <= 0) {
					if (
						(p.dead -= dt) <= 0 &&
						s.players.some((q) => !q.gone && q.hp > 0)
					) {
						p.hp = p.maxHp;
						p.x = 480;
						p.y = s.act === 2 ? 457 : 405;
						p.vx = p.vy = 0;
						p.inv = 3;
						p.energy = p.maxEnergy;
						this.addScore(-300);
						s.chain = 0;
						s.multiplier = 1;
						this.emit("redeploy", p.id, p.x, p.y);
					}
					continue;
				}
				const it = this.intents.get(p.id),
					I = it && s.tick - it.tick < 60 ? it : neutral(p.seq);
				let [mx, my] = [I.mx, s.act === 2 ? 0 : I.my];
				p.thrust = Math.hypot(mx, my);
				if (Math.hypot(I.ax, I.ay) > 0.2) {
					p.a = Math.atan2(I.ay, I.ax);
					if (s.act === 2) p.a = groundAim(p.a);
				}
				if (I.boost && p.energy >= 28 && p.boostCool <= 0) {
					const a = Math.hypot(mx, my) > 0.1 ? Math.atan2(my, mx) : p.a;
					p.vx = Math.cos(a) * 440;
					p.vy = s.act === 2 ? 0 : Math.sin(a) * 440;
					p.energy -= 28;
					p.boost = 0.24;
					p.boostCool = 0.9;
					p.inv = Math.max(p.inv, 0.28);
					this.emit("boost", p.id, p.x, p.y);
				}
				p.energy = Math.min(p.maxEnergy, p.energy + b.boostRecharge * dt);
				p.boost = Math.max(0, p.boost - dt);
				if (p.boost <= 0) {
					p.vx += mx * b.thrust * dt;
					p.vy += my * b.thrust * dt;
					const drag = Math.exp(-b.drag * dt);
					p.vx *= drag;
					p.vy *= drag;
				}
				const cap = p.boost > 0 ? 460 : 210,
					sp = Math.hypot(p.vx, p.vy);
				if (sp > cap) {
					p.vx *= cap / sp;
					p.vy *= cap / sp;
				}
				p.x = clamp(p.x + p.vx * dt, B.x0, B.x1);
				p.y = s.act === 2 ? 457 : clamp(p.y + p.vy * dt, B.y0, B.y1);
				if (s.act === 1) {
					const dx = p.x - 480,
						dy = p.y - 277,
						d = Math.hypot(dx, dy);
					if (d < 76) {
						p.x = 480 + (dx / (d || 1)) * 76;
						p.y = 277 + (dy / (d || 1)) * 76;
						p.vx *= 0.7;
						p.vy *= 0.7;
					}
				}
				if (I.fire && p.cool <= 0) this.firePlayer(p);
				if (I.pulse && p.pulse <= 0) this.pulsePlayer(p);
			}
		}
		closestPlayer(e) {
			let best = null,
				d = Infinity;
			for (const p of this.s.players)
				if (!p.gone && p.hp > 0) {
					const v = dist(e, p);
					if (v < d) {
						d = v;
						best = p;
					}
				}
			return best;
		}
		stepEnemies(dt) {
			const s = this.s,
				b = s.balance,
				add = [];
			s.locks = [false, false, false, false];
			for (const e of s.enemies) {
				if (e.hp <= 0 || e.dead) continue;
				e.age += dt;
				e.hit = Math.max(0, e.hit - dt);
				if (e.tele > 0) {
					e.tele -= dt;
					continue;
				}
				const p = this.closestPlayer(e);
				if (!p) continue;
				e.cool -= dt;
				const ag = b.aggression;
				const a = aimAt(e, p);
				e.a = a;
				if (e.kind === "hunter") {
					e.x = clamp(e.homeX + Math.sin(e.age * 0.64 + e.seed) * 55, 35, 925);
					e.y = clamp(
						e.homeY +
							Math.sin(e.age * 0.47 + e.seed) * 26 +
							(s.act === 2 ? 24 : 0),
						99,
						436,
					);
					if (e.cool <= 0) {
						e.wind = 0.7;
						e.cool = 3.6 / ag;
						e.lane = p.x;
						e.target = p.id;
						this.emit("aim", 0, e.x, e.y);
					}
					if (e.wind > 0 && (e.wind -= dt) <= 0) {
						const target = s.players.find((q) => q.id === e.target) || p;
						const ang = aimAt(e, target);
						for (let k = -1; k <= 1; k++)
							this.shot(e.x, e.y, ang + k * 0.12, 112 + 8 * ag, true, 0, {
								r: 3.5,
							});
					}
				} else if (e.kind === "bomber") {
					e.x = clamp(e.homeX + Math.sin(e.age * 0.28 + e.seed) * 65, 45, 915);
					e.y = e.homeY + Math.sin(e.age * 0.9) * 8;
					if (e.cool <= 0) {
						e.wind = 1.65;
						e.cool = 6.8 / ag;
						e.lane = s.act === 1 ? 480 : p.x;
						this.emit("warning", 0, e.lane, 440);
					}
					if (e.wind > 0 && (e.wind -= dt) <= 0) {
						const target = { x: e.lane, y: s.act === 1 ? 277 : 510 };
						this.shot(e.x, e.y, aimAt(e, target), 85, true, 0, {
							r: 8,
							bomb: true,
							obj: true,
							dmg: 2,
						});
					}
				} else if (e.kind === "scout") {
					e.x = clamp(e.homeX + Math.sin(e.age * 0.48 + e.seed) * 90, 45, 915);
					e.y = e.homeY + Math.cos(e.age * 0.7) * 14;
					if (e.cool <= 0) {
						e.cool = 11;
						const x =
							s.act === 2
								? clamp(p.x + (this.random() - 0.5) * 120, 80, 880)
								: clamp(p.x + (this.random() - 0.5) * 160, 75, 885);
						add.push({
							kind: "anchor",
							x,
							y: s.act === 2 ? 310 : clamp(p.y - 45, 160, 385),
						});
						this.emit("gravity", 0, x, p.y);
					}
				} else if (e.kind === "anchor") {
					e.charge = Math.max(0, e.charge - dt);
					if (e.charge <= 0) {
						for (const q of s.players)
							if (q.hp > 0 && !q.gone) {
								const d = dist(e, q);
								if (d < 180 && d > 8) {
									const force = b.gravity * (1 - d / 230);
									q.vx += ((e.x - q.x) / d) * force * dt;
									if (s.act !== 2) q.vy += ((e.y - q.y) / d) * force * dt;
									if (d < 27) this.damagePlayer(q);
								}
							}
						if (e.cool <= 0) {
							e.cool = 3.4;
							for (let k = 0; k < 8; k++)
								this.shot(
									e.x,
									e.y,
									(k * Math.PI) / 4 + e.age * 0.1,
									65,
									true,
									0,
									{ r: 3 },
								);
						}
					}
				} else if (e.kind === "rammer") {
					if (!e.launched) {
						e.wind += dt;
						if (e.wind > 1.1) {
							e.launched = true;
							const target = s.act === 1 ? { x: 480, y: 277 } : p;
							const aa = aimAt(e, target);
							e.vx = Math.cos(aa) * 68 * ag;
							e.vy = Math.sin(aa) * 68 * ag;
						}
					} else {
						e.x += e.vx * dt;
						e.y += e.vy * dt;
						if (s.act === 1 && dist(e, { x: 480, y: 277 }) < 63) {
							this.objectiveHit(1.25);
							e.dead = true;
						}
					}
				} else if (e.kind === "tractor") {
					e.x = clamp(e.homeX + Math.sin(e.age * 0.45) * 32, 50, 910);
					e.y = e.homeY + Math.cos(e.age * 0.6) * 12;
					if (e.cool <= 0) {
						e.wind = 4.2;
						e.cool = 8 / ag;
						e.target = p.id;
						e.lock = s.act === 1 ? Math.floor((e.x / 960) * 4) : -1;
						this.emit("lock", p.id, e.x, e.y);
					}
					if (e.wind > 0) {
						e.wind -= dt;
						if (e.wind < 3.1) {
							if (e.lock >= 0) {
								s.locks[e.lock] = true;
								if (Math.floor((e.age - dt) * 2) !== Math.floor(e.age * 2))
									this.objectiveHit(0.1);
							}
							const target = s.players.find((q) => q.id === e.target);
							if (target && target.hp > 0 && dist(e, target) < 270) {
								const d = dist(e, target) || 1;
								target.vx += ((e.x - target.x) / d) * 105 * dt;
								if (s.act !== 2) target.vy += ((e.y - target.y) / d) * 105 * dt;
							} else e.target = -1;
						}
					}
				} else if (e.kind === "dive") {
					if (!e.launched) {
						e.x = e.homeX + Math.sin(e.age * 1.1 + e.seed) * 33;
						e.y = e.homeY + Math.sin(e.age * 0.6) * 12;
						if (e.age > 4.5 + e.seed * 0.3) {
							e.wind = 0.9;
							e.launched = true;
							e.vx = (p.x - e.x) * 0.22;
							e.vy = 0;
						}
					} else if (e.wind > 0) e.wind -= dt;
					else {
						e.vy = Math.min(105 * ag, e.vy + 42 * dt);
						e.x += e.vx * dt + Math.sin(e.age * 3) * 15 * dt;
						e.y += e.vy * dt;
					}
				} else if (e.kind === "relay") {
					e.x = e.homeX + Math.sin(e.age * 0.5 + e.seed) * 20;
					if (e.cool <= 0) {
						e.cool = 4.5;
						for (let k = 0; k < 7; k++)
							this.shot(
								e.x,
								e.y,
								Math.PI * 0.15 + k * Math.PI * 0.12,
								90,
								true,
								0,
								{ r: 3 },
							);
					}
				}
				if (e.kind !== "anchor" && dist(e, p) < e.r + 9) this.damagePlayer(p);
				if (s.act === 2 && e.y > 478) {
					this.objectiveHit(e.kind === "bomber" ? 1.5 : 1, e.x, 480);
					e.dead = true;
				}
				if (e.x < -40 || e.x > 1000 || e.y < 30 || e.y > 550 || e.age > 34)
					e.dead = true;
			}
			s.enemies = s.enemies.filter((e) => !e.dead && e.hp > 0);
			for (const e of add) this.spawn(e.kind, e.x, e.y);
		}
		stepShots(dt) {
			const s = this.s;
			for (const b of s.shots) {
				if (b.life <= 0) continue;
				b.px = b.x;
				b.py = b.y;
				b.x += b.vx * dt;
				b.y += b.vy * dt;
				b.life -= dt;
				if (!b.foe) {
					let target = null,
						hit = Infinity;
					for (const e of s.enemies)
						if (e.tele <= 0 && e.hp > 0 && !e.dead) {
							const v = segmentCircle(b.px, b.py, b.x, b.y, e, e.r + b.r);
							if (v < hit) {
								hit = v;
								target = e;
							}
						}
					if (s.boss)
						for (const c of s.boss.parts)
							if (c.hp > 0 && c.open) {
								const v = segmentCircle(b.px, b.py, b.x, b.y, c, c.r + b.r);
								if (v < hit) {
									hit = v;
									target = c;
								}
							}
					if (target) {
						b.life = 0;
						if (target.component) this.hitBoss(target, b.dmg, b.owner);
						else this.damageEnemy(target, b.dmg, b.owner);
					}
				} else {
					for (const p of s.players)
						if (
							p.hp > 0 &&
							!p.gone &&
							segmentCircle(b.px, b.py, b.x, b.y, p, p.inv > 0 ? 0 : 10 + b.r) <
								Infinity
						) {
							if (p.inv <= 0) {
								this.damagePlayer(p, b.dmg || 1);
								b.life = 0;
							}
							break;
						}
					if (
						b.life > 0 &&
						s.act === 1 &&
						segmentCircle(b.px, b.py, b.x, b.y, { x: 480, y: 277 }, 62 + b.r) <
							Infinity
					) {
						this.objectiveHit(b.bomb ? 1.2 : 0.45);
						b.life = 0;
					}
					if (b.life > 0 && s.act === 2 && b.y >= 485) {
						this.objectiveHit(b.bomb ? 1.25 : b.lane ? 0.12 : 0.055, b.x, 485);
						b.life = 0;
					}
				}
				if (b.x < -30 || b.x > 990 || b.y < 65 || b.y > 560) b.life = 0;
			}
			s.shots = s.shots.filter((b) => b.life > 0);
		}
		stepDrops(dt) {
			const s = this.s;
			for (const d of s.drops) {
				d.t += dt;
				d.life -= dt;
				const p = this.closestPlayer(d);
				if (!p) continue;
				const ds = dist(d, p);
				if (ds < 110) {
					const sp = 100 + 180 * (1 - ds / 110);
					d.x += ((p.x - d.x) / (ds || 1)) * sp * dt;
					d.y += ((p.y - d.y) / (ds || 1)) * sp * dt;
				}
				if (ds < 24) {
					d.life = 0;
					for (const q of s.players)
						if (q.hp > 0 && !q.gone) {
							q.energy = Math.min(q.maxEnergy, q.energy + (d.charge ? 55 : 25));
							q.hp = Math.min(q.maxHp, q.hp + 1);
							q.pulse = Math.max(0, q.pulse - 1);
						}
					this.addScore(60);
					this.emit("pickup", p.id, d.x, d.y, d.charge ? 2 : 1);
				}
			}
			s.drops = s.drops.filter((d) => d.life > 0);
		}
		startBoss() {
			const s = this.s;
			s.wave = WAVES.length;
			s.waveTime = 0;
			s.group = 0;
			s.waveKills = 0;
			const scale =
				1 + Math.max(0, s.players.filter((p) => !p.gone).length - 1) * 0.62;
			s.boss = {
				phase: 0,
				age: 0,
				phaseAge: 0,
				cycle: 0,
				shot: 1.5,
				wind: 0,
				lanes: [],
				dead: false,
				parts: [],
			};
			const data = [
				[-132, "battery", 420],
				[132, "battery", 420],
				[-74, "emitter", 440],
				[74, "emitter", 440],
				[0, "core", 1200],
			];
			for (const [i, [dx, kind, hp]] of data.entries())
				s.boss.parts.push({
					id: s.nextId++,
					component: true,
					index: i,
					kind,
					dx,
					x: 480 + dx,
					y: 169,
					hp: hp * scale,
					maxHp: hp * scale,
					r: kind === "core" ? 32 : 22,
					open: false,
					hit: 0,
				});
			s.bossPhases.push(0);
			this.say(
				"There it is. The Night Admiral. Break the side guns, then the tractor forks. Finish the core.",
				9,
			);
			this.emit("boss");
		}
		hitBoss(c, damage, owner) {
			if (c.hp <= 0 || !c.open) return;
			c.hp = Math.max(0, c.hp - damage);
			c.hit = 0.12;
			this.emit("hit", owner, c.x, c.y);
			if (c.hp <= 0) {
				this.addScore(1200 * this.s.multiplier);
				this.emit("component", owner, c.x, c.y);
				this.s.effects.push({
					id: this.s.nextId++,
					kind: "blast",
					x: c.x,
					y: c.y,
					t: 0,
					life: 1,
					size: 48,
				});
			}
		}
		stepBoss(dt) {
			const s = this.s,
				boss = s.boss;
			if (!boss) return;
			boss.age += dt;
			boss.phaseAge += dt;
			boss.shot -= dt;
			const cx = 480 + Math.sin(boss.age * 0.28) * 180,
				cy = 155 + Math.sin(boss.age * 0.6) * 10;
			const cycle = boss.phaseAge % 8;
			for (const c of boss.parts) {
				c.x = cx + c.dx;
				c.y = cy + (c.kind === "core" ? 15 : 6);
				c.hit = Math.max(0, c.hit - dt);
				const phase = c.index < 2 ? 0 : c.index < 4 ? 1 : 2;
				c.open = phase === boss.phase && c.hp > 0 && cycle > 1.5 && cycle < 7.5;
			}
			if (boss.phase === 0) {
				if (boss.shot <= 0 && cycle > 1.5) {
					boss.shot = 4.4;
					boss.wind = 1.35;
					boss.lanes = [];
					for (const c of boss.parts.slice(0, 2))
						if (c.hp > 0) {
							const p = this.closestPlayer(c);
							if (p)
								boss.lanes.push({
									index: c.index,
									x: clamp(Math.round(p.x / 110) * 110, 70, 890),
								});
						}
					this.emit("warning", 0, cx, cy);
				}
				if (boss.wind > 0 && (boss.wind -= dt) <= 0) {
					for (const lane of boss.lanes) {
						const c = boss.parts[lane.index];
						if (c.hp > 0) {
							const a = aimAt(c, { x: lane.x, y: 490 });
							for (let k = -1; k <= 1; k++)
								this.shot(c.x, c.y, a + k * 0.055, 102, true, 0, {
									r: 5,
									lane: true,
								});
						}
					}
					boss.lanes = [];
				}
			} else if (boss.phase === 1) {
				for (const c of boss.parts.slice(2, 4))
					if (c.hp > 0 && cycle > 1.5 && cycle < 5.5) {
						const p = this.closestPlayer(c);
						if (!p) continue;
						const d = dist(c, p) || 1;
						p.vx += ((c.x - p.x) / d) * 120 * dt;
						if (boss.shot <= 0) {
							this.shot(c.x, c.y, aimAt(c, p), 113, true, 0, { r: 6 });
						}
					}
				if (boss.shot <= 0) boss.shot = 1.25;
			} else {
				if (cycle > 1.5 && cycle < 5.6 && boss.shot <= 0) {
					boss.shot = 0.9;
					for (let k = 0; k < 11; k++)
						this.shot(
							cx,
							cy + 26,
							Math.PI * 0.15 + k * Math.PI * 0.07,
							92,
							true,
							0,
							{ r: 4 },
						);
				}
				if (cycle < 1.5 && boss.shot <= 0) {
					boss.shot = 1;
					this.emit("coreWind", 0, cx, cy);
				}
			}
			if (
				boss.phase < 2 &&
				boss.phaseAge >= 18 &&
				boss.parts
					.filter((c) =>
						boss.phase === 0 ? c.index < 2 : c.index === 2 || c.index === 3,
					)
					.every((c) => c.hp <= 0)
			) {
				boss.phase++;
				boss.phaseAge = 0;
				boss.shot = 2;
				boss.wind = 0;
				boss.lanes = [];
				s.bossPhases.push(boss.phase);
				s.shots = s.shots.filter((b) => !b.foe);
				this.say(
					boss.phase === 1
						? "Batteries broken. The forks are opening. Pulse out of their pull."
						: "Core exposed! Read the volleys. Take the cooling window.",
					7,
				);
				this.emit("bossPhase", 0, cx, cy, boss.phase);
			}
			if (boss.parts[4].hp <= 0) boss.dead = true;
		}
		resolve() {
			const s = this.s;
			// One outcome per tick: base loss / complete wipe takes priority over a simultaneous final kill.
			if (s.act === 2 && s.base <= 0)
				return this.finish(false, "GROUND BASE LOST");
			const live = s.players.filter((p) => !p.gone);
			if (!live.length || !live.some((p) => p.hp > 0)) {
				if (s.act < 2) this.retreat(false, "WING OVERWHELMED");
				else this.finish(false, "ALL VIPERS LOST");
				return;
			}
			if (s.act === 1 && s.heat >= 100)
				return this.retreat(false, "HEAT OVERFLOW");
			if (s.boss?.dead) {
				this.addScore(6000 + Math.round(s.base) * 25);
				s.outcomes[2] = {
					held: true,
					reason: "SIEGE SHIP DESTROYED",
					score: 6000,
				};
				return this.finish(true, "SIEGE BROKEN");
			}
			const w = WAVES[s.wave];
			if (!w) return;
			const allSpawned = s.group >= w.groups.length,
				clear = s.enemies.every((e) => e.kind === "anchor");
			if (
				(s.waveTime >= w.min &&
					allSpawned &&
					(clear || s.waveKills >= w.goal)) ||
				s.waveTime >= w.deadline
			) {
				const held = s.waveKills >= Math.ceil(w.goal * 0.6);
				s.waveOutcomes.push({ wave: s.wave, held, kills: s.waveKills });
				this.addScore(held ? 500 : 100);
				if (s.act < 2 && WAVES[s.wave + 1]?.act !== s.act)
					this.retreat(
						held,
						held ? "CORRIDOR SECURED" : "EVACUATION UNDER FIRE",
					);
				else {
					this.freshField();
					this.waveStart(s.wave + 1);
				}
			}
		}
		finish(won, reason) {
			const s = this.s;
			if (s.result) return;
			s.result = {
				won: !!won,
				reason,
				score: Math.floor(s.score),
				rank: RANKS.find((r) => s.score >= r[0])[1],
				time: Math.round(s.activeTime),
				outcomes: s.outcomes.map((x) => ({ ...x })),
				modified: s.modified,
			};
			s.phase = "result";
			s.phaseTime = 0;
			s.shots = [];
			s.enemies = [];
			this.clearInput();
			this.emit(won ? "victory" : "defeat");
			this.say(
				won
					? "Fortress Command to Viper wing. The sky is ours. Come home."
					: "Fortress Command signing off. Remember the line.",
				12,
			);
		}
		jump(act, wave = 0, phase) {
			const s = this.s;
			s.modified = true;
			s.boss = null;
			s.result = null;
			this.enterAct(clamp(act | 0, 0, 2));
			s.phase = "play";
			s.phaseTime = 0;
			const indices = WAVES.map((w, i) => (w.act === s.act ? i : -1)).filter(
				(i) => i >= 0,
			);
			this.waveStart(indices[clamp(wave | 0, 0, indices.length - 1)]);
			if (phase !== undefined) {
				this.startBoss();
				s.boss.phase = clamp(phase | 0, 0, 2);
				s.bossPhases = [0, 1, 2].slice(0, s.boss.phase + 1);
				for (const c of s.boss.parts) if (c.index < s.boss.phase * 2) c.hp = 0;
			}
		}
		step(dt = DT) {
			const s = this.s;
			if (s.phase === "result" || s.phase === "ended") return;
			s.tick++;
			s.t += dt;
			for (const e of s.effects) e.t += dt;
			s.effects = s.effects.filter((e) => e.t < e.life);
			if (s.phase === "briefing") {
				if ((s.phaseTime -= dt) <= 0) {
					s.phase = "play";
					this.waveStart(s.wave);
				}
				return;
			}
			if (s.phase === "retreat") {
				if ((s.phaseTime -= dt) <= 0) {
					s.phase = "upgrade";
					s.phaseTime = s.demo ? 1 : 9;
					s.upgrades++;
					for (const p of s.players) p.choice = null;
					this.emit("intermission");
				}
				return;
			}
			if (s.phase === "upgrade") {
				s.phaseTime -= dt;
				const players = s.players.filter((p) => !p.gone);
				if (s.phaseTime <= 0 || players.every((p) => p.choice !== null)) {
					for (const p of players) if (p.choice === null) this.upgrade(p.id, 0);
					this.enterAct(s.act + 1);
				}
				return;
			}
			if (s.phase !== "play") return;
			s.activeTime += dt;
			s.waveTime += dt;
			if (s.t - s.lastKill > 7) {
				s.chain = 0;
				s.multiplier = 1;
			}
			if (s.act === 1 && s.heat < 100 && s.t - s.lastObjectiveHit > 3)
				s.heat = Math.max(
					0,
					s.heat -
						s.balance.cooling * (s.locks.filter((v) => !v).length / 4) * dt,
				);
			const w = WAVES[s.wave];
			if (w) {
				while (s.group < w.groups.length && s.waveTime >= w.groups[s.group].at)
					this.spawnGroup(w.groups[s.group++]);
			}
			this.stepPlayers(dt);
			this.stepEnemies(dt);
			this.stepBoss(dt);
			this.stepShots(dt);
			this.stepDrops(dt);
			this.resolve();
			if (s.activeTime >= s.limit && s.phase === "play")
				this.finish(false, "EVACUATION WINDOW CLOSED");
		}
		snapshot() {
			return JSON.parse(JSON.stringify(this.s));
		}
		restore(snapshot) {
			if (
				!snapshot ||
				snapshot.version !== 1 ||
				!Number.isInteger(snapshot.tick) ||
				!Array.isArray(snapshot.players)
			)
				throw Error("Invalid snapshot");
			this.s = JSON.parse(JSON.stringify(snapshot));
			this.clearInput();
		}
	}
	Object.assign(S, {
		World,
		clamp,
		dist,
		norm,
		aimAt,
		groundAim,
		segmentCircle,
		neutral,
	});
})(globalThis.Fortnight);
