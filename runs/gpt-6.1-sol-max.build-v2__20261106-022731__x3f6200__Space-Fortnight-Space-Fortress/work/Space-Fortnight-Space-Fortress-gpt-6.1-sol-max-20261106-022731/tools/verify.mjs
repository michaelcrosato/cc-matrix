import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const selected = process.argv.slice(2),
	suites = selected.length ? selected : ["simulation", "browser", "hub"];
let passed = 0,
	failed = 0;
for (const suite of suites) {
	const args =
		suite === "simulation"
			? ["tests/simulation.mjs"]
			: ["tests/browser_checks.py", suite];
	const cmd =
		suite === "simulation"
			? process.execPath
			: "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
	const result = spawnSync(cmd, args, {
		cwd: root,
		encoding: "utf8",
		maxBuffer: 10 * 1024 * 1024,
	});
	try {
		const tests = JSON.parse(result.stdout.trim());
		writeFileSync(
			path.join(root, "evidence", suite + "-checks.json"),
			JSON.stringify(tests, null, 2) + "\n",
		);
		for (const t of tests) {
			if (t.pass) passed++;
			else {
				failed++;
				console.error(`FAIL ${suite}: ${t.name}\n${t.error || t.detail}`);
			}
		}
		if (result.status && tests.every((t) => t.pass)) {
			failed++;
			console.error(`FAIL ${suite}: ${result.stderr}`);
		}
	} catch {
		failed++;
		console.error(`FAIL ${suite}: ${result.stdout}\n${result.stderr}`);
	}
}
console.log(`${passed} checks passed; ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
