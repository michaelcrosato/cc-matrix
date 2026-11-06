"use strict";
const assert = require("node:assert/strict");
require("../src/network.js");
const Network = globalThis.TT.Network;

class SmallWorld {
	constructor(players) {
		Object.assign(this, {
			tick: 0,
			section: 0,
			phase: "playing",
			score: 0,
			chances: 3,
			rescued: false,
			roofBeat: 0,
		});
		this.players = players.map((p) => ({ id: p.id, body: { x: 0, z: 16 } }));
		this.jumps = {};
		this.climbs = {};
		this.removed = [];
	}
	step(dt, intents) {
		this.tick++;
		for (const p of this.players) {
			const a = intents[p.id] || {};
			p.body.x += (a.x || 0) * dt * 95;
			if (a.jumpPressed) this.jumps[p.id] = (this.jumps[p.id] || 0) + 1;
			if (a.up) this.climbs[p.id] = (this.climbs[p.id] || 0) + dt;
		}
	}
	compactSnapshot() {
		return {
			k: this.tick,
			s: this.section,
			p: this.phase,
			c: this.chances,
			r: this.rescued,
			score: this.score,
			a: this.players.map((p) => [p.id, p.body.x, p.body.z]),
		};
	}
	applyCompact(w) {
		Object.assign(this, {
			tick: w.k,
			section: w.s,
			phase: w.p,
			chances: w.c,
			rescued: w.r,
			score: w.score,
		});
		this.players = w.a.map(([id, x, z]) => ({ id, body: { x, z } }));
	}
	removePlayer(id) {
		this.removed.push(id);
		this.players = this.players.filter((p) => p.id !== id);
	}
}

function wire(server = false) {
	const state = {
		now: -3000,
		traffic: [],
		drop: false,
		queue: [],
		finish: [],
		ends: [],
	};
	const players = [
		{ id: 0, seat: 1, name: "Zero" },
		{ id: 1, seat: 2, name: "One" },
	];
	const hostId = server ? -1 : 0;
	const hubs = new Map();
	const makeHub = (id) => {
		const handlers = new Map();
		const hub = {
			active: true,
			me: id,
			host: hostId,
			isHost: id === hostId,
			server: server && id === hostId,
			players,
			readyCount: 0,
			rngCount: 0,
			async connect(opts) {
				assert.deepEqual(opts, { mode: "shared-world", seats: [1, 2] });
				return {
					me: id,
					host: hostId,
					isHost: id === hostId,
					server: hub.server,
					players,
					seed: 43,
				};
			},
			ready() {
				hub.readyCount++;
			},
			time: () => state.now,
			rng() {
				hub.rngCount++;
				return () => 0.4;
			},
			on(type, fn) {
				const list = handlers.get(type) || [];
				list.push(fn);
				handlers.set(type, list);
				return () => list.splice(list.indexOf(fn), 1);
			},
			emit(type, ...args) {
				for (const fn of handlers.get(type) || []) fn(...args);
			},
			probe() {},
			send(data, opts) {
				state.traffic.push({
					from: id,
					data: structuredClone(data),
					opts,
					at: state.now,
				});
				if (state.drop) return false;
				for (const [to, other] of hubs)
					if (to !== id && (opts.to === undefined || opts.to === to))
						state.queue.push(() =>
							other.emit("message", structuredClone(data), id),
						);
				return true;
			},
			finish(result) {
				state.finish.push({ id, result });
			},
		};
		hubs.set(id, hub);
		return hub;
	};
	state.hubs = hubs;
	state.host = makeHub(hostId);
	if (server) makeHub(0);
	state.client = makeHub(1);
	state.flush = () => {
		for (const fn of state.queue.splice(0)) fn();
	};
	state.make = (hub, input = () => ({})) =>
		new Network({
			hub,
			create: (info) => new SmallWorld(info.players),
			getIntent: input,
			onEnd: () => state.ends.push(hub.me),
		});
	return state;
}

