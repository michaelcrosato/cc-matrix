import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { readFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dev } from "./load.mjs";
let count = 0,
	cached = 0;
const failures = [];
const temp = resolve(dev, "artifacts/runtime");
mkdirSync(temp, { recursive: true });
const fingerprint = createHash("sha256")
	.update(
		Buffer.concat(
			["config", "sim", "input", "bot", "net", "main"]
				.map((n) => readFileSync(resolve(dev, "src", n + ".js")))
				.concat([
					readFileSync(resolve(dev, "vendor/engine/dist/handoff/my-3d2dge.js")),
					readFileSync(resolve(dev, "vendor/ai-hub/lib/hub/session.js")),
					readFileSync(resolve(dev, "tests/cooperative.py")),
				]),
		),
	)
	.digest("hex");
const commands = [
	["node", ["tests/rules.mjs"]],
	[
		"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
		["tests/browser.py"],
	],
];
let saved = null;
try {
	saved = JSON.parse(
		readFileSync(resolve(dev, "artifacts/cooperative-results.json"), "utf8"),
	);
} catch {}
if (
	!process.argv.includes("--full") &&
	saved?.fingerprint === fingerprint &&
	saved.failures.length === 0 &&
	saved.count >= 10
) {
	cached = saved.count;
	count += cached;
} else
	commands.push([
		"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
		["tests/cooperative.py"],
	]);
for (const [cmd, args] of commands) {
	const r = spawnSync(cmd, args, {
		cwd: dev,
		encoding: "utf8",
		env: { ...process.env, TMPDIR: temp },
		maxBuffer: 16 * 1024 * 1024,
		timeout: 1200000,
	});
	try {
		const data = JSON.parse(r.stdout.trim().split("\n").at(-1));
		count += data.count;
		failures.push(...data.failures, ...(data.logs || []));
		if (r.status !== 0)
			failures.push(cmd + " exited " + r.status + ": " + r.stderr.slice(-2500));
	} catch {
		failures.push(
			cmd + ": " + (r.error?.message || r.stderr || r.stdout).slice(-3500),
		);
	}
}
for (const failure of failures) console.log("FAIL " + failure);
console.log(
	`${count} checks; ${failures.length} failures${cached ? ` (${cached} unchanged co-op checks reused)` : ""}`,
);
process.exitCode = failures.length ? 1 : 0;
