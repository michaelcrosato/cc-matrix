import "../vendor/engine/my-3d2dge.js";
import assert from "node:assert/strict";
import { clone, DEFAULTS, GARDENS, TUNING } from "../src/content/gardens.js";
import { NativeControls } from "../src/input/controls.js";
import { MazeGraph, MazeMover, validateLevel } from "../src/sim/maze.js";
import { World } from "../src/sim/world.js";
import { GardenStore } from "../src/tools/storage.js";
import { Workshop } from "../src/tools/workshop.js";
import { GardenView } from "../src/view/garden-view.js";
import { GardenRigs } from "../src/view/rigs.js";

class Memory {
	constructor() {
		this.data = new Map();
	}
	getItem(k) {
		return this.data.get(k) || null;
	}
	setItem(k, v) {
		this.data.set(k, v);
	}
	removeItem(k) {
		this.data.delete(k);
	}
}
export function runToolsTests() {
	let passed = 0,
		failed = 0;
	const failures = [];
	const test = (name, fn) => {
		try {
			fn();
			passed++;
		} catch (e) {
			failed++;
			failures.push(`${name}: ${e.message}`);
		}
	};
	test("workshop floor/wall edits, undo and redo preserve the schema", () => {
		const e = new Workshop();
		e.cursor = [2, 2];
		e.brush = 0;
		e.edit();
		assert.equal(e.level.rows[2][2], ".");
		e.undo();
		assert.equal(e.level.rows[2][2], "#");
		e.redo();
		assert.equal(e.level.rows[2][2], ".");
	});
	test("workshop tree brush toggles and undo restores", () => {
		const e = new Workshop();
		e.brush = 2;
		e.edit([3, 1]);
		assert.ok(e.level.trees.some((c) => c.join() === "3,1"));
		e.undo();
		assert.ok(!e.level.trees.some((c) => c.join() === "3,1"));
	});
	test("workshop nursery and sentry commands set actual spawns", () => {
		const e = new Workshop();
		e.brush = 3;
		e.edit([2, 7]);
		e.brush = 5;
		e.edit([11, 3]);
		e.brush = 6;
		e.edit([13, 1]);
		assert.deepEqual(e.level.nursery, [
			[2, 7],
			[3, 7],
		]);
		assert.deepEqual(e.level.sentries, [
			[11, 3],
			[13, 1],
		]);
	});
	test("workshop wraps require a second legal edge mouth", () => {
		const e = new Workshop();
		e.brush = 7;
		e.edit([0, 3]);
		assert.ok(e.pendingWrap);
		assert.ok(!e.validate().ok);
		e.edit([14, 3]);
		assert.equal(e.pendingWrap, null);
		assert.ok(e.validate().ok);
		assert.equal(e.level.wraps.length, 2);
	});
	test("workshop route command makes a playable crawler from continuous path", () => {
		const e = new Workshop();
		e.brush = 4;
		e.edit([4, 7]);
		e.edit([11, 7]);
		assert.equal(e.level.crawlers[0].route.length, 8);
		assert.ok(e.validate().ok);
	});
	test("workshop export/import preserves a named authored creation", () => {
		const e = new Workshop();
		e.name = "MUNCH PARK";
		e.setTheme(3);
		const s = e.export();
		const f = new Workshop();
		assert.ok(f.import(s));
		assert.deepEqual(f.level, e.level);
		assert.equal(f.name, e.name);
		assert.ok(validateLevel(f.level).ok);
	});
	test("invalid workshop imports explain and leave edits intact", () => {
		const e = new Workshop(),
			before = JSON.stringify(e.level);
		assert.equal(e.import("{oops"), false);
		assert.equal(e.import(JSON.stringify({ version: 12 })), false);
		const d = JSON.parse(e.export());
		d.level.wraps = [{ a: [0, 4] }];
		assert.equal(e.import(JSON.stringify(d)), false);
		assert.equal(JSON.stringify(e.level), before);
		assert.ok(e.message.length > 10);
	});
	test("workshop reset is undoable", () => {
		const e = new Workshop();
		e.brush = 0;
		e.edit([2, 2]);
		e.reset();
		assert.equal(e.level.rows[2][2], "#");
		e.undo();
		assert.equal(e.level.rows[2][2], ".");
	});
	test("workshop validation points to the disconnected error", () => {
		const e = new Workshop();
		e.brush = 0;
		e.edit([2, 2]);
		e.brush = 1;
		for (const c of [
			[1, 2],
			[2, 1],
			[3, 2],
			[2, 3],
		])
			e.edit(c);
		const v = e.validate();
		assert.ok(!v.ok);
		assert.deepEqual(e.cursor, v.errors[0].cell);
	});
	test("saved creations reload by schema and reject invalid geometry", () => {
		const m = new Memory(),
			s = new GardenStore(m),
			e = new Workshop();
		assert.ok(s.saveMaze("First feast", e.level));
		const other = new GardenStore(m);
		assert.equal(other.creations()[0].name, "First feast");
		const bad = clone(e.level);
		bad.rows[0] = ".";
		assert.equal(s.saveMaze("Bad", bad), false);
		assert.equal(s.creations().length, 1);
	});
	test("campaign checkpoint stores garden entry and protects modified/demo runs", () => {
		const s = new GardenStore(new Memory()),
			w = new World();
		w.s.score = 99;
		s.checkpoint(w);
		assert.equal(s.loadCheckpoint().snapshot.s.score, 0);
		w.s.modified = true;
		assert.equal(s.checkpoint(w), false);
		w.s.modified = false;
		w.s.demo = true;
		assert.equal(s.checkpoint(w), false);
	});
	test("corrupt and denied storage recover without crashing", () => {
		const m = new Memory();
		m.setItem("hullabaloo:checkpoint", "{");
		m.setItem("hullabaloo:creations", "null");
		const s = new GardenStore(m);
		assert.equal(s.loadCheckpoint(), null);
		assert.deepEqual(s.creations(), []);
		const denied = {
			getItem() {
				throw Error("denied");
			},
			setItem() {
				throw Error("denied");
			},
			removeItem() {
				throw Error("denied");
			},
		};
		const d = new GardenStore(denied);
		assert.equal(d.loadCheckpoint(), null);
		assert.equal(d.saveMaze("Visit only", GARDENS[0]), false);
		assert.equal(d.creations()[0].name, "Visit only");
		assert.equal(d.available, false);
		d.clearCheckpoint();
	});
	test("corrupted checkpoint shape does not offer Continue", () => {
		const m = new Memory(),
			s = new GardenStore(m);
		s.write("checkpoint", {
			version: 1,
			snapshot: { version: 1, s: { level: 999 } },
		});
		assert.equal(s.loadCheckpoint(), null);
	});
	test("unlock count is bounded and monotonic", () => {
		const s = new GardenStore(new Memory());
		assert.equal(s.unlocked(), 1);
		s.unlock(4);
		s.unlock(2);
		assert.equal(s.unlocked(), 4);
		s.unlock(99);
		assert.equal(s.unlocked(), 5);
	});
	test("each live tuning slider changes one intended value and reset restores all", () => {
		const w = new World();
		for (const [k, , , min, max, step] of TUNING) {
			const value = Math.min(max, Math.max(min, DEFAULTS[k] + step));
			w.tune(k, value);
			assert.equal(w.tuning[k], value);
			assert.ok(w.s.modified);
		}
		assert.equal(w.s.lives, 4);
		w.resetTuning();
		assert.deepEqual(w.tuning, DEFAULTS);
		assert.equal(w.s.lives, 3);
		assert.ok(w.s.modified);
	});
	test("developer helpers reset actors, refill, reseed and teleport only onto floor", () => {
		const w = new World();
		w.s.lives = 1;
		w.s.seeds = 0;
		w.dev("refill");
		assert.equal(w.s.lives, 3);
		assert.equal(w.s.seeds, 3);
		w.dev("teleport", [1, 1]);
		assert.equal(w.players[0].m.x, 1);
		w.dev("teleport", [0, 0]);
		assert.equal(w.players[0].m.x, 1);
		w.dev("actors");
		assert.equal(w.players[0].m.x, 2);
		w.dev("reseed", 42);
		assert.equal(w.s.rng, 42);
		assert.ok(w.s.modified);
	});
	for (const dims of [
		[512, 288],
		[360, 780],
	])
		for (let level = 0; level < 5; level++)
			for (const mode of ["normal", "title", "workshop"])
				test(`native draw and complete-maze fit ${level + 1}/${mode}/${dims.join("x")}`, () => {
					const g = new globalThis.My3D2dge.Game({
						headless: true,
						draw: true,
						res: dims,
						view: "overhead",
						menu: false,
					});
					const w = new World({ level });
					const r = new GardenRigs(g),
						v = new GardenView(g, r),
						opts = { title: mode === "title", workshop: mode === "workshop" };
					g.start({
						update(dt) {
							v.fit(w.view(), opts);
							r.update(dt, w.view());
						},
						draw(renderer) {
							v.draw(renderer, w.view(), {
								hud: mode === "normal",
								workshop:
									mode === "workshop" ? { cursor: [2, 7], errors: [] } : null,
							});
						},
					});
					g.advance(0.02);
					assert.deepEqual(g.errors, []);
					assert.ok(
						v.bounds.x0 >= 0 &&
							v.bounds.y0 >= 0 &&
							v.bounds.x1 <= g.W + 1 &&
							v.bounds.y1 <= g.H + 1,
					);
					const c = [2, 7],
						p = g.r.w((c[0] + 0.5) * 16, (c[1] + 0.5) * 16);
					assert.deepEqual(v.cellAt(...p), c);
					g.dispose();
				});

	test("mouse route stops on its reachable destination", () => {
		const g = new globalThis.My3D2dge.Game({ headless: true, menu: false });
		const w = new World({ demo: true }),
			c = new NativeControls(
				g,
				() => {},
				() => false,
			);
		let clicked = true;
		const I = {
			move: () => [0, 0],
			pressed: () => false,
			lastDevice: "mouse",
			clicked: () => {
				if (clicked) {
					clicked = false;
					return [0, 0];
				}
				return null;
			},
		};
		const target = { cellAt: () => [4, 7] };
		for (let i = 0; i < 240; i++) {
			const cmd = c.command(I, w.players[0], w, target);
			w.step(1 / 120, { 0: cmd });
		}
		assert.equal(w.players[0].m.x, 4);
		assert.equal(w.players[0].m.y, 7);
		assert.equal(w.players[0].m.moving, false);
		assert.equal(c.goals.size, 0);
		c.dispose();
		g.dispose();
	});

	test("workshop wrap exits keep their actual partner orientation and reverse in place", () => {
		const l = clone(GARDENS[0]);
		const row = l.rows[8].split("");
		row[8] = ".";
		l.rows[8] = row.join("");
		const edge = l.rows[4].split("");
		edge[14] = "#";
		l.rows[4] = edge.join("");
		l.wraps = [{ a: [0, 4], ad: [-1, 0], b: [8, 8], bd: [0, 1], label: "A" }];
		assert.ok(validateLevel(l).ok);
		const g = new MazeGraph(l),
			m = new MazeMover({ cx: 0, cy: 4, speed: 1 });
		m.update(0.7, g, [-1, 0]);
		assert.deepEqual(m.dir, [0, -1]);
		const before = [m.x, m.y];
		m.update(0, g, [0, 1]);
		assert.deepEqual([m.x, m.y], before);
		m.update(0.7, g, null);
		assert.deepEqual([m.cx, m.cy], [0, 4]);
		const forward = new MazeMover({ cx: 0, cy: 4, speed: 1 });
		forward.update(1.1, g, [-1, 0]);
		assert.equal(forward.x, 8);
		assert.ok(forward.y < 8);
		assert.deepEqual(forward.dir, [0, -1]);
	});
	test("workshop rejects ambiguous or missing wrap marks", () => {
		const l = clone(GARDENS[0]);
		delete l.wraps[0].label;
		assert.equal(validateLevel(l).ok, false);
	});
	return { passed, failed, failures };
}
if (process.argv[1]?.endsWith("/tools-tests.mjs")) {
	const r = runToolsTests();
	for (const f of r.failures) console.log(`FAIL ${f}`);
	console.log(`${r.passed} passed, ${r.failed} failed`);
	process.exitCode = r.failed ? 1 : 0;
}
