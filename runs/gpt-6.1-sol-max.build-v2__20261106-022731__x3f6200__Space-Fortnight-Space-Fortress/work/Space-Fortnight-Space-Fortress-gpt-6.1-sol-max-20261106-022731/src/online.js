(function (S) {
	"use strict";
	const PLAYER_FIELDS =
		"id x y vx vy a hp maxHp energy maxEnergy pulse boost boostCool cool inv dead gone seq kills damage choice thrust recoil pulseFx hit".split(
			" ",
		);
	const ENEMY_FIELDS =
		"id kind x y homeX homeY vx vy hp maxHp r age tele cycle wind cool a target lock hit dead lane launched seed charge".split(
			" ",
		);
	const SHOT_FIELDS =
		"id x y px py vx vy life r foe owner dmg bomb obj lane".split(" ");
	const DROP_FIELDS = "id x y t life charge r".split(" ");
	const EFFECT_FIELDS = "id kind x y t life size".split(" ");
	const pack = (o, keys) => keys.map((k) => o[k] ?? null),
		unpack = (v, keys) => Object.fromEntries(keys.map((k, i) => [k, v[i]]));
	const quantize = (k, v) =>
		typeof v === "number" ? Math.round(v * 10000) / 10000 : v;
	function encode(s) {
		const full = {
			...s,
			events: s.events.slice(-12),
			players: s.players.map((p) => [
				pack(p, PLAYER_FIELDS),
				p.name,
				p.color,
				p.upgrades,
			]),
			enemies: s.enemies.map((e) => pack(e, ENEMY_FIELDS)),
			shots: s.shots.map((e) => pack(e, SHOT_FIELDS)),
			drops: s.drops.map((e) => pack(e, DROP_FIELDS)),
			effects: s.effects.map((e) => pack(e, EFFECT_FIELDS)),
		};
		return JSON.stringify(full, quantize);
	}
	function decode(text) {
		const s = JSON.parse(text);
		s.players = s.players.map(([v, name, color, upgrades]) => ({
			...unpack(v, PLAYER_FIELDS),
			name,
			color,
			upgrades,
		}));
		s.enemies = s.enemies.map((e) => unpack(e, ENEMY_FIELDS));
		s.shots = s.shots.map((e) => unpack(e, SHOT_FIELDS));
		s.drops = s.drops.map((e) => unpack(e, DROP_FIELDS));
		s.effects = s.effects.map((e) => unpack(e, EFFECT_FIELDS));
		return s;
	}
	class Online {
		constructor(app, info) {
			this.app = app;
			this.info = info;
			this.hub = AIHub;
			this.ended = false;
			this.started = false;
			this.finished = false;
			this.seq = 0;
			this.sent = 0;
			this.received = 0;
			this.maxBytes = 0;
			this.maxRoutineBytes = 0;
			this.lastNet = -10;
			this.lastFull = -10;
			this.lastInput = -10;
			this.nextSlot = 0;
			this.queue = [];
			this.keyId = 0;
			this.assemblies = new Map();
			this.transforms = new Map();
			this.prevPositions = new Map();
			this.pending = [];
			this.frameAt = performance.now();
			this.lastReceive = 0;
			this.outgoing = [];
			this.lastEvent = 0;
			this.lastShot = 0;
			this.choice = null;
			this.generation = 0;
			this.validIds = new Set(info.players.map((p) => p.id));
			app.world = new S.World({
				seed: info.seed,
				epoch: info.round || 1,
				players: info.players,
				limit: Math.max(30, Math.min(780, (info.limitMs || 780000) / 1000 - 8)),
			});
			const activeBudget = (info.limitMs || 780000) / 1000;
			// Preserve all mechanics when a Hub uses a short round; compress encounter spacing instead of dropping acts.
			this.pace =
				activeBudget < 720 ? Math.max(0.04, (activeBudget - 12) / 660) : 1;
			this.hub.on("start", () => {
				this.started = true;
			});
			this.hub.on("message", (m, from) => this.receive(m, from));
			this.hub.on("leave", ({ id }) => {
				this.validIds.delete(id);
				app.world.leave(id);
				this.choice = null;
			});
			this.hub.on("time-up", () => {
				if (info.isHost && !this.ended) {
					if (!app.world.s.result) app.world.finish(false, "HUB TIME LIMIT");
					this.finish();
				}
			});
			this.hub.on("end", ({ reason }) => {
				this.ended = true;
				clearInterval(app.timer);
				this.queue = [];
				this.pending = [];
				app.input?.clear();
				app.sound?.stop();
				app.game.audio.music(null);
				app.world.s.phase = "ended";
				const e = document.getElementById("hub-state");
				if (!info.server && e) {
					e.hidden = false;
					e.textContent =
						reason === "finished" ? "ROUND COMPLETE" : "ROUND ENDED";
					const small = document.createElement("small");
					small.textContent = "AI Hub controls the next round.";
					e.append(small);
				}
			});
			this.hub.ready();
		}
		send(m, reliable = false, to) {
			if (this.ended) return false;
			const text = JSON.stringify(m),
				size = new TextEncoder().encode(text).length;
			this.maxBytes = Math.max(this.maxBytes, size);
			if (size > 16000) throw Error("Snapshot exceeds Hub hard limit");
			const now = performance.now();
			this.outgoing = this.outgoing.filter((t) => now - t < 1000);
			if (this.outgoing.length >= 18) return false;
			this.outgoing.push(now);
			this.sent++;
			return this.hub.send(m, {
				reliable,
				...(to === undefined ? {} : { to }),
			});
		}
		receive(m, from) {
			if (
				this.ended ||
				!m ||
				typeof m !== "object" ||
				m.e !== this.app.world.s.epoch
			)
				return;
			this.received++;
			if (this.info.isHost) {
				if (
					m.t !== "i" ||
					!this.validIds.has(from) ||
					from === this.info.me ||
					!m.v ||
					this.hub.time() < 0
				)
					return;
				const v = m.v;
				if (this.app.world.setIntent(from, v)) {
					if (m.c !== undefined) this.app.world.upgrade(from, m.c);
				}
				return;
			}
			if (from !== this.info.host) return;
			const w = this.app.world;
			if (m.t === "k") {
				if (
					!Number.isSafeInteger(m.id) ||
					!Number.isInteger(m.n) ||
					m.n < 1 ||
					m.n > 12 ||
					!Number.isInteger(m.i) ||
					m.i < 0 ||
					m.i >= m.n ||
					typeof m.v !== "string" ||
					m.v.length > 5000
				)
					return;
				let assembly = this.assemblies.get(m.id);
				if (!assembly) {
					assembly = { n: m.n, parts: [], at: performance.now() };
					this.assemblies.set(m.id, assembly);
				}
				if (assembly.n !== m.n) return;
				assembly.parts[m.i] = m.v;
				if (
					assembly.parts.filter((v) => typeof v === "string").length === m.n
				) {
					try {
						const state = decode(assembly.parts.join(""));
						if (
							state.epoch === w.s.epoch &&
							state.tick > (this.lastKeyTick ?? -1)
						) {
							this.lastKeyTick = state.tick;
							w.restore(state);
							this.lastReceive = performance.now();
							this.lastBossAt = this.lastReceive;
							this.remember();
							if (this.lastRoutine && this.lastRoutine.k >= state.tick)
								this.receive(this.lastRoutine, from);
						}
					} catch {
						this.invalid = (this.invalid || 0) + 1;
					}
					this.assemblies.delete(m.id);
				}
				for (const [id, a] of this.assemblies)
					if (performance.now() - a.at > 5000 || id < m.id - 2)
						this.assemblies.delete(id);
			} else if (m.t === "f") {
				if (m.r && Number.isFinite(m.r.score)) {
					w.s.result = m.r;
					w.s.score = m.r.score;
					w.s.outcomes = m.o;
					w.s.phase = "result";
					w.s.tick = m.k;
				}
			} else if (m.t === "s") {
				if (!Number.isInteger(m.k) || m.k < w.s.tick || !Array.isArray(m.p))
					return;
				this.lastRoutine = m;
				const s = w.s;
				s.tick = m.k;
				[
					s.phase,
					s.act,
					s.wave,
					s.waveTime,
					s.phaseTime,
					s.score,
					s.chain,
					s.multiplier,
					s.heat,
					s.base,
					s.eventSeq,
					s.t,
					s.activeTime,
					s.upgrades,
				] = m.h;
				for (const v of m.p) {
					const p = s.players.find((p) => p.id === v[0]);
					if (p) Object.assign(p, unpack(v, PLAYER_FIELDS));
				}
				for (const v of m.n || []) {
					const e = s.enemies.find((e) => e.id === v[0]);
					if (e)
						Object.assign(e, {
							x: v[1],
							y: v[2],
							hp: v[3],
							tele: v[4],
							wind: v[5],
							age: v[6],
						});
				}
				for (const v of m.b || []) {
					const shot = unpack(v, SHOT_FIELDS);
					const old = s.shots.find((b) => b.id === shot.id);
					if (!old) s.shots.push(shot);
				}
				if (m.r) {
					s.radio = m.r[0];
					s.radioUntil = m.r[1];
				}
				if (m.o) s.outcomes = m.o;
				if (Array.isArray(m.z) && s.boss) {
					const boss = s.boss;
					[boss.phase, boss.age, boss.phaseAge, boss.wind, boss.lanes] = m.z;
					for (let i = 0; i < boss.parts.length; i++) {
						const c = boss.parts[i];
						c.hp = m.z[5][i][0];
						c.open = m.z[5][i][1];
						c.x = 480 + Math.sin(boss.age * 0.28) * 180 + c.dx;
						c.y =
							155 +
							Math.sin(boss.age * 0.6) * 10 +
							(c.kind === "core" ? 15 : 6);
					}
					this.lastBossAt = performance.now();
				}
				if (m.f) s.result = m.f;
				this.lastReceive = performance.now();
				this.remember();
				const ack = s.players.find((p) => p.id === this.info.me)?.seq ?? -1;
				this.pending = this.pending.filter((v) => v.seq > ack);
				if (s.players.find((p) => p.id === this.info.me)?.choice !== null)
					this.choice = null;
			}
		}
		remember() {
			for (const p of this.app.world.s.players) {
				const old = this.prevPositions.get("p" + p.id) || { x: p.x, y: p.y };
				this.prevPositions.set("p" + p.id, {
					x: old.x,
					y: old.y,
					tx: p.x,
					ty: p.y,
				});
			}
		}
		keyframe() {
			if (this.queue.length) return;
			const s = this.app.world.s,
				text = encode(s),
				size = 4000,
				n = Math.ceil(text.length / size),
				id = ++this.keyId;
			if (n > 12) throw Error("Authored world exceeds snapshot budget");
			for (let i = 0; i < n; i++)
				this.queue.push({
					t: "k",
					e: s.epoch,
					id,
					n,
					i,
					v: text.slice(i * size, (i + 1) * size),
				});
		}
		routine() {
			const s = this.app.world.s;
			const message = {
				t: "s",
				e: s.epoch,
				k: s.tick,
				h: [
					s.phase,
					s.act,
					s.wave,
					Math.round(s.waveTime * 100) / 100,
					Math.round(s.phaseTime * 100) / 100,
					s.score,
					s.chain,
					s.multiplier,
					Math.round(s.heat * 100) / 100,
					Math.round(s.base * 100) / 100,
					s.eventSeq,
					Math.round(s.t * 100) / 100,
					Math.round(s.activeTime * 100) / 100,
					s.upgrades,
				],
				p: s.players.map((p) => pack(p, PLAYER_FIELDS)),
				n: [],
				b: [],
			};
			// Cosmetic fields and acknowledged intents are quantised. Complete reliable keyframes restore everything.
			let msg = JSON.parse(
				JSON.stringify(message, (k, v) =>
					typeof v === "number" ? Math.round(v * 100) / 100 : v,
				),
			);
			const bytes = () => new TextEncoder().encode(JSON.stringify(msg)).length;
			if (s.boss) {
				const boss = s.boss;
				msg.z = [
					boss.phase,
					Math.round(boss.age * 100) / 100,
					Math.round(boss.phaseAge * 100) / 100,
					Math.round(boss.wind * 100) / 100,
					boss.lanes,
					boss.parts.map((c) => [Math.round(c.hp * 100) / 100, c.open]),
				];
				if (bytes() > 1170) delete msg.z;
			}
			if (s.tick % 120 < 12) {
				msg.r = [s.radio, s.radioUntil];
				if (bytes() > 1170) delete msg.r;
			}
			if (s.result) {
				msg.f = s.result;
				if (bytes() > 1170) {
					delete msg.f;
					this.lastFull = -10;
				}
			}
			const enemies = s.enemies;
			const at = (Math.floor(s.tick / 12) * 5) % Math.max(1, enemies.length);
			for (let j = 0; j < Math.min(enemies.length, 6); j++) {
				const e = enemies[(at + j) % enemies.length],
					v = [e.id, e.x, e.y, e.hp, e.tele, e.wind, e.age].map((x) =>
						typeof x === "number" ? Math.round(x * 100) / 100 : x,
					);
				msg.n.push(v);
				if (bytes() > 1170) {
					msg.n.pop();
					break;
				}
			}
			const newShots = s.shots
				.filter((b) => b.id > this.lastShot)
				.sort((a, b) => Number(b.foe) - Number(a.foe));
			for (const b of newShots) {
				msg.b.push(
					pack(b, SHOT_FIELDS).map((v) =>
						typeof v === "number" ? Math.round(v * 100) / 100 : v,
					),
				);
				if (bytes() > 1170) {
					msg.b.pop();
					break;
				}
			}
			if (newShots.length)
				this.lastShot = Math.max(...newShots.map((b) => b.id));
			const size = bytes();
			if (size > 1200) throw Error(`Routine packet ${size} bytes`);
			this.maxRoutineBytes = Math.max(this.maxRoutineBytes, size);
			return msg;
		}
		choose(choice) {
			if (this.ended) return;
			this.choice = choice;
			if (this.info.isHost) {
				this.app.world.upgrade(this.info.me, choice);
				this.choice = null;
			}
		}
		localIntent() {
			const s = this.app.world.s,
				p = s.players.find((p) => p.id === this.info.me && !p.gone);
			if (!p || this.info.server) return null;
			const input = this.app.testBot
				? S.botIntent(this.app.world, p.id, ++this.seq)
				: this.app.input.intent(p, 0);
			input.seq = ++this.seq;
			return input;
		}
		update() {
			if (this.ended) return;
			const now = performance.now() / 1000,
				time = this.hub.time();
			if (!this.started || time < 0) {
				this.app.showCountdown(time);
				return;
			}
			this.app.showCountdown(null);
			const w = this.app.world;
			const input = this.localIntent();
			if (this.info.isHost) {
				if (input) w.setIntent(this.info.me, input);
				const target = Math.max(0, Math.floor(time / 1000 / S.DT));
				// Sole gameplay clock: session time. Catch-up includes hidden-tab timer delays; RAF only paints.
				let steps = 0;
				while (w.s.tick < target && !w.s.result && steps++ < 2400) {
					if (this.app.testBot)
						for (const p of w.s.players)
							if (!p.gone) w.setIntent(p.id, S.botIntent(w, p.id, ++this.seq));
					const dt = S.DT;
					if (this.pace < 1) {
						const old = w.s.phase,
							wave = w.s.wave;
						// Fast Hub rounds keep the same ordered encounter groups, with compressed quiet time.
						if (w.s.phase === "play" && !w.s.boss)
							w.s.waveTime += dt * (1 / this.pace - 1);
						if (old === "retreat" || old === "upgrade" || old === "briefing")
							w.s.phaseTime -= dt * (1 / this.pace - 1);
						void wave;
					}
					w.step(dt);
				}
				if (w.s.result && !this.finished && !this.finishAt) {
					this.keyframe();
					this.send(
						{
							t: "f",
							e: w.s.epoch,
							k: w.s.tick,
							r: w.s.result,
							o: w.s.outcomes,
						},
						true,
					);
					this.finishAt = now + 0.65;
				}
				if (this.finishAt && now >= this.finishAt) this.finish();
				if (now - this.lastNet >= 0.1 && !this.finished) {
					this.lastNet = now;
					this.send(this.routine(), false);
				}
				if (now - this.lastFull >= 1.3 && !this.finished) {
					this.lastFull = now;
					this.keyframe();
				}
				if (this.queue.length && now >= this.nextSlot) {
					this.nextSlot = now + 0.13;
					const packet = this.queue[0];
					if (this.send(packet, true)) this.queue.shift();
				}
			} else if (input && now - this.lastInput >= 1 / 15) {
				this.lastInput = now;
				this.send(
					{
						t: "i",
						e: w.s.epoch,
						v: input,
						...(this.choice === null ? {} : { c: this.choice }),
					},
					false,
					this.info.host,
				);
				this.pending.push(input);
				if (this.pending.length > 30) this.pending.shift();
			}
		}
		finish() {
			if (this.finished || this.ended || !this.info.isHost) return;
			this.finished = true;
			const s = this.app.world.s,
				ids = [...this.validIds].sort((a, b) => a - b);
			const scores = Object.fromEntries(
				ids.map((id) => [id, Number.isFinite(s.score) ? s.score : 0]),
			);
			this.hub.finish({
				standings: ids.length ? [ids] : [],
				scores,
				won: !!s.result?.won,
				stats: Object.fromEntries(
					ids.map((id) => [
						id,
						{
							"Threats destroyed":
								s.players.find((p) => p.id === id)?.kills || 0,
							"Lines held": s.outcomes.filter((o) => o.held).length,
						},
					]),
				),
			});
		}
		renderState() {
			const s = this.app.world.s;
			if (this.info.isHost) return s;
			const out = {
				...s,
				players: s.players.map((p) => ({ ...p })),
				enemies: s.enemies.map((e) => ({ ...e })),
				shots: s.shots.map((b) => ({ ...b })),
				boss: s.boss
					? { ...s.boss, parts: s.boss.parts.map((c) => ({ ...c })) }
					: null,
			};
			const lag = S.clamp(
				(performance.now() - this.lastReceive) / 1000,
				0,
				0.2,
			);
			for (const p of out.players) {
				const point = this.prevPositions.get("p" + p.id);
				if (point) {
					point.x += (point.tx - point.x) * 0.32;
					point.y += (point.ty - point.y) * 0.32;
					p.x = point.x;
					p.y = point.y;
				}
				if (
					p.id === this.info.me &&
					this.pending.length &&
					p.hp > 0 &&
					!this.app.ui.shell.screen
				) {
					const intent = this.pending.at(-1);
					p.x = S.clamp(p.x + intent.mx * 90 * lag, 30, 930);
					if (s.act !== 2) p.y = S.clamp(p.y + intent.my * 90 * lag, 88, 467);
				}
			}
			if (out.boss) {
				const boss = out.boss,
					elapsed = S.clamp(
						(performance.now() - (this.lastBossAt || this.lastReceive)) / 1000,
						0,
						0.25,
					);
				boss.age += elapsed;
				boss.phaseAge += elapsed;
				for (const c of boss.parts) {
					c.x = 480 + Math.sin(boss.age * 0.28) * 180 + c.dx;
					c.y =
						155 + Math.sin(boss.age * 0.6) * 10 + (c.kind === "core" ? 15 : 6);
				}
			}
			for (const b of out.shots) {
				b.px = b.x + b.vx * Math.max(0, lag - 0.015);
				b.py = b.y + b.vy * Math.max(0, lag - 0.015);
				b.x += b.vx * lag;
				b.y += b.vy * lag;
			}
			return out;
		}
		stats() {
			return {
				sent: this.sent,
				received: this.received,
				maxBytes: this.maxBytes,
				maxRoutineBytes: this.maxRoutineBytes,
				queued: this.queue.length,
				finished: this.finished,
				ended: this.ended,
				pending: this.pending.length,
			};
		}
	}
	Object.assign(S, { Online, encodeWorld: encode, decodeWorld: decode });
})(globalThis.Fortnight);
