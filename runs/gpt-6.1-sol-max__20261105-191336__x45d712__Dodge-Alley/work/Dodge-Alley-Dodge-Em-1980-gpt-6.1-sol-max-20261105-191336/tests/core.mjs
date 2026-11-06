import assert from "node:assert/strict";
import R from "@dimforge/rapier3d-compat";
import { Game, DEFAULTS, LANES, trackPoint, lengthOf, wrap } from "../core.js";
await R.init();
let count = 0,
	failures = 0;
function check(name, fn) {
	try {
		fn();
		count++;
	} catch (e) {
		failures++;
		console.log("FAIL core: " + name + " — " + e.message);
	}
}
const make = (options = {}) => {
	const game = new Game(R);
	game.start({ seed: 1980, ...options });
	game.phase = "playing";
	return game;
};
const step = (g, s) => {
	for (let i = 0; i < Math.ceil(s * 60); i++) g.tick(1 / 60);
};
for (let lane = 0; lane < 4; lane++) {
	check("lane " + lane + " wraps continuously", () => {
		const a = trackPoint(0, lane),
			b = trackPoint(1 - 1e-8, lane);
		assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-4);
	});
	check("lane " + lane + " moves at constant arc speed", () => {
		let sum = 0,
			last = trackPoint(0, lane);
		for (let i = 1; i <= 2000; i++) {
			const p = trackPoint(i / 2000, lane);
			sum += Math.hypot(p.x - last.x, p.z - last.z);
			last = p;
		}
		assert.ok(Math.abs(sum - lengthOf(lane)) < 0.02);
	});
	check("lane " + lane + " has four aligned gates", () => {
		const p = [0, 0.25, 0.5, 0.75].map((u) => trackPoint(u, lane));
		assert.ok(
			Math.abs(p[0].x) < 1e-8 &&
				Math.abs(p[1].z) < 1e-8 &&
				Math.abs(p[2].x) < 1e-8 &&
				Math.abs(p[3].z) < 1e-8,
		);
	});
}
check("negative route parameters wrap", () => assert.equal(wrap(-0.25), 0.75));
check("seeded run creates full token field and pinned physics", () => {
	const g = make();
	assert.equal(g.remaining, 104);
	assert.equal(g.tokens.length, 106);
	assert.equal(g.rivals.length, 1);
	assert.ok(Math.abs(g.world.timestep - 1 / 60) < 1e-8);
	g.dispose();
});
check("Rapier sensors collect tokens during a real lap", () => {
	const g = make();
	g.tuning.invincible = true;
	step(g, 8);
	assert.ok(g.totalCollected > 20, `collected ${g.totalCollected}`);
	assert.ok(g.score > 0);
	g.dispose();
});
check("lane turn is buffered until a crossover", () => {
	const g = make();
	const a = g.players[0];
	a.u = 0.1;
	g.queueLane(0, 1);
	step(g, 0.5);
	assert.equal(a.lane, 0);
	step(g, 1.5);
	assert.equal(a.lane, 1);
	assert.equal(g.gatesTaken, 1);
	g.dispose();
});
check("inward and outward lane changes respect bounds", () => {
	const g = make();
	const a = g.players[0];
	a.u = 0;
	a.lane = 3;
	a.fromLane = 3;
	g.queueLane(0, 1);
	g.tick();
	assert.equal(a.lane, 3);
	a.u = 0.25;
	g.queueLane(0, -1);
	g.tick();
	assert.equal(a.lane, 2);
	g.dispose();
});
check("boost increases speed and drains charge", () => {
	const g = make();
	g.tuning.invincible = true;
	step(g, 1);
	const base = g.players[0].speed;
	g.setInput(0, { boost: true });
	step(g, 1);
	assert.ok(g.players[0].speed > base * 1.5);
	assert.ok(g.players[0].boost < 85);
	assert.ok(g.boostTime > 0.9);
	g.dispose();
});
check("braking reduces speed and idle refills turbo", () => {
	const g = make();
	g.tuning.invincible = true;
	g.players[0].boost = 20;
	g.setInput(0, { brake: true });
	step(g, 2);
	assert.ok(g.players[0].speed < 6);
	assert.ok(g.players[0].boost > 35);
	g.dispose();
});
check("Rapier car contact removes a bumper", () => {
	const g = make();
	const a = g.players[0],
		b = g.rivals[0];
	a.invuln = 0;
	b.u = a.u;
	b.lane = a.lane;
	b.fromLane = a.lane;
	step(g, 0.1);
	assert.equal(g.lives, 2);
	assert.ok(a.invuln > 2);
	assert.ok(g.debris.length > 0);
	g.dispose();
});
check("shield cell refills boost and absorbs one crash", () => {
	const g = make(),
		a = g.players[0];
	a.boost = 0;
	a.invuln = 0;
	g.collect(
		a,
		g.tokens.find((t) => t.type === "cell"),
	);
	assert.equal(a.boost, 100);
	assert.equal(a.shield, 4);
	g.crash(a, g.rivals[0]);
	assert.equal(g.lives, 3);
	assert.equal(a.shield, 0);
	g.dispose();
});
check("three unprotected crashes finish the run", () => {
	const g = make(),
		a = g.players[0];
	for (let i = 0; i < 3; i++) {
		a.invuln = 0;
		g.crash(a, g.rivals[0]);
	}
	assert.equal(g.phase, "lost");
	assert.equal(g.lives, 0);
	g.dispose();
});
check("crashes reset token streaks", () => {
	const g = make(),
		a = g.players[0];
	g.tokens
		.filter((t) => t.type === "dot")
		.slice(0, 35)
		.forEach((t) => g.collect(a, t));
	assert.equal(g.multiplier, 3);
	a.invuln = 0;
	g.crash(a, g.rivals[0]);
	assert.equal(g.multiplier, 1);
	assert.equal(g.chain, 0);
	g.dispose();
});
check("couch crew shares tokens and four lives", () => {
	const g = make({ players: 2 });
	assert.equal(g.players.length, 2);
	assert.equal(g.lives, 4);
	const t = g.tokens[0];
	g.collect(g.players[1], t);
	g.collect(g.players[0], t);
	assert.equal(g.totalCollected, 1);
	assert.equal(g.remaining, 103);
	g.dispose();
});
check("timed ghost race ends after 150 seconds", () => {
	const g = make({ mode: "attack" });
	g.tuning.invincible = true;
	step(g, 151);
	assert.equal(g.phase, "won");
	assert.equal(g.timeLeft, 0);
	g.dispose();
});
check("race clock continues during shift transitions", () => {
	const g = make({ mode: "attack" });
	g.tuning.invincible = true;
	g.tick();
	const before = g.timeLeft;
	g.phase = "stageclear";
	g.wait = 10;
	step(g, 1);
	assert.ok(
		Math.abs(before - g.timeLeft - 1) < 1e-6,
		`clock advanced ${before - g.timeLeft}s`,
	);
	g.dispose();
});
check("whole three-shift campaign clears by driving through pickups", () => {
	const g = make();
	g.tuning.invincible = true;
	g.tuning.autopilot = true;
	let levels = new Set([0]);
	for (let i = 0; i < 60 * 500 && !["won", "lost"].includes(g.phase); i++) {
		g.tick(1 / 60);
		levels.add(g.stage);
	}
	assert.equal(g.phase, "won", JSON.stringify(g.snapshot()));
	assert.equal(g.totalCollected, 312);
	assert.ok(g.gatesTaken >= 9);
	assert.ok(g.boostTime > 0);
	assert.deepEqual([...levels], [0, 1, 2, 3]);
	g.dispose();
});
check("attract mode continues through all shifts and loops", () => {
	const g = make({ attract: true });
	g.tuning.playerSpeed = 22;
	for (let i = 0; i < 60 * 300 && g.stage < 4; i++) g.tick(1 / 60);
	assert.ok(g.stage >= 4, `stage ${g.stage}, remaining ${g.remaining}`);
	assert.ok(g.lives > 0);
	g.dispose();
});
check("live defaults can be restored exactly", () => {
	const g = make();
	g.tuning.playerSpeed = 20;
	Object.assign(g.tuning, DEFAULTS);
	assert.equal(g.tuning.playerSpeed, 11.5);
	g.dispose();
});
console.log(JSON.stringify({ suite: "core", count, failures }));
if (failures) process.exitCode = 1;
