/** One quiet entry point. Detailed evidence/logs stay under docs/verify. */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runSimTests } from "../tests/sim-test.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const folder = path.join(root, "docs/verify");
fs.mkdirSync(folder, { recursive: true });
const selection = process.argv
	.find((a) => a.startsWith("--suite="))
	?.split("=")[1];
const suites = new Set(
	selection
		? selection.split(",")
		: [
				"static",
				"sim",
				"hub-unit",
				"audio",
				"browser",
				"split",
				"public",
				"hub",
				"package",
			],
);
const result = {
	date: new Date().toISOString(),
	suites: [],
	checks: 0,
	failures: [],
};
const check = (ok, message) => {
	result.checks++;
	if (!ok) result.failures.push(message);
};
const json = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
function run(name, command, args, pattern) {
	const r = spawnSync(command, args, {
		cwd: root,
		encoding: "utf8",
		maxBuffer: 16 * 1024 * 1024,
		timeout: 720000,
	});
	const log = (r.stdout || "") + (r.stderr || "");
	fs.writeFileSync(path.join(folder, name + ".log"), log);
	const matches = pattern ? log.match(pattern) : null;
	const count = matches ? +matches[1] : 1;
	result.checks += count;
	if (r.status !== 0) {
		const lines = log.split("\n").filter((x) => x.startsWith("FAIL "));
		result.failures.push(
			...(lines.length
				? lines
				: [name + ": " + (r.error?.message || log.slice(-3000) || "failed")]),
		);
	}
	result.suites.push({ name, checks: count, pass: r.status === 0 });
	return r.status === 0;
}
if (!run("build", "bun", ["tools/build.mjs", "--quiet"])) {
	fs.writeFileSync(
		path.join(folder, "last-run.json"),
		JSON.stringify(result, null, 2),
	);
	for (const failure of result.failures) console.error("FAIL " + failure);
	console.log(`${result.checks} checks, ${result.failures.length} failures`);
	process.exit(1);
}
if (suites.has("static")) {
	run("biome", "biome", [
		"check",
		"src",
		"content",
		"tools",
		"tests",
		"package.json",
	]);
	run("ruff", "ruff", ["check", "tests"]);
	for (const dir of ["src", "content", "tools", "tests"])
		for (const name of fs.readdirSync(dir)) {
			if (!/\.(mjs|js)$/.test(name) || name.endsWith("-bundle.js")) continue;
			const r = spawnSync(process.execPath, ["--check", path.join(dir, name)], {
				encoding: "utf8",
			});
			check(r.status === 0, "Syntax " + dir + "/" + name + ": " + r.stderr);
		}
	const c = json("content/credits.json"),
		id = json("identity.json");
	check(
		id.candidates === 50 && id.draw >= 1 && id.draw <= 50,
		"Title RNG record invalid",
	);
	check(
		Object.keys(c).sort().join(",") ===
			"aiHub,engineFeedback,promptFeedback,sourceInformation,testingFeedback",
		"Feedback shape differs from TASK",
	);
	for (const [k, n] of [
		["testingFeedback", 4],
		["engineFeedback", 6],
		["promptFeedback", 4],
	])
		check(
			c[k].length === n &&
				c[k].every((x) => typeof x === "string" && x.length > 0),
			"Feedback answers " + k,
		);
	check(
		c.sourceInformation.usage === "added on import",
		"Usage must be added on import",
	);
	check(
		c.aiHub.players === "1–2" &&
			c.aiHub.tags.length >= 3 &&
			c.aiHub.tags.length <= 6,
		"Catalogue multiplayer/tags",
	);
	result.suites.push({ name: "static", pass: true });
}
if (suites.has("sim") || suites.has("sim-quick")) {
	const s = runSimTests({ full: suites.has("sim") });
	result.checks += s.count;
	result.failures.push(...s.failures);
	fs.writeFileSync("docs/simulation-results.json", JSON.stringify(s, null, 2));
	result.suites.push({
		name: "simulation",
		checks: s.count,
		pass: !s.failures.length,
	});
}
if (suites.has("hub-unit")) {
	run("hub-unit", process.execPath, ["tests/hub-unit.mjs"], /(\d+) Hub checks/);
	run(
		"hub-sim",
		process.execPath,
		["tests/hub-sim.mjs"],
		/(\d+) Hub simulation checks/,
	);
}
const py = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
if (suites.has("audio")) {
	run("build-audio", "bun", ["tools/build-audio.mjs"]);
	run("audio", py, ["tests/audio-verify.py"], /(\d+) audio checks/);
}
if (suites.has("browser"))
	run(
		"browser",
		py,
		["tests/browser-verify.py"],
		/Browser verification: (\d+) assertions/,
	);
if (suites.has("split"))
	run(
		"split",
		py,
		["tests/split-verify.py"],
		/Split verification: (\d+) checks/,
	);
if (suites.has("public"))
	run(
		"public-input",
		py,
		["tests/public-playthrough.py"],
		/\d+\/(\d+) public-input checks/,
	);
if (suites.has("hub")) {
	run(
		"hub-browser",
		py,
		["tests/hub-verify.py"],
		/(\d+) Hub browser scenarios/,
	);
}
if (suites.has("package")) {
	const id = json("identity.json"),
		html = fs.readFileSync(path.join(root, "..", id.slug + ".html"), "utf8"),
		raw = fs.readFileSync("vendor/ai-hub/lib/hub/session.js", "utf8");
	check(
		html.startsWith(
			'<!doctype html><html lang="en"><head><meta charset="utf-8"><script>' +
				raw +
				"</script>",
		),
		"Released client is not the verbatim first head script",
	);
	for (const [name, value] of Object.entries({
		"hub:session": "1",
		"hub:session-players": "1-2",
		"hub:session-mode": "shared-world",
		"hub:session-minutes": "12",
	}))
		check(
			html.includes(`name="${name}" content="${value}"`),
			"Missing Hub tag " + name,
		);
	check(
		html === fs.readFileSync("game.html", "utf8"),
		"Root and dev artifact differ",
	);
	check(
		html.includes("Apache License") && html.includes("MIT License"),
		"Dependency notices missing",
	);
	const markup = html.replace(
		/<script\b[^>]*>[\s\S]*?<\/script>/gi,
		(tag) => tag.slice(0, tag.indexOf(">") + 1) + "</script>",
	);
	check(
		!/<script[^>]+src=|<link[^>]+href=/i.test(markup),
		"Package contains external script/style dependency",
	);
	const credits = json("content/credits.json"),
		exit = json("../exit-interview.json");
	check(
		JSON.stringify(credits) === JSON.stringify(exit),
		"Root exit interview differs from embedded credits source",
	);
	const required = [
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
		required.every(
			(k) =>
				typeof exit.sourceInformation[k] === "string" &&
				exit.sourceInformation[k].length > 0,
		),
		"Required source information incomplete",
	);
	check(
		!html.includes('"testingFeedback":["unknown"'),
		"Release testing feedback remains unknown",
	);
	result.suites.push({ name: "package", pass: true });
}
fs.writeFileSync(
	path.join(folder, "last-run.json"),
	JSON.stringify(result, null, 2),
);
for (const f of result.failures) console.error("FAIL " + f);
console.log(`${result.checks} checks, ${result.failures.length} failures`);
process.exitCode = result.failures.length ? 1 : 0;
