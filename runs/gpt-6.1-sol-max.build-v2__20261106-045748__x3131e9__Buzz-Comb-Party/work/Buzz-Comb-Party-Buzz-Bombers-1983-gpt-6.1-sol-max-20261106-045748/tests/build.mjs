import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
const root = new URL("../", import.meta.url),
	read = (p) => readFileSync(new URL(p, root), "utf8");
export async function run(check) {
	const rel = JSON.parse(read("release.json")),
		html = read("../" + rel.basename + ".html"),
		session = read("vendor/hub/session.js");
	check(
		"release uses exact task filename and one self-contained HTML",
		html.startsWith("<!doctype html>") &&
			existsSync(new URL("../" + rel.basename + ".html", root)),
	);
	const scripts = [
		...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi),
	].map((m) => m[1]);
	check(
		"pristine released session is the first head script after charset",
		html.includes('<meta charset="utf-8"><script>' + session + "</script>") &&
			scripts[0] === session,
	);
	check(
		"Hub metadata advertises tested shared-world 1–2 player game and 15 minute budget",
		html.includes('name="hub:session-mode" content="shared-world"') &&
			html.includes('name="hub:session-players" content="1-2"') &&
			html.includes('name="hub:session-minutes" content="15"'),
	);
	let parseOK = true,
		reason = "";
	for (let i = 1; i < scripts.length; i++) {
		try {
			new vm.Script(scripts[i]);
		} catch (e) {
			parseOK = false;
			reason = e.message;
		}
	}
	check(
		"all assembled JavaScript blocks parse after closing-script escaping",
		parseOK,
		reason,
	);
	check(
		"release makes no external module asset or audio requests",
		!/<(?:script|img|audio|link)[^>]+(?:src|href)=/i.test(html) &&
			!/<script[^>]*type=["']module/i.test(html),
	);
	const source = [
		"tuning",
		"content",
		"simulation",
		"pilot",
		"rigs",
		"audio",
		"presentation",
		"input",
		"screens",
		"network",
		"main",
	]
		.map((f) => read("src/" + f + ".js"))
		.join("\n");
	check(
		"game-owned source has no unfinished placeholders",
		!/\b(?:TODO|FIXME|placeholder|stubbed)\b/.test(source),
	);
	check(
		"no accidental machine-specific runtime paths in release",
		!html.includes("/home/micha/dev/") && !html.includes("/tmp/"),
	);
	const data = JSON.parse(read("../exit-interview.json")),
		expected = [
			"sourceInformation",
			"testingFeedback",
			"engineFeedback",
			"promptFeedback",
			"aiHub",
		];
	check(
		"exit interview uses exact top-level schema",
		Object.keys(data).sort().join(",") === expected.sort().join(","),
	);
	const fields = [
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
	check(
		"source information has every filled-in field with exact assigned metadata",
		fields.every(
			(k) =>
				typeof data.sourceInformation[k] === "string" &&
				data.sourceInformation[k].length > 0,
		) &&
			data.sourceInformation.plan === "PLAN.md" &&
			data.sourceInformation.usage === "added on import" &&
			data.sourceInformation.model ===
				"OpenAI, gpt-6.1-sol, reasoning effort max",
	);
	check(
		"ordered feedback arrays answer all required questions",
		data.testingFeedback.length === 4 &&
			data.engineFeedback.length === 6 &&
			data.promptFeedback.length === 4 &&
			[
				...data.testingFeedback,
				...data.engineFeedback,
				...data.promptFeedback,
			].every((x) => typeof x === "string" && x.length > 0),
	);
	check(
		"catalogue metadata names the real game and tested scope",
		data.aiHub.name === rel.title &&
			data.aiHub.genre === "Shooter" &&
			data.aiHub.type === "Game" &&
			data.aiHub.players === "1–2" &&
			data.aiHub.tags.length >= 3 &&
			data.aiHub.tags.length <= 6,
	);
	check(
		"all four feedback groups are embedded in About",
		scripts.some(
			(s) =>
				s.includes("sourceInformation") && s.includes(data.testingFeedback[0]),
		) &&
			source.includes("Source Information") &&
			source.includes("Testing Feedback") &&
			source.includes("Engine Feedback") &&
			source.includes("Prompt Feedback"),
	);
	const fixtures = ["harness.html", "bridge.js", "round.js"];
	const known = {};
	for (const f of fixtures)
		known[f] = createHash("sha256")
			.update(read("tests/hub/" + f))
			.digest("hex");
	const manifest = JSON.parse(read("vendor/manifest.json"));
	check(
		"official Hub fixtures and released client retain pinned hashes",
		fixtures.every((f) => manifest["tests/hub/" + f] === known[f]) &&
			manifest["vendor/hub/session.js"] ===
				createHash("sha256").update(session).digest("hex"),
	);
	check(
		"engine changes are marked and documented",
		html.includes("BCP fix: actor pixel bounds") &&
			read("docs/engine-changes.md").includes("Canvas transform"),
	);
	const isolated = new URL("evidence/isolated-release.html", root);
	copyFileSync(new URL("../" + rel.basename + ".html", root), isolated);
	check(
		"isolated release copy is byte-identical",
		readFileSync(isolated, "utf8") === html,
	);
	const summary = {
		sha256: createHash("sha256").update(html).digest("hex"),
		bytes: Buffer.byteLength(html),
		scripts: scripts.length,
		sessionHash: createHash("sha256").update(session).digest("hex"),
	};
	writeFileSync(
		new URL("evidence/package-report.json", root),
		JSON.stringify(summary, null, 2),
	);
}
