import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { runNativeTests } from "../tests/native.mjs";
import { runNetworkUnitTests } from "../tests/network-unit.mjs";
import { runPackageTests } from "../tests/package.mjs";
import { runSimulationTests } from "../tests/simulation.mjs";

const root = path.resolve(import.meta.dirname, ".."),
	artifact = path.join(
		root,
		"..",
		`${JSON.parse(fs.readFileSync(path.join(root, "selection.json"))).slug}.html`,
	),
	evidence = path.join(root, "evidence");
fs.mkdirSync(evidence, { recursive: true });
const failures = [],
	groups = [];
let count = 0;
function group(name, fn) {
	try {
		const r = fn();
		fs.writeFileSync(
			path.join(evidence, `${name}-aggregate.json`),
			JSON.stringify(r, null, 2),
		);
		const list = Array.isArray(r) ? r : r.results;
		const n = Array.isArray(r) ? r.length : r.checks;
		count += n;
		const bad = list
			? list
					.filter((t) => !t.pass)
					.map((t) => t.name + (t.detail ? `: ${t.detail}` : ""))
			: r.failures;
		failures.push(...bad.map((s) => `${name}: ${s}`));
		groups.push({ name, checks: n, passed: n - bad.length });
	} catch (e) {
		failures.push(`${name}: ${e.stack}`);
		groups.push({ name, error: String(e) });
	}
}
group("simulation", runSimulationTests);
group("native", runNativeTests);
group("network-unit", runNetworkUnitTests);
group("package", runPackageTests);
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
for (const [name, file, args] of [
	["audio", "tests/audio.py", [artifact]],
	["browser", "tests/browser.py", [artifact]],
	["network", "tests/network.py", []],
]) {
	const r = spawnSync(python, [file, ...args], {
		cwd: root,
		encoding: "utf8",
		timeout: 240000,
		maxBuffer: 4 * 1024 * 1024,
	});
	const output = `${r.stdout || ""}\n${r.stderr || ""}`;
	const last = [...output.matchAll(/(\d+)\/(\d+).*checks passed/g)].at(-1);
	if (last) {
		const n = Number(last[2]);
		count += n;
		groups.push({ name, checks: n, passed: Number(last[1]) });
	}
	const lines = output.split("\n").filter((s) => /^FAIL/.test(s));
	failures.push(...lines.map((s) => `${name}: ${s}`));
	if (r.status !== 0 && !lines.length)
		failures.push(
			`${name}: ${r.error?.message || output.trim() || "process failed"}`,
		);
}
for (const s of failures) console.error(`FAIL ${s}`);
const report = {
	checks: count,
	passed: count - failures.length,
	failed: failures.length,
	groups,
	failures,
};
fs.writeFileSync(
	path.join(evidence, "test-results.json"),
	JSON.stringify(report, null, 2),
);
console.log(`${count - failures.length}/${count} checks passed`);
process.exitCode = failures.length ? 1 : 0;
