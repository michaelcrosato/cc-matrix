import assert from "node:assert/strict";
import {
	Kitchen,
	autopilot,
	BAYS,
	TOPPINGS,
	fits,
	missing,
	DEFAULTS,
} from "./core.js";
let passed = 0,
	failed = 0;
function test(name, fn) {
	try {
		fn();
		passed++;
	} catch (e) {
		failed++;
		console.log(`FAIL core/${name}: ${e.message}`);
	}
}
const fresh = (mode = "solo") => {
	const g = new Kitchen();
	g.start(mode);
	return g;
};
const advance = (g, seconds, input = () => []) => {
	for (let t = 0; t < seconds; t += 1 / 60) g.update(1 / 60, input(g));
};
function catchType(g, type) {
	const p = g.players[0];
	g.food = [];
	p.actionCd = 0;
	g.spawn(
		TOPPINGS.findIndex((t) => t.id === type),
		p.x,
	);
	g.food[0].z = p.z;
	return g.action(p);
}
test("recipe multiplicity and any-order assembly", () => {
	assert(fits(["T", "C", "C"], ["C", "C", "T"], true));
	assert(!fits(["C"], ["C", "C"], true));
	assert(!fits(["C", "C"], ["C", "L"]));
	assert.deepEqual(missing(["T", "C"], ["C", "C", "L", "T"]), ["C", "L"]);
});
test("catch requires proximity", () => {
	const g = fresh();
	g.food = [];
	const p = g.players[0];
	g.spawn(0, -6);
	assert(!g.action(p));
	assert.equal(p.plate.length, 0);
});
test("catch accepts valid topping and rejects an incompatible extra", () => {
	const g = fresh();
	const p = g.players[0];
	assert(catchType(g, "C"));
	assert.deepEqual(p.plate, ["C"]);
	assert(!catchType(g, "C"));
	assert.deepEqual(p.plate, ["C"]);
	assert.equal(g.stats.wrong, 1);
	assert(g.pressure > 0);
});
test("wrong counter retains burger; matching counter pays and clears it", () => {
	const g = fresh();
	const p = g.players[0];
	p.plate = ["L", "C"];
	p.x = BAYS[1].x;
	p.z = 3.6;
	g.action(p);
	assert.equal(g.stats.served, 0);
	assert.deepEqual(p.plate, ["L", "C"]);
	p.actionCd = 0;
	p.x = BAYS[0].x;
	assert(g.action(p));
	assert.equal(g.stats.served, 1);
	assert.equal(p.plate.length, 0);
	assert(g.score >= 200);
	assert(g.tickets[0].cooldown > 0);
});
test("ticket timeout penalizes and replaces only that ticket", () => {
	const g = fresh();
	const id = g.tickets[0].id,
		other = g.tickets[1].id;
	g.tickets[0].patience = 0.02;
	advance(g, 0.04);
	assert.notEqual(g.tickets[0].id, id);
	assert.equal(g.tickets[1].id, other);
	assert.equal(g.pressure, 13);
});
test("belt waste raises pressure and removes food", () => {
	const g = fresh();
	g.food = [];
	const f = g.spawn(0, 6.49);
	advance(g, 0.05);
	assert(!g.food.some((a) => a.id === f.id));
	assert.equal(g.stats.wasted, 1);
	assert(g.pressure > 0);
});
test("bell consumes charge, slows belts, and cannot be spammed", () => {
	const a = fresh(),
		b = fresh();
	a.food = [{ id: 900, type: "C", lane: 0, x: 0, z: -2.5 }];
	b.food = structuredClone(a.food);
	assert(a.ring());
	assert(!a.ring());
	advance(a, 1);
	advance(b, 1);
	assert(a.food[0].x < b.food[0].x * 0.4);
	assert.equal(a.stats.bells, 1);
});
test("dash cooldown and speed burst", () => {
	const g = fresh();
	const p = g.players[0];
	assert(g.dash(p));
	assert(!g.dash(p));
	const before = p.x;
	advance(g, 0.15, () => [{ x: 1 }]);
	assert(p.x - before > DEFAULTS.moveSpeed * 0.15 * 2);
	assert.equal(g.stats.dashes, 1);
});
test("heat warning, active hit, and dash immunity", () => {
	const g = fresh();
	g.stage = 2;
	g.clock = 7;
	assert(g.heat().warning);
	g.clock = 9.2;
	const p = g.players[0];
	p.x = 0;
	p.z = TOPPINGS[0].lane;
	advance(g, 0.05);
	assert.equal(g.stats.hits, 1);
	assert(p.stun > 0);
	const b = fresh();
	b.stage = 2;
	b.clock = 9.2;
	b.players[0].x = 0;
	b.players[0].z = -2.5;
	b.dash(b.players[0]);
	advance(b, 0.05);
	assert.equal(b.stats.hits, 0);
});
test("100 percent pressure closes kitchen", () => {
	const g = fresh();
	g.pressure = 99;
	g.addPressure(2);
	advance(g, 0.02);
	assert.equal(g.phase, "result");
	assert.equal(g.won, false);
});
test("closing timer ends shift", () => {
	const g = fresh();
	g.remaining = 0.01;
	advance(g, 0.03);
	assert.equal(g.phase, "result");
	assert.equal(g.won, false);
});
test("practice has no failure and no clock limit", () => {
	const g = fresh("practice");
	g.remaining = 0.01;
	g.addPressure(999);
	advance(g, 15);
	assert.equal(g.phase, "playing");
	assert(g.pressure <= 85);
	assert.equal(g.remaining, 0.01);
});
test("co-op keeps separate burgers and shared tips", () => {
	const g = fresh("coop");
	assert.equal(g.players.length, 2);
	const p = g.players[0],
		q = g.players[1];
	p.plate = ["C", "L"];
	q.plate = ["T"];
	p.x = -4.3;
	p.z = 3.6;
	g.action(p);
	assert.equal(g.stats.served, 1);
	assert.deepEqual(q.plate, ["T"]);
	assert(g.score > 0);
});
test("discard recovers from a partial burger", () => {
	const g = fresh();
	g.players[0].plate = ["C"];
	g.combo = 3;
	g.discard(g.players[0]);
	assert.equal(g.players[0].plate.length, 0);
	assert.equal(g.combo, 0);
	assert.equal(g.pressure, 4);
});
test("full campaign through every mechanic", () => {
	const g = fresh();
	const stages = new Set();
	for (let i = 0; i < 60 * 330 && g.phase !== "result"; i++) {
		stages.add(g.stage);
		g.update(
			1 / 60,
			g.players.map((p) => autopilot(g, p)),
		);
	}
	assert.equal(g.phase, "result");
	assert(g.won);
	assert.equal(g.stats.served, 12);
	assert.equal(stages.size, 3);
	assert(g.stats.caught >= 30);
	assert(g.stats.bells > 0);
	assert(g.stats.dashes > 0);
	assert(g.stats.hits > 0);
	assert(g.bestCombo > 1);
});
test("attract replay reaches every rush and an ending", () => {
	const g = fresh("attract");
	for (let i = 0; i < 60 * 330 && g.phase !== "result"; i++)
		g.update(
			1 / 60,
			g.players.map((p) => autopilot(g, p)),
		);
	assert.equal(g.stage, 2);
	assert.equal(g.phase, "result");
	assert(g.won);
	assert.equal(g.stats.served, 6);
});
test("seeded campaign replay is deterministic", () => {
	function run() {
		const g = fresh();
		advance(g, 10, (k) => k.players.map((p) => autopilot(k, p)));
		return g.snapshot();
	}
	assert.deepEqual(run(), run());
});
console.log(JSON.stringify({ passed, failed }));
process.exitCode = failed ? 1 : 0;
