import { spawnSync } from "node:child_process";
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
const suites = [
	["node", "test-game.mjs"],
	["node", "test-net.mjs"],
	[python, "test-audio.py"],
	[python, "test-input.py"],
	[python, "test-scene.py"],
	[python, "test-browser-input.py"],
	[python, "test-package.py"],
	[python, "test-hub.py"],
];
let checks = 0,
	failures = 0;
for (const [command, ...args] of suites) {
	if (
		process.argv.length > 2 &&
		!process.argv.slice(2).some((name) => args[0].includes(name))
	)
		continue;
	const run = spawnSync(command, args, {
		encoding: "utf8",
		cwd: import.meta.dirname,
		timeout: 240000,
		maxBuffer: 1024 * 1024,
	});
	const output = (run.stdout || "") + "\n" + (run.stderr || "");
	const count = output.match(/(\d+)(?:\/\d+)?[^\n]*checks(?: passed|,)/);
	if (count) checks += Number(count[1]);
	const lines = output.split("\n").filter((l) => /^FAIL/.test(l));
	for (const line of lines) console.log(line);
	if (run.status !== 0) {
		failures += Math.max(1, lines.length);
		if (!lines.length)
			console.log(
				"FAIL " +
					args[0] +
					": " +
					(run.error?.message || output.trim().slice(-1500)),
			);
	}
}
console.log(`${checks} checks, ${failures} failures`);
process.exitCode = failures ? 1 : 0;
