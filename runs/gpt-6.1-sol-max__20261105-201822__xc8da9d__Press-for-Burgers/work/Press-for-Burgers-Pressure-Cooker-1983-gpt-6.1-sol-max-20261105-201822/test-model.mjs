import assert from "node:assert/strict";
import { CHUTES, DEFAULTS, FOOD, Kitchen } from "./model.js";

await Kitchen.init();
let count = 0;
const failures = [];
function check(name, fn) {
	count++;
	try {
		fn();
	} catch (e) {
		failures.push(`${name}: ${e.message}`);
	}
}
const fresh = () => {
	const k = new Kitchen(1983, 1);
	k.beginShift();
	return k;
};
const step = (k, t, inputs = {}) => {
	for (let i = 0; i < t * 60; i++) k.tick(1 / 60, inputs);
};
let k = fresh();
check("Initial service has an exact one-topping first order", () =>
	assert.equal(k.state.burgers[0].recipe.length, 1),
);
const startX = k.state.players[0].x;
step(k, 0.5, { 0: { x: 1 } });
check("Rapier chef controller moves with input", () =>
	assert.ok(k.state.players[0].x > startX + 2),
);
step(k, 10, { 0: { x: 1, z: -1 } });
check("Kitchen bounds keep chef on the floor", () =>
	assert.ok(k.state.players[0].x <= 7.65 && k.state.players[0].z >= -5.55),
);
k.world.free();
k = fresh();
const z0 = k.state.burgers[0].z;
k.useBrake();
step(k, 1);
check("Brake freezes the conveyor", () =>
	assert.equal(k.state.burgers[0].z, z0),
);
check("Brake has a cooldown and cannot be spammed", () =>
	assert.equal(k.useBrake(), false),
);
check("Five-second brake expires", () => {
	step(k, 4.2);
	assert.equal(k.state.brake, 0);
	assert.ok(k.state.burgers[0].z > z0);
});
k.world.free();
k = fresh();
const p = k.state.players[0];
p.x = 4;
p.z = FOOD[0].lane;
const f = k.spawnFood(0);
k.foodBodies.get(f.id).setTranslation({ x: 4, y: 1.2, z: p.z }, true);
step(k, 0.02);
check("Flying Rapier food is caught automatically", () =>
	assert.deepEqual(p.held, { kind: "topping", type: 0 }),
);
check("Catching scores five points", () => assert.equal(k.state.score, 5));
check("Ingredient event tags remain distinct from ingredient types", () => {
	const events = k.drainEvents();
	assert.ok(events.some((e) => e.type === "catch" && e.foodType === 0));
	assert.ok(events.some((e) => e.type === "launch" && e.foodType === 0));
});
k.reject(p);
check("Returning held food is safe and frees hands", () => {
	assert.equal(p.held, null);
	assert.equal(k.state.stats.rejected, 1);
	assert.equal(k.state.rating, 50);
});
const airborne = k.spawnFood(1);
p.z = FOOD[1].lane;
k.foodBodies.get(airborne.id).setTranslation({ x: p.x, y: 1.2, z: p.z }, true);
step(k, 0.02, { 0: { reject: true } });
check("Reject guard sends a flying topping back", () =>
	assert.equal(airborne.returning, true),
);
k.world.free();
k = fresh();
const chef = k.state.players[0],
	b = k.state.burgers[0];
chef.x = -3.6;
chef.z = b.z;
chef.held = { kind: "topping", type: b.recipe[0] };
k.interact(chef);
check("Correct topping completes the recipe and adds the top bun", () =>
	assert.ok(b.ready && b.toppings.length === b.recipe.length),
);
check("Placement emits the native animation and sound event", () =>
	assert.ok(k.drainEvents().some((e) => e.type === "topping")),
);
k.interact(chef);
check("Second action picks up the completed burger", () =>
	assert.equal(chef.held.kind, "burger"),
);
chef.x = CHUTES[1];
chef.z = 5.7;
const rating = k.state.rating;
k.interact(chef);
check("Wrong chute loses five rating and keeps the burger", () => {
	assert.equal(k.state.rating, rating - 5);
	assert.equal(chef.held.kind, "burger");
});
chef.x = CHUTES[0];
k.interact(chef);
check("Correct chute serves, scores, heals and frees hands", () => {
	assert.equal(k.state.totalServed, 1);
	assert.equal(chef.held, null);
	assert.ok(k.state.score >= 100);
	assert.equal(k.state.rating, rating - 2);
});
k.world.free();
k = fresh();
const c = k.state.players[0],
	bb = k.state.burgers[0];
c.x = -3.6;
c.z = bb.z;
c.held = { kind: "topping", type: (bb.recipe[0] + 1) % 4 };
k.interact(c);
check("Incorrect toppings cost rating without contaminating the recipe", () => {
	assert.equal(k.state.rating, 48);
	assert.equal(bb.toppings.length, 0);
});
k.state.burgers[0].z = 4.41;
step(k, 0.02);
check("Belt loss costs ten rating", () => {
	assert.equal(k.state.rating, 38);
	assert.equal(k.state.stats.lost, 1);
});
k.penalty(100, "Test");
check("Zero rating ends the service", () => assert.equal(k.state.mode, "lost"));
k.world.free();
k = fresh();
k.invincible = true;
k.penalty(100, "Test");
check("Dev invincibility prevents game over", () =>
	assert.equal(k.state.rating, 50),
);
const dashStart = k.state.players[0].x;
step(k, 0.18, { 0: { x: 1, dash: true } });
check("Dash is faster than ordinary movement and counts usage", () => {
	assert.ok(k.state.players[0].x - dashStart > 1.5);
	assert.equal(k.state.stats.dashes, 1);
});
k.world.free();
k = fresh();
k.state.shift = 1;
k.state.shiftTime = DEFAULTS.steamInterval - 2;
k.state.players[0].x = 1.2;
k.state.players[0].z = -0.2;
step(k, 0.02);
check("Second-shift steam hurts and stuns on contact", () => {
	assert.equal(k.state.steam, true);
	assert.equal(k.state.stats.steamHits, 1);
	assert.ok(k.state.players[0].stunned > 0);
});
k.world.free();
for (const seed of [1983, 7, 2026]) {
	k = new Kitchen(seed);
	k.beginShift();
	let steps = 0,
		seen = new Set();
	for (; steps < 36000; steps++) {
		for (const f of k.state.foods) seen.add(f.type);
		k.tick(1 / 60, { 0: k.bot(0, true) });
		k.drainEvents();
		if (k.state.mode === "intermission") k.nextShift();
		if (["won", "lost"].includes(k.state.mode)) break;
	}
	check(`Complete three-shift service, seed ${seed}`, () => {
		assert.equal(k.state.mode, "won");
		assert.equal(k.state.totalServed, 15);
		assert.ok(k.state.rating > 0);
		assert.ok(k.state.time > 60);
	});
	check(`Every topping and core scoring path exercised, seed ${seed}`, () => {
		assert.equal(seen.size, 4);
		assert.equal(k.state.stats.served, 15);
		assert.ok(k.state.bestCombo >= 3);
		assert.ok(k.state.stats.caught > 15);
	});
	k.world.free();
}
const a = new Kitchen(7654),
	b2 = new Kitchen(7654);
a.beginShift();
b2.beginShift();
step(a, 3);
step(b2, 3);
check("Identical seeds produce identical service states", () =>
	assert.deepEqual(a.snapshot(), b2.snapshot()),
);
a.world.free();
b2.world.free();
console.log(JSON.stringify({ count, failures }));
