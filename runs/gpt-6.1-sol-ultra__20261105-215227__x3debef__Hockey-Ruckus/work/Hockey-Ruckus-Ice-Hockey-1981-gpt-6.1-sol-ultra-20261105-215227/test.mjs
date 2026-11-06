import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
const execute = promisify(execFile),
	dir = path.dirname(fileURLToPath(import.meta.url));
const python =
	process.env.PLAYWRIGHT_PYTHON ||
	"/home/micha/.local/share/pipx/venvs/playwright/bin/python";
const suites = [
	["physics", process.execPath, ["tests-physics.mjs"]],
	["browser", python, ["tests-browser.py"]],
	["direct networking", python, ["network-dev/test-network.py"]],
	["AI Hub and recovery", python, ["network-dev/test-hub-game.py"]],
];
let passed = 0,
	total = 0,
	failedSuites = 0;
for (const [label, command, args] of suites) {
	let output = "",
		ok = true;
	try {
		const r = await execute(command, args, {
			cwd: dir,
			timeout: 420000,
			maxBuffer: 4 * 1024 * 1024,
		});
		output = r.stdout + "\n" + r.stderr;
	} catch (e) {
		output = (e.stdout || "") + "\n" + (e.stderr || "");
		ok = false;
	}
	const lines = output.split("\n");
	for (const line of lines) if (line.startsWith("FAIL ")) console.log(line);
	const physics = output.match(
			/(\d+) physics checks: (\d+) passed, (\d+) failed/,
		),
		browser = output.match(
			/(\d+) passed, (\d+) failed \((\d+) browser checks\)/,
		),
		network = output.match(
			/(\d+)\/(\d+) (?:assembled-game )?network checks passed/,
		);
	if (physics) {
		total += +physics[1];
		passed += +physics[2];
	} else if (browser) {
		total += +browser[3];
		passed += +browser[1];
	} else if (network) {
		total += +network[2];
		passed += +network[1];
	} else {
		total++;
		ok = false;
		console.log(
			`FAIL ${label}: no test summary; ${lines.filter((x) => x.trim()).slice(-1)[0] || "test process failed"}`,
		);
	}
	if (!ok) failedSuites++;
}
console.log(`${passed}/${total} checks passed; ${total - passed} failures.`);
process.exitCode = failedSuites ? 1 : 0;
