import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import assert from "node:assert/strict";
let count = 0,
	failures = 0;
function check(name, fn) {
	try {
		fn();
		count++;
	} catch (e) {
		failures++;
		console.log(
			"FAIL package: " + name + " — " + e.message.replaceAll("\n", " "),
		);
	}
}
const html = readFileSync("index.html", "utf8"),
	session = readFileSync("hub/session.js", "utf8"),
	credits = JSON.parse(readFileSync("../exit-interview.json", "utf8"));
check("single root HTML exactly matches the built game", () =>
	assert.equal(
		readFileSync("../" + basename(resolve(".")) + ".html", "utf8"),
		html,
	),
);
check("inline bundle remains byte-exact through HTML insertion", () => {
	const code = html.match(
		/<script type="module">([\s\S]*)<\/script>\s*<\/body>/,
	)[1];
	const bundle = readFileSync(".build/game.js", "utf8").replace(
		/<\/script/gi,
		"<\\/script",
	);
	assert.equal(code, bundle);
	assert.ok(!html.includes("<!--GAME-->"));
});
check("unmodified Hub client is the first head script", () => {
	const first = html.match(/<head>[\s\S]*?<script>([\s\S]*?)<\/script>/)[1];
	assert.equal(first, session);
	assert.ok(html.indexOf("<script>") < html.indexOf("hub:session"));
});
check("source and interview schema are complete and identical in game", () => {
	assert.deepEqual(Object.keys(credits), [
		"sourceInformation",
		"testingFeedback",
		"engineFeedback",
		"promptFeedback",
		"aiHub",
	]);
	assert.equal(Object.keys(credits.sourceInformation).length, 15);
	for (const value of Object.values(credits.sourceInformation))
		assert.ok(typeof value === "string" && value.length);
	assert.equal(credits.testingFeedback.length, 4);
	assert.equal(credits.engineFeedback.length, 6);
	assert.equal(credits.promptFeedback.length, 4);
	for (const list of [
		credits.testingFeedback,
		credits.engineFeedback,
		credits.promptFeedback,
	])
		for (const answer of list)
			assert.ok(typeof answer === "string" && answer.length);
	const inline = JSON.parse(
		html.match(
			/<script id="creditsData" type="application\/json">([\s\S]*?)<\/script>/,
		)[1],
	);
	assert.deepEqual(inline, credits);
	assert.equal(credits.sourceInformation.usage, "added on import");
});
check("catalogue metadata is valid", () => {
	assert.equal(credits.aiHub.name, "Dodge Alley");
	assert.equal(credits.aiHub.genre, "Racing");
	assert.equal(credits.aiHub.type, "Game");
	assert.equal(credits.aiHub.players, "1–4");
	assert.ok(credits.aiHub.tags.length >= 3 && credits.aiHub.tags.length <= 6);
	for (const tag of credits.aiHub.tags) assert.equal(tag, tag.toLowerCase());
});
check("pinned libraries are embedded with no external loading tags", () => {
	assert.ok(!/<script[^>]+src=|<link[^>]+href=/i.test(html));
	const deps = JSON.parse(readFileSync("package.json", "utf8")).dependencies;
	assert.equal(deps.three, "0.180.0");
	assert.equal(deps["@dimforge/rapier3d-compat"], "0.19.3");
	assert.equal(deps.peerjs, "1.5.5");
});
console.log(JSON.stringify({ suite: "package", count, failures }));
if (failures) process.exitCode = 1;
