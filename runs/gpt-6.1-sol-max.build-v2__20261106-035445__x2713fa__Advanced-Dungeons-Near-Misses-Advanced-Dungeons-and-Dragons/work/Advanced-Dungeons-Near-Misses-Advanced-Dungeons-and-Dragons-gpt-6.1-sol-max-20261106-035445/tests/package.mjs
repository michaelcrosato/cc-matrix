import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
export function run() {
	const read = (path) =>
		readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
	const id = JSON.parse(read("identity.json")),
		interview = JSON.parse(read("../exit-interview.json")),
		html = read(`../${id.html}`),
		versions = JSON.parse(read("vendor/versions.json"));
	let checks = 0;
	const check = (value, message) => {
		assert.ok(value, message);
		checks++;
	};
	check(
		html.includes(`<title>${id.title.replaceAll("&", "&amp;")}</title>`),
		"Exact title in artifact",
	);
	const first = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
	check(
		first.trim() === read("vendor/hub/session.js").trim(),
		"Session client executes unchanged as first script",
	);
	check(
		!/<script[^>]+src=|<link[^>]+href=/i.test(html),
		"No runtime script/styles dependencies",
	);
	check(
		html.indexOf('<meta charset="utf-8">') < html.indexOf("<script>"),
		"Charset before client",
	);
	for (const [name, file] of [
		["engine", "vendor/engine/my-3d2dge.js"],
		["hub", "vendor/hub/session.js"],
	])
		check(
			createHash("sha256").update(read(file)).digest("hex") ===
				versions[name].sha256,
			`Pinned ${name} is unchanged`,
		);
	check(
		html.includes("Copyright (c) 2026 Michael Crosato"),
		"Engine license retained",
	);
	check(
		Buffer.byteLength(html) > 1000000 && Buffer.byteLength(html) < 3000000,
		"Full-engine single-file payload present",
	);
	check(
		interview.sourceInformation.usage === "added on import",
		"Exact usage metadata",
	);
	check(interview.aiHub.name === id.title, "Catalogue identity");
	for (const key of [
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
	])
		check(
			typeof interview.sourceInformation[key] === "string" &&
				interview.sourceInformation[key].length > 0,
			`Source metadata ${key}`,
		);
	for (const [key, length] of [
		["testingFeedback", 4],
		["engineFeedback", 6],
		["promptFeedback", 4],
	])
		check(
			interview[key].length === length &&
				interview[key].every((v) => typeof v === "string" && v.length > 0),
			`${key} complete and ordered`,
		);
	check(
		interview.aiHub.players === "1–2" &&
			interview.aiHub.genre === "Adventure" &&
			interview.aiHub.type === "Game",
		"Catalogue capabilities",
	);
	check(
		interview.aiHub.tags.length >= 3 && interview.aiHub.tags.length <= 6,
		"Catalogue tag count",
	);
	check(
		html.includes(JSON.stringify(interview)) &&
			html.includes("Testing Feedback") &&
			html.includes("Engine Feedback") &&
			html.includes("Prompt Feedback") &&
			html.includes("sourceInformation"),
		"In-game required feedback embedded",
	);
	return checks;
}
