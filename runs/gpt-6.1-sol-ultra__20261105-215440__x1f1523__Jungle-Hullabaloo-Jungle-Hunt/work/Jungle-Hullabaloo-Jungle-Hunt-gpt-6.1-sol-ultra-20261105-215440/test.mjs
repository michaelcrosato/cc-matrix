import { spawnSync } from "node:child_process";
import fs from "node:fs";
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
const groups = [
	["model", "node", ["model-tests.mjs"]],
	["scene", "node", ["scene-tests.mjs"]],
	["network", python, ["network-check.py", "--internet"]],
	["browser", python, ["browser-check.py"]],
	["hub", python, ["hub-check.py"]],
];
let passed = 0,
	failed = 0;
const reports = [];
for (const [name, bin, args] of groups) {
	const run = spawnSync(bin, args, {
		encoding: "utf8",
		timeout: 360000,
		maxBuffer: 4 * 1024 * 1024,
	});
	const output = (run.stdout || "") + "\n" + (run.stderr || "");
	const match = [...output.matchAll(/(\d+) passed, (\d+) failed/g)].at(-1);
	const p = match ? +match[1] : 0,
		f = match ? +match[2] : 1;
	passed += p;
	failed += f;
	reports.push({ name, passed: p, failed: f, status: run.status });
	if (run.status !== 0 || f) {
		let lines = output.split("\n").filter((x) => x.startsWith("FAIL"));
		if (!lines.length)
			lines = [
				output.trim().slice(-2200) || String(run.error || "Unknown error"),
			];
		for (let line of lines) console.log(line);
		if (run.status !== 0 && f === 0) failed++;
	}
}
try {
	const data = JSON.parse(fs.readFileSync("../exit-interview.json", "utf8"));
	const name = data.aiHub.name;
	const html = fs.readFileSync(
		"../" +
			JSON.parse(fs.readFileSync("title-selection.json", "utf8")).folder +
			".html",
		"utf8",
	);
	for (const condition of [
		html.includes("<title>" + name + "</title>"),
		html.includes("Source Information"),
		html.includes("testing Feedback") || html.includes("Testing Feedback"),
		data.sourceInformation.usage === "added on import",
	]) {
		if (condition) passed++;
		else {
			failed++;
			console.log("FAIL deliverable metadata");
		}
	}
} catch (e) {
	failed++;
	console.log("FAIL deliverable: " + e.message);
}
fs.writeFileSync(
	"test-results.json",
	JSON.stringify({ passed, failed, groups: reports }, null, 2),
);
console.log(`${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
