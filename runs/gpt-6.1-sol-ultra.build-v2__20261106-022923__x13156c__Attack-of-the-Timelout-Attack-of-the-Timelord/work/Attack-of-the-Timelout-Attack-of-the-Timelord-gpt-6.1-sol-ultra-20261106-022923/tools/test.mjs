import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = JSON.parse(
	fs.readFileSync(path.join(root, "project.json"), "utf8"),
);
const artifact = path.resolve(root, "..", project.slug + ".html");
const artifactSha256 = createHash("sha256")
	.update(fs.readFileSync(artifact))
	.digest("hex");
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
const selected = new Set(
	process.argv.slice(2).map((s) => s.replace(/^--/, "")),
);
const wants = (key) => !selected.size || selected.has(key);
let count = 0;
const failures = [],
	reports = [];
const test = (label, fn) => {
	count++;
	try {
		fn();
	} catch (e) {
		failures.push(`${label}: ${e.message}`);
	}
};
if (wants("package")) {
	test("standalone artifact and metadata", () => {
		const html = fs.readFileSync(artifact, "utf8");
		if (!html.includes("<title>Attack of the Timelout</title>"))
			throw Error("Wrong artifact title");
		if (!/<meta charset="utf-8">\s*<script>/.test(html))
			throw Error("Hub client must be first script immediately after charset");
		for (const field of [
			"hub:session",
			"hub:session-players",
			"hub:session-mode",
			"hub:session-goal",
			"hub:session-howto",
		])
			if (!html.includes(`name="${field}"`)) throw Error(`Missing ${field}`);
		if (/<script[^>]+src=/.test(html))
			throw Error("Static runtime script dependency not inlined");
	});
	test("parsed exit interview matches in-game build metadata", () => {
		const final = JSON.parse(
				fs.readFileSync(
					path.resolve(root, "..", "exit-interview.json"),
					"utf8",
				),
			),
			source = JSON.parse(
				fs.readFileSync(path.join(root, "src/content/interview.json"), "utf8"),
			);
		if (JSON.stringify(final) !== JSON.stringify(source))
			throw Error("Interview and bundle source disagree");
		for (const key of [
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
		])
			if (!final.sourceInformation[key]) throw Error(`Empty ${key}`);
		if (final.sourceInformation.usage !== "added on import")
			throw Error("Usage must be added on import");
		for (const [key, n] of [
			["testingFeedback", 4],
			["engineFeedback", 6],
			["promptFeedback", 4],
		])
			if (
				final[key].length !== n ||
				final[key].some((v) => typeof v !== "string" || !v)
			)
				throw Error(`Bad ${key}`);
		if (final.aiHub.name !== project.title || final.aiHub.players !== "1–4")
			throw Error("Catalogue mismatch");
	});
}
for (const [key, file, exportName] of [
	["state", "tests/state.test.mjs", "runStateTests"],
	["engine", "tests/engine.test.mjs", "runEngineTests"],
]) {
	if (!wants(key)) continue;
	try {
		const module = await import(path.join(root, file));
		const r = module[exportName]();
		count += r.count;
		failures.push(...r.failures.map((f) => `${key}: ${f}`));
		reports.push({ suite: key, ...r });
	} catch (e) {
		count++;
		failures.push(`${key}: ${e.stack}`);
	}
}
function command(key, bin, args, timeout = 360000) {
	if (!wants(key)) return;
	const result = spawnSync(bin, args, {
		cwd: root,
		encoding: "utf8",
		timeout,
		maxBuffer: 8 * 1024 * 1024,
	});
	const output = (result.stdout || "") + (result.stderr || "");
	fs.writeFileSync(
		path.join(root, "test-artifacts", key + "-test.log"),
		output,
	);
	const tap = /# tests (\d+)/.exec(output),
		checks = /(\d+) (?:audio|browser) checks/.exec(output),
		fraction = /(\d+)\/(\d+) (?:checks )?passed/.exec(output);
	const n = Number(tap?.[1] || checks?.[1] || fraction?.[2] || 1);
	count += n;
	if (result.status !== 0) {
		const lines = output
			.split("\n")
			.filter((s) => /FAIL|not ok|error:|Error:/.test(s));
		failures.push(
			`${key}: ${lines.join("\n") || result.error?.message || output.slice(-3000) || `exit ${result.status}`}`,
		);
	}
	reports.push({
		suite: key,
		count: n,
		status: result.status,
		log: `test-artifacts/${key}-test.log`,
	});
}
command("network", process.execPath, [
	"--test",
	"--test-reporter=tap",
	"tests/hub/network.test.mjs",
]);
command("audio", python, ["tests/audio.py"]);
command(
	"browser",
	python,
	["tests/browser.py", "--artifact", artifact],
	420000,
);
command("hub", python, ["tests/hub/run-harness.py", artifact], 480000);
command("peer", python, ["tests/hub/run-peer.py"], 180000);
if (fs.existsSync(path.join(root, "tests/hub/gameplay.py")))
	command(
		"online-gameplay",
		python,
		["tests/hub/gameplay.py", artifact],
		240000,
	);
const report = {
	artifact: path.basename(artifact),
	artifactSha256,
	at: new Date().toISOString(),
	count,
	failures,
	reports,
};
// A scoped rerun replaces only its affected groups, retaining evidence for the
// identical artifact. No stale evidence is carried across a rebuilt HTML.
if (selected.size) {
	try {
		const prior = JSON.parse(
			fs.readFileSync(
				path.join(root, "test-artifacts/verification.json"),
				"utf8",
			),
		);
		const same =
			prior.artifact === report.artifact &&
			(prior.artifactSha256 === artifactSha256 ||
				(!prior.artifactSha256 &&
					Date.parse(prior.at) >= fs.statSync(artifact).mtimeMs));
		if (same) {
			const groups = new Set([...selected, ...reports.map((r) => r.suite)]);
			const retained = prior.reports.filter((r) => !groups.has(r.suite));
			const legacyPackage = groups.has("package")
				? 0
				: Math.max(
						0,
						prior.count - prior.reports.reduce((n, r) => n + r.count, 0),
					);
			report.executedCount = count;
			report.reports = [...retained, ...reports];
			report.count =
				legacyPackage + report.reports.reduce((n, r) => n + r.count, 0);
			report.failures = [
				...prior.failures.filter(
					(f) => ![...groups].some((g) => f.startsWith(g + ":")),
				),
				...failures,
			];
		}
	} catch {}
}
fs.writeFileSync(
	path.join(root, "test-artifacts/verification.json"),
	JSON.stringify(report, null, 2),
);
for (const failure of failures) console.error("FAIL " + failure);
console.log(`${count} checks, ${failures.length} failures`);
process.exitCode = failures.length ? 1 : 0;
