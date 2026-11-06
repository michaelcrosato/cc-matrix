import assert from "node:assert/strict";
import "../vendor/my-3d2dge.js";
import {
	autoPilot,
	createWorld,
	jumpEncounter,
	spawnThreat,
	stepWorld,
} from "../src/game/simulation.js";
import { Renderer } from "../src/presentation/renderer.js";

const E = globalThis.My3D2dge;

export function runEngineTests() {
	let count = 0;
	const failures = [];
	const active = [];
	const test = (name, fn) => {
		count++;
		try {
			fn();
		} catch (error) {
			failures.push(`${name}: ${error.message}`);
		} finally {
			for (const game of active.splice(0)) game.dispose();
		}
	};
	const make = (draw, seed = 1982) => {
		const game = new E.Game({
			id: `timelout-engine-test-${seed}-${draw}`,
			headless: true,
			draw,
			view: "overhead",
			res: [1066, 600],
			expand: false,
			input: {
				left: ["KeyA", "ArrowLeft"],
				right: ["KeyD", "ArrowRight"],
				up: ["KeyW", "ArrowUp"],
				down: ["KeyS", "ArrowDown"],
				fire: ["Space"],
			},
		});
		active.push(game);
		game.cam.smooth = 0;
		game.lights.enabled = false;
		const world = createWorld({ seed }),
			renderer = new Renderer(game);
		let scripted = true;
		game.start({
			update(dt) {
				game.focus(0, 0, 0);
				const action = scripted
					? autoPilot(world, "p1")
					: { move: game.input.move()[0], fire: game.input.down("fire") };
				stepWorld(world, { p1: action }, dt);
				renderer.update(dt);
				renderer.events(world.events);
			},
			draw(r) {
				renderer.draw(r, world, { hitboxes: true, trajectories: true });
			},
		});
		return {
			game,
			world,
			renderer,
			setScripted(value) {
				scripted = value;
			},
		};
	};
	test("native exact 120Hz clock calls canonical simulation and renders without errors", () => {
		const { game, world } = make(true);
		game.advance(3);
		assert.equal(world.tick, 360);
		assert.ok(Math.abs(world.time - 3) < 1e-10);
		assert.equal(world.phase, "playing");
		assert.deepEqual(game.errors, []);
	});
	test("native drawing on/off leaves canonical state identical", () => {
		const a = make(true, 84),
			b = make(false, 84);
		for (let i = 0; i < 60; i++) {
			a.game.advance(0.5);
			b.game.advance(0.5);
		}
		assert.deepEqual(a.world, b.world);
		assert.deepEqual(a.game.errors, []);
		assert.deepEqual(b.game.errors, []);
	});
	test("pause holds world; single canonical step advances exactly one tick while paused", () => {
		const { game, world } = make(true);
		game.advance(4);
		const tick = world.tick;
		assert.equal(game.pause("player"), true);
		game.advance(1);
		assert.equal(world.tick, tick);
		stepWorld(world, { p1: { move: 1, fire: true } });
		assert.equal(world.tick, tick + 1);
		assert.equal(game.paused, true);
		game.advance(0.5);
		assert.equal(world.tick, tick + 1);
		game.resume();
		game.advance(1);
		assert.equal(world.tick, tick + 121);
		assert.deepEqual(game.errors, []);
	});
	test("native test input moves and fires through normal action mapping", () => {
		const q = make(false);
		q.setScripted(false);
		q.game.advance(3);
		q.game.input.hold("right");
		q.game.input.hold("fire");
		q.game.advance(0.4);
		assert.ok(q.world.players[0].x > 100);
		assert.ok(q.world.shots.length > 0);
		const x = q.world.players[0].x;
		q.game.input.hold("right", false);
		q.game.input.hold("fire", false);
		q.game.advance(0.1);
		assert.equal(q.world.players[0].x, x);
	});
	test("all threat, disabled machine and finale presentations draw with actual native API", () => {
		const { game, world, renderer } = make(true);
		game.advance(3);
		jumpEncounter(world, 7);
		for (const type of ["missile", "mine", "roller", "hunter"])
			spawnThreat(world, type, { x: 0, y: 0, warning: 1 });
		game.advance(0.01);
		const roller = world.threats.find((t) => t.type === "roller");
		if (roller) {
			roller.grounded = true;
			roller.y = 240;
			roller.life = 2;
			game.advance(0.01);
		}
		world.players[0].hp = 0;
		game.advance(0.01);
		for (let phase = 0; phase < 3; phase++) {
			jumpEncounter(world, 8, phase);
			game.advance(0.01);
			world.boss.vulnerable = true;
			game.advance(0.01);
			world.boss.vulnerable = false;
			game.advance(0.01);
		}
		renderer.events([
			{ id: 9999, type: "brake" },
			{ id: 10000, type: "hit", x: 0, y: 240 },
		]);
		game.advance(0.01);
		assert.deepEqual(game.errors, []);
	});
	test("session-only settings ignore saved values and never enter the saved payload", () => {
		const id = "timelout-session-only-regression";
		E.store.set(`settings:${id}`, {
			v: 2,
			values: { devGod: true, tune_playerSpeed: 600, music: 0.27 },
		});
		const game = new E.Game({
			headless: true,
			id,
			menu: {
				settings: [
					{
						key: "devGod",
						label: "Invulnerability",
						value: false,
						persist: false,
					},
					{
						key: "tune_playerSpeed",
						label: "Speed",
						type: "slider",
						value: 340,
						min: 180,
						max: 650,
						persist: false,
					},
					{ key: "music", value: 0.1 },
				],
			},
		});
		active.push(game);
		assert.equal(game.settings.devGod, false);
		assert.equal(game.settings.tune_playerSpeed, 340);
		assert.equal(game.settings.music, 0.27);
		game.settings.set("devGod", true);
		game.settings.set("tune_playerSpeed", 550);
		assert.equal(game.settings.devGod, true);
		assert.equal(game.settings.tune_playerSpeed, 550);
		assert.equal(Object.hasOwn(game.settings._saved, "devGod"), false);
		assert.equal(
			Object.hasOwn(game.settings._saved, "tune_playerSpeed"),
			false,
		);
		game.settings.reset("Game");
		assert.equal(game.settings.devGod, false);
		assert.equal(game.settings.tune_playerSpeed, 340);
		assert.equal(game.settings.music, 0.27);
		E.store.remove(`settings:${id}`);
	});
	test("fractional native scale keeps the complete defense lane on narrow screens", () => {
		const oldWindow = globalThis.window;
		const game = new E.Game({
			headless: true,
			res: [1066, 600],
			expand: false,
		});
		active.push(game);
		try {
			globalThis.window = { devicePixelRatio: 1 };
			for (const [width, height] of [
				[390, 844],
				[844, 390],
				[320, 568],
			]) {
				game.screen.canvas = {
					getBoundingClientRect: () => ({ width, height, left: 0, top: 0 }),
				};
				game.screen.resize();
				const sc = game.screen;
				assert.ok(sc.S > 0 && sc.S < 1);
				assert.equal(sc.W, 1066);
				assert.equal(sc.H, 600);
				assert.ok(sc.OX >= 0 && sc.OY >= 0);
				assert.ok(sc.W * sc.S <= width + 0.001);
				assert.ok(sc.H * sc.S <= height + 0.001);
				const laneX = sc.OX + 533 * sc.S;
				const laneY = sc.OY + 540 * sc.S;
				assert.ok(laneY >= 0 && laneY < height);
				const [x, y] = sc.clientToScreen(laneX, laneY);
				assert.ok(Math.abs(x - 533) < 0.000001 && Math.abs(y - 540) < 0.000001);
			}
		} finally {
			game.screen.canvas = null;
			if (oldWindow === undefined) delete globalThis.window;
			else globalThis.window = oldWindow;
		}
	});
	test("whole normal campaign runs to victory on native game.advance with drawing enabled", () => {
		const { game, world } = make(true, 1982);
		while (world.time < 1400 && world.phase !== "results") game.advance(1);
		assert.equal(world.outcome, "victory");
		assert.equal(world.stats.waveClears, 8);
		assert.equal(world.stats.bossPhases, 3);
		assert.equal(world.modified, false);
		assert.ok(world.stats.brakes > 0);
		assert.ok(world.stats.intercepts > 20);
		assert.deepEqual(game.errors, []);
	});
	return { count, failures };
}
if (import.meta.url === `file://${process.argv[1]}`) {
	const result = runEngineTests();
	for (const failure of result.failures) console.error(failure);
	console.log(
		`${result.count - result.failures.length}/${result.count} engine checks passed`,
	);
	process.exitCode = result.failures.length ? 1 : 0;
}
