import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import "../src/net.js";

const copy = (x) => JSON.parse(JSON.stringify(x));

class StubSimulation {
	constructor({ seed, seats, runId }) {
		this.state = {
			seed,
			runId,
			floor: 0,
			tick: 0,
			time: 0,
			phase: "play",
			terminal: null,
			stock: 3,
			score: 0,
			totalRescued: 0,
			recentEvents: [],
			balance: { playerSpeed: 3.5 },
			players: seats.map((seat) => ({
				id: `p${seat}`,
				seat,
				x: seat * 16,
				y: 16,
				active: true,
				carry: null,
				home: null,
				hurt: 0,
			})),
		};
		this.events = [];
		this.held = {};
	}
	snapshot() {
		return copy(this.state);
	}
	loadSnapshot(state) {
		this.state = copy(state);
	}
	step(dt, intents) {
		this.state.tick++;
		this.state.time += dt;
		this.events = [];
		for (const p of this.state.players) {
			if (!p.active) continue;
			const input = intents[p.seat] || {};
			this.predictPlayer(p, input, dt);
			if (input.bomb && !this.held[p.seat] && this.state.stock > 0) {
				this.state.stock--;
				const event = {
					id: `${this.state.runId}:${this.state.tick}`,
					kind: "bomb",
					floor: 0,
					tick: this.state.tick,
					seat: p.seat,
				};
				this.events.push(event);
				this.state.recentEvents.push(event);
			}
			this.held[p.seat] = !!input.bomb;
		}
	}
	predictPlayer(p, input, dt) {
		const d = [
			[0, -1],
			[1, 0],
			[0, 1],
			[-1, 0],
		][input.dir];
		if (!d) return;
		p.x = Math.min(100, Math.max(0, p.x + d[0] * 56 * dt));
		p.y = Math.min(100, Math.max(0, p.y + d[1] * 56 * dt));
		p.dir = input.dir;
	}
	removeSeat(seat) {
		const p = this.state.players.find((p) => p.seat === seat);
		p.active = false;
		p.carry = p.home = null;
	}
}

function makeRoom({ dedicated = false } = {}) {
	let clock = -Infinity;
	let serial = 0;
	const queued = [];
	const hubs = new Map();
	const players = [{ id: 0 }, { id: 1 }];
	const host = dedicated ? 2 : 0;
	const createHub = (id) => {
		const handlers = new Map();
		const info = {
			me: id,
			host,
			isHost: id === host,
			server: dedicated && id === host,
			players,
			seed: 47,
			round: 3,
			mode: "shared-world",
			limitMs: 900000,
		};
		const hub = {
			version: "1.4.0",
			info,
			readyCount: 0,
			finishCount: 0,
			sent: [],
			finishes: [],
			on(type, fn) {
				if (!handlers.has(type)) handlers.set(type, new Set());
				handlers.get(type).add(fn);
				return () => handlers.get(type).delete(fn);
			},
			emit(type, ...args) {
				for (const fn of handlers.get(type) || []) fn(...args);
			},
			time() {
				return clock;
			},
			rng() {
				return () => 0.123456;
			},
			ready() {
				this.readyCount++;
			},
			finish(outcome) {
				this.finishCount++;
				this.finishes.push(copy(outcome));
			},
			send(data, opts) {
				this.sent.push({ data: copy(data), opts: copy(opts || {}) });
				for (const [to] of hubs)
					if (to !== id && (opts?.to == null || opts.to === to))
						queued.push({ from: id, to, data: copy(data), serial: ++serial });
				return true;
			},
		};
		hubs.set(id, hub);
		return hub;
	};
	createHub(0);
	createHub(1);
	if (dedicated) createHub(host);
	const networks = new Map(
		[...hubs].map(([id, hub]) => [
			id,
			new TSS.Network({
				hub,
				info: hub.info,
				createSimulation: (opts) => new StubSimulation(opts),
			}),
		]),
	);
	const room = {
		hubs,
		networks,
		get clock() {
			return clock;
		},
		set clock(t) {
			clock = t;
		},
		flush({ reverse = false, loss = 0 } = {}) {
			const packets = queued.splice(0);
			if (reverse) packets.reverse();
			for (const m of packets)
				if (!loss || m.serial % loss)
					hubs.get(m.to)?.emit("message", m.data, m.from);
		},
		step(seconds, inputs = {}, options = {}) {
			for (let i = 0; i < Math.round(seconds * 120); i++) {
				if (Number.isFinite(clock)) clock += 1000 / 120;
				for (const [id, net] of networks)
					net.update(
						1 / 120,
						inputs[id] || { dir: -1, bomb: false, confirm: false },
					);
				room.flush(options);
			}
		},
		start() {
			for (const hub of hubs.values()) hub.emit("start", { in: 3000 });
			clock = -3000;
		},
		ready() {
			for (const n of networks.values()) n.ready();
			room.flush();
		},
		host: networks.get(host),
	};
	return room;
}

