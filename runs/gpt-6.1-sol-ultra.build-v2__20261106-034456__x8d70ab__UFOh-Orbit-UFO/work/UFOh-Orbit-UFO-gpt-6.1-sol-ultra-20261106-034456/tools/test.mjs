import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { runFoundationTests } from "../tests/foundation.mjs";
import { runHubTests } from "../tests/hub.mjs";
import { runSimulationTests } from "../tests/simulation.mjs";

const reports = {};
let passed = 0,
	failed = 0;
const failures = [];
function collect(name, r) {
	reports[name] = r;
	passed += r.passed || 0;
	failed += r.failed || 0;
	for (const f of r.failures || []) failures.push(name + ": " + f);
}
for (const [name, fn] of [
	["simulation", runSimulationTests],
	["hub-unit", runHubTests],
	["foundation", runFoundationTests],
]) {
	try {
		collect(name, await fn());
	} catch (e) {
		collect(name, { passed: 0, failed: 1, failures: [e.stack || e.message] });
	}
}
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
for (const [name, file] of [
	["audio", "tests/audio-browser.py"],
	["ui", "tests/ui-browser.py"],
	["hub-browser", "tests/hub-browser.py"],
	["final-artifact", "tests/final-browser.py"],
]) {
	const r = spawnSync(python, [file], {
		cwd: new URL("..", import.meta.url),
		encoding: "utf8",
		maxBuffer: 15 * 1024 * 1024,
		timeout: 240000,
	});
	try {
		const lines = r.stdout.trim().split("\n");
		const report = JSON.parse(lines.at(-1));
		collect(name, report);
		if (r.status !== 0 && !report.failed)
			throw Error(r.stderr || "Test process failed");
	} catch (e) {
		collect(name, {
			passed: 0,
			failed: 1,
			failures: [(r.stderr || r.stdout || e.message).slice(-6000)],
		});
	}
}
await mkdir(new URL("../artifacts", import.meta.url), { recursive: true });
await writeFile(
	new URL("../artifacts/test-report.json", import.meta.url),
	JSON.stringify({ passed, failed, failures, reports }, null, 2),
);
for (const f of failures) console.error(f);
console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
