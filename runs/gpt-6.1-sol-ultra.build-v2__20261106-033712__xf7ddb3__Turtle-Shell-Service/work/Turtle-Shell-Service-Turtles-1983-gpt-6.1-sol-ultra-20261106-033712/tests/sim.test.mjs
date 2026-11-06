import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
require("../vendor/engine/my-3d2dge.js");
for (const f of ["content", "sim", "bot"]) require("../src/" + f + ".js");
const T = globalThis.TSS,
	E = globalThis.My3D2dge,
	DT = 1 / 120;
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
function play(o = {}) {
	const sim = new T.Simulation(o);
	sim.state.phase = "play";
	sim.state.players.forEach((p) => (p.invulnerable = 0));
	return sim;
}
function steps(sim, n, intent = {}) {
	for (let i = 0; i < n; i++)
		sim.step(DT, typeof intent === "function" ? intent(i) : intent);
}
function place(e, c) {
	const p = T.center(c);
	Object.assign(e, p);
	e.mover.place(...c);
	e.buffer = -1;
	e.bufferTimer = 0;
}
function clearThreats(sim) {
	sim.state.enemies = [];
}
function pickup(sim, index = 0, seat = 1) {
	const p = sim.state.players.find((p) => p.seat === seat),
		r = sim.state.rooms[index];
	place(p, r.cell);
	sim.step(DT);
	return { p, r, h: sim.state.homes.find((h) => h.id === p.home) };
}
function deliver(sim, p) {
	const h = sim.state.homes.find((h) => h.id === p.home);
	place(p, h.cell);
	sim.step(DT);
}

test("all five floors validate connectivity, content and cooperative home reachability", () => {
	T.validateContent();
	assert.equal(T.FLOORS.length, 5);
	assert.equal(
		T.FLOORS.reduce((a, f) => a + f.quota, 0),
		26,
	);
	assert.ok(new Set(T.FLOORS.map((f) => f.rows.join("\n"))).size >= 4);
});
test("content validator rejects a disconnected required room", () => {
	const f = T.FLOORS[0],
		rows = f.rows.map((r) => r.split(""));
	rows[3][3] = ".";
	assert.throws(
		() => T.validateFloor({ ...f, rows: rows.map((r) => r.join("")) }),
		/disconnected/,
	);
});
test("content validator rejects an impossible rescue quota", () =>
	assert.throws(() => T.validateFloor({ ...T.FLOORS[0], quota: 99 }), /quota/));
test("content validator rejects overlapping initial enemy/objective spawns", () =>
	assert.throws(
		() =>
			T.validateFloor({
				...T.FLOORS[0],
				beetles: [{ cell: T.FLOORS[0].rooms[1], age: 0 }],
			}),
		/spawn conflicts/,
	));
