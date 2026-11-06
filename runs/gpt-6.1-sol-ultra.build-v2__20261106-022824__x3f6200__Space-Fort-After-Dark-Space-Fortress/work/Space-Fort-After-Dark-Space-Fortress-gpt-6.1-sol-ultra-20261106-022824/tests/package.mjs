import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function runPackageTests() {
	const failures = [];
	let passed = 0;
	const check = (name, fn) => {
		try {
			fn();
			passed++;
		} catch (e) {
			failures.push(name + ": " + e.message);
		}
	};
	const assert = (v, msg) => {
		if (!v) throw Error(msg);
	};
	const file = path.join(dir, "..", path.basename(dir) + ".html"),
		html = fs.readFileSync(file, "utf8"),
		interview = JSON.parse(
			fs.readFileSync(path.join(dir, "../exit-interview.json"), "utf8"),
		);
	const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(
		(m) => m[1],
	);
	check("released client is unmodified and first after charset", () => {
		const client = fs.readFileSync(
			path.join(dir, "vendor/hub-repo/lib/hub/session.js"),
			"utf8",
		);
		assert(scripts[0].trim() === client.trim(), "client differs");
		assert(/<meta charset="utf-8">\s*<script>/.test(html), "client placement");
	});
	check("embedded JavaScript boundaries parse", () => {
		assert(
			scripts.length === 9,
			"expected nine embedded scripts, got " + scripts.length,
		);
		for (const script of scripts) new vm.Script(script);
	});
	check("artifact is self contained", () => {
		assert(
			!/<script\b[^>]*\bsrc\s*=|<link\b[^>]*\bhref\s*=|<img\b[^>]*\bsrc\s*=/i.test(
				html,
			),
			"external asset dependency",
		);
		assert(!/type=["']module/.test(html), "module imports disallow file boot");
	});
	check("all Hub catalogue metadata are present", () => {
		for (const [name, value] of Object.entries({
			session: "1",
			"session-players": "1-4",
			"session-mode": "shared-world",
			"session-minutes": "11",
		}))
			assert(
				html.includes('name="hub:' + name + '" content="' + value + '"'),
				"missing " + name,
			);
		for (const name of ["goal", "howto"])
			assert(
				html.includes('name="hub:session-' + name + '"'),
				"missing " + name,
			);
		assert(!html.includes('name="hub:webgpu"'), "unexpected GPU requirement");
	});
	check("interview exact schema and fields", () => {
		assert(
			Object.keys(interview).sort().join(",") ===
				"aiHub,engineFeedback,promptFeedback,sourceInformation,testingFeedback",
			"outer schema",
		);
		for (const [key, n] of [
			["testingFeedback", 4],
			["engineFeedback", 6],
			["promptFeedback", 4],
		])
			assert(
				interview[key].length === n &&
					interview[key].every((v) => typeof v === "string" && v.length),
				"incomplete " + key,
			);
		for (const k of [
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
			assert(
				typeof interview.sourceInformation[k] === "string" &&
					interview.sourceInformation[k].length,
				"missing " + k,
			);
		assert(interview.sourceInformation.usage === "added on import", "usage");
		assert(
			interview.aiHub.name === "Space Fort After Dark" &&
				interview.aiHub.type === "Game" &&
				interview.aiHub.genre === "Shooter" &&
				interview.aiHub.tags.length >= 3 &&
				interview.aiHub.tags.length <= 6,
			"catalogue",
		);
	});
	check("credits are generated from the exact interview", () => {
		const ctx = {};
		vm.createContext(ctx);
		vm.runInContext(
			fs.readFileSync(path.join(dir, "src/about.js"), "utf8"),
			ctx,
		);
		assert(
			JSON.stringify(ctx.SF.ABOUT) === JSON.stringify(interview),
			"credits drift",
		);
		assert(html.includes(JSON.stringify(interview)), "artifact metadata stale");
	});
	check("title draw and naming scheme agree", () => {
		const draw = JSON.parse(
			fs.readFileSync(path.join(dir, "docs/title-draw.json"), "utf8"),
		);
		assert(
			draw.candidateCount === 50 &&
				draw.index >= 0 &&
				draw.index < 50 &&
				draw.selected === interview.aiHub.name,
			"invalid draw",
		);
		assert(
			path.basename(file) ===
				"Space-Fort-After-Dark-Space-Fortress-gpt-6.1-sol-ultra-20261106-022824.html",
			"name",
		);
	});
	return { passed, failed: failures.length, failures };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const r = runPackageTests();
	r.failures.forEach((f) => console.error("FAIL " + f));
	console.log(r.passed + " passed, " + r.failed + " failed");
	if (r.failed) process.exitCode = 1;
}