export async function runNetworkTests() {
	const failures = [];
	let count = 0;
	const test = (name, fn) => {
		count++;
		try {
			fn();
		} catch (e) {
			failures.push(`${name}: ${e.stack || e}`);
		}
	};

	test("Ready has no input gate and is called exactly once", () => {
		const r = makeRoom();
		r.ready();
		r.ready();
		for (const hub of r.hubs.values()) assert.equal(hub.readyCount, 1);
	});
	test("No simulation advances before a finite nonnegative Hub millisecond clock", () => {
		const r = makeRoom();
		r.ready();
		r.step(1);
		assert.equal(r.host.sim.state.tick, 0);
		r.start();
		r.step(2.9, { 0: { dir: 1 }, 1: { dir: 3 } });
		assert.equal(r.host.sim.state.tick, 0);
		r.step(0.3, { 0: { dir: 1 }, 1: { dir: 3 } });
		assert.ok(r.host.sim.state.tick > 0);
	});
	test("One authority moves simultaneous independent seats and snapshots recover under loss", () => {
		const r = makeRoom();
		r.ready();
		r.start();
		r.clock = 0;
		r.step(0.8, { 0: { dir: 2 }, 1: { dir: 1 } }, { reverse: true, loss: 5 });
		const [p1, p2] = r.host.sim.state.players;
		assert.ok(p1.y > 30);
		assert.ok(p2.x > 50);
		r.step(0.3);
		const c = r.networks.get(1);
		assert.ok(Math.abs(c.sim.state.players[1].x - p2.x) < 8);
		assert.ok(c.metrics.snapshots > 2);
		assert.ok(r.host.metrics.acceptedInputs > 2);
	});
	test("Held bomb plus duplicate and reordered intention packets cost exactly one unit", () => {
		const r = makeRoom();
		r.ready();
		r.start();
		r.clock = 0;
		r.step(0.8, { 1: { dir: -1, bomb: true } });
		assert.equal(r.host.sim.state.stock, 2);
		const packet = r.hubs.get(1).sent.at(-1).data;
		r.hubs.get(0).emit("message", packet, 1);
		r.hubs.get(0).emit("message", { ...packet, q: 0 }, 1);
		r.step(0.1, { 1: { dir: -1, bomb: true } });
		assert.equal(r.host.sim.state.stock, 2);
		r.step(0.1, { 1: { dir: -1, bomb: false } });
		r.step(0.2, { 1: { dir: -1, bomb: true } });
		assert.equal(r.host.sim.state.stock, 1);
	});
	test("Sender authenticates seat; malformed direction, wrong run/floor and outcome claims are ignored", () => {
		const r = makeRoom();
		r.ready();
		r.start();
		r.clock = 0;
		r.step(0.1);
		const n = r.host;
		const before = n.sim.snapshot();
		const packet = { t: "i", v: 1, r: n.runId, q: 42, d: 1, b: 0, c: 0, f: 0 };
		for (const p of [
			{ ...packet, d: 5 },
			{ ...packet, r: "fake" },
			{ ...packet, f: 4 },
			{ ...packet, d: 1.2 },
			{ ...packet, b: -1 },
		])
			n.receive(p, 1);
		n.receive(packet, 99);
		n.receive({ ...packet, t: "rescue", score: 10000 }, 1);
		assert.deepEqual(n.sim.snapshot(), before);
		assert.ok(n.metrics.rejectedInputs >= 5);
	});
	test("A long gap in button counters recovers movement and coalesces one accepted action", () => {
		const r = makeRoom();
		r.ready();
		r.start();
		r.clock = 0;
		r.step(0.2);
		const packet = {
			t: "i",
			v: 1,
			r: r.host.runId,
			q: 100,
			d: 2,
			b: 25,
			c: 0,
			f: 0,
		};
		r.host.receive(packet, 1);
		r.step(0.2);
		assert.equal(r.host.sim.state.stock, 2);
		assert.ok(r.host.sim.state.players[1].y > 16);
		assert.equal(r.host.controls.get(1).bomb, 25);
	});
	test("Client refuses nonhost snapshots, duplicates, floor rewind and stale ticks", () => {
		const r = makeRoom();
		r.ready();
		r.start();
		r.clock = 0;
		r.step(0.3);
		const c = r.networks.get(1);
		const before = c.sim.snapshot();
		const packet = { ...r.hubs.get(0).sent.at(-1).data, q: 1000 };
		packet.s.score = 999;
		c.receive(packet, 999);
		assert.equal(c.sim.state.score, before.score);
		c.receive({ ...packet, k: 0, s: { ...packet.s, tick: 0 } }, 0);
		assert.equal(c.sim.state.score, before.score);
		const old = r.hubs.get(0).sent[0].data;
		c.receive(old, 0);
		assert.equal(c.sim.state.score, before.score);
	});
	test("Recovery snapshots deduplicate events and discard obsolete floor presentation", () => {
		const r = makeRoom();
		r.ready();
		r.start();
		r.clock = 0;
		r.step(0.2);
		const c = r.networks.get(1),
			seen = [];
		c.onEvent = (event) => seen.push(event.id);
		c.sim.state.floor = 1;
		c.emitEvents([
			{ id: "old", floor: 0, kind: "pickup" },
			{ id: "new", floor: 1, kind: "deliver" },
		]);
		c.emitEvents([{ id: "new", floor: 1, kind: "deliver" }]);
		assert.deepEqual(seen, ["new"]);
	});
	test("Dedicated host owns the world with no controllable turtle", () => {
		const r = makeRoom({ dedicated: true });
		r.ready();
		r.start();
		r.clock = 0;
		assert.equal(r.host.localSeat, null);
		r.step(0.8, { 0: { dir: 1 }, 1: { dir: 2 }, 2: { dir: 3, bomb: true } });
		assert.ok(r.host.sim.state.players[0].x > 30);
		assert.ok(r.host.sim.state.players[1].y > 30);
		assert.equal(r.host.sim.state.stock, 3);
		assert.equal(r.host.sim.state.players.length, 2);
	});
	test("Leave releases a passenger and permits the remaining player to continue", () => {
		const r = makeRoom();
		r.ready();
		r.start();
		r.clock = 0;
		r.step(0.2);
		r.host.sim.state.players[1].carry = "baby";
		r.host.sim.state.players[1].home = "home";
		for (const hub of r.hubs.values())
			hub.emit("leave", { id: 1, reason: "left" });
		assert.equal(r.host.sim.state.players[1].active, false);
		assert.equal(r.host.sim.state.players[1].home, null);
		const old = r.host.sim.state.players[0].y;
		r.step(0.2, { 0: { dir: 2 } });
		assert.ok(r.host.sim.state.players[0].y > old);
	});
	test("Only host finishes exactly once with tied team standings and remaining player IDs", () => {
		const r = makeRoom();
		r.ready();
		r.start();
		r.clock = 0;
		r.step(0.1);
		r.host.sim.state.terminal = "won";
		r.host.sim.state.phase = "won";
		r.step(0.2);
		r.host.finish(true);
		r.networks.get(1).finish(true);
		assert.equal(r.hubs.get(0).finishCount, 1);
		assert.equal(r.hubs.get(1).finishCount, 0);
		assert.deepEqual(r.hubs.get(0).finishes[0].standings, [[0, 1]]);
		assert.equal(r.hubs.get(0).finishes[0].won, true);
	});
	test("Time-up reports a team loss within grace and permanently suppresses new input", () => {
		const r = makeRoom();
		r.ready();
		r.start();
		r.clock = 0;
		r.step(0.1);
		for (const hub of r.hubs.values()) hub.emit("time-up", { graceMs: 3000 });
		const sent = r.hubs.get(1).sent.length;
		r.step(1, { 1: { dir: 1, bomb: true } });
		assert.equal(r.hubs.get(0).finishCount, 1);
		assert.equal(r.hubs.get(0).finishes[0].won, false);
		assert.equal(r.hubs.get(1).sent.length, sent);
	});
	test("End stops simulation, prediction, input and all outgoing traffic; no host migration", () => {
		const r = makeRoom();
		r.ready();
		r.start();
		r.clock = 0;
		r.step(0.2);
		for (const hub of r.hubs.values()) hub.emit("end", { reason: "host-left" });
		const sent = [...r.hubs.values()].map((h) => h.sent.length);
		const tick = r.host.sim.state.tick;
		r.step(1, { 0: { dir: 1, bomb: true }, 1: { dir: 2, bomb: true } });
		assert.deepEqual(
			[...r.hubs.values()].map((h) => h.sent.length),
			sent,
		);
		assert.equal(r.host.sim.state.tick, tick);
		assert.ok([...r.networks.values()].every((n) => n.ended && !n.playing));
	});
	test("Sent packet sizes and copy send rates satisfy native Hub limits", () => {
		const r = makeRoom({ dedicated: true });
		r.ready();
		r.start();
		r.clock = 0;
		r.step(2, { 0: { dir: 1 }, 1: { dir: 2 } });
		for (const n of r.networks.values()) {
			assert.ok(n.metrics.largestBytes < 16384);
			assert.ok(n.metrics.sent <= 42);
		}
	});
	return { count, failures };
}

if (
	process.argv[1] &&
	pathToFileURL(fileURLToPath(new URL(`file://${process.argv[1]}`))).href ===
		import.meta.url
) {
	const result = await runNetworkTests();
	for (const failure of result.failures) console.error(failure);
	console.log(
		`${result.count - result.failures.length}/${result.count} network checks passed`,
	);
	if (result.failures.length) process.exitCode = 1;
}
