import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
	art = path.join(root, "tests/artifacts");
const group =
	process.argv.find((s) => s.startsWith("--group="))?.split("=")[1] || "all";
let passed = 0,
	failed = 0;
const evidence = [];
function check(name, ok, error = "") {
	evidence.push({ name, pass: !!ok, ...(!ok ? { error } : {}) });
	if (ok) passed++;
	else {
		failed++;
		console.error("FAIL " + name + (error ? "\n" + error : ""));
	}
}
for (const mod of ["sim", "online", "presentation", "server-pilot"])
	if (group === "all" || group === mod) {
		try {
			const t = await import(
				pathToFileURL(path.join(root, "tests", mod + ".test.mjs"))
			);
			const raw = await (t.default || t.runTests)();
			for (const r of Array.isArray(raw) ? raw : raw.results)
				check(r.name, r.ok ?? r.pass, r.error || "");
		} catch (e) {
			check(mod + " suite", false, e.stack);
		}
	}
if (group === "all" || group === "artifact") {
	const html = fs.readFileSync(
		path.join(root, "..", path.basename(root) + ".html"),
		"utf8",
	);
	const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(
		(m) => m[1],
	);
	check(
		"artifact session client pristine and first after charset",
		blocks[0]?.trim() ===
			fs
				.readFileSync(path.join(root, "vendor/hub/session.js"), "utf8")
				.trim() && /<meta charset="utf-8">\s*<script>/.test(html),
	);
	check(
		"artifact declares correct Hub seats and shared-world mode",
		html.includes('name="hub:session-players" content="1-2"') &&
			html.includes('name="hub:session-mode" content="shared-world"'),
	);
	check(
		"artifact has no fetched development scripts or assets",
		!/<script[^>]+src=|<img[^>]+src=|<link[^>]+href=/i.test(html),
	);
	for (let i = 0; i < blocks.length; i++) {
		try {
			new vm.Script(blocks[i], { filename: "artifact-script-" + i });
			check("artifact script " + i + " parses completely", true);
		} catch (e) {
			check("artifact script " + i + " parses completely", false, e.message);
		}
	}
	const reportFile = path.join(root, "..", "exit-interview.json");
	try {
		const r = JSON.parse(fs.readFileSync(reportFile, "utf8"));
		const keys = [
			"date",
			"source",
			"plan",
			"genre",
			"perspective",
			"tech",
			"artDirection",
			"animation",
			"audio",
			"online",
			"testing",
			"research",
			"environment",
			"model",
			"usage",
		];
		check(
			"exit interview exact fields and answer counts",
			keys.every(
				(k) =>
					typeof r.sourceInformation[k] === "string" && r.sourceInformation[k],
			) &&
				r.testingFeedback.length === 4 &&
				r.engineFeedback.length === 6 &&
				r.promptFeedback.length === 4 &&
				r.sourceInformation.usage === "added on import" &&
				r.aiHub.name === "Yars of Ruin" &&
				r.aiHub.tags.length >= 3 &&
				r.aiHub.tags.length <= 6,
		);
		check(
			"artifact embeds exact final interview",
			blocks.some((b) =>
				b.includes("globalThis.RUIN_REPORT=" + JSON.stringify(r)),
			),
		);
	} catch (e) {
		check("exit interview parses", false, e.message);
	}
}
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
for (const [name, file, args] of [
	["browser", "browser.py", []],
	["hub", "hub-browser.py", ["--campaign"]],
])
	if (group === "all" || group === name) {
		const result = spawnSync(
			python,
			[path.join(root, "tests", file), ...args],
			{ cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
		);
		const lines = (result.stdout || "").trim().split("\n");
		let report;
		try {
			report = JSON.parse(lines.at(-1));
		} catch {}
		if (report && Number.isInteger(report.passed)) {
			passed += report.passed;
			failed += report.failed;
			const failures = lines.slice(0, -1).filter((l) => l.startsWith("FAIL "));
			for (const f of failures) console.error(f);
			if (result.stderr) console.error(result.stderr.trim());
			evidence.push({ suite: name, ...report });
			if (result.status && !report.failed)
				check(
					name + " process exits cleanly",
					false,
					result.stderr || String(result.status),
				);
		} else
			check(
				name + " browser suite completes",
				false,
				(result.stdout || "") +
					(result.stderr || "") +
					" exit " +
					result.status,
			);
	}
fs.mkdirSync(art, { recursive: true });
fs.writeFileSync(
	path.join(
		art,
		"test-summary" + (group === "all" ? "" : "-" + group) + ".json",
	),
	JSON.stringify({ group, passed, failed, results: evidence }, null, 2),
);
console.log(`${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
