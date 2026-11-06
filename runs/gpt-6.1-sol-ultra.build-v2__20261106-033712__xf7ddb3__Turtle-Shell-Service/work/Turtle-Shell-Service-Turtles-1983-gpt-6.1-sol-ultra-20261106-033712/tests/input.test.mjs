import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("../vendor/engine/my-3d2dge.js");
for (const file of ["content", "sim", "input"])
	require("../src/" + file + ".js");

export function runInputTests() {
	const E = globalThis.My3D2dge,
		T = globalThis.TSS,
		originalNavigator = Object.getOwnPropertyDescriptor(
			globalThis,
			"navigator",
		);
	let pads = [],
		count = 0;
	const failures = [];
	Object.defineProperty(globalThis, "navigator", {
		configurable: true,
		value: { getGamepads: () => pads },
	});
	const pad = (index, axes = [0, 0, 0, 0]) => ({
		index,
		id: "Standard test controller " + index,
		connected: true,
		mapping: "standard",
		axes: axes.slice(),
		buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
	});
	const button = (p, n, on) => {
		p.buttons[n] = { pressed: on, value: on ? 1 : 0 };
	};
	const test = (name, fn) => {
		count++;
		pads = [];
		try {
			fn();
		} catch (error) {
			failures.push(name + ": " + error.message);
		}
	};
	const setup = (style, phase = "play", autoPause = false) => {
		const game = new E.Game({
			headless: true,
			menu: false,
			autoPause,
			view: "overhead",
			input: T.INPUT,
		});
		const controls = new T.Controls(game);
		controls.configure(style);
		const sim = new T.Simulation({ seats: style === "solo" ? [1] : [1, 2] });
		sim.state.phase = phase;
		sim.state.enemies = [];
		game.hook("input", () => controls.refreshAssignments());
		game.start({
			pausable: true,
			update(dt) {
				sim.step(dt, controls.read(sim));
			},
			draw() {},
		});
		return {
			game,
			controls,
			sim,
			step(seconds = 0.1) {
				game.advance(seconds, { draw: false });
			},
			close() {
				game.dispose();
			},
		};
	};
	try {
		test("two native pad seats use actual sparse indices 2 and 5 independently", () => {
			pads[2] = pad(2, [-1, 0, 0, 0]);
			pads[5] = pad(5, [0, -1, 0, 0]);
			const s = setup("pads");
			try {
				s.step(0.2);
				const [a, b] = s.sim.state.players;
				assert.deepEqual(
					s.game.players.map((i) => i.pad),
					[2, 5],
				);
				assert.ok(a.x < 312);
				assert.ok(b.y < 168);
				assert.equal(b.x, 312);
				assert.deepEqual([...s.game.input._claimed], [5]);
			} finally {
				s.close();
			}
		});
		test("replacement controller at index 7 keeps the other seat and campaign intact", () => {
			pads[2] = pad(2, [-1, 0, 0, 0]);
			pads[5] = pad(5, [0, -1, 0, 0]);
			const s = setup("pads");
			try {
				s.step(0.15);
				const p = s.sim.state.players[1],
					before = p.y,
					run = s.sim.state.runId;
				pads[5] = null;
				pads[7] = pad(7, [0, 1, 0, 0]);
				s.step(0.2);
				assert.deepEqual(
					s.game.players.map((i) => i.pad),
					[2, 7],
				);
				assert.ok(p.y > before);
				assert.equal(s.sim.state.runId, run);
				assert.deepEqual([...s.game.input._claimed], [7]);
			} finally {
				s.close();
			}
		});
		test("keyboard plus sparse pad keeps keyboard and controller seats separate", () => {
			pads[5] = pad(5, [0, -1, 0, 0]);
			const s = setup("keyboard-pad");
			try {
				s.game.input.press("KeyA");
				s.step(0.2);
				const [a, b] = s.sim.state.players;
				assert.deepEqual(
					s.game.players.map((i) => i.pad),
					[null, 5],
				);
				assert.ok(a.x < 312);
				assert.ok(b.y < 168);
				assert.equal(b.x, 312);
				assert.equal(s.game.input.keysTo, null);
			} finally {
				s.close();
			}
		});
		test("absent pads leave no fake assignment and keep P1 keyboard fallback", () => {
			const s = setup("pads");
			try {
				s.game.input.press("KeyA");
				s.step(0.15);
				assert.deepEqual(
					s.game.players.map((i) => i.pad),
					[null, null],
				);
				assert.ok(s.sim.state.players[0].x < 312);
				assert.equal(s.sim.state.players[1].x, 312);
				assert.equal(s.sim.state.players[1].y, 168);
			} finally {
				s.close();
			}
		});
		test("shared keyboard retains native right-half routing and ignores connected pads", () => {
			pads[2] = pad(2, [1, 1, 0, 0]);
			const s = setup("shared");
			try {
				s.game.input.press("KeyA");
				s.game.players[1].press("ArrowUp");
				s.step(0.15);
				assert.deepEqual(
					s.game.players.map((i) => i.pad),
					[null, null],
				);
				assert.equal(s.game.input.keysTo[0], s.game.players[1]);
				assert.ok(s.sim.state.players[0].x < 312);
				assert.ok(s.sim.state.players[1].y < 168);
			} finally {
				s.close();
			}
		});
		test("remaining pad can control a native menu without driving both turtles after resume", () => {
			pads[2] = pad(2);
			pads[5] = pad(5, [0, -1, 0, 0]);
			const s = setup("pads");
			try {
				s.step(0.05);
				pads[2] = null;
				s.game.pause();
				s.controls.refreshAssignments();
				assert.equal(s.controls.menuPad, true);
				assert.equal(s.game.input.pad, 5);
				s.game.input.tick(1 / 120);
				assert.equal(s.game.input.move()[1], -1);
				assert.equal(s.controls.read(s.sim)[1].dir, -1);
				const x = s.sim.state.players[0].x,
					y = s.sim.state.players[0].y;
				s.game.resume();
				s.step(0.15);
				assert.equal(s.game.input.pad, null);
				assert.equal(s.controls.menuPad, false);
				assert.equal(s.sim.state.players[0].x, x);
				assert.equal(s.sim.state.players[0].y, y);
			} finally {
				s.close();
			}
		});
		test("Create plus Options remains the native Hub chord", () => {
			pads[2] = pad(2);
			const s = setup("solo");
			try {
				button(pads[2], 8, true);
				button(pads[2], 9, true);
				s.step(0.025);
				assert.equal(s.game.input.down("pause"), false);
				assert.equal(s.game.input.pressed("start"), false);
			} finally {
				s.close();
			}
		});
		test("returning a borrowed menu pad never creates a false disconnect pause", () => {
			pads[5] = pad(5);
			const s = setup("keyboard-pad", "play", true);
			try {
				s.step(0.025);
				s.game.pause();
				s.step(0.04);
				assert.equal(s.game.input.pad, 5);
				assert.equal(s.controls.menuPad, true);
				s.game.resume();
				s.step(0.05);
				assert.equal(s.game.input.pad, null);
				assert.equal(s.game.input.padLost, false);
				assert.equal(s.game.paused, false);
			} finally {
				s.close();
			}
		});
		test("Cross held through intro confirms without spending a bomb until release and fresh press", () => {
			pads[2] = pad(2);
			button(pads[2], 0, true);
			const s = setup("solo", "intro");
			try {
				s.step(0.3);
				assert.equal(s.sim.state.phase, "play");
				assert.equal(s.sim.state.stock, 3);
				assert.equal(s.sim.state.metrics.bombs, 0);
				button(pads[2], 0, false);
				s.step(0.025);
				button(pads[2], 0, true);
				s.step(0.025);
				assert.equal(s.sim.state.stock, 2);
				assert.equal(s.sim.state.metrics.bombs, 1);
			} finally {
				s.close();
			}
		});
		test("Space held through intro also waits for a fresh gameplay press", () => {
			const s = setup("solo", "intro");
			try {
				s.game.input.press("Space");
				s.step(0.3);
				assert.equal(s.sim.state.phase, "play");
				assert.equal(s.sim.state.stock, 3);
				s.game.input.release("Space");
				s.step(0.025);
				s.game.input.press("Space");
				s.step(0.025);
				assert.equal(s.sim.state.stock, 2);
				assert.equal(s.sim.state.metrics.bombs, 1);
			} finally {
				s.close();
			}
		});
		test("menu confirmation held on resume cannot leak a bomb into play", () => {
			pads[2] = pad(2);
			const s = setup("solo");
			try {
				s.game.pause();
				button(pads[2], 0, true);
				s.step(0.05);
				s.game.resume();
				s.step(0.2);
				assert.equal(s.sim.state.stock, 3);
				assert.equal(s.sim.state.metrics.bombs, 0);
				button(pads[2], 0, false);
				s.step(0.025);
				button(pads[2], 0, true);
				s.step(0.025);
				assert.equal(s.sim.state.stock, 2);
				assert.equal(s.sim.state.metrics.bombs, 1);
			} finally {
				s.close();
			}
		});
	} finally {
		if (originalNavigator)
			Object.defineProperty(globalThis, "navigator", originalNavigator);
		else delete globalThis.navigator;
	}
	return { count, failures };
}

if (process.argv[1]?.endsWith("input.test.mjs")) {
	const result = runInputTests();
	for (const failure of result.failures) console.error(failure);
	console.log(
		result.count -
			result.failures.length +
			"/" +
			result.count +
			" native input checks passed",
	);
	if (result.failures.length) process.exitCode = 1;
}
