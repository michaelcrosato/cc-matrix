import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createAssets } from "../src/assets.js";
import { createAudio } from "../src/audio.js";

export function checkAssets() {
	const warnings = [];
	const context = {
		console: {
			log() {},
			warn: (...a) => warnings.push(a.join(" ")),
			error: (...a) => warnings.push(a.join(" ")),
		},
	};
	vm.createContext(context);
	vm.runInContext(
		readFileSync(new URL("../vendor/my-3d2dge.js", import.meta.url), "utf8"),
		context,
	);
	const E = context.My3D2dge,
		assets = createAssets(E);
	const sprites = [],
		animations = [];
	function visit(value) {
		if (Array.isArray(value)) value.forEach(visit);
		else if (value && value.isSprite) sprites.push(value);
		else if (value && value.isAnim) {
			animations.push(value);
			value.frames.forEach(visit);
		}
	}
	Object.values(assets).forEach(visit);
	assert(sprites.length >= 26, "all authored sprites generated");
	assert.equal(assets.ships.length, 2);
	assert.equal(assets.enemies.length, 4);
	assert.equal(assets.flagship.w, 70);
	assert.equal(assets.flagship.h, 30);
	for (const sprite of sprites) {
		assert(sprite.runs.length > 0);
		assert(
			sprite._src && sprite._src[0].length > 0,
			"native row data retained",
		);
		for (const row of sprite._src[0])
			for (const ch of row)
				assert(
					ch === "." || ch === " " || sprite._src[1][ch],
					"complete palette",
				);
	}
	assert.equal(
		new Set(assets.enemies.map((a) => a.frames[0]._src[0].join("\n"))).size,
		4,
		"four silhouette identities",
	);
	const game = new E.Game({
		headless: true,
		draw: true,
		res: [480, 270],
		view: "topdown",
	});
	let frames = 0;
	const sound = createAudio(game);
	game.start({
		update() {},
		draw(r) {
			frames++;
			r.sky(["#10162e", "#1b2847"]);
			for (let i = 0; i < animations.length; i++)
				r.sprite(30 + i * 40, 80, 0, animations[i], { t: game.time });
			r.overlay((g) => {
				for (let i = 0; i < sprites.length; i++)
					E.px.sprite(
						g,
						sprites[i],
						(i * 15) % 440,
						140 + Math.floor(i / 20) * 35,
					);
			});
		},
	});
	game.advance(0.5, { draw: true });
	sound.location({ encounter: 0, location: 0, status: "playing" });
	sound.events([{ type: "shot" }, { type: "march" }, { type: "erode" }]);
	assert.equal(sound.unlock(), false, "headless cannot unlock audio");
	sound.stop();
	assert(frames > 0, "native stand-in ran draw");
	assert.equal(game.errors.length, 0, JSON.stringify(game.errors));
	assert.equal(warnings.length, 0, warnings.join("\n"));
	game.dispose();
	// Exercise the exact hyphenated event names emitted by the combat simulation.
	// A recording bus validates dispatch and throttling without claiming a listen.
	const played = [];
	const routeGame = {
		headless: false,
		real: 0,
		audio: {
			ready: true,
			ctx: {state: "running", currentTime: 0},
			instrument() {}, define() {}, music() {},
			bus() {return {};},
			sfx(name) {played.push(name);return {playing: false};},
		},
	};
	const routeAudio = createAudio(routeGame);
	assert.equal(routeAudio.unlock(), true);
	routeAudio.events([{type: "boss-hit"}, {type: "boss-hit"}]);
	assert.equal(played.length, 1, "routine repeated core hits are throttled");
	for (const [index, type] of ["boss-phase", "emitter-break", "saucer-hit"].entries()) {
		routeGame.real = (index + 1) * 0.1;
		routeAudio.events([{type}]);
	}
	assert.deepEqual(played, ["orbit:core", "orbit:heavy", "orbit:heavy", "orbit:extra"],
		"core hits, phase change, emitter destruction and saucer destruction use authored SFX");
	assert.equal(routeAudio.diagnostics().throttled, 1);
	routeAudio.stop();
	return { eventRoutes: 4, sprites: sprites.length, animations: animations.length, frames };
}
if (
	process.argv[1] &&
	import.meta.url === new URL(process.argv[1], "file://").href
) {
	try {
		checkAssets();
		console.log("1 asset/audio check passed");
	} catch (error) {
		console.error("FAIL assets:", error.stack);
		process.exitCode = 1;
	}
}
