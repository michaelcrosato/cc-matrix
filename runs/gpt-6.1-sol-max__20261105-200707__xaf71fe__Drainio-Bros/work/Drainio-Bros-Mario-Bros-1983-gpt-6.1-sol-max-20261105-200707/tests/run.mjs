import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function run(command, args) {
	return new Promise((resolve) => {
		const p = spawn(command, args, { cwd });
		let stdout = "",
			stderr = "";
		p.stdout.on("data", (d) => (stdout += d));
		p.stderr.on("data", (d) => (stderr += d));
		p.on("exit", (code) => {
			try {
				resolve(JSON.parse(stdout.trim().split("\n").at(-1)));
			} catch {
				resolve([
					{
						name: command,
						pass: false,
						error: `${stdout}\n${stderr}`.slice(-2000),
					},
				]);
			}
		});
	});
}
await mkdir(path.join(cwd, ".cache"), { recursive: true });
process.env.TMPDIR = path.join(cwd, ".cache");
const core = await run(process.execPath, ["tests/core.test.mjs"]);
const browser = await run(
	"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
	["tests/browser.py"],
);
const results = [...core, ...browser];
await writeFile(
	path.join(cwd, "tests", "latest-results.json"),
	JSON.stringify(results, null, 2) + "\n",
);
const failures = results.filter((r) => !r.pass);
for (const f of failures) console.log(`FAIL ${f.name}: ${f.error}`);
console.log(
	`${results.length - failures.length}/${results.length} checks passed${failures.length ? `; ${failures.length} failed` : ""}.`,
);
process.exitCode = failures.length ? 1 : 0;
