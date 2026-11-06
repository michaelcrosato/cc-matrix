import assert from "node:assert/strict";
import "../src/content.js";
import "../src/sim.js";
const checks = [];
let passed = 0,
	failed = 0;
const test = (name, fn) => checks.push({ name, fn });
const snew = (o = {}) => new ChompSim(o);
const put = (a, x, y, dir = 1) =>
	Object.assign(a, {
		x,
		y,
		cx: x,
		cy: y,
		tx: x,
		ty: y,
		prevX: x,
		prevY: y,
		p: 0,
		moving: false,
		dir,
		delay: 0,
	});
const isolate = (s) => {
	for (const f of s.foods) f.alive = false;
	for (const e of s.enemies) e.state = "penned";
	s.foods[11].alive = true;
	put(s.foods[11], 17, 13);
	s.config.foodBase = 0;
	s.config.foodFinal = 0;
	s.config.enemySpeed = 0;
};
const run = (s, max = 1200) => {
	while (!["won", "lost"].includes(s.phase) && s.elapsed < max) {
		const intents = Object.fromEntries(
			s.players.map((p) => [p.seat, s.botIntent(p.seat)]),
		);
		s.step(1 / 60, intents);
	}
	return s;
};
test("authored boards validate", () => {
	for (const b of ChompContent.stages)
		assert.equal(ChompContent.validate(b).ok, true, b.name);
});
test("generated sample is reproducible and connected", () => {
	for (let i = 0; i < 50; i++) {
		const a = ChompContent.generate("SIM" + i),
			b = ChompContent.generate("SIM" + i);
		assert.deepEqual(a, b);
		assert.equal(ChompContent.validate(a).ok, true);
	}
});
test("12 distinct moving foods have 8/4 split", () => {
	const s = snew();
	assert.equal(new Set(s.foods.map((f) => f.id)).size, 12);
	assert.equal(s.foods.filter((f) => f.power).length, 4);
	const start = s.foods.map((f) => [f.x, f.y]);
	s.step(0.5, {});
	assert(
		s.foods.some(
			(f, i) => Math.hypot(f.x - start[i][0], f.y - start[i][1]) > 0.1,
		),
	);
});
test("food survivor speed grows to ordinary hero speed", () => {
	const s = snew();
	let v = 0;
	for (let n = 12; n >= 1; n--) {
		assert(s.foodSpeed(n) >= v);
		v = s.foodSpeed(n);
	}
	assert.equal(v, s.config.playerSpeed);
});
test("identical inputs produce identical state", () => {
	const a = snew({ seed: "same" }),
		b = snew({ seed: "same" });
	for (let i = 0; i < 1000; i++) {
		const input = { 1: { dir: Math.floor(i / 80) % 4, action: i === 300 } };
		a.step(1 / 120, input);
		b.step(1 / 120, input);
	}
	assert.deepEqual(a.snapshot(), b.snapshot());
});
test("mid-edge reversal preserves position", () => {
	const s = snew();
	const p = s.players[0];
	put(p, 1, 1, 1);
	s.step(0.05, { 1: { dir: 1 } });
	const x = p.x;
	assert(p.moving);
	s.setIntent(p, { dir: 3 }, 1 / 120);
	assert(Math.abs(p.x - x) < 1e-9);
	s.step(0.025, { 1: { dir: 3 } });
	assert(p.x < x);
});
test("early perpendicular turn is buffered to centre", () => {
	const s = snew();
	isolate(s);
	const p = s.players[0];
	let turn = null;
	for (let y = 1; y < s.height - 1 && !turn; y++)
		for (let x = 1; x < s.width - 1 && !turn; x++)
			for (let d = 0; d < 4 && !turn; d++) {
				const n = s.neighbor(x, y, d);
				if (!n) continue;
				for (const nd of [(d + 1) % 4, (d + 3) % 4])
					if (s.neighbor(n.x, n.y, nd)) turn = { x, y, d, n, nd };
			}
	assert(turn);
	put(p, turn.x, turn.y, turn.d);
	s.step(0.1, { 1: { dir: turn.d } });
	s.step(0.05, { 1: { dir: turn.nd } });
	s.step(0.04, { 1: { dir: null } });
	assert.equal(p.dir, turn.nd);
});
test("closed edges never admit motion", () => {
	const s = snew();
	isolate(s);
	const p = s.players[0];
	put(p, 1, 1, 0);
	s.step(0.4, { 1: { dir: 0 } });
	assert.equal(p.y, 1);
	assert.equal(p.x, 1);
});
test("held direction survives cell boundaries", () => {
	const s = snew();
	isolate(s);
	const p = s.players[0];
	put(p, 1, 1, 1);
	s.step(0.5, { 1: { dir: 1 } });
	assert(p.x > 2.5);
});
test("swept collision catches actors swapping endpoints", () => {
	const s = snew();
	assert.equal(
		s.swept(
			{ prevX: 1, prevY: 1, x: 2, y: 1 },
			{ prevX: 2, prevY: 1, x: 1, y: 1 },
		),
		true,
	);
});
test("tunnel graph and seam encounters agree", () => {
	const s = snew({ board: ChompContent.stages[1], mode: "custom" });
	assert.deepEqual(s.neighbor(0, 7, 3), {
		x: s.width - 1,
		y: 7,
		dir: 3,
		tunnel: true,
	});
	assert(
		s.swept(
			{ prevX: 0.05, prevY: 7, x: s.width - 0.05, y: 7 },
			{ prevX: s.width - 0.25, prevY: 7, x: s.width - 0.25, y: 7 },
		),
	);
});
test("tunnel traversal carries continuous wrapped motion", () => {
	const s = snew({ board: ChompContent.stages[1], mode: "custom" });
	isolate(s);
	const p = s.players[0];
	put(p, 0, 7, 3);
	s.step(0.1, { 1: { dir: 3 } });
	assert(p.x > s.width - 1);
	s.step(0.12, { 1: { dir: 3 } });
	assert(p.x < s.width - 1);
	assert.equal(s.stats.tunnels, 1);
});
test("food collision collects identity once", () => {
	const s = snew();
	isolate(s);
	const p = s.players[0];
	put(p, 1, 1);
	const f = s.foods[0];
	f.alive = true;
	put(f, 1, 1);
	s.step(1 / 120, {});
	const score = s.score;
	s.step(0.1, {});
	assert.equal(s.score, score);
	assert.equal(f.alive, false);
});
test("simultaneous power pickup reverses predator encounter", () => {
	const s = snew();
	isolate(s);
	s.grace = 0;
	const p = s.players[0];
	put(p, 1, 1);
	p.invulnerable = 0;
	const f = s.foods.find((f) => f.power);
	f.alive = true;
	put(f, 1, 1);
	const e = s.enemies[0];
	put(e, 1, 1);
	e.state = "hunting";
	s.step(1 / 120, {});
	assert.equal(s.lives, 5);
	assert.equal(e.state, "returning");
	assert.equal(s.score, 8);
});
test("power refresh bounded, warning then expiration reset chain", () => {
	const s = snew();
	isolate(s);
	s.power = 0.01;
	s.chain = 2;
	s.step(0.02, {});
	assert.equal(s.power, 0);
	assert.equal(s.chain, 0);
	s.power = 1.51;
	s.step(0.02, {});
	assert(s.events.some((e) => e.type === "power-warning"));
});
test("returning predator harmless and cannot rescore", () => {
	const s = snew();
	isolate(s);
	s.power = 5;
	s.grace = 0;
	const p = s.players[0];
	put(p, 1, 1);
	p.invulnerable = 0;
	const e = s.enemies[0];
	put(e, 1, 1);
	e.state = "returning";
	s.step(0.02, {});
	assert.equal(s.lives, 5);
	assert.equal(s.score, 0);
});
test("catch chain awards 5/10/20 and refresh resets", () => {
	const s = snew();
	isolate(s);
	s.power = 6;
	const p = s.players[0];
	put(p, 1, 1);
	for (const e of s.enemies) {
		put(e, 1, 1);
		e.state = "frightened";
	}
	s.step(1 / 120, {});
	assert.equal(s.score, 35);
	assert.equal(s.chain, 3);
});
test("single team grace prevents multiple overlapping damage", () => {
	const s = snew({ seats: [1, 2] });
	isolate(s);
	s.grace = 0;
	for (const p of s.players) {
		put(p, 1, 1);
		p.invulnerable = 0;
	}
	for (const e of s.enemies) {
		put(e, 1, 1);
		e.state = "hunting";
	}
	s.step(1 / 120, {});
	assert.equal(s.lives, 4);
	assert.equal(s.stats.hits, 1);
	assert(s.players.some((p) => p.invulnerable > 1));
});
test("zero lives ends run", () => {
	const s = snew();
	isolate(s);
	s.lives = 1;
	s.grace = 0;
	const p = s.players[0];
	put(p, 1, 1);
	p.invulnerable = 0;
	const e = s.enemies[0];
	put(e, 1, 1);
	e.state = "hunting";
	s.step(1 / 120, {});
	assert.equal(s.phase, "lost");
	assert.equal(s.lives, 0);
});
test("final food wins before simultaneous fatal contact", () => {
	const s = snew();
	isolate(s);
	s.lives = 1;
	s.grace = 0;
	const p = s.players[0];
	put(p, 1, 1);
	p.invulnerable = 0;
	const f = s.foods[11];
	put(f, 1, 1);
	const e = s.enemies[0];
	put(e, 1, 1);
	e.state = "hunting";
	s.step(1 / 120, {});
	assert.equal(s.phase, "clear");
	assert.equal(s.stats.hits, 0);
});
test("gate orientation has one opening and all-state reachability", () => {
	const s = snew({ board: ChompContent.stages[2], mode: "custom" });
	const c = s.board.gateCenter;
	for (let d = 0; d < 4; d++) {
		s.gate.orientation = d;
		assert.equal(s.neighbors(c.x, c.y).length, 1);
		assert.equal(s.neighbors(c.x, c.y)[0].dir, d);
		const reachable = s.distances(s.board.spawn[0]);
		for (const f of s.foods) assert(reachable.has(key(f.x, f.y)));
	}
});
function key(x, y) {
	return x + "," + y;
}
test("gate defers closure over occupied crossing", () => {
	const s = snew({ board: ChompContent.stages[2], mode: "custom" });
	isolate(s);
	const c = s.board.gateCenter,
		p = s.players[0];
	put(p, c.x, c.y);
	Object.assign(p, {
		moving: true,
		tx: c.x,
		ty: c.y - 1,
		p: 0.4,
		dir: 0,
		x: c.x,
		y: c.y - 0.4,
	});
	s.gate.remaining = 0.001;
	s.step(1 / 120, { 1: { dir: 0 } });
	assert.equal(s.gate.orientation, 0);
	s.step(0.2, { 1: { dir: 0 } });
	assert.equal(s.gate.orientation, 1);
});
test("chirp cooldown reveals without changing topology", () => {
	const s = snew({ board: ChompContent.stages[3], mode: "custom" });
	const before = s.neighbors(1, 1);
	s.step(0.01, { 1: { action: true } });
	assert(s.reveal > 0);
	assert(s.chirpCooldown > 3);
	s.step(0.1, { 1: { action: false } });
	s.step(0.1, { 1: { action: true } });
	assert.equal(s.stats.chirps, 1);
	assert.deepEqual(s.neighbors(1, 1), before);
});
test("live tuning changes next-tick speed and defaults reset", () => {
	const s = snew();
	isolate(s);
	const p = s.players[0];
	put(p, 1, 1, 1);
	s.configure({ playerSpeed: 3 });
	s.step(0.1, { 1: { dir: 1 } });
	assert(Math.abs(p.x - 1.3) < 1e-8);
	s.configure(ChompSim.DEFAULTS);
	assert.equal(s.config.playerSpeed, 6);
});
test("stage transition clears temporary state without score reset", () => {
	const s = snew();
	s.score = 21;
	s.power = 5;
	s.phase = "clear";
	s.clearTimer = 0.01;
	s.step(0.02, {});
	assert.equal(s.stageIndex, 1);
	assert.equal(s.score, 21);
	assert.equal(s.power, 0);
	assert.equal(s.remaining, 12);
	assert.equal(s.players[0].desired, null);
});
test("leave removes only real departing seat", () => {
	const s = snew({ seats: ["a", "b"] });
	s.removeSeat("a");
	assert.deepEqual(
		s.players.map((p) => p.seat),
		["b"],
	);
	assert(s.stats.perSeat.a);
});
test("whole campaign normal solo legal-input playthrough", () => {
	const s = run(snew());
	assert.equal(s.phase, "won");
	assert.equal(s.stats.food, 72);
	assert.equal(s.stats.powered, 24);
	assert.equal(s.stats.stages, 6);
	assert.equal(s.stats.finalCatches.length, 6);
	assert(s.lives > 0);
	assert(s.stats.tunnels > 0);
	assert(s.stats.chirps > 0);
	assert.equal(s.config.invulnerable, false);
});
test("whole campaign normal co-op legal-input final catches", () => {
	const s = run(snew({ seats: [1, 2] }));
	assert.equal(s.phase, "won");
	assert.equal(s.stats.food, 72);
	assert.equal(s.stats.finalCatches.length, 6);
	assert(s.stats.perSeat[1].food > 0);
	assert(s.stats.perSeat[2].food > 0);
	assert(s.lives > 0);
});
test("seeded normal boards allow ordinary-input completion", () => {
	for (const seed of [
		"KIWI",
		"MANGO",
		"PLUM",
		"PEAR",
		"MELON",
		"BERRY",
		"LIME",
		"APPLE",
		...Array.from({ length: 50 }, (_, i) => "FINAL-SAMPLE-" + i),
	]) {
		const s = run(snew({ mode: "remix", seed }), 600);
		assert.equal(
			s.phase,
			"won",
			seed + ": " + s.phase + " remaining " + s.remaining,
		);
	}
});
test("terminal state stays silent and frozen", () => {
	const s = snew();
	s.phase = "lost";
	const before = s.snapshot();
	s.step(1, { 1: { dir: 1, action: true } });
	assert.deepEqual(s.snapshot(), before);
});
test("authored periodic reveal interval is honored", () => {
	const board = ChompContent.clone(ChompContent.stages[3]);
	board.revealPeriod = 4;
	const s = snew({ mode: "custom", board });
	s.reveal = 0;
	s.stageElapsed = 3.995;
	s.step(0.01, {});
	assert(s.reveal > 1);
});
test("returner follows harmless route home and recharges", () => {
	const s = snew({ mode: "custom", board: ChompContent.stages[2] });
	isolate(s);
	const e = s.enemies[0];
	put(e, 1, 1);
	e.state = "returning";
	let recharged = false;
	for (let i = 0; i < 3000; i++) {
		s.step(1 / 120, {});
		if (e.state === "recharging") {
			recharged = true;
			break;
		}
	}
	assert(recharged);
	assert(s.events.some((ev) => ev.type === "enemy-recharge"));
});
for (const { name, fn } of checks) {
	try {
		fn();
		passed++;
	} catch (e) {
		failed++;
		console.error("FAIL " + name + ": " + e.message);
	}
}
console.log(`${passed} passed, ${failed} failed, 0 skipped (simulation)`);
if (failed) process.exitCode = 1;
