import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url))),
	artifact = path.join(dir, "..", path.basename(dir) + ".html");
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
const selected = process.argv.slice(2),
	runAll = !selected.length;
const suites = [
	["simulation", process.execPath, ["tests/simulation.mjs"]],
	["render", process.execPath, ["tests/render.mjs"]],
	["online", process.execPath, ["tests/online.mjs"]],
	["package", process.execPath, ["tests/package.mjs"]],
	[
		"browser",
		python,
		["tests/browser.py", artifact, "--report", "docs/browser-report.json"],
	],
	[
		"audio",
		python,
		["tests/audio_browser.py", artifact, "--report", "docs/audio-report.json"],
	],
	[
		"hub",
		python,
		["tests/hub_browser.py", artifact, "--report", "docs/hub-evidence.json"],
	],
	[
		"hub-gameplay",
		python,
		[
			"tests/hub_gameplay.py",
			artifact,
			"--report",
			"docs/hub-gameplay-evidence.json",
		],
	],
];
let passed = 0,
	failed = 0,
	groups = 0;
const failures = [];
for (const [name, cmd, args] of suites) {
	if (!runAll && !selected.includes(name)) continue;
	groups++;
	const result = spawnSync(cmd, args, {
		cwd: dir,
		encoding: "utf8",
		timeout: 300000,
		maxBuffer: 8 * 1024 * 1024,
	});
	const out = (result.stdout || "") + (result.stderr || ""),
		matches = [...out.matchAll(/(\d+)(?: [A-Za-z]+)* passed, (\d+) failed/g)];
	if (matches.length) {
		passed += +matches.at(-1)[1];
		failed += +matches.at(-1)[2];
	}
	if (result.status !== 0 || result.error) {
		if (!matches.length || +matches.at(-1)[2] === 0) failed++;
		failures.push(
			name +
				":\n" +
				out.trim() +
				(result.error ? "\n" + result.error.message : ""),
		);
	}
}
if (!groups) {
	failed++;
	failures.push("Unknown suite: " + selected.join(", "));
}
for (const failure of failures) console.error("FAIL " + failure);
fs.writeFileSync(
	path.join(dir, "docs/verification.json"),
	JSON.stringify(
		{
			passed,
			failed,
			suites: groups,
			selected: runAll ? "all" : selected,
			artifact: path.basename(artifact),
		},
		null,
		2,
	) + "\n",
);
console.log(passed + " passed, " + failed + " failed (" + groups + " suites)");
if (failed) process.exitCode = 1;
