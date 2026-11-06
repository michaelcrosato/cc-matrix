import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { verifyCore, scriptedRoute } from "./test-core.mjs";
import { testSave } from "./test-save.mjs";
import { testNet } from "./test-net.mjs";
let count = 0;
const failures = [];
for (const [group, fn] of [
	["Rules/content", verifyCore],
	["Authority/transport", testNet],
	["Persistence", testSave],
]) {
	try {
		const result = await fn();
		count += result.count;
		for (const f of result.failures)
			failures.push(
				`${group}: ${typeof f === "string" ? f : f.name + " " + f.error}`,
			);
	} catch (e) {
		count++;
		failures.push(`${group}: ${e.stack}`);
	}
}
const config = JSON.parse(fs.readFileSync("build-config.json", "utf8"));
const artifact = path.resolve("..", config.slug + ".html");
const check = (name, value) => {
	count++;
	if (!value) failures.push(name);
};
try {
	const html = fs.readFileSync(artifact, "utf8"),
		report = JSON.parse(fs.readFileSync("../exit-interview.json", "utf8"));
	check(
		"Session client is the first script immediately after charset",
		/<meta charset="utf-8"><script>/.test(html),
	);
	check(
		"Shared-world one-to-two-player Hub metadata ships",
		html.includes('name="hub:session-players" content="1-2"') &&
			html.includes('name="hub:session-mode" content="shared-world"'),
	);
	check(
		"Single HTML has no neighboring script or stylesheet dependencies",
		!/<script[^>]+src=|<link[^>]+(?:href=)/i.test(
			html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, "$1</script>"),
		),
	);
	check(
		"Canonical machine-readable report matches copied delivery report",
		JSON.stringify(report) ===
			JSON.stringify(JSON.parse(fs.readFileSync("report.json", "utf8"))),
	);
	check(
		"Exit report has exact top-level schema and required arrays",
		Object.keys(report).sort().join(",") ===
			"aiHub,engineFeedback,promptFeedback,sourceInformation,testingFeedback" &&
			report.testingFeedback.length === 4 &&
			report.engineFeedback.length === 6 &&
			report.promptFeedback.length === 4 &&
			report.sourceInformation.usage === "added on import",
	);
	check(
		"All report fields are filled",
		Object.values(report.sourceInformation).every(
			(x) => typeof x === "string" && x.length > 0,
		),
	);
	fs.writeFileSync(
		"evidence/solo-route.json",
		JSON.stringify(scriptedRoute().actions),
	);
} catch (e) {
	count++;
	failures.push("Packaging/report: " + e.stack);
}
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
for (const [name, args, reportPath] of [
	[
		"Release browser",
		["tools/browser-check.py"],
		"evidence/browser-report.json",
	],
	[
		"Renderer compatibility",
		["tools/cross-browser.py"],
		"evidence/cross-browser-report.json",
	],
	[
		"Release WebRTC",
		["tools/hub-browser.py", "--game", artifact, "--scenario", "ui-peer"],
		"tools/network-evidence/release-peer-report.json",
	],
	[
		"Official Hub",
		["tools/hub-browser.py", "--game", artifact, "--scenario", "all"],
		"tools/network-evidence/hub-report.json",
	],
]) {
	const r = spawnSync(python, args, {
		encoding: "utf8",
		maxBuffer: 4000000,
		timeout: 600000,
	});
	let report;
	try {
		report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
	} catch {}
	const n = report?.count ?? report?.checks ?? 1;
	count += n;
	if (r.status !== 0) {
		const details =
			(r.stdout || "") + (r.stderr || "") + (r.error?.message ?? "");
		failures.push(`${name}: ${details.trim() || "failed without a report"}`);
	}
}
fs.writeFileSync(
	"evidence/verification.json",
	JSON.stringify(
		{
			count,
			passed: count - failures.length,
			failures,
			artifact: path.basename(artifact),
		},
		null,
		2,
	),
);
for (const f of failures) console.error("FAIL " + f);
console.log(`${count - failures.length}/${count} verification checks passed`);
process.exitCode = failures.length ? 1 : 0;