test("first instructional room is always a baby and seeded decks stay stable", () => {
	for (const seed of [1, 47, 99]) {
		const a = play({ seed, floor: 3 }),
			b = play({ seed, floor: 3 });
		assert.equal(a.state.rooms[0].outcome, "baby");
		assert.deepEqual(
			a.state.rooms.map((r) => r.outcome),
			b.state.rooms.map((r) => r.outcome),
		);
		assert.equal(a.state.rooms.filter((r) => r.outcome === "baby").length, 6);
	}
});
test("snapshot restoration preserves random streams and room contents exactly", () => {
	const a = play({ floor: 3 });
	steps(a, 400);
	const b = new T.Simulation();
	b.loadSnapshot(a.snapshot());
	steps(a, 500);
	steps(b, 500);
	assert.deepEqual(b.snapshot(), a.snapshot());
});
test("fixed-step native engine advances the simulation and scene transition", () => {
	const sim = new T.Simulation(),
		game = new E.Game({ headless: true });
	game.start({
		update: (dt) => sim.step(dt, { 1: { confirm: true, dir: 3 } }),
		draw() {},
	});
	game.advance(1);
	assert.equal(sim.state.phase, "play");
	assert.ok(sim.state.players[0].x < 312);
	assert.deepEqual(game.errors, []);
	game.dispose();
});
test("native graph travel stays inside maze walls and cannot take diagonal shortcuts", () => {
	const s = play();
	clearThreats(s);
	const p = s.state.players[0];
	place(p, [1, 1]);
	steps(s, 120, { 1: { dir: 0 } });
	assert.equal(p.y, 24);
	assert.equal(p.x, 24);
	steps(s, 120, { 1: { dir: 1 } });
	assert.equal(p.y, 24);
	assert.ok(s.grid.walk(T.cell(p)));
});
test("movement reverses immediately in the middle of an edge", () => {
	const s = play();
	clearThreats(s);
	const p = s.state.players[0];
	place(p, [5, 1]);
	steps(s, 12, { 1: { dir: 1 } });
	const x = p.x;
	s.step(DT, { 1: { dir: 3 } });
	assert.ok(p.x < x);
	assert.equal(p.dir, 3);
});
test("releasing straight movement stops at the next cell centre", () => {
	const s = play();
	clearThreats(s);
	const p = s.state.players[0];
	place(p, [5, 1]);
	steps(s, 12, { 1: { dir: 1 } });
	steps(s, 100);
	assert.equal(p.x, 104);
	assert.equal(p.y, 24);
});
test("buffered perpendicular turn is taken on the next reachable junction", () => {
	const s = play();
	clearThreats(s);
	const p = s.state.players[0];
	place(p, [4, 1]);
	steps(s, 20, { 1: { dir: 1 } });
	steps(s, 35, { 1: { dir: 2 } });
	assert.ok(p.y > 24);
	assert.equal(p.x, 88);
});
test("carrying applies the documented speed multiplier", () => {
	const a = play(),
		b = play();
	clearThreats(a);
	clearThreats(b);
	const p = a.state.players[0],
		q = b.state.players[0];
	place(p, [5, 1]);
	place(q, [5, 1]);
	q.carry = "fixture";
	steps(a, 60, { 1: { dir: 1 } });
	steps(b, 60, { 1: { dir: 1 } });
	assert.ok(Math.abs((q.x - 88) / (p.x - 88) - 0.9) < 0.01);
});
test("presentation prediction uses the identical graph collision movement", () => {
	const s = play();
	clearThreats(s);
	const p = s.state.players[0],
		q = JSON.parse(JSON.stringify(p));
	for (let i = 0; i < 40; i++) {
		const intent = { dir: 3 };
		s.predictPlayer(q, intent, DT);
		s.step(DT, { 1: intent });
	}
	assert.equal(q.x, p.x);
	assert.equal(q.y, p.y);
});
test("swept contacts catch two actors crossing between endpoints", () =>
	assert.equal(
		T.sweptDistance(
			{ x: 0, y: 0 },
			{ x: 20, y: 0 },
			{ x: 20, y: 0 },
			{ x: 0, y: 0 },
		),
		0,
	));
