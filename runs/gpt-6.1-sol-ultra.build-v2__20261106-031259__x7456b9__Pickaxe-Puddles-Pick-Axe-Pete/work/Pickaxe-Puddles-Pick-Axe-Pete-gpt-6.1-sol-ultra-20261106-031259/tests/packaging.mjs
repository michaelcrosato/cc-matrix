import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const dev = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
	work = path.dirname(dev);
export function runPackaging() {
	let count = 0;
	const check = (fn) => {
		fn();
		count++;
	};
	const config = JSON.parse(
		fs.readFileSync(path.join(work, "build-config.json"), "utf8"),
	);
	const html = fs.readFileSync(path.join(work, `${config.stem}.html`), "utf8");
	const feedback = JSON.parse(
		fs.readFileSync(path.join(work, "exit-interview.json"), "utf8"),
	);
	check(() =>
		assert.deepEqual(Object.keys(feedback), [
			"sourceInformation",
			"testingFeedback",
			"engineFeedback",
			"promptFeedback",
			"aiHub",
		]),
	);
	const sourceKeys = [
		"date",
		"source",
		"plan",
		"genre",
		"perspective",
		"tech",
		"artDirection",
		"animation",
		"audio",
		"online",
		"testing",
		"research",
		"environment",
		"model",
		"usage",
	];
	check(() =>
		assert.deepEqual(Object.keys(feedback.sourceInformation), sourceKeys),
	);
	for (const key of sourceKeys)
		check(() =>
			assert.ok(
				typeof feedback.sourceInformation[key] === "string" &&
					feedback.sourceInformation[key].length > 0,
			),
		);
	check(() =>
		assert.equal(feedback.sourceInformation.usage, "added on import"),
	);
	for (const [key, length] of [
		["testingFeedback", 4],
		["engineFeedback", 6],
		["promptFeedback", 4],
	])
		check(() => {
			assert.equal(feedback[key].length, length);
			assert.ok(
				feedback[key].every((v) => typeof v === "string" && v.length > 0),
			);
		});
	check(() =>
		assert.deepEqual(Object.keys(feedback.aiHub), [
			"name",
			"tagline",
			"description",
			"type",
			"genre",
			"source",
			"series",
			"players",
			"controls",
			"tags",
		]),
	);
	check(() => assert.equal(feedback.aiHub.name, config.title));
	check(() => assert.equal(feedback.aiHub.genre, "Platformer"));
	check(() => {
		assert.ok(
			feedback.aiHub.tags.length >= 3 && feedback.aiHub.tags.length <= 6,
		);
		assert.ok(feedback.aiHub.tags.every((t) => t === t.toLowerCase()));
	});
	const scripts = [
		...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g),
	].map((m) => m[1]);
	check(() =>
		assert.equal(
			scripts[0].trim(),
			fs.readFileSync(path.join(dev, "vendor/hub/session.js"), "utf8").trim(),
		),
	);
	check(() => assert.match(html, /<meta charset="utf-8">\s*<script>/));
	check(() => assert.match(html, /hub:session-minutes" content="15"/));
	check(() => assert.match(html, /hub:session-howto" content="[^"]+"/));
	check(() => assert.match(html, /hub:session-players" content="1-2"/));
	check(() => assert.match(html, new RegExp(`<title>${config.title}</title>`)));
	check(() =>
		assert.ok(!/<script[^>]+src=|<link[^>]+href=|<img[^>]+src=/i.test(html)),
	);
	for (let i = 0; i < scripts.length; i++)
		check(
			() =>
				new vm.Script(scripts[i], { filename: `shipped-inline-script-${i}` }),
		);
	const context = vm.createContext({ console, performance });
	for (const file of [
		"vendor/engine/my-3d2dge.js",
		"src/content/content.js",
		"src/sim/sim.js",
		"src/sim/pilot.js",
	])
		vm.runInContext(fs.readFileSync(path.join(dev, file), "utf8"), context, {
			filename: file,
		});
	for (let route = 0; route < 3; route++)
		check(() => {
			const { PP } = context,
				sim = new PP.Sim({ seed: 99 });
			sim.attract = true;
			for (let i = 0; i < 120 * 400 && !sim.completed; i++)
				sim.step(1 / 120, { 1: PP.attractIntent(sim, 1, route) });
			assert.equal(sim.completed?.won, true);
			for (const feature of [
				"redirect",
				"toolBreak",
				"pickCollect",
				"collision",
				"keyRise",
				"keyCollect",
				"unlock",
				"wave",
				"victory",
			])
				assert.ok(
					sim.eventLog.some((e) => e.type === feature),
					`Attract did not demonstrate ${feature}`,
				);
			assert.ok(sim.tutorial.ladder);
			assert.ok(sim.miners[0].stats.redirects > 0);
		});
	return count;
}
