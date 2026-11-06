"use strict";
const assert = require("node:assert/strict");
require("../vendor/engine/my-3d2dge.js");
const S = require("../src/sim.js");
const T = require("../src/tools.js");
require("../src/view.js");
require("../src/audio.js");
require("../src/net.js");
const Main = require("../src/main.js");

function run() {
	let passed = 0;
	const failures = [];
	const test = (name, f) => {
		try {
			f();
			passed++;
		} catch (e) {
			failures.push(name + ": " + e.message);
		}
	};
	test("assembled application shell draws its title and starts through native confirm", () => {
		const app = Main.create({ headless: true });
		app.game.advance(0.1);
		assert.equal(app.mode, "title");
		assert.equal(app.debug.snapshot().audio.musicVolume, 0.1);
		app.game.input.tap("confirm");
		app.game.advance(0.1);
		assert.equal(app.mode, "play");
		assert.equal(app.world.modified, false);
		assert.deepEqual(app.game.errors, []);
		app.game.dispose();
	});
	test("attract starts at ten idle seconds, exits on physical input and protects records", () => {
		const app = Main.create({ headless: true });
		app.game.advance(9.9);
		assert.equal(app.mode, "title");
		app.game.advance(0.2);
		assert.equal(app.mode, "attract");
		const before = T.storage.get("checkpoint");
		app.game.advance(14);
		assert.equal(app.world.demo, true);
		assert.deepEqual(T.storage.get("checkpoint"), before);
		app.debug.physical();
		app.game.advance(0.02);
		assert.equal(app.mode, "title");
		app.game.advance(0.1);
		assert.equal(app.mode, "title");
		app.game.dispose();
	});
	test("workshop undo redo save reload import export preserve real level data", () => {
		const w = new T.Workshop(S),
			start = w.export();
		w.brush = 2;
		w.paint([1, 1]);
		assert.notEqual(w.export(), start);
		w.undo();
		assert.equal(w.export(), start);
		w.redo();
		assert.notEqual(w.export(), start);
		assert.equal(w.save(0), true);
		const exported = w.export();
		w.reset();
		w.pendingWrap = [0, 1];
		assert.equal(w.load(0), true);
		assert.equal(w.pendingWrap, null);
		assert.equal(w.export(), exported);
		const other = new T.Workshop(S);
		assert.equal(other.import(exported), true);
		assert.equal(other.export(), exported);
		assert.equal(other.import("{bad"), false);
		assert.equal(other.import('{"version":9}'), false);
	});
	test("workshop validates connectivity, wrap pairing and spawn safety", () => {
		const w = new T.Workshop(S);
		assert.deepEqual(w.validate(), []);
		w.brush = 8;
		w.paint([0, 1]);
		assert(w.validate().length > 0);
		w.paint([w.level.w - 1, 1]);
		assert.deepEqual(w.validate(), []);
		w.brush = 0;
		w.paint(w.level.nursery);
		assert(w.validate().length > 0);
		w.undo();
		assert.deepEqual(w.validate(), []);
	});
	test("corrupted and modified campaign checkpoints cannot appear as Continue", () => {
		T.storage.set("checkpoint", { version: 99 });
		assert.equal(T.loadCheckpoint(S), null);
		const s = S.create();
		assert.equal(T.checkpoint(S, s), true);
		assert(T.loadCheckpoint(S));
		s.modified = true;
		s.score = 99999;
		assert.equal(T.checkpoint(S, s), false);
		assert.equal(T.loadCheckpoint(S).score, 0);
		T.storage.set("checkpoint", {
			version: 1,
			state: { garden: 3, players: [], status: "playing" },
		});
		assert.equal(T.loadCheckpoint(S), null);
		T.storage.remove("checkpoint");
	});
	test("denied storage keeps creations usable for the visit", () => {
		const prior = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			get() {
				throw new Error("denied");
			},
		});
		try {
			T.storage.set("denied-test", { score: 7 });
			assert.deepEqual(T.storage.get("denied-test"), { score: 7 });
			const w = new T.Workshop(S);
			assert(w.save(2));
			assert(w.load(2));
		} finally {
			delete globalThis.localStorage;
			if (prior) Object.defineProperty(globalThis, "localStorage", prior);
		}
	});
	test("full native application campaign reaches ending through game commands and reports", () => {
		const app = Main.create({ headless: true });
		app.debug.start();
		app.debug.bot(true);
		let reports = 0,
			total = 0;
		for (; total < 12000; total++) {
			app.game.advance(1 / 30);
			if (app.mode === "report") {
				reports++;
				app.game.input.tap("confirm");
				app.game.advance(0.04);
			}
			if (app.mode === "victory" || app.mode === "defeat") break;
		}
		assert.equal(app.mode, "victory", JSON.stringify(app.debug.snapshot()));
		assert.equal(reports, 5);
		assert.equal(app.world.stats.bites, 47);
		assert.equal(app.world.modified, false);
		assert.deepEqual(app.game.errors, []);
		app.game.dispose();
	});
	return { passed, failed: failures.length, failures };
}
module.exports = { run };
if (require.main === module) {
	const r = run();
	r.failures.forEach((f) => console.log("FAIL " + f));
	console.log(`${r.passed} passed, ${r.failed} failed (application)`);
	process.exitCode = r.failed ? 1 : 0;
}
