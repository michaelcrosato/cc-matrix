import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const source = fs.readFileSync(
	new URL("../src/online/hub.js", import.meta.url),
	"utf8",
);
function load() {
	const c = vm.createContext({
		TextEncoder,
		setInterval,
		clearInterval,
		performance,
	});
	vm.runInContext(source, c);
	return c.RuinOnline;
}
function fixture({ server = false, host = true, ids = [0, 1] } = {}) {
	let ms = 0,
		time = -Infinity,
		callback = null,
		ended = false;
	const handlers = {},
		sent = [],
		outcomes = [];
	const hub = {
		active: true,
		isHost: host,
		me: server ? 99 : host ? 0 : 1,
		host: server ? 99 : 0,
		server,
		players: ids.map((id) => ({
			id,
			name: "Scout " + id,
			color: id ? "#00f" : "#f00",
		})),
		seed: 123,
		on(type, fn) {
			(handlers[type] ??= []).push(fn);
			return () => {};
		},
		emit(type, ...args) {
			for (const fn of handlers[type] || []) fn(...args);
		},
		async connect() {
			return { ...this };
		},
		rng() {
			return () => 0.123456;
		},
		ready() {
			this.isReady = true;
		},
		time() {
			return time;
		},
		send(data, opts) {
			if (ended) throw Error("send after end");
			sent.push({ data: JSON.parse(JSON.stringify(data)), opts });
			return this.acceptSends !== false;
		},
		finish(result) {
			outcomes.push(result);
		},
	};
	const make = () => ({
		tick: 0,
		time: 0,
		seed: 123,
		sector: 0,
		mode: "play",
		phase: 0,
		phaseTime: 0,
		reserves: 4,
		score: 0,
		players: ids.map((id) => ({
			id,
			x: 100,
			y: 270,
			vx: 0,
			vy: 0,
			ax: 1,
			ay: 0,
			alive: true,
			invuln: 0,
			charge: 0,
		})),
		cells: [
			{
				id: 1,
				x: 670,
				y: 200,
				baseX: 670,
				baseY: 200,
				plate: 0,
				material: "normal",
				size: 20,
				alive: true,
			},
		],
		shots: [],
		cannons: [],
		hazards: [],
		core: { x: 810, y: 270, hp: 1, state: "dock" },
		refuge: { x: 355, w: 100, active: true },
		events: [],
		tuning: { scoutSpeed: 250 },
		stats: {},
		tutorial: 0,
		message: "",
	});
	const sim = {
		create: make,
		step(w, actions, dt) {
			w.tick++;
			w.time += dt;
			w.phaseTime += dt;
			w.events = [];
			w.players.forEach((p, i) => {
				p.x += (actions[i]?.mx || 0) * 250 * dt;
				if (actions[i]?.cannon) {
					w.cannons.push({ id: w.tick, x: 30, y: p.y, owner: i, warn: 0.28 });
					w.score++;
				}
			});
		},
		nextSector(w) {
			w.sector++;
			w.mode = "play";
		},
		command(w, name, i) {
			if (name === "leave") {
				w.players[i].departed = true;
				w.players[i].alive = false;
				w.players[i].respawn = 0;
			}
		},
	};
	const opts = {
		hub,
		sim,
		clock: () => ms,
		setInterval(fn) {
			callback = fn;
			return 1;
		},
		clearInterval() {
			callback = null;
		},
		onEnd() {
			ended = true;
		},
	};
	return {
		hub,
		sim,
		opts,
		sent,
		outcomes,
		async connect() {
			return load().connect(opts);
		},
		advance(dt = 100) {
			ms += dt;
			if (Number.isFinite(time)) time += dt;
			callback?.();
		},
		start(countdown = 0) {
			time = -countdown;
			hub.emit("start", { in: countdown });
		},
		setTime(t) {
			time = t;
		},
		get time() {
			return time;
		},
	};
}
export async function runTests() {
	const results = [];
	const check = async (name, fn) => {
		try {
			await fn();
			results.push({ name, pass: true });
		} catch (e) {
			results.push({ name, pass: false, error: e.stack || String(e) });
		}
	};
	await check(
		"online validator rejects authority forgery, impossible vectors and stale membership",
		() => {
			const o = load(),
				v = o.createValidator([0], () => 100);
			const valid = o.encodeInput(
				{ mx: 1, my: 0, ax: 1, ay: 0, fire: true },
				1,
				0,
				100,
			);
			assert(v.accept(valid, 0));
			assert(!v.accept({ ...valid, q: 2, a: [999, 0, 0, 0, 0] }, 0));
			assert(!v.accept({ ...valid, q: 2 }, 9));
			assert(!v.accept({ ...valid, q: 2, at: -20000 }, 0));
			assert(
				!v.accept(
					{ k: "grant-charge", q: 2, a: [0, 0, 1, 0, 0], c: 1, at: 100 },
					0,
				),
			);
		},
	);
	await check(
		"online cannon repetition is acknowledged and deduplicated exactly once",
		() => {
			const o = load(),
				v = o.createValidator([0], () => 0);
			assert(v.accept(o.encodeInput({}, 1, 1, 0), 0));
			assert.equal(v.action(0).cannon, true);
			assert(v.accept(o.encodeInput({}, 2, 1, 0), 0));
			assert.equal(v.action(0).cannon, false);
			assert.equal(v.ack()[0], 1);
		},
	);
	await check("online stale held input releases automatically", () => {
		const o = load();
		let t = 0;
		const v = o.createValidator([0], () => t);
		v.accept(o.encodeInput({ mx: 1, fire: true }, 1, 0, 0), 0);
		t = 1000;
		assert.equal(v.action(0).mx, 0);
		assert.equal(v.action(0).fire, false);
	});
	await check(
		"online world waits for synchronized start and negative countdown",
		async () => {
			const f = fixture();
			const a = await f.connect();
			assert(f.hub.isReady);
			f.advance(500);
			assert.equal(a.world.tick, 0);
			f.start(3000);
			f.advance(100);
			assert.equal(a.world.tick, 0);
			f.setTime(0);
			f.advance(100);
			assert(a.world.tick > 0);
			a.dispose();
		},
	);
	await check(
		"online host-local actions use authority validation without echo",
		async () => {
			const f = fixture();
			const a = await f.connect();
			f.start();
			a.setInput({ mx: 1, ax: 1 });
			f.advance(100);
			assert(a.world.players[0].x > 100);
			assert.equal(a.world.players[1].x, 100);
			a.dispose();
		},
	);
	await check(
		"online server host has no avatar and ticks without rendering",
		async () => {
			const f = fixture({ server: true });
			const a = await f.connect();
			assert.equal(a.localIndex, -1);
			assert.equal(a.world.players.length, 2);
			f.start();
			f.advance(100);
			assert(a.world.tick > 0);
			a.setInput({ mx: 1, cannon: true });
			assert.equal(a.world.players.length, 2);
			f.hub.emit("time-up", { graceMs: 5000 });
			f.advance(2100);
			assert.equal(f.outcomes.length, 1);
			assert.equal(JSON.stringify(f.outcomes[0].standings), "[[0,1]]");
			a.dispose();
		},
	);
	await check(
		"online time-up during transition reports one cooperative result",
		async () => {
			const f = fixture();
			const a = await f.connect();
			a.world.mode = "transition";
			f.hub.emit("time-up", { graceMs: 1000 });
			f.hub.emit("time-up", { graceMs: 5000 });
			f.advance(2100);
			assert.equal(f.outcomes.length, 1);
			assert.equal(f.outcomes[0].won, false);
			a.dispose();
		},
	);
	await check(
		"online non-host leave removes pending body and standings member",
		async () => {
			const f = fixture();
			const a = await f.connect();
			a.world.players[1].respawn = 2;
			f.hub.emit("leave", { id: 1 });
			assert(a.world.players[1].departed);
			assert.equal(a.world.players[1].respawn, 0);
			f.hub.emit("time-up", {});
			assert.equal(JSON.stringify(f.outcomes[0].standings), "[[0]]");
			a.dispose();
		},
	);
	await check(
		"online end stops simulation, sends, action and finish",
		async () => {
			const f = fixture();
			const a = await f.connect();
			f.start();
			f.advance();
			const tick = a.world.tick,
				sends = f.sent.length;
			f.hub.emit("end", { reason: "host-left" });
			a.setInput({ mx: 1, cannon: true });
			f.advance(1000);
			a.finish(false, "test");
			assert.equal(a.world.tick, tick);
			assert.equal(f.sent.length, sends);
			assert.equal(f.outcomes.length, 0);
			assert(a.ended);
		},
	);
	await check(
		"online compact state round trip preserves holes and topology",
		() => {
			const o = load(),
				f = fixture(),
				w = f.sim.create();
			w.cells[0].alive = false;
			const packet = o.pack(w, 5, { 0: 1 }, [], true);
			const copy = o.unpack(packet, f.sim, null, { seed: 123 });
			assert.equal(copy.cells[0].alive, false);
			assert.equal(copy.cells[0].x, 670);
			assert.equal(copy.players[0].x, w.players[0].x);
			assert.equal(packet.n, 5);
			assert(JSON.stringify(packet).length < 16384);
		},
	);
	await check(
		"online client rejects stale and non-host snapshots",
		async () => {
			const f = fixture({ host: false }),
				a = await f.connect();
			const o = load(),
				w = f.sim.create();
			w.tick = 50;
			const packet = o.pack(w, 5, {}, [], true);
			f.hub.emit("message", packet, 0);
			assert.equal(a.world.tick, 50);
			w.tick = 10;
			f.hub.emit("message", o.pack(w, 4, {}, [], true), 0);
			assert.equal(a.world.tick, 50);
			f.hub.emit("message", o.pack(w, 6, {}, [], true), 7);
			assert.equal(a.world.tick, 50);
			assert.equal(a.debug.rejectedSnapshots, 2);
			a.dispose();
		},
	);
	await check(
		"online false send retries keyframe and reliable cannon until acknowledged",
		async () => {
			const f = fixture({ host: false }),
				a = await f.connect();
			f.start();
			f.hub.acceptSends = false;
			a.setInput({ cannon: true });
			f.advance(100);
			f.hub.acceptSends = true;
			f.advance(100);
			assert(f.sent.length >= 2);
			assert.equal(f.sent[0].data.c, 1);
			assert.equal(f.sent[1].data.c, 1);
			assert(f.sent[1].opts.reliable);
			a.dispose();
		},
	);
	await check(
		"online final outcome reaches clients before guarded host finish",
		async () => {
			const f = fixture(),
				a = await f.connect();
			f.start();
			f.advance(100);
			a.finish(true, "victory");
			assert.equal(f.outcomes.length, 0);
			const key = f.sent.at(-1).data;
			assert.equal(key.end.won, true);
			const tick = a.world.tick;
			const o = load();
			f.hub.emit(
				"message",
				{ ...o.encodeInput({}, 1, 0, f.time), endAck: key.end.id },
				1,
			);
			f.advance(100);
			assert.equal(f.outcomes.length, 1);
			assert.equal(a.world.tick, tick);
			assert(f.outcomes[0].won);
			a.dispose();
		},
	);
	await check(
		"online optional input source samples only at sends and stops at end",
		async () => {
			const f = fixture({ host: false }),
				a = await f.connect();
			let calls = 0;
			assert(
				a.setInputSource(() => {
					calls++;
					return { mx: 1, ax: 1, cannon: calls === 1 };
				}),
			);
			f.advance(100);
			assert.equal(calls, 0);
			f.start(1000);
			f.advance(100);
			assert.equal(calls, 0);
			f.setTime(0);
			f.advance(50);
			assert.equal(calls, 0);
			f.advance(50);
			assert.equal(calls, 1);
			assert.equal(f.sent.at(-1).data.a[0], 127);
			assert.equal(f.sent.at(-1).data.c, 1);
			a.setInput({ mx: 0, cannon: false });
			f.advance(50);
			assert.equal(calls, 1);
			f.advance(50);
			assert.equal(calls, 2);
			assert.equal(f.sent.at(-1).data.a[0], 127);
			assert.equal(f.sent.at(-1).data.c, 1);
			f.hub.emit("end", { reason: "finished" });
			f.advance(1000);
			assert.equal(calls, 2);
			assert.equal(
				a.setInputSource(() => {
					calls++;
				}),
				false,
			);
		},
	);
	return results;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
	const r = await runTests();
	for (const x of r) if (!x.pass) console.error(x.name + "\n" + x.error);
	console.log(
		`${r.filter((x) => x.pass).length} passed, ${r.filter((x) => !x.pass).length} failed`,
	);
	process.exitCode = r.some((x) => !x.pass) ? 1 : 0;
}
