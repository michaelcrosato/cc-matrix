import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const read = (f) =>
	fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");
function load(draw = true) {
	const c = {
		console: { log() {}, info() {}, warn() {}, error() {} },
		addEventListener() {},
		location: { hash: "" },
	};
	c.window = c;
	vm.createContext(c);
	for (const f of [
		"vendor/engine/my-3d2dge.js",
		"src/content.js",
		"src/sim.js",
		"src/presentation/render.js",
		"src/presentation/audio.js",
	])
		vm.runInContext(read(f), c, { filename: f });
	c.game = new c.My3D2dge.Game({
		headless: true,
		draw,
		res: [960, 540],
		view: "overhead",
	});
	c.game.fadeTime = 0;
	c.visuals = c.RuinRender.create(c.game);
	c.sound = c.RuinAudio.create(c.game);
	return c;
}
export async function runTests() {
	const results = [];
	const check = (name, fn) => {
		try {
			fn();
			results.push({ name, pass: true });
		} catch (e) {
			results.push({ name, pass: false, error: e.stack || String(e) });
		}
	};
	check(
		"presentation native drawn headless covers every sector and heart pose",
		() => {
			const c = load(),
				{ game, visuals } = c;
			let w = c.RuinSim.create({ players: 2 });
			game.start({
				update() {
					game.focus(480, 270, 0);
				},
				draw(r) {
					visuals.draw(r, w, { debug: true });
				},
			});
			for (let sector = 0; sector < 3; sector++) {
				w = c.RuinSim.create({ players: 2, sector });
				w.players[0].ready = true;
				w.players[0].charge = 5;
				w.players[0].biteFlash = 0.13;
				w.players[0].y = 4;
				w.players[1].x = 570;
				w.players[1].y = 270;
				w.shots = [{ id: 1, x: 600, y: 250, vx: 300, vy: 100, owner: 0 }];
				w.cannons = [
					{ id: 2, x: 30, y: 230, owner: 0, warn: 0.28 },
					{
						id: 3,
						x: 550,
						y: 330,
						owner: 1,
						vx: -840,
						reflected: true,
						returnWarn: 0.35,
					},
				];
				for (const state of [
					"dock",
					"windup",
					"flight",
					"return",
					"phase-break",
					"defeated",
				]) {
					w.core.state = state;
					w.core.vx = -100;
					w.core.vy = 40;
					w.refuge.warning = state === "windup";
					w.refuge.active = state !== "flight";
					game.advance(1 / 30);
				}
				for (const type of [
					"bite",
					"chip",
					"charge",
					"cannon-fire",
					"reflection",
					"core-hit",
					"death",
					"respawn",
					"sector-clear",
					"victory",
				])
					visuals.event({ id: `${sector}:${type}`, type, x: 810, y: 270 }, w);
				game.advance(1 / 30);
				w.mode = "victory";
				game.advance(1 / 30);
			}
			assert.deepEqual(Array.from(game.errors), []);
			c.sound.dispose();
			visuals.dispose();
			game.dispose();
		},
	);
	check(
		"presentation drawing and confirmed effects never change authoritative state",
		() => {
			const c = load(),
				{ game, visuals } = c,
				w = c.RuinSim.create({ players: 2, sector: 2, seed: 878 });
			w.core.state = "windup";
			const before = JSON.stringify(w);
			visuals.event({ id: "fixed-event", type: "core-hit", x: 810, y: 270 }, w);
			game.start({
				update() {
					game.focus(480, 270, 0);
				},
				draw(r) {
					visuals.draw(r, w, { debug: true });
				},
			});
			game.advance(0.25);
			assert.equal(JSON.stringify(w), before);
			assert.deepEqual(Array.from(game.errors), []);
			visuals.dispose();
			c.sound.dispose();
			game.dispose();
		},
	);
	check(
		"presentation enabled and disabled retain identical seeded action trace",
		() => {
			function trace(draw) {
				const c = load(draw),
					{ game, visuals } = c,
					w = c.RuinSim.create({ seed: 9213 });
				game.start({
					update(dt) {
						game.focus(480, 270, 0);
						c.RuinSim.step(
							w,
							[{ mx: 1, my: 0.25, ax: 1, ay: 0.1, fire: true, cannon: false }],
							dt,
						);
						for (const e of w.events) visuals.event(e, w);
					},
					draw(r) {
						visuals.draw(r, w);
					},
				});
				game.advance(1.8);
				const result = JSON.stringify(c.RuinSim.snapshot(w));
				assert.deepEqual(Array.from(game.errors), []);
				visuals.dispose();
				c.sound.dispose();
				game.dispose();
				return result;
			}
			assert.equal(trace(false), trace(true));
		},
	);
	check(
		"presentation duplicate event IDs cannot duplicate an explosion",
		() => {
			const c = load(),
				w = c.RuinSim.create(),
				ev = { id: 888, type: "core-hit", x: 810, y: 270 };
			c.visuals.event(ev, w);
			const count = c.visuals.debug().effects;
			c.visuals.event(ev, w);
			assert.equal(c.visuals.debug().effects, count);
			assert(count > 100);
			c.visuals.dispose();
			assert.equal(c.visuals.debug().effects, 0);
			c.sound.dispose();
			c.game.dispose();
		},
	);
	check(
		"audio headless mode does not require Web Audio and disposal is idempotent",
		() => {
			const c = load(false),
				w = c.RuinSim.create();
			assert.equal(c.sound.unlock(), false);
			c.sound.update(0.1, w);
			c.sound.event({ id: 1, type: "cannon-fire" }, w);
			assert.equal(c.sound.debug().active, 0);
			assert.equal(c.game.audio.ctx, null);
			c.sound.dispose();
			c.sound.dispose();
			c.sound.update(0.1, w);
			assert.equal(c.sound.debug().disposed, true);
			assert.equal(c.sound.debug().active, 0);
			c.visuals.dispose();
			c.game.dispose();
		},
	);
	return results;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
	const r = await runTests();
	for (const x of r) if (!x.pass) console.error(x.name + "\n" + x.error);
	console.log(
		`${r.filter((x) => x.pass).length} passed, ${r.filter((x) => !x.pass).length} failed`,
	);
	process.exitCode = r.some((x) => !x.pass) ? 1 : 0;
}
