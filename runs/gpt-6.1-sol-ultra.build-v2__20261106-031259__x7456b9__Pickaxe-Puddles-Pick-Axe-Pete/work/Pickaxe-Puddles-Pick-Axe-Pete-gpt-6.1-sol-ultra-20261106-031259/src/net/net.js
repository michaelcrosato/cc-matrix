/* Pickaxe Puddles — authoritative shared-world transport. */
(() => {
	globalThis.PP ||= {};
	const PP = globalThis.PP;
	const FIXED = 1 / 120;
	const EDGE = ["jump", "redirect", "interact"];
	const neutral = () => ({
		mx: 0,
		my: 0,
		jump: false,
		jumpHeld: false,
		chop: false,
		redirect: false,
		interact: false,
		interactHeld: false,
		aim: 0,
	});
	const counters = () => [0, 0, 0];
	const now = () => performance.now();
	const round = (n) => Math.round((Number(n) || 0) * 10) / 10;
	const bytes = (s) =>
		new TextEncoder().encode(typeof s === "string" ? s : JSON.stringify(s))
			.length;
	function validIntent(i) {
		if (
			!i ||
			typeof i !== "object" ||
			!Number.isFinite(i.mx) ||
			!Number.isFinite(i.my)
		)
			return null;
		return {
			mx: Math.max(-1, Math.min(1, i.mx)),
			my: Math.max(-1, Math.min(1, i.my)),
			jump: false,
			jumpHeld: !!i.jumpHeld,
			chop: !!i.chop,
			redirect: false,
			interact: false,
			interactHeld: !!i.interactHeld,
			aim: Math.max(-1, Math.min(1, Number(i.aim) || 0)),
		};
	}
	const epochOf = (sim) =>
		`${sim.runEpoch ?? 1}:${sim.chamberEpoch ?? sim.epoch ?? sim.room?.index ?? sim.chamber ?? 0}`;
	class Net {
		constructor({
			createSim,
			onState = () => {},
			onStatus = () => {},
			onClockHandoff = () => {},
		}) {
			this.createSim = createSim;
			this.onState = onState;
			this.onStatus = onStatus;
			this.onClockHandoff = onClockHandoff;
			this.active = false;
			this.isHost = false;
			this.server = false;
			this.localId = null;
			this.status = "standalone";
			this.sim = null;
			this.ended = false;
			this.finished = false;
			this.started = false;
			this.disposed = false;
			this.handlers = [];
			this.remote = new Map();
			this.assemblies = new Map();
			this.queue = [];
			this.localEdges = counters();
			this.localAck = counters();
			this.lastLocal = neutral();
			this.localSeq = 0;
			this.sendAt = 0;
			this.lastFull = -Infinity;
			this.lastPose = -Infinity;
			this.lastInput = -Infinity;
			this.sequence = 0;
			this.lastFullId = -1;
			this.lastPoseId = -1;
			this.pose = null;
			this.lastEpoch = null;
			this.predicted = null;
			this.predictionHistory = [];
			this.stats = {
				sent: 0,
				received: 0,
				rejected: 0,
				dropped: 0,
				maxBytes: 0,
				maxRate: 0,
				snapshots: 0,
				inputs: 0,
			};
			this.sendTimes = [];
			this.accumulator = 0;
			this.timer = null;
			this.backgroundTimer = null;
			this.backgroundOwner = false;
			this.backgroundAccumulator = 0;
			this.visibilityDocument = null;
			this.visibilityHandler = null;
			this.finishTimer = null;
			this.pendingOutcome = null;
			this.gameplayRng = null;
			this.presentationRng = null;
		}
		async connect() {
			this.hub = globalThis.AIHub;
			const hub = this.hub;
			if (!hub) return false;
			const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
			if (!info || this.disposed) return false;
			this.active = true;
			this.isHost = !!hub.isHost;
			this.server = !!hub.server;
			this.localId = this.server ? null : hub.me;
			this.roster = info.players.map((p) => ({
				id: p.id,
				name: String(p.name),
				color: p.color,
			}));
			this.gameplayRng = hub.rng("pickaxe-puddles/gameplay");
			this.presentationRng = hub.rng("pickaxe-puddles/presentation");
			const seed = Math.floor(this.gameplayRng() * 4294967296) >>> 0;
			this.sim = this.createSim({ seed, seats: this.roster, online: true });
			this.lastEpoch = epochOf(this.sim);
			for (const p of this.roster)
				this.remote.set(p.id, {
					seq: -1,
					epoch: this.lastEpoch,
					edges: counters(),
					consumed: counters(),
					intent: neutral(),
					at: -Infinity,
				});
			this.handlers.push(
				hub.on("start", (detail) => {
					this.started = true;
					this.setStatus("countdown", detail);
				}),
			);
			this.handlers.push(
				hub.on("message", (data, from) => this.receive(data, from)),
			);
			this.handlers.push(
				hub.on("leave", ({ id, reason }) => {
					this.roster = this.roster.filter((p) => p.id !== id);
					this.remote.delete(id);
					if (this.isHost && !this.ended) {
						this.sim.removeMiner(id);
						this.lastFull = -Infinity;
						if (!this.roster.length) this.finish(false, "all-players-left");
					}
					this.onStatus(this.status, { leave: id, reason });
				}),
			);
			this.handlers.push(
				hub.on("time-up", (detail) => {
					if (this.isHost && !this.ended) {
						if (!this.sim.completed)
							this.sim.completed = { won: false, reason: "time-up" };
						this.finish(
							!!this.sim.completed.won,
							this.sim.completed.reason || "time-up",
						);
					}
					this.onStatus("time-up", detail);
				}),
			);
			this.handlers.push(hub.on("end", (detail) => this.end(detail)));
			this.setStatus("waiting");
			this.onState(this.sim);
			hub.ready();
			if (this.server) this.startServer();
			else if (this.isHost) this.watchVisibility();
			return true;
		}
		setStatus(status, detail) {
			if (this.status === status) return;
			this.status = status;
			this.onStatus(status, detail);
		}
		startServer() {
			// A nonplayer authority deliberately has no renderer, input, camera or audio.
			let previous = now();
			this.timer = setInterval(() => {
				if (this.ended || this.disposed) return;
				const time = now();
				this.accumulator = Math.min(
					0.5,
					this.accumulator + Math.max(0, (time - previous) / 1000),
				);
				previous = time;
				while (this.accumulator + 1e-9 >= FIXED) {
					this.advance(FIXED, neutral());
					this.accumulator -= FIXED;
				}
			}, 8);
		}
		watchVisibility() {
			const document = globalThis.document;
			if (!document?.addEventListener || !this.isHost || this.server) return;
			this.visibilityDocument = document;
			this.visibilityHandler = () => {
				if (document.hidden) this.startBackground();
				else this.stopBackground(true);
			};
			document.addEventListener("visibilitychange", this.visibilityHandler);
			this.visibilityHandler();
		}
		startBackground() {
			if (this.backgroundOwner || this.ended || this.disposed || this.finished)
				return;
			this.backgroundOwner = true;
			this.backgroundAccumulator = 0;
			this.lastLocal = neutral();
			this.onClockHandoff(true);
			let previous = now();
			this.backgroundTimer = setInterval(() => {
				if (
					!this.backgroundOwner ||
					this.ended ||
					this.disposed ||
					this.finished
				)
					return;
				if (!this.visibilityDocument?.hidden) {
					this.stopBackground(true);
					return;
				}
				const time = now(),
					elapsed = Math.max(0, (time - previous) / 1000);
				previous = time;
				const hubTime = this.hub.time();
				if (!this.started || hubTime < 0) {
					this.backgroundAccumulator = 0;
					return;
				}
				// Hidden-page timers may arrive in one-second batches. Only time after
				// the Hub countdown belongs to gameplay; renderer ticks never step here.
				this.backgroundAccumulator = Math.min(
					1.25,
					this.backgroundAccumulator + Math.min(elapsed, hubTime / 1000),
				);
				while (
					this.backgroundOwner &&
					this.backgroundAccumulator + 1e-9 >= FIXED
				) {
					this.backgroundAccumulator -= FIXED;
					this.advance(FIXED, neutral());
				}
			}, 8);
		}
		stopBackground(resume = false) {
			const owned = this.backgroundOwner;
			this.backgroundOwner = false;
			this.backgroundAccumulator = 0;
			if (this.backgroundTimer) clearInterval(this.backgroundTimer);
			this.backgroundTimer = null;
			if (owned && resume && !this.ended && !this.disposed && !this.finished)
				this.onClockHandoff(false);
		}
		unwatchVisibility() {
			this.stopBackground();
			if (this.visibilityHandler)
				this.visibilityDocument?.removeEventListener(
					"visibilitychange",
					this.visibilityHandler,
				);
			this.visibilityHandler = null;
			this.visibilityDocument = null;
		}
		tick(dt, localIntent = neutral()) {
			if (!this.server && !this.backgroundOwner) this.advance(dt, localIntent);
		}
		advance(dt, localIntent) {
			if (
				!this.active ||
				this.ended ||
				this.disposed ||
				this.finished ||
				!this.sim
			)
				return;
			if (!this.started || this.hub.time() < 0) {
				this.pump();
				return;
			}
			this.setStatus("play");
			const time = now();
			const intent = validIntent(localIntent) || neutral();
			for (let i = 0; i < EDGE.length; i++)
				if (localIntent[EDGE[i]]) this.localEdges[i]++;
			this.lastLocal = intent;
			if (this.isHost) {
				const intents = {};
				if (!this.server && this.roster.some((p) => p.id === this.localId)) {
					intents[this.localId] = { ...intent };
					for (let i = 0; i < EDGE.length; i++)
						intents[this.localId][EDGE[i]] = !!localIntent[EDGE[i]];
				}
				const epoch = epochOf(this.sim);
				if (epoch !== this.lastEpoch) {
					this.lastEpoch = epoch;
					this.lastFull = -Infinity;
					this.localEdges = counters();
					this.localAck = counters();
					for (const entry of this.remote.values())
						if (entry.epoch !== epoch) {
							entry.intent = neutral();
							entry.edges = counters();
							entry.consumed = counters();
							entry.epoch = epoch;
						}
				}
				for (const p of this.roster) {
					if (p.id === this.localId && !this.server) continue;
					const entry = this.remote.get(p.id);
					const active = entry && time - entry.at < 700;
					const value = active ? { ...entry.intent } : neutral();
					if (entry && active)
						for (let i = 0; i < EDGE.length; i++) {
							value[EDGE[i]] = entry.consumed[i] < entry.edges[i];
							if (value[EDGE[i]]) entry.consumed[i]++;
						}
					intents[p.id] = value;
				}
				this.sim.step(dt, intents);
				if (this.sim.completed) {
					this.finish(
						!!this.sim.completed.won,
						this.sim.completed.reason || "extraction",
					);
					return;
				}
				if (this.hub.limitMs > 0 && this.hub.time() >= this.hub.limitMs) {
					this.sim.completed = { won: false, reason: "time-up" };
					this.finish(false, "time-up");
					return;
				}
				if (time - this.lastFull >= 500) {
					this.lastFull = time;
					this.queueSnapshot();
				}
				if (time - this.lastPose >= 125) {
					this.lastPose = time;
					this.queuePose();
				}
			} else {
				const frameIntent = { ...intent };
				for (const action of EDGE) frameIntent[action] = !!localIntent[action];
				this.predictionHistory.push({
					h: this.hub.time(),
					dt,
					intent: frameIntent,
				});
				if (this.predictionHistory.length > 120) this.predictionHistory.shift();
				this.predict(dt, frameIntent);
				if (time - this.lastInput >= 85) {
					this.lastInput = time;
					this.enqueue(
						{
							v: 1,
							t: "i",
							e: this.lastEpoch,
							n: ++this.localSeq,
							a: intent,
							c: this.localEdges.slice(),
						},
						{ to: this.hub.host, reliable: false },
						"input",
					);
				}
				this.interpolate(dt);
			}
			this.pump();
		}
		ack() {
			const epoch = epochOf(this.sim);
			return this.roster.map((p) => {
				const entry = this.remote.get(p.id);
				return [
					p.id,
					...(entry?.epoch === epoch ? entry.consumed : counters()),
				];
			});
		}
		queuePose() {
			const m = this.sim.miners.map((p) => [
				p.id,
				round(p.hero.x),
				round(p.hero.z),
				round(p.hero.vx),
				round(p.hero.vz),
				p.facing ?? p.hero.facing ?? 1,
				p.hero.onGround ? 1 : 0,
				p.hero.climbing ? 1 : 0,
			]);
			const packet = {
				v: 1,
				t: "p",
				e: epochOf(this.sim),
				n: ++this.sequence,
				time: round(this.sim.time),
				m,
				r: [],
				p: [],
				ack: this.ack(),
			};
			// Only positions travel unreliably; new entities and rules arrive atomically in keyframes.
			for (const rock of this.sim.rocks) {
				const row = [rock.id, round(rock.x), round(rock.z)];
				packet.r.push(row);
				if (bytes(packet) > 1150) {
					packet.r.pop();
					break;
				}
			}
			for (const pickup of this.sim.pickups) {
				const row = [pickup.id, round(pickup.x), round(pickup.z)];
				packet.p.push(row);
				if (bytes(packet) > 1150) {
					packet.p.pop();
					break;
				}
			}
			this.enqueue(packet, { reliable: false }, "pose");
		}
		queueSnapshot() {
			const state = this.sim.snapshot();
			// Presentation history is bounded on wire. Authoritative event/reward IDs remain in state.
			if (Array.isArray(state.events)) state.events = state.events.slice(-20);
			const packet = {
				v: 1,
				t: "s",
				e: epochOf(this.sim),
				n: ++this.sequence,
				h: round(this.hub.time()),
				ack: this.ack(),
				s: state,
			};
			if (bytes(packet) <= 15000) {
				this.enqueue(packet, { reliable: true }, "state");
				return;
			}
			const json = JSON.stringify(packet);
			if (bytes(json) > 120000)
				throw new Error(
					"Mine snapshot exceeded the 120 KB transport safety bound",
				);
			const chunks = [];
			let part = "";
			for (const character of json) {
				if (bytes(part + character) > 5500) {
					chunks.push(part);
					part = "";
				}
				part += character;
			}
			if (part) chunks.push(part);
			this.queue = this.queue.filter((item) => item.kind !== "state");
			for (let i = 0; i < chunks.length; i++)
				this.enqueue(
					{
						v: 1,
						t: "c",
						e: packet.e,
						n: packet.n,
						i,
						total: chunks.length,
						text: chunks[i],
					},
					{ reliable: true },
					"state",
					true,
				);
		}
		enqueue(data, options, kind, append = false) {
			if (this.ended || this.disposed) return;
			if (!append) this.queue = this.queue.filter((item) => item.kind !== kind);
			if (bytes(data) > 16000)
				throw new Error("Network message exceeded 16 KB");
			this.queue.push({ data, options, kind });
		}
		pump() {
			if (this.ended || this.disposed) return;
			const time = now();
			if (time < this.sendAt || !this.queue.length) return;
			const item = this.queue.shift();
			if (this.hub.send(item.data, item.options) === false)
				this.stats.dropped++;
			else {
				this.stats.sent++;
				this.stats.maxBytes = Math.max(this.stats.maxBytes, bytes(item.data));
				this.sendTimes.push(time);
				this.sendTimes = this.sendTimes.filter((t) => time - t < 1000);
				this.stats.maxRate = Math.max(
					this.stats.maxRate,
					this.sendTimes.length,
				);
			}
			this.sendAt = time + 78; // Combined traffic <=13/s, below the Hub's 20/s ceiling.
		}
		receive(data, from) {
			if (this.ended || this.disposed) return;
			this.stats.received++;
			if (data?.v !== 1 || typeof data.t !== "string" || bytes(data) > 16384)
				return this.reject();
			if (this.isHost) {
				if (
					data.t !== "i" ||
					!this.roster.some((p) => p.id === from) ||
					from === this.localId
				)
					return this.reject();
				const entry = this.remote.get(from),
					intent = validIntent(data.a);
				if (
					!entry ||
					!intent ||
					data.e !== epochOf(this.sim) ||
					!Number.isSafeInteger(data.n) ||
					data.n <= entry.seq ||
					!Array.isArray(data.c) ||
					data.c.length !== 3 ||
					!data.c.every(
						(n) => Number.isSafeInteger(n) && n >= 0 && n <= 10000000,
					)
				)
					return this.reject();
				if (entry.epoch !== data.e) {
					entry.epoch = data.e;
					entry.edges = counters();
					entry.consumed = counters();
				}
				entry.seq = data.n;
				entry.intent = intent;
				entry.at = now();
				for (let i = 0; i < EDGE.length; i++)
					entry.edges[i] = Math.max(entry.edges[i], data.c[i]);
				this.stats.inputs++;
				return;
			}
			if (from !== this.hub.host || !Number.isSafeInteger(data.n))
				return this.reject();
			if (data.t === "c") {
				if (
					!Number.isInteger(data.total) ||
					data.total < 1 ||
					data.total > 32 ||
					!Number.isInteger(data.i) ||
					data.i < 0 ||
					data.i >= data.total ||
					typeof data.text !== "string" ||
					bytes(data.text) > 5600
				)
					return this.reject();
				const id = `${data.e}:${data.n}`;
				if (!this.assemblies.has(id))
					this.assemblies.set(id, { parts: new Array(data.total), at: now() });
				const assembly = this.assemblies.get(id);
				if (assembly.parts.length !== data.total) return this.reject();
				assembly.parts[data.i] = data.text;
				for (const [key, value] of this.assemblies)
					if (now() - value.at > 5000 || this.assemblies.size > 4)
						this.assemblies.delete(key);
				if (
					assembly.parts.filter((part) => part !== undefined).length ===
					data.total
				) {
					this.assemblies.delete(id);
					try {
						this.applySnapshot(JSON.parse(assembly.parts.join("")));
					} catch {
						this.reject();
					}
				}
				return;
			}
			if (data.t === "s") {
				this.applySnapshot(data);
				return;
			}
			if (data.t === "p") {
				if (
					data.e !== this.lastEpoch ||
					data.n <= this.lastPoseId ||
					!Array.isArray(data.m) ||
					!Array.isArray(data.r) ||
					!Array.isArray(data.p)
				)
					return this.reject();
				this.lastPoseId = data.n;
				this.pose = data;
				this.readAck(data.ack);
				return;
			}
			this.reject();
		}
		applySnapshot(data) {
			if (data.t !== "s" || !data.s || data.n <= this.lastFullId)
				return this.reject();
			const oldEpoch = this.lastEpoch;
			this.sim.restore(data.s);
			this.lastFullId = data.n;
			this.lastEpoch = data.e;
			this.stats.snapshots++;
			if (oldEpoch !== data.e) {
				this.pose = null;
				this.lastPoseId = data.n;
				this.queue = [];
				this.predictionHistory = [];
				this.localEdges = counters();
				this.localAck = counters();
				this.lastLocal = neutral();
			}
			this.reconcile(data.h);
			this.readAck(data.ack);
			this.onState(this.sim);
		}
		readAck(ack) {
			const mine =
				Array.isArray(ack) &&
				ack.find((row) => Array.isArray(row) && row[0] === this.localId);
			if (mine)
				this.localAck = mine
					.slice(1, 4)
					.map((n, i) =>
						Math.max(
							0,
							Math.min(this.localEdges[i], Number.isSafeInteger(n) ? n : 0),
						),
					);
		}
		interpolate(dt) {
			const pose = this.pose;
			if (!pose || pose.e !== this.lastEpoch) return;
			const fraction = Math.min(1, Math.max(0, dt) * 15);
			const approach = (object, x, z) => {
				if (!object || !Number.isFinite(x) || !Number.isFinite(z)) return;
				object.x += (x - object.x) * fraction;
				object.z += (z - object.z) * fraction;
			};
			for (const row of pose.m) {
				const miner = this.sim.miners.find((p) => p.id === row[0]);
				if (!miner) continue;
				if (miner.id === this.localId && this.predicted) continue;
				approach(miner.hero, row[1], row[2]);
				miner.hero.vx = row[3];
				miner.hero.vz = row[4];
				miner.facing = row[5];
				miner.hero.onGround = !!row[6];
				miner.hero.climbing = !!row[7];
			}
			for (const row of pose.r)
				approach(
					this.sim.rocks.find((r) => r.id === row[0]),
					row[1],
					row[2],
				);
			for (const row of pose.p)
				approach(
					this.sim.pickups.find((p) => p.id === row[0]),
					row[1],
					row[2],
				);
			if (Number.isFinite(pose.time)) this.sim.time = pose.time;
		}
		reconcile(hubTime) {
			const E = globalThis.My3D2dge,
				miner = this.sim.miners.find((p) => p.id === this.localId);
			if (!E?.Platformer || !miner) {
				this.predicted = null;
				return;
			}
			// This clone predicts traversal only. It cannot act on ore, health, rewards or doors.
			this.predicted = Object.assign(new E.Platformer(miner.hero), miner.hero);
			this.predictionHistory = Number.isFinite(hubTime)
				? this.predictionHistory.filter((frame) => frame.h > hubTime)
				: [];
			for (const frame of this.predictionHistory)
				this.predict(frame.dt, frame.intent);
		}
		predict(dt, intent) {
			const E = globalThis.My3D2dge,
				miner = this.sim.miners.find((p) => p.id === this.localId);
			if (
				!E?.Platformer ||
				!miner ||
				miner.downed ||
				this.sim.transition > 0 ||
				!this.sim.level
			)
				return;
			if (!this.predicted)
				this.predicted = Object.assign(
					new E.Platformer(miner.hero),
					miner.hero,
				);
			const hero = this.predicted,
				tuning = this.sim.tuning;
			hero.run = tuning.moveSpeed;
			hero.climb = tuning.climbSpeed;
			hero.jump = tuning.jumpSpeed;
			hero.gravity = tuning.gravity;
			hero.fallGravity = tuning.gravity * 1.4;
			if (hero.climbing && intent.my > 0.25) hero.drop = 0.1;
			hero.update(
				dt,
				this.sim.level,
				{
					x: miner.jam > 0 ? intent.mx * 0.25 : intent.mx,
					up: intent.my < -0.25,
					down: intent.my > 0.25,
					jump: intent.jumpHeld || intent.jump,
					jumpPressed: !!intent.jump,
				},
				this.sim.roomSolids || [],
			);
			hero.x = Math.max(14, Math.min(562, hero.x));
			if (hero.z < -28) {
				hero.x = 104;
				hero.z = 16;
				hero.vx = hero.vz = 0;
			}
			for (const key of [
				"x",
				"z",
				"vx",
				"vz",
				"facing",
				"onGround",
				"climbing",
				"crouching",
			])
				miner.hero[key] = hero[key];
			miner.facing = hero.facing;
		}
		reject() {
			this.stats.rejected++;
		}
		finish(won, reason) {
			if (!this.isHost || this.finished || this.ended || this.disposed) return;
			this.finished = true;
			this.unwatchVisibility();
			this.queue = [];
			this.queueSnapshot();
			this.sendAt = 0;
			const ids = this.roster.map((p) => p.id);
			const score = Number(this.sim.score) || 0;
			const stats = Object.fromEntries(
				ids.map((id) => [
					id,
					{
						...(this.sim.miners.find((p) => p.id === id)?.stats || {}),
						Outcome: String(reason),
					},
				]),
			);
			this.pendingOutcome = {
				standings: ids.length ? [ids] : [],
				scores: Object.fromEntries(ids.map((id) => [id, score])),
				won: !!won,
				stats,
			};
			this.setStatus("finishing", { won: !!won, reason });
			if (this.timer) {
				clearInterval(this.timer);
				this.timer = null;
			}
			this.pump();
			if (!this.queue.length) this.finishReport();
			else
				this.finishTimer = setInterval(() => {
					this.pump();
					if (!this.queue.length) this.finishReport();
				}, 16);
		}
		finishReport() {
			if (!this.pendingOutcome || this.ended || this.disposed) return;
			const outcome = this.pendingOutcome;
			this.pendingOutcome = null;
			if (this.finishTimer) {
				clearInterval(this.finishTimer);
				this.finishTimer = null;
			}
			this.hub.finish(outcome);
		}
		end(detail) {
			if (this.ended) return;
			this.ended = true;
			this.unwatchVisibility();
			this.queue = [];
			this.lastLocal = neutral();
			this.remote.clear();
			this.pose = null;
			this.predicted = null;
			this.predictionHistory = [];
			if (this.timer) {
				clearInterval(this.timer);
				this.timer = null;
			}
			if (this.finishTimer) {
				clearInterval(this.finishTimer);
				this.finishTimer = null;
			}
			this.pendingOutcome = null;
			this.setStatus("end", detail);
			for (const off of this.handlers.splice(0)) off();
		}
		diagnostics() {
			return {
				...this.stats,
				queue: this.queue.length,
				epoch: this.lastEpoch,
				status: this.status,
				active: this.active,
				isHost: this.isHost,
				server: this.server,
				backgroundOwner: this.backgroundOwner,
				localId: this.localId,
				prediction: !!this.predicted,
				unacknowledged: this.localEdges.map((n, i) => n - this.localAck[i]),
			};
		}
		dispose() {
			if (this.disposed) return;
			this.disposed = true;
			this.unwatchVisibility();
			this.queue = [];
			this.remote.clear();
			this.assemblies.clear();
			this.predicted = null;
			this.predictionHistory = [];
			if (this.timer) clearInterval(this.timer);
			this.timer = null;
			if (this.finishTimer) clearInterval(this.finishTimer);
			this.finishTimer = null;
			this.pendingOutcome = null;
			for (const off of this.handlers.splice(0)) off();
		}
	}
	PP.Net = Net;
})();
