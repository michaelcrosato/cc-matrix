import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const groups = new Set(process.argv.slice(2));
const all = !groups.size;
let checks = 0,
	failures = [];
const evidence = [];
const check = (ok, name, detail = "") => {
	checks++;
	evidence.push({ name, pass: !!ok, detail });
	if (!ok) failures.push(`${name}: ${detail}`);
};
async function jsSuite(file, method) {
	try {
		const mod = await import(path.join(root, file));
		const result = await mod[method]();
		if (Array.isArray(result)) {
			for (const r of result) check(r.pass, r.name, r.detail || "");
		} else {
			checks += result.checks || 0;
			for (const failure of result.failures || [])
				failures.push(
					typeof failure === "string" ? failure : JSON.stringify(failure),
				);
			evidence.push({ name: file, ...result });
		}
	} catch (e) {
		check(false, file, e.stack);
	}
}
function pythonSuite(file, args = []) {
	const r = spawnSync(
		"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
		[file, ...args],
		{ cwd: root, encoding: "utf8", timeout: 300000, maxBuffer: 1024 * 1024 },
	);
	try {
		const line = r.stdout.trim().split("\n").filter(Boolean).at(-1),
			result = JSON.parse(line);
		if (Array.isArray(result.checks)) {
			for (const c of result.checks) check(c.pass, c.name, c.detail || "");
		} else {
			checks += result.checks || result.total || 1;
			for (const f of result.failures || [])
				failures.push(typeof f === "string" ? f : JSON.stringify(f));
			evidence.push({ name: file, ...result });
		}
		if (r.status !== 0 && !result.failures?.length)
			check(false, file, r.stderr || r.stdout);
	} catch {
		check(false, file, r.stderr || r.stdout || `exit ${r.status}`);
	}
}
if (all || groups.has("sim"))
	await jsSuite("tests/simulation.mjs", "runSimulationTests");
if (all || groups.has("net")) await jsSuite("tests/network.mjs", "run");
if (all || groups.has("browser")) pythonSuite("tests/browser.py");
if (all || groups.has("campaign")) pythonSuite("tests/campaign-browser.py");
if (all || groups.has("audio")) {
	await jsSuite("tests/art-headless.mjs", "runArtTests");
	pythonSuite("tests/art-audio.py");
}
if (all || groups.has("peer")) {
	pythonSuite("tests/net-browser.py");
	pythonSuite("tests/net-bundle.py");
}
if (all || groups.has("touch")) pythonSuite("tests/touch-play.py");
if (all || groups.has("controller")) pythonSuite("tests/controller.py");
if (all || groups.has("hub")) {
	const p = JSON.parse(fs.readFileSync("project.json"));
	pythonSuite("tests/net-hub.py", [`/${p.slug}.html`]);
}
if (all || groups.has("package")) {
	const p = JSON.parse(fs.readFileSync("project.json")),
		html = fs.readFileSync(path.join(root, `../${p.slug}.html`), "utf8"),
		hub = fs.readFileSync("vendor/hub/session.js", "utf8");
	const first = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
	check(first === hub, "unmodified Hub first script");
	check(
		!/<script[^>]+src=|<audio|\.(?:mp3|wav|ogg)(?:["'?]|$)|localhost:|\/home\/micha/i.test(
			html,
		),
		"self-contained bundle",
	);
	for (const field of [
		"hub:session",
		"hub:session-players",
		"hub:session-mode",
		"hub:session-goal",
		"hub:session-howto",
		"hub:session-minutes",
	])
		check(html.includes(`name="${field}"`), `metadata ${field}`);
	try {
		const r = JSON.parse(fs.readFileSync("../exit-interview.json", "utf8"));
		check(
			Object.keys(r).sort().join(",") ===
				"aiHub,engineFeedback,promptFeedback,sourceInformation,testingFeedback",
			"report object shape",
		);
		check(r.sourceInformation.usage === "added on import", "usage exact");
		check(
			r.testingFeedback.length === 4 &&
				r.engineFeedback.length === 6 &&
				r.promptFeedback.length === 4,
			"feedback question counts",
		);
		check(
			Object.values(r.sourceInformation).every(
				(x) => typeof x === "string" && x.length,
			),
			"complete source info",
		);
		check(
			r.aiHub.name === "Bomb Union" &&
				r.aiHub.genre === "Puzzle" &&
				r.aiHub.players === "1–4",
			"catalogue values",
		);
		check(
			html.includes(JSON.stringify(r)) ||
				html.includes(fs.readFileSync("../exit-interview.json", "utf8")),
			"credits and report source consistency",
		);
	} catch (e) {
		check(false, "exit interview", e.message);
	}
}
fs.writeFileSync(
	"evidence/verification.json",
	JSON.stringify(
		{
			checks,
			failures,
			groups: all ? ["all"] : [...groups],
			results: evidence,
		},
		null,
		2,
	),
);
for (const f of failures) console.log(`FAIL ${f}`);
console.log(`${checks} checks, ${failures.length} failures`);
if (failures.length) process.exitCode = 1;
