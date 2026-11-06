/** One quiet release check. Select --unit, --browser or --hub while iterating. */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { contentTests } from "../tests/content.mjs";
import { networkTests } from "./hub/network-test.mjs";

const root = path.resolve(import.meta.dirname, "..");
const selection = JSON.parse(
	fs.readFileSync(path.join(root, "selection.json"), "utf8"),
);
const artifact = path.resolve(root, "..", `${selection.folder}.html`);
const args = new Set(process.argv.slice(2));
const selected = !["--unit", "--browser", "--hub"].some((flag) =>
	args.has(flag),
);
let artifactHash = "unknown";
let passed = 0,
	failed = 0,
	skipped = 0;
const failures = [],
	skipReasons = [];
const collect = (result) => {
	passed += result.passed || 0;
	failed += result.failed || 0;
	skipped += result.skipped || 0;
	failures.push(...(result.failures || []));
	skipReasons.push(...(result.skipReasons || []));
};
function subprocess(label, command, argv, timeout = 300000, report = null) {
	const child = spawnSync(command, argv, {
		cwd: root,
		encoding: "utf8",
		timeout,
		maxBuffer: 8 * 1024 * 1024,
	});
	if (report && fs.existsSync(path.join(root, report))) {
		try {
			const result = JSON.parse(
				fs.readFileSync(path.join(root, report), "utf8"),
			);
			collect(result);
			if (child.status !== 0 && !result.failed) {
				failed++;
				failures.push(
					`${label}: subprocess failed: ${child.error?.message || child.stderr || child.stdout}`,
				);
			}
			return;
		} catch (error) {
			failed++;
			failures.push(`${label}: unreadable report: ${error.message}`);
			return;
		}
	}
	const output = `${child.stdout || ""}${child.stderr || ""}`.trim();
	const match = output.match(/(\d+) passed, (\d+) failed, (\d+) skipped/);
	if (match) {
		passed += +match[1];
		failed += +match[2];
		skipped += +match[3];
		if (child.status !== 0 && +match[2] === 0) failed++;
		if (+match[2] || child.status !== 0) failures.push(`${label}: ${output}`);
		if (+match[3]) skipReasons.push(`${label}: ${output}`);
	} else if (child.status === 0) passed++;
	else {
		failed++;
		failures.push(
			`${label}: ${child.error?.message || output || `exit ${child.status}`}`,
		);
	}
}

const build = spawnSync(
	process.execPath,
	[path.join(root, "tools/build.mjs")],
	{ cwd: root, encoding: "utf8" },
);
if (build.status !== 0) {
	failed++;
	failures.push(`Build: ${build.stderr || build.stdout}`);
} else {
	const html = fs.readFileSync(artifact, "utf8");
	artifactHash = createHash("sha256").update(html).digest("hex");
	const client = fs.readFileSync(
		path.join(root, "vendor/hub/session.js"),
		"utf8",
	);
	const metadata = JSON.parse(
		fs.readFileSync(path.join(root, "../exit-interview.json"), "utf8"),
	);
	if (
		html.includes(`<meta charset="utf-8"><script>${client}</script>`) &&
		html.includes('<meta name="hub:session-players" content="1-2">') &&
		html.includes(metadata.aiHub.name)
	)
		passed++;
	else {
		failed++;
		failures.push(
			"Package: first-script Hub client or release metadata mismatch",
		);
	}
	if (selected || args.has("--unit")) {
		collect(contentTests());
		collect(await networkTests());
		subprocess("Simulation", process.execPath, [
			path.join(root, "tests/sim.mjs"),
		]);
	}
	const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
	if (selected || args.has("--browser")) {
		fs.rmSync(path.join(root, "tests/browser-results.json"), { force: true });
		subprocess(
			"Browser",
			python,
			[path.join(root, "tests/browser.py"), artifact],
			240000,
			"tests/browser-results.json",
		);
	}
	if (selected || args.has("--hub")) {
		fs.rmSync(path.join(root, "tools/hub/results.json"), { force: true });
		subprocess(
			"Hub",
			python,
			[path.join(root, "tools/hub/check.py"), artifact],
			420000,
			"tools/hub/results.json",
		);
	}
}
for (const failure of failures) console.error(failure);
for (const reason of skipReasons) console.error(`SKIP ${reason}`);
console.log(`${passed} passed, ${failed} failed, ${skipped} skipped`);
fs.writeFileSync(
	path.join(root, "tests/results.json"),
	JSON.stringify(
		{
			passed,
			failed,
			skipped,
			failures,
			skipReasons,
			selected: [...args],
			artifact: path.basename(artifact),
			sha256: artifactHash,
		},
		null,
		2,
	),
);
if (failed) process.exitCode = 1;
