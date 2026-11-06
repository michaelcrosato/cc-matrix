import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const group =
	process.argv.find((a) => a.startsWith("--group="))?.split("=")[1] || "all";
let passed = 0,
	failed = 0;
const failures = [];
const check = (name, ok, detail = "") => {
	if (ok) passed++;
	else {
		failed++;
		failures.push({ name, detail });
		console.log(`FAIL ${name}${detail ? ": " + detail : ""}`);
	}
};
try {
	if (group === "all" || group === "sim") {
		const { simulation } = await import("../tests/simulation.mjs");
		await simulation(check);
	}
	if (group !== "sim") {
		const result = spawnSync(
			"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
			["tests/browser.py", "--group", group],
			{ cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
		);
		if (result.stdout) {
			let report;
			try {
				report = JSON.parse(result.stdout);
			} catch {
				check(
					"browser runner returned JSON",
					false,
					result.stdout.slice(-2000),
				);
			}
			if (report) {
				passed += report.passed;
				failed += report.failed;
				for (const f of report.failures) {
					failures.push(f);
					console.log(`FAIL ${f.name}: ${f.detail}`);
				}
			}
		}
		if (result.status !== 0 && !result.stdout)
			check("browser runner completed", false, result.stderr.slice(-3000));
	}
} catch (error) {
	check("test runner completed", false, error.stack);
}
writeFileSync(
	resolve(root, "evidence/test-results.json"),
	JSON.stringify({ group, passed, failed, failures }, null, 2) + "\n",
);
console.log(`${passed + failed} checks: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
