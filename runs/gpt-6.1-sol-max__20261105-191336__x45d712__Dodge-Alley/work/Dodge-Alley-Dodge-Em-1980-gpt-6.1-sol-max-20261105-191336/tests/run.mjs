import { spawnSync } from "node:child_process";
let count = 0,
	failures = 0;
const suites = process.argv.includes("--input")
	? [
			[
				"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
				["tests/input-probe.py"],
			],
		]
	: [
			["node", ["tests/integrity.mjs"]],
			["node", ["tests/core.mjs"]],
			[
				"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
				["tests/browser.py"],
			],
		];
for (const [cmd, args] of suites) {
	if (process.argv.includes("--browser") && !args[0].endsWith("browser.py"))
		continue;
	if (process.argv.includes("--core") && args[0].endsWith("browser.py"))
		continue;
	const r = spawnSync(cmd, args, {
		encoding: "utf8",
		maxBuffer: 4 * 1024 * 1024,
	});
	const lines = (r.stdout || "").trim().split("\n");
	let reported = false;
	for (const line of lines) {
		try {
			const s = JSON.parse(line);
			if (typeof s.count === "number") {
				count += s.count;
				failures += s.failures;
				reported = true;
				continue;
			}
		} catch {}
		if (line.startsWith("FAIL")) console.log(line);
	}
	if (r.status !== 0 && !reported) {
		failures++;
		console.log(
			"FAIL runner: " +
				cmd +
				" " +
				args.join(" ") +
				" — " +
				(r.stderr || r.stdout).slice(-2400),
		);
	}
}
console.log(`${count} checks, ${failures} failures`);
if (failures) process.exitCode = 1;
