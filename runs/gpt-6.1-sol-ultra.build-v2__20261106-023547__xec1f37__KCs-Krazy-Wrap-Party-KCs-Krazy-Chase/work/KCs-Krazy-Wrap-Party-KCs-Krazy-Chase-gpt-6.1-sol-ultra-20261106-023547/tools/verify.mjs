import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const dev = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const root = path.dirname(dev);
const require = createRequire(import.meta.url);
const args = new Set(process.argv.slice(2));
const all = args.size === 0;
let passed = 0,
	failed = 0;
const suites = [];
const failures = [];
const add = (name, result) => {
	passed += result.passed;
	failed += result.failed;
	for (const failure of result.failures || [])
		failures.push(name + ": " + failure);
	suites.push({ name, passed: result.passed, failed: result.failed });
};
function test(name, fn) {
	try {
		fn();
		add(name, { passed: 1, failed: 0 });
	} catch (err) {
		add(name, { passed: 0, failed: 1, failures: [err.stack || err.message] });
	}
}
function command(name, executable, argv) {
	const p = spawnSync(executable, argv, {
		cwd: dev,
		encoding: "utf8",
		timeout: 420000,
		maxBuffer: 3000000,
	});
	const result = /([0-9]+) passed, ([0-9]+) failed/.exec(p.stdout || "");
	if (!result || p.error || (p.status && Number(result?.[2]) === 0)) {
		add(name, {
			passed: 0,
			failed: 1,
			failures: [p.error?.message || (p.stdout + p.stderr).trim()],
		});
		return;
	}
	add(name, {
		passed: Number(result[1]),
		failed: Number(result[2]),
		failures: (p.stdout + p.stderr)
			.split("\n")
			.filter((line) => line.startsWith("FAIL ")),
	});
}
const built = spawnSync(process.execPath, ["tools/build.mjs"], {
	cwd: dev,
	encoding: "utf8",
});
if (built.status) {
	console.log("FAIL build: " + (built.stderr || built.stdout));
	console.log("0 passed, 1 failed");
	process.exit(1);
}
const project = JSON.parse(
	fs.readFileSync(path.join(dev, "project.json"), "utf8"),
);
const artifact = path.join(root, project.slug + ".html");
const html = fs.readFileSync(artifact, "utf8");
const assert = (ok, message) => {
	if (!ok) throw new Error(message);
};
test("delivery schema and catalogue", () => {
	const report = JSON.parse(
		fs.readFileSync(path.join(root, "exit-interview.json"), "utf8"),
	);
	assert(
		Object.keys(report).join(",") ===
			"sourceInformation,testingFeedback,engineFeedback,promptFeedback,aiHub",
		"Top-level interview schema/order",
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
	assert(
		fields.every(
			(k) =>
				typeof report.sourceInformation[k] === "string" &&
				report.sourceInformation[k].length,
		),
		"Every sourceInformation field filled",
	);
	assert(
		report.sourceInformation.usage === "added on import",
		"Exact usage value",
	);
	assert(
		report.testingFeedback.length === 4 &&
			report.engineFeedback.length === 6 &&
			report.promptFeedback.length === 4,
		"Ordered interview question counts",
	);
	assert(
		report.aiHub.name === project.title && report.aiHub.players === "1–2",
		"Catalogue title/player range",
	);
	assert(
		report.aiHub.tags.length >= 3 &&
			report.aiHub.tags.length <= 6 &&
			report.aiHub.tags.every((t) => t === t.toLowerCase()),
		"Lowercase tags",
	);
	assert(
		html.includes("<title>" + report.aiHub.name + "</title>"),
		"Title consistency",
	);
	assert(
		!JSON.stringify(report).includes("in progress") &&
			!JSON.stringify(report).includes("pending"),
		"No unfinished report answers",
	);
});
test("single-file packaging and pristine protocol client", () => {
	const session = fs.readFileSync(
		path.join(dev, "vendor/hub/session.js"),
		"utf8",
	);
	assert(html.startsWith("<!doctype html>"), "HTML document");
	assert(
		html.indexOf('<meta charset="utf-8"><script>' + session + "</script>") >= 0,
		"Pristine client first after charset",
	);
	assert(html.split(session).length === 2, "Exactly one pristine client");
	assert(!/<script[^>]+src=/.test(html), "No external script dependencies");
	assert(
		html.includes('hub:session-players" content="1-2') &&
			html.includes('hub:session-mode" content="shared-world'),
		"Declared session metadata",
	);
	assert(!html.includes("hub:requires-webgpu"), "No false GPU requirement");
	assert(
		html.includes("my-3D2dge v0.89.1") && html.includes("MIT License"),
		"Engine attribution retained",
	);
	const scripts = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g));
	assert(scripts.length === 9, "All native engine/authored scripts assembled");
	for (const match of scripts) new Function(match[1]);
});
if (all || args.has("--unit")) {
	for (const [name, file] of [
		["simulation", "sim-tests.cjs"],
		["native view/audio", "view-audio-tests.cjs"],
		["application/workshop", "app-tests.cjs"],
	]) {
		try {
			const suite = require(path.join(dev, "tests", file));
			add(name, typeof suite === "function" ? suite() : suite.run());
		} catch (err) {
			add(name, { passed: 0, failed: 1, failures: [err.stack] });
		}
	}
	command("authoritative network", process.execPath, ["tests/net-tests.cjs"]);
}
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
if (all || args.has("--browser")) {
	command("assembled device/controller campaign", python, [
		"tests/app-browser.py",
	]);
	command("assembled synthesized audio", python, [
		"tests/view-audio-browser.py",
	]);
}
if (all || args.has("--hub"))
	command("official Hub and shared-world scenarios", python, [
		"tests/hub-check.py",
	]);
const summary = {
	passed,
	failed,
	suites,
	failures,
	artifact: path.basename(artifact),
	sha256: crypto.createHash("sha256").update(html).digest("hex"),
};
fs.writeFileSync(
	path.join(dev, "artifacts/verification.json"),
	JSON.stringify(summary, null, 2),
);
for (const failure of failures) console.log("FAIL " + failure);
console.log(`${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
