import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
const node = process.execPath;
const requested = process.argv
	.find((a) => a.startsWith("--only="))
	?.slice(7)
	.split(",");
const suite = (name, command, args, count, timeout = 240000) => ({
	name,
	command,
	args,
	count,
	timeout,
});
const suites = [
	suite(
		"default-pairing",
		python,
		["tests/network-default-ui.py"],
		() => read("network-default-ui.json").checks.filter((c) => c.pass).length,
	),
	suite("content", node, ["scripts/validate-content.mjs"], () => 1),
	suite(
		"simulation",
		node,
		["tests/simulation.mjs"],
		() => read("simulation-tests.json").passed,
	),
	suite(
		"render",
		node,
		["tests/render.test.mjs"],
		(out) => +(out.match(/(\d+) render\/audio checks passed/)?.[1] || 0),
	),
	suite(
		"product",
		node,
		["tests/product.mjs"],
		(out) => +(out.match(/(\d+) product checks passed/)?.[1] || 0),
	),
	suite(
		"protocol",
		node,
		["tests/network.test.cjs"],
		(out) => +(out.match(/Network protocol: (\d+) passed/)?.[1] || 0),
	),
	suite(
		"browser",
		python,
		["tests/browser.py"],
		() => read("browser.json").passed,
	),
	suite(
		"extended",
		python,
		["tests/extended-browser.py"],
		() => read("extended-browser.json").passed,
	),
	suite(
		"audio",
		python,
		["tests/audio-browser.py"],
		(out) => +(out.match(/(\d+) audio browser checks/)?.[1] || 0),
	),
	suite("presentation", python, ["tests/render-browser.py"], () => 3),
	suite(
		"rtc",
		python,
		["tests/network-browser.py"],
		() => read("network-browser.json").checks.filter((c) => c.pass).length,
	),
	suite(
		"lifecycle",
		python,
		["tests/network-lifecycle.py"],
		() => read("network-lifecycle.json").checks.filter((c) => c.pass).length,
	),
	suite(
		"campaign",
		python,
		["tests/network-campaign.py"],
		() => read("network-campaign.json").checks.filter((c) => c.pass).length,
	),
	suite(
		"departure",
		python,
		["tests/network-campaign.py", "--guest-leave"],
		() =>
			read("network-campaign-guest-leave.json").checks.filter((c) => c.pass)
				.length,
	),
	suite("hub", python, ["tests/network-hub.py"], () =>
		read("hub-harness.json").results.reduce(
			(n, r) => n + r.checks.length + (r.gameChecks?.length || 0),
			0,
		),
	),
];
function read(name) {
	return JSON.parse(fs.readFileSync(path.join(root, "reports", name), "utf8"));
}
fs.mkdirSync(path.join(root, "reports/test-logs"), { recursive: true });
const build = spawnSync(node, ["scripts/build.mjs"], {
	cwd: root,
	encoding: "utf8",
	timeout: 20000,
});
fs.writeFileSync(
	path.join(root, "reports/test-logs/build.log"),
	build.stdout + build.stderr,
);
if (build.status !== 0) {
	console.error("Build failed: " + build.stdout + build.stderr);
	console.log("0 checks passed; 1 failed (build)");
	process.exit(1);
}
let passed = 0,
	failed = 0;
const results = [];
for (const s of suites.filter(
	(s) => !requested || requested.includes(s.name),
)) {
	const start = Date.now();
	const result = spawnSync(s.command, s.args, {
		cwd: root,
		encoding: "utf8",
		timeout: s.timeout,
		maxBuffer: 8 * 1024 * 1024,
		env: { ...process.env, PYTHONUNBUFFERED: "1" },
	});
	const output = (result.stdout || "") + (result.stderr || "");
	fs.writeFileSync(
		path.join(root, "reports/test-logs", s.name + ".log"),
		output,
	);
	let count = 0;
	try {
		count = s.count(output);
	} catch {}
	if (result.status !== 0 || !count) {
		failed++;
		console.error(
			s.name +
				": " +
				(result.error?.message || output || "no checks were reported"),
		);
	} else passed += count;
	results.push({
		suite: s.name,
		passed: result.status === 0 && count > 0,
		count,
		milliseconds: Date.now() - start,
		log: "reports/test-logs/" + s.name + ".log",
	});
}
const config = JSON.parse(
	fs.readFileSync(path.join(root, "build-config.json"), "utf8"),
);
const artifact = fs.readFileSync(path.join(root, "..", config.filename));
fs.writeFileSync(
	path.join(root, "reports/test-results.json"),
	JSON.stringify(
		{
			artifact: config.filename,
			sha256: crypto.createHash("sha256").update(artifact).digest("hex"),
			passed,
			failed,
			suites: results,
		},
		null,
		2,
	),
);
console.log(
	`${passed} checks passed; ${failed} failed (${results.length} suites).`,
);
process.exitCode = failed ? 1 : 0;
