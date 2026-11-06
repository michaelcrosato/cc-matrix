import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(dir);
const arg = process.argv.indexOf("--suite");
const chosen =
	arg >= 0 ? new Set((process.argv[arg + 1] || "").split(",")) : null;
const wants = (name) => !chosen || chosen.has(name);
let count = 0,
	failedChecks = 0;
const failures = [];
function subprocess(label, executable, args) {
	const p = spawnSync(executable, args, {
		cwd: dir,
		encoding: "utf8",
		maxBuffer: 1024 * 1024 * 4,
	});
	const out = (p.stdout || "") + (p.stderr || "");
	const match = out.match(/(\d+)\/(\d+) .*checks passed/);
	if (match) {
		count += +match[2];
		failedChecks += +match[2] - +match[1];
	}
	if (p.status !== 0) {
		if (!match) failedChecks++;
		failures.push(
			label +
				": " +
				out
					.trim()
					.replace(/^\d+\/\d+ .*checks passed\s*$/gm, "")
					.trim(),
		);
	}
}
if (wants("sim")) {
	const { runSimulationTests } = await import("../tests/sim.test.mjs");
	const r = await runSimulationTests();
	count += r.total;
	failedChecks += r.failures.length;
	failures.push(...r.failures.map((f) => "simulation: " + f));
}
if (wants("net")) {
	const { runNetworkTests } = await import("../tests/net.test.mjs");
	const r = await runNetworkTests();
	count += r.count;
	failedChecks += r.failures.length;
	failures.push(...r.failures.map((f) => "network: " + f));
}
if (wants("art")) {
	const { runArtTests } = await import("../tests/art.test.mjs");
	const r = await runArtTests();
	count += r.count ?? r.total;
	failedChecks += r.failures.length;
	failures.push(...r.failures.map((f) => "art: " + f));
}
if (wants("input")) {
	const { runInputTests } = await import("../tests/input.test.mjs");
	const r = await runInputTests();
	count += r.count;
	failedChecks += r.failures.length;
	failures.push(...r.failures.map((f) => "input: " + f));
}
if (wants("campaign")) {
	const { runHubCampaignTests } = await import(
		"../tests/hub-campaign.test.mjs"
	);
	const r = await runHubCampaignTests({ full: true });
	count += r.count;
	failedChecks += r.failures.length;
	failures.push(...r.failures.map((f) => "Hub campaign: " + f));
}
if (wants("export") || wants("browser") || wants("hub")) {
	const p = spawnSync(process.execPath, ["tools/build.mjs", "--quiet"], {
		encoding: "utf8",
	});
	if (p.status !== 0) {
		failedChecks++;
		failures.push("bundle: " + p.stderr);
	}
}
if (wants("export")) {
	const { runExportTests } = await import("../tests/export.test.mjs");
	const r = await runExportTests();
	count += r.count;
	failedChecks += r.failures.length;
	failures.push(...r.failures.map((f) => "export: " + f));
}
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
if (wants("browser")) subprocess("browser", python, ["tests/browser.py"]);
if (wants("hub")) subprocess("Hub harness", python, ["tests/hub.py"]);
for (const failure of failures) console.error(failure);
console.log(
	`${Math.max(0, count - failedChecks)}/${count} checks passed${failedChecks ? " · " + failedChecks + " failures" : ""}`,
);
if (failures.length) process.exitCode = 1;