test("discovery reserves a reachable distant sanctuary and awards 100 once", () => {
	const s = play();
	clearThreats(s);
	const { p, r, h } = pickup(s);
	assert.equal(p.carry, r.id);
	assert.equal(h.reservedBy, 1);
	assert.ok(s.path(r, h).length > 1);
	assert.equal(s.state.score, 100);
	assert.equal(r.symbol, h.symbol);
});
test("a carried passenger prevents opening another mystery room", () => {
	const s = play();
	clearThreats(s);
	const { p } = pickup(s);
	const carry = p.carry,
		other = s.state.rooms[1];
	place(p, other.cell);
	s.step(DT);
	assert.equal(p.carry, carry);
	assert.equal(other.revealed, false);
});
test("cooperative passengers reserve distinct reachable homes", () => {
	const s = play({ seats: [1, 2] });
	clearThreats(s);
	pickup(s, 0, 1);
	pickup(s, 1, 2);
	const [p, q] = s.state.players;
	assert.notEqual(p.home, q.home);
	assert.equal(s.state.homes.filter((h) => h.reservedBy !== null).length, 2);
});
test("unavailable home reservation leaves a baby available and unconsumed", () => {
	const s = play();
	clearThreats(s);
	for (const h of s.state.homes) h.reservedBy = 2;
	const { p, r } = pickup(s);
	assert.equal(p.carry, null);
	assert.equal(r.revealed, false);
	assert.equal(s.state.score, 0);
	assert.ok(s.events.some((e) => e.kind === "reservation-failed"));
});
test("delivery resolves once and frees the reservation", () => {
	const s = play();
	clearThreats(s);
	const { p, r, h } = pickup(s);
	deliver(s, p);
	assert.equal(s.state.rescued, 1);
	assert.equal(s.state.score, 500);
	assert.equal(r.delivered, true);
	assert.equal(h.reservedBy, null);
	steps(s, 40);
	assert.equal(s.state.rescued, 1);
	assert.equal(s.state.score, 500);
});
test("a hit drops a revealed passenger at origin and does not duplicate discovery score", () => {
	const s = play();
	clearThreats(s);
	const { p, r, h } = pickup(s);
	s._hit(p, { id: "fixture" });
	assert.equal(p.carry, null);
	assert.equal(r.carrier, null);
	assert.equal(r.revealed, true);
	assert.equal(h.reservedBy, null);
	steps(s, 90);
	p.invulnerable = 0;
	place(p, r.cell);
	s.step(DT);
	assert.equal(p.carry, r.id);
	assert.equal(s.state.score, 100);
});
test("delivered progress survives subsequent hits", () => {
	const s = play();
	clearThreats(s);
	const { p, r } = pickup(s);
	deliver(s, p);
	s._hit(p, { id: "fixture" });
	assert.equal(r.delivered, true);
	assert.equal(s.state.rescued, 1);
	assert.equal(s.state.score, 500);
});
test("team grace prevents a simultaneous pile-up from exhausting lives", () => {
	const s = play({ seats: [1, 2] });
	s._hit(s.state.players[0], s.state.enemies[0]);
	s._hit(s.state.players[1], s.state.enemies[0]);
	assert.equal(s.state.lives, 2);
});
test("safe respawn avoids live threats and grants temporary invulnerability", () => {
	const s = play(),
		p = s.state.players[0];
	s._hit(p, s.state.enemies[0]);
	steps(s, 100);
	assert.ok(p.invulnerable > 0);
	assert.equal(p.hurt, 0);
	assert.ok(
		s.state.enemies.every((e) => Math.hypot(e.x - p.x, e.y - p.y) > 20),
	);
});
test("exactly the third team loss ends a normal run and freezes encounters", () => {
	const s = play(),
		p = s.state.players[0],
		e = s.state.enemies[0];
	for (let i = 0; i < 3; i++) {
		s.state.teamGrace = 0;
		p.invulnerable = 0;
		p.hurt = 0;
		s._hit(p, e);
	}
	assert.equal(s.state.lives, 0);
	assert.equal(s.state.phase, "lost");
	const n = s.state.score;
	steps(s, 100, { 1: { bomb: true, dir: 0 } });
	assert.equal(s.state.score, n);
	assert.equal(s.state.metrics.hits, 3);
});
test("retry creates a clean run with three lives and no transient passengers", () => {
	const s = play();
	pickup(s);
	s.dev("invulnerable", true);
	const clean = new T.Simulation();
	assert.equal(clean.state.lives, 3);
	assert.equal(clean.state.score, 0);
	assert.equal(clean.state.practice, false);
	assert.equal(clean.state.players[0].carry, null);
	assert.equal(clean.state.bomb, null);
});
test("one active team bomb and rising-edge action spend exactly one stock", () => {
	const s = play({ seats: [1, 2] });
	clearThreats(s);
	s.step(DT, { 1: { bomb: true }, 2: { bomb: true } });
	assert.equal(s.state.stock, 2);
	assert.equal(s.state.bomb.seat, 1);
	steps(s, 50, { 1: { bomb: true } });
	assert.equal(s.state.stock, 2);
	assert.equal(s.state.metrics.bombs, 1);
});
test("expired bomb frees the shared slot while a held button cannot retrigger", () => {
	const s = play();
	clearThreats(s);
	steps(s, 740, { 1: { bomb: true } });
	assert.equal(s.state.bomb, null);
	assert.equal(s.state.stock, 2);
	s.step(DT);
	s.step(DT, { 1: { bomb: true } });
	assert.equal(s.state.stock, 1);
	assert.ok(s.state.bomb);
});
test("empty stock feedback points to supply without consuming negative ammunition", () => {
	const s = play();
	clearThreats(s);
	s.state.stock = 0;
	s.step(DT, { 1: { bomb: true } });
	assert.equal(s.state.stock, 0);
	assert.equal(s.state.bomb, null);
	assert.ok(s.events.some((e) => e.kind === "empty"));
});
test("a beetle crossing the trap is stunned before same-tick contact can hurt", () => {
	const s = play(),
		p = s.state.players[0],
		e = s.state.enemies[0];
	place(p, [5, 5]);
	place(e, [5, 5]);
	s.step(DT, { 1: { bomb: true } });
	assert.equal(e.state, "stunned");
	assert.equal(s.state.lives, 3);
	assert.equal(s.state.bomb, null);
});
test("a localized bomb stun cannot pass through an intervening wall", () => {
	const s = play(),
		p = s.state.players[0],
		e = s.state.enemies[0];
	place(p, [5, 5]);
	place(e, [6, 3]);
	s._bomb(p);
	s.state.bomb.x = e.x;
	s.state.bomb.y = e.y;
	const other = s._enemy("other", [6, 5], 50);
	s.state.enemies.push(other);
	s.step(DT);
	assert.equal(e.state, "stunned");
	assert.notEqual(other.state, "stunned");
});
test("stun recovery resets a red tracker to blue and age zero", () => {
	const s = play(),
		e = s.state.enemies[0];
	e.age = 50;
	e.state = "red";
	s._stun(e);
	steps(s, 361);
	assert.equal(e.state, "blue");
	assert.ok(e.age < 0.02);
});
test("repeat stuns of the same beetle cannot farm points", () => {
	const s = play(),
		e = s.state.enemies[0];
	s._stun(e);
	const score = s.state.score;
	s._stun(e);
	assert.equal(s.state.score, score);
	assert.equal(score, 50);
});
test("central supply grants two stock and needs a fresh entry after recharge", () => {
	const s = play();
	clearThreats(s);
	const p = s.state.players[0];
	s.state.stock = 0;
	place(p, s.state.supply.cell);
	s.step(DT);
	assert.equal(s.state.stock, 2);
	steps(s, 800);
	assert.equal(s.state.stock, 2);
	assert.equal(s.state.supply.ready, true);
	place(p, [10, 8]);
	s.step(DT);
	place(p, s.state.supply.cell);
	s.step(DT);
	assert.equal(s.state.stock, 4);
	assert.equal(s.state.metrics.supplies, 2);
});
test("supply caps inventory at five and has only one accepted simultaneous pickup", () => {
	const s = play({ seats: [1, 2] });
	clearThreats(s);
	s.state.stock = 4;
	for (const p of s.state.players) place(p, s.state.supply.cell);
	s.step(DT);
	assert.equal(s.state.stock, 5);
	assert.equal(s.state.metrics.supplies, 1);
});
test("blue wanderer does not acquire a player target", () => {
	const s = play(),
		e = s.state.enemies[0],
		p = s.state.players[0];
	place(e, [5, 5]);
	place(p, [10, 5]);
	e.state = "blue";
	s._chooseEnemy(e);
	assert.equal(e.target, null);
});
test("yellow lookout acquires only an unobstructed straight corridor", () => {
	const s = play(),
		e = s.state.enemies[0],
		p = s.state.players[0];
	place(e, [5, 5]);
	place(p, [10, 5]);
	e.state = "yellow";
	assert.equal(s._chooseEnemy(e), 1);
	assert.equal(e.target, 1);
	e.target = null;
	e.lastSeen = null;
	place(p, [10, 7]);
	s._chooseEnemy(e);
	assert.equal(e.target, null);
});
test("red tracker follows the authoritative graph around corners", () => {
	const s = play(),
		e = s.state.enemies[0],
		p = s.state.players[0];
	place(e, [5, 5]);
	place(p, [10, 7]);
	e.state = "red";
	const d = s._chooseEnemy(e);
	assert.ok(d >= 0);
	assert.equal(e.target, 1);
	assert.equal(d, s._dirCells([5, 5], s.path(e, p)[1]));
});
test("trackers reconsider routes at junctions rather than skipping them in flight", () => {
	const s = play(),
		e = s.state.enemies[0],
		p = s.state.players[0];
	place(e, [5, 1]);
	place(p, [5, 5]);
	e.state = "red";
	e.age = 50;
	steps(s, 100);
	assert.ok(e.y > 24);
	assert.equal(e.x, 88);
});
test("enemy targeting uses seat order with distance hysteresis", () => {
	const s = play({ seats: [1, 2] }),
		e = s.state.enemies[0],
		[p, q] = s.state.players;
	place(e, [5, 5]);
	place(p, [3, 5]);
	place(q, [7, 5]);
	e.state = "red";
	e.target = 2;
	s._chooseEnemy(e);
	assert.equal(e.target, 2);
});
test("room beetles have an emergence grace period that prevents unavoidable reveal hits", () => {
	const s = play({ floor: 2 }),
		p = s.state.players[0];
	clearThreats(s);
	const r = s.state.rooms.find((r) => r.outcome === "beetle");
	place(p, r.cell);
	s.step(DT);
	assert.equal(s.state.enemies.length, 1);
	assert.ok(s.state.enemies[0].emerge > 1);
	assert.equal(s.state.lives, 3);
});
test("player leave returns a passenger and releases its sanctuary", () => {
	const s = play({ seats: [1, 2] });
	clearThreats(s);
	const { p, r, h } = pickup(s, 0, 2);
	s.removeSeat(2);
	assert.equal(p.active, false);
	assert.equal(p.carry, null);
	assert.equal(r.carrier, null);
	assert.equal(h.reservedBy, null);
	assert.deepEqual(s.state.seats, [1]);
});
test("cooperative same-tick final deliveries resolve once before a shared transition", () => {
	const s = play({ seats: [1, 2] });
	clearThreats(s);
	for (let i = 0; i < 2; i++) {
		const { p } = pickup(s, i, 1);
		deliver(s, p);
	}
	pickup(s, 2, 1);
	pickup(s, 3, 2);
	for (const p of s.state.players)
		place(p, s.state.homes.find((h) => h.id === p.home).cell);
	s.step(DT);
	assert.equal(s.state.rescued, 4);
	assert.equal(s.state.phase, "transition");
	assert.equal(s.state.totalRescued, 4);
	assert.equal(s.events.filter((e) => e.kind === "deliver").length, 2);
	assert.equal(s.events.filter((e) => e.kind === "clear").length, 1);
});
test("all passengers must be delivered and fresh floors have no leaked reservations", () => {
	const s = play();
	clearThreats(s);
	for (let i = 0; i < 3; i++) {
		const { p } = pickup(s, i);
		deliver(s, p);
	}
	const { p } = pickup(s, 3);
	assert.equal(s.state.phase, "play");
	deliver(s, p);
	s.step(DT, { 1: { confirm: true } });
	assert.equal(s.state.floor, 1);
	assert.equal(s.state.rescued, 0);
	assert.equal(s.state.totalRescued, 4);
	assert.equal(s.state.bomb, null);
	assert.ok(s.state.homes.every((h) => h.reservedBy === null));
	assert.ok(s.state.players.every((p) => !p.carry));
});
test("balance sliders update real movement and enforce escalation order", () => {
	const s = play();
	clearThreats(s);
	s.setBalance("playerSpeed", 5);
	assert.equal(s.state.balance.playerSpeed, 5);
	s.setBalance("yellowAge", 40);
	assert.ok(s.state.balance.redAge >= 42);
	s.setBalance("redAge", 20);
	assert.ok(s.state.balance.yellowAge <= 18);
	assert.equal(s.state.practice, true);
	const p = s.state.players[0];
	place(p, [5, 1]);
	steps(s, 60, { 1: { dir: 1 } });
	assert.ok(Math.abs(p.x - 128) < 0.1);
});
test("out-of-range live balance values cannot bypass cross-field constraints", () => {
	const s = play();
	s.setBalance("yellowAge", 1000);
	assert.equal(s.state.balance.yellowAge, 40);
	assert.ok(s.state.balance.redAge <= 75);
	s.setBalance("redAge", -500);
	assert.equal(s.state.balance.redAge, 20);
	assert.ok(s.state.balance.yellowAge >= 8);
});
test("repeated developer spawns have stable unique entity identifiers", () => {
	const s = play();
	s.dev("spawn");
	s.dev("spawn");
	assert.equal(
		new Set(s.state.enemies.map((e) => e.id)).size,
		s.state.enemies.length,
	);
});
test("balance reset preserves accessibility flags and the practice record separation", () => {
	const s = play({ assisted: true });
	s.setBalance("playerSpeed", 5);
	s.resetBalance();
	assert.deepEqual(s.state.balance, T.DEFAULT_BALANCE);
	assert.equal(s.state.assisted, true);
	assert.equal(s.state.practice, true);
});
test("developer controls are observable, bounded and unranked", () => {
	const s = play();
	s.dev("refill");
	assert.equal(s.state.stock, 5);
	s.dev("invulnerable");
	assert.equal(s.state.dev.invulnerable, true);
	s.dev("spawn");
	assert.equal(s.state.enemies.length, 2);
	s.dev("clear");
	assert.equal(s.state.enemies.length, 0);
	s.dev("timeScale", 99);
	assert.equal(s.state.dev.timeScale, 3);
	assert.equal(s.state.practice, true);
});
test("terminal snapshot restoration is stable and cannot score again", () => {
	const s = play();
	s.state.phase = "won";
	s.state.terminal = "won";
	const b = new T.Simulation();
	b.loadSnapshot(s.snapshot());
	steps(b, 50, { 1: { bomb: true, dir: 1 } });
	assert.equal(b.state.phase, "won");
	assert.equal(b.state.score, 0);
});
function campaign(seats) {
	const sim = new T.Simulation({ seed: 47, seats }),
		bot = new T.Bot(sim),
		game = new E.Game({ headless: true });
	game.start({ update: (dt) => sim.step(dt, bot.intents()), draw() {} });
	const floors = new Set(),
		types = new Set();
	for (let i = 0; i < 120 * 1000 && !sim.state.terminal; i++) {
		game.advance(DT);
		floors.add(sim.state.floor);
		for (const e of sim.events) types.add(e.kind);
	}
	assert.deepEqual(game.errors, []);
	game.dispose();
	assert.equal(
		sim.state.phase,
		"won",
		JSON.stringify({
			phase: sim.state.phase,
			floor: sim.state.floor,
			total: sim.state.totalRescued,
			metrics: sim.state.metrics,
		}),
	);
	assert.equal(sim.state.totalRescued, 26);
	assert.equal(floors.size, 5);
	assert.equal(sim.state.practice, false);
	assert.equal(sim.state.demo, false);
	assert.ok(sim.state.lives > 0 && sim.state.lives <= 3);
	for (const k of [
		"reveal",
		"pickup",
		"deliver",
		"bomb",
		"trigger",
		"stun",
		"recover",
		"supply",
		"detect",
		"escalate",
		"clear",
		"win",
	])
		assert.ok(types.has(k), "missing mechanic " + k);
	assert.ok(sim.state.metrics.redTicks > 0);
	assert.ok(sim.state.metrics.decoys > 0);
	return sim;
}
test("ordinary uncheated solo campaign plays all five floors through legal input", () => {
	const s = campaign([1]);
	assert.ok(s.state.metrics.hits > 0);
});
test("ordinary simultaneous cooperative campaign shares all objectives and resources", () => {
	const s = campaign([1, 2]);
	assert.equal(s.state.players.length, 2);
	assert.equal(s.state.metrics.discoveries, 26);
	assert.equal(s.state.metrics.deliveries, 26);
});
test("the same deterministic action trace produces byte-identical states", () => {
	const a = play(),
		b = play();
	for (let i = 0; i < 3000; i++) {
		const intents = { 1: { dir: Math.floor(i / 72) % 4, bomb: i % 250 === 0 } };
		a.step(DT, intents);
		b.step(DT, intents);
	}
	assert.deepEqual(a.snapshot(), b.snapshot());
});

export async function runSimulationTests() {
	let passed = 0;
	const failures = [];
	for (const { name, fn } of tests) {
		try {
			await fn();
			passed++;
		} catch (e) {
			failures.push(name + ": " + e.message);
		}
	}
	return { passed, failed: failures.length, failures, total: tests.length };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const r = await runSimulationTests();
	for (const f of r.failures) console.error(f);
	console.log(`${r.passed}/${r.total} simulation checks passed`);
	if (r.failed) process.exitCode = 1;
}