async function runNetworkTests() {
	const cases = [];
	const test = async (name, fn) => {
		try {
			await fn();
			cases.push({ name, pass: true });
		} catch (error) {
			cases.push({ name, pass: false, error: error.stack });
		}
	};
	await test("Hub: auto-ready, retained RNG streams, default card, no pre-countdown simulation", async () => {
		const w = wire();
		const a = w.make(w.host, () => ({
			jump: true,
			jumpPressed: true,
			up: true,
		}));
		await a.connect();
		assert.equal(w.host.readyCount, 1);
		assert.equal(w.host.rngCount, 2);
		a.update(0.1, 0);
		assert.equal(a.sim.tick, 0);
		w.host.emit("start");
		a.update(0.1, 100);
		assert.equal(a.sim.tick, 0);
		assert.equal(a.pending.length, 0);
		w.now = 0;
		a.update(0.1, 200);
		assert(a.sim.tick > 0);
		assert.equal(w.host.rngCount, 2);
	});
	await test("Hub: lost one-frame jump and climb taps are repeated and acknowledged once", async () => {
		const w = wire();
		let input = {};
		const a = w.make(w.host);
		const b = w.make(w.client, () => input);
		await a.connect();
		await b.connect();
		w.now = 0;
		w.host.emit("start");
		w.client.emit("start");
		a.update(0.02, 0);
		w.flush();
		w.drop = true;
		input = { jumpPressed: true, jump: true, up: true };
		b.update(0.01, 0);
		input = {};
		b.update(0.01, 10);
		assert.equal(b.pending.length, 2);
		w.drop = false;
		w.now = 90;
		b.update(0.01, 90);
		w.flush();
		a.update(0.02, 90);
		assert.equal(a.sim.jumps[1], 1);
		assert(a.sim.climbs[1] > 0);
		w.flush();
		assert.equal(b.pending.length, 0);
		const packet = w.traffic.find((p) => p.from === 1 && p.data.e.length).data;
		a.receive(packet, 1);
		a.update(0.02, 110);
		assert.equal(a.sim.jumps[1], 1);
		assert(a.metrics.stale > 0);
	});
	await test("Hub: spoofed seat, impossible axes, sequence and tick are rejected", async () => {
		const w = wire();
		const a = w.make(w.host);
		await a.connect();
		const packet = { t: "i", n: 1, k: 0, x: 0, b: 0, e: [] };
		for (const [m, from] of [
			[packet, 10],
			[{ ...packet, x: Infinity }, 1],
			[{ ...packet, n: 9000 }, 1],
			[{ ...packet, k: 999 }, 1],
		])
			a.receive(m, from);
		assert.equal(a.metrics.rejected, 4);
	});
	await test("Hub: stale world and duplicated objectives never roll back newer authority", async () => {
		const w = wire();
		const b = w.make(w.client);
		await b.connect();
		const snapshot = {
			t: "s",
			n: 2,
			k: 10,
			a: [[1, 1, 0]],
			w: {
				k: 10,
				s: 1,
				p: "playing",
				c: 2,
				r: false,
				score: 150,
				a: [[1, 50, 16]],
			},
		};
		b.receive(snapshot, 0);
		b.receive(
			{ ...snapshot, n: 1, k: 9, w: { ...snapshot.w, s: 0, score: 0 } },
			0,
		);
		b.receive(snapshot, 0);
		assert.equal(b.sim.section, 1);
		assert.equal(b.sim.score, 150);
		assert.equal(b.metrics.stale, 2);
	});
	await test("Hub: non-playing server runs two pawn world without a local intention", async () => {
		const w = wire(true);
		let read = 0;
		const a = w.make(w.host, () => {
			read++;
			return { x: 1 };
		});
		await a.connect();
		w.host.emit("start");
		w.now = 0;
		a.update(0.1, 0);
		assert.equal(read, 0);
		assert.equal(a.sim.players.length, 2);
		assert(a.sim.tick >= 11);
		assert.equal(a.server, true);
		assert.equal(a.diagnostics().assignedId, null);
	});
	await test("Hub: helper departure removes its actor and membership without ending rescue", async () => {
		const w = wire();
		const a = w.make(w.host);
		await a.connect();
		a.sim.phase = "transition";
		w.host.emit("leave", { id: 1 });
		assert.deepEqual(a.sim.removed, [1]);
		assert.deepEqual([...a.members], [0]);
		assert.equal(a.finished, false);
	});
	await test("Hub: committed rescue wins time-up; tied finish includes remaining members once", async () => {
		const w = wire();
		const a = w.make(w.host);
		await a.connect();
		a.sim.rescued = true;
		a.sim.phase = "departure";
		a.sim.score = 900;
		w.host.emit("time-up", { graceMs: 1000 });
		w.host.emit("time-up", { graceMs: 1000 });
		assert.equal(w.finish.length, 1);
		assert.deepEqual(w.finish[0].result.standings, [[0, 1]]);
		assert.equal(w.finish[0].result.won, true);
		assert.deepEqual(w.finish[0].result.scores, { 0: 900, 1: 900 });
	});
	await test("Hub: ordinary finish waits for plane departure and failure reports loss", async () => {
		const w = wire();
		const a = w.make(w.host);
		await a.connect();
		w.host.emit("start");
		w.now = 0;
		a.sim.phase = "departure";
		a.sim.rescued = true;
		a.update(0.01, 0);
		assert.equal(w.finish.length, 0);
		a.sim.phase = "results";
		a.update(0.01, 100);
		assert.equal(w.finish[0].result.won, true);
		const w2 = wire();
		const b = w2.make(w2.host);
		await b.connect();
		w2.host.emit("start");
		w2.now = 0;
		b.sim.phase = "failed";
		b.update(0.01, 0);
		assert.equal(w2.finish[0].result.won, false);
	});
	await test("Hub: one 12Hz scheduler stays below protocol rate and bounds history", async () => {
		const w = wire();
		const a = w.make(w.host);
		const b = w.make(w.client);
		await a.connect();
		await b.connect();
		w.host.emit("start");
		w.client.emit("start");
		for (let i = 0; i < 600; i++) {
			w.now = i * 10;
			a.update(0.01, w.now);
			b.update(0.01, w.now);
			w.flush();
		}
		for (const id of [0, 1])
			assert(w.traffic.filter((p) => p.from === id).length <= 72);
		assert(a.metrics.maxRoutineBytes <= 1200);
		assert(b.history.length <= 180);
	});
	await test("Hub: no simulation, traffic or queued input after end; disposal detaches handlers", async () => {
		const w = wire();
		const a = w.make(w.host);
		await a.connect();
		w.host.emit("start");
		w.now = 0;
		a.update(0.01, 0);
		w.host.emit("end", { reason: "host-left" });
		const count = w.traffic.length;
		const tick = a.sim.tick;
		a.setIntent({ x: 1, jumpPressed: true });
		a.update(0.2, 1000);
		a.receive({ t: "i", n: 10, k: tick, x: 1, b: 0, e: [] }, 1);
		assert.equal(w.traffic.length, count);
		assert.equal(a.sim.tick, tick);
		assert.equal(a.pending.length, 0);
		assert.equal(w.ends.length, 1);
		a.dispose();
		assert.equal(a.removers.length, 0);
	});
	return cases;
}

module.exports = runNetworkTests;
if (require.main === module)
	runNetworkTests().then((cases) => {
		for (const c of cases)
			if (!c.pass) process.stderr.write(`${c.name}\n${c.error}\n`);
		process.stdout.write(
			`${cases.filter((c) => c.pass).length}/${cases.length} network checks passed\n`,
		);
		if (cases.some((c) => !c.pass)) process.exitCode = 1;
	});
