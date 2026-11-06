import assert from "node:assert/strict";
import { Game, initPhysics, readSnapshot } from "../src/game.js";

await initPhysics();
let count = 0;
const failures = [];
const metrics = {};
const test = (name, fn) => {
	try {
		fn();
		count++;
	} catch (e) {
		failures.push(name + ": " + e.message);
	}
};
const blank = () => {
	const g = new Game({ seed: 123 });
	g.startWave(0);
	g.pending = [];
	for (const e of [...g.entities.values()])
		if (e.type !== "player") g.remove(e);
	return g;
};
test("Rapier projectiles hit demons", () => {
	const g = blank();
	g.spawnEnemy("moth", 0, 1, { x: 0, baseX: 0, y: -1, baseY: -1, hp: 2 });
	for (let i = 0; i < 180; i++)
		g.step(1 / 60, { 0: { fire: true, move: Math.sin(i * 0.01) * 0.01 } });
	assert(g.stats.hits > 0);
	assert(g.stats.kills > 0);
	assert(g.score > 0);
	g.dispose();
});
test("Fiends split into exactly two hatchlings", () => {
	const g = blank(),
		e = g.spawnEnemy("fiend");
	g.hitEnemy(e, 20, 0);
	assert.equal(
		[...g.entities.values()].filter((e) => e.kind === "hatchling").length,
		2,
	);
	assert.equal(g.stats.splits, 1);
	g.dispose();
});
test("Hostile bolts cause one hull damage through Rapier", () => {
	const g = blank(),
		p = g.players[0];
	g.spawnEnemy("moth", 0, 1, { x: 6, baseX: 6, fire: 999 });
	p.inv = 0;
	const hp = p.hp;
	g.bolt(p.x, -3.9, 0, 3.2);
	for (let i = 0; i < 30; i++) g.step(1 / 60, {});
	assert.equal(p.hp, hp - 1);
	assert.equal(g.stats.damage, 1);
	g.dispose();
});
test("Dash grants immunity and has a cooldown", () => {
	const g = blank();
	g.spawnEnemy("moth");
	const p = g.players[0];
	p.inv = 0;
	g.step(1 / 60, { 0: { move: 1, dash: true } });
	const hp = p.hp;
	g.damage(p);
	assert.equal(p.hp, hp);
	assert(p.dashCD > 2);
	assert(p.dash > 0);
	assert(p.x > 0);
	g.dispose();
});
test("Encore clears bolts and damages the boss", () => {
	const g = blank(),
		p = g.players[0];
	const boss = g.spawnEnemy("boss");
	g.bolt(2, 2, 0);
	p.charge = 100;
	g.encore(p);
	assert.equal(p.charge, 0);
	assert.equal(boss.hp, boss.maxHp - 28);
	assert.equal(
		[...g.entities.values()].filter((e) => e.type === "bolt").length,
		0,
	);
	assert.equal(g.stats.encores, 1);
	g.dispose();
});
test("Pickups apply through Rapier sensors", () => {
	const g = blank(),
		p = g.players[0];
	p.hp = 2;
	g.drop("repair", p.x, p.y);
	for (let i = 0; i < 3; i++) g.step(1 / 60, {});
	assert.equal(p.hp, 3);
	g.drop("prism", p.x, p.y);
	for (let i = 0; i < 3; i++) g.step(1 / 60, {});
	assert.equal(p.weapon, "prism");
	assert.equal(g.stats.pickups, 2);
	g.dispose();
});
test("Near misses charge only once per bolt per pilot", () => {
	const g = blank(),
		p = g.players[0];
	p.inv = 0;
	const charge = p.charge;
	g.bolt(p.x + 0.67, p.y + 0.2, 0, 1);
	for (let i = 0; i < 20; i++) g.step(1 / 60, {});
	assert.equal(g.stats.grazes, 1);
	assert.equal(p.charge, charge + 3);
	g.dispose();
});
test("Co-op pilots revive between encounters", () => {
	const g = new Game({ count: 2 });
	g.startWave(0);
	const p = g.players[1];
	p.inv = 0;
	for (let i = 0; i < 4; i++) {
		p.inv = 0;
		g.damage(p);
	}
	assert.equal(p.alive, false);
	assert.notEqual(g.phase, "defeat");
	g.startWave(1);
	assert.equal(p.alive, true);
	assert.equal(p.hp, 2);
	g.dispose();
});
test("Boss phases summon support and victory completes", () => {
	const g = blank(),
		boss = g.spawnEnemy("boss");
	g.wave = 6;
	g.hitEnemy(boss, 70, 0);
	assert.equal(boss.phase, 2);
	g.hitEnemy(boss, 60, 0);
	assert.equal(boss.phase, 3);
	assert.equal(g.stats.bossPhases, 2);
	g.hitEnemy(boss, 100, 0);
	for (let i = 0; i < 200; i++) g.step(1 / 60, {});
	assert.equal(g.result.won, true);
	g.dispose();
});
test("Defeat produces a complete result", () => {
	const g = blank(),
		p = g.players[0];
	p.hp = 1;
	p.inv = 0;
	g.damage(p);
	for (let i = 0; i < 110; i++) g.step(1 / 60, {});
	assert.equal(g.result.won, false);
	g.dispose();
});
test("Snapshots retain player and entity identity", () => {
	const g = blank();
	g.spawnEnemy("artillery");
	const s = g.snapshot(),
		remote = readSnapshot(s);
	assert.equal(remote.players[0].id, g.players[0].id);
	assert.equal(remote.entities.size, g.entities.size);
	assert.equal(remote.score, g.score);
	g.dispose();
});
test("Seeded simulation is reproducible", () => {
	const a = new Game({ seed: 71 }),
		b = new Game({ seed: 71 });
	for (let i = 0; i < 600; i++) {
		a.step(1 / 60, { 0: { fire: true } });
		b.step(1 / 60, { 0: { fire: true } });
	}
	assert.deepEqual(a.snapshot(), b.snapshot());
	a.dispose();
	b.dispose();
});
test("Scripted AI completes every encounter with real shooting", () => {
	const g = new Game({ seed: 7318 });
	g.tuning.god = true;
	g.tuning.auto = true;
	let largest = 0;
	for (let i = 0; i < 60 * 1200 && !g.result; i++) {
		g.step(1 / 60, {});
		if (i % 60 === 0)
			largest = Math.max(
				largest,
				JSON.stringify({ k: "s", s: g.snapshot() }).length,
			);
	}
	metrics.playthrough = {
		time: g.time,
		score: g.score,
		stats: g.stats,
		largestSnapshot: largest,
	};
	assert(g.result, "AI did not finish in 1200 simulated seconds");
	assert.equal(g.result.won, true);
	assert.equal(g.stats.waves, 7);
	assert(g.stats.splits > 0);
	assert(g.stats.dashes > 0);
	assert(g.stats.encores > 0);
	assert(g.stats.pickups > 0);
	assert.equal(g.stats.bossPhases, 2);
	assert(largest < 16384, "snapshot exceeds Hub protocol size");
	g.dispose();
});
process.stdout.write(JSON.stringify({ count, failures, metrics }));
