import assert from "node:assert/strict";
import RAPIER from "@dimforge/rapier3d-compat";
import { createGame, COLORS, DEFAULTS } from "./game.js";

const originalWarn = console.warn;
console.warn = (...args) => {
	if (!String(args[0]).includes("deprecated parameters")) originalWarn(...args);
};
await RAPIER.init();
console.warn = originalWarn;
let passed = 0,
	failed = 0;
const issues = [];
function test(name, body) {
	const events = [];
	const game = createGame(RAPIER, (name, data) => events.push({ name, data }));
	game.start();
	try {
		body(game, events);
		passed++;
	} catch (error) {
		failed++;
		issues.push({ name, message: error.message });
		console.error(`FAIL ${name}: ${error.message}`);
	} finally {
		game.dispose();
	}
}
const burger = (overrides = {}) => ({
	id: 1000,
	slot: 0,
	x: -6,
	z: 0,
	ingredients: [],
	required: ["tomato"],
	color: COLORS[0],
	ready: false,
	needsBun: false,
	...overrides,
});
const putAtBelt = (g, b = burger()) => {
	g.state.burgers = [b];
	const p = g.state.players[0];
	p.x = -4.65;
	p.z = b.z;
	p.actionCooldown = 0;
	return p;
};
const step = (g, input = {}, n = 1) => {
	for (let i = 0; i < n; i++) g.step(1 / 30, { 0: input });
};

