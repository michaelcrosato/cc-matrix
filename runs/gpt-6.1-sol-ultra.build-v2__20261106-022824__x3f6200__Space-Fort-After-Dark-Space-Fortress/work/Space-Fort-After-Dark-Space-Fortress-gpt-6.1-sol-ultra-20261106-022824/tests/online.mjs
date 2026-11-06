import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function runOnlineTests() {
	for (const file of ["world.js", "online.js"])
		vm.runInThisContext(await readFile(path.join(root, "src", file), "utf8"), {
			filename: file,
		});
	const SF = globalThis.SF;
	let passed = 0,
		failed = 0;
	const failures = [];
	const check = (name, fn) => {
		try {
			fn();
			passed++;
		} catch (e) {
			failed++;
			failures.push(`${name}: ${e.message}`);
		}
	};
	const players = [
		{ id: 0, seat: 0, name: "HOST", color: "#6ce6ff" },
		{ id: 1, seat: 1, name: "<script>REMOTE</script>", color: "#ffca65" },
	];
	const makeEnv = (options = {}) => {
		let now = 0,
			random = 1981;
		const copies = [],
			traffic = [],
			messages = [];
		const rand = () => {
			random = (Math.imul(random, 1664525) + 1013904223) | 0;
			return (random >>> 0) / 4294967296;
		};
		const hostId = options.server ? -1 : 0;
		const make = (id, isHost) => {
			const handlers = new Map(),
				finishes = [];
			const hub = {
				readyCount: 0,
				finishes,
				time: () => now - (options.countdown || 0),
				on: (event, fn) => {
					handlers.set(event, fn);
					return () => handlers.delete(event);
				},
				ready() {
					this.readyCount++;
				},
				finish(value) {
					finishes.push(value);
				},
				fail(message) {
					throw Error(message);
				},
				send(data, opts) {
					const size = Buffer.byteLength(JSON.stringify(data));
					traffic.push({
						at: now,
						id,
						size,
						reliable: opts.reliable,
						data: structuredClone(data),
					});
					for (const target of copies) {
						if (
							target.id === id ||
							(opts.to !== undefined && opts.to !== target.id)
						)
							continue;
						if (options.loss && !opts.reliable && rand() < options.loss)
							continue;
						messages.push({
							at:
								now +
								(options.latency || 0) +
								(options.jitter ? rand() * options.jitter : 0),
							target,
							from: id,
							data: structuredClone(data),
						});
					}
					return true;
				},
			};
			const info = {
				me: id,
				host: hostId,
				isHost,
				server: options.server && isHost,
				round: 3,
				seed: 99,
				players,
				limitMs: 780000,
			};
			const world = new SF.World({ seed: 99, players });
			const app = {
				world,
				hub,
				networkNow: () => now,
				overlay: false,
				status: [],
				endReasons: [],
				getIntent: () => ({
					mx: 0,
					my: 0,
					ax: 0,
					ay: -1,
					fire: false,
					boost: false,
					pulse: false,
				}),
				onStatus(text) {
					this.status.push(text);
				},
				onEnd(reason) {
					this.endReasons.push(reason);
				},
			};
			const online = new SF.Online(info, app),
				copy = { id, app, online, hub, handlers };
			copies.push(copy);
			return copy;
		};
		const host = make(hostId, true),
			remote = make(1, false);
		const deliver = () => {
			messages.sort((a, b) => a.at - b.at);
			while (messages[0] && messages[0].at <= now) {
				const m = messages.shift();
				m.target.handlers.get("message")?.(m.data, m.from);
			}
		};
		const tick = (seconds, stepWorld = false) => {
			for (let n = 0; n < Math.round(seconds * 120); n++) {
				now += 1000 / 120;
				deliver();
				for (const copy of copies) copy.online.update(1 / 120);
				if (
					stepWorld &&
					host.online.started &&
					hubTime() >= 0 &&
					!host.online.ended &&
					!host.online.finished
				) {
					host.app.world.step(1 / 120, host.online.intents());
					host.online.afterStep();
				}
			}
			deliver();
		};
		const hubTime = () => host.hub.time();
		const emit = (event, value = {}) => {
			for (const c of copies) c.handlers.get(event)?.(value);
		};
		return {
			host,
			remote,
			copies,
			traffic,
			messages,
			make,
			tick,
			emit,
			deliver,
			now: () => now,
			setNow: (v) => {
				now = v;
			},
		};
	};

	check("Hub ready needs no gesture and is called once", () => {
		const env = makeEnv();
		assert.equal(env.host.hub.readyCount, 1);
		assert.equal(env.remote.hub.readyCount, 1);
		assert.equal(env.host.online.started, false);
	});
	check("Countdown has neutral authority intents and cannot finish", () => {
		const e = makeEnv({ countdown: 3000 });
		e.emit("start");
		e.host.app.world.s.result = { won: true };
		e.host.online.afterStep();
		assert.equal(e.host.hub.finishes.length, 0);
		assert.deepEqual(Object.keys(e.host.online.intents()), []);
		e.tick(2, true);
		assert.equal(e.host.app.world.s.tick, 0);
	});
	check("Input identity, sequence and finite values are validated", () => {
		const e = makeEnv();
		const o = e.host.online;
		const v = {
			id: 1,
			seq: 1,
			mx: 0.5,
			my: 0.5,
			ax: 0,
			ay: -1,
			fire: true,
			boost: false,
			pulse: false,
		};
		o._receive({ k: "i", r: 3, e: 1, v }, 0);
		assert.equal(o.pending.size, 0);
		o._receive({ k: "i", r: 3, e: 1, v: { ...v, mx: NaN } }, 1);
		assert.equal(o.pending.size, 0);
		o._receive({ k: "i", r: 3, e: 1, v }, 1);
		assert.equal(o.pending.get(1).fire, true);
		o._receive({ k: "i", r: 3, e: 1, v: { ...v, mx: -1 } }, 1);
		assert.equal(o.pending.get(1).mx, 0.5);
		o._receive({ k: "i", r: 2, e: 1, v: { ...v, seq: 2 } }, 1);
		assert.equal(o.pending.get(1).seq, 1);
	});
	check("Input vectors clamp and lost releases expire after400ms", () => {
		const e = makeEnv();
		e.emit("start");
		const o = e.host.online;
		const v = {
			id: 1,
			seq: 1,
			mx: 7,
			my: 9,
			ax: 0,
			ay: -1,
			fire: true,
			boost: false,
			pulse: false,
		};
		o._receive({ k: "i", r: 3, e: 1, v }, 1);
		assert.ok(Math.hypot(o.intents()[1].mx, o.intents()[1].my) <= 1.000001);
		assert.equal(o.intents()[1].fire, true);
		e.setNow(401);
		assert.equal(o.intents()[1].fire, false);
		assert.equal(o.intents()[1].mx, 0);
	});
	check(
		"Local host input applies without transport echo and overlay neutralizes",
		() => {
			const e = makeEnv();
			e.emit("start");
			e.host.app.getIntent = () => ({
				mx: 1,
				my: 0,
				ax: 0,
				ay: -1,
				fire: true,
				boost: false,
				pulse: false,
			});
			assert.equal(e.host.online.intents()[0].mx, 1);
			e.host.app.overlay = true;
			assert.equal(e.host.online.intents()[0].mx, 0);
			assert.equal(e.host.online.intents()[0].fire, false);
		},
	);
	check(
		"One-tick client actions latch until wire send and execute once",
		() => {
			const e = makeEnv();
			e.emit("start");
			e.remote.online.update(1 / 120);
			e.remote.app.getIntent = () => ({
				mx: 0,
				my: 0,
				ax: 0,
				ay: -1,
				fire: false,
				boost: true,
				pulse: true,
			});
			e.setNow(8);
			e.remote.online.update(1 / 120);
			e.remote.app.getIntent = () => ({
				mx: 0,
				my: 0,
				ax: 0,
				ay: -1,
				fire: false,
				boost: false,
				pulse: false,
			});
			e.setNow(70);
			e.remote.online.update(1 / 120);
			e.deliver();
			let intent = e.host.online.intents()[1];
			assert.equal(intent.boost, true);
			assert.equal(intent.pulse, true);
			intent = e.host.online.intents()[1];
			assert.equal(intent.boost, false);
			assert.equal(intent.pulse, false);
		},
	);
	check(
		"Upgrade choice survives neutral local overlay on host and client",
		() => {
			const e = makeEnv();
			e.emit("start");
			for (const c of e.copies) {
				c.app.overlay = true;
				c.app.getIntent = () => ({
					choice: 1,
					mx: 1,
					my: 0,
					ax: 0,
					ay: -1,
					fire: true,
					boost: false,
					pulse: false,
				});
			}
			assert.equal(e.host.online.intents()[0].choice, 1);
			assert.equal(e.host.online.intents()[0].mx, 0);
			e.remote.online.update(1 / 120);
			e.deliver();
			const v = e.host.online.intents()[1];
			assert.equal(v.choice, 1);
			assert.equal(v.mx, 0);
			assert.equal(v.fire, false);
		},
	);

	check(
		"Local movement predicts before150ms host reply without inventing resources",
		() => {
			const e = makeEnv({ latency: 150 });
			e.emit("start");
			for (const c of e.copies) c.app.world.s.state = "play";
			const local = e.remote.app.world.s.players[1],
				host = e.host.app.world.s.players[1],
				start = local.x;
			const before = {
				hp: local.hp,
				energy: local.energy,
				score: e.remote.app.world.s.score,
				kills: e.remote.app.world.s.kills,
				heat: e.remote.app.world.s.objective.heat,
			};
			e.remote.app.getIntent = () => ({
				mx: 1,
				my: 0,
				ax: 0,
				ay: -1,
				fire: false,
				boost: false,
				pulse: false,
			});
			e.tick(0.1, true);
			assert.ok(local.x > start + 1);
			assert.equal(host.x, start);
			assert.ok(e.remote.online.predictionSteps > 0);
			assert.deepEqual(
				{
					hp: local.hp,
					energy: local.energy,
					score: e.remote.app.world.s.score,
					kills: e.remote.app.world.s.kills,
					heat: e.remote.app.world.s.objective.heat,
				},
				before,
			);
		},
	);
	check("Overlay stops prediction and clears pending ability edges", () => {
		const e = makeEnv({ latency: 150 });
		e.emit("start");
		for (const c of e.copies) c.app.world.s.state = "play";
		e.remote.app.getIntent = () => ({
			mx: 1,
			my: 0,
			ax: 0,
			ay: -1,
			fire: false,
			boost: true,
			pulse: true,
		});
		e.tick(0.05, false);
		const steps = e.remote.online.predictionSteps;
		e.remote.app.overlay = true;
		e.tick(0.1, false);
		assert.equal(e.remote.online.predictionSteps, steps);
		assert.equal(e.remote.online._prediction, null);
		assert.equal(e.remote.online._predictionHistory.length, 0);
		assert.equal(e.remote.online._boostPending, false);
		assert.equal(e.remote.online._pulsePending, false);
	});
	check(
		"Authoritative sequence acknowledgement prunes replay and converges after release",
		() => {
			const e = makeEnv({ latency: 150, jitter: 50, loss: 0.05 });
			e.emit("start");
			for (const c of e.copies) c.app.world.s.state = "play";
			e.remote.app.getIntent = () => ({
				mx: 1,
				my: 0,
				ax: 0,
				ay: -1,
				fire: false,
				boost: false,
				pulse: false,
			});
			e.tick(1, true);
			e.remote.app.getIntent = () => ({
				mx: 0,
				my: 0,
				ax: 0,
				ay: -1,
				fire: false,
				boost: false,
				pulse: false,
			});
			e.tick(2.5, true);
			const a = e.host.app.world.s.players[1],
				b = e.remote.app.world.s.players[1];
			assert.ok(
				Math.hypot(a.x - b.x, a.y - b.y) < 3,
				`release error ${Math.hypot(a.x - b.x, a.y - b.y)}`,
			);
			assert.ok(e.remote.online._predictionAck > 0);
			assert.ok(e.remote.online.predictionCorrections > 0);
			assert.ok(
				e.remote.online._predictionHistory.every(
					(v) => v.seq > e.remote.online._predictionAck,
				),
			);
			assert.equal(a.hp, b.hp);
			assert.equal(e.host.app.world.s.score, e.remote.app.world.s.score);
		},
	);
	check(
		"Prediction respects station hull, horizontal ground boost and gravity correction caps",
		() => {
			const e = makeEnv();
			e.emit("start");
			const c = e.remote,
				p = c.app.world.s.players[1];
			c.app.world.s.state = "play";
			c.app.world.s.act = 2;
			p.x = 400;
			p.y = 465;
			p.angle = -Math.PI / 2;
			c.app.getIntent = () => ({
				mx: 0,
				my: 0,
				ax: 0,
				ay: -1,
				fire: false,
				boost: true,
				pulse: false,
			});
			e.setNow(8);
			c.online.update(1 / 120);
			assert.ok(p.x > 403);
			assert.equal(p.y, 465);
			assert.equal(p.energy, 100);
			c.online._prediction = null;
			c.online._predictionHistory = [];
			c.online._localAuthority = null;
			p.x = 400;
			p.y = 465;
			p.vx = 0;
			p.vy = 0;
			c.app.getIntent = () => ({
				mx: 0,
				my: 0,
				ax: -1,
				ay: -0.2,
				fire: false,
				boost: true,
				pulse: false,
			});
			e.setNow(16);
			c.online.update(1 / 120);
			assert.ok(p.x < 397);
			c.online._prediction = null;
			c.online._predictionHistory = [];
			c.online._localAuthority = null;
			c.app.world.s.act = 1;
			p.x = 553;
			p.y = 270;
			p.vx = 0;
			p.vy = 0;
			c.app.getIntent = () => ({
				mx: -1,
				my: 0,
				ax: 0,
				ay: -1,
				fire: false,
				boost: false,
				pulse: false,
			});
			for (let n = 1; n < 30; n++) {
				e.setNow(8 + (n * 1000) / 120);
				c.online.update(1 / 120);
			}
			assert.ok(Math.hypot(p.x - 480, p.y - 270) >= 72.99);
			c.online._prediction = null;
			c.online._predictionHistory = [];
			c.online._localAuthority = null;
			c.app.world.s.act = 0;
			p.x = 400;
			p.y = 390;
			p.vx = 0;
			p.vy = 0;
			p.lock = 1;
			c.app.getIntent = () => ({
				mx: 1,
				my: 0,
				ax: 0,
				ay: -1,
				fire: false,
				boost: false,
				pulse: false,
			});
			for (let n = 1; n < 240; n++) {
				e.setNow(300 + (n * 1000) / 120);
				c.online.update(1 / 120);
			}
			assert.ok(Math.hypot(p.x - 400, p.y - 390) <= 24.01);
		},
	);
	check(
		"Complete snapshot recovery resets predicted pose while preserving authoritative awards",
		() => {
			const e = makeEnv();
			e.emit("start");
			for (const c of e.copies) c.app.world.s.state = "play";
			e.remote.app.getIntent = () => ({
				mx: 1,
				my: 0,
				ax: 0,
				ay: -1,
				fire: false,
				boost: false,
				pulse: false,
			});
			e.tick(0.1, false);
			const h = e.host.app.world.s,
				p = h.players[1];
			h.tick = 900;
			p.x = 700;
			p.y = 430;
			p.vx = 0;
			p.vy = 0;
			p.lastSeq = 999;
			p.hp = 7;
			p.energy = 43;
			h.score = 8765;
			h.objective.heat = 34;
			e.host.online._makeKeyframes();
			for (const f of e.host.online._keyQueue) e.remote.online._receive(f, 0);
			const v = e.remote.app.world.s.players[1];
			assert.equal(v.x, 700);
			assert.equal(v.y, 430);
			assert.equal(v.hp, 7);
			assert.equal(v.energy, 43);
			assert.equal(e.remote.app.world.s.score, 8765);
			assert.equal(e.remote.app.world.s.objective.heat, 34);
			assert.equal(e.remote.online._predictionHistory.length, 0);
			assert.equal(e.remote.online._predictionAck, 999);
		},
	);

	check("Genuine remote commands move and fire on authoritative world", () => {
		const e = makeEnv({ latency: 150, jitter: 50, loss: 0.05 });
		e.emit("start");
		e.remote.app.getIntent = () => ({
			mx: 0.5,
			my: 0,
			ax: 0,
			ay: -1,
			fire: true,
			boost: false,
			pulse: false,
		});
		e.tick(5, true);
		assert.ok(e.host.app.world.s.players[1].x > 450);
		assert.ok(e.host.app.world.s.shots.some((q) => q.owner === 1));
		assert.ok(e.host.app.world.s.players[1].lastSeq > 0);
		assert.ok(e.remote.online.keyframes > 0);
	});
	check(
		"Complete snapshot chunks restore atomically, duplicate parts once",
		() => {
			const e = makeEnv();
			const h = e.host.online,
				c = e.remote.online;
			e.host.app.world.s.score = 12345;
			e.host.app.world.s.tick = 200;
			for (let i = 0; i < 22; i++)
				e.host.app.world.spawn("bomber", 100 + i * 30, 100);
			for (let i = 0; i < 140; i++)
				e.host.app.world.shoot(100 + i * 3, 150, 0, 1, -1, 1, 100);
			h._makeKeyframes();
			const chunks = h._keyQueue;
			assert.ok(chunks.length > 1);
			for (const data of chunks.slice(0, -1)) c._receive(data, 0);
			assert.equal(c.keyframes, 0);
			c._receive(chunks[0], 0);
			assert.equal(c.keyframes, 0);
			c._receive(chunks.at(-1), 0);
			assert.equal(c.keyframes, 1);
			assert.equal(e.remote.app.world.s.score, 12345);
			assert.equal(e.remote.app.world.s.enemies.length, 22);
			assert.equal(e.remote.app.world.s.shots.length, 140);
			c._receive(chunks.at(-1), 0);
			assert.equal(c.keyframes, 1);
			assert.ok(
				chunks.every((x) => Buffer.byteLength(JSON.stringify(x)) <= 15000),
			);
		},
	);
	check(
		"Motion wins over older in-flight keyframes; stale tick/sender rejected",
		() => {
			const e = makeEnv();
			const h = e.host.online,
				c = e.remote.online;
			e.host.app.world.s.tick = 20;
			h._makeKeyframes();
			const chunks = h._keyQueue;
			e.host.app.world.s.tick = 40;
			e.host.app.world.s.score = 777;
			e.host.app.world.s.objective.heat = 33;
			c._receive(h._motion(), 0);
			for (const d of chunks) c._receive(d, 0);
			assert.equal(e.remote.app.world.s.tick, 40);
			assert.equal(e.remote.app.world.s.score, 777);
			assert.equal(e.remote.app.world.s.objective.heat, 33);
			const bad = { ...h._motion(), t: 1000, c: 99999 };
			c._receive(bad, 2);
			assert.equal(e.remote.app.world.s.score, 777);
			c._receive({ ...h._motion(), t: 2, c: 2 }, 0);
			assert.equal(e.remote.app.world.s.score, 777);
		},
	);
	check(
		"Boss weak points and act transitions replicate without a keyframe wait",
		() => {
			const e = makeEnv();
			e.host.app.world.dev("boss", 1);
			e.host.app.world.s.tick = 100;
			e.remote.online._receive(e.host.online._motion(), 0);
			assert.equal(e.remote.app.world.s.boss.phase, 1);
			assert.equal(e.remote.app.world.s.boss.components.length, 2);
			e.host.app.world.s.boss.components[0].hp = 8;
			e.host.app.world.s.tick = 101;
			e.remote.online._receive(e.host.online._motion(), 0);
			assert.equal(e.remote.app.world.s.boss.components[0].hp, 8);
			e.host.app.world.s.boss = null;
			e.host.app.world.s.state = "transition";
			e.host.app.world.s.tick = 102;
			e.remote.online._receive(e.host.online._motion(), 0);
			assert.equal(e.remote.app.world.s.boss, null);
			assert.equal(e.remote.app.world.s.shots.length, 0);
		},
	);

	check(
		"Input choices survive wire and replica preserves upgrade state",
		() => {
			const e = makeEnv();
			e.emit("start");
			const p = e.host.app.world.s.players[1];
			e.host.app.world.s.state = "upgrade";
			e.host.app.world.s.timer = 12;
			e.remote.app.getIntent = () => ({
				choice: 2,
				mx: 0,
				my: 0,
				ax: 0,
				ay: -1,
				fire: false,
				boost: false,
				pulse: false,
			});
			e.tick(0.5, true);
			assert.equal(p.upgrades[2], 1);
			e.tick(1.5, false);
			assert.equal(e.remote.app.world.s.players[1].upgrades[2], 1);
			assert.equal(e.remote.app.world.s.players[1].choice, 2);
		},
	);
	check(
		"Largest authored entity counts stay below wire limits and18sends/s",
		() => {
			const e = makeEnv({ latency: 150, jitter: 50, loss: 0.05 });
			e.host.app.world.s.state = "play";
			e.emit("start");
			for (let i = 0; i < 22; i++)
				e.host.app.world.spawn("tractor", 100 + i * 30, 100);
			for (let i = 0; i < 140; i++)
				e.host.app.world.shoot(100 + i * 3, 150, 0, 1, -1, 1, 100);
			e.tick(5, false);
			for (const packet of e.traffic)
				assert.ok(
					packet.size <= (packet.reliable ? 15000 : 1200),
					`packet ${packet.size}`,
				);
			for (const copy of e.copies) {
				const packets = e.traffic.filter((p) => p.id === copy.id);
				for (const at of packets.map((p) => p.at))
					assert.ok(
						packets.filter((p) => p.at >= at && p.at < at + 1000).length <= 18,
					);
			}
			assert.ok(e.remote.online.keyframes >= 1);
			assert.equal(e.remote.app.world.s.shots.length, 140);
			assert.equal(e.remote.app.world.s.enemies.length, 22);
		},
	);
	check(
		"Throttled scheduler catches world without network catch-up bursts",
		() => {
			const e = makeEnv();
			e.emit("start");
			e.tick(1, true);
			const before = e.traffic.length;
			e.setNow(10000);
			for (let i = 0; i < 1200; i++) {
				e.host.online.update(1 / 120);
				e.host.app.world.step(1 / 120, e.host.online.intents());
			}
			assert.ok(e.traffic.length - before <= 1);
			assert.ok(e.host.app.world.s.tick >= 1200);
		},
	);
	check("Dedicated authority never asks for a nonexistent local pilot", () => {
		const e = makeEnv({ server: true });
		e.host.app.getIntent = () => {
			throw Error("dedicated local input read");
		};
		e.emit("start");
		e.tick(5, true);
		assert.ok(e.host.app.world.s.tick > 500);
		assert.equal(e.host.app.world.s.players.length, 2);
		assert.ok(e.host.online.sent > 0);
		assert.ok(e.remote.online.keyframes > 0);
	});
	check(
		"Leaving removes command authority and finish includes remaining IDs only",
		() => {
			const e = makeEnv();
			e.emit("start");
			e.emit("leave", { id: 1 });
			assert.equal(e.host.app.world.s.players[1].active, false);
			e.host.app.world.s.result = { won: true };
			e.host.online.afterStep();
			assert.deepEqual(e.host.hub.finishes[0].standings, [[0]]);
			assert.deepEqual(Object.keys(e.host.hub.finishes[0].scores), ["0"]);
		},
	);
	check("Natural finish and time-up report one finite tied team result", () => {
		const e = makeEnv();
		e.emit("start");
		e.host.app.world.s.score = 1200;
		e.host.app.world.s.result = { won: true };
		e.host.online.afterStep();
		e.emit("time-up");
		e.host.online.afterStep();
		assert.equal(e.host.hub.finishes.length, 1);
		assert.equal(e.host.hub.finishes[0].won, true);
		assert.deepEqual(e.host.hub.finishes[0].standings, [[0, 1]]);
		assert.ok(
			Object.values(e.host.hub.finishes[0].scores).every(Number.isFinite),
		);
		const b = makeEnv();
		b.emit("start");
		b.host.app.world.s.score = NaN;
		b.emit("time-up");
		assert.equal(b.host.hub.finishes.length, 1);
		assert.equal(b.host.hub.finishes[0].won, false);
		assert.ok(
			Object.values(b.host.hub.finishes[0].scores).every(Number.isFinite),
		);
	});
	check(
		"End stops traffic, calls cleanup once and ignores later events",
		() => {
			const e = makeEnv();
			e.emit("start");
			e.tick(1);
			e.emit("end", { reason: "host-left" });
			const before = e.traffic.length;
			e.tick(2);
			e.emit("end", { reason: "finished" });
			e.emit("time-up");
			assert.equal(e.traffic.length, before);
			assert.deepEqual(e.host.app.endReasons, ["host-left"]);
			assert.equal(e.host.hub.finishes.length, 0);
			assert.equal(e.remote.online.ended, true);
		},
	);
	return { passed, failed, failures };
}
if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const result = await runOnlineTests();
	for (const failure of result.failures) console.error(`FAIL ${failure}`);
	console.log(`${result.passed} passed, ${result.failed} failed`);
	if (result.failed) process.exitCode = 1;
}
