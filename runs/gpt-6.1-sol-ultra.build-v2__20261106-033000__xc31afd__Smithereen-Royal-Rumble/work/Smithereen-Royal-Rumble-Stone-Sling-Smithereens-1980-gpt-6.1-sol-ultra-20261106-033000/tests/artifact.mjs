import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function runArtifact() {
	const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
		project = JSON.parse(
			fs.readFileSync(path.join(root, "project.json"), "utf8"),
		);
	const html = fs.readFileSync(
			path.join(root, "..", project.basename + ".html"),
			"utf8",
		),
		client = fs.readFileSync(path.join(root, "vendor/hub/session.js"), "utf8");
	let checks = 0;
	const failures = [];
	const ok = (v, m) => {
		checks++;
		if (!v) failures.push(m);
	};
	ok(html.startsWith("<!doctype html>"), "single-file HTML doctype");
	ok(
		html.includes('<meta charset="utf-8"><script>' + client + "</script>"),
		"released Hub client first script verbatim after charset",
	);
	ok(
		html.includes('name="hub:session" content="1"'),
		"Hub protocol declaration",
	);
	ok(
		html.includes('name="hub:session-players" content="2-2"'),
		"exactly two Hub seats",
	);
	ok(
		html.includes('name="hub:session-mode" content="shared-world"'),
		"Hub shared-world declaration",
	);
	ok(
		html.includes('name="hub:session-minutes" content="3"'),
		"three-minute Hub declaration",
	);
	ok(
		!/<(?:script|img|audio|link|video|source)[^>]+(?:src|href)\s*=/i.test(html),
		"no external runtime dependencies",
	);
	ok(!html.includes("/home/micha/"), "no absolute workstation runtime paths");
	ok(
		(html.match(/<script>/g) || []).length === 3,
		"exactly client, engine, and game inline scripts",
	);
	ok(
		(html.match(/<\/script>/g) || []).length === 3,
		"safe embedded script delimiters",
	);
	ok(
		html === fs.readFileSync(path.join(root, "index.html"), "utf8"),
		"development and published artifact identical",
	);
	const metadata = JSON.parse(
		fs.readFileSync(path.join(root, "..", "exit-interview.json"), "utf8"),
	);
	const src = JSON.parse(
		fs.readFileSync(path.join(root, "metadata.json"), "utf8"),
	);
	ok(
		JSON.stringify(metadata) === JSON.stringify(src),
		"metadata sole source matches published interview",
	);
	ok(
		Object.keys(metadata).join(",") ===
			"sourceInformation,testingFeedback,engineFeedback,promptFeedback,aiHub",
		"interview top-level shape and order",
	);
	const keys = [
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
	ok(
		Object.keys(metadata.sourceInformation).join(",") === keys.join(","),
		"all source information fields in order",
	);
	for (const key of keys)
		ok(
			typeof metadata.sourceInformation[key] === "string" &&
				metadata.sourceInformation[key].length > 0,
			"source field " + key + " filled",
		);
	ok(
		metadata.sourceInformation.usage === "added on import",
		"usage exact value",
	);
	ok(metadata.sourceInformation.plan === "PLAN.md", "plan attribution");
	ok(
		metadata.sourceInformation.date === "2026-11-06 03:30:00",
		"brief date exact",
	);
	ok(
		metadata.sourceInformation.environment === "Codex CLI (headless); Linux",
		"brief environment exact",
	);
	ok(
		metadata.sourceInformation.model ===
			"OpenAI, gpt-6.1-sol, reasoning effort ultra",
		"brief model exact",
	);
	for (const [key, n] of [
		["testingFeedback", 4],
		["engineFeedback", 6],
		["promptFeedback", 4],
	])
		ok(
			Array.isArray(metadata[key]) &&
				metadata[key].length === n &&
				metadata[key].every((v) => typeof v === "string" && v.length > 0),
			key + " complete answers",
		);
	const cat = [
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
	];
	ok(
		Object.keys(metadata.aiHub).join(",") === cat.join(","),
		"catalogue exact object keys/order",
	);
	ok(metadata.aiHub.name === project.title, "catalogue/title agreement");
	ok(metadata.aiHub.players === "1–2", "catalogue player count");
	ok(
		metadata.aiHub.source === metadata.sourceInformation.source,
		"catalogue source agreement",
	);
	ok(
		Array.isArray(metadata.aiHub.tags) &&
			metadata.aiHub.tags.length >= 3 &&
			metadata.aiHub.tags.length <= 6 &&
			metadata.aiHub.tags.every((x) => x === x.toLowerCase()),
		"catalogue tag schema",
	);
	for (const file of fs.readdirSync(path.join(root, "src")))
		if (file.endsWith(".js")) {
			const txt = fs.readFileSync(path.join(root, "src", file), "utf8");
			ok(
				!/\bTODO\b|\bFIXME\b/.test(txt),
				file + " no unfinished feature markers",
			);
		}
	return {
		checks,
		failures,
		evidence: {
			bytes: Buffer.byteLength(html),
			artifact: project.basename + ".html",
		},
	};
}
