import { testNetwork } from "./network.test.mjs";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
let count = 0;
const failures = [];
function check(condition, label) {
	count++;
	if (!condition) failures.push(label);
}
try {
	const metadata = JSON.parse(await readFile("../exit-interview.json", "utf8"));
	check(metadata.aiHub.name === "Demon Rumble", "Exit interview has title");
	check(
		metadata.sourceInformation.usage === "added on import",
		"Usage is added on import",
	);
	check(
		[
			metadata.testingFeedback.length,
			metadata.engineFeedback.length,
			metadata.promptFeedback.length,
		].join(",") === "4,6,4",
		"Feedback answer counts",
	);
	check(
		!JSON.stringify(metadata).includes("Pending"),
		"Final metadata has no pending answers",
	);
	const sel = JSON.parse(await readFile("title-selection.json", "utf8"));
	const html = await readFile(`../${sel.basename}.html`, "utf8");
	const client = await readFile("hub-reference/session.js", "utf8");
	check(
		html.includes(
			`<script>${client.replaceAll("</script", "<\\/script")}</script>`,
		),
		"Unmodified AI Hub client is first script",
	);
	check(
		!/<script[^>]+src=/.test(html) && !/<link[^>]+href=/.test(html),
		"HTML has no external script or stylesheet dependency",
	);
	const net = await testNetwork();
	count += net.count;
	failures.push(...net.failures);
} catch (e) {
	failures.push(e.stack);
}
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
for (const name of [
	"gameplay-test.py",
	"network-browser-test.py",
	"fullgame-network-test.py",
	"hub-test.py",
]) {
	const result = spawnSync(python, [name], {
		encoding: "utf8",
		maxBuffer: 4 * 1024 * 1024,
	});
	const stdout = result.stdout || "";
	const matches = [
		...stdout.matchAll(
			/(?:Gameplay:\s*(\d+)\/(\d+) checks passed|(\d+) (?:direct-network|full-game network|hub) checks, (\d+) failures)/g,
		),
	];
	for (const m of matches) count += Number(m[2] || m[3] || 0);
	if (result.status !== 0)
		failures.push(`${name}: ${stdout.trim()} ${(result.stderr || "").trim()}`);
}
for (const f of failures) console.log("FAIL: " + f);
console.log(`${count} checks, ${failures.length} failures`);
process.exitCode = failures.length ? 1 : 0;
