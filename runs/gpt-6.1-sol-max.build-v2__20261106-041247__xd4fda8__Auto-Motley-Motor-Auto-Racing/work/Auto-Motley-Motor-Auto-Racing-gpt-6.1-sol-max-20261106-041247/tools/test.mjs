import fs from "node:fs";
import { coreTests } from "../tests/core.mjs";
import { packageTests } from "../tests/package.mjs";

let total = 0,
	failed = 0;
const outcomes = [];
const filter = process.argv[2] || "all";
async function test(name, fn) {
	total++;
	try {
		await fn();
		outcomes.push({ name, pass: true });
	} catch (e) {
		failed++;
		outcomes.push({ name, pass: false, detail: e.message });
		console.error("FAIL " + name + ": " + e.message);
	}
}
if (["all", "core", "sim", "grand"].includes(filter))
	await coreTests(test, filter);
if (["all", "package"].includes(filter)) await packageTests(test);
if (
	[
		"all",
		"browser",
		"net",
		"tour",
		"input",
		"couch",
		"touch",
		"audio",
		"direct",
		"hub",
		"seats",
		"loopback",
		"visual",
	].includes(filter) &&
	fs.existsSync("tests/browser.py")
) {
	const { spawnSync } = await import("node:child_process");
	const r = spawnSync(
		"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
		["tests/browser.py", filter],
		{ encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
	);
	try {
		const result = JSON.parse(r.stdout.trim());
		total += result.total;
		outcomes.push(...(result.outcomes || []));
		for (const failure of result.failures) {
			console.error("FAIL " + failure);
			failed++;
		}
	} catch {
		console.error("FAIL browser runner: " + r.stdout + " " + r.stderr);
		failed++;
		total++;
	}
}
fs.mkdirSync("docs/evidence", { recursive: true });
fs.writeFileSync(
	"docs/evidence/tests-" + filter + ".json",
	JSON.stringify({ filter, total, failed, outcomes }, null, 2),
);
console.log(total + " checks; " + failed + " failures.");
process.exitCode = failed ? 1 : 0;
