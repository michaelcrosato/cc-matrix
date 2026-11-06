/* Yars of Ruin — authoritative AI Hub Protocol 1 adapter. */
(() => {
	"use strict";
	const root = typeof window === "undefined" ? globalThis : window;
	const clone = (x) => JSON.parse(JSON.stringify(x));
	const zero = () => ({
		mx: 0,
		my: 0,
		ax: 1,
		ay: 0,
		fire: false,
		cannon: false,
	});
	const finite = Number.isFinite;
	const round = (x) => (typeof x === "number" ? Math.round(x * 100) / 100 : x);
	const small = (v) =>
		Array.isArray(v)
			? v.map(small)
			: v && typeof v === "object"
				? Object.fromEntries(
						Object.entries(v)
							.filter(([k]) => !k.startsWith("_"))
							.map(([k, x]) => [k, small(x)]),
					)
				: round(v);
	const columns = {
		players: [
			"id",
			"index",
			"x",
			"y",
			"vx",
			"vy",
			"ax",
			"ay",
			"r",
			"alive",
			"respawn",
			"invuln",
			"charge",
			"ready",
			"biteFlash",
			"wrapFlash",
			"departed",
			"inStatic",
			"score",
			"deadReason",
		],
		shots: ["id", "x", "y", "vx", "vy", "r", "life", "owner", "kind"],
		hazards: [
			"id",
			"kind",
			"x",
			"y",
			"vx",
			"vy",
			"r",
			"angle",
			"target",
			"life",
		],
		cannons: [
			"id",
			"x",
			"y",
			"vx",
			"r",
			"owner",
			"warn",
			"reflected",
			"returnWarn",
			"life",
		],
	};
	function packRows(rows, keys) {
		return (rows || []).map((row) =>
			keys.map((k) => small(row[k] === undefined ? null : row[k])),
		);
	}
	function unpackRows(rows, keys) {
		return rows.map((row) =>
			Object.fromEntries(keys.map((k, i) => [k, row[i]])),
		);
	}
	function mask(cells) {
		let str = "";
		for (let i = 0; i < cells.length; i += 4) {
			let n = 0;
			for (let j = 0; j < 4; j++) if (cells[i + j]?.alive) n |= 1 << j;
			str += n.toString(16);
		}
		return str;
	}
	function offsets(cells) {
		const out = {};
		for (const c of cells)
			if (!(String(c.plate) in out))
				out[c.plate] = [
					round(c.x - (c.baseX ?? c.x)),
					round(c.y - (c.baseY ?? c.y)),
				];
		return out;
	}
	function pack(world, sequence, ack, events, topology) {
		const p = {
			k: "w",
			v: 1,
			n: sequence,
			t: [
				world.tick,
				round(world.time),
				world.sector,
				world.mode,
				world.phase,
				round(world.phaseTime),
				world.reserves,
				world.score,
			],
			p: packRows(world.players, columns.players),
			c: small(world.core),
			r: small(world.refuge),
			m: mask(world.cells),
			o: offsets(world.cells),
			h: packRows(world.hazards, columns.hazards),
			s: packRows(world.shots, columns.shots),
			g: packRows(world.cannons, columns.cannons),
			a: ack,
			e: small(events || []),
			u: small(world.tutorial),
			z: world.message || "",
			j: [
				round(world.chain || 1),
				round(world.chainTime || 0),
				round(world.sectorTime || 0),
				round(world.messageTime || 0),
			],
		};
		if (topology)
			p.b = world.cells.map((c) => [
				c.id,
				c.baseX ?? c.x,
				c.baseY ?? c.y,
				c.plate,
				c.material,
				c.size || 20,
			]);
		// A full topology is also a recovery keyframe. Visual particles are reconstructed
		// from confirmed changes, never sent individually as reliable messages.
		if (topology)
			p.f = {
				seed: world.seed,
				stats: small(world.stats),
				tuning: small(world.tuning),
				plates: small(world.plates),
				contentName: world.contentName,
			};
		return p;
	}
	function unpack(packet, sim, old, options) {
		let w = old;
		if (!w || w.sector !== packet.t[2])
			w = sim.create({
				players: packet.p.length,
				seed: options.seed,
				sector: packet.t[2],
			});
		const [tick, time, sector, mode, phase, phaseTime, reserves, score] =
			packet.t;
		Object.assign(w, {
			tick,
			time,
			sector,
			mode,
			phase,
			phaseTime,
			reserves,
			score,
			core: clone(packet.c),
			refuge: clone(packet.r),
			tutorial: packet.u,
			message: packet.z,
			events: clone(packet.e || []),
		});
		if (packet.b)
			w.cells = packet.b.map((c) => ({
				id: c[0],
				x: c[1],
				y: c[2],
				baseX: c[1],
				baseY: c[2],
				plate: c[3],
				material: c[4],
				size: c[5],
				alive: true,
			}));
		w.cells.forEach((c, i) => {
			c.alive = !!(
				parseInt(packet.m[Math.floor(i / 4)] || "0", 16) &
				(1 << (i % 4))
			);
			const offset = packet.o[c.plate] || [0, 0];
			c.x = (c.baseX ?? c.x) + offset[0];
			c.y = ((c.baseY ?? c.y) + offset[1] + 540) % 540;
		});
		if (packet.j)
			[w.chain, w.chainTime, w.sectorTime, w.messageTime] = packet.j;
		for (const [key, short] of [
			["players", "p"],
			["shots", "s"],
			["hazards", "h"],
			["cannons", "g"],
		])
			w[key] = unpackRows(packet[short] || [], columns[key]);
		if (packet.f) Object.assign(w, clone(packet.f));
		return w;
	}
	function encodeInput(frame, seq, cannon, at) {
		const q = (x) =>
			Math.round(Math.max(-1, Math.min(1, finite(x) ? x : 0)) * 127);
		return {
			k: "i",
			q: seq,
			at: Math.round(at),
			a: [
				q(frame.mx),
				q(frame.my),
				q(frame.ax ?? 1),
				q(frame.ay),
				frame.fire ? 1 : 0,
			],
			c: cannon,
		};
	}
	function createValidator(ids, now) {
		const states = new Map(
			ids.map((id) => [
				id,
				{ q: 0, c: 0, at: -Infinity, input: zero(), edge: false },
			]),
		);
		const stats = { accepted: 0, rejected: 0, duplicates: 0 };
		function accept(packet, from) {
			const s = states.get(from);
			const t = now();
			if (
				!s ||
				!packet ||
				packet.k !== "i" ||
				!Number.isInteger(packet.q) ||
				packet.q <= 0 ||
				packet.q > s.q + 10000 ||
				!finite(packet.at) ||
				Math.abs(packet.at - t) > 8000 ||
				!Array.isArray(packet.a) ||
				packet.a.length !== 5 ||
				!packet.a
					.slice(0, 4)
					.every((x) => Number.isInteger(x) && x >= -127 && x <= 127) ||
				![0, 1].includes(packet.a[4]) ||
				!Number.isInteger(packet.c) ||
				packet.c < 0 ||
				packet.c > s.c + 64
			) {
				stats.rejected++;
				return false;
			}
			if (packet.q <= s.q) {
				stats.duplicates++;
				return false;
			}
			const [mx, my, ax, ay, fire] = packet.a;
			s.q = packet.q;
			s.at = t;
			s.input = {
				mx: mx / 127,
				my: my / 127,
				ax: ax / 127,
				ay: ay / 127,
				fire: !!fire,
				cannon: false,
			};
			if (packet.c > s.c) {
				s.c = packet.c;
				s.edge = true;
			}
			stats.accepted++;
			return true;
		}
		function action(id) {
			const s = states.get(id);
			if (!s) return zero();
			if (now() - s.at > 600) {
				s.edge = false;
				return zero();
			}
			const a = { ...s.input, cannon: s.edge };
			s.edge = false;
			return a;
		}
		return {
			accept,
			action,
			states,
			stats,
			leave: (id) => states.delete(id),
			ack: () => Object.fromEntries([...states].map(([id, s]) => [id, s.c])),
		};
	}
	async function connect(options = {}) {
		const hub = options.hub || root.AIHub,
			sim = options.sim || root.RuinSim;
		if (!hub) return null;
		let started = false,
			ended = false,
			adapter = null;
		const queued = [];
		const listen = (type, fn) =>
			hub.on(type, (...args) => {
				if (adapter) fn(...args);
				else queued.push(() => fn(...args));
			});
		const unsubs = [];
		unsubs.push(
			listen("start", () => {
				started = true;
				options.onStart?.(adapter.info);
			}),
		);
		unsubs.push(listen("time-up", () => adapter.finish(false, "time-up")));
		unsubs.push(listen("end", (detail) => adapter.end(detail)));
		unsubs.push(listen("leave", (detail) => adapter.leave(detail)));
		unsubs.push(listen("message", (data, from) => adapter.message(data, from)));
		const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) {
			unsubs.forEach((fn) => fn());
			return null;
		}
		// Cache a labeled stream: asking hub.rng on every use would restart it.
		const seedStream = hub.rng("ruin-combat");
		const seed = (seedStream() * 4294967296) >>> 0;
		const roster = info.players.slice();
		const ids = roster.map((p) => p.id);
		const localIndex = ids.indexOf(info.me);
		const now = () => hub.time();
		const clock =
			options.clock || (() => root.performance?.now?.() ?? Date.now());
		const validator = createValidator(ids, now);
		let world = sim.create({ players: roster.length, seed });
		let input = zero(),
			inputSource = null,
			applyingSource = false,
			inputSeq = 0,
			cannonSeq = 0,
			pendingCannon = 0,
			lastCannon = false,
			inputDirty = true;
		let sequence = 0,
			lastReceived = 0,
			eventCursor = 0,
			events = [],
			lastKey = "",
			keyframeDue = true;
		let last = clock(),
			acc = 0,
			netAcc = 0,
			reliableAcc = 0,
			transitionAcc = 0,
			timer = null,
			lastPacketTime = clock();
		let previous = null,
			current = null,
			display = null,
			finishing = null,
			endAck = 0;
		const stats = {
			sent: 0,
			dropped: 0,
			received: 0,
			rejectedSnapshots: 0,
			bytes: 0,
			maxBytes: 0,
			fragmented: 0,
			steps: 0,
			finishCalls: 0,
			afterEndSends: 0,
			validator: validator.stats,
		};
		function decorate(w) {
			w.online = true;
			w.server = !!info.server;
			w.players.forEach((p, i) => {
				const rp = roster[i];
				if (rp) {
					p.hubId = rp.id;
					p.name = rp.name;
					p.color = rp.color;
				}
			});
			return w;
		}
		decorate(world);
		function send(data, reliable = false, to) {
			if (ended) return false;
			const bytes = new TextEncoder().encode(JSON.stringify(data)).length;
			if (bytes > 16384) {
				stats.dropped++;
				options.onNotice?.("Network state exceeded the protocol limit.");
				return false;
			}
			stats.maxBytes = Math.max(stats.maxBytes, bytes);
			if (!reliable && bytes > 1200) stats.fragmented++;
			const ok = hub.send(data, {
				reliable,
				...(to === undefined ? {} : { to }),
			});
			if (ok) {
				stats.sent++;
				stats.bytes += bytes;
			} else stats.dropped++;
			return ok;
		}
		function snapshot(force = false) {
			const key = [
				world.sector,
				world.phase,
				world.mode,
				world.cells.length,
			].join(":");
			const topology = force || keyframeDue || key !== lastKey;
			const reliable = topology || reliableAcc >= 1;
			const packet = pack(world, ++sequence, validator.ack(), events, topology);
			if (finishing)
				packet.end = {
					id: finishing.id,
					won: finishing.won,
					reason: finishing.reason,
				};
			if (send(packet, reliable || !!finishing)) {
				events = [];
				lastKey = key;
				keyframeDue = false;
				if (reliable) reliableAcc = 0;
			} else {
				sequence--;
				if (topology) keyframeDue = true;
			}
		}
		function localPacket() {
			const packet = encodeInput(
				input,
				++inputSeq,
				pendingCannon,
				Math.max(0, now()),
			);
			if (endAck) packet.endAck = endAck;
			return packet;
		}
		function setInput(frame) {
			if (ended || info.server || localIndex < 0) return;
			if (inputSource && !applyingSource) return;
			const next = frame || zero();
			const edge = !!next.cannon && !lastCannon;
			lastCannon = !!next.cannon;
			if (edge) {
				pendingCannon = ++cannonSeq;
				inputDirty = true;
			}
			input = { ...zero(), ...next, cannon: false };
			if (info.isHost || hub.isHost) validator.accept(localPacket(), info.me);
		}
		function setInputSource(source) {
			if (ended || hub.isHost || info.server || localIndex < 0) return false;
			inputSource = typeof source === "function" ? source : null;
			input = zero();
			lastCannon = false;
			return true;
		}
		function simulateOne() {
			const actions = world.players.map((p, i) =>
				p.departed ? zero() : validator.action(ids[i]),
			);
			sim.step(world, actions, 1 / 120);
			stats.steps++;
			for (const e of world.events || [])
				if (e.id > eventCursor) {
					events.push(e);
					eventCursor = e.id;
				}
			// Keep the snapshot event tail bounded by transport, not particle count.
			if (events.length > 12)
				events = events
					.filter((e) => !["shoot", "chip", "bite"].includes(e.type))
					.slice(-12);
			options.onStep?.(world, world.events || []);
			if (world.mode === "transition") {
				transitionAcc += 1 / 120;
				if (transitionAcc >= 3) {
					sim.nextSector(world);
					transitionAcc = 0;
					keyframeDue = true;
				}
			} else transitionAcc = 0;
			if (world.mode === "victory" || world.mode === "defeat")
				adapter.finish(world.mode === "victory", world.mode);
		}
		function pulse() {
			if (ended) return;
			const t = clock();
			let elapsed = Math.max(0, (t - last) / 1000);
			last = t;
			// The 20s host-hidden cancellation belongs to the hub. This clock never
			// restarts a void round and advances neither before nor during countdown.
			if (!started || !finite(now()) || now() < 0) {
				acc = 0;
				return;
			}
			netAcc += elapsed;
			reliableAcc += elapsed;
			if (finishing && hub.isHost) {
				const all = ids.filter((id) => validator.states.has(id));
				if (
					all.every((id) => finishing.acks.has(id)) ||
					t >= finishing.deadline
				) {
					reportFinish();
					return;
				}
				if (netAcc >= 0.1) {
					netAcc %= 0.1;
					snapshot(true);
				}
				return;
			}
			if (hub.isHost) {
				if (elapsed > 20) {
					acc = 0;
					return;
				}
				acc += elapsed;
				while (acc >= 1 / 120 && !ended && !adapter.finished) {
					simulateOne();
					acc -= 1 / 120;
				}
				options.onWorld?.(world);
				if (netAcc >= 0.1 && !ended) {
					netAcc %= 0.1;
					snapshot();
				}
			} else if (netAcc >= 0.1 && !ended) {
				netAcc %= 0.1;
				// Sample an optional controller at the actual packet edge. Its action
				// memory must advance when controls are sent, independently of drawing.
				if (inputSource) {
					applyingSource = true;
					try {
						setInput(inputSource(world, localIndex));
					} catch (_error) {
						inputSource = null;
						setInput(zero());
						options.onNotice?.("Local control source stopped.");
					} finally {
						applyingSource = false;
					}
				}
				send(
					localPacket(),
					(pendingCannon > 0 &&
						pendingCannon > (current?.ack?.[info.me] || 0)) ||
						endAck > 0,
					info.host,
				);
				inputDirty = false;
			}
		}
		function receive(packet, from) {
			if (ended) return;
			if (hub.isHost) {
				if (ids.includes(from)) {
					if (finishing && packet?.endAck === finishing.id)
						finishing.acks.add(from);
					validator.accept(packet, from);
				}
				return;
			}
			if (
				from !== info.host ||
				!packet ||
				packet.k !== "w" ||
				packet.v !== 1 ||
				!Number.isInteger(packet.n) ||
				packet.n <= lastReceived ||
				!Array.isArray(packet.t) ||
				packet.t.length < 8 ||
				!Array.isArray(packet.p)
			) {
				stats.rejectedSnapshots++;
				return;
			}
			try {
				lastReceived = packet.n;
				stats.received++;
				previous = current;
				world = decorate(unpack(packet, sim, world, { seed }));
				if (packet.end && Number.isInteger(packet.end.id)) {
					endAck = packet.end.id;
					world.sessionOutcome = {
						won: packet.end.won === true,
						reason: String(packet.end.reason || ""),
					};
					world.mode = packet.end.won ? "victory" : "defeat";
				}
				current = { world: clone(world), at: clock(), ack: packet.a || {} };
				lastPacketTime = clock();
				if (!display || previous?.world.sector !== world.sector)
					display = clone(world);
				if ((packet.a?.[info.me] || 0) >= pendingCannon) pendingCannon = 0;
				options.onWorld?.(world);
				options.onStep?.(world, world.events || []);
			} catch (error) {
				stats.rejectedSnapshots++;
				options.onNotice?.("Recovering shared world…");
			}
		}
		function renderWorld(dt = 1 / 60) {
			if (hub.isHost || !current) return world;
			if (!display) display = clone(world);
			const target = clone(current.world);
			const factor = Math.min(1, Math.max(0.08, dt * 18));
			// Prediction affects only the local displayed body. All danger, charge,
			// shield topology, cannon presses and core damage stay host confirmed.
			for (let i = 0; i < target.players.length; i++) {
				const a = target.players[i],
					p = display.players[i] || a;
				const age = Math.min(0.15, (clock() - current.at) / 1000);
				let tx = a.x,
					ty = a.y;
				if (i === localIndex && a.alive) {
					tx += input.mx * (world.tuning?.scoutSpeed || 250) * age;
					ty += input.my * (world.tuning?.scoutSpeed || 250) * age;
				}
				let dy = ((ty - p.y + 810) % 540) - 270;
				target.players[i] = {
					...a,
					x: p.x + (tx - p.x) * factor,
					y: (p.y + dy * factor + 540) % 540,
				};
			}
			const age = Math.min(0.15, (clock() - current.at) / 1000);
			target.time += age;
			const smoothBody = (body, oldBody) => {
				if (!body || !oldBody) return;
				let yy = ((body.y - oldBody.y + 810) % 540) - 270;
				body.x = oldBody.x + (body.x - oldBody.x) * factor;
				body.y = (oldBody.y + yy * factor + 540) % 540;
			};
			if (target.core.state === display.core?.state)
				smoothBody(target.core, display.core);
			for (const key of ["hazards", "cannons"])
				for (const body of target[key] || []) {
					const oldBody = display[key]?.find((x) => x.id === body.id);
					if (oldBody) smoothBody(body, oldBody);
					if (key === "cannons") {
						body.warn = Math.max(0, (body.warn || 0) - age);
						body.returnWarn = Math.max(0, (body.returnWarn || 0) - age);
					}
				}
			display = clone(target);
			return display;
		}
		function reportFinish() {
			if (!finishing || finishing.reported || ended) return;
			finishing.reported = true;
			stats.finishCalls++;
			const active = ids.filter((id) => validator.states.has(id));
			const scores = Object.fromEntries(
				active.map((id) => [id, world.score || 0]),
			);
			hub.finish({
				standings: [active],
				scores,
				won: finishing.won,
				stats: Object.fromEntries(
					active.map((id) => [
						id,
						{
							Sectors: world.sector + (world.mode === "victory" ? 1 : 0),
							Score: world.score || 0,
							Outcome: finishing.reason,
						},
					]),
				),
			});
		}
		function finish(won, reason) {
			if (ended || adapter.finished || !hub.isHost) return;
			adapter.finished = true;
			world.mode = won ? "victory" : "defeat";
			world.sessionOutcome = { won: !!won, reason };
			finishing = {
				id: sequence + 1,
				won: !!won,
				reason,
				deadline: clock() + 2000,
				acks: new Set(info.server ? [] : [info.me]),
				reported: false,
			};
			snapshot(true);
			const active = ids.filter((id) => validator.states.has(id));
			if (active.every((id) => finishing.acks.has(id)) || !started)
				reportFinish();
		}
		function end(detail) {
			if (ended) return;
			ended = true;
			adapter.ended = true;
			input = zero();
			inputSource = null;
			pendingCannon = 0;
			acc = 0;
			if (timer !== null) (options.clearInterval || root.clearInterval)(timer);
			timer = null;
			options.onEnd?.(detail);
		}
		function leave(detail) {
			const index = ids.indexOf(detail.id);
			validator.leave(detail.id);
			if (index >= 0 && hub.isHost) {
				sim.command(world, "leave", index);
				keyframeDue = true;
				options.onWorld?.(world);
			}
			options.onNotice?.(
				"A scout left the signal. The surviving swarm continues.",
			);
		}
		adapter = {
			info: { ...info, isHost: hub.isHost },
			localIndex,
			active: true,
			ended: false,
			finished: false,
			get world() {
				return world;
			},
			setInput,
			setInputSource,
			getWorld: () => world,
			renderWorld,
			finish,
			end,
			leave,
			message: receive,
			pulse,
			debug: stats,
			dispose() {
				end({ reason: "disposed" });
				unsubs.forEach((fn) => fn());
			},
		};
		for (const fn of queued.splice(0)) fn();
		options.onWorld?.(world);
		options.onConnected?.(adapter);
		timer = (options.setInterval || root.setInterval)(pulse, 1000 / 120);
		if (hub.isHost) snapshot(true);
		hub.ready();
		return adapter;
	}
	root.RuinOnline = { connect, pack, unpack, encodeInput, createValidator };
})();