test("initial state and real Rapier bodies", (g) => {
	assert.equal(g.state.mode, "play");
	assert.equal(g.state.burgers.length, 3);
	assert.equal(g.physics.version, "0.19.3");
	assert.equal(g.physics.bodies, 1);
	assert.equal(g.state.performance, 60);
	assert.deepEqual(
		g.state.burgers.map((b) => b.slot),
		[0, 1, 2],
	);
	assert(g.state.burgers.every((b) => b.required.length === 1));
});
test("catch flying topping on contact", (g, events) => {
	const p = g.state.players[0];
	g.state.ingredients = [{ id: 900, x: p.x + 0.3, z: p.z, type: "tomato" }];
	step(g);
	assert.equal(p.held, "tomato");
	assert.equal(g.state.stats.caught, 1);
	assert.equal(g.state.ingredients.length, 0);
	assert(events.some((e) => e.name === "catch"));
});
test("reject flying topping without penalty", (g, events) => {
	const p = g.state.players[0];
	g.state.ingredients = [{ id: 900, x: p.x + 0.3, z: p.z, type: "cheese" }];
	const perf = g.state.performance;
	step(g, { reject: true });
	assert.equal(p.held, null);
	assert.equal(g.state.stats.rejected, 1);
	assert.equal(g.state.performance, perf);
	assert(events.some((e) => e.name === "reject"));
});
test("discard held topping without penalty", (g) => {
	const p = g.state.players[0];
	p.held = "onion";
	const perf = g.state.performance;
	g.reject(p);
	assert.equal(p.held, null);
	assert.equal(g.state.stats.rejected, 1);
	assert.equal(g.state.performance, perf);
});
test("correct topping completes recipe and requests bun", (g) => {
	const b = burger();
	const p = putAtBelt(g, b);
	p.held = "tomato";
	step(g, { action: true });
	assert.deepEqual(b.ingredients, ["tomato"]);
	assert.equal(b.needsBun, true);
	assert.equal(p.held, null);
	assert.equal(g.state.stats.added, 1);
});
test("wrong and duplicate toppings cost performance", (g) => {
	const b = burger({ ingredients: ["tomato"], required: ["tomato", "cheese"] });
	const p = putAtBelt(g, b);
	p.held = "tomato";
	g.interact(p);
	assert.equal(g.state.performance, 58);
	assert.equal(g.state.stats.wrong, 1);
	p.actionCooldown = 0;
	p.held = "onion";
	g.interact(p);
	assert.equal(g.state.performance, 56);
	assert.equal(b.ingredients.length, 1);
});
test("bun caps burger and empty hands pick it up", (g) => {
	const b = burger({ ingredients: ["tomato"], needsBun: true });
	const p = putAtBelt(g, b);
	p.held = "bun";
	g.interact(p);
	assert.equal(b.ready, true);
	assert.equal(b.needsBun, false);
	assert.equal(g.state.stats.buns, 1);
	p.actionCooldown = 0;
	g.interact(p);
	assert.equal(p.carrying.id, b.id);
	assert.equal(g.state.burgers.length, 0);
	assert.equal(p.held, null);
});
test("bun before toppings is rejected as a mistake", (g) => {
	const p = putAtBelt(g);
	p.held = "bun";
	g.interact(p);
	assert.equal(g.state.performance, 58);
	assert.equal(g.state.burgers[0].ready, false);
});
test("wrong chute keeps burger and correct chute serves", (g) => {
	const p = g.state.players[0];
	p.carrying = burger({ slot: 1, ready: true });
	p.x = -3;
	p.z = 4.1;
	g.interact(p);
	assert(p.carrying);
	assert.equal(g.state.performance, 55);
	p.actionCooldown = 0;
	p.x = 0;
	g.interact(p);
	assert.equal(p.carrying, null);
	assert.equal(g.state.served, 1);
	assert.equal(g.state.combo, 1);
	assert.equal(g.state.performance, 59);
	assert(g.state.score >= 125);
});
test("three completed shifts lead to victory", (g) => {
	const p = g.state.players[0];
	for (let shift = 1; shift <= 3; shift++) {
		assert.equal(g.state.shift, shift);
		const goal = g.state.goal;
		for (let i = 0; i < goal; i++) {
			p.carrying = burger();
			g.serve(p, 0);
		}
		if (shift < 3) {
			assert.equal(g.state.mode, "intermission");
			step(g, {}, 121);
		} else assert.equal(g.state.mode, "victory");
	}
	assert.equal(g.state.served, 12);
	assert.equal(g.state.shift, 3);
});
test("expired burger is replaced and costs eight performance", (g) => {
	g.state.burgers = [burger({ z: 4.099 })];
	step(g);
	assert.equal(g.state.stats.lost, 1);
	assert.equal(g.state.performance, 52);
	assert(g.state.burgers.every((b) => b.id !== 1000));
	assert.equal(g.state.burgers.length, 3);
});
test("missed ingredient costs one performance", (g) => {
	g.state.ingredients = [{ id: 900, x: -5.69, z: 0, type: "onion" }];
	step(g);
	assert.equal(g.state.performance, 59);
	assert.equal(g.state.ingredients.length, 0);
});
test("zero performance ends game", (g) => {
	g.state.performance = 1;
	g.penalty(1, "test");
	assert.equal(g.state.mode, "gameover");
	const t = g.state.time;
	step(g, {}, 20);
	assert.equal(g.state.time, t);
});
test("live settings change speed, penalty, assist, invincibility", (g) => {
	assert.deepEqual(g.config, DEFAULTS);
	const p = g.state.players[0];
	g.config.playerSpeed = 10;
	const x = p.x;
	step(g, { x: 1 }, 3);
	assert(p.x > x + 0.9);
	g.config.pressureLoss = 2;
	g.penalty(2);
	assert.equal(g.state.performance, 56);
	g.config.invincible = true;
	g.penalty(50);
	assert.equal(g.state.performance, 56);
	g.config.assist = true;
	p.held = null;
	g.state.ingredients = [{ id: 950, x: p.x + 1.1, z: p.z, type: "lettuce" }];
	step(g);
	assert.equal(p.held, "lettuce");
});
test("dash accelerates then cools down", (g) => {
	const p = g.state.players[0];
	const x = p.x;
	step(g, { x: 1, dash: true }, 3);
	assert(p.x > x + 0.9);
	assert.equal(g.state.stats.dashes, 1);
	step(g, { x: -1, dash: true }, 15);
	assert.equal(g.state.stats.dashes, 1);
});
test("physics constrains movement to kitchen", (g) => {
	step(g, { x: 1 }, 180);
	const p = g.state.players[0];
	assert(p.x <= 5.8);
	assert(p.x > 5);
	step(g, { z: -1 }, 180);
	assert(p.z >= -4.1);
	assert(p.z < -3.5);
});
test("co-op player has independent physical body and hands", (g) => {
	g.addPlayer(1);
	g.addPlayer(1);
	assert.equal(g.state.players.length, 2);
	assert.equal(g.physics.bodies, 2);
	const p = g.state.players[1];
	g.state.ingredients = [{ id: 900, x: p.x, z: p.z, type: "cheese" }];
	step(g);
	assert.equal(p.held, "cheese");
	assert.equal(g.state.players[0].held, null);
});
test("departing chef returns final burger and removes physics body", (g) => {
	g.addPlayer(1);
	const departing = g.state.players.find((p) => p.id === 1);
	const final = burger({
		id: 1200,
		slot: 2,
		color: COLORS[2],
		ingredients: ["tomato", "lettuce", "cheese"],
		required: ["tomato", "lettuce", "cheese"],
		ready: true,
	});
	g.state.shift = 3;
	g.state.shiftServed = 4;
	g.state.served = 11;
	g.state.goal = 5;
	g.state.burgers = [];
	departing.carrying = final;
	assert.equal(g.physics.bodies, 2);
	assert.equal(g.physics.colliders, 7);
	assert.equal(g.removePlayer(1), true);
	assert.equal(g.state.players.length, 1);
	assert.equal(g.physics.bodies, 1);
	assert.equal(g.physics.colliders, 6);
	assert.equal(g.state.burgers.length, 1);
	assert.equal(g.state.burgers[0].id, 1200);
	assert.equal(g.state.burgers[0].slot, 2);
	assert.equal(g.state.burgers[0].ready, true);
	assert.deepEqual(g.state.burgers[0].ingredients, final.ingredients);
	for (let n = 0; n < 60 * 30 && g.state.mode === "play"; n++)
		g.step(1 / 30, { 0: g.aiInput(g.state.players[0]) });
	assert.equal(g.state.mode, "victory");
	assert.equal(g.state.served, 12);
	assert.equal(g.removePlayer(1), false);
});
test("returning carried burger avoids occupied belt positions", (g) => {
	g.addPlayer(1);
	const departing = g.state.players.find((p) => p.id === 1);
	departing.carrying = g.state.burgers.pop();
	departing.carrying.ready = true;
	g.state.burgers[0].z = -3.6;
	g.state.burgers[1].z = -1.65;
	const carriedId = departing.carrying.id;
	g.removePlayer(1);
	const returned = g.state.burgers.find((b) => b.id === carriedId);
	assert(returned);
	assert(
		g.state.burgers
			.filter((b) => b !== returned)
			.every((b) => Math.abs(b.z - returned.z) >= 1.94),
	);
	assert(returned.z <= 3.2);
	assert.equal(g.state.burgers.length, 3);
});
test("departure outside play removes body without creating orders", (g) => {
	g.addPlayer(1);
	g.state.players.find((p) => p.id === 1).carrying = g.state.burgers.pop();
	g.state.mode = "title";
	g.state.burgers = [];
	g.removePlayer(1);
	assert.equal(g.state.burgers.length, 0);
	assert.equal(g.physics.bodies, 1);
	g.removePlayer(0);
	assert.equal(g.physics.bodies, 0);
	assert.equal(g.physics.colliders, 5);
});
test("seeded recipes and deep snapshots", (g) => {
	const recipes = g.state.burgers.map((b) => b.required);
	const snap = g.snapshot();
	snap.players[0].held = "bun";
	assert.equal(g.state.players[0].held, null);
	g.start();
	assert.deepEqual(
		g.state.burgers.map((b) => b.required),
		recipes,
	);
});
test("gamepad shaped input supports all actions", (g) => {
	const p = g.state.players[0];
	p.held = "onion";
	step(g, { x: 0.5, z: 0.5, reject: true, dash: true });
	assert.equal(p.held, null);
	assert(p.x > 0 && p.z > 1.4);
	assert.equal(g.state.stats.dashes, 1);
});
test("AI plays all three shifts using ordinary mechanics", (g) => {
	const maxSteps = 30 * 60 * 30;
	for (
		let n = 0;
		n < maxSteps && ["play", "intermission"].includes(g.state.mode);
		n++
	)
		g.step(1 / 30, { 0: g.aiInput(g.state.players[0]) });
	assert.equal(
		g.state.mode,
		"victory",
		JSON.stringify({
			mode: g.state.mode,
			time: g.state.time,
			served: g.state.served,
			shift: g.state.shift,
			performance: g.state.performance,
			stats: g.state.stats,
			player: g.state.players[0],
			burgers: g.state.burgers,
			ingredients: g.state.ingredients,
		}),
	);
	assert.equal(g.state.served, 12);
	assert(g.state.stats.caught >= 39);
	assert.equal(g.state.stats.buns, 12);
	assert(g.state.stats.added >= 27);
	assert(g.state.stats.dashes > 0);
	assert.equal(g.config.invincible, false);
	assert.equal(g.state.attract, false);
});
test("touch assist only serves at the matching chute", (g) => {
	g.config.assist = true;
	const p = g.state.players[0];
	p.carrying = burger({ slot: 2, color: COLORS[2], ready: true });
	p.x = -3;
	p.z = 4.1;
	const spirit = g.state.performance;
	step(g, {}, 12);
	assert(p.carrying);
	assert.equal(g.state.performance, spirit);
	assert.equal(g.state.stats.wrong, 0);
	p.x = 3;
	p.actionCooldown = 0;
	step(g);
	assert.equal(p.carrying, null);
	assert.equal(g.state.served, 1);
});
test("per-player assist widens only the requesting chef's catch radius", (g) => {
	g.addPlayer(1);
	const host = g.state.players.find((p) => p.id === 0);
	const guest = g.state.players.find((p) => p.id === 1);
	host.x = -2;
	g.state.ingredients = [
		{ id: 2000, x: host.x + 1.1, z: host.z, type: "cheese" },
		{ id: 2001, x: guest.x + 1.1, z: guest.z, type: "tomato" },
	];
	g.step(1 / 30, { 0: {}, 1: { assist: true } });
	assert.equal(g.config.assist, false);
	assert.equal(host.held, null);
	assert.equal(guest.held, "tomato");
	assert.equal(g.state.stats.caught, 1);
});
test("per-player assist serves only its own matching wrapper", (g) => {
	g.addPlayer(1);
	const host = g.state.players.find((p) => p.id === 0);
	const guest = g.state.players.find((p) => p.id === 1);
	host.carrying = burger({ id: 2100, slot: 1, color: COLORS[1], ready: true });
	host.x = 0;
	host.z = 4.1;
	guest.carrying = burger({ id: 2101, slot: 2, color: COLORS[2], ready: true });
	guest.x = -3;
	guest.z = 4.1;
	const spirit = g.state.performance;
	for (let n = 0; n < 12; n++) g.step(1 / 30, { 0: {}, 1: { assist: true } });
	assert(guest.carrying);
	assert(host.carrying);
	assert.equal(g.state.performance, spirit);
	assert.equal(g.state.stats.wrong, 0);
	guest.x = 3;
	guest.actionCooldown = 0;
	g.step(1 / 30, { 0: {}, 1: { assist: true } });
	assert.equal(guest.carrying, null);
	assert(host.carrying);
	assert.equal(g.state.served, 1);
	assert.equal(g.config.assist, false);
});
console.log(
	`${passed + failed} core checks: ${passed} passed, ${failed} failed`,
);
if (failed) process.exitCode = 1;
