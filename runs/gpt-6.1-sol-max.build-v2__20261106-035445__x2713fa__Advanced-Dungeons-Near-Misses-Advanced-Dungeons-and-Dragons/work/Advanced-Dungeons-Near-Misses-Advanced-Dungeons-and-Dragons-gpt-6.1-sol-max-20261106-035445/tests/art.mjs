import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

export function run() {
	const context = vm.createContext({ console });
	for (const file of ["vendor/engine/my-3d2dge.js", "src/render/art.js"]) {
		vm.runInContext(
			readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
			context,
			{ filename: file },
		);
	}
	const E = context.My3D2dge,
		A = context.NM.Art;
	const game = new E.Game({
		headless: true,
		draw: true,
		res: "ps1",
		view: "threequarter",
		menu: false,
	});
	let actor,
		kind = "creature",
		checked = 0;
	game.start({
		update() {},
		draw() {
			game.r.sky(["#213d3d", "#324b44"]);
			if (kind === "ranger") A.ranger(game, actor);
			else if (kind === "props")
				for (let i = 0; i < 12; i++)
					A.prop(
						game,
						[
							"axe",
							"key",
							"boat",
							"ladder",
							"quiver",
							"bank",
							"relic",
							"marker",
							"target",
							"heart",
							"arrow",
							"treasure",
						][i],
						120 + (i % 4) * 23,
						80 + Math.floor(i / 4) * 24,
					);
			else A.creature(game, actor);
		},
	});
	game.focus(160, 110, 0);
	try {
		for (const type of A.types)
			for (const state of [
				"dormant",
				"alert",
				"windup",
				"attacking",
				"recovering",
				"investigating",
				"defeated",
			]) {
				actor = Object.freeze({
					id: type,
					type,
					x: 160,
					y: 110,
					hp: state === "defeated" ? 0 : 3,
					maxHp: 3,
					angle: 0.5,
					state,
					stateTime: 0.25,
					walk: 8,
					animTime: 1.5,
				});
				const before = JSON.stringify(actor);
				game.advance(1 / 120);
				assert.equal(JSON.stringify(actor), before, "render mutated actor");
				checked++;
			}
		kind = "ranger";
		for (const angle of [
			0,
			Math.PI * 0.25,
			Math.PI * 0.5,
			Math.PI,
			Math.PI * 1.5,
		])
			for (const state of [
				"idle",
				"pickup",
				"downed",
				"reviving",
				"climbing",
				"celebrating",
			]) {
				actor = Object.freeze({
					id: "ranger",
					seat: 1,
					x: 160,
					y: 110,
					angle,
					draw: 0.18,
					state,
					walk: 8,
					animTime: 1.5,
				});
				const before = JSON.stringify(actor);
				game.advance(1 / 120);
				assert.equal(JSON.stringify(actor), before);
				const origin = A.bowOrigin(actor);
				assert.ok(Number.isFinite(origin.x + origin.y + origin.z));
				assert.ok(
					Math.abs(Math.hypot(origin.x - actor.x, origin.y - actor.y) - 7.5) <
						1e-7,
				);
				checked++;
			}
		kind = "props";
		game.advance(1 / 120);
		checked++;
		assert.equal(
			game.errors.length,
			0,
			game.errors.map((e) => e.message).join(" | "),
		);
		checked++;
	} finally {
		A.clear(game);
		game.dispose();
	}
	return checked;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
	try {
		console.log(`${run()} art checks passed`);
	} catch (error) {
		console.error(error);
		process.exitCode = 1;
	}
}
