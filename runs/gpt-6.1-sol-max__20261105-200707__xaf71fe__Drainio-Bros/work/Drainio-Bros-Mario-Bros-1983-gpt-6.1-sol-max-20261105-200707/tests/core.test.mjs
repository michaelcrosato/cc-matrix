import assert from "node:assert/strict";
import { Shift, Showman, DEFAULTS, PHASES, initPhysics } from "../src/core.mjs";
await initPhysics();
const results = [];
const test = (name, run) => {
	try {
		run();
		results.push({ name, pass: true });
	} catch (e) {
		results.push({ name, pass: false, error: e.message });
	}
};
function fixture(extra = {}) {
	const g = new Shift({ config: { enemySpeed: 0, ...extra } });
	g.intro = 0;
	g.nextSpawn = 9999;
	const p = g.players[0];
	g.setPosition(p, -5, 0.65);
	for (let i = 0; i < 12; i++) g.step({});
	return g;
}
function frames(g, n, input = {}) {
	for (let i = 0; i < n; i++) g.step(input);
}
function enemy(g, type = "shell", x = -5, y = 3.7) {
	const e = g.spawnEnemy(type, { x, y });
	frames(g, 15);
	return e;
}
test("pinned physics, arena and independent crew lives", () => {
	const g = new Shift({ players: [0, 1, 2, 3] });
	assert.equal(g.players.length, 4);
	assert.equal(g.world.bodies.len(), 4);
	assert.equal(g.platforms.length, 9);
	assert.ok(g.players.every((p) => p.lives === DEFAULTS.lives));
	g.dispose();
});
test("running accelerates and stops on dry ground", () => {
	const g = fixture();
	const p = g.players[0];
	frames(g, 60, { 0: { x: -1 } });
	assert.ok(p.vx < -6);
	frames(g, 20);
	assert.ok(Math.abs(p.vx) < 0.1);
	g.dispose();
});
test("a real underside jump flips a grounded bottleback", () => {
	const g = fixture();
	const e = enemy(g);
	frames(g, 40, { 0: { jump: true } });
	assert.equal(e.state, "flipped");
	assert.equal(g.stats.bumps, 1);
	assert.equal(g.stats.jumps, 1);
	assert.ok(g.stats.flips > 0);
	g.dispose();
});
test("holding jump does not auto-repeat jumps", () => {
	const g = fixture();
	frames(g, 150, { 0: { jump: true } });
	assert.equal(g.stats.jumps, 1);
	g.dispose();
});
test("jumping through a gap reaches the next floor", () => {
	const g = fixture();
	const p = g.players[0];
	g.setPosition(p, 1.05, 0.65);
	frames(g, 15);
	for (let i = 0; i < 100; i++)
		g.step({ 0: { x: i > 10 && i < 40 ? 1 : 0, jump: i < 8 } });
	assert.equal(p.ground, "lowR");
	assert.ok(p.y > 3.8);
	g.dispose();
});
test("the BOP block is a jumpable foothold", () => {
	const g = fixture();
	const p = g.players[0];
	g.setPosition(p, 0, 3);
	frames(g, 45);
	assert.equal(p.ground, "bop");
	const y = p.y;
	frames(g, 4, { 0: { jump: true } });
	assert.ok(p.y > y + 0.4);
	g.dispose();
});
test("down and jump drops through a platform", () => {
	const g = fixture();
	const p = g.players[0];
	g.setPosition(p, -5, 3.95);
	frames(g, 12);
	assert.equal(p.ground, "lowL");
	frames(g, 1, { 0: { jump: true, down: true } });
	frames(g, 55);
	assert.equal(p.ground, "ground");
	g.dispose();
});
test("clawbacks need two bumps and become angry after one", () => {
	const g = fixture();
	const e = enemy(g, "crab");
	g.bump(g.platforms[1], e.x, g.players[0]);
	assert.equal(e.armor, 1);
	assert.equal(e.state, "walk");
	assert.equal(e.angry, true);
	frames(g, 40);
	g.bump(g.platforms[1], e.x, g.players[0]);
	assert.equal(e.state, "flipped");
	g.dispose();
});
test("springwings cannot be flipped in midair", () => {
	const g = fixture();
	const e = enemy(g, "hopper");
	e.grounded = false;
	e.body.setLinvel({ x: 0, y: 7 }, true);
	assert.equal(g.hitEnemy(e, g.players[0], true), false);
	e.grounded = true;
	g.hitEnemy(e, g.players[0]);
	assert.equal(e.state, "flipped");
	g.dispose();
});
test("the Big Clog has three armor hits then a final boot", () => {
	const g = fixture();
	const e = enemy(g, "boss", 0, 7.4);
	for (let i = 0; i < 3; i++) {
		e.grounded = true;
		g.hitEnemy(e, g.players[0]);
		if (i < 2) assert.equal(e.state, "walk");
	}
	assert.equal(e.state, "flipped");
	g.defeat(e, g.players[0]);
	assert.equal(e.state, "gone");
	assert.ok(g.score >= 3000);
	g.dispose();
});
test("contact automatically boots flipped pests and chains points", () => {
	const g = fixture();
	const p = g.players[0];
	const a = enemy(g);
	g.hitEnemy(a, p);
	g.setPosition(p, a.x, a.y + 0.2);
	g.god = true;
	frames(g, 2);
	assert.equal(a.state, "gone");
	const b = enemy(g, "crab", -7);
	b.grounded = true;
	b.armor = 1;
	g.hitEnemy(b, p);
	g.setPosition(p, b.x, b.y + 0.2);
	frames(g, 2);
	assert.equal(b.state, "gone");
	assert.equal(g.combo, 2);
	assert.equal(g.stats.kicks, 2);
	assert.ok(g.score >= 1600);
	g.dispose();
});
test("a flipped pest recovers when its timer expires", () => {
	const g = fixture({ stun: 0.2 });
	const e = enemy(g);
	g.hitEnemy(e, g.players[0]);
	frames(g, 20);
	assert.equal(e.state, "walk");
	assert.equal(e.angry, true);
	g.dispose();
});
test("BOP affects grounded pests and has exactly three charges", () => {
	const g = fixture();
	const e = enemy(g);
	for (let i = 0; i < 3; i++) {
		e.grounded = true;
		g.powCooldown = 0;
		assert.equal(g.bop(g.players[0]), true);
	}
	g.powCooldown = 0;
	assert.equal(g.pow, 0);
	assert.equal(g.bop(g.players[0]), false);
	assert.equal(g.stats.bops, 3);
	g.dispose();
});
test("Frosties freeze floors and a bump thaws them", () => {
	const g = fixture();
	const e = enemy(g, "ice");
	frames(g, 320);
	assert.ok(g.ice.includes("lowL"));
	assert.equal(e.state, "gone");
	g.bump(g.platforms[1], -5, g.players[0]);
	assert.ok(!g.ice.includes("lowL"));
	g.dispose();
});
test("ice gives measurably slower braking", () => {
	const g = fixture();
	const p = g.players[0];
	g.setPosition(p, -8, 3.95);
	frames(g, 15);
	g.ice.push("lowL");
	frames(g, 20, { 0: { x: 1 } });
	const v = p.vx;
	frames(g, 5);
	assert.ok(p.vx > v - 1);
	g.ice = [];
	frames(g, 10);
	assert.ok(Math.abs(p.vx) < 0.1);
	g.dispose();
});
test("players wrap and bottom pipes recirculate pests", () => {
	const g = fixture();
	const p = g.players[0];
	g.setPosition(p, 12.8, 1);
	frames(g, 1);
	assert.ok(p.x < -12);
	assert.equal(g.stats.wraps, 1);
	const e = enemy(g, "shell", 12.9, 0.4);
	frames(g, 2);
	assert.ok(e.y > 9);
	assert.equal(e.angry, true);
	g.dispose();
});
test("damage costs one boot, protects against repeats, and respawns", () => {
	const g = fixture();
	const p = g.players[0];
	p.invuln = 0;
	g.hurt(p);
	assert.equal(p.lives, 4);
	g.hurt(p);
	assert.equal(p.lives, 4);
	frames(g, 80);
	assert.ok(p.dead <= 0);
	assert.ok(p.invuln > 0);
	assert.ok(p.y > 0);
	g.dispose();
});
test("the whole crew must run out for game over", () => {
	const g = new Shift({ players: [0, 1] });
	g.intro = 0;
	g.nextSpawn = 9999;
	g.players[0].lives = 0;
	g.players[0].dead = 0;
	frames(g, 1);
	assert.equal(g.status, "playing");
	g.players[1].lives = 0;
	g.players[1].dead = 0;
	frames(g, 1);
	assert.equal(g.status, "lost");
	g.dispose();
});
test("collecting every bonus token awards a perfect bonus and refills BOP", () => {
	const g = fixture();
	const p = g.players[0];
	g.pow = 0;
	g.beginPhase(2);
	g.intro = 0;
	const total = g.bonusTotal;
	for (const c of [...g.coins]) {
		g.setPosition(p, c.x, c.y);
		frames(g, 1);
	}
	assert.equal(g.coins.length, 0);
	assert.equal(g.bonusCollected, total);
	assert.equal(g.stats.bonuses, 1);
	assert.equal(g.pow, 3);
	assert.equal(g.score, total * 200 + 5000);
	g.dispose();
});
test("bonus phase times out and advances without collecting tokens", () => {
	const g = fixture();
	g.beginPhase(2);
	g.intro = 0;
	frames(g, 1700);
	assert.equal(g.phase, 3);
	g.dispose();
});
test("15,000 personal points awards an extra life", () => {
	const g = fixture();
	const p = g.players[0];
	p.score = 14950;
	const before = p.lives;
	g.award(p, 100);
	assert.equal(p.lives, before + 1);
	g.dispose();
});
test("hot-water shifts create sparks and cold shifts create icicles", () => {
	const g = fixture();
	g.beginPhase(7);
	g.intro = 0;
	g.nextSpawn = 9999;
	g.god = true;
	frames(g, 560);
	assert.ok(g.hazards.some((h) => h.type === "fire"));
	assert.ok(g.hazards.some((h) => h.type === "icicle"));
	g.dispose();
});
test("snapshots are finite JSON and fit the hub payload", () => {
	const g = new Shift({ players: [0, 1, 2, 3], attract: true });
	frames(g, 900);
	const json = JSON.stringify({
		t: "state",
		state: g.snapshot(),
		events: g.drainEvents().slice(-28),
	});
	assert.ok(json.length < 16384);
	assert.ok(!json.includes("NaN"));
	assert.ok(!json.includes("Infinity"));
	assert.equal(JSON.parse(json).state.players.length, 4);
	g.dispose();
});
test("scripted full campaign visits all eight shifts, all pests and victory", () => {
	const g = new Shift({
			players: [0, 1],
			attract: true,
			config: { spawn: 1.8 },
		}),
		bot = new Showman(g),
		phases = new Set(),
		pests = new Set();
	let won = false;
	for (let i = 0; i < 30000; i++) {
		g.step(bot.update());
		for (const e of g.drainEvents()) {
			if (e.type === "phase") phases.add(e.phase);
			if (e.type === "spawn") pests.add(e.enemy);
			if (e.type === "victory") won = true;
		}
		if (won) break;
	}
	assert.equal(phases.size, 8, `Visited ${[...phases]}`);
	assert.equal(pests.size, 5);
	assert.equal(won, true);
	assert.ok(g.stats.kicks > 20);
	assert.ok(g.stats.coins > 20);
	g.dispose();
});
test("an earned extra life revives a waiting co-op crew member", () => {
	const g = new Shift({ players: [0, 1] });
	g.intro = 0;
	g.nextSpawn = 9999;
	const p = g.players[0];
	p.lives = 0;
	p.dead = 0;
	p.score = 14950;
	p.body.setGravityScale(0, true);
	g.award(p, 100);
	frames(g, 20);
	assert.equal(p.lives, 1);
	assert.ok(p.y > 0);
	assert.ok(p.dead <= 0);
	assert.ok(p.invuln > 0);
	g.dispose();
});
console.log(JSON.stringify(results));
