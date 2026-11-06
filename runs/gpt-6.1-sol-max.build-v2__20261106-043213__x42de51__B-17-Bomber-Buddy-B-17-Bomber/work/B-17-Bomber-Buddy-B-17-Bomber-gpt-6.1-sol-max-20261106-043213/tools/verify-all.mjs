import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
const suites = [
	["state", process.execPath, ["tests/verify.mjs"]],
	["browser", python, ["-u", "tests/browser.py"]],
	["Hub", python, ["-u", "tests/hub.py"]],
	["renderers", python, ["-u", "tests/renderers.py"]],
	["release", python, ["-u", "tests/release.py"]],
];
let total = 0,
	passed = 0,
	failed = 0;
const runs = [];
for (const [name, exe, args] of suites) {
	const r = spawnSync(exe, args, {
		encoding: "utf8",
		maxBuffer: 1024 * 1024 * 4,
	});
	const out = (r.stdout || "") + (r.stderr || "");
	const counts = [
		...out.matchAll(/(\d+)\/(\d+) [^\n]*passed; (\d+) failures/g),
	].at(-1);
	if (counts) {
		passed += +counts[1];
		total += +counts[2];
		failed += +counts[3];
	} else {
		total++;
		failed++;
	}
	if (r.status !== 0) {
		for (const line of out.split("\n").filter((x) => x.startsWith("FAIL")))
			console.error(line);
		if (!out.includes("FAIL"))
			console.error("FAIL " + name + ": " + out.slice(-1500));
	}
	runs.push({ name, status: r.status, output: out });
}
writeFileSync(
	"docs/release-verification.json",
	JSON.stringify({ passed, total, failed, runs }, null, 2),
);
console.log(`${passed}/${total} checks passed; ${failed} failures`);
process.exitCode = failed ? 1 : 0;
