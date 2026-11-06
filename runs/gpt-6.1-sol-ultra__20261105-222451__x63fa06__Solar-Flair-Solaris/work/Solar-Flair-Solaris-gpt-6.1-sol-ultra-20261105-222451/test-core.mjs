import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import RAPIER from "@dimforge/rapier3d-compat";

const oldWarn = console.warn;
console.warn = (...args) => {
	if (!String(args[0]).includes("deprecated parameters")) oldWarn(...args);
};
await RAPIER.init();
console.warn = oldWarn;
vm.runInThisContext(
	fs.readFileSync(new URL("./core.js", import.meta.url), "utf8") +
		"\nglobalThis.SolarSim = SolarSim;",
);
let passed = 0,
	failed = 0;
const live = new Set();
function make(events = []) {
	const sim = new SolarSim(RAPIER, (e) => events.push(e));
	live.add(sim);
	return sim;
}
function tick(sim, seconds, input = {}) {
	for (let n = 0; n < Math.ceil(seconds * 60); n++)
		sim.update(1 / 60, typeof input === "function" ? input() : input);
}
function enter(sim, sector) {
	assert(sim.selectSector(sector, true));
	tick(sim, 2.5);
	assert.equal(sim.state, "flight");
}
function isolate(sim, sector = "echo") {
	enter(sim, sector);
	sim._clearSpace();
	sim.spawnTimer = 999;
	sim.rockTimer = 999;
	sim.podTimer = 999;
}
function enemyShot(sim, x, y, z, vx = 0, vy = 0, vz = 30) {
	const id = sim.nextId++,
		shot = { id, owner: "enemy", x, y, z, vx, vy, vz, age: 0, damage: 15 };
	shot.body = sim._body(id, x, y, z, 0.65, "bullet", true);
	shot.body.setLinvel({ x: vx, y: vy, z: vz }, true);
	sim.bullets.set(id, shot);
	return shot;
}
function test(name, fn) {
	try {
		fn();
		passed++;
	} catch (error) {
		failed++;
		console.error(`FAIL ${name}: ${error.message}`);
	} finally {
		for (const sim of live) sim.dispose();
		live.clear();
	}
}

