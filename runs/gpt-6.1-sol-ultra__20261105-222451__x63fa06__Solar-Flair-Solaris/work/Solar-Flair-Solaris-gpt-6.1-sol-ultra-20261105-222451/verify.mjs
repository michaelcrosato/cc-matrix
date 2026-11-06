import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const dev = dirname(fileURLToPath(import.meta.url));
const { slug } = JSON.parse(
	readFileSync(resolve(dev, "identity.json"), "utf8"),
);
let checks = 0,
	failures = [];
const check = (v, name) => {
	checks++;
	if (!v) failures.push(name);
};
try {
	const c = JSON.parse(
		readFileSync(resolve(dev, "../exit-interview.json"), "utf8"),
	);
	check(
		Object.keys(c.sourceInformation).length === 15,
		"Source Information field shape",
	);
	check(
		c.testingFeedback.length === 4 &&
			c.engineFeedback.length === 6 &&
			c.promptFeedback.length === 4,
		"All interview answers present",
	);
	check(
		c.sourceInformation.usage === "added on import",
		"Usage attribution literal preserved",
	);
	check(
		c.aiHub.name === "Solar Flair" && c.aiHub.players === "1–2",
		"Catalogue title and supported seats",
	);
	check(
		c.aiHub.tags.length >= 3 && c.aiHub.tags.length <= 6,
		"Catalogue tags count",
	);
	const html = readFileSync(resolve(dev, "../" + slug + ".html"), "utf8");
	const session = readFileSync(resolve(dev, "hub-session.js"), "utf8");
	check(
		html.includes('<meta charset="utf-8"><script>' + session + "</script>"),
		"Unmodified official session client first after charset",
	);
	check(
		html.includes("three@0.180.0") && html.includes("rapier3d-compat@0.19.3"),
		"Required dependencies pinned",
	);
	check(
		!/<script[^>]+src=["'](?!https?:)/.test(html),
		"Single HTML has no local script dependency",
	);
} catch (e) {
	failures.push(e.message);
}
const py = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
const jobs = [
	["node", ["test-core.mjs"]],
	[py, ["test-game.py"]],
	[py, ["test-network.py", "--game", slug + ".html"]],
	[py, ["test-hub.py"]],
];
if (process.argv.includes("--visual")) jobs.push([py, ["visual-check.py"]]);
for (const [bin, args] of jobs) {
	const out = await new Promise((resolveResult) => {
		const p = spawn(bin, args, {
			cwd: dev,
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...process.env, TMPDIR: resolve(dev, ".browser-tmp") },
		});
		let output = "";
		p.stdout.on("data", (b) => (output += b));
		p.stderr.on("data", (b) => (output += b));
		p.on("error", (e) => resolveResult({ code: 1, output: e.message }));
		p.on("close", (code) => resolveResult({ code, output }));
	});
	const matches = [
		...out.output.matchAll(
			/(\d+)\s+(?:core checks passed|game checks|network checks|AI Hub checks)/g,
		),
	];
	for (const m of matches) checks += Number(m[1]);
	if (out.code !== 0) failures.push(args[0] + ": " + out.output.trim());
}
for (const f of failures) console.log("FAIL: " + f);
console.log(`${checks} checks; ${failures.length} failures`);
process.exitCode = failures.length ? 1 : 0;
