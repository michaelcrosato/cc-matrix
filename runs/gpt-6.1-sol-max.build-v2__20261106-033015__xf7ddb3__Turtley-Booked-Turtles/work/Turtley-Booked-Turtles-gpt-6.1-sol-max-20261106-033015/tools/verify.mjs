import { spawnSync } from "node:child_process";
import path from "node:path";

process.chdir(path.resolve(import.meta.dirname, ".."));
const suites = process.argv.slice(2);
let count = 0,
	failed = 0;
const jobs = [];
if (!suites.length || suites.includes("browser"))
	jobs.push([
		"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
		["tests/browser.py"],
	]);
if (!suites.length || suites.includes("rules"))
	jobs.push(["node", ["tests/rules.mjs"]]);
for (const s of ["devices", "audio", "visuals"])
	if (!suites.length || suites.includes(s))
		jobs.push([
			"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
			["tests/" + s + ".py"],
		]);
if (!suites.length || suites.includes("network"))
	jobs.push(["node", ["tests/network.mjs"]]);
if (!suites.length || suites.includes("lifecycle"))
	jobs.push(["node", ["tests/lifecycle.mjs"]]);
if (suites.includes("network-search"))
	jobs.push(["node", ["tests/network.mjs", "--search"]]);
if (suites.includes("tuning")) jobs.push(["node", ["tests/tuning.mjs"]]);
if (!suites.length || suites.includes("export"))
	jobs.push(["node", ["tests/export.mjs"]]);
if (!suites.length || suites.includes("hub-campaign"))
	jobs.push([
		"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
		["tests/hub_campaign.py"],
	]);
if (!suites.length || suites.includes("hub"))
	jobs.push([
		"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
		["tests/hub.py"],
	]);
for (const [cmd, args] of jobs) {
	const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 2e6 });
	const lines = r.stdout.trim().split("\n");
	let report;
	try {
		report = JSON.parse(lines.at(-1));
	} catch {
		report = { count: 0, failures: [r.stdout + r.stderr] };
	}
	count += report.count;
	failed += report.failures.length;
	for (const f of report.failures) console.error("FAIL " + f);
	if (r.status && !report.failures.length) {
		failed++;
		console.error(r.stderr || "Suite failed");
	}
}
console.log(`${count} checks, ${failed} failures.`);
process.exitCode = failed ? 1 : 0;
