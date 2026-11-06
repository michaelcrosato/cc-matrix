import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { REPORT } from "../src/report.js";

export async function runPackagingTests() {
	const results = [];
	const test = async (name, fn) => {
		try {
			await fn();
			results.push({ name, pass: true });
		} catch (e) {
			results.push({ name, pass: false, detail: e.stack });
		}
	};
	const root = new URL("../", import.meta.url),
		identity = JSON.parse(
			await readFile(new URL("identity.json", root), "utf8"),
		);
	const html = await readFile(
			new URL(`../${identity.stem}.html`, root),
			"utf8",
		),
		manifest = JSON.parse(
			await readFile(new URL("build/manifest.json", root), "utf8"),
		);
	await test("Package: exact root artifact matches build and SHA-256", async () => {
		assert.equal(
			html,
			await readFile(new URL("build/game.html", root), "utf8"),
		);
		assert.equal(
			createHash("sha256").update(html).digest("hex"),
			manifest.sha256,
		);
	});
	await test("Package: released Hub client is unchanged and first script after charset", async () => {
		const prefix = html.slice(
			html.indexOf('<meta charset="utf-8">') + '<meta charset="utf-8">'.length,
		);
		const first = /^\s*<script>([\s\S]*?)<\/script>/.exec(prefix);
		assert.ok(first);
		assert.equal(
			first[1],
			await readFile(new URL("vendor/hub/session.js", root), "utf8"),
		);
	});
	await test("Package: engine runtime is unmodified and license retained", async () => {
		const engine = await readFile(
			new URL("vendor/engine/my-3d2dge.js", root),
			"utf8",
		);
		assert.ok(html.includes(engine.replace(/<\/script/gi, "<\\/script")));
		assert.ok(
			html.includes(
				await readFile(new URL("vendor/engine/LICENSE", root), "utf8"),
			),
		);
	});
	await test("Package: no external scripts or runtime module imports", () => {
		const scripts = [
			...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi),
		];
		assert.equal(scripts.length, 3);
		assert.ok(scripts.every((m) => !m[1].trim()));
		assert.ok(!/^\s*import\s+(?:\{|\*|['"])/m.test(scripts[2][2]));
		assert.ok(
			!/<link[^>]+href\s*=/i.test(
				html.split("</head>")[0].replace(/<script>[\s\S]*?<\/script>/g, ""),
			),
		);
	});
	await test("Package: declared session metadata matches actual support", () => {
		for (const [name, value] of Object.entries({
			"hub:session": "1",
			"hub:session-players": "1-2",
			"hub:session-mode": "shared-world",
			"hub:session-minutes": "10",
		}))
			assert.ok(html.includes(`<meta name="${name}" content="${value}">`));
		assert.ok(!html.includes('name="hub:webgpu"'));
	});
	await test("Interview: JSON parses, exact schema and in-game feedback match", async () => {
		const interview = JSON.parse(
			await readFile(new URL("../exit-interview.json", root), "utf8"),
		);
		assert.deepEqual(interview, REPORT);
		assert.deepEqual(Object.keys(interview), [
			"sourceInformation",
			"testingFeedback",
			"engineFeedback",
			"promptFeedback",
			"aiHub",
		]);
		assert.deepEqual(Object.keys(interview.sourceInformation), [
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
		]);
		assert.equal(interview.testingFeedback.length, 4);
		assert.equal(interview.engineFeedback.length, 6);
		assert.equal(interview.promptFeedback.length, 4);
		assert.equal(interview.sourceInformation.usage, "added on import");
		assert.equal(interview.aiHub.name, identity.title);
		assert.equal(interview.aiHub.type, "Game");
		assert.equal(interview.aiHub.genre, "Shooter");
		assert.equal(interview.aiHub.players, "1–2");
		assert.ok(
			interview.aiHub.tags.length >= 3 && interview.aiHub.tags.length <= 6,
		);
		for (const v of Object.values(interview.sourceInformation))
			assert.ok(typeof v === "string" && v.length > 0);
	});
	await test("Package: all required feedback sections are in the delivered HTML", () => {
		for (const label of [
			"Source Information",
			"Testing Feedback",
			"Engine Feedback",
			"Prompt Feedback",
		])
			assert.ok(html.includes(label));
		for (const group of ["testingFeedback", "engineFeedback", "promptFeedback"])
			for (const value of REPORT[group])
				assert.ok(html.includes(JSON.stringify(value).slice(1, -1)));
	});
	return results;
}
