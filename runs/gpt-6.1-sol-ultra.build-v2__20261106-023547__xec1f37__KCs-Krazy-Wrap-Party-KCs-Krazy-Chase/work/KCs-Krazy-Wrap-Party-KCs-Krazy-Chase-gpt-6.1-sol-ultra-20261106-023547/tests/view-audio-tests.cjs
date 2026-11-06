"use strict";
const assert = require("node:assert/strict");
require("../vendor/engine/my-3d2dge.js");
require("../src/view.js");
require("../src/audio.js");
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
	for (const portrait of [false, true])
		for (let i = 0; i < 5; i++)
			test(`native ${portrait ? "portrait" : "landscape"} garden ${i + 1} draws with complete visible layout`, () => {
				const game = new My3D2dge.Game({
					headless: true,
					draw: true,
					res: portrait ? [288, 440] : [512, 288],
					view: "overhead",
					menu: false,
				});
				const v = GardenView.create(game),
					s = S.create({ garden: i, players: 2 }),
					before = JSON.stringify(s);
				game.start({
					update(dt) {
						v.prepare(s);
						v.update(dt, s);
					},
					draw(r) {
						v.draw(r, s, {
							debug: {
								grid: true,
								wraps: true,
								targets: true,
								history: true,
								hitboxes: true,
							},
							preview: { cell: [1, 1], valid: true },
						});
					},
				});
				game.advance(0.1);
				assert.deepEqual(game.errors, []);
				const b = v.layout(s);
				assert.ok(
					b.x >= 10 &&
						b.y >= 35 &&
						b.x + b.w <= b.W - 10 &&
						b.y + b.h <= b.H - 20,
				);
				assert.deepEqual(
					v.pointerToCell(s, b.x + b.cell * 1.5, b.y + b.cell * 1.5),
					[1, 1],
				);
				assert.equal(v.pointerToCell(s, -1, -1), null);
				assert.equal(
					JSON.stringify(s),
					before,
					"renderer must not mutate simulation",
				);
				game.dispose();
			});
	test("headless sound defaults and scene lifecycle remain finite without Web Audio", () => {
		const game = new My3D2dge.Game({ headless: true, menu: false });
		const a = GardenAudio.create(game);
		assert.equal(a.debug().musicVolume, 0.1);
		a.scene("play", 0);
		a.unlock();
		a.unlock();
		assert.equal(a.debug().musicStarts, 1);
		a.pause(true);
		assert.equal(a.debug().muted, true);
		a.pause(false);
		assert.equal(a.debug().muted, false);
		a.apply({ music: 0.23, sfx: 0.4, voice: 0.2 });
		assert.equal(a.debug().musicVolume, 0.23);
		a.stop();
		assert.equal(a.debug().songPlaying, false);
		assert.equal(a.debug().muted, true);
		game.dispose();
	});
	test("five arrangements and title retain original finite synth tracks", () => {
		for (let g = 0; g < 5; g++) {
			const s = GardenAudio.score(g);
			assert.ok(s.bpm > 60 && s.bpm < 180);
			assert.equal(s.tracks.length, 5);
			assert.ok(s.tracks.some((x) => x.name === "fright" && x.on === false));
			for (const tr of s.tracks) {
				assert.ok(Number.isFinite(tr.vol) && tr.vol >= 0 && tr.vol <= 0.2);
				assert.ok(tr.notes.split(" ").length >= 16);
			}
		}
	});
	test("HUD renders object-form chain multiplier and its expiry", () => {
		const E = My3D2dge,
			texts = [],
			original = E.font.text;
		const game = new E.Game({
			headless: true,
			draw: true,
			res: [512, 288],
			view: "overhead",
			menu: false,
		});
		const s = S.create(),
			v = GardenView.create(game);
		s.combo = { count: 7, mult: 3, timer: 4.2 };
		E.font.text = (g, str, ...args) => {
			texts.push(str);
			return original.call(E.font, g, str, ...args);
		};
		try {
			game.start({
				update(dt) {
					v.prepare(s);
					v.update(dt, s);
				},
				draw(r) {
					v.draw(r, s);
				},
			});
			game.advance(0.1);
			assert.ok(texts.some((t) => t.includes("CHAIN x3") && t.includes("5s")));
			assert.deepEqual(game.errors, []);
		} finally {
			E.font.text = original;
			game.dispose();
		}
	});
	return { passed, failed, failures };
}
module.exports = { run };
if (require.main === module) {
	const r = run();
	for (const f of r.failures) console.log("FAIL " + f);
	console.log(`${r.passed} passed, ${r.failed} failed`);
	process.exitCode = r.failed ? 1 : 0;
}
