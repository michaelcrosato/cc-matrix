(function (B) {
	"use strict";
	const n = (v) => Math.round(v * 100) / 100;
	B.pack = function (w) {
		return {
			t: w.tick,
			et: n(w.time),
			s: w.stage,
			st: n(w.stageTime),
			p: n(w.phaseTime),
			z: w.status,
			seed: w.seed,
			ei: w.eventId,
			score: w.score,
			stock: w.reserves,
			bi: w.bonusIndex,
			cans: w.players.map((p) => [
				p.seat,
				n(p.x),
				n(p.vx),
				p.ammo,
				n(p.cool),
				n(p.swap),
				n(p.grace),
				n(p.hop),
				n(p.recoil),
				p.callSeen,
				p.hopFrom ?? p.x,
			]),
			bees: w.bees.map((b) => [
				b.id,
				b.kind === "fast" ? 1 : 0,
				n(b.x),
				b.tier,
				b.dir,
				n(b.y),
				b.state,
				n(b.bank),
				n(b.trap),
				n(b.age),
			]),
			combs: w.obstacles.map((o) => [
				o.id,
				o.kind === "hive" ? 1 : 0,
				o.x,
				o.tier,
				o.red ? 1 : 0,
			]),
			spray: w.pulses.map((p) => [p.id, n(p.x), n(p.y), p.seat]),
			flowers: w.flowers,
			grow: w.growth.map((g) => [g.id, g.x0, g.x1, n(g.timer), g.total]),
			bird: [
				n(w.bird.x),
				n(w.bird.y),
				w.bird.state,
				w.bird.target,
				n(w.bird.timer),
				n(w.bird.irritation),
				n(w.bird.call),
				n(w.bird.mark),
				w.bird.caller,
			],
			boss: w.boss
				? [
						n(w.boss.x),
						n(w.boss.y),
						w.boss.phase,
						w.boss.phases,
						w.boss.hp,
						w.boss.maxHp,
						n(w.boss.open),
						w.boss.done,
						n(w.boss.hit),
					]
				: null,
			pending: w.pending.map((p) => [
				p.id,
				n(p.at),
				p.kind,
				p.x,
				p.tier,
				p.dir,
			]),
			stats: w.stats,
			coverage: w.coverage,
			result: w.result,
			events: w.events
				.slice(-14)
				.map((e) => [
					e.id,
					e.tick,
					e.kind,
					n(e.x),
					n(e.y),
					e.points || 0,
					e.red || false,
					e.paid ?? true,
					e.stage ?? -1,
					e.name || "",
					e.gag || "",
					e.reason || "",
				]),
		};
	};
	B.unpack = function (p) {
		return {
			tick: p.t,
			time: p.et,
			stage: p.s,
			stageTime: p.st,
			phaseTime: p.p,
			status: p.z,
			seed: p.seed,
			eventId: p.ei,
			score: p.score,
			reserves: p.stock,
			bonusIndex: p.bi,
			tuning: B.defaults(),
			content: B.CONTENT,
			dev: {},
			claimed: {},
			demo: false,
			assisted: false,
			players: p.cans.map((a) => ({
				id: a[0],
				seat: a[0],
				x: a[1],
				y: 306,
				vx: a[2],
				ammo: a[3],
				cool: a[4],
				swap: a[5],
				grace: a[6],
				hop: a[7],
				recoil: a[8],
				callSeen: a[9],
				hopFrom: a[10],
			})),
			bees: p.bees.map((a) => ({
				id: a[0],
				kind: a[1] ? "fast" : "worker",
				x: a[2],
				tier: a[3],
				dir: a[4],
				y: a[5],
				state: a[6],
				bank: a[7],
				trap: a[8],
				age: a[9],
			})),
			obstacles: p.combs.map((a) => ({
				id: a[0],
				kind: a[1] ? "hive" : "comb",
				x: a[2],
				tier: a[3],
				y: B.ARENA.tiers[a[3]],
				red: !!a[4],
			})),
			pulses: p.spray.map((a) => ({ id: a[0], x: a[1], y: a[2], seat: a[3] })),
			flowers: p.flowers,
			growth: p.grow.map((a) => ({
				id: a[0],
				x0: a[1],
				x1: a[2],
				timer: a[3],
				total: a[4],
			})),
			bird: {
				id: 3,
				x: p.bird[0],
				y: p.bird[1],
				state: p.bird[2],
				target: p.bird[3],
				timer: p.bird[4],
				irritation: p.bird[5],
				call: p.bird[6],
				mark: p.bird[7],
				caller: p.bird[8],
			},
			boss: p.boss
				? {
						id: 4,
						x: p.boss[0],
						y: p.boss[1],
						phase: p.boss[2],
						phases: p.boss[3],
						hp: p.boss[4],
						maxHp: p.boss[5],
						open: p.boss[6],
						done: p.boss[7],
						hit: p.boss[8],
					}
				: null,
			pending: p.pending.map((a) => ({
				id: a[0],
				at: a[1],
				kind: a[2],
				x: a[3],
				tier: a[4],
				dir: a[5],
			})),
			stats: p.stats,
			coverage: p.coverage,
			result: p.result,
			events: p.events.map((a) => ({
				id: a[0],
				tick: a[1],
				kind: a[2],
				x: a[3],
				y: a[4],
				points: a[5],
				red: a[6],
				paid: a[7],
				stage: a[8],
				name: a[9],
				gag: a[10],
				reason: a[11],
			})),
		};
	};
	B.validateActionMessage = function (data, lastSeq = -1) {
		if (
			!data ||
			data.v !== 1 ||
			data.k !== "input" ||
			!Number.isSafeInteger(data.seq) ||
			data.seq <= lastSeq ||
			data.seq < 0 ||
			!Number.isFinite(data.move) ||
			!(data.aim === null || Number.isFinite(data.aim)) ||
			typeof data.fire !== "boolean" ||
			!Number.isSafeInteger(data.call) ||
			data.call < 0 ||
			data.call > 100000000
		)
			return null;
		return {
			seq: data.seq,
			move: Math.max(-1, Math.min(1, data.move)),
			aim: data.aim === null ? null : Math.max(28, Math.min(612, data.aim)),
			fire: data.fire,
			call: data.call,
		};
	};
	B.Network = function (app) {
		const hub = globalThis.AIHub;
		let connected = false,
			started = false,
			ended = false,
			finished = false,
			seq = 0,
			stateSeq = 0,
			lastState = -1,
			inputClock = 0,
			stateClock = 0,
			lastKey = "",
			received = {},
			seatsById = {},
			remoteCall = 0;
		const metrics = {
			sent: 0,
			received: 0,
			maxBytes: 0,
			rejected: 0,
			finishCalls: 0,
			readyCalls: 0,
			serverInputReads: 0,
		};
		const seatFor = (id) => seatsById[id] || 0;
		function send(data, reliable = false, to) {
			if (ended || !connected) return;
			const bytes = JSON.stringify(data).length;
			metrics.maxBytes = Math.max(metrics.maxBytes, bytes);
			if (bytes > 16000) throw Error("State exceeded the Hub packet budget.");
			hub.send(data, { reliable, ...(to !== undefined ? { to } : {}) });
			metrics.sent++;
		}
		function finish(reason) {
			if (finished || ended || !hub.isHost || !app.world) return;
			finished = true;
			metrics.finishCalls++;
			const w = app.world,
				ids = hub.players.filter((p) => !received[p.id]?.left).map((p) => p.id),
				stats = {};
			for (const id of ids) {
				const s = w.stats.seats[seatFor(id)] || {};
				stats[id] = {
					Hits: s.hits || 0,
					Harvests: s.feeds || 0,
					Gardens: w.stats.cleared,
					Reason: reason || w.result?.reason || w.status,
				};
			}
			hub.finish({
				standings: [ids],
				scores: Object.fromEntries(ids.map((id) => [id, w.score])),
				won: !!w.result?.won,
				stats,
			});
		}
		if (hub) {
			hub.on("start", () => {
				started = true;
			});
			hub.on("message", (data, from) => {
				if (!connected || ended || !data || typeof data !== "object") return;
				metrics.received++;
				if (hub.isHost) {
					const seat = seatFor(from),
						old = received[from];
					if (!seat || old?.left) {
						metrics.rejected++;
						return;
					}
					const a = B.validateActionMessage(data, old?.seq ?? -1);
					if (!a) {
						metrics.rejected++;
						return;
					}
					const p = app.world.players.find((p) => p.seat === seat);
					if (!p) return;
					a.call = Math.max(p.callSeen, Math.min(a.call, p.callSeen + 1));
					received[from] = { ...a, at: app.game.real, left: false };
					B.applyAction(app.world, seat, a);
				} else {
					if (
						from !== hub.host ||
						data.v !== 1 ||
						data.k !== "state" ||
						!Number.isSafeInteger(data.seq) ||
						data.seq <= lastState
					) {
						metrics.rejected++;
						return;
					}
					try {
						const p = data.state;
						if (
							!p ||
							!Number.isFinite(p.t) ||
							!Array.isArray(p.cans) ||
							p.cans.length > 2 ||
							!Array.isArray(p.bees) ||
							p.bees.length > 120 ||
							!Array.isArray(p.combs) ||
							p.combs.length > 190 ||
							!B.CONTENT[p.s]
						)
							throw Error("Invalid state");
						const w = B.unpack(p);
						if (
							!Number.isFinite(w.score) ||
							w.players.some(
								(q) => !Number.isFinite(q.x) || !Number.isFinite(q.ammo),
							)
						)
							throw Error("Invalid state numbers");
						lastState = data.seq;
						app.world = w;
						app.networkAck = data.ack;
					} catch {
						metrics.rejected++;
					}
				}
			});
			hub.on("leave", ({ id }) => {
				if (!connected || ended) return;
				received[id] = { ...(received[id] || {}), left: true };
				if (hub.isHost) {
					const seat = seatFor(id);
					B.removeSeat(app.world, seat);
					if (!app.world.players.length) finish("Crew left");
				}
			});
			hub.on("time-up", () => {
				if (connected && !ended && hub.isHost) {
					if (!app.world.result)
						B.finish(
							app.world,
							false,
							"Time up: " + app.world.stats.cleared + " gardens saved.",
						);
					finish("Time up");
				}
			});
			hub.on("end", () => {
				ended = true;
				app.ended = true;
				B.clearActions(app.world || {});
				app.adapter?.reset();
				app.sound?.stop();
				app.game.input.clear();
			});
		}
		return {
			async connect() {
				if (!hub) return false;
				const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
				if (!info) return false;
				app.online = true;
				connected = true;
				seatsById = Object.fromEntries(
					info.players.map((p, i) => [p.id, i + 1]),
				);
				const seats = info.players.map((_, i) => i + 1);
				app.world = B.createRun({
					seed: info.seed,
					seats,
					rng: hub.isHost ? hub.rng("gameplay") : undefined,
				});
				app.localSeat = info.server ? 0 : seatFor(info.me);
				app.game.o.autoPause = false;
				app.game.live = true;
				app.game.o.menu.quit = false;
				app.game.o.menu.items = () => [
					["About / Credits", () => app.screens.about()],
				];
				app.screens.shell._o.screens.pause = {
					kicker: "Online • the shared garden keeps moving",
					title: "Local options",
					text: "Your can rests while these options are open. The team world keeps moving.",
				};
				app.game.go("play", null, { fade: 0 });
				app.visual.reset();
				app.sound.resetEvents();
				if (info.server) {
					app.game.input.pad = null;
					app.game.input.touchEnabled = false;
					app.sound.stop();
				}
				hub.ready();
				metrics.readyCalls++;
				return true;
			},
			update(dt) {
				if (!connected || ended || !started || hub.time() < 0) return false;
				const w = app.world;
				if (!w) return false;
				if (hub.isHost) {
					for (const [id, r] of Object.entries(received))
						if (!r.left && app.game.real - r.at > 0.45) {
							const p = w.players.find((p) => p.seat === seatFor(+id));
							if (p)
								B.applyAction(w, p.seat, {
									move: 0,
									fire: false,
									call: p.callSeen,
								});
						}
					if (!hub.server && app.localSeat) {
						const a = app.adapter.read(w, app.localSeat);
						B.applyAction(w, app.localSeat, a);
					}
					B.step(w, dt);
					if (w.result) finish(w.result.reason);
					stateClock += dt;
					if (stateClock >= 0.125 && !ended) {
						stateClock %= 0.125;
						const key = w.stage + ":" + w.status + ":" + (w.boss?.phase ?? 0);
						const reliable = key !== lastKey;
						lastKey = key;
						send(
							{
								v: 1,
								k: "state",
								seq: ++stateSeq,
								ack: Object.fromEntries(
									Object.entries(received).map(([k, v]) => [k, v.seq || 0]),
								),
								state: B.pack(w),
							},
							reliable,
						);
					}
				} else {
					const a = app.adapter.read(w, app.localSeat);
					remoteCall = Math.max(remoteCall, a.call || 0);
					inputClock += dt;
					if (inputClock >= 0.1) {
						inputClock %= 0.1;
						send(
							{
								v: 1,
								k: "input",
								seq: ++seq,
								move: a.move || 0,
								aim: a.aim ?? null,
								fire: !!a.fire,
								call: remoteCall,
							},
							false,
							hub.host,
						);
					}
				}
				return true;
			},
			finish,
			metrics,
			get active() {
				return connected;
			},
			get started() {
				return started;
			},
			get ended() {
				return ended;
			},
			get finished() {
				return finished;
			},
			get stateSeq() {
				return lastState;
			},
			get peers() {
				return received;
			},
		};
	};
})((globalThis.BCP = globalThis.BCP || {}));
