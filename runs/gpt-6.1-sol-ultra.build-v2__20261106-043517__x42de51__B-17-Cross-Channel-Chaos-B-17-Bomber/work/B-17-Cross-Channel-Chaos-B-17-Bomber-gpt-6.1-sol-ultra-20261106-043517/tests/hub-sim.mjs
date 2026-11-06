import assert from "node:assert/strict";
import { HubAdapter, hubCheckpoint, hubLive } from "../src/online.js";
import { BomberSim } from "../src/sim.js";

let pass = 0;
const failures = [];
function test(name, fn) {
	try {
		fn();
		pass++;
	} catch (e) {
		failures.push(`${name}: ${e.message}`);
	}
}
const packetQueue = [];
const hubs = [];
function hub(me, isHost = false, server = false) {
	const listeners = new Map();
	const h = {
		me,
		host: server ? -1 : 0,
		isHost,
		server,
		players: [
			{ id: 0, name: "Pilot" },
			{ id: 1, name: "Bombardier" },
		],
		seed: 1942,
		clock: 0,
		sent: [],
		finishCount: 0,
		time() {
			return this.clock;
		},
		connect: async () => h,
		ready() {},
		rng: () => () => 0.42,
		on(event, fn) {
			const a = listeners.get(event) || [];
			a.push(fn);
			listeners.set(event, a);
			return () => {};
		},
		emit(event, ...args) {
			for (const fn of listeners.get(event) || []) fn(...args);
		},
		send(data, options) {
			this.sent.push({ data, options });
			for (const other of hubs)
				if (
					other !== h &&
					(options.to === undefined || other.me === options.to)
				)
					packetQueue.push(() => other.emit("message", data, h.me));
			return true;
		},
		finish(result) {
			this.finishCount++;
			this.result = result;
		},
	};
	hubs.push(h);
	return h;
}
const flush = () => {
	for (const fn of packetQueue.splice(0)) fn();
};
const sim = new BomberSim({ players: [1, 2] }),
	guestSim = new BomberSim({ players: [1, 2] });
const hostHub = hub(0, true),
	guestHub = hub(1);
const host = new HubAdapter({ sim, hub: hostHub }),
	guest = new HubAdapter({ sim: guestSim, hub: guestHub });
await host.connect();
await guest.connect();
host.ready();
guest.ready();
sim.dev("jump", "bomb");
guest.command({ type: "station", station: "bombs" });
guest.update(0.2);
flush();
host.update(0.2);
flush();
test("actual simulation grants guest bombardier ownership", () =>
	assert.equal(sim.state.owners.bombs, 2));
guest.command({ type: "release", salvo: 2 });
guest.update(0.2);
flush();
const inventory = sim.state.bombsLeft;
host.update(0.2);
flush();
test("actual release reaches shared world once", () => {
	assert.equal(inventory, 6);
	assert.equal(sim.state.bombs.length, 2);
	assert.equal(guestSim.state.bombsLeft, 6);
});
const repeated = guestHub.sent.at(-1).data;
hostHub.emit("message", repeated, 1);
test("actual release retry cannot consume twice", () =>
	assert.equal(sim.state.bombsLeft, inventory));
for (const b of ["nose", "port", "tail"]) sim.spawnFighter(b);
sim.spawnFlak();
for (const enemy of sim.state.enemies) enemy.t = 10;
for (let i = 0; i < 12; i++) sim.step(1 / 120);
test("busy live packet stays under one datagram including envelope", () =>
	assert.ok(
		JSON.stringify({ t: "l", n: 99999, s: hubLive(sim.snapshot()) }).length <=
			1200,
	));
test("busy checkpoint stays under Hub maximum", () =>
	assert.ok(
		JSON.stringify({ t: "s", n: 99999, s: hubCheckpoint(sim.snapshot()) })
			.length < 16000,
	));
host.update(1);
flush();
test("guest snapshot retains required UI/render arrays", () => {
	for (const key of [
		"players",
		"targets",
		"enemies",
		"bombs",
		"flak",
		"shots",
		"effects",
		"events",
	])
		assert.ok(Array.isArray(guestSim.state[key]), key);
	assert.equal(guestSim.state.version, 1);
	assert.equal(guestSim.state.mounts.nose.ammo, sim.state.mounts.nose.ammo);
});
guest.command({ type: "station", station: "pilot", handover: true });
guest.update(0.2);
flush();
test("remote handover explicitly transfers command permission", () =>
	assert.equal(sim.state.commandOwner, 2));
sim.applySystem("fire");
guest.command({ type: "extinguish" });
guest.update(0.2);
flush();
test("remote emergency extinguisher works atomically", () => {
	assert.equal(sim.state.aircraft.fire, 0);
	assert.equal(sim.state.aircraft.extinguishers, 0);
});
guest.command({ type: "jettison", held: 1.6 });
guest.update(0.2);
flush();
test("remote deliberate jettison preserves hold confirmation", () =>
	assert.equal(sim.state.bombsLeft, 0));
hostHub.emit("leave", { id: 1, reason: "disconnected" });
test("departed commanding pilot duties return to AI and survivor", () => {
	assert.equal(sim.state.owners.pilot, "AI");
	assert.equal(sim.state.commandOwner, 1);
});
hostHub.emit("time-up", {});
hostHub.emit("time-up", {});
test("actual terminal partial reports once", () => {
	assert.equal(hostHub.finishCount, 1);
	assert.deepEqual(hostHub.result.standings, [[0]]);
	assert.equal(hostHub.result.won, false);
});
for (const message of failures) console.error(`FAIL Hub sim ${message}`);
console.log(
	`${pass} Hub simulation checks passed; ${failures.length} failures`,
);
if (failures.length) process.exitCode = 1;
