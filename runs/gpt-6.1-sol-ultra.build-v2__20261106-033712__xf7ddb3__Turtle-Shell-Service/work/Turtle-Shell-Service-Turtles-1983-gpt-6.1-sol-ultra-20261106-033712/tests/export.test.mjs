import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const dir = new URL("../", import.meta.url);
const identity = JSON.parse(readFileSync(new URL("identity.json", dir)));
const root = new URL("../", dir);
export async function runExportTests() {
	const failures = [];
	let count = 0;
	const check = (name, fn) => {
		count++;
		try {
			fn();
		} catch (e) {
			failures.push(name + ": " + e.message);
		}
	};
	const html = readFileSync(new URL(identity.slug + ".html", root), "utf8");
	const interview = JSON.parse(
		readFileSync(new URL("exit-interview.json", root), "utf8"),
	);
	check("exact package filename/title", () =>
		assert.ok(html.includes("<title>" + identity.title + "</title>")),
	);
	check("first script is pinned unmodified Hub client", () => {
		const script = html
			.match(/<script>\n([\s\S]*?)\n<\/script>/)[1]
			.replace(/<\\\/script/gi, "</script");
		assert.equal(
			script,
			readFileSync(new URL("vendor/hub/session.js", dir), "utf8"),
		);
	});
	check("all inline scripts parse", () => {
		for (const [i, m] of [
			...html.matchAll(/<script>\n([\s\S]*?)\n<\/script>/g),
		].entries())
			new vm.Script(m[1], { filename: "inline-" + i });
	});
	check("self-contained runtime", () => {
		assert.ok(!/<script[^>]+src=/i.test(html));
		assert.ok(!/<link[^>]+(?:href=)/i.test(html));
		assert.ok(!/<script\s+type=['"]module/i.test(html));
		assert.ok(!/data:audio|\.(?:mp3|wav|ogg)(?=['"\s?])/i.test(html));
	});
	check("session metadata", () => {
		for (const [name, val] of [
			["session", "1"],
			["session-players", "1-2"],
			["session-mode", "shared-world"],
		])
			assert.ok(html.includes(`name="hub:${name}" content="${val}"`));
	});
	check("interview exact top-level schema", () => {
		assert.deepEqual(Object.keys(interview), [
			"sourceInformation",
			"testingFeedback",
			"engineFeedback",
			"promptFeedback",
			"aiHub",
		]);
		assert.equal(interview.testingFeedback.length, 4);
		assert.equal(interview.engineFeedback.length, 6);
		assert.equal(interview.promptFeedback.length, 4);
	});
	check("source information fields complete", () => {
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
		for (const v of Object.values(interview.sourceInformation))
			assert.ok(typeof v === "string" && v.length);
		assert.equal(interview.sourceInformation.usage, "added on import");
	});
	check("catalogue matches game", () => {
		const a = interview.aiHub;
		assert.equal(a.name, identity.title);
		assert.equal(a.type, "Game");
		assert.equal(a.genre, "Action");
		assert.equal(a.players, "1–2");
		assert.ok(
			a.tags.length >= 3 &&
				a.tags.length <= 6 &&
				a.tags.every((t) => t === t.toLowerCase()),
		);
	});
	check("embedded About matches JSON", () => {
		assert.ok(html.includes(JSON.stringify(interview)));
		for (const v of [
			...interview.testingFeedback,
			...interview.engineFeedback,
			...interview.promptFeedback,
		])
			assert.ok(v.length);
	});
	check("no development runtime URLs", () => {
		assert.ok(
			!/src="(?:\.|\/home)|fetch\(['"](?:\.\/|\.\.\/)|localhost:[0-9]|127\.0\.0\.1:[0-9]/.test(
				html,
			),
		);
	});
	return { count, failures };
}
