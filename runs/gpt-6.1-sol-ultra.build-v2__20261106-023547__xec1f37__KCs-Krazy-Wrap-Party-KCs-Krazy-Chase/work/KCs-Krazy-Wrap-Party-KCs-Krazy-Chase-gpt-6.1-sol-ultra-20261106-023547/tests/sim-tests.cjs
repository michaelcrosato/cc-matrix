"use strict";
const assert = require("node:assert/strict");
const S = require("../src/sim.js");
function run() {
	let passed = 0,
		failed = 0;
	const failures = [];
	function test(name, fn) {
		try {
			fn();
			passed++;
		} catch (e) {
			failed++;
			failures.push(name + ": " + e.message);
		}
	}
	const equal = (a, b) => assert.deepEqual(a, b);
	const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
	function quiet(players = 1) {
		const s = S.create({ players, seed: 5 });
		s.tuning.playerSpeed = 0;
		s.tuning.crawlerSpeed = 0;
		s.tuning.sentrySpeed = 0;
		s.trees = [];
		for (const a of s.sentries) {
			a.wake = 100;
			a.x = 12;
			a.y = 7;
			a.m.cell = [12, 7];
		}
		return s;
	}
	function set(a, x, y) {
		a.x = x;
		a.y = y;
		a.m = {
			cell: [Math.round(x), Math.round(y)],
			edge: null,
			u: 0,
			queued: null,
		};
		a.dir = [0, 0];
		a.respawn = 0;
		return a;
	}
	function chain(c, x = 7, y = 1, segments = 2) {
		set(c, x, y);
		c.segments = segments;
		c.history = Array.from({ length: segments + 4 }, (_, i) => [
			x - i - 1,
			y,
			x - i,
			y,
			1,
			0,
			1,
			0,
			0,
		]);
		c.biteTimer = 0;
		S._sampleBody(c);
	}
	function tick(s, commands = {}, frames = 1) {
		for (let i = 0; i < frames; i++) S.step(s, commands);
	}
	for (let i = 0; i < S.levels.length; i++)
		test(`garden ${i + 1} valid, original dimensions and complete connectivity`, () => {
			const l = S.levels[i];
			equal(S.validate(l), []);
			equal(
				[l.w, l.h],
				[
					[15, 9],
					[17, 11],
					[19, 11],
					[19, 13],
					[21, 13],
				][i],
			);
			const g = S.graph(l);
			for (const c of g.cells) assert.ok(g.path(l.nursery, c).length);
		});
	test("world conversion preserves cell coordinates", () => {
		near(S.cellToWorld(3.25), 52);
		near(S.worldToCell(52), 3.25);
	});
	test("graph treats walls and fractional coordinates as blocked", () => {
		const g = S.graph(S.levels[0]);
		assert.ok(!g.floor(3, 2));
		assert.ok(!g.floor(1.5, 1));
		assert.ok(!g.floor(-1, 1));
	});
	for (let j = 0; j < S.levels.length; j++)
		for (let k = 0; k < S.levels[j].wraps.length; k++)
			test(`garden ${j + 1} wrap ${k + 1} is paired and pathfinder uses it`, () => {
				const l = S.levels[j],
					pair = l.wraps[k],
					g = S.graph(l);
				assert.ok(
					g
						.neighbors(pair.a)
						.some(
							(n) =>
								n.wrap && JSON.stringify(n.cell) === JSON.stringify(pair.b),
						),
				);
				equal(g.path(pair.a, pair.b), [pair.a, pair.b]);
				assert.ok(
					g
						.neighbors(pair.b)
						.some(
							(n) =>
								n.wrap && JSON.stringify(n.cell) === JSON.stringify(pair.a),
						),
				);
			});
	test("wall input stops cleanly", () => {
		const s = quiet(),
			p = set(s.players[0], 2, 2);
		s.tuning.playerSpeed = 5.2;
		tick(s, { 1: { dir: [1, 0] } }, 60);
		near(p.x, 2);
		near(p.y, 2);
	});
	test("early turn queues until first legal junction", () => {
		const s = quiet(),
			p = set(s.players[0], 2, 1);
		s.tuning.playerSpeed = 5.2;
		tick(s, { 1: { dir: [1, 0] } }, 5);
		tick(s, { 1: { dir: [0, 1] } }, 50);
		assert.ok(p.x >= 6 && p.x <= 7);
		assert.ok(p.y > 1);
	});
	test("immediate reversal preserves smooth position", () => {
		const s = quiet(),
			p = set(s.players[0], 3, 1);
		s.tuning.playerSpeed = 3;
		tick(s, { 1: { dir: [1, 0] } }, 8);
		near(p.x, 3.4);
		tick(s, { 1: { dir: [-1, 0] } });
		near(p.x, 3.35);
	});
	test("click-to-move reaches its cell and stays stopped", () => {
		const s = quiet(),
			p = set(s.players[0], 1, 7);
		s.tuning.playerSpeed = 5.2;
		tick(s, { 1: { target: [2, 7] } });
		tick(s, {}, 80);
		near(p.x, 2);
		near(p.y, 7);
		equal(p.dir, [0, 0]);
	});
	test("directional movement cancels click-to-move immediately", () => {
		const s = quiet(),
			p = set(s.players[0], 3, 1);
		s.tuning.playerSpeed = 5.2;
		tick(s, { 1: { target: [8, 1] } }, 3);
		tick(s, { 1: { dir: [-1, 0] } });
		equal(p.clickTarget, null);
		assert.ok(p.dir[0] < 0);
	});
	test("stale stop command freezes a smooth actor without teleporting", () => {
		const s = quiet(),
			p = set(s.players[0], 3, 1);
		s.tuning.playerSpeed = 3;
		tick(s, { 1: { dir: [1, 0] } }, 8);
		const x = p.x;
		tick(s, { 1: { stop: true } }, 30);
		near(p.x, x);
		tick(s, { 1: { dir: [1, 0] } });
		assert.ok(p.x > x);
	});
	test("wrap movement never crosses maze center", () => {
		const s = quiet(),
			p = set(s.players[0], 0, 4);
		s.tuning.playerSpeed = 3;
		for (let i = 0; i < 20; i++) {
			tick(s, { 1: { dir: [-1, 0] } });
			assert.ok(p.x < 1 || p.x > 13);
		}
		assert.ok(s.stats.wraps > 0);
	});
	test("wrap reversal preserves rendered position", () => {
		const s = quiet(),
			p = set(s.players[0], 0, 4);
		s.tuning.playerSpeed = 3;
		tick(s, { 1: { dir: [-1, 0] } }, 5);
		const before = p.x;
		tick(s, { 1: { dir: [1, 0] } });
		near(p.x, before + 0.05);
	});
	test("body follows traveled corners at continuous spacing", () => {
		const s = quiet(),
			c = s.crawlers[0];
		chain(c, 7, 1, 4);
		S._sampleBody(c);
		for (let i = 0; i < c.body.length; i++) {
			near(c.body[i].x, 7 - (i + 1) * 0.87);
			near(c.body[i].y, 1);
		}
	});
	test("body wrap samples stay at paired mouths", () => {
		const s = quiet(),
			c = s.crawlers[0];
		chain(c, 0, 4, 1);
		c.history = [[14, 4, 0, 4, 1, 0, 1, 0, 1]];
		S._sampleBody(c);
		assert.ok(c.tail.x > 13 || c.tail.x < 1);
	});
	test("only final segment is edible and body contact is harmless", () => {
		const s = quiet(),
			c = s.crawlers[0];
		chain(c, 7, 1, 4);
		set(s.players[0], c.body[0].x, 1);
		tick(s);
		equal(c.segments, 4);
		equal(s.lives, 3);
		equal(s.stats.bites, 0);
	});
	test("tail bite shortens once and starts cooldown", () => {
		const s = quiet(),
			c = s.crawlers[0];
		chain(c, 7, 1, 3);
		set(s.players[0], c.tail.x, 1);
		tick(s);
		equal(c.segments, 2);
		equal(s.score, 3);
		assert.ok(c.biteTimer > 0);
		set(s.players[0], c.tail.x, 1);
		tick(s);
		equal(c.segments, 2);
		equal(s.score, 3);
	});
	test("two heroes biting one tail award once", () => {
		const s = quiet(2),
			c = s.crawlers[0];
		chain(c, 7, 1, 3);
		for (const p of s.players) set(p, c.tail.x, 1);
		tick(s);
		equal(c.segments, 2);
		equal(s.stats.bites, 1);
		equal(s.score, 3);
	});
	test("two independent tails may both be bitten on one tick", () => {
		const s = quiet(2),
			c = s.crawlers[0];
		chain(c, 7, 1, 2);
		const d = JSON.parse(JSON.stringify(c));
		d.id = 2;
		chain(d, 11, 1, 2);
		s.crawlers.push(d);
		set(s.players[0], c.tail.x, 1);
		set(s.players[1], d.tail.x, 1);
		tick(s);
		equal(
			s.crawlers.map((c) => c.segments),
			[1, 1],
		);
		equal(s.stats.bites, 2);
	});
	test("head remains dangerous at zero segments", () => {
		const s = quiet(),
			c = s.crawlers[0];
		chain(c, 7, 1, 0);
		const p = set(s.players[0], 7, 1);
		p.invuln = 0;
		s.lives = 1;
		tick(s);
		equal(s.status, "defeat");
		equal(s.lives, 0);
	});
	test("killed hero cannot bite on that tick", () => {
		const s = quiet(),
			c = s.crawlers[0];
		chain(c, 7, 1, 1);
		const p = set(s.players[0], 6.5, 1);
		p.invuln = 0;
		tick(s);
		equal(c.segments, 1);
		equal(s.stats.bites, 0);
		equal(s.lives, 2);
	});
	test("surviving teammate may finish a tail after other hero is hit", () => {
		const s = quiet(2),
			c = s.crawlers[0];
		chain(c, 7, 1, 1);
		set(s.players[0], 7, 1).invuln = 0;
		set(s.players[1], c.tail.x, 1).invuln = 0;
		tick(s);
		equal(s.status, "clear");
		equal(c.segments, 0);
		equal(s.stats.bites, 1);
	});
	test("team defeat wins over simultaneous surviving-player clear", () => {
		const s = quiet(2),
			c = s.crawlers[0];
		chain(c, 7, 1, 1);
		set(s.players[0], 7, 1).invuln = 0;
		set(s.players[1], c.tail.x, 1).invuln = 0;
		s.lives = 1;
		tick(s);
		equal(c.segments, 0);
		equal(s.status, "defeat");
		equal(s.score, 3);
	});
	test("simultaneous dangerous contacts cost one shared life", () => {
		const s = quiet(2),
			c = s.crawlers[0];
		chain(c, 7, 1, 2);
		for (const p of s.players) set(p, 7, 1).invuln = 0;
		tick(s);
		equal(s.lives, 2);
		assert.ok(s.players.every((p) => p.respawn > 0));
	});
	test("team damage grace prevents immediate second loss", () => {
		const s = quiet(2),
			c = s.crawlers[0];
		chain(c, 7, 1, 2);
		set(s.players[0], 7, 1).invuln = 0;
		set(s.players[1], 2, 1).invuln = 0;
		tick(s);
		set(s.players[1], 7, 1);
		tick(s);
		equal(s.lives, 2);
	});
	test("respawn returns to nursery with visible invulnerability", () => {
		const s = quiet(),
			c = s.crawlers[0];
		chain(c, 7, 1, 2);
		set(s.players[0], 7, 1).invuln = 0;
		tick(s);
		tick(s, {}, 40);
		equal(s.players[0].m.cell, s.level.nursery);
		assert.ok(s.players[0].invuln > 1.8);
	});
	test("bite frightens both sentries, with timed expiry", () => {
		const s = quiet(),
			c = s.crawlers[0];
		chain(c, 7, 1, 3);
		set(s.players[0], c.tail.x, 1);
		tick(s);
		assert.ok(
			s.sentries.every((a) => a.mode === "frightened" && a.fright === 5),
		);
		set(s.players[0], 1, 7);
		c.biteTimer = 100;
		tick(s, {}, 301);
		assert.ok(s.sentries.every((a) => a.mode === "pursue" && a.fright === 0));
	});
	test("frightened sentry catches once then spins harmlessly and recovers", () => {
		const s = quiet(),
			a = s.sentries[0];
		set(s.players[0], 2, 1);
		set(a, 2, 1);
		a.mode = "frightened";
		a.fright = 5;
		a.wake = 0;
		tick(s);
		equal(s.stats.catches, 1);
		equal(s.score, 10);
		equal(a.mode, "spin");
		tick(s, {}, 20);
		equal(s.stats.catches, 1);
		tick(s, {}, 132);
		equal(a.mode, "pursue");
	});
	test("refreshing fright never re-awards a spinning sentry", () => {
		const s = quiet(),
			c = s.crawlers[0],
			a = s.sentries[0];
		chain(c, 7, 1, 3);
		a.mode = "spin";
		a.spin = 2;
		set(s.players[0], c.tail.x, 1);
		tick(s);
		equal(a.mode, "spin");
		equal(s.stats.catches, 0);
	});
	test("optional tree gives one point and capped shared seed", () => {
		const s = quiet();
		s.trees = [{ x: 1, y: 7 }];
		s.seeds = 2;
		tick(s);
		equal(s.score, 1);
		equal(s.seeds, 3);
		equal(s.trees.length, 0);
		tick(s);
		equal(s.score, 1);
	});
	test("simultaneous final seed spending is authoritative", () => {
		const s = quiet(2);
		set(s.players[0], 1, 7);
		set(s.players[1], 3, 7);
		s.seeds = 1;
		tick(s, {
			1: { plant: true, actionId: "a" },
			2: { plant: true, actionId: "b" },
		});
		equal(s.seeds, 0);
		equal(s.bait.length, 1);
		equal(
			s.plantResults.map((r) => r.accepted),
			[true, false],
		);
	});
	test("invalid planting rejects without spending", () => {
		const s = quiet(),
			p = set(s.players[0], 2, 2);
		s.seeds = 2;
		tick(s, { 1: { plant: true, actionId: "bad", plantTarget: [3, 2] } });
		equal(s.seeds, 2);
		equal(s.bait.length, 0);
		equal(s.plantResults[0].accepted, false);
	});
	test("held plant and repeated action id cannot duplicate spending", () => {
		const s = quiet();
		tick(s, { 1: { plant: true, actionId: "once" } }, 10);
		equal(s.seeds, 2);
		equal(s.bait.length, 1);
		equal(s.plantResults.length, 1);
		s.bait = [];
		tick(s, { 1: { plant: true, actionId: "once" } });
		equal(s.seeds, 2);
	});
	test("respawning hero planting is acknowledged as rejected", () => {
		const s = quiet();
		s.players[0].respawn = 0.5;
		tick(s, { 1: { plant: true, actionId: "dead-action" } });
		equal(s.seeds, 3);
		equal(s.plantResults, [
			{ id: 1, actionId: "dead-action", accepted: false },
		]);
	});
	test("one active sprout per keeper", () => {
		const s = quiet();
		tick(s, { 1: { plant: true, actionId: "one" } });
		tick(s, { 1: { plant: false } });
		tick(s, { 1: { plant: true, actionId: "two" } });
		equal(s.bait.length, 1);
		equal(s.seeds, 2);
	});
	test("crawler consumes bait and pauses in dangerous chew state", () => {
		const s = quiet(),
			c = s.crawlers[0];
		chain(c, 7, 1, 2);
		s.bait = [{ owner: 1, x: 7, y: 1, age: 0 }];
		tick(s);
		equal(s.bait.length, 0);
		equal(c.mode, "chew");
		near(c.chew, 0.9);
	});
	test("clear restores one capped life and awards base twenty", () => {
		const s = quiet(),
			c = s.crawlers[0];
		chain(c, 7, 1, 1);
		set(s.players[0], c.tail.x, 1);
		s.lives = 2;
		tick(s);
		equal(s.status, "clear");
		equal(s.lives, 3);
		equal(s.score, 23);
	});
	test("combo caps at three and expires", () => {
		const s = quiet(),
			c = s.crawlers[0];
		chain(c, 7, 1, 16);
		for (let i = 0; i < 10; i++) {
			set(s.players[0], c.tail.x, 1);
			c.biteTimer = 0;
			tick(s);
		}
		equal(s.combo.mult, 3);
		set(s.players[0], 1, 7);
		c.biteTimer = 100;
		tick(s, {}, 361);
		equal(s.combo.mult, 1);
		equal(s.combo.count, 0);
	});
	test("retry rolls score and resources back to exact entry state", () => {
		const s = S.create({ seed: 5 });
		const expected = JSON.stringify(s.checkpoint);
		s.score = 222;
		s.seeds = 0;
		s.lives = 0;
		s.status = "defeat";
		S.retry(s);
		equal(JSON.stringify(s.checkpoint), expected);
		equal(s.score, 0);
		equal(s.seeds, 3);
		equal(s.lives, 3);
		equal(s.status, "playing");
	});
	test("next garden carries shared score, lives and stats", () => {
		const s = S.create({ seed: 5, players: 2 });
		s.status = "clear";
		s.score = 123;
		s.stats.bites = 6;
		s.lives = 2;
		s.seeds = 0;
		S.next(s);
		equal(s.garden, 1);
		equal(s.score, 123);
		equal(s.lives, 2);
		equal(s.seeds, 2);
		equal(
			s.players.map((p) => p.id),
			[1, 2],
		);
		equal(s.stats.bites, 6);
		equal(s.checkpoint.score, 123);
	});

	test("modified run status survives garden retry", () => {
		const s = S.create({ seed: 1982 });
		s.modified = true;
		S.retry(s);
		assert.ok(s.modified);
		assert.ok(s.checkpoint.modified);
	});
	test("retry cannot restore a departed teammate", () => {
		const s = S.create({ players: 2, seed: 1982 });
		S.removePlayer(s, 2);
		S.retry(s);
		equal(
			s.players.map((p) => p.id),
			[1],
		);
		equal(
			s.checkpoint.players.map((p) => p.id),
			[1],
		);
	});
	test("final report advances to finite victory", () => {
		const s = S.create({ garden: 4 });
		s.status = "clear";
		S.next(s);
		equal(s.status, "victory");
		tick(s, {}, 60);
		equal(s.time, 0);
	});
	test("custom gardens and altered tuning are modified records", () => {
		assert.ok(S.create({ custom: S.levels[0] }).modified);
		assert.ok(S.create({ tuning: { playerSpeed: 8 } }).modified);
		assert.ok(!S.create().modified);
	});
	test("snapshot restore deterministic continuation", () => {
		const a = S.create({ seed: 5 });
		tick(a, { 1: { dir: [1, 0] } }, 25);
		const b = S.restore(S.snapshot(a));
		for (let i = 0; i < 80; i++) {
			const command = { 1: { dir: i < 30 ? [0, -1] : [-1, 0] } };
			S.step(a, command);
			S.step(b, command);
		}
		equal(S.snapshot(a), S.snapshot(b));
	});
	test("corrupt snapshots are rejected", () => {
		assert.throws(() => S.restore("{oops"));
		assert.throws(() => S.restore({ version: 55 }));
	});

	test("corrupt saved actor, resource, tuning and checkpoint data are rejected", () => {
		const cases = [
			(s) => (s.players = [null]),
			(s) => (s.players[0].m = null),
			(s) => (s.crawlers[0].history = [null]),
			(s) => (s.sentries[0].spin = "forever"),
			(s) => (s.seeds = 99),
			(s) => (s.tuning.playerSpeed = "fast"),
			(s) => (s.score = null),
			(s) => (s.checkpoint.players = [null]),
		];
		for (const mutate of cases) {
			const s = S.create({ seed: 1982 });
			mutate(s);
			assert.throws(() => S.restore(s), /Invalid garden snapshot/);
		}
	});
	test("workshop edits invalidate graph cache and validation explains isolation", () => {
		const l = JSON.parse(JSON.stringify(S.levels[0])),
			g = S.graph(l);
		assert.ok(g.floor(2, 1));
		l.rows[1] = l.rows[1].slice(0, 2) + "#" + l.rows[1].slice(3);
		assert.ok(!S.graph(l).floor(2, 1));
		l.rows = l.rows.map((r, y) => (y === 7 ? "#.#" + "#".repeat(l.w - 3) : r));
		assert.ok(S.validate(l).length);
	});
	test("malformed workshop wrap and misplaced entities return useful errors", () => {
		const l = JSON.parse(JSON.stringify(S.levels[0]));
		l.wraps = [null, { a: [1, 1], b: [14, 4] }];
		l.sentries = [null, [2, 1]];
		l.trees = [null];
		assert.ok(S.validate(l).length >= 3);
	});
	test("departing player and owned bait removed safely", () => {
		const s = S.create({ players: 2 });
		s.bait = [
			{ owner: 1, x: 1, y: 1 },
			{ owner: 2, x: 2, y: 1 },
		];
		S.removePlayer(s, 2);
		equal(
			s.players.map((p) => p.id),
			[1],
		);
		equal(s.bait.length, 1);
		equal(s.bait[0].owner, 1);
	});

	test("workshop arbitrary JSON field types return errors without throwing", () => {
		const values = [null, 1, "x", {}, [], true];
		for (const field of [
			"nursery",
			"rows",
			"crawlers",
			"sentries",
			"wraps",
			"trees",
		])
			for (const value of values) {
				const l = JSON.parse(JSON.stringify(S.levels[0]));
				l[field] = value;
				assert.doesNotThrow(() => S.validate(l));
			}
		for (const field of ["crawlers", "sentries", "wraps", "trees"])
			for (const value of values) {
				const l = JSON.parse(JSON.stringify(S.levels[0]));
				l[field] = [value];
				assert.doesNotThrow(() => S.validate(l));
			}
		for (const value of values) {
			const l = JSON.parse(JSON.stringify(S.levels[0]));
			l.crawlers[0].spawn = value;
			assert.doesNotThrow(() => S.validate(l));
		}
	});
	test("first tail has a short safe wrap intercept from nursery", () => {
		const s = S.create({ seed: 1982 }),
			c = s.crawlers[0],
			g = S.graph(s.level),
			target = [Math.round(c.tail.x), Math.round(c.tail.y)],
			path = g.path(s.level.nursery, target);
		assert.ok(path.length <= 7);
		assert.ok(path.some((cell, i) => i && g.edge(path[i - 1], cell).wrap));
		for (const cell of path)
			assert.ok(Math.hypot(cell[0] - c.x, cell[1] - c.y) > 2);
	});
	function campaign(players, seed) {
		const s = S.create({ players, seed });
		for (let i = 0; i < 20000 && s.status === "playing"; i++) {
			const cmd = {};
			for (const p of s.players) cmd[p.id] = S.bot(s, p.id);
			S.step(s, cmd);
			if (s.status === "clear") S.next(s);
		}
		equal(s.status, "victory");
		equal(s.stats.bites, 47);
		assert.ok(s.lives > 0);
		assert.ok(!s.modified);
		return s;
	}
	test("normal-command seeded solo campaign reaches ending without cheats", () =>
		campaign(1, 5));
	test("normal-command seeded simultaneous co-op campaign reaches ending", () =>
		campaign(2, 271828));

	test("actual app seed1982 solo normal-command campaign", () =>
		campaign(1, 1982));
	test("actual app seed1982 co-op normal-command campaign", () =>
		campaign(2, 1982));
	for (let garden = 0; garden < 5; garden++)
		test(`garden ${garden + 1} has a zero-bait clear route`, () => {
			const s = S.create({ garden, seed: garden < 3 ? 1 : 2 });
			for (let i = 0; i < 10000 && s.status === "playing"; i++)
				S.step(s, { 1: S.bot(s, 1, { noBait: true }) });
			equal(s.status, "clear");
			equal(s.stats.plants, 0);
			assert.ok(!s.modified);
		});
	return { passed, failed, failures };
}
module.exports = run;
if (require.main === module) {
	const r = run();
	for (const f of r.failures) console.error("FAIL " + f);
	console.log(`${r.passed} passed, ${r.failed} failed`);
	process.exitCode = r.failed ? 1 : 0;
}