test("new campaign has seven sectors and complete initial resources", () => {
	const s = make();
	assert.equal(s.state, "map");
	assert.equal(s.sectors.length, 7);
	assert.deepEqual(
		[s.player.hp, s.player.shield, s.player.fuel, s.player.pulses],
		[100, 100, 100, 3],
	);
});
test("Solaris requires survivors and both route signals", () => {
	const s = make();
	assert.equal(s.selectSector("solaris"), false);
	s.rescued = 5;
	s.completed.add("echo");
	assert.equal(s.bossUnlocked(), false);
	s.completed.add("rift");
	assert.equal(s.bossUnlocked(), true);
	assert(s.selectSector("solaris"));
});
test("invalid chart selection does not spend fuel or leave the chart", () => {
	const s = make();
	assert.equal(s.selectSector("missing"), false);
	assert.equal(s.state, "map");
	assert.equal(s.player.fuel, 100);
});
test("warp consumes one jump cost and resolves to the selected sector", () => {
	const s = make();
	assert(s.selectSector("shard"));
	assert.equal(s.player.fuel, 90);
	tick(s, 1);
	assert.equal(s.state, "warp");
	tick(s, 1.5);
	assert.equal(s.state, "flight");
	assert.equal(s.sector, "shard");
	assert(s.player.fuel <= 90 && s.player.fuel > 89);
});
test("flight movement respects the navigable corridor", () => {
	const s = make();
	enter(s, "shard");
	tick(s, 3, { x: 1, y: 1 });
	assert.equal(s.player.x, 17);
	assert.equal(s.player.y, 9);
	tick(s, 5, { x: -1, y: -1 });
	assert.equal(s.player.x, -17);
	assert.equal(s.player.y, -9);
});
test("ship response tuning changes live movement speed", () => {
	const a = make(),
		b = make();
	isolate(a);
	isolate(b);
	b.tuning.shipSpeed = 2;
	tick(a, 0.25, { x: 1 });
	tick(b, 0.25, { x: 1 });
	assert(b.player.x > a.player.x * 1.9);
});
test("boost uses shared fuel and increases ship speed", () => {
	const a = make(),
		b = make();
	isolate(a);
	isolate(b);
	tick(a, 0.3, { x: 1 });
	tick(b, 0.3, { x: 1, boost: true });
	assert(b.player.x > a.player.x * 1.5);
	assert(b.player.fuel < a.player.fuel);
	assert(b.player.boost);
});
test("player cannon damage comes from actual Rapier contacts", () => {
	const s = make();
	isolate(s);
	const e = s._spawn("enemy", {
		x: 0,
		y: 0,
		z: -40,
		hp: 300,
		maxHp: 300,
		speed: 0,
		fireTimer: 999,
	});
	tick(s, 1.5, { fire: true, aimX: 0, aimY: 0 });
	assert(s.stats.collisions > 0);
	assert(s.stats.hits > 0);
	assert(e.hp < 300);
});
test("enemy projectiles damage shields through actual Rapier contacts", () => {
	const s = make();
	isolate(s);
	s.player.invincible = 0;
	enemyShot(s, 0, 0, -10);
	tick(s, 0.6);
	assert.equal(s.stats.damageTaken, 15);
	assert(s.player.shield < 100);
	assert.equal(s.player.hp, 100);
	assert(s.stats.collisions > 0);
});
test("shield overflow damages hull and defeat preserves the campaign", () => {
	const s = make();
	isolate(s);
	s.rescued = 3;
	s.completed.add("shard");
	s.player.invincible = 0;
	s.player.shield = 5;
	s.player.hp = 5;
	enemyShot(s, 0, 0, -10);
	tick(s, 0.6);
	assert.equal(s.state, "defeat");
	assert.equal(s.player.hp, 0);
	assert.equal(s.rescued, 3);
	assert(s.completed.has("shard"));
});
test("invincible tuning protects against physical projectile hits", () => {
	const s = make();
	isolate(s);
	s.tuning.god = true;
	s.player.invincible = 0;
	enemyShot(s, 0, 0, -10);
	tick(s, 0.6);
	assert.equal(s.player.hp, 100);
	assert.equal(s.player.shield, 100);
	assert.equal(s.stats.damageTaken, 0);
});
test("continuous fire overheats and releasing the trigger restores cannons", () => {
	const s = make();
	isolate(s);
	s.tuning.god = true;
	tick(s, 5, { fire: true });
	assert(s.player.overheated);
	const shots = s.stats.shots;
	tick(s, 0.2, { fire: true });
	assert.equal(s.stats.shots, shots);
	tick(s, 3);
	assert.equal(s.player.overheated, false);
	tick(s, 0.2, { fire: true });
	assert(s.stats.shots > shots);
});
test("pulse cells are limited, damage hostiles and clear incoming fire", () => {
	const s = make();
	isolate(s, "solaris");
	s.tuning.god = true;
	const boss = s._spawn("boss", {
		z: -65,
		hp: 1800,
		maxHp: 1800,
		radius: 8.3,
		phase: 1,
		fireTimer: 999,
	});
	enemyShot(s, 0, 0, -30);
	assert(s.pulse());
	assert.equal(s.player.pulses, 2);
	assert.equal(boss.hp, 1665);
	assert.equal(s.pulse(), false);
	tick(s, 1.2);
	assert(![...s.bullets.values()].some((b) => b.owner === "enemy"));
	assert(s.pulse());
	tick(s, 1.2);
	assert(s.pulse());
	tick(s, 1.2);
	assert.equal(s.player.pulses, 0);
	assert.equal(s.pulse(), false);
});
test("a pulse cell regenerates after sustained flight", () => {
	const s = make();
	isolate(s, "solaris");
	s.player.pulses = 0;
	s.tuning.god = true;
	s.spawnTimer = 9999;
	s.rockTimer = 9999;
	tick(s, 50.1);
	assert.equal(s.player.pulses, 1);
	assert.equal(s.player.pulse, 1);
});
test("green tractor proximity rescues a pod and advances the objective", () => {
	const s = make();
	isolate(s, "shard");
	s._spawn("pod", { x: 0, y: 0, z: -10, hp: 1 });
	tick(s, 0.1);
	assert.equal(s.rescued, 1);
	assert.equal(s.objective.current, 1);
	assert.equal(
		[...s.entities.values()].filter((e) => e.type === "pod").length,
		0,
	);
});
test("missed survivor beacons return instead of softlocking rescue", () => {
	const s = make();
	isolate(s, "shard");
	s._spawn("pod", { x: 15, y: 8, z: 13, hp: 1 });
	tick(s, 1.5);
	assert([...s.entities.values()].some((e) => e.type === "pod" && e.z < -60));
	assert.equal(s.rescued, 0);
});
test("emergency tow prevents fuel softlocks while keeping route progress", () => {
	const s = make();
	s.completed.add("echo");
	s.rescued = 2;
	s.player.fuel = 0;
	s.player.hp = 0;
	s.player.score = 1500;
	assert.equal(s.selectSector("echo"), false);
	s.emergencyTow();
	assert.equal(s.state, "map");
	assert(s.player.fuel >= 60);
	assert(s.player.hp >= 55);
	assert.equal(s.player.score, 500);
	assert.equal(s.rescued, 2);
	assert(s.completed.has("echo"));
	assert(s.selectSector("shard"));
});
test("Anchor docking is free and restores all flight resources", () => {
	const s = make();
	Object.assign(s.player, { hp: 4, shield: 0, fuel: 0, pulses: 0 });
	assert(s.selectSector("anchor"));
	tick(s, 15);
	assert.equal(s.state, "map");
	assert.deepEqual(
		[s.player.hp, s.player.shield, s.player.fuel, s.player.pulses],
		[100, 100, 100, 3],
	);
});
test("Far Haven service completes after six seconds in the docking lane", () => {
	const s = make();
	enter(s, "haven");
	s.player.hp = 25;
	s.player.fuel = 30;
	tick(s, 6.1);
	assert(s.sectorDone);
	assert(s.completed.has("haven"));
	assert.equal(s.player.hp, 100);
	assert.equal(s.player.fuel, 100);
});
test("co-op wing input moves a second ship and fires real projectiles", () => {
	const s = make();
	isolate(s);
	s.setPeerInput({ x: 1, y: 1, fire: true, aimX: 0, aimY: 0 }, true);
	tick(s, 0.3);
	assert(s.wingman.active);
	assert(s.wingman.x > 8);
	assert(s.wingman.y > 4);
	assert([...s.bullets.values()].some((b) => b.owner === "wing"));
});
test("co-op wing boost increases movement and consumes shared fuel", () => {
	const a = make(),
		b = make();
	isolate(a);
	isolate(b);
	a.setPeerInput({ x: 1 }, true);
	b.setPeerInput({ x: 1, boost: true }, true);
	tick(a, 0.3);
	tick(b, 0.3);
	assert(b.wingman.x - 5 > (a.wingman.x - 5) * 1.5);
	assert(b.player.fuel < a.player.fuel);
	assert(b.wingman.boost);
});
test("the wingmate can tractor survivors beyond the lead ship range", () => {
	const s = make();
	isolate(s, "shard");
	s.player.x = -17;
	s.player.y = -9;
	s.wingman.x = 17;
	s.wingman.y = 9;
	s.setPeerInput({}, true);
	s._spawn("pod", { x: 17, y: 9, z: -9, hp: 1 });
	tick(s, 0.1);
	assert.equal(s.rescued, 1);
	assert.equal(s.objective.current, 1);
});
test("the active wingmate shares projectile damage with the lead hull", () => {
	const s = make();
	isolate(s);
	s.player.x = 7;
	s.player.y = 3;
	s.wingman.x = 12;
	s.wingman.y = 4;
	s.player.invincible = 0;
	s.setPeerInput({}, true);
	enemyShot(s, 12, 4, -10);
	tick(s, 0.6);
	assert.equal(s.stats.damageTaken, 15);
	assert(s.player.shield < 100);
	assert.equal(s.wingman.shield, s.player.shield);
});
test("an absent wingmate cannot absorb enemy shots or collect pods", () => {
	const s = make();
	isolate(s, "shard");
	s.player.x = -17;
	s.player.y = -9;
	s.wingman.x = 17;
	s.wingman.y = 9;
	s.setPeerInput({}, false);
	s._spawn("pod", { x: 17, y: 9, z: -9, hp: 1 });
	tick(s, 0.1);
	assert.equal(s.rescued, 0);
});
test("restarting releases old physics state and starts a clean campaign", () => {
	const s = make();
	for (let i = 0; i < 10; i++) {
		enter(s, "echo");
		s.setPeerInput({ fire: true }, true);
		tick(s, 0.3, { fire: true });
		s.start();
		assert.equal(s.entities.size, 0);
		assert.equal(s.bullets.size, 0);
		assert.equal(s.colliderIndex.size, 2);
		assert.equal(s.player.score, 0);
		assert.equal(s.peerActive, false);
	}
});
test("whole campaign wins without cheats and visits all seven sectors", () => {
	const events = [],
		s = make(events);
	assert.equal(s.tuning.god, false);
	assert.equal(s.tuning.damage, 1);
	for (const sector of [
		"anchor",
		"shard",
		"echo",
		"haven",
		"chorus",
		"rift",
		"solaris",
	]) {
		assert(s.selectSector(sector), `cannot enter ${sector}`);
		let frames = 0;
		while (!["map", "victory", "defeat"].includes(s.state) && frames++ < 18000)
			s.update(1 / 60, s.botInput());
		assert(frames < 18000, `${sector} stalled`);
		assert.notEqual(s.state, "defeat", `${sector} defeated the bot`);
	}
	assert.equal(s.state, "victory");
	assert.equal(s.rescued, 7);
	assert(s.kills >= 17);
	assert(s.stats.collisions > 100);
	assert.deepEqual(
		[...new Set(s.stats.sectorsVisited)].sort(),
		["anchor", "shard", "echo", "haven", "chorus", "rift", "solaris"].sort(),
	);
	assert(events.some((e) => e.type === "bossPhase" && e.phase === 2));
	assert(events.some((e) => e.type === "bossPhase" && e.phase === 3));
	assert.equal(events.filter((e) => e.type === "victory").length, 1);
	assert.equal(s.completed.size, 7);
	assert(s.player.score > 25000);
	const snap = JSON.parse(JSON.stringify(s.snapshot()));
	assert.equal(snap.state, "victory");
	assert(snap.entities.every((e) => Number.isFinite(e.x)));
	assert.equal(snap.player.pulse, snap.player.pulses);
});
test("same seed and input sequence produce identical flight snapshots", () => {
	const a = make(),
		b = make();
	enter(a, "chorus");
	enter(b, "chorus");
	tick(a, 10, () => a.botInput());
	tick(b, 10, () => b.botInput());
	assert.deepEqual(a.snapshot(), b.snapshot());
});
console.log(
	`${passed} core checks passed${failed ? `, ${failed} failed` : ""}`,
);
if (failed) process.exitCode = 1;
