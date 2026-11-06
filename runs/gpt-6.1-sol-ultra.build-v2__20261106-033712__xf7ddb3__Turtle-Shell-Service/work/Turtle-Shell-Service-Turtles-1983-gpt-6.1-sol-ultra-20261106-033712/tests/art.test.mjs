import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("../vendor/engine/my-3d2dge.js");
for (const file of ["content", "sim", "art"]) require("../src/" + file + ".js");

export function runArtTests() {
	const E = globalThis.My3D2dge,
		T = globalThis.TSS;
	let count = 0;
	const failures = [];
	const test = (name, fn) => {
		count++;
		try {
			fn();
		} catch (error) {
			failures.push(name + ": " + error.message);
		}
	};
	const scene = (floor, options = {}) => {
		const game = new E.Game({
			headless: true,
			draw: true,
			res: [480, 320],
			view: "overhead",
			menu: false,
		});
		const sim = new T.Simulation({ floor, seats: [1, 2] }),
			art = new T.Art(game);
		game.start({
			update(dt) {
				art.update(dt, sim);
				game.focus(168, 104, 0);
			},
			draw(r) {
				art.draw(r, options.snapshot ? sim.snapshot() : sim, options);
			},
		});
		return {
			game,
			sim,
			art,
			draw() {
				game.advance(0.025, { draw: true });
				assert.deepEqual(game.errors, []);
			},
			close() {
				game.dispose();
			},
		};
	};
	for (let floor = 0; floor < 5; floor++)
		test(
			"floor " +
				(floor + 1) +
				" native inspection draw works from " +
				(floor % 2 ? "snapshot" : "simulation"),
			() => {
				const s = scene(floor, { snapshot: !!(floor % 2) });
				try {
					s.sim.state.dev.overlays = true;
					s.sim.state.dev.reveal = true;
					s.draw();
				} finally {
					s.close();
				}
			},
		);
	test("hidden room labels appear only with the developer reveal flag", () => {
		const s = scene(1),
			captured = [],
			original = E.font.text;
		E.font.text = function (g, string, ...args) {
			captured.push(string);
			return original.call(this, g, string, ...args);
		};
		try {
			s.draw();
			assert.ok(!captured.includes("HATCH") && !captured.includes("BUG"));
			captured.length = 0;
			s.sim.state.dev.reveal = true;
			s.draw();
			assert.equal(
				captured.filter((x) => x === "HATCH").length,
				s.sim.state.rooms.filter((r) => r.outcome === "baby").length,
			);
			assert.equal(
				captured.filter((x) => x === "BUG").length,
				s.sim.state.rooms.filter((r) => r.outcome === "beetle").length,
			);
		} finally {
			E.font.text = original;
			s.close();
		}
	});
	test("inspection reads the authoritative native grid without changing rules", () => {
		const s = scene(2),
			before = s.sim.snapshot();
		let reads = 0;
		const walk = s.sim.grid.walk.bind(s.sim.grid);
		s.sim.grid.walk = (c) => {
			reads++;
			return walk(c);
		};
		try {
			s.sim.state.dev.overlays = true;
			s.draw();
			assert.ok(reads > 21 * 13);
			s.sim.state.dev.overlays = false;
			assert.deepEqual(s.sim.snapshot(), before);
		} finally {
			s.close();
		}
	});
	return { count, total: count, failures };
}

if (process.argv[1]?.endsWith("art.test.mjs")) {
	const result = runArtTests();
	for (const failure of result.failures) console.error(failure);
	console.log(
		result.count -
			result.failures.length +
			"/" +
			result.count +
			" native art checks passed",
	);
	if (result.failures.length) process.exitCode = 1;
}
