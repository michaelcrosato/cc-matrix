(() => {
	globalThis.SF = globalThis.SF || {};
	const SF = globalThis.SF;
	const finite = Number.isFinite;
	const q = (n) => (finite(n) ? Math.round(n * 100) / 100 : 0);
	const quantize = (_key, value) =>
		typeof value === "number" && !Number.isInteger(value) ? q(value) : value;
	const table = (list) => {
		const keys = [...new Set(list.flatMap((v) => Object.keys(v)))];
		return [
			keys,
			list.map((v) => keys.map((k) => (v[k] === undefined ? null : v[k]))),
		];
	};
	const untab = ([keys, rows]) =>
		rows.map((row) => Object.fromEntries(keys.map((k, i) => [k, row[i]])));
	const framePack = (s) => {
		const out = { ...s };
		for (const k of ["players", "enemies", "shots", "pickups", "events"])
			out[k] = table(s[k] || []);
		return { packed: 1, state: out };
	};
	const frameUnpack = (v) => {
		if (v?.packed !== 1) return v;
		const out = v.state;
		for (const k of ["players", "enemies", "shots", "pickups", "events"])
			out[k] = untab(out[k]);
		return out;
	};
	const clock = () =>
		typeof performance !== "undefined" ? performance.now() : Date.now();
	const bytes = (value) =>
		new TextEncoder().encode(JSON.stringify(value)).length;
	const neutral = (id) => ({
		id,
		seq: 0,
		mx: 0,
		my: 0,
		ax: 0,
		ay: -1,
		fire: false,
		boost: false,
		pulse: false,
	});
	const E_KEYS = [
		"id",
		"type",
		"x",
		"y",
		"vx",
		"vy",
		"hp",
		"maxHp",
		"r",
		"t",
		"telegraph",
		"cycle",
		"phase",
		"tx",
		"ty",
		"lock",
	];
	const S_KEYS = [
		"id",
		"x",
		"y",
		"px",
		"py",
		"vx",
		"vy",
		"life",
		"owner",
		"damage",
		"r",
	];
	const U_KEYS = ["id", "x", "y", "t"];
	const pack = (entity, keys) =>
		keys.map((k) =>
			typeof entity[k] === "number"
				? q(entity[k])
				: entity[k] === undefined
					? null
					: entity[k],
		);
	const unpack = (row, keys) =>
		Object.fromEntries(keys.map((k, i) => [k, row[i]]));
	const playerRow = (p) => [
		p.id,
		q(p.x),
		q(p.y),
		q(p.vx),
		q(p.vy),
		q(p.angle),
		q(p.hp),
		q(p.maxHp),
		q(p.energy),
		q(p.pulse),
		q(p.invuln),
		q(p.respawn),
		q(p.boostT),
		q(p.flash),
		p.lock || null,
		p.lastSeq || 0,
		p.upgrades || [0, 0, 0],
		p.active !== false ? 1 : 0,
		q(p.pulseFX),
		p.choice === undefined ? -1 : p.choice,
	];
	const P_KEYS = [
		"id",
		"x",
		"y",
		"vx",
		"vy",
		"angle",
		"hp",
		"maxHp",
		"energy",
		"pulse",
		"invuln",
		"respawn",
		"boostT",
		"flash",
		"lock",
		"lastSeq",
		"upgrades",
		"active",
		"pulseFX",
		"choice",
	];

	class Online {
		constructor(info, app) {
			this.info = info;
			this.app = app;
			this.hub = app.hub || globalThis.AIHub;
			this.isHost = !!info.isHost;
			this.started = false;
			this.ended = false;
			this.finished = false;
			this.round = info.round || 0;
			this.epoch = app.world.s.epoch;
			this.members = new Set(info.players.map((p) => p.id));
			this.pending = new Map();
			this.sequences = new Map();
			this.receivedAt = new Map();
			this.seq = 0;
			this.sent = 0;
			this.rejected = 0;
			this.maxUnreliableBytes = 0;
			this.maxReliableBytes = 0;
			this.maxSnapshotBytes = 0;
			this.keyframes = 0;
			this.lastSnapshot = null;
			this._lastKeyTick = -1;
			this._motionTick = -1;
			this._detailTick = -1;
			this._assembly = new Map();
			this._detailAssembly = new Map();
			this._keyQueue = [];
			this._details = [];
			this._slot = 0;
			this._nextSend = 0;
			this._nextKey = 0;
			this._chunkSequence = 0;
			this._targets = new Map();
			this._actionSequence = new Map();
			this._localPending = null;
			this._boostPending = false;
			this._pulsePending = false;
			this._lastMotion = null;
			this._prediction = null;
			this._predictionHistory = [];
			this._localAuthority = null;
			this._predictionOffset = { x: 0, y: 0 };
			this._predictionAck = -1;
			this.predictionCorrections = 0;
			this.predictionSteps = 0;
			this._unsub = [];
			const on = (name, fn) => this._unsub.push(this.hub.on(name, fn));
			on("start", () => {
				this.started = true;
				this._status("Weapons safe. Awaiting synchronized launch.");
			});
			on("message", (data, from) => this._receive(data, from));
			on("leave", ({ id }) => this._leave(id));
			on("time-up", () => this._timeUp());
			on("end", ({ reason }) => this._end(reason));
			this._status(
				info.server
					? "Dedicated command ship ready"
					: "Connected. Awaiting Hub launch.",
			);
			this.hub.ready();
		}

		_status(text) {
			if (this.app.onStatus) this.app.onStatus(text);
		}
		_now() {
			return this.app.networkNow ? this.app.networkNow() : clock();
		}
		_send(data, reliable = false, to) {
			if (this.ended || this.finished) return false;
			const size = bytes(data);
			if (size > (reliable ? 15000 : 1200)) {
				this.rejected++;
				return false;
			}
			if (reliable)
				this.maxReliableBytes = Math.max(this.maxReliableBytes, size);
			else this.maxUnreliableBytes = Math.max(this.maxUnreliableBytes, size);
			const ok = this.hub.send(data, {
				reliable,
				...(to !== undefined ? { to } : {}),
			});
			if (ok !== false) this.sent++;
			return ok !== false;
		}

		_validIntent(value, from) {
			if (
				!value ||
				typeof value !== "object" ||
				!this.members.has(from) ||
				value.id !== from
			)
				return null;
			if (
				!Number.isSafeInteger(value.seq) ||
				value.seq < 1 ||
				value.seq <= (this.sequences.get(from) || 0)
			)
				return null;
			const out = neutral(from);
			out.seq = value.seq;
			for (const key of ["mx", "my", "ax", "ay"]) {
				if (!finite(value[key])) return null;
				out[key] = Math.max(-1, Math.min(1, value[key]));
			}
			for (const pair of [
				["mx", "my"],
				["ax", "ay"],
			]) {
				const length = Math.hypot(out[pair[0]], out[pair[1]]);
				if (length > 1) {
					out[pair[0]] /= length;
					out[pair[1]] /= length;
				}
			}
			for (const key of ["fire", "boost", "pulse"]) {
				if (typeof value[key] !== "boolean") return null;
				out[key] = value[key];
			}
			if (value.choice !== undefined) {
				if (
					!Number.isInteger(value.choice) ||
					value.choice < 0 ||
					value.choice > 2
				)
					return null;
				out.choice = value.choice;
			}
			return out;
		}

		_receive(data, from) {
			if (this.ended || this.finished || !data || data.r !== this.round) return;
			if (this.isHost) {
				if (data.k !== "i" || data.e !== this.epoch) return;
				const input = this._validIntent(data.v, from);
				if (!input) {
					this.rejected++;
					return;
				}
				this.pending.set(from, input);
				this.sequences.set(from, input.seq);
				this.receivedAt.set(from, this._now());
				return;
			}
			if (from !== this.info.host) {
				this.rejected++;
				return;
			}
			if (data.k === "f") this._receiveKeyframe(data);
			else if (data.k === "m") this._receiveMotion(data);
			else if (data.k === "d") this._receiveDetail(data);
		}

		_receiveKeyframe(data) {
			if (
				!Number.isSafeInteger(data.t) ||
				data.t < 0 ||
				data.t <= this._lastKeyTick ||
				!Number.isSafeInteger(data.i) ||
				!Number.isSafeInteger(data.n) ||
				data.n < 1 ||
				data.n > 128 ||
				data.i < 0 ||
				data.i >= data.n ||
				typeof data.v !== "string" ||
				data.v.length > 12000
			)
				return;
			const key = `${String(data.e)}:${data.g}`;
			let assembly = this._assembly.get(key);
			if (!assembly) {
				if (this._assembly.size >= 4)
					this._assembly.delete(this._assembly.keys().next().value);
				assembly = {
					n: data.n,
					t: data.t,
					e: data.e,
					parts: new Array(data.n),
					count: 0,
				};
				this._assembly.set(key, assembly);
			}
			if (
				assembly.n !== data.n ||
				assembly.t !== data.t ||
				assembly.e !== data.e
			)
				return;
			if (assembly.parts[data.i] === undefined) {
				assembly.parts[data.i] = data.v;
				assembly.count++;
			}
			if (assembly.count !== assembly.n) return;
			this._assembly.delete(key);
			let snapshot;
			try {
				snapshot = frameUnpack(JSON.parse(assembly.parts.join("")));
			} catch {
				this.rejected++;
				return;
			}
			if (
				!snapshot ||
				snapshot.epoch !== data.e ||
				snapshot.tick !== data.t ||
				!Array.isArray(snapshot.players) ||
				!Array.isArray(snapshot.enemies) ||
				!Array.isArray(snapshot.shots) ||
				!snapshot.objective
			)
				return;
			if (this._lastKeyTick >= 0 && data.e !== this.epoch) return;
			this.epoch = data.e;
			this._lastKeyTick = data.t;
			this.lastSnapshot = snapshot;
			this.app.world.restore(snapshot);
			this.keyframes++;
			// Motion may arrive ahead of a larger reliable keyframe. Reapply it after
			// the atomic restore so replication never rolls objective/score backward.
			if (
				this._lastMotion &&
				this._lastMotion.t >= data.t &&
				this._lastMotion.e === data.e
			)
				this._applyMotion(this._lastMotion);
			else {
				const local = this.app.world.s.players.find(
					(p) => p.id === this.info.me,
				);
				if (local) this._reconcileLocal(local, { ...local }, false);
			}
			this._targets.clear();
		}

		_receiveMotion(data) {
			if (
				data.e !== this.epoch ||
				!Number.isSafeInteger(data.t) ||
				data.t < this._motionTick ||
				!Array.isArray(data.p)
			)
				return;
			this._motionTick = data.t;
			this._lastMotion = data;
			this._applyMotion(data);
		}

		_applyMotion(data) {
			const s = this.app.world.s;
			const actChanged = s.act !== data.a;
			s.tick = data.t;
			s.time = data.v;
			s.act = data.a;
			s.wave = data.w;
			s.state = data.l;
			s.score = data.c;
			s.combo = data.z;
			s.timer = data.tm;
			s.notice = data.n;
			s.noticeTime = data.nt;
			s.actTime = data.at;
			s.waveTime = data.wt;
			if (
				actChanged ||
				data.l === "transition" ||
				data.l === "upgrade" ||
				data.l === "briefing"
			) {
				s.enemies = [];
				s.shots = [];
				s.pickups = [];
			}
			if (data.o)
				Object.assign(s.objective, {
					heat: data.o[0],
					integrity: data.o[1],
					lastHit: data.o[2],
					radiators: [0, 1, 2, 3].map((i) => !!(data.o[3] & (1 << i))),
				});
			for (const row of data.p) {
				const p = s.players.find((p) => p.id === row[0]);
				if (!p) continue;
				const values = unpack(row, P_KEYS);
				values.active = !!values.active;
				if (p.id === this.info.me && !this.info.server) {
					const { x, y, ...rest } = values;
					Object.assign(p, rest);
					this._reconcileLocal(p, values, actChanged);
					continue;
				}
				if (
					this.keyframes &&
					p.hp > 0 &&
					values.hp > 0 &&
					Math.hypot(p.x - values.x, p.y - values.y) < 120
				) {
					const { x, y, ...rest } = values;
					Object.assign(p, rest);
					this._targets.set(p.id, {
						x,
						y,
						vx: values.vx,
						vy: values.vy,
						at: this._now(),
					});
				} else Object.assign(p, values);
			}
			if (data.b) {
				if (!s.boss) s.boss = {};
				Object.assign(s.boss, {
					phase: data.b[0],
					hp: data.b[1],
					maxHp: data.b[2],
					x: data.b[3],
					y: data.b[4],
					cycle: data.b[5],
					components: (data.bc || []).map((row) =>
						unpack(row, ["id", "x", "y", "hp", "maxHp", "open", "type", "off"]),
					),
				});
			} else s.boss = null;
			if (data.rs) s.result = data.rs;
		}

		_receiveDetail(data) {
			if (this.app.world.s.state !== "play") return;
			if (
				data.e !== this.epoch ||
				!Number.isSafeInteger(data.t) ||
				data.t <= this._detailTick ||
				!Number.isInteger(data.i) ||
				!Number.isInteger(data.n) ||
				data.n < 1 ||
				data.n > 64 ||
				data.i < 0 ||
				data.i >= data.n ||
				!Array.isArray(data.v)
			)
				return;
			const key = data.t;
			let assembly = this._detailAssembly.get(key);
			if (!assembly) {
				if (this._detailAssembly.size >= 3)
					this._detailAssembly.delete(this._detailAssembly.keys().next().value);
				assembly = { n: data.n, parts: new Array(data.n), count: 0 };
				this._detailAssembly.set(key, assembly);
			}
			if (assembly.n !== data.n) return;
			if (assembly.parts[data.i] === undefined) {
				assembly.parts[data.i] = data.v;
				assembly.count++;
			}
			if (assembly.count !== assembly.n) return;
			this._detailAssembly.delete(key);
			const s = this.app.world.s,
				enemies = [],
				shots = [],
				pickups = [];
			for (const row of assembly.parts.flat()) {
				if (row[0] === 0) enemies.push(unpack(row.slice(1), E_KEYS));
				if (row[0] === 1) shots.push(unpack(row.slice(1), S_KEYS));
				if (row[0] === 2) pickups.push(unpack(row.slice(1), U_KEYS));
			}
			s.enemies = enemies;
			s.shots = shots;
			s.pickups = pickups;
			this._detailTick = data.t;
		}

		_motion() {
			const s = this.app.world.s;
			return {
				k: "m",
				r: this.round,
				e: this.epoch,
				t: s.tick,
				v: q(s.time),
				at: q(s.actTime),
				wt: q(s.waveTime),
				a: s.act,
				w: s.wave,
				l: s.state,
				c: s.score,
				z: s.combo,
				tm: q(s.timer),
				n: s.notice || "",
				nt: q(s.noticeTime),
				o: [
					q(s.objective.heat),
					q(s.objective.integrity),
					q(s.objective.lastHit),
					(s.objective.radiators || []).reduce(
						(m, v, i) => m | (v ? 1 << i : 0),
						0,
					),
				],
				p: s.players.map(playerRow),
				b: s.boss
					? [
							s.boss.phase,
							q(s.boss.hp),
							s.boss.maxHp,
							q(s.boss.x),
							q(s.boss.y),
							q(s.boss.cycle),
						]
					: null,
				bc: s.boss
					? s.boss.components.map((c) =>
							pack(c, ["id", "x", "y", "hp", "maxHp", "open", "type", "off"]),
						)
					: undefined,
				rs: s.result || undefined,
			};
		}

		_makeKeyframes() {
			const s = this.app.world.snapshot();
			const json = JSON.stringify(framePack(s), quantize);
			this.maxSnapshotBytes = Math.max(
				this.maxSnapshotBytes,
				new TextEncoder().encode(json).length,
			);
			const g = ++this._chunkSequence,
				parts = [];
			// Small string chunks remain far below the 16KB hard limit even when
			// names or nested JSON quotes expand during the enclosing stringify.
			for (let i = 0; i < json.length; i += 6000)
				parts.push(json.slice(i, i + 6000));
			if (parts.length > 128) {
				this.hub.fail("Command snapshot exceeds supported battle size");
				return;
			}
			this._keyQueue = parts.map((v, i) => ({
				k: "f",
				r: this.round,
				e: s.epoch,
				t: s.tick,
				g,
				i,
				n: parts.length,
				v,
			}));
		}

		_makeDetails() {
			const s = this.app.world.s,
				rows = [];
			for (const e of s.enemies) rows.push([0, ...pack(e, E_KEYS)]);
			for (const shot of s.shots) rows.push([1, ...pack(shot, S_KEYS)]);
			for (const pickup of s.pickups) rows.push([2, ...pack(pickup, U_KEYS)]);
			const base = {
					k: "d",
					r: this.round,
					e: this.epoch,
					t: s.tick,
					i: 0,
					n: 64,
					v: [],
				},
				parts = [];
			for (const row of rows) {
				base.v.push(row);
				if (bytes(base) > 1120) {
					base.v.pop();
					parts.push(base.v);
					base.v = [row];
				}
			}
			parts.push(base.v);
			this._details = parts.map((v, i) => ({ ...base, i, n: parts.length, v }));
		}

		_predictionAllowed(p) {
			return (
				!this.isHost &&
				!this.info.server &&
				this.started &&
				this.hub.time() >= 0 &&
				!this.app.overlay &&
				this.app.world.s.state === "play" &&
				p?.active !== false &&
				p?.hp > 0 &&
				!this.ended &&
				!this.finished
			);
		}

		_constrainPose(pose, act) {
			pose.x = Math.max(28, Math.min(932, pose.x));
			pose.y = act === 2 ? 465 : Math.max(82, Math.min(470, pose.y));
			if (act === 2) pose.vy = 0;
			if (act === 1) {
				const dx = pose.x - 480,
					dy = pose.y - 270,
					d = Math.hypot(dx, dy);
				if (d < 73) {
					pose.x = 480 + (d ? dx / d : 0) * 73;
					pose.y = 270 + (d ? dy / d : 1) * 73;
				}
			}
			return pose;
		}

		_integratePose(pose, intent, dt, p, act) {
			const b = this.app.world.balance || SF.DEFAULTS;
			let mx = finite(intent.mx) ? Math.max(-1, Math.min(1, intent.mx)) : 0;
			let my =
				act === 2
					? 0
					: finite(intent.my)
						? Math.max(-1, Math.min(1, intent.my))
						: 0;
			const m = Math.hypot(mx, my);
			if (m > 1) {
				mx /= m;
				my /= m;
			}
			pose.boostT = Math.max(0, (pose.boostT || 0) - dt);
			if (intent.boost && p.energy >= 26 && pose.boostT === 0) {
				let dx = mx,
					dy = my;
				if (act === 2) {
					const ax = finite(intent.ax) ? intent.ax : 0,
						ay = finite(intent.ay) ? intent.ay : 0;
					const facing =
						Math.hypot(ax, ay) > 0.1
							? Math.atan2(Math.min(-0.2, ay), ax)
							: p.angle;
					dx = Math.sign(
						mx ||
							pose.vx ||
							(Math.abs(Math.cos(facing)) > 0.1 ? Math.cos(facing) : 1),
					);
					dy = 0;
				}
				if (act !== 2 && Math.hypot(dx, dy) < 0.1) {
					dx = finite(intent.ax) ? intent.ax : Math.cos(p.angle);
					dy = finite(intent.ay) ? intent.ay : Math.sin(p.angle);
				}
				const d = Math.hypot(dx, dy) || 1;
				pose.vx = (dx / d) * 470;
				pose.vy = act === 2 ? 0 : (dy / d) * 470;
				pose.boostT = 0.28;
			}
			if (pose.boostT === 0) {
				pose.vx += mx * b.thrust * dt;
				pose.vy += my * b.thrust * dt;
				const drag = Math.exp(-b.drag * dt);
				pose.vx *= drag;
				pose.vy *= drag;
			}
			pose.x += pose.vx * dt;
			pose.y += pose.vy * dt;
			return this._constrainPose(pose, act);
		}

		_limitPrediction(pose, p, act) {
			const authority = this._localAuthority;
			if (!authority) return this._constrainPose(pose, act);
			const threatened =
				p.lock > 0 ||
				this.app.world.s.enemies.some(
					(e) =>
						e.type === "anchor" &&
						Math.hypot(e.x - authority.x, e.y - authority.y) < 160,
				);
			const maxLead = threatened ? 24 : pose.boostT > 0 ? 72 : 48;
			const dx = pose.x - authority.x,
				dy = pose.y - authority.y,
				d = Math.hypot(dx, dy);
			if (d > maxLead) {
				pose.x = authority.x + (dx / d) * maxLead;
				pose.y = authority.y + (dy / d) * maxLead;
			}
			return this._constrainPose(pose, act);
		}

		_reconcileLocal(p, authoritative, reset) {
			const s = this.app.world.s;
			const ack = Number.isSafeInteger(authoritative.lastSeq)
				? authoritative.lastSeq
				: -1;
			this._predictionAck = Math.max(this._predictionAck, ack);
			this._predictionHistory = this._predictionHistory.filter(
				(entry) => entry.seq > ack,
			);
			this._localAuthority = { ...authoritative, at: this._now(), act: s.act };
			if (reset || !this._predictionAllowed(p)) {
				p.x = authoritative.x;
				p.y = authoritative.y;
				this._prediction = null;
				this._predictionHistory = [];
				this._predictionOffset = { x: 0, y: 0 };
				this._targets.set(p.id, {
					x: p.x,
					y: p.y,
					vx: authoritative.vx,
					vy: authoritative.vy,
					at: this._now(),
				});
				return;
			}
			const pose = {
				x: authoritative.x,
				y: authoritative.y,
				vx: authoritative.vx,
				vy: authoritative.vy,
				boostT: authoritative.boostT || 0,
			};
			// Input packet sequences acknowledge intent, while each packet is held
			// over several host steps. Bound replay to one short visual lead; the
			// authoritative simulation remains the only owner of time and hits.
			let budget = 0.22,
				window = [];
			for (
				let i = this._predictionHistory.length - 1;
				i >= 0 && budget > 0;
				i--
			) {
				const entry = this._predictionHistory[i],
					dt = Math.min(entry.dt, budget);
				window.unshift({ ...entry, dt });
				budget -= dt;
			}
			let left = 0.22;
			for (const entry of window) {
				const dt = Math.min(left, entry.dt);
				if (dt <= 0) break;
				this._integratePose(pose, entry.intent, dt, p, s.act);
				left -= dt;
			}
			this._limitPrediction(pose, p, s.act);
			const error = Math.hypot(p.x - pose.x, p.y - pose.y);
			if (this._prediction && error < 90 && !reset) {
				const cap = 20,
					dx = p.x - pose.x,
					dy = p.y - pose.y,
					d = Math.hypot(dx, dy) || 1;
				this._predictionOffset = {
					x: dx * Math.min(1, cap / d),
					y: dy * Math.min(1, cap / d),
				};
			} else this._predictionOffset = { x: 0, y: 0 };
			this._prediction = pose;
			this.predictionCorrections++;
			const visible = this._limitPrediction(
				{
					x: pose.x + this._predictionOffset.x,
					y: pose.y + this._predictionOffset.y,
					vx: pose.vx,
					vy: pose.vy,
				},
				p,
				s.act,
			);
			p.x = visible.x;
			p.y = visible.y;
			p.vx = pose.vx;
			p.vy = pose.vy;
			this._targets.delete(p.id);
		}

		_predictLocal(dt, now) {
			const s = this.app.world.s,
				p = s.players.find((p) => p.id === this.info.me);
			if (!this._predictionAllowed(p)) {
				this._prediction = null;
				this._predictionHistory = [];
				this._predictionOffset = { x: 0, y: 0 };
				return false;
			}
			const intent = this._localPending || neutral(this.info.me),
				h = Math.max(0, Math.min(1 / 120, dt));
			if (!this._prediction) {
				this._prediction = {
					x: p.x,
					y: p.y,
					vx: p.vx,
					vy: p.vy,
					boostT: p.boostT || 0,
				};
				if (!this._localAuthority)
					this._localAuthority = { ...this._prediction, act: s.act, at: now };
			}
			this._predictionHistory.push({
				seq: this.seq + 1,
				dt: h,
				intent: {
					mx: intent.mx,
					my: intent.my,
					ax: intent.ax,
					ay: intent.ay,
					boost: !!intent.boost,
				},
			});
			if (this._predictionHistory.length > 180) this._predictionHistory.shift();
			this._integratePose(this._prediction, intent, h, p, s.act);
			this._limitPrediction(this._prediction, p, s.act);
			const decay = Math.exp(-18 * h);
			this._predictionOffset.x *= decay;
			this._predictionOffset.y *= decay;
			const visible = this._limitPrediction(
				{
					x: this._prediction.x + this._predictionOffset.x,
					y: this._prediction.y + this._predictionOffset.y,
					vx: this._prediction.vx,
					vy: this._prediction.vy,
				},
				p,
				s.act,
			);
			p.x = visible.x;
			p.y = visible.y;
			p.vx = this._prediction.vx;
			p.vy = this._prediction.vy;
			this.predictionSteps++;
			return true;
		}

		_localIntent(id) {
			const raw = this.app.getIntent(id) || neutral(id);
			if (!this.app.overlay) return raw;
			const out = neutral(id);
			if (Number.isInteger(raw.choice)) out.choice = raw.choice;
			return out;
		}

		update(dt) {
			if (this.ended || this.finished) return;
			const now = this._now();
			if (!this.isHost && !this.info.server && this.members.has(this.info.me)) {
				this._localPending = this._localIntent(this.info.me);
				this._boostPending ||= !!this._localPending.boost;
				this._pulsePending ||= !!this._localPending.pulse;
				if (this.app.overlay) {
					this._boostPending = false;
					this._pulsePending = false;
				}
			}
			if (!this.isHost) {
				const predicting = this._predictLocal(dt, now);
				for (const p of this.app.world.s.players) {
					if (predicting && p.id === this.info.me) continue;
					const target = this._targets.get(p.id);
					if (!target || p.hp <= 0) continue;
					const age = Math.max(0, Math.min(0.15, (now - target.at) / 1000)),
						a = 1 - Math.exp(-18 * Math.min(dt, 0.05));
					p.x += (target.x + target.vx * age - p.x) * a;
					p.y += (target.y + target.vy * age - p.y) * a;
				}
			}
			if (now < this._nextSend) return;
			this._nextSend = now + 62.5;
			if (this.isHost) {
				if (now >= this._nextKey && !this._keyQueue.length) {
					this._makeKeyframes();
					this._nextKey = now + 1000;
				}
				if (this._slot++ % 2 === 0) {
					const m = this._motion();
					// A long caption is presentation, and can wait for a keyframe rather
					// than pushing an unreliable combat packet past the MTU budget.
					if (bytes(m) > 1200) m.n = "";
					this._send(m, false);
				} else if (this._keyQueue.length)
					this._send(this._keyQueue.shift(), true);
				else {
					if (!this._details.length) this._makeDetails();
					this._send(this._details.shift(), false);
				}
			} else if (!this.info.server && this.members.has(this.info.me)) {
				const raw = this._localPending || neutral(this.info.me);
				const value = {
					id: this.info.me,
					seq: ++this.seq,
					mx: q(raw.mx || 0),
					my: q(raw.my || 0),
					ax: q(raw.ax || 0),
					ay: q(raw.ay === undefined ? -1 : raw.ay),
					fire: !!raw.fire,
					boost: this._boostPending,
					pulse: this._pulsePending,
				};
				this._boostPending = false;
				this._pulsePending = false;
				if (Number.isInteger(raw.choice)) value.choice = raw.choice;
				this._send(
					{ k: "i", r: this.round, e: this.epoch, v: value },
					false,
					this.info.host,
				);
			}
		}

		intents() {
			const out = Object.create(null);
			if (
				!this.isHost ||
				this.ended ||
				this.finished ||
				!this.started ||
				this.hub.time() < 0
			)
				return out;
			const now = this._now();
			for (const id of this.members) {
				if (!this.info.server && id === this.info.me) {
					const raw = this._localIntent(id);
					const candidate = { ...neutral(id), ...raw, id, seq: ++this.seq };
					const valid = this._validIntent(candidate, id);
					if (valid) {
						out[id] = valid;
						this.sequences.set(id, valid.seq);
					} else out[id] = neutral(id);
				} else {
					out[id] =
						now - (this.receivedAt.get(id) ?? -Infinity) <= 400
							? { ...(this.pending.get(id) || neutral(id)) }
							: neutral(id);
					if (this._actionSequence.get(id) === out[id].seq) {
						out[id].boost = false;
						out[id].pulse = false;
					} else this._actionSequence.set(id, out[id].seq);
				}
			}
			return out;
		}

		afterStep() {
			if (
				!this.isHost ||
				this.ended ||
				this.finished ||
				!this.started ||
				this.hub.time() < 0
			)
				return;
			if (this.app.world.s.result) this._finish(!!this.app.world.s.result.won);
		}

		_leave(id) {
			this.members.delete(id);
			this.pending.delete(id);
			this.sequences.delete(id);
			this.receivedAt.delete(id);
			const p = this.app.world.s.players.find((p) => p.id === id);
			if (p) {
				p.active = false;
				p.hp = 0;
				p.respawn = 0;
				p.vx = 0;
				p.vy = 0;
			}
			if (id === this.info.me && !this.info.server) this._end("left");
		}

		_timeUp() {
			if (!this.isHost || this.ended || this.finished) return;
			const s = this.app.world.s;
			if (!s.result) {
				s.state = "result";
				s.result = {
					won: false,
					reason: "The command signal expired.",
					rank: "FIELD CADET",
					score: finite(s.score) ? s.score : 0,
				};
			}
			this._finish(!!s.result.won);
		}

		_finish(won) {
			if (this.ended || this.finished || !this.isHost) return;
			this.finished = true;
			this._keyQueue = [];
			this._details = [];
			const s = this.app.world.s,
				ids = [...this.members].sort((a, b) => a - b),
				score = finite(s.score) ? s.score : 0,
				scores = {},
				stats = {};
			for (const id of ids) {
				scores[id] = score;
				stats[id] = {
					"Team score": score,
					"Defense layer": Math.min(3, (s.act || 0) + 1),
					Kills: finite(s.kills) ? s.kills : 0,
				};
			}
			this.hub.finish({
				standings: ids.length ? [ids] : [],
				scores,
				won: !!won,
				stats,
			});
		}

		_end(reason) {
			if (this.ended) return;
			this.ended = true;
			this.pending.clear();
			this._keyQueue = [];
			this._details = [];
			this._assembly.clear();
			this._detailAssembly.clear();
			this._targets.clear();
			this._prediction = null;
			this._predictionHistory = [];
			this._localAuthority = null;
			if (this.app.onEnd) this.app.onEnd(reason);
		}

		shutdown() {
			this._end("shutdown");
			for (const off of this._unsub) if (typeof off === "function") off();
			this._unsub = [];
		}
		diagnostics() {
			return {
				isHost: this.isHost,
				server: !!this.info.server,
				started: this.started,
				ended: this.ended,
				finished: this.finished,
				sent: this.sent,
				rejected: this.rejected,
				keyframes: this.keyframes,
				maxUnreliableBytes: this.maxUnreliableBytes,
				maxReliableBytes: this.maxReliableBytes,
				maxSnapshotBytes: this.maxSnapshotBytes,
				acknowledged: Object.fromEntries(this.sequences),
				prediction: {
					active: !!this._prediction,
					ack: this._predictionAck,
					history: this._predictionHistory.length,
					steps: this.predictionSteps,
					corrections: this.predictionCorrections,
				},
			};
		}
	}
	SF.Online = Online;
})();
