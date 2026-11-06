import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { runHubExpedition } from "../tests/hub-expedition.mjs";
import { runHubNative } from "../tests/hub-native.mjs";
import { runHubUnit } from "../tests/hub-unit.mjs";
import { runPackaging } from "../tests/packaging.mjs";
import { runSimTests } from "../tests/sim.test.mjs";
import { runHubChecks } from "./hub-check.mjs";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
	exec = promisify(execFile);
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
let count = 0;
const evidence = {},
	failures = [];
async function check(name, fn) {
	try {
		const value = await fn();
		evidence[name] = value;
		count += typeof value === "number" ? value : value.count;
	} catch (error) {
		failures.push(`${name}: ${error.stderr || error.stack || error.message}`);
	}
}
async function browser(file) {
	const result = await exec(python, [file], {
		cwd: dir,
		maxBuffer: 4 * 1024 * 1024,
		timeout: 300000,
	});
	const match = result.stdout.match(/^(\d+)(?:\/\d+)?[^\n]*checks passed$/m);
	if (!match)
		throw new Error(`Missing quiet count from ${file}: ${result.stdout}`);
	return Number(match[1]);
}
await check("Build", async () => {
	await exec(process.execPath, ["tools/build.mjs", "--quiet"], { cwd: dir });
	return 1;
});
await check("Native simulation and all routes", runSimTests);
await check("Hub protocol unit", runHubUnit);
await check("Hub native movement, authority and loss", runHubNative);
for (let route = 0; route < 3; route++)
	await check(`Hub complete expedition route ${route}`, () =>
		runHubExpedition({ route }),
	);
await check("Hub hidden authority complete expedition", () =>
	runHubExpedition({ route: 0, server: true }),
);
await check("Packaging, provenance and demo coverage", runPackaging);
await check("Coded audio, input ownership and multitouch", () =>
	browser("tests/audio-browser.py"),
);
await check("Integrated browser, menus and touch", () =>
	browser("tests/browser.py"),
);
await check("WebKit standalone and actual touch", () =>
	browser("tests/webkit.py"),
);
await check("Official Hub browser harness", runHubChecks);
await writeFile(
	path.join(dir, "evidence", "verification.json"),
	JSON.stringify(
		{ count, passed: failures.length === 0, evidence, failures },
		null,
		2,
	),
);
if (failures.length) {
	for (const failure of failures) console.error(failure);
	process.exitCode = 1;
} else console.log(`${count} checks passed`);
