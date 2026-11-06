import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runSimulation } from "./simulation.mjs";
import { runHubUnit } from "./hub-unit.mjs";
import { runArtifact } from "./artifact.mjs";
import { runViewChecks } from "./view-browser.mjs";
import { runViewHeadlessChecks } from "./view-headless.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
fs.mkdirSync(path.join(root, "artifacts/browser-tmp"), { recursive: true });
process.env.TMPDIR = path.join(root, "artifacts/browser-tmp");
const results = [];
for (const [name, run] of [
	["simulation", runSimulation],
	[
		"native draw",
		async () => {
			const r = await runViewHeadlessChecks();
			return { checks: r.count, failures: r.failures };
		},
	],
	["Hub authority", runHubUnit],
	["artifact", runArtifact],
]) {
	try {
		const r = await run();
		results.push({ name, ...r });
		fs.writeFileSync(
			path.join(root, "artifacts", name.replaceAll(" ", "-") + ".json"),
			JSON.stringify(r, null, 2) + "\n",
		);
	} catch (e) {
		results.push({ name, checks: 1, failures: [e.stack] });
	}
}
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
for (const [name, script, args] of [
	["UI and devices", "tests/ui-input.py", []],
	[
		"Hub browser",
		"tests/hub-browser.py",
		[
			path.join(
				root,
				"..",
				JSON.parse(fs.readFileSync("project.json")).basename + ".html",
			),
		],
	],
	["Browser and audio", "tests/browser.py", []],
]) {
	if (!fs.existsSync(script)) {
		results.push({
			name,
			checks: 1,
			failures: ["Missing required runner " + script],
		});
		continue;
	}
	const r = spawnSync(python, [script, ...args], {
		cwd: root,
		encoding: "utf8",
		timeout: 300000,
		maxBuffer: 1048576,
	});
	const output = (r.stdout || "") + "\n" + (r.stderr || "");
	const match = [...output.matchAll(/(\d+) checks, (\d+) failures/g)].at(-1);
	const failures = [];
	if (r.status !== 0 || !match || Number(match[2]) > 0)
		failures.push(output.trim() || String(r.error || "Browser runner failed"));
	results.push({ name, checks: match ? Number(match[1]) : 1, failures });
}
try {
	const r = await runViewChecks();
	results.push({
		name: "Native presentation",
		checks: r.count,
		failures: r.failures,
	});
} catch (e) {
	results.push({ name: "Native presentation", checks: 1, failures: [e.stack] });
}
const count = results.reduce((n, r) => n + r.checks, 0),
	failures = results.flatMap((r) =>
		r.failures.map((message) => ({ suite: r.name, message })),
	);
for (const f of failures) console.error(`FAIL [${f.suite}] ${f.message}`);
console.log(`${count} checks, ${failures.length} failures`);
fs.writeFileSync(
	"artifacts/verification.json",
	JSON.stringify(
		{
			checks: count,
			failures,
			results: results.map(({ name, checks, failures }) => ({
				name,
				checks,
				failures,
			})),
		},
		null,
		2,
	) + "\n",
);
process.exitCode = failures.length ? 1 : 0;
