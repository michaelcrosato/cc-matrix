(function (G) {
	"use strict";
	const SF = (G.SF = G.SF || {}),
		W = 960,
		H = 540,
		DT = 1 / 120,
		clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
		norm = (x, y) => {
			const n = Math.hypot(x, y);
			return n > 1e-6 ? [x / n, y / n] : [0, -1];
		};
	SF.BALANCE = [
		["thrust", "Thrust", 540, 200, 900, 20, "px/s²"],
		["drag", "Flight drag", 2.6, 1, 6, 0.1, "/s"],
		["laserDamage", "Laser damage", 12, 4, 30, 1, "hull"],
		["cadence", "Laser interval", 0.17, 0.08, 0.4, 0.01, "s"],
		["boostRecharge", "Boost recharge", 9, 2, 25, 1, "/s"],
		["pulseCooldown", "Pulse recharge", 9, 3, 18, 0.5, "s"],
		["aggression", "Enemy aggression", 1, 0.3, 2, 0.1, "×"],
		["gravity", "Gravity force", 115, 30, 260, 5, "px/s²"],
		["heatHit", "Heat per impact", 9, 3, 20, 1, "%"],
		["cooling", "Radiator cooling", 3, 1, 8, 0.25, "%/s"],
		["baseDamage", "Base impact", 7, 2, 18, 1, "%"],
	];
	SF.DEFAULTS = Object.fromEntries(SF.BALANCE.map((x) => [x[0], x[2]]));
	SF.ENEMIES = {
		hunter: { hp: 24, r: 14, score: 120 },
		bomber: { hp: 48, r: 22, score: 220 },
		scout: { hp: 24, r: 16, score: 150 },
		anchor: { hp: 36, r: 19, score: 250 },
		rammer: { hp: 24, r: 16, score: 160 },
		tractor: { hp: 60, r: 22, score: 260 },
		dive: { hp: 24, r: 14, score: 150 },
		relay: { hp: 84, r: 23, score: 400 },
	};
	const beats = [
		{
			name: "FIRST CONTACT",
			act: 0,
			goal: "Intercept the scouts. Keep moving and fire.",
			duration: 66,
			groups: [
				[2, "hunter", 3, "top"],
				[15, "hunter", 3, "left"],
				[31, "bomber", 2, "right"],
				[46, "hunter", 4, "top"],
			],
		},
		{
			name: "THE GRAVITY OF IT",
			act: 0,
			goal: "Break charged anchors for shared hull and energy.",
			duration: 66,
			groups: [
				[1, "scout", 1, "top"],
				[5, "anchor", 1, "top"],
				[10, "hunter", 3, "right"],
				[22, "bomber", 2, "left"],
				[34, "scout", 2, "top"],
				[47, "hunter", 4, "left"],
			],
		},
		{
			name: "BREACH THE SCREEN",
			act: 0,
			goal: "Destroy the escort relays. The siege ship is watching.",
			duration: 66,
			groups: [
				[1, "relay", 2, "top"],
				[5, "hunter", 3, "right"],
				[19, "bomber", 2, "top"],
				[32, "scout", 2, "left"],
				[48, "hunter", 4, "top"],
			],
		},
		{
			name: "KEEP YOUR COOL",
			act: 1,
			goal: "Intercept rammers. Radiators cool after two quiet seconds.",
			duration: 68,
			groups: [
				[2, "rammer", 3, "top"],
				[15, "rammer", 3, "left"],
				[29, "bomber", 2, "right"],
				[44, "rammer", 4, "top"],
				[56, "hunter", 2, "left"],
			],
		},
		{
			name: "BREAK THE TETHER",
			act: 1,
			goal: "Tractor locks disable radiators. Destroy their emitters.",
			duration: 68,
			groups: [
				[2, "tractor", 1, "left"],
				[15, "rammer", 3, "right"],
				[27, "tractor", 1, "right"],
				[38, "bomber", 2, "top"],
				[50, "scout", 1, "left"],
				[57, "rammer", 3, "top"],
			],
		},
		{
			name: "EVACUATION WINDOW",
			act: 1,
			goal: "Hold the heat below 100%. Destroy the shield relays.",
			duration: 68,
			groups: [
				[1, "relay", 2, "top"],
				[7, "tractor", 1, "left"],
				[18, "bomber", 2, "right"],
				[29, "rammer", 4, "top"],
				[43, "scout", 1, "left"],
				[53, "rammer", 4, "right"],
			],
		},
		{
			name: "GUNS ON THE GROUND",
			act: 2,
			goal: "Move horizontally. Aim upward. Cut a gap in the divers.",
			duration: 58,
			groups: [
				[2, "dive", 5, "top"],
				[14, "dive", 5, "top"],
				[27, "hunter", 3, "top"],
				[40, "dive", 5, "top"],
			],
		},
		{
			name: "HOLD THE LAST LINE",
			act: 2,
			goal: "Protect base integrity. The siege ship is descending.",
			duration: 58,
			groups: [
				[2, "bomber", 2, "top"],
				[12, "dive", 5, "top"],
				[24, "scout", 1, "top"],
				[34, "bomber", 2, "top"],
				[44, "dive", 5, "top"],
			],
		},
	];
	for (const w of beats) {
		w.duration += 12;
		w.groups.push([
			w.duration - 12,
			w.name.includes("GROUND") || w.name.includes("LAST LINE")
				? "dive"
				: w.name.includes("COOL") ||
						w.name.includes("TETHER") ||
						w.name.includes("EVACUATION")
					? "rammer"
					: "hunter",
			3,
			"top",
		]);
	}
	SF.ENCOUNTERS = beats;
	SF.validate = () => {
		const errors = [];
		for (const [i, w] of beats.entries()) {
			if (!Number.isInteger(w.act) || w.act < 0 || w.act > 2)
				errors.push("Invalid act " + i);
			if (!(w.duration > 0) || !w.groups.length) errors.push("Empty wave " + i);
			for (const [at, type, n, edge] of w.groups)
				if (
					!SF.ENEMIES[type] ||
					at < 0 ||
					at > w.duration ||
					n < 1 ||
					!["left", "right", "top"].includes(edge)
				)
					errors.push("Invalid group " + i);
		}
		return errors;
	};
	const radPos = [
		[400, 220],
		[560, 220],
		[400, 320],
		[560, 320],
	];
	function segDist(x, y, ax, ay, bx, by) {
		const dx = bx - ax,
			dy = by - ay,
			u = clamp(
				((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1),
				0,
				1,
			);
		return Math.hypot(x - ax - dx * u, y - ay - dy * u);
	}
	SF.segDist = segDist;
	class World {
		constructor(o = {}) {
			this.balance = { ...SF.DEFAULTS };
			this.s = {
				balance: this.balance,
				v: 1,
				epoch: o.epoch || 1,
				seed: (o.seed || 1981) >>> 0,
				rng: (o.seed || 1981) >>> 0,
				tick: 0,
				time: 0,
				state: "briefing",
				act: 0,
				wave: 0,
				actTime: 0,
				waveTime: 0,
				timer: 4,
				spawnIndex: 0,
				nextId: 10,
				eventSeq: 0,
				score: 0,
				combo: 1,
				comboTimer: 0,
				kills: 0,
				modified: false,
				invulnerable: false,
				attract: !!o.attract,
				limitMs: o.limitMs || 780000,
				notice: "VIPERS. THE NIGHT SHIFT IS OURS.",
				noticeTime: 5,
				introduced: [],
				outcomes: [],
				objective: {
					heat: 0,
					integrity: 100,
					lastHit: -10,
					radiators: [true, true, true, true],
				},
				boss: null,
				result: null,
				enemies: [],
				shots: [],
				pickups: [],
				events: [],
				players: (
					o.players || [{ id: 0, name: "VIPER 1", seat: 0, color: "#6ce6ff" }]
				).map((p, i) => ({
					...p,
					seat: i,
					x: 360 + i * 75,
					y: 390,
					vx: 0,
					vy: 0,
					angle: -Math.PI / 2,
					hp: 12,
					maxHp: 12,
					energy: 100,
					pulse: 0,
					pulseFX: 0,
					fireCd: 0,
					boostT: 0,
					invuln: 3,
					respawn: 0,
					upgrades: [0, 0, 0],
					flash: 0,
					lock: 0,
					active: true,
					lastSeq: -1,
					choice: -1,
					deaths: 0,
				})),
			};
		}
		random() {
			let x = this.s.rng;
			x ^= x << 13;
			x ^= x >>> 17;
			x ^= x << 5;
			this.s.rng = x >>> 0;
			return (x >>> 0) / 4294967296;
		}
		emit(kind, x = 480, y = 270, text = "", owner = -1) {
			const s = this.s;
			s.events.push({ id: ++s.eventSeq, kind, x, y, text, owner });
			if (s.events.length > 24) s.events.shift();
		}
		notice(text) {
			this.s.notice = text;
			this.s.noticeTime = 5;
			this.emit("radio", 480, 270, text);
		}
		spawn(type, x, y, o = {}) {
			const s = this.s,
				d = SF.ENEMIES[type];
			if (!d || s.enemies.length >= 22) return null;
			let tries = 0;
			while (
				s.players.some((p) => p.hp > 0 && Math.hypot(p.x - x, p.y - y) < 110) &&
				tries++ < 5
			) {
				x = 80 + this.random() * 800;
				y = 85 + this.random() * 100;
			}
			const e = {
				id: s.nextId++,
				type,
				x,
				y,
				vx: 0,
				vy: 0,
				hp: d.hp * (1 + 0.35 * (s.players.filter((p) => p.active).length - 1)),
				maxHp:
					d.hp * (1 + 0.35 * (s.players.filter((p) => p.active).length - 1)),
				r: d.r,
				t: 0,
				telegraph: 1.2,
				cycle: 0,
				phase: 0,
				tx: 480,
				ty: s.act === 2 ? 490 : 270,
				lock: -1,
				...o,
			};
			s.enemies.push(e);
			if (!s.introduced.includes(type)) {
				s.introduced.push(type);
				const intro = {
					hunter: "HUNTERS AIM, THEN FIRE. CUT ACROSS THE LINE.",
					bomber: "BOMB BAYS OPEN. LEAVE THE MARKED LANE.",
					scout: "GRAVITY CARRIER. BREAK ITS ANCHOR FOR CHARGE.",
					anchor: "ANCHOR CHARGING. BOOST ACROSS THE PULL.",
					rammer: "RAMMERS INBOUND. KEEP THEM OFF THE FORT.",
					tractor: "TRACTOR ACQUIRING. PULSE OR BREAK THE EMITTER.",
					dive: "DIVE FORMATION. CUT YOURSELF A GAP.",
					relay: "SHIELD RELAYS EXPOSED. TAKE THEM APART.",
				};
				this.notice(intro[type]);
			}
			return e;
		}
		shoot(x, y, ax, ay, owner, damage, speed = 700, r = 3) {
			const s = this.s;
			if (s.shots.length >= 140) return;
			const [dx, dy] = norm(ax, ay);
			s.shots.push({
				id: s.nextId++,
				x,
				y,
				px: x,
				py: y,
				vx: dx * speed,
				vy: dy * speed,
				life: 2.5,
				owner,
				damage,
				r,
			});
		}
		damagePlayer(p, n) {
			const s = this.s;
			if (s.invulnerable || p.hp <= 0 || p.invuln > 0 || !p.active) return;
			p.hp = Math.max(0, p.hp - n);
			p.invuln = 1.15;
			p.flash = 0.2;
			s.combo = 1;
			s.comboTimer = 0;
			this.emit("damage", p.x, p.y, "", p.id);
			if (p.hp === 0) {
				p.respawn = 4;
				p.deaths++;
				s.score = Math.max(0, s.score - 300);
				this.emit("kill", p.x, p.y, "VIPER DOWN", p.id);
			}
		}
		objectiveHit(n = 1) {
			const s = this.s;
			if (s.act === 0) return;
			s.objective.lastHit = s.time;
			if (s.act === 1)
				s.objective.heat = clamp(
					s.objective.heat + this.balance.heatHit * n,
					0,
					100,
				);
			else
				s.objective.integrity = Math.max(
					0,
					s.objective.integrity - this.balance.baseDamage * n,
				);
			this.emit("warning", 480, s.act === 2 ? 490 : 270);
		}
		kill(e) {
			if (e.hp <= -999) return;
			const s = this.s;
			e.hp = -999;
			s.kills++;
			s.combo = clamp(s.combo + 0.12, 1, 4);
			s.comboTimer = 5;
			s.score += Math.round(SF.ENEMIES[e.type].score * s.combo);
			this.emit("kill", e.x, e.y, e.type);
			if (e.type === "anchor" || s.kills % 3 === 0)
				s.pickups.push({ id: s.nextId++, x: e.x, y: e.y, t: 0 });
			if (e.type === "relay") s.score += 200;
		}
		beginPlay() {
			const s = this.s;
			s.state = "play";
			s.timer = 0;
			s.waveTime = 0;
			s.spawnIndex = 0;
			this.notice(
				beats[this.beatIndex()]?.goal ||
					"SIEGE SHIP IN RANGE. BREAK THE EXPOSED COMPONENTS.",
			);
		}
		actBeats() {
			return beats.filter((w) => w.act === this.s.act);
		}
		beatIndex() {
			return beats.indexOf(this.actBeats()[this.s.wave]);
		}
		retreat(success) {
			const s = this.s;
			if (s.state !== "play") return;
			s.outcomes.push({ act: s.act, held: success });
			s.score += success ? 1000 : 0;
			if (!success) {
				s.score = Math.max(0, s.score - 500);
				s.combo = 1;
				s.objective.integrity = Math.max(35, s.objective.integrity - 22);
			}
			s.state = "transition";
			s.timer = 4;
			s.enemies = [];
			s.shots = [];
			s.pickups = [];
			s.boss = null;
			s.pendingAct = s.act + 1;
			this.notice(
				success
					? "LINE HELD. FALL BACK BY THE NUMBERS."
					: "LINE OVERRUN. EMERGENCY EXTRACTION!",
			);
			for (const p of s.players) {
				p.invuln = 9;
				p.vx = 0;
				p.vy = 0;
				p.hp = p.maxHp;
				p.respawn = 0;
				p.choice = -1;
			}
		}
		nextAct() {
			const s = this.s;
			s.act = s.pendingAct;
			s.wave = 0;
			s.actTime = 0;
			s.waveTime = 0;
			s.spawnIndex = 0;
			s.boss = null;
			s.objective.heat = 0;
			s.objective.radiators = [true, true, true, true];
			s.state = "upgrade";
			s.timer = 12;
			for (const [i, p] of s.players.entries()) {
				p.x = 300 + i * 100;
				p.y = s.act === 2 ? 465 : 390;
				p.angle = -Math.PI / 2;
				p.invuln = 5;
				p.energy = 100;
				p.pulse = 0;
				p.choice = -1;
			}
			this.notice(
				s.act === 1
					? "FORTRESS 13. HEAT RISES. RADIATORS BUY US TIME."
					: "GROUND LINE. VIPERS DOCKED. THIS FAR, NO FURTHER.",
			);
		}
		choose(id, n) {
			const p = this.s.players.find((p) => p.id === id);
			if (
				this.s.state !== "upgrade" ||
				!p ||
				p.choice >= 0 ||
				!Number.isInteger(n) ||
				n < 0 ||
				n > 2
			)
				return false;
			p.choice = n;
			p.upgrades[n]++;
			this.emit(
				"pickup",
				p.x,
				p.y,
				["FOCUSED LASER", "LONG BOOST", "RAPID PULSE"][n],
				id,
			);
			return true;
		}
		finish(won, reason) {
			const s = this.s;
			if (s.result) return;
			s.state = "result";
			const score = Math.round(s.score),
				rank =
					score >= 22000
						? "STAR MARSHAL"
						: score >= 14000
							? "COMMANDER"
							: score >= 7000
								? "CAPTAIN"
								: score >= 2500
									? "LIEUTENANT"
									: "CADET";
			s.result = { won, reason, rank, score };
			s.shots = [];
			s.enemies = [];
			this.notice(
				won
					? "DAWN IS OURS. FORTRESS 13 STILL STANDS."
					: "SIGNAL LOST. THE NIGHT REMEMBERS.",
			);
			this.emit(won ? "win" : "lose", 480, 270);
		}
		startBoss() {
			const s = this.s;
			s.wave = this.actBeats().length;
			s.waveTime = 0;
			s.enemies = [];
			s.shots = [];
			s.boss = {
				phase: 0,
				hp: 420,
				maxHp: 420,
				x: 480,
				y: 140,
				cycle: 0,
				components: [],
			};
			this.bossParts();
			this.notice("SIEGE SHIP: NIGHTJAR. BREAK THE SIDE BATTERIES.");
		}
		bossParts() {
			const b = this.s.boss,
				m = 1 + 0.5 * (this.s.players.filter((p) => p.active).length - 1);
			b.components = (
				b.phase === 0
					? [
							[-100, "battery"],
							[100, "battery"],
						]
					: b.phase === 1
						? [
								[-70, "emitter"],
								[70, "emitter"],
							]
						: [[0, "core"]]
			).map(([off, type], i) => ({
				id: 9000 + b.phase * 10 + i,
				x: b.x + off,
				y: b.y + 30,
				hp: (b.phase === 2 ? 220 : 140) * m,
				maxHp: (b.phase === 2 ? 220 : 140) * m,
				open: true,
				type,
				off,
			}));
			b.hp = b.components.reduce((a, c) => a + c.hp, 0);
			b.maxHp = b.hp;
			b.cycle = 0;
		}
		step(dt, intents = {}) {
			const s = this.s;
			if (s.result) return;
			s.tick++;
			s.time += dt;
			s.timer = Math.max(0, s.timer - dt);
			s.noticeTime = Math.max(0, s.noticeTime - dt);
			for (const p of s.players) {
				p.flash = Math.max(0, p.flash - dt);
				p.pulseFX = Math.max(0, p.pulseFX - dt);
			}
			if (s.state === "briefing") {
				if (!s.timer) this.beginPlay();
				return;
			}
			if (s.state === "transition") {
				if (!s.timer) this.nextAct();
				return;
			}
			if (s.state === "upgrade") {
				for (const p of s.players) {
					const i = intents[p.id] || intents[p.seat];
					if (i && Number.isInteger(i.choice)) this.choose(p.id, i.choice);
				}
				if (!s.timer)
					for (const p of s.players)
						if (p.active && p.choice < 0) this.choose(p.id, 0);
				if (s.players.filter((p) => p.active).every((p) => p.choice >= 0)) {
					s.state = "briefing";
					s.timer = 4;
				}
				return;
			}
			if (s.state !== "play") return;
			s.actTime += dt;
			s.waveTime += dt;
			s.comboTimer -= dt;
			if (s.comboTimer <= 0) s.combo = 1;
			const living = s.players.filter((p) => p.active && p.hp > 0);
			if (!living.length) {
				if (s.act < 2) this.retreat(false);
				else this.finish(false, "ALL VIPERS LOST");
				return;
			}
			for (const p of s.players) {
				if (!p.active) continue;
				if (p.hp <= 0) {
					p.respawn -= dt;
					if (p.respawn <= 0) {
						p.hp = p.maxHp;
						p.x = 480;
						p.y = s.act === 2 ? 465 : 400;
						p.invuln = 3;
						p.energy = 100;
						this.emit("pickup", p.x, p.y, "REDEPLOY", p.id);
					}
					continue;
				}
				const i = intents[p.id] || intents[p.seat] || {},
					b = this.balance;
				p.lastSeq = Number.isFinite(i.seq) ? i.seq : p.lastSeq;
				let mx = clamp(+i.mx || 0, -1, 1),
					my = s.act === 2 ? 0 : clamp(+i.my || 0, -1, 1),
					ax = +i.ax || 0,
					ay = +i.ay || 0;
				if (Math.hypot(ax, ay) > 0.1) {
					if (s.act === 2) ay = Math.min(-0.2, ay);
					p.angle = Math.atan2(ay, ax);
				}
				p.fireCd = Math.max(0, p.fireCd - dt);
				p.invuln = Math.max(0, p.invuln - dt);
				p.pulse = Math.max(0, p.pulse - dt);
				p.boostT = Math.max(0, p.boostT - dt);
				p.lock = Math.max(0, p.lock - dt);
				p.energy = Math.min(
					100 + p.upgrades[1] * 35,
					p.energy + b.boostRecharge * dt,
				);
				if (i.boost && p.energy >= 26 && p.boostT === 0) {
					const d =
						s.act === 2
							? [
									Math.sign(
										mx ||
											p.vx ||
											(Math.abs(Math.cos(p.angle)) > 0.1
												? Math.cos(p.angle)
												: 1),
									),
									0,
								]
							: Math.hypot(mx, my) > 0.1
								? norm(mx, my)
								: [Math.cos(p.angle), Math.sin(p.angle)];
					p.vx = d[0] * 470;
					p.vy = s.act === 2 ? 0 : d[1] * 470;
					p.energy -= 26;
					p.boostT = 0.28;
					p.invuln = Math.max(p.invuln, 0.28);
					this.emit("boost", p.x, p.y, "", p.id);
				}
				if (i.pulse && p.pulse === 0) {
					p.pulse = b.pulseCooldown / (1 + p.upgrades[2] * 0.28);
					p.pulseFX = 0.55;
					p.lock = 0;
					p.invuln = Math.max(p.invuln, 0.55);
					s.shots = s.shots.filter(
						(q) => q.owner !== -1 || Math.hypot(q.x - p.x, q.y - p.y) > 125,
					);
					for (const e of s.enemies)
						if (Math.hypot(e.x - p.x, e.y - p.y) < 145) {
							const d = norm(e.x - p.x, e.y - p.y);
							e.x += d[0] * 35;
							e.y += d[1] * 35;
							e.lock = -1;
							e.cycle = -1;
						}
					this.emit("pulse", p.x, p.y, "", p.id);
				}
				if (p.boostT === 0) {
					p.vx += mx * b.thrust * dt;
					p.vy += my * b.thrust * dt;
					const drag = Math.exp(-b.drag * dt);
					p.vx *= drag;
					p.vy *= drag;
				}
				p.x = clamp(p.x + p.vx * dt, 28, 932);
				p.y = s.act === 2 ? 465 : clamp(p.y + p.vy * dt, 82, 470);
				if (s.act === 1 && Math.hypot(p.x - 480, p.y - 270) < 72) {
					const d = norm(p.x - 480, p.y - 270);
					p.x = 480 + d[0] * 73;
					p.y = 270 + d[1] * 73;
				}
				if (i.fire && p.fireCd === 0) {
					p.fireCd = b.cadence / (1 + p.upgrades[0] * 0.12);
					this.shoot(
						p.x + Math.cos(p.angle) * 15,
						p.y + Math.sin(p.angle) * 15,
						Math.cos(p.angle),
						Math.sin(p.angle),
						p.id,
						b.laserDamage * (1 + 0.3 * p.upgrades[0]),
					);
					this.emit("shot", p.x, p.y, "", p.id);
				}
			}
			const w = beats[this.beatIndex()];
			let pendingWave = false;
			if (!s.boss && w) {
				while (
					s.spawnIndex < w.groups.length &&
					s.waveTime >= w.groups[s.spawnIndex][0]
				) {
					const [at, type, count, edge] = w.groups[s.spawnIndex++];
					for (let j = 0; j < count; j++) {
						const x =
								edge === "left"
									? 36
									: edge === "right"
										? 924
										: 120 + ((j + 1) * 720) / (count + 1),
							y = edge === "top" ? 75 : 100 + ((j + 1) * 270) / (count + 1);
						this.spawn(type, x, type === "anchor" ? 250 : y);
					}
				}
				// Clearly bounded waves; pressure keeps evacuation windows active.
				if (
					s.waveTime > w.duration - 1 &&
					s.enemies.every((e) => e.type !== "relay")
				)
					pendingWave = true;
				else if (s.waveTime > w.duration + 16) pendingWave = true;
			}
			if (s.state !== "play") return;
			s.objective.radiators = [true, true, true, true];
			for (const e of [...s.enemies]) this.enemyStep(e, dt);
			s.enemies = s.enemies.filter((e) => e.hp > 0 && e.t < 34);
			if (s.boss) this.bossStep(dt);
			for (const q of s.shots) {
				q.px = q.x;
				q.py = q.y;
				q.x += q.vx * dt;
				q.y += q.vy * dt;
				q.life -= dt;
				if (q.x < -20 || q.x > 980 || q.y < 50 || q.y > 510) q.life = 0;
				if (q.owner !== -1) {
					let targets = s.enemies
						.filter((e) => e.hp > 0 && e.telegraph <= 0)
						.map((e) => ({ obj: e, kind: "enemy" }));
					if (s.boss)
						targets.push(
							...s.boss.components
								.filter((c) => c.hp > 0 && c.open)
								.map((c) => ({
									obj: { ...c, r: 24 },
									original: c,
									kind: "boss",
								})),
						);
					targets.sort((a, b) => a.obj.id - b.obj.id);
					for (const t of targets) {
						const e = t.obj;
						if (segDist(e.x, e.y, q.px, q.py, q.x, q.y) < e.r + q.r) {
							q.life = 0;
							const real = t.original || e;
							real.hp -= q.damage;
							this.emit("hit", e.x, e.y);
							if (t.kind === "enemy" && real.hp <= 0) this.kill(real);
							else if (real.hp <= 0)
								this.emit("kill", e.x, e.y, "COMPONENT DESTROYED");
							break;
						}
					}
				} else {
					for (const p of s.players)
						if (
							p.active &&
							p.hp > 0 &&
							segDist(p.x, p.y, q.px, q.py, q.x, q.y) < 10 + q.r
						) {
							q.life = 0;
							this.damagePlayer(p, q.damage);
							break;
						}
					if (
						q.life > 0 &&
						s.act === 1 &&
						segDist(480, 270, q.px, q.py, q.x, q.y) < 58
					) {
						q.life = 0;
						this.objectiveHit(0.55);
					}
					if (q.life > 0 && s.act === 2 && q.y >= 485) {
						q.life = 0;
						this.objectiveHit(0.35);
					}
				}
			}
			s.shots = s.shots.filter((q) => q.life > 0);
			for (const c of s.pickups) {
				c.t += dt;
				const p = s.players
					.filter((p) => p.active && p.hp > 0)
					.sort(
						(a, b) =>
							Math.hypot(a.x - c.x, a.y - c.y) -
							Math.hypot(b.x - c.x, b.y - c.y),
					)[0];
				if (p) {
					const d = norm(p.x - c.x, p.y - c.y);
					c.x += d[0] * 100 * dt;
					c.y += d[1] * 100 * dt;
					if (Math.hypot(p.x - c.x, p.y - c.y) < 28) {
						c.t = 99;
						for (const a of s.players)
							if (a.active && a.hp > 0) {
								a.energy = Math.min(100 + a.upgrades[1] * 35, a.energy + 25);
								a.hp = Math.min(a.maxHp, a.hp + 1.2);
							}
						this.emit("pickup", c.x, c.y, "TEAM CHARGE");
					}
				}
			}
			s.pickups = s.pickups.filter((c) => c.t < 16);
			if (s.act === 1 && s.time - s.objective.lastHit > 2)
				s.objective.heat = Math.max(
					0,
					s.objective.heat -
						((this.balance.cooling *
							s.objective.radiators.filter(Boolean).length) /
							4) *
							dt,
				);
			// Resolution priority: wipe and objective failure always precede boss death or wave victory.
			if (!s.players.some((p) => p.active && p.hp > 0)) {
				if (s.act < 2) this.retreat(false);
				else this.finish(false, "ALL VIPERS LOST");
				return;
			}
			if (s.act === 1 && s.objective.heat >= 100) {
				this.retreat(false);
				return;
			}
			if (s.act === 2 && s.objective.integrity <= 0) {
				this.finish(false, "BASE DESTROYED");
				return;
			}
			if (s.boss && s.boss.components.every((c) => c.hp <= 0)) {
				if (s.boss.phase < 2) {
					s.boss.phase++;
					this.bossParts();
					s.shots = [];
					this.notice(
						s.boss.phase === 1
							? "TRACTOR EMITTERS OPEN. PULSE FREE AND RETURN FIRE."
							: "CORE EXPOSED. FIRE THROUGH ITS COOLING WINDOWS.",
					);
				} else {
					s.outcomes.push({ act: 2, held: true });
					s.score += 3000 + Math.round(s.objective.integrity * 20);
					this.finish(true, "SIEGE BROKEN");
				}
			}
			if (pendingWave && s.state === "play" && !s.result) this.advanceWave();
			if (s.time * 1000 > s.limitMs - 5000)
				this.finish(false, "EVACUATION WINDOW CLOSED");
		}
		advanceWave() {
			const s = this.s;
			if (s.act < 2 && s.wave === this.actBeats().length - 1) {
				this.retreat(true);
				return;
			}
			if (s.act === 2 && s.wave === this.actBeats().length - 1) {
				this.startBoss();
				return;
			}
			s.wave++;
			s.waveTime = 0;
			s.spawnIndex = 0;
			for (const e of s.enemies) e.t = Math.max(e.t, 26);
			this.notice(beats[this.beatIndex()].goal);
		}
		enemyStep(e, dt) {
			const s = this.s;
			e.t += dt;
			e.telegraph = Math.max(0, e.telegraph - dt);
			if (e.telegraph > 0 || e.hp <= 0) return;
			const p = s.players
				.filter((p) => p.active && p.hp > 0)
				.sort(
					(a, b) =>
						Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y),
				)[0];
			if (!p) return;
			const ag = this.balance.aggression,
				ground = s.act === 2;
			e.cycle += dt * ag;
			if (e.type === "anchor") {
				if (e.t < 3.6) return;
				const radius = 155;
				for (const a of s.players)
					if (a.active && a.hp > 0) {
						const d = Math.hypot(a.x - e.x, a.y - e.y);
						if (d < radius && d > 15) {
							a.vx += ((e.x - a.x) / d) * this.balance.gravity * dt;
							a.vy += ground
								? 0
								: ((e.y - a.y) / d) * this.balance.gravity * dt;
							if (d < 31) this.damagePlayer(a, 1);
						}
					}
				if (e.t > 15) e.hp = 0;
				return;
			}
			if (e.type === "relay") {
				e.x += Math.sin(e.t * 0.8 + e.id) * 10 * dt;
				if (e.cycle > 3.4) {
					e.cycle = 0;
					this.shoot(e.x, e.y, p.x - e.x, p.y - e.y, -1, 1, 120);
				}
				return;
			}
			if (e.type === "scout") {
				e.y += Math.sin(e.t) * 18 * dt;
				e.x += Math.sin(e.id + e.t * 0.6) * 36 * dt;
				if (
					e.cycle > 4.8 &&
					s.enemies.filter((x) => x.type === "anchor").length < 3
				) {
					e.cycle = 0;
					this.spawn("anchor", e.x, ground ? 280 : Math.min(390, e.y + 65), {
						telegraph: 1.5,
					});
					this.emit("gravity", e.x, e.y);
				}
			} else if (e.type === "rammer" || e.type === "dive") {
				if (e.t < 2.5) {
					e.tx = ground ? clamp(p.x + ((e.id % 3) - 1) * 75, 70, 890) : 480;
					e.ty = ground ? 490 : 270;
				} else {
					const d = norm(e.tx - e.x, e.ty - e.y),
						speed = e.type === "dive" ? 105 : 70;
					e.x += d[0] * speed * dt * ag;
					e.y += d[1] * speed * dt * ag;
					if (Math.hypot(e.tx - e.x, e.ty - e.y) < 20) {
						this.objectiveHit(e.type === "rammer" ? 1 : 0.6);
						e.hp = 0;
						this.emit("kill", e.x, e.y);
					}
					if (Math.hypot(e.x - p.x, e.y - p.y) < 25) {
						this.damagePlayer(p, 2);
						e.hp = 0;
					}
				}
			} else if (e.type === "tractor") {
				const ri = e.id % 4,
					rp = radPos[ri],
					target = s.act === 1 ? { x: rp[0], y: rp[1] } : p;
				e.tx = target.x;
				e.ty = target.y;
				e.lock = e.cycle > 2 ? ri : -1;
				if (e.cycle > 2 && e.cycle < 5) {
					if (s.act === 1) s.objective.radiators[ri] = false;
					for (const a of s.players) {
						const d = Math.hypot(e.x - a.x, e.y - a.y);
						if (a.hp > 0 && d < 260 && a.pulseFX <= 0) {
							a.lock = 0.15;
							a.vx += ((e.x - a.x) / Math.max(1, d)) * 90 * dt;
							a.vy += ground ? 0 : ((e.y - a.y) / Math.max(1, d)) * 90 * dt;
						}
					}
				}
				if (e.cycle > 5.8) {
					e.cycle = 0;
					this.shoot(e.x, e.y, p.x - e.x, p.y - e.y, -1, 1, 145);
					this.emit("tractor", e.x, e.y);
				}
			} else if (e.type === "bomber") {
				e.tx = e.x;
				e.ty = ground ? 490 : 270;
				if (e.cycle > 4.8) {
					e.cycle = 0;
					for (const dx of [-14, 0, 14])
						this.shoot(
							e.x + dx,
							e.y,
							ground ? 0 : 480 - e.x,
							ground ? 1 : 270 - e.y,
							-1,
							1,
							ground ? 125 : 110,
							5,
						);
				}
				e.x += Math.sin(e.t * 0.5 + e.id) * 26 * dt;
			} else {
				if (e.y < 115) e.y += 22 * dt;
				e.x = clamp(e.x + Math.sin(e.t * 0.7 + e.id) * 32 * dt, 35, 925);
				e.tx = p.x;
				e.ty = p.y;
				if (e.cycle > 3.4) {
					e.cycle = 0;
					this.shoot(e.x, e.y, p.x - e.x, p.y - e.y, -1, 1, 145 * ag);
				}
			}
		}
		bossStep(dt) {
			const s = this.s,
				b = s.boss;
			b.cycle += dt;
			b.x = 480 + Math.sin(s.waveTime * 0.32) * 145;
			for (const c of b.components) {
				c.x = b.x + c.off;
				c.y = b.y + 30;
				c.open = b.phase !== 2 || b.cycle % 5 > 1.4;
			}
			b.hp = b.components.reduce((a, c) => a + Math.max(0, c.hp), 0);
			const t = b.cycle % (b.phase === 2 ? 5 : 6);
			if (b.phase === 0 && t > 2 && t < 2 + dt * 1.1)
				for (const c of b.components.filter((c) => c.hp > 0))
					for (const dx of [-28, 0, 28])
						this.shoot(c.x + dx, c.y, 0, 1, -1, 1, 155, 4);
			if (b.phase === 1 && t > 1.5 && t < 4.5)
				for (const p of s.players)
					if (p.hp > 0 && p.pulseFX <= 0) {
						p.lock = 0.15;
						p.vx += clamp(b.x - p.x, -150, 150) * dt;
					}
			if (b.phase === 1 && t > 4.5 && t < 4.5 + dt * 1.1)
				for (const c of b.components.filter((c) => c.hp > 0)) {
					const p = s.players.find((p) => p.hp > 0);
					if (p) this.shoot(c.x, c.y, p.x - c.x, p.y - c.y, -1, 1, 150);
				}
			if (b.phase === 2 && t > 1.3 && t < 1.3 + dt * 1.1)
				for (let k = -3; k <= 3; k++)
					this.shoot(b.x, b.y + 30, k * 0.24, 1, -1, 1, 145, 4);
			if (Math.floor(s.waveTime / 18) > Math.floor((s.waveTime - dt) / 18))
				this.spawn(
					b.phase === 1 ? "scout" : "dive",
					160 + this.random() * 640,
					80,
				);
		}
		bot(p) {
			const s = this.s;
			if (s.state === "upgrade") return { id: p.id, choice: 0 };
			let targets = s.enemies.filter((e) => e.hp > 0 && e.telegraph <= 0);
			if (s.boss)
				targets = [
					...targets,
					...s.boss.components
						.filter((c) => c.hp > 0 && c.open)
						.map((c) => ({ ...c, type: "boss", r: 24 })),
				];
			targets.sort((a, b) => {
				const pr = (e) =>
					e.type === "rammer"
						? 0
						: e.type === "anchor"
							? 1
							: e.type === "tractor"
								? 2
								: e.type === "boss"
									? 3
									: 4;
				return (
					pr(a) - pr(b) ||
					Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)
				);
			});
			const e = targets[0];
			let mx = 0,
				my = 0;
			const tx =
					s.act === 2
						? e
							? e.x
							: 480
						: 480 + Math.sin(s.time * 0.42 + p.seat) * 230,
				ty = s.act === 2 ? 465 : 390 + Math.sin(s.time * 0.6) * 50;
			mx = clamp((tx - p.x) / 60, -1, 1);
			my = clamp((ty - p.y) / 60, -1, 1);
			for (const q of s.shots)
				if (q.owner === -1) {
					const d = Math.hypot(q.x - p.x, q.y - p.y);
					if (d < 85) {
						mx += Math.sign(p.x - q.x) * 1.8;
						my += Math.sign(p.y - q.y) * 1.2;
					}
				}
			const dx = e ? e.x - p.x : 0,
				dy = e ? e.y - p.y : -1,
				danger =
					s.shots.some(
						(q) => q.owner === -1 && Math.hypot(q.x - p.x, q.y - p.y) < 95,
					) ||
					p.lock > 0 ||
					s.enemies.some(
						(e) =>
							e.type === "anchor" && Math.hypot(e.x - p.x, e.y - p.y) < 125,
					);
			return {
				id: p.id,
				seq: s.tick,
				mx: clamp(mx, -1, 1),
				my: clamp(my, -1, 1),
				ax: dx,
				ay: dy,
				fire: !!e,
				pulse: danger,
				boost: danger && p.pulse > 1 && p.energy > 40,
			};
		}
		snapshot() {
			return JSON.parse(JSON.stringify(this.s));
		}
		restore(v) {
			if (!v || v.v !== 1 || !Array.isArray(v.players)) return false;
			this.s = JSON.parse(JSON.stringify(v));
			this.balance = { ...SF.DEFAULTS, ...this.s.balance };
			this.s.balance = this.balance;
			return true;
		}
		dev(action, value) {
			const s = this.s;
			s.modified = true;
			if (action === "refill")
				for (const p of s.players) {
					p.hp = p.maxHp;
					p.energy = 100;
					p.pulse = 0;
					p.invuln = 3;
					p.respawn = 0;
				}
			else if (action === "invulnerable") {
				s.invulnerable = !!value;
				for (const p of s.players) p.invuln = value ? 1e8 : 0;
			} else if (action === "act") {
				s.act = clamp(Math.floor(value), 0, 2);
				s.wave = 0;
				s.waveTime = 0;
				s.actTime = 0;
				s.spawnIndex = 0;
				s.state = "briefing";
				s.timer = 1;
				s.enemies = [];
				s.shots = [];
				s.pickups = [];
				s.boss = null;
				s.objective.heat = 0;
				s.objective.integrity = 100;
				s.result = null;
				for (const p of s.players) {
					p.hp = p.maxHp;
					p.y = s.act === 2 ? 465 : 390;
				}
			} else if (action === "wave") {
				s.wave = clamp(Math.floor(value), 0, this.actBeats().length - 1);
				s.waveTime = 0;
				s.spawnIndex = 0;
				s.enemies = [];
				s.shots = [];
				s.boss = null;
				s.state = "play";
				s.result = null;
			} else if (action === "boss") {
				s.act = 2;
				s.state = "play";
				s.result = null;
				this.startBoss();
				s.boss.phase = clamp(Math.floor(value), 0, 2);
				this.bossParts();
				for (const p of s.players) p.y = 465;
			} else if (action === "spawn" && SF.ENEMIES[value])
				this.spawn(value, 480, 90);
			else if (action === "resetBalance") {
				this.balance = { ...SF.DEFAULTS };
				s.balance = this.balance;
			} else if (action in this.balance) {
				const row = SF.BALANCE.find((r) => r[0] === action);
				if (Number.isFinite(+value))
					this.balance[action] = clamp(+value, row[3], row[4]);
			}
		}
	}
	SF.World = World;
	SF.W = W;
	SF.H = H;
	SF.DT = DT;
})(globalThis);
