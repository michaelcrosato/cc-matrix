import "../vendor/engine/my-3d2dge.js";
import assert from "node:assert/strict";
import {
	clone,
	courseGarden,
	DEFAULTS,
	GARDENS,
} from "../src/content/gardens.js";
import {
	edgePoint,
	MazeGraph,
	MazeMover,
	reverse,
	validateLevel,
	worldPoint,
} from "../src/sim/maze.js";
import { STEP, World } from "../src/sim/world.js";
import { botCommands, runCampaign } from "./bot.mjs";

const close = (a, b, tolerance = 1e-7) =>
	assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const at = (m, p) => {
	m.place(Math.round(p.x), Math.round(p.y));
	m.x = p.x;
	m.y = p.y;
};
function situation(players = 1, level = 0) {
	const world = new World({ players, level, seed: 297728 });
	world.s.grace = 0;
	world.tuning.playerSpeed = 0;
	world.tuning.crawlerSpeed = 0;
	world.tuning.sentrySpeed = 0;
	for (const p of world.players) p.invuln = 0;
	for (const w of world.sentries) w.spin = 100;
	world.events = [];
	return world;
}
function tail(world, index = 0) {
	return world.positions(world.crawlers[index]).at(-1);
}
function staticCrawler(world, index = 0) {
	const c = world.crawlers[index];
	c.mode = "forage";
	c.target = [1, 1];
	return c;
}

