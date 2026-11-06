import assert from "node:assert/strict";
import fs from "node:fs/promises";

const code = await fs.readFile(
	new URL("../src/online.js", import.meta.url),
	"utf8",
);
const { HubAdapter, hubLive, applyHubLive, hubCheckpoint, cleanHubCommand } =
	await import(
		`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
	);
let checks = 0;
const failures = [];
function test(name, fn) {
	try {
		fn();
		checks++;
	} catch (e) {
		failures.push(`${name}: ${e.message}`);
	}
}
function sim() {
	const self = {
		state: {
			t: 0,
			tick: 0,
			phase: "outbound",
			aircraft: {
				x: 0,
				y: 0,
				z: 14400,
				yaw: 0,
				pitch: 0,
				bank: 0,
				speed: 1120,
				throttle: 0.8,
				fuel: 100,
				maxFuel: 100,
				hull: 100,
				engines: [1, 1, 1, 1],
				bombs: 8,
				ammo: [300, 300, 300, 300],
				gear: 0,
			},
			players: [
				{ id: 1, station: "pilot", aim: { yaw: 0, pitch: 0 }, look: [0, 0] },
				{ id: 2, station: "nose", aim: { yaw: 0, pitch: 0 }, look: [0, 0] },
			],
			enemies: [],
			bombs: [],
			flak: [],
			effects: [],
			shots: [],
			score: 0,
			owners: { pilot: 1, nose: 2 },
			route: { x: 340000, y: 18000, label: "harbor" },
			caption: { role: "NAVIGATOR", text: "Stay on course." },
			prediction: { x: 123, y: 456, z: 0, time: 12 },
		},
		seen: new Set(),
		commands: [],
		departed: [],
		reset(opts) {
			this.opts = opts;
		},
		snapshot() {
			return structuredClone(this.state);
		},
		loadSnapshot(s) {
			this.state = structuredClone(s);
		},
		command(id, c) {
			this.commands.push({ id, c });
			if (c.actionId && this.seen.has(c.actionId)) return false;
			if (c.actionId) this.seen.add(c.actionId);
			if (c.type === "controls") {
				this.state.aircraft.bank = c.bank;
				return true;
			}
			if (c.type === "release") {
				this.state.aircraft.bombs -= c.salvo;
				return true;
			}
			if (c.type === "station") {
				this.state.players.find((p) => p.id === id).station = c.station;
				return true;
			}
			return true;
		},
		depart(id) {
			this.departed.push(id);
			this.state.players = this.state.players.filter((p) => p.id !== id);
		},
		result(reason) {
			this.state.phase = "debrief";
			this.state.result = {
				outcome: "partial",
				score: 42,
				stats: { Reason: reason },
			};
		},
	};
	return self;
}
const network = [];
const hubs = [];
function mock(me, isHost = false, server = false) {
	const handlers = new Map();
	const hub = {
		me,
		host: server ? -1 : 0,
		isHost,
		server,
		active: true,
		players: [
			{ id: 0, name: "Pilot" },
			{ id: 1, name: "Gunner" },
		],
		seed: 123,
		clock: -Infinity,
		readyCount: 0,
		finishCount: 0,
		packets: [],
		connect: async () => hub,
		rng: () => () => 0.123,
		time: () => hub.clock,
		ready() {
			this.readyCount++;
		},
		on(event, fn) {
			const set = handlers.get(event) || new Set();
			set.add(fn);
			handlers.set(event, set);
			return () => set.delete(fn);
		},
		emit(event, ...args) {
			for (const fn of handlers.get(event) || []) fn(...args);
		},
		send(data, o) {
			this.packets.push({ data, o });
			for (const other of hubs)
				if (other !== this && (o.to === undefined || other.me === o.to))
					network.push(() => other.emit("message", data, this.me));
			return true;
		},
		finish(result) {
			this.finishCount++;
			this.result = result;
		},
	};
	hubs.push(hub);
	return hub;
}
function flush() {
	for (const work of network.splice(0)) work();
}
const hs = sim(),
	gs = sim(),
	hh = mock(0, true),
	gh = mock(1, false);
let stopped = 0;
const host = new HubAdapter({ sim: hs, hub: hh, stopSound: () => stopped++ });
const guest = new HubAdapter({ sim: gs, hub: gh });
await host.connect();
await guest.connect();
host.ready();
guest.ready();
test("ready needs no input", () =>
	assert.equal(hh.readyCount + gh.readyCount, 2));
test("seats come from player list", () => assert.equal(guest.localId, 2));
test("no simulation/input before Hub clock", () =>
	assert.equal(host.command({ type: "release", salvo: 1 }), false));
hh.clock = gh.clock = 0;
host.command({ type: "controls", bank: 0.4 });
guest.command({ type: "controls", bank: -0.3 });
guest.command({ type: "release", salvo: 2 });
guest.update(0.2);
flush();
host.update(0.2);
flush();
test("host owns shared command stream", () =>
	assert.equal(hs.state.aircraft.bank, -0.3));
test("accepted guest release debits once", () =>
	assert.equal(hs.state.aircraft.bombs, 6));
const input = gh.packets.at(-1).data;
hh.emit("message", input, 1);
test("retried release is idempotent", () =>
	assert.equal(hs.state.aircraft.bombs, 6));
test("guest converges to authoritative snapshot", () =>
	assert.deepEqual(gs.state.aircraft, hs.state.aircraft));
test("unknown sender rejected", () => {
	const count = hs.commands.length;
	hh.emit("message", { ...input, n: 99 }, 99);
	assert.equal(hs.commands.length, count);
});
test("malformed/bounds inputs sanitized", () => {
	assert.equal(cleanHubCommand({ type: "station", station: "teleport" }), null);
	assert.equal(
		cleanHubCommand({ type: "controls", bank: 99, pitch: NaN }).bank,
		1,
	);
});
test("ordinary live state fits one datagram", () =>
	assert.ok(JSON.stringify(hubLive(hs.snapshot())).length < 1200));
test("checkpoint excludes internal history", () => {
	const a = hs.snapshot();
	a.events = new Array(1000).fill({ giant: "history" });
	assert.ok(hubCheckpoint(a).events.length <= 8);
});
test("live codec preserves actor pose", () => {
	hs.state.tick = 123;
	hs.state.aircraft.x = 789;
	const next = applyHubLive(gs.snapshot(), hubLive(hs.snapshot()));
	assert.equal(next.aircraft.x, 789);
	assert.equal(next.tick, 123);
});
hh.emit("leave", { id: 1, reason: "disconnected" });
test("departure returns duties to simulation AI", () =>
	assert.deepEqual(hs.departed, [2]));
hh.emit("time-up", { graceMs: 2000 });
hh.emit("time-up", { graceMs: 2000 });
test("time-up reports exactly once", () => assert.equal(hh.finishCount, 1));
test("finish lists every present teammate once", () =>
	assert.deepEqual(hh.result.standings, [[0]]));
hh.emit("end", { reason: "finished" });
const count = hh.packets.length;
host.command({ type: "release", salvo: 1 });
host.update(1);
test("end stops sends and audio", () => {
	assert.equal(hh.packets.length, count);
	assert.ok(stopped > 0);
});
const ss = sim(),
	sh = mock(-1, true, true);
sh.clock = 0;
const server = new HubAdapter({ sim: ss, hub: sh });
await server.connect();
server.ready();
server.update(0.2);
test("playerless server has no local command seat", () => {
	assert.equal(server.localId, null);
	assert.equal(server.command({ type: "release", salvo: 1 }), false);
	assert.ok(sh.packets.length > 0);
});
for (const f of failures) console.error(`FAIL Hub ${f}`);
console.log(`${checks} Hub checks passed; ${failures.length} failures`);
if (failures.length) process.exitCode = 1;
