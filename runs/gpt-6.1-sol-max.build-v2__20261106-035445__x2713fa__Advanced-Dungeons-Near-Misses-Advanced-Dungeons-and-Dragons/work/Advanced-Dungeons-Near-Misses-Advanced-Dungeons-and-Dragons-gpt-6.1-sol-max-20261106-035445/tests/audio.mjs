import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

export function run() {
	const context = vm.createContext({ console });
	for (const file of ["vendor/engine/my-3d2dge.js", "src/audio/audio.js"])
		vm.runInContext(
			readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
			context,
			{ filename: file },
		);
	const E = context.My3D2dge,
		Sound = context.NM.Sound;
	E.store.clear();
	const game = new E.Game({
			headless: true,
			menu: false,
			id: "near-misses-audio-test",
		}),
		sound = new Sound(game);
	let checks = 0;
	try {
		assert.equal(game.audio.musicVolume, 0.1);
		checks++;
		assert.equal(game.settings.default("music"), 0.1);
		checks++;
		game.settings.set("music", 0.37);
		assert.equal(game.audio.musicVolume, 0.37);
		checks++;
		const state = {
			seed: 1,
			epoch: 1,
			mode: "cave",
			caveIndex: 0,
			players: [{ id: "p1", x: 32, y: 32 }],
			events: [
				{ id: "e1", kind: "bow", x: 32, y: 32, time: 0 },
				{ id: "e2", kind: "voice", text: "Keep your last shaft.", time: 0 },
			],
		};
		const before = JSON.stringify(state);
		sound.update({ state }, 1 / 120);
		assert.equal(sound.stats.events, 2);
		checks++;
		sound.update({ state }, 1 / 120);
		assert.equal(sound.stats.events, 2);
		assert.equal(sound.stats.deduplicated, 2);
		checks++;
		assert.equal(JSON.stringify(state), before);
		checks++;
		assert.equal(game.audio.ctx, null);
		assert.equal(sound.unlock(), false);
		checks++;
		state.players[0].focus = true;
		sound.update({ state }, 1 / 120);
		assert.equal(game.audio.ducked, true);
		assert.ok(Math.abs(sound.stats.effectiveMusic - 0.37 * 0.35) < 1e-10);
		checks++;
		state.players[0].focus = false;
		sound.update({ state }, 1 / 120);
		assert.equal(game.audio.ducked, false);
		checks++;
		assert.equal(Sound.SCORES.caves.length, 5);
		assert.equal(Sound.SCORES.victory.loop, false);
		assert.equal(Sound.SCORES.defeat.loop, false);
		checks++;
		const distinct = new Set(
			[
				"rat",
				"snake",
				"bat",
				"spider",
				"ooze",
				"drake",
				"guardian1",
				"guardian2",
			].map((type) => JSON.stringify(Sound.CUES[type])),
		);
		assert.equal(distinct.size, 8);
		checks++;
		for (const [name, voices] of Object.entries(Sound.CUES))
			for (const voice of Array.isArray(voices) ? voices : [voices]) {
				assert.ok(voice.dur > 0 && voice.dur <= 2, `${name} duration`);
				assert.ok(voice.vol > 0 && voice.vol <= 0.3, `${name} level`);
				checks++;
			}
		sound.stop();
		assert.equal(sound.stats.activeSources, 0);
		assert.equal(sound.stopped, true);
		checks++;
	} finally {
		game.dispose();
	}
	// The engine deliberately does not write Settings in headless games. Seed the
	// stored preference here; the browser probe covers a real save and reload.
	E.store.set("settings:near-misses-audio-test", {
		v: 2,
		values: { music: 0.37 },
	});
	const next = new E.Game({
			headless: true,
			menu: false,
			id: "near-misses-audio-test",
		}),
		nextSound = new Sound(next);
	try {
		assert.equal(next.audio.musicVolume, 0.37);
		checks++;
	} finally {
		nextSound.stop();
		next.dispose();
		E.store.clear();
	}
	return checks;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
	try {
		console.log(`${run()} audio checks passed`);
	} catch (error) {
		console.error(error);
		process.exitCode = 1;
	}
}
