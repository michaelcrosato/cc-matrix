/* Shared deterministic rules. No DOM, renderer, wall clock, storage or audio. */
(() => {
	const TT = (globalThis.TallTale = globalThis.TallTale || globalThis.TT || {});
	globalThis.TT = TT;
	const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
	const clone = (o) => JSON.parse(JSON.stringify(o));
	const PHASES = [
		"playing",
		"transition",
		"rooftop",
		"departure",
		"results",
		"failed",
	];
	const TYPES = [
		"boulder",
		"bumper",
		"split",
		"rat",
		"bird",
		"bat",
		"fragment",
	];
	const STATES = [
		"telegraph",
		"roll",
		"drop",
		"scurry",
		"approach",
		"cross",
		"swoop",
		"spent",
	];
	const round = (v) => Math.round(v * 100) / 100;
	const neutral = () => ({
		x: 0,
		up: false,
		down: false,
		jump: false,
		jumpPressed: false,
	});
	TT.neutralIntent = neutral;

	function installWindowAction(E) {
		if (E.ACTIONS.tallTaleWindow) return;
		E.ACTIONS.tallTaleWindow = {
			beats: [["climb", 0.72]],
			hold: true,
			setup(A) {
				A.beats = [["climb", A.o.duration || 0.72]];
			},
			at(A, beat, u) {
				const k = Math.min(1, u * 5),
					w = k * k * (3 - 2 * k);
				return {
					x: A.start.x + (A.o.targetX - A.start.x) * w,
					y: 0,
					z: A.o.fromZ + (A.o.toZ - A.o.fromZ) * u,
					state: {
						climb: true,
						air: false,
						pose: "tall-window",
						expr: "smile",
					},
				};
			},
		};
	}

	// Relative swept AABB: the native overlap test handles static contact; the
	// segment/slab check covers fast stones and two bodies crossing in one step.
	function swept(E, a, b, pa, pb) {
		if (E.overlapBox(a, b)) return true;
		const dx = a.x - pa.x - (b.x - pb.x),
			dz = a.z - pa.z - (b.z - pb.z);
		const ox = pa.x - pb.x,
			oz = pa.z - pb.z;
		const xr = (a.w + b.w) / 2;
		const low = -a.h,
			high = b.h;
		let enter = 0,
			exit = 1;
		for (const [p, d, lo, hi] of [
			[ox, dx, -xr, xr],
			[oz, dz, low, high],
		]) {
			if (Math.abs(d) < 1e-9) {
				if (p <= lo || p >= hi) return false;
			} else {
				let a0 = (lo - p) / d,
					a1 = (hi - p) / d;
				if (a0 > a1) [a0, a1] = [a1, a0];
				enter = Math.max(enter, a0);
				exit = Math.min(exit, a1);
				if (enter >= exit) return false;
			}
		}
		return exit > 0 && enter < 1;
	}
	TT.sweptContact = swept;

	class Simulation {
		constructor(E, options = {}) {
			this.E = E;
			installWindowAction(E);
			this.seed = Number.isFinite(options.seed) ? options.seed : 1982;
			this.rng = options.rng || E.rng(this.seed);
			this.hard = !!options.hard;
			this.attract = !!options.attract;
			this.config = { ...TT.DEFAULTS, ...options.config };
			this.unranked = Object.keys(TT.DEFAULTS).some(
				(k) => this.config[k] !== TT.DEFAULTS[k],
			);
			this.invulnerable = false;
			this.tick = 0;
			this.time = 0;
			this.sectionTime = 0;
			this.section = 0;
			this.phase = "playing";
			this.score = 0;
			this.chances = 3;
			this.continued = false;
			this.rescued = false;
			this.departureTime = 0;
			this.transitionTime = 0;
			this.regroup = 0;
			this.roofBeat = 0;
			this.ledger = {};
			this.events = [];
			this.eventSerial = 0;
			this.coverage = {
				windows: 0,
				jumps: 0,
				hearts: 0,
				hits: 0,
				reversals: 0,
				drops: 0,
				splits: 0,
				sections: 0,
				rescue: 0,
				seen: {},
				dodged: {},
				smashed: {},
			};
			const ps = options.players || [{ id: 1, seat: 1 }];
			this.actors = ps.map((p, i) =>
				this.makeActor(
					typeof p === "number"
						? { id: p, seat: i + 1 }
						: { seat: i + 1, ...p },
				),
			);
			this.players = this.actors;
			this._enterSection(0);
		}
		makeActor(p) {
			const a = {
				id: p.id ?? p.seat ?? 1,
				seat: p.seat || 1,
				name: p.name || "",
				body: new this.E.Platformer({
					x: 48,
					z: 16,
					w: 9,
					h: 22,
					run: this.config.run,
					jump: this.config.jump,
					gravity: this.config.gravity,
					fallGravity: this.config.gravity * 1.1,
				}),
				traversal: null,
				action: null,
				power: 0,
				recovery: 0,
				hurt: 0,
				finished: false,
				pose: null,
				jumpBuffer: 0,
				lastIntent: neutral(),
				windowCooldown: 0,
				stats: { climbs: 0, jumps: 0, hearts: 0, clears: 0, hits: 0 },
			};
			for (const k of ["x", "z", "vx", "vz", "facing", "onGround", "climbing"])
				Object.defineProperty(a, k, {
					get() {
						return this.body[k];
					},
					set(v) {
						this.body[k] = v;
					},
					enumerable: false,
				});
			return a;
		}
		currentSection() {
			return TT.CONTENT.sections[this.section];
		}
		emit(type, data = {}) {
			const event = { id: ++this.eventSerial, type, tick: this.tick, ...data };
			this.events.push(event);
			if (this.events.length > 48) this.events.shift();
			return event;
		}
		award(id, value, reason) {
			if (Object.hasOwn(this.ledger, id)) return false;
			this.ledger[id] = { value, reason };
			this.score += value;
			this.emit("score", { award: id, value, reason });
			return true;
		}
		_map(s) {
			const rows = Array.from({ length: 17 }, () => Array(20).fill(" "));
			const edge = Math.ceil(s.inset / 16);
			for (let f = 0; f <= s.floors; f++) {
				const cz = f * 3;
				for (let x = edge; x < 20 - edge; x++) rows[16 - cz][x] = f ? "=" : "#";
			}
			return new this.E.PlatformMap({
				rows: rows.map((r) => r.join("")),
				legend: { "#": 1, "=": 2 },
				types: {
					1: {
						kind: "solid",
						style: "brick",
						side: s.palette.brick,
						top: s.palette.trim,
					},
					2: {
						kind: "oneway",
						style: "stone",
						side: s.palette.shadow,
						top: s.palette.trim,
					},
				},
				edges: "open",
			});
		}
		_enterSection(section, { checkpoint = true } = {}) {
			this.section = clamp(section, 0, 3);
			const s = this.currentSection();
			this.level = this._map(s);
			this.sectionTime = 0;
			this.phase = this.section === 3 ? "rooftop" : "playing";
			this.transitionTime = 0;
			this.regroup = 0;
			this.roofBeat = 0;
			this.windows = s.windows.map((w) => ({
				...w,
				phase: "closed",
				remaining: 0,
				aperture: 0,
				usable: false,
			}));
			this.hazards = [];
			this.hearts = [];
			this.floorSeen = { 0: 0 };
			this.spawned = {};
			this.heartSpawned = {};
			this.collectedHearts = {};
			this.sectionHits = 0;
			this.encounters = [
				...s.spawns,
				...(this.hard
					? TT.CONTENT.hard.combinations
							.filter((h) => h.floor < s.floors)
							.map((h) => ({ ...h, id: `${s.id}-${h.id}` }))
					: []),
			];
			for (const a of this.actors) {
				const b = a.body;
				b.x = s.startX + (a.seat - 1) * 18;
				b.z = 16;
				b.vx = b.vz = 0;
				b.onGround = true;
				b.air = false;
				b.climbing = false;
				b.stun = b.drop = 0;
				b._coy = b.coyote;
				b._cut = true;
				a.traversal = a.action = null;
				a.hurt = a.power = 0;
				a.recovery = 1.5;
				a.finished = false;
				a.jumpBuffer = 0;
				a.windowCooldown = 0;
				a.botCache = null;
				a.botJumpUntil = 0;
				a.lastIntent = neutral();
			}
			this._updateWindows();
			if (checkpoint) this.checkpoint = this.checkpointData();
		}
		checkpointData() {
			return {
				v: 1,
				section: this.section,
				score: this.score,
				ledger: clone(this.ledger),
				hard: this.hard,
				seed: this.seed,
				chances: Math.max(3, this.chances),
				time: this.time,
			};
		}
		loadCheckpoint(cp) {
			if (
				!cp ||
				cp.v !== 1 ||
				!Number.isInteger(cp.section) ||
				cp.section < 0 ||
				cp.section > 3 ||
				!Number.isFinite(cp.score) ||
				cp.score < 0 ||
				cp.score > 100000 ||
				typeof cp.ledger !== "object" ||
				cp.ledger === null ||
				Array.isArray(cp.ledger)
			)
				return false;
			let total = 0;
			for (const v of Object.values(cp.ledger)) {
				if (
					!v ||
					!Number.isFinite(v.value) ||
					v.value < 0 ||
					v.value > 1000 ||
					typeof v.reason !== "string"
				)
					return false;
				total += v.value;
			}
			if (
				total !== cp.score ||
				typeof cp.hard !== "boolean" ||
				!Number.isFinite(cp.seed) ||
				!Number.isFinite(cp.time) ||
				cp.time < 0 ||
				!Number.isInteger(cp.chances) ||
				cp.chances < 3 ||
				cp.chances > 5
			)
				return false;
			this.hard = !!cp.hard;
			this.seed = Number.isFinite(cp.seed) ? cp.seed : 1982;
			this.time = Number.isFinite(cp.time) && cp.time >= 0 ? cp.time : 0;
			this.score = cp.score;
			this.ledger = clone(cp.ledger);
			this.chances = clamp(cp.chances || 3, 3, 5);
			this.continued = true;
			this.rescued = false;
			this.departureTime = 0;
			this._enterSection(cp.section, { checkpoint: false });
			this.checkpoint = clone(cp);
			this.emit("retry", { section: cp.section });
			return true;
		}
		retryCheckpoint() {
			return this.loadCheckpoint(this.checkpoint);
		}
		restart() {
			this.tick = this.time = 0;
			this.score = 0;
			this.ledger = {};
			this.chances = 3;
			this.continued = false;
			this.rescued = false;
			this.departureTime = 0;
			for (const a of this.actors)
				a.stats = { climbs: 0, jumps: 0, hearts: 0, clears: 0, hits: 0 };
			this._enterSection(0);
			this.emit("restart");
		}
		warpSection(section) {
			this.unranked = true;
			this._enterSection(section);
			this.emit("warp", { section: this.section });
		}
		setConfig(key, value) {
			const ranges = {
				run: [50, 150],
				jump: [120, 260],
				gravity: [650, 1500],
				climbTime: [0.35, 1.5],
				windowOpen: [2.5, 10],
				windowWarning: [0.5, 3],
				hazardCadence: [0.5, 2],
				hazardSpeed: [0.4, 2],
				heartDuration: [3, 12],
			};
			if (!ranges[key] || !Number.isFinite(value)) return false;
			this.config[key] = clamp(value, ...ranges[key]);
			if (this.config[key] !== TT.DEFAULTS[key]) this.unranked = true;
			for (const a of this.actors) {
				a.body.run = this.config.run;
				a.body.jump = this.config.jump;
				a.body.gravity = this.config.gravity;
				a.body.fallGravity = this.config.gravity * 1.1;
			}
			return true;
		}
		resetConfig() {
			for (const [k, v] of Object.entries(TT.DEFAULTS)) this.setConfig(k, v);
		}
		removePlayer(id) {
			const a = this.actors.find((p) => p.id === id);
			if (!a) return;
			this.actors.splice(this.actors.indexOf(a), 1);
			this.emit("leave", { actor: id });
			if (
				this.actors.length &&
				this.actors.every((p) => p.finished) &&
				this.regroup > 0
			)
				this.regroup = 0.01;
		}
		_updateWindows(emit = true) {
			const s = this.currentSection(),
				opening = 0.5,
				closing = 0.45,
				gap = 0.8;
			const open = this.config.windowOpen - (this.section === 2 ? 0.6 : 0);
			const warning = this.config.windowWarning;
			const slot = opening + open + warning + closing + gap;
			for (let f = 0; f < s.floors; f++) {
				const ws = this.windows.filter((w) => w.floor === f);
				const delay =
					ws[0].delay + (this.hard ? TT.CONTENT.hard.windowOffset : 0);
				const t = this.sectionTime - delay;
				const index = t < 0 ? -1 : Math.floor(t / slot) % ws.length;
				const u = t < 0 ? -1 : t % slot;
				for (let i = 0; i < ws.length; i++) {
					const w = ws[i],
						was = w.phase;
					const active =
						this.hard && index >= 0
							? (TT.CONTENT.hard.windowOrder[index % ws.length] ?? index)
							: index;
					w.usable = false;
					w.aperture = 0;
					w.phase = "closed";
					const turn = this.hard ? TT.CONTENT.hard.windowOrder.indexOf(i) : i;
					w.remaining =
						t < 0
							? -t + Math.max(0, turn) * slot + opening
							: ((Math.max(0, turn) - index + ws.length) % ws.length ||
									ws.length) *
									slot -
								u +
								opening;
					if (t >= 0 && i === active) {
						if (u < opening) {
							w.phase = "opening";
							w.aperture = u / opening;
							w.remaining = opening - u;
						} else if (u < opening + open) {
							w.phase = "open";
							w.aperture = 1;
							w.remaining = opening + open - u;
							w.usable = true;
						} else if (u < opening + open + warning) {
							w.phase = "warning";
							w.aperture = 1;
							w.remaining = opening + open + warning - u;
							w.usable = true;
						} else if (u < opening + open + warning + closing) {
							w.phase = "closing";
							w.aperture = 1 - (u - opening - open - warning) / closing;
							w.remaining = opening + open + warning + closing - u;
						}
					}
					if (emit && w.phase !== was && w.phase === "open")
						this.emit("window-open", { window: w.id, x: w.x, z: w.z });
					if (emit && w.phase !== was && w.phase === "warning")
						this.emit("window-warning", { window: w.id, x: w.x, z: w.z });
				}
			}
		}
		floorOf(a) {
			return clamp(
				Math.round((a.body.z - 16) / 48),
				0,
				this.currentSection().floors,
			);
		}
		windowFor(a, direction = 1, tolerance = 13) {
			const b = a.body;
			return this.windows.find(
				(w) =>
					w.usable &&
					Math.abs(b.x - w.x) <= tolerance &&
					Math.abs(b.z - (direction < 0 ? w.toZ : w.z)) <= 3,
			);
		}
		_beginClimb(a, w, direction) {
			const b = a.body;
			a.traversal = {
				windowId: w.id,
				progress: direction > 0 ? 0 : 1,
				from: w.z,
				to: w.toZ,
				startX: b.x,
			};
			this._createAction(a, w);
			b.climbing = true;
			b.onGround = false;
			b.air = false;
			this.emit("climb", { actor: a.id, window: w.id, direction });
		}
		_createAction(a, w) {
			const tr = a.traversal;
			a.action = new this.E.Action("tallTaleWindow", {
				body: a.body,
				targetX: w.x,
				fromZ: tr.from,
				toZ: tr.to,
				duration: this.config.climbTime,
			});
			a.action.start.x = tr.startX;
			a.action.t = tr.progress * a.action.duration;
			a.action.update(0);
		}
		_climb(a, intent, dt) {
			const w = this.windows.find((p) => p.id === a.traversal.windowId),
				tr = a.traversal,
				b = a.body;
			if (!w || !w.usable) {
				a.action.cancel();
				a.action = a.traversal = null;
				b.climbing = false;
				this.hurtActor(a, "shutter");
				return;
			}
			const dir = intent.up ? 1 : intent.down ? -1 : 0;
			const oldX = b.x,
				oldZ = b.z;
			a.action.t = Math.max(0, a.action.t + dir * dt);
			a.action.done = false;
			a.action.update(0);
			tr.progress = clamp(a.action.t / a.action.duration, 0, 1);
			b.vx = (b.x - oldX) / dt;
			b.vz = (b.z - oldZ) / dt;
			b.onGround = false;
			b.climbing = true;
			b.air = false;
			a.pose = dir ? "climb" : "hold";
			if ((tr.progress >= 1 && dir > 0) || (tr.progress <= 0 && dir < 0)) {
				b.z = dir > 0 ? w.toZ : w.z;
				b.x = w.x;
				b.vx = b.vz = 0;
				b.onGround = true;
				b.climbing = false;
				b._coy = b.coyote;
				a.action = a.traversal = null;
				a.windowCooldown = 0.15;
				if (dir > 0) {
					this.coverage.windows++;
					a.stats.climbs++;
				}
				this.emit("climb-exit", { actor: a.id, window: w.id, direction: dir });
			}
		}
		hurtActor(a, cause = "fall") {
			if (
				!a ||
				a.hurt > 0 ||
				a.recovery > 0 ||
				this.invulnerable ||
				this.attract
			)
				return false;
			a.hurt = 0.75;
			a.power = 0;
			a.recovery = 0;
			a.traversal = a.action = null;
			a.body.climbing = false;
			a.body.onGround = false;
			a.body.vz = 100;
			a.body.vx = a.body.facing * -38;
			a.body.stun = 0.75;
			a.finished = false;
			this.chances--;
			this.sectionHits++;
			this.coverage.hits++;
			a.stats.hits++;
			this.emit("hit", { actor: a.id, cause, x: a.x, z: a.z });
			if (this.chances <= 0) {
				this.chances = 0;
				this.phase = "failed";
				this.emit("failed");
			}
			return true;
		}
		_respawn(a) {
			const b = a.body;
			b.x = this.currentSection().startX + (a.seat - 1) * 18;
			b.z = 16;
			b.vx = b.vz = 0;
			b.stun = b.drop = 0;
			b.onGround = true;
			b.air = b.climbing = false;
			b._coy = b.coyote;
			a.hurt = 0;
			a.recovery = 2;
			a.jumpBuffer = 0;
			a.traversal = a.action = null;
			a.pose = null;
			this.emit("recover", { actor: a.id });
		}
		_actor(a, raw, dt) {
			const i = { ...neutral(), ...raw },
				b = a.body;
			i.x = Number.isFinite(i.x) ? clamp(i.x, -1, 1) : 0;
			a.prev = { x: b.x, z: b.z };
			a.lastIntent = i;
			a.windowCooldown = Math.max(0, a.windowCooldown - dt);
			if (a.power > 0 && a.power - dt <= 1.2 && a.power > 1.2)
				this.emit("heart-warning", { actor: a.id });
			a.power = Math.max(0, a.power - dt);
			a.recovery = Math.max(0, a.recovery - dt);
			if (a.hurt > 0) {
				a.hurt -= dt;
				b.update(dt, this.level, neutral());
				if (a.hurt <= 0) this._respawn(a);
				return;
			}
			if (a.finished) {
				b.vx = b.vz = 0;
				a.pose = "wave";
				return;
			}
			if (a.traversal) {
				this._climb(a, i, dt);
				return;
			}
			a.pose = null;
			if ((i.up || i.down) && a.windowCooldown <= 0 && b.onGround) {
				const w = this.windowFor(a, i.up ? 1 : -1, i.assist ? 18 : 13);
				if (w) {
					this._beginClimb(a, w, i.up ? 1 : -1);
					this._climb(a, i, dt);
					return;
				}
			}
			if (i.jumpPressed) a.jumpBuffer = b.buffer;
			else a.jumpBuffer = Math.max(0, a.jumpBuffer - dt);
			b.update(dt, this.level, {
				...i,
				up: false,
				down: false,
				jumpPressed: a.jumpBuffer > 0,
			});
			if (b.jumped) {
				a.jumpBuffer = 0;
				a.stats.jumps++;
				this.coverage.jumps++;
				this.emit("jump", { actor: a.id, x: b.x, z: b.z });
			}
			if (b.landed) this.emit("land", { actor: a.id, x: b.x, z: b.z });
			if (
				b.z < -15 ||
				b.x < this.currentSection().inset - 8 ||
				b.x > 328 - this.currentSection().inset
			) {
				if (!this.hurtActor(a, "fall") && (this.invulnerable || this.attract))
					this._respawn(a);
			}
		}
		_schedule() {
			const s = this.currentSection();
			for (const a of this.actors) {
				if (a.hurt > 0 || a.traversal) continue;
				const f = this.floorOf(a);
				if (this.floorSeen[f] === undefined) {
					this.floorSeen[f] = this.sectionTime;
					this.emit("floor", { floor: f, section: this.section, actor: a.id });
				}
				if (this.section === 3 && f > this.roofBeat) {
					this.roofBeat = f;
					this.emit("roof-beat", { beat: f });
				}
			}
			const cadence =
				this.config.hazardCadence *
				(this.hard ? TT.CONTENT.hard.hazardCadence : 1);
			for (const h of this.encounters) {
				if (this.floorSeen[h.floor] === undefined) continue;
				const t = this.sectionTime - this.floorSeen[h.floor],
					repeat = h.repeat * cadence;
				if (t < h.after * cadence) continue;
				const cycle = Math.floor((t - h.after * cadence) / repeat);
				if ((this.spawned[h.id] ?? -1) >= cycle) continue;
				this.spawned[h.id] = cycle;
				this._spawn(h, cycle);
			}
			for (const h of s.hearts) {
				if (this.floorSeen[h.floor] === undefined) continue;
				const t = this.sectionTime - this.floorSeen[h.floor];
				if (t < h.after) continue;
				const cycle = Math.floor((t - h.after) / h.repeat);
				if ((this.heartSpawned[h.id] ?? -1) >= cycle) continue;
				this.heartSpawned[h.id] = cycle;
				if (
					this.hearts.some(
						(p) => p.baseId === h.id && !p.collected && p.age < p.life,
					)
				)
					continue;
				const z = 16 + h.floor * 48 + 11;
				this.hearts.push({
					id: `${h.id}:${cycle}`,
					baseId: h.id,
					x: 207 - s.inset * 0.5,
					z: (this.section === 3 ? 160 : 208) + 20,
					startX: 207 - s.inset * 0.5,
					startZ: (this.section === 3 ? 160 : 208) + 20,
					targetX: h.x,
					targetZ: z,
					age: 0,
					life: h.life,
					collected: false,
					floor: h.floor,
				});
				this.emit("heart-throw", {
					x: 207 - s.inset * 0.5,
					z: (this.section === 3 ? 160 : 208) + 20,
					heart: h.id,
				});
			}
		}
		spawnHazard(type, floor = 0) {
			if (!TYPES.includes(type)) return false;
			this.unranked = true;
			const fixture = this.currentSection().bumpers.find((b) =>
				type === "bumper" ? b.mode === "reverse" : b.mode === "split",
			);
			this._spawn(
				{
					id: `dev-${this.tick}-${this.hazards.length}`,
					type,
					floor,
					after: 0,
					side: 1,
					telegraph: 1,
					speed: 42,
					repeat: 20,
					bumper: fixture?.id || null,
				},
				0,
			);
			return true;
		}
		clearHazards() {
			this.unranked = true;
			this.hazards.length = 0;
		}
		_spawn(h, cycle) {
			const inset = this.currentSection().inset,
				x = h.side > 0 ? 310 - inset : 10 + inset;
			const r =
				h.type === "rat"
					? 3.5
					: h.type === "bird" || h.type === "bat"
						? 4
						: 4.5;
			const hazard = {
				id: `${this.section}:${h.id}:${cycle}`,
				baseId: `${this.section}:${h.id}`,
				type: h.type,
				x,
				z: 16 + h.floor * 48,
				vx: -h.side * h.speed * this.config.hazardSpeed,
				vz: 0,
				floor: h.floor,
				r,
				w: r * 2,
				h: r * 2,
				state: "telegraph",
				age: 0,
				telegraph: h.telegraph,
				bumper: h.bumper || null,
				bounced: false,
				dropped: false,
				spent: false,
				checked: [],
				startX: x,
				startZ: 16 + h.floor * 48,
			};
			if (h.type === "bird" || h.type === "bat") hazard.z += 31;
			this.hazards.push(hazard);
			this.coverage.seen[h.type] = (this.coverage.seen[h.type] || 0) + 1;
			this.emit("hazard-windup", {
				hazard: hazard.id,
				kind: h.type,
				x,
				z: hazard.z,
				floor: h.floor,
			});
		}
		_hazards(dt) {
			const additions = [];
			for (const h of this.hazards) {
				h.prev = { x: h.x, z: h.z };
				h.age += dt;
				if (h.spent) {
					h.state = "spent";
					continue;
				}
				if (h.state === "telegraph") {
					if (h.age < h.telegraph) continue;
					h.state =
						h.type === "rat"
							? "scurry"
							: h.type === "bird"
								? "approach"
								: h.type === "bat"
									? "swoop"
									: "roll";
					this.emit(h.type === "bird" || h.type === "bat" ? h.type : "throw", {
						kind: h.type,
						x: h.x,
						z: h.z,
					});
				}
				const activeAge = h.age - h.telegraph;
				if (h.type === "bird") {
					const duration =
						(320 - this.currentSection().inset * 2) / Math.abs(h.vx);
					const u = clamp(activeAge / duration, 0, 1);
					h.x += h.vx * dt;
					h.state = u < 0.2 ? "approach" : "cross";
					// A purposeful high approach, low central crossing, then climb away.
					h.z =
						h.startZ +
						(u < 0.25 ? 33 - u * 72 : u > 0.75 ? 15 + (u - 0.75) * 72 : 15);
				} else if (h.type === "bat") {
					h.x += h.vx * dt;
					// Distinct three-part swoop with a short, visible low glide.
					const p = (activeAge % 2.4) / 2.4;
					h.z =
						h.startZ +
						(p < 0.35
							? 34 - (p / 0.35) * 24
							: p < 0.6
								? 10
								: 10 + ((p - 0.6) / 0.4) * 24);
				} else if (h.state === "drop") {
					h.vz -= 600 * dt;
					h.z += h.vz * dt;
					h.x += h.vx * dt;
					const landing = h.startZ - 48;
					if (h.z <= landing) {
						h.z = landing;
						h.vz = 0;
						h.state = "roll";
						h.floor--;
						this.emit("stone-land", { x: h.x, z: h.z });
					}
				} else {
					h.x += h.vx * dt;
					if (h.type === "bumper" && h.bumper) {
						const b = this.currentSection().bumpers.find(
							(p) => p.id === h.bumper,
						);
						if (b && (h.vx > 0 ? h.x >= b.x : h.x <= b.x)) {
							if (b.mode === "reverse") {
								h.x = b.x;
								h.vx *= -1;
								h.bounced = true;
								h.bumper = b.next || null;
								this.coverage.reversals++;
								this.emit("bumper", { fixture: b.id, x: h.x, z: h.z });
							} else if (b.mode === "drop") {
								h.state = "drop";
								h.dropped = true;
								h.vx *= 0.22;
								h.vz = 0;
								h.bumper = null;
								this.coverage.drops++;
								this.emit("drop", { x: h.x, z: h.z - 48 });
							}
						}
					}
					if (h.type === "split" && !h.bounced) {
						const fixture = this.currentSection().bumpers.find(
							(p) => p.id === h.bumper,
						);
						const splitX = fixture ? fixture.x : 160;
						if (h.vx > 0 ? h.x >= splitX : h.x <= splitX) {
							h.spent = true;
							this.coverage.splits++;
							this.emit("split", { x: h.x, z: h.z });
							for (const dir of [-1, 1])
								additions.push({
									...h,
									id: `${h.id}.${dir}`,
									type: "fragment",
									x: h.x,
									z: h.z + 7,
									startZ: h.z + 48,
									vx: dir * 50 * this.config.hazardSpeed,
									vz: 75,
									r: 3.5,
									w: 7,
									h: 7,
									state: "drop",
									age: 0,
									spent: false,
									bounced: true,
									checked: [],
								});
						}
					}
				}
				if (h.x < -20 || h.x > 340 || h.z < -50 || h.age > 22) h.spent = true;
				for (const a of this.actors) {
					if (h.spent || a.hurt > 0 || a.finished || !a.prev) continue;
					if (
						!swept(
							this.E,
							{ x: a.x, z: a.z + 1, w: a.body.w - 2, h: a.body.h - 3 },
							h,
							{ x: a.prev.x, z: a.prev.z + 1 },
							h.prev,
						)
					)
						continue;
					if (a.power > 0) {
						h.spent = true;
						a.stats.clears++;
						this.coverage.smashed[h.type] =
							(this.coverage.smashed[h.type] || 0) + 1;
						this.award(`smash:${h.baseId}`, 50, "Heart rush clear");
						this.emit("smash", { actor: a.id, kind: h.type, x: h.x, z: h.z });
					} else if (a.recovery <= 0 && this.hurtActor(a, h.type)) {
						h.spent = true;
						this.emit("hazard-bounce", { kind: h.type, x: h.x, z: h.z });
					}
				}
				// A safely passed threat counts once per actor, including a jump over it.
				for (const a of this.actors)
					if (
						!h.checked.includes(a.id) &&
						h.prev &&
						(h.prev.x - a.x) * (h.x - a.x) <= 0 &&
						Math.abs(a.z - h.startZ) < 24 &&
						!a.hurt
					) {
						h.checked.push(a.id);
						this.coverage.dodged[h.type] =
							(this.coverage.dodged[h.type] || 0) + 1;
					}
			}
			this.hazards.push(...additions);
			this.hazards = this.hazards.filter(
				(h) =>
					!h.spent ||
					this.sectionTime - (h.spentAt ?? (h.spentAt = this.sectionTime)) <
						0.4,
			);
		}
		_hearts(dt) {
			for (const h of this.hearts) {
				h.age += dt;
				if (h.collected || this.collectedHearts[h.id]) {
					h.collected = true;
					continue;
				}
				const u = clamp(h.age / 1.5, 0, 1),
					k = u * u * (3 - 2 * u);
				h.x =
					h.startX +
					(h.targetX - h.startX) * k +
					Math.sin(h.age * 2.5) * (u < 1 ? 4 : 2);
				h.z = h.startZ + (h.targetZ - h.startZ) * k + Math.sin(h.age * 3) * 2;
				for (const a of this.actors) {
					if (
						a.hurt > 0 ||
						a.finished ||
						Math.abs(a.x - h.x) > 12 ||
						h.z < a.z - 3 ||
						h.z > a.z + a.body.h + 4
					)
						continue;
					h.collected = true;
					this.collectedHearts[h.id] = true;
					a.stats.hearts++;
					this.coverage.hearts++;
					for (const p of this.actors)
						p.power = Math.max(p.power, this.config.heartDuration + 1 / 120);
					this.award(`heart:${h.baseId}`, 50, "Mabel's heart");
					this.emit("heart", { actor: a.id, heart: h.id, x: h.x, z: h.z });
					break;
				}
			}
			this.hearts = this.hearts.filter((h) => !h.collected && h.age < h.life);
		}
		_objectives(dt) {
			const s = this.currentSection();
			for (const a of this.actors) {
				if (a.hurt || a.traversal || !a.body.onGround) continue;
				const exitX = this.section === 3 ? s.finale.rescueX : s.exitX,
					tolerance = this.section === 3 ? s.finale.rescueTolerance : 21;
				if (a.z < 16 + s.floors * 48 - 2 || Math.abs(a.x - exitX) > tolerance)
					continue;
				if (this.section === 3) {
					if (!this.rescued && (!s.finale.needsHeart || a.power > 0)) {
						this.rescued = true;
						this.phase = "departure";
						this.departureTime = 0;
						this.coverage.rescue++;
						this.award("objective:rescue", 500, "Mabel rescued");
						for (const p of this.actors) {
							p.finished = true;
							p.pose = "wave";
						}
						this.emit("rescue", { actor: a.id, x: a.x, z: a.z });
					}
				} else if (!a.finished) {
					a.finished = true;
					a.pose = "wave";
					if (!this.regroup) {
						this.regroup = 3.2;
						this.emit("regroup", { seconds: 3.2 });
					}
				}
			}
			if (this.regroup > 0) {
				this.regroup -= dt;
				if (this.actors.every((a) => a.finished) || this.regroup <= 0) {
					const all = this.actors.every((a) => a.finished);
					this.award(`section:${this.section}`, 100, "Hank pursued");
					if (this.sectionHits === 0)
						this.award(`clean:${this.section}`, 25, "Clean ascent");
					if (all && this.actors.length > 1)
						this.award(`team:${this.section}`, 25, "Together at the top");
					this.chances = Math.min(TT.CONTENT.chanceCap, this.chances + 1);
					this.coverage.sections++;
					this.phase = "transition";
					this.transitionTime = 0;
					this.regroup = 0;
					this.emit("section", { section: this.section });
				}
			}
		}
		step(dt, intents = {}) {
			if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1)
				throw new Error(
					"Simulation requires a positive fixed step <=0.1 seconds",
				);
			if (["results", "failed"].includes(this.phase)) return;
			this.tick++;
			this.time += dt;
			if (this.phase === "departure") {
				const before = this.departureTime;
				this.departureTime += dt;
				if (before < 3 && this.departureTime >= 3) this.emit("plane");
				if (this.departureTime >= this.currentSection().finale.departure) {
					this.phase = "results";
					this.emit("results", { won: true });
				}
				return;
			}
			if (this.phase === "transition") {
				this.transitionTime += dt;
				if (this.transitionTime >= 4) {
					this._enterSection(this.section + 1);
					this.emit("checkpoint", { section: this.section });
				}
				return;
			}
			this.sectionTime += dt;
			this._updateWindows();
			for (const a of this.actors)
				this._actor(a, intents[a.id] || neutral(), dt);
			if (this.phase === "failed") return;
			this._schedule();
			this._hearts(dt);
			this._hazards(dt);
			this._objectives(dt);
		}
		advance(seconds, intents = {}) {
			const steps = Math.round(seconds * 120);
			for (let n = 0; n < steps; n++)
				this.step(
					1 / 120,
					typeof intents === "function" ? intents(this) : intents,
				);
		}
		botIntent(id, options = {}) {
			const a = this.actors.find((p) => p.id === id);
			if (!a || a.hurt || a.finished) return neutral();
			const b = a.body,
				s = this.currentSection(),
				i = neutral(),
				floor = this.floorOf(a);
			a.botLatency = clamp(options.latency || 0, 0, 0.5);
			if (a.traversal) {
				i.up = true;
				return i;
			}
			if (
				this.section === 0 &&
				floor === 0 &&
				a.stats.jumps === 0 &&
				this.sectionTime > 0.1 &&
				b.onGround
			)
				return { ...i, x: 1, jump: true, jumpPressed: true };
			const groundZ = 16 + floor * 48;
			let goal = s.exitX;
			const heart = this.hearts
				.filter(
					(h) =>
						!h.collected &&
						h.floor === floor &&
						h.age > 1.0 &&
						h.age < h.life - 0.5,
				)
				.sort((p, q) => Math.abs(p.x - b.x) - Math.abs(q.x - b.x))[0];
			if (
				heart &&
				a.power < 1 &&
				(Math.abs(heart.x - b.x) < 90 || (this.section === 3 && floor >= 2))
			)
				goal = heart.targetX;
			else if (floor < s.floors) {
				const ws = this.windows.filter((w) => w.floor === floor);
				const usable = ws.find(
					(w) =>
						w.usable &&
						(w.phase === "open"
							? w.remaining + this.config.windowWarning
							: w.remaining) >
							Math.abs(w.x - b.x) / this.config.run +
								this.config.climbTime +
								0.15,
				);
				const opening = ws.find((w) => w.phase === "opening");
				const selected =
					usable ||
					opening ||
					ws.slice().sort((p, q) => p.remaining - q.remaining)[0];
				if (selected) {
					goal = selected.x;
					if (
						Math.abs(b.x - goal) < 11 &&
						selected.usable &&
						b.onGround &&
						(selected.phase === "open"
							? selected.remaining + this.config.windowWarning
							: selected.remaining) >
							this.config.climbTime + 0.45
					)
						i.up = true;
				}
			}
			if (i.up) return i;
			if (
				a.botCache &&
				this.tick - a.botCache.tick < 6 &&
				a.botCache.floor === floor
			)
				return {
					...a.botCache.intent,
					jump: a.botCache.intent.jump || this.tick < (a.botJumpUntil || 0),
					jumpPressed: false,
				};
			const plan = this._botPlan(a, goal);
			if (plan.jumpPressed) a.botJumpUntil = this.tick + 42;
			plan.jump ||= this.tick < (a.botJumpUntil || 0);
			a.botCache = { tick: this.tick, floor, intent: plan };
			return plan;
		}
		_botPlan(a, goal) {
			const b = a.body,
				s = this.currentSection(),
				dx = goal - b.x - b.vx * (a.botLatency || 0),
				desired =
					Math.abs(dx) < Math.max(2, Math.abs(b.vx) * 0.045)
						? 0
						: Math.abs(dx) < 30
							? Math.sign(dx) * 0.4
							: Math.sign(dx);
			if (a.power > 0.3) return { ...neutral(), x: desired, jump: !b.onGround };
			const threats = this.hazards.filter(
				(h) =>
					!h.spent && Math.abs(h.x - b.x) < 150 && Math.abs(h.z - b.z) < 70,
			);
			if (!threats.length)
				return { ...neutral(), x: desired, jump: !b.onGround };
			let best = null;
			const candidates = [...new Set([desired, 0, -1, 1])];
			const delays = b.onGround ? [-1, 0, 0.1, 0.2, 0.3] : [-1];
			for (const x of candidates)
				for (const delay of delays) {
					const probe = Object.assign(new this.E.Platformer({ ...b }), b);
					let risk = 0;
					const latency = a.botLatency || 0,
						duration = 0.72 + latency,
						step = 1 / 60;
					let jumped = false;
					for (let t = step; t <= duration; t += step) {
						const press = delay >= 0 && !jumped && t >= latency + delay;
						if (press) jumped = true;
						const controls =
							t < latency
								? {
										...a.lastIntent,
										up: false,
										down: false,
										jumpPressed: false,
									}
								: { x, jump: jumped || !b.onGround, jumpPressed: press };
						probe.update(step, this.level, controls);
						if (
							probe.x < s.inset + 9 ||
							probe.x > 311 - s.inset ||
							probe.z < 12
						) {
							risk += 50000;
							break;
						}
						for (const h of threats) {
							const pending = Math.max(0, (h.telegraph || 0) - h.age),
								active = Math.max(0, t - pending);
							if (h.state === "telegraph" && t < pending) continue;
							const hz = { x: h.x + h.vx * active, z: h.z, w: h.w, h: h.h };
							if (h.type === "bird") {
								const elapsed = Math.max(0, h.age - h.telegraph + t),
									flight = (320 - s.inset * 2) / Math.abs(h.vx),
									u = clamp(elapsed / flight, 0, 1);
								hz.z =
									h.startZ +
									(u < 0.25
										? 33 - u * 72
										: u > 0.75
											? 15 + (u - 0.75) * 72
											: 15);
							} else if (h.type === "bat") {
								const elapsed = Math.max(0, h.age - h.telegraph + t),
									p = (elapsed % 2.4) / 2.4;
								hz.z =
									h.startZ +
									(p < 0.35
										? 34 - (p / 0.35) * 24
										: p < 0.6
											? 10
											: 10 + ((p - 0.6) / 0.4) * 24);
							} else if (h.state === "drop") hz.z += h.vz * t - 300 * t * t;
							if (
								this.E.overlapBox(
									{
										x: probe.x,
										z: probe.z + 1,
										w: probe.w - 2,
										h: probe.h - 3,
									},
									hz,
								)
							)
								risk += 20000 * step;
						}
					}
					const cost =
						risk +
						Math.abs(goal - probe.x) +
						Math.abs(probe.vx) * 0.025 +
						(delay === 0 ? 1.5 : 0) +
						(x === desired ? 0 : 0.3);
					if (!best || cost < best.cost)
						best = {
							cost,
							x,
							jump: jumped || !b.onGround,
							jumpPressed: delay === 0,
						};
				}
			return {
				...neutral(),
				x: best.x,
				jump: best.jumpPressed || !b.onGround,
				jumpPressed: best.jumpPressed,
			};
		}
		snapshot() {
			return clone({
				v: 1,
				seed: this.seed,
				hard: this.hard,
				config: this.config,
				tick: this.tick,
				time: this.time,
				section: this.section,
				sectionTime: this.sectionTime,
				phase: this.phase,
				score: this.score,
				chances: this.chances,
				continued: this.continued,
				rescued: this.rescued,
				departureTime: this.departureTime,
				transitionTime: this.transitionTime,
				regroup: this.regroup,
				roofBeat: this.roofBeat,
				unranked: this.unranked,
				invulnerable: this.invulnerable,
				actors: this.actors.map((a) => ({
					id: a.id,
					seat: a.seat,
					name: a.name,
					body: { ...a.body },
					traversal: a.traversal,
					power: a.power,
					recovery: a.recovery,
					hurt: a.hurt,
					finished: a.finished,
					pose: a.pose,
					jumpBuffer: a.jumpBuffer,
					lastIntent: a.lastIntent,
					windowCooldown: a.windowCooldown,
					stats: a.stats,
				})),
				hazards: this.hazards,
				hearts: this.hearts,
				windows: this.windows,
				floorSeen: this.floorSeen,
				spawned: this.spawned,
				heartSpawned: this.heartSpawned,
				collectedHearts: this.collectedHearts,
				sectionHits: this.sectionHits,
				ledger: this.ledger,
				checkpoint: this.checkpoint,
				eventSerial: this.eventSerial,
				events: this.events,
				coverage: this.coverage,
			});
		}
		restore(state) {
			if (!state || state.v !== 1)
				throw new Error("Invalid simulation snapshot");
			const s = clone(state);
			this.config = { ...TT.DEFAULTS, ...s.config };
			this.hard = s.hard;
			this._enterSection(s.section, { checkpoint: false });
			for (const [k, v] of Object.entries(s))
				if (!["v", "actors", "windows"].includes(k)) this[k] = v;
			this.windows = s.windows;
			this.actors = s.actors.map((data) => {
				const a = this.makeActor(data);
				Object.assign(a, data);
				a.body = Object.assign(new this.E.Platformer(data.body), data.body);
				if (a.traversal)
					this._createAction(
						a,
						this.windows.find((w) => w.id === a.traversal.windowId),
					);
				return a;
			});
			this.players = this.actors;
			return this;
		}
		compactSnapshot() {
			return {
				v: 1,
				t: this.tick,
				tm: round(this.time),
				s: this.section,
				st: round(this.sectionTime),
				p: PHASES.indexOf(this.phase),
				sc: this.score,
				c: this.chances,
				r: +this.rescued,
				rb: this.roofBeat,
				tr: round(this.transitionTime),
				d: round(this.departureTime),
				rg: round(this.regroup),
				a: this.actors.map((a) => [
					a.id,
					a.seat,
					round(a.x),
					round(a.z),
					round(a.vx),
					round(a.vz),
					a.traversal
						? this.windows.findIndex((w) => w.id === a.traversal.windowId)
						: -1,
					round(a.traversal?.progress || 0),
					round(a.power),
					round(a.recovery),
					round(a.hurt),
					+a.finished,
					a.body.facing,
				]),
				h: this.hazards
					.filter((h) => !h.spent)
					.map((h) => [
						h.id,
						TYPES.indexOf(h.type),
						round(h.x),
						round(h.z),
						round(h.vx),
						round(h.vz),
						STATES.indexOf(h.state),
						round(h.age),
						h.floor,
						h.r,
					]),
				ht: this.hearts
					.filter((h) => !h.collected)
					.map((h) => [
						h.id,
						round(h.x),
						round(h.z),
						round(h.age),
						h.floor,
						h.targetX,
						h.targetZ,
					]),
				l: Object.entries(this.ledger).map(([k, v]) => [k, v.value, v.reason]),
				e: this.eventSerial,
				ev: this.events
					.slice(-5)
					.map((e) => [e.id, e.type, e.actor ?? -1, e.x ?? 0, e.z ?? 0]),
			};
		}
		applyCompact(s) {
			if (!s || s.v !== 1 || !Number.isInteger(s.t) || s.t < this.tick)
				return false;
			if (s.s !== this.section) this._enterSection(s.s, { checkpoint: false });
			this.tick = s.t;
			this.time = s.tm;
			this.sectionTime = s.st;
			this.phase = PHASES[s.p];
			this.score = s.sc;
			this.chances = s.c;
			this.rescued = !!s.r;
			this.roofBeat = s.rb;
			this.transitionTime = s.tr;
			this.departureTime = s.d;
			this.regroup = s.rg;
			this._updateWindows(false);
			const old = new Map(this.actors.map((a) => [a.id, a]));
			this.actors = s.a.map((v) => {
				const a = old.get(v[0]) || this.makeActor({ id: v[0], seat: v[1] });
				Object.assign(a.body, {
					x: v[2],
					z: v[3],
					vx: v[4],
					vz: v[5],
					facing: v[12],
					onGround: v[6] < 0 && Math.abs((v[3] - 16) % 48) < 0.1,
					climbing: v[6] >= 0,
				});
				a.traversal =
					v[6] >= 0
						? {
								windowId: this.windows[v[6]].id,
								progress: v[7],
								from: this.windows[v[6]].z,
								to: this.windows[v[6]].toZ,
								startX: v[2],
							}
						: null;
				a.power = v[8];
				a.recovery = v[9];
				a.hurt = v[10];
				a.finished = !!v[11];
				return a;
			});
			this.players = this.actors;
			this.hazards = s.h.map((v) => ({
				id: v[0],
				type: TYPES[v[1]],
				x: v[2],
				z: v[3],
				vx: v[4],
				vz: v[5],
				state: STATES[v[6]],
				age: v[7],
				floor: v[8],
				r: v[9],
				w: v[9] * 2,
				h: v[9] * 2,
				startZ: 16 + v[8] * 48,
				spent: false,
			}));
			this.hearts = s.ht.map((v) => ({
				id: v[0],
				x: v[1],
				z: v[2],
				age: v[3],
				floor: v[4],
				targetX: v[5],
				targetZ: v[6],
				collected: false,
				life: 12,
			}));
			this.eventSerial = s.e;
			if (Array.isArray(s.l))
				this.ledger = Object.fromEntries(
					s.l.map(([k, value, reason]) => [k, { value, reason }]),
				);
			for (const e of s.ev || [])
				if (!this.events.some((p) => p.id === e[0]))
					this.events.push({
						id: e[0],
						type: e[1],
						actor: e[2],
						x: e[3],
						z: e[4],
					});
			this.events = this.events.slice(-48);
			return true;
		}
		recordCategory() {
			return this.unranked
				? "unranked"
				: this.continued
					? "continued"
					: "clean";
		}
		outcome() {
			return {
				phase: this.phase,
				rescued: this.rescued,
				score: this.score,
				chances: this.chances,
				section: this.section,
				continued: this.continued,
			};
		}
	}
	TT.Simulation = Simulation;
	if (typeof module !== "undefined") module.exports = TT;
})();