export function runSimTests({ filter = null } = {}) {
	let passed = 0,
		failed = 0;
	const failures = [];
	const test = (name, fn) => {
		if (filter && !filter.test(name)) return;
		try {
			fn();
			passed++;
		} catch (error) {
			failed++;
			failures.push(`${name}: ${error.message}`);
		}
	};
	let soloEvidence = null,
		coopEvidence = null;
	test("five authored gardens validate and contain connected initial routes", () => {
		assert.equal(GARDENS.length, 5);
		for (const garden of GARDENS) {
			const result = validateLevel(garden);
			assert.equal(
				result.ok,
				true,
				JSON.stringify({ id: garden.id, errors: result.errors }),
			);
			const g = new MazeGraph(garden);
			assert.equal(g.distances(garden.nursery[0]).size, g.floors.length);
		}
	});
	test("all fifteen course spawn arrangements validate", () => {
		for (const garden of GARDENS)
			for (let wave = 0; wave < (garden.courses || 1); wave++) {
				const level = courseGarden(garden, wave);
				const result = validateLevel(level);
				assert.equal(
					result.ok,
					true,
					JSON.stringify({ garden: garden.id, wave, errors: result.errors }),
				);
			}
	});
	test("ordinary motion never crosses a wall and stops at blocked input", () => {
		const g = new MazeGraph(GARDENS[0]),
			m = new MazeMover({ cx: 1, cy: 1, speed: 1 });
		m.update(1, g, [0, -1]);
		assert.equal(m.x, 1);
		assert.equal(m.y, 1);
		assert.equal(m.moving, false);
		m.update(20, g, [1, 0]);
		assert.ok(m.x <= 13);
		assert.ok(g.walk([m.cx, m.cy]));
	});
	test("idle input does not invent a self-edge or delay movement", () => {
		const graph = new MazeGraph(GARDENS[0]),
			mover = new MazeMover({ cx: 1, cy: 1, speed: 1 });
		mover.update(0.1, graph, null);
		assert.equal(mover.moving, false);
		assert.equal(mover.travel, 0);
		mover.update(0.1, graph, [1, 0]);
		close(mover.x, 1.1);
	});
	test("buffered early turn takes the first legal opening", () => {
		const g = new MazeGraph(GARDENS[0]),
			m = new MazeMover({ cx: 1, cy: 7, speed: 1 });
		m.update(0.4, g, [1, 0]);
		m.update(4.1, g, [0, -1]);
		close(m.x, 5);
		close(m.y, 6.5);
		assert.deepEqual(m.dir, [0, -1]);
	});
	test("immediate reversal preserves position then reverses distance", () => {
		const g = new MazeGraph(GARDENS[0]),
			m = new MazeMover({ cx: 2, cy: 7, speed: 1 });
		m.update(0.4, g, [1, 0]);
		const x = m.x;
		m.update(0, g, [-1, 0]);
		close(m.x, x);
		assert.deepEqual(m._edge.a, [3, 7]);
		close(m._u, 0.6);
		m.update(0.2, g, [-1, 0]);
		close(m.x, 2.2);
		close(m.y, 7);
	});
	test("all paired wraps share graph navigation and reversible motion", () => {
		for (const garden of GARDENS) {
			const g = new MazeGraph(garden);
			for (const wrap of garden.wraps) {
				assert.deepEqual(g.edge(wrap.a, wrap.ad).b, wrap.b);
				assert.deepEqual(g.edge(wrap.b, wrap.bd).b, wrap.a);
				assert.equal(g.distance(wrap.a, wrap.b), 1);
				assert.equal(g.path(wrap.a, wrap.b).length, 2);
				const m = new MazeMover({ cx: wrap.a[0], cy: wrap.a[1], speed: 1 });
				m.update(0.25, g, wrap.ad);
				const p = { x: m.x, y: m.y };
				m.update(0, g, reverse(wrap.ad));
				close(m.x, p.x);
				close(m.y, p.y);
				m.update(0.25, g, reverse(wrap.ad));
				close(m.x, wrap.a[0]);
				close(m.y, wrap.a[1]);
				m.place(...wrap.a);
				m.update(1, g, wrap.ad);
				close(m.x, wrap.b[0]);
				close(m.y, wrap.b[1]);
			}
		}
	});
	test("wrap rendering samples never interpolate across the board centre", () => {
		for (const garden of GARDENS) {
			const g = new MazeGraph(garden);
			for (const wrap of garden.wraps) {
				const edge = g.edge(wrap.a, wrap.ad);
				for (const u of [0.1, 0.3, 0.49, 0.51, 0.7, 0.9]) {
					const p = edgePoint(edge, u);
					const expected = u < 0.5 ? wrap.a : wrap.b;
					assert.ok(Math.hypot(p.x - expected[0], p.y - expected[1]) <= 0.5);
				}
			}
		}
	});
	test("cell conversion has one 16-unit boundary", () => {
		assert.deepEqual(worldPoint({ x: 0, y: 0 }), [8, 8]);
		assert.deepEqual(worldPoint({ x: 3.25, y: 5.5 }), [60, 96]);
	});
	test("mover snapshot preserves a partially traversed wrap edge", () => {
		const g = new MazeGraph(GARDENS[0]),
			m = new MazeMover({ cx: 0, cy: 4, speed: 5.2 });
		m.update(0.12, g, [-1, 0]);
		const copy = MazeMover.restore(clone(m.save()));
		m.update(0.21, g, [-1, 0]);
		copy.update(0.21, g, [-1, 0]);
		assert.deepEqual(copy.save(), m.save());
	});
	test("chain positions follow travelled distance around corners", () => {
		const world = new World(),
			route = [
				[1, 5],
				[2, 5],
				[3, 5],
				[4, 5],
				[5, 5],
				[5, 6],
				[5, 7],
				[6, 7],
			];
		const c = {
			segments: 3,
			distance: 7,
			m: { x: 6, y: 7 },
			history: route.slice(1).map((b, i) => ({
				s: i,
				edge: world.graph.edge(route[i], world.graph.direction(route[i], b)),
			})),
		};
		const body = world.positions(c);
		close(body[0].x, 5.18);
		close(body[0].y, 7);
		close(body[1].x, 5);
		close(body[1].y, 6.36);
		close(body[2].x, 5);
		close(body[2].y, 5.54);
		assert.equal(body[2].tail, true);
	});
	test("chain history preserves wrap discontinuities", () => {
		const world = new World(),
			g = world.graph,
			c = {
				segments: 2,
				distance: 2.5,
				m: { x: 13.5, y: 4 },
				history: [
					{ s: 0, edge: g.edge([1, 4], [-1, 0]) },
					{ s: 1, edge: g.edge([0, 4], [-1, 0]) },
					{ s: 2, edge: g.edge([14, 4], [-1, 0]) },
				],
			};
		const body = world.positions(c);
		assert.ok(body.every((p) => p.x < 1 || p.x > 13));
	});
	test("only the final segment awards a bite; middle bodies are soft", () => {
		const world = situation(),
			c = staticCrawler(world);
		at(world.players[0].m, world.positions(c)[2]);
		world.step();
		assert.equal(c.segments, 6);
		assert.equal(world.s.stats.bites, 0);
		assert.equal(world.s.lives, 3);
		assert.equal(world.players[0].respawn, 0);
	});
	test("tail bites once, contracts coherently, and honours cooldown", () => {
		const world = situation(),
			c = staticCrawler(world);
		at(world.players[0].m, tail(world));
		world.step();
		assert.equal(c.segments, 5);
		assert.equal(world.s.stats.bites, 1);
		assert.equal(world.s.score, 3);
		close(world.s.fright, DEFAULTS.fright);
		at(world.players[0].m, tail(world));
		world.step(0.1);
		assert.equal(c.segments, 5);
		world.step(0.36);
		assert.equal(c.segments, 4);
		assert.equal(world.s.stats.bites, 2);
	});
	test("head stays dangerous even after its last segment is gone", () => {
		const world = situation();
		const c = staticCrawler(world);
		c.segments = 0;
		world.s.lives = 1;
		at(world.players[0].m, c.m);
		world.step();
		assert.equal(world.s.lives, 0);
		assert.equal(world.s.phase, "defeat");
		assert.equal(world.s.stats.hits, 1);
	});
	test("two heroes touching one tail score exactly one bite", () => {
		const world = situation(2),
			c = staticCrawler(world);
		for (const p of world.players) at(p.m, tail(world));
		world.step();
		assert.equal(c.segments, 5);
		assert.equal(world.s.stats.bites, 1);
		assert.equal(world.s.score, 3);
	});
	test("simultaneous bites on independent crawlers are both valid", () => {
		const world = situation(2, 3);
		world.crawlers.forEach((_crawler, i) => {
			staticCrawler(world, i);
			at(world.players[i].m, tail(world, i));
		});
		world.step();
		assert.equal(world.s.stats.bites, 2);
		assert.deepEqual(
			world.crawlers.map((c) => c.segments),
			[4, 4],
		);
		assert.equal(world.s.score, 6);
	});
	test("frightened sentry catches score once across simultaneous contacts", () => {
		const world = situation(2);
		staticCrawler(world);
		const sentry = world.sentries[0];
		sentry.spin = 0;
		world.s.fright = 5;
		for (const p of world.players) at(p.m, sentry.m);
		world.step();
		assert.equal(world.s.stats.catches, 1);
		assert.equal(world.s.score, 10);
		close(sentry.spin, DEFAULTS.recovery);
		world.step(0.2);
		assert.equal(world.s.stats.catches, 1);
	});
	test("fright expires before contact evaluation and a hunting sentry hurts", () => {
		const world = situation();
		staticCrawler(world);
		const sentry = world.sentries[0];
		sentry.spin = 0;
		world.s.fright = 0.005;
		at(world.players[0].m, sentry.m);
		world.step();
		assert.equal(world.s.fright, 0);
		assert.equal(world.s.stats.catches, 0);
		assert.equal(world.s.stats.hits, 1);
	});
	test("spinning sentry recovers after its real timer", () => {
		const world = situation();
		staticCrawler(world);
		const sentry = world.sentries[0];
		sentry.spin = 0.02;
		world.step(0.01);
		assert.ok(sentry.spin > 0);
		world.step(0.02);
		assert.equal(sentry.spin, 0);
		assert.ok(world.events.some((e) => e.type === "recover"));
	});
	test("shared final seed cannot be spent simultaneously by two players", () => {
		const world = situation(2);
		staticCrawler(world);
		world.s.seeds = 1;
		world.step(STEP, {
			0: { plant: true, actionId: "p0-1" },
			1: { plant: true, actionId: "p1-1" },
		});
		assert.equal(world.s.seeds, 0);
		assert.equal(world.bait.length, 1);
		assert.equal(world.s.stats.plants, 1);
		assert.equal(world.events.filter((e) => e.type === "invalid").length, 1);
	});
	test("duplicate and invalid planting preserve resources", () => {
		const world = situation();
		staticCrawler(world);
		const p = world.players[0];
		const result = world.plant(p, "one");
		assert.equal(result.accepted, true);
		assert.equal(world.s.seeds, 1);
		assert.equal(world.plant(p, "one").accepted, false);
		assert.equal(world.s.seeds, 1);
		assert.equal(world.plant(p, "two").accepted, false);
		assert.equal(world.bait.length, 1);
		assert.equal(world.s.seeds, 1);
	});
	test("bait attracts a nearby crawler and triggers a finite chew", () => {
		const world = situation(),
			c = staticCrawler(world);
		world.bait = [{ owner: 0, x: c.m.cx, y: c.m.cy }];
		world.step();
		assert.equal(c.mode, "bait");
		close(c.chew, DEFAULTS.chew);
		assert.equal(world.bait.length, 0);
		world.step(0.2);
		close(c.chew, DEFAULTS.chew - 0.2);
	});
	test("simultaneous dangerous contacts cost one shared life", () => {
		const world = situation(2),
			c = staticCrawler(world);
		for (const p of world.players) at(p.m, c.m);
		world.step();
		assert.equal(world.s.lives, 2);
		assert.equal(world.s.stats.hits, 1);
		assert.ok(world.players.every((p) => p.respawn > 0));
		world.step(0.1);
		assert.equal(world.s.lives, 2);
	});
	test("respawn returns to nursery with visible invulnerability", () => {
		const world = situation(),
			c = staticCrawler(world),
			p = world.players[0];
		at(p.m, c.m);
		world.step();
		world.step(0.75);
		assert.equal(p.respawn, 0);
		assert.deepEqual([p.m.cx, p.m.cy], world.garden.nursery[0]);
		assert.ok(p.invuln >= 2);
	});
	test("killed player cannot award a bite on the same tick", () => {
		const world = situation(),
			c = staticCrawler(world);
		at(c.m, tail(world));
		at(world.players[0].m, tail(world));
		world.step();
		assert.equal(world.s.stats.hits, 1);
		assert.equal(world.s.stats.bites, 0);
		assert.equal(c.segments, 6);
	});
	test("surviving teammate may finish while another hero is hit", () => {
		const world = situation(2),
			c = staticCrawler(world);
		c.segments = 1;
		world.s.lives = 2;
		at(world.players[0].m, c.m);
		at(world.players[1].m, tail(world));
		world.step();
		assert.equal(world.s.stats.hits, 1);
		assert.equal(world.s.stats.bites, 1);
		assert.equal(world.s.phase, "clear");
		assert.equal(world.s.score, 23);
	});
	test("team defeat wins over a simultaneous legitimate final bite", () => {
		const world = situation(2),
			c = staticCrawler(world);
		c.segments = 1;
		world.s.lives = 1;
		at(world.players[0].m, c.m);
		at(world.players[1].m, tail(world));
		world.step();
		assert.equal(c.segments, 0);
		assert.equal(world.s.stats.bites, 1);
		assert.equal(world.s.lives, 0);
		assert.equal(world.s.phase, "defeat");
		assert.equal(world.s.score, 3);
		assert.equal(
			world.events.some((e) => e.type === "clear"),
			false,
		);
	});
	test("garden clear restores at most one life up to the cap", () => {
		const world = situation(),
			c = staticCrawler(world);
		c.segments = 1;
		world.s.wave = (world.garden.courses || 1) - 1;
		world.s.lives = 2;
		at(world.players[0].m, tail(world));
		world.step();
		assert.equal(world.s.phase, "clear");
		assert.equal(world.s.lives, 3);
	});
	test("retry restores garden-entry score, resource and objective state", () => {
		const world = situation(),
			entry = clone(world.entry);
		staticCrawler(world);
		at(world.players[0].m, tail(world));
		world.step();
		world.s.seeds = 0;
		world.s.lives = 1;
		world.retry();
		assert.equal(world.s.score, entry.s.score);
		assert.equal(world.s.seeds, entry.s.seeds);
		assert.equal(world.s.lives, entry.s.lives);
		assert.deepEqual(
			world.crawlers.map((c) => c.segments),
			entry.crawlers.map((c) => c.segments),
		);
		assert.deepEqual(world.trees, entry.trees);
	});
	test("later-course retry rolls back all partial-course score and resources", () => {
		const world = situation();
		world.crawlers.forEach((c) => {
			c.segments = 0;
		});
		world.step();
		assert.equal(world.s.phase, "clear");
		world.nextGarden();
		assert.equal(world.s.wave, 1);
		world.s.score += 100;
		world.s.seeds = 0;
		world.retry();
		assert.equal(world.s.wave, 0);
		assert.equal(world.s.score, 0);
		assert.equal(world.s.seeds, 2);
		assert.equal(world.s.phase, "play");
	});
	test("leaving player removes actor and sprout without ending the team", () => {
		const world = new World({ players: 2 });
		world.plant(world.players[1]);
		world.removePlayer(1);
		assert.deepEqual(
			world.players.map((p) => p.id),
			[0],
		);
		assert.deepEqual(world.s.ids, [0]);
		assert.ok(world.bait.every((b) => b.owner !== 1));
		assert.equal(world.s.phase, "play");
	});
	test("all live tuning values serialize and Reset Defaults restores the preset", () => {
		const world = new World();
		for (const [k, value] of Object.entries(DEFAULTS)) {
			world.tune(k, value + 0.1);
			close(world.tuning[k], value + 0.1);
		}
		assert.equal(world.s.modified, true);
		const saved = world.snapshot();
		assert.deepEqual(saved.tuning, world.tuning);
		world.resetTuning();
		assert.deepEqual(world.tuning, { ...DEFAULTS });
		assert.equal(world.s.modified, true);
	});
	test("workshop validation rejects disconnected floor, bad wraps and unsafe spawns", () => {
		const disconnected = clone(GARDENS[0]);
		disconnected.rows[3] = `${disconnected.rows[3].slice(0, 6)}#.#${disconnected.rows[3].slice(9)}`;
		assert.equal(validateLevel(disconnected).ok, false);
		const badWrap = clone(GARDENS[0]);
		badWrap.wraps[0].b = [3, 3];
		assert.equal(validateLevel(badWrap).ok, false);
		const unsafe = clone(GARDENS[0]);
		unsafe.nursery[0] = [11, 7];
		assert.equal(validateLevel(unsafe).ok, false);
	});
	test("malformed imported wrap returns a validation error instead of throwing", () => {
		const invalid = clone(GARDENS[0]);
		invalid.wraps = [{ a: [0, 4] }];
		let result;
		assert.doesNotThrow(() => {
			result = validateLevel(invalid);
		});
		assert.equal(result.ok, false);
		assert.ok(result.errors.length > 0);
	});
	test("retry cannot leak an unmarked developer invulnerability capability", () => {
		const world = new World();
		world.dev("invulnerable");
		assert.equal(world.invulnerable, true);
		world.retry();
		assert.ok(!world.invulnerable || world.s.modified);
	});
	test("snapshot rejects an unsupported or missing version", () => {
		const world = new World();
		assert.throws(() => world.restore({ version: 999 }));
		assert.throws(() => world.restore(null));
	});
	test("snapshot continuation is deterministic through real commands", () => {
		const a = new World({ seed: 9812 });
		const commands = [];
		for (let i = 0; i < 240; i++) {
			const c = botCommands(a);
			commands.push(clone(c));
			a.step(STEP, c);
		}
		const snapshot = a.snapshot();
		const b = new World().restore(snapshot);
		for (let i = 0; i < 360; i++) {
			const c = botCommands(a);
			a.step(STEP, c);
			b.step(STEP, c);
		}
		assert.deepEqual(b.snapshot(), a.snapshot());
	});
	test("ordinary solo campaign reaches the finite ending without planting or cheats", () => {
		const result = runCampaign(1, 297728);
		soloEvidence = result;
		assert.equal(
			result.won,
			true,
			JSON.stringify({ ...result, world: undefined }),
		);
		assert.equal(result.modified, false);
		assert.equal(result.demo, false);
		assert.equal(result.world.invulnerable, undefined);
		assert.equal(result.stats.plants, 0);
		assert.equal(result.gardens.at(-1).level, 4);
		assert.ok(result.stats.bites >= 47);
	});
	test("ordinary co-op campaign reaches the same finite ending", () => {
		const result = runCampaign(2, 297728);
		coopEvidence = result;
		assert.equal(
			result.won,
			true,
			JSON.stringify({ ...result, world: undefined }),
		);
		assert.equal(result.modified, false);
		assert.equal(result.demo, false);
		assert.equal(result.world.players.length, 2);
		assert.equal(result.world.invulnerable, undefined);
		assert.equal(result.stats.plants, 0);
		assert.ok(result.stats.bites >= 47);
	});
	const evidence = (result) =>
		result
			? {
					won: result.won,
					players: result.players,
					seed: result.seed,
					seconds: result.seconds,
					score: result.score,
					lives: result.lives,
					stats: result.stats,
					gardens: result.gardens,
					modified: result.modified,
					demo: result.demo,
				}
			: null;
	return {
		passed,
		failed,
		failures,
		evidence: { solo: evidence(soloEvidence), coop: evidence(coopEvidence) },
	};
}

if (process.argv[1]?.endsWith("/sim-tests.mjs")) {
	const result = runSimTests();
	for (const failure of result.failures) console.log(`FAIL ${failure}`);
	console.log(`${result.passed} passed / ${result.failed} failed`);
	process.exitCode = result.failed ? 1 : 0;
}
