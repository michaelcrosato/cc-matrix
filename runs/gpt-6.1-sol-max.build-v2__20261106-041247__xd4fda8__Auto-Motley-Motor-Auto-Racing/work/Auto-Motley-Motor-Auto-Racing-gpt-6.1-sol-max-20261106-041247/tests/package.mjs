import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

export async function packageTests(test) {
	const config = JSON.parse(fs.readFileSync("build-config.json", "utf8"));
	const html = fs.readFileSync("../" + config.stem + ".html", "utf8");
	const report = JSON.parse(fs.readFileSync("../exit-interview.json", "utf8"));
	const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
		(m) => m[1],
	);
	await test("root package and development package identical", () =>
		assert.equal(html, fs.readFileSync("index.html", "utf8")));
	await test("official Hub client unchanged and first after charset", () => {
		assert.equal(scripts[0], fs.readFileSync("vendor/hub/session.js", "utf8"));
		assert.match(html, /<meta charset="utf-8">\s*<script>/);
	});
	await test("all bundled scripts parse", () => {
		scripts.forEach((s, i) => {
			new vm.Script(s, { filename: "inline-" + i });
		});
	});
	await test("no runtime external scripts or audio/image files", () => {
		assert.doesNotMatch(html, /<script[^>]+src=/i);
		assert.doesNotMatch(html, /<(?:audio|img)\b/i);
		assert.doesNotMatch(
			html,
			/<(?:link|source)[^>]+(?:href|src)=["'][^"']+\.(?:mp3|ogg|wav|png|gif)/i,
		);
	});
	await test("native engine notice and MIT license retained", () => {
		assert.ok(html.includes("my-3D2dge"));
		assert.ok(html.includes("Copyright (c) 2026 Michael Crosato"));
		assert.ok(html.includes("Permission is hereby granted, free of charge"));
	});
	await test("exit interview exact schema and filled values", () => {
		assert.deepEqual(
			Object.keys(report).sort(),
			[
				"sourceInformation",
				"testingFeedback",
				"engineFeedback",
				"promptFeedback",
				"aiHub",
			].sort(),
		);
		assert.equal(Object.keys(report.sourceInformation).length, 15);
		assert.ok(
			Object.values(report.sourceInformation).every(
				(v) => typeof v === "string" && v.length > 0,
			),
		);
		assert.equal(report.sourceInformation.usage, "added on import");
		assert.equal(report.testingFeedback.length, 4);
		assert.equal(report.engineFeedback.length, 6);
		assert.equal(report.promptFeedback.length, 4);
		for (const group of ["testingFeedback", "engineFeedback", "promptFeedback"])
			assert.ok(report[group].every((v) => typeof v === "string" && v.trim()));
	});
	await test("catalogue reflects shipped game", () => {
		assert.equal(report.aiHub.name, config.title);
		assert.equal(report.aiHub.genre, "Racing");
		assert.equal(report.aiHub.players, "1–2");
		assert.ok(report.aiHub.tags.length >= 3 && report.aiHub.tags.length <= 6);
		assert.ok(report.aiHub.tags.every((t) => t === t.toLowerCase()));
	});
	await test("complete report embedded in game", () =>
		assert.ok(
			html.includes(
				JSON.stringify(report).replace(/<\/script/gi, "<\\/script"),
			),
		));
}
